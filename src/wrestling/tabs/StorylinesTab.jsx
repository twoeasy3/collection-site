import { useState } from 'react';
import { wr, byRating } from '../wrApi';
import { PlushieImg, Modal, Field, Select, Btn, Pill } from '../ui';

const SIDES = ['A', 'B', 'C', 'D', 'E', 'F'];
const FEUD_STATUS = [['building', 'Building'], ['active', 'Active'], ['blow_off', 'Heading to blow-off'], ['ended', 'Ended']];
const TEAM_KIND = [['tag_team', 'Tag team'], ['stable', 'Stable'], ['alliance', 'Alliance']];

const wrestlerOptions = (L) => L.wrestlers.filter(w => w.status !== 'retired').sort(byRating).map(w => [w.id, `${w.name} (${w.species || '?'})`]);

function FeudForm({ f, L, reload, showToast, dialog, onClose }) {
  const [d, setD] = useState({ ...f });
  const [parts, setParts] = useState(f.participants.map(p => ({ ...p })));
  const set = (k, v) => setD(x => ({ ...x, [k]: v }));
  const save = async () => {
    try {
      const { id } = await wr('PUT', '/feuds', d);
      await wr('PUT', `/feuds/${id}/participants`, { participants: parts.filter(p => p.wrestler_id) });
      showToast('Feud saved'); await reload(); onClose();
    } catch (e) { showToast(e.message, 'error'); }
  };
  const remove = async () => {
    if (!(await dialog.confirm({ title: `Delete “${f.name}”?`, message: 'Matches keep their results but lose the feud link. Use “Ended” to keep it on record.', confirmLabel: 'Delete', danger: true }))) return;
    try { await wr('DELETE', `/feuds/${f.id}`); showToast('Deleted'); await reload(); onClose(); } catch (e) { showToast(e.message, 'error'); }
  };
  return (
    <Modal title={f.id ? 'Edit feud' : 'New feud'} onClose={onClose} wide>
      <div className="wr-form-grid">
        <Field label="Feud name"><input className="wr-input" value={d.name} onChange={e => set('name', e.target.value)} placeholder="The Stolen Belt Bag" autoFocus /></Field>
        <Field label="Brand"><Select value={d.brand_id ?? ''} onChange={v => set('brand_id', v)} placeholder="Cross-brand" options={L.brands.map(b => [b.id, b.name])} /></Field>
        <Field label="Status"><Select value={d.status} onChange={v => set('status', v)} options={FEUD_STATUS} /></Field>
        <Field label="Heat" hint="1 simmering → 5 boiling over"><Select value={d.heat} onChange={v => set('heat', Number(v))} options={[1, 2, 3, 4, 5].map(n => [n, `${'🔥'.repeat(n)} ${n}`])} /></Field>
        <Field label="The story so far / intent"><textarea className="wr-input wide" rows={3} value={d.description} onChange={e => set('description', e.target.value)} placeholder="Why do they hate each other? Where is it going?" /></Field>
        <Field label="Planned finale"><input className="wr-input wide" value={d.planned_finale} onChange={e => set('planned_finale', e.target.value)} placeholder="Winter Slam PPV: Ladder match" /></Field>
        <Field label="Started"><input className="wr-input" type="date" value={d.started_date} onChange={e => set('started_date', e.target.value)} /></Field>
        <Field label="Ended"><input className="wr-input" type="date" value={d.ended_date} onChange={e => set('ended_date', e.target.value)} /></Field>
      </div>
      <h4 className="wr-h4">Who’s involved</h4>
      {parts.map((p, i) => (
        <div key={i} className="wr-partrow">
          <Select value={p.wrestler_id} onChange={v => setParts(a => a.map((x, j) => (j === i ? { ...x, wrestler_id: Number(v) } : x)))} placeholder="Plushie…" options={wrestlerOptions(L)} />
          <Select value={p.side} onChange={v => setParts(a => a.map((x, j) => (j === i ? { ...x, side: v } : x)))} options={SIDES.map(s => [s, `Side ${s}`])} />
          <button className="wr-icon danger" onClick={() => setParts(a => a.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <Btn onClick={() => setParts(a => [...a, { wrestler_id: '', side: a.length % 2 ? 'B' : 'A' }])}>+ Add plushie</Btn>
      <div className="wr-actions">{f.id && <Btn kind="danger" onClick={remove}>Delete</Btn>}<span style={{ flex: 1 }} /><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" onClick={save}>Save feud</Btn></div>
    </Modal>
  );
}

function TeamForm({ t, L, reload, showToast, dialog, onClose }) {
  const [d, setD] = useState({ ...t });
  const [members, setMembers] = useState(t.members.map(m => ({ ...m })));
  const set = (k, v) => setD(x => ({ ...x, [k]: v }));
  const save = async () => {
    try {
      const { id } = await wr('PUT', '/teams', d);
      await wr('PUT', `/teams/${id}/members`, { members: members.filter(m => m.wrestler_id) });
      showToast('Team saved'); await reload(); onClose();
    } catch (e) { showToast(e.message, 'error'); }
  };
  const remove = async () => {
    if (!(await dialog.confirm({ title: `Delete ${t.name}?`, message: 'Set it to Disbanded to keep it on record.', confirmLabel: 'Delete', danger: true }))) return;
    try { await wr('DELETE', `/teams/${t.id}`); showToast('Deleted'); await reload(); onClose(); } catch (e) { showToast(e.message, 'error'); }
  };
  return (
    <Modal title={t.id ? `Edit ${t.name}` : 'New team / alliance'} onClose={onClose} wide>
      <div className="wr-form-grid">
        <Field label="Name"><input className="wr-input" value={d.name} onChange={e => set('name', e.target.value)} autoFocus /></Field>
        <Field label="Type"><Select value={d.kind} onChange={v => set('kind', v)} options={TEAM_KIND} /></Field>
        <Field label="Brand"><Select value={d.brand_id ?? ''} onChange={v => set('brand_id', v)} placeholder="Cross-brand" options={L.brands.map(b => [b.id, b.name])} /></Field>
        <Field label="Status"><Select value={d.status} onChange={v => set('status', v)} options={[['active', 'Active'], ['disbanded', 'Disbanded']]} /></Field>
        <Field label="Formed"><input className="wr-input" type="date" value={d.formed_date} onChange={e => set('formed_date', e.target.value)} /></Field>
        <Field label="Description / history"><textarea className="wr-input wide" rows={2} value={d.description} onChange={e => set('description', e.target.value)} /></Field>
      </div>
      <h4 className="wr-h4">Members</h4>
      {members.map((m, i) => (
        <div key={i} className="wr-partrow">
          <Select value={m.wrestler_id} onChange={v => setMembers(a => a.map((x, j) => (j === i ? { ...x, wrestler_id: Number(v) } : x)))} placeholder="Plushie…" options={wrestlerOptions(L)} />
          <input className="wr-input" placeholder="Role (leader, enforcer…)" value={m.role || ''} onChange={e => setMembers(a => a.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))} />
          <button className="wr-icon danger" onClick={() => setMembers(a => a.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <Btn onClick={() => setMembers(a => [...a, { wrestler_id: '', role: '' }])}>+ Add member</Btn>
      <div className="wr-actions">{t.id && <Btn kind="danger" onClick={remove}>Delete</Btn>}<span style={{ flex: 1 }} /><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" onClick={save}>Save</Btn></div>
    </Modal>
  );
}

export default function StorylinesTab(props) {
  const { L, goLog } = props;
  const [sub, setSub] = useState('feuds');
  const [edit, setEdit] = useState(null);
  const [showEnded, setShowEnded] = useState(false);
  const feuds = L.feuds.filter(f => showEnded || f.status !== 'ended');
  const sides = (f) => [...new Set(f.participants.map(p => p.side))].sort();

  return (
    <div>
      <div className="wr-toolbar">
        <div className="wr-chips"><button className={sub === 'feuds' ? 'on' : ''} onClick={() => setSub('feuds')}>Feuds</button><button className={sub === 'teams' ? 'on' : ''} onClick={() => setSub('teams')}>Tag Teams &amp; Alliances</button></div>
        <span style={{ flex: 1 }} />
        {sub === 'feuds' && <label className="wr-check inline"><input type="checkbox" checked={showEnded} onChange={e => setShowEnded(e.target.checked)} /> Show ended</label>}
        {sub === 'feuds'
          ? <Btn kind="primary" onClick={() => setEdit({ kind: 'feud', v: { name: '', brand_id: '', status: 'building', heat: 1, description: '', planned_finale: '', started_date: '', ended_date: '', participants: [{ wrestler_id: '', side: 'A' }, { wrestler_id: '', side: 'B' }] } })}>+ New feud</Btn>
          : <Btn kind="primary" onClick={() => setEdit({ kind: 'team', v: { name: '', kind: 'tag_team', brand_id: '', status: 'active', formed_date: '', description: '', members: [{ wrestler_id: '', role: '' }, { wrestler_id: '', role: '' }] } })}>+ New team</Btn>}
      </div>

      {sub === 'feuds' && (
        <div className="wr-cards">
          {feuds.length === 0 && <div className="wr-empty">No feuds yet. Feuds are what Claude uses to build storylines across shows.</div>}
          {feuds.map(f => (
            <div key={f.id} className={`wr-feud ${f.status}`} style={{ '--c': f.brand_id ? L.brandColor(f.brand_id) : '#8e6fd1' }}>
              <div className="wr-feud-top"><b>{f.name}</b><span className="wr-heat" title={`Heat ${f.heat}`}>{'🔥'.repeat(f.heat)}</span><Pill>{f.status.replace('_', ' ')}</Pill><Pill color={f.brand_id ? L.brandColor(f.brand_id) : '#8e6fd1'}>{f.brand_id ? L.brandName(f.brand_id) : 'Cross-brand'}</Pill></div>
              <div className="wr-feud-sides">
                {sides(f).map((s, i) => (
                  <div key={s} className="wr-feud-side">
                    {i > 0 && <em>vs</em>}
                    {f.participants.filter(p => p.side === s).map(p => { const w = L.wMap[p.wrestler_id]; return w ? <div key={w.id}><PlushieImg w={w} color={L.brandColor(w.brand_id)} /><span>{w.name}</span></div> : null; })}
                  </div>
                ))}
              </div>
              {f.description && <p>{f.description}</p>}
              {f.planned_finale && <div className="wr-sub">🎯 Finale: {f.planned_finale}</div>}
              <div className="wr-actions left"><Btn onClick={() => setEdit({ kind: 'feud', v: f })}>Edit</Btn><Btn onClick={() => goLog({ feud_id: f.id })}>Match history</Btn></div>
            </div>
          ))}
        </div>
      )}

      {sub === 'teams' && (
        <div className="wr-cards">
          {L.teams.length === 0 && <div className="wr-empty">No teams yet. Tag teams, stables and alliances appear in the roster and can be booked as a whole side.</div>}
          {L.teams.map(t => (
            <div key={t.id} className={`wr-feud ${t.status === 'disbanded' ? 'ended' : ''}`} style={{ '--c': L.brandColor(t.brand_id) }}>
              <div className="wr-feud-top"><b>{t.name}</b><Pill>{t.kind.replace('_', ' ')}</Pill><Pill color={L.brandColor(t.brand_id)}>{t.brand_id ? L.brandName(t.brand_id) : 'Cross-brand'}</Pill>{t.status === 'disbanded' && <Pill color="#666">disbanded</Pill>}</div>
              <div className="wr-feud-sides"><div className="wr-feud-side">{t.members.map(m => { const w = L.wMap[m.wrestler_id]; return w ? <div key={w.id}><PlushieImg w={w} color={L.brandColor(w.brand_id)} /><span>{w.name}{m.role && <small> · {m.role}</small>}</span></div> : null; })}</div></div>
              {t.description && <p>{t.description}</p>}
              <div className="wr-actions left"><Btn onClick={() => setEdit({ kind: 'team', v: t })}>Edit</Btn></div>
            </div>
          ))}
        </div>
      )}

      {edit?.kind === 'feud' && <FeudForm f={edit.v} {...props} onClose={() => setEdit(null)} />}
      {edit?.kind === 'team' && <TeamForm t={edit.v} {...props} onClose={() => setEdit(null)} />}
    </div>
  );
}
