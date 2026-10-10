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
import { makeWindsock, makeSign, makeTransporter } from './gambleModels.js';

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
      at(r.s - back, Track.hi(r.s - back) - 0.6).add(makeSign('JAM: RAMP IN LANE ' + (r.lane - Track.laneRange(1, r.s)[0] + 1) + '\nJUMP ' + kmh(r.speed) + '+', '#ffd23f', '#111', 6.4, 2.6));
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
