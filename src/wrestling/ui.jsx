import { useEffect, useState } from 'react';

export const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// PNGs live in public/plushies/. A plushie's `image` field wins; otherwise the
// file is <slugified name>.png (e.g. "Sir Hops" -> sir-hops.png).
export const imageUrl = (w) => `/plushies/${w.image || `${slug(w.name)}.png`}`;
export const imageFileHint = (w) => w.image || `${slug(w.name)}.png`;

// Plushie portrait. Until the PNG exists (the site falls back to index.html for
// unknown paths, which fails to decode as an image) a tinted placeholder shows.
export function PlushieImg({ w, color = '#777', className = '' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [w?.image, w?.name]);
  if (!w) return <div className={`wr-img wr-img-ph ${className}`} />;
  if (failed) {
    return (
      <div className={`wr-img wr-img-ph ${className}`} style={{ background: `linear-gradient(160deg, ${color}, #1b1b1b)` }} title={`Upload an image in Setup, or pick one for ${w.name}`}>
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="29" cy="28" r="12" fill="rgba(255,255,255,.22)" /><circle cx="71" cy="28" r="12" fill="rgba(255,255,255,.22)" />
          <circle cx="50" cy="55" r="32" fill="rgba(255,255,255,.2)" />
          <circle cx="40" cy="50" r="3.6" fill="#fff" /><circle cx="60" cy="50" r="3.6" fill="#fff" />
          <ellipse cx="50" cy="62" rx="7" ry="5" fill="rgba(255,255,255,.75)" />
        </svg>
        <span>{w.species || '🧸'}</span>
      </div>
    );
  }
  return <img className={`wr-img ${className}`} src={imageUrl(w)} alt={w.name} loading="lazy" onError={() => setFailed(true)} />;
}

export function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="wr-modal-bg" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`wr-modal ${wide ? 'wide' : ''}`} role="dialog" aria-label={title}>
        <div className="wr-modal-head"><h3>{title}</h3><button className="wr-x" onClick={onClose} aria-label="Close">✕</button></div>
        <div className="wr-modal-body">{children}</div>
      </div>
    </div>
  );
}

export const Field = ({ label, children, hint }) => (
  <label className="wr-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>
);

export function Select({ value, onChange, options, placeholder, ...rest }) {
  return (
    <select className="wr-input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
    </select>
  );
}

export const Btn = ({ kind = '', ...p }) => <button {...p} className={`wr-btn ${kind} ${p.className || ''}`} />;

export const Pill = ({ color, children, title }) => <span className="wr-pill" title={title} style={color ? { background: color } : undefined}>{children}</span>;

export const ALIGN_COLOR = { face: '#2e9e5b', heel: '#c0392b', tweener: '#b08a1a' };
export const AlignPip = ({ a }) => <span className="wr-align" style={{ background: ALIGN_COLOR[a] || '#777' }} title={a}>{(a || '?')[0].toUpperCase()}</span>;

export const FormDots = ({ form = [] }) => (
  <span className="wr-form" title="Last results, newest first">
    {form.length ? form.map((r, i) => <i key={i} className={`r-${r}`} />) : <em>—</em>}
  </span>
);

export const recordText = (rec) => (rec ? `${rec.w}-${rec.l}${rec.d ? `-${rec.d}` : ''}` : '0-0');
export const winPct = (rec) => { const t = rec ? rec.w + rec.l + rec.d : 0; return t ? Math.round((rec.w / t) * 100) : null; };

export const Stars = ({ value }) => (value == null ? null : <span className="wr-stars" title={`${value} stars`}>{'★'.repeat(Math.floor(value))}{value % 1 >= 0.5 ? '½' : ''}<span className="dim">{'★'.repeat(5 - Math.ceil(value))}</span></span>);
