// Single-elimination tournaments. Round-1 ties store the two entrants (a NULL side
// is a bye); every later round is DERIVED from the previous round's winners, so
// the bracket can't drift out of sync. A tie is booked onto a show's card as a
// normal match (wr_tournament_ties.match_id); recording that match's result
// advances the winner, and the final can crown a champion of a linked title.

import { int, str, isDate, fail, endOpenReign, startReign, ensureEvent, insertParticipants } from './common.js';

const ROUND_NAMES = ['Final', 'Semi-final', 'Quarter-final', 'Round of 16', 'Round of 32'];
export const roundName = (round, rounds) => ROUND_NAMES[rounds - round] || `Round ${round}`;

const nextPow2 = (n) => { let s = 2; while (s < n) s *= 2; return s; };
// Standard seeding so byes go to the top seeds: size 8 -> [1,8,4,5,2,7,3,6].
const bracketOrder = (size) => {
  let order = [1];
  while (order.length < size) { const n = order.length; order = order.flatMap(s => [s, 2 * n + 1 - s]); }
  return order;
};
const parseMembers = (raw) => { try { const v = JSON.parse(raw); return Array.isArray(v) ? v.map(Number).filter(Boolean) : []; } catch { return []; } };

// Pure function: stored ties + entrants -> the full bracket with derived sides, byes and winners.
export function computeBracket(ties, rounds) {
  const at = new Map(ties.map(t => [`${t.round}:${t.pos}`, t]));
  const out = [];
  for (let r = 1; r <= rounds; r++) {
    for (const t of ties.filter(x => x.round === r).sort((p, q) => p.pos - q.pos)) {
      const a = r === 1 ? t.a_entrant_id : at.get(`${r - 1}:${t.pos * 2}`)?._winner ?? null;
      const b = r === 1 ? t.b_entrant_id : at.get(`${r - 1}:${t.pos * 2 + 1}`)?._winner ?? null;
      const bye = r === 1 && (a == null) !== (b == null);
      t._winner = t.winner_entrant_id ?? (bye ? (a ?? b) : null);
      out.push({ id: t.id, round: r, pos: t.pos, a, b, bye, winner: t._winner, match_id: t.match_id ?? null, ready: a != null && b != null && !t._winner });
    }
  }
  return out;
}

async function loadOne(env, t, entrantsAll, tiesAll, matchInfo) {
  const entrants = entrantsAll.filter(e => e.tournament_id === t.id).map(e => ({ id: e.id, seed: e.seed, name: e.name, team_id: e.team_id, members: parseMembers(e.members) })).sort((a, b) => a.seed - b.seed);
  const stored = tiesAll.filter(x => x.tournament_id === t.id).map(x => ({ ...x }));
  const rounds = stored.reduce((m, x) => Math.max(m, x.round), 1);
  const ties = computeBracket(stored, rounds).map(x => ({ ...x, round_name: roundName(x.round, rounds), match: x.match_id ? matchInfo[x.match_id] || null : null }));
  return { ...t, entrants, rounds, ties };
}

export async function loadTournaments(env, onlyId) {
  const where = onlyId ? 'WHERE id=?' : '';
  const b = onlyId ? [onlyId] : [];
  const all = (sql, ...bind) => env.DB.prepare(sql).bind(...bind).all().then(r => r.results);
  const [ts, entrants, ties, matches] = await Promise.all([
    all(`SELECT * FROM wr_tournaments ${where} ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, id DESC`, ...b),
    all(`SELECT * FROM wr_tournament_entrants ${onlyId ? 'WHERE tournament_id=?' : ''}`, ...b),
    all(`SELECT * FROM wr_tournament_ties ${onlyId ? 'WHERE tournament_id=?' : ''}`, ...b),
    all('SELECT t.match_id, m.status, e.event_date, e.show_id FROM wr_tournament_ties t JOIN wr_matches m ON m.id=t.match_id JOIN wr_events e ON e.id=m.event_id'),
  ]);
  const matchInfo = Object.fromEntries(matches.map(m => [m.match_id, { status: m.status, event_date: m.event_date, show_id: m.show_id }]));
  return Promise.all(ts.map(t => loadOne(env, t, entrants, ties, matchInfo)));
}

export async function createTournament(env, body) {
  const name = str(body.name);
  if (!name) fail(400, 'Name is required');
  const raw = Array.isArray(body.entrants) ? body.entrants : [];
  if (raw.length < 2) fail(400, 'A tournament needs at least 2 entrants.');
  if (raw.length > 32) fail(400, 'At most 32 entrants.');
  const entrants = raw.map(e => ({ name: str(e.name), team_id: int(e.team_id), members: [...new Set((Array.isArray(e.members) ? e.members : []).map(x => int(x)).filter(Boolean))] }));
  if (entrants.some(e => !e.members.length)) fail(400, 'Every entrant needs at least one plushie.');
  const everyone = entrants.flatMap(e => e.members);
  if (new Set(everyone).size !== everyone.length) fail(400, 'A plushie can only enter once.');
  const known = await env.DB.prepare(`SELECT id FROM wr_wrestlers WHERE id IN (${everyone.map(() => '?').join(',')})`).bind(...everyone).all();
  if (known.results.length !== everyone.length) fail(400, 'Unknown plushie in the entrant list.');
  const titleId = int(body.title_id);
  if (titleId && !(await env.DB.prepare('SELECT id FROM wr_titles WHERE id=?').bind(titleId).first())) fail(400, 'Unknown title');

  if (body.seeding === 'random') for (let i = entrants.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [entrants[i], entrants[j]] = [entrants[j], entrants[i]]; }

  const { meta } = await env.DB.prepare('INSERT INTO wr_tournaments (name, brand_id, title_id, entrant_size, description) VALUES (?,?,?,?,?)')
    .bind(name, int(body.brand_id), titleId, Math.max(...entrants.map(e => e.members.length)), str(body.description)).run();
  const tid = meta.last_row_id;

  const inserted = await env.DB.batch(entrants.map((e, i) => env.DB.prepare('INSERT INTO wr_tournament_entrants (tournament_id, seed, name, team_id, members) VALUES (?,?,?,?,?)').bind(tid, i + 1, e.name, e.team_id, JSON.stringify(e.members))));
  const idBySeed = inserted.map(r => r.meta.last_row_id); // index = seed-1

  const size = nextPow2(entrants.length);
  const rounds = Math.log2(size);
  const order = bracketOrder(size);
  const stmts = [];
  for (let r = 1; r <= rounds; r++) {
    for (let p = 0; p < size / 2 ** r; p++) {
      const a = r === 1 ? idBySeed[order[p * 2] - 1] ?? null : null;
      const b = r === 1 ? idBySeed[order[p * 2 + 1] - 1] ?? null : null;
      stmts.push(env.DB.prepare('INSERT INTO wr_tournament_ties (tournament_id, round, pos, a_entrant_id, b_entrant_id) VALUES (?,?,?,?,?)').bind(tid, r, p, a, b));
    }
  }
  await env.DB.batch(stmts);
  return (await loadTournaments(env, tid))[0];
}

export async function updateTournament(env, id, body) {
  const name = str(body.name);
  if (!name) fail(400, 'Name is required');
  await env.DB.prepare('UPDATE wr_tournaments SET name=?, brand_id=?, title_id=?, description=? WHERE id=?').bind(name, int(body.brand_id), int(body.title_id), str(body.description), id).run();
}

export async function deleteTournament(env, id) {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM wr_tournament_ties WHERE tournament_id=?').bind(id),
    env.DB.prepare('DELETE FROM wr_tournament_entrants WHERE tournament_id=?').bind(id),
    env.DB.prepare('DELETE FROM wr_tournaments WHERE id=?').bind(id),
  ]);
}

const stipFor = async (env, size) => {
  const name = size >= 3 ? 'Trios' : size === 2 ? 'Tag Team' : 'Singles';
  return (await env.DB.prepare('SELECT id FROM wr_stipulations WHERE name=?').bind(name).first())?.id ?? null;
};

export async function bookTie(env, tournamentId, tieId, body) {
  const t = (await loadTournaments(env, tournamentId))[0];
  if (!t) fail(404, 'Tournament not found');
  const tie = t.ties.find(x => x.id === tieId);
  if (!tie) fail(404, 'Tie not found');
  if (tie.winner) fail(409, 'This tie is already decided.');
  if (tie.a == null || tie.b == null) fail(409, 'Both entrants must be known first: play the earlier round.');
  if (tie.match_id && tie.match?.status !== 'completed') fail(409, 'This tie is already booked. Unbook it first to move it.');
  const showId = int(body.show_id);
  const date = str(body.event_date);
  if (!showId || !(await env.DB.prepare('SELECT id FROM wr_shows WHERE id=?').bind(showId).first())) fail(400, 'Pick a show.');
  if (!isDate(date)) fail(400, 'Pick a date.');

  const ea = t.entrants.find(e => e.id === tie.a);
  const eb = t.entrants.find(e => e.id === tie.b);
  const eventId = await ensureEvent(env, showId, date);
  const stip = int(body.stipulation_id) ?? await stipFor(env, Math.max(ea.members.length, eb.members.length));
  const order = (await env.DB.prepare('SELECT COALESCE(MAX(card_order), -1) + 1 AS n FROM wr_matches WHERE event_id=?').bind(eventId).first()).n;
  const note = `${t.name}: ${tie.round_name}${str(body.notes) ? `. ${str(body.notes)}` : ''}`;
  const { meta } = await env.DB.prepare("INSERT INTO wr_matches (event_id, card_order, segment_type, stipulation_id, is_main_event, planned_notes) VALUES (?,?,'match',?,?,?)")
    .bind(eventId, order, stip, tie.round === t.rounds ? 1 : 0, note).run();
  await insertParticipants(env, meta.last_row_id, [
    ...ea.members.map(w => ({ wrestler_id: w, side: 1, team_id: ea.team_id })),
    ...eb.members.map(w => ({ wrestler_id: w, side: 2, team_id: eb.team_id })),
  ]);
  await env.DB.batch([
    env.DB.prepare('UPDATE wr_tournament_ties SET match_id=? WHERE id=?').bind(meta.last_row_id, tieId),
    env.DB.prepare("UPDATE wr_events SET status='booked' WHERE id=? AND status='completed'").bind(eventId),
  ]);
  return { match_id: meta.last_row_id, event_id: eventId };
}

export async function unbookTie(env, tournamentId, tieId) {
  const tie = await env.DB.prepare('SELECT * FROM wr_tournament_ties WHERE id=? AND tournament_id=?').bind(tieId, tournamentId).first();
  if (!tie) fail(404, 'Tie not found');
  if (!tie.match_id) fail(409, 'This tie is not booked.');
  const m = await env.DB.prepare('SELECT status FROM wr_matches WHERE id=?').bind(tie.match_id).first();
  if (m?.status === 'completed') fail(409, 'This match was already played. Reset its result first.');
  await env.DB.batch([
    env.DB.prepare('DELETE FROM wr_match_participants WHERE match_id=?').bind(tie.match_id),
    env.DB.prepare('DELETE FROM wr_matches WHERE id=?').bind(tie.match_id),
    env.DB.prepare('UPDATE wr_tournament_ties SET match_id=NULL WHERE id=?').bind(tieId),
  ]);
}

// Called after a match result is written. `participants` carry role + result.
export async function onMatchResult(env, match, participants, eventDate, titleChanged) {
  const tie = await env.DB.prepare('SELECT * FROM wr_tournament_ties WHERE match_id=?').bind(match.id).first();
  if (!tie) return;
  const t = (await loadTournaments(env, tie.tournament_id))[0];
  const computed = t.ties.find(x => x.id === tie.id);
  const winners = new Set(participants.filter(p => (p.role || 'competitor') === 'competitor' && p.result === 'win').map(p => p.wrestler_id));
  if (!winners.size) return; // draw / no contest: the tie stays open to be re-booked
  const entrant = [computed.a, computed.b].map(id => t.entrants.find(e => e.id === id)).find(e => e && e.members.some(m => winners.has(m)));
  if (!entrant) fail(400, 'The winner isn’t an entrant of this tournament tie.');
  await env.DB.prepare('UPDATE wr_tournament_ties SET winner_entrant_id=? WHERE id=?').bind(entrant.id, tie.id).run();

  if (tie.round === t.rounds) {
    await env.DB.prepare("UPDATE wr_tournaments SET status='completed', winner_entrant_id=? WHERE id=?").bind(entrant.id, t.id).run();
    if (t.title_id && !(match.title_id === t.title_id && titleChanged)) {
      const title = await env.DB.prepare('SELECT holders_count FROM wr_titles WHERE id=?').bind(t.title_id).first();
      await endOpenReign(env, t.title_id, eventDate);
      await startReign(env, t.title_id, entrant.members.slice(0, title?.holders_count || 1), eventDate, match.id, `Won ${t.name}`);
    }
  }
}

// Called BEFORE a match result is cleared/changed/deleted. Blocks if later rounds depend on it.
export async function onMatchReset(env, matchId) {
  const tie = await env.DB.prepare('SELECT * FROM wr_tournament_ties WHERE match_id=?').bind(matchId).first();
  if (!tie || !tie.winner_entrant_id) return;
  const next = await env.DB.prepare('SELECT winner_entrant_id, match_id FROM wr_tournament_ties WHERE tournament_id=? AND round=? AND pos=?').bind(tie.tournament_id, tie.round + 1, tie.pos >> 1).first();
  if (next && (next.winner_entrant_id || next.match_id)) fail(409, 'The next bracket round is already booked or played. Unbook or reset it first.');
  await env.DB.batch([
    env.DB.prepare('UPDATE wr_tournament_ties SET winner_entrant_id=NULL WHERE id=?').bind(tie.id),
    env.DB.prepare("UPDATE wr_tournaments SET status='active', winner_entrant_id=NULL WHERE id=? AND status='completed'").bind(tie.tournament_id),
  ]);
}

export const unlinkTies = (env, matchIds) => (matchIds.length
  ? env.DB.prepare(`UPDATE wr_tournament_ties SET match_id=NULL WHERE match_id IN (${matchIds.map(() => '?').join(',')})`).bind(...matchIds).run()
  : Promise.resolve());

