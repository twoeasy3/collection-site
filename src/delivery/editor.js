// ============================================================================
// THE LEVEL EDITOR (delivery/editor.html): a level from above, its road drawn from its segments,
// with its pickups, obstacles and TANK RAGE targets on it. The road is edited as a table of
// segments; items are placed by clicking the road, moved by dragging, and changed or deleted once
// selected. "Play it" opens the game on the level as it stands (?edited: see main.js; a hidden
// level, so nothing is saved), and "Download .json" saves it, to drop into ./levels.
// Only the main road is drawn: everything else the level has (exits, zones, bridges, the tide...) is
// edited as JSON in the Special features box; a change to the road can leave it in the wrong place.
// ============================================================================
import './editor.css';
import { CONFIG } from './config.js';
import { LEVELS, HIDDEN_LEVELS, levelLabel } from './levels.js';
import { LEVEL_CARS, CARS } from './cars.js';
import { PICKUP_COLOR } from './render/pickupModels.js';

const $ = (id) => document.getElementById(id);
const view3d = $('view3d'); // (the 3D view: see show3d)
const LW = CONFIG.laneWidth, STEP = 2; // m between the points the road is drawn through
const THEMES = ['city', 'farm', 'beach', 'suburb', 'canberra', 'snow', 'singapore', 'singaporeNight', 'coast', 'safari',
  'airport', 'construction', 'hell', 'space', 'night', 'sea'];
const PICKUPS = Object.keys(PICKUP_COLOR);
const OBSTACLES = ['barrier', 'cone', 'sign', 'bale', 'potty', 'sewage', 'pile', 'beam', 'umbrella', 'surfboard', 'cooler', 'chair', 'mine'];
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const STORE = 'delivery_editor_level'; // (where "Play it" leaves the level for the game: see main.js)

// ---- the level being edited ----------------------------------------------------------------------
const sources = [
  ...LEVELS.map((l, i) => [`${levelLabel(i)}. ${l.name}`, l]),
  ...Object.entries(HIDDEN_LEVELS).map(([id, l]) => [`Hidden: ${l.name} (${id})`, l]),
];
const BLANK = { id: 'new-level', name: 'New Level', time: 150, tip: 50, lanes: 4,
  traffic: { darkvan: 0.4, commuter: 0.2, van: 0.2, bus: 0.1, police: 0.05 },
  segments: [{ length: 600, curve: 0 }, { length: 300, curve: 0.003 }, { length: 600, curve: 0 }], pickups: [], obstacles: [], targets: [] };
let level, selected = null, picked = null, tool = { kind: 'select' }; // (selected: an item; picked: a special feature)
const lists = () => { for (const k of ['pickups', 'obstacles', 'targets']) level[k] ||= []; };

// ---- the road's geometry -----------------------------------------------------------------------
// the centre line through every STEP m, x across and y up the map, h its heading (0: up the map)
let points = [];
const lanesOf = () => {
  const L = level.lanes ?? CONFIG.laneCount;
  return typeof L === 'object' ? { left: L.south ?? 0, right: L.north ?? 0 } : { left: Math.floor(L / 2), right: L - Math.floor(L / 2) };
};
const HM = () => (level.median || 0) * LW / 2;
const laneLat = (lane) => { // across the road, + to the right (as Track.laneOffset, on the main road)
  if (lane === 'left') return edges()[0] - shoulder() / 2; // (the shoulders)
  if (lane === 'right') return edges()[1] + shoulder() / 2;
  const { left } = lanesOf(), M = level.median || 0;
  if (lane < left) return -(HM() + (left - 1 - lane + 0.5) * LW);
  return HM() + (lane - left - M + 0.5) * LW;
};
const laneCount = () => { const { left, right } = lanesOf(); return left + right + (level.median || 0); };
const edges = () => { const { left, right } = lanesOf(); return [-(HM() + left * LW), HM() + right * LW]; };
const shoulder = () => level.shoulder ?? CONFIG.shoulder;
const build = () => {
  points = [];
  let x = 0, y = 0, h = 0, s = 0;
  points.push({ s, x, y, h });
  for (const seg of level.segments) {
    for (let d = 0; d < seg.length; d += STEP) {
      const step = Math.min(STEP, seg.length - d);
      h += (seg.curve || 0) * step;
      x += Math.sin(h) * step;
      y += Math.cos(h) * step;
      s += step;
      points.push({ s, x, y, h });
    }
  }
};
const length = () => points.length ? points[points.length - 1].s : 0;
const at = (s, lat = 0) => { // a point on the map, s along the road and lat across it
  const p = points[Math.max(0, Math.min(points.length - 1, Math.round(s / STEP)))];
  return { x: p.x + Math.cos(p.h) * lat, y: p.y - Math.sin(p.h) * lat };
};
const nearest = (x, y) => { // the road's nearest point to a map point: s along it, lat across it
  let best = null, bestD = Infinity;
  for (const p of points) {
    const d = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d < bestD) { bestD = d; best = p; }
  }
  return { s: best.s, lat: (x - best.x) * Math.cos(best.h) - (y - best.y) * Math.sin(best.h), off: Math.sqrt(bestD) };
};
const nearestLane = (lat) => { // (or shoulder: 'left' | 'right')
  const [a, b] = edges();
  if (lat < a) return 'left';
  if (lat > b) return 'right';
  let best = 0;
  for (let k = 1; k < laneCount(); k++) if (Math.abs(laneLat(k) - lat) < Math.abs(laneLat(best) - lat)) best = k;
  return best;
};
// where an item is on the map (items on a side road, which isn't drawn, aren't anywhere)
const itemAt = (list, it) => {
  if (it.road) return null;
  if (list === 'targets') return at(it.s, (it.side === 'left' ? edges()[0] - shoulder() : edges()[1] + shoulder()) + (it.side === 'left' ? -CONFIG.targetOffset : CONFIG.targetOffset) * 0.5);
  return at(it.s, laneLat(it.lane ?? 0));
};

// ---- the special features on the map: every entry of the level's special data that is somewhere
// along the road. A stretch (from..to, or an exit's exitAt..mergeAt) is a band beside the road, a
// row of its own for each kind; a point (s, or at, or a runway's from) a marker on the road.
// (Entries on a side road, which isn't drawn, are left out.)
const FEATURE_TEMPLATES = {
  stretches: { mud: {}, ice: {}, bridges: {}, narrows: { lanesPerSide: 1 }, frogs: {}, herds: { count: 6 },
    drifters: { kind: 'cone', count: 6, pattern: 'circle' }, dropBears: { count: 4 }, hippos: { every: { min: 6, max: 10 } } },
  points: { tractors: { lane: 2 }, parked: { side: 'right' } },
};
const features = () => {
  const out = [];
  for (const [key, value] of Object.entries(extras())) {
    const list = Array.isArray(value) ? value : value && typeof value === 'object' ? [value] : [];
    list.forEach((e, i) => {
      if (!e || typeof e !== 'object' || e.road) return;
      const f = { key, i: Array.isArray(value) ? i : -1, e };
      if (Number.isFinite(e.from) && Number.isFinite(e.to)) out.push({ ...f, a: 'from', b: 'to' });
      else if (Number.isFinite(e.exitAt) && Number.isFinite(e.mergeAt)) out.push({ ...f, a: 'exitAt', b: 'mergeAt' });
      else if (Number.isFinite(e.s)) out.push({ ...f, p: 's' });
      else if (Number.isFinite(e.at)) out.push({ ...f, p: 'at' });
      else if (Number.isFinite(e.from)) out.push({ ...f, p: 'from' });
    });
  }
  return out;
};
const hue = (key) => { let h = 0; for (const c of key) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const featureColor = (key, alpha = 1) => `hsla(${hue(key)}, 75%, 62%, ${alpha})`;
// how far out from the road's right edge a kind of stretch's row is, in metres (its row, in pixels)
const rowLat = (key, stretchKeys) => edges()[1] + shoulder() + (14 + stretchKeys.indexOf(key) * 11) / view.k;
const same = (f, g) => f && g && f.key === g.key && f.i === g.i;

// ---- the map -------------------------------------------------------------------------------------
const canvas = $('map'), pen = canvas.getContext('2d');
let view = { ox: 0, oy: 0, k: 1 }; // map point at the canvas's middle, and pixels a metre
const toScreen = (x, y) => [canvas.width / 2 + (x - view.ox) * view.k, canvas.height / 2 - (y - view.oy) * view.k];
const toMap = (px, py) => [view.ox + (px - canvas.width / 2) / view.k, view.oy - (py - canvas.height / 2) / view.k];
const fit = () => {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of points) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
  view = { ox: (x0 + x1) / 2, oy: (y0 + y1) / 2, k: Math.min(canvas.width / (x1 - x0 + 120), canvas.height / (y1 - y0 + 120)) };
};
const ribbon = (from, to, color) => { // the road between two offsets across it, the whole way along
  pen.beginPath();
  points.forEach((p, i) => { const [sx, sy] = toScreen(...Object.values(at(p.s, from))); i ? pen.lineTo(sx, sy) : pen.moveTo(sx, sy); });
  for (let i = points.length - 1; i >= 0; i--) pen.lineTo(...toScreen(...Object.values(at(points[i].s, to))));
  pen.fillStyle = color;
  pen.fill();
};
const lineAlong = (lat, color, dash = []) => {
  pen.beginPath();
  points.forEach((p, i) => { const [sx, sy] = toScreen(...Object.values(at(p.s, lat))); i ? pen.lineTo(sx, sy) : pen.moveTo(sx, sy); });
  pen.strokeStyle = color;
  pen.setLineDash(dash);
  pen.lineWidth = 1;
  pen.stroke();
  pen.setLineDash([]);
};
const across = (s, color, width) => { // a line across the road at s
  const [a, b] = edges(), [x1, y1] = toScreen(...Object.values(at(s, a - shoulder()))), [x2, y2] = toScreen(...Object.values(at(s, b + shoulder())));
  pen.beginPath(); pen.moveTo(x1, y1); pen.lineTo(x2, y2);
  pen.strokeStyle = color; pen.lineWidth = width; pen.stroke();
};
const draw = () => {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  pen.fillStyle = '#151a22';
  pen.fillRect(0, 0, canvas.width, canvas.height);
  if (points.length < 2) return;
  const [a, b] = edges();
  ribbon(a - shoulder(), b + shoulder(), '#3a4150');                          // the shoulders...
  ribbon(a, b, '#5a6272');                                                    // ...and the lanes
  if (view.k > 1.5) for (let k = 1; k < laneCount(); k++) lineAlong((laneLat(k - 1) + laneLat(k)) / 2, 'rgba(255,255,255,.35)', [6, 8]);
  for (let s = 500; s < length(); s += 500) { // every half a kilometre, marked
    across(s, 'rgba(255,255,255,.18)', 1);
    const [sx, sy] = toScreen(...Object.values(at(s, b + shoulder() + 6)));
    pen.fillStyle = '#aab3c2'; pen.font = '11px system-ui'; pen.fillText((s / 1000).toFixed(1) + ' km', sx, sy);
  }
  // the special features: stretches as bands beside the road, points as markers on it
  const all = features(), stretchKeys = [...new Set(all.filter(f => f.a).map(f => f.key))];
  pen.font = '11px system-ui';
  for (const f of all) {
    const on = same(f, picked);
    if (f.a) {
      const lat = rowLat(f.key, stretchKeys), from = Math.max(0, f.e[f.a]), to = Math.min(length(), f.e[f.b]);
      pen.beginPath();
      for (let s = from, first = true; s <= to; s += Math.max(STEP, 2 / view.k), first = false) {
        const [sx, sy] = toScreen(...Object.values(at(s, lat)));
        first ? pen.moveTo(sx, sy) : pen.lineTo(sx, sy);
      }
      pen.lineTo(...toScreen(...Object.values(at(to, lat))));
      pen.strokeStyle = featureColor(f.key, on ? 1 : 0.75);
      pen.lineWidth = on ? 9 : 7;
      pen.lineCap = 'butt';
      pen.stroke();
      if (on) { // (and the stretch shaded on the road itself)
        pen.beginPath();
        const [a, b] = edges();
        for (let s = from; s <= to; s += Math.max(STEP, 2 / view.k)) pen.lineTo(...toScreen(...Object.values(at(s, (a + b) / 2))));
        pen.strokeStyle = featureColor(f.key, 0.35);
        pen.lineWidth = Math.max(3, (b - a) * view.k);
        pen.stroke();
      }
      const [lx, ly] = toScreen(...Object.values(at(from, lat)));
      pen.fillStyle = featureColor(f.key);
      pen.fillText(f.key, lx + 6, ly - 6);
    } else {
      const [sx, sy] = toScreen(...Object.values(at(f.e[f.p], 0))), r = on ? 8 : 6;
      pen.beginPath();
      pen.moveTo(sx, sy - r); pen.lineTo(sx + r, sy); pen.lineTo(sx, sy + r); pen.lineTo(sx - r, sy); pen.closePath();
      pen.fillStyle = featureColor(f.key);
      pen.fill();
      pen.strokeStyle = on ? '#ffd23f' : '#11151c';
      pen.lineWidth = on ? 3 : 1;
      pen.stroke();
      pen.fillText(f.key, sx + r + 3, sy + 4);
    }
  }
  across(0, '#3ddc68', 3);                                                    // start
  across(length(), '#ffffff', 3);                                             // finish
  // the items
  for (const list of ['targets', 'obstacles', 'pickups']) {
    level[list].forEach((it, i) => {
      const p = itemAt(list, it);
      if (!p) return;
      const [sx, sy] = toScreen(p.x, p.y), r = Math.max(4, Math.min(9, view.k * 1.6));
      pen.beginPath();
      if (list === 'obstacles') pen.rect(sx - r, sy - r, r * 2, r * 2); else pen.arc(sx, sy, r, 0, Math.PI * 2);
      pen.fillStyle = list === 'pickups' ? hex(PICKUP_COLOR[it.type] ?? 0xffffff) : list === 'obstacles' ? '#ff8a3d' : 'rgba(57,255,106,.25)';
      pen.fill();
      pen.lineWidth = selected && selected.list === list && selected.i === i ? 3 : 1;
      pen.strokeStyle = selected && selected.list === list && selected.i === i ? '#ffd23f' : list === 'targets' ? '#39ff6a' : '#11151c';
      pen.stroke();
    });
  }
};

// ---- the panel -----------------------------------------------------------------------------------
const status = () => {
  const L = length(), good = (level.time || 1) * CONFIG.timeScale.good, evil = (level.time || 1) * CONFIG.timeScale.evil;
  $('length').textContent = (L / 1000).toFixed(2) + ' km';
  $('status').textContent = `${(L / 1000).toFixed(2)} km: an average of ${(L / good * 3.6).toFixed(0)} km/h needed playing Good, ` +
    `${(L / evil * 3.6).toFixed(0)} km/h Evil. ${level.pickups.length} pickups, ${level.obstacles.length} obstacles, ${level.targets.length} targets.`;
};
const changed = () => { build(); status(); draw(); };
const fields = () => {
  $('f-name').value = level.name || '';
  $('f-id').value = level.id || '';
  $('f-time').value = level.time ?? '';
  $('f-tip').value = level.tip ?? '';
  $('f-lanes').value = laneCount();
  $('f-theme').value = level.theme || 'city';
  $('f-car').value = level.car || '';
  $('f-flow').value = level.flow || '';
  $('f-traffic').value = Object.entries(level.traffic || {}).map(([k, v]) => `${k} ${v}`).join(', ');
  extraBox();
};
// ---- the special features: everything the rest of the panel doesn't edit, as JSON (see levels.js
// for what each is), applied as soon as it is valid
const EDITED = ['id', 'name', 'time', 'tip', 'lanes', 'theme', 'car', 'flow', 'traffic', 'segments', 'pickups', 'obstacles', 'targets'];
const extras = () => Object.fromEntries(Object.entries(level).filter(([k]) => !EDITED.includes(k)));
const extraNote = (text, bad) => {
  $('extraNote').textContent = text;
  $('extraNote').classList.toggle('bad', bad);
  $('extra').classList.toggle('bad', bad);
};
const extraBox = () => {
  $('extra').value = JSON.stringify(extras(), null, 2);
  const keys = Object.keys(extras());
  extraNote(keys.length ? `${keys.length} in this level: ${keys.join(', ')}. They aren't drawn on the map (the 3D view shows them); ` +
    'a change to the road can leave them out of place.' : 'None in this level. Add any from levels.js, e.g. "mud": [{ "from": 800, "to": 900 }]', false);
};
$('extra').addEventListener('input', (e) => {
  let parsed;
  try { parsed = JSON.parse(e.target.value || '{}'); } catch (error) { extraNote('Not valid JSON yet: ' + error.message, true); return; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) { extraNote('It should be one { } object of features.', true); return; }
  const ignored = Object.keys(parsed).filter(k => EDITED.includes(k));
  for (const k of Object.keys(extras())) delete level[k];
  for (const [k, v] of Object.entries(parsed)) if (!EDITED.includes(k)) level[k] = v;
  extraNote(ignored.length ? `Applied. (${ignored.join(', ')}: set in the panel above, not here.)` : `Applied: ${Object.keys(parsed).length} features.`, false);
  changed();
});
$('extra').addEventListener('keydown', (e) => { // (Tab indents, rather than leaving the box)
  if (e.key !== 'Tab') return;
  e.preventDefault();
  const box = e.target, at = box.selectionStart;
  box.setRangeText('  ', at, box.selectionEnd, 'end');
});
$('tidy').addEventListener('click', () => { if (!$('extra').classList.contains('bad')) extraBox(); });
const field = (id, apply) => $(id).addEventListener('input', (e) => { apply(e.target.value); changed(); });
field('f-name', (v) => { level.name = v; });
field('f-id', (v) => { level.id = v; });
field('f-time', (v) => { level.time = Number(v) || 0; });
field('f-tip', (v) => { level.tip = Number(v) || 0; });
field('f-lanes', (v) => { if (Number(v) >= 2) level.lanes = Math.round(Number(v)); });
field('f-theme', (v) => { if (v === 'city') delete level.theme; else level.theme = v; });
field('f-car', (v) => { if (v) level.car = v; else delete level.car; });
field('f-flow', (v) => { if (v) level.flow = v; else delete level.flow; });
field('f-traffic', (v) => {
  const mix = {};
  for (const part of v.split(',')) {
    const [kind, share] = part.trim().split(/\s+/);
    if (kind && CONFIG.vehicles[kind] && Number(share) >= 0) mix[kind] = Number(share);
  }
  level.traffic = mix;
});
$('f-theme').innerHTML = THEMES.map(t => `<option>${t}</option>`).join('');
$('f-car').innerHTML = '<option value="">the garage\'s</option>' + [...Object.keys(LEVEL_CARS), ...CARS.map(c => c.id)].map(c => `<option>${c}</option>`).join('');

// the road, as a table of its segments: length, how far it bends (degrees, + right) and its slope
const segmentRows = () => {
  $('segments').tBodies[0].innerHTML = level.segments.map((seg, i) => `<tr data-i="${i}">
    <td><input type="number" min="10" step="10" data-k="length" value="${seg.length}"></td>
    <td><input type="number" step="5" data-k="bend" value="${Math.round((seg.curve || 0) * seg.length * 180 / Math.PI)}"></td>
    <td><input type="number" step="0.5" data-k="grade" value="${((seg.grade || 0) * 100).toFixed(1)}"></td>
    <td class="ops"><button data-op="up" title="Move up">&uarr;</button><button data-op="down" title="Move down">&darr;</button><button data-op="del" title="Remove">&times;</button></td></tr>`).join('');
};
$('segments').addEventListener('input', (e) => {
  const row = e.target.closest('tr'), seg = level.segments[Number(row.dataset.i)], k = e.target.dataset.k, v = Number(e.target.value) || 0;
  const bend = (seg.curve || 0) * seg.length;
  if (k === 'length') { seg.length = Math.max(10, Math.round(v)); seg.curve = bend / seg.length; } // (keeping how far it bends)
  if (k === 'bend') seg.curve = v * Math.PI / 180 / seg.length;
  if (k === 'grade') { if (v) seg.grade = v / 100; else delete seg.grade; }
  if (!seg.curve) seg.curve = 0;
  changed();
});
$('segments').addEventListener('click', (e) => {
  const op = e.target.dataset.op;
  if (!op) return;
  const i = Number(e.target.closest('tr').dataset.i), S = level.segments;
  if (op === 'up' && i > 0) [S[i - 1], S[i]] = [S[i], S[i - 1]];
  if (op === 'down' && i < S.length - 1) [S[i + 1], S[i]] = [S[i], S[i + 1]];
  if (op === 'del' && S.length > 1) S.splice(i, 1);
  segmentRows();
  changed();
});
$('addSegment').addEventListener('click', () => { level.segments.push({ length: 300, curve: 0 }); segmentRows(); changed(); });

// the tools: select, or place a pickup, an obstacle or a target of a kind
const toolButton = (label, t, color) => `<button data-tool='${JSON.stringify(t)}'>${color ? `<span class="swatch" style="background:${color}"></span>` : ''}${label}</button>`;
$('tools').innerHTML = toolButton('Select / move', { kind: 'select' }) +
  '<h3>Pickups</h3>' + PICKUPS.map(p => toolButton(p, { kind: 'pickups', type: p }, hex(PICKUP_COLOR[p]))).join('') +
  '<h3>Obstacles</h3>' + OBSTACLES.map(o => toolButton(o, { kind: 'obstacles', type: o }, '#ff8a3d')).join('') +
  '<h3>TANK RAGE targets</h3>' + toolButton('left', { kind: 'targets', side: 'left' }, '#39ff6a') + toolButton('right', { kind: 'targets', side: 'right' }, '#39ff6a') +
  '<h3>Stretches (150 m, from where you click)</h3>' + Object.keys(FEATURE_TEMPLATES.stretches).map(k => toolButton(k, { kind: 'stretch', key: k }, featureColor(k))).join('') +
  '<h3>Points</h3>' + Object.keys(FEATURE_TEMPLATES.points).map(k => toolButton(k, { kind: 'point', key: k }, featureColor(k))).join('');
const showTool = () => { for (const b of $('tools').children) if (b.dataset.tool) b.classList.toggle('on', b.dataset.tool === JSON.stringify(tool)); };
const toolTo3d = () => { if (!view3d.hidden && view3d.contentWindow) view3d.contentWindow.postMessage({ type: 'tool', tool }, '*'); };
$('tools').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { tool = JSON.parse(b.dataset.tool); showTool(); toolTo3d(); } });
// the 3D view placing and removing items: the editor's copy of the level kept in step (see render/fly.js)
window.addEventListener('message', (e) => {
  const m = e.data;
  if (!m || e.source !== view3d.contentWindow) return;
  if (m.type === 'flyReady') toolTo3d();
  if (m.type === 'placed') {
    level[m.list].push(m.item);
    selected = { list: m.list, i: level[m.list].length - 1 };
    picked = null;
  }
  if (m.type === 'removed') {
    const i = level[m.list].findIndex(it => JSON.stringify(it) === JSON.stringify(m.item));
    if (i >= 0) level[m.list].splice(i, 1);
    selected = null;
  }
  if (m.type === 'placed' || m.type === 'removed') { itemPanel(); changed(); }
});

// the selected item's own settings
const featurePanel = () => {
  const box = $('item'), entry = picked.i < 0 ? level[picked.key] : level[picked.key][picked.i];
  box.innerHTML = `<h3 class="featureTitle" style="color:${featureColor(picked.key)}">${picked.key}${picked.i >= 0 ? ' #' + (picked.i + 1) : ''}</h3>
    <textarea id="featureJson" spellcheck="false">${JSON.stringify(entry, null, 2).replace(/</g, '&lt;')}</textarea>
    <div class="buttons"><button id="remove">Delete</button></div><p class="note" id="featureNote"></p>`;
};
$('item').addEventListener('input', (e) => {
  if (e.target.id !== 'featureJson' || !picked) return;
  let entry;
  try { entry = JSON.parse(e.target.value); } catch (error) { $('featureNote').textContent = 'Not valid JSON yet: ' + error.message; return; }
  if (picked.i < 0) level[picked.key] = entry; else level[picked.key][picked.i] = entry;
  $('featureNote').textContent = 'Applied.';
  extraBox();
  changed();
});
const itemPanel = () => {
  const box = $('item');
  if (picked) { featurePanel(); return; }
  if (!selected) { box.innerHTML = '<p class="note">Nothing selected.</p>'; return; }
  const it = level[selected.list][selected.i], kinds = selected.list === 'pickups' ? PICKUPS : OBSTACLES;
  box.innerHTML = `<div class="grid">
    ${selected.list === 'targets' ? `<label>Side <select data-k="side"><option>left</option><option>right</option></select></label>`
      : `<label>Kind <select data-k="${selected.list === 'pickups' ? 'type' : 'kind'}">${kinds.map(k => `<option>${k}</option>`).join('')}</select></label>
         <label>Lane <select data-k="lane">${['left', ...Array.from({ length: laneCount() }, (_, k) => k), 'right'].map(l => `<option value="${l}"${String(it.lane ?? 0) === String(l) ? ' selected' : ''}>${typeof l === 'string' ? l + ' shoulder' : l}</option>`).join('')}</select></label>`}
    <label>At (m) <input type="number" min="0" step="5" data-k="s" value="${it.s}"></label>
    <label>&nbsp;<button id="remove">Delete</button></label></div>`;
  const kind = box.querySelector('select');
  kind.value = it.side ?? it.type ?? it.kind ?? 'barrier';
};
$('item').addEventListener('input', (e) => {
  if (!selected) return;
  const it = level[selected.list][selected.i], k = e.target.dataset.k;
  if (!k) return;
  it[k] = k === 'lane' && (e.target.value === 'left' || e.target.value === 'right') ? e.target.value : k === 's' || k === 'lane' ? Math.max(0, Number(e.target.value) || 0) : e.target.value;
  changed();
});
const remove = () => {
  if (picked) { // (a special feature: out of its list, and the list too once it is empty)
    if (picked.i < 0 || level[picked.key].length <= 1) delete level[picked.key];
    else level[picked.key].splice(picked.i, 1);
    picked = null;
    extraBox();
  } else if (selected) level[selected.list].splice(selected.i, 1);
  else return;
  selected = null;
  itemPanel();
  changed();
};
$('item').addEventListener('click', (e) => { if (e.target.id === 'remove') remove(); });
window.addEventListener('keydown', (e) => {
  if ((e.key === 'Delete' || e.key === 'Backspace') && !/INPUT|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); remove(); }
});

// ---- the mouse on the map ------------------------------------------------------------------------
const hit = (px, py) => { // the item under a point on the canvas, if any
  for (const list of ['pickups', 'obstacles', 'targets']) {
    for (let i = level[list].length - 1; i >= 0; i--) {
      const p = itemAt(list, level[list][i]);
      if (!p) continue;
      const [sx, sy] = toScreen(p.x, p.y);
      if (Math.hypot(sx - px, sy - py) < 10) return { list, i };
    }
  }
  return null;
};
// the special feature under a point on the canvas, if any: a point's marker, or a stretch's band
// (grabbed by an end, to resize it, or in between, to move it)
const hitFeature = (px, py) => {
  const all = features(), stretchKeys = [...new Set(all.filter(f => f.a).map(f => f.key))];
  for (const f of all) {
    if (f.p) {
      const [sx, sy] = toScreen(...Object.values(at(f.e[f.p], 0)));
      if (Math.hypot(sx - px, sy - py) < 9) return { f, grab: 'p' };
      continue;
    }
    const lat = rowLat(f.key, stretchKeys);
    for (const end of ['a', 'b']) {
      const [sx, sy] = toScreen(...Object.values(at(f.e[f[end]], lat)));
      if (Math.hypot(sx - px, sy - py) < 8) return { f, grab: end };
    }
    for (let s = f.e[f.a]; s <= f.e[f.b]; s += Math.max(STEP, 3 / view.k)) {
      const [sx, sy] = toScreen(...Object.values(at(s, lat)));
      if (Math.hypot(sx - px, sy - py) < 6) return { f, grab: 'move' };
    }
  }
  return null;
};
let drag = null; // { item } being moved, { feature } being moved or resized, or { pan: [px, py] }
const local = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
canvas.addEventListener('pointerdown', (e) => {
  const [px, py] = local(e), got = hit(px, py);
  canvas.setPointerCapture(e.pointerId);
  if (got) { selected = got; picked = null; itemPanel(); drag = { item: got }; draw(); return; }
  const feature = tool.kind === 'select' || tool.kind === 'stretch' || tool.kind === 'point' ? hitFeature(px, py) : null;
  if (feature && tool.kind === 'select') {
    picked = { key: feature.f.key, i: feature.f.i };
    selected = null;
    itemPanel();
    const { f } = feature;
    drag = { feature: f, grab: feature.grab, start: nearest(...toMap(px, py)).s, a: f.a && f.e[f.a], b: f.b && f.e[f.b], p: f.p && f.e[f.p] };
    draw();
    return;
  }
  const n = nearest(...toMap(px, py)), [a, b] = edges();
  const onRoad = n.off < Math.max(Math.abs(a), b) + shoulder() + 4 && n.s > 0 && n.s < length();
  if ((tool.kind === 'stretch' || tool.kind === 'point') && onRoad) { // a special feature, from a template
    const s = Math.round(n.s), kinds = FEATURE_TEMPLATES[tool.kind === 'stretch' ? 'stretches' : 'points'];
    const entry = tool.kind === 'stretch' ? { from: s, to: Math.min(Math.round(length()), s + 150), ...kinds[tool.key] } : { s, ...kinds[tool.key] };
    if (!Array.isArray(level[tool.key])) level[tool.key] = [];
    level[tool.key].push(entry);
    picked = { key: tool.key, i: level[tool.key].length - 1 };
    selected = null;
    itemPanel();
    extraBox();
    changed();
    return;
  }
  if (tool.kind !== 'select' && onRoad) { // place one where the click is
    const s = Math.round(n.s), lane = nearestLane(n.lat);
    level[tool.kind].push(tool.kind === 'pickups' ? { type: tool.type, s, lane } : tool.kind === 'obstacles' ? { s, lane, kind: tool.type } : { s, side: tool.side });
    selected = { list: tool.kind, i: level[tool.kind].length - 1 };
    itemPanel();
    changed();
    return;
  }
  selected = null;
  picked = null;
  itemPanel();
  drag = { pan: [px, py] };
  draw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const [px, py] = local(e);
  if (drag.pan) {
    view.ox -= (px - drag.pan[0]) / view.k;
    view.oy += (py - drag.pan[1]) / view.k;
    drag.pan = [px, py];
  } else if (drag.feature) { // a feature: a point moved, a stretch moved or one of its ends dragged
    const { feature: f, grab } = drag, d = Math.round(nearest(...toMap(px, py)).s - drag.start);
    if (grab === 'p') f.e[f.p] = Math.max(0, drag.p + d);
    else if (grab === 'a') f.e[f.a] = Math.max(0, Math.min(f.e[f.b] - 10, drag.a + d));
    else if (grab === 'b') f.e[f.b] = Math.max(f.e[f.a] + 10, drag.b + d);
    else { f.e[f.a] = Math.max(0, drag.a + d); f.e[f.b] = f.e[f.a] + (drag.b - drag.a); }
  } else {
    const it = level[drag.item.list][drag.item.i], n = nearest(...toMap(px, py));
    it.s = Math.round(n.s);
    if (drag.item.list === 'targets') it.side = n.lat < 0 ? 'left' : 'right';
    else it.lane = nearestLane(n.lat);
    itemPanel();
    status();
  }
  draw();
});
canvas.addEventListener('pointerup', () => {
  if (drag && drag.feature) { itemPanel(); extraBox(); } // (the panel and the JSON box catch up with the drag)
  drag = null;
});
canvas.addEventListener('wheel', (e) => { // zoom about the pointer
  e.preventDefault();
  const [px, py] = local(e), [mx, my] = toMap(px, py), k = Math.max(0.02, Math.min(40, view.k * Math.exp(-e.deltaY * 0.0015)));
  view.k = k;
  const [nx, ny] = toMap(px, py);
  view.ox += mx - nx;
  view.oy += my - ny;
  draw();
}, { passive: false });
$('fit').addEventListener('click', () => { fit(); draw(); });
// the 3D view: the game itself, in the editor, on the level as it stands, with a free camera (?edited&fly)
const hand = () => { try { localStorage.setItem(STORE, JSON.stringify(level)); return true; } catch { return false; } };
const show3d = (on) => {
  view3d.hidden = !on;
  canvas.hidden = on;
  $('fit').hidden = on;
  $('refresh3d').hidden = !on;
  $('show3d').textContent = on ? 'Map' : '3D view';
  $('hint').innerHTML = on ? 'W A S D to fly &middot; drag to look &middot; E / Space up, Q / C down &middot; Shift faster &middot; scroll for speed &middot; ' +
      'click the road to place the tool picked in Place &middot; right-click an item to remove it'
    : 'Scroll to zoom &middot; drag the road to pan &middot; click to place or select &middot; drag an item to move it &middot; Delete removes it';
  if (on && hand()) view3d.src = './?edited&fly&v=' + Date.now(); // (afresh, with the edits so far)
  if (on) view3d.focus();
  if (!on) { view3d.src = 'about:blank'; draw(); }
};
$('show3d').addEventListener('click', () => show3d(view3d.hidden));
// (not on a touch screen: it is a whole second game running in the page, too much for a phone, and it is
// flown with a keyboard and mouse)
if (matchMedia('(hover: none) and (pointer: coarse)').matches) {
  $('show3d').disabled = true;
  $('show3d').title = 'The 3D view needs a keyboard and mouse (and more than a phone can spare)';
  $('show3d').textContent = '3D view (desktop only)';
}
$('refresh3d').addEventListener('click', () => show3d(true));
window.addEventListener('resize', () => draw());

// ---- open, play and download ---------------------------------------------------------------------
$('pick').innerHTML = '<option value="-1">A new, blank level</option>' + sources.map(([label], i) => `<option value="${i}">${label}</option>`).join('');
const open = (i) => {
  level = structuredClone(i < 0 ? BLANK : sources[i][1]);
  lists();
  selected = picked = null;
  fields(); segmentRows(); itemPanel(); build(); status();
  draw(); fit(); draw();
};
$('pick').addEventListener('change', (e) => open(Number(e.target.value)));
const play = (evil) => {
  try { localStorage.setItem(STORE, JSON.stringify(level)); } catch { $('status').textContent = 'Could not hand the level to the game (storage is blocked).'; return; }
  window.open('./?edited' + (evil ? '&evil' : ''), '_blank');
};
$('play').addEventListener('click', () => play(false));
$('playEvil').addEventListener('click', () => play(true));
$('download').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(level, null, 2) + '\n'], { type: 'application/json' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: (level.id || 'level') + '.json' });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$('pick').value = '0';
open(0);
showTool();
