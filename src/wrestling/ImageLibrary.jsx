import { useCallback, useEffect, useRef, useState } from 'react';
import { authHeaders } from '../utils/api';
import { wr } from './wrApi';

const OK = /\.(png|jpe?g|webp|gif)$/i;

async function uploadOne(file) {
  const res = await fetch(`/api/wr/images/${encodeURIComponent(file.name)}`, { method: 'PUT', headers: { ...authHeaders(), 'Content-Type': file.type || 'application/octet-stream' }, body: file });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data.name;
}

// Drag-and-drop bulk uploader + thumbnail grid. With `onPick`, clicking a
// thumbnail selects it (used by the wrestler form); without, it's a manager.
export default function ImageLibrary({ onPick, selected, used = {}, showToast, dialog, compact = false, onChange }) {
  const [images, setImages] = useState(null);
  const [busy, setBusy] = useState(null);
  const [over, setOver] = useState(false);
  const input = useRef(null);

  const load = useCallback(() => wr('GET', '/images').then(setImages).catch(e => { setImages([]); showToast(e.message, 'error'); }), [showToast]);
  useEffect(() => { load(); }, [load]);

  const upload = async (fileList) => {
    const files = [...fileList].filter(f => OK.test(f.name));
    const skipped = fileList.length - files.length;
    if (!files.length) { showToast('Drop .png, .jpg, .webp or .gif files', 'error'); return; }
    const done = [];
    let failed = 0;
    for (let i = 0; i < files.length; i++) {
      setBusy(`Uploading ${i + 1} of ${files.length}…`);
      try { done.push(await uploadOne(files[i])); } catch (e) { failed++; showToast(`${files[i].name}: ${e.message}`, 'error'); }
    }
    setBusy(null);
    await load();
    onChange?.();
    if (done.length) showToast(`Uploaded ${done.length}${failed ? `, ${failed} failed` : ''}${skipped ? `, ${skipped} skipped` : ''}`);
    if (onPick && done.length === 1) onPick(done[0]);
  };

  const remove = async (img) => {
    const n = (used[img.name] || []).length;
    if (!(await dialog.confirm({ title: `Delete ${img.name}?`, message: n ? `Used by ${used[img.name].join(', ')}. They'll fall back to the placeholder.` : 'This removes the file.', confirmLabel: 'Delete', danger: true }))) return;
    try { await wr('DELETE', `/images/${encodeURIComponent(img.name)}`); await load(); onChange?.(); }
    catch (e) { showToast(e.message, 'error'); }
  };

  return (
    <div className={`wr-imglib ${compact ? 'compact' : ''}`}>
      <div className={`wr-drop ${over ? 'over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files); }}
        onClick={() => input.current?.click()} role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') input.current?.click(); }}>
        {busy || 'Drag & drop images here (as many as you like), or click to browse'}
        <small>PNG / JPG / WebP / GIF, up to 8 MB each. Names become lowercase slugs; a same-named file is replaced.</small>
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
      </div>
      {images == null ? <div className="wr-sub">Loading…</div> : images.length === 0 ? <div className="wr-sub">No images uploaded yet.</div> : (
        <div className="wr-imggrid">
          {images.map(img => {
            const who = used[img.name] || [];
            return (
              <div key={img.name} className={`wr-imgcell ${selected === img.name ? 'sel' : ''}`} title={who.length ? `Used by ${who.join(', ')}` : 'Unassigned'}>
                <button type="button" className="wr-imgbtn" onClick={() => onPick ? onPick(img.name) : undefined} disabled={!onPick}>
                  <img src={`/plushies/${encodeURIComponent(img.name)}?v=${encodeURIComponent(img.v || '')}`} alt={img.name} loading="lazy" />
                </button>
                <span className="wr-imgname">{img.name}</span>
                <span className="wr-imguse">{who.length ? who.join(', ') : 'unassigned'}</span>
                <button type="button" className="wr-imgdel" onClick={() => remove(img)} aria-label={`Delete ${img.name}`}>✕</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Image file name -> plushie names using it (explicit image field, else slug.png).
export const imageUsage = (wrestlers, slug) => {
  const m = {};
  for (const w of wrestlers) (m[w.image || `${slug(w.name)}.png`] ||= []).push(w.name);
  return m;
};

