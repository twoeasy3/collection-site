import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { LEVEL } from '../levels.js';
import { Track } from '../track.js';
import { Game } from '../game.js';
import { scene, tmp, applySky, applyLight, clearGroup } from './scene.js';
import { setHeadlights } from './headlights.js';

// ---- track meshes ----------------------------------------------------------
// flat strip following a road between lateral offsets latA and latB,
// each either a number or a function of s. Sits y above the road surface.
export const buildStrip = (sFrom, sTo, latA, latB, y, step = 4) => {
  const fa = typeof latA === 'function' ? latA : () => latA;
  const fb = typeof latB === 'function' ? latB : () => latB;
  const pos = [], idx = [];
  for (let n = 0; ; n++) {
    const s = Math.min(sFrom + n * step, sTo);
    Track.toWorld(s, fa(s), tmp); pos.push(tmp.x, tmp.y + y, tmp.z);
    Track.toWorld(s, fb(s), tmp); pos.push(tmp.x, tmp.y + y, tmp.z);
    if (n > 0) {
      const a = (n - 1) * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    if (s >= sTo) break;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  return geo;
};

// dashed line along lat(s), drawn only where show(s) is true
const buildDashes = (sFrom, sTo, lat, show) => {
  const pos = [], idx = [];
  const half = 0.08;
  let n = 0;
  for (let s = sFrom; s < sTo; s += CONFIG.dashSpacing) {
    if (!show(s)) continue;
    for (const [ds, dl] of [[0, -half], [0, half], [CONFIG.dashLength, -half], [CONFIG.dashLength, half]]) {
      Track.toWorld(s + ds, lat(s + ds) + dl, tmp);
      pos.push(tmp.x, tmp.y + 0.02, tmp.z);
    }
    idx.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
    n += 4;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  return geo;
};

// The looks a level can have (its "theme" field).
const THEMES = {
  city: { sky: 0x9fc4e8, ground: 0x5d8a4e, road: 0x3a3d42, scenery: 'city' },
  farm: { sky: 0xc4e6f5, ground: 0x8fb556, road: 0x57514a, scenery: 'farm' },
  // beach: sand, a stormy sky, the sea along the right, palms and beach huts
  beach: { sky: 0x7e8d9e, ground: 0xdccb95, road: 0x45484e, scenery: 'beach' },
  // space: no ground and no road surface, only glowing lane lines among the stars
  // singapore: the garden city: towers and housing blocks, rain trees, Supertrees and Marina Bay Sands
  singapore: { sky: 0xc9dde6, ground: 0x6d9a52, road: 0x3a3d42, scenery: 'singapore' },
  // snow: an alpine pass in winter. terrain: true = the land is a mountainside (see buildTerrain)
  snow: { sky: 0xd3dfe9, ground: 0xf0f4f7, road: 0x4f535a, scenery: 'alpine', terrain: true },
  // canberra: the bush capital: dry grass, gum trees and concrete, a grassy median
  canberra: { sky: 0xb9d8ee, ground: 0xa3ad66, road: 0x4a4c50, scenery: 'canberra', median: 0x7f9a4f },
  // suburb: lawns, pavements, picket fences and houses in a row
  suburb: { sky: 0xa9d6f5, ground: 0x6aa84f, road: 0x484b50, scenery: 'suburb' },
  hell: { sky: 0x2a0704, ground: 0x3a120a, road: 0x1b1414, scenery: 'hell', line: 0xffb36b },
  space: { sky: 0x05060d, ground: null, road: null, scenery: 'space', line: 0x7fe8ff, centre: 0xff62d6 },
  // night: the city after dark. The road and the ground are lit surfaces (lit: true), dark but
  // for a faint blue moon and the player's headlights; other cars show their own lamps.
  night: { sky: 0x05070e, ground: 0x34492d, road: 0x45484e, scenery: 'city', lit: true, headlights: true,
    light: { sky: 0x5d72b0, ground: 0x10141c, ambient: 0.3, sun: 0x9fb4ff, sunlight: 0.25 } },
};

// Everything built here for the loaded level goes in this group, which is emptied and
// rebuilt each time a level is loaded.
const levelGroup = new THREE.Group();
scene.add(levelGroup);

// ---- terrain (a theme with "terrain"): a mountainside --------------------------------------------
// The land round the road as a grid of heights, each blended from the heights of the road around
// it (the nearer a stretch of road, the more it counts), so the land climbs and falls with the road
// and fills in between its switchbacks: steep rock where two stretches at different heights come
// close, snow where it is gentler. It is flat, just under the road, for a strip each side of it,
// rougher the further it is from any road, and it sinks to the valley floor all round at the edge.
// Returns the height of the land at a world point (x, z).
const buildTerrain = () => {
  const pts = [], p = {};
  for (let s = Track.start; s <= Track.end; s += 8) {
    Track.toWorld(s, 0, p);
    pts.push(p.x, p.y, p.z);
  }
  const N = pts.length / 3;
  const flatTo = Math.max(Track.hi(0), -Track.lo(0)) + 12; // (wider than a grid square, so no slope reaches the road)
  const heightAt = (x, z) => {
    let best = Infinity, bestY = 0, wsum = 0, hsum = 0;
    for (let i = 0; i < N; i++) {
      const dx = x - pts[i * 3], dz = z - pts[i * 3 + 2], d2 = dx * dx + dz * dz;
      if (d2 < best) { best = d2; bestY = pts[i * 3 + 1]; }
      const w = 1 / (d2 * d2 + 1);
      wsum += w;
      hsum += w * pts[i * 3 + 1];
    }
    const d = Math.sqrt(best), road = bestY - 0.3;
    if (d < flatTo) return road;
    const away = d - flatTo;
    const rough = (Math.sin(x * 0.05) * Math.cos(z * 0.043) * 5 + Math.sin(x * 0.013 + z * 0.017) * 16) * Math.min(1, away / 90);
    const t = Math.min(1, away / 20);
    const h = road * (1 - t) + (hsum / wsum + rough) * t;
    return h * Math.min(1, Math.max(0, (340 - d) / 140)); // (down to the valley floor at the edge)
  };
  // the grid: every 8 m, over the road and 350 m round it
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let i = 0; i < N; i++) {
    x0 = Math.min(x0, pts[i * 3]); x1 = Math.max(x1, pts[i * 3]);
    z0 = Math.min(z0, pts[i * 3 + 2]); z1 = Math.max(z1, pts[i * 3 + 2]);
  }
  const G = 8, M = 350;
  const cols = Math.ceil((x1 - x0 + 2 * M) / G) + 1, rows = Math.ceil((z1 - z0 + 2 * M) / G) + 1;
  const pos = new Float32Array(cols * rows * 3), idx = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = x0 - M + c * G, z = z0 - M + r * G, k = (r * cols + c) * 3;
      pos[k] = x; pos[k + 1] = heightAt(x, z); pos[k + 2] = z;
      if (r && c) {
        const a = (r - 1) * cols + c - 1, b = a + 1, d = r * cols + c - 1, e = d + 1;
        idx.push(a, d, b, b, d, e);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  // snow where it is gentle, rock where it is steep
  const n = geo.attributes.normal, colors = new Float32Array(cols * rows * 3);
  const snow = new THREE.Color(0xf3f6f9), rock = new THREE.Color(0x767c84), mixed = new THREE.Color();
  for (let i = 0; i < cols * rows; i++) {
    mixed.copy(rock).lerp(snow, Math.min(1, Math.max(0, (n.getY(i) - 0.55) / 0.3)));
    colors[i * 3] = mixed.r; colors[i * 3 + 1] = mixed.g; colors[i * 3 + 2] = mixed.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const land = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  land.material.polygonOffset = true; // (the road always wins where they meet)
  land.material.polygonOffsetFactor = 2;
  land.material.polygonOffsetUnits = 2;
  levelGroup.add(land);
  return heightAt;
};

const buildRoad = () => {
  // a left-hand level is the game seen in a mirror: the whole scene drawn with x reversed
  scene.scale.x = Track.mirrored ? -1 : 1;
  clearGroup(levelGroup);
  const theme = THEMES[LEVEL.theme] || THEMES.city;
  applySky(theme.sky);
  applyLight(theme.light);
  setHeadlights(!!theme.headlights);
  const flat = (color) => new (theme.lit ? THREE.MeshLambertMaterial : THREE.MeshBasicMaterial)({ color, side: THREE.DoubleSide });
  const add = (geo, mat) => {
    // (a lit surface needs to know which way it faces; the strips are built without that)
    if (theme.lit && !geo.attributes.normal) geo.computeVertexNormals();
    return levelGroup.add(new THREE.Mesh(geo, mat));
  };
  const asphalt = flat(theme.road || 0), lineMat = flat(theme.line || 0xf2f2f2), centreMat = flat(theme.centre || 0xffc400);
  const pave = (geo) => { if (theme.road !== null) add(geo, asphalt); }; // (no road surface in space)
  const LW = CONFIG.laneWidth, ZONE = CONFIG.ramps.laneZone, RAMP = CONFIG.ramps.ramp;
  const exits = Track.exits;
  // painted markings lie a couple of centimetres above the road; this keeps them on top of it
  for (const mat of [lineMat, centreMat]) {
    mat.polygonOffset = true;
    mat.polygonOffsetFactor = -2;
    mat.polygonOffsetUnits = -2;
  }
  const line = (a, b, lat, mat = lineMat) =>
    add(buildStrip(a, b, (s) => lat(s) - 0.1, (s) => lat(s) + 0.1, 0.02), mat);

  // ---- expressway -------------------------------------------------------------------
  pave(buildStrip(Track.start, Track.end, Track.lo, Track.hi, 0));
  line(Track.start, Track.end, Track.laneLo);
  // right edge line: solid, along the outside of the exit / merge lane where there is one. At
  // each fork it is in two pieces: the expressway's own edge, which runs on under the side
  // road's pavement from the exit to the merge, and the extra lane's edge, which the side
  // road's own edge line carries on from. The two meet at the fork and part, like the roads.
  // A dashed line divides the extra lane from the lane beside it while it is open.
  {
    let from = Track.start;
    for (const x of [...exits].sort((a, b) => a.exitAt - b.exitAt)) {
      line(from, x.exitAt, Track.laneHi);
      line(x.exitAt, x.mergeAt, Track.edge);
      const open = (s) => Track.extraLane(s) > 0.3;
      add(buildDashes(x.exitAt - ZONE, x.exitAt, Track.edge, open), lineMat);
      add(buildDashes(x.mergeAt, x.mergeAt + ZONE, Track.edge, open), lineMat);
      from = x.mergeAt;
    }
    line(from, Track.end, Track.laneHi);
  }
  // double yellow centre line (a one-way road has an ordinary lane divider there instead, and
  // a road with a median a solid line along each side of it)
  const twoWay = Track.flow === 'both', HM = Track.medianHalf;
  if (!twoWay && Track.leftLanes && Track.rightLanes) add(buildDashes(Track.start, Track.end, () => 0, () => true), lineMat);
  for (const side of [-1, 1]) {
    if (twoWay && !HM) add(buildStrip(Track.start, Track.end, side * 0.12, side * 0.28, 0.02), centreMat);
    if (HM) line(Track.start, Track.end, () => side * HM);
    // dashed dividers between the lanes of each side, only where both lanes exist
    for (let k = 1; k < (side < 0 ? Track.leftLanes : Track.rightLanes); k++) {
      add(buildDashes(Track.start, Track.end, () => side * (HM + k * LW),
        (s) => Track.lanesOn(side, s) >= k + 0.95), lineMat);
    }
  }
  // the median: a strip of its own colour between those lines and, on a level with a railway, a
  // track down the middle of it: sleepers on ballast, and two rails
  if (HM) {
    add(buildStrip(Track.start, Track.end, -HM + 0.1, HM - 0.1, 0.01), flat(theme.median || 0x6f8f4a));
    if (LEVEL.railway) {
      const GAUGE = 1.435;
      const BED = CONFIG.railCrossing.width / 2;
      add(buildStrip(Track.start, Track.end, -BED, BED, 0.03), flat(0x8b8378));
      const sleeper = new THREE.InstancedMesh(new THREE.BoxGeometry(2.6, 0.12, 0.26), new THREE.MeshLambertMaterial({ color: 0x5e4b3a }),
        Math.ceil((Track.end - Track.start) / 0.7));
      const spot = new THREE.Object3D();
      let n = 0;
      for (let s = Track.start; s < Track.end; s += 0.7, n++) {
        spot.rotation.y = Track.toWorld(s, 0, tmp);
        spot.position.set(tmp.x, tmp.y + 0.08, tmp.z);
        spot.updateMatrix();
        sleeper.setMatrixAt(n, spot.matrix);
      }
      sleeper.count = n;
      levelGroup.add(sleeper);
      for (const side of [-1, 1]) {
        add(buildStrip(Track.start, Track.end, side * GAUGE / 2 - 0.04, side * GAUGE / 2 + 0.04, 0.2), flat(0xb8bcc4));
      }
    }
  }
  // ice patches: a pale, glassy sheet over the lane (or the whole road), with brighter streaks on it
  if (LEVEL.ice) {
    const sheet = new THREE.MeshBasicMaterial({ color: 0xd6eef8, transparent: true, opacity: 0.72, depthWrite: false,
      side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    const shine = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false,
      side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    for (const p of LEVEL.ice) {
      const a = (s) => p.lane === undefined ? Track.laneLo(s) : Track.laneOffset(p.lane, s) - LW / 2 + 0.15;
      const b = (s) => p.lane === undefined ? Track.laneHi(s) : Track.laneOffset(p.lane, s) + LW / 2 - 0.15;
      add(buildStrip(p.from, p.to, a, b, 0.025, 2), sheet);
      for (let k = 0; k < 3; k++) { // (streaks, staggered along it)
        const from = p.from + (p.to - p.from) * (0.1 + k * 0.27), to = from + (p.to - p.from) * 0.18, at = 0.25 + k * 0.25;
        const lat = (s) => a(s) + (b(s) - a(s)) * at;
        add(buildStrip(from, to, (s) => lat(s) - 0.12, (s) => lat(s) + 0.12, 0.03, 2), shine);
      }
    }
  }
  // start and finish lines
  add(buildStrip(-1, 0, Track.lo, Track.hi, 0.03, 1), lineMat);
  add(buildStrip(Track.length, Track.length + 2, Track.lo, Track.hi, 0.03, 1), flat(0xffd23f));

  // ---- each exit: side road, flyovers, sign ---------------------------------------------
  const deck = flat(0x8d9096);
  const steel = new THREE.MeshLambertMaterial({ color: 0x9a9da3 });
  const pillars = [];
  for (const x of exits) {
    // side road: two lanes, yellow centre line where both exist
    pave(buildStrip(x.side0, x.sideEnd, Track.lo, Track.hi, 0.005));
    line(x.side0, x.sideEnd, Track.laneLo);
    line(x.side0, x.sideEnd, Track.laneHi);
    if (twoWay) add(buildStrip(x.side0 + RAMP, x.sideEnd - RAMP, -0.08, 0.08, 0.02), centreMat);
    else add(buildDashes(x.side0 + RAMP, x.sideEnd - RAMP, () => 0, () => true), lineMat);

    // flyovers: raised decks with kerbs, so they read as structures
    // (they carry the oncoming traffic, so a one-way road has none)
    for (const from of twoWay ? [x.flyA0, x.flyB0] : []) {
      const to = from + CONFIG.ramps.flyoverLength;
      add(buildStrip(from, to, -LW / 2 - 0.4, LW / 2 + 0.4, 0.03, 3), deck);
      for (const side of [-1, 1]) {
        add(buildStrip(from, to, side * (LW / 2 + 0.15), side * (LW / 2 + 0.4), 0.5, 3), lineMat);
      }
      for (let s = from; s < to; s += 18) if (Track.flyPillar(s)) pillars.push(s);
    }

    // exit sign on a post beside the right shoulder, where the exit lane begins
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 160;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1b7a3a';
    ctx.fillRect(0, 0, 512, 160);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 496, 144);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT  ↗', 256, 78);
    ctx.font = 'bold 34px sans-serif';
    const saved = Math.round(x.span - x.length);
    ctx.fillText('side road  ' + (saved >= 0 ? saved + ' m shorter' : -saved + ' m longer'), 256, 128);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    const sAt = x.exitAt - ZONE;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.8), new THREE.MeshBasicMaterial({ map }));
    sign.rotation.y = Track.toWorld(sAt, Track.hi(sAt) - 3, tmp) + Math.PI; // faces oncoming drivers
    sign.scale.x = Track.mirrored ? -1 : 1; // (mirrored back on a left-hand level, so it still reads)
    sign.position.set(tmp.x, tmp.y + 8, tmp.z);
    levelGroup.add(sign);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 8, 0.5), steel);
    Track.toWorld(sAt, Track.hi(sAt) + 1.5, tmp);
    post.position.set(tmp.x, tmp.y + 4, tmp.z);
    levelGroup.add(post);
  }
  const dummy = new THREE.Object3D();
  if (pillars.length) {
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), steel, pillars.length);
    pillars.forEach((s, i) => {
      dummy.rotation.y = Track.toWorld(s, 0, tmp);
      dummy.position.set(tmp.x, tmp.y / 2, tmp.z);
      dummy.scale.set(1.2, tmp.y, 1.2);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    levelGroup.add(mesh);
  }

  // ---- ground and finish gate -----------------------------------------------------------------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), flat(theme.ground || 0));
  ground.visible = theme.ground !== null; // (space has none)
  ground.rotation.x = -Math.PI / 2;
  // The ground is drawn first and leaves no mark in the depth buffer, so everything else
  // simply draws over it. (A road a few centimetres above a plane this size is too fine a
  // gap to leave to depth testing: on some devices the grass showed through the road.)
  ground.renderOrder = -2;
  ground.material.depthWrite = false;
  Track.toWorld(Track.length / 2, 0, tmp);
  ground.position.set(tmp.x, -0.05, tmp.z);
  levelGroup.add(ground);

  const terrainAt = theme.terrain ? buildTerrain() : null; // (the height of the land at a world point)
  if (Track.hilly && theme.ground !== null && !theme.terrain) {
    // Hills: the land beside the road rises and falls with it. It is a wide ribbon of grass
    // just under the road, with a skirt sloping down to the flat ground along each edge.
    // It writes depth (pushed back a little, so the road always wins) so that a crest hides
    // what lies beyond it.
    const LAND = 130;
    const land = new THREE.Mesh(
      buildStrip(Track.start, Track.end, (s) => Track.lo(s) - LAND, (s) => Track.hi(s) + LAND, -0.04, 6), flat(theme.ground));
    land.material.polygonOffset = true;
    land.material.polygonOffsetFactor = 2;
    land.material.polygonOffsetUnits = 2;
    land.renderOrder = -1.5;
    levelGroup.add(land);
    const bank = flat(new THREE.Color(theme.ground).multiplyScalar(0.8));
    for (const side of [-1, 1]) {
      const pos = [], idx = [];
      let n = 0;
      for (let s = Track.start; s <= Track.end; s += 6, n++) {
        const top = (side < 0 ? Track.lo(s) : Track.hi(s)) + side * LAND;
        Track.toWorld(s, top, tmp);
        const drop = tmp.y; // the further it has to fall, the further out the foot of the slope
        pos.push(tmp.x, tmp.y - 0.04, tmp.z);
        Track.toWorld(s, top + side * (2 + drop * 2.5), tmp);
        pos.push(tmp.x, -0.04, tmp.z);
        if (n > 0) {
          const a = (n - 1) * 2;
          idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setIndex(idx);
      levelGroup.add(new THREE.Mesh(geo, bank));
    }
  }

  const hw = Track.hi(Track.length);
  const gateMat = new THREE.MeshLambertMaterial({ color: 0xffd23f });
  const gate = new THREE.Group();
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.6, 7, 0.6), gateMat);
    post.position.set(side * (hw + 0.5), 3.5, 0);
    gate.add(post);
  }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(hw * 2 + 1.6, 1.2, 0.6), gateMat);
  bar.position.y = 7;
  gate.add(bar);
  gate.rotation.y = Track.toWorld(Track.length, 0, tmp);
  gate.position.copy(tmp);
  levelGroup.add(gate);

  const beside = (side, s, d) => side < 0 ? Track.lo(s) - d : Track.hi(s) + d; // d metres off the pavement
  // one draw call per kind of thing. list entries: [s, lat, y, sx, sy, sz]
  const instances = (geometry, color, list, glowing) => {
    if (!list.length) return;
    const material = glowing ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.InstancedMesh(geometry, material, list.length);
    list.forEach(([s, lat, y, sx, sy, sz], i) => {
      dummy.rotation.y = Track.toWorld(s, lat, tmp);
      dummy.position.set(tmp.x, tmp.y + y, tmp.z);
      dummy.scale.set(sx, sy, sz);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    levelGroup.add(mesh);
  };
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const tube = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
  const cone = new THREE.ConeGeometry(0.5, 1, 8);

  if (theme.scenery === 'city') {
    // ---- roadside poles and blocks (instanced), so speed is readable -----------------------------
    // nothing is put where it would stand on another road, at a junction, or in a river
    // (a one-way road has no flyovers, so only the ramps themselves need to be kept clear)
    const junction = (s) => exits.some(x => twoWay
      ? (s > x.landingAt - 60 && s < x.exitAt + 120) || (s > x.mergeAt - 120 && s < x.flyoverAt + 60)
      : (s > x.exitAt - 20 && s < x.exitAt + 120) || (s > x.mergeAt - 120 && s < x.mergeAt + 20));
    const nearBridge = (s) => (LEVEL.bridges || []).some(b => s > b.from - 30 && s < b.to + 30);
    const poleSpots = [], blockSpots = [];
    for (let s = Track.start; s < Track.end; s += CONFIG.poleSpacing) {
      if (Track.onBridge(s) || junction(s)) continue;
      poleSpots.push([s, Track.lo(s) - 1.5], [s, Track.hi(s) + 1.5]);
    }
    for (let s = Track.start; s < Track.end; s += CONFIG.buildingSpacing) {
      if (!junction(s) && !nearBridge(s)) blockSpots.push([s, -1, true], [s, 1, true]);
    }
    for (const x of exits) {
      for (let s = x.side0 + 130; s < x.sideEnd - 130; s += CONFIG.poleSpacing) {
        poleSpots.push([s, Track.lo(s) - 1.5], [s, Track.hi(s) + 1.5]);
      }
      for (let s = x.side0 + 140; s < x.sideEnd - 140; s += CONFIG.buildingSpacing) {
        blockSpots.push([s, -1, false], [s, 1, false]);
      }
    }
    const poles = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 5, 0.3),
      new THREE.MeshLambertMaterial({ color: 0xd9d9d9 }), poleSpots.length);
    poleSpots.forEach(([s, lat], i) => {
      dummy.rotation.y = Track.toWorld(s, lat, tmp);
      dummy.position.set(tmp.x, tmp.y + 2.5, tmp.z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      poles.setMatrixAt(i, dummy.matrix);
    });
    levelGroup.add(poles);

    const blocks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshLambertMaterial({ color: 0x8b93a1 }), blockSpots.length);
    blockSpots.forEach(([s0, side, onMain], i) => {
      const s = s0 + Math.random() * 10;
      const w = 6 + Math.random() * 10, h = 5 + Math.random() * 22, d = 6 + Math.random() * 12;
      const far = 8 + w / 2 + Math.random() * 30;
      const lat = side < 0 ? Track.lo(s) - far : Track.hi(s) + far;
      dummy.rotation.y = Track.toWorld(s, lat, tmp);
      // skip any that would land on, or right beside, the other road
      const clash = onMain ? Track.sideDistance(tmp.x, tmp.z) < 24 : Track.mainDistance(tmp.x, tmp.z) < 30;
      dummy.position.set(tmp.x, tmp.y + h / 2, tmp.z);
      if (clash) dummy.scale.setScalar(0); // (gone entirely: flattening it alone left its roof hanging in the air)
      else dummy.scale.set(w, h, d);
      dummy.updateMatrix();
      blocks.setMatrixAt(i, dummy.matrix);
    });
    levelGroup.add(blocks);
  } else if (theme.scenery === 'farm') {
    // ---- farm: fenced fields of crops, trees, barns, silos and hay stacks -------------------------
    // fields: strips of different crops running alongside the road, drawn just after the ground
    const crops = [0xd9b84a, 0x6fae45, 0x9a7b4f, 0xc7d44f];
    for (const side of [-1, 1]) {
      for (let s = Track.start, k = side > 0 ? 0 : 2; s < Track.end; s += 140, k++) {
        const field = new THREE.Mesh(
          buildStrip(s, Math.min(Track.end, s + 132), (q) => beside(side, q, 4), (q) => beside(side, q, 110), -0.03, 8),
          new THREE.MeshBasicMaterial({ color: crops[k % crops.length], side: THREE.DoubleSide, depthWrite: false }));
        field.renderOrder = -1;
        levelGroup.add(field);
      }
      // a two-rail fence along the roadside: it also makes speed readable
      for (const y of [0.5, 1.0]) {
        add(buildStrip(Track.start, Track.end, (q) => beside(side, q, 1.32), (q) => beside(side, q, 1.48), y), flat(0x8a6a45));
      }
    }
    const posts = [], trunks = [], crowns = [], barns = [], roofs = [], silos = [], caps = [], stacks = [];
    for (let s = Track.start; s < Track.end; s += 6) {
      for (const side of [-1, 1]) posts.push([s, beside(side, s, 1.4), 0.6, 0.2, 1.2, 0.2]);
    }
    for (let s = Track.start; s < Track.end; s += 26) {
      for (const side of [-1, 1]) {
        const roll = Math.random(), at = s + Math.random() * 14;
        if (roll < 0.5) { // a tree
          const h = 4 + Math.random() * 4, lat = beside(side, at, 7 + Math.random() * 45);
          trunks.push([at, lat, h * 0.2, 0.6, h * 0.4, 0.6]);
          crowns.push([at, lat, h * 0.75, h * 0.6, h * 0.9, h * 0.6]);
        } else if (roll < 0.58) { // a red barn with a dark roof
          const lat = beside(side, at, 22 + Math.random() * 30);
          barns.push([at, lat, 3, 10, 6, 14]);
          roofs.push([at, lat, 6.6, 10.8, 1.2, 14.8]);
        } else if (roll < 0.64) { // a silo
          const lat = beside(side, at, 18 + Math.random() * 30);
          silos.push([at, lat, 6, 5, 12, 5]);
          caps.push([at, lat, 13.2, 5.4, 2.4, 5.4]);
        } else if (roll < 0.78) { // a stack of hay in the field
          stacks.push([at, beside(side, at, 8 + Math.random() * 30), 0.8, 2.4, 1.6, 2.4]);
        }
      }
    }
    instances(cube, 0x7a5a3a, posts);
    instances(tube, 0x6b4a2b, trunks);
    instances(cone, 0x3f8f3f, crowns);
    instances(cube, 0xb5382e, barns);
    instances(cube, 0x4a3a34, roofs);
    instances(tube, 0xc9ccd1, silos);
    instances(cone, 0x8a8f96, caps);
    instances(tube, 0xe0c060, stacks);
  } else if (theme.scenery === 'beach') {
    // ---- beach: the sea along the right with a line of surf, palms, umbrellas and huts ---------
    for (const [a, b, color, order] of [[30, 600, 0x2f6f9f, -1], [28, 32, 0xd8e6ea, -0.9]]) {
      const water = new THREE.Mesh(buildStrip(Track.start, Track.end, (q) => beside(1, q, a), (q) => beside(1, q, b), -0.03, 8),
        new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, depthWrite: false }));
      water.renderOrder = order;
      levelGroup.add(water);
    }
    const trunks = [], crowns = [], poles = [], shades = [], huts = [], roofs = [];
    for (let s = Track.start; s < Track.end; s += 18) {
      for (const side of [-1, 1]) {
        const roll = Math.random(), at = s + Math.random() * 12;
        // the sea side has the beach: umbrellas and huts between the road and the water,
        // palms behind the road on the land side and here and there along the shore
        if (side > 0 && roll < 0.35) {
          const lat = beside(1, at, 6 + Math.random() * 18);
          poles.push([at, lat, 1.2, 0.12, 2.4, 0.12]);
          shades.push([at, lat, 2.5, 3, 0.9, 3]);
        } else if (side > 0 && roll < 0.45) {
          const lat = beside(1, at, 8 + Math.random() * 12);
          huts.push([at, lat, 1.4, 3.2, 2.8, 3.2]);
          roofs.push([at, lat, 3.3, 3.8, 1.2, 3.8]);
        } else if (roll < (side > 0 ? 0.6 : 0.5)) {
          const h = 6 + Math.random() * 5, lat = beside(side, at, side > 0 ? 4 + Math.random() * 20 : 5 + Math.random() * 50);
          trunks.push([at, lat, h / 2, 0.5, h, 0.5]);
          crowns.push([at, lat, h + 0.4, 6, 1.8, 6]);
        }
      }
    }
    instances(tube, 0x8a6a45, trunks);
    instances(cone, 0x3f9f4f, crowns);
    instances(tube, 0xf4f4f4, poles);
    instances(cone, 0xff6a5a, shades, true);
    instances(cube, 0x62b0d8, huts);
    instances(cone, 0xf2e3c4, roofs);
  } else if (theme.scenery === 'suburb') {
    // ---- suburb: a pavement each side, then lots: a front lawn behind a picket fence, a house
    // with a door and windows facing the road, a driveway and a mailbox; here and there a little
    // park of trees instead. Trees in the gardens, and street lamps along the pavement.
    for (const side of [-1, 1]) {
      add(buildStrip(Track.start, Track.end, (q) => beside(side, q, 0.4), (q) => beside(side, q, 2.4), 0.03), flat(0xcfd0cb));
    }
    const WALLS = [0xf2e6c9, 0xbfd8e8, 0xf0c9b0, 0xd9e5c3, 0xe8d0e0, 0xfafafa];
    const walls = WALLS.map(() => []), roofs = [], doors = [], windows = [], drives = [];
    const pickets = [], rails = [], mailPosts = [], mailboxes = [], trunks = [], crowns = [], lampPosts = [], lampHeads = [];
    const tree = (at, lat) => {
      const h = 0.8 + Math.random() * 0.5;
      trunks.push([at, lat, 1.2 * h, 0.35, 2.4 * h, 0.35]);
      crowns.push([at, lat, 3.6 * h, 3.4 * h, 3.0 * h, 3.4 * h]);
    };
    const FENCE = 2.8, LOT = 26; // m off the pavement edge to the fence; m along the road per lot
    // (nothing goes where it would stand on a side road)
    const clear = (s, lat) => !exits.length || (Track.toWorld(s, lat, tmp), Track.sideDistance(tmp.x, tmp.z) > 24);
    for (const side of [-1, 1]) {
      for (let s = Track.start + (side > 0 ? 0 : LOT / 2); s < Track.end - LOT; s += LOT) {
        const mid = s + LOT / 2;
        if (!clear(mid, beside(side, mid, 12))) continue;
        if (Math.random() < 0.12) { // a little park
          for (let k = 0; k < 4; k++) tree(s + Math.random() * LOT, beside(side, mid, 5 + Math.random() * 22));
          continue;
        }
        const along = 9 + Math.random() * 4, across = 8 + Math.random() * 3;
        const tall = Math.random() < 0.4, h = tall ? 6 : 3.4;
        const front = 9 + Math.random() * 3; // m of front lawn, from the pavement edge to the house
        const lat = beside(side, mid, front + across / 2), face = beside(side, mid, front - 0.06);
        walls[Math.floor(Math.random() * WALLS.length)].push([mid, lat, h / 2, across, h, along]);
        roofs.push([mid, lat, h + 1.1, across * 1.12, 2.2, along * 1.12]);
        doors.push([mid - 1.5, face, 1.1, 0.12, 2.2, 1.1]);
        for (const floor of tall ? [1.6, 4.4] : [1.6]) {
          windows.push([mid + 2.2, face, floor, 0.1, 1.2, 1.7]);
          if (floor > 2) windows.push([mid - 1.5, face, floor, 0.1, 1.2, 1.7]);
        }
        // the driveway, beside the house, from the pavement to its far side, with the mailbox at its end
        const drive = mid + along / 2 + 2;
        drives.push([drive, beside(side, drive, (front + across) / 2 + 1.2), 0.03, front + across - 2.4, 0.06, 3.2]);
        mailPosts.push([drive - 2.3, beside(side, drive - 2.3, FENCE - 0.3), 0.5, 0.1, 1.0, 0.1]);
        mailboxes.push([drive - 2.3, beside(side, drive - 2.3, FENCE - 0.3), 1.1, 0.32, 0.3, 0.55]);
        // the picket fence along the front of the lot, open where the driveway crosses it
        for (const [from, to] of [[s, drive - 1.8], [drive + 1.8, s + LOT]]) {
          if (to - from < 1) continue;
          for (let q = from; q <= to; q += 1.2) pickets.push([q, beside(side, q, FENCE), 0.45, 0.1, 0.9, 0.1]);
          for (const y of [0.3, 0.65]) rails.push([(from + to) / 2, beside(side, (from + to) / 2, FENCE), y, 0.06, 0.08, to - from]);
        }
        if (Math.random() < 0.6) tree(s + 2 + Math.random() * 5, beside(side, s, FENCE + 2 + Math.random() * 3)); // in the front garden
        tree(mid + Math.random() * 8 - 4, beside(side, mid, front + across + 5 + Math.random() * 10));   // and the back
      }
    }
    for (let s = Track.start, k = 0; s < Track.end; s += 55, k++) { // street lamps, each side in turn
      const side = k % 2 ? 1 : -1;
      if (!clear(s, beside(side, s, 0.8))) continue;
      lampPosts.push([s, beside(side, s, 0.8), 2.75, 0.16, 5.5, 0.16]);
      lampHeads.push([s, beside(side, s, 0.2), 5.45, 1.2, 0.18, 0.4]);
    }
    // (a four-sided cone turned an eighth is a square pyramid over a unit square: a hip roof)
    const roof = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4);
    WALLS.forEach((color, i) => instances(cube, color, walls[i]));
    instances(roof, 0x6b4a3f, roofs);
    instances(cube, 0x7a3b2e, doors);
    instances(cube, 0x9cc7e0, windows);
    instances(cube, 0x9a9a95, drives);
    instances(cube, 0xffffff, pickets);
    instances(cube, 0xffffff, rails);
    instances(cube, 0x5a5a5a, mailPosts);
    instances(cube, 0x2a4a8a, mailboxes);
    instances(tube, 0x6b4a2b, trunks);
    instances(new THREE.SphereGeometry(0.5, 10, 8), 0x3f8f3f, crowns);
    instances(cube, 0x55595f, lampPosts);
    instances(cube, 0xfff3c4, lampHeads, true);
  } else if (theme.scenery === 'canberra') {
    // ---- canberra: gum trees in the dry grass, concrete government blocks set back from the road,
    // kangaroos, Lake Burley Griffin under each bridge with the Captain Cook jet, Black Mountain and
    // its tower off to the left, and Parliament House and its flag mast past the finish
    const trunks = [], leaves = [], blocks = [], bands = [], roos = [], heads = [];
    const gum = (at, lat) => {
      const h = 7 + Math.random() * 6;
      trunks.push([at, lat, h / 2, 0.45, h, 0.45]);
      for (let k = 0; k < 3; k++) { // (clumps of leaves, untidy, up the top of it)
        const size = 2.2 + Math.random() * 2;
        leaves.push([at + Math.random() * 2 - 1, lat + Math.random() * 2 - 1, h * (0.7 + k * 0.15), size, size * 0.7, size]);
      }
    };
    const nearLake = (s) => (LEVEL.bridges || []).some(b => s > b.from - 40 && s < b.to + 40);
    for (let s = Track.start; s < Track.end; s += 14) {
      if (nearLake(s)) continue;
      for (const side of [-1, 1]) {
        const roll = Math.random(), at = s + Math.random() * 10;
        if (roll < 0.45) gum(at, beside(side, at, 4 + Math.random() * 50));
        else if (roll < 0.5) { // a kangaroo or two, sitting up in the grass
          const lat = beside(side, at, 8 + Math.random() * 30);
          roos.push([at, lat, 0.75, 0.7, 1.3, 0.8]);
          heads.push([at + 0.3, lat, 1.55, 0.35, 0.45, 0.5]);
        }
      }
    }
    for (let s = Track.start + 60, k = 0; s < Track.end; s += 110, k++) { // concrete blocks, each side in turn
      if (nearLake(s) || nearLake(s + 40)) continue;
      const side = k % 2 ? 1 : -1, w = 26 + Math.random() * 22, h = 8 + Math.random() * 7, d = 14 + Math.random() * 10;
      const lat = beside(side, s, 28 + d / 2 + Math.random() * 25);
      blocks.push([s, lat, h / 2, d, h, w]);
      for (let y = 2.4; y < h - 1; y += 3) bands.push([s, lat, y, d + 0.1, 0.9, w + 0.1]); // (rows of windows)
    }
    instances(tube, 0xe3dccb, trunks);
    instances(new THREE.SphereGeometry(0.5, 8, 6), 0x7e9468, leaves);
    instances(cube, 0xbdb6a8, blocks);
    instances(cube, 0x3e464f, bands);
    instances(new THREE.SphereGeometry(0.5, 8, 6), 0x8a6a4a, roos);
    instances(new THREE.SphereGeometry(0.5, 8, 6), 0x7a5c3e, heads);
    // the lake under each bridge, out to either side, and the jet (a plume of spray) on the left
    for (const b of LEVEL.bridges || []) {
      for (const side of [-1, 1]) {
        const lake = new THREE.Mesh(buildStrip(b.from - 20, b.to + 20, (q) => beside(side, q, 2), (q) => beside(side, q, 500), -0.02, 8),
          new THREE.MeshBasicMaterial({ color: 0x4f86a8, side: THREE.DoubleSide, depthWrite: false }));
        lake.renderOrder = -1;
        levelGroup.add(lake);
      }
      const jet = new THREE.Mesh(new THREE.ConeGeometry(4, 70, 12, 1, true), new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }));
      Track.toWorld((b.from + b.to) / 2, beside(-1, (b.from + b.to) / 2, 160), tmp);
      jet.position.set(tmp.x, 35, tmp.z);
      levelGroup.add(jet);
    }
    // Black Mountain, with Telstra Tower on top: a third of the way along, off to the left
    {
      const at = Track.length / 3;
      Track.toWorld(at, beside(-1, at, 380), tmp);
      const hill = new THREE.Mesh(new THREE.ConeGeometry(160, 70, 16), new THREE.MeshLambertMaterial({ color: 0x5f7448 }));
      hill.position.set(tmp.x, 35, tmp.z);
      const concrete = new THREE.MeshLambertMaterial({ color: 0xd8d8d2 });
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.2, 120, 12), concrete);
      shaft.position.set(tmp.x, 70 + 60, tmp.z);
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(9, 7, 14, 16), concrete);
      pod.position.set(tmp.x, 70 + 80, tmp.z);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.2, 50, 8), concrete);
      mast.position.set(tmp.x, 70 + 145, tmp.z);
      levelGroup.add(hill, shaft, pod, mast);
    }
    // Parliament House, just past the end of the road: a long low front, and the flag mast on its
    // four legs over the middle, flying the flag
    {
      const at = Track.end + 140, h = Track.toWorld(at, 0, tmp);
      const house = new THREE.Group();
      const white = new THREE.MeshLambertMaterial({ color: 0xece8de });
      const front = new THREE.Mesh(new THREE.BoxGeometry(220, 14, 40), white);
      front.position.y = 7;
      const hill = new THREE.Mesh(new THREE.SphereGeometry(60, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x6f8f4a }));
      hill.scale.set(1.8, 0.35, 1.2);
      hill.position.z = 40;
      house.add(front, hill);
      const steel = new THREE.MeshLambertMaterial({ color: 0xc9ccd1 });
      for (const [x, z] of [[-14, 25], [14, 25], [-14, 55], [14, 55]]) { // the four legs, leaning in to the top
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 82, 6), steel);
        leg.position.set(x / 2, 40, (z + 40) / 2);
        leg.lookAt(0, 81, 40);
        leg.rotateX(Math.PI / 2);
        house.add(leg);
      }
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 30, 6), steel);
      pole.position.set(0, 95, 40);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), new THREE.MeshBasicMaterial({ color: 0x0b2a6f, side: THREE.DoubleSide }));
      flag.position.set(6, 106, 40);
      house.add(pole, flag);
      house.rotation.y = h;
      house.position.copy(tmp);
      levelGroup.add(house);
    }
  } else if (theme.scenery === 'singapore') {
    // ---- singapore: pavements, rain trees along the road, glass towers, housing blocks with bands
    // of colour and low shophouses set back from it, a grove of Supertrees, and Marina Bay Sands
    // by the finish. Nothing stands on a junction or its arms, nor on another stretch of road.
    const p = {};
    const clearOf = (x, z, margin) => Track.mainDistance(x, z) > Math.max(Track.hi(0), -Track.lo(0)) + margin &&
      !Track.junctions.some(jn => jn.arms.some(arm => {
        const dx = x - jn.centre.x, dz = z - jn.centre.z, u = dx * arm.dir.x + dz * arm.dir.z;
        const v = Math.abs(-dx * arm.dir.z + dz * arm.dir.x);
        return u > -jn.half - margin && u < arm.length + margin && v < jn.half + margin;
      }) || Math.hypot(x - jn.centre.x, z - jn.centre.z) < jn.half * 1.5 + margin);
    // pavements, broken off at each junction
    const breaks = Track.junctions.map(jn => [jn.s - 6, jn.end + 6]);
    for (const side of [-1, 1]) {
      let from = Track.start;
      for (const [a, b] of [...breaks, [Track.end, Track.end]]) {
        if (a > from) add(buildStrip(from, a, (q) => beside(side, q, 0.4), (q) => beside(side, q, 3), 0.03), flat(0xc9c7c0));
        from = b;
      }
    }
    const trunks = [], canopies = [], towers = [], glass = [], blocks = [], bands = [], shops = [], roofs = [];
    for (let s = Track.start; s < Track.end; s += 16) {
      for (const side of [-1, 1]) {
        const lat = beside(side, s, 4.5);
        Track.toWorld(s, lat, p);
        if (!clearOf(p.x, p.z, 4)) continue;
        trunks.push([s, lat, 1.8, 0.5, 3.6, 0.5]);
        canopies.push([s, lat, 4.6, 9, 2.6, 9]); // (a rain tree: a wide, flat umbrella of leaves)
      }
    }
    for (let s = Track.start, k = 0; s < Track.end; s += 30, k++) {
      for (const side of [-1, 1]) {
        const roll = Math.random(), w = 16 + Math.random() * 14, d = 16 + Math.random() * 14;
        const lat = beside(side, s, 16 + d / 2 + Math.random() * 30);
        Track.toWorld(s, lat, p);
        if (!clearOf(p.x, p.z, Math.max(w, d) / 2 + 6)) continue;
        if (roll < 0.4) { // a glass tower, with a lighter crown
          const h = 60 + Math.random() * 100;
          towers.push([s, lat, h / 2, d, h, w]);
          glass.push([s, lat, h + 2, d * 0.8, 4, w * 0.8]);
        } else if (roll < 0.8) { // a housing block, with bands of colour
          const h = 30 + Math.random() * 25;
          blocks.push([s, lat, h / 2, d * 0.7, h, w * 1.3]);
          for (let y = 3; y < h - 1; y += 6) bands.push([s, lat, y, d * 0.7 + 0.1, 0.8, w * 1.3 + 0.1]);
        } else { // a row of shophouses
          const h = 9 + Math.random() * 4;
          shops.push([s, lat, h / 2, d * 0.6, h, w]);
          roofs.push([s, lat, h + 0.6, d * 0.65, 1.2, w + 0.4]);
        }
      }
    }
    instances(tube, 0x6b5440, trunks);
    instances(new THREE.SphereGeometry(0.5, 10, 6), 0x4f8a3c, canopies);
    instances(cube, 0x6fa3b8, towers);
    instances(cube, 0xe8f1f4, glass);
    instances(cube, 0xf1e4c9, blocks);
    instances(cube, 0x3f8f8a, bands);
    instances(cube, 0xe7b48a, shops);
    instances(cube, 0x9c4a3a, roofs);
    // a grove of Supertrees, half way along on the right: purple trunks widening up to a flat crown
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7b3fa8 }), crownMat = new THREE.MeshLambertMaterial({ color: 0xd9468f });
    for (let k = 0, tries = 0; k < 7 && tries < 60; tries++) {
      const at = Track.length * 0.5 + Math.random() * 120 - 60;
      Track.toWorld(at, beside(1, at, 45 + Math.random() * 60), p);
      if (!clearOf(p.x, p.z, 12)) continue;
      const h = 22 + Math.random() * 26;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 1.2, h, 10), trunkMat);
      trunk.position.set(p.x, p.y + h / 2, p.z);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(7, 4, 2.2, 14), crownMat);
      crown.position.set(p.x, p.y + h + 1.1, p.z);
      levelGroup.add(trunk, crown);
      k++;
    }
    // Marina Bay Sands by the finish, on the left: three towers with the boat of a park across their tops
    for (let tries = 0, at = Track.length - 40; tries < 20; tries++, at -= 15) {
      const h = Track.toWorld(at, beside(-1, at, 120), p);
      if (!clearOf(p.x, p.z, 70)) continue;
      const fx = Math.sin(h), fz = Math.cos(h), white = new THREE.MeshLambertMaterial({ color: 0xe9ecee });
      for (const k of [-1, 0, 1]) {
        const tower = new THREE.Mesh(new THREE.BoxGeometry(30, 190, 16), white);
        tower.position.set(p.x + fx * k * 38, p.y + 95, p.z + fz * k * 38);
        tower.rotation.y = h + Math.PI / 2;
        levelGroup.add(tower);
      }
      const park = new THREE.Mesh(new THREE.BoxGeometry(36, 7, 150), new THREE.MeshLambertMaterial({ color: 0xc8d4d8 }));
      park.position.set(p.x + fx * 8, p.y + 194, p.z + fz * 8);
      park.rotation.y = h;
      levelGroup.add(park);
      break;
    }
  } else if (theme.scenery === 'alpine') {
    // ---- alpine: guardrails and snowbanks along both edges, snowy pines on the mountainside,
    // peaks all round in the haze, and snow falling
    const posts = [], rails = [], banks = [];
    for (let s = Track.start; s < Track.end; s += 4) {
      for (const side of [-1, 1]) {
        posts.push([s, beside(side, s, 0.5), 0.4, 0.12, 0.8, 0.12]);
        rails.push([s + 2, beside(side, s + 2, 0.45), 0.65, 0.08, 0.3, 4.05]);
        if (Math.random() < 0.6) banks.push([s + Math.random() * 4, beside(side, s, -0.1), 0.1, 1.2 + Math.random(), 0.7, 2 + Math.random() * 2]);
      }
    }
    instances(cube, 0x5a5f66, posts);
    instances(cube, 0xb9bec5, rails);
    instances(new THREE.SphereGeometry(0.5, 8, 6), 0xffffff, banks);
    // pines: dark green tiers dusted with snow, standing on the land itself, never on another stretch of road
    const trunks = [], tiers = [], caps = [], spot = new THREE.Object3D(), p = {};
    for (let s = Track.start; s < Track.end; s += 9) {
      for (const side of [-1, 1]) {
        if (Math.random() < 0.35) continue;
        const d = 10 + Math.random() * 45;
        Track.toWorld(s + Math.random() * 6, beside(side, s, d), p);
        if (Track.mainDistance(p.x, p.z) < Math.max(Track.hi(s), -Track.lo(s)) + 4) continue;
        const y = terrainAt(p.x, p.z), h = 6 + Math.random() * 6;
        trunks.push([p.x, y + h * 0.1, p.z, 0.5, h * 0.2, 0.5]);
        for (let k = 0; k < 3; k++) {
          const w = h * (0.55 - k * 0.13);
          tiers.push([p.x, y + h * (0.35 + k * 0.22), p.z, w, h * 0.4, w]);
          caps.push([p.x, y + h * (0.47 + k * 0.22), p.z, w * 0.6, h * 0.18, w * 0.6]);
        }
      }
    }
    const placed = (geometry, color, list) => { // (like instances(), but at world points, not road ones)
      const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshLambertMaterial({ color }), list.length);
      list.forEach(([x, y, z, sx, sy, sz], i) => {
        spot.position.set(x, y, z);
        spot.scale.set(sx, sy, sz);
        spot.updateMatrix();
        mesh.setMatrixAt(i, spot.matrix);
      });
      levelGroup.add(mesh);
    };
    placed(tube, 0x4a3426, trunks);
    placed(cone, 0x2f5a3c, tiers);
    placed(cone, 0xf6f8fa, caps);
    // peaks all round, out in the haze: rock with snow on top
    const middle = {};
    Track.toWorld(Track.length / 2, 0, middle);
    const rock = new THREE.MeshLambertMaterial({ color: 0x7d838c }), white = new THREE.MeshLambertMaterial({ color: 0xffffff });
    for (let k = 0; k < 16; k++) {
      const a = k / 16 * Math.PI * 2 + Math.random() * 0.2, far = 700 + Math.random() * 250;
      const r = 180 + Math.random() * 140, h = 260 + Math.random() * 220;
      const peak = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), rock);
      peak.position.set(middle.x + Math.sin(a) * far, h / 2 - 20, middle.z + Math.cos(a) * far);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.42, h * 0.42, 7), white);
      cap.position.set(peak.position.x, h - 20 - h * 0.21 + 1, peak.position.z);
      peak.material.fog = cap.material.fog = true;
      levelGroup.add(peak, cap);
    }
    // snow falling: two layers of flakes in a box round the camera, drifting down, one above
    // the other, each starting again at the top as it reaches the bottom
    const BOX = 70, flakes = [];
    for (let i = 0; i < 1400; i++) flakes.push((Math.random() - 0.5) * BOX * 2, Math.random() * BOX, (Math.random() - 0.5) * BOX * 2);
    const flakeGeo = new THREE.BufferGeometry();
    flakeGeo.setAttribute('position', new THREE.Float32BufferAttribute(flakes, 3));
    const flakeMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.18, transparent: true, opacity: 0.85, depthWrite: false });
    for (const layer of [0, 1]) {
      const snow = new THREE.Points(flakeGeo, flakeMat);
      snow.frustumCulled = false;
      snow.onBeforeRender = (renderer, scene, camera) => {
        const fall = (performance.now() / 1000 * 2.5 + layer * BOX) % (BOX * 2);
        const x = scene.scale.x < 0 ? -camera.position.x : camera.position.x; // (in the scene's own terms)
        snow.position.set(x + Math.sin(performance.now() / 3000) * 2, camera.position.y + BOX - fall, camera.position.z);
        snow.updateMatrixWorld();
      };
      levelGroup.add(snow);
    }
  } else if (theme.scenery === 'hell') {
    // ---- hell: rivers of lava, black spires of rock, and fires along the roadside ------------------
    const glow = (color) => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, depthWrite: false });
    for (const side of [-1, 1]) {
      for (let s = Track.start, k = side > 0 ? 0 : 1; s < Track.end; s += 170, k++) {
        const near = 12 + (k % 3) * 9, far = near + 30 + (k % 2) * 25, to = Math.min(Track.end, s + 120);
        // (a brighter core down the middle of each river, drawn after it)
        for (const [a, b, color, order] of [[near, far, 0xff4a12, -1], [near + 6, far - 8, 0xffb52e, -0.9]]) {
          const lava = new THREE.Mesh(buildStrip(s, to, (q) => beside(side, q, a), (q) => beside(side, q, b), -0.03, 8), glow(color));
          lava.renderOrder = order;
          levelGroup.add(lava);
        }
      }
    }
    const spires = [], flames = [], cores = [];
    for (let s = Track.start; s < Track.end; s += 12) {
      for (const side of [-1, 1]) {
        const at = s + Math.random() * 10, h = 5 + Math.pow(Math.random(), 2) * 34;
        spires.push([at, beside(side, at, 5 + h * 0.2 + Math.random() * 90), h / 2, h * 0.35, h, h * 0.35]);
        if (Math.random() < 0.3) {
          const f = 2 + Math.random() * 3, lat = beside(side, at, 2.5 + Math.random() * 4);
          flames.push([at, lat, f * 0.35, f * 0.5, f * 0.7, f * 0.5]);   // a wide base,
          cores.push([at, lat, f * 0.6, f * 0.2, f * 1.2, f * 0.2]);      // and a bright tongue rising out of it
        }
      }
    }
    instances(cone, 0x2a1512, spires);
    instances(cone, 0xff5a14, flames, true);
    instances(cone, 0xffd23f, cores, true);
  } else if (theme.scenery === 'space') {
    // ---- space: stars all round, which travel with the camera so they never get nearer -----
    const points = [];
    for (let i = 0; i < 1800; i++) {
      const a = Math.random() * Math.PI * 2, y = Math.random() * 2 - 1, r = Math.sqrt(1 - y * y);
      points.push(Math.cos(a) * r * 600, y * 600, Math.sin(a) * r * 600);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    const stars = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xffffff, size: 2, sizeAttenuation: false, fog: false, depthWrite: false }));
    stars.frustumCulled = false;
    stars.renderOrder = -3;
    stars.onBeforeRender = (renderer, scene, camera) => {
      stars.position.copy(camera.position);
      if (scene.scale.x < 0) stars.position.x = -stars.position.x; // (in the scene's own terms)
      stars.updateMatrixWorld();
    };
    levelGroup.add(stars);
  }
};
Game.onLoad.push(buildRoad);
