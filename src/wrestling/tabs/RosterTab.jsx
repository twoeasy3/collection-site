import { useEffect, useMemo, useState } from 'react';
import { wr, TIERS, TIER_LABEL, TIER_RANK, daysSince, prettyDate } from '../wrApi';
import { PlushieImg, Modal, Field, Select, Btn, AlignPip, FormDots, recordText, winPct, imageFileHint, ALIGN_COLOR } from '../ui';

const blank = (brand_id = '') => ({ name: '', species: '', brand_id, image: '', alignment: 'face', tier: 'mid_card', status: 'active', finisher: '', gimmick: '', bio: '' });

function ChampionsStrip({ L }) {
  const titles = L.titles.filter(t => t.status === 'active');
  if (!titles.length) return null;
  return (
    <section className="wr-champs">
      <h2><span>👑</span> Champions</h2>
      <div className="wr-champs-row">
        {titles.map(t => {
          const champs = t.champions.map(id => L.wMap[id]).filter(Boolean);
          const color = t.brand_id ? L.brandColor(t.brand_id) : '#b08a1a';
          return (
            <div key={t.id} className={`wr-champ ${champs.length ? '' : 'vacant'}`} style={{ '--c': color }}>
              <div className="wr-belt">{t.name}</div>
              <div className="wr-champ-imgs">
                {champs.length ? champs.map(w => <div key={w.id}><PlushieImg w={w} color={L.brandColor(w.brand_id)} /><span>{w.name}</span></div>) : <div className="wr-vacant">VACANT</div>}
              </div>
              <div className="wr-champ-meta">
                {champs.length ? <>Since {prettyDate(t.since)} · <b>{daysSince(t.since)}</b> days</> : 'No current champion'}
                <small>{t.brand_id ? L.brandName(t.brand_id) : 'Cross-brand'}</small>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Card({ w, L, champTitles, onOpen }) {
  const rec = L.records[w.id];
  return (
    <button className={`wr-card ${w.status !== 'active' ? 'inactive' : ''}`} onClick={() => onOpen(w)} style={{ '--c': L.brandColor(w.brand_id) }}>
      <div className="wr-card-img">
        <PlushieImg w={w} color={L.brandColor(w.brand_id)} />
        <AlignPip a={w.alignment} />
        {champTitles.length > 0 && <span className="wr-crown" title={champTitles.map(t => t.name).join(', ')}>👑</span>}
        {w.status !== 'active' && <span className="wr-status">{w.status}</span>}
      </div>
      <div className="wr-card-name">{w.name}</div>
      <div className="wr-card-sub">{w.species}{w.species && ' · '}{TIER_LABEL[w.tier]}</div>
      {champTitles.length > 0 && <div className="wr-card-champ">{champTitles.map(t => t.name).join(' · ')}</div>}
      <div className="wr-card-rec"><b>{recordText(rec)}</b><FormDots form={rec?.form} /></div>
    </button>
  );
}

function WrestlerModal({ w, L, reload, showToast, dialog, goLog, onClose }) {
  const isNew = !w.id;
  const [draft, setDraft] = useState(w);
  const [history, setHistory] = useState(null);
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));
  const rec = L.records[w.id];

  useEffect(() => {
    if (!w.id) return;
    wr('GET', `/log?wrestler_id=${w.id}&limit=6`).then(setHistory).catch(() => setHistory([]));
  }, [w.id]);

  const save = async () => {
    try { await wr('PUT', '/wrestlers', draft); showToast('Saved'); await reload(); onClose(); }
    catch (e) { showToast(e.message, 'error'); }
  };
  const remove = async () => {
    if (!(await dialog.confirm({ title: `Delete ${w.name}?`, message: 'This removes them from teams, feuds and title history. Plushies with match history can’t be deleted; retire them instead.', confirmLabel: 'Delete', danger: true }))) return;
    try { await wr('DELETE', `/wrestlers/${w.id}`); showToast('Deleted'); await reload(); onClose(); }
    catch (e) { showToast(e.message, 'error'); }
  };

  const teams = L.teams.filter(t => t.members.some(m => m.wrestler_id === w.id));
  const feuds = L.feuds.filter(f => f.status !== 'ended' && f.participants.some(p => p.wrestler_id === w.id));
  const champ = L.titles.filter(t => t.champions.includes(w.id));
  const pct = winPct(rec);

  return (
    <Modal title={isNew ? 'New plushie' : w.name} onClose={onClose} wide>
      <div className="wr-wmodal">
        <div className="wr-wmodal-img">
          <PlushieImg w={draft.name ? draft : w} color={L.brandColor(draft.brand_id ? Number(draft.brand_id) : null)} />
          <small>PNG: <code>public/plushies/{imageFileHint(draft.name ? draft : w)}</code></small>
          {!isNew && (
            <div className="wr-stats">
              <div><b>{recordText(rec)}</b><span>record</span></div>
              <div><b>{pct == null ? '—' : `${pct}%`}</b><span>win rate</span></div>
              <div><b>{w.title_reigns || 0}</b><span>title reigns</span></div>
            </div>
          )}
          {!isNew && <FormDots form={rec?.form} />}
        </div>
        <div className="wr-form-grid">
          <Field label="Name"><input className="wr-input" value={draft.name} onChange={e => set('name', e.target.value)} autoFocus={isNew} /></Field>
          <Field label="Animal / species"><input className="wr-input" value={draft.species} onChange={e => set('species', e.target.value)} placeholder="Bear" /></Field>
          <Field label="Brand"><Select value={draft.brand_id ?? ''} onChange={v => set('brand_id', v)} placeholder="Free agent" options={L.brands.map(b => [b.id, b.name])} /></Field>
          <Field label="Image file" hint="Blank = name as a slug"><input className="wr-input" value={draft.image} onChange={e => set('image', e.target.value)} placeholder="bruno.png" /></Field>
          <Field label="Alignment"><Select value={draft.alignment} onChange={v => set('alignment', v)} options={[['face', 'Face (good guy)'], ['heel', 'Heel (bad guy)'], ['tweener', 'Tweener']]} /></Field>
          <Field label="Card position"><Select value={draft.tier} onChange={v => set('tier', v)} options={TIERS} /></Field>
          <Field label="Status"><Select value={draft.status} onChange={v => set('status', v)} options={[['active', 'Active'], ['injured', 'Injured'], ['retired', 'Retired']]} /></Field>
          <Field label="Finisher"><input className="wr-input" value={draft.finisher} onChange={e => set('finisher', e.target.value)} /></Field>
          <Field label="Gimmick / character"><input className="wr-input wide" value={draft.gimmick} onChange={e => set('gimmick', e.target.value)} /></Field>
          <Field label="Backstory"><textarea className="wr-input wide" rows={3} value={draft.bio} onChange={e => set('bio', e.target.value)} /></Field>
        </div>
      </div>

      {!isNew && (
        <div className="wr-facts">
          {champ.length > 0 && <div><b>Champion:</b> {champ.map(t => t.name).join(', ')}</div>}
          {teams.length > 0 && <div><b>Teams:</b> {teams.map(t => t.name).join(', ')}</div>}
          {feuds.length > 0 && <div><b>Feuds:</b> {feuds.map(f => f.name).join(', ')}</div>}
          <div className="wr-hist">
            <b>Recent matches</b>
            {history == null ? ' …' : history.length === 0 ? <em> none yet</em> : history.map(m => {
              const me = m.participants.find(p => p.wrestler_id === w.id);
              const foes = m.participants.filter(p => p.side !== me?.side).map(p => L.wMap[p.wrestler_id]?.name).filter(Boolean);
              return <div key={m.id} className={`r-${me?.result}`}><span>{me?.result === 'win' ? 'W' : me?.result === 'loss' ? 'L' : me?.result === 'draw' ? 'D' : '·'}</span> {m.event_date} vs {foes.join(', ') || '—'} <em>({m.stipulation_name || m.segment_type})</em></div>;
            })}
            <button className="wr-link" onClick={() => { onClose(); goLog({ wrestler_id: w.id }); }}>Full match log →</button>
          </div>
        </div>
      )}
      <div className="wr-actions">
        {!isNew && <Btn kind="danger" onClick={remove}>Delete</Btn>}
        <span style={{ flex: 1 }} />
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn kind="primary" onClick={save}>Save</Btn>
      </div>
    </Modal>
  );
}

export default function RosterTab(props) {
  const { L } = props;
  const [brandF, setBrandF] = useState('all');
  const [q, setQ] = useState('');
  const [align, setAlign] = useState('');
  const [open, setOpen] = useState(null);

  const champsOf = useMemo(() => {
    const m = {};
    for (const t of L.titles) for (const id of t.champions) (m[id] ||= []).push(t);
    return m;
  }, [L.titles]);

  const matches = (w) => (!q || `${w.name} ${w.species}`.toLowerCase().includes(q.toLowerCase())) && (!align || w.alignment === align);
  const sortW = (a, b) => (TIER_RANK[a.tier] - TIER_RANK[b.tier]) || ((L.records[b.id]?.w || 0) - (L.records[a.id]?.w || 0)) || a.name.localeCompare(b.name);

  const divisions = [...L.brands.map(b => ({ key: String(b.id), brand: b, name: b.name })), { key: 'free', brand: null, name: 'Free agents' }]
    .filter(d => brandF === 'all' || brandF === d.key);
  const inDivision = (d) => L.wrestlers.filter(w => (d.brand ? w.brand_id === d.brand.id : w.brand_id == null) && w.status === 'active' && matches(w)).sort(sortW);
  const inactive = L.wrestlers.filter(w => w.status !== 'active' && matches(w) && (brandF === 'all' || String(w.brand_id ?? 'free') === brandF)).sort(sortW);
  const teams = L.teams.filter(t => t.status === 'active' && (brandF === 'all' || String(t.brand_id ?? 'free') === brandF));

  return (
    <div>
      <ChampionsStrip L={L} />
      <div className="wr-toolbar">
        <div className="wr-chips">
          <button className={brandF === 'all' ? 'on' : ''} onClick={() => setBrandF('all')}>All</button>
          {L.brands.map(b => <button key={b.id} className={brandF === String(b.id) ? 'on' : ''} style={{ '--c': b.color }} onClick={() => setBrandF(String(b.id))}>{b.name}{b.kind === 'developmental' && <small> dev</small>}</button>)}
          <button className={brandF === 'free' ? 'on' : ''} onClick={() => setBrandF('free')}>Free agents</button>
        </div>
        <input className="wr-input" placeholder="Search plushies…" value={q} onChange={e => setQ(e.target.value)} />
        <Select value={align} onChange={setAlign} placeholder="Any alignment" options={[['face', 'Faces'], ['heel', 'Heels'], ['tweener', 'Tweeners']]} />
        <Btn kind="primary" onClick={() => setOpen(blank(brandF !== 'all' && brandF !== 'free' ? brandF : ''))}>+ Add plushie</Btn>
      </div>

      {L.wrestlers.length === 0 && <div className="wr-empty">No plushies yet. Add your first with “+ Add plushie”.</div>}

      {divisions.map(d => {
        const list = inDivision(d);
        if (!list.length && (brandF === 'all' || !L.wrestlers.length)) return null;
        return (
          <section key={d.key} className="wr-division" style={{ '--c': d.brand?.color || '#777' }}>
            <h2><i />{d.name}<small>{d.brand?.kind === 'developmental' ? 'Developmental' : d.brand ? 'Major brand' : ''} · {list.length}</small></h2>
            <div className="wr-grid">
              {list.map(w => <Card key={w.id} w={w} L={L} champTitles={champsOf[w.id] || []} onOpen={setOpen} />)}
            </div>
          </section>
        );
      })}

      {teams.length > 0 && (
        <section className="wr-division" style={{ '--c': '#8e6fd1' }}>
          <h2><i />Tag Teams &amp; Stables<small>{teams.length}</small></h2>
          <div className="wr-teamrow">
            {teams.map(t => (
              <div key={t.id} className="wr-team" style={{ '--c': L.brandColor(t.brand_id) }}>
                <div className="wr-team-imgs">{t.members.map(m => L.wMap[m.wrestler_id]).filter(Boolean).map(w => <PlushieImg key={w.id} w={w} color={L.brandColor(w.brand_id)} />)}</div>
                <b>{t.name}</b><small>{t.kind.replace('_', ' ')} · {t.brand_id ? L.brandName(t.brand_id) : 'cross-brand'}</small>
                <span>{t.members.map(m => L.wMap[m.wrestler_id]?.name).filter(Boolean).join(' & ')}</span>
                {L.titles.filter(ti => ti.champions.length && ti.champions.every(c => t.members.some(m => m.wrestler_id === c)) && ti.holders_count > 1).map(ti => <em key={ti.id}>👑 {ti.name}</em>)}
              </div>
            ))}
          </div>
        </section>
      )}

      {inactive.length > 0 && (
        <section className="wr-division" style={{ '--c': '#666' }}>
          <h2><i />Injured &amp; Inactive<small>{inactive.length}</small></h2>
          <div className="wr-grid">{inactive.map(w => <Card key={w.id} w={w} L={L} champTitles={champsOf[w.id] || []} onOpen={setOpen} />)}</div>
        </section>
      )}

      {open && <WrestlerModal key={open.id || 'new'} w={open} {...props} onClose={() => setOpen(null)} />}
    </div>
  );
}
