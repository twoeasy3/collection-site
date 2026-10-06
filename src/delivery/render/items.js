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
import { buildStrip, THEMES } from './road.js';
import { carMesh, passengerMesh, makeTankMesh, shapeCarMesh, ufoMesh, trafficMeshes, syncLamps } from './cars.js';
import { Traffic } from '../traffic.js';
import { Particles, rnd } from './effects.js';
import { MODELS } from './models.js';
import { TURBO_COLOR, PICKUP_COLOR, PICKUP_MODELS, makeTargetModel } from './pickupModels.js';

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
  // a railway barrier: a low yellow block with black chevrons on both faces and a red lamp at
  // each end (small enough to vanish inside a bullet train going through it)
  railBarrier: (o) => {
    const group = boxModel([[lambert(0xffc400), o.hw * 2, o.height, o.hl * 2, 0, o.height / 2, 0]]);
    const black = lambert(0x1b1b1b), red = new THREE.MeshBasicMaterial({ color: 0xff2020 });
    for (const face of [-1, 1]) for (const x of [-0.8, -0.27, 0.27, 0.8]) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.85, 0.02), black);
      stripe.position.set(x * o.hw / 1.2, o.height / 2, face * (o.hl + 0.01));
      stripe.rotation.z = 0.5;
      group.add(stripe);
    }
    for (const side of [-1, 1]) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), red);
      lamp.position.set(side * (o.hw - 0.15), o.height + 0.07, 0);
      group.add(lamp);
    }
    return group;
  },
  barrier: (o) => boxModel([
    [lambert(0xff6a00), o.hw * 2, o.height, o.hl * 2, 0, o.height / 2, 0],
    [lambert(0xf2f2f2), o.hw * 2 + 0.05, o.height * 0.3, o.hl * 2 + 0.05, 0, o.height * 0.6, 0],
  ]),
  // a round hay bale lying on its side, with a darker band round it
  // a round bale, tied with twine. It all hangs off a roller (userData.roller) at its axle, so
  // a bale on the move can be rolled (see syncPickups)
  bale: (o) => {
    const group = new THREE.Group(), roller = new THREE.Group();
    const radius = o.height / 2;
    roller.position.y = radius;
    group.add(roller);
    const straw = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, o.hw * 2, 16), lambert(0xe2c25a));
    const band = new THREE.Mesh(new THREE.CylinderGeometry(radius + 0.03, radius + 0.03, 0.3, 16), lambert(0xa8842f));
    for (const mesh of [straw, band]) {
      mesh.rotation.z = Math.PI / 2; // axis across the road
      roller.add(mesh);
    }
    const twine = lambert(0x8a6a24);
    for (let i = 0; i < 3; i++) { // three lines of twine along it, which show it turning as it rolls
      const a = i * Math.PI * 2 / 3;
      const line = new THREE.Mesh(new THREE.BoxGeometry(o.hw * 2 + 0.02, 0.06, 0.1), twine);
      line.position.set(0, Math.cos(a) * radius, Math.sin(a) * radius);
      line.rotation.x = a;
      roller.add(line);
    }
    group.userData = { roller };
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
  // a drop bear: a koala gone wrong. A round grey body, big furry ears, a black nose, red eyes, claws out
  dropBear: () => {
    const grey = lambert(0x8e8e92), pale = lambert(0xd8d8dc), black = lambert(0x161616), claw = lambert(0xf2f2ee);
    const group = boxModel([
      [grey, 0.9, 0.8, 0.8, 0, 0.45, 0],            // body
      [pale, 0.5, 0.45, 0.1, 0, 0.45, 0.4],          // belly
      [grey, 0.75, 0.6, 0.6, 0, 1.05, 0.1],          // head
      [black, 0.22, 0.28, 0.14, 0, 0.98, 0.42],      // nose
      [grey, 0.18, 0.3, 0.5, -0.5, 0.45, 0.25],      // arms, reaching
      [grey, 0.18, 0.3, 0.5, 0.5, 0.45, 0.25],
      [claw, 0.18, 0.06, 0.1, -0.5, 0.36, 0.52],     // claws
      [claw, 0.18, 0.06, 0.1, 0.5, 0.36, 0.52],
    ]);
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), pale);
      ear.scale.set(1, 1, 0.5);
      ear.position.set(side * 0.42, 1.35, 0.05);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
      eye.position.set(side * 0.17, 1.15, 0.4);
      group.add(ear, eye);
    }
    return group;
  },
  // a kangaroo, upright: big feet and a long tail behind, small arms, ears up
  kangaroo: () => {
    const fur = lambert(0x9b6b43), pale = lambert(0xd9b48a), dark = lambert(0x3a2a1e);
    return boxModel([
      [fur, 0.55, 1.0, 0.75, 0, 1.0, 0],          // body
      [pale, 0.4, 0.6, 0.1, 0, 0.95, 0.38],        // chest
      [fur, 0.32, 0.35, 0.55, 0, 1.65, 0.25],      // head
      [dark, 0.1, 0.28, 0.08, -0.1, 1.95, 0.15],   // ears
      [dark, 0.1, 0.28, 0.08, 0.1, 1.95, 0.15],
      [fur, 0.12, 0.35, 0.12, -0.18, 1.05, 0.42],  // arms
      [fur, 0.12, 0.35, 0.12, 0.18, 1.05, 0.42],
      [fur, 0.22, 0.45, 0.35, -0.2, 0.3, 0],       // haunches...
      [fur, 0.22, 0.45, 0.35, 0.2, 0.3, 0],
      [dark, 0.16, 0.12, 0.7, -0.2, 0.06, 0.15],   // ...and feet
      [dark, 0.16, 0.12, 0.7, 0.2, 0.06, 0.15],
      [fur, 0.16, 0.16, 1.1, 0, 0.45, -0.85],      // tail
    ]);
  },
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

// a traffic cone: one mesh, orange with a white band, drawn 1.4 times life size (as its hitbox is)
const CONE_PROFILE = [[0.32, 0], [0.32, 0.06], [0.22, 0.06], [0.155, 0.34], [0.155, 0.341], [0.118, 0.5], [0.118, 0.501], [0.05, 0.78], [0, 0.78]];
OBSTACLE_MODELS.cone = () => {
  const geo = new THREE.LatheGeometry(CONE_PROFILE.map(([x, y]) => new THREE.Vector2(x, y)), 10);
  const p = geo.attributes.position, colors = [];
  for (let i = 0; i < p.count; i++) {
    const white = p.getY(i) > 0.3405 && p.getY(i) < 0.5005;
    colors.push(1, white ? 1 : 0.42, white ? 1 : 0.05);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.scale(1.4, 1.4, 1.4);
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
  face.userData.text = true;
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
// a powerup's sign (on the car, or over it) shows while there are `left` seconds of it, and
// blinks through its last CONFIG.powerUpWarning seconds, in time with the warning sound
const powerShown = (left) => left > 0 && (left > CONFIG.powerUpWarning || Math.floor(left * 8) % 2 === 0);

// while a mystery is running, its question-mark block turns over the car (as the ghost does)
const hoverMystery = PICKUP_MODELS.mystery();
hoverMystery.scale.setScalar(1.1);
hoverMystery.visible = false;
scene.add(hoverMystery);

// ...and while one is working, it turns over the car (as the ghost and the mystery do)
const hoverRadar = PICKUP_MODELS.radarDetector();
hoverRadar.scale.setScalar(1.3);
hoverRadar.visible = false;
scene.add(hoverRadar);

// ...and while one is running, the turbocharger turns over the car (as the radar detector does)
const hoverTurbo = PICKUP_MODELS.turbo();
hoverTurbo.scale.setScalar(1.1);
hoverTurbo.visible = false;
scene.add(hoverTurbo);

// ...and while bad gas or the weight is on, the jerry can or the weight turns over it too
const hoverGas = PICKUP_MODELS.badGas();
hoverGas.visible = false;
scene.add(hoverGas);
const hoverWeight = PICKUP_MODELS.heavyMass();
hoverWeight.visible = false;
scene.add(hoverWeight);

// ...and while one is sounding, it rides on the car's roof, flashing
const roofSiren = PICKUP_MODELS.siren();
roofSiren.visible = false;
scene.add(roofSiren);

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
  const group = makeTargetModel();
  Track.toWorld(t.s, t.lat, tmp);
  group.position.set(tmp.x, tmp.y + 2.7, tmp.z);
  return group;
};

// a bridge: a truss standing on both shoulders, with water below. A bridge's style can make it
// 'harbour' (a great steel arch over the road, on granite pylons) or 'seacliff' (concrete, with
// white parapets, on piers standing in the sea)
const buildBridge = (from, to, style) => {
  const wallInset = CONFIG.bridgeWallInset;
  // the river: drawn straight after the ground and, like it, under everything else (dark, at
  // night), at sea level whatever the height of the road (the sea itself, for one over the sea)
  const night = (THEMES[LEVEL.theme] || {}).lit;
  if (style !== 'seacliff') {
    const water = new THREE.Mesh(buildStrip(from + 6, to - 6, -500, 500, 0, 20),
      new THREE.MeshBasicMaterial({ color: night ? 0x1d4466 : 0x2f6f9f, side: THREE.DoubleSide, depthWrite: false }));
    const pos = water.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, -0.02);
    water.renderOrder = -1;
    levelItems.add(water);
  }
  if (style === 'harbour' || style === 'seacliff') { buildStyledBridge(from, to, style); return; }

  // (the top chords and cross beams stand well above the camera, which would otherwise drive through them)
  const BAY = 20, TOP = Math.max(CONFIG.camHeight, CONFIG.screensaver.camHeight) + 4;
  const parts = []; // [s, lat, y, width, height, length]
  for (let s = from; s < to; s += BAY) {
    const len = Math.min(BAY, to - s);
    const wall = (side) => Track.edge(s, side) + wallInset; // (bridges are on the expressway)
    const width = Math.max(0.05, Track.shoulder - wallInset);
    for (const side of [-1, 1]) {
      parts.push([s + len / 2, side * (wall(side) + width / 2), 0.9, width, 1.8, len]); // deck girder filling the shoulder
      parts.push([s, side * (wall(side) + 0.5), TOP / 2, 1, TOP, 1]);                    // post
      parts.push([s + len / 2, side * (wall(side) + 0.5), TOP, 1, 1, len]);               // top chord
    }
    parts.push([s, (wall(1) - wall(-1)) / 2, TOP, wall(1) + wall(-1) + 2, 1, 1]);        // cross beam
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

const buildStyledBridge = (from, to, style) => {
  const wallInset = CONFIG.bridgeWallInset, width = Math.max(0.05, Track.shoulder - wallInset);
  const wall = (s, side) => Track.edge(s, side) + wallInset;
  const parts = [], deck = (s) => { Track.toWorld(s, 0, tmp); return tmp.y; };
  const harbour = style === 'harbour';
  for (let s = from; s < to; s += 10) {
    const len = Math.min(10, to - s);
    for (const side of [-1, 1]) {
      parts.push([s + len / 2, side * (wall(s, side) + width / 2), 0.55, width, 1.1, len]); // (the deck's edge, filling the shoulder)
      if (!harbour) parts.push([s + len / 2, side * (wall(s, side) + 0.2), 1.2, 0.3, 1.0, len]); // (a white parapet)
    }
  }
  const material = new THREE.MeshLambertMaterial({ color: harbour ? 0x8a8f96 : 0xf2f2ee });
  const edges = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, parts.length);
  const dummy = new THREE.Object3D();
  parts.forEach(([s, lat, y, w, h, l], i) => {
    dummy.rotation.y = Track.toWorld(s, lat, tmp);
    dummy.position.set(tmp.x, tmp.y + y, tmp.z);
    dummy.scale.set(w, h, l);
    dummy.updateMatrix();
    edges.setMatrixAt(i, dummy.matrix);
  });
  levelItems.add(edges);
  const column = (s, lat, top, r, colour) => { // a pier, from sea level up to `top`
    Track.toWorld(s, lat, tmp);
    const pier = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.2, top + 0.1, 10), lambert(colour));
    pier.position.set(tmp.x, top / 2 - 0.05, tmp.z);
    levelItems.add(pier);
  };
  if (!harbour) { // the Sea Cliff Bridge: on pairs of piers in the sea
    for (let s = from + 20; s < to - 10; s += 45) for (const side of [-1, 1]) column(s, side * (wall(s, side) - 0.5), deck(s) - 0.4, 1.2, 0xd6d4cc);
    return;
  }
  // the Harbour Bridge: granite pylons at each end, and over the road two great arches, one each
  // side, from pylon to pylon, the road hung from them
  const span = to - from, rise = 95, steel = lambert(0x7d8a92), granite = lambert(0xc4ae86);
  for (const s of [from + 6, to - 6]) for (const side of [-1, 1]) {
    const y0 = deck(s);
    Track.toWorld(s, side * (wall(s, side) + 7), tmp);
    const pylon = new THREE.Mesh(new THREE.BoxGeometry(12, y0 + 40, 14), granite);
    pylon.position.set(tmp.x, (y0 + 40) / 2 - 0.05, tmp.z);
    pylon.rotation.y = Track.toWorld(s, 0, new THREE.Vector3());
    levelItems.add(pylon);
  }
  for (const side of [-1, 1]) {
    for (const [lift, thick] of [[1, 2.2], [0.78, 1.4]]) { // the top chord and the bottom chord
      const points = [];
      for (let k = 0; k <= 40; k++) {
        const t = k / 40, s = from + 14 + (span - 28) * t;
        Track.toWorld(s, side * (wall(s, side) + 3), tmp);
        points.push(new THREE.Vector3(tmp.x, deck(s) + 4 * rise * lift * t * (1 - t) - (lift < 1 ? 0 : 0), tmp.z));
      }
      levelItems.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 80, thick, 8), steel));
    }
    for (let s = from + 40; s < to - 30; s += 22) { // the hangers, from the lower chord down to the deck
      const t = (s - from - 14) / (span - 28), high = 4 * rise * 0.78 * t * (1 - t);
      if (high < 6) continue;
      Track.toWorld(s, side * (wall(s, side) + 3), tmp);
      const hanger = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, high, 6), steel);
      hanger.position.set(tmp.x, deck(s) + high / 2, tmp.z);
      levelItems.add(hanger);
    }
  }
  // (and piers under the deck, down to the water)
  for (let s = from + 30; s < to - 20; s += 60) for (const side of [-1, 1]) column(s, side * (wall(s, side) - 1), deck(s) - 0.4, 1.6, 0xc4ae86);
};

// ---- built when a level is loaded ---------------------------------------------------------------
// (level meshes own their geometry and materials, so emptying the group can free them all)
const place = (mesh) => { levelItems.add(mesh); return mesh; };
// anything with writing on it (userData.text) mirrored back on a left-hand level, which is drawn
// mirrored, so that it still reads
const readable = (object) => object.traverse((mesh) => {
  if (mesh.userData.text) mesh.scale.x = Math.abs(mesh.scale.x) * (Track.mirrored ? -1 : 1);
});
const buildItems = () => {
  clearGroup(levelItems);
  for (const { from, to, style } of LEVEL.bridges || []) buildBridge(from, to, style);
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
Game.onLoad.push(() => { readable(levelItems); readable(hoverMystery); readable(hoverWeight); });

export const syncPickups = (dt) => {
  for (let i = 0; i < pickupMeshes.length; i++) {
    const p = Pickups.items[i], mesh = pickupMeshes[i];
    mesh.visible = !p.taken;
    mesh.userData.gem.rotation.y += dt * 3;
    if (p.washed && !p.taken) { // (washed up by the tide: wherever it was left, bobbing)
      mesh.rotation.y = Track.toWorld(p.s, p.lat, tmp);
      mesh.position.copy(tmp);
      mesh.userData.gem.position.y = 1.7 + 0.25 * Math.sin(performance.now() * 0.004 + i);
    }
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
    if (o.drift && mesh.userData.roller) { // a bale on the move rolls the way it is going
      const last = mesh.userData.last || (mesh.userData.last = { s: o.s, lat: o.lat });
      mesh.userData.roller.rotation.x += Math.hypot(o.s - last.s, o.lat - last.lat) / (o.height / 2);
      last.s = o.s;
      last.lat = o.lat;
    }
  }
  // ghost: the whole car turns pale and see-through (see ghostify), flickering as it runs out
  const ghostly = powerShown(Player.ghost);
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
    custom.userData.livery?.(Player.evil);
  }
  const standard = !tank && !ufo && !custom;
  carMesh.userData.body.visible = carMesh.userData.cabin.visible = standard;
  for (const part of [...carMesh.userData.lights, ...carMesh.userData.trim]) part.visible = standard;
  passengerMesh.visible = powerShown(Player.passenger) && !tank && !ufo;
  // brake lights on any car-shaped car (not a tank or a UFO)
  syncLamps(carMesh, Player, !tank && !ufo, Player.active && Player.brakeLight, 0, false);
  ghostify(carMesh, ghostly);
  const t = performance.now() / 1000;
  hoverGhost.visible = powerShown(Player.ghost) && Player.active && !Game.screensaver;
  if (hoverGhost.visible) { // bobbing over the car, swaying a little
    hoverGhost.position.set(carMesh.position.x, carMesh.position.y + Player.height + 1.6 + Math.sin(t * 2.6) * 0.25, carMesh.position.z);
    hoverGhost.rotation.y = carMesh.rotation.y + Math.sin(t * 1.7) * 0.35;
  }
  hoverMystery.visible = !!Player.mystery && powerShown(Player.mysteryTime) && Player.active && !Game.screensaver;
  if (hoverMystery.visible) { // bobbing over the car, turning
    hoverMystery.position.set(carMesh.position.x, carMesh.position.y + Player.height + 1.4 + Math.sin(t * 2.6) * 0.2, carMesh.position.z);
    hoverMystery.rotation.y += dt * 2;
  }
  hoverRadar.visible = powerShown(Player.radar) && Player.active && !Game.screensaver;
  if (hoverRadar.visible) { // bobbing over the car, turning
    hoverRadar.position.set(carMesh.position.x, carMesh.position.y + Player.height + 1.3 + Math.sin(t * 2.6) * 0.2, carMesh.position.z);
    hoverRadar.rotation.y += dt * 2;
  }
  hoverTurbo.visible = powerShown(Player.turbo) && Player.active && !Game.screensaver;
  if (hoverTurbo.visible) { // bobbing over the car, turning
    hoverTurbo.position.set(carMesh.position.x, carMesh.position.y + Player.height + 1.3 + Math.sin(t * 2.6) * 0.2, carMesh.position.z);
    hoverTurbo.rotation.y += dt * 2;
  }
  for (const [hover, left] of [[hoverGas, Player.badGas], [hoverWeight, Player.heavy]]) {
    hover.visible = powerShown(left) && Player.active && !Game.screensaver;
    if (hover.visible) { // bobbing over the car, turning
      hover.position.set(carMesh.position.x, carMesh.position.y + Player.height + 1.3 + Math.sin(t * 2.6) * 0.2, carMesh.position.z);
      hover.rotation.y += dt * 2;
    }
  }
  roofSiren.visible = powerShown(Player.siren) && Player.active && !Game.screensaver;
  if (roofSiren.visible) { // on the roof, facing the way the car does, red and blue by turns
    roofSiren.position.set(carMesh.position.x, carMesh.position.y + Player.height + 0.25, carMesh.position.z);
    roofSiren.rotation.y = carMesh.rotation.y;
    const flash = Math.floor(t * 6) % 2 === 0;
    roofSiren.userData.red.visible = flash;
    roofSiren.userData.blue.visible = !flash;
  }
  // turbo exhaust
  if (Player.active && powerShown(Player.turbo)) {
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
