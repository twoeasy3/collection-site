// Plushie Wrestling booking league API, mounted by src/worker.js under /api/wr/*.
// EVERY route is admin-only (Bearer key), reads included: the whole page is private.
// Tables are the wr_* ones in schema.sql.

import { aiBook } from './ai.js';
import { int, str, isDate, num, HttpError, fail, count, ROLES, isCompetitor, sanitizeParticipants, endOpenReign, startReign, ensureEvent, insertParticipants } from './common.js';
import { loadTournaments, createTournament, updateTournament, deleteTournament, bookTie, unbookTie, onMatchResult, onMatchReset, unlinkTies } from './tournaments.js';


export const ENUMS = {
  brandKind: ['major', 'developmental'],
  showType: ['weekly', 'ppv', 'special'],
  alignment: ['face', 'heel', 'tweener'],
  tier: ['main_event', 'upper_card', 'mid_card', 'lower_card', 'enhancement'],
  wrestlerStatus: ['active', 'injured', 'retired'],
  titleType: ['singles', 'tag', 'trios'],
  titleStatus: ['active', 'retired'],
  teamKind: ['tag_team', 'stable', 'alliance'],
  teamStatus: ['active', 'disbanded'],
  feudStatus: ['building', 'active', 'blow_off', 'ended'],
  stipKind: ['standard', 'multi', 'handicap', 'n_way', 'gimmick'],
  eventStatus: ['draft', 'booked', 'completed'],
  segment: ['match', 'promo', 'angle'],
  result: ['win', 'loss', 'draw', 'nc'],
};

// Simple tables: whitelisted columns, with how each is cleaned.
// 's' string, 'i' int (not null, default d), 'n' nullable int (ids), 'e:<enum>' validated string.
const TABLES = {
  brands: { table: 'wr_brands', cols: { name: 's', kind: 'e:brandKind', color: 's', description: 's' }, defaults: { kind: 'major', color: '#888888' } },
  shows: { table: 'wr_shows', cols: { brand_id: 'n', name: 's', type: 'e:showType', weekday: 'n', description: 's' }, defaults: { type: 'weekly' } },
  wrestlers: { table: 'wr_wrestlers', cols: { name: 's', species: 's', brand_id: 'n', image: 's', alignment: 'e:alignment', tier: 'e:tier', status: 'e:wrestlerStatus', finisher: 's', gimmick: 's', bio: 's' }, defaults: { alignment: 'face', tier: 'mid_card', status: 'active' } },
  titles: { table: 'wr_titles', cols: { name: 's', brand_id: 'n', type: 'e:titleType', holders_count: 'i', status: 'e:titleStatus', description: 's' }, defaults: { type: 'singles', holders_count: 1, status: 'active' } },
  teams: { table: 'wr_teams', cols: { name: 's', kind: 'e:teamKind', brand_id: 'n', status: 'e:teamStatus', formed_date: 's', description: 's' }, defaults: { kind: 'tag_team', status: 'active' } },
  feuds: { table: 'wr_feuds', cols: { name: 's', brand_id: 'n', status: 'e:feudStatus', heat: 'i', description: 's', planned_finale: 's', started_date: 's', ended_date: 's' }, defaults: { status: 'building', heat: 1 } },
  stipulations: { table: 'wr_stipulations', cols: { name: 's', kind: 'e:stipKind', description: 's', min_sides: 'i', max_sides: 'i' }, defaults: { kind: 'standard', min_sides: 2, max_sides: 2 } },
};

function cleanRow(cfg, body) {
  const out = {};
  for (const [col, kind] of Object.entries(cfg.cols)) {
    const raw = body[col];
    if (kind === 's') out[col] = str(raw);
    else if (kind === 'n') out[col] = raw === '' || raw == null ? null : int(raw);
    else if (kind === 'i') out[col] = int(raw, cfg.defaults?.[col] ?? 0);
    else if (kind.startsWith('e:')) {
      const v = str(raw) || cfg.defaults?.[col];
      if (!ENUMS[kind.slice(2)].includes(v)) fail(400, `Invalid ${col}: ${raw}`);
      out[col] = v;
    }
  }
  if ('name' in cfg.cols && !out.name) fail(400, 'Name is required');
  if (out.heat != null) out.heat = Math.min(5, Math.max(1, out.heat));
  if (out.holders_count != null) out.holders_count = Math.min(6, Math.max(1, out.holders_count));
  if (out.weekday != null && (out.weekday < 0 || out.weekday > 6)) out.weekday = null;
  return out;
}

async function upsertSimple(env, cfg, body) {
  const row = cleanRow(cfg, body);
  const cols = Object.keys(row);
  const id = int(body.id);
  try {
    if (id) {
      await env.DB.prepare(`UPDATE ${cfg.table} SET ${cols.map(c => `${c}=?`).join(', ')} WHERE id=?`).bind(...cols.map(c => row[c]), id).run();
      return id;
    }
    const { meta } = await env.DB.prepare(`INSERT INTO ${cfg.table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).bind(...cols.map(c => row[c])).run();
    return meta.last_row_id;
  } catch (e) {
    if (/UNIQUE/i.test(String(e.message))) fail(409, `That ${cfg.table.replace('wr_', '')} name already exists`);
    throw e;
  }
}


async function deleteSimple(env, name, id) {
  const stmts = [];
  const del = (sql, ...b) => stmts.push(env.DB.prepare(sql).bind(...b));
  if (name === 'brands') {
    const used = await count(env, 'SELECT (SELECT COUNT(*) FROM wr_wrestlers WHERE brand_id=?) + (SELECT COUNT(*) FROM wr_shows WHERE brand_id=?) + (SELECT COUNT(*) FROM wr_titles WHERE brand_id=?) + (SELECT COUNT(*) FROM wr_teams WHERE brand_id=?) + (SELECT COUNT(*) FROM wr_feuds WHERE brand_id=?) AS n', id, id, id, id, id);
    if (used) fail(409, 'Brand still has wrestlers, shows, titles, teams or feuds. Move or remove them first.');
  } else if (name === 'shows') {
    if (await count(env, 'SELECT COUNT(*) AS n FROM wr_events WHERE show_id=?', id)) fail(409, 'This show has booked events. Delete those first.');
  } else if (name === 'wrestlers') {
    if (await count(env, 'SELECT COUNT(*) AS n FROM wr_match_participants WHERE wrestler_id=?', id)) fail(409, 'This plushie has match history. Set them to Retired instead of deleting.');
    del('DELETE FROM wr_team_members WHERE wrestler_id=?', id);
    del('DELETE FROM wr_feud_participants WHERE wrestler_id=?', id);
    del('DELETE FROM wr_reign_holders WHERE wrestler_id=?', id);
  } else if (name === 'titles') {
    del('DELETE FROM wr_reign_holders WHERE reign_id IN (SELECT id FROM wr_title_reigns WHERE title_id=?)', id);
    del('DELETE FROM wr_title_reigns WHERE title_id=?', id);
    del('UPDATE wr_matches SET title_id=NULL WHERE title_id=?', id);
  } else if (name === 'teams') {
    del('DELETE FROM wr_team_members WHERE team_id=?', id);
    del('UPDATE wr_match_participants SET team_id=NULL WHERE team_id=?', id);
  } else if (name === 'feuds') {
    del('DELETE FROM wr_feud_participants WHERE feud_id=?', id);
    del('UPDATE wr_matches SET feud_id=NULL WHERE feud_id=?', id);
  } else if (name === 'stipulations') {
    if (await count(env, 'SELECT COUNT(*) AS n FROM wr_matches WHERE stipulation_id=?', id)) fail(409, 'This stipulation is used by booked matches.');
  }
  del(`DELETE FROM ${TABLES[name].table} WHERE id=?`, id);
  await env.DB.batch(stmts);
}

// ── Reads ────────────────────────────────────────────────────────────────────

async function loadState(env) {
  const all = (sql) => env.DB.prepare(sql).all().then(r => r.results);
  const [brands, shows, wrestlers, titles, teams, teamMembers, feuds, feudParts, stipulations, openReigns, totals, recent, reignCounts] = await Promise.all([
    all('SELECT * FROM wr_brands ORDER BY CASE kind WHEN \'major\' THEN 0 ELSE 1 END, id'),
    all('SELECT * FROM wr_shows ORDER BY id'),
    all('SELECT * FROM wr_wrestlers ORDER BY name'),
    all('SELECT * FROM wr_titles ORDER BY brand_id, holders_count, id'),
    all('SELECT * FROM wr_teams ORDER BY name'),
    all('SELECT * FROM wr_team_members'),
    all('SELECT * FROM wr_feuds ORDER BY CASE status WHEN \'ended\' THEN 1 ELSE 0 END, heat DESC, id DESC'),
    all('SELECT * FROM wr_feud_participants'),
    all('SELECT * FROM wr_stipulations ORDER BY min_sides, max_sides, name'),
    all('SELECT r.id AS reign_id, r.title_id, r.start_date, h.wrestler_id FROM wr_title_reigns r JOIN wr_reign_holders h ON h.reign_id = r.id WHERE r.end_date IS NULL'),
    all("SELECT p.wrestler_id, SUM(p.result='win') AS w, SUM(p.result='loss') AS l, SUM(p.result='draw') AS d FROM wr_match_participants p JOIN wr_matches m ON m.id=p.match_id WHERE m.status='completed' AND m.segment_type='match' AND p.result != '' GROUP BY p.wrestler_id"),
    all("SELECT p.wrestler_id, p.result FROM wr_match_participants p JOIN wr_matches m ON m.id=p.match_id JOIN wr_events e ON e.id=m.event_id WHERE m.status='completed' AND m.segment_type='match' AND p.result != '' ORDER BY e.event_date DESC, m.id DESC LIMIT 3000"),
    all('SELECT wrestler_id, COUNT(*) AS n FROM wr_reign_holders GROUP BY wrestler_id'),
  ]);

  const records = {};
  for (const t of totals) records[t.wrestler_id] = { w: t.w || 0, l: t.l || 0, d: t.d || 0, form: [] };
  for (const r of recent) {
    const rec = records[r.wrestler_id];
    if (rec && rec.form.length < 5) rec.form.push(r.result);
  }
  const reignsBy = Object.fromEntries(reignCounts.map(r => [r.wrestler_id, r.n]));
  for (const w of wrestlers) w.title_reigns = reignsBy[w.id] || 0;

  const reignOf = {};
  for (const r of openReigns) {
    reignOf[r.title_id] ||= { reign_id: r.reign_id, since: r.start_date, champions: [] };
    reignOf[r.title_id].champions.push(r.wrestler_id);
  }
  for (const t of titles) Object.assign(t, reignOf[t.id] || { reign_id: null, since: null, champions: [] });
  for (const t of teams) t.members = teamMembers.filter(m => m.team_id === t.id).map(({ wrestler_id, role }) => ({ wrestler_id, role }));
  for (const f of feuds) f.participants = feudParts.filter(p => p.feud_id === f.id).map(({ wrestler_id, side }) => ({ wrestler_id, side }));

  const tournaments = await loadTournaments(env);
  return { brands, shows, wrestlers, titles, teams, feuds, stipulations, records, tournaments };
}

async function loadEvents(env, { from, to, ids } = {}) {
  let where, binds;
  if (ids) { where = `e.id IN (${ids.map(() => '?').join(',')})`; binds = ids; }
  else { where = 'e.event_date BETWEEN ? AND ?'; binds = [from, to]; }
  const [{ results: events }, { results: matches }, { results: parts }] = await Promise.all([
    env.DB.prepare(`SELECT e.* FROM wr_events e WHERE ${where} ORDER BY e.event_date, e.id`).bind(...binds).all(),
    env.DB.prepare(`SELECT m.*, (SELECT t.id FROM wr_tournament_ties t WHERE t.match_id = m.id) AS tournament_tie_id FROM wr_matches m JOIN wr_events e ON e.id=m.event_id WHERE ${where} ORDER BY m.card_order, m.id`).bind(...binds).all(),
    env.DB.prepare(`SELECT p.* FROM wr_match_participants p JOIN wr_matches m ON m.id=p.match_id JOIN wr_events e ON e.id=m.event_id WHERE ${where} ORDER BY p.side, p.id`).bind(...binds).all(),
  ]);
  const partsBy = {};
  for (const p of parts) (partsBy[p.match_id] ||= []).push({ wrestler_id: p.wrestler_id, team_id: p.team_id, side: p.side, result: p.result, role: p.role, note: p.note });
  const matchesBy = {};
  for (const m of matches) (matchesBy[m.event_id] ||= []).push({ ...m, participants: partsBy[m.id] || [] });
  return events.map(e => ({ ...e, matches: matchesBy[e.id] || [] }));
}

async function loadLog(env, { limit, wrestlerId, feudId }) {
  const conds = ["m.status='completed'"];
  const binds = [];
  if (wrestlerId) { conds.push('m.id IN (SELECT match_id FROM wr_match_participants WHERE wrestler_id=?)'); binds.push(wrestlerId); }
  if (feudId) { conds.push('m.feud_id=?'); binds.push(feudId); }
  const idSub = `SELECT m.id FROM wr_matches m JOIN wr_events e ON e.id=m.event_id WHERE ${conds.join(' AND ')} ORDER BY e.event_date DESC, m.id DESC LIMIT ?`;
  const [{ results: rows }, { results: parts }] = await Promise.all([
    env.DB.prepare(`SELECT m.*, e.event_date, e.name AS event_name, e.show_id, s.name AS show_name, st.name AS stipulation_name, t.name AS title_name, f.name AS feud_name
      FROM wr_matches m JOIN wr_events e ON e.id=m.event_id LEFT JOIN wr_shows s ON s.id=e.show_id LEFT JOIN wr_stipulations st ON st.id=m.stipulation_id LEFT JOIN wr_titles t ON t.id=m.title_id LEFT JOIN wr_feuds f ON f.id=m.feud_id
      WHERE m.id IN (${idSub}) ORDER BY e.event_date DESC, m.id DESC`).bind(...binds, limit).all(),
    env.DB.prepare(`SELECT p.match_id, p.wrestler_id, p.team_id, p.side, p.result, p.role, p.note FROM wr_match_participants p WHERE p.match_id IN (${idSub}) ORDER BY p.side, p.id`).bind(...binds, limit).all(),
  ]);
  const partsBy = {};
  for (const p of parts) (partsBy[p.match_id] ||= []).push(p);
  return rows.map(r => ({ ...r, participants: partsBy[r.id] || [] }));
}

// ── Titles ───────────────────────────────────────────────────────────────────

// Undo the championship effects of a completed match (used when its result is
// edited or reset): remove the reign it created and re-open the one it ended.
async function revertTitleEffects(env, matchId, eventDate) {
  const reign = await env.DB.prepare('SELECT * FROM wr_title_reigns WHERE won_match_id=?').bind(matchId).first();
  if (!reign) return;
  await env.DB.batch([
    env.DB.prepare('DELETE FROM wr_reign_holders WHERE reign_id=?').bind(reign.id),
    env.DB.prepare('DELETE FROM wr_title_reigns WHERE id=?').bind(reign.id),
  ]);
  const open = await count(env, 'SELECT COUNT(*) AS n FROM wr_title_reigns WHERE title_id=? AND end_date IS NULL', reign.title_id);
  if (open) return;
  const prev = await env.DB.prepare('SELECT id FROM wr_title_reigns WHERE title_id=? AND end_date=? ORDER BY start_date DESC, id DESC LIMIT 1').bind(reign.title_id, eventDate).first();
  if (prev) await env.DB.prepare('UPDATE wr_title_reigns SET end_date=NULL WHERE id=?').bind(prev.id).run();
}

async function loadReigns(env, titleId) {
  const [{ results: reigns }, { results: holders }] = await Promise.all([
    env.DB.prepare('SELECT * FROM wr_title_reigns WHERE title_id=? ORDER BY start_date DESC, id DESC').bind(titleId).all(),
    env.DB.prepare('SELECT h.reign_id, h.wrestler_id FROM wr_reign_holders h JOIN wr_title_reigns r ON r.id=h.reign_id WHERE r.title_id=?').bind(titleId).all(),
  ]);
  return reigns.map(r => ({ ...r, holders: holders.filter(h => h.reign_id === r.id).map(h => h.wrestler_id) }));
}

// ── Events / cards ───────────────────────────────────────────────────────────

async function saveEvent(env, body) {
  const show_id = int(body.show_id);
  const event_date = str(body.event_date);
  if (!show_id || !(await env.DB.prepare('SELECT id FROM wr_shows WHERE id=?').bind(show_id).first())) fail(400, 'Unknown show');
  if (!isDate(event_date)) fail(400, 'event_date must be yyyy-mm-dd');
  let id = int(body.id);
  if (!id) id = (await env.DB.prepare('SELECT id FROM wr_events WHERE show_id=? AND event_date=?').bind(show_id, event_date).first())?.id || null;
  const prior = id ? await env.DB.prepare('SELECT * FROM wr_events WHERE id=?').bind(id).first() : null;
  // Fields omitted from the payload keep their stored value on update.
  const pick = (k, dflt = '') => (body[k] !== undefined ? str(body[k]) : (prior?.[k] ?? dflt));
  const status = pick('status', 'draft') || 'draft';
  if (!ENUMS.eventStatus.includes(status)) fail(400, 'Invalid status');

  // Validate the whole card before writing anything, so a rejected save leaves no half-saved event.
  const cleaned = Array.isArray(body.matches) ? body.matches.map(m => {
    const segment = str(m.segment_type) || 'match';
    if (!ENUMS.segment.includes(segment)) fail(400, 'Invalid segment_type');
    return { ...m, segment, tie_id: int(m.tournament_tie_id), participants: sanitizeParticipants(m.participants) };
  }) : null;

  const fields = [show_id, event_date, pick('name'), status, pick('notes'), pick('ai_rationale')];
  if (id) {
    try {
      await env.DB.prepare('UPDATE wr_events SET show_id=?, event_date=?, name=?, status=?, notes=?, ai_rationale=? WHERE id=?').bind(...fields, id).run();
    } catch (e) {
      if (/UNIQUE/i.test(String(e.message))) fail(409, 'That show already has an event on that date.');
      throw e;
    }
  } else {
    const { meta } = await env.DB.prepare('INSERT INTO wr_events (show_id, event_date, name, status, notes, ai_rationale) VALUES (?,?,?,?,?,?)').bind(...fields).run();
    id = meta.last_row_id;
  }

  if (cleaned) {
    const { results: existing } = await env.DB.prepare('SELECT id, status FROM wr_matches WHERE event_id=?').bind(id).all();
    const existingById = new Map(existing.map(m => [m.id, m]));
    const keep = new Set(cleaned.map(m => int(m.id)).filter(Boolean));
    // Drop removed matches, but never a completed one (results stay until explicitly deleted).
    const dropIds = existing.filter(m => !keep.has(m.id) && m.status !== 'completed').map(m => m.id);
    if (dropIds.length) {
      await unlinkTies(env, dropIds);
      await env.DB.batch(dropIds.flatMap(mid => [
        env.DB.prepare('DELETE FROM wr_match_participants WHERE match_id=?').bind(mid),
        env.DB.prepare('DELETE FROM wr_matches WHERE id=?').bind(mid),
      ]));
    }
    let order = 0;
    for (const m of cleaned) {
      const { segment, participants } = m;
      const planned = [segment, int(m.stipulation_id), int(m.title_id), int(m.feud_id), m.is_main_event ? 1 : 0, str(m.planned_notes), order++];
      const mid = int(m.id);
      const prior = mid && existingById.get(mid);
      let matchId;
      if (prior) {
        matchId = mid;
        await env.DB.prepare('UPDATE wr_matches SET segment_type=?, stipulation_id=?, title_id=?, feud_id=?, is_main_event=?, planned_notes=?, card_order=? WHERE id=?').bind(...planned, matchId).run();
        if (prior.status === 'completed') continue; // booked line-up is frozen once played
        await env.DB.prepare('DELETE FROM wr_match_participants WHERE match_id=?').bind(matchId).run();
      } else {
        const { meta } = await env.DB.prepare('INSERT INTO wr_matches (segment_type, stipulation_id, title_id, feud_id, is_main_event, planned_notes, card_order, event_id) VALUES (?,?,?,?,?,?,?,?)').bind(...planned, id).run();
        matchId = meta.last_row_id;
      }
      await insertParticipants(env, matchId, participants);
      // A match booked for a tournament tie keeps that link (only while the tie is undecided).
      if (m.tie_id) await env.DB.prepare('UPDATE wr_tournament_ties SET match_id=? WHERE id=? AND winner_entrant_id IS NULL AND (match_id IS NULL OR match_id=?)').bind(matchId, m.tie_id, matchId).run();
    }
  }
  return (await loadEvents(env, { ids: [id] }))[0];
}

async function deleteEvent(env, id) {
  const { results: matches } = await env.DB.prepare('SELECT m.id, e.event_date FROM wr_matches m JOIN wr_events e ON e.id=m.event_id WHERE e.id=?').bind(id).all();
  for (const m of matches) { await onMatchReset(env, m.id); await revertTitleEffects(env, m.id, m.event_date); }
  await unlinkTies(env, matches.map(m => m.id));
  await env.DB.batch([
    env.DB.prepare('DELETE FROM wr_match_participants WHERE match_id IN (SELECT id FROM wr_matches WHERE event_id=?)').bind(id),
    env.DB.prepare('DELETE FROM wr_matches WHERE event_id=?').bind(id),
    env.DB.prepare('DELETE FROM wr_events WHERE id=?').bind(id),
  ]);
}

async function loadMatch(env, matchId) {
  const match = await env.DB.prepare('SELECT m.*, e.event_date, e.id AS eid FROM wr_matches m JOIN wr_events e ON e.id=m.event_id WHERE m.id=?').bind(matchId).first();
  if (!match) fail(404, 'Match not found');
  const { results: participants } = await env.DB.prepare('SELECT * FROM wr_match_participants WHERE match_id=?').bind(matchId).all();
  return { match, participants };
}

async function syncEventStatus(env, eventId) {
  const { results } = await env.DB.prepare('SELECT status FROM wr_matches WHERE event_id=?').bind(eventId).all();
  const ev = await env.DB.prepare('SELECT status FROM wr_events WHERE id=?').bind(eventId).first();
  if (!ev) return;
  const allDone = results.length > 0 && results.every(m => m.status !== 'booked');
  if (allDone && ev.status !== 'completed') await env.DB.prepare("UPDATE wr_events SET status='completed' WHERE id=?").bind(eventId).run();
  else if (!allDone && ev.status === 'completed') await env.DB.prepare("UPDATE wr_events SET status='booked' WHERE id=?").bind(eventId).run();
}

async function recordResult(env, matchId, body) {
  const { match, participants } = await loadMatch(env, matchId);
  if (match.status === 'completed') { await onMatchReset(env, matchId); await revertTitleEffects(env, matchId, match.event_date); }

  const results = body.results || {};
  const resultOf = (p) => {
    const v = str(results[p.wrestler_id]);
    if (v && !ENUMS.result.includes(v)) fail(400, `Invalid result: ${v}`);
    return v;
  };
  const isMatch = match.segment_type === 'match';
  // Only competitors get a result: corner plushies, interferers and run-ins never touch records.
  const resolved = participants.map(p => ({ ...p, result: isMatch && isCompetitor(p) ? resultOf(p) : '' }));
  if (isMatch && participants.some(isCompetitor) && !resolved.some(p => p.result)) fail(400, 'Pick a result for at least one plushie.');

  const titleChanged = isMatch && match.title_id && body.title_changed ? 1 : 0;
  const winners = resolved.filter(p => p.result === 'win').map(p => p.wrestler_id);
  if (titleChanged && !winners.length) fail(400, 'A title change needs a winner.');

  const rating = num(body.rating);
  await env.DB.batch([
    ...resolved.map(p => env.DB.prepare('UPDATE wr_match_participants SET result=? WHERE id=?').bind(p.result, p.id)),
    env.DB.prepare("UPDATE wr_matches SET status='completed', finish_type=?, duration_min=?, rating=?, title_changed=?, report=? WHERE id=?")
      .bind(str(body.finish_type), int(body.duration_min), rating == null ? null : Math.min(5, Math.max(0, rating)), titleChanged, str(body.report), matchId),
  ]);

  if (titleChanged) {
    const title = await env.DB.prepare('SELECT * FROM wr_titles WHERE id=?').bind(match.title_id).first();
    await endOpenReign(env, match.title_id, match.event_date);
    await startReign(env, match.title_id, winners.slice(0, title?.holders_count || 1), match.event_date, matchId);
  }
  if (isMatch) await onMatchResult(env, match, resolved, match.event_date, titleChanged);
  await syncEventStatus(env, match.event_id);
}

async function resetResult(env, matchId) {
  const { match } = await loadMatch(env, matchId);
  await onMatchReset(env, matchId);
  await revertTitleEffects(env, matchId, match.event_date);
  await env.DB.batch([
    env.DB.prepare("UPDATE wr_match_participants SET result='' WHERE match_id=?").bind(matchId),
    env.DB.prepare("UPDATE wr_matches SET status='booked', finish_type='', duration_min=NULL, rating=NULL, title_changed=0, report='' WHERE id=?").bind(matchId),
  ]);
  await syncEventStatus(env, match.event_id);
}

async function deleteMatch(env, matchId) {
  const { match } = await loadMatch(env, matchId);
  await onMatchReset(env, matchId);
  await revertTitleEffects(env, matchId, match.event_date);
  await unlinkTies(env, [matchId]);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM wr_match_participants WHERE match_id=?').bind(matchId),
    env.DB.prepare('DELETE FROM wr_matches WHERE id=?').bind(matchId),
  ]);
  await syncEventStatus(env, match.event_id);
}

// ── Router ───────────────────────────────────────────────────────────────────

export async function handleWrestlingAPI(request, env, url, { json, isAuthorized }) {
  if (!url.pathname.startsWith('/api/wr/') && url.pathname !== '/api/wr') return null;
  if (!isAuthorized(request, env)) return json({ error: 'Unauthorized' }, 401);

  const parts = url.pathname.replace(/^\/api\/wr\/?/, '').split('/').filter(Boolean);
  const method = request.method;
  const body = async () => { try { return await request.json(); } catch { return fail(400, 'Invalid JSON body'); } };
  const [a, b, c] = parts;
  const id = int(b);

  try {
    if (a === 'state' && method === 'GET') return json(await loadState(env));

    if (TABLES[a]) {
      if (!b && method === 'PUT') return json({ ok: true, id: await upsertSimple(env, TABLES[a], await body()) });
      if (id && !c && method === 'DELETE') { await deleteSimple(env, a, id); return json({ ok: true }); }
    }

    if (a === 'teams' && id && c === 'members' && method === 'PUT') {
      const { members = [] } = await body();
      const rows = members.map(m => ({ wrestler_id: int(m.wrestler_id), role: str(m.role) })).filter(m => m.wrestler_id);
      await env.DB.batch([
        env.DB.prepare('DELETE FROM wr_team_members WHERE team_id=?').bind(id),
        ...rows.map(m => env.DB.prepare('INSERT OR REPLACE INTO wr_team_members (team_id, wrestler_id, role) VALUES (?,?,?)').bind(id, m.wrestler_id, m.role)),
      ]);
      return json({ ok: true });
    }

    if (a === 'feuds' && id && c === 'participants' && method === 'PUT') {
      const { participants = [] } = await body();
      const rows = participants.map(p => ({ wrestler_id: int(p.wrestler_id), side: str(p.side) || 'A' })).filter(p => p.wrestler_id);
      await env.DB.batch([
        env.DB.prepare('DELETE FROM wr_feud_participants WHERE feud_id=?').bind(id),
        ...rows.map(p => env.DB.prepare('INSERT OR REPLACE INTO wr_feud_participants (feud_id, wrestler_id, side) VALUES (?,?,?)').bind(id, p.wrestler_id, p.side)),
      ]);
      return json({ ok: true });
    }

    if (a === 'titles' && id && c === 'reigns' && method === 'GET') return json(await loadReigns(env, id));
    if (a === 'titles' && id && c === 'champions' && method === 'POST') {
      const { wrestler_ids = [], date, notes = '' } = await body();
      const title = await env.DB.prepare('SELECT * FROM wr_titles WHERE id=?').bind(id).first();
      if (!title) fail(404, 'Title not found');
      const ids = [...new Set(wrestler_ids.map(w => int(w)).filter(Boolean))];
      if (!ids.length || ids.length > title.holders_count) fail(400, `Pick 1-${title.holders_count} champion(s).`);
      if (!isDate(str(date))) fail(400, 'Date must be yyyy-mm-dd');
      await endOpenReign(env, id, date);
      await startReign(env, id, ids, date, null, str(notes));
      return json({ ok: true });
    }
    if (a === 'titles' && id && c === 'vacate' && method === 'POST') {
      const { date } = await body();
      if (!isDate(str(date))) fail(400, 'Date must be yyyy-mm-dd');
      await endOpenReign(env, id, date);
      return json({ ok: true });
    }

    if (a === 'events') {
      if (!b && method === 'GET') {
        const from = url.searchParams.get('from') || '0000-01-01';
        const to = url.searchParams.get('to') || '9999-12-31';
        if (!isDate(from) || !isDate(to)) fail(400, 'from/to must be yyyy-mm-dd');
        return json(await loadEvents(env, { from, to }));
      }
      if (!b && method === 'PUT') return json(await saveEvent(env, await body()));
      if (id && method === 'DELETE') { await deleteEvent(env, id); return json({ ok: true }); }
    }

    if (a === 'matches' && id) {
      if (c === 'result' && method === 'POST') { await recordResult(env, id, await body()); return json({ ok: true }); }
      if (c === 'reset' && method === 'POST') { await resetResult(env, id); return json({ ok: true }); }
      if (!c && method === 'DELETE') { await deleteMatch(env, id); return json({ ok: true }); }
    }

    if (a === 'tournaments') {
      if (!b && method === 'PUT') {
        const data = await body();
        if (int(data.id)) { await updateTournament(env, int(data.id), data); return json({ ok: true, id: int(data.id) }); }
        return json({ ok: true, tournament: await createTournament(env, data) });
      }
      if (id && !c && method === 'DELETE') { await deleteTournament(env, id); return json({ ok: true }); }
      const tieId = int(parts[3]);
      if (id && c === 'ties' && tieId && parts[4] === 'book') {
        if (method === 'POST') return json({ ok: true, ...(await bookTie(env, id, tieId, await body())) });
        if (method === 'DELETE') { await unbookTie(env, id, tieId); return json({ ok: true }); }
      }
    }

    if (a === 'log' && method === 'GET') {
      const limit = Math.min(300, Math.max(1, int(url.searchParams.get("limit"), 40)));
      return json(await loadLog(env, { limit, wrestlerId: int(url.searchParams.get('wrestler_id')), feudId: int(url.searchParams.get('feud_id')) }));
    }

    if (a === 'ai-book' && method === 'POST') {
      const apiKey = (request.headers.get('X-Anthropic-Key') || env.ANTHROPIC_API_KEY || '').trim();
      if (!apiKey) fail(400, 'No Anthropic API key. Set one with the "Set API key" button.');
      return json(await aiBook(env, apiKey, await body()));
    }

    return json({ error: 'Not found' }, 404);
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    if (/no such table: wr_|no such column: (role|note)|has no column named (role|note)/i.test(String(e.message))) {
      return json({ error: 'The wrestling database is out of date. Run schema.sql, then migrations/wrestling-roles.sql once (see the project notes), then reload.' }, 500);
    }
    // ai.js sets a 4xx/5xx status on its errors (400 for bad input, 401/429/529 from Anthropic so
    // the client can stop a run, 502 for other upstream failures).
    const status = Number.isInteger(e.status) && e.status >= 400 && e.status < 600 ? e.status : 500;
    return json({ error: e.message || String(e) }, status);
  }
}
