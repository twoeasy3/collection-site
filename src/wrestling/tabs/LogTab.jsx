import { useEffect, useState } from 'react';
import { wr, prettyDate, FINISH_TYPES, SEGMENT_KIND_LABEL, ratingColor } from '../wrApi';
import { Select, Btn, Pill, Stars, AlignPip } from '../ui';

const ROLE_LABEL = { corner: 'In the corner', interference: 'Interference', run_in: 'Run-in' };
const isComp = (p) => (p.role || 'competitor') === 'competitor';

// Completed matches and segments with their reports and results: the memory Claude
// reads when it books the next show. Also the league-wide log of alignment turns
// and card-rating changes.
export default function LogTab({ L, filter, setFilter, showToast }) {
  const [view, setView] = useState('matches');
  const [limit, setLimit] = useState(40);
  const [rows, setRows] = useState(null);
  const [changes, setChanges] = useState(null);

  useEffect(() => {
    if (view !== 'matches') return;
    setRows(null);
    const qs = new URLSearchParams({ limit });
    if (filter.wrestler_id) qs.set('wrestler_id', filter.wrestler_id);
    if (filter.feud_id) qs.set('feud_id', filter.feud_id);
    wr('GET', `/log?${qs}`).then(setRows).catch(e => { showToast(e.message, 'error'); setRows([]); });
  }, [view, limit, filter.wrestler_id, filter.feud_id, showToast]);

  useEffect(() => {
    if (view === 'matches') return;
    setChanges(null);
    wr('GET', '/changes?limit=100').then(setChanges).catch(e => { showToast(e.message, 'error'); setChanges({ alignment: [], rating: [] }); });
  }, [view, showToast]);

  const sides = (m) => [...new Set(m.participants.filter(isComp).map(p => p.side))].sort((a, b) => a - b);
  const backs = (m, side) => m.participants.filter(c => isComp(c) && c.side === side).map(c => L.wMap[c.wrestler_id]?.name).filter(Boolean).join(' & ') || `side ${side}`;
  const nm = (id) => L.wMap[id]?.name || '?';

  return (
    <div>
      <div className="wr-toolbar">
        <h2 className="wr-h2">Log</h2>
        <div className="wr-chips">
          <button className={view === 'matches' ? 'on' : ''} onClick={() => setView('matches')}>Matches &amp; segments</button>
          <button className={view === 'turns' ? 'on' : ''} onClick={() => setView('turns')}>↻ Alignment turns</button>
          <button className={view === 'ratings' ? 'on' : ''} onClick={() => setView('ratings')}>Card rating changes</button>
        </div>
        {view === 'matches' && <>
          <Select value={filter.wrestler_id ?? ''} onChange={v => setFilter(f => ({ ...f, wrestler_id: v || undefined }))} placeholder="Any plushie" options={[...L.wrestlers].sort((a, b) => a.name.localeCompare(b.name)).map(w => [w.id, w.name])} />
          <Select value={filter.feud_id ?? ''} onChange={v => setFilter(f => ({ ...f, feud_id: v || undefined }))} placeholder="Any feud" options={L.feuds.map(f => [f.id, f.name])} />
          {(filter.wrestler_id || filter.feud_id) && <Btn onClick={() => setFilter({})}>Clear</Btn>}
        </>}
      </div>

      {view === 'matches' && rows == null && <div className="wr-empty">Loading…</div>}
      {view === 'matches' && rows && rows.length === 0 && <div className="wr-empty">Nothing logged yet. Record results on the Booking tab and they appear here.</div>}
      {view === 'matches' && rows && rows.map(m => {
        const isMatch = m.segment_type === 'match';
        return (
          <article key={m.id} className="wr-log">
            <div className="wr-log-top">
              <b>{prettyDate(m.event_date)}</b><span>{m.show_name}{m.event_name && ` · ${m.event_name}`}</span>
              {isMatch ? <Pill>{m.stipulation_name || 'match'}</Pill> : <Pill color="#8e6fd1">🎤 {SEGMENT_KIND_LABEL[m.segment_kind] || m.segment_type}</Pill>}
              {m.title_name && <Pill color="#b08a1a">👑 {m.title_name}{m.title_changed ? ' — NEW CHAMPION' : ''}</Pill>}
              {m.feud_name && <Pill color="#8e6fd1">{m.feud_name}</Pill>}
              {m.is_main_event ? <Pill color="#c0392b">Main event</Pill> : null}
            </div>
            {!isMatch && m.title && <div className="wr-log-sides">{m.title}</div>}
            {isMatch ? (
              <div className="wr-log-sides">
                {sides(m).map((s, i) => (
                  <span key={s}>{i > 0 && <em> vs </em>}{m.participants.filter(p => isComp(p) && p.side === s).map((p, j) => (
                    <span key={p.wrestler_id} className={`r-${p.result}`}>{j > 0 && ' & '}{nm(p.wrestler_id)}{p.result === 'win' ? ' ✔' : ''}</span>
                  ))}</span>
                ))}
              </div>
            ) : (
              <ul className="wr-log-extras">
                {m.participants.map(p => <li key={p.wrestler_id}><b>{nm(p.wrestler_id)}</b>{p.note && <em> — {p.note}</em>}</li>)}
              </ul>
            )}
            {isMatch && m.participants.some(p => !isComp(p)) && (
              <ul className="wr-log-extras">
                {m.participants.filter(p => !isComp(p)).map(p => <li key={p.wrestler_id}><b>{nm(p.wrestler_id)}</b> <Pill color="#8e6fd1">{ROLE_LABEL[p.role] || p.role}</Pill> for {backs(m, p.side)}{p.note && <em> — {p.note}</em>}</li>)}
              </ul>
            )}
            {(m.alignment_changes || []).map(c => <div key={c.id} className="wr-turned">↻ <b>{nm(c.wrestler_id)}</b> turned <b>{c.to_alignment}</b> <span>(was {c.from_alignment})</span>{c.reason && <em> — {c.reason}</em>}</div>)}
            <div className="wr-sub">
              {m.finish_type && FINISH_TYPES.find(f => f[0] === m.finish_type)?.[1]}{m.duration_min != null && ` · ${m.duration_min} min`} <Stars value={m.rating} />
            </div>
            {m.planned_notes && <div className="wr-booked">Booked as: {m.planned_notes}</div>}
            {m.report && <p>{m.report}</p>}
          </article>
        );
      })}
      {view === 'matches' && rows && rows.length >= limit && limit < 300 && <div className="wr-actions"><Btn onClick={() => setLimit(l => Math.min(300, l + 40))}>Load more</Btn></div>}

      {view === 'turns' && (changes == null ? <div className="wr-empty">Loading…</div> : changes.alignment.length === 0
        ? <div className="wr-empty">No alignment turns yet. When someone turns in a match or segment (or you change their alignment by hand) it’s logged here.</div>
        : changes.alignment.map(c => (
          <article key={c.id} className="wr-log wr-change">
            <div className="wr-log-top"><b>{prettyDate(c.event_date)}</b>
              <span><AlignPip a={c.from_alignment} /> → <AlignPip a={c.to_alignment} /></span>
              <b>{nm(c.wrestler_id)}</b> turned <b>{c.to_alignment}</b> <span>(was {c.from_alignment})</span>
              {c.match_id ? <Pill color="#8e6fd1">{c.segment_type === 'match' ? 'in a match' : `in a ${(SEGMENT_KIND_LABEL[c.segment_kind] || 'segment').toLowerCase()}`}{c.match_title ? `: ${c.match_title}` : ''}</Pill> : <Pill color="#666">by hand</Pill>}
            </div>
            {c.reason && <p>{c.reason}</p>}
          </article>
        )))}

      {view === 'ratings' && (changes == null ? <div className="wr-empty">Loading…</div> : changes.rating.length === 0
        ? <div className="wr-empty">No card-rating changes yet. Claude’s nudges (when you apply a card) and any rating you edit by hand are logged here.</div>
        : changes.rating.map(c => (
          <article key={c.id} className="wr-log wr-change">
            <div className="wr-log-top"><b>{prettyDate(c.event_date)}</b>
              <b>{nm(c.wrestler_id)}</b>
              <span className="wr-nudge-num" style={{ color: ratingColor(c.new_rating) }}>{c.old_rating} → {c.new_rating} ({c.new_rating > c.old_rating ? '+' : ''}{c.new_rating - c.old_rating})</span>
              <Pill color={c.source === 'ai' ? '#2d6fb0' : '#666'}>{c.source === 'ai' ? '✨ Claude' : 'by hand'}</Pill>
            </div>
            {c.reason && c.reason !== 'Edited by hand' && <p>{c.reason}</p>}
          </article>
        )))}
    </div>
  );
}
