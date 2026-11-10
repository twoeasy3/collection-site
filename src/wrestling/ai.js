// Claude-assisted daily booking for the plushie wrestling league.
//
// aiBook() gathers a compact picture of the league (roster + records, champions,
// feuds, teams, recent match REPORTS, upcoming cards, who is already booked that
// day), asks Claude to book one show via a tool call, then validates every id in
// the answer against the database before handing it back. It does NOT save the
// card: the client previews it and applies it as a draft through PUT /api/wr/events.
//
// Anthropic key: X-Anthropic-Key header from the browser (same localStorage key
// as the car AI fill), or an ANTHROPIC_API_KEY Worker secret. Model: AI_MODEL var.

import { loadTournaments } from './tournaments.js';

const DEFAULT_MODEL = 'claude-sonnet-5-5';
const EXTRA_ROLES = ['corner', 'interference', 'run_in'];

const httpError = (status, message) => Object.assign(new Error(message), { status });
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const clip = (s, n) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };
const addDays = (iso, n) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const daysBetween = (a, b) => Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 86400000);

const SYSTEM = `You are the head booker of a fantasy professional wrestling league whose wrestlers are living plushie animals. There are two major brands and one developmental brand. You book one show at a time, and your cards must keep long-running storylines coherent.

How to book well:
- Use ONLY the wrestler, title, feud, stipulation ids you are given. Every wrestler may appear at most once on the card. Never book injured or unavailable wrestlers.
- Read the recent match reports: continue what actually happened (who beat whom, betrayals, injuries, promo beats). Reference concrete past events in planned_notes.
- Feuds: advance active feuds with a segment that moves the story. Heat 1-2 = build slowly with non-finish matches; heat 3-4 = escalate (stipulation upgrade, tag-team involvement, run-ins); heat 5 or a planned_finale = blow-off. Blow-offs belong on Pay-Per-Views unless the notes say otherwise. Don't end a feud on a weekly show without a reason.
- Titles: champions defend regularly (check last defence date), challengers must be earned from recent wins or an active feud. Tag titles use tag matches with two plushies per side. Title changes are decided later when results are entered, so don't pre-decide winners; planned_notes should describe the story and the stakes, not the finish.
- Sides: partners share the same side number; in N-way matches (triple threat, fatal 4-way, etc.) every wrestler gets a different side number. Handicap matches are N-on-1. Respect each stipulation's allowed side count (min_sides/max_sides).
- Balance the card: faces vs heels, tiers (main_event wrestlers headline, enhancement wrestlers lose to push others), and variety of stipulations. Keep stipulation matches for feuds that earn them. Put the main event last and set is_main_event true on exactly one match.
- Brand integrity: weekly shows only use their own brand's roster. Pay-Per-Views and specials draw from both major brands. The developmental brand's show is for newcomers and building prospects, with simpler matches.
- Typical size: weekly show 5-7 segments, developmental 4-6, PPV/special 7-9. Include promo/angle segments (no stipulation) where a feud needs a non-match beat.
- Non-fighting participants: besides competitors, a participant can have role "corner" (stands in a competitor's corner, doesn't fight), "interference" (interferes mid-match) or "run_in" (runs in after/around the bell). For these, "side" is the competitor side they BACK, and "note" says what they do ("slides a chair in", "pulls the referee out"). Use them sparingly to advance feuds, protect finishes, introduce a new alliance or tease a betrayal; heels interfere more than faces. A plushie can't be both a competitor and a non-competitor in the same match. A non-competitor does not count as "booked" for the rest of the card.
- Tournaments: if the league state lists tournament ties that are ready to be played, advance them: set tournament_tie_id on a match (the entrants are filled in automatically). A tournament's rounds should be spread across shows, with the final on a Pay-Per-View or special.
- If the user gave booking notes, follow them.

Respond ONLY by calling the book_show tool.`;

const TOOL = {
  name: 'book_show',
  description: 'Book the full card for one show.',
  input_schema: {
    type: 'object',
    properties: {
      event_name: { type: 'string', description: 'Episode title, or the PPV/special name.' },
      rationale: { type: 'string', description: '2-4 sentences: the storyline logic of this card.' },
      matches: {
        type: 'array',
        description: 'The card in running order, main event last.',
        items: {
          type: 'object',
          properties: {
            segment_type: { type: 'string', enum: ['match', 'promo', 'angle'] },
            stipulation_id: { type: ['integer', 'null'], description: 'Required for matches; null for promo/angle.' },
            title_id: { type: ['integer', 'null'], description: 'Set when this is a championship match.' },
            feud_id: { type: ['integer', 'null'], description: 'The feud this advances, if any.' },
            tournament_tie_id: { type: ['integer', 'null'], description: 'A ready tournament tie to play in this match; entrants are filled in automatically.' },
            is_main_event: { type: 'boolean' },
            planned_notes: { type: 'string', description: 'The story beat / intent in 1-3 sentences. Not the finish.' },
            participants: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  wrestler_id: { type: 'integer' },
                  side: { type: 'integer', description: 'Competitors: partners share a side, N-way all different. Non-competitors: the competitor side they back.' },
                  role: { type: 'string', enum: ['competitor', 'corner', 'interference', 'run_in'], description: 'Default competitor.' },
                  note: { type: 'string', description: 'For non-competitors: what they do.' },
                },
                required: ['wrestler_id', 'side'],
              },
            },
          },
          required: ['segment_type', 'planned_notes', 'participants'],
        },
      },
    },
    required: ['event_name', 'rationale', 'matches'],
  },
};

async function gatherContext(env, show, date) {
  const all = (sql, ...b) => env.DB.prepare(sql).bind(...b).all().then(r => r.results);
  const crossBrand = show.brand_id == null;

  const [brands, wrestlers, titles, teams, teamMembers, feuds, feudParts, stips, records, bookedElsewhere, recent, upcoming, tournaments] = await Promise.all([
    all('SELECT * FROM wr_brands'),
    all('SELECT * FROM wr_wrestlers WHERE status != ?', 'retired'),
    all("SELECT * FROM wr_titles WHERE status='active'"),
    all("SELECT * FROM wr_teams WHERE status='active'"),
    all('SELECT * FROM wr_team_members'),
    all("SELECT * FROM wr_feuds WHERE status != 'ended'"),
    all('SELECT * FROM wr_feud_participants'),
    all('SELECT * FROM wr_stipulations ORDER BY id'),
    all("SELECT p.wrestler_id, SUM(p.result='win') AS w, SUM(p.result='loss') AS l FROM wr_match_participants p JOIN wr_matches m ON m.id=p.match_id WHERE m.status='completed' AND m.segment_type='match' GROUP BY p.wrestler_id"),
    // Booked elsewhere today, or already played on THIS card (a re-book keeps completed matches).
    all("SELECT DISTINCT p.wrestler_id FROM wr_match_participants p JOIN wr_matches m ON m.id=p.match_id JOIN wr_events e ON e.id=m.event_id WHERE e.event_date=? AND (e.show_id != ? OR m.status='completed')", date, show.id),
    all(`SELECT m.*, e.event_date, e.name AS event_name, s.name AS show_name, st.name AS stip FROM wr_matches m JOIN wr_events e ON e.id=m.event_id JOIN wr_shows s ON s.id=e.show_id LEFT JOIN wr_stipulations st ON st.id=m.stipulation_id
      WHERE m.status='completed' AND e.event_date < ? ${crossBrand ? '' : 'AND (s.brand_id = ? OR s.brand_id IS NULL)'} ORDER BY e.event_date DESC, m.id DESC LIMIT 30`, ...(crossBrand ? [date] : [date, show.brand_id])),
    all('SELECT e.id, e.event_date, e.name, s.name AS show_name, s.type FROM wr_events e JOIN wr_shows s ON s.id=e.show_id WHERE e.event_date > ? AND e.event_date <= ? ORDER BY e.event_date', date, addDays(date, 28)),
    loadTournaments(env),
  ]);

  const majorIds = new Set(brands.filter(b => b.kind === 'major').map(b => b.id));
  const inScope = (w) => (crossBrand ? (w.brand_id == null || majorIds.has(w.brand_id)) : w.brand_id === show.brand_id);
  const scoped = wrestlers.filter(inScope);
  const elsewhere = new Set(bookedElsewhere.map(r => r.wrestler_id));
  const brandName = Object.fromEntries(brands.map(b => [b.id, b.name]));
  const wById = Object.fromEntries(wrestlers.map(w => [w.id, w]));
  const rec = Object.fromEntries(records.map(r => [r.wrestler_id, r]));

  const available = scoped.filter(w => w.status === 'active' && !elsewhere.has(w.id));
  const unavailable = scoped.filter(w => w.status !== 'active' || elsewhere.has(w.id));

  const scopedIds = new Set(scoped.map(w => w.id));
  const ref = (id) => `${wById[id]?.name ?? '?'}#${id}`;

  // Reigns + last defence per title.
  const [openReigns, lastDefences] = await Promise.all([
    all('SELECT r.title_id, r.start_date, h.wrestler_id FROM wr_title_reigns r JOIN wr_reign_holders h ON h.reign_id=r.id WHERE r.end_date IS NULL'),
    all("SELECT m.title_id, MAX(e.event_date) AS d FROM wr_matches m JOIN wr_events e ON e.id=m.event_id WHERE m.title_id IS NOT NULL AND m.status='completed' GROUP BY m.title_id"),
  ]);
  const defenceBy = Object.fromEntries(lastDefences.map(r => [r.title_id, r.d]));
  const titleLines = titles
    .filter(t => crossBrand ? true : (t.brand_id == null || t.brand_id === show.brand_id))
    .map(t => {
      const reign = openReigns.filter(r => r.title_id === t.id);
      const champs = reign.map(r => ref(r.wrestler_id)).join(' & ');
      const since = reign[0]?.start_date;
      return {
        id: t.id, name: t.name, type: t.type, holders_needed: t.holders_count, brand: t.brand_id ? brandName[t.brand_id] : 'cross-brand',
        champions: champs || 'VACANT', days_held: since ? daysBetween(since, date) : null, last_defence: defenceBy[t.id] || (since || null),
        champion_available: reign.length > 0 && reign.every(r => available.some(w => w.id === r.wrestler_id)),
      };
    });

  const feudLines = feuds
    .filter(f => crossBrand ? true : (f.brand_id == null || f.brand_id === show.brand_id))
    .map(f => {
      const ps = feudParts.filter(p => p.feud_id === f.id);
      const last = recent.find(m => m.feud_id === f.id);
      return {
        id: f.id, name: f.name, status: f.status, heat: f.heat, story: clip(f.description, 300), planned_finale: f.planned_finale || undefined,
        sides: Object.fromEntries([...new Set(ps.map(p => p.side))].map(s => [s, ps.filter(p => p.side === s).map(p => ref(p.wrestler_id))])),
        last_beat: last ? `${last.event_date}: ${clip(last.report, 200)}` : undefined,
      };
    });

  const teamLines = teams
    .filter(t => crossBrand ? true : (t.brand_id == null || t.brand_id === show.brand_id))
    .map(t => ({ id: t.id, name: t.name, kind: t.kind, members: teamMembers.filter(m => m.team_id === t.id).map(m => ref(m.wrestler_id)) }));

  // Recent match lines with participants.
  const recentIds = recent.map(m => m.id);
  let recentParts = [];
  if (recentIds.length) recentParts = await all(`SELECT * FROM wr_match_participants WHERE match_id IN (${recentIds.map(() => '?').join(',')})`, ...recentIds);
  const recentLines = recent.map(m => {
    const ps = recentParts.filter(p => p.match_id === m.id);
    const comps = ps.filter(p => (p.role || 'competitor') === 'competitor');
    const extras = ps.filter(p => (p.role || 'competitor') !== 'competitor');
    const sides = [...new Set(comps.map(p => p.side))].sort((a, b) => a - b);
    const text = sides.map(s => comps.filter(p => p.side === s).map(p => `${wById[p.wrestler_id]?.name ?? '?'}${p.result === 'win' ? '(W)' : p.result === 'loss' ? '(L)' : ''}`).join(' & ')).join(' vs ')
      + (extras.length ? ` [${extras.map(p => `${p.role.replace('_', '-')}: ${wById[p.wrestler_id]?.name ?? '?'} for ${comps.filter(c => c.side === p.side).map(c => wById[c.wrestler_id]?.name).filter(Boolean).join(' & ') || `side ${p.side}`}${p.note ? ` (${clip(p.note, 60)})` : ''}`).join('; ')}]` : '');
    return `${m.event_date} ${m.show_name}${m.title_id ? ' [TITLE]' : ''}${m.title_changed ? ' [NEW CHAMPION]' : ''} ${m.stip || m.segment_type}: ${text || '(no participants)'}${m.finish_type ? ` via ${m.finish_type}` : ''}${m.feud_id ? ` (feud#${m.feud_id})` : ''}. ${clip(m.report, 240)}`;
  });

  const upcomingLines = [];
  for (const e of upcoming) {
    const ms = await all('SELECT planned_notes, is_main_event FROM wr_matches WHERE event_id=? ORDER BY card_order', e.id);
    upcomingLines.push(`${e.event_date} ${e.show_name} (${e.type})${e.name ? ` "${e.name}"` : ''}: ${ms.map(m => clip(m.planned_notes, 80)).filter(Boolean).join(' | ') || 'not yet booked'}`);
  }

  const nameOfEntrant = (e) => e.name || e.members.map(m => wById[m]?.name ?? '?').join(' & ');
  const tourneyLines = tournaments.filter(t => t.status === 'active').map(t => ({
    id: t.id, name: t.name, winner_gets_title: t.title_id ? (titles.find(x => x.id === t.title_id)?.name ?? 'a title') : undefined, rounds: t.rounds,
    ready_ties_to_book: t.ties.filter(x => x.ready && !x.match_id).map(x => ({ tie_id: x.id, round: x.round_name, a: nameOfEntrant(t.entrants.find(e => e.id === x.a)), b: nameOfEntrant(t.entrants.find(e => e.id === x.b)) })),
    already_booked: t.ties.filter(x => x.match_id && x.match?.status !== 'completed').length,
  })).filter(t => t.ready_ties_to_book.length || t.already_booked);
  const tieIndex = new Map();
  for (const t of tournaments.filter(x => x.status === 'active')) for (const x of t.ties) if (x.ready && !x.match_id) tieIndex.set(x.id, { a: t.entrants.find(e => e.id === x.a), b: t.entrants.find(e => e.id === x.b), final: x.round === t.rounds });

  const wl = (w) => ({
    id: w.id, name: w.name, species: w.species, brand: w.brand_id ? brandName[w.brand_id] : 'free agent', alignment: w.alignment, tier: w.tier,
    record: `${rec[w.id]?.w || 0}-${rec[w.id]?.l || 0}`, gimmick: clip(w.gimmick, 80) || undefined, finisher: w.finisher || undefined,
  });

  return {
    show: { id: show.id, name: show.name, type: show.type, brand: show.brand_id ? brandName[show.brand_id] : 'cross-brand (both major brands)' },
    date,
    available_wrestlers: available.map(wl),
    unavailable: unavailable.map(w => `${w.name}#${w.id} (${w.status !== 'active' ? w.status : 'already booked on another show today'})`),
    titles: titleLines,
    active_feuds: feudLines,
    teams: teamLines,
    stipulations: stips.map(s => ({ id: s.id, name: s.name, kind: s.kind, min_sides: s.min_sides, max_sides: s.max_sides })),
    recent_results_newest_first: recentLines,
    upcoming_cards: upcomingLines,
    tournaments: tourneyLines,
    _valid: { available: new Set(available.map(w => w.id)), stips: new Map(stips.map(s => [s.id, s])), titles: new Set(titleLines.map(t => t.id)), feuds: new Set(feudLines.map(f => f.id)), teams: teams.map(t => ({ id: t.id, members: teamMembers.filter(m => m.team_id === t.id).map(m => m.wrestler_id) })), scopedIds, ties: tieIndex, nameOf: (id) => wById[id]?.name || `#${id}` },
  };
}

async function callClaude(env, apiKey, model, context, notes) {
  const { _valid, ...visible } = context;
  const res = await fetch(`${env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com'}/v1/messages`, { // ANTHROPIC_BASE_URL: tests only
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model,
      max_tokens: 6000,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: 'auto' },
      messages: [{
        role: 'user',
        content: `Book this show.\n\n${notes ? `Booking notes from the owner: ${notes}\n\n` : ''}League state (JSON):\n${JSON.stringify(visible)}`,
      }],
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw httpError([401, 429, 529].includes(res.status) ? res.status : 502, `Anthropic API ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  const block = (data.content || []).find(b => b.type === 'tool_use' && b.name === TOOL.name);
  if (!block) {
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join(' ').slice(0, 200);
    throw httpError(502, `Claude did not return a card${data.stop_reason === 'max_tokens' ? ' (ran out of tokens)' : ''}${text ? `: ${text}` : ''}`);
  }
  return block.input;
}

// Drop anything that isn't a real id, keep the rest, and say what was changed.
function validate(raw, valid) {
  const warnings = [];
  const usedCompetitors = new Set(); // a plushie fights at most once per card (non-fighters may appear more than once)
  const usedTies = new Set();
  const matches = [];
  const stipNamed = (name) => [...valid.stips.values()].find(s => s.name === name);
  for (const m of Array.isArray(raw.matches) ? raw.matches : []) {
    const segment = ['match', 'promo', 'angle'].includes(m.segment_type) ? m.segment_type : 'match';
    let stip = valid.stips.get(m.stipulation_id);
    let competitors = [];
    const extras = [];
    const inMatch = new Set();
    for (const p of Array.isArray(m.participants) ? m.participants : []) {
      const id = Number(p.wrestler_id);
      const role = EXTRA_ROLES.includes(p.role) ? p.role : 'competitor';
      if (!valid.available.has(id)) { warnings.push(`Dropped ${valid.nameOf(id)}: unavailable or unknown.`); continue; }
      if (inMatch.has(id)) { warnings.push(`${valid.nameOf(id)} was listed twice in one match; kept the first.`); continue; }
      if (role === 'competitor') {
        if (usedCompetitors.has(id)) { warnings.push(`${valid.nameOf(id)} was booked to fight twice; kept the first booking.`); continue; }
        usedCompetitors.add(id);
      }
      inMatch.add(id);
      const row = { wrestler_id: id, side: Math.max(1, parseInt(p.side, 10) || 1), team_id: null, role, note: role === 'competitor' ? '' : String(p.note || '').trim().slice(0, 300) };
      (role === 'competitor' ? competitors : extras).push(row);
    }

    // A tournament tie: the entrants are filled in for real, whatever Claude listed.
    let tieId = null;
    const tie = segment === 'match' ? valid.ties.get(Number(m.tournament_tie_id)) : null;
    if (tie && !usedTies.has(Number(m.tournament_tie_id))) {
      tieId = Number(m.tournament_tie_id);
      usedTies.add(tieId);
      competitors.forEach(c => usedCompetitors.delete(c.wrestler_id));
      competitors = [];
      for (const [entrant, side] of [[tie.a, 1], [tie.b, 2]]) {
        for (const w of entrant.members) {
          if (!valid.available.has(w)) warnings.push(`Tournament entrant ${valid.nameOf(w)} isn’t available on this show; adjust by hand.`);
          usedCompetitors.add(w);
          competitors.push({ wrestler_id: w, side, team_id: entrant.team_id ?? null, role: 'competitor', note: '' });
        }
      }
      const clash = new Set(competitors.map(c => c.wrestler_id));
      for (let i = extras.length - 1; i >= 0; i--) if (clash.has(extras[i].wrestler_id)) extras.splice(i, 1);
      if (!stip) stip = stipNamed(Math.max(tie.a.members.length, tie.b.members.length) >= 2 ? 'Tag Team' : 'Singles');
    } else if (m.tournament_tie_id) {
      warnings.push('Ignored a tournament tie that is not ready to be played.');
    }

    const sides = new Set(competitors.map(p => p.side));
    if (segment === 'match') {
      if (sides.size < 2) { warnings.push(`Dropped a match with fewer than two sides ("${clip(m.planned_notes, 50)}").`); continue; }
      if (stip && (sides.size < stip.min_sides || sides.size > stip.max_sides)) warnings.push(`${stip.name} expects ${stip.min_sides}-${stip.max_sides} sides but got ${sides.size}.`);
      if (!stip) warnings.push('A match had no valid stipulation; set it by hand.');
    }
    // A side that is exactly a team's full line-up wrestles as that team.
    for (const side of sides) {
      const ids = competitors.filter(p => p.side === side).map(p => p.wrestler_id);
      const team = valid.teams.find(t => t.members.length >= 2 && t.members.length === ids.length && t.members.every(x => ids.includes(x)));
      if (team) competitors.filter(p => p.side === side && !p.team_id).forEach(p => { p.team_id = team.id; });
    }
    // Corner / interference / run-ins must back a side that actually competes.
    const keptExtras = extras.filter(e => {
      if (segment === 'match' && !sides.has(e.side)) { warnings.push(`Dropped ${e.role.replace('_', '-')} by ${valid.nameOf(e.wrestler_id)}: it backs side ${e.side}, which doesn’t exist.`); return false; }
      return true;
    });
    matches.push({
      segment_type: segment,
      stipulation_id: segment === 'match' && stip ? stip.id : null,
      title_id: valid.titles.has(m.title_id) ? m.title_id : null,
      feud_id: valid.feuds.has(m.feud_id) ? m.feud_id : null,
      tournament_tie_id: tieId,
      is_main_event: !!m.is_main_event || (tieId != null && tie?.final && m.is_main_event !== false),
      planned_notes: String(m.planned_notes || '').trim(),
      participants: [...competitors, ...keptExtras],
    });
  }
  const mains = matches.filter(m => m.is_main_event);
  if (matches.length && mains.length !== 1) {
    matches.forEach(m => { m.is_main_event = false; });
    matches[matches.length - 1].is_main_event = true;
  }
  return { event_name: String(raw.event_name || '').trim(), rationale: String(raw.rationale || '').trim(), matches, warnings };
}

export async function aiBook(env, apiKey, body) {
  const date = String(body.date || '').trim();
  if (!isDate(date)) throw httpError(400, 'date must be yyyy-mm-dd');
  const show = await env.DB.prepare('SELECT * FROM wr_shows WHERE id=?').bind(parseInt(body.show_id, 10)).first();
  if (!show) throw httpError(400, 'Unknown show');
  const notes = String(body.notes || '').trim().slice(0, 1500);

  const context = await gatherContext(env, show, date);
  if (context.available_wrestlers.length < 2) throw httpError(400, `Not enough available wrestlers for ${show.name} (${context.available_wrestlers.length}). Add plushies to this brand first.`);

  const model = env.AI_MODEL || DEFAULT_MODEL;
  const raw = await callClaude(env, apiKey, model, context, notes);
  const suggestion = validate(raw, context._valid);

  const { meta } = await env.DB.prepare('INSERT INTO wr_ai_runs (show_id, event_date, notes, response, model) VALUES (?,?,?,?,?)')
    .bind(show.id, date, notes, JSON.stringify(suggestion).slice(0, 60000), model).run();
  return { ok: true, run_id: meta.last_row_id, suggestion, warnings: suggestion.warnings };
}
