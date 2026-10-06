// ---- SITE WORKS: the work on a construction site's shoulders (what it does: ../site.js) -------------
// Trenches dug along the shoulder, dark and deep, with steel plates across them here and there and
// spoil heaped beside; long-reach excavators beside the road swinging their arms out over it; the
// workers pushing their barrows (the barrows are obstacles: render/items.js), and diving clear;
// stacks of concrete pipes by the fence.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { LEVEL } from '../levels.js';
import { Track } from '../track.js';
import { Game } from '../game.js';
import { Collision } from '../collision.js';
import { Site } from '../site.js';
import { scene, tmp } from './scene.js';
import { buildStrip } from './road.js';

const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const flat = (color, offset) => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: offset, polygonOffsetUnits: offset });
const YELLOW = lambert(0xf2b51c), DARK = lambert(0x2a2a2a), GLASS = lambert(0x2f4a58), STEEL = lambert(0x7d838a), CONCRETE = lambert(0xb5b0a6);
const HIVIS = lambert(0xff8a1a), SKIN = lambert(0xe0b48c), HAT = lambert(0xf6e12a), TROUSERS = lambert(0x2c3440);
const add = (group, geometry, material, x, y, z, rx = 0, ry = 0, rz = 0) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  group.add(mesh);
  return mesh;
};
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

// a long-reach excavator, its arm along local +z, its bucket CONFIG.site.reach out, low down
const makeDigger = () => {
  const g = new THREE.Group(), R = CONFIG.site.reach;
  for (const side of [-1, 1]) add(g, box(0.9, 1.0, 4.4), DARK, side * 1.3, 0.5, 0);
  add(g, box(2.8, 1.3, 3.4), YELLOW, 0, 1.65, -0.4);
  add(g, box(1.3, 1.6, 1.4), GLASS, -0.7, 3.1, 0.4);
  add(g, box(2.6, 1.0, 1.0), STEEL, 0, 1.9, -2.3);
  const boomLen = Math.hypot(R * 0.6, 3), stickLen = Math.hypot(R * 0.4, 4);
  add(g, box(0.55, 0.55, boomLen), YELLOW, 0.6, 2.4 + 1.5, R * 0.3, -Math.atan2(3, R * 0.6));          // boom, up and out
  add(g, box(0.45, 0.45, stickLen), YELLOW, 0.6, 5.4 - 2, R * 0.8, Math.atan2(4, R * 0.4));           // stick, down
  add(g, box(1.6, 1.0, 1.0), DARK, 0.6, 1.0, R);                                                        // bucket
  return g;
};
// a worker in hi-vis and a hard hat, facing local +z, feet on y = 0, arms out to push a barrow
const makeWorker = () => {
  const g = new THREE.Group();
  add(g, box(0.22, 0.85, 0.22), TROUSERS, -0.13, 0.42, 0);
  add(g, box(0.22, 0.85, 0.22), TROUSERS, 0.13, 0.42, 0);
  add(g, box(0.55, 0.7, 0.32), HIVIS, 0, 1.2, 0);
  for (const side of [-1, 1]) add(g, box(0.14, 0.14, 0.6), HIVIS, side * 0.3, 1.25, 0.3);
  add(g, new THREE.SphereGeometry(0.16, 10, 8), SKIN, 0, 1.72, 0);
  add(g, new THREE.CylinderGeometry(0.2, 0.22, 0.12, 10), HAT, 0, 1.86, 0);
  return g;
};

const group = new THREE.Group();
scene.add(group);
let diggers = [], workers = [];
Game.onLoad.push(() => {
  group.clear();
  diggers = [];
  workers = [];
  const W = CONFIG.site, works = LEVEL.siteWorks || [];
  for (const w of works) {
    const side = w.side === 'left' ? -1 : 1;
    if (w.kind === 'trench') {
      // the pit, across the shoulder from just off the lane's edge; plates over it; spoil beside it
      const inner = (s) => side < 0 ? Track.laneLo(s) - W.trenchIn + 0.3 : Track.laneHi(s) + W.trenchIn - 0.3;
      const outer = (s) => side < 0 ? Track.lo(s) : Track.hi(s);
      group.add(new THREE.Mesh(buildStrip(w.from, w.to, inner, outer, 0.015, 2), flat(0x231a12, -3)));
      for (const edge of [inner, outer]) group.add(new THREE.Mesh(buildStrip(w.from, w.to, (s) => edge(s) - 0.12, (s) => edge(s) + 0.12, 0.02, 2), flat(0x5a4632, -4)));
      for (let s = w.from; s < w.to; s += W.plateEvery) {
        group.add(new THREE.Mesh(buildStrip(s, Math.min(w.to, s + W.plateLength), inner, outer, 0.04, 1), flat(0x6f757c, -5)));
      }
      for (let s = w.from; s < w.to; s += 7) {
        const h = Track.toWorld(s, outer(s) + side * 2.2, tmp);
        const heap = new THREE.Mesh(new THREE.ConeGeometry(1.4, 1.3, 7), lambert(0x6e5232));
        heap.position.set(tmp.x, tmp.y + 0.6, tmp.z);
        heap.rotation.y = h;
        group.add(heap);
      }
    } else if (w.kind === 'pipes') { // a stack of pipes, lying along the road, three on two
      for (const [x, y] of [[-0.95, 0.9], [0.95, 0.9], [0, 2.5]]) {
        const lat = side < 0 ? Track.lo(w.s) - W.stackOut - x : Track.hi(w.s) + W.stackOut + x;
        const h = Track.toWorld(w.s, lat, tmp);
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.6, 16, 1, true).rotateX(Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xb5b0a6, side: THREE.DoubleSide }));
        pipe.position.set(tmp.x, tmp.y + y, tmp.z);
        pipe.rotation.y = h;
        group.add(pipe);
      }
    } else if (w.kind === 'excavator') {
      const digger = makeDigger();
      group.add(digger);
      diggers.push(digger);
    }
  }
  for (const o of Collision.obstacles) {
    if (!o.walk) continue;
    const worker = makeWorker();
    group.add(worker);
    workers.push({ o, mesh: worker });
  }
});

export const syncSite = () => {
  // the excavators: each at its base, its arm turned out as far as it has swung
  Site.diggers.forEach((d, i) => {
    const mesh = diggers[i];
    if (!mesh) return;
    mesh.visible = !d.gone;
    const h = Track.toWorld(d.s, d.base, tmp);
    mesh.position.copy(tmp);
    // (along the road at angle 0, right across it towards the road at PI/2)
    const fx = Math.sin(h), fz = Math.cos(h), tx = d.side * Math.cos(h), tz = -d.side * Math.sin(h);
    mesh.rotation.y = Math.atan2(fx * Math.cos(d.angle) + tx * Math.sin(d.angle), fz * Math.cos(d.angle) + tz * Math.sin(d.angle));
  });
  // the workers: behind their barrows, pushing; or diving clear over the fence, and lying there
  for (const { o, mesh } of workers) {
    const w = o.walk;
    mesh.visible = true;
    if (w.dive < 0) {
      const h = Track.toWorld(o.s - w.dir * 1.1, o.lat, tmp);
      mesh.position.copy(tmp);
      mesh.rotation.set(0, h + (w.dir > 0 ? 0 : Math.PI), 0);
    } else {
      const u = Math.min(1, w.dive / 0.7), out = w.side < 0 ? Track.lo(o.s) - 4 : Track.hi(o.s) + 4;
      const lat = o.lat + (out - o.lat) * u, h = Track.toWorld(o.s - 1, lat, tmp);
      mesh.position.set(tmp.x, tmp.y + 2.2 * Math.sin(Math.PI * u) + (u >= 1 ? 0.25 : 0), tmp.z);
      mesh.rotation.set(0, h - w.side * Math.PI / 2, -w.side * (Math.PI / 2) * u); // (flinging itself sideways, landing flat)
    }
  }
};
