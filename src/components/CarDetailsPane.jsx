import { useState } from 'react';
import CountryFlags from './CountryFlags';
import ClassBadge from './ClassBadge';
import CarStatsPanel from './CarStatsPanel';
import { getCarDisplayName } from '../utils/carUtils';
import { getHeroImage, FALLBACK_HERO_IMAGE } from '../utils/images';

const actionBtn = (bg, extra = {}) => ({ padding: '4px 12px', cursor: 'pointer', backgroundColor: bg, color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', ...extra });
const tabBtn = (active) => ({ padding: '3px 10px', fontSize: '0.55em', fontWeight: 'bold', letterSpacing: '0.04em', cursor: 'pointer', border: '1px solid var(--bd-3)', borderRadius: '4px', backgroundColor: active ? 'var(--accent)' : 'transparent', color: active ? '#fff' : 'var(--tx-3)' });

// Gallery detail strip: hero image + car facts, or the inline editor while
// editing on desktop (mobile shows the editor in MobileEditOverlay instead).
// Stays mounted (display:none) outside gallery view so the hero <img> keeps
// its decoded state. When the stats file is available an Info/Stats tab pair
// appears beside the name; the chosen tab persists across selections.
function CarDetailsPane({
  visible, selectedCar, isMobile, isPublic, hasAdminKey, isGalleryEditing, imageUpdates, carInfoRef,
  onOpenHeroPopup, onCategoryClick, onLogin, onEdit, onSwapIds, onSaveAll, onCreateSameCasting, onDelete,
  editor, stats, statsAvailable, onEditStats, onResetStats, classPercentile, classQuantile, classProfile, classSizes,
}) {
  const [tab, setTab] = useState('info');
  const [editingStats, setEditingStats] = useState(false);
  const showStats = statsAvailable && tab === 'stats';
  if (!selectedCar) {
    return (
      <div className="details-pane" style={{ display: visible ? undefined : 'none' }}>
        <div style={{ padding: '20px', color: '#888' }}><p>No car selected.</p></div>
      </div>
    );
  }

  const fullName = getCarDisplayName(selectedCar);
  const heroSrc = getHeroImage(selectedCar, imageUpdates);
  const onHeroError = (e) => { e.target.onerror = null; e.target.src = FALLBACK_HERO_IMAGE; };

  return (
    <div className="details-pane" style={{ display: visible ? undefined : 'none' }}>
      <div className={`car-details${isGalleryEditing && !isMobile ? ' editing' : ''}`}>
        <div className="hero-image-container" onClick={isMobile ? onOpenHeroPopup : undefined}>
          {isMobile ? (
            <img src={heroSrc} alt={fullName} onError={onHeroError} className="hero-image" />
          ) : (
            <img key={heroSrc} src={heroSrc} alt={fullName} onError={onHeroError} className="hero-image" fetchPriority="high" />
          )}
        </div>
        <div className="car-info" key={selectedCar.ID}>
          {!isGalleryEditing ? (
            <>
              <h2 style={{ margin: '0 0 4px 0', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                {fullName}
                <CountryFlags make={selectedCar.Make} carCountry={selectedCar.Country} style={{ fontSize: '1em' }} />
                {stats && <ClassBadge cls={stats.cl} rating={stats.r} style={{ marginLeft: '6px', fontSize: '0.55em' }} />}
                {statsAvailable && (
                  <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: '4px' }}>
                    <button onClick={() => setTab('info')} style={tabBtn(tab === 'info')}>INFO</button>
                    <button onClick={() => setTab('stats')} style={tabBtn(tab === 'stats')}>STATS</button>
                  </span>
                )}
              </h2>
              {showStats ? (
                <div ref={carInfoRef} className="car-info-scroll">
                  <CarStatsPanel
                    stats={stats}
                    canEdit={!isPublic}
                    editing={editingStats}
                    onToggleEdit={() => setEditingStats(e => !e)}
                    onCommit={(patch) => onEditStats(selectedCar, patch)}
                    onReset={() => onResetStats(selectedCar)}
                    classPercentile={classPercentile}
                    classQuantile={classQuantile}
                    classProfile={classProfile}
                    classSizes={classSizes}
                  />
                </div>
              ) : (
              <div ref={carInfoRef} className="car-info-scroll">
                {!isPublic && <p style={{ margin: '2px 0' }}><strong>ID:</strong> {selectedCar.ID}</p>}
                <p style={{ margin: '2px 0' }}><strong>Brand:</strong> {selectedCar.Brand || 'N/A'}</p>
                {selectedCar.Series && <p style={{ margin: '2px 0' }}><strong>Series:</strong> {selectedCar.Series}</p>}
                {Array.isArray(selectedCar.Category) && selectedCar.Category.length > 0 && (
                  <p style={{ margin: '2px 0' }}>
                    <strong>Categor{selectedCar.Category.length === 1 ? 'y' : 'ies'}:</strong>{' '}
                    {selectedCar.Category.map((cat, i) => (
                      <span key={cat}>
                        <span style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => onCategoryClick(cat)}>{cat}</span>
                        {i < selectedCar.Category.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </p>
                )}
                {selectedCar.Description && <p style={{ margin: '2px 0' }}><strong>Description:</strong> {selectedCar.Description}</p>}
                {selectedCar.Cover && <p style={{ margin: '2px 0', color: '#f0a500', fontWeight: 'bold' }}>★ Stack Cover</p>}
                {selectedCar.Broken_image === 'TRUE' && <p style={{ margin: '2px 0', color: '#ff4d4d', fontWeight: 'bold' }}>⚠️ Flagged as Broken Image</p>}
                {!isPublic && !hasAdminKey && (
                  <div style={{ marginTop: '8px' }}>
                    <button onClick={onLogin} style={actionBtn('#cc2200')}>Log in to edit</button>
                  </div>
                )}
                {!isPublic && hasAdminKey && (
                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button onClick={onEdit} style={actionBtn('#cc2200')}>Edit Details</button>
                    <button onClick={onSwapIds} style={actionBtn('#17a2b8')}>Swap ID</button>
                    <button onClick={() => onSaveAll()} style={actionBtn('#28a745')}>Save All</button>
                    <button onClick={onCreateSameCasting} style={actionBtn('#e67e22')}>Add same casting</button>
                    <button onClick={onDelete} style={actionBtn('#dc3545', { marginLeft: 'auto' })}>Delete Car</button>
                  </div>
                )}
              </div>
              )}
            </>
          ) : (
            // On mobile the editor renders in a full-screen overlay; inline
            // here it would be crushed into the ~120px detail strip.
            !isMobile ? (
              <div ref={carInfoRef} className="car-info-scroll">
                {editor}
              </div>
            ) : null
          )}
        </div>
      </div>
    </div>
  );
}

export default CarDetailsPane;
