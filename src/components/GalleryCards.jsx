import React, { useCallback } from 'react';
import { BASE_PATH } from '../constants';
import CountryFlags from './CountryFlags';

export const getStackKey = (car) =>
  `${(car.Year || '').trim()}||${(car.Make || '').trim()}||${(car.Model || '').trim()}||${(car.Brand || '').trim()}`;

// Stable card image — key on src forces a real DOM remount when imageUpdate
// changes, busting both React's reconciler cache and the browser's in-memory cache.
export const CarCardImage = React.memo(({ id, model, imageUpdate, eagerLoad }) => {
  const src = `${BASE_PATH}/half_standard_cars/${id} (1).jpg${imageUpdate ? `?t=${imageUpdate}` : ''}`;
  return (
    <img
      key={src}
      src={src}
      alt={model}
      loading={eagerLoad ? 'eager' : 'lazy'}
      decoding="async"
      onError={(e) => { e.target.style.display = 'none'; }}
      style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
    />
  );
}, (prev, next) =>
  prev.id === next.id &&
  prev.model === next.model &&
  prev.imageUpdate === next.imageUpdate &&
  prev.eagerLoad === next.eagerLoad
);

// Receives imageUpdate only for its own car ID so uploads don't re-render other cards.
export const GalleryCard = React.memo(({ car, isGalleryEditingRef, sidebarView, imageUpdate, fallbackGridImage, onSelect, showToast, eagerLoad, hideId }) => {
  const validYear = car.Year && car.Year.toUpperCase() !== 'N/A' ? car.Year : null;
  const isCustom = car.Supername && car.Supername.trim().toLowerCase() === 'custom';
  const customPrefix = isCustom ? car.Supername.trim() : null;
  const hideMake = (car.NameFormat || 0) === 2 || sidebarView === 'make';
  const nameWithoutYear = hideMake
    ? [customPrefix, car.Model].filter(Boolean).join(' ')
    : [customPrefix, car.Make, car.Model].filter(Boolean).join(' ');

  const handleClick = useCallback(() => {
    if (isGalleryEditingRef.current) {
      showToast("Please save or cancel your current edits first.", "error");
      return;
    }
    onSelect(car);
  }, [isGalleryEditingRef, onSelect, car, showToast]);

  return (
    <div
      className="car-card"
      data-car-id={car.ID}
      onClick={handleClick}
      style={{ cursor: 'pointer', backgroundColor: 'var(--bg-card)', borderRadius: '4px', overflow: 'hidden', display: 'block', minWidth: 0 }}
    >
      <div style={{
        width: '100%', aspectRatio: '8 / 3', backgroundColor: 'var(--bg-surface)', position: 'relative',
        overflow: 'hidden', backgroundImage: `url(${fallbackGridImage})`,
        backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center'
      }}>
        <CarCardImage id={car.ID} model={car.Model} imageUpdate={imageUpdate} eagerLoad={eagerLoad} />
      </div>
      <div className="car-card-title" style={{
        fontSize: '0.8em', padding: '2px 4px', color: 'var(--tx)', lineHeight: '1em',
        height: '2em', whiteSpace: 'normal', overflow: 'hidden',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        textOverflow: 'ellipsis', wordWrap: 'break-word', boxSizing: 'content-box'
      }}>
        {!hideId && <span style={{ color: 'var(--tx-3)', marginRight: '5px' }}>#{car.ID}</span>}
        {sidebarView !== 'decade' && validYear && <span style={{ color: 'var(--year-color)', marginRight: '4px', fontWeight: 'bold' }}>{validYear}</span>}
        {nameWithoutYear}
        {car.Make && <CountryFlags make={car.Make} carCountry={car.Country} />}
        {car.Broken_image === 'TRUE' && <span style={{ color: '#ff4d4d', marginLeft: '5px', fontWeight: 'bold' }}>[Broken]</span>}
      </div>
    </div>
  );
}, (prev, next) =>
  prev.car === next.car &&
  prev.sidebarView === next.sidebarView &&
  prev.imageUpdate === next.imageUpdate &&
  prev.onSelect === next.onSelect
);

export const StackedCard = React.memo(({ firstCar, count, stackCarIds, imageUpdate, sidebarView, onToggle, onSelect, fallbackGridImage }) => {
  const validYear = firstCar.Year && firstCar.Year.toUpperCase() !== 'N/A' ? firstCar.Year : null;
  const isCustom = firstCar.Supername && firstCar.Supername.trim().toLowerCase() === 'custom';
  const customPrefix = isCustom ? firstCar.Supername.trim() : null;
  const hideMake = (firstCar.NameFormat || 0) === 2 || sidebarView === 'make';
  const nameWithoutYear = hideMake
    ? [customPrefix, firstCar.Model].filter(Boolean).join(' ')
    : [customPrefix, firstCar.Make, firstCar.Model].filter(Boolean).join(' ');
  const src = `${BASE_PATH}/half_standard_cars/${firstCar.ID} (1).jpg${imageUpdate ? `?t=${imageUpdate}` : ''}`;

  return (
    <div
      className="stacked-card"
      data-car-id={firstCar.ID}
      data-stack-car-ids={stackCarIds}
      onClick={() => { onSelect(firstCar); onToggle(); }}
      title={`${count} variants — click to expand`}
      style={{ position: 'relative', minWidth: 0, cursor: 'pointer' }}
    >
      <div style={{ position: 'absolute', top: '5px', left: '5px', right: '-5px', bottom: '-5px', backgroundColor: 'var(--stack-1)', borderRadius: '4px' }} />
      <div style={{ position: 'absolute', top: '2px', left: '2px', right: '-2px', bottom: '-2px', backgroundColor: 'var(--stack-2)', borderRadius: '4px' }} />
      <div className="stacked-card-face" style={{ position: 'relative', zIndex: 2, backgroundColor: 'var(--bg-card)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ width: '100%', aspectRatio: '8 / 3', backgroundColor: 'var(--bg-surface)', backgroundImage: `url(${fallbackGridImage})`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }}>
          <img src={src} alt={firstCar.Model} decoding="async" onError={(e) => { e.target.style.display = 'none'; }} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        </div>
        <div style={{ fontSize: '0.8em', padding: '2px 4px', color: 'var(--tx)', lineHeight: '1em', height: '2em', whiteSpace: 'normal', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', textOverflow: 'ellipsis', wordWrap: 'break-word', boxSizing: 'content-box' }}>
          {sidebarView !== 'decade' && validYear && <span style={{ color: 'var(--year-color)', marginRight: '4px', fontWeight: 'bold' }}>{validYear}</span>}
          {nameWithoutYear}
          {firstCar.Make && <CountryFlags make={firstCar.Make} carCountry={firstCar.Country} />}
          {firstCar.Brand && firstCar.Brand.trim() && <span style={{ color: 'var(--tx-3)', marginLeft: '4px' }}>{firstCar.Brand.trim()}</span>}
        </div>
      </div>
      <div style={{ position: 'absolute', top: '-6px', right: '-6px', zIndex: 10, backgroundColor: 'var(--accent)', color: '#fff', borderRadius: '10px', padding: '1px 7px', fontWeight: '800', fontSize: '0.68em', lineHeight: '1.6', boxShadow: '0 2px 5px rgba(0,0,0,0.6)' }}>
        ×{count}
      </div>
    </div>
  );
}, (prev, next) =>
  prev.firstCar === next.firstCar &&
  prev.count === next.count &&
  prev.stackCarIds === next.stackCarIds &&
  prev.imageUpdate === next.imageUpdate &&
  prev.sidebarView === next.sidebarView &&
  prev.onSelect === next.onSelect
);
