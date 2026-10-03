import { useMemo, useState } from 'react';
import { thStyle, tdStyle } from '../constants';
import { QUALITY_FIELDS, auditCars } from '../utils/dataQuality';

const chip = (active, count) => ({ padding: '4px 10px', fontSize: '0.8em', fontWeight: 'bold', borderRadius: '12px', cursor: count ? 'pointer' : 'default', border: '1px solid var(--bd-3)', backgroundColor: active ? '#fd7e14' : 'var(--bg-raised)', color: active ? '#fff' : count ? 'var(--tx)' : 'var(--tx-3)', opacity: count ? 1 : 0.6 });

// Admin audit of incomplete metadata: which cars lack a year, brand, country,
// category, description, etc. Chips filter by field; the ID opens the car in
// the gallery editor.
function DataQualityView({ cars, onEditCar }) {
  const [filterField, setFilterField] = useState(null);
  const [includePlaceholders, setIncludePlaceholders] = useState(false);

  const { rows, counts } = useMemo(() => auditCars(cars, { includePlaceholders }), [cars, includePlaceholders]);
  const visibleRows = useMemo(
    () => filterField ? rows.filter(r => r.missing.has(filterField)) : rows,
    [rows, filterField]
  );

  return (
    <>
      <div style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', borderBottom: '1px solid var(--bd)', flexShrink: 0 }}>
        <button onClick={() => setFilterField(null)} style={chip(filterField === null, rows.length)}>Any gap ({rows.length})</button>
        {QUALITY_FIELDS.map(f => (
          <button key={f.key} onClick={() => counts[f.key] && setFilterField(prev => prev === f.key ? null : f.key)} style={chip(filterField === f.key, counts[f.key])}>
            {f.label} ({counts[f.key]})
          </button>
        ))}
        <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8em', color: 'var(--tx-2)', cursor: 'pointer' }}>
          <input type="checkbox" checked={includePlaceholders} onChange={(e) => setIncludePlaceholders(e.target.checked)} />
          Include UNNAMED_CAR placeholders
        </label>
      </div>
      <div style={{ flexGrow: 1, overflow: 'auto', padding: '0 10px', contain: 'content' }}>
        <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '0.85em' }}>
          <thead><tr>
            <th style={{ ...thStyle, width: '60px' }}>ID</th>
            <th style={{ ...thStyle, width: '26%' }}>Car</th>
            {QUALITY_FIELDS.map(f => <th key={f.key} style={{ ...thStyle, textAlign: 'center' }}>{f.label}</th>)}
          </tr></thead>
          <tbody>
            {visibleRows.map(({ car, missing }) => (
              <tr key={car.ID}>
                <td style={{ ...tdStyle, color: '#888', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => onEditCar(car)} title="Open in editor">#{car.ID}</td>
                <td style={{ ...tdStyle, color: 'var(--tx)', whiteSpace: 'nowrap' }}>{[car.Year, car.Make, car.Model].filter(Boolean).join(' ') || <span style={{ color: 'var(--tx-3)' }}>(no name)</span>}</td>
                {QUALITY_FIELDS.map(f => (
                  <td key={f.key} style={{ ...tdStyle, textAlign: 'center' }}>
                    {missing.has(f.key)
                      ? <span style={{ color: '#dc3545', fontWeight: 'bold' }}>—</span>
                      : <span style={{ color: '#28a745' }}>✓</span>}
                  </td>
                ))}
              </tr>
            ))}
            {visibleRows.length === 0 && (
              <tr><td colSpan={2 + QUALITY_FIELDS.length} style={{ ...tdStyle, textAlign: 'center', color: '#28a745', fontWeight: 'bold', padding: '30px' }}>
                {filterField ? `Every car has a ${filterField.toLowerCase()}!` : 'Every car has all fields filled!'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default DataQualityView;
