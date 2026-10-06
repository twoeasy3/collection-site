// ---- ELEPHANTS: elephants plodding across the road (their movement and the damage: ../elephants.js) --
// A big grey elephant: a barrel of a body on four pillar legs, great flapping ears, a swinging
// trunk and tusks. Also the dust the migration's herd kicks up as it streams across the road.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { LEVEL } from '../levels.js';
import { Track } from '../track.js';
import { Game } from '../game.js';
import { Player } from '../player.js';
import { Collision } from '../collision.js';
import { Elephants } from '../elephants.js';
import { scene, tmp } from './scene.js';
import { Particles, rnd } from './effects.js';

const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const HIDE = lambert(0x8a8784), EAR = lambert(0x7b7774), TUSK = lambert(0xf3eedd), EYE = lambert(0x161616);
const add = (group, geometry, material, x, y, z) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
};
// one elephant, facing local +z, its feet at y = 0 (5.8 m nose to tail, 3.3 m high)
const makeElephant = () => {
  const group = new THREE.Group();
  const body = add(group, new THREE.SphereGeometry(1, 16, 12), HIDE, 0, 2.2, -0.3);
  body.scale.set(1.35, 1.2, 2.1);
  const head = new THREE.Group();
  head.position.set(0, 2.7, 1.9);
  group.add(head);
  const skull = add(head, new THREE.SphereGeometry(0.9, 12, 10), HIDE, 0, 0, 0.2);
  skull.scale.set(1, 1.05, 0.9);
  const ears = [];
  for (const side of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(side * 0.75, 0.1, 0);
    add(ear, new THREE.BoxGeometry(0.12, 1.5, 1.2), EAR, side * 0.1, -0.2, -0.45);
    head.add(ear);
    ears.push(ear);
    add(head, new THREE.BoxGeometry(0.14, 0.14, 0.1), EYE, side * 0.5, 0.2, 0.95);
    const tusk = add(head, new THREE.CylinderGeometry(0.07, 0.11, 1.1, 8), TUSK, side * 0.35, -0.75, 1.15);
    tusk.rotation.x = -1.1;
  }
  const trunk = new THREE.Group(); // (in two pieces, so it can swing and curl)
  trunk.position.set(0, -0.3, 0.95);
  head.add(trunk);
  add(trunk, new THREE.CylinderGeometry(0.22, 0.32, 1.1, 10), HIDE, 0, -0.55, 0);
  const tip = new THREE.Group();
  tip.position.set(0, -1.1, 0);
  trunk.add(tip);
  add(tip, new THREE.CylinderGeometry(0.14, 0.22, 1.0, 10), HIDE, 0, -0.5, 0);
  const legs = [];
  for (const [x, z] of [[-0.75, 1.0], [0.75, 1.0], [-0.75, -1.5], [0.75, -1.5]]) {
    const leg = new THREE.Group();
    leg.position.set(x, 1.5, z);
    add(leg, new THREE.CylinderGeometry(0.38, 0.42, 1.5, 10), HIDE, 0, -0.75, 0);
    group.add(leg);
    legs.push(leg);
  }
  add(group, new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6), HIDE, 0, 2.0, -2.5).rotation.x = 0.4; // tail
  group.userData = { ears, trunk, tip, legs };
  group.scale.setScalar(CONFIG.elephant.hw / 2.9);
  return group;
};

const group = new THREE.Group();
scene.add(group);
let meshes = [];
Game.onLoad.push(() => {
  group.clear();
  const count = (LEVEL.elephants || []).reduce((sum, z) => sum + (z.count || 1), 0);
  meshes = [];
  for (let i = 0; i < count; i++) {
    const mesh = makeElephant();
    group.add(mesh);
    meshes.push(mesh);
  }
});

export const syncElephants = (now) => {
  meshes.forEach((mesh, i) => {
    const e = Elephants.list[i];
    mesh.visible = !!e;
    if (!e) return;
    const heading = Track.toWorld(e.s, e.lat, tmp);
    mesh.position.copy(tmp);
    mesh.rotation.y = heading + (e.dir > 0 ? -Math.PI / 2 : Math.PI / 2); // (facing the way it is walking, across the road)
    const walking = e.rest <= 0, t = now / 1000 + i;
    const { ears, trunk, tip, legs } = mesh.userData;
    legs.forEach((leg, k) => { leg.rotation.x = walking ? Math.sin(e.legs * 1.6 + (k % 2 ? Math.PI : 0) + (k > 1 ? Math.PI / 2 : 0)) * 0.35 : 0; });
    ears.forEach((ear, k) => { ear.rotation.y = (k ? -1 : 1) * (0.25 + 0.25 * Math.sin(t * 2.2)); });
    trunk.rotation.x = 0.15 + 0.15 * Math.sin(t * 1.3);
    tip.rotation.x = 0.3 + 0.25 * Math.sin(t * 1.3 + 0.8);
  });
  // the migration's dust: kicked up by the herd near the player as it streams across
  for (const o of Collision.obstacles) {
    if (!o.migrate || o.gone || Math.abs(o.s - Player.s) > 250 || Math.random() > 0.08) continue;
    Track.toWorld(o.s, o.lat, tmp);
    Particles.emit(tmp.x + rnd(1), tmp.y + 0.3, tmp.z + rnd(1), rnd(1.5), 0.8 + Math.random() * 1.5, rnd(1.5),
      1.2 + Math.random() * 0.8, 0.8 + Math.random() * 0.6, 2.5, 0.5, 0xc4a77a, tmp.y);
  }
};
