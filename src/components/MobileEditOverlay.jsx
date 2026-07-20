// Full-screen mobile edit menu — gives the editor real room instead of the
// cramped ~120px detail strip. Desktop keeps the inline editor.
// `children` is the shared GalleryEditorForm element built in App.
function MobileEditOverlay({ selectedCar, onClose, onSwapIds, onCreateSameCasting, onSaveAll, onDelete, children }) {
  return (
    <div className="mobile-edit-overlay">
      <div className="mobile-edit-overlay-header">
        <span>Edit · #{selectedCar.ID}</span>
        <button onClick={onClose} aria-label="Close editor">✕</button>
      </div>
      <div className="mobile-edit-overlay-body">
        {children}
        <div className="mobile-edit-overlay-actions">
          <button onClick={onSwapIds} style={{ backgroundColor: '#17a2b8' }}>Swap ID</button>
          <button onClick={onCreateSameCasting} style={{ backgroundColor: '#e67e22' }}>Add same casting</button>
          <button onClick={() => onSaveAll()} style={{ backgroundColor: '#28a745' }}>Save All</button>
        </div>
        <button className="mobile-edit-overlay-delete" onClick={onDelete}>Delete Car</button>
      </div>
    </div>
  );
}

export default MobileEditOverlay;
