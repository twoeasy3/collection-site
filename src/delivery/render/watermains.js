// ---- BURST WATER MAINS: the geysers and the water on the road (the timing and the slicks: ../watermains.js) ----
// At each main: a broken manhole cover beside a hole in the road; while it sprays, a column of white
// water up out of the hole, breaking up at the top and falling as spray; and the sheet of water it
// leaves on the road round it, glassy, drying away once the spray has stopped.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Track } from '../track.js';
import { Game } from '../game.js';
import { WaterMains } from '../watermains.js';
import { scene, tmp, clearGroup } from './scene.js';
import { Particles, rnd } from './effects.js';

const group = new THREE.Group();
scene.add(group);
let mains = [];

const build = () => {
  clearGroup(group);
  const W = CONFIG.waterMain;
  mains = WaterMains.list.map((m) => {
    const g = new THREE.Group();
    const h = Track.toWorld(m.s, m.lat, tmp);
    g.position.copy(tmp);
    g.rotation.y = h;
    // the hole, its cover thrown beside it, and the water lying on the road round it
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.55, 14).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x0a0a0c, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
    hole.position.y = 0.03;
    const cover = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 14), new THREE.MeshLambertMaterial({ color: 0x4a4a4e }));
    cover.position.set(1.4, 0.08, 0.6);
    cover.rotation.z = 0.4;
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(W.half * 2, W.radius * 2).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xb8c8d4, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
    sheet.position.y = 0.028;
    // the column of water: a tapering white tube, scaled up and down as the jet comes and goes
    const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.35, 1, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide }));
    jet.visible = false;
    g.add(hole, cover, sheet, jet);
    group.add(g);
    return { g, sheet, jet, m };
  });
};
Game.onLoad.push(build);

export const syncWaterMains = (dt) => {
  if (!mains.length) return;
  const W = CONFIG.waterMain;
  for (const { g, sheet, jet, m } of mains) {
    const up = WaterMains.jet(m);
    jet.visible = up > 0.02;
    if (jet.visible) {
      const h = W.height * up;
      jet.scale.set(1, h, 1);
      jet.position.y = h / 2;
      // spray off the top, falling round about
      if (!Game.paused) for (let n = 0; n < 4; n++) {
        Particles.emit(g.position.x + rnd(0.6), g.position.y + h + rnd(0.4), g.position.z + rnd(0.6),
          rnd(4), 1 + Math.random() * 3, rnd(4), 0.6 + Math.random() * 0.5, 0.22, 0.4, 14, Math.random() < 0.7 ? 0xffffff : 0xcfe9f2, g.position.y);
      }
    }
    // the water on the road: there while the main is wet, draining away over the last of it
    sheet.material.opacity = Math.min(0.55, m.wet / W.drain * 0.55);
  }
};
