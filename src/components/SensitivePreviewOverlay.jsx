// Fullscreen chooser for the sensitive-detection variants: a grid of
// candidate crops; clicking one saves it, Back/Next page through thresholds.
function SensitivePreviewOverlay({ preview, onNavigate, onSave, onDiscard }) {
  const { file, filename, variants, startPct } = preview;
  const rangeStart = Math.round(startPct * 100);
  const rangeEnd = Math.round((startPct + 19 * 0.05) * 100);

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.92)', zIndex: 10000, display: 'flex', flexDirection: 'column', alignItems: 'stretch', padding: '16px', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, flexWrap: 'wrap' }}>
        <h2 style={{ color: '#fff', margin: 0, fontSize: '1.1rem', flex: 1 }}>
          Choose a result — click to save &nbsp;
          <span style={{ color: '#aaa', fontWeight: 'normal', fontSize: '0.85rem' }}>{filename}</span>
          <span style={{ color: '#888', fontWeight: 'normal', fontSize: '0.85rem', marginLeft: '12px' }}>{rangeStart}%–{rangeEnd}%</span>
        </h2>
        {startPct > 0 && <button onClick={() => onNavigate(file, Math.max(0, startPct - 1.0))} style={{ padding: '7px 18px', backgroundColor: '#555', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>← Back</button>}
        <button onClick={() => onNavigate(file, startPct + 1.0)} style={{ padding: '7px 18px', backgroundColor: '#0077cc', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>Next →</button>
        <button onClick={onDiscard} style={{ padding: '7px 18px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>Discard</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {variants.map(({ label, preview_b64, save_b64 }) => (
            <div key={label} onClick={() => onSave(filename, save_b64)} style={{ cursor: 'pointer', backgroundColor: '#1a1a1a', borderRadius: '6px', overflow: 'hidden', border: '2px solid #444', transition: 'border-color 0.15s' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#4af'} onMouseLeave={e => e.currentTarget.style.borderColor = '#444'}>
              <img src={`data:image/jpeg;base64,${preview_b64}`} alt={label} style={{ width: '100%', display: 'block' }} />
              <div style={{ padding: '4px 10px', color: '#ccc', fontWeight: 'bold', fontSize: '0.85rem' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SensitivePreviewOverlay;
