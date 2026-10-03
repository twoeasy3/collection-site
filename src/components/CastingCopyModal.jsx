import { CASTING_COPY_FIELDS, isCastingFieldFilled, formatCastingFieldValue } from '../utils/castingCopy';

const btn = (bg, extra = {}) => ({ padding: '7px 14px', backgroundColor: bg, color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', ...extra });

// Field picker for "Add same casting": tick which fields of the source car
// to carry over, then copy onto a new car or onto an existing ID.
function CastingCopyModal({ state, onToggleField, onClose, onCopyToId, onCopyToNewCar }) {
  const { sourceCar, fields } = state;
  const filledFields = CASTING_COPY_FIELDS.filter(f => isCastingFieldFilled(sourceCar, f.key));

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'var(--bg-raised)', borderRadius: '8px', padding: '20px', width: '100%', maxWidth: '420px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
        <h3 style={{ margin: '0 0 4px', color: 'var(--tx)' }}>Copy casting from #{sourceCar.ID}</h3>
        <p style={{ margin: '0 0 12px', color: 'var(--tx-3)', fontSize: '0.85em' }}>Choose which fields to carry over, then pick a destination.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
          {filledFields.length === 0 && <div style={{ color: 'var(--tx-3)', fontSize: '0.85em' }}>This car has no filled fields to copy.</div>}
          {filledFields.map(({ key, label }) => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9em', color: 'var(--tx)', cursor: 'pointer' }}>
              <input type="checkbox" checked={!!fields[key]} onChange={() => onToggleField(key)} />
              <span style={{ fontWeight: 'bold', minWidth: '90px', flexShrink: 0 }}>{label}</span>
              <span style={{ color: 'var(--tx-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatCastingFieldValue(sourceCar, key)}</span>
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button onClick={onClose} style={btn('transparent', { color: 'var(--tx-3)', border: '1px solid var(--bd-2)' })}>Cancel</button>
          <button onClick={onCopyToId} style={btn('#17a2b8')}>Copy to ID</button>
          <button onClick={onCopyToNewCar} style={btn('#e67e22')}>Copy to New Car</button>
        </div>
      </div>
    </div>
  );
}

export default CastingCopyModal;
