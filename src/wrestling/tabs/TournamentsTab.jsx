import { useState } from 'react';
import { wr, todayISO, prettyDate } from '../wrApi';
import { PlushieImg, Modal, Field, Select, Btn, Pill } from '../ui';

const SIZES = [[1, 'Singles (1 plushie per entrant)'], [2, 'Tag teams (2 per entrant)'], [3, 'Trios (3 per entrant)']];
const pow2 = (n) => { let s = 2; while (s < n) s *= 2; return s; };

const entrantName = (L, e) => e.name || e.members.map(id => L.wMap[id]?.name || '?').join(' & ');

function EntrantRow({ L, t, id, tie, side }) {
  if (id == null) return <div className="wr-tie-row tbd">{side === 'b' && tie.bye ? 'BYE' : side === 'a' && tie.bye ? 'BYE' : 'TBD'}</div>;
  const e = t.entrants.find(x => x.id === id);
  if (!e) return <div className="wr-tie-row tbd">?</div>;
  return (
    <div className={`wr-tie-row ${tie.winner === id ? 'win' : tie.winner ? 'lose' : ''}`}>
      <span className="wr-seed">{e.seed}</span>
      <span className="wr-tie-imgs">{e.members.map(m => L.wMap[m] && <PlushieImg key={m} w={L.wMap[m]} color={L.brandColor(L.wMap[m].brand_id)} />)}</span>
      <span className="wr-tie-name">{entrantName(L, e)}</span>
      {tie.winner === id && <span className="wr-tie-w">✔</span>}
    </div>
  );
}

function BookModal({ L, t, tie, onClose, showToast, reload }) {
  const brandShows = L.shows.filter(s => !t.brand_id || s.brand_id == null || s.brand_id === t.brand_id);
  const [showId, setShowId] = useState(brandShows[0]?.id ?? '');
  const [date, setDate] = useState(todayISO());
  const [stip, setStip] = useState('');
  const [notes, setNotes] = useState('');
  const save = async () => {
    try {
      await wr('POST', `/tournaments/${t.id}/ties/${tie.id}/book`, { show_id: Number(showId), event_date: date, stipulation_id: stip || null, notes });
      showToast('Booked. It’s on that show’s card now.'); await reload(); onClose();
    } catch (e) { showToast(e.message, 'error'); }
  };
  const a = t.entrants.find(e => e.id === tie.a), b = t.entrants.find(e => e.id === tie.b);
  return (
    <Modal title={`Book: ${t.name} — ${tie.round_name}`} onClose={onClose}>
      <p className="wr-sub"><b>{entrantName(L, a)}</b> vs <b>{entrantName(L, b)}</b>. The match is added to the show’s card as a draft segment; record the result on the Booking tab and the winner advances automatically.</p>
      <div className="wr-form-grid one">
        <Field label="Show"><Select value={showId} onChange={setShowId} options={L.shows.map(s => [s.id, `${s.name}${s.type !== 'weekly' ? ` (${s.type === 'ppv' ? 'PPV' : 'special'})` : ''}`])} /></Field>
        <Field label="Date"><input className="wr-input" type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
        <Field label="Stipulation" hint="Blank = Singles / Tag Team / Trios to match the entrants"><Select value={stip} onChange={setStip} placeholder="Automatic" options={L.stipulations.map(s => [s.id, s.name])} /></Field>
        <Field label="Notes (optional)"><input className="wr-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Story beat for this tie…" /></Field>
      </div>
      <div className="wr-actions"><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" disabled={!showId} onClick={save}>Book it</Btn></div>
    </Modal>
  );
}

function CreateModal({ L, onClose, showToast, reload }) {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [titleId, setTitleId] = useState('');
  const [size, setSize] = useState(1);
  const [seeding, setSeeding] = useState('order');
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);

  const pool = L.wrestlers.filter(w => w.status === 'active' && (!brand || w.brand_id === Number(brand)));
  const used = new Set(rows.flatMap(r => r.members).filter(Boolean));
  const blankRow = () => ({ name: '', team_id: null, members: Array(size).fill('') });
  const changeSize = (n) => { setSize(Number(n)); setRows([]); };
  const setMember = (ri, mi, v) => setRows(a => a.map((r, i) => (i === ri ? { ...r, members: r.members.map((m, j) => (j === mi ? Number(v) || '' : m)) } : r)));
  const move = (i, d) => setRows(a => { const c = [...a]; [c[i], c[i + d]] = [c[i + d], c[i]]; return c; });

  const fillSingles = () => setRows(pool.filter(w => !used.has(w.id)).sort((a, b) => a.name.localeCompare(b.name)).map(w => ({ name: '', team_id: null, members: [w.id] })));
  const addTeams = () => {
    const teams = L.teams.filter(t => t.status === 'active' && t.members.length === size && (!brand || t.brand_id === Number(brand)) && t.members.every(m => !used.has(m.wrestler_id)));
    setRows(a => [...a, ...teams.map(t => ({ name: t.name, team_id: t.id, members: t.members.map(m => m.wrestler_id) }))]);
  };
  const filled = rows.filter(r => r.members.every(Boolean) && r.members.length === size);
  const slots = filled.length >= 2 ? pow2(filled.length) : 0;

  const create = async () => {
    setBusy(true);
    try {
      const res = await wr('PUT', '/tournaments', { name, brand_id: brand || null, title_id: titleId || null, seeding, entrants: filled.map(r => ({ name: r.name, team_id: r.team_id, members: r.members })) });
      showToast(`${res.tournament.name} created: ${res.tournament.entrants.length} entrants`); await reload(); onClose();
    } catch (e) { showToast(e.message, 'error'); }
    setBusy(false);
  };

  return (
    <Modal title="New tournament" onClose={onClose} wide>
      <div className="wr-form-grid">
        <Field label="Name"><input className="wr-input" value={name} onChange={e => setName(e.target.value)} placeholder="King of the Plush" autoFocus /></Field>
        <Field label="Brand" hint="Leave blank for a cross-brand tournament"><Select value={brand} onChange={v => { setBrand(v); setRows([]); }} placeholder="Cross-brand" options={L.brands.map(b => [b.id, b.name])} /></Field>
        <Field label="Entrants are"><Select value={size} onChange={changeSize} options={SIZES} /></Field>
        <Field label="Winner is crowned champion of…"><Select value={titleId} onChange={setTitleId} placeholder="No title (just glory)" options={L.titles.filter(t => t.status === 'active').map(t => [t.id, t.name])} /></Field>
        <Field label="Seeding"><Select value={seeding} onChange={setSeeding} options={[['order', 'In the order listed (top seeds get byes)'], ['random', 'Random draw']]} /></Field>
      </div>
      <h4 className="wr-h4">Entrants ({filled.length}){slots > 0 && <small className="wr-sub"> → {slots}-slot bracket, {slots - filled.length} bye{slots - filled.length === 1 ? '' : 's'}</small>}</h4>
      <div className="wr-actions left" style={{ marginTop: 0, marginBottom: 10 }}>
        {size === 1 && <Btn onClick={fillSingles}>Fill with all active {brand ? L.brandName(Number(brand)) : ''} plushies</Btn>}
        {size > 1 && <Btn onClick={addTeams}>Add all active {size === 2 ? 'tag teams' : 'trios'}</Btn>}
        <Btn onClick={() => setRows(a => [...a, blankRow()])}>+ Add entrant</Btn>
        {rows.length > 0 && <Btn kind="danger" onClick={() => setRows([])}>Clear</Btn>}
      </div>
      {rows.map((r, ri) => (
        <div key={ri} className="wr-partrow">
          <span className="wr-seed">{ri + 1}</span>
          {r.members.map((m, mi) => (
            <Select key={mi} value={m} onChange={v => setMember(ri, mi, v)} placeholder="Plushie…" options={pool.filter(w => !used.has(w.id) || w.id === m).map(w => [w.id, w.name])} />
          ))}
          {size > 1 && <input className="wr-input" placeholder="Team name (optional)" value={r.name} onChange={e => setRows(a => a.map((x, i) => (i === ri ? { ...x, name: e.target.value } : x)))} />}
          <button className="wr-icon" disabled={ri === 0} onClick={() => move(ri, -1)}>▲</button>
          <button className="wr-icon" disabled={ri === rows.length - 1} onClick={() => move(ri, 1)}>▼</button>
          <button className="wr-icon danger" onClick={() => setRows(a => a.filter((_, i) => i !== ri))}>✕</button>
        </div>
      ))}
      {rows.length === 0 && <div className="wr-empty small">Add entrants, or use the quick-fill buttons above.</div>}
      <div className="wr-actions"><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" disabled={busy || !name.trim() || filled.length < 2} onClick={create}>Create bracket</Btn></div>
    </Modal>
  );
}

function Bracket({ L, t, onBook, onUnbook }) {
  const rounds = [...Array(t.rounds)].map((_, i) => i + 1);
  return (
    <div className="wr-bracket">
      {rounds.map(r => {
        const ties = t.ties.filter(x => x.round === r).sort((a, b) => a.pos - b.pos);
        return (
          <div key={r} className="wr-round">
            <h4>{ties[0]?.round_name}</h4>
            <div className="wr-round-ties">
              {ties.map(tie => {
                const booked = tie.match_id && tie.match?.status !== 'completed';
                const played = tie.match_id && tie.match?.status === 'completed';
                return (
                  <div key={tie.id} className={`wr-tie ${tie.ready ? 'ready' : ''} ${tie.bye ? 'bye' : ''}`}>
                    <EntrantRow L={L} t={t} id={tie.a} tie={tie} side="a" />
                    <EntrantRow L={L} t={t} id={tie.b} tie={tie} side="b" />
                    <div className="wr-tie-foot">
                      {tie.bye && <span>Bye: advances</span>}
                      {played && <span>✔ Played {tie.match.event_date}</span>}
                      {booked && <><span>📅 {prettyDate(tie.match.event_date)} · {L.sMap[tie.match.show_id]?.name}</span><button className="wr-link" onClick={() => onUnbook(tie)}>Unbook</button></>}
                      {tie.ready && !tie.match_id && <Btn kind="primary" onClick={() => onBook(tie)}>Book on a card</Btn>}
                      {tie.ready && played && <Btn onClick={() => onBook(tie)}>Rebook (no result)</Btn>}
                      {!tie.ready && !tie.bye && !tie.winner && !tie.match_id && <span className="dim">Waiting for the earlier round</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function TournamentsTab({ L, reload, showToast, dialog }) {
  const [creating, setCreating] = useState(false);
  const [booking, setBooking] = useState(null);

  const unbook = async (t, tie) => {
    try { await wr('DELETE', `/tournaments/${t.id}/ties/${tie.id}/book`); showToast('Unbooked'); await reload(); } catch (e) { showToast(e.message, 'error'); }
  };
  const remove = async (t) => {
    if (!(await dialog.confirm({ title: `Delete “${t.name}”?`, message: 'The bracket is removed. Matches already played stay in the match log, and any title already awarded stays.', confirmLabel: 'Delete', danger: true }))) return;
    try { await wr('DELETE', `/tournaments/${t.id}`); showToast('Deleted'); await reload(); } catch (e) { showToast(e.message, 'error'); }
  };

  return (
    <div>
      <div className="wr-toolbar"><h2 className="wr-h2">Tournaments</h2><span style={{ flex: 1 }} /><Btn kind="primary" onClick={() => setCreating(true)}>+ New tournament</Btn></div>
      {L.tournaments.length === 0 && <div className="wr-empty">No tournaments yet. Create a single-elimination bracket, book its ties onto your shows, and the winner can be crowned champion.</div>}
      {L.tournaments.map(t => {
        const winner = t.winner_entrant_id ? t.entrants.find(e => e.id === t.winner_entrant_id) : null;
        const title = t.title_id ? L.tMap[t.title_id] : null;
        return (
          <section key={t.id} className={`wr-tourney ${t.status}`} style={{ '--c': t.brand_id ? L.brandColor(t.brand_id) : '#b08a1a' }}>
            <div className="wr-tourney-head">
              <h3>{t.name}</h3>
              <Pill color={t.status === 'completed' ? '#2e7d4f' : '#2d6fb0'}>{t.status}</Pill>
              <Pill color={t.brand_id ? L.brandColor(t.brand_id) : '#8e6fd1'}>{t.brand_id ? L.brandName(t.brand_id) : 'Cross-brand'}</Pill>
              {title && <Pill color="#b08a1a">👑 winner takes {title.name}</Pill>}
              <span className="wr-sub">{t.entrants.length} entrants · {t.rounds} rounds</span>
              <span style={{ flex: 1 }} />
              <Btn kind="danger" onClick={() => remove(t)}>Delete</Btn>
            </div>
            {winner && (
              <div className="wr-winner">
                <span className="wr-tie-imgs big">{winner.members.map(m => L.wMap[m] && <PlushieImg key={m} w={L.wMap[m]} color={L.brandColor(L.wMap[m].brand_id)} />)}</span>
                <div><small>Tournament champion</small><b>{entrantName(L, winner)}</b></div>
              </div>
            )}
            <Bracket L={L} t={t} onBook={(tie) => setBooking({ t, tie })} onUnbook={(tie) => unbook(t, tie)} />
          </section>
        );
      })}
      {creating && <CreateModal L={L} onClose={() => setCreating(false)} showToast={showToast} reload={reload} />}
      {booking && <BookModal L={L} t={booking.t} tie={booking.tie} onClose={() => setBooking(null)} showToast={showToast} reload={reload} />}
    </div>
  );
}
