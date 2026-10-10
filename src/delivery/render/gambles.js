// ---- GAMBLES: Gimmick Road 3's gimmicks, drawn (what they do: ../gambles.js) ----
// A crosswind: windsocks before and along the stretch, each swinging out with the gusts to the side the
// wind blows to; and the cars in it leaning.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Track } from '../track.js';
import { Game } from '../game.js';
import { Player } from '../player.js';
import { Traffic } from '../traffic.js';
import { Gambles } from '../gambles.js';
import { scene, tmp } from './scene.js';
import { carMesh, trafficMeshes } from './cars.js';
import { makeWindsock } from './gambleModels.js';

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
