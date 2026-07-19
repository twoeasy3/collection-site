// Rating as a tier, not a number: 0 Unrated, then F (worst) up to SS (best).
// Stored as an integer 0-10; the number itself is never shown, only the tier.
export const TIER_LABELS = ['Unrated', 'F', 'E', 'D', 'C', 'B', 'B+', 'A', 'A+', 'S', 'SS'];
// Short glyph shown inside a colored square/badge ('Unrated' won't fit).
const TIER_GLYPHS = ['–', 'F', 'E', 'D', 'C', 'B', 'B+', 'A', 'A+', 'S', 'SS'];

const UNRATED_COLOR = '#7a7f8a';
// F -> SS runs through this sequence, worst to best, with purple as the top tier.
const RAMP_STOPS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

function mix(hexA, hexB, t) {
  const a = parseInt(hexA.slice(1), 16), b = parseInt(hexB.slice(1), 16);
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * t), g = Math.round(ag + (bg - ag) * t), bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl})`;
}

// t in [0,1] across the whole ramp, piecewise-linear through every stop.
function rampColor(stops, t) {
  const segCount = stops.length - 1;
  const scaled = Math.max(0, Math.min(1, t)) * segCount;
  const idx = Math.min(segCount - 1, Math.floor(scaled));
  return mix(stops[idx], stops[idx + 1], scaled - idx);
}

function clampTier(value) {
  return Math.max(0, Math.min(10, Math.round(value ?? 0)));
}

export function tierLabel(value) {
  return TIER_LABELS[clampTier(value)];
}

export function tierGlyph(value) {
  return TIER_GLYPHS[clampTier(value)];
}

export function tierColor(value) {
  const v = clampTier(value);
  if (v === 0) return UNRATED_COLOR;
  return rampColor(RAMP_STOPS, (v - 1) / 9); // 0 (F) .. 1 (SS)
}

export function TierInput({ value, onChange }) {
  const v = clampTier(value);
  return (
    <div>
      <div className="cr-tier-current" style={{ color: tierColor(v) }}>{tierLabel(v)}</div>
      <div className="cr-tier-segments">
        {TIER_LABELS.map((label, i) => (
          <button
            key={label}
            type="button"
            className={`cr-tier-seg${i === v ? ' selected' : ''}`}
            style={{ background: tierColor(i) }}
            onClick={() => onChange(i)}
            aria-label={label}
            title={label}
          >
            {TIER_GLYPHS[i]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function TierDisplay({ value }) {
  const v = clampTier(value);
  return (
    <span className="cr-tier-display" style={{ background: tierColor(v) }}>
      {tierLabel(v)}
    </span>
  );
}

export function TierBadge({ value }) {
  const v = clampTier(value);
  return (
    <span className="cr-tier-badge" style={{ background: tierColor(v) }}>
      {tierGlyph(v)}
    </span>
  );
}
