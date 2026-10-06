// ---- MACHINERY: the construction site's machines (their movement and the knocks: ../machinery.js) ----
// A yellow bulldozer with its blade, an excavator with its arm and bucket, an orange dump truck,
// each on the road crossing it, turned the way it is going, its tracks or wheels turning; its
// warning beacon flashing. Also the mud a car throws up, driving through it.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { LEVEL } from '../levels.js';
import { Track } from '../track.js';
import { Game } from '../game.js';
import { Player } from '../player.js';
import { Machinery } from '../machinery.js';
import { scene, tmp } from './scene.js';
import { Particles, rnd } from './effects.js';

const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const YELLOW = lambert(0xf2b51c), DARK = lambert(0x2a2a2a), STEEL = lambert(0x7d838a), GLASS = lambert(0x2f4a58), ORANGE = lambert(0xe0701e);
const BEACON_ON = new THREE.MeshBasicMaterial({ color: 0xffa21a }), BEACON_OFF = lambert(0x7a4a10);
const add = (group, geometry, material, x, y, z, rx = 0, ry = 0, rz = 0) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  group.add(mesh);
  return mesh;
};
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

// each faces local +z (the way it goes), about 7 m long, 3.5 m wide, on y = 0
const MODELS = {
  bulldozer: (g) => {
    for (const side of [-1, 1]) add(g, box(0.9, 1.1, 5), DARK, side * 1.3, 0.55, -0.3);             // tracks
    add(g, box(2.4, 1.4, 4), YELLOW, 0, 1.6, -0.6);                                                   // body
    add(g, box(1.8, 1.5, 1.6), GLASS, 0, 3.0, -1.2);                                                  // cab
    add(g, box(2.0, 0.2, 1.8), YELLOW, 0, 3.85, -1.2);
    add(g, box(3.6, 1.6, 0.35), YELLOW, 0, 1.0, 2.6, -0.2);                                          // blade
    for (const side of [-1, 1]) add(g, box(0.25, 0.25, 1.6), STEEL, side * 1.0, 1.2, 1.7);            // its arms
    add(g, box(0.15, 1.2, 0.15), DARK, 0.6, 2.8, -2.0);                                               // exhaust
  },
  excavator: (g) => {
    for (const side of [-1, 1]) add(g, box(0.9, 1.0, 4.4), DARK, side * 1.3, 0.5, 0);
    add(g, box(2.6, 1.2, 3.2), YELLOW, 0, 1.6, -0.3);                                                 // the house
    add(g, box(1.3, 1.6, 1.4), GLASS, -0.6, 3.0, 0.5);                                                // cab
    add(g, box(2.4, 1.0, 1.0), STEEL, 0, 1.8, -2.1);                                                  // counterweight
    const boom = add(g, box(0.5, 0.5, 3.6), YELLOW, 0.6, 3.4, 1.6, -0.6);                             // boom
    add(g, box(0.4, 0.4, 2.6), YELLOW, 0.6, 3.0, 3.5, 0.9);                                          // stick
    add(g, box(1.2, 0.8, 0.8), DARK, 0.6, 1.6, 4.0, 0.4);                                            // bucket
    g.userData.boom = boom;
  },
  // a road roller: a great steel drum at the front, the cab behind on rubber tyres
  roller: (g) => {
    add(g, new THREE.CylinderGeometry(0.75, 0.75, 2.1, 16).rotateZ(Math.PI / 2), STEEL, 0, 0.75, 1.5);
    add(g, box(2.3, 0.4, 0.5), YELLOW, 0, 1.6, 1.5);                                                 // the drum's frame
    add(g, box(2.0, 1.1, 2.4), YELLOW, 0, 1.2, -0.7);
    add(g, box(1.6, 1.3, 1.2), GLASS, 0, 2.4, -0.9);
    add(g, box(1.8, 0.15, 1.5), YELLOW, 0, 3.1, -0.9);
    for (const side of [-1, 1]) add(g, new THREE.CylinderGeometry(0.55, 0.55, 0.45, 12).rotateZ(Math.PI / 2), DARK, side * 0.9, 0.55, -1.2);
  },
  // a forklift: a squat orange body, a cage over the seat, the mast and its forks at the front
  forklift: (g) => {
    add(g, box(1.4, 1.0, 2.0), ORANGE, 0, 0.8, -0.2);
    add(g, box(1.2, 0.5, 0.6), DARK, 0, 0.75, -1.3);                                                  // counterweight
    for (const [x, z] of [[-0.6, 0.7], [0.6, 0.7], [-0.6, -0.9], [0.6, -0.9]]) add(g, box(0.08, 1.4, 0.08), DARK, x, 2.0, z * 0.9);
    add(g, box(1.3, 0.08, 1.7), DARK, 0, 2.7, -0.1);
    for (const side of [-1, 1]) add(g, box(0.12, 2.6, 0.12), STEEL, side * 0.5, 1.4, 0.95);            // the mast
    for (const side of [-1, 1]) add(g, box(0.15, 0.06, 1.1), STEEL, side * 0.35, 0.3, 1.55);           // the forks
    for (const [x, z] of [[-0.65, 0.5], [0.65, 0.5], [-0.65, -0.9], [0.65, -0.9]]) add(g, new THREE.CylinderGeometry(0.3, 0.3, 0.25, 10).rotateZ(Math.PI / 2), DARK, x, 0.3, z);
  },
  dumpTruck: (g) => {
    for (const z of [-2.2, 0, 2.3]) for (const side of [-1, 1]) add(g, new THREE.CylinderGeometry(0.6, 0.6, 0.5, 12).rotateZ(Math.PI / 2), DARK, side * 1.25, 0.6, z);
    add(g, box(2.5, 0.5, 6.4), DARK, 0, 1.0, 0);                                                      // chassis
    add(g, box(2.5, 2.1, 1.9), ORANGE, 0, 2.2, 2.4);                                                  // cab
    add(g, box(2.2, 0.8, 0.1), GLASS, 0, 2.6, 3.36);
    add(g, box(2.6, 1.6, 4.2), STEEL, 0, 2.1, -0.9, 0.06);                                            // the tipper...
    add(g, box(2.4, 0.6, 3.9), lambert(0x7a5a3a), 0, 2.95, -0.9, 0.06);                               // ...full of dirt
  },
};
const makeMachine = (kind) => {
  const g = new THREE.Group();
  (MODELS[kind] || MODELS.bulldozer)(g);
  const at = { dumpTruck: [3.45, 2.4], roller: [3.3, -0.9], forklift: [2.85, -0.1] }[kind] || [4.15, -1.2];
  const beacon = add(g, box(0.35, 0.35, 0.35), BEACON_OFF, 0, at[0], at[1]);
  g.userData.beacon = beacon;
  if (!CONFIG.machinery.sizes[kind]) g.scale.setScalar(CONFIG.machinery.hw / 3.6); // (the shoulder's machines are their own size)
  return g;
};

const group = new THREE.Group();
scene.add(group);
let meshes = [];
Game.onLoad.push(() => {
  group.clear();
  meshes = (LEVEL.machinery || []).map(m => {
    const mesh = makeMachine(m.kind);
    group.add(mesh);
    return mesh;
  });
});

export const syncMachinery = (now) => {
  meshes.forEach((mesh, i) => {
    const m = Machinery.list[i];
    mesh.visible = !!m && !m.gone;
    if (!mesh.visible) return;
    const heading = Track.toWorld(m.s, m.lat, tmp);
    mesh.position.copy(tmp);
    // (facing the way it is going: across the road; along its shoulder; or a forklift, its forks to the
    // fence, backing out onto the shoulder and driving off it)
    mesh.rotation.y = m.mode === 'along' ? heading + (m.dir > 0 ? 0 : Math.PI)
      : m.mode === 'poke' ? heading - m.side * Math.PI / 2
      : heading + (m.dir > 0 ? -Math.PI / 2 : Math.PI / 2);
    mesh.userData.beacon.material = Math.floor(now / 250 + i) % 2 ? BEACON_ON : BEACON_OFF;
    if (mesh.userData.boom) mesh.userData.boom.rotation.x = -0.6 + 0.2 * Math.sin(now / 700 + i);
    if (m.rest <= 0 && Math.random() < 0.15) { // (a puff of exhaust as it works)
      Particles.emit(tmp.x + rnd(1), tmp.y + 4.5, tmp.z + rnd(1), rnd(0.5), 2, rnd(0.5), 1, 0.4, 1.5, 0, 0x3a3a3a, tmp.y);
    }
  });
  // mud thrown up from the player's wheels, driving through it
  if (Player.active && Track.muddy(Player.s) && Player.speed > 4 && Math.random() < 0.8) {
    const h = Track.toWorld(Player.s - Player.hl, Player.lat + rnd(Player.hw), tmp);
    const back = -Math.min(1, Player.speed / 20) * 4;
    Particles.emit(tmp.x, tmp.y + 0.3, tmp.z, Math.sin(h) * back + rnd(1.5), 2 + Math.random() * 3, Math.cos(h) * back + rnd(1.5),
      0.6 + Math.random() * 0.4, 0.2 + Math.random() * 0.2, 0, 15, Math.random() < 0.5 ? 0x5a4128 : 0x6e5232, tmp.y);
  }
};
