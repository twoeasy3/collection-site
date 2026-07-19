import L from 'leaflet';
import { genreColor } from './GenreSlider';
import { priceColor } from './PriceScale';
import { tierColor } from './RatingTier';

export function colorForStop(stop, colorBy) {
  if (colorBy === 'genre') return genreColor(stop.genre ?? 5);
  if (colorBy === 'price') return priceColor(stop.price ?? 5);
  return tierColor(stop.rating ?? 0);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Pin shape lives in a 30x39 unit box; PAD gives the 1.5px stroke room so
// it isn't clipped by the SVG viewport edge (a stroked path touching the
// exact edge of its viewBox gets half its stroke cut off by default).
const PIN_W = 30, PIN_H = 39, PAD = 3;
const LABEL_H = 20;

// active: this is the selected pin — larger, label shown.
// dimmed: some OTHER pin is selected — smaller, label hidden, so the
// selected one reads as the clear focal point.
export function stopIcon(color, label, { active = false, dimmed = false } = {}) {
  const scale = active ? 1.3 : dimmed ? 0.6 : 1;
  const showLabel = !dimmed;
  const svgW = (PIN_W + PAD * 2) * scale;
  const svgH = (PIN_H + PAD * 2) * scale;
  const pinSvg = `
    <svg width="${svgW}" height="${svgH}" viewBox="${-PAD} ${-PAD} ${PIN_W + PAD * 2} ${PIN_H + PAD * 2}" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 24 15 24s15-13.5 15-24C30 6.7 23.3 0 15 0z" fill="${color}" stroke="#1a1a1a" stroke-width="1.5"/>
      <circle cx="15" cy="15" r="6.5" fill="#fff8ee"/>
    </svg>`;

  const labelHtml = showLabel ? `
      <span style="
        max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        font-size:11px; font-weight:600; line-height:1.4; padding:2px 7px; border-radius:9px;
        background:var(--bg-surface,#1a1a1a); color:var(--tx,#fff); border:1px solid var(--bd-2,#444);
        box-shadow:0 1px 4px rgba(0,0,0,0.35); margin-bottom:2px; pointer-events:none;
      ">${escapeHtml(label)}</span>` : '';

  const html = `
    <div style="display:flex; flex-direction:column; align-items:center; overflow:visible;">
      ${labelHtml}
      ${pinSvg}
    </div>`;

  const totalW = showLabel ? 140 : svgW;
  const totalH = (showLabel ? LABEL_H : 0) + svgH;
  return L.divIcon({
    html,
    className: 'cr-pin',
    iconSize: [totalW, totalH],
    iconAnchor: [totalW / 2, totalH],
    popupAnchor: [0, -svgH],
  });
}

export function placingIcon() {
  return L.divIcon({
    html: `<div style="width:16px;height:16px;border-radius:50%;background:#c2542d;border:2px solid #fff;box-shadow:0 0 0 2px #1a1a1a99;"></div>`,
    className: 'cr-pin',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}
