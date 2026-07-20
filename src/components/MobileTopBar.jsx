import { useRef } from 'react';

// Fixed mobile header: hamburger, title, login/logout and (once logged in)
// Undo / Upload / + New. Owns the hidden file input for uploads.
function MobileTopBar({ isPublic, hasAdminKey, backupAvailable, onOpenSidebar, onLogin, onLogout, onUndo, onCreateNew, onFiles }) {
  const fileInputRef = useRef(null);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '48px', backgroundColor: '#fff', borderBottom: '1px solid #ddd', display: 'flex', alignItems: 'center', padding: '0 8px', gap: '6px', zIndex: 50, flexShrink: 0 }}>
      <button onClick={onOpenSidebar} style={{ padding: '8px 10px', fontSize: '1.1em', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#333', lineHeight: 1, flexShrink: 0 }}>☰</button>
      <span style={{ fontWeight: 'bold', color: '#333', flex: 1, fontSize: '0.9em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Car Collection</span>
      {!isPublic && (hasAdminKey
        ? <button onClick={onLogout} style={{ padding: '5px 10px', fontSize: '0.75em', fontWeight: 'bold', backgroundColor: 'transparent', color: '#6c757d', border: '1px solid #6c757d', borderRadius: '4px', cursor: 'pointer', flexShrink: 0 }}>Log out</button>
        : <button onClick={onLogin} style={{ padding: '5px 10px', fontSize: '0.75em', fontWeight: 'bold', backgroundColor: '#cc2200', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', flexShrink: 0 }}>Log in</button>
      )}
      {!isPublic && hasAdminKey && backupAvailable && <button onClick={onUndo} style={{ padding: '5px 8px', fontSize: '0.72em', fontWeight: 'bold', backgroundColor: '#ffc107', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', flexShrink: 0 }}>Undo</button>}
      {!isPublic && hasAdminKey && <button onClick={() => fileInputRef.current?.click()} style={{ padding: '5px 10px', fontSize: '0.75em', fontWeight: 'bold', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', flexShrink: 0 }}>Upload</button>}
      {!isPublic && hasAdminKey && <button onClick={() => onCreateNew()} style={{ padding: '5px 10px', fontSize: '0.75em', fontWeight: 'bold', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', flexShrink: 0 }}>+ New</button>}
      <input ref={fileInputRef} type="file" multiple accept=".jpg" style={{ display: 'none' }} onChange={(e) => { onFiles(Array.from(e.target.files)); e.target.value = ''; }} />
    </div>
  );
}

export default MobileTopBar;
