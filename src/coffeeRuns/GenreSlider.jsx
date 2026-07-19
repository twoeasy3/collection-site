// A spectrum, not a number: 0 = Dessert, 5 (median) = Kopi, 10 = Exotic.
// The value is never rendered as text anywhere — only as a position.
// Saturated, widely-separated endpoints (magenta / coffee-brown / violet)
// so the three zones stay distinguishable at small pin size.
const GENRE_LOW = '#d6217e';
const GENRE_MID = '#8f5f34';
const GENRE_HIGH = '#4a2ea8';
export const GENRE_GRADIENT = `linear-gradient(90deg, ${GENRE_LOW} 0%, ${GENRE_MID} 50%, ${GENRE_HIGH} 100%)`;

export function genreColor(value) {
  const v = Math.max(0, Math.min(10, value));
  if (v <= 5) {
    const t = v / 5;
    return mix(GENRE_LOW, GENRE_MID, t);
  }
  const t = (v - 5) / 5;
  return mix(GENRE_MID, GENRE_HIGH, t);
}

function mix(hexA, hexB, t) {
  const a = parseInt(hexA.slice(1), 16), b = parseInt(hexB.slice(1), 16);
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * t), g = Math.round(ag + (bg - ag) * t), bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl})`;
}

export function GenreInput({ value, onChange }) {
  return (
    <div>
      <div className="cr-genre-track" style={{ background: GENRE_GRADIENT }}>
        <input
          type="range" min={0} max={10} step={1} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="cr-genre-range"
        />
        <div className="cr-genre-thumb" style={{ left: `${(value / 10) * 100}%` }} />
      </div>
      <div className="cr-genre-labels">
        <span>Dessert</span>
        <span>Kopi</span>
        <span>Exotic</span>
      </div>
    </div>
  );
}

// Same visual as GenreInput, but read-only — for the detail panel.
export function GenreDisplay({ value }) {
  return (
    <div>
      <div className="cr-genre-track" style={{ background: GENRE_GRADIENT }}>
        <div className="cr-genre-thumb" style={{ left: `${(value / 10) * 100}%` }} />
      </div>
      <div className="cr-genre-labels">
        <span>Dessert</span>
        <span>Kopi</span>
        <span>Exotic</span>
      </div>
    </div>
  );
}

export function GenreBadge({ value, width = 46 }) {
  return (
    <span className="cr-genre-badge" style={{ width, background: GENRE_GRADIENT }} title="Genre">
      <span className="cr-genre-badge-mark" style={{ left: `${(value / 10) * 100}%` }} />
    </span>
  );
}
