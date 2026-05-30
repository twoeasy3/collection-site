import React from 'react';
import { BASE_PATH, FICTIONAL_MAKES } from '../constants';

const getMakeLogo = (make) => `${BASE_PATH}/makes/${make}.png`;

export const SidebarContent = React.memo(({
  groupedAndFilteredCars, sidebarView, selectedLetter, setSelectedLetter,
  handleSidebarClick, visibleLetters, visibleDecades,
  showDirectLogos, showAlphabetDrawer, showDecadeDrawer, isMobile, showDrawer,
}) => {
  // Mobile: when a letter/decade is selected, show the sub-navigation inline.
  if (isMobile && showDrawer) {
    const makesForLetter = sidebarView === 'make' ? groupedAndFilteredCars.filter(({ groupName }) => {
      if (!groupName) return false;
      if (selectedLetter === 'Fictional') return FICTIONAL_MAKES.has(groupName);
      return !FICTIONAL_MAKES.has(groupName) && groupName.charAt(0).toUpperCase() === selectedLetter;
    }) : null;
    const yearsForDecade = sidebarView === 'decade' ? groupedAndFilteredCars.filter(({ groupName }) => {
      if (selectedLetter === 'Unknown') return groupName === 'Unknown' || groupName.toUpperCase() === 'N/A';
      const parsed = parseInt(groupName, 10);
      if (isNaN(parsed)) return false;
      const floor = parseInt(selectedLetter, 10);
      return parsed >= floor && parsed < floor + 10;
    }) : null;
    return (
      <div style={{ overflowY: 'auto', flexGrow: 1 }}>
        <div onClick={() => setSelectedLetter(null)} style={{ padding: '12px 8px', cursor: 'pointer', backgroundColor: 'var(--sb-back-bg)', borderBottom: '1px solid var(--sb-border)', fontWeight: 'bold', color: 'var(--sb-tx)', fontSize: '0.9em' }}>
          ← Back
        </div>
        {makesForLetter && makesForLetter.map(({ groupName }) => (
          <div key={groupName} onClick={() => handleSidebarClick(groupName)} style={{ padding: '6px', cursor: 'pointer', textAlign: 'center', borderBottom: '1px solid var(--sb-item-border)', backgroundColor: '#fff' }} title={groupName}>
            <img src={`${BASE_PATH}/makes/${groupName}.png`} alt={groupName} style={{ width: '100%', maxHeight: '52px', objectFit: 'contain', display: 'block' }} onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'block'; }} />
            <span style={{ display: 'none', fontSize: '11px', color: 'var(--sb-tx)', wordBreak: 'break-word', fontWeight: '600' }}>{groupName}</span>
          </div>
        ))}
        {yearsForDecade && yearsForDecade.map(({ groupName, visibleGroupCars }) => (
          <div key={groupName} onClick={() => handleSidebarClick(groupName)} style={{ padding: '12px 8px', cursor: 'pointer', borderBottom: '1px solid var(--sb-item-border)', textAlign: 'center' }}>
            <span style={{ fontSize: '1.1em', fontWeight: 'bold', color: 'var(--sb-tx)', display: 'block' }}>{groupName}</span>
            <span style={{ fontSize: '0.7em', color: '#cc2200', fontWeight: '600' }}>{visibleGroupCars.length} Cars</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ overflowY: 'auto', flexGrow: 1 }}>
      {sidebarView === 'brand' && groupedAndFilteredCars.map(({ groupName }) => (
        <div key={groupName} onClick={() => handleSidebarClick(groupName)} style={{ padding: '4px 5px', cursor: 'pointer', textAlign: 'center', borderBottom: '1px solid var(--sb-item-border)', fontSize: '0.85em', color: 'var(--sb-tx)', fontWeight: '500' }} title={groupName}>
          {groupName}
        </div>
      ))}
      {sidebarView === 'category' && groupedAndFilteredCars.map(({ groupName }) => (
        <div key={groupName} onClick={() => handleSidebarClick(groupName)} style={{ padding: '4px 5px', cursor: 'pointer', textAlign: 'center', borderBottom: '1px solid var(--sb-item-border)', fontSize: '0.85em', color: 'var(--sb-tx)', fontWeight: '500' }} title={groupName}>
          {groupName}
        </div>
      ))}
      {showDirectLogos && groupedAndFilteredCars.map(({ groupName }) => (
        <div key={groupName} onClick={() => handleSidebarClick(groupName)} style={{ padding: '4px', cursor: 'pointer', textAlign: 'center', borderBottom: '1px solid var(--sb-item-border)', backgroundColor: '#fff' }} title={groupName}>
          <img src={getMakeLogo(groupName)} alt={groupName} style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
          <span style={{ display: 'none', fontSize: '10px', color: 'var(--sb-tx)', wordBreak: 'break-word', fontWeight: '500' }}>{groupName}</span>
        </div>
      ))}
      {showAlphabetDrawer && visibleLetters.map(letter => (
        <div
          key={letter} onClick={() => setSelectedLetter(prev => prev === letter ? null : letter)}
          style={{ padding: letter === 'Fictional' ? '14px 5px' : '12px 5px', cursor: 'pointer', textAlign: 'center', borderBottom: '1px solid var(--sb-item-border)', fontSize: letter === 'Fictional' ? '0.85em' : '1.2em', fontWeight: 'bold', backgroundColor: selectedLetter === letter ? '#cc2200' : 'transparent', color: selectedLetter === letter ? '#fff' : 'var(--sb-tx)', transition: 'background-color 0.2s ease, color 0.2s ease' }}
        >
          {letter}
        </div>
      ))}
      {showDecadeDrawer && visibleDecades.map(decade => (
        <div
          key={decade} onClick={() => setSelectedLetter(prev => prev === decade ? null : decade)}
          style={{ padding: '14px 5px', cursor: 'pointer', textAlign: 'center', borderBottom: '1px solid var(--sb-item-border)', fontSize: '1.05em', fontWeight: 'bold', backgroundColor: selectedLetter === decade ? '#cc2200' : 'transparent', color: selectedLetter === decade ? '#fff' : 'var(--sb-tx)', transition: 'background-color 0.2s ease, color 0.2s ease' }}
        >
          {decade}
        </div>
      ))}
    </div>
  );
});

export const SecondarySidebar = React.memo(({
  groupedAndFilteredCars, selectedLetter, sidebarView, showDrawer, handleSidebarClick,
}) => {
  if (!showDrawer) return null;

  if (sidebarView === 'make') {
    const makesForLetter = groupedAndFilteredCars.filter(({ groupName }) => {
      if (!groupName) return false;
      if (selectedLetter === 'Fictional') return FICTIONAL_MAKES.has(groupName);
      return !FICTIONAL_MAKES.has(groupName) && groupName.charAt(0).toUpperCase() === selectedLetter;
    });
    return (
      <div style={{ width: '130px', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
        <div style={{ padding: '8px', textAlign: 'center', backgroundColor: '#e9ecef', fontWeight: 'bold', borderBottom: '1px solid #ddd', position: 'sticky', top: 0, zIndex: 5, color: '#333', fontSize: selectedLetter === 'Fictional' ? '0.8em' : '1em' }}>
          {selectedLetter === 'Fictional' ? 'Fictional' : `Makes - ${selectedLetter}`}
        </div>
        {makesForLetter.map(({ groupName }) => (
          <div key={groupName} onClick={() => handleSidebarClick(groupName)} style={{ padding: '6px', cursor: 'pointer', textAlign: 'center', borderBottom: '1px solid #eee', display: 'block', backgroundColor: '#fff' }} title={groupName}>
            <img src={getMakeLogo(groupName)} alt={groupName} style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
            <span style={{ display: 'none', fontSize: '12px', color: '#333', wordBreak: 'break-word', fontWeight: '600' }}>{groupName}</span>
          </div>
        ))}
      </div>
    );
  }

  if (sidebarView === 'decade') {
    const yearsForDecade = groupedAndFilteredCars.filter(({ groupName }) => {
      if (selectedLetter === 'Unknown') return groupName === 'Unknown' || groupName.toUpperCase() === 'N/A';
      const parsed = parseInt(groupName, 10);
      if (isNaN(parsed)) return false;
      const targetDecadeFloor = parseInt(selectedLetter, 10);
      return parsed >= targetDecadeFloor && parsed < targetDecadeFloor + 10;
    });
    return (
      <div style={{ width: '130px', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
        <div style={{ padding: '8px', textAlign: 'center', backgroundColor: '#e9ecef', fontWeight: 'bold', borderBottom: '1px solid #ddd', position: 'sticky', top: 0, zIndex: 5, color: '#333', fontSize: '0.9em' }}>
          {selectedLetter}
        </div>
        {yearsForDecade.map(({ groupName, visibleGroupCars }) => (
          <div key={groupName} onClick={() => handleSidebarClick(groupName)} style={{ padding: '12px 8px', cursor: 'pointer', borderBottom: '1px solid #eee', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '1.1em', fontWeight: 'bold', color: '#111' }}>{groupName}</span>
            <span style={{ fontSize: '0.7em', fontWeight: '600', color: '#cc2200', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>
              {visibleGroupCars.length} {visibleGroupCars.length === 1 ? 'Car' : 'Cars'}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return null;
});
