import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { CAR } from '../cars.js';
import { LEVEL } from '../levels.js';
import { Track } from '../track.js';
import { Player } from '../player.js';
import { Collision } from '../collision.js';
import { Pickups, Targets } from '../pickups.js';
import { Game } from '../game.js';
import { scene, tmp, clearGroup } from './scene.js';
import { buildStrip } from './road.js';
import { carMesh, passengerMesh, makeTankMesh, shapeCarMesh, ufoMesh, trafficMeshes } from './cars.js';
import { Traffic } from '../traffic.js';
import { Particles, rnd } from './effects.js';
import { MODELS } from './models.js';

// Everything here that belongs to the loaded level (bridges, obstacles, pickups, targets)
// lives in this group and is rebuilt by buildItems() each time a level is loaded.
const levelItems = new THREE.Group();
scene.add(levelItems);
let obstacleMeshes = [], pickupMeshes = [], targetMeshes = [];
let shownCar = CAR; // the car the player's model is currently shaped as
// animated models for the player's car, built the first time each is needed
const playerModels = {};
const playerModel = (car) => {
  if (!playerModels[car.id]) {
    const model = MODELS[car.model](car);
    model.userData.body.material.transparent = true; // (so it can go see-through as a ghost)
    carMesh.add(model);
    playerModels[car.id] = model;
  }
  return playerModels[car.id];
};

const lambert = (color) => new THREE.MeshLambertMaterial({ color });
// a model made of boxes: parts are [material, width, height, length, x, y, z]
const boxModel = (parts) => {
  const group = new THREE.Group();
  for (const [material, w, hgt, l, x, y, z] of parts) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, l), material);
    mesh.position.set(x, y, z);
    group.add(mesh);
  }
  return group;
};

// ---- obstacle models, one builder per kind; all face local +z -------------------------------
const OBSTACLE_MODELS = {
  // a beach umbrella: a pole with a striped canopy
  umbrella: (o) => {
    const group = boxModel([[lambert(0xf4f4f4), 0.1, o.height - 0.5, 0.1, 0, (o.height - 0.5) / 2, 0]]);
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(o.hw * 1.4, 0.7, 10), lambert(0xff6a5a));
    canopy.position.y = o.height - 0.35;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(o.hw * 0.7, 0.36, 10), lambert(0xf4f4f4));
    cap.position.y = o.height - 0.1;
    group.add(canopy, cap);
    return group;
  },
  // a surfboard stuck upright in the road, nose up, with a stripe and a fin
  surfboard: (o) => boxModel([
    [lambert(0xffd23f), o.hw * 2, o.height * 0.8, o.hl * 2, 0, o.height * 0.4, 0],
    [lambert(0xffd23f), o.hw * 1.1, o.height * 0.2, o.hl * 2, 0, o.height * 0.9, 0],   // nose
    [lambert(0x2f7de1), 0.14, o.height * 0.9, o.hl * 2 + 0.04, 0, o.height * 0.45, 0], // stripe
    [lambert(0x2b2f38), 0.08, 0.5, 0.45, 0, o.height * 0.2, -o.hl - 0.2],             // fin
  ]),
  // a wrecked car: a crumpled box car on four wheels, in a paint of its own
  wreck: (o) => {
    const paint = lambert([0x9a5a34, 0x4fc3f7, 0xe23b3b, 0x7ee081, 0xffd23f][Math.floor(Math.random() * 5)]);
    const parts = [
      [paint, o.hw * 2, o.height * 0.5, o.hl * 2, 0, 0.3 + o.height * 0.25, 0],                 // body
      [lambert(0x2b2f38), o.hw * 1.7, o.height * 0.42, o.hl * 0.95, 0, 0.3 + o.height * 0.7, -o.hl * 0.1], // cabin
      [lambert(0x3a3a40), o.hw * 2.1, 0.14, 0.2, 0, 0.45, o.hl],                               // bumpers
      [lambert(0x3a3a40), o.hw * 2.1, 0.14, 0.2, 0, 0.45, -o.hl],
    ];
    for (const x of [-1, 1]) for (const z of [-1, 1]) parts.push([lambert(0x141414), 0.28, 0.66, 0.66, x * (o.hw - 0.1), 0.33, z * o.hl * 0.6]);
    const group = boxModel(parts);
    group.children[0].rotation.z = 0.06; // (a little bent)
    return group;
  },
  // an ice box with a white lid
  cooler: (o) => boxModel([
    [lambert(0x2f7de1), o.hw * 2, o.height * 0.75, o.hl * 2, 0, o.height * 0.375, 0],
    [lambert(0xf4f4f4), o.hw * 2 + 0.06, o.height * 0.25, o.hl * 2 + 0.06, 0, o.height * 0.875, 0],
  ]),
  // a lifeguard chair: a tall white frame with a seat, back and roof
  chair: (o) => {
    const white = lambert(0xf4f4f4), red = lambert(0xff3b30);
    const parts = [];
    for (const x of [-1, 1]) for (const z of [-1, 1]) parts.push([white, 0.12, o.height * 0.65, 0.12, x * o.hw * 0.8, o.height * 0.325, z * o.hl * 0.8]);
    parts.push([white, o.hw * 2, 0.12, o.hl * 2, 0, o.height * 0.65, 0]);                        // seat
    parts.push([white, o.hw * 2, o.height * 0.3, 0.12, 0, o.height * 0.8, -o.hl * 0.8]);        // back
    parts.push([red, o.hw * 2.2, 0.1, o.hl * 2.2, 0, o.height, 0]);                              // roof
    return boxModel(parts);
  },
  // an orange block with a white stripe
  barrier: (o) => boxModel([
    [lambert(0xff6a00), o.hw * 2, o.height, o.hl * 2, 0, o.height / 2, 0],
    [lambert(0xf2f2f2), o.hw * 2 + 0.05, o.height * 0.3, o.hl * 2 + 0.05, 0, o.height * 0.6, 0],
  ]),
  // a round hay bale lying on its side, with a darker band round it
  bale: (o) => {
    const group = new THREE.Group();
    const radius = o.height / 2;
    const straw = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, o.hw * 2, 16), lambert(0xe2c25a));
    const band = new THREE.Mesh(new THREE.CylinderGeometry(radius + 0.03, radius + 0.03, 0.3, 16), lambert(0xa8842f));
    for (const mesh of [straw, band]) {
      mesh.rotation.z = Math.PI / 2; // axis across the road
      mesh.position.y = radius;
      group.add(mesh);
    }
    return group;
  },
  frog: () => {
    const green = lambert(0x3fae4a), dark = lambert(0x2c7d35);
    const group = boxModel([
      [green, 2.4, 1.2, 2.6, 0, 0.8, 0],       // body
      [green, 1.9, 0.9, 1.2, 0, 1.5, 1.2],     // head
      [dark, 0.6, 0.5, 1.7, -1.45, 0.3, -0.5], // back legs
      [dark, 0.6, 0.5, 1.7, 1.45, 0.3, -0.5],
    ]);
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 8), lambert(0xffffff));
      eye.position.set(side * 0.6, 2.15, 1.4);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), new THREE.MeshBasicMaterial({ color: 0x111111 }));
      pupil.position.set(side * 0.6, 2.2, 1.72);
      group.add(eye, pupil);
    }
    return group;
  },
  // a black and white cow
  cow: () => {
    const white = lambert(0xf4f1ea), black = lambert(0x1f1f1f), pink = lambert(0xe8a0a8);
    return boxModel([
      [white, 1.1, 1.0, 2.2, 0, 1.2, 0],          // body
      [black, 1.14, 0.6, 0.8, 0, 1.35, -0.4],     // patches
      [black, 1.14, 0.5, 0.5, 0, 1.1, 0.55],
      [white, 0.7, 0.7, 0.8, 0, 1.55, 1.4],       // head
      [pink, 0.5, 0.3, 0.2, 0, 1.35, 1.82],       // nose
      [black, 0.25, 0.7, 0.25, -0.38, 0.35, 0.8], // legs
      [black, 0.25, 0.7, 0.25, 0.38, 0.35, 0.8],
      [black, 0.25, 0.7, 0.25, -0.38, 0.35, -0.8],
      [black, 0.25, 0.7, 0.25, 0.38, 0.35, -0.8],
    ]);
  },
};

// a traffic cone: one mesh, orange with a white band
const CONE_PROFILE = [[0.32, 0], [0.32, 0.06], [0.22, 0.06], [0.155, 0.34], [0.155, 0.341], [0.118, 0.5], [0.118, 0.501], [0.05, 0.78], [0, 0.78]];
OBSTACLE_MODELS.cone = () => {
  const geo = new THREE.LatheGeometry(CONE_PROFILE.map(([x, y]) => new THREE.Vector2(x, y)), 10);
  const p = geo.attributes.position, colors = [];
  for (let i = 0; i < p.count; i++) {
    const white = p.getY(i) > 0.3405 && p.getY(i) < 0.5005;
    colors.push(1, white ? 1 : 0.42, white ? 1 : 0.05);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
};
// a roadside advertising sign on a post, facing the drivers coming up to it
const SIGNS = [['BUY', '#c62828'], ['SELL', '#1565c0'], ['$$$', '#2e7d32'], ['SALE', '#ef6c00'], ['PROFIT', '#6a1b9a'],
  ['SYNERGY', '#00838f'], ['HIRING', '#283593'], ['MERGE', '#ad1457'], ['INVEST', '#4e342e'], ['BONUS', '#558b2f']];
OBSTACLE_MODELS.sign = (o) => {
  const w = o.hw * 2, top = o.height;
  const group = boxModel([
    [lambert(0x9a9da3), 0.18, top - 1.5, 0.18, 0, (top - 1.5) / 2, 0],  // post
    [lambert(0x22252b), w, 1.5, 0.14, 0, top - 0.75, 0],                 // board
  ]);
  const [text, colour] = SIGNS[Math.round(o.s / 13 + (o.lat > 0 ? 3 : 0)) % SIGNS.length];
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 160;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, 256, 160);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 240, 144);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 80px sans-serif';
  ctx.font = 'bold ' + Math.floor(Math.min(80, 80 * 210 / ctx.measureText(text).width)) + 'px sans-serif';
  ctx.fillText(text, 128, 84);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.12, 1.38), new THREE.MeshBasicMaterial({ map }));
  face.rotation.y = Math.PI;
  face.position.set(0, top - 0.75, -0.08);
  group.add(face);
  return group;
};

// a lumpy rock. Nothing marks whether it is at road level: judging that is the challenge
OBSTACLE_MODELS.asteroid = (o) => {
  const group = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(o.r, 1);
  const p = geo.attributes.position;
  // push each corner in or out a little, so no two rocks are alike. The amount depends on
  // where the corner is, so the faces that share it move together and no cracks open up.
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const noise = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + o.r * 5.1) * 43758.5453;
    const k = 0.78 + (noise - Math.floor(noise)) * 0.4;
    p.setXYZ(i, x * k, y * k, z * k);
  }
  geo.computeVertexNormals();
  const shade = 0.75 + (o.r * 7.3 % 1) * 0.35;
  const rock = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({
    color: new THREE.Color(0x8d8174).multiplyScalar(shade), flatShading: true }));
  group.add(rock);
  group.userData = { rock };
  return group;
};

// ---- pickups and targets ------------------------------------------------------------------------
const TURBO_COLOR = 0x29e0ff;
// the colour of each pickup's pad (and its glow in the HUD)
const PICKUP_COLOR = { turbo: TURBO_COLOR, ghost: 0xf0f0ff, wrench: 0xffa726, passenger: 0xff8fb1, mystery: 0xb36bff };
// a part of a pickup model: a mesh at (x, y, z), optionally turned (rx, ry, rz)
const part = (group, geometry, material, x, y, z, rx = 0, ry = 0, rz = 0) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  group.add(mesh);
  return mesh;
};
// each pickup is a little model of what it does, about 1.5 m across, centred on the origin
const PICKUP_MODELS = {
  // a turbocharger: a snail-shell compressor housing with its wheel showing, an inlet pipe
  // on the front, the turbine housing behind, and an exhaust flange
  turbo: () => {
    const group = new THREE.Group();
    const steel = lambert(0xb8bcc4), dark = lambert(0x4a4e57), glow = new THREE.MeshBasicMaterial({ color: TURBO_COLOR });
    part(group, new THREE.TorusGeometry(0.42, 0.26, 10, 24), steel, 0, 0, 0.1);          // compressor snail
    part(group, new THREE.CylinderGeometry(0.3, 0.3, 0.2, 12), glow, 0, 0, 0.3, Math.PI / 2); // the wheel's glowing eye
    for (let i = 0; i < 6; i++) { // compressor blades
      part(group, new THREE.BoxGeometry(0.08, 0.5, 0.06), dark, 0, 0, 0.34, 0, 0, i * Math.PI / 6);
    }
    part(group, new THREE.CylinderGeometry(0.22, 0.22, 0.6, 12), steel, 0, 0, 0.6, Math.PI / 2);  // inlet pipe
    part(group, new THREE.CylinderGeometry(0.34, 0.34, 0.5, 14), dark, 0, 0, -0.35, Math.PI / 2); // turbine housing
    part(group, new THREE.BoxGeometry(0.9, 0.16, 0.5), dark, 0, -0.5, -0.3);                       // exhaust flange
    part(group, new THREE.CylinderGeometry(0.18, 0.18, 0.4, 10), steel, 0.5, 0.3, -0.3, 0, 0, Math.PI / 2); // oil line
    return group;
  },
  // a cartoon ghost: a sheet with a round head, a wavy hem, two arms and two eyes
  ghost: () => {
    const group = new THREE.Group();
    const sheet = new THREE.MeshLambertMaterial({ color: 0xf4f4ff, transparent: true, opacity: 0.85 });
    const ink = new THREE.MeshBasicMaterial({ color: 0x1b1b2a });
    part(group, new THREE.SphereGeometry(0.62, 16, 12), sheet, 0, 0.35, 0);                 // head
    part(group, new THREE.CylinderGeometry(0.62, 0.52, 0.9, 16), sheet, 0, -0.1, 0);        // body
    for (let i = 0; i < 5; i++) { // the hem's waves
      const a = i * Math.PI * 2 / 5;
      part(group, new THREE.SphereGeometry(0.2, 10, 8), sheet, Math.cos(a) * 0.42, -0.58, Math.sin(a) * 0.42);
    }
    part(group, new THREE.SphereGeometry(0.17, 10, 8), sheet, -0.68, 0.05, 0.1);           // arms, raised: boo
    part(group, new THREE.SphereGeometry(0.17, 10, 8), sheet, 0.68, 0.05, 0.1);
    part(group, new THREE.SphereGeometry(0.1, 8, 6), ink, -0.22, 0.42, 0.52);               // eyes
    part(group, new THREE.SphereGeometry(0.1, 8, 6), ink, 0.22, 0.42, 0.52);
    part(group, new THREE.SphereGeometry(0.09, 8, 6), ink, 0, 0.18, 0.56);                  // an open mouth
    return group;
  },
  // a combination wrench: an open jaw at one end, a ring at the other
  wrench: () => {
    const group = new THREE.Group();
    const orange = lambert(PICKUP_COLOR.wrench), dark = lambert(0x3a3a40);
    part(group, new THREE.BoxGeometry(1.3, 0.2, 0.3), orange, 0, 0, 0);                            // handle
    part(group, new THREE.CylinderGeometry(0.42, 0.42, 0.2, 14), orange, 0.85, 0, 0);               // open-end head
    part(group, new THREE.BoxGeometry(0.34, 0.26, 0.26), dark, 1.0, 0, 0);                          // its jaw
    part(group, new THREE.TorusGeometry(0.3, 0.13, 8, 18), orange, -0.85, 0, 0, Math.PI / 2);       // ring end
    return group;
  },
  // an inflatable passenger: a pink balloon figure, arms up, standing in the road
  passenger: () => {
    const group = new THREE.Group();
    const pink = new THREE.MeshLambertMaterial({ color: PICKUP_COLOR.passenger, emissive: 0x3a1020 });
    const ink = new THREE.MeshBasicMaterial({ color: 0x1b1b2a });
    part(group, new THREE.SphereGeometry(0.34, 14, 10), pink, 0, 0.62, 0);                      // head
    part(group, new THREE.CylinderGeometry(0.3, 0.36, 0.75, 12), pink, 0, 0.0, 0);              // body
    part(group, new THREE.CylinderGeometry(0.11, 0.11, 0.55, 8), pink, -0.42, 0.45, 0, 0, 0, 0.7);  // arms, raised
    part(group, new THREE.CylinderGeometry(0.11, 0.11, 0.55, 8), pink, 0.42, 0.45, 0, 0, 0, -0.7);
    part(group, new THREE.CylinderGeometry(0.12, 0.12, 0.5, 8), pink, -0.16, -0.6, 0);          // legs
    part(group, new THREE.CylinderGeometry(0.12, 0.12, 0.5, 8), pink, 0.16, -0.6, 0);
    part(group, new THREE.SphereGeometry(0.05, 6, 5), ink, -0.11, 0.68, 0.3);                   // eyes
    part(group, new THREE.SphereGeometry(0.05, 6, 5), ink, 0.11, 0.68, 0.3);
    part(group, new THREE.SphereGeometry(0.06, 6, 5), ink, 0, 0.52, 0.32);                      // a surprised mouth
    return group;
  },
};
// ---- the player as a ghost --------------------------------------------------------------------
// Every part of the car, whatever model and livery it has, is drawn in this one pale, glowing,
// see-through material while the ghost lasts: the parts' own materials are put aside and
// given back afterwards. Colour changes meanwhile go to the part's own paint (paintOf).
const GHOST_MAT = new THREE.MeshLambertMaterial({ color: 0xdfe9ff, emissive: 0x4a6cff, transparent: true, opacity: 0.45 });
const ghostify = (group, on) => group.traverse((mesh) => {
  if (!mesh.isMesh) return;
  if (on && !mesh.userData.solidMat) { mesh.userData.solidMat = mesh.material; mesh.material = GHOST_MAT; }
  else if (!on && mesh.userData.solidMat) { mesh.material = mesh.userData.solidMat; mesh.userData.solidMat = null; }
});
const paintOf = (mesh) => mesh.userData.solidMat || mesh.material;
// ...and a cartoon ghost hovers over the car for as long as it lasts (it follows the car,
// rather than riding on it, so that it is never turned ghostly itself)
const hoverGhost = PICKUP_MODELS.ghost();
hoverGhost.scale.setScalar(1.3);
hoverGhost.visible = false;
scene.add(hoverGhost);

// the mystery pickup: a purple block with a question mark on every side
PICKUP_MODELS.mystery = () => {
  const group = new THREE.Group();
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const g = canvas.getContext('2d');
  g.fillStyle = '#b36bff';
  g.fillRect(0, 0, 64, 64);
  g.strokeStyle = '#5a2a8a';
  g.lineWidth = 6;
  g.strokeRect(3, 3, 58, 58);
  g.fillStyle = '#ffffff';
  g.font = 'bold 48px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('?', 32, 35);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  part(group, new THREE.BoxGeometry(1.1, 1.1, 1.1), new THREE.MeshLambertMaterial({ map, emissive: 0x2a1040 }), 0, 0, 0);
  return group;
};

// TOAD RAGE (a mystery): a traffic vehicle that is a toad shows a frog in place of itself,
// hopping as it goes. Call after syncTraffic, which shows each vehicle's own parts.
export const syncToads = (now) => {
  for (let i = 0; i < Traffic.cars.length; i++) {
    const car = Traffic.cars[i], mesh = trafficMeshes[i];
    let toad = mesh.userData.toad;
    if (!car.active || !car.toad) {
      if (toad) toad.visible = false;
      continue;
    }
    if (!toad) {
      toad = mesh.userData.toad = OBSTACLE_MODELS.frog();
      mesh.add(toad);
    }
    toad.visible = true;
    toad.position.y = Math.abs(Math.sin(now / 160 + i)) * 0.6;
    const { body, cabin, lights, trim, bar, models } = mesh.userData;
    for (const part of [body, cabin, bar, ...lights, ...trim, ...Object.values(models)]) part.visible = false;
  }
};

// a spinning model over a glowing pad
const makePickup = (p) => {
  const group = new THREE.Group();
  const gem = PICKUP_MODELS[p.type]();
  gem.scale.setScalar(1.5); // (big enough to make out from the chase camera)
  gem.position.y = 1.7;
  const pad = new THREE.Mesh(new THREE.BoxGeometry(CONFIG.laneWidth * 0.8, 0.02, 5), new THREE.MeshBasicMaterial({
    color: PICKUP_COLOR[p.type], transparent: true, opacity: 0.45, depthWrite: false }));
  pad.position.y = 0.04;
  group.add(gem, pad);
  group.rotation.y = Track.toWorld(p.s, p.lat, tmp);
  group.position.copy(tmp);
  group.userData.gem = gem;
  return group;
};
// TANK RAGE target: a spinning, glowing green ring on a post beside the road
const makeTarget = (t) => {
  const group = new THREE.Group();
  const green = new THREE.MeshBasicMaterial({ color: 0x39ff6a });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.22, 8, 24), green);
  const bull = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 8), green);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(2.1, 16, 12), new THREE.MeshBasicMaterial({
    color: 0x39ff6a, transparent: true, opacity: 0.22, depthWrite: false }));
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.2, 0.2), lambert(0x2b2f38));
  post.position.y = -1.6;
  group.add(ring, bull, glow, post);
  group.userData = { ring, glow };
  Track.toWorld(t.s, t.lat, tmp);
  group.position.set(tmp.x, tmp.y + 2.7, tmp.z);
  return group;
};

// a bridge: a truss standing on both shoulders, with water below
const buildBridge = (from, to) => {
  const wallInset = CONFIG.bridgeWallInset;
  // the river: drawn straight after the ground and, like it, under everything else
  const water = new THREE.Mesh(buildStrip(from + 6, to - 6, -500, 500, -0.02, 20),
    new THREE.MeshBasicMaterial({ color: 0x2f6f9f, side: THREE.DoubleSide, depthWrite: false }));
  water.renderOrder = -1;
  levelItems.add(water);

  const BAY = 20, TOP = 11;
  const parts = []; // [s, lat, y, width, height, length]
  for (let s = from; s < to; s += BAY) {
    const len = Math.min(BAY, to - s);
    const wall = Track.edge(s) + wallInset; // (bridges are on the expressway)
    const width = Math.max(0.05, Track.shoulder - wallInset);
    for (const side of [-1, 1]) {
      parts.push([s + len / 2, side * (wall + width / 2), 0.9, width, 1.8, len]); // deck girder filling the shoulder
      parts.push([s, side * (wall + 0.5), TOP / 2, 1, TOP, 1]);                    // post
      parts.push([s + len / 2, side * (wall + 0.5), TOP, 1, 1, len]);               // top chord
    }
    parts.push([s, 0, TOP, (wall + 1) * 2, 1, 1]);                                  // cross beam
  }
  const truss = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), lambert(0x9c4a3a), parts.length);
  const dummy = new THREE.Object3D();
  parts.forEach(([s, lat, y, width, height, length], i) => {
    dummy.rotation.y = Track.toWorld(s, lat, tmp);
    dummy.position.set(tmp.x, tmp.y + y, tmp.z);
    dummy.scale.set(width, height, length);
    dummy.updateMatrix();
    truss.setMatrixAt(i, dummy.matrix);
  });
  levelItems.add(truss);
};

// ---- built when a level is loaded ---------------------------------------------------------------
// (level meshes own their geometry and materials, so emptying the group can free them all)
const place = (mesh) => { levelItems.add(mesh); return mesh; };
const buildItems = () => {
  clearGroup(levelItems);
  for (const { from, to } of LEVEL.bridges || []) buildBridge(from, to);
  obstacleMeshes = Collision.obstacles.map((o) => {
    const mesh = place(OBSTACLE_MODELS[o.kind](o));
    mesh.rotation.y = Track.toWorld(o.s, o.lat, tmp);
    mesh.position.copy(tmp);
    return mesh;
  });
  pickupMeshes = Pickups.items.map((p) => place(makePickup(p)));
  targetMeshes = Targets.items.map((t) => place(makeTarget(t)));
};
Game.onLoad.push(buildItems);

export const syncPickups = (dt) => {
  for (let i = 0; i < pickupMeshes.length; i++) {
    pickupMeshes[i].visible = !Pickups.items[i].taken;
    pickupMeshes[i].userData.gem.rotation.y += dt * 3;
  }
  const here = Track.along(Player.s);
  for (let i = 0; i < obstacleMeshes.length; i++) {
    const o = Collision.obstacles[i], mesh = obstacleMeshes[i];
    // (nothing is drawn beyond the fog: a level can have hundreds of cones)
    mesh.visible = !o.gone && Math.abs(Track.along(o.s) - here) < 700; // (well inside the fog, so nothing is seen to appear)
    if (!mesh.visible) continue;
    // follow it (most don't move, but it costs little) and face the way it is going
    mesh.rotation.y = Track.toWorld(o.s, o.lat, tmp) - o.face;
    if (o.kind === 'asteroid') {
      // the group sits on the road; the rock hangs h above (or below) it and tumbles
      mesh.position.copy(tmp);
      mesh.userData.rock.position.y = o.h;
      mesh.userData.rock.rotation.x += dt * o.spin;
      mesh.userData.rock.rotation.z += dt * o.spin * 0.6;
    } else {
      mesh.position.set(tmp.x, tmp.y + o.h, tmp.z);
    }
  }
  // ghost: the whole car turns pale and see-through (see ghostify), flickering as it runs out
  const ghostly = Player.ghost > 0 && (Player.ghost > 1.5 || Math.floor(Player.ghost * 8) % 2 === 0);
  const livery = Player.evil ? CAR.evilColor : CAR.color; // each car has a livery per side
  if (shownCar !== CAR) { // a different car (the garage's, or a level's own): take its shape
    shapeCarMesh(carMesh, CAR);
    shownCar = CAR;
  }
  const tank = Player.tank > 0;
  // a UFO hovers, bobbing, with its ring of lights turning
  const ufo = !!CAR.ufo && !tank;
  ufoMesh.visible = ufo;
  if (ufo) {
    ufoMesh.position.y = 1.0 + Math.sin(performance.now() / 300) * 0.15;
    ufoMesh.userData.lamps.rotation.y += dt * 4;
    paintOf(ufoMesh.userData.body).color.setHex(livery);
  }
  tankMesh.visible = tank;
  // the garage's Tank wears its own liveries; a car in TANK RAGE turns army olive
  paintOf(tankMesh.userData.body).color.setHex(!CAR.tank ? TANK_OLIVE : livery);
  paintOf(carMesh.userData.body).color.setHex(livery);
  // a car with an animated model of its own shows that in place of the standard box car,
  // and its animation runs for as long as it is on screen
  const custom = CAR.model && !tank ? playerModel(CAR) : null;
  for (const id in playerModels) playerModels[id].visible = playerModels[id] === custom;
  if (custom) {
    custom.userData.animate(performance.now() / 1000);
    paintOf(custom.userData.body).color.setHex(livery);
  }
  const standard = !tank && !ufo && !custom;
  carMesh.userData.body.visible = carMesh.userData.cabin.visible = standard;
  for (const part of [...carMesh.userData.lights, ...carMesh.userData.trim]) part.visible = standard;
  passengerMesh.visible = Player.passenger > 0 && !tank && !ufo;
  ghostify(carMesh, ghostly);
  hoverGhost.visible = Player.ghost > 0 && Player.active && !Game.screensaver;
  if (hoverGhost.visible) { // bobbing over the car, swaying a little
    const t = performance.now() / 1000;
    hoverGhost.position.set(carMesh.position.x, carMesh.position.y + Player.height + 1.6 + Math.sin(t * 2.6) * 0.25, carMesh.position.z);
    hoverGhost.rotation.y = carMesh.rotation.y + Math.sin(t * 1.7) * 0.35;
  }
  // turbo exhaust
  if (Player.active && Player.turbo > 0) {
    const h = Track.toWorld(Player.s - Player.hl, Player.lat, tmp);
    for (let n = 0; n < 2; n++) {
      Particles.emit(tmp.x + rnd(0.5), tmp.y + 0.6, tmp.z + rnd(0.5),
        Math.sin(h) * Player.speed * 0.5 + rnd(1), Math.random(), Math.cos(h) * Player.speed * 0.5 + rnd(1),
        0.3, 0.5, 0.5, 0, Math.random() < 0.5 ? TURBO_COLOR : 0xffffff);
    }
  }
};

export const syncTargets = (dt) => {
  const pulse = 1 + Math.sin(performance.now() / 180) * 0.15;
  for (let i = 0; i < targetMeshes.length; i++) {
    const mesh = targetMeshes[i];
    mesh.visible = !Targets.items[i].used;
    mesh.userData.ring.rotation.y += dt * 3;
    mesh.userData.glow.scale.setScalar(pulse);
  }
};

// ---- the tank the player's car turns into during TANK RAGE --------------------------------
const TANK_OLIVE = 0x4b5a2a;
const tankMesh = makeTankMesh(TANK_OLIVE);
tankMesh.visible = false;
carMesh.add(tankMesh);
