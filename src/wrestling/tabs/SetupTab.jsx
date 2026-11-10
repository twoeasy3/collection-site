import { useState } from 'react';
import { wr, WEEKDAYS } from '../wrApi';
import { Btn, slug } from '../ui';
import ImageLibrary, { imageUsage } from '../ImageLibrary';

// Inline-editable table for a simple wr_* table. Each row saves/deletes on its own.
function CrudSection({ title, hint, endpoint, rows, fields, blank, reload, showToast, dialog }) {
  const [drafts, setDrafts] = useState({});
  const [adding, setAdding] = useState(null);
  const val = (r, k) => (drafts[r.id] && k in drafts[r.id] ? drafts[r.id][k] : r[k]);
  const setField = (id, k, v) => setDrafts(d => ({ ...d, [id]: { ...(d[id] || {}), [k]: v } }));

  const save = async (r) => {
    try { await wr('PUT', `/${endpoint}`, { ...r, ...(drafts[r.id] || {}) }); setDrafts(d => { const { [r.id]: _x, ...rest } = d; return rest; }); showToast('Saved'); await reload(); }
    catch (e) { showToast(e.message, 'error'); }
  };
  const del = async (r) => {
    if (!(await dialog.confirm({ title: `Delete “${r.name}”?`, confirmLabel: 'Delete', danger: true }))) return;
    try { await wr('DELETE', `/${endpoint}/${r.id}`); showToast('Deleted'); await reload(); } catch (e) { showToast(e.message, 'error'); }
  };
  const create = async () => {
    try { await wr('PUT', `/${endpoint}`, adding); setAdding(null); showToast('Added'); await reload(); } catch (e) { showToast(e.message, 'error'); }
  };

  const input = (f, v, onChange) => {
    if (f.type === 'select') return <select className="wr-input" value={v ?? ''} onChange={e => onChange(e.target.value)}>{f.placeholder !== undefined && <option value="">{f.placeholder}</option>}{f.options.map(([o, l]) => <option key={o} value={o}>{l}</option>)}</select>;
    if (f.type === 'color') return <input type="color" className="wr-color" value={v || '#888888'} onChange={e => onChange(e.target.value)} />;
    return <input className={`wr-input ${f.type === 'number' ? 'sm' : ''}`} type={f.type === 'number' ? 'number' : 'text'} value={v ?? ''} placeholder={f.label} onChange={e => onChange(e.target.value)} />;
  };

  return (
    <section className="wr-setup">
      <h3>{title}</h3>
      {hint && <p className="wr-sub">{hint}</p>}
      <div className="wr-table">
        <div className="wr-tr head">{fields.map(f => <span key={f.key} style={{ flex: f.flex || 1 }}>{f.label}</span>)}<span style={{ width: 130 }} /></div>
        {rows.map(r => (
          <div key={r.id} className="wr-tr">
            {fields.map(f => <span key={f.key} style={{ flex: f.flex || 1 }}>{input(f, val(r, f.key), v => setField(r.id, f.key, v))}</span>)}
            <span style={{ width: 130 }} className="wr-rowbtns"><Btn kind={drafts[r.id] ? 'primary' : ''} disabled={!drafts[r.id]} onClick={() => save(r)}>Save</Btn><Btn kind="danger" onClick={() => del(r)}>✕</Btn></span>
          </div>
        ))}
        {adding && (
          <div className="wr-tr new">
            {fields.map(f => <span key={f.key} style={{ flex: f.flex || 1 }}>{input(f, adding[f.key], v => setAdding(a => ({ ...a, [f.key]: v })))}</span>)}
            <span style={{ width: 130 }} className="wr-rowbtns"><Btn kind="primary" onClick={create}>Add</Btn><Btn onClick={() => setAdding(null)}>✕</Btn></span>
          </div>
        )}
      </div>
      {!adding && <Btn onClick={() => setAdding({ ...blank })}>+ Add</Btn>}
    </section>
  );
}

export default function SetupTab(props) {
  const { L, hasAiKey, setAiKey } = props;
  const common = { reload: props.reload, showToast: props.showToast, dialog: props.dialog };
  const brandOpts = L.brands.map(b => [b.id, b.name]);
  const major = L.brands.filter(b => b.kind === 'major').length;
  const dev = L.brands.filter(b => b.kind === 'developmental').length;

  return (
    <div className="wr-setupwrap">
      <section className="wr-setup">
        <h3>Claude</h3>
        <p className="wr-sub">Claude suggests each day’s card from your roster, champions, feuds, teams and the match reports you’ve logged. It uses the same Anthropic API key as the car AI fill (stored in this browser only).</p>
        <Btn kind="primary" onClick={props.setAiKey}>{hasAiKey ? 'Change API key' : 'Set API key'}</Btn>
      </section>

      <CrudSection title="Brands" endpoint="brands" rows={L.brands} blank={{ name: '', kind: 'major', color: '#888888', description: '' }} {...common}
        hint={`The league is meant to have 2 major brands and 1 developmental brand (currently ${major} major, ${dev} developmental). Plushies, weekly shows, titles, teams and feuds each belong to one brand.`}
        fields={[{ key: 'name', label: 'Name', flex: 2 }, { key: 'kind', label: 'Kind', type: 'select', options: [['major', 'Major'], ['developmental', 'Developmental']] }, { key: 'color', label: 'Color', type: 'color' }, { key: 'description', label: 'Description', flex: 3 }]} />

      <CrudSection title="Shows" endpoint="shows" rows={L.shows} blank={{ name: '', brand_id: L.brands[0]?.id ?? '', type: 'weekly', weekday: '', description: '' }} {...common}
        hint="Weekly TV shows belong to a brand. Pay-Per-Views and specials usually have no brand (cross-brand) so they draw from both majors. A weekly show with a weekday is highlighted on that day in Booking."
        fields={[{ key: 'name', label: 'Name', flex: 2 }, { key: 'brand_id', label: 'Brand', type: 'select', placeholder: 'Cross-brand', options: brandOpts }, { key: 'type', label: 'Type', type: 'select', options: [['weekly', 'Weekly TV'], ['ppv', 'Pay-Per-View'], ['special', 'Special']] }, { key: 'weekday', label: 'Weekday', type: 'select', placeholder: 'Any / none', options: WEEKDAYS.map((d, i) => [i, d]) }, { key: 'description', label: 'Description', flex: 2 }]} />

      <CrudSection title="Match stipulations" endpoint="stipulations" rows={L.stipulations} blank={{ name: '', kind: 'standard', description: '', min_sides: 2, max_sides: 2 }} {...common}
        hint="Sides = how many independent teams/individuals. Singles and tag are 2 sides; a Fatal 4-Way is 4; handicap is 2 sides with unequal numbers."
        fields={[{ key: 'name', label: 'Name', flex: 2 }, { key: 'kind', label: 'Kind', type: 'select', options: [['standard', 'Standard'], ['multi', 'Multi-animal'], ['handicap', 'Handicap'], ['n_way', 'N-way'], ['gimmick', 'Gimmick']] }, { key: 'min_sides', label: 'Min sides', type: 'number' }, { key: 'max_sides', label: 'Max sides', type: 'number' }, { key: 'description', label: 'Description', flex: 3 }]} />

      <section className="wr-setup">
        <h3>Plushie images</h3>
        <p className="wr-sub">Drag and drop images to upload them in bulk, then choose one when you create or edit a plushie (Roster → plushie → Choose image). Portrait images around 600×800 work best on the roster cards. A plushie with no image chosen uses a file named after it (“Sir Hops” → <code>sir-hops.png</code>).</p>
        <ImageLibrary used={imageUsage(L.wrestlers, slug)} showToast={props.showToast} dialog={props.dialog} onChange={props.reload} />
      </section>
    </div>
  );
}
