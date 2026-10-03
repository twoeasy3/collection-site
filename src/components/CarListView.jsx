import { getCountryName, thStyle } from '../constants';
import { CLASS_LABELS } from '../utils/carStats';
import CarListRow from './CarListRow';

const BULK_FIELDS = ['Year', 'Make', 'Model', 'Supername', 'Brand', 'Series', 'Country', 'Category'];

// Admin toolbar above the table: edit-mode toggle, save, and (in edit mode)
// the bulk field-apply / delete controls.
function ListToolbar({ listEditing }) {
  const { isListEditing, toggleListEditMode, saveListChanges, selectedIds, bulkField, setBulkField, bulkValue, setBulkValue, applyBulk, applyBulkDelete } = listEditing;
  return (
    <div style={{ padding: '10px 15px', backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button onClick={toggleListEditMode} style={{ padding: '6px 12px', backgroundColor: isListEditing ? '#dc3545' : '#cc2200', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
          {isListEditing ? 'Close & Apply Edits' : 'Enable Edit Mode'}
        </button>
        <button onClick={saveListChanges} style={{ padding: '6px 12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Save</button>
      </div>
      {isListEditing && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bg-raised)', padding: '4px 8px', borderRadius: '6px' }}>
          <span style={{ color: 'var(--tx)', fontSize: '0.85em', fontWeight: 'bold' }}>Bulk ({selectedIds.size}):</span>
          <select value={bulkField} onChange={(e) => { setBulkField(e.target.value); setBulkValue(''); }} style={{ padding: '4px', borderRadius: '3px', border: '1px solid var(--bd-3)', backgroundColor: 'var(--bg-input)', color: 'var(--tx)', fontWeight: 'bold' }}>
            {BULK_FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <input value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') applyBulk(); }} placeholder={bulkField === 'Category' || bulkField === 'Country' ? 'A, B, ...' : `${bulkField}...`} style={{ padding: '4px', borderRadius: '3px', border: '1px solid var(--bd-3)', backgroundColor: 'var(--bg-input)', color: 'var(--tx)', width: '120px' }} />
          <button onClick={applyBulk} style={{ padding: '4px 10px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' }}>Apply</button>
          <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--bd-3)', margin: '0 5px' }}></div>
          <button onClick={applyBulkDelete} style={{ padding: '4px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' }}>Delete Selected</button>
        </div>
      )}
    </div>
  );
}

function GroupHeaderRow({ item, sidebarView, colSpan }) {
  const title = sidebarView === 'decade'
    ? `Year: ${item.groupName}`
    : sidebarView === 'class'
      ? CLASS_LABELS[item.groupName] || item.groupName
    : sidebarView === 'country'
      ? <><span className={`fi fi-${item.groupName.toLowerCase()}`} style={{ marginRight: '8px', verticalAlign: 'middle' }} />{getCountryName(item.groupName)}</>
      : item.groupName;
  return (
    <tr id={`header-${item.groupName}`}>
      <td colSpan={colSpan} style={{ padding: '12px 8px 4px 8px', fontSize: '1.2em', fontWeight: 'bold', color: '#cc2200', borderBottom: '1px solid var(--bd-2)', backgroundColor: 'var(--bg-surface)' }}>
        {title} <span style={{ color: '#666', fontSize: '0.7em' }}>({item.count})</span>
      </td>
    </tr>
  );
}

// Paginated table of all visible cars grouped under headers, with inline
// editing for admins. Stays mounted (display:none) outside list view.
function CarListView({ visible, isPublic, sidebarView, categories, imageUpdates, visibleCarsCount, listEditing, pagination }) {
  const { isListEditing, listDrafts, selectedIds, handleSelectRow, handleCellChange, handleSelectAll, flushListDrafts } = listEditing;
  const { currentPage, setCurrentPage, totalPages, currentListItems, carsBeforePage, carsOnPage } = pagination;
  const pageBtn = (disabled) => ({ padding: '4px 10px', backgroundColor: 'var(--pg-btn)', color: 'var(--tx)', border: 'none', borderRadius: '4px', cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 'bold' });

  return (
    <div style={{ flexGrow: 1, display: visible ? 'flex' : 'none', flexDirection: 'column', overflow: 'hidden' }}>
      {!isPublic && <ListToolbar listEditing={listEditing} />}
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
              {!isPublic && <th style={{ ...thStyle, width: '50px', textAlign: 'center' }}>Cover</th>}
            </tr>
          </thead>
          <tbody>
            {currentListItems.map((item, index) => {
              if (item.type === 'header') {
                return <GroupHeaderRow key={`header-${item.groupName}-${index}`} item={item} sidebarView={sidebarView} colSpan={isPublic ? 9 : 12} />;
              }
              const car = item.car;
              return (
                <CarListRow
                  key={`${item.groupName}-${car.ID}`}
                  car={car}
                  isSelected={selectedIds.has(car.ID)}
                  isListEditing={isListEditing}
                  draft={listDrafts[car.ID]}
                  imageUpdate={imageUpdates[car.ID]}
                  handleSelectRow={handleSelectRow}
                  handleCellChange={handleCellChange}
                  hideId={isPublic}
                  categories={categories}
                />
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', backgroundColor: 'var(--bg)', borderTop: '1px solid var(--bd)', color: 'var(--tx-2)', flexShrink: 0 }}>
        <span style={{ fontSize: '0.85em' }}>Showing {carsBeforePage + 1}–{carsBeforePage + carsOnPage} of {visibleCarsCount} cars</span>
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          <button disabled={currentPage === 1} onClick={() => { flushListDrafts(); setCurrentPage(p => p - 1); }} style={pageBtn(currentPage === 1)}>Prev</button>
          <span style={{ padding: '0 10px', fontSize: '0.85em', fontWeight: 'bold' }}>Page {currentPage} of {totalPages}</span>
          <button disabled={currentPage === totalPages} onClick={() => { flushListDrafts(); setCurrentPage(p => p + 1); }} style={pageBtn(currentPage === totalPages)}>Next</button>
        </div>
      </div>
    </div>
  );
}

export default CarListView;
