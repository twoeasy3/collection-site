import { useMemo, useState } from 'react';
import { wr, FINISH_TYPES, byRating, ALIGNMENTS, SEGMENT_KINDS, SEGMENT_KIND_LABEL, segmentTypeOf } from '../wrApi';
import { PlushieImg, Select, Btn, Pill, Stars, AlignPip } from '../ui';

const names = (L, ids) => ids.map(id => L.wMap[id]?.name).filter(Boolean).join(' & ');
// A participant either competes (counts toward records) or is on the card without
// fighting: in a corner, interfering, or a run-in. Non-competitors' `side` is the side they back.
export const isComp = (p) => (p.role || 'competitor') === 'competitor';
export const sidesOf = (parts) => [...new Set(parts.filter(isComp).map(p => p.side))].sort((a, b) => a - b);
export const ROLE_LABEL = { corner: 'In the corner', interference: 'Interference', run_in: 'Run-in' };
const sideNames = (L, parts, side) => names(L, parts.filter(p => isComp(p) && p.side === side).map(p => p.wrestler_id));

// Everything wrong or suspicious about a booked match, as human strings.
export function matchWarnings(L, show, m, allMatches, otherDayWrestlerIds) {
  if (m.segment_type !== 'match') return []; // promos and angles aren't fights: nothing to validate
  const w = [];
  const parts = m.participants;
  const comps = parts.filter(isComp);
  const sides = sidesOf(parts);
  if (m.segment_type === 'match') {
    if (sides.length < 2) w.push('A match needs at least two sides.');
    const stip = L.stMap[m.stipulation_id];
    if (!stip) w.push('Pick a stipulation.');
    else if (sides.length >= 2 && (sides.length < stip.min_sides || sides.length > stip.max_sides)) w.push(`${stip.name} expects ${stip.min_sides === stip.max_sides ? stip.min_sides : `${stip.min_sides}-${stip.max_sides}`} sides, this has ${sides.length}.`);
  }
  if (m.title_id) {
    const t = L.tMap[m.title_id];
    const missing = t?.champions.filter(c => !comps.some(p => p.wrestler_id === c)) || [];
    if (t && missing.length && m.segment_type === 'match') w.push(`Champion ${names(L, missing)} isn’t in this title match.`);
    if (t && !t.champions.length) w.push('This title is vacant: the winner becomes the first champion.');
  }
  for (const p of parts) {
    const wr_ = L.wMap[p.wrestler_id];
    if (!wr_) continue;
    if (!isComp(p)) {
      // Non-fighters may be injured or from another brand (that's a storyline), but must back a real side.
      if (m.segment_type === 'match' && !sides.includes(p.side)) w.push(`${wr_.name} backs side ${p.side}, which isn’t in this match.`);
      continue;
    }
    if (wr_.status !== 'active') w.push(`${wr_.name} is ${wr_.status}.`);
    if (show?.brand_id && wr_.brand_id !== show.brand_id) w.push(`${wr_.name} is ${wr_.brand_id ? `on ${L.brandName(wr_.brand_id)}` : 'a free agent'}, not ${L.brandName(show.brand_id)}.`);
    if (allMatches.some(o => o !== m && o.segment_type === 'match' && o.participants.some(q => isComp(q) && q.wrestler_id === p.wrestler_id))) w.push(`${wr_.name} is booked to fight in more than one segment on this card.`);
    if (otherDayWrestlerIds.has(p.wrestler_id)) w.push(`${wr_.name} is also booked on another show today.`);
  }
  return [...new Set(w)];
}

// Plushie dropdown: this show's brand first, everyone else under "cross-brand".
function PlushiePicker({ L, show, taken, onPick, text }) {
  const brandId = show?.brand_id;
  const groups = useMemo(() => {
    const mine = [], rest = [];
    for (const w of L.wrestlers.filter(x => !taken.has(x.id) && x.status !== 'retired')) {
      const inScope = brandId ? w.brand_id === brandId : (w.brand_id == null || L.bMap[w.brand_id]?.kind === 'major');
      (inScope ? mine : rest).push(w);
    }
    return [mine.sort(byRating), rest.sort(byRating)];
  }, [L.wrestlers, taken.size, brandId]); // eslint-disable-line react-hooks/exhaustive-deps
  const label = (w) => `${w.name}${w.species ? ` (${w.species})` : ''} · ${w.card_rating}${w.status !== 'active' ? ` — ${w.status}` : ''}`;
  return (
    <select className="wr-input pick" value="" onChange={e => { if (e.target.value) onPick(Number(e.target.value)); }}>
      <option value="">{text}</option>
      <optgroup label={brandId ? L.brandName(brandId) : 'Major brands'}>{groups[0].map(w => <option key={w.id} value={w.id}>{label(w)}</option>)}</optgroup>
      {groups[1].length > 0 && <optgroup label="Other (cross-brand)">{groups[1].map(w => <option key={w.id} value={w.id}>{label(w)} · {L.brandName(w.brand_id)}</option>)}</optgroup>}
    </select>
  );
}

// Plan an alignment turn for a plushie in this match/segment (confirmed when the result is recorded).
function TurnPick({ L, p, onChange, locked }) {
  const cur = L.wMap[p.wrestler_id]?.alignment;
  if (locked) return p.turn_to ? <Pill color="#d0453f" title="Planned turn">↻ {p.turn_to}</Pill> : null;
  return (
    <select className={`wr-turn ${p.turn_to ? 'on' : ''}`} value={p.turn_to || ''} onChange={e => onChange(e.target.value)} title={`Plan an alignment turn (now ${cur}); you confirm it when you record the result`}>
      <option value="">↻ turn?</option>
      {ALIGNMENTS.filter(([k]) => k !== cur).map(([k, l]) => <option key={k} value={k}>→ {l}</option>)}
    </select>
  );
}

function Lineup({ L, show, m, onChange, locked, lockCompetitors }) {
  const taken = new Set(m.participants.map(p => p.wrestler_id));
  const Picker = ({ onPick, text }) => <PlushiePicker L={L} show={show} taken={taken} onPick={onPick} text={text} />;

  const comps = m.participants.filter(isComp);
  const extras = m.participants.filter(p => !isComp(p));
  const sides = sidesOf(m.participants);
  const compLocked = locked || lockCompetitors;
  const add = (id, side) => onChange([...m.participants, { wrestler_id: id, team_id: null, side, role: 'competitor' }]);
  const drop = (id) => onChange(m.participants.filter(p => p.wrestler_id !== id));
  const patch = (id, changes) => onChange(m.participants.map(p => (p.wrestler_id === id ? { ...p, ...changes } : p)));
  const nextSide = (sides.at(-1) || 0) + 1;
  const addTeam = (teamId) => {
    const t = L.teamMap[teamId];
    if (!t) return;
    const fresh = t.members.map(x => x.wrestler_id).filter(id => !taken.has(id) && L.wMap[id]);
    onChange([...m.participants, ...fresh.map(id => ({ wrestler_id: id, team_id: t.id, side: nextSide, role: 'competitor' }))]);
  };
  const addExtra = (id) => onChange([...m.participants, { wrestler_id: id, team_id: null, side: sides[0] || 1, role: 'corner', note: '' }]);

  return (
    <div>
      <div className="wr-lineup">
        {sides.map((s, i) => (
          <div key={s} className="wr-side">
            {i > 0 && <div className="wr-vs">VS</div>}
            <div className="wr-side-box">
              <div className="wr-side-head">Side {s}{comps.filter(p => p.side === s && p.team_id).length > 0 && <Pill>team</Pill>}</div>
              {comps.filter(p => p.side === s).map(p => {
                const w = L.wMap[p.wrestler_id];
                return (
                  <div key={p.wrestler_id} className={`wr-chip res-${p.result || ''}`}>
                    <PlushieImg w={w} color={L.brandColor(w?.brand_id)} />
                    <span>{w?.name || `#${p.wrestler_id}`}{p.result === 'win' && ' 🏆'}</span>
                    <TurnPick L={L} p={p} locked={locked} onChange={(v) => patch(p.wrestler_id, { turn_to: v })} />
                    {!compLocked && <button onClick={() => drop(p.wrestler_id)} aria-label="Remove">✕</button>}
                  </div>
                );
              })}
              {!compLocked && <Picker onPick={(id) => add(id, s)} text="+ partner…" />}
            </div>
          </div>
        ))}
        {!compLocked && (
          <div className="wr-side new">
            {sides.length > 0 && <div className="wr-vs">VS</div>}
            <div className="wr-side-box dashed">
              <div className="wr-side-head">{sides.length ? 'Opponent / new side' : 'Add first side'}</div>
              <Picker onPick={(id) => add(id, nextSide)} text="+ plushie…" />
              {L.teams.filter(t => t.status === 'active').length > 0 && (
                <select className="wr-input pick" value="" onChange={e => { if (e.target.value) addTeam(Number(e.target.value)); }}>
                  <option value="">+ whole team…</option>
                  {L.teams.filter(t => t.status === 'active').map(t => <option key={t.id} value={t.id}>{t.name} ({names(L, t.members.map(x => x.wrestler_id))})</option>)}
                </select>
              )}
            </div>
          </div>
        )}
      </div>

      {(extras.length > 0 || !locked) && (
        <div className="wr-extras">
          <div className="wr-side-head">Not fighting: corner, interference &amp; run-ins</div>
          {extras.map(p => {
            const w = L.wMap[p.wrestler_id];
            return (
              <div key={p.wrestler_id} className={`wr-extra role-${p.role}`}>
                <PlushieImg w={w} color={L.brandColor(w?.brand_id)} />
                <b>{w?.name || `#${p.wrestler_id}`}</b>
                {locked ? <Pill color="#8e6fd1">{ROLE_LABEL[p.role]}</Pill> : (
                  <select className="wr-input sm" value={p.role} onChange={e => patch(p.wrestler_id, { role: e.target.value })}>
                    {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                )}
                {locked ? <span className="wr-sub">for {sideNames(L, m.participants, p.side) || `side ${p.side}`}</span> : (
                  <select className="wr-input" value={p.side} onChange={e => patch(p.wrestler_id, { side: Number(e.target.value) })} title="Which side they back">
                    {(sides.length ? sides : [p.side]).map(s => <option key={s} value={s}>Backs {sideNames(L, m.participants, s) || `side ${s}`}</option>)}
                  </select>
                )}
                <TurnPick L={L} p={p} locked={locked} onChange={(v) => patch(p.wrestler_id, { turn_to: v })} />
                {locked ? (p.note && <em className="wr-sub">“{p.note}”</em>) : (
                  <input className="wr-input note" placeholder="What do they do? (slides in a chair, makes the save…)" value={p.note || ''} onChange={e => patch(p.wrestler_id, { note: e.target.value })} />
                )}
                {!locked && <button className="wr-icon danger" onClick={() => drop(p.wrestler_id)} aria-label="Remove">✕</button>}
              </div>
            );
          })}
          {!locked && <Picker onPick={addExtra} text="+ corner / interference / run-in…" />}
        </div>
      )}
    </div>
  );
}

// Promos / angles: no sides, no VS. Just who is involved, and what each says or does.
function SegmentBody({ L, show, m, onChange, locked }) {
  const taken = new Set(m.participants.map(p => p.wrestler_id));
  const patch = (id, changes) => onChange(m.participants.map(p => (p.wrestler_id === id ? { ...p, ...changes } : p)));
  return (
    <div className="wr-segment">
      {m.participants.map(p => {
        const w = L.wMap[p.wrestler_id];
        return (
          <div key={p.wrestler_id} className="wr-extra">
            <PlushieImg w={w} color={L.brandColor(w?.brand_id)} />
            <b>{w?.name || `#${p.wrestler_id}`}</b>
            {w && <AlignPip a={w.alignment} />}
            {locked ? (p.note && <em className="wr-sub">“{p.note}”</em>) : (
              <input className="wr-input note" placeholder="What do they say or do?" value={p.note || ''} onChange={e => patch(p.wrestler_id, { note: e.target.value })} />
            )}
            <TurnPick L={L} p={p} locked={locked} onChange={(v) => patch(p.wrestler_id, { turn_to: v })} />
            {!locked && <button className="wr-icon danger" onClick={() => onChange(m.participants.filter(x => x.wrestler_id !== p.wrestler_id))} aria-label="Remove">✕</button>}
          </div>
        );
      })}
      {!locked && <PlushiePicker L={L} show={show} taken={taken} onPick={(id) => onChange([...m.participants, { wrestler_id: id, team_id: null, side: 1, role: 'competitor', note: '', turn_to: '' }])} text="+ add a plushie to this segment…" />}
      {m.participants.length === 0 && locked && <div className="wr-sub">No plushies were part of this segment.</div>}
    </div>
  );
}

function ResultPanel({ L, m, onSaved, onCancel, showToast }) {
  const sides = sidesOf(m.participants);
  const initialOutcome = () => {
    if (m.status !== 'completed') return sides.length ? `side:${sides[0]}` : 'nc';
    const win = m.participants.find(p => isComp(p) && p.result === 'win');
    if (win) return `side:${win.side}`;
    if (m.participants.some(isComp) && m.participants.filter(isComp).every(p => p.result === 'draw')) return 'draw';
    return 'nc';
  };
  const isMatch = m.segment_type === 'match';
  const [outcome, setOutcome] = useState(initialOutcome);
  const [finish, setFinish] = useState(m.finish_type || 'pinfall');
  const [duration, setDuration] = useState(m.duration_min ?? '');
  const [rating, setRating] = useState(m.rating ?? '');
  const [report, setReport] = useState(m.report || '');
  const title = m.title_id ? L.tMap[m.title_id] : null;
  const winnerSide = outcome.startsWith('side:') ? Number(outcome.slice(5)) : null;
  const winners = winnerSide == null ? [] : m.participants.filter(p => isComp(p) && p.side === winnerSide).map(p => p.wrestler_id);
  // Default: the title changes hands when the champion(s) aren't on the winning side.
  const defaultChange = !!title && winners.length > 0 && (!title.champions.length || !title.champions.some(c => winners.includes(c)));
  const [changeOverride, setChangeOverride] = useState(m.status === 'completed' ? !!m.title_changed : null);
  const titleChanged = changeOverride ?? defaultChange;
  const [busy, setBusy] = useState(false);
  // Alignment turns: prefill from what was recorded (editing) or from the planned turns (new).
  const [turns, setTurns] = useState(() => {
    const t = {};
    if (m.status === 'completed') for (const c of m.alignment_changes || []) t[c.wrestler_id] = { to: c.to_alignment, reason: c.reason || '' };
    else for (const p of m.participants) if (p.turn_to && p.turn_to !== L.wMap[p.wrestler_id]?.alignment) t[p.wrestler_id] = { to: p.turn_to, reason: p.note || '' };
    return t;
  });
  const setTurn = (id, changes) => setTurns(t => ({ ...t, [id]: { to: '', reason: '', ...(t[id] || {}), ...changes } }));

  const save = async () => {
    const results = {};
    for (const p of m.participants.filter(isComp)) results[p.wrestler_id] = outcome === 'draw' ? 'draw' : outcome === 'nc' ? 'nc' : p.side === winnerSide ? 'win' : 'loss';
    setBusy(true);
    try {
      await wr('POST', `/matches/${m.id}/result`, { results, finish_type: isMatch ? finish : '', duration_min: duration === '' ? null : Number(duration), rating: rating === '' ? null : Number(rating), report, title_changed: isMatch && titleChanged, alignment_changes: Object.entries(turns).filter(([, v]) => v.to).map(([id, v]) => ({ wrestler_id: Number(id), to: v.to, reason: v.reason || '' })) });
      showToast(titleChanged ? 'Result saved — new champion crowned!' : 'Result saved');
      await onSaved();
    } catch (e) { showToast(e.message, 'error'); }
    setBusy(false);
  };

  return (
    <div className="wr-result">
      {isMatch && (
        <div className="wr-rrow">
          <label>Outcome
            <select className="wr-input" value={outcome} onChange={e => { setOutcome(e.target.value); setChangeOverride(m.status === 'completed' ? changeOverride : null); }}>
              {sides.map(s => <option key={s} value={`side:${s}`}>{sideNames(L, m.participants, s)} win{m.participants.filter(p => isComp(p) && p.side === s).length === 1 ? 's' : ''}</option>)}
              <option value="draw">Draw</option><option value="nc">No contest</option>
            </select>
          </label>
          <label>Finish<Select value={finish} onChange={setFinish} options={FINISH_TYPES} /></label>
          <label>Minutes<input className="wr-input sm" type="number" min="0" value={duration} onChange={e => setDuration(e.target.value)} /></label>
          <label>Stars<Select value={rating} onChange={setRating} placeholder="—" options={[...Array(11)].map((_, i) => [i / 2, `${i / 2}★`])} /></label>
        </div>
      )}
      {isMatch && title && (
        <label className="wr-check"><input type="checkbox" checked={titleChanged} onChange={e => setChangeOverride(e.target.checked)} /> 👑 {title.name} changes hands{titleChanged && winners.length > 0 && <> → <b>{names(L, winners)}</b> {winners.length > title.holders_count && <em>(only the first {title.holders_count} become champion)</em>}</>}</label>
      )}
      {m.participants.length > 0 && (
        <div className="wr-turns">
          <div className="wr-side-head">↻ Alignment changes (optional): did anyone turn?</div>
          {m.participants.map(p => {
            const w = L.wMap[p.wrestler_id];
            if (!w) return null;
            const sel = turns[p.wrestler_id]?.to || '';
            return (
              <div key={p.wrestler_id} className="wr-turnrow">
                <PlushieImg w={w} color={L.brandColor(w.brand_id)} /><b>{w.name}</b><AlignPip a={w.alignment} />
                <select className="wr-input sm" value={sel} onChange={e => setTurn(p.wrestler_id, { to: e.target.value })}>
                  <option value="">No change</option>
                  {ALIGNMENTS.filter(([k]) => k !== w.alignment || k === sel).map(([k, l]) => <option key={k} value={k}>→ {l}</option>)}
                </select>
                {sel && <input className="wr-input note" placeholder="Why? (the betrayal, the redemption…)" value={turns[p.wrestler_id]?.reason || ''} onChange={e => setTurn(p.wrestler_id, { reason: e.target.value })} />}
              </div>
            );
          })}
        </div>
      )}
      <label className="wr-block">Match report {isMatch ? '' : '(what happened)'}<small> — Claude reads this to keep the storylines going</small>
        <textarea className="wr-input" rows={4} value={report} onChange={e => setReport(e.target.value)} placeholder="Hops hit Bruno with the briefcase while the ref was down…" />
      </label>
      <div className="wr-actions"><Btn onClick={onCancel}>Cancel</Btn><Btn kind="primary" disabled={busy} onClick={save}>{m.status === 'completed' ? 'Update result' : 'Save result'}</Btn></div>
    </div>
  );
}

export default function MatchEditor({ L, show, m, idx, total, allMatches, otherDayWrestlerIds, onChange, onMove, onRemove, onNeedSave, onResultSaved, showToast, dialog }) {
  const [resultOpen, setResultOpen] = useState(false);
  const done = m.status === 'completed';
  const tieInfo = useMemo(() => {
    if (!m.tournament_tie_id) return null;
    for (const t of L.tournaments || []) { const x = t.ties.find(q => q.id === m.tournament_tie_id); if (x) return { t, x }; }
    return null;
  }, [L.tournaments, m.tournament_tie_id]);
  const isMatch = m.segment_type === 'match';
  const warnings = done ? [] : matchWarnings(L, show, m, allMatches, otherDayWrestlerIds);
  const set = (k, v) => onChange({ ...m, [k]: v });
  const titleOptions = L.titles.filter(t => t.status === 'active' && (!show?.brand_id || t.brand_id == null || t.brand_id === show.brand_id)).map(t => [t.id, `${t.name}${t.champions.length ? '' : ' (vacant)'}`]);
  const feudOptions = L.feuds.filter(f => f.status !== 'ended' || f.id === m.feud_id).map(f => [f.id, f.name]);
  const intInput = (v) => (v === '' ? null : Number(v));

  const openResult = async () => { if (await onNeedSave()) setResultOpen(true); };
  const reset = async () => {
    if (!(await dialog.confirm({ title: 'Reset this result?', message: 'The match goes back to “booked”. Any title change it caused is undone.', confirmLabel: 'Reset', danger: true }))) return;
    try { await wr('POST', `/matches/${m.id}/reset`); showToast('Result cleared'); await onResultSaved(); } catch (e) { showToast(e.message, 'error'); }
  };

  const winners = m.participants.filter(p => p.result === 'win');

  return (
    <div className={`wr-match ${done ? 'done' : ''} ${m.is_main_event ? 'main' : ''}`}>
      <div className="wr-match-head">
        <span className="wr-num">{idx + 1}</span>
        <select className="wr-input" value={isMatch ? 'match' : (m.segment_kind || 'promo')} disabled={done} title="Match, or what kind of segment this is"
          onChange={e => { const v = e.target.value; onChange(v === 'match' ? { ...m, segment_type: 'match', segment_kind: '' } : { ...m, segment_type: segmentTypeOf(v), segment_kind: v, stipulation_id: null, title_id: null }); }}>
          <option value="match">🥊 Match</option>
          <optgroup label="Promos & segments">{SEGMENT_KINDS.map(([k, l]) => <option key={k} value={k}>🎤 {l}</option>)}</optgroup>
        </select>
        {!isMatch && <input className="wr-input title" placeholder="Segment title (e.g. The belt bag signing)" value={m.title || ''} disabled={done} onChange={e => set('title', e.target.value)} />}
        {isMatch && <Select value={m.stipulation_id ?? ''} disabled={done} onChange={v => set('stipulation_id', intInput(v))} placeholder="Stipulation…" options={L.stipulations.map(s => [s.id, s.name])} />}
        {isMatch && <Select value={m.title_id ?? ''} disabled={done} onChange={v => set('title_id', intInput(v))} placeholder="Non-title" options={titleOptions} />}
        <Select value={m.feud_id ?? ''} onChange={v => set('feud_id', intInput(v))} placeholder="No feud" options={feudOptions} />
        {isMatch && <label className="wr-check inline"><input type="checkbox" checked={!!m.is_main_event} onChange={e => set('is_main_event', e.target.checked ? 1 : 0)} /> Main event</label>}
        <span style={{ flex: 1 }} />
        {done && <Pill color="#2e7d4f">Completed</Pill>}
        {m.title_id && <Pill color="#b08a1a">{L.tMap[m.title_id]?.name || 'Title'}</Pill>}
        {tieInfo && <Pill color="#2d6fb0" title="Tournament match: the line-up is set by the bracket">🏆 {tieInfo.t.name} · {tieInfo.x.round_name}</Pill>}
        <button className="wr-icon" disabled={idx === 0} onClick={() => onMove(-1)} title="Move up">▲</button>
        <button className="wr-icon" disabled={idx === total - 1} onClick={() => onMove(1)} title="Move down">▼</button>
        {!done && <button className="wr-icon danger" onClick={onRemove} title="Remove">✕</button>}
      </div>

      {isMatch
        ? (m.participants.length > 0 || !done) && <Lineup L={L} show={show} m={m} locked={done} lockCompetitors={!!tieInfo} onChange={(participants) => set('participants', participants)} />
        : <SegmentBody L={L} show={show} m={m} locked={done} onChange={(participants) => set('participants', participants)} />}

      <textarea className="wr-input notes" rows={2} placeholder="Story / booking notes: what is this segment about? (Claude reads these too)" value={m.planned_notes || ''} onChange={e => set('planned_notes', e.target.value)} />

      {warnings.length > 0 && <ul className="wr-warn">{warnings.map((w, i) => <li key={i}>⚠ {w}</li>)}</ul>}

      {done && !resultOpen && (
        <div className="wr-done">
          <div>
            {isMatch ? <b>{winners.length ? `${names(L, winners.map(p => p.wrestler_id))} won` : 'No winner'}</b> : <b>{SEGMENT_KIND_LABEL[m.segment_kind] || 'Segment'}{m.title ? `: ${m.title}` : ''}</b>}
            {m.finish_type && <span> · {FINISH_TYPES.find(f => f[0] === m.finish_type)?.[1] || m.finish_type}</span>}
            {m.duration_min != null && <span> · {m.duration_min} min</span>} <Stars value={m.rating} />
            {m.title_changed ? <Pill color="#b08a1a">NEW CHAMPION</Pill> : null}
          </div>
          {tieInfo && winners.length > 0 && <div className="wr-sub">Advances in {tieInfo.t.name}.</div>}
          {(m.alignment_changes || []).map(c => <div key={c.id} className="wr-turned">↻ <b>{L.wMap[c.wrestler_id]?.name || '?'}</b> turned <b>{c.to_alignment}</b> <span>(was {c.from_alignment})</span>{c.reason && <em> — {c.reason}</em>}</div>)}
          {m.report && <p>{m.report}</p>}
          <div className="wr-actions left"><Btn onClick={() => setResultOpen(true)}>Edit result</Btn><Btn kind="danger" onClick={reset}>Reset</Btn></div>
        </div>
      )}
      {!done && !resultOpen && m.id && (m.participants.length > 0 || !isMatch) && <div className="wr-actions left"><Btn kind="primary" onClick={openResult}>{isMatch ? 'Record result' : 'Log what happened'}</Btn></div>}
      {!done && !m.id && m.participants.length > 0 && <div className="wr-hint">Save the card to record a result.</div>}
      {resultOpen && <ResultPanel L={L} m={m} showToast={showToast} onCancel={() => setResultOpen(false)} onSaved={async () => { setResultOpen(false); await onResultSaved(); }} />}
    </div>
  );
}
