import { TierDisplay } from './RatingTier';
import { GenreDisplay } from './GenreSlider';
import { PriceDisplay } from './PriceScale';
import { asVisitDates } from './visitDates';

function DetailPanel({ stop, isAdmin, onEdit, onLogVisit }) {
  if (!stop) {
    return (
      <div className="cr-detail cr-detail-empty">
        <div className="cr-detail-empty-icon">☕</div>
        <p>Select a stop from the list or the map to see its details here.</p>
      </div>
    );
  }

  const mapsUrl = `https://www.google.com/maps?q=${stop.lat},${stop.lng}`;
  const visits = [...asVisitDates(stop.visit_dates)].sort().reverse();
  const today = new Date().toISOString().slice(0, 10);
  const visitedToday = visits.includes(today);

  return (
    <div className="cr-detail">
      {stop.image_url && (
        <img
          className="cr-detail-banner"
          src={stop.image_url}
          alt=""
          referrerPolicy="no-referrer"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      )}

      <div className="cr-detail-head">
        <div>
          <h2 className="cr-detail-name">{stop.name}{!!stop.is_lunch && <span className="cr-lunch-tag">Lunch</span>}</h2>
          {stop.location && <div className="cr-detail-building">{stop.location}</div>}
        </div>
        {isAdmin && <button className="cr-btn" onClick={() => onEdit(stop)}>Edit</button>}
      </div>

      <TierDisplay value={stop.rating} />

      <div className="cr-detail-section">
        <div className="cr-detail-label">Genre</div>
        <GenreDisplay value={stop.genre ?? 5} />
      </div>

      <div className="cr-detail-section">
        <div className="cr-detail-label">Price</div>
        <PriceDisplay value={stop.price ?? 5} />
      </div>

      <div className="cr-detail-section">
        <div className="cr-detail-label">
          {visits.length} visit{visits.length === 1 ? '' : 's'}
        </div>
        {visits.length > 0 ? (
          <div className="cr-visit-chips">
            {visits.map(d => <span key={d} className="cr-visit-chip cr-visit-chip-static">{d}</span>)}
          </div>
        ) : (
          <div className="cr-detail-value">No visits logged yet</div>
        )}
        {isAdmin && (
          <button className="cr-btn" style={{ marginTop: 8 }} onClick={() => onLogVisit(stop)} disabled={visitedToday}>
            {visitedToday ? "Already logged today" : '+ Log visit today'}
          </button>
        )}
      </div>

      {stop.notes && (
        <div className="cr-detail-section">
          <div className="cr-detail-label">Notes</div>
          <p className="cr-detail-notes">{stop.notes}</p>
        </div>
      )}

      <div className="cr-detail-section">
        <div className="cr-detail-label">Coordinates</div>
        <div className="cr-detail-value">{stop.lat.toFixed(5)}, {stop.lng.toFixed(5)}</div>
        <a className="cr-detail-maps-link" href={mapsUrl} target="_blank" rel="noreferrer">
          Open in Google Maps to double-check the pin →
        </a>
      </div>
    </div>
  );
}

export default DetailPanel;
