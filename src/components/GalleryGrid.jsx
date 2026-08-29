import React, { useMemo } from 'react';
import { BASE_PATH } from '../constants';
import CountryFlags from './CountryFlags';
import { GalleryCard, StackedCard, getStackKey } from './GalleryCards';

const getMakeLogo = (make) => `${BASE_PATH}/makes/${make}.png`;

const GalleryGrid = React.memo(({
  carGridRef,
  groups,
  isMobile,
  sidebarView,
  columnCount,
  imageUpdates,
  handleSelectCar,
  showToast,
  expandedStacks,
  toggleStack,
  stackingEnabled,
  isGalleryEditingRef,
  isPublic,
  handleCreateNew,
  fallbackGridImage,
}) => {
  const nodes = useMemo(() => {
    if (isMobile && groups.length === 0) {
      return [<div key="mobile-empty" style={{ gridColumn: '1 / -1', padding: '40px 16px', textAlign: 'center', color: 'var(--tx-3)', fontSize: '0.95em' }}>
        Open the sidebar and select a filter to browse cars
      </div>];
    }

    const renderedNodes = [];
    let visiblePos = 0;

    groups.forEach(({ groupName, visibleGroupCars }) => {
      if (visiblePos % columnCount === columnCount - 1 && columnCount > 1) {
        renderedNodes.push(
          <div key={`spacer-${groupName}`} style={{ position: 'relative', minWidth: 0, height: '100%' }}>
            <div style={{ width: '100%', aspectRatio: '8 / 3', display: 'flex', alignItems: 'center' }}>&nbsp;</div>
            <div style={{ height: '2em', padding: '2px 4px', boxSizing: 'content-box', display: 'flex', alignItems: 'center' }}>&nbsp;</div>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '80%', height: '3px', backgroundColor: 'var(--bd)', borderRadius: '2px' }}></div>
            </div>
          </div>
        );
        visiblePos++;
      }

      const displayHeaderTitle = sidebarView === 'decade' ? `Year: ${groupName}` : groupName;

      renderedNodes.push(
        <div key={`header-${groupName}`} id={`header-${groupName}`} style={{ position: 'relative', minWidth: 0 }}>
          <div style={{ width: '100%', aspectRatio: '8 / 3', display: 'flex' }}>&nbsp;</div>
          <div style={{ height: '2em', padding: '2px 4px', boxSizing: 'content-box', display: 'flex' }}>&nbsp;</div>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
              <div style={{ width: '33.33%', paddingRight: '8px', display: 'flex', flexDirection: 'column' }}>
                {!isPublic && <button onClick={() => handleCreateNew({ make: sidebarView === 'make' ? groupName : '', brand: sidebarView === 'brand' ? groupName : '' })} style={{ width: '100%', padding: '2px 0', fontSize: '0.85em', backgroundColor: '#cc2200', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', marginBottom: '6px' }} title={`Add new entry to ${groupName}`}>+ Add</button>}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1 }}>
                  <span style={{ fontSize: '1.4em', fontWeight: '900', color: 'var(--tx)', lineHeight: '1' }}>{visibleGroupCars.length}</span>
                  <img src="/car-icon.svg" alt="vehicles" className="car-icon" style={{ width: '32px', height: '32px', marginTop: '3px', display: 'block' }} />
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-surface)', borderRadius: '4px 4px 0 0', overflow: 'hidden', position: 'relative', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                <div style={{ flexGrow: 1, backgroundColor: '#fff', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '4px', backgroundColor: '#cc2200', zIndex: 10 }}></div>
                  {sidebarView !== 'decade' ? (
                    <>
                      <img src={getMakeLogo(groupName)} alt={groupName} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', objectFit: 'contain', paddingLeft: '4px' }} onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }} />
                      <span style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold', fontSize: '1.2em', textAlign: 'center', wordBreak: 'break-word', padding: '0 10px', boxSizing: 'border-box' }}>{groupName}</span>
                    </>
                  ) : (
                    <div style={{ color: '#111', fontSize: '2em', fontWeight: '900', letterSpacing: '-1px' }}>{groupName}</div>
                  )}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '0.8em', padding: '2px 4px', height: '2em', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', backgroundColor: 'var(--bg)', borderRadius: '0 0 4px 4px', boxSizing: 'content-box' }}>
              {sidebarView === 'make' && <CountryFlags make={groupName} />}
              <span style={{ color: 'var(--tx)', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayHeaderTitle}</span>
            </div>
          </div>
        </div>
      );
      visiblePos++;

      if (!stackingEnabled) {
        for (const car of visibleGroupCars) {
          renderedNodes.push(
            <GalleryCard
              key={`${groupName}-${car.ID}`}
              car={car}
              isGalleryEditingRef={isGalleryEditingRef}
              sidebarView={sidebarView}
              imageUpdate={imageUpdates[car.ID]}
              fallbackGridImage={fallbackGridImage}
              onSelect={handleSelectCar}
              hideId={isPublic}
              isPublic={isPublic}
              showToast={showToast}
            />
          );
          visiblePos++;
        }
      } else {
        const stackMap = new Map();
        const stackOrder = [];
        for (const car of visibleGroupCars) {
          const key = getStackKey(car);
          if (!stackMap.has(key)) { stackMap.set(key, []); stackOrder.push(key); }
          stackMap.get(key).push(car);
        }

        for (const stackKey of stackOrder) {
          const stackCars = stackMap.get(stackKey);

          if (stackCars.length === 1) {
            renderedNodes.push(
              <GalleryCard
                key={`${groupName}-${stackCars[0].ID}`}
                car={stackCars[0]}
                isGalleryEditingRef={isGalleryEditingRef}
                sidebarView={sidebarView}
                imageUpdate={imageUpdates[stackCars[0].ID]}
                fallbackGridImage={fallbackGridImage}
                onSelect={handleSelectCar}
                hideId={isPublic}
              isPublic={isPublic}
                showToast={showToast}
              />
            );
            visiblePos++;
          } else if (expandedStacks.has(stackKey)) {
            const fc = stackCars[0];
            const vy = fc.Year && fc.Year.toUpperCase() !== 'N/A' ? fc.Year : null;

            let vi = 0;
            while (vi < stackCars.length) {
              const rowStartCol = visiblePos % columnCount;
              const variantsThisRow = Math.min(stackCars.length - vi, columnCount - rowStartCol);
              const firstCar = stackCars[vi];
              const headerWidth = variantsThisRow === 1
                ? '100%'
                : `calc(${variantsThisRow} * 100% + ${variantsThisRow - 1} * 6px)`;

              renderedNodes.push(
                <div key={`sv-${groupName}-${firstCar.ID}`} style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <div
                    onClick={() => toggleStack(stackKey)}
                    style={{ width: headerWidth, cursor: 'pointer', backgroundColor: 'var(--expand-hdr)', border: '1px solid var(--accent)', borderRadius: '6px', padding: '5px 14px', marginBottom: '2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8em', whiteSpace: 'nowrap', opacity: 0.85 }}
                  >
                    <span style={{ color: 'var(--accent)', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {[vy, fc.Make, fc.Model].filter(Boolean).join(' ')} — {stackCars.length} variants
                    </span>
                    <span style={{ color: 'var(--tx-3)', fontWeight: 'bold', flexShrink: 0, marginLeft: '8px' }}>▲ collapse</span>
                  </div>
                  <GalleryCard
                    car={firstCar}
                    isGalleryEditingRef={isGalleryEditingRef}
                    sidebarView={sidebarView}
                    imageUpdate={imageUpdates[firstCar.ID]}
                    fallbackGridImage={fallbackGridImage}
                    onSelect={handleSelectCar}
                    hideId={isPublic}
              isPublic={isPublic}
                    showToast={showToast}
                    eagerLoad
                  />
                </div>
              );
              visiblePos++;
              vi++;

              for (let j = 1; j < variantsThisRow; j++) {
                const car = stackCars[vi];
                renderedNodes.push(
                  <GalleryCard
                    key={`${groupName}-${car.ID}`}
                    car={car}
                    isGalleryEditingRef={isGalleryEditingRef}
                    sidebarView={sidebarView}
                    imageUpdate={imageUpdates[car.ID]}
                    fallbackGridImage={fallbackGridImage}
                    onSelect={handleSelectCar}
                    hideId={isPublic}
              isPublic={isPublic}
                    showToast={showToast}
                    eagerLoad
                  />
                );
                visiblePos++;
                vi++;
              }
            }
          } else {
            renderedNodes.push(
              <StackedCard
                key={`stack-${groupName}-${stackKey}`}
                firstCar={stackCars[0]}
                count={stackCars.length}
                stackCarIds={stackCars.map(c => c.ID).join(' ')}
                imageUpdate={imageUpdates[stackCars[0].ID]}
                sidebarView={sidebarView}
                onToggle={() => toggleStack(stackKey)}
                onSelect={handleSelectCar}
                fallbackGridImage={fallbackGridImage}
                isPublic={isPublic}
              />
            );
            visiblePos++;
          }
        }
      }
    });

    return renderedNodes;
  }, [groups, isMobile, sidebarView, isGalleryEditingRef, columnCount, imageUpdates, handleSelectCar, showToast, expandedStacks, toggleStack, stackingEnabled, isPublic, handleCreateNew, fallbackGridImage]);

  return (
    <div
      ref={carGridRef}
      className="car-grid"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '6px', alignItems: 'end' }}
    >
      {nodes}
    </div>
  );
});

export default GalleryGrid;
