// ---- GAMBLES: Gimmick Road 3's gimmicks, drawn (what they do: ../gambles.js) ----
// A crosswind: windsocks before and along the stretch, each swinging out with the gusts to the side the
// wind blows to; and the cars in it leaning. A crest a car can fly: a board before it with the speed that does.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Track } from '../track.js';
import { Game } from '../game.js';
import { Player } from '../player.js';
import { Traffic } from '../traffic.js';
import { Gambles } from '../gambles.js';
import { scene, tmp } from './scene.js';
import { carMesh, trafficMeshes } from './cars.js';
import { makeWindsock, makeSign, makeTransporter, makeHeightBar, makeDepthPost, makeCushion, makeShadeTree } from './gambleModels.js';
import { buildStrip } from './road.js';

const flat = (color, offset) => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: offset, polygonOffsetUnits: offset });
// bars across the road from..to, one every `every` m, each `wide` m along it, as one mesh's geometry
const buildRipples = (from, to, every, wide, y) => {
  const pos = [], idx = [];
  for (let s = from + every / 2; s < to; s += every) {
    const lo = Track.lo(s) - 1, hi = Track.hi(s) + 1, n = pos.length / 3;
    for (const [ds, lat] of [[0, lo], [0, hi], [wide, lo], [wide, hi]]) { Track.toWorld(s + ds, lat, tmp); pos.push(tmp.x, tmp.y + y, tmp.z); }
    idx.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  return geo;
};

const group = new THREE.Group();
scene.add(group);
// a group set down on the road at (s, lat), facing along it (its local +z the player's way, +x to the left)
const at = (s, lat, y = 0) => {
  const g = new THREE.Group();
  g.rotation.y = Track.toWorld(s, lat, tmp);
  g.position.set(tmp.x, tmp.y + y, tmp.z);
  group.add(g);
  return g;
};

let socks = [];   // { wind (its index in Gambles.winds), model }
// the veil over the picture (Gambles.veil): a sheet over the canvas, under the HUD, with a hole round the car
const VEILS = { spray: '214, 222, 228', sun: '255, 238, 196' };
const veil = document.createElement('div');
veil.style.cssText = 'position:fixed;inset:0;pointer-events:none;opacity:0;z-index:0';
document.getElementById('game')?.insertAdjacentElement('afterend', veil);
let veilOf = null;
// the clouds the traffic drags (one a vehicle, drawn only where it has one)
const cloudGroup = new THREE.Group();
scene.add(cloudGroup);
const CLOUD = new THREE.BoxGeometry(1, 1, 1), cloudMats = { spray: new THREE.MeshBasicMaterial({ color: 0xdfe6ea, transparent: true, opacity: 0.4, depthWrite: false }) };
let clouds = [];
let sunDiscs = []; // the low sun's: { z (its stretch), sun (the model), x, zz (the way the stretch runs, in the world) }
let leaned = 0;   // (the roll given the player's car last frame, taken off again before the next is put on)

Game.onLoad.push(() => {
  group.clear();
  socks = [];
  const W = CONFIG.crosswind;
  Gambles.build(); // (its lists, for the level just loaded)
  // ---- crests: a board on each side, on the way up
  const kmh = (v) => Math.ceil(v * 3.6 / 5) * 5;
  for (const c of Gambles.crests) {
    if (c.speed > CONFIG.crest.signUnder) continue;
    const s = c.from - CONFIG.crest.sign;
    if (s < 5) continue;
    for (const lat of [Track.hi(s) - 0.6, Track.lo(s) + 0.6]) at(s, lat).add(makeSign('CREST\n' + kmh(c.speed) + '+ FLIES', '#ffd23f', '#111', 5.4, 2.6));
  }
  // ---- ramps over the jam: the transporter, and a board with the speed that clears its queue
  for (const r of Gambles.ramps) {
    const J = CONFIG.jamRamp;
    at(r.s, r.lat).add(makeTransporter(r.run, r.top, J.half));
    for (const back of [J.sign, J.sign / 2]) {
      if (r.s - back < 5) continue;
      at(r.s - back, Track.hi(r.s - back) - 0.6).add(makeSign('JAM RAMP\n' + kmh(r.speed) + '+', '#ffd23f', '#111', 5.4, 2.6));
    }
  }
  // ---- low bridges: the bar over the player's side, and boards before the exit that goes round it and at it
  for (const bar of Gambles.bars) {
    const L = CONFIG.lowBridge;
    at(bar.s, 0).add(makeHeightBar(-bar.hi, -bar.lo, bar.clearance)); // (the group's +x is the road's left)
    const text = 'LOW BRIDGE ' + bar.clearance.toFixed(1) + ' m';
    for (const s of bar.exit ? [bar.exit.exitAt - L.sign, bar.exit.exitAt - 30] : [bar.s - L.sign]) {
      if (s > 5) at(s, Track.hi(s) - 0.6).add(makeSign(text + (bar.exit ? '\nTALL: EXIT' : ''), '#fff', '#c1121f', 6, 2.6));
    }
    if (bar.s - 90 > 5) at(bar.s - 90, Track.lo(bar.s - 90) + 0.6).add(makeSign(text, '#fff', '#c1121f', 6, 1.6));
  }
  // ---- fords: the river across the road (wide of it on both sides), depth posts on its banks and down its
  // sides, and boards before the exit that is its bridge and at it
  for (const f of Gambles.fords) {
    const F = CONFIG.ford;
    // (on the right it stops short of the side road, its bridge, which stays dry)
    const reach = (s) => { Track.toWorld(s, Track.hi(s), tmp); return Math.max(2, Math.min(60, Track.sideDistance(tmp.x, tmp.z) - 8)); };
    const water = new THREE.Mesh(buildStrip(f.from, f.to, (s) => Track.lo(s) - 60, (s) => Track.hi(s) + reach(s), 0.05 + f.depth * 0.25, 4),
      new THREE.MeshBasicMaterial({ color: 0x2f7fb8, transparent: true, opacity: 0.62, side: THREE.DoubleSide, depthWrite: false }));
    group.add(water);
    for (const s of [f.from - 1.5, (f.from + f.to) / 2, f.to + 1.5]) for (const lat of [Track.hi(s) - 0.5, Track.lo(s) + 0.5]) at(s, lat).add(makeDepthPost(f.depth));
    const text = 'FORD ' + f.depth.toFixed(1) + ' m DEEP';
    for (const s of f.exit ? [f.exit.exitAt - F.sign, f.exit.exitAt - 30] : [f.from - F.sign]) {
      if (s > 5) at(s, Track.hi(s) - 0.6).add(makeSign(text + (f.exit ? '\nBRIDGE: EXIT' : ''), '#1f6fb2', '#fff', 6, 2.6));
    }
    if (f.from - 90 > 5) at(f.from - 90, Track.lo(f.from - 90) + 0.6).add(makeSign(text, '#1f6fb2', '#fff', 6, 1.6));
  }
  // ---- speed cushions: one in the middle of every lane of each row, and a board before each stretch of them
  const stretches = new Set();
  for (const row of Gambles.rows) {
    const K = CONFIG.cushion;
    for (let lane = 0; lane < Track.laneCount; lane++) {
      const lat = Track.laneOffset(lane, row.s);
      if (lat >= Track.laneLo(row.s) && lat <= Track.laneHi(row.s)) at(row.s, lat).add(makeCushion(K.width, K.long));
    }
    if (!stretches.has(row.from) && row.from - K.sign > 5) at(row.from - K.sign, Track.hi(row.from - K.sign) - 0.6).add(makeSign('SPEED CUSHIONS\n' + kmh(K.soft) + ' OR THE LINES', '#ffd23f', '#111', 6.2, 2.6));
    stretches.add(row.from);
  }
  // ---- black ice in the shade: the shadow (which is all that shows of the ice) and the trees that cast it
  for (const z of Gambles.shades) {
    const Z = CONFIG.shade, shadow = new THREE.MeshBasicMaterial({ color: 0x05070c, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    group.add(new THREE.Mesh(buildStrip(z.from, z.to, z.side > 0 ? z.lo : (s) => Track.lo(s) - 6, z.side > 0 ? (s) => Track.hi(s) + 6 : z.hi, 0.03, 3), shadow));
    let k = 0;
    for (let s = z.from + 2; s < z.to; s += Z.tree) at(s, z.side > 0 ? Track.hi(s) + 4 + (k++ % 2) * 2.5 : Track.lo(s) - 4 - (k++ % 2) * 2.5).add(makeShadeTree(12 + (k * 7 % 4)));
  }
  // ---- ruts: the mud right across, the two wheel tracks of the rut down each lane, and a board before
  for (const r of Gambles.ruts) {
    const R = CONFIG.rut;
    group.add(new THREE.Mesh(buildStrip(r.from, r.to, (s) => Track.lo(s) - 1, (s) => Track.hi(s) + 1, 0.012, 3), flat(0x6a4d31, -2)));
    for (let lane = 0; lane < Track.laneCount; lane++) {
      const mid = (r.from + r.to) / 2, c = Track.laneOffset(lane, mid);
      if (c < Track.laneLo(mid) || c > Track.laneHi(mid)) continue;
      for (const x of [-0.72, 0.72]) group.add(new THREE.Mesh(buildStrip(r.from, r.to, (s) => Track.laneOffset(lane, s) + x - 0.24, (s) => Track.laneOffset(lane, s) + x + 0.24, 0.02, 3), flat(0x33241a, -4)));
    }
    if (r.from - R.sign > 5) at(r.from - R.sign, Track.hi(r.from - R.sign) - 0.6).add(makeSign('DEEP RUTS\nPICK ONE', '#ffd23f', '#111', 5.4, 2.6));
  }
  // ---- fresh tarmac: the lane black and unmarked, cones down the line beside it, a board before
  for (const z of Gambles.tars) {
    const T = CONFIG.tarmac, LW = CONFIG.laneWidth, cone = (s, lat) => { const c = at(s, lat); c.add(new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.75, 8).translate(0, 0.375, 0), new THREE.MeshLambertMaterial({ color: 0xff6a1a }))); };
    group.add(new THREE.Mesh(buildStrip(z.from, z.to, (s) => Track.laneOffset(z.lane, s) - LW / 2, (s) => Track.laneOffset(z.lane, s) + LW / 2, 0.025, 3), flat(0x07080a, -5)));
    const [first] = Track.laneRange(1, (z.from + z.to) / 2), side = z.lane > first ? -1 : 1; // (the cones on the side the queue is)
    for (let s = z.from; s <= z.to; s += T.cone) cone(s, Track.laneOffset(z.lane, s) + side * LW / 2);
    if (z.from - T.sign > 5) at(z.from - T.sign, Track.hi(z.from - T.sign) - 0.6).add(makeSign('FRESH TAR\nSTICKY', '#ff8a1a', '#111', 5.4, 2.6));
  }
  // ---- truck spray: the road wet (darker, with a sheen), a board before; the clouds are drawn as they go (syncGambles)
  for (const z of Gambles.wets) {
    group.add(new THREE.Mesh(buildStrip(z.from, z.to, (s) => Track.lo(s), (s) => Track.hi(s), 0.011, 4), new THREE.MeshBasicMaterial({ color: 0x0c1218, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
    const s = z.from - CONFIG.spray.sign;
    if (s > 5) at(s, Track.hi(s) - 0.6).add(makeSign('WET ROAD\nSPRAY', '#1f6fb2', '#fff', 5.4, 2.6));
  }
  cloudGroup.clear();
  clouds = [];
  sunDiscs = [];
  // ---- the low sun: the sun itself, low over the road beyond the stretch's end, and a board before
  for (const z of Gambles.suns) {
    const L = CONFIG.lowSun, a = {}, b = {};
    Track.toWorld(z.to - 60, 0, a);
    Track.toWorld(z.to, 0, b);
    const dx = b.x - a.x, dz = b.z - a.z, n = Math.hypot(dx, dz) || 1;
    // (it keeps its distance from the car, the way the stretch runs, as a sun does: placed each frame, see syncGambles)
    const sun = new THREE.Group();
    for (const [r, color, opacity] of [[62, 0xfff3c4, 0.35], [34, 0xfffbe8, 1]]) sun.add(new THREE.Mesh(new THREE.CircleGeometry(r, 28), new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, fog: false, depthWrite: false, side: THREE.DoubleSide })));
    sun.rotation.y = Math.atan2(dx, dz);
    sun.visible = false;
    group.add(sun);
    sunDiscs.push({ z, sun, x: dx / n, zz: dz / n });
    const s = z.from - L.sign;
    if (s > 5) at(s, Track.hi(s) - 0.6).add(makeSign('LOW SUN', '#ffd23f', '#111', 5.4, 1.6));
  }
  // ---- washboard dirt: the dirt right across, its corrugations, and boards with the speed that skims it
  for (const b of Gambles.boards) {
    const B = CONFIG.washboard;
    group.add(new THREE.Mesh(buildStrip(b.from, b.to, (s) => Track.lo(s) - 1, (s) => Track.hi(s) + 1, 0.012, 3), flat(0xa9865a, -2)));
    group.add(new THREE.Mesh(buildRipples(b.from, b.to, B.ripple, B.ripple * 0.42, 0.02), flat(0x7a5d3c, -4)));
    for (const back of [B.sign, 20]) {
      if (b.from - back < 5) continue;
      for (const lat of [Track.hi(b.from - back) - 0.6, Track.lo(b.from - back) + 0.6]) at(b.from - back, lat).add(makeSign('WASHBOARD\n' + kmh(b.skim) + '+ OR CRAWL', '#ffd23f', '#111', 5.8, 2.6));
    }
  }
  // ---- crosswinds: windsocks
  Gambles.winds.forEach((w, k) => {
    for (let s = w.from - W.ahead; s < w.to; s += s < w.from ? W.ahead : W.sockEvery) {
      if (s < 5) continue;
      for (const lat of [Track.hi(s) - 0.5, Track.lo(s) + 0.5]) { // (one each side of the road)
        const model = makeWindsock();
        const spot = at(s, lat);
        spot.add(model);
        socks.push({ wind: k, model });
      }
    }
  });
});

export const syncGambles = (now) => {
  const t = now / 1000, W = CONFIG.crosswind;
  // the veil, and the clouds that bring it
  const V = CONFIG.veil;
  if (Gambles.veilOf !== veilOf) {
    veilOf = Gambles.veilOf;
    const c = VEILS[veilOf] || VEILS.spray;
    veil.style.background = 'radial-gradient(ellipse 70% 60% at 50% 74%, rgba(' + c + ',0) ' + V.hole * 100 + '%, rgba(' + c + ',1) ' + V.full * 100 + '%)';
  }
  veil.style.opacity = Game.state === 'playing' ? Gambles.veil.toFixed(3) : '0';
  for (const d of sunDiscs) {
    const L = CONFIG.lowSun;
    d.sun.visible = Player.active && Track.isMain(Player.s) && Player.s > d.z.from - 2 * L.sign && Player.s < d.z.to;
    if (!d.sun.visible) continue;
    Track.toWorld(Player.s, Player.lat, tmp);
    d.sun.position.set(tmp.x + d.x * L.far, tmp.y + L.up, tmp.z + d.zz * L.far);
  }
  if (Gambles.wets.length) {
    const S = CONFIG.spray;
    for (let i = 0; i < Traffic.cars.length; i++) {
      const car = Traffic.cars[i], on = Gambles.sprays(car);
      if (!on) { if (clouds[i]) clouds[i].visible = false; continue; }
      const mesh = clouds[i] || (clouds[i] = cloudGroup.add(new THREE.Mesh(CLOUD, cloudMats.spray)).children.at(-1));
      const length = Gambles.sprayLength(car), half = car.hw + S.spread * 0.6;
      mesh.visible = true;
      mesh.rotation.y = Track.toWorld(car.s - car.dir * (car.hl + length / 2), car.lat, tmp);
      mesh.position.set(tmp.x, tmp.y + 1.1 + 0.15 * Math.sin(t * 5 + i), tmp.z);
      mesh.scale.set(2 * half, 2.2, length);
    }
  }
  for (const sock of socks) {
    const w = Gambles.winds[sock.wind];
    if (w) sock.model.userData.set((Gambles.gust(w) - W.lull * 0.6) / (1 - W.lull * 0.6), w.dir, t);
  }
  // the cars in a crosswind lean with it
  carMesh.rotation.z -= leaned;
  leaned = Player.active ? Gambles.windNow * W.lean : 0; // (+ = over to its right: the model's +x is its left)
  carMesh.rotation.z += leaned;
  if (Gambles.winds.length) {
    for (let i = 0; i < Traffic.cars.length; i++) {
      const car = Traffic.cars[i];
      if (!car.active || car.junction) continue;
      const w = Gambles.wind(car.s);
      if (w) trafficMeshes[i].rotation.z = Gambles.windPush(w, car.height) * W.lean * car.dir;
      else if (!(car.spin > 0)) trafficMeshes[i].rotation.z = 0;
    }
  }
};
