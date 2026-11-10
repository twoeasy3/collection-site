import { useMemo, useState } from 'react';
import { wr, FINISH_TYPES, TIER_RANK } from '../wrApi';
import { PlushieImg, Select, Btn, Pill, Stars } from '../ui';

const names = (L, ids) => ids.map(id => L.wMap[id]?.name).filter(Boolean).join(' & ');
export const sidesOf = (parts) => [...new Set(parts.map(p => p.side))].sort((a, b) => a - b);

// Everything wrong or suspicious about a booked match, as human strings.
export function matchWarnings(L, show, m, allMatches, otherDayWrestlerIds) {
  const w = [];
  const parts = m.participants;
  const sides = sidesOf(parts);
  if (m.segment_type === 'match') {
    if (sides.length < 2) w.push('A match needs at least two sides.');
    const stip = L.stMap[m.stipulation_id];
    if (!stip) w.push('Pick a stipulation.');
    else if (sides.length >= 2 && (sides.length < stip.min_sides || sides.length > stip.max_sides)) w.push(`${stip.name} expects ${stip.min_sides === stip.max_sides ? stip.min_sides : `${stip.min_sides}-${stip.max_sides}`} sides, this has ${sides.length}.`);
  }
  if (m.title_id) {
    const t = L.tMap[m.title_id];
    const missing = t?.champions.filter(c => !parts.some(p => p.wrestler_id === c)) || [];
    if (t && missing.length && m.segment_type === 'match') w.push(`Champion ${names(L, missing)} isn’t in this title match.`);
    if (t && !t.champions.length) w.push('This title is vacant: the winner becomes the first champion.');
  }
  for (const p of parts) {
    const wr_ = L.wMap[p.wrestler_id];
    if (!wr_) continue;
    if (wr_.status !== 'active') w.push(`${wr_.name} is ${wr_.status}.`);
    if (show?.brand_id && wr_.brand_id !== show.brand_id) w.push(`${wr_.name} is ${wr_.brand_id ? `on ${L.brandName(wr_.brand_id)}` : 'a free agent'}, not ${L.brandName(show.brand_id)}.`);
    if (allMatches.some(o => o !== m && o.participants.some(q => q.wrestler_id === p.wrestler_id))) w.push(`${wr_.name} is booked in more than one segment on this card.`);
    if (otherDayWrestlerIds.has(p.wrestler_id)) w.push(`${wr_.name} is also booked on another show today.`);
  }
  return [...new Set(w)];
}

function Lineup({ L, show, m, onChange, locked }) {
  const taken = new Set(m.participants.map(p => p.wrestler_id));
  const brandId = show?.brand_id;
  const eligible = (w) => !taken.has(w.id) && w.status !== 'retired';
  const groups = useMemo(() => {
    const mine = [], rest = [];
    for (const w of L.wrestlers.filter(eligible)) {
      const inScope = brandId ? w.brand_id === brandId : (w.brand_id == null || L.bMap[w.brand_id]?.kind === 'major');
      (inScope ? mine : rest).push(w);
    }
    const sort = (a, b) => (TIER_RANK[a.tier] - TIER_RANK[b.tier]) || a.name.localeCompare(b.name);
    return [mine.sort(sort), rest.sort(sort)];
  }, [L.wrestlers, taken.size, brandId]); // eslint-disable-line react-hooks/exhaustive-deps

  const label = (w) => `${w.name}${w.species ? ` (${w.species})` : ''}${w.status !== 'active' ? ` — ${w.status}` : ''}`;
  const Picker = ({ onPick, text }) => (
    <select className="wr-input pick" value="" onChange={e => { if (e.target.value) onPick(Number(e.target.value)); }}>
      <option value="">{text}</option>
      <optgroup label={brandId ? L.brandName(brandId) : 'Major brands'}>{groups[0].map(w => <option key={w.id} value={w.id}>{label(w)}</option>)}</optgroup>
      {groups[1].length > 0 && <optgroup label="Other (cross-brand)">{groups[1].map(w => <option key={w.id} value={w.id}>{label(w)} · {L.brandName(w.brand_id)}</option>)}</optgroup>}
    </select>
  );

  const sides = sidesOf(m.participants);
  const add = (id, side) => onChange([...m.participants, { wrestler_id: id, team_id: null, side }]);
  const drop = (id) => onChange(m.participants.filter(p => p.wrestler_id !== id).map(p => ({ ...p })));
  const nextSide = (sides.at(-1) || 0) + 1;
  const addTeam = (teamId) => {
    const t = L.teamMap[teamId];
    if (!t) return;
    const fresh = t.members.map(x => x.wrestler_id).filter(id => !taken.has(id) && L.wMap[id]);
    onChange([...m.participants, ...fresh.map(id => ({ wrestler_id: id, team_id: t.id, side: nextSide }))]);
  };

  return (
    <div className="wr-lineup">
      {sides.map((s, i) => (
        <div key={s} className="wr-side">
          {i > 0 && <div className="wr-vs">VS</div>}
          <div className="wr-side-box">
            <div className="wr-side-head">Side {s}{m.participants.filter(p => p.side === s && p.team_id).length > 0 && <Pill>team</Pill>}</div>
            {m.participants.filter(p => p.side === s).map(p => {
              const w = L.wMap[p.wrestler_id];
              return (
                <div key={p.wrestler_id} className={`wr-chip res-${p.result || ''}`}>
                  <PlushieImg w={w} color={L.brandColor(w?.brand_id)} />
                  <span>{w?.name || `#${p.wrestler_id}`}{p.result === 'win' && ' 🏆'}</span>
                  {!locked && <button onClick={() => drop(p.wrestler_id)} aria-label="Remove">✕</button>}
                </div>
              );
            })}
            {!locked && <Picker onPick={(id) => add(id, s)} text="+ partner…" />}
          </div>
        </div>
      ))}
      {!locked && (
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
  );
}

function ResultPanel({ L, m, onSaved, onCancel, showToast }) {
  const sides = sidesOf(m.participants);
  const initialOutcome = () => {
    if (m.status !== 'completed') return sides.length ? `side:${sides[0]}` : 'nc';
    const win = m.participants.find(p => p.result === 'win');
    if (win) return `side:${win.side}`;
    if (m.participants.length && m.participants.every(p => p.result === 'draw')) return 'draw';
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
  const winners = winnerSide == null ? [] : m.participants.filter(p => p.side === winnerSide).map(p => p.wrestler_id);
  // Default: the title changes hands when the champion(s) aren't on the winning side.
  const defaultChange = !!title && winners.length > 0 && (!title.champions.length || !title.champions.some(c => winners.includes(c)));
  const [changeOverride, setChangeOverride] = useState(m.status === 'completed' ? !!m.title_changed : null);
  const titleChanged = changeOverride ?? defaultChange;
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const results = {};
    for (const p of m.participants) results[p.wrestler_id] = outcome === 'draw' ? 'draw' : outcome === 'nc' ? 'nc' : p.side === winnerSide ? 'win' : 'loss';
    setBusy(true);
    try {
      await wr('POST', `/matches/${m.id}/result`, { results, finish_type: isMatch ? finish : '', duration_min: duration === '' ? null : Number(duration), rating: rating === '' ? null : Number(rating), report, title_changed: isMatch && titleChanged });
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
              {sides.map(s => <option key={s} value={`side:${s}`}>{names(L, m.participants.filter(p => p.side === s).map(p => p.wrestler_id))} win{m.participants.filter(p => p.side === s).length === 1 ? 's' : ''}</option>)}
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
        <select className="wr-input sm" value={m.segment_type} disabled={done} onChange={e => set('segment_type', e.target.value)}>
          <option value="match">Match</option><option value="promo">Promo</option><option value="angle">Angle</option>
        </select>
        {isMatch && <Select value={m.stipulation_id ?? ''} disabled={done} onChange={v => set('stipulation_id', intInput(v))} placeholder="Stipulation…" options={L.stipulations.map(s => [s.id, s.name])} />}
        {isMatch && <Select value={m.title_id ?? ''} disabled={done} onChange={v => set('title_id', intInput(v))} placeholder="Non-title" options={titleOptions} />}
        <Select value={m.feud_id ?? ''} onChange={v => set('feud_id', intInput(v))} placeholder="No feud" options={feudOptions} />
        <label className="wr-check inline"><input type="checkbox" checked={!!m.is_main_event} onChange={e => set('is_main_event', e.target.checked ? 1 : 0)} /> Main event</label>
        <span style={{ flex: 1 }} />
        {done && <Pill color="#2e7d4f">Completed</Pill>}
        {m.title_id && <Pill color="#b08a1a">{L.tMap[m.title_id]?.name || 'Title'}</Pill>}
        <button className="wr-icon" disabled={idx === 0} onClick={() => onMove(-1)} title="Move up">▲</button>
        <button className="wr-icon" disabled={idx === total - 1} onClick={() => onMove(1)} title="Move down">▼</button>
        {!done && <button className="wr-icon danger" onClick={onRemove} title="Remove">✕</button>}
      </div>

      {(m.participants.length > 0 || !done) && <Lineup L={L} show={show} m={m} locked={done} onChange={(participants) => set('participants', participants)} />}

      <textarea className="wr-input notes" rows={2} placeholder="Story / booking notes: what is this segment about? (Claude reads these too)" value={m.planned_notes || ''} onChange={e => set('planned_notes', e.target.value)} />

      {warnings.length > 0 && <ul className="wr-warn">{warnings.map((w, i) => <li key={i}>⚠ {w}</li>)}</ul>}

      {done && !resultOpen && (
        <div className="wr-done">
          <div>
            {isMatch && <b>{winners.length ? `${names(L, winners.map(p => p.wrestler_id))} won` : 'No winner'}</b>}
            {m.finish_type && <span> · {FINISH_TYPES.find(f => f[0] === m.finish_type)?.[1] || m.finish_type}</span>}
            {m.duration_min != null && <span> · {m.duration_min} min</span>} <Stars value={m.rating} />
            {m.title_changed ? <Pill color="#b08a1a">NEW CHAMPION</Pill> : null}
          </div>
          {m.report && <p>{m.report}</p>}
          <div className="wr-actions left"><Btn onClick={() => setResultOpen(true)}>Edit result</Btn><Btn kind="danger" onClick={reset}>Reset</Btn></div>
        </div>
      )}
      {!done && !resultOpen && m.id && (m.participants.length > 0 || !isMatch) && <div className="wr-actions left"><Btn kind="primary" onClick={openResult}>Record result</Btn></div>}
      {!done && !m.id && m.participants.length > 0 && <div className="wr-hint">Save the card to record a result.</div>}
      {resultOpen && <ResultPanel L={L} m={m} showToast={showToast} onCancel={() => setResultOpen(false)} onSaved={async () => { setResultOpen(false); await onResultSaved(); }} />}
    </div>
  );
}
