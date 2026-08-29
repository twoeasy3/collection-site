import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './leafletRotateGlobal';
import 'leaflet-rotate';
import './CoffeeRuns.css';
import { TierBadge } from './RatingTier';
import { GenreBadge } from './GenreSlider';
import { PriceBadge } from './PriceScale';
import StopForm from './StopForm';
import DetailPanel from './DetailPanel';
import CalendarPanel from './CalendarPanel';
import { stopIcon, colorForStop, placingIcon } from './markerIcon';
import { asVisitDates } from './visitDates';

const TILE_URLS = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
const DEFAULT_CENTER = [40.7128, -74.006];
const COLOR_MODES = [
  { id: 'rating', label: 'Rating' },
  { id: 'genre', label: 'Genre' },
  { id: 'price', label: 'Price' },
];

const SORT_OPTIONS = [
  { id: 'date', label: 'Date' },
  { id: 'name', label: 'Name' },
  { id: 'location', label: 'Location' },
  { id: 'rating', label: 'Rating' },
  { id: 'genre', label: 'Genre' },
  { id: 'price', label: 'Price' },
];

const latestVisit = (stop) => {
  const dates = asVisitDates(stop.visit_dates);
  return dates.length ? [...dates].sort().at(-1) : '';
};

const SORTERS = {
  date: (a, b) => latestVisit(b).localeCompare(latestVisit(a)),
  name: (a, b) => a.name.localeCompare(b.name),
  location: (a, b) => (a.location || '￿').localeCompare(b.location || '￿'), // blanks sort last
  rating: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
  genre: (a, b) => (a.genre ?? 5) - (b.genre ?? 5), // ascending: Dessert -> Kopi -> Exotic
  price: (a, b) => (b.price ?? 5) - (a.price ?? 5), // priciest first
};

function MapRefSetter({ mapRef, onBearingChange, onGestureChange }) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
    // Leaflet caches its container's pixel size on mount to convert clicks
    // and markers between pixels and lat/lng. In a flex/grid layout (and
    // especially a CSS aspect-ratio square) that size can still be settling
    // when Leaflet first measures it, which throws the conversion off and
    // makes pins land in the wrong spot relative to the tiles. A
    // ResizeObserver on the actual container catches every real size
    // change — initial settle, sidebar/panel changes, window resize — and
    // forces Leaflet to remeasure, which a one-off timeout can't guarantee.
    const container = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(container);
    return () => ro.disconnect();
  }, [map]);
  useEffect(() => {
    const onRotate = () => onBearingChange(map.getBearing());
    map.on('rotate', onRotate);
    return () => map.off('rotate', onRotate);
  }, [map, onBearingChange]);
  useEffect(() => {
    // A two-finger rotate/zoom gesture landing partly on a pin can end up
    // firing that pin's click (e.g. a stray synthetic click from the touch
    // that lifts off last), yanking the map to that stop mid-gesture. As
    // soon as a second finger is down, make pins un-clickable until the
    // gesture fully ends so they can't interfere.
    const container = map.getContainer();
    const onTouchStart = (e) => { if (e.touches.length >= 2) onGestureChange(true); };
    const onTouchEnd = (e) => { if (e.touches.length < 2) onGestureChange(false); };
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchend', onTouchEnd, { passive: true });
    container.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [map, onGestureChange]);
  return null;
}

function ClickCapture({ active, onClick, onBackgroundClick }) {
  useMapEvents({
    click(e) {
      if (active) onClick(e.latlng);
      else onBackgroundClick();
    },
  });
  return null;
}

function CoffeeRuns() {
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [isAdmin, setIsAdmin] = useState(() => !!localStorage.getItem('adminApiKey'));
  const [placing, setPlacing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [editing, setEditing] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [colorBy, setColorBy] = useState('rating');
  const [showLabels, setShowLabels] = useState(true);
  const [hideLunch, setHideLunch] = useState(false);
  const [sortBy, setSortBy] = useState('date');
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [bearing, setBearing] = useState(0);
  const [gestureActive, setGestureActive] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    document.title = 'Coffee Runs';
    fetch('/api/coffee-stops')
      .then(r => r.json())
      .then(data => setStops(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!mapFullscreen) return;
    const onKeyDown = (e) => { if (e.key === 'Escape') setMapFullscreen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mapFullscreen]);

  useEffect(() => {
    if (loading || !mapRef.current) return;
    if (stops.length) {
      const bounds = stops.map(s => [s.lat, s.lng]);
      if (bounds.length > 1) mapRef.current.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 });
      else mapRef.current.setView(bounds[0], 13);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => mapRef.current?.setView([pos.coords.latitude, pos.coords.longitude], 12),
        () => {},
        { timeout: 4000 }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, stops.length]);

  const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('adminApiKey')}` });

  const handleLogin = () => {
    const key = window.prompt('Enter admin key');
    if (!key) return;
    localStorage.setItem('adminApiKey', key.trim());
    setIsAdmin(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminApiKey');
    setIsAdmin(false);
  };

  const saveStop = async (stop) => {
    let savedId = stop.id;
    if (stop.id) {
      await fetch(`/api/coffee-stops/${stop.id}`, {
        method: 'PUT',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify(stop),
      });
      setStops(prev => prev.map(s => (s.id === stop.id ? { ...s, ...stop } : s)));
    } else {
      const res = await fetch('/api/coffee-stops', {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify(stop),
      });
      const { id } = await res.json();
      savedId = id;
      setStops(prev => [{ ...stop, id }, ...prev]);
    }
    setEditing(null);
    setDraft(null);
    setPlacing(false);
    setSelectedId(savedId);
  };

  const deleteStop = async (stop) => {
    await fetch(`/api/coffee-stops/${stop.id}`, { method: 'DELETE', headers: authHeader() });
    setStops(prev => prev.filter(s => s.id !== stop.id));
    setEditing(null);
    setSelectedId(prev => (prev === stop.id ? null : prev));
  };

  const focusStop = (stop) => {
    setSelectedId(stop.id);
    mapRef.current?.flyTo([stop.lat, stop.lng], 17, { duration: 0.6 });
  };

  const logVisitToday = (stop) => {
    const today = new Date().toISOString().slice(0, 10);
    const dates = asVisitDates(stop.visit_dates);
    if (dates.includes(today)) return;
    saveStop({ ...stop, visit_dates: [...dates, today] });
  };

  const visibleStops = hideLunch ? stops.filter(s => !s.is_lunch) : stops;
  const sortedStops = [...visibleStops].sort(SORTERS[sortBy]);
  const selectedStop = visibleStops.find(s => s.id === selectedId) || null;

  return (
    <div className="cr-page">
      <header className="cr-header">
        <div className="cr-header-left">
          <a className="cr-back-link" href="/">← Car Collection</a>
          <h1 className="cr-title">☕ Coffee Runs</h1>
        </div>
        <div className="cr-header-right">
          {isAdmin ? (
            <>
              <button className={`cr-btn ${placing ? 'cr-btn-primary' : ''}`} onClick={() => setPlacing(p => !p)}>
                {placing ? 'Click the map…' : '+ Add stop'}
              </button>
              <button className="cr-btn" onClick={() => setDraft({ lat: '', lng: '' })}>+ By coordinates</button>
              <button className="cr-btn" onClick={handleLogout}>Log out</button>
            </>
          ) : (
            <button className="cr-btn" onClick={handleLogin}>Log in</button>
          )}
          <button className="cr-btn" onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}>
            {theme === 'dark' ? '☀' : '●'}
          </button>
        </div>
      </header>

      <div className={`cr-main${mapFullscreen ? ' cr-map-is-fullscreen' : ''}`}>
        <div className="cr-left">
          <div className={`cr-map-wrap${mapFullscreen ? ' cr-map-wrap-fullscreen' : ''}${gestureActive ? ' cr-gesture-active' : ''}`}>
            <MapContainer
              center={DEFAULT_CENTER}
              zoom={12}
              className="cr-map"
              rotate
              rotateControl={false}
              touchRotate
              bearing={0}
            >
              <TileLayer url={TILE_URLS[theme]} attribution={TILE_ATTRIBUTION} maxZoom={20} />
              <MapRefSetter mapRef={mapRef} onBearingChange={setBearing} onGestureChange={setGestureActive} />
              <ClickCapture
                active={placing}
                onClick={(latlng) => setDraft({ lat: latlng.lat, lng: latlng.lng })}
                onBackgroundClick={() => setSelectedId(null)}
              />

              {visibleStops.map(stop => (
                <Marker
                  key={stop.id}
                  position={[stop.lat, stop.lng]}
                  icon={stopIcon(colorForStop(stop, colorBy), stop.name, {
                    active: selectedId === stop.id,
                    dimmed: selectedId != null && selectedId !== stop.id,
                    showLabels,
                  })}
                  zIndexOffset={selectedId === stop.id ? 10000 : 0}
                  eventHandlers={{ click: () => focusStop(stop) }}
                />
              ))}

              {draft && Number.isFinite(draft.lat) && Number.isFinite(draft.lng) && (
                <Marker position={[draft.lat, draft.lng]} icon={placingIcon()} />
              )}
            </MapContainer>

            {placing && !draft && <div className="cr-placing-hint">Click the map to drop a pin</div>}

            <button
              className="cr-fullscreen-toggle"
              onClick={() => setMapFullscreen(f => !f)}
              aria-label={mapFullscreen ? 'Exit fullscreen' : 'Fullscreen map'}
              title={mapFullscreen ? 'Exit fullscreen' : 'Fullscreen map'}
            >
              {mapFullscreen ? '✕' : '⛶'}
            </button>

            {bearing !== 0 && (
              <button
                className="cr-reset-north"
                onClick={() => mapRef.current?.setBearing(0)}
                aria-label="Reset north"
                title="Reset north"
              >
                <span style={{ display: 'inline-block', transform: `rotate(${-bearing}deg)` }}>↑</span>
              </button>
            )}

            <div className="cr-color-toggle">
              {COLOR_MODES.map(m => (
                <button
                  key={m.id}
                  className={`cr-color-toggle-btn${colorBy === m.id ? ' active' : ''}`}
                  onClick={() => setColorBy(m.id)}
                >
                  {m.label}
                </button>
              ))}
              <span className="cr-color-toggle-divider" />
              <button
                className={`cr-color-toggle-btn${showLabels ? ' active' : ''}`}
                onClick={() => setShowLabels(s => !s)}
                aria-label={showLabels ? 'Hide labels' : 'Show labels'}
                title={showLabels ? 'Hide labels' : 'Show labels'}
              >
                Labels
              </button>
            </div>
          </div>

          <div className="cr-list-panel">
            <div className="cr-sidebar-count">{visibleStops.length} stop{visibleStops.length === 1 ? '' : 's'}</div>

            <div className="cr-sort-row">
              <span className="cr-sort-label">Sort</span>
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  className={`cr-sort-btn${sortBy === opt.id ? ' active' : ''}`}
                  onClick={() => setSortBy(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
              <span className="cr-color-toggle-divider" />
              <button
                className={`cr-sort-btn${hideLunch ? ' active' : ''}`}
                onClick={() => setHideLunch(h => !h)}
              >
                Hide lunch
              </button>
            </div>

            {loading && <div className="cr-empty">Loading…</div>}
            {!loading && !stops.length && <div className="cr-empty">No coffee stops yet.</div>}
            {!loading && !!stops.length && !visibleStops.length && <div className="cr-empty">All stops are hidden by the lunch filter.</div>}

            <div className="cr-card-grid">
              {sortedStops.map(stop => (
                <button key={stop.id} className={`cr-card${selectedId === stop.id ? ' active' : ''}${stop.image_url ? ' has-banner' : ''}`} onClick={() => focusStop(stop)}>
                  {stop.image_url && (
                    <img
                      className="cr-card-banner"
                      src={stop.image_url}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}
                  <div className="cr-card-head">
                    <div className="cr-card-title">
                      <div className="cr-card-name">{stop.name}{!!stop.is_lunch && <span className="cr-lunch-tag">Lunch</span>}</div>
                      {stop.location && <div className="cr-card-location">{stop.location}</div>}
                    </div>
                    {latestVisit(stop) && <div className="cr-card-date">{latestVisit(stop)}</div>}
                  </div>
                  <div className="cr-card-badges">
                    <TierBadge value={stop.rating} />
                    <GenreBadge value={stop.genre ?? 5} width={60} />
                    <PriceBadge value={stop.price ?? 5} size={13} />
                    {asVisitDates(stop.visit_dates).length > 0 && (
                      <span className="cr-card-visits">{asVisitDates(stop.visit_dates).length}× visited</span>
                    )}
                  </div>
                  {stop.notes && <div className="cr-card-notes">{stop.notes}</div>}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={`cr-detail-panel${selectedStop ? ' cr-open' : ''}`}>
          <button className="cr-detail-panel-close" onClick={() => setSelectedId(null)} aria-label="Close details">×</button>
          <DetailPanel stop={selectedStop} isAdmin={isAdmin} onEdit={setEditing} onLogVisit={logVisitToday} />
        </div>

        <div className="cr-calendar-col">
          <CalendarPanel stops={stops} selectedId={selectedId} onSelectStop={focusStop} />
        </div>
      </div>

      {draft && (
        <StopForm
          initial={draft}
          onCancel={() => { setDraft(null); setPlacing(false); }}
          onSave={saveStop}
        />
      )}
      {editing && (
        <StopForm
          initial={editing}
          onCancel={() => setEditing(null)}
          onSave={saveStop}
          onDelete={deleteStop}
        />
      )}
    </div>
  );
}

export default CoffeeRuns;
