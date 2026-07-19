import { useState } from 'react';
import RatingStars from './RatingStars';
import { GenreInput } from './GenreSlider';
import { PriceInput } from './PriceScale';
import { asVisitDates } from './visitDates';

function VisitDatesEditor({ dates, onChange }) {
  const [pending, setPending] = useState('');
  const safeDates = asVisitDates(dates);

  const addDate = () => {
    if (!pending || safeDates.includes(pending)) return;
    onChange([...safeDates, pending].sort());
    setPending('');
  };

  const removeDate = (d) => onChange(safeDates.filter(x => x !== d));

  const sortedDesc = [...safeDates].sort().reverse();

  return (
    <div>
      {sortedDesc.length > 0 && (
        <div className="cr-visit-chips">
          {sortedDesc.map(d => (
            <span key={d} className="cr-visit-chip">
              {d}
              <button type="button" onClick={() => removeDate(d)} aria-label={`Remove visit on ${d}`}>×</button>
            </span>
          ))}
        </div>
      )}
      <div className="cr-field-row">
        <input type="date" value={pending} onChange={e => setPending(e.target.value)} style={{ flex: 1 }} />
        <button type="button" className="cr-btn" onClick={addDate} disabled={!pending}>+ Add visit</button>
      </div>
    </div>
  );
}

function StopForm({ initial, onCancel, onSave, onDelete }) {
  const [name, setName] = useState(initial.name || '');
  const [rating, setRating] = useState(initial.rating || 0);
  const [genre, setGenre] = useState(initial.genre ?? 5);
  const [price, setPrice] = useState(initial.price ?? 5);
  const [notes, setNotes] = useState(initial.notes || '');
  const [location, setLocation] = useState(initial.location || '');
  const [imageUrl, setImageUrl] = useState(initial.image_url || '');
  const [visitDates, setVisitDates] = useState(asVisitDates(initial.visit_dates));
  const [lat, setLat] = useState(initial.lat ?? '');
  const [lng, setLng] = useState(initial.lng ?? '');
  const [saving, setSaving] = useState(false);

  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  const coordsValid = Number.isFinite(latNum) && latNum >= -90 && latNum <= 90
    && Number.isFinite(lngNum) && lngNum >= -180 && lngNum <= 180;
  const canSave = name.trim() && coordsValid;

  // Accepts a pasted Google Maps URL fragment like "@1.2785031,103.8459284,1172m"
  // (or a bare "lat,lng") and fills both fields from it, wherever it's pasted.
  const handleCoordPaste = (e) => {
    const text = e.clipboardData.getData('text');
    const match = text.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
    if (match) {
      e.preventDefault();
      setLat(match[1]);
      setLng(match[2]);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    await onSave({
      ...initial,
      name: name.trim(),
      rating,
      genre,
      price,
      notes: notes.trim(),
      location: location.trim(),
      image_url: imageUrl.trim(),
      visit_dates: visitDates,
      lat: latNum,
      lng: lngNum,
    });
    setSaving(false);
  };

  return (
    <div className="cr-modal-backdrop" onClick={onCancel}>
      <form className="cr-modal" onClick={e => e.stopPropagation()} onSubmit={submit}>
        <div className="cr-modal-title">{initial.id ? 'Edit stop' : 'New coffee stop'}</div>

        <label className="cr-field">
          <span>Name</span>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Corner Coffee Co." autoFocus />
        </label>

        <label className="cr-field">
          <span>Location (mall / building)</span>
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. ION Orchard" />
        </label>

        <label className="cr-field">
          <span>Banner image URL</span>
          <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." />
        </label>

        <div className="cr-field-row">
          <label className="cr-field">
            <span>Latitude</span>
            <input
              type="number" step="any" value={lat} onChange={e => setLat(e.target.value)} onPaste={handleCoordPaste}
              placeholder="e.g. 40.7128"
            />
          </label>
          <label className="cr-field">
            <span>Longitude</span>
            <input
              type="number" step="any" value={lng} onChange={e => setLng(e.target.value)} onPaste={handleCoordPaste}
              placeholder="e.g. -74.0060"
            />
          </label>
        </div>
        <p className="cr-field-hint">
          Tip: in Google Maps, copy anything containing "lat,lng" — a share link, or the
          "@1.2785,103.8459,1172m" from the address bar — and paste it into either box above;
          both fields fill in automatically.
        </p>

        <label className="cr-field">
          <span>Rating</span>
          <RatingStars value={rating} onChange={setRating} size={22} />
        </label>

        <label className="cr-field">
          <span>Genre</span>
          <GenreInput value={genre} onChange={setGenre} />
        </label>

        <label className="cr-field">
          <span>Price</span>
          <PriceInput value={price} onChange={setPrice} />
        </label>

        <label className="cr-field">
          <span>Visits {visitDates.length > 0 && `(${visitDates.length})`}</span>
          <VisitDatesEditor dates={visitDates} onChange={setVisitDates} />
        </label>

        <label className="cr-field">
          <span>Notes</span>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="What did you get, how was it..." />
        </label>

        <div className="cr-modal-actions">
          {initial.id && (
            <button type="button" className="cr-btn cr-btn-danger" onClick={() => onDelete(initial)}>Delete</button>
          )}
          <div style={{ flex: 1 }} />
          <button type="button" className="cr-btn" onClick={onCancel}>Cancel</button>
          <button type="submit" className="cr-btn cr-btn-primary" disabled={saving || !canSave}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default StopForm;
