import { thStyle, tdStyle } from '../constants';
import { AI_FIELD_TO_APP_FIELD } from '../utils/carUtils';
import DataQualityView from './DataQualityView';
import { useState } from 'react';

const tabBtn = (active) => ({ padding: '5px 12px', fontSize: '0.8em', fontWeight: 'bold', backgroundColor: active ? '#fd7e14' : 'transparent', color: active ? '#fff' : '#fd7e14', border: 'none', cursor: 'pointer' });
const tableWrap = { flexGrow: 1, overflow: 'auto', padding: '0 10px', contain: 'content' };
const tableStyle = { width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '0.85em' };
const emptyCell = { ...tdStyle, textAlign: 'center', color: '#28a745', fontWeight: 'bold', padding: '30px' };
const statusCell = (missing) => missing
  ? <span style={{ color: '#dc3545', fontWeight: 'bold' }}>Missing</span>
  : <span style={{ color: '#28a745', fontWeight: 'bold' }}>✓</span>;

function MissingFilesTable({ missingData, missingLoading }) {
  return (
    <div style={tableWrap}>
      <table style={tableStyle}>
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
              <td style={{ ...tdStyle, textAlign: 'center' }}>{statusCell(item.missing_side)}</td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{statusCell(item.missing_hero)}</td>
            </tr>
          ))}
          {missingData.length === 0 && !missingLoading && (
            <tr><td colSpan="9" style={emptyCell}>All cars have both image files!</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function BrokenImagesTable({ brokenCars, onSelectCar }) {
  return (
    <div style={tableWrap}>
      <table style={tableStyle}>
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
            <tr key={car.ID} onClick={() => onSelectCar(car)} style={{ cursor: 'pointer' }}>
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
            <tr><td colSpan="7" style={emptyCell}>No cars flagged as broken!</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function AiRunPanel({ aiFill }) {
  const { candidates, running, progress, hasKey, handleSetKey, run, stop } = aiFill;
  const [count, setCount] = useState(10);
  const btn = (bg, disabled) => ({ padding: '5px 12px', fontSize: '0.8em', backgroundColor: bg, color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 });
  const n = Math.max(1, Math.min(parseInt(count) || 1, candidates.length));
  return (
    <div style={{ padding: '10px 15px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', fontSize: '0.85em', color: 'var(--tx-2)' }}>
      <span><b>{candidates.length}</b> cars with no Year</span>
      <input type="number" min="1" value={count} onChange={e => setCount(e.target.value)} disabled={running} style={{ width: '60px', backgroundColor: 'var(--bg-input)', color: 'var(--tx)', border: '1px solid var(--bd-2)', borderRadius: '3px', padding: '3px' }} />
      {!running
        ? <button disabled={!candidates.length} onClick={() => run(candidates.slice(0, n).map(c => c.ID))} style={btn('#fd7e14', !candidates.length)}>Ask Claude to fill {candidates.length ? n : 0}</button>
        : <button onClick={stop} style={btn('#dc3545')}>Stop</button>}
      <button onClick={handleSetKey} disabled={running} style={btn('var(--bg-card-sel)', running)}>{hasKey ? 'Change API key' : 'Set API key'}</button>
      {progress && (
        <span>
          {running ? `Working on ${progress.current}… ` : ''}{progress.done}/{progress.total} · {progress.filled} filled · {progress.skipped} skipped · {progress.failed} failed
          {progress.error && <span style={{ color: '#dc3545' }}> — {progress.error}</span>}
        </span>
      )}
    </div>
  );
}

function AiSuggestionsTable({ pendingAiSuggestions, onEditCar, onApprove, onReject }) {
  const actBtn = (bg, extra = {}) => ({ padding: '3px 8px', fontSize: '0.85em', backgroundColor: bg, color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', ...extra });
  return (
    <div style={tableWrap}>
      <table style={tableStyle}>
        <thead><tr>
          <th style={{ ...thStyle, width: '60px' }}>ID</th>
          <th style={{ ...thStyle, width: '16%' }}>Make</th>
          <th style={{ ...thStyle, width: '18%' }}>Model</th>
          <th style={{ ...thStyle, width: '12%' }}>Field</th>
          <th style={thStyle}>Suggested value</th>
          <th style={{ ...thStyle, width: '90px', textAlign: 'center' }}>Confidence</th>
          <th style={{ ...thStyle, width: '140px', textAlign: 'center' }}>Action</th>
        </tr></thead>
        <tbody>
          {pendingAiSuggestions.map(({ car, field, confidence }) => {
            const appField = AI_FIELD_TO_APP_FIELD[field];
            const valuePreview = Array.isArray(car[appField]) ? car[appField].join(', ') : car[appField];
            return (
              <tr key={`${car.ID}-${field}`}>
                <td style={{ ...tdStyle, color: '#888', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => onEditCar(car)}>#{car.ID}</td>
                <td style={tdStyle}>{car.Make}</td>
                <td style={{ ...tdStyle, fontWeight: 'bold', color: 'var(--tx)' }}>{car.Model}</td>
                <td style={tdStyle}>{field}</td>
                <td style={tdStyle}>{valuePreview}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{Math.round(confidence * 100)}%</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <button onClick={() => onApprove(car, field)} style={actBtn('#28a745', { marginRight: '4px' })}>Approve</button>
                  <button onClick={() => onReject(car, field)} style={actBtn('#dc3545')}>Reject</button>
                </td>
              </tr>
            );
          })}
          {pendingAiSuggestions.length === 0 && (
            <tr><td colSpan="7" style={emptyCell}>No AI suggestions pending review!</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// Admin maintenance view with four tabs: cars whose R2 images are absent,
// cars flagged broken (click-through to gallery), pending AI field
// suggestions to approve/reject, and the metadata data-quality audit.
function MaintenanceView({
  cars, missingData, missingLoading, missingSubTab, setMissingSubTab, onRefresh,
  brokenCars, onSelectBrokenCar,
  pendingAiSuggestions, onEditSuggestionCar, onApproveSuggestion, onRejectSuggestion,
  onEditCar, aiFill,
}) {
  return (
    <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '10px 15px', backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', border: '1px solid #fd7e14', borderRadius: '4px', overflow: 'hidden' }}>
          <button onClick={() => setMissingSubTab('missing')} style={tabBtn(missingSubTab === 'missing')}>Missing Files {!missingLoading && `(${missingData.length})`}</button>
          <button onClick={() => setMissingSubTab('broken')} style={tabBtn(missingSubTab === 'broken')}>Broken Images ({brokenCars.length})</button>
          <button onClick={() => setMissingSubTab('aiSuggestions')} style={tabBtn(missingSubTab === 'aiSuggestions')}>AI Suggestions ({pendingAiSuggestions.length})</button>
          <button onClick={() => setMissingSubTab('quality')} style={tabBtn(missingSubTab === 'quality')}>Data Quality</button>
        </div>
        {missingSubTab === 'missing' && (
          <button onClick={onRefresh} disabled={missingLoading} style={{ padding: '5px 12px', fontSize: '0.8em', backgroundColor: 'var(--bg-card-sel)', color: 'var(--tx-2)', border: '1px solid var(--bd-3)', borderRadius: '4px', fontWeight: 'bold', cursor: missingLoading ? 'not-allowed' : 'pointer', opacity: missingLoading ? 0.6 : 1 }}>
            {missingLoading ? 'Loading...' : 'Refresh'}
          </button>
        )}
      </div>
      {missingSubTab === 'missing' && <MissingFilesTable missingData={missingData} missingLoading={missingLoading} />}
      {missingSubTab === 'broken' && <BrokenImagesTable brokenCars={brokenCars} onSelectCar={onSelectBrokenCar} />}
      {missingSubTab === 'aiSuggestions' && aiFill && <AiRunPanel aiFill={aiFill} />}
      {missingSubTab === 'aiSuggestions' && (
        <AiSuggestionsTable pendingAiSuggestions={pendingAiSuggestions} onEditCar={onEditSuggestionCar} onApprove={onApproveSuggestion} onReject={onRejectSuggestion} />
      )}
      {missingSubTab === 'quality' && <DataQualityView cars={cars} onEditCar={onEditCar} />}
    </div>
  );
}

export default MaintenanceView;
