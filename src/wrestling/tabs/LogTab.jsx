import { useEffect, useState } from 'react';
import { wr, prettyDate, FINISH_TYPES } from '../wrApi';
import { Select, Btn, Pill, Stars } from '../ui';

// Completed matches with their reports and results: the memory Claude reads
// when it books the next show.
export default function LogTab({ L, filter, setFilter, showToast }) {
  const [limit, setLimit] = useState(40);
  const [rows, setRows] = useState(null);

  useEffect(() => {
    setRows(null);
    const qs = new URLSearchParams({ limit });
    if (filter.wrestler_id) qs.set('wrestler_id', filter.wrestler_id);
    if (filter.feud_id) qs.set('feud_id', filter.feud_id);
    wr('GET', `/log?${qs}`).then(setRows).catch(e => { showToast(e.message, 'error'); setRows([]); });
  }, [limit, filter.wrestler_id, filter.feud_id, showToast]);

  const sides = (m) => [...new Set(m.participants.map(p => p.side))].sort((a, b) => a - b);
  return (
    <div>
      <div className="wr-toolbar">
        <h2 className="wr-h2">Match log</h2>
        <Select value={filter.wrestler_id ?? ''} onChange={v => setFilter(f => ({ ...f, wrestler_id: v || undefined }))} placeholder="Any plushie" options={[...L.wrestlers].sort((a, b) => a.name.localeCompare(b.name)).map(w => [w.id, w.name])} />
        <Select value={filter.feud_id ?? ''} onChange={v => setFilter(f => ({ ...f, feud_id: v || undefined }))} placeholder="Any feud" options={L.feuds.map(f => [f.id, f.name])} />
        {(filter.wrestler_id || filter.feud_id) && <Btn onClick={() => setFilter({})}>Clear</Btn>}
      </div>
      {rows == null && <div className="wr-empty">Loading…</div>}
      {rows && rows.length === 0 && <div className="wr-empty">No completed matches yet. Record results on the Booking tab and they appear here.</div>}
      {rows && rows.map(m => (
        <article key={m.id} className="wr-log">
          <div className="wr-log-top">
            <b>{prettyDate(m.event_date)}</b><span>{m.show_name}{m.event_name && ` · ${m.event_name}`}</span>
            <Pill>{m.stipulation_name || m.segment_type}</Pill>
            {m.title_name && <Pill color="#b08a1a">👑 {m.title_name}{m.title_changed ? ' — NEW CHAMPION' : ''}</Pill>}
            {m.feud_name && <Pill color="#8e6fd1">{m.feud_name}</Pill>}
            {m.is_main_event ? <Pill color="#c0392b">Main event</Pill> : null}
          </div>
          <div className="wr-log-sides">
            {sides(m).map((s, i) => (
              <span key={s}>{i > 0 && <em> vs </em>}{m.participants.filter(p => p.side === s).map((p, j) => (
                <span key={p.wrestler_id} className={`r-${p.result}`}>{j > 0 && ' & '}{L.wMap[p.wrestler_id]?.name || '?'}{p.result === 'win' ? ' ✔' : ''}</span>
              ))}</span>
            ))}
          </div>
          <div className="wr-sub">
            {m.finish_type && FINISH_TYPES.find(f => f[0] === m.finish_type)?.[1]}{m.duration_min != null && ` · ${m.duration_min} min`} <Stars value={m.rating} />
          </div>
          {m.planned_notes && <div className="wr-booked">Booked as: {m.planned_notes}</div>}
          {m.report && <p>{m.report}</p>}
        </article>
      ))}
      {rows && rows.length >= limit && limit < 300 && <div className="wr-actions"><Btn onClick={() => setLimit(l => Math.min(300, l + 40))}>Load more</Btn></div>}
    </div>
  );
}
