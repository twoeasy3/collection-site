import { useState } from 'react';
import { wr, todayISO, daysSince, prettyDate } from '../wrApi';
import { PlushieImg, Modal, Field, Select, Btn, Pill } from '../ui';

const TYPES = [['singles', 'Singles (1 champion)'], ['tag', 'Tag team (2 champions)'], ['trios', 'Trios (3 champions)']];
const HOLDERS = { singles: 1, tag: 2, trios: 3 };

function TitleForm({ t, L, reload, showToast, dialog, onClose }) {
  const [d, setD] = useState(t);
  const set = (k, v) => setD(x => ({ ...x, [k]: v }));
  const save = async () => {
    try { await wr('PUT', '/titles', d); showToast('Saved'); await reload(); onClose(); } catch (e) { showToast(e.message, 'error'); }
  };
  const remove = async () => {
    if (!(await dialog.confirm({ title: `Delete ${t.name}?`, message: 'Its reign history is deleted and matches lose their title link. Retire it instead to keep history.', confirmLabel: 'Delete', danger: true }))) return;
    try { await wr('DELETE', `/titles/${t.id}`); showToast('Deleted'); await reload(); onClose(); } catch (e) { showToast(e.message, 'error'); }
  };
  return (
    <Modal title={t.id ? `Edit ${t.name}` : 'New championship'} onClose={onClose}>
      <div className="wr-form-grid one">
        <Field label="Name"><input className="wr-input" value={d.name} onChange={e => set('name', e.target.value)} autoFocus /></Field>
        <Field label="Brand" hint="Leave on cross-brand for a title defended on PPVs and both shows"><Select value={d.brand_id ?? ''} onChange={v => set('brand_id', v)} placeholder="Cross-brand" options={L.brands.map(b => [b.id, b.name])} /></Field>
        <Field label="Type"><Select value={d.type} onChange={v => setD(x => ({ ...x, type: v, holders_count: HOLDERS[v] }))} options={TYPES} /></Field>
        <Field label="Status"><Select value={d.status} onChange={v => set('status', v)} options={[['active', 'Active'], ['retired', 'Retired']]} /></Field>
        <Field label="Description"><textarea className="wr-input" rows={2} value={d.description} onChange={e => set('description', e.target.value)} /></Field>
      </div>
      <div className="wr-actions">{t.id && <Btn kind="danger" onClick={remove}>Delete</Btn>}<span style={{ flex: 1 }} /><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" onClick={save}>Save</Btn></div>
    </Modal>
  );
}

function CrownModal({ t, L, reload, showToast, onClose }) {
  const [ids, setIds] = useState(() => [...Array(t.holders_count)].map((_, i) => t.champions[i] ?? ''));
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState('');
  const pool = L.wrestlers.filter(w => w.status !== 'retired' && (!t.brand_id || w.brand_id === t.brand_id || L.bMap[w.brand_id]?.kind === 'major')).sort((a, b) => a.name.localeCompare(b.name));
  const save = async () => {
    try { await wr('POST', `/titles/${t.id}/champions`, { wrestler_ids: ids.filter(Boolean), date, notes }); showToast('New champion crowned'); await reload(); onClose(); }
    catch (e) { showToast(e.message, 'error'); }
  };
  const teams = L.teams.filter(x => x.status === 'active' && x.members.length === t.holders_count);
  return (
    <Modal title={`Crown ${t.name} champion${t.holders_count > 1 ? 's' : ''}`} onClose={onClose}>
      <p className="wr-sub">Use this for storyline decisions made outside a match (vacated and re-awarded, a tournament, a retcon). Title matches update champions automatically when you record the result.</p>
      <div className="wr-form-grid one">
        {teams.length > 0 && <Field label="Quick pick a team"><Select value="" onChange={v => { const tm = L.teamMap[v]; if (tm) setIds(tm.members.map(m => m.wrestler_id)); }} placeholder="—" options={teams.map(x => [x.id, x.name])} /></Field>}
        {ids.map((id, i) => <Field key={i} label={t.holders_count > 1 ? `Champion ${i + 1}` : 'Champion'}><Select value={id} onChange={v => setIds(a => a.map((x, j) => (j === i ? Number(v) || '' : x)))} placeholder="Choose…" options={pool.map(w => [w.id, `${w.name} (${w.species})`])} /></Field>)}
        <Field label="Won on"><input className="wr-input" type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
        <Field label="Notes"><input className="wr-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Won the tournament final…" /></Field>
      </div>
      <div className="wr-actions"><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" onClick={save}>Crown</Btn></div>
    </Modal>
  );
}

function History({ t, L }) {
  const [reigns, setReigns] = useState(null);
  const load = async () => setReigns(await wr('GET', `/titles/${t.id}/reigns`));
  if (!reigns) return <button className="wr-link" onClick={load}>Show reign history</button>;
  return (
    <ol className="wr-reigns">
      {reigns.length === 0 && <li><em>No reigns yet</em></li>}
      {reigns.map((r, i) => (
        <li key={r.id}><b>#{reigns.length - i}</b> {r.holders.map(id => L.wMap[id]?.name || '?').join(' & ')} <span>{prettyDate(r.start_date)} → {r.end_date ? `${prettyDate(r.end_date)} (${daysSince(r.start_date, r.end_date)} d)` : `present (${daysSince(r.start_date)} d)`}</span>{r.notes && <em> {r.notes}</em>}</li>
      ))}
    </ol>
  );
}

export default function TitlesTab(props) {
  const { L, reload, showToast, dialog } = props;
  const [edit, setEdit] = useState(null);
  const [crown, setCrown] = useState(null);
  const groups = [{ name: 'Cross-brand', id: null }, ...L.brands.map(b => ({ name: b.name, id: b.id, color: b.color }))];
  const vacate = async (t) => {
    if (!(await dialog.confirm({ title: `Vacate ${t.name}?`, message: 'The current champion(s) lose the title today.', confirmLabel: 'Vacate', danger: true }))) return;
    try { await wr('POST', `/titles/${t.id}/vacate`, { date: todayISO() }); showToast('Title vacated'); await reload(); } catch (e) { showToast(e.message, 'error'); }
  };
  return (
    <div>
      <div className="wr-toolbar"><h2 className="wr-h2">Championships</h2><span style={{ flex: 1 }} /><Btn kind="primary" onClick={() => setEdit({ name: '', brand_id: '', type: 'singles', holders_count: 1, status: 'active', description: '' })}>+ New title</Btn></div>
      {L.titles.length === 0 && <div className="wr-empty">No championships yet. Create one, then crown a champion.</div>}
      {groups.map(g => {
        const list = L.titles.filter(t => (g.id == null ? t.brand_id == null : t.brand_id === g.id));
        if (!list.length) return null;
        return (
          <section key={g.name} className="wr-division" style={{ '--c': g.color || '#b08a1a' }}>
            <h2><i />{g.name}<small>{list.length}</small></h2>
            <div className="wr-titles">
              {list.map(t => {
                const champs = t.champions.map(id => L.wMap[id]).filter(Boolean);
                return (
                  <div key={t.id} className={`wr-title ${t.status === 'retired' ? 'retired' : ''}`}>
                    <div className="wr-title-top"><b>{t.name}</b><Pill>{t.type}</Pill>{t.status === 'retired' && <Pill color="#666">retired</Pill>}</div>
                    <div className="wr-title-champs">
                      {champs.length ? champs.map(w => <div key={w.id}><PlushieImg w={w} color={L.brandColor(w.brand_id)} /><span>{w.name}</span></div>) : <div className="wr-vacant">VACANT</div>}
                    </div>
                    {champs.length > 0 && <div className="wr-sub">Champion for <b>{daysSince(t.since)}</b> days (since {prettyDate(t.since)})</div>}
                    {t.description && <div className="wr-sub">{t.description}</div>}
                    <div className="wr-actions left">
                      <Btn onClick={() => setCrown(t)}>{champs.length ? 'Change champion' : 'Crown champion'}</Btn>
                      {champs.length > 0 && <Btn onClick={() => vacate(t)}>Vacate</Btn>}
                      <Btn onClick={() => setEdit(t)}>Edit</Btn>
                    </div>
                    <History t={t} L={L} />
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
      {edit && <TitleForm t={edit} {...props} onClose={() => setEdit(null)} />}
      {crown && <CrownModal t={crown} {...props} onClose={() => setCrown(null)} />}
    </div>
  );
}
