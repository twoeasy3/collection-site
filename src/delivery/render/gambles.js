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
import { makeWindsock, makeSign, makeTransporter, makeHeightBar } from './gambleModels.js';
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
