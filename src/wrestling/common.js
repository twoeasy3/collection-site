// Helpers shared by the wrestling API modules (api.js, tournaments.js, ai.js).

export const int = (v, d = null) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; };
export const str = (v) => String(v ?? '').trim();
export const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);
export const num = (v) => { if (v === '' || v == null) return null; const n = Number(v); return Number.isFinite(n) ? n : null; };

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const fail = (status, message) => { throw new HttpError(status, message); };

export const count = async (env, sql, ...binds) => (await env.DB.prepare(sql).bind(...binds).first())?.n || 0;

// A participant either competes (win/loss counts toward records) or is on the
// card without fighting: in a plushie's corner, interfering mid-match, or a run-in.
// For non-competitors `side` is the competitor side they back.
export const ROLES = ['competitor', 'corner', 'interference', 'run_in'];
export const ALIGNMENTS = ['face', 'heel', 'tweener'];
export const SEGMENT_KINDS = ['promo', 'interview', 'backstage', 'contract_signing', 'brawl', 'celebration', 'video', 'announcement', 'other'];
export const clampRating = (n) => Math.min(99, Math.max(0, Math.round(Number(n))));
export const todayUTC = () => new Date().toISOString().slice(0, 10);
export const isCompetitor = (p) => (p.role || 'competitor') === 'competitor';

export const sanitizeParticipants = (list) => {
  const seen = new Set();
  const out = [];
  for (const p of Array.isArray(list) ? list : []) {
    const wrestler_id = int(p.wrestler_id);
    if (!wrestler_id) continue;
    if (seen.has(wrestler_id)) fail(400, 'A plushie appears twice in the same match (a competitor can’t also be in the corner or interfere).');
    seen.add(wrestler_id);
    const role = str(p.role) || 'competitor';
    if (!ROLES.includes(role)) fail(400, `Invalid role: ${p.role}`);
    const turn_to = str(p.turn_to);
    if (turn_to && !ALIGNMENTS.includes(turn_to)) fail(400, `Invalid planned turn: ${p.turn_to}`);
    // note = what a non-competitor does, or what a plushie says/does in a promo or segment
    out.push({ wrestler_id, team_id: int(p.team_id), side: Math.max(1, int(p.side, 1)), role, note: str(p.note).slice(0, 300), turn_to });
  }
  return out;
};

export async function endOpenReign(env, titleId, date) {
  await env.DB.prepare('UPDATE wr_title_reigns SET end_date=? WHERE title_id=? AND end_date IS NULL').bind(date, titleId).run();
}

export async function startReign(env, titleId, wrestlerIds, date, matchId, notes = '') {
  const { meta } = await env.DB.prepare('INSERT INTO wr_title_reigns (title_id, start_date, won_match_id, notes) VALUES (?,?,?,?)').bind(titleId, date, matchId ?? null, notes).run();
  await env.DB.batch(wrestlerIds.map(w => env.DB.prepare('INSERT OR IGNORE INTO wr_reign_holders (reign_id, wrestler_id) VALUES (?,?)').bind(meta.last_row_id, w)));
  return meta.last_row_id;
}

// Find (or create as a draft) the event for a show on a date.
export async function ensureEvent(env, showId, date, name = '') {
  const existing = await env.DB.prepare('SELECT id FROM wr_events WHERE show_id=? AND event_date=?').bind(showId, date).first();
  if (existing) return existing.id;
  const { meta } = await env.DB.prepare("INSERT INTO wr_events (show_id, event_date, name, status) VALUES (?,?,?,'draft')").bind(showId, date, name).run();
  return meta.last_row_id;
}

export async function insertParticipants(env, matchId, participants) {
  if (!participants.length) return;
  await env.DB.batch(participants.map(p => env.DB.prepare('INSERT INTO wr_match_participants (match_id, wrestler_id, team_id, side, role, note, turn_to) VALUES (?,?,?,?,?,?,?)')
    .bind(matchId, p.wrestler_id, p.team_id ?? null, p.side, p.role || 'competitor', p.note || '', p.turn_to || '')));
}

// ── Alignment turns ──────────────────────────────────────────────────────────
// A plushie can turn face / heel / tweener in any match or segment. Each turn is
// logged (wr_alignment_changes) and applied to wr_wrestlers.alignment.

export async function applyAlignmentChanges(env, matchId, eventDate, changes) {
  const applied = [];
  for (const c of Array.isArray(changes) ? changes : []) {
    const id = int(c.wrestler_id);
    const to = str(c.to);
    if (!id) continue;
    if (!ALIGNMENTS.includes(to)) fail(400, `Invalid alignment: ${c.to}`);
    const w = await env.DB.prepare('SELECT id, alignment FROM wr_wrestlers WHERE id=?').bind(id).first();
    if (!w) fail(400, 'Unknown plushie in an alignment change.');
    if (w.alignment === to) continue;
    await env.DB.batch([
      env.DB.prepare('INSERT INTO wr_alignment_changes (wrestler_id, from_alignment, to_alignment, match_id, event_date, reason) VALUES (?,?,?,?,?,?)').bind(id, w.alignment, to, matchId ?? null, eventDate, str(c.reason).slice(0, 300)),
      env.DB.prepare('UPDATE wr_wrestlers SET alignment=? WHERE id=?').bind(to, id),
    ]);
    applied.push({ wrestler_id: id, from: w.alignment, to });
  }
  return applied;
}

// Undo the turns a match/segment recorded. Each affected plushie's remaining turns
// are re-chained from their true baseline (the "from" of their very first logged
// turn), so undoing an earlier turn can't leave a later one with a stale "from".
export async function revertAlignmentChanges(env, matchId) {
  const { results: mine } = await env.DB.prepare('SELECT DISTINCT wrestler_id FROM wr_alignment_changes WHERE match_id=?').bind(matchId).all();
  if (!mine.length) return;
  for (const { wrestler_id } of mine) {
    const { results: all } = await env.DB.prepare('SELECT * FROM wr_alignment_changes WHERE wrestler_id=? ORDER BY id').bind(wrestler_id).all();
    let cur = all[0].from_alignment;
    const stmts = [env.DB.prepare('DELETE FROM wr_alignment_changes WHERE wrestler_id=? AND match_id=?').bind(wrestler_id, matchId)];
    for (const r of all.filter(x => x.match_id !== matchId)) {
      if (r.to_alignment === cur) stmts.push(env.DB.prepare('DELETE FROM wr_alignment_changes WHERE id=?').bind(r.id)); // became a no-op
      else {
        if (r.from_alignment !== cur) stmts.push(env.DB.prepare('UPDATE wr_alignment_changes SET from_alignment=? WHERE id=?').bind(cur, r.id));
        cur = r.to_alignment;
      }
    }
    stmts.push(env.DB.prepare('UPDATE wr_wrestlers SET alignment=? WHERE id=?').bind(cur, wrestler_id));
    await env.DB.batch(stmts);
  }
}

// ── Card ratings (0-99) ──────────────────────────────────────────────────────
export const MAX_AI_NUDGE = 8;

// changes: [{ wrestler_id, delta | set, reason }]. Returns what was applied.
export async function applyRatingChanges(env, changes, { source = 'manual', eventId = null, eventDate = todayUTC() } = {}) {
  const applied = [];
  for (const c of Array.isArray(changes) ? changes : []) {
    const id = int(c.wrestler_id);
    if (!id) continue;
    const w = await env.DB.prepare('SELECT id, card_rating FROM wr_wrestlers WHERE id=?').bind(id).first();
    if (!w) fail(400, 'Unknown plushie in a rating change.');
    let next;
    if (c.set != null && c.set !== '') next = clampRating(c.set);
    else {
      let d = Math.round(Number(c.delta));
      if (!Number.isFinite(d)) continue;
      if (source === 'ai') d = Math.max(-MAX_AI_NUDGE, Math.min(MAX_AI_NUDGE, d));
      next = clampRating(w.card_rating + d);
    }
    if (next === w.card_rating) continue;
    await env.DB.batch([
      env.DB.prepare('INSERT INTO wr_rating_changes (wrestler_id, old_rating, new_rating, reason, source, event_id, event_date) VALUES (?,?,?,?,?,?,?)').bind(id, w.card_rating, next, str(c.reason).slice(0, 300), source, eventId, eventDate),
      env.DB.prepare('UPDATE wr_wrestlers SET card_rating=? WHERE id=?').bind(next, id),
    ]);
    applied.push({ wrestler_id: id, from: w.card_rating, to: next });
  }
  return applied;
}
