// 1-10, shown as a filled segment bar with the number alongside (unlike
// genre, price is a plain magnitude — fine to label directly). A
// green -> amber -> red ramp: a different hue family from both the rating
// (brown) and genre (magenta/violet) ramps, and an intuitive "cheap to
// pricey" read on its own.
const RAMP_LOW = '#4caf6d';
const RAMP_MID = '#e0a83e';
const RAMP_HIGH = '#c0392b';

function mixHex(hexA, hexB, t) {
  const a = parseInt(hexA.slice(1), 16), b = parseInt(hexB.slice(1), 16);
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * t), g = Math.round(ag + (bg - ag) * t), bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl})`;
}

export function priceColor(value) {
  const t = Math.max(0, Math.min(9, value - 1)) / 9;
  return t <= 0.5 ? mixHex(RAMP_LOW, RAMP_MID, t / 0.5) : mixHex(RAMP_MID, RAMP_HIGH, (t - 0.5) / 0.5);
}

// Lightens an "rgb(r,g,b)" string toward white — used to mark the "half"
// $ sign for odd values, so e.g. 9/10 (five $, last one lighter) reads as
// visibly different from 10/10 (five $, all solid).
function lighten(rgbStr, amount = 0.45) {
  const [r, g, b] = rgbStr.match(/\d+/g).map(Number);
  const mixed = [r, g, b].map(c => Math.round(c + (255 - c) * amount));
  return `rgb(${mixed[0]},${mixed[1]},${mixed[2]})`;
}

export function PriceInput({ value, onChange }) {
  return (
    <div className="cr-price-input">
      <div className="cr-price-segments">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            type="button"
            className={`cr-price-seg${n <= value ? ' filled' : ''}`}
            style={n <= value ? { background: priceColor(n) } : undefined}
            onClick={() => onChange(n)}
          />
        ))}
      </div>
      <span className="cr-price-num">{value}/10</span>
    </div>
  );
}

// Same visual as PriceInput, but read-only — for the detail panel.
export function PriceDisplay({ value }) {
  return (
    <div className="cr-price-input">
      <div className="cr-price-segments">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <span
            key={n}
            className={`cr-price-seg${n <= value ? ' filled' : ''}`}
            style={n <= value ? { background: priceColor(n) } : undefined}
          />
        ))}
      </div>
      <span className="cr-price-num">{value}/10</span>
    </div>
  );
}

// Ten price values map onto five $ signs, so each $ covers two values (a
// "full" even value and the "odd" value below it — like a half star). The
// last filled $ is shown in a lighter shade for odd values, so e.g. 9/10
// (leaning into the 5th $) reads differently from 10/10 (fully there).
export function PriceBadge({ value, size = 12 }) {
  const filled = Math.max(1, Math.round(value / 2));
  const isOdd = value % 2 === 1;
  const color = priceColor(value);
  const lastColor = isOdd ? lighten(color) : color;

  return (
    <span className="cr-price-badge" style={{ fontSize: size }} title={`Price ${value}/10`}>
      {Array.from({ length: 5 }, (_, i) => {
        const pos = i + 1;
        if (pos > filled) return <span key={pos} style={{ color: 'var(--bd-2)' }}>$</span>;
        return <span key={pos} style={{ color: pos === filled ? lastColor : color }}>$</span>;
      })}
    </span>
  );
}
