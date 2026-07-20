// Fixed mobile bottom navigation: Gallery / List (/ Missing when admin).
function MobileBottomNav({ viewMode, setViewMode, isPublic }) {
  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '56px', backgroundColor: 'var(--bg-surface)', borderTop: '1px solid var(--bd-2)', display: 'flex', zIndex: 50 }}>
      <button onClick={() => setViewMode('gallery')} style={{ flex: 1, padding: '4px', fontSize: '0.75em', fontWeight: 'bold', border: 'none', cursor: 'pointer', backgroundColor: viewMode === 'gallery' ? '#cc2200' : 'transparent', color: viewMode === 'gallery' ? '#fff' : '#888', borderRight: '1px solid #444' }}>Gallery</button>
      <button onClick={() => setViewMode('list')} style={{ flex: 1, padding: '4px', fontSize: '0.75em', fontWeight: 'bold', border: 'none', cursor: 'pointer', backgroundColor: viewMode === 'list' ? '#cc2200' : 'transparent', color: viewMode === 'list' ? '#fff' : '#888', borderRight: '1px solid #444' }}>List</button>
      {!isPublic && <button onClick={() => setViewMode('missing')} style={{ flex: 1, padding: '4px', fontSize: '0.75em', fontWeight: 'bold', border: 'none', cursor: 'pointer', backgroundColor: viewMode === 'missing' ? '#fd7e14' : 'transparent', color: viewMode === 'missing' ? '#fff' : '#fd7e14' }}>Missing</button>}
    </div>
  );
}

export default MobileBottomNav;
