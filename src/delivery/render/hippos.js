// ---- HIPPOS: the hippos charging out of the river (their movement and the damage: ../hippos.js) ----
// A big grey-pink barrel of a hippo on stumpy legs, its jaws thrown wide as it charges. Surfacing
// it throws up a splash of water; charging over dry ground it kicks up dust.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Track } from '../track.js';
import { Hippos } from '../hippos.js';
import { scene, tmp } from './scene.js';
import { Particles, rnd } from './effects.js';

const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const HIDE = lambert(0x7d6a72), BELLY = lambert(0xc99a9a), MOUTH = lambert(0xd9707a), TUSK = lambert(0xf4efe2), EYE = lambert(0x161616);
const add = (group, geometry, material, x, y, z) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
};
// one hippo, facing local +z, its feet at y = 0
const makeHippo = () => {
  const group = new THREE.Group();
  const body = add(group, new THREE.SphereGeometry(1, 16, 12), HIDE, 0, 1.15, -0.3);
  body.scale.set(0.95, 0.8, 1.9);
  add(group, new THREE.BoxGeometry(1.3, 0.3, 2.6), BELLY, 0, 0.6, -0.3);
  const head = new THREE.Group(); // (the head, which the jaws hang from)
  head.position.set(0, 1.35, 1.5);
  group.add(head);
  add(head, new THREE.BoxGeometry(1.1, 0.55, 1.2), HIDE, 0, 0.15, 0.4);           // the upper jaw and snout
  const jaw = new THREE.Group();
  head.add(jaw);
  add(jaw, new THREE.BoxGeometry(1.0, 0.3, 1.1), HIDE, 0, -0.15, 0.45);           // the lower jaw...
  add(jaw, new THREE.BoxGeometry(0.85, 0.06, 0.95), MOUTH, 0, 0.02, 0.45);         // ...pink inside...
  for (const side of [-1, 1]) {
    add(jaw, new THREE.BoxGeometry(0.12, 0.35, 0.12), TUSK, side * 0.35, 0.18, 0.85); // ...with its tusks
    add(head, new THREE.BoxGeometry(0.16, 0.18, 0.1), HIDE, side * 0.35, 0.55, -0.1); // ears
    add(head, new THREE.BoxGeometry(0.14, 0.14, 0.08), EYE, side * 0.35, 0.42, 0.05);  // eyes
  }
  add(head, new THREE.BoxGeometry(0.85, 0.06, 0.95), MOUTH, 0, -0.12, 0.45);       // (the roof of its mouth)
  const legs = [];
  for (const [x, z] of [[-0.55, 0.9], [0.55, 0.9], [-0.55, -1.4], [0.55, -1.4]]) {
    const leg = new THREE.Group();
    leg.position.set(x, 0.75, z);
    add(leg, new THREE.BoxGeometry(0.45, 0.75, 0.45), HIDE, 0, -0.38, 0);
    group.add(leg);
    legs.push(leg);
  }
  group.userData = { jaw, legs };
  group.scale.setScalar(CONFIG.hippo.hw / 2.1); // (the model is 4.2 m nose to tail)
  return group;
};

const pool = [];
for (let i = 0; i < 4; i++) {
  const hippo = makeHippo();
  hippo.visible = false;
  scene.add(hippo);
  pool.push(hippo);
}
const splashed = new Set(); // the hippos (by id) that have made their splash
export const syncHippos = () => {
  pool.forEach((mesh, i) => {
    const h = Hippos.list[i];
    mesh.visible = !!h;
    if (!h) return;
    const heading = Track.toWorld(h.s, h.lat, tmp);
    mesh.position.set(tmp.x, tmp.y + h.y, tmp.z);
    mesh.rotation.y = heading + Math.PI / 2; // (facing across the road, to its left)
    const charging = Hippos.charging(h);
    mesh.userData.jaw.rotation.x = charging ? 0.55 + 0.15 * Math.sin(h.t * 9) : 0.1;
    mesh.userData.legs.forEach((leg, k) => { leg.rotation.x = charging ? Math.sin(h.legs * 2.2 + (k % 2 ? Math.PI : 0) + (k > 1 ? Math.PI / 2 : 0)) * 0.7 : 0; });
    // a splash as it comes up; dust (or spray, still in the water) as it charges
    if (!splashed.has(h.id)) {
      splashed.add(h.id);
      for (let k = 0; k < 40; k++) {
        Particles.emit(tmp.x + rnd(1.5), -0.05, tmp.z + rnd(1.5), rnd(3), 4 + Math.random() * 6, rnd(3),
          0.6 + Math.random() * 0.5, 0.25 + Math.random() * 0.3, 0, 18, Math.random() < 0.5 ? 0xffffff : 0x9fd0e0, -0.2);
      }
    }
    if (charging && Math.random() < 0.6) {
      const wet = h.lat > Track.hi(h.s) + CONFIG.hippo.bank;
      Particles.emit(tmp.x + rnd(1), h.y + 0.2, tmp.z + rnd(1), rnd(2), 1 + Math.random() * 2, rnd(2),
        0.5 + Math.random() * 0.4, wet ? 0.25 : 0.5, wet ? 0 : 1.5, wet ? 12 : 1, wet ? 0xe8f4f8 : 0xb8956a, tmp.y);
    }
  });
  if (!Hippos.list.length) splashed.clear();
};
