import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, startTransition } from 'react';
import { createPortal } from 'react-dom';
import Papa from 'papaparse';
import fictionalData from './fictional_makes.json';
import categoryOrderData from './category_order.json';
import makesData from '../makes.json';
import 'flag-icons/css/flag-icons.min.css';
import './App.css';

const BASE_PATH = window.location.pathname.startsWith('/display')
  ? 'https://pingmathehippo.com'
  : '';

const FICTIONAL_MAKES = new Set(Array.isArray(fictionalData) ? fictionalData : []);

// Initialised from static bundle; overwritten from D1 on load
const MAKE_COUNTRY = new Map(makesData.map(m => [m.Name, m.Country]));

// carCountry: [] → inherit make | ["US"] → additive | ["~","US"] → override
const resolveCountries = (carCountry, makeCountries) => {
  const data = Array.isArray(carCountry) ? carCountry : [];
  if (!data.length) return Array.isArray(makeCountries) ? makeCountries : [];
  if (data[0] === '~') return data.slice(1);
  return [...new Set([...(Array.isArray(makeCountries) ? makeCountries : []), ...data])];
};

const CountryFlags = ({ make, carCountry, style }) => {
  const resolved = resolveCountries(carCountry, MAKE_COUNTRY.get(make) || []);
  if (!resolved.length) return null;
  return resolved.map(code => (
    <span key={code} className={`fi fi-${code.toLowerCase()}`} style={{ marginLeft: '4px', verticalAlign: 'middle', fontSize: '0.75em', ...style }} />
  ));
};

// --- STYLES ---
const thStyle = { padding: '8px', textAlign: 'left', backgroundColor: 'var(--bg-raised)', color: 'var(--tx)', position: 'sticky', top: 0, zIndex: 10, borderBottom: '2px solid var(--bd-2)' };
const tdStyle = { padding: '4px 8px', borderBottom: '1px solid var(--bd)', color: 'var(--tx-2)', verticalAlign: 'middle', textOverflow: 'ellipsis', overflow: 'hidden' };

// --- REUSABLE SORTING LOGIC ---
const sortCars = (carArray) => {
  return [...carArray].sort((a, b) => {
    const makeA = String(a.Make || '');
    const makeB = String(b.Make || '');
    const makeComparison = makeA.localeCompare(makeB, undefined, { sensitivity: 'base' });
    if (makeComparison !== 0) return makeComparison;

    const modelA = String(a.Model || '');
    const modelB = String(b.Model || '');
    const modelComparison = modelA.localeCompare(modelB, undefined, { sensitivity: 'base' });
    if (modelComparison !== 0) return modelComparison;

    const yearA = parseInt(a.Year, 10) || 0;
    const yearB = parseInt(b.Year, 10) || 0;
    const yearComparison = yearA - yearB;
    if (yearComparison !== 0) return yearComparison;

    const brandA = String(a.Brand || '');
    const brandB = String(b.Brand || '');
    return brandA.localeCompare(brandB, undefined, { sensitivity: 'base' });
  });
};

// --- LOWEST AVAILABLE ID FINDER ---
const getNextAvailableId = (currentCars) => {
  const usedIds = new Set(currentCars.map(c => parseInt(c.ID, 10)).filter(id => !isNaN(id)));
  let nextId = 1;
  while (usedIds.has(nextId)) {
    nextId++;
  }
  return nextId.toString();
};

// --- VIEWPORT-AWARE IMAGE PRELOADER ---
// Two-phase strategy:
//
// Phase 1 – background idle queue: walks the FULL cars list at low concurrency
// (2 connections) so the entire collection fills the browser cache over time.
// Its deps are only [cars, imageUpdates], so it is NOT restarted by search /
// filter changes and survives jumps intact.
//
// Phase 2 – viewport priority queue: an IntersectionObserver on the scroll
// container fires for every card within an 800 px buffer. Those images are
// fetched immediately at full speed regardless of where the background queue
// is up to, so jumping to any section shows images right away.
//
// Both phases share preloadedRef so no URL is ever fetched twice.
const useImagePreloader = (cars, imageUpdates, visibleCars, gridPaneRef, galleryActive) => {
  const preloadedRef = useRef(new Set());

  // Phase 1: background idle preloading — full list, low concurrency.
  // Skipped on mobile: Phase 2 (viewport observer) is sufficient and Phase 1
  // saturates mobile bandwidth, blocking touch responsiveness.
  useEffect(() => {
    if (!cars.length) return;
    if (window.innerWidth < 700) return;

    let i = 0;
    let activeCount = 0;
    const CONCURRENCY = 2;
    let cancelled = false;

    const allUrls = cars.map(car => {
      const t = imageUpdates[car.ID] ? `?t=${imageUpdates[car.ID]}` : '';
      return `${BASE_PATH}/half_standard_cars/${car.ID} (1).jpg${t}`;
    });

    const next = () => {
      if (cancelled) return;
      while (activeCount < CONCURRENCY && i < allUrls.length) {
        const url = allUrls[i++];
        if (preloadedRef.current.has(url)) continue;
        preloadedRef.current.add(url);
        activeCount++;
        const img = new Image();
        img.onload = img.onerror = () => { activeCount--; next(); };
        img.src = url;
      }
    };

    const timerId = typeof requestIdleCallback !== 'undefined'
      ? requestIdleCallback(next, { timeout: 10000 })
      : setTimeout(next, 1000);

    return () => {
      cancelled = true;
      if (typeof requestIdleCallback !== 'undefined') cancelIdleCallback(timerId);
      else clearTimeout(timerId);
    };
  }, [cars, imageUpdates]);

  // Phase 2: debounced viewport-priority preloading.
  //
  // Two IntersectionObservers, each with a per-card timer:
  //   • viewport  (0px margin)  — schedules a preload after 100 ms
  //   • buffer    (600px margin) — schedules a preload after 400 ms
  //
  // If the card exits the observed zone before the timer fires the timer is
  // cancelled — so images the user scrolls past quickly are never fetched.
  // The longer buffer delay means off-screen predictive loads never race
  // with images the user is actually looking at.
  useEffect(() => {
    if (!galleryActive || !visibleCars.length) return;
    if (window.innerWidth < 700) return; // mobile: native loading="lazy" handles this

    const container = gridPaneRef?.current;
    if (!container) return;

    const carById = new Map(visibleCars.map(c => [c.ID, c]));

    const preloadCard = (id) => {
      const car = carById.get(id);
      if (!car) return;
      const t = imageUpdates[id] ? `?t=${imageUpdates[id]}` : '';
      // Only preload the card thumbnail here. Hero shots are either served from
      // Phase 1's idle cache or fetched at fetchPriority="high" by the img element
      // on selection — bulk-preloading them here at default priority creates
      // in-flight requests that can block the high-priority hero fetch.
      const url = `${BASE_PATH}/half_standard_cars/${id} (1).jpg${t}`;
      if (preloadedRef.current.has(url)) return;
      preloadedRef.current.add(url);
      new Image().src = url;
    };

    const pendingMaps = [];

    const makeDebouncedObserver = (rootMargin, delay) => {
      const pending = new Map(); // carId → timerId
      pendingMaps.push(pending);
      return new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            const id = e.target.dataset.carId;
            if (!id) continue;
            if (e.isIntersecting) {
              if (pending.has(id)) continue;
              pending.set(id, setTimeout(() => { pending.delete(id); preloadCard(id); }, delay));
            } else {
              const t = pending.get(id);
              if (t !== undefined) { clearTimeout(t); pending.delete(id); }
            }
          }
        },
        { root: container, rootMargin }
      );
    };

    const isMobileDevice = window.innerWidth < 700;
    const viewportObserver = makeDebouncedObserver('0px 0px',                    100);
    const bufferObserver   = makeDebouncedObserver(isMobileDevice ? '200px 0px' : '600px 0px', 400);

    const elements = container.querySelectorAll('[data-car-id]');
    elements.forEach(el => { viewportObserver.observe(el); bufferObserver.observe(el); });

    return () => {
      viewportObserver.disconnect();
      bufferObserver.disconnect();
      for (const pending of pendingMaps) {
        for (const t of pending.values()) clearTimeout(t);
      }
    };
  }, [visibleCars, imageUpdates, galleryActive]);
};

// --- HIGH PERFORMANCE UNCONTROLLED FAST INPUT (LIST VIEW) ---
const FastInput = React.memo(({ value, onChange, style, placeholder }) => {
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.value = value || '';
    }
  }, [value]);

  return (
    <input
      ref={inputRef}
      style={style}
      defaultValue={value || ''}
      placeholder={placeholder}
      onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
      onBlur={(e) => {
        if (e.target.value !== (value || '')) onChange(e.target.value);
      }}
      spellCheck="false"
      autoComplete="off"
      data-lpignore="true"
      data-1p-ignore="true"
      data-form-type="other"
    />
  );
});

// --- ISOLATED GALLERY EDITOR COMPONENT ---
const GalleryEditorForm = React.memo(({ initialCar, onApply, onCancel, onSaveCsv, showToast, categories }) => {
  const [draft, setDraft] = useState(initialCar);

  useEffect(() => { setDraft(initialCar); }, [initialCar]);

  const handleChange = (field, value) => {
    setDraft(prev => ({ ...prev, [field]: value }));
  };

  const handleDone = () => {
    if (!draft.Model || draft.Model.trim() === '') {
      showToast("A Model name is required to save an entry.", "error");
      return;
    }
    onApply(draft);
  };

  const handleSaveCsvClick = () => {
    if (!draft.Model || draft.Model.trim() === '') {
      showToast("A Model name is required to save an entry.", "error");
      return;
    }
    onSaveCsv(draft);
  };

  const detailsInputStyle = { flex: 1, minWidth: 0, backgroundColor: 'var(--bg-input)', color: 'var(--tx)', border: '1px solid var(--bd-2)', borderRadius: '3px', padding: '4px', fontWeight: 'bold', fontSize: '1.2em' };
  const detailsInputSmallStyle = { width: '70px', textAlign: 'center', backgroundColor: 'var(--bg-input)', color: 'var(--tx)', border: '1px solid var(--bd-2)', borderRadius: '3px', padding: '4px', fontWeight: 'bold', fontSize: '1.2em' };
  const detailsInputLabelStyle = { backgroundColor: 'var(--bg-input)', color: 'var(--tx)', border: '1px solid var(--bd-2)', borderRadius: '3px', padding: '4px' };

  return (
    <>
      <div style={{ display: 'flex', gap: '5px', marginBottom: '4px' }}>
        <input style={detailsInputStyle} value={draft?.Supername || ''} onChange={(e) => handleChange('Supername', e.target.value)} placeholder="Supername" spellCheck="false" autoComplete="off" />
        <input style={detailsInputSmallStyle} value={draft?.Year || ''} onChange={(e) => handleChange('Year', e.target.value)} placeholder="Year" spellCheck="false" autoComplete="off" />
        <input style={{ ...detailsInputStyle, flex: 1.5 }} value={draft?.Make || ''} onChange={(e) => handleChange('Make', e.target.value)} placeholder="Make" spellCheck="false" autoComplete="off" />
        <input style={{ ...detailsInputStyle, flex: 3 }} value={draft?.Model || ''} onChange={(e) => handleChange('Model', e.target.value)} placeholder="Model" spellCheck="false" autoComplete="off" />
      </div>
      <p style={{ margin: '2px 0' }}><strong>ID:</strong> {draft?.ID}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '2px 0' }}>
        <strong>Brand:</strong>
        <input style={{ ...detailsInputLabelStyle, flex: 1, minWidth: 0 }} value={draft?.Brand || ''} onChange={(e) => handleChange('Brand', e.target.value)} spellCheck="false" autoComplete="off" />
        <div style={{ display: 'flex', gap: '4px' }}>
          {[{ label: 'HW', value: 'Hot Wheels' }, { label: 'MB', value: 'Matchbox' }, { label: 'TM', value: 'Tomica' }, { label: 'MJ', value: 'Majorette' }].map(shortcut => (
            <button key={shortcut.label} onClick={() => handleChange('Brand', shortcut.value)} style={{ padding: '2px 6px', fontSize: '0.75em', backgroundColor: 'var(--bg-card-sel)', color: 'var(--tx-2)', border: '1px solid var(--bd-3)', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' }} title={`Set to ${shortcut.value}`}>{shortcut.label}</button>
          ))}
        </div>
      </div>
      <div style={{ margin: '2px 0', display: 'flex', alignItems: 'center' }}>
        <strong style={{ width: '80px' }}>Series:</strong>
        <input style={{ ...detailsInputLabelStyle, flex: 1 }} value={draft?.Series || ''} onChange={(e) => handleChange('Series', e.target.value)} spellCheck="false" autoComplete="off" />
      </div>
      <div style={{ margin: '2px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
          <strong style={{ width: '80px' }}>Country:</strong>
          <input
            style={{ ...detailsInputLabelStyle, flex: 1 }}
            value={(Array.isArray(draft?.Country) ? draft.Country.filter(c => c !== '~') : []).join(', ')}
            onChange={(e) => {
              const codes = e.target.value.split(',').map(c => c.trim().toUpperCase()).filter(Boolean);
              const override = Array.isArray(draft?.Country) && draft.Country[0] === '~';
              handleChange('Country', override ? ['~', ...codes] : codes);
            }}
            placeholder="e.g. US, JP (leave blank to inherit from make)"
            spellCheck="false" autoComplete="off"
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', fontSize: '0.8em', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={Array.isArray(draft?.Country) && draft.Country[0] === '~'}
              onChange={(e) => {
                const codes = Array.isArray(draft?.Country) ? draft.Country.filter(c => c !== '~') : [];
                handleChange('Country', e.target.checked ? ['~', ...codes] : codes);
              }}
            />
            Override make
          </label>
        </div>
      </div>
      <div style={{ margin: '2px 0' }}>
        <strong style={{ display: 'block', marginBottom: '4px' }}>Category:</strong>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '4px', border: '1px solid var(--bd-2)', borderRadius: '3px', backgroundColor: 'var(--bg-input)', maxHeight: '100px', overflowY: 'auto' }}>
          {(categories || []).filter(c => c !== 'Uncategorised').map(cat => {
            const selected = Array.isArray(draft?.Category) && draft.Category.includes(cat);
            return (
              <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '2px 6px', borderRadius: '3px', backgroundColor: selected ? 'var(--accent)' : 'var(--bg-raised)', color: selected ? '#fff' : 'var(--tx-2)', cursor: 'pointer', fontSize: '0.8em', border: '1px solid var(--bd-2)', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  style={{ display: 'none' }}
                  checked={selected}
                  onChange={(e) => {
                    const current = Array.isArray(draft?.Category) ? draft.Category : [];
                    handleChange('Category', e.target.checked ? [...current, cat] : current.filter(c => c !== cat));
                  }}
                />
                {cat}
              </label>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', margin: '4px 0' }}>
        <strong style={{ marginBottom: '2px' }}>Description:</strong>
        <textarea style={{ width: '100%', minHeight: '40px', resize: 'vertical', backgroundColor: 'var(--bg-input)', color: 'var(--tx)', border: '1px solid var(--bd-2)', borderRadius: '3px', padding: '4px' }} value={draft?.Description || ''} onChange={(e) => handleChange('Description', e.target.value)} spellCheck="false" autoComplete="off" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: '#ff4d4d', fontWeight: 'bold', margin: 0 }}>
          <input type="checkbox" checked={draft?.Broken_image === 'TRUE'} onChange={(e) => handleChange('Broken_image', e.target.checked ? 'TRUE' : 'FALSE')} style={{ marginRight: '5px', transform: 'scale(1.2)' }} />
          Flag Broken Image
        </label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onCancel} style={{ padding: '4px 12px', cursor: 'pointer', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>Cancel</button>
          <button onClick={handleDone} style={{ padding: '4px 12px', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>Done</button>
          <button onClick={handleSaveCsvClick} style={{ padding: '4px 12px', cursor: 'pointer', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>Save CSV</button>
        </div>
      </div>
    </>
  );
});

// --- HIGH PERFORMANCE MEMOIZED TABLE ROW ---
// FIX: Extracted hover portal into its own component to prevent setHoverPos
// from triggering a re-render of the entire CarListRow on every mouse move.
const HoverPreview = React.memo(({ imgUrl, fallbackUrl, altText }) => {
  const [pos, setPos] = useState(null);
  const thumbRef = useRef(null);

  const previewWidth = 400;
  const previewHeight = 158;

  // Imperatively reset src when imgUrl changes so the browser fetches the new
  // file even if it has the old URL cached in memory (common after uploads).
  useEffect(() => {
    if (thumbRef.current) {
      thumbRef.current.style.display = 'block';
      thumbRef.current.src = '';
      thumbRef.current.src = imgUrl;
    }
  }, [imgUrl]);

  const handleMouseEnter = useCallback((e) => {
    setPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e) => {
    // Use RAF to throttle position updates to once per frame
    cancelAnimationFrame(HoverPreview._raf);
    HoverPreview._raf = requestAnimationFrame(() => {
      setPos({ x: e.clientX, y: e.clientY });
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    cancelAnimationFrame(HoverPreview._raf);
    setPos(null);
  }, []);

  const offsetX = pos
    ? (pos.x + 15 + previewWidth > window.innerWidth ? pos.x - previewWidth - 15 : pos.x + 15)
    : 0;
  const offsetY = pos
    ? (pos.y + 15 + previewHeight > window.innerHeight ? pos.y - previewHeight - 15 : pos.y + 15)
    : 0;

  return (
    <>
      <div
        style={{ width: '90px', height: '35px', backgroundColor: 'var(--bg-surface)', borderRadius: '2px', overflow: 'hidden', cursor: 'zoom-in' }}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <img
          ref={thumbRef}
          key={imgUrl}
          src={imgUrl}
          alt={altText}
          loading="lazy"
          decoding="async"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          onError={(e) => { e.target.src = fallbackUrl; }}
        />
      </div>

      {pos && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          transform: `translate3d(${offsetX}px, ${offsetY}px, 0)`,
          zIndex: 99999,
          backgroundColor: 'var(--bg)',
          padding: '4px',
          border: '2px solid var(--bd-3)',
          borderRadius: '6px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.9)',
          pointerEvents: 'none',
          width: `${previewWidth}px`,
          aspectRatio: '8 / 3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <img
            key={imgUrl}
            src={imgUrl}
            alt="Preview"
            style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }}
            onError={(e) => { e.target.src = fallbackUrl; }}
          />
        </div>,
        document.body
      )}
    </>
  );
});
HoverPreview._raf = null;

const CarListRow = React.memo(({ car, isSelected, isListEditing, draft, imageUpdate, handleSelectRow, handleCellChange, hideId, categories }) => {
  const getVal = (field) => draft?.[field] !== undefined ? draft[field] : (car[field] || '');
  const imgUrl = `${BASE_PATH}/half_standard_cars/${car.ID} (1).jpg${imageUpdate ? `?t=${imageUpdate}` : ''}`;
  const fallbackUrl = `${BASE_PATH}/mystery_side.jpg`;

  const inlineInputStyle = { width: '100%', padding: '4px', boxSizing: 'border-box', backgroundColor: 'var(--bg-input)', color: 'var(--tx)', border: '1px solid var(--bd-2)', borderRadius: '3px' };

  return (
    <tr style={{ backgroundColor: isSelected ? 'var(--row-sel)' : 'transparent' }}>
      {!hideId && <td style={{ ...tdStyle, textAlign: 'center' }}>
        <input type="checkbox" checked={isSelected} onChange={() => handleSelectRow(car.ID)} />
      </td>}
      <td style={tdStyle}>
        {/* FIX: HoverPreview is now isolated — its internal state changes don't re-render CarListRow */}
        <HoverPreview imgUrl={imgUrl} fallbackUrl={fallbackUrl} altText={car.Model} />
      </td>
      {!hideId && <td style={{ ...tdStyle, color: '#888', fontWeight: 'bold' }}>#{car.ID}</td>}
      <td style={tdStyle}>{isListEditing ? <FastInput style={inlineInputStyle} value={getVal('Year')} onChange={(val) => handleCellChange(car.ID, 'Year', val)} /> : car.Year}</td>
      <td style={tdStyle}>{isListEditing ? <FastInput style={inlineInputStyle} value={getVal('Make')} onChange={(val) => handleCellChange(car.ID, 'Make', val)} /> : car.Make}</td>
      <td style={{ ...tdStyle, fontWeight: 'bold', color: 'var(--tx)' }}>{isListEditing ? <FastInput style={inlineInputStyle} value={getVal('Model')} onChange={(val) => handleCellChange(car.ID, 'Model', val)} /> : car.Model}</td>
      <td style={tdStyle}>{isListEditing ? <FastInput style={inlineInputStyle} value={getVal('Supername')} onChange={(val) => handleCellChange(car.ID, 'Supername', val)} /> : car.Supername}</td>
      <td style={{ ...tdStyle, color: '#17a2b8' }}>{isListEditing ? <FastInput style={inlineInputStyle} value={getVal('Brand')} onChange={(val) => handleCellChange(car.ID, 'Brand', val)} /> : car.Brand}</td>
      <td style={tdStyle}>{isListEditing ? <FastInput style={inlineInputStyle} value={getVal('Series')} onChange={(val) => handleCellChange(car.ID, 'Series', val)} /> : car.Series}</td>
      <td style={tdStyle}>{isListEditing ? <FastInput style={inlineInputStyle} value={getVal('Country')} onChange={(val) => handleCellChange(car.ID, 'Country', val)} /> : car.Country}</td>
      <td style={tdStyle}>
        {isListEditing
          ? <FastInput
              style={inlineInputStyle}
              value={Array.isArray(getVal('Category')) ? getVal('Category').join(', ') : (getVal('Category') || '')}
              onChange={(val) => handleCellChange(car.ID, 'Category', val.split(',').map(c => c.trim()).filter(Boolean))}
              placeholder="Category1, Category2"
            />
          : (Array.isArray(car.Category) ? car.Category.join(', ') : car.Category)}
      </td>
    </tr>
  );
});

// --- STABLE CARD IMAGE: avoids re-mount when imageUpdates changes for OTHER cars ---
// The `key` on the <img> forces a real DOM replacement (not just a src swap) when
// imageUpdate changes, which busts both React's reconciler cache and the browser's
// in-memory image cache for that specific URL.
const CarCardImage = React.memo(({ id, model, imageUpdate, fallbackSrc, eagerLoad }) => {
  const src = `${BASE_PATH}/half_standard_cars/${id} (1).jpg${imageUpdate ? `?t=${imageUpdate}` : ''}`;
  return (
    <img
      key={src}
      src={src}
      alt={model}
      loading={eagerLoad ? 'eager' : 'lazy'}
      decoding="async"
      onError={(e) => { e.target.style.display = 'none'; }}
      style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
    />
  );
}, (prev, next) =>
  prev.id === next.id &&
  prev.model === next.model &&
  prev.imageUpdate === next.imageUpdate &&
  prev.eagerLoad === next.eagerLoad
);

// --- STABLE GALLERY CARD ---
// FIX: Accepts imageUpdate for just this car's ID, not the whole imageUpdates map.
// This means a new photo upload only re-renders the one affected card.
const GalleryCard = React.memo(({ car, isGalleryEditingRef, sidebarView, imageUpdate, fallbackGridImage, onSelect, showToast, eagerLoad, hideId }) => {
  const validYear = car.Year && car.Year.toUpperCase() !== 'N/A' ? car.Year : null;
  const isCustom = car.Supername && car.Supername.trim().toLowerCase() === 'custom';
  const customPrefix = isCustom ? car.Supername.trim() : null;

  const nameWithoutYear = sidebarView === 'make'
    ? [customPrefix, car.Model].filter(Boolean).join(' ')
    : [customPrefix, car.Make, car.Model].filter(Boolean).join(' ');

  const handleClick = useCallback(() => {
    if (isGalleryEditingRef.current) {
      showToast("Please save or cancel your current edits first.", "error");
      return;
    }
    onSelect(car);
  }, [isGalleryEditingRef, onSelect, car, showToast]);

  return (
    <div
      className="car-card"
      data-car-id={car.ID}
      onClick={handleClick}
      style={{ cursor: 'pointer', backgroundColor: 'var(--bg-card)', borderRadius: '4px', overflow: 'hidden', display: 'block', minWidth: 0 }}
    >
      <div style={{
        width: '100%', aspectRatio: '8 / 3', backgroundColor: 'var(--bg-surface)', position: 'relative',
        overflow: 'hidden', backgroundImage: `url(${fallbackGridImage})`,
        backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center'
      }}>
        <CarCardImage
          id={car.ID}
          model={car.Model}
          imageUpdate={imageUpdate}
          fallbackSrc={fallbackGridImage}
          eagerLoad={eagerLoad}
        />
      </div>
      <div className="car-card-title" style={{
        fontSize: '0.8em', padding: '2px 4px', color: 'var(--tx)', lineHeight: '1em',
        height: '2em', whiteSpace: 'normal', overflow: 'hidden',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        textOverflow: 'ellipsis', wordWrap: 'break-word', boxSizing: 'content-box'
      }}>
        {!hideId && <span style={{ color: 'var(--tx-3)', marginRight: '5px' }}>#{car.ID}</span>}
        {sidebarView !== 'decade' && validYear && <span style={{ color: 'var(--year-color)', marginRight: '4px', fontWeight: 'bold' }}>{validYear}</span>}
        {nameWithoutYear}
        {car.Make && <CountryFlags make={car.Make} carCountry={car.Country} />}
        {car.Broken_image === 'TRUE' && <span style={{ color: '#ff4d4d', marginLeft: '5px', fontWeight: 'bold' }}>[Broken]</span>}
      </div>
    </div>
  );
}, (prev, next) =>
  prev.car === next.car &&
  prev.sidebarView === next.sidebarView &&
  prev.imageUpdate === next.imageUpdate &&
  prev.onSelect === next.onSelect
);

// --- STACK KEY: groups cars that share Year + Make + Model + Brand ---
const getStackKey = (car) =>
  `${(car.Year || '').trim()}||${(car.Make || '').trim()}||${(car.Model || '').trim()}||${(car.Brand || '').trim()}`;

// --- COLLAPSED STACK TILE ---
const StackedCard = React.memo(({ firstCar, count, stackCarIds, imageUpdate, sidebarView, onToggle, onSelect, fallbackGridImage }) => {
  const validYear = firstCar.Year && firstCar.Year.toUpperCase() !== 'N/A' ? firstCar.Year : null;
  const isCustom = firstCar.Supername && firstCar.Supername.trim().toLowerCase() === 'custom';
  const customPrefix = isCustom ? firstCar.Supername.trim() : null;
  const nameWithoutYear = sidebarView === 'make'
    ? [customPrefix, firstCar.Model].filter(Boolean).join(' ')
    : [customPrefix, firstCar.Make, firstCar.Model].filter(Boolean).join(' ');
  const src = `${BASE_PATH}/half_standard_cars/${firstCar.ID} (1).jpg${imageUpdate ? `?t=${imageUpdate}` : ''}`;

  return (
    <div
      className="stacked-card"
      data-car-id={firstCar.ID}
      data-stack-car-ids={stackCarIds}
      onClick={() => { onSelect(firstCar); onToggle(); }}
      title={`${count} variants — click to expand`}
      style={{ position: 'relative', minWidth: 0, cursor: 'pointer' }}
    >
      {/* Shadow cards offset into the gap to create a stack depth effect */}
      <div style={{ position: 'absolute', top: '5px', left: '5px', right: '-5px', bottom: '-5px', backgroundColor: 'var(--stack-1)', borderRadius: '4px' }} />
      <div style={{ position: 'absolute', top: '2px', left: '2px', right: '-2px', bottom: '-2px', backgroundColor: 'var(--stack-2)', borderRadius: '4px' }} />
      {/* Main card face */}
      <div className="stacked-card-face" style={{ position: 'relative', zIndex: 2, backgroundColor: 'var(--bg-card)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ width: '100%', aspectRatio: '8 / 3', backgroundColor: 'var(--bg-surface)', backgroundImage: `url(${fallbackGridImage})`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }}>
          <img src={src} alt={firstCar.Model} decoding="async" onError={(e) => { e.target.style.display = 'none'; }} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        </div>
        <div style={{ fontSize: '0.8em', padding: '2px 4px', color: 'var(--tx)', lineHeight: '1em', height: '2em', whiteSpace: 'normal', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', textOverflow: 'ellipsis', wordWrap: 'break-word', boxSizing: 'content-box' }}>
          {sidebarView !== 'decade' && validYear && <span style={{ color: 'var(--year-color)', marginRight: '4px', fontWeight: 'bold' }}>{validYear}</span>}
          {nameWithoutYear}
          {firstCar.Make && <CountryFlags make={firstCar.Make} carCountry={firstCar.Country} />}
          {firstCar.Brand && firstCar.Brand.trim() && <span style={{ color: 'var(--tx-3)', marginLeft: '4px' }}>{firstCar.Brand.trim()}</span>}
        </div>
      </div>
      {/* Count badge */}
      <div style={{ position: 'absolute', top: '-6px', right: '-6px', zIndex: 10, backgroundColor: 'var(--accent)', color: '#fff', borderRadius: '10px', padding: '1px 7px', fontWeight: '800', fontSize: '0.68em', lineHeight: '1.6', boxShadow: '0 2px 5px rgba(0,0,0,0.6)' }}>
        ×{count}
      </div>
    </div>
  );
}, (prev, next) =>
  prev.firstCar === next.firstCar &&
  prev.count === next.count &&
  prev.stackCarIds === next.stackCarIds &&
  prev.imageUpdate === next.imageUpdate &&
  prev.sidebarView === next.sidebarView &&
  prev.onSelect === next.onSelect
);


const parseArr = (val) => { try { const p = JSON.parse(val || '[]'); return Array.isArray(p) ? p : []; } catch { return []; } };

// Map D1 row (lowercase) → app car object (capitalized)
const toAppCar = (row) => ({
  ID: String(row.id),
  Year: row.year || '',
  Make: row.make || '',
  Model: row.model || '',
  Supername: row.supername || '',
  Brand: row.brand || '',
  Series: row.series || '',
  Country: parseArr(row.country),
  Category: parseArr(row.category),
  Description: row.description || '',
  Broken_image: row.broken_image ? 'TRUE' : 'FALSE',
});

// Map app car object → D1 row
const toDBRow = (car) => ({
  id: parseInt(car.ID),
  year: car.Year || '',
  make: car.Make || '',
  model: car.Model || '',
  supername: car.Supername || '',
  brand: car.Brand || '',
  series: car.Series || '',
  country: JSON.stringify(Array.isArray(car.Country) ? car.Country : []),
  category: JSON.stringify(Array.isArray(car.Category) ? car.Category : []),
  description: car.Description || '',
  broken_image: car.Broken_image === 'TRUE' ? 1 : 0,
});

function App({ isPublic = false }) {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);

  const [sidebarView, _setSidebarView] = useState('make');
  const [selectedLetter, _setSelectedLetter] = useState(null);
  const [searchMode, setSearchMode] = useState('car');
  const [viewMode, _setViewMode] = useState('gallery');

  const setSidebarView   = useCallback((v) => startTransition(() => _setSidebarView(v)),   []);
  const setSelectedLetter = useCallback((v) => startTransition(() => _setSelectedLetter(v)), []);
  const setViewMode      = useCallback((v) => startTransition(() => _setViewMode(v)),      []);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  const [selectedCar, setSelectedCar] = useState(null);
  const [isGalleryEditing, setIsGalleryEditing] = useState(false);
  const isGalleryEditingRef = useRef(false);
  isGalleryEditingRef.current = isGalleryEditing;

  const [isListEditing, setIsListEditing] = useState(false);
  const [listDrafts, setListDrafts] = useState({});
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkBrand, setBulkBrand] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  const [imageUpdates, setImageUpdates] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [dragTarget, setDragTarget] = useState(null);
  const [sensitivePreview, setSensitivePreview] = useState(null);
  const [backupAvailable, setBackupAvailable] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [toast, setToast] = useState({ message: '', type: 'success', visible: false });

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 700);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mobileFileInputRef = useRef(null);
  const isMobileRef = useRef(isMobile);

  const [missingData, setMissingData] = useState([]);
  const [missingLoading, setMissingLoading] = useState(false);
  const [missingSubTab, setMissingSubTab] = useState('missing');

  const [expandedStacks, setExpandedStacks] = useState(new Set());
  const [stackingEnabled, setStackingEnabled] = useState(true);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme') || 'dark';
    document.documentElement.dataset.theme = saved;
    return saved;
  });

  const [columnCount, setColumnCount] = useState(1);
  const carGridRef = useRef(null);
  const gridPaneRef = useRef(null);
  const carInfoRef = useRef(null);

  const [soundEnabled, setSoundEnabled] = useState(false);
  const bgAudioRef = useRef(null);
  const audioCtxRef = useRef(null);
  const selectBufferRef = useRef(null);

  useEffect(() => {
    if (!bgAudioRef.current) {
      bgAudioRef.current = new Audio('/bg.mp3');
      bgAudioRef.current.loop = true;
      bgAudioRef.current.volume = 0.5;
    }
  }, []);

  useEffect(() => {
    const bg = bgAudioRef.current;
    if (!bg) return;
    if (soundEnabled) {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      // Connect bg music into the AudioContext so both share one pipeline
      if (!bg._mediaSourceNode) {
        bg._mediaSourceNode = ctx.createMediaElementSource(bg);
        bg._mediaSourceNode.connect(ctx.destination);
      }
      bg.play().catch(() => {});
      if (!selectBufferRef.current) {
        fetch('/select.wav')
          .then(r => r.arrayBuffer())
          .then(buf => ctx.decodeAudioData(buf))
          .then(decoded => { selectBufferRef.current = decoded; })
          .catch(() => {});
      }
    } else {
      bg.pause();
      bg.currentTime = 0;
    }
  }, [soundEnabled]);

  const playSelectSound = useCallback(async () => {
    if (!soundEnabled || !selectBufferRef.current || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') await ctx.resume();
    const src = ctx.createBufferSource();
    src.buffer = selectBufferRef.current;
    src.connect(ctx.destination);
    src.start();
  }, [soundEnabled]);
  const groupedAndFilteredCarsRef = useRef([]);

  // Refs for imperative selection highlight — decouples selection from memoizedGalleryNodes
  const selectedIdRef = useRef(null);
  selectedIdRef.current = selectedCar?.ID ?? null;
  const selectedCardElRef = useRef(null);

  // Apply the .selected CSS class to the correct gallery card after every commit.
  // This runs instead of passing isSelected/isAnySelected as props so that clicking
  // a card doesn't trigger a full memoizedGalleryNodes rebuild.
  useLayoutEffect(() => {
    const container = gridPaneRef.current;
    if (!container) return;
    const id = selectedIdRef.current;

    selectedCardElRef.current?.classList.remove('selected');
    selectedCardElRef.current = null;

    if (id == null) return;

    // Individual card (.car-card has data-car-id)
    const cardEl = container.querySelector(`.car-card[data-car-id="${id}"]`);
    if (cardEl) {
      cardEl.classList.add('selected');
      selectedCardElRef.current = cardEl;
      return;
    }

    // Collapsed stack tile (data-stack-car-ids is space-separated; ~= matches whole words)
    const stackEl = container.querySelector(`[data-stack-car-ids~="${id}"]`);
    if (stackEl) {
      stackEl.classList.add('selected');
      selectedCardElRef.current = stackEl;
    }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => { setToast(prev => ({ ...prev, visible: false })); }, 3000);
  }, []);

  const toggleStack = useCallback((key) => {
    setExpandedStacks(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Preload selected car's card thumbnail when selection changes, bypassing
  // loading="lazy" so the grid card is ready even if it hasn't scrolled into view yet.
  // Hero shot is intentionally omitted: the img element renders with
  // fetchPriority="high" which gives the browser a clean, uncontested high-priority
  // fetch — adding a competing default-priority new Image() here would interfere.
  useEffect(() => {
    if (!selectedCar) return;
    const t = imageUpdates[selectedCar.ID] ? `?t=${imageUpdates[selectedCar.ID]}` : '';
    new Image().src = `${BASE_PATH}/half_standard_cars/${selectedCar.ID} (1).jpg${t}`;
    if (carInfoRef.current) carInfoRef.current.scrollTop = 0;
  }, [selectedCar?.ID, imageUpdates]);

  // Preload side images for all cars in expanded stacks immediately on expansion.
  useEffect(() => {
    if (!expandedStacks.size) return;
    for (const car of cars) {
      if (expandedStacks.has(getStackKey(car))) {
        const t = imageUpdates[car.ID] ? `?t=${imageUpdates[car.ID]}` : '';
        new Image().src = `${BASE_PATH}/half_standard_cars/${car.ID} (1).jpg${t}`;
      }
    }
  }, [expandedStacks, cars, imageUpdates]);

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 700;
      isMobileRef.current = mobile;
      setIsMobile(mobile);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const uploadFiles = useCallback(async (files) => {
    const valid = files.filter(f => f.name.toLowerCase().includes('(1).jpg') || f.name.toLowerCase().includes('(2).jpg'));
    if (!valid.length) return showToast('Only files ending in (1).jpg or (2).jpg are accepted.', 'error');
    showToast(`Processing ${valid.length} image(s)...`, 'success');
    const formData = new FormData();
    valid.forEach(f => formData.append('files', f));
    try {
      const response = await fetch('http://localhost:5000/api/upload', { method: 'POST', body: formData });
      if (response.ok) {
        const data = await response.json();
        showToast(data.message, 'success');
        const newUpdates = {};
        const now = Date.now();
        valid.forEach(f => { const m = f.name.match(/^(\d+)/); if (m) newUpdates[m[1]] = now; });
        setImageUpdates(prev => ({ ...prev, ...newUpdates }));
      } else {
        const err = await response.json();
        showToast(`Processing failed: ${err.error}`, 'error');
      }
    } catch {
      showToast('Server unreachable. Is server.py running?', 'error');
    }
  }, [showToast]);

  const uploadFilesBrightness = useCallback(async (files) => {
    const valid = files.filter(f => f.name.toLowerCase().includes('(1).jpg') || f.name.toLowerCase().includes('(2).jpg'));
    if (!valid.length) return showToast('Only files ending in (1).jpg or (2).jpg are accepted.', 'error');
    showToast(`Adjusting brightness for ${valid.length} image(s)...`, 'success');
    const formData = new FormData();
    valid.forEach(f => formData.append('files', f));
    try {
      const response = await fetch('http://localhost:5000/api/upload-brightness', { method: 'POST', body: formData });
      if (response.ok) {
        const data = await response.json();
        showToast(data.message, 'success');
        const newUpdates = {};
        const now = Date.now();
        valid.forEach(f => { const m = f.name.match(/^(\d+)/); if (m) newUpdates[m[1]] = now; });
        setImageUpdates(prev => ({ ...prev, ...newUpdates }));
      } else {
        const err = await response.json();
        showToast(`Processing failed: ${err.error}`, 'error');
      }
    } catch {
      showToast('Server unreachable. Is server.py running?', 'error');
    }
  }, [showToast]);

  const uploadFilesMonster = useCallback(async (files) => {
    const valid = files.filter(f => f.name.toLowerCase().includes('(1).jpg') || f.name.toLowerCase().includes('(2).jpg'));
    if (!valid.length) return showToast('Only files ending in (1).jpg or (2).jpg are accepted.', 'error');
    showToast(`Processing ${valid.length} image(s) as Monster Truck...`, 'success');
    const formData = new FormData();
    valid.forEach(f => formData.append('files', f));
    try {
      const response = await fetch('http://localhost:5000/api/upload-monster', { method: 'POST', body: formData });
      if (response.ok) {
        const data = await response.json();
        showToast(data.message, 'success');
        const newUpdates = {};
        const now = Date.now();
        valid.forEach(f => { const m = f.name.match(/^(\d+)/); if (m) newUpdates[m[1]] = now; });
        setImageUpdates(prev => ({ ...prev, ...newUpdates }));
      } else {
        const err = await response.json();
        showToast(`Processing failed: ${err.error}`, 'error');
      }
    } catch {
      showToast('Server unreachable. Is server.py running?', 'error');
    }
  }, [showToast]);

  const fetchSensitivePreview = useCallback(async (file, startPct) => {
    showToast(`Generating ${Math.round(startPct * 100)}%–${Math.round((startPct + 19 * 0.05) * 100)}%...`, 'success');
    const formData = new FormData();
    formData.append('files', file);
    formData.append('start_pct', String(startPct));
    formData.append('count', '20');
    try {
      const response = await fetch('http://localhost:5000/api/upload-sensitive-preview', { method: 'POST', body: formData });
      if (response.ok) {
        const data = await response.json();
        setSensitivePreview({ file, filename: data.filename, variants: data.variants, startPct });
      } else {
        const err = await response.json();
        showToast(`Processing failed: ${err.error}`, 'error');
      }
    } catch {
      showToast('Server unreachable. Is server.py running?', 'error');
    }
  }, [showToast]);

  const uploadFilesSensitive = useCallback(async (files) => {
    const valid = files.filter(f => f.name.toLowerCase().includes('(1).jpg'));
    if (!valid.length) return showToast('Only (1).jpg files are accepted for sensitive detection.', 'error');
    if (valid.length > 1) return showToast('Drop one image at a time for sensitive detection.', 'error');
    fetchSensitivePreview(valid[0], 0);
  }, [showToast, fetchSensitivePreview]);

  const handleSaveSensitive = useCallback(async (filename, b64) => {
    try {
      const response = await fetch('http://localhost:5000/api/save-sensitive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, b64 }),
      });
      if (response.ok) {
        const data = await response.json();
        showToast(data.message, 'success');
        const m = filename.match(/^(\d+)/);
        if (m) setImageUpdates(prev => ({ ...prev, [m[1]]: Date.now() }));
      } else {
        const err = await response.json();
        showToast(`Save failed: ${err.error}`, 'error');
      }
    } catch {
      showToast('Server unreachable. Is server.py running?', 'error');
    }
    setSensitivePreview(null);
  }, [showToast]);

  const fetchMissingData = useCallback(async () => {
    setMissingLoading(true);
    const key = localStorage.getItem('adminApiKey');
    try {
      const response = await fetch('/api/cars/missing-images', {
        headers: key ? { 'Authorization': `Bearer ${key}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        const enriched = data.missing.map(item => {
          const car = cars.find(c => String(c.ID) === String(item.id)) || {};
          return {
            id: item.id,
            year: car.Year || '',
            make: car.Make || '',
            model: car.Model || '',
            supername: car.Supername || '',
            brand: car.Brand || '',
            series: car.Series || '',
            missing_side: item.missing_side,
            missing_hero: item.missing_hero,
          };
        });
        setMissingData(enriched);
      } else {
        showToast('Failed to fetch missing image data', 'error');
      }
    } catch {
      showToast('API unreachable.', 'error');
    } finally {
      setMissingLoading(false);
    }
  }, [showToast, cars]);

  useEffect(() => {
    if (viewMode === 'missing') fetchMissingData();
  }, [viewMode, fetchMissingData]);

  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedSearchTerm(searchInput); }, 1000);
    return () => clearTimeout(handler);
  }, [searchInput]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, searchMode, sidebarView, viewMode]);

  // Scroll the selected card into view when the filter changes and the card is still visible.
  // We defer with rAF so the DOM has finished painting the filtered grid first.
  useEffect(() => {
    if (viewMode !== 'gallery' || !selectedCar) return;
    const raf = requestAnimationFrame(() => {
      const card = gridPaneRef.current?.querySelector(`[data-car-id="${selectedCar.ID}"]`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }
      // Card not in DOM — the selected car may be a non-cover member of a collapsed
      // stack (e.g. after a rename merges it into an existing group). Find the first
      // car that shares its stack key; that car is the stack cover and has a DOM node.
      const selectedKey = getStackKey(selectedCar);
      for (const { visibleGroupCars } of groupedAndFilteredCarsRef.current) {
        for (const car of visibleGroupCars) {
          if (getStackKey(car) === selectedKey) {
            const coverEl = gridPaneRef.current?.querySelector(`[data-car-id="${car.ID}"]`);
            if (coverEl) { coverEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return; }
            break; // cover not rendered yet — fall through to top
          }
        }
      }
      if (gridPaneRef.current) gridPaneRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(raf);
  }, [debouncedSearchTerm, searchMode, sidebarView, viewMode, selectedCar]);

  useEffect(() => {
    if (viewMode !== 'gallery') return;
    const gridEl = carGridRef.current;
    if (!gridEl) return;
    const calculateColumns = () => {
      const computedStyle = window.getComputedStyle(gridEl);
      const gridColumnsStr = computedStyle.getPropertyValue('grid-template-columns');
      if (gridColumnsStr && gridColumnsStr !== 'none') {
        const actualCols = gridColumnsStr.split(' ').length;
        setColumnCount(Math.max(1, actualCols));
      }
    };
    const observer = new ResizeObserver(() => { requestAnimationFrame(calculateColumns); });
    observer.observe(gridEl);
    requestAnimationFrame(calculateColumns);
    return () => observer.disconnect();
  }, [loading, viewMode]);

  useLayoutEffect(() => {
    if (viewMode !== 'gallery' || !carGridRef.current) return;
    const t = window.getComputedStyle(carGridRef.current).getPropertyValue('grid-template-columns');
    if (t && t !== 'none') {
      const cols = Math.max(1, t.split(' ').length);
      setColumnCount(prev => (prev === cols ? prev : cols));
    }
  });

  useEffect(() => {
    setLoading(true);
    const endpoint = isPublic ? '/api/cars/public' : '/api/cars';
    fetch(endpoint)
      .then(r => r.json())
      .then(data => {
        const sortedCars = sortCars(data.map(toAppCar));
        if (sortedCars.length > 0) {
          const stillExists = selectedCar ? sortedCars.find(c => c.ID === selectedCar.ID) : null;
          setSelectedCar(stillExists || sortedCars[0]);
        }
        setLoading(false);
        startTransition(() => setCars(sortedCars));
      })
      .catch(() => setLoading(false));
  }, [refreshTrigger]);

  // Keep MAKE_COUNTRY fresh from D1 (static bundle is the initial fallback)
  useEffect(() => {
    fetch('/api/makes')
      .then(r => r.json())
      .then(data => data.forEach(m => MAKE_COUNTRY.set(m.name, parseArr(m.countries))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedLetter) return;
    if (isMobile) return; // mobile: tapping cards must not clear the sidebar filter
    const handle = (e) => {
      if (e.target.closest('.sidebar') || e.target.closest('.secondary-sidebar')) return;
      setSelectedLetter(null);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [selectedLetter, isMobile]);

  const handleDragEnter = (e) => { e.preventDefault(); if (e.dataTransfer.types.includes('Files')) setIsDragging(true); };
  const handleOverlayDragLeave = (e) => { e.preventDefault(); if (!e.currentTarget.contains(e.relatedTarget)) { setIsDragging(false); setDragTarget(null); } };
  const handleHalfDragLeave = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragTarget(null); };
  const handleDrop = async (e) => { e.preventDefault(); setIsDragging(false); setDragTarget(null); uploadFiles(Array.from(e.dataTransfer.files)); };
  const handleDropBrightness = async (e) => { e.preventDefault(); setIsDragging(false); setDragTarget(null); uploadFilesBrightness(Array.from(e.dataTransfer.files)); };
  const handleDropMonster = async (e) => { e.preventDefault(); setIsDragging(false); setDragTarget(null); uploadFilesMonster(Array.from(e.dataTransfer.files)); };
  const handleDropSensitive = async (e) => { e.preventDefault(); setIsDragging(false); setDragTarget(null); uploadFilesSensitive(Array.from(e.dataTransfer.files)); };
  const handleMobileFileSelect = (e) => { uploadFiles(Array.from(e.target.files)); e.target.value = ''; };

  const getHeroImage = (id) => `${BASE_PATH}/standard_hero_shots/${id} (2).jpg${imageUpdates[id] ? `?t=${imageUpdates[id]}` : ''}`;
  const fallbackGridImage = `${BASE_PATH}/mystery_side.jpg`;
  const fallbackHeroImage = `${BASE_PATH}/mystery_hero.jpg`;
  const getMakeLogo = (make) => `${BASE_PATH}/makes/${make}.png`;

  const flushListDrafts = () => {
    if (Object.keys(listDrafts).length === 0) return cars;
    const updatedCars = cars.map(car => listDrafts[car.ID] ? { ...car, ...listDrafts[car.ID] } : car);
    const sorted = sortCars(updatedCars);
    setCars(sorted);
    setListDrafts({});
    return sorted;
  };

  const toggleListEditMode = () => {
    if (isListEditing) flushListDrafts();
    setIsListEditing(!isListEditing);
  };

  const downloadCSV = async (explicitData) => {
    let dataToSave = Array.isArray(explicitData) ? explicitData : cars;

    if (!Array.isArray(explicitData) && viewMode === 'list' && isListEditing) {
      dataToSave = flushListDrafts();
      setIsListEditing(false);
      setCars(sortCars(dataToSave));
    }

    const payload = sortCars(dataToSave).map(toDBRow);
    const key = localStorage.getItem('adminApiKey');

    try {
      const response = await fetch('/api/cars/bulk', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(key ? { 'Authorization': `Bearer ${key}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        showToast('Changes saved to database!', 'success');
        setBackupAvailable(false);
      } else {
        const err = await response.json();
        showToast(`Failed to save: ${err.error}`, 'error');
      }
    } catch {
      showToast('API unreachable.', 'error');
    }
  };

  const handlePublish = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/publish', { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        showToast(data.message, 'success');
      } else {
        const err = await response.json();
        showToast(`Publish failed: ${err.error}`, 'error');
      }
    } catch {
      showToast('Server unreachable. Is server.py running?', 'error');
    }
  };

  const undoSave = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/undo', { method: 'POST' });
      if (response.ok) {
        showToast('Undo successful! Previous version restored.', 'success');
        setBackupAvailable(false);
        setRefreshTrigger(prev => prev + 1);
      } else {
        const errorData = await response.json();
        showToast(`Failed to undo: ${errorData.error}`, 'error');
      }
    } catch (error) {
      showToast("Server unreachable to undo.", 'error');
    }
  };

  const handleCreateNew = ({ make = '', brand = '' } = {}) => {
    const newId = getNextAvailableId(cars);
    const newCar = { ID: newId, Make: make, Model: '', Supername: '', Year: sidebarView === 'decade' && selectedLetter && selectedLetter !== 'Unknown' ? selectedLetter : '', Brand: brand, Series: '', Country: [], Category: [], Description: '', Broken_image: 'FALSE' };

    if (viewMode === 'gallery') {
      setSelectedCar(newCar);
      setIsGalleryEditing(true);
    } else {
      const currentCars = flushListDrafts();
      setCars([newCar, ...currentCars]);
      setIsListEditing(true);
      setCurrentPage(1);
      showToast(`New empty row added at the top! (ID: ${newId})`, 'success');
      document.querySelector('.table-container')?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleFillToId = () => {
    const input = window.prompt('Fill empty cars up to ID:');
    if (input === null) return;
    const targetId = parseInt(input, 10);
    if (isNaN(targetId) || targetId < 1) return showToast('Invalid ID', 'error');
    const existingIds = new Set(cars.map(c => Number(c.ID)));
    const newCars = [];
    for (let id = 1; id <= targetId; id++) {
      if (!existingIds.has(id)) {
        newCars.push({ ID: id, Make: '', Model: 'UNNAMED_CAR', Supername: '', Year: '', Brand: '', Series: '', Country: [], Category: [], Description: '', Broken_image: 'FALSE' });
      }
    }
    if (newCars.length === 0) return showToast('No gaps found up to ID ' + targetId, 'success');
    const updated = sortCars([...cars, ...newCars]);
    setCars(updated);
    downloadCSV(updated);
    showToast(`Added ${newCars.length} UNNAMED_CAR entr${newCars.length === 1 ? 'y' : 'ies'} up to ID ${targetId}`, 'success');
  };

  const handleCreateSameCasting = () => {
    if (!selectedCar) return;
    const newId = getNextAvailableId(cars);
    const newCar = {
      ID: newId,
      Make: selectedCar.Make || '',
      Model: selectedCar.Model || '',
      Supername: '',
      Year: selectedCar.Year || '',
      Brand: selectedCar.Brand || '',
      Series: '',
      Country: [],
      Category: Array.isArray(selectedCar.Category) ? [...selectedCar.Category] : [],
      Description: selectedCar.Description || '',
      Broken_image: 'FALSE',
    };
    setSelectedCar(newCar);
    setIsGalleryEditing(true);
  };

  const handleDeleteGallery = async () => {
    if (!selectedCar) return;
    if (window.confirm(`Are you sure you want to completely delete #${selectedCar.ID}: ${selectedCar.Make} ${selectedCar.Model}?`)) {
      const id = selectedCar.ID;
      const updatedCars = cars.filter(c => String(c.ID) !== String(id));
      setCars(updatedCars);
      setSelectedCar(updatedCars.length > 0 ? updatedCars[0] : null);
      setIsGalleryEditing(false);
      const key = localStorage.getItem('adminApiKey');
      const authHeader = key ? { 'Authorization': `Bearer ${key}` } : {};
      await fetch(`/api/cars/${id}`, { method: 'DELETE', headers: authHeader });
      const res = await fetch('http://localhost:5000/api/exile-images', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id] }) });
      const data = await res.json();
      const moved = data.moved?.length ?? 0;
      showToast(`Deleted #${id}${moved ? ` — ${moved} image(s) moved to exile` : ''}`, 'success');
    }
  };

  const applyBulkDelete = async () => {
    if (selectedIds.size === 0) return showToast('Select at least one car to delete', 'error');
    if (window.confirm(`Are you absolutely sure you want to delete ${selectedIds.size} cars? This will free up their IDs.`)) {
      const ids = [...selectedIds];
      const updatedCars = cars.filter(c => !selectedIds.has(c.ID));
      setCars(updatedCars);
      setListDrafts(prev => {
        const newDrafts = { ...prev };
        ids.forEach(id => delete newDrafts[id]);
        return newDrafts;
      });
      setSelectedIds(new Set());
      const key = localStorage.getItem('adminApiKey');
      const authHeader = key ? { 'Authorization': `Bearer ${key}` } : {};
      await fetch('/api/cars/bulk-delete', { method: 'POST', headers: { ...authHeader, 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
      const res = await fetch('http://localhost:5000/api/exile-images', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
      const data = await res.json();
      const moved = data.moved?.length ?? 0;
      showToast(`Deleted ${ids.length} cars${moved ? ` — ${moved} image(s) moved to exile` : ''} and saved!`, 'success');
    }
  };

  // --- GALLERY EDITOR CALLBACKS ---
  const handleApplyGalleryEdits = useCallback((finalDraft) => {
    setSelectedCar(finalDraft);
    setCars(prevCars => {
      const exists = prevCars.some(c => c.ID === finalDraft.ID);
      let newCars = exists ? prevCars.map(c => c.ID === finalDraft.ID ? finalDraft : c) : [...prevCars, finalDraft];
      return sortCars(newCars);
    });
    setIsGalleryEditing(false);
  }, []);

  const cancelGalleryEdits = useCallback(() => {
    setIsGalleryEditing(false);
    if (selectedCar && !cars.some(c => c.ID === selectedCar.ID)) setSelectedCar(cars.length > 0 ? cars[0] : null);
  }, [selectedCar, cars]);

  const handleSwapIds = () => {
    const targetId = prompt(`Enter the ID you want to swap with #${selectedCar.ID}:`);
    if (!targetId || targetId.trim() === '') return;

    const cleanTargetId = String(targetId.trim());
    if (cleanTargetId === String(selectedCar.ID)) return;

    const targetCar = cars.find(c => String(c.ID) === cleanTargetId);
    if (!targetCar) return showToast(`Car with ID #${cleanTargetId} not found.`, "error");

    const confirmMessage = `Swap ID #${selectedCar.ID} with ID #${targetCar.ID}?\n\n#${selectedCar.ID}: ${selectedCar.Make} ${selectedCar.Model}\n#${targetCar.ID}: ${targetCar.Make} ${targetCar.Model}`;
    if (!window.confirm(confirmMessage)) return;

    const swappedCars = sortCars(cars.map(c => {
      if (String(c.ID) === String(selectedCar.ID)) return { ...c, ID: targetCar.ID };
      if (String(c.ID) === String(targetCar.ID)) return { ...c, ID: selectedCar.ID };
      return c;
    }));

    setCars(swappedCars);
    setSelectedCar(prev => ({ ...prev, ID: targetCar.ID }));
    downloadCSV(swappedCars);
  };

  const handleCellChange = useCallback((id, field, value) => {
    setListDrafts(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: value } }));
  }, []);

  const handleSelectRow = useCallback((id) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }, []);

  const applyBulkBrand = () => {
    if (selectedIds.size === 0) return showToast('Select at least one car first', 'error');
    if (!bulkBrand.trim()) return showToast('Enter a brand name to apply', 'error');

    setListDrafts(prev => {
      const newDrafts = { ...prev };
      selectedIds.forEach(id => { newDrafts[id] = { ...(newDrafts[id] || {}), Brand: bulkBrand }; });
      return newDrafts;
    });

    showToast(`Brand "${bulkBrand}" applied to ${selectedIds.size} cars!`, 'success');
    setSelectedIds(new Set());
    setBulkBrand('');
  };

  const brands = useMemo(() => [...new Set(cars.map(c => c.Brand || 'Unknown'))].sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' })), [cars]);

  const categories = useMemo(() => {
    const cats = [...new Set(cars.flatMap(c => Array.isArray(c.Category) ? c.Category : []).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    if (cars.some(c => !(Array.isArray(c.Category) ? c.Category.length : (c.Category || '').trim()))) cats.push('Uncategorised');
    return cats;
  }, [cars]);

  const categoriesOrdered = useMemo(() => {
    const order = categoryOrderData.categories;
    const orderIndex = new Map(order.map((c, i) => [c, i]));
    const actual = [...new Set(cars.flatMap(c => Array.isArray(c.Category) ? c.Category : []).filter(Boolean))];
    actual.sort((a, b) => {
      const ia = orderIndex.has(a) ? orderIndex.get(a) : Infinity;
      const ib = orderIndex.has(b) ? orderIndex.get(b) : Infinity;
      if (ia !== ib) return ia - ib;
      return a.localeCompare(b, undefined, { sensitivity: 'base' });
    });
    if (cars.some(c => !(Array.isArray(c.Category) ? c.Category.length : (c.Category || '').trim()))) actual.push('Uncategorised');
    return actual;
  }, [cars]);

  const makes = useMemo(() => {
    const uniqueMakes = [...new Set(cars.map(c => c.Make || 'Unknown'))];
    return uniqueMakes.sort((a, b) => {
      const aIsFictional = FICTIONAL_MAKES.has(a);
      const bIsFictional = FICTIONAL_MAKES.has(b);
      if (aIsFictional && !bIsFictional) return 1;
      if (!aIsFictional && bIsFictional) return -1;
      return String(a).localeCompare(String(b), undefined, { sensitivity: 'base' });
    });
  }, [cars]);

  const yearsSorted = useMemo(() => {
    const uniqueYears = [...new Set(cars.map(c => c.Year || 'Unknown'))];
    return uniqueYears.sort((a, b) => {
      if (a === 'Unknown' || a.toUpperCase() === 'N/A') return 1;
      if (b === 'Unknown' || b.toUpperCase() === 'N/A') return -1;
      return parseInt(a, 10) - parseInt(b, 10);
    });
  }, [cars]);

  // FIX: isMatch is now a pure function that doesn't close over state,
  // so it won't cause downstream memo invalidation on unrelated renders.
  const isMatch = useCallback((car, searchTerm, mode) => {
    if (!searchTerm.trim()) return true;
    const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);
    const combinedText = mode === 'car'
      ? `${car.Make || ''} ${car.Model || ''} ${car.Year || ''} ${car.Supername || ''}`.toLowerCase()
      : `${car.Brand || ''} ${car.Series || ''}`.toLowerCase();
    return searchWords.every(word => combinedText.includes(word));
  }, []);

  const publicMissingIds = useMemo(() => new Set(), []);

  // FIX: groupedAndFilteredCars now explicitly depends only on what it needs.
  // debouncedSearchTerm and searchMode are passed into isMatch directly.
  const groupedAndFilteredCars = useMemo(() => {
    const groups = sidebarView === 'brand' ? brands : sidebarView === 'decade' ? yearsSorted : sidebarView === 'category' ? categoriesOrdered : makes;
    return groups.map(groupName => {
      const groupCars = cars.filter(c => {
        if (sidebarView === 'brand') return (c.Brand || 'Unknown') === groupName;
        if (sidebarView === 'decade') return (c.Year || 'Unknown') === groupName;
        if (sidebarView === 'category') { const cats = Array.isArray(c.Category) ? c.Category : []; return groupName === 'Uncategorised' ? cats.length === 0 : cats.includes(groupName); }
        return (c.Make || 'Unknown') === groupName;
      });
      const visibleGroupCars = groupCars.filter(c =>
        isMatch(c, debouncedSearchTerm, searchMode) &&
        (!isPublic || (c.Broken_image !== 'TRUE' && !publicMissingIds.has(String(c.ID))))
      );
      return { groupName, visibleGroupCars };
    }).filter(g => g.visibleGroupCars.length > 0);
  }, [cars, brands, makes, yearsSorted, categoriesOrdered, sidebarView, isMatch, debouncedSearchTerm, searchMode, isPublic, publicMissingIds]);
  groupedAndFilteredCarsRef.current = groupedAndFilteredCars;

  // Mobile: restrict gallery to the active filter selection.
  // Desktop: no change — full groupedAndFilteredCars.
  const galleryGroups = useMemo(() => {
    if (!isMobile) return groupedAndFilteredCars;
    if (debouncedSearchTerm.trim()) return groupedAndFilteredCars; // search overrides letter filter
    if (!selectedLetter) return [];

    if (sidebarView === 'make') {
      return groupedAndFilteredCars.filter(({ groupName }) => {
        if (selectedLetter === 'Fictional') return FICTIONAL_MAKES.has(groupName);
        return !FICTIONAL_MAKES.has(groupName) && groupName.charAt(0).toUpperCase() === selectedLetter;
      });
    }

    if (sidebarView === 'decade') {
      return groupedAndFilteredCars.filter(({ groupName }) => {
        if (selectedLetter === 'Unknown') return groupName === 'Unknown' || groupName.toUpperCase() === 'N/A';
        const parsed = parseInt(groupName, 10);
        if (isNaN(parsed)) return false;
        const floor = parseInt(selectedLetter, 10);
        return parsed >= floor && parsed < floor + 10;
      });
    }

    // Brand / Category: exact group match
    return groupedAndFilteredCars.filter(({ groupName }) => groupName === selectedLetter);
  }, [isMobile, sidebarView, selectedLetter, groupedAndFilteredCars, debouncedSearchTerm]);

  const visibleCarsForPreload = useMemo(
    () => viewMode === 'gallery' ? galleryGroups.flatMap(g => g.visibleGroupCars) : [],
    [galleryGroups, viewMode]
  );
  useImagePreloader(cars, imageUpdates, visibleCarsForPreload, gridPaneRef, viewMode === 'gallery');

  useEffect(() => {
    if (!debouncedSearchTerm.trim()) return;
    const firstCar = groupedAndFilteredCars[0]?.visibleGroupCars[0];
    if (firstCar) setSelectedCar(firstCar);
  }, [debouncedSearchTerm]);

  const brokenCars = useMemo(() => cars.filter(c => c.Broken_image === 'TRUE'), [cars]);

  const visibleCarsCount = useMemo(() => groupedAndFilteredCars.reduce((acc, curr) => acc + curr.visibleGroupCars.length, 0), [groupedAndFilteredCars]);

  const flatListItems = useMemo(() => {
    const items = [];
    groupedAndFilteredCars.forEach(group => {
      items.push({ type: 'header', groupName: group.groupName, count: group.visibleGroupCars.length });
      group.visibleGroupCars.forEach(car => {
        items.push({ type: 'car', car: car });
      });
    });
    return items;
  }, [groupedAndFilteredCars]);

  const totalPages = Math.max(1, Math.ceil(visibleCarsCount / itemsPerPage));
  const pageCarStart = (currentPage - 1) * itemsPerPage;
  const pageCarEnd = currentPage * itemsPerPage;
  const currentListItems = (() => {
    const items = [];
    let carCount = 0;
    let lastHeader = null;
    let headerAdded = false;
    for (const item of flatListItems) {
      if (carCount >= pageCarEnd) break;
      if (item.type === 'header') {
        lastHeader = item;
        headerAdded = false;
      } else {
        if (carCount >= pageCarStart) {
          if (!headerAdded && lastHeader) { items.push(lastHeader); headerAdded = true; }
          items.push(item);
        }
        carCount++;
      }
    }
    return items;
  })();
  const carsBeforePage = pageCarStart;
  const carsOnPage = currentListItems.filter(i => i.type === 'car').length;

  const handleSidebarClick = useCallback((groupName) => {
    if (isMobileRef.current) {
      setSidebarOpen(false);
      if (sidebarView === 'brand' || sidebarView === 'category') {
        setSelectedLetter(groupName);
      }
    }

    const group = groupedAndFilteredCars.find(g => g.groupName === groupName);
    const firstCar = group?.visibleGroupCars[0];
    if (firstCar) setSelectedCar(firstCar);

    const elId = `header-${groupName}`;

    if (viewMode === 'list') {
      let carsBeforeGroup = 0;
      for (const item of flatListItems) {
        if (item.type === 'header' && item.groupName === groupName) break;
        if (item.type === 'car') carsBeforeGroup++;
      }
      const targetPage = Math.floor(carsBeforeGroup / itemsPerPage) + 1;
      if (currentPage !== targetPage) {
        setCurrentPage(targetPage);
        setTimeout(() => { document.getElementById(elId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
        return;
      }
    }

    document.getElementById(elId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [viewMode, flatListItems, currentPage, itemsPerPage, groupedAndFilteredCars, sidebarView]);

  const handleSelectAll = () => {
    if (selectedIds.size === visibleCarsCount && visibleCarsCount > 0) {
      setSelectedIds(new Set());
    } else {
      const allVisibleIds = groupedAndFilteredCars.flatMap(g => g.visibleGroupCars.map(c => c.ID));
      setSelectedIds(new Set(allVisibleIds));
    }
  };

  const visibleLetters = useMemo(() => {
    if (sidebarView !== 'make') return [];
    const letters = new Set();
    let hasFictional = false;
    groupedAndFilteredCars.forEach(({ groupName }) => {
      if (groupName) {
        if (FICTIONAL_MAKES.has(groupName)) hasFictional = true;
        else letters.add(groupName.charAt(0).toUpperCase());
      }
    });
    const sortedLetters = [...letters].sort();
    if (hasFictional) sortedLetters.push('Fictional');
    return sortedLetters;
  }, [groupedAndFilteredCars, sidebarView]);

  const visibleDecades = useMemo(() => {
    if (sidebarView !== 'decade') return [];
    const decades = new Set();
    groupedAndFilteredCars.forEach(({ groupName }) => {
      const parsed = parseInt(groupName, 10);
      if (!isNaN(parsed) && parsed >= 1000 && parsed <= 9999) {
        const decFloor = Math.floor(parsed / 10) * 10;
        decades.add(`${decFloor}s`);
      } else {
        decades.add('Unknown');
      }
    });
    return [...decades].sort((a, b) => {
      if (a === 'Unknown') return 1;
      if (b === 'Unknown') return -1;
      return parseInt(a, 10) - parseInt(b, 10);
    });
  }, [groupedAndFilteredCars, sidebarView]);

  useEffect(() => {
    if (sidebarView === 'make' && selectedLetter && !visibleLetters.includes(selectedLetter)) setSelectedLetter(null);
    if (sidebarView === 'decade' && selectedLetter && !visibleDecades.includes(selectedLetter)) setSelectedLetter(null);
  }, [visibleLetters, visibleDecades, sidebarView, selectedLetter]);

  const showDirectLogos = sidebarView === 'make' && groupedAndFilteredCars.length < 20;
  const showAlphabetDrawer = sidebarView === 'make' && groupedAndFilteredCars.length >= 20;
  const showDecadeDrawer = sidebarView === 'decade';

  // Stable callback for GalleryCard selection — doesn't change on every render
  const handleSelectCar = useCallback((car) => {
    setSelectedCar(car);
    playSelectSound();
  }, [playSelectSound]);

  const showDrawer = (showAlphabetDrawer && selectedLetter) || (showDecadeDrawer && selectedLetter);

  const memoizedSidebar = useMemo(() => {
    // On mobile, when a letter/decade is selected, render the secondary navigation
    // inline (with a Back button) instead of the separate panel.
    if (isMobile && showDrawer) {
      const makesForLetter = sidebarView === 'make' ? groupedAndFilteredCars.filter(({ groupName }) => {
        if (!groupName) return false;
        if (selectedLetter === 'Fictional') return FICTIONAL_MAKES.has(groupName);
        return !FICTIONAL_MAKES.has(groupName) && groupName.charAt(0).toUpperCase() === selectedLetter;
      }) : null;
      const yearsForDecade = sidebarView === 'decade' ? groupedAndFilteredCars.filter(({ groupName }) => {
        if (selectedLetter === 'Unknown') return groupName === 'Unknown' || groupName.toUpperCase() === 'N/A';
        const parsed = parseInt(groupName, 10);
        if (isNaN(parsed)) return false;
        const floor = parseInt(selectedLetter, 10);
        return parsed >= floor && parsed < floor + 10;
      }) : null;
      return (
        <div style={{ overflowY: 'auto', flexGrow: 1 }}>
          <div onClick={() => setSelectedLetter(null)} style={{ padding: '12px 8px', cursor: 'pointer', backgroundColor: 'var(--sb-back-bg)', borderBottom: '1px solid var(--sb-border)', fontWeight: 'bold', color: 'var(--sb-tx)', fontSize: '0.9em' }}>
            ← Back
          </div>
          {makesForLetter && makesForLetter.map(({ groupName }) => (
            <div key={groupName} onClick={() => { handleSidebarClick(groupName); }} style={{ padding: '6px', cursor: 'pointer', textAlign: 'center', borderBottom: '1px solid var(--sb-item-border)', backgroundColor: '#fff' }} title={groupName}>
              <img src={`${BASE_PATH}/makes/${groupName}.png`} alt={groupName} style={{ width: '100%', maxHeight: '52px', objectFit: 'contain', display: 'block' }} onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'block'; }} />
              <span style={{ display: 'none', fontSize: '11px', color: 'var(--sb-tx)', wordBreak: 'break-word', fontWeight: '600' }}>{groupName}</span>
            </div>
          ))}
          {yearsForDecade && yearsForDecade.map(({ groupName, visibleGroupCars }) => (
            <div key={groupName} onClick={() => { handleSidebarClick(groupName); }} style={{ padding: '12px 8px', cursor: 'pointer', borderBottom: '1px solid var(--sb-item-border)', textAlign: 'center' }}>
              <span style={{ fontSize: '1.1em', fontWeight: 'bold', color: 'var(--sb-tx)', display: 'block' }}>{groupName}</span>
              <span style={{ fontSize: '0.7em', color: '#cc2200', fontWeight: '600' }}>{visibleGroupCars.length} Cars</span>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div style={{ overflowY: 'auto', flexGrow: 1 }}>
        {sidebarView === 'brand' && groupedAndFilteredCars.map(({ groupName }) => (
          <div
            key={groupName} onClick={() => handleSidebarClick(groupName)}
            style={{ padding: '4px 5px', cursor: 'pointer', textAlign: 'center', borderBottom: '1px solid var(--sb-item-border)', fontSize: '0.85em', color: 'var(--sb-tx)', fontWeight: '500' }} title={groupName}
          >
            {groupName}
          </div>
        ))}

        {sidebarView === 'category' && groupedAndFilteredCars.map(({ groupName }) => (
          <div
            key={groupName} onClick={() => handleSidebarClick(groupName)}
            style={{ padding: '4px 5px', cursor: 'pointer', textAlign: 'center', borderBottom: '1px solid var(--sb-item-border)', fontSize: '0.85em', color: 'var(--sb-tx)', fontWeight: '500' }} title={groupName}
          >
            {groupName}
          </div>
        ))}

        {showDirectLogos && groupedAndFilteredCars.map(({ groupName }) => (
          <div key={groupName} onClick={() => handleSidebarClick(groupName)} style={{ padding: '4px', cursor: 'pointer', textAlign: 'center', borderBottom: '1px solid var(--sb-item-border)', backgroundColor: '#fff' }} title={groupName}>
            <img src={getMakeLogo(groupName)} alt={groupName} style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
            <span style={{ display: 'none', fontSize: '10px', color: 'var(--sb-tx)', wordBreak: 'break-word', fontWeight: '500' }}>{groupName}</span>
          </div>
        ))}

        {showAlphabetDrawer && visibleLetters.map(letter => (
          <div
            key={letter} onClick={() => setSelectedLetter(prev => prev === letter ? null : letter)}
            style={{ padding: letter === 'Fictional' ? '14px 5px' : '12px 5px', cursor: 'pointer', textAlign: 'center', borderBottom: '1px solid var(--sb-item-border)', fontSize: letter === 'Fictional' ? '0.85em' : '1.2em', fontWeight: 'bold', backgroundColor: selectedLetter === letter ? '#cc2200' : 'transparent', color: selectedLetter === letter ? '#fff' : 'var(--sb-tx)', transition: 'background-color 0.2s ease, color 0.2s ease' }}
          >
            {letter}
          </div>
        ))}

        {showDecadeDrawer && visibleDecades.map(decade => (
          <div
            key={decade} onClick={() => setSelectedLetter(prev => prev === decade ? null : decade)}
            style={{ padding: '14px 5px', cursor: 'pointer', textAlign: 'center', borderBottom: '1px solid var(--sb-item-border)', fontSize: '1.05em', fontWeight: 'bold', backgroundColor: selectedLetter === decade ? '#cc2200' : 'transparent', color: selectedLetter === decade ? '#fff' : 'var(--sb-tx)', transition: 'background-color 0.2s ease, color 0.2s ease' }}
          >
            {decade}
          </div>
        ))}
      </div>
    );
  }, [groupedAndFilteredCars, sidebarView, handleSidebarClick, visibleLetters, visibleDecades, selectedLetter, showDirectLogos, showAlphabetDrawer, showDecadeDrawer, isMobile, showDrawer]);

  const memoizedSecondarySidebar = useMemo(() => {
    if (!showDrawer) return null;

    if (sidebarView === 'make') {
      const makesForLetter = groupedAndFilteredCars.filter(({ groupName }) => {
        if (!groupName) return false;
        if (selectedLetter === 'Fictional') return FICTIONAL_MAKES.has(groupName);
        return !FICTIONAL_MAKES.has(groupName) && groupName.charAt(0).toUpperCase() === selectedLetter;
      });

      return (
        <div style={{ width: '130px', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
          <div style={{ padding: '8px', textAlign: 'center', backgroundColor: '#e9ecef', fontWeight: 'bold', borderBottom: '1px solid #ddd', position: 'sticky', top: 0, zIndex: 5, color: '#333', fontSize: selectedLetter === 'Fictional' ? '0.8em' : '1em' }}>
            {selectedLetter === 'Fictional' ? 'Fictional' : `Makes - ${selectedLetter}`}
          </div>
          {makesForLetter.map(({ groupName }) => (
            <div key={groupName} onClick={() => handleSidebarClick(groupName)} style={{ padding: '6px', cursor: 'pointer', textAlign: 'center', borderBottom: '1px solid #eee', display: 'block', backgroundColor: '#fff' }} title={groupName}>
              <img src={getMakeLogo(groupName)} alt={groupName} style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
              <span style={{ display: 'none', fontSize: '12px', color: '#333', wordBreak: 'break-word', fontWeight: '600' }}>{groupName}</span>
            </div>
          ))}
        </div>
      );
    }

    if (sidebarView === 'decade') {
      const yearsForDecade = groupedAndFilteredCars.filter(({ groupName }) => {
        if (selectedLetter === 'Unknown') return groupName === 'Unknown' || groupName.toUpperCase() === 'N/A';
        const parsed = parseInt(groupName, 10);
        if (isNaN(parsed)) return false;
        const targetDecadeFloor = parseInt(selectedLetter, 10);
        return parsed >= targetDecadeFloor && parsed < targetDecadeFloor + 10;
      });

      return (
        <div style={{ width: '130px', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
          <div style={{ padding: '8px', textAlign: 'center', backgroundColor: '#e9ecef', fontWeight: 'bold', borderBottom: '1px solid #ddd', position: 'sticky', top: 0, zIndex: 5, color: '#333', fontSize: '0.9em' }}>
            {selectedLetter}
          </div>
          {yearsForDecade.map(({ groupName, visibleGroupCars }) => (
            <div
              key={groupName} onClick={() => handleSidebarClick(groupName)}
              style={{ padding: '12px 8px', cursor: 'pointer', borderBottom: '1px solid #eee', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
            >
              <span style={{ fontSize: '1.1em', fontWeight: 'bold', color: '#111' }}>{groupName}</span>
              <span style={{ fontSize: '0.7em', fontWeight: '600', color: '#cc2200', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>
                {visibleGroupCars.length} {visibleGroupCars.length === 1 ? 'Car' : 'Cars'}
              </span>
            </div>
          ))}
        </div>
      );
    }

    return null;
  }, [groupedAndFilteredCars, selectedLetter, sidebarView, showDrawer, handleSidebarClick]);

  // FIX: Gallery nodes no longer depend on `imageUpdates` directly.
  // Each GalleryCard only receives imageUpdates[car.ID] for its own car,
  // so uploading one photo only re-renders that one card.
  const memoizedGalleryNodes = useMemo(() => {
    if (isMobile && galleryGroups.length === 0) {
      return [<div key="mobile-empty" style={{ gridColumn: '1 / -1', padding: '40px 16px', textAlign: 'center', color: 'var(--tx-3)', fontSize: '0.95em' }}>
        Open the sidebar and select a filter to browse cars
      </div>];
    }

    const groupsToRender = galleryGroups;

    let renderedNodes = [];
    let visiblePos = 0;

    groupsToRender.forEach(({ groupName, visibleGroupCars }) => {
      if (visiblePos % columnCount === columnCount - 1 && columnCount > 1) {
        renderedNodes.push(
          <div key={`spacer-${groupName}`} style={{ position: 'relative', minWidth: 0, height: '100%' }}>
            <div style={{ width: '100%', aspectRatio: '8 / 3', display: 'flex', alignItems: 'center' }}>&nbsp;</div>
            <div style={{ height: '2em', padding: '2px 4px', boxSizing: 'content-box', display: 'flex', alignItems: 'center' }}>&nbsp;</div>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '80%', height: '3px', backgroundColor: 'var(--bd)', borderRadius: '2px' }}></div>
            </div>
          </div>
        );
        visiblePos++;
      }

      const displayHeaderTitle = sidebarView === 'decade' ? `Year: ${groupName}` : groupName;

      const headerNode = (
        <div key={`header-${groupName}`} id={`header-${groupName}`} style={{ position: 'relative', minWidth: 0 }}>
          <div style={{ width: '100%', aspectRatio: '8 / 3', display: 'flex' }}>&nbsp;</div>
          <div style={{ height: '2em', padding: '2px 4px', boxSizing: 'content-box', display: 'flex' }}>&nbsp;</div>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
              <div style={{ width: '33.33%', paddingRight: '8px', display: 'flex', flexDirection: 'column' }}>
                {!isPublic && <button onClick={() => handleCreateNew({ make: sidebarView === 'make' ? groupName : '', brand: sidebarView === 'brand' ? groupName : '' })} style={{ width: '100%', padding: '2px 0', fontSize: '0.85em', backgroundColor: '#cc2200', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', marginBottom: '6px' }} title={`Add new entry to ${groupName}`}>+ Add</button>}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1 }}>
                  <span style={{ fontSize: '1.4em', fontWeight: '900', color: 'var(--tx)', lineHeight: '1' }}>{visibleGroupCars.length}</span>
                  <img src="/car-icon.svg" alt="vehicles" className="car-icon" style={{ width: '32px', height: '32px', marginTop: '3px', display: 'block' }} />
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-surface)', borderRadius: '4px 4px 0 0', overflow: 'hidden', position: 'relative', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                <div style={{ flexGrow: 1, backgroundColor: '#fff', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '4px', backgroundColor: '#cc2200', zIndex: 10 }}></div>
                  {sidebarView !== 'decade' ? (
                    <>
                      <img src={getMakeLogo(groupName)} alt={groupName} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', objectFit: 'contain', paddingLeft: '4px' }} onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }} />
                      <span style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold', fontSize: '1.2em', textAlign: 'center', wordBreak: 'break-word', padding: '0 10px', boxSizing: 'border-box' }}>{groupName}</span>
                    </>
                  ) : (
                    <div style={{ color: '#111', fontSize: '2em', fontWeight: '900', letterSpacing: '-1px' }}>{groupName}</div>
                  )}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '0.8em', padding: '2px 4px', height: '2em', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', backgroundColor: 'var(--bg)', borderRadius: '0 0 4px 4px', boxSizing: 'content-box' }}>
              {sidebarView === 'make' && <CountryFlags make={groupName} />}
              <span style={{ color: 'var(--tx)', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayHeaderTitle}</span>
            </div>
          </div>
        </div>
      );
      renderedNodes.push(headerNode);
      visiblePos++;

      if (!stackingEnabled) {
        // Flat / unnested: every car gets its own tile
        for (const car of visibleGroupCars) {
          renderedNodes.push(
            <GalleryCard
              key={car.ID}
              car={car}
              isGalleryEditingRef={isGalleryEditingRef}
              sidebarView={sidebarView}
              imageUpdate={imageUpdates[car.ID]}
              fallbackGridImage={fallbackGridImage}
              onSelect={handleSelectCar}
                hideId={isPublic}
              showToast={showToast}
            />
          );
          visiblePos++;
        }
      } else {

      // Sub-group cars by Year+Make+Model+Brand for stack collapsing
      const stackMap = new Map();
      const stackOrder = [];
      for (const car of visibleGroupCars) {
        const key = getStackKey(car);
        if (!stackMap.has(key)) { stackMap.set(key, []); stackOrder.push(key); }
        stackMap.get(key).push(car);
      }

      for (const stackKey of stackOrder) {
        const stackCars = stackMap.get(stackKey);

        if (stackCars.length === 1) {
          renderedNodes.push(
            <GalleryCard
              key={stackCars[0].ID}
              car={stackCars[0]}
              isGalleryEditingRef={isGalleryEditingRef}
              sidebarView={sidebarView}
              imageUpdate={imageUpdates[stackCars[0].ID]}
              fallbackGridImage={fallbackGridImage}
              onSelect={handleSelectCar}
                hideId={isPublic}
              showToast={showToast}
            />
          );
          visiblePos++;
        } else if (expandedStacks.has(stackKey)) {
          const fc = stackCars[0];
          const vy = fc.Year && fc.Year.toUpperCase() !== 'N/A' ? fc.Year : null;

          // Render variants row-by-row. The first variant in each grid row gets a
          // flex-column wrapper: header on top (width spans all variants in that row),
          // card below. The header's width overflows the one-column wrapper naturally.
          // alignItems:'end' on the outer grid keeps non-variant cards bottom-aligned
          // so they don't have visible gap above them — only the variant row shifts.
          let vi = 0;
          while (vi < stackCars.length) {
            const rowStartCol = visiblePos % columnCount;
            const variantsThisRow = Math.min(stackCars.length - vi, columnCount - rowStartCol);
            const firstCar = stackCars[vi];
            const headerWidth = variantsThisRow === 1
              ? '100%'
              : `calc(${variantsThisRow} * 100% + ${variantsThisRow - 1} * 6px)`;

            renderedNodes.push(
              <div key={`sv-${groupName}-${firstCar.ID}`} style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <div
                  onClick={() => toggleStack(stackKey)}
                  style={{ width: headerWidth, cursor: 'pointer', backgroundColor: 'var(--expand-hdr)', border: '1px solid var(--accent)', borderRadius: '6px', padding: '5px 14px', marginBottom: '2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8em', whiteSpace: 'nowrap', opacity: 0.85 }}
                >
                  <span style={{ color: 'var(--accent)', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {[vy, fc.Make, fc.Model].filter(Boolean).join(' ')} — {stackCars.length} variants
                  </span>
                  <span style={{ color: 'var(--tx-3)', fontWeight: 'bold', flexShrink: 0, marginLeft: '8px' }}>▲ collapse</span>
                </div>
                <GalleryCard
                  car={firstCar}
                  isGalleryEditingRef={isGalleryEditingRef}
                  sidebarView={sidebarView}
                  imageUpdate={imageUpdates[firstCar.ID]}
                  fallbackGridImage={fallbackGridImage}
                  onSelect={handleSelectCar}
                hideId={isPublic}
                  showToast={showToast}
                  eagerLoad
                />
              </div>
            );
            visiblePos++;
            vi++;

            for (let j = 1; j < variantsThisRow; j++) {
              const car = stackCars[vi];
              renderedNodes.push(
                <GalleryCard
                  key={car.ID}
                  car={car}
                  isGalleryEditingRef={isGalleryEditingRef}
                  sidebarView={sidebarView}
                  imageUpdate={imageUpdates[car.ID]}
                  fallbackGridImage={fallbackGridImage}
                  onSelect={handleSelectCar}
                hideId={isPublic}
                  showToast={showToast}
                  eagerLoad
                />
              );
              visiblePos++;
              vi++;
            }
          }
        } else {
          // Collapsed stack tile
          renderedNodes.push(
            <StackedCard
              key={`stack-${groupName}-${stackKey}`}
              firstCar={stackCars[0]}
              count={stackCars.length}
              stackCarIds={stackCars.map(c => c.ID).join(' ')}
              imageUpdate={imageUpdates[stackCars[0].ID]}
              sidebarView={sidebarView}
              onToggle={() => toggleStack(stackKey)}
              onSelect={handleSelectCar}
              fallbackGridImage={fallbackGridImage}
            />
          );
          visiblePos++;
        }
      }
      } // end else (stackingEnabled)
    });

    return renderedNodes;
  }, [galleryGroups, isMobile, sidebarView, isGalleryEditingRef, columnCount, imageUpdates, handleSelectCar, showToast, expandedStacks, toggleStack, stackingEnabled]);


  if (loading) return <div className="loading">Loading Car Collection...</div>;

  const validSelectedYear = selectedCar && selectedCar.Year && selectedCar.Year.toUpperCase() !== 'N/A' ? selectedCar.Year : null;
  const selectedCarFullName = selectedCar ? [selectedCar.Supername, validSelectedYear, selectedCar.Make, selectedCar.Model].filter(Boolean).join(' ') : '';

  return (
    <div className="main-layout" onDragEnter={handleDragEnter} style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', position: 'relative', backgroundColor: 'var(--bg)' }}>

      {/* Mobile: tap-outside backdrop closes the sidebar */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 98 }} />
      )}

      {/* Mobile top bar */}
      {isMobile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '48px', backgroundColor: '#fff', borderBottom: '1px solid #ddd', display: 'flex', alignItems: 'center', padding: '0 8px', gap: '6px', zIndex: 50, flexShrink: 0 }}>
          <button onClick={() => setSidebarOpen(true)} style={{ padding: '8px 10px', fontSize: '1.1em', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#333', lineHeight: 1, flexShrink: 0 }}>☰</button>
          <span style={{ fontWeight: 'bold', color: '#333', flex: 1, fontSize: '0.9em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Car Collection</span>
          {!isPublic && backupAvailable && <button onClick={undoSave} style={{ padding: '5px 8px', fontSize: '0.72em', fontWeight: 'bold', backgroundColor: '#ffc107', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', flexShrink: 0 }}>Undo</button>}
          {!isPublic && <button onClick={() => mobileFileInputRef.current?.click()} style={{ padding: '5px 10px', fontSize: '0.75em', fontWeight: 'bold', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', flexShrink: 0 }}>Upload</button>}
          {!isPublic && <button onClick={handleCreateNew} style={{ padding: '5px 10px', fontSize: '0.75em', fontWeight: 'bold', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', flexShrink: 0 }}>+ New</button>}
          <input ref={mobileFileInputRef} type="file" multiple accept=".jpg" style={{ display: 'none' }} onChange={handleMobileFileSelect} />
        </div>
      )}

      {!isPublic && isDragging && (
        <div
          onDragLeave={handleOverlayDragLeave} onDragOver={(e) => e.preventDefault()}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', flexDirection: 'column' }}
        >
          {/* Top strip — Monster Truck (left) and Sensitive Detection (right) */}
          <div style={{ height: '26%', display: 'flex', borderBottom: '4px dashed rgba(255,255,255,0.5)' }}>
            <div
              onDragEnter={() => setDragTarget('monster')} onDragLeave={handleHalfDragLeave}
              onDrop={handleDropMonster} onDragOver={(e) => e.preventDefault()}
              style={{ flex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '16px', backgroundColor: dragTarget === 'monster' ? 'rgba(140, 50, 180, 0.95)' : 'rgba(110, 30, 150, 0.85)', borderRight: '4px dashed rgba(255,255,255,0.5)', outline: dragTarget === 'monster' ? '6px dashed #fff' : '6px dashed rgba(255,255,255,0.4)', outlineOffset: '-10px', transition: 'background-color 0.15s' }}
            >
              <h1 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 'bold', pointerEvents: 'none', margin: 0 }}>🚛 Monster Truck</h1>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1rem', pointerEvents: 'none', margin: 0 }}>Wheels offset · body visible · (1) only</p>
            </div>
            <div
              onDragEnter={() => setDragTarget('sensitive')} onDragLeave={handleHalfDragLeave}
              onDrop={handleDropSensitive} onDragOver={(e) => e.preventDefault()}
              style={{ flex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '16px', backgroundColor: dragTarget === 'sensitive' ? 'rgba(180, 100, 0, 0.95)' : 'rgba(210, 120, 0, 0.85)', borderLeft: '4px dashed rgba(255,255,255,0.5)', outline: dragTarget === 'sensitive' ? '6px dashed #fff' : '6px dashed rgba(255,255,255,0.4)', outlineOffset: '-10px', transition: 'background-color 0.15s' }}
            >
              <h1 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 'bold', pointerEvents: 'none', margin: 0 }}>Sensitive Detection</h1>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1rem', pointerEvents: 'none', margin: 0 }}>White/light vehicles · (1) only</p>
            </div>
          </div>
          {/* Existing bottom two zones */}
          <div style={{ flex: 1, display: 'flex' }}>
            <div
              onDragEnter={() => setDragTarget('brightness')} onDragLeave={handleHalfDragLeave}
              onDrop={handleDropBrightness} onDragOver={(e) => e.preventDefault()}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', backgroundColor: dragTarget === 'brightness' ? 'rgba(25, 140, 50, 0.92)' : 'rgba(33, 160, 64, 0.82)', borderRight: '4px dashed rgba(255,255,255,0.5)', outline: dragTarget === 'brightness' ? '6px dashed #fff' : '6px dashed rgba(255,255,255,0.4)', outlineOffset: '-10px', transition: 'background-color 0.15s' }}
            >
              <h1 style={{ color: '#fff', fontSize: '2.2rem', fontWeight: 'bold', pointerEvents: 'none', margin: 0 }}>Brightness Only</h1>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1rem', pointerEvents: 'none', margin: 0 }}>No crop or resize</p>
            </div>
            <div
              onDragEnter={() => setDragTarget('full')} onDragLeave={handleHalfDragLeave}
              onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', backgroundColor: dragTarget === 'full' ? 'rgba(0, 100, 220, 0.92)' : 'rgba(0, 123, 255, 0.82)', borderLeft: '4px dashed rgba(255,255,255,0.5)', outline: dragTarget === 'full' ? '6px dashed #fff' : '6px dashed rgba(255,255,255,0.4)', outlineOffset: '-10px', transition: 'background-color 0.15s' }}
            >
              <h1 style={{ color: '#fff', fontSize: '2.2rem', fontWeight: 'bold', pointerEvents: 'none', margin: 0 }}>Full Process</h1>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1rem', pointerEvents: 'none', margin: 0 }}>Crop · resize · adjust brightness</p>
            </div>
          </div>
        </div>
      )}

      {toast.visible && (
        <div style={{ position: 'fixed', bottom: isMobile ? '66px' : '30px', left: '50%', transform: 'translateX(-50%)', backgroundColor: toast.type === 'error' ? '#dc3545' : '#28a745', color: 'white', padding: '12px 24px', borderRadius: '8px', zIndex: 9999, fontWeight: 'bold', whiteSpace: 'nowrap' }}>
          {toast.message}
        </div>
      )}

      {sensitivePreview && (() => {
        const { file, filename, variants, startPct } = sensitivePreview;
        const rangeStart = Math.round(startPct * 100);
        const rangeEnd   = Math.round((startPct + 19 * 0.05) * 100);
        return (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.92)', zIndex: 10000, display: 'flex', flexDirection: 'column', alignItems: 'stretch', padding: '16px', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, flexWrap: 'wrap' }}>
              <h2 style={{ color: '#fff', margin: 0, fontSize: '1.1rem', flex: 1 }}>
                Choose a result — click to save &nbsp;
                <span style={{ color: '#aaa', fontWeight: 'normal', fontSize: '0.85rem' }}>{filename}</span>
                <span style={{ color: '#888', fontWeight: 'normal', fontSize: '0.85rem', marginLeft: '12px' }}>{rangeStart}%–{rangeEnd}%</span>
              </h2>
              {startPct > 0 && (
                <button onClick={() => fetchSensitivePreview(file, Math.max(0, startPct - 1.0))} style={{ padding: '7px 18px', backgroundColor: '#555', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
                  ← Back
                </button>
              )}
              <button onClick={() => fetchSensitivePreview(file, startPct + 1.0)} style={{ padding: '7px 18px', backgroundColor: '#0077cc', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
                Next →
              </button>
              <button onClick={() => setSensitivePreview(null)} style={{ padding: '7px 18px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
                Discard
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {variants.map(({ label, preview_b64, save_b64 }) => (
                  <div
                    key={label}
                    onClick={() => handleSaveSensitive(filename, save_b64)}
                    style={{ cursor: 'pointer', backgroundColor: '#1a1a1a', borderRadius: '6px', overflow: 'hidden', border: '2px solid #444', transition: 'border-color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#4af'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#444'}
                  >
                    <img src={`data:image/jpeg;base64,${preview_b64}`} alt={label} style={{ width: '100%', display: 'block' }} />
                    <div style={{ padding: '4px 10px', color: '#ccc', fontWeight: 'bold', fontSize: '0.85rem' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Sidebar — fixed overlay drawer on mobile, static panel on desktop */}
      <div className="sidebar" style={{
        display: 'flex', flexDirection: 'column',
        width: isMobile ? '220px' : '130px',
        flexShrink: 0, overflow: 'hidden',
        backgroundColor: 'var(--sb-bg)', borderRight: '1px solid var(--sb-border)',
        ...(isMobile ? {
          position: 'fixed', top: 0, left: 0, bottom: 0,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: sidebarOpen ? '4px 0 20px rgba(0,0,0,0.35)' : 'none',
          zIndex: 100,
        } : { height: '100%', zIndex: 20 }),
      }}>
        {/* Mobile drawer close button */}
        {isMobile && (
          <div style={{ padding: '8px', borderBottom: '1px solid var(--sb-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ display: 'flex', border: '1px solid #bbb', borderRadius: '4px', overflow: 'hidden' }}>
              <button onClick={() => setTheme('dark')} style={{ padding: '4px 8px', fontSize: '0.7em', fontWeight: 'bold', backgroundColor: theme === 'dark' ? '#555' : 'transparent', color: theme === 'dark' ? '#fff' : '#999', border: 'none', cursor: 'pointer' }}>DARK</button>
              <button onClick={() => setTheme('light')} style={{ padding: '4px 8px', fontSize: '0.7em', fontWeight: 'bold', backgroundColor: theme === 'light' ? '#555' : 'transparent', color: theme === 'light' ? '#fff' : '#999', border: 'none', cursor: 'pointer' }}>LIGHT</button>
            </div>
            <button onClick={() => setSidebarOpen(false)} style={{ padding: '4px 12px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85em' }}>✕ Close</button>
          </div>
        )}

        <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--sb-bg)' }}>
          {/* + New Car / Undo — desktop only (on mobile these live in the top bar) */}
          {!isMobile && !isPublic && (
            <div style={{ padding: '8px', borderBottom: '1px solid var(--sb-border)' }}>
              <button onClick={handleCreateNew} style={{ width: '100%', padding: '6px', fontSize: '0.8em', fontWeight: 'bold', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ New Car</button>
              <button onClick={handleFillToId} style={{ width: '100%', padding: '4px', marginTop: '4px', fontSize: '0.7em', fontWeight: 'bold', backgroundColor: '#17a2b8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Fill to ID</button>
              {backupAvailable && <button onClick={undoSave} style={{ width: '100%', padding: '4px', marginTop: '4px', fontSize: '0.7em', fontWeight: 'bold', backgroundColor: '#ffc107', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Undo CSV Save</button>}
              <button onClick={handlePublish} style={{ width: '100%', padding: '4px', marginTop: '4px', fontSize: '0.7em', fontWeight: 'bold', backgroundColor: '#0077cc', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Publish</button>
            </div>
          )}
          {/* View mode — desktop only (on mobile the bottom nav handles this) */}
          {!isMobile && (
            <div style={{ padding: '8px', borderBottom: '1px solid var(--sb-border)', backgroundColor: 'var(--sb-controls-bg)' }}>
              <div style={{ display: 'flex', border: '1px solid #cc2200', borderRadius: '4px', overflow: 'hidden', marginBottom: '4px' }}>
                <button onClick={() => setViewMode('gallery')} style={{ flex: 1, padding: '4px', fontSize: '0.7em', fontWeight: 'bold', backgroundColor: viewMode === 'gallery' ? '#cc2200' : 'transparent', color: viewMode === 'gallery' ? '#fff' : '#cc2200', border: 'none', cursor: 'pointer' }}>GALLERY</button>
                <button onClick={() => setViewMode('list')} style={{ flex: 1, padding: '4px', fontSize: '0.7em', fontWeight: 'bold', backgroundColor: viewMode === 'list' ? '#cc2200' : 'transparent', color: viewMode === 'list' ? '#fff' : '#cc2200', border: 'none', cursor: 'pointer' }}>LIST</button>
              </div>
              {viewMode === 'gallery' && (
                <div style={{ display: 'flex', border: '1px solid #6c757d', borderRadius: '4px', overflow: 'hidden', marginBottom: '4px' }}>
                  <button onClick={() => setStackingEnabled(true)} style={{ flex: 1, padding: '4px', fontSize: '0.7em', fontWeight: 'bold', backgroundColor: stackingEnabled ? '#6c757d' : 'transparent', color: stackingEnabled ? '#fff' : '#6c757d', border: 'none', cursor: 'pointer' }}>STACKED</button>
                  <button onClick={() => setStackingEnabled(false)} style={{ flex: 1, padding: '4px', fontSize: '0.7em', fontWeight: 'bold', backgroundColor: !stackingEnabled ? '#6c757d' : 'transparent', color: !stackingEnabled ? '#fff' : '#6c757d', border: 'none', cursor: 'pointer' }}>FLAT</button>
                </div>
              )}
              {!isPublic && <button onClick={() => setViewMode('missing')} style={{ width: '100%', padding: '4px', fontSize: '0.7em', fontWeight: 'bold', backgroundColor: viewMode === 'missing' ? '#fd7e14' : 'transparent', color: viewMode === 'missing' ? '#fff' : '#fd7e14', border: '1px solid #fd7e14', borderRadius: '4px', cursor: 'pointer' }}>MISSING IMGS</button>}
              <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                <div style={{ display: 'flex', flex: 1, border: '1px solid #bbb', borderRadius: '4px', overflow: 'hidden' }}>
                  <button onClick={() => setTheme('dark')} style={{ flex: 1, padding: '4px', fontSize: '0.7em', fontWeight: 'bold', backgroundColor: theme === 'dark' ? '#555' : 'transparent', color: theme === 'dark' ? '#fff' : '#999', border: 'none', cursor: 'pointer' }}>DARK</button>
                  <button onClick={() => setTheme('light')} style={{ flex: 1, padding: '4px', fontSize: '0.7em', fontWeight: 'bold', backgroundColor: theme === 'light' ? '#555' : 'transparent', color: theme === 'light' ? '#fff' : '#999', border: 'none', cursor: 'pointer' }}>LIGHT</button>
                </div>
                <button onClick={() => setSoundEnabled(s => !s)} title={soundEnabled ? 'Sound ON — click to mute' : 'Sound OFF — click to enable'} style={{ padding: '4px 8px', fontSize: '0.85em', fontWeight: 'bold', backgroundColor: soundEnabled ? '#6f42c1' : 'transparent', color: soundEnabled ? '#fff' : '#888', border: '1px solid #bbb', borderRadius: '4px', cursor: 'pointer', flexShrink: 0 }}>{soundEnabled ? '♪' : '♩'}</button>
              </div>
            </div>
          )}
          <div style={{ padding: '8px', borderBottom: '1px solid var(--sb-border)' }}>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
              <button onClick={() => setSearchMode('car')} style={{ flex: 1, padding: '4px', fontSize: '0.7em', fontWeight: 'bold', backgroundColor: searchMode === 'car' ? '#6c757d' : 'var(--sb-btn-off)', color: searchMode === 'car' ? '#fff' : 'var(--tx-3)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>CAR</button>
              <button onClick={() => setSearchMode('release')} style={{ flex: 1, padding: '4px', fontSize: '0.7em', fontWeight: 'bold', backgroundColor: searchMode === 'release' ? '#6c757d' : 'var(--sb-btn-off)', color: searchMode === 'release' ? '#fff' : 'var(--tx-3)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>RELEASE</button>
            </div>
            <input type="text" placeholder="Search..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} style={{ width: '100%', padding: '6px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid var(--sb-search-border)', fontSize: '0.8em', backgroundColor: 'var(--sb-bg)', color: 'var(--sb-tx)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--sb-border)', gap: '1px', backgroundColor: 'var(--sb-gap)' }}>
            <button onClick={() => { setSidebarView('make'); setSelectedLetter(null); }} style={{ flex: 1, padding: '8px 0', fontSize: '0.75em', fontWeight: 'bold', border: 'none', cursor: 'pointer', backgroundColor: sidebarView === 'make' ? 'var(--sb-tab-active-bg)' : 'var(--sb-bg)', color: sidebarView === 'make' ? 'var(--sb-tab-active-tx)' : 'var(--tx-3)' }}>MAKES</button>
            <button onClick={() => { setSidebarView('brand'); setSelectedLetter(null); }} style={{ flex: 1, padding: '8px 0', fontSize: '0.75em', fontWeight: 'bold', border: 'none', cursor: 'pointer', backgroundColor: sidebarView === 'brand' ? 'var(--sb-tab-active-bg)' : 'var(--sb-bg)', color: sidebarView === 'brand' ? 'var(--sb-tab-active-tx)' : 'var(--tx-3)' }}>BRANDS</button>
            <button onClick={() => { setSidebarView('decade'); setSelectedLetter(null); }} style={{ flex: 1, padding: '8px 0', fontSize: '0.75em', fontWeight: 'bold', border: 'none', cursor: 'pointer', backgroundColor: sidebarView === 'decade' ? 'var(--sb-tab-active-bg)' : 'var(--sb-bg)', color: sidebarView === 'decade' ? 'var(--sb-tab-active-tx)' : 'var(--tx-3)' }}>DECADES</button>
            <button onClick={() => { setSidebarView('category'); setSelectedLetter(null); }} style={{ flex: 1, padding: '8px 0', fontSize: '0.75em', fontWeight: 'bold', border: 'none', cursor: 'pointer', backgroundColor: sidebarView === 'category' ? 'var(--sb-tab-active-bg)' : 'var(--sb-bg)', color: sidebarView === 'category' ? 'var(--sb-tab-active-tx)' : 'var(--tx-3)' }}>CATEGORIES</button>
          </div>
        </div>
        {memoizedSidebar}
      </div>

      {/* Desktop-only secondary sidebar — hidden on mobile (secondary nav is inline in the drawer) */}
      {!isMobile && (
        <div className="secondary-sidebar" style={{
          position: 'absolute',
          left: '130px',
          top: 0,
          bottom: 0,
          width: showDrawer ? '130px' : '0px',
          overflow: 'hidden',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          backgroundColor: '#f8f9fa',
          borderRight: showDrawer ? '1px solid #ddd' : 'none',
          boxShadow: showDrawer ? '5px 0 15px rgba(0,0,0,0.5)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 19
        }}>
          {memoizedSecondarySidebar}
        </div>
      )}

      {/* Main content — offset by fixed top/bottom bars on mobile */}
      <div className="app-container" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', ...(isMobile ? { paddingTop: '48px', paddingBottom: '56px' } : {}) }}>

        {viewMode === 'missing' && (
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '10px 15px', backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
              <div style={{ display: 'flex', border: '1px solid #fd7e14', borderRadius: '4px', overflow: 'hidden' }}>
                <button onClick={() => setMissingSubTab('missing')} style={{ padding: '5px 12px', fontSize: '0.8em', fontWeight: 'bold', backgroundColor: missingSubTab === 'missing' ? '#fd7e14' : 'transparent', color: missingSubTab === 'missing' ? '#fff' : '#fd7e14', border: 'none', cursor: 'pointer' }}>
                  Missing Files {!missingLoading && `(${missingData.length})`}
                </button>
                <button onClick={() => setMissingSubTab('broken')} style={{ padding: '5px 12px', fontSize: '0.8em', fontWeight: 'bold', backgroundColor: missingSubTab === 'broken' ? '#fd7e14' : 'transparent', color: missingSubTab === 'broken' ? '#fff' : '#fd7e14', border: 'none', cursor: 'pointer' }}>
                  Broken Images ({brokenCars.length})
                </button>
              </div>
              {missingSubTab === 'missing' && (
                <button onClick={fetchMissingData} disabled={missingLoading} style={{ padding: '5px 12px', fontSize: '0.8em', backgroundColor: 'var(--bg-card-sel)', color: 'var(--tx-2)', border: '1px solid var(--bd-3)', borderRadius: '4px', fontWeight: 'bold', cursor: missingLoading ? 'not-allowed' : 'pointer', opacity: missingLoading ? 0.6 : 1 }}>
                  {missingLoading ? 'Loading...' : 'Refresh'}
                </button>
              )}
            </div>

            {missingSubTab === 'missing' ? (
              <div style={{ flexGrow: 1, overflow: 'auto', padding: '0 10px', contain: 'content' }}>
                <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '0.85em' }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, width: '60px' }}>ID</th>
                      <th style={{ ...thStyle, width: '55px' }}>Year</th>
                      <th style={{ ...thStyle, width: '11%' }}>Make</th>
                      <th style={{ ...thStyle, width: '16%' }}>Model</th>
                      <th style={{ ...thStyle, width: '12%' }}>Supername</th>
                      <th style={{ ...thStyle, width: '11%' }}>Brand</th>
                      <th style={{ ...thStyle, width: '13%' }}>Series</th>
                      <th style={{ ...thStyle, width: '80px', textAlign: 'center' }}>Side (1)</th>
                      <th style={{ ...thStyle, width: '80px', textAlign: 'center' }}>Hero (2)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {missingData.map(item => (
                      <tr key={item.id}>
                        <td style={{ ...tdStyle, color: '#888', fontWeight: 'bold' }}>#{item.id}</td>
                        <td style={tdStyle}>{item.year}</td>
                        <td style={tdStyle}>{item.make}</td>
                        <td style={{ ...tdStyle, fontWeight: 'bold', color: 'var(--tx)' }}>{item.model}</td>
                        <td style={tdStyle}>{item.supername}</td>
                        <td style={{ ...tdStyle, color: '#17a2b8' }}>{item.brand}</td>
                        <td style={tdStyle}>{item.series}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          {item.missing_side ? <span style={{ color: '#dc3545', fontWeight: 'bold' }}>Missing</span> : <span style={{ color: '#28a745', fontWeight: 'bold' }}>✓</span>}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          {item.missing_hero ? <span style={{ color: '#dc3545', fontWeight: 'bold' }}>Missing</span> : <span style={{ color: '#28a745', fontWeight: 'bold' }}>✓</span>}
                        </td>
                      </tr>
                    ))}
                    {missingData.length === 0 && !missingLoading && (
                      <tr>
                        <td colSpan="9" style={{ ...tdStyle, textAlign: 'center', color: '#28a745', fontWeight: 'bold', padding: '30px' }}>
                          All cars have both image files!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ flexGrow: 1, overflow: 'auto', padding: '0 10px', contain: 'content' }}>
                <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '0.85em' }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, width: '60px' }}>ID</th>
                      <th style={{ ...thStyle, width: '55px' }}>Year</th>
                      <th style={{ ...thStyle, width: '11%' }}>Make</th>
                      <th style={{ ...thStyle, width: '18%' }}>Model</th>
                      <th style={{ ...thStyle, width: '13%' }}>Supername</th>
                      <th style={{ ...thStyle, width: '12%' }}>Brand</th>
                      <th style={thStyle}>Series</th>
                    </tr>
                  </thead>
                  <tbody>
                    {brokenCars.map(car => (
                      <tr key={car.ID} onClick={() => { setSelectedCar(car); setViewMode('gallery'); }} style={{ cursor: 'pointer' }}>
                        <td style={{ ...tdStyle, color: '#888', fontWeight: 'bold' }}>#{car.ID}</td>
                        <td style={tdStyle}>{car.Year}</td>
                        <td style={tdStyle}>{car.Make}</td>
                        <td style={{ ...tdStyle, fontWeight: 'bold', color: 'var(--tx)' }}>{car.Model}</td>
                        <td style={tdStyle}>{car.Supername}</td>
                        <td style={{ ...tdStyle, color: '#17a2b8' }}>{car.Brand}</td>
                        <td style={tdStyle}>{car.Series}</td>
                      </tr>
                    ))}
                    {brokenCars.length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ ...tdStyle, textAlign: 'center', color: '#28a745', fontWeight: 'bold', padding: '30px' }}>
                          No cars flagged as broken!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
          <div className="details-pane" style={{ display: viewMode === 'gallery' ? undefined : 'none' }}>
              {selectedCar ? (
                <div className="car-details">
                  <div className="hero-image-container">
                    {/* key includes the cache-busting timestamp so a new upload forces a full img remount */}
                    <img key={getHeroImage(selectedCar.ID)} src={getHeroImage(selectedCar.ID)} alt={selectedCarFullName} onError={(e) => { e.target.onerror = null; e.target.src = fallbackHeroImage; }} className="hero-image" fetchPriority="high" />
                  </div>
                  <div className="car-info" ref={carInfoRef} key={selectedCar?.ID}>
                    {!isGalleryEditing ? (
                      <>
                        <h2 style={{ margin: '0 0 4px 0' }}>{selectedCarFullName}</h2>
                        {!isPublic && <p style={{ margin: '2px 0' }}><strong>ID:</strong> {selectedCar.ID}</p>}
                        <p style={{ margin: '2px 0' }}><strong>Brand:</strong> {selectedCar.Brand || 'N/A'}</p>
                        <p style={{ margin: '2px 0' }}><strong>Series:</strong> {selectedCar.Series || 'N/A'}</p>
                        <p style={{ margin: '2px 0' }}><strong>Country:</strong> {selectedCar.Country || 'N/A'}</p>
                        {Array.isArray(selectedCar.Category) && selectedCar.Category.length > 0 && (
                          <p style={{ margin: '2px 0' }}>
                            <strong>Categor{selectedCar.Category.length === 1 ? 'y' : 'ies'}:</strong>{' '}
                            {selectedCar.Category.map((cat, i) => (
                              <span key={cat}>
                                <span style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => { setSidebarView('category'); handleSidebarClick(cat); }}>{cat}</span>
                                {i < selectedCar.Category.length - 1 ? ', ' : ''}
                              </span>
                            ))}
                          </p>
                        )}
                        <p style={{ margin: '2px 0' }}><strong>Description:</strong> {selectedCar.Description || 'No description available.'}</p>
                        {selectedCar.Broken_image === 'TRUE' && <p style={{ margin: '2px 0', color: '#ff4d4d', fontWeight: 'bold' }}>⚠️ Flagged as Broken Image</p>}
                        {!isPublic && <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button onClick={() => setIsGalleryEditing(true)} style={{ padding: '4px 12px', cursor: 'pointer', backgroundColor: '#cc2200', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>Edit Details</button>
                          <button onClick={handleSwapIds} style={{ padding: '4px 12px', cursor: 'pointer', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>Swap ID</button>
                          <button onClick={downloadCSV} style={{ padding: '4px 12px', cursor: 'pointer', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>Save CSV</button>
                          <button onClick={handleCreateSameCasting} style={{ padding: '4px 12px', cursor: 'pointer', backgroundColor: '#e67e22', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>Add same casting</button>
                          <button onClick={handleDeleteGallery} style={{ padding: '4px 12px', cursor: 'pointer', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', marginLeft: 'auto' }}>Delete Car</button>
                        </div>}
                      </>
                    ) : (
                      <GalleryEditorForm
                        initialCar={selectedCar}
                        onApply={handleApplyGalleryEdits}
                        onCancel={cancelGalleryEdits}
                        onSaveCsv={(draft) => {
                          const exists = cars.some(c => c.ID === draft.ID);
                          const newCars = exists ? cars.map(c => c.ID === draft.ID ? draft : c) : [...cars, draft];
                          const sortedNewCars = sortCars(newCars);
                          setSelectedCar(draft);
                          setCars(sortedNewCars);
                          setIsGalleryEditing(false);
                          downloadCSV(sortedNewCars);
                        }}
                        showToast={showToast}
                        categories={categories}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '20px', color: '#888' }}><p>No car selected.</p></div>
              )}
            </div>

            <div ref={gridPaneRef} className="grid-pane" style={{ overflowY: 'auto', padding: '8px', display: viewMode === 'gallery' ? undefined : 'none' }}>
              <div ref={carGridRef} className="car-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '6px', alignItems: 'end' }}>
                {memoizedGalleryNodes}
              </div>
            </div>

          {/* ================= LIST VIEW ================= */}
          <div style={{ flexGrow: 1, display: viewMode === 'list' ? 'flex' : 'none', flexDirection: 'column', overflow: 'hidden' }}>
            {!isPublic && <div style={{ padding: '10px 15px', backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <button
                  onClick={toggleListEditMode}
                  style={{ padding: '6px 12px', backgroundColor: isListEditing ? '#dc3545' : '#cc2200', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {isListEditing ? 'Close & Apply Edits' : 'Enable Edit Mode'}
                </button>
                <button onClick={downloadCSV} style={{ padding: '6px 12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Save CSV</button>
              </div>

              {isListEditing && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bg-raised)', padding: '4px 8px', borderRadius: '6px' }}>
                  <span style={{ color: 'var(--tx)', fontSize: '0.85em', fontWeight: 'bold' }}>Bulk Action ({selectedIds.size} selected):</span>
                  <input placeholder="Type Brand name..." value={bulkBrand} onChange={(e) => setBulkBrand(e.target.value)} style={{ padding: '4px', borderRadius: '3px', border: '1px solid var(--bd-3)', backgroundColor: 'var(--bg-input)', color: 'var(--tx)', width: '120px' }} />
                  <button onClick={applyBulkBrand} style={{ padding: '4px 10px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' }}>Apply to Selected</button>
                  <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--bd-3)', margin: '0 5px' }}></div>
                  <button onClick={applyBulkDelete} style={{ padding: '4px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' }}>Delete Selected</button>
                </div>
              )}
            </div>}

            <div className="table-container" style={{ flexGrow: 1, overflow: 'auto', padding: '0 10px', contain: 'content' }}>
              <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '0.85em' }}>
                <thead>
                  <tr>
                    {!isPublic && <th style={{ ...thStyle, width: '30px', textAlign: 'center' }}>
                      <input type="checkbox" checked={selectedIds.size > 0 && selectedIds.size === visibleCarsCount} ref={input => { if (input) input.indeterminate = selectedIds.size > 0 && selectedIds.size < visibleCarsCount; }} onChange={handleSelectAll} />
                    </th>}
                    <th style={{ ...thStyle, width: '100px' }}>Image</th>
                    {!isPublic && <th style={{ ...thStyle, width: '60px' }}>ID</th>}
                    <th style={{ ...thStyle, width: '55px' }}>Year</th>
                    <th style={{ ...thStyle, width: '11%' }}>Make</th>
                    <th style={{ ...thStyle, width: '18%' }}>Model</th>
                    <th style={{ ...thStyle, width: '13%' }}>Supername</th>
                    <th style={{ ...thStyle, width: '11%' }}>Brand</th>
                    <th style={{ ...thStyle, width: '10%' }}>Series</th>
                    <th style={{ ...thStyle, width: '8%' }}>Country</th>
                    <th style={thStyle}>Category</th>
                  </tr>
                </thead>
                <tbody>
                  {currentListItems.map((item, index) => {
                    if (item.type === 'header') {
                      return (
                        <tr key={`header-${item.groupName}-${index}`} id={`header-${item.groupName}`}>
                          <td colSpan={isPublic ? 9 : 11} style={{ padding: '12px 8px 4px 8px', fontSize: '1.2em', fontWeight: 'bold', color: '#cc2200', borderBottom: '1px solid var(--bd-2)', backgroundColor: 'var(--bg-surface)' }}>
                            {sidebarView === 'decade' ? `Year: ${item.groupName}` : item.groupName} <span style={{ color: '#666', fontSize: '0.7em' }}>({item.count})</span>
                          </td>
                        </tr>
                      );
                    } else {
                      const car = item.car;
                      return (
                        <CarListRow
                          key={car.ID} car={car} isSelected={selectedIds.has(car.ID)} isListEditing={isListEditing}
                          draft={listDrafts[car.ID]} imageUpdate={imageUpdates[car.ID]} handleSelectRow={handleSelectRow} handleCellChange={handleCellChange}
                          hideId={isPublic} categories={categories}
                        />
                      );
                    }
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', backgroundColor: 'var(--bg)', borderTop: '1px solid var(--bd)', color: 'var(--tx-2)', flexShrink: 0 }}>
              <span style={{ fontSize: '0.85em' }}>
                Showing {carsBeforePage + 1}–{carsBeforePage + carsOnPage} of {visibleCarsCount} cars
              </span>
              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                <button
                  disabled={currentPage === 1} onClick={() => { flushListDrafts(); setCurrentPage(p => p - 1); }}
                  style={{ padding: '4px 10px', backgroundColor: 'var(--pg-btn)', color: 'var(--tx)', border: 'none', borderRadius: '4px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                >
                  Prev
                </button>
                <span style={{ padding: '0 10px', fontSize: '0.85em', fontWeight: 'bold' }}>Page {currentPage} of {totalPages}</span>
                <button
                  disabled={currentPage === totalPages} onClick={() => { flushListDrafts(); setCurrentPage(p => p + 1); }}
                  style={{ padding: '4px 10px', backgroundColor: 'var(--pg-btn)', color: 'var(--tx)', border: 'none', borderRadius: '4px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>

      </div>

      {/* Mobile bottom nav — view mode switcher */}
      {isMobile && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '56px', backgroundColor: 'var(--bg-surface)', borderTop: '1px solid var(--bd-2)', display: 'flex', zIndex: 50 }}>
          <button onClick={() => setViewMode('gallery')} style={{ flex: 1, padding: '4px', fontSize: '0.75em', fontWeight: 'bold', border: 'none', cursor: 'pointer', backgroundColor: viewMode === 'gallery' ? '#cc2200' : 'transparent', color: viewMode === 'gallery' ? '#fff' : '#888', borderRight: '1px solid #444' }}>Gallery</button>
          <button onClick={() => setViewMode('list')} style={{ flex: 1, padding: '4px', fontSize: '0.75em', fontWeight: 'bold', border: 'none', cursor: 'pointer', backgroundColor: viewMode === 'list' ? '#cc2200' : 'transparent', color: viewMode === 'list' ? '#fff' : '#888', borderRight: '1px solid #444' }}>List</button>
          {!isPublic && <button onClick={() => setViewMode('missing')} style={{ flex: 1, padding: '4px', fontSize: '0.75em', fontWeight: 'bold', border: 'none', cursor: 'pointer', backgroundColor: viewMode === 'missing' ? '#fd7e14' : 'transparent', color: viewMode === 'missing' ? '#fff' : '#fd7e14' }}>Missing</button>}
        </div>
      )}
    </div>
  );
}

export default App;