import { useEffect, useState } from 'react';
import ClassBadge from './ClassBadge';
import { STAT_FIELDS, CLASS_LABELS, CLASS_ORDER, CLASS_COLORS, CLASS_TEXT, ARCHETYPE_ORDER, ARCHETYPE_LABELS, computeRating, fmtStat, suggestStats } from '../utils/carStats';

const smallBtn = (bg, extra = {}) => ({ padding: '3px 10px', fontSize: '0.75em', fontWeight: 'bold', cursor: 'pointer', border: 'none', borderRadius: '4px', backgroundColor: bg, color: '#fff', ...extra });
const numBox = { width: '74px', padding: '2px 4px', fontSize: '0.85em', fontWeight: 'bold', textAlign: 'right', backgroundColor: 'var(--bg-input)', color: 'var(--tx)', border: '1px solid var(--bd-2)', borderRadius: '3px', fontVariantNumeric: 'tabular-nums' };
const HIDDEN = { key: 'hd', label: 'Hidden', min: -200, max: 200, step: 1, color: '#9aa0a6' };
const EDIT_FIELDS = [...STAT_FIELDS.map(f => f.key), 'hd', 'cl', 'ar'];
const TARGET = { key: 'target', label: 'Target rating', min: 0, max: 9999, step: 1 };
const SUGGESTION_COUNT = 4;
const SUGGEST_KEYS = ['ts', 'ac', 'ha', 'ni', 'st'];

const ratingOf = (s) => computeRating(s) + (Number(s.hd) || 0);
const round1 = (v) => Math.round(v * 10) / 10;

// "% of class" cell: share of the class this value beats.
function Pct({ value, cls, label }) {
  if (value == null) return <span style={{ fontSize: '0.75em', color: 'var(--tx-3)', minWidth: '52px', textAlign: 'right' }}>—</span>;
  const color = value >= 75 ? '#28a745' : value >= 40 ? 'var(--tx-2)' : '#dc3545';
  return (
    <span title={`${label}: better than ${value.toFixed(1)}% of ${CLASS_LABELS[cls] || cls}`} style={{ fontSize: '0.75em', fontWeight: 'bold', color, minWidth: '52px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
      {value.toFixed(1)}%
    </span>
  );
}

// Number box for edit mode: free typing (decimals allowed), applied to the
// draft on each keystroke when it parses, committed on Enter or blur.
function NumBox({ field, value, onDraft, onCommit }) {
  const [text, setText] = useState(fmtStat(value));
  useEffect(() => { setText(fmtStat(value)); }, [value]);
  const apply = () => { const n = parseFloat(text); if (Number.isFinite(n)) onDraft(round1(n)); onCommit(); };
  return (
    <input
      type="number" step={field.step} min={field.min ?? 0} max={field.max} value={text}
      onChange={(e) => { setText(e.target.value); const n = parseFloat(e.target.value); if (Number.isFinite(n)) onDraft(round1(n)); }}
      onBlur={apply}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); apply(); e.target.blur(); } }}
      style={numBox} aria-label={`${field.label} value`}
    />
  );
}

// Edit-mode helper: pick an archetype and a target rating, get a handful of
// stat lines shaped like that archetype for the current class, apply one.
function SuggestPanel({ cls, currentArch, currentRating, cr, classProfile, classPercentile, classQuantile, fallbackProfile, onApply }) {
  const [arch, setArch] = useState(currentArch || 'balanced');
  const [target, setTarget] = useState(Math.round(currentRating));
  const [seed, setSeed] = useState(0);
  const [suggestions, setSuggestions] = useState([]);

  // Percentile within the target class that the current target sits at. The
  // slider and the number box are two views of the same target: moving the
  // slider picks the rating at that percentile of the class, typing a rating
  // moves the slider to where it lands.
  const hasDist = !!(classQuantile && classQuantile(cls, 'r', 50) != null);
  const pctOfTarget = hasDist && classPercentile ? classPercentile(cls, 'r', target) : null;
  const [pct, setPct] = useState(pctOfTarget ?? 50);
  useEffect(() => { if (pctOfTarget != null) setPct(pctOfTarget); }, [pctOfTarget]);

  useEffect(() => { setSuggestions([]); }, [cls]);

  const setFromPct = (p) => {
    setPct(p);
    const r = classQuantile(cls, 'r', p);
    if (r != null) setTarget(Math.round(r));
  };

  const generate = () => {
    const profile = (classProfile && classProfile(cls)) || fallbackProfile;
    const next = [];
    for (let i = 0; i < SUGGESTION_COUNT; i++) {
      const s = suggestStats({ arch, target, profile, cr, seed: seed * SUGGESTION_COUNT + i + 1 });
      next.push({ ...s, r: computeRating({ ...s, cr }) });
    }
    setSuggestions(next);
    setSeed(seed + 1);
  };

  const chip = (active, color) => ({ padding: '3px 8px', fontSize: '0.75em', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px', border: active ? '2px solid var(--tx)' : '1px solid var(--bd-3)', backgroundColor: active ? color : 'transparent', color: active ? '#fff' : 'var(--tx-2)' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '6px 8px', border: '1px dashed var(--bd-3)', borderRadius: '6px', maxWidth: '640px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.8em', fontWeight: 'bold', color: 'var(--tx-2)', marginRight: '4px' }}>Suggest</span>
        {ARCHETYPE_ORDER.map(a => (
          <button key={a} onClick={() => setArch(a)} style={chip(arch === a, CLASS_COLORS[cls] || '#6c757d')}>{ARCHETYPE_LABELS[a]}</button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {hasDist && (
          <>
            <span title={`Where the target sits among ${CLASS_LABELS[cls] || cls} ratings`} style={{ fontSize: '0.75em', color: 'var(--tx-3)', whiteSpace: 'nowrap' }}>% of {cls}</span>
            <input
              type="range" min={0} max={100} step={0.1} value={pct}
              onChange={(e) => setFromPct(Number(e.target.value))}
              style={{ flex: 1, minWidth: '80px', accentColor: CLASS_COLORS[cls] || '#6c757d', cursor: 'pointer' }}
              aria-label={`Target rating as a percentile of ${CLASS_LABELS[cls] || cls}`}
            />
            <span style={{ fontSize: '0.8em', fontWeight: 'bold', minWidth: '40px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: pct >= 75 ? '#28a745' : pct >= 40 ? 'var(--tx-2)' : '#dc3545' }}>{Number(pct).toFixed(1)}%</span>
          </>
        )}
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.75em', color: 'var(--tx-3)' }}>rating</span>
          <NumBox field={TARGET} value={target} onDraft={(v) => setTarget(Math.round(v))} onCommit={() => {}} />
          <button onClick={generate} style={smallBtn('#0077cc')}>{suggestions.length ? 'More' : 'Suggest'}</button>
        </span>
      </div>
      {suggestions.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8em', fontVariantNumeric: 'tabular-nums' }}>
          <span style={{ flex: 1, color: 'var(--tx)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {SUGGEST_KEYS.map(k => {
              const f = STAT_FIELDS.find(x => x.key === k);
              return <span key={k} style={{ marginRight: '10px' }}><span style={{ color: f.color, fontWeight: 'bold' }}>{f.label.slice(0, 2).toUpperCase()}</span> {fmtStat(s[k])}</span>;
            })}
            <span style={{ color: 'var(--tx-3)' }}>→ </span><span style={{ fontWeight: 'bold' }}>{s.r}</span>
          </span>
          <button onClick={() => onApply(s, arch)} style={smallBtn('#28a745')}>Apply</button>
        </div>
      ))}
    </div>
  );
}

// Stats tab body: class + rating, one bar per stat, and the car's percentile
// within its class for each stat and for the rating. In edit mode the class
// can be switched, each stat has a 0.1-step slider and a number box, and a
// "Hidden" slider offsets the rating directly.
//
// Performance: slider moves and typing update a local draft only; the shared
// stats are written on slider release, box commit, class change, and Done.
function CarStatsPanel({ stats, canEdit, editing, onToggleEdit, onCommit, onReset, classPercentile, classQuantile, classProfile, classSizes }) {
  const [draft, setDraft] = useState(null);

  useEffect(() => { setDraft(editing && stats ? { ...stats } : null); }, [editing, stats]);

  if (!stats) return <p style={{ margin: '4px 0', color: 'var(--tx-3)' }}>No stats drafted for this vehicle yet.</p>;

  const live = editing && draft ? draft : stats;
  const cls = live.cl;
  const rating = editing && draft ? ratingOf(draft) : stats.r;
  const changedFields = () => {
    if (!draft) return null;
    const patch = {};
    for (const k of EDIT_FIELDS) if (draft[k] !== stats[k] && !(draft[k] == null && stats[k] == null)) patch[k] = draft[k];
    return Object.keys(patch).length ? patch : null;
  };
  const commit = () => { const patch = changedFields(); if (patch) onCommit(patch); };
  const finish = () => { commit(); onToggleEdit(); };
  const setClass = (c) => { setDraft(d => ({ ...d, cl: c })); onCommit({ cl: c }); };
  const setField = (key, v) => setDraft(d => ({ ...d, [key]: v }));
  const applySuggestion = (s, arch) => {
    const patch = { ts: s.ts, ac: s.ac, ha: s.ha, ni: s.ni, st: s.st, cl: cls, ar: arch, hd: 0 };
    setDraft(d => ({ ...d, ...patch }));
    onCommit(patch);
  };
  const pct = (field, value) => (classPercentile ? classPercentile(cls, field, value) : null);

  const slider = (f, value) => (
    <input
      key={`${f.key}-s`}
      type="range" min={f.min ?? 0} max={f.max} step={f.step} value={value}
      onChange={(e) => setField(f.key, round1(Number(e.target.value)))}
      onPointerUp={commit} onKeyUp={commit} onBlur={commit}
      style={{ width: '100%', accentColor: f.color, cursor: 'pointer' }}
      aria-label={f.label}
    />
  );

  const classSize = classSizes?.[cls];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '2px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <ClassBadge cls={cls} rating={rating} size="panel" />
        <span style={{ color: 'var(--tx-3)', fontSize: '0.85em' }}>
          {CLASS_LABELS[cls] || cls}{classSize ? ` · ${classSize} vehicles` : ''}{live.ar ? ` · ${ARCHETYPE_LABELS[live.ar] || live.ar}` : ''}{stats.edited || (draft && changedFields()) ? ' · edited (unsaved)' : ''}
        </span>
        {cls !== 'U' && <Pct value={pct('r', rating)} cls={cls} label="Rating" />}
        {canEdit && (
          <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: '6px' }}>
            {editing && stats.edited && <button onClick={onReset} style={smallBtn('transparent', { color: 'var(--tx-3)', border: '1px solid var(--bd-3)' })}>Reset</button>}
            <button onClick={editing ? finish : onToggleEdit} style={smallBtn(editing ? '#28a745' : '#cc2200')}>{editing ? 'Done' : 'Edit'}</button>
          </span>
        )}
      </div>

      {editing && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8em', fontWeight: 'bold', color: 'var(--tx-2)', marginRight: '4px' }}>Class</span>
          {CLASS_ORDER.map(c => {
            const active = c === cls;
            return (
              <button key={c} onClick={() => setClass(c)} title={CLASS_LABELS[c]} style={{
                width: '30px', height: '26px', fontWeight: 800, fontSize: '0.85em', cursor: 'pointer', borderRadius: '4px',
                border: active ? '2px solid var(--tx)' : '1px solid var(--bd-3)',
                backgroundColor: active ? CLASS_COLORS[c] : 'transparent', color: active ? CLASS_TEXT[c] : CLASS_COLORS[c],
              }}>{c}</button>
            );
          })}
        </div>
      )}

      {editing && (
        <SuggestPanel
          cls={cls} currentArch={live.ar} currentRating={rating} cr={Number(live.cr) || 0}
          classProfile={classProfile} classPercentile={classPercentile} classQuantile={classQuantile}
          fallbackProfile={{ ts: Number(live.ts) || 200, ac: Number(live.ac) || 50, ha: Number(live.ha) || 50, ni: Number(live.ni) || 50, st: Number(live.st) || 50 }}
          onApply={applySuggestion}
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', columnGap: '10px', rowGap: editing ? '4px' : '6px', alignItems: 'center', maxWidth: '640px' }}>
        {STAT_FIELDS.map(f => {
          const value = Number(live[f.key]) || 0;
          // Not-applicable stats (Crossing at 0) stay hidden unless editing,
          // where the row appears so the stat can be granted.
          if (f.hideWhenZero && value === 0 && !editing) return null;
          const fill = Math.max(0, Math.min(100, (value / f.max) * 100));
          const stockPct = (f.stock / f.max) * 100;
          const over = value > f.stock;
          return [
            <span key={`${f.key}-l`} style={{ fontSize: '0.85em', fontWeight: 'bold', color: 'var(--tx-2)', whiteSpace: 'nowrap' }}>{f.label}</span>,
            editing ? slider(f, value) : (
              <div key={`${f.key}-b`} style={{ position: 'relative', height: '12px', backgroundColor: 'var(--bd)', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ width: `${fill}%`, height: '100%', backgroundColor: f.color, borderRadius: '6px', filter: over ? 'brightness(1.25)' : 'none' }} />
                <div title={`stock ceiling ${f.stock}${f.unit || ''}`} style={{ position: 'absolute', top: 0, bottom: 0, left: `${stockPct}%`, width: '2px', backgroundColor: 'rgba(255,255,255,0.55)', mixBlendMode: 'overlay' }} />
              </div>
            ),
            editing ? (
              <NumBox key={`${f.key}-n`} field={f} value={value} onDraft={(v) => setField(f.key, v)} onCommit={commit} />
            ) : (
              <span key={`${f.key}-v`} style={{ fontSize: '0.85em', fontWeight: 'bold', color: over ? f.color : 'var(--tx)', minWidth: '74px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {fmtStat(value)}{f.unit || ''}
              </span>
            ),
            <Pct key={`${f.key}-p`} value={pct(f.key, value)} cls={cls} label={f.label} />,
          ];
        })}
        {editing && (() => {
          const value = Number(live.hd) || 0;
          return [
            <span key="hd-l" title="Adds directly to the rating, on top of the stat formula" style={{ fontSize: '0.85em', fontWeight: 'bold', color: 'var(--tx-3)', whiteSpace: 'nowrap', fontStyle: 'italic' }}>{HIDDEN.label}</span>,
            slider(HIDDEN, value),
            <NumBox key="hd-n" field={HIDDEN} value={value} onDraft={(v) => setField('hd', Math.round(v))} onCommit={commit} />,
            <span key="hd-p" style={{ fontSize: '0.75em', fontWeight: 'bold', color: value === 0 ? 'var(--tx-3)' : value > 0 ? '#28a745' : '#dc3545', minWidth: '52px', textAlign: 'right' }}>{value > 0 ? `+${value}` : value === 0 ? '' : value}</span>,
          ];
        })()}
      </div>
      <p style={{ margin: '2px 0 0', color: 'var(--tx-3)', fontSize: '0.75em' }}>
        Right column: share of {CLASS_LABELS[cls] || cls} this car beats on each stat, and on rating in the header.
        {editing ? ' Sliders step by 0.1 and the boxes take typed decimals (Enter or click away to apply). Hidden shifts the rating directly. Changes stay in this session only and are not saved.' : ''}
      </p>
    </div>
  );
}

export default CarStatsPanel;
