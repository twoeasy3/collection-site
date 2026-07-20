import { thStyle, tdStyle } from '../constants';

// Admin view listing cars whose R2 images are absent (Missing Files tab)
// and cars flagged broken (Broken Images tab, click-through to gallery).
function MissingImagesView({ missingData, missingLoading, missingSubTab, setMissingSubTab, brokenCars, onRefresh, onSelectBrokenCar }) {
  return (
    <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '10px 15px', backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', border: '1px solid #fd7e14', borderRadius: '4px', overflow: 'hidden' }}>
          <button onClick={() => setMissingSubTab('missing')} style={{ padding: '5px 12px', fontSize: '0.8em', fontWeight: 'bold', backgroundColor: missingSubTab === 'missing' ? '#fd7e14' : 'transparent', color: missingSubTab === 'missing' ? '#fff' : '#fd7e14', border: 'none', cursor: 'pointer' }}>Missing Files {!missingLoading && `(${missingData.length})`}</button>
          <button onClick={() => setMissingSubTab('broken')} style={{ padding: '5px 12px', fontSize: '0.8em', fontWeight: 'bold', backgroundColor: missingSubTab === 'broken' ? '#fd7e14' : 'transparent', color: missingSubTab === 'broken' ? '#fff' : '#fd7e14', border: 'none', cursor: 'pointer' }}>Broken Images ({brokenCars.length})</button>
        </div>
        {missingSubTab === 'missing' && (
          <button onClick={onRefresh} disabled={missingLoading} style={{ padding: '5px 12px', fontSize: '0.8em', backgroundColor: 'var(--bg-card-sel)', color: 'var(--tx-2)', border: '1px solid var(--bd-3)', borderRadius: '4px', fontWeight: 'bold', cursor: missingLoading ? 'not-allowed' : 'pointer', opacity: missingLoading ? 0.6 : 1 }}>
            {missingLoading ? 'Loading...' : 'Refresh'}
          </button>
        )}
      </div>
      {missingSubTab === 'missing' ? (
        <div style={{ flexGrow: 1, overflow: 'auto', padding: '0 10px', contain: 'content' }}>
          <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '0.85em' }}>
            <thead><tr>
              <th style={{ ...thStyle, width: '60px' }}>ID</th>
              <th style={{ ...thStyle, width: '55px' }}>Year</th>
              <th style={{ ...thStyle, width: '11%' }}>Make</th>
              <th style={{ ...thStyle, width: '16%' }}>Model</th>
              <th style={{ ...thStyle, width: '12%' }}>Supername</th>
              <th style={{ ...thStyle, width: '11%' }}>Brand</th>
              <th style={{ ...thStyle, width: '13%' }}>Series</th>
              <th style={{ ...thStyle, width: '80px', textAlign: 'center' }}>Side (1)</th>
              <th style={{ ...thStyle, width: '80px', textAlign: 'center' }}>Hero (2)</th>
            </tr></thead>
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
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{item.missing_side ? <span style={{ color: '#dc3545', fontWeight: 'bold' }}>Missing</span> : <span style={{ color: '#28a745', fontWeight: 'bold' }}>✓</span>}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{item.missing_hero ? <span style={{ color: '#dc3545', fontWeight: 'bold' }}>Missing</span> : <span style={{ color: '#28a745', fontWeight: 'bold' }}>✓</span>}</td>
                </tr>
              ))}
              {missingData.length === 0 && !missingLoading && (
                <tr><td colSpan="9" style={{ ...tdStyle, textAlign: 'center', color: '#28a745', fontWeight: 'bold', padding: '30px' }}>All cars have both image files!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ flexGrow: 1, overflow: 'auto', padding: '0 10px', contain: 'content' }}>
          <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '0.85em' }}>
            <thead><tr>
              <th style={{ ...thStyle, width: '60px' }}>ID</th>
              <th style={{ ...thStyle, width: '55px' }}>Year</th>
              <th style={{ ...thStyle, width: '11%' }}>Make</th>
              <th style={{ ...thStyle, width: '18%' }}>Model</th>
              <th style={{ ...thStyle, width: '13%' }}>Supername</th>
              <th style={{ ...thStyle, width: '12%' }}>Brand</th>
              <th style={thStyle}>Series</th>
            </tr></thead>
            <tbody>
              {brokenCars.map(car => (
                <tr key={car.ID} onClick={() => onSelectBrokenCar(car)} style={{ cursor: 'pointer' }}>
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
                <tr><td colSpan="7" style={{ ...tdStyle, textAlign: 'center', color: '#28a745', fontWeight: 'bold', padding: '30px' }}>No cars flagged as broken!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default MissingImagesView;
