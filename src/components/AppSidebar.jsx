import { SidebarContent, SecondarySidebar } from './SidebarContent';
import ThemeToggle from './ThemeToggle';

const SIDEBAR_TABS = [['make', 'MAKES'], ['brand', 'BRANDS'], ['decade', 'DECADES'], ['category', 'CATEGORIES'], ['country', 'COUNTRIES']];

const smallBtn = (bg, color, extra = {}) => ({ width: '100%', padding: '4px', marginTop: '4px', fontSize: '0.7em', fontWeight: 'bold', backgroundColor: bg, color, border: 'none', borderRadius: '4px', cursor: 'pointer', ...extra });
const segBtn = (active, onColor) => ({ flex: 1, padding: '4px', fontSize: '0.7em', fontWeight: 'bold', backgroundColor: active ? onColor : 'transparent', color: active ? '#fff' : onColor, border: 'none', cursor: 'pointer' });

// Desktop-only admin actions: login, new car, fill-to-ID, undo, publish.
function AdminActions({ hasAdminKey, onLogin, onLogout, onCreateNew, onFillToId, backupAvailable, onUndo, onPublish }) {
  return (
    <div style={{ padding: '8px', borderBottom: '1px solid var(--sb-border)' }}>
      <button onClick={hasAdminKey ? onLogout : onLogin} style={{ width: '100%', padding: '6px', marginBottom: '4px', fontSize: '0.8em', fontWeight: 'bold', backgroundColor: hasAdminKey ? 'transparent' : '#cc2200', color: hasAdminKey ? '#6c757d' : '#fff', border: hasAdminKey ? '1px solid #6c757d' : 'none', borderRadius: '4px', cursor: 'pointer' }}>{hasAdminKey ? 'Log out' : 'Log in'}</button>
      <button onClick={() => onCreateNew()} style={{ width: '100%', padding: '6px', fontSize: '0.8em', fontWeight: 'bold', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ New Car</button>
      <button onClick={onFillToId} style={smallBtn('#17a2b8', '#fff')}>Fill to ID</button>
      {backupAvailable && <button onClick={onUndo} style={smallBtn('#ffc107', '#000')}>Undo Save</button>}
      <button onClick={onPublish} style={smallBtn('#0077cc', '#fff')}>Publish</button>
    </div>
  );
}

// Desktop-only view controls: gallery/list, stacked/flat, missing imgs,
// theme, sound, auto-scroll, image source.
function ViewControls({ isPublic, viewMode, setViewMode, stackingEnabled, setStackingEnabled, sortMode, setSortMode, statsAvailable, theme, setTheme, soundEnabled, setSoundEnabled, autoScroll, toggleAutoScroll, useRemoteImages, toggleImageSource }) {
  return (
    <div style={{ padding: '8px', borderBottom: '1px solid var(--sb-border)', backgroundColor: 'var(--sb-controls-bg)' }}>
      <div style={{ display: 'flex', border: '1px solid #cc2200', borderRadius: '4px', overflow: 'hidden', marginBottom: '4px' }}>
        <button onClick={() => setViewMode('gallery')} style={segBtn(viewMode === 'gallery', '#cc2200')}>GALLERY</button>
        <button onClick={() => setViewMode('list')} style={segBtn(viewMode === 'list', '#cc2200')}>LIST</button>
      </div>
      {viewMode === 'gallery' && (
        <div style={{ display: 'flex', border: '1px solid #6c757d', borderRadius: '4px', overflow: 'hidden', marginBottom: '4px' }}>
          <button onClick={() => setStackingEnabled(true)} style={segBtn(stackingEnabled, '#6c757d')}>STACKED</button>
          <button onClick={() => setStackingEnabled(false)} style={segBtn(!stackingEnabled, '#6c757d')}>FLAT</button>
        </div>
      )}
      {statsAvailable && (
        <div title="A-Z keeps the chosen grouping; RATING regroups every car by class, best first" style={{ display: 'flex', border: '1px solid #6c757d', borderRadius: '4px', overflow: 'hidden', marginBottom: '4px' }}>
          <button onClick={() => setSortMode('name')} style={segBtn(sortMode === 'name', '#6c757d')}>A-Z</button>
          <button onClick={() => setSortMode('rating')} style={segBtn(sortMode === 'rating', '#6c757d')}>RATING</button>
        </div>
      )}
      {!isPublic && <button onClick={() => setViewMode('missing')} style={{ width: '100%', padding: '4px', fontSize: '0.7em', fontWeight: 'bold', backgroundColor: viewMode === 'missing' ? '#fd7e14' : 'transparent', color: viewMode === 'missing' ? '#fff' : '#fd7e14', border: '1px solid #fd7e14', borderRadius: '4px', cursor: 'pointer' }}>MAINTENANCE</button>}
      <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
        <ThemeToggle theme={theme} setTheme={setTheme} grow />
        <button onClick={() => setSoundEnabled(s => !s)} title={soundEnabled ? 'Sound ON — click to mute' : 'Sound OFF — click to enable'} style={{ padding: '4px 8px', fontSize: '0.85em', fontWeight: 'bold', backgroundColor: soundEnabled ? '#6f42c1' : 'transparent', color: soundEnabled ? '#fff' : '#888', border: '1px solid #bbb', borderRadius: '4px', cursor: 'pointer', flexShrink: 0 }}>{soundEnabled ? '♪' : '♩'}</button>
      </div>
      <button onClick={toggleAutoScroll} style={smallBtn(autoScroll ? 'transparent' : '#6c757d', autoScroll ? '#888' : '#fff', { border: '1px solid #6c757d' })}>
        {autoScroll ? 'AUTO SCROLL' : 'SCROLL OFF'}
      </button>
      {!isPublic && (
        <button onClick={toggleImageSource} title={useRemoteImages ? 'Using remote images — click to switch to local' : 'Using local images — click to switch to remote'} style={smallBtn(useRemoteImages ? '#0077cc' : 'transparent', useRemoteImages ? '#fff' : '#888', { border: '1px solid #0077cc' })}>
          {useRemoteImages ? 'REMOTE IMGS' : 'LOCAL IMGS'}
        </button>
      )}
    </div>
  );
}

function SearchBox({ isPublic, searchMode, setSearchMode, searchInput, setSearchInput, searchInputRef, pendingAiCount, prioritizeAiPending, setPrioritizeAiPending }) {
  const modeBtn = (active) => ({ flex: 1, padding: '4px', fontSize: '0.7em', fontWeight: 'bold', backgroundColor: active ? '#6c757d' : 'var(--sb-btn-off)', color: active ? '#fff' : 'var(--tx-3)', border: 'none', borderRadius: '4px', cursor: 'pointer' });
  return (
    <div style={{ padding: '8px', borderBottom: '1px solid var(--sb-border)' }}>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
        <button onClick={() => setSearchMode('car')} style={modeBtn(searchMode === 'car')}>CAR</button>
        <button onClick={() => setSearchMode('release')} style={modeBtn(searchMode === 'release')}>RELEASE</button>
      </div>
      <input ref={searchInputRef} type="text" placeholder="Search... ( / )" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} style={{ width: '100%', padding: '6px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid var(--sb-search-border)', fontSize: '0.8em', backgroundColor: 'var(--sb-bg)', color: 'var(--sb-tx)' }} />
      {!isPublic && pendingAiCount > 0 && (
        <button onClick={() => setPrioritizeAiPending(p => !p)} title="Sort cars with pending AI suggestions to the front of each group" style={{ width: '100%', padding: '4px', marginTop: '4px', fontSize: '0.7em', fontWeight: 'bold', backgroundColor: prioritizeAiPending ? 'var(--ai-badge-bg)' : 'var(--sb-btn-off)', color: prioritizeAiPending ? 'var(--ai-badge-tx)' : 'var(--tx-3)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          {prioritizeAiPending ? `AI-PENDING FIRST (${pendingAiCount})` : 'MIX IN AI-PENDING'}
        </button>
      )}
    </div>
  );
}

// Primary sidebar: on desktop a fixed 130px column, on mobile a slide-in
// drawer. Holds the admin/view controls, search, grouping tabs and the
// group list (SidebarContent).
function AppSidebar({
  isMobile, isPublic, sidebarOpen, setSidebarOpen,
  auth, admin, view, search, grouping,
}) {
  return (
    <div className="sidebar" style={{
      display: 'flex', flexDirection: 'column',
      width: isMobile ? '220px' : '130px', flexShrink: 0, overflow: 'hidden',
      backgroundColor: 'var(--sb-bg)', borderRight: '1px solid var(--sb-border)',
      ...(isMobile ? { position: 'fixed', top: 0, left: 0, bottom: 0, transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)', boxShadow: sidebarOpen ? '4px 0 20px rgba(0,0,0,0.35)' : 'none', zIndex: 100 } : { height: '100%', zIndex: 20 }),
    }}>
      {isMobile && (
        <div style={{ padding: '8px', borderBottom: '1px solid var(--sb-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <ThemeToggle theme={view.theme} setTheme={view.setTheme} />
          <button onClick={() => setSidebarOpen(false)} style={{ padding: '4px 12px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85em' }}>✕ Close</button>
        </div>
      )}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--sb-bg)' }}>
        {!isMobile && !isPublic && <AdminActions {...auth} {...admin} />}
        {!isMobile && <ViewControls isPublic={isPublic} {...view} />}
        <SearchBox isPublic={isPublic} {...search} />
        {grouping.groupView === 'class' ? (
          <div title="Rating sort groups by class. Switch to A-Z to use the other groupings." style={{ padding: '8px 0', fontSize: '0.75em', fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid var(--sb-border)', backgroundColor: 'var(--sb-tab-active-bg)', color: 'var(--sb-tab-active-tx)' }}>BY CLASS</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--sb-border)', gap: '1px', backgroundColor: 'var(--sb-gap)' }}>
            {SIDEBAR_TABS.map(([tab, label]) => (
              <button key={tab} onClick={() => { grouping.setSidebarView(tab); grouping.setSelectedLetter(null); }} style={{ flex: 1, padding: '8px 0', fontSize: '0.75em', fontWeight: 'bold', border: 'none', cursor: 'pointer', backgroundColor: grouping.sidebarView === tab ? 'var(--sb-tab-active-bg)' : 'var(--sb-bg)', color: grouping.sidebarView === tab ? 'var(--sb-tab-active-tx)' : 'var(--tx-3)' }}>{label}</button>
            ))}
          </div>
        )}
      </div>
      <SidebarContent
        groupedAndFilteredCars={grouping.groupedAndFilteredCars}
        sidebarView={grouping.groupView}
        classFilter={grouping.classFilter}
        setClassFilter={grouping.setClassFilter}
        classCounts={grouping.classCounts}
        selectedLetter={grouping.selectedLetter}
        setSelectedLetter={grouping.setSelectedLetter}
        handleSidebarClick={grouping.handleSidebarClick}
        visibleLetters={grouping.visibleLetters}
        visibleDecades={grouping.visibleDecades}
        showDirectLogos={grouping.showDirectLogos}
        showAlphabetDrawer={grouping.showAlphabetDrawer}
        showDecadeDrawer={grouping.showDecadeDrawer}
        isMobile={isMobile}
        showDrawer={grouping.showDrawer}
      />
    </div>
  );
}

// Desktop-only slide-out beside the primary sidebar listing the makes for a
// chosen letter or the years for a chosen decade.
export function DesktopSecondarySidebar({ grouping }) {
  const { showDrawer } = grouping;
  return (
    <div className="secondary-sidebar" style={{ position: 'absolute', left: '130px', top: 0, bottom: 0, width: showDrawer ? '130px' : '0px', overflow: 'hidden', transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)', backgroundColor: '#f8f9fa', borderRight: showDrawer ? '1px solid #ddd' : 'none', boxShadow: showDrawer ? '5px 0 15px rgba(0,0,0,0.5)' : 'none', display: 'flex', flexDirection: 'column', zIndex: 19 }}>
      <SecondarySidebar
        groupedAndFilteredCars={grouping.groupedAndFilteredCars}
        selectedLetter={grouping.selectedLetter}
        sidebarView={grouping.groupView}
        showDrawer={showDrawer}
        handleSidebarClick={grouping.handleSidebarClick}
      />
    </div>
  );
}

export default AppSidebar;
