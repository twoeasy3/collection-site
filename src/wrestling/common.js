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
    out.push({ wrestler_id, team_id: int(p.team_id), side: Math.max(1, int(p.side, 1)), role, note: role === 'competitor' ? '' : str(p.note).slice(0, 300) });
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
  await env.DB.batch(participants.map(p => env.DB.prepare('INSERT INTO wr_match_participants (match_id, wrestler_id, team_id, side, role, note) VALUES (?,?,?,?,?,?)')
    .bind(matchId, p.wrestler_id, p.team_id ?? null, p.side, p.role || 'competitor', p.note || '')));
}
