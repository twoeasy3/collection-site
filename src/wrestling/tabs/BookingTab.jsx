import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { wr, aiBook, todayISO, addDaysISO, weekdayOf, prettyDate, WEEKDAYS } from '../wrApi';
import { Modal, Btn, Pill } from '../ui';
import MatchEditor, { sidesOf } from './MatchEditor';

const clone = (x) => JSON.parse(JSON.stringify(x));
const payload = (e) => ({
  id: e.id, show_id: e.show_id, event_date: e.event_date, name: e.name || '', status: e.status, notes: e.notes || '', ai_rationale: e.ai_rationale || '',
  matches: e.matches.map(m => ({
    id: m.id, segment_type: m.segment_type, stipulation_id: m.stipulation_id ?? null, title_id: m.title_id ?? null, feud_id: m.feud_id ?? null,
    is_main_event: m.is_main_event ? 1 : 0, planned_notes: m.planned_notes || '',
    participants: m.participants.map(p => ({ wrestler_id: p.wrestler_id, team_id: p.team_id ?? null, side: p.side })),
  })),
});
let keySeq = 1;
const blankMatch = () => ({ _k: `n${keySeq++}`, segment_type: 'match', stipulation_id: null, title_id: null, feud_id: null, is_main_event: 0, planned_notes: '', status: 'booked', participants: [] });

function AiPreview({ L, suggestion, warnings, onApply, onClose, onReroll, applying }) {
  return (
    <Modal title={`✨ Claude’s card: ${suggestion.event_name || 'Untitled'}`} onClose={onClose} wide>
      {suggestion.rationale && <p className="wr-rationale">{suggestion.rationale}</p>}
      <ol className="wr-preview">
        {suggestion.matches.map((m, i) => {
          const stip = L.stMap[m.stipulation_id];
          const sides = sidesOf(m.participants);
          return (
            <li key={i} className={m.is_main_event ? 'main' : ''}>
              <div className="wr-preview-top">
                <b>{m.segment_type === 'match' ? (stip?.name || 'Match') : m.segment_type === 'promo' ? 'Promo' : 'Angle'}</b>
                {m.title_id && <Pill color="#b08a1a">👑 {L.tMap[m.title_id]?.name}</Pill>}
                {m.feud_id && <Pill color="#8e6fd1">{L.fMap[m.feud_id]?.name}</Pill>}
                {m.is_main_event ? <Pill color="#c0392b">Main event</Pill> : null}
              </div>
              <div className="wr-preview-sides">{sides.map(s => m.participants.filter(p => p.side === s).map(p => L.wMap[p.wrestler_id]?.name).join(' & ')).join('  vs  ')}</div>
              {m.planned_notes && <p>{m.planned_notes}</p>}
            </li>
          );
        })}
      </ol>
      {warnings.length > 0 && <ul className="wr-warn">{warnings.map((w, i) => <li key={i}>⚠ {w}</li>)}</ul>}
      <div className="wr-hint">Applying saves this as a <b>draft</b> card (replacing any unplayed matches). You can edit everything afterwards.</div>
      <div className="wr-actions"><Btn onClick={onClose}>Discard</Btn><Btn onClick={onReroll} disabled={applying}>↻ Re-roll</Btn><Btn kind="primary" disabled={applying} onClick={onApply}>{applying ? 'Applying…' : 'Apply as draft'}</Btn></div>
    </Modal>
  );
}

function EventEditor({ L, show, event, dayEvents, reload, reloadEvents, showToast, dialog, aiBusy, onAi }) {
  const [draft, setDraft] = useState(() => clone(event));
  const [saving, setSaving] = useState(false);
  useEffect(() => { setDraft(clone(event)); }, [event]);

  const dirty = JSON.stringify(payload(draft)) !== JSON.stringify(payload(event));
  const otherDay = useMemo(() => {
    const s = new Set();
    for (const e of dayEvents) if (e.id !== event.id) for (const m of e.matches) for (const p of m.participants) s.add(p.wrestler_id);
    return s;
  }, [dayEvents, event.id]);

  const save = useCallback(async () => {
    setSaving(true);
    try { await wr('PUT', '/events', payload(draft)); showToast('Card saved'); await reloadEvents(); return true; }
    catch (e) { showToast(e.message, 'error'); return false; }
    finally { setSaving(false); }
  }, [draft, reloadEvents, showToast]);

  const afterResult = async () => { await Promise.all([reloadEvents(), reload()]); };
  const setMatch = (i, m) => setDraft(d => ({ ...d, matches: d.matches.map((x, j) => (j === i ? m : x)) }));
  const move = (i, dir) => setDraft(d => { const a = [...d.matches]; [a[i], a[i + dir]] = [a[i + dir], a[i]]; return { ...d, matches: a }; });
  const remove = async (i) => {
    const m = draft.matches[i];
    if (m.id && !(await dialog.confirm({ title: 'Remove this segment?', message: 'It will be deleted when you save the card.', confirmLabel: 'Remove', danger: true }))) return;
    setDraft(d => ({ ...d, matches: d.matches.filter((_, j) => j !== i) }));
  };
  const removeEvent = async () => {
    if (!(await dialog.confirm({ title: 'Delete this card?', message: 'Every segment on it is deleted, including recorded results (title changes are undone).', confirmLabel: 'Delete card', danger: true }))) return;
    try { await wr('DELETE', `/events/${event.id}`); showToast('Card deleted'); await Promise.all([reloadEvents(), reload()]); } catch (e) { showToast(e.message, 'error'); }
  };

  const doneCount = draft.matches.filter(m => m.status === 'completed').length;
  return (
    <div className="wr-event">
      <div className="wr-event-head">
        <input className="wr-input title" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder={`${show.name} episode / PPV title`} />
        <select className="wr-input sm" value={draft.status} disabled={draft.status === 'completed'} onChange={e => setDraft(d => ({ ...d, status: e.target.value }))}>
          <option value="draft">Draft</option><option value="booked">Booked (locked in)</option>
          {draft.status === 'completed' && <option value="completed">Completed</option>}
        </select>
        <Pill color={draft.status === 'completed' ? '#2e7d4f' : draft.status === 'booked' ? '#2d6fb0' : '#777'}>{doneCount}/{draft.matches.length} played</Pill>
      </div>
      {draft.ai_rationale && <details className="wr-rationale-box"><summary>✨ Why Claude booked it this way</summary><p>{draft.ai_rationale}</p></details>}

      {draft.matches.map((m, i) => (
        <MatchEditor key={m.id || m._k} L={L} show={show} m={m} idx={i} total={draft.matches.length} allMatches={draft.matches} otherDayWrestlerIds={otherDay}
          onChange={(nm) => setMatch(i, nm)} onMove={(d) => move(i, d)} onRemove={() => remove(i)}
          onNeedSave={async () => (dirty ? save() : true)} onResultSaved={afterResult} showToast={showToast} dialog={dialog} />
      ))}
      {draft.matches.length === 0 && <div className="wr-empty small">No segments yet.</div>}

      <textarea className="wr-input notes" rows={2} placeholder="Show notes (optional)" value={draft.notes || ''} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} />
      <div className="wr-actions">
        <Btn kind="danger" onClick={removeEvent}>Delete card</Btn>
        <Btn onClick={() => setDraft(d => ({ ...d, matches: [...d.matches, blankMatch()] }))}>+ Add segment</Btn>
        <Btn disabled={aiBusy} onClick={onAi}>{aiBusy ? '✨ Thinking…' : '✨ Re-book with Claude'}</Btn>
        <span style={{ flex: 1 }} />
        {dirty && <Btn onClick={() => setDraft(clone(event))}>Revert</Btn>}
        <Btn kind="primary" disabled={!dirty || saving} onClick={save}>{saving ? 'Saving…' : dirty ? 'Save card' : 'Saved'}</Btn>
      </div>
    </div>
  );
}

function ShowSection({ L, show, date, event, dayEvents, scheduled, reload, reloadEvents, showToast, dialog, hasAiKey, setAiKey }) {
  const [open, setOpen] = useState(!!event || scheduled);
  const [notes, setNotes] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [applying, setApplying] = useState(false);

  const runAi = async () => {
    if (!hasAiKey) { await setAiKey(); if (!localStorage.getItem('anthropicApiKey')) return; }
    setAiBusy(true);
    try { setPreview(await aiBook(date, show.id, notes)); }
    catch (e) { showToast(e.message, 'error'); }
    setAiBusy(false);
  };
  const apply = async () => {
    setApplying(true);
    try {
      const s = preview.suggestion;
      await wr('PUT', '/events', { show_id: show.id, event_date: date, name: s.event_name, status: 'draft', ai_rationale: s.rationale, matches: [...(event?.matches.filter(m => m.status === 'completed').map(m => ({ ...m })) || []), ...s.matches] });
      showToast('Claude’s card saved as a draft');
      setPreview(null);
      await reloadEvents();
    } catch (e) { showToast(e.message, 'error'); }
    setApplying(false);
  };
  const blank = async () => {
    try { await wr('PUT', '/events', { show_id: show.id, event_date: date, name: '', status: 'draft', matches: [] }); await reloadEvents(); }
    catch (e) { showToast(e.message, 'error'); }
  };

  const brandColor = show.brand_id ? L.brandColor(show.brand_id) : '#8e6fd1';
  return (
    <section className="wr-show" style={{ '--c': brandColor }}>
      <button className="wr-show-head" onClick={() => setOpen(o => !o)}>
        <i />
        <b>{show.name}</b>
        <Pill color={brandColor}>{show.brand_id ? L.brandName(show.brand_id) : 'Cross-brand'}</Pill>
        {show.type !== 'weekly' && <Pill color="#b08a1a">{show.type === 'ppv' ? 'Pay-Per-View' : 'Special'}</Pill>}
        {scheduled && <Pill color="#2d6fb0">{show.weekday != null ? `Weekly · ${WEEKDAYS[show.weekday]}` : 'Daily'}</Pill>}
        <span style={{ flex: 1 }} />
        <span className="wr-show-state">{event ? `${event.status} · ${event.matches.length} segments` : 'not booked'}</span>
        <span>{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="wr-show-body">
          {show.description && <p className="wr-sub">{show.description}</p>}
          {event ? (
            <EventEditor L={L} show={show} event={event} dayEvents={dayEvents} reload={reload} reloadEvents={reloadEvents} showToast={showToast} dialog={dialog} aiBusy={aiBusy} onAi={runAi} />
          ) : (
            <div className="wr-unbooked">
              <textarea className="wr-input notes" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Directions for Claude (optional): e.g. “build to the PPV, give Mimi a win, a tag match in the middle”" />
              <div className="wr-actions left">
                <Btn kind="primary" disabled={aiBusy} onClick={runAi}>{aiBusy ? '✨ Claude is booking…' : '✨ Book with Claude'}</Btn>
                <Btn onClick={blank}>Create blank card</Btn>
              </div>
            </div>
          )}
          {event && <textarea className="wr-input notes" rows={1} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Directions for the next Claude re-book (optional)" />}
        </div>
      )}
      {preview && <AiPreview L={L} suggestion={preview.suggestion} warnings={preview.warnings} applying={applying} onApply={apply} onClose={() => setPreview(null)} onReroll={async () => { setPreview(null); await runAi(); }} />}
    </section>
  );
}

export default function BookingTab({ L, reload, showToast, dialog, hasAiKey, setAiKey }) {
  const [date, setDate] = useState(() => { try { return localStorage.getItem('wrDate') || todayISO(); } catch { return todayISO(); } });
  const [events, setEvents] = useState(null);
  const [dayBusy, setDayBusy] = useState('');
  const dateRef = useRef(date);
  dateRef.current = date;

  const reloadEvents = useCallback(async () => {
    const d = dateRef.current;
    try { const list = await wr('GET', `/events?from=${d}&to=${d}`); if (dateRef.current === d) setEvents(list); }
    catch (e) { showToast(e.message, 'error'); }
  }, [showToast]);
  useEffect(() => { setEvents(null); reloadEvents(); try { localStorage.setItem('wrDate', date); } catch { /* ignore */ } }, [date, reloadEvents]);

  const wd = weekdayOf(date);
  const isScheduled = (s) => s.type === 'weekly' && (s.weekday == null || s.weekday === wd);
  const shows = useMemo(() => [...L.shows].sort((a, b) => (isScheduled(b) - isScheduled(a)) || (a.type === 'weekly' ? 0 : 1) - (b.type === 'weekly' ? 0 : 1) || a.id - b.id), [L.shows, wd]); // eslint-disable-line react-hooks/exhaustive-deps
  const eventOf = (s) => events?.find(e => e.show_id === s.id);

  const bookDay = async () => {
    const todo = L.shows.filter(s => isScheduled(s) && !eventOf(s));
    if (!todo.length) { showToast('Every scheduled show already has a card.'); return; }
    if (!hasAiKey) { await setAiKey(); if (!localStorage.getItem('anthropicApiKey')) return; }
    if (!(await dialog.confirm({ title: `Book ${todo.length} show${todo.length > 1 ? 's' : ''} with Claude?`, message: `${todo.map(s => s.name).join(', ')} on ${prettyDate(date)}. Cards are saved as drafts (one Claude call per show, in order, so later shows see earlier ones).`, confirmLabel: 'Book the day' }))) return;
    const bookedIds = [];
    for (const s of todo) {
      setDayBusy(`Booking ${s.name}…`);
      try {
        const r = await aiBook(date, s.id, '');
        await wr('PUT', '/events', { show_id: s.id, event_date: date, name: r.suggestion.event_name, status: 'draft', ai_rationale: r.suggestion.rationale, matches: r.suggestion.matches });
        bookedIds.push(s.name);
        await reloadEvents();
      } catch (e) { showToast(`${s.name}: ${e.message}`, 'error'); if ([400, 401, 429, 529].includes(e.status)) break; }
    }
    setDayBusy('');
    if (bookedIds.length) showToast(`Booked: ${bookedIds.join(', ')}`);
  };

  if (!L.shows.length) return <div className="wr-empty">Create at least one show in <b>Setup</b> first (a weekly TV show per brand, plus any Pay-Per-Views).</div>;
  return (
    <div>
      <div className="wr-daybar">
        <Btn onClick={() => setDate(addDaysISO(date, -1))}>◀</Btn>
        <input type="date" className="wr-input" value={date} onChange={e => e.target.value && setDate(e.target.value)} />
        <Btn onClick={() => setDate(addDaysISO(date, 1))}>▶</Btn>
        <Btn onClick={() => setDate(todayISO())}>Today</Btn>
        <h2>{prettyDate(date)}</h2>
        <span style={{ flex: 1 }} />
        <Btn kind="primary" disabled={!!dayBusy} onClick={bookDay}>{dayBusy || '✨ Book the whole day'}</Btn>
        <Btn onClick={setAiKey}>{hasAiKey ? 'Change API key' : 'Set API key'}</Btn>
      </div>
      {events === null && <div className="wr-empty">Loading…</div>}
      {events && shows.map(s => (
        <ShowSection key={`${s.id}-${date}`} L={L} show={s} date={date} event={eventOf(s)} dayEvents={events} scheduled={isScheduled(s)}
          reload={reload} reloadEvents={reloadEvents} showToast={showToast} dialog={dialog} hasAiKey={hasAiKey} setAiKey={setAiKey} />
      ))}
    </div>
  );
}
