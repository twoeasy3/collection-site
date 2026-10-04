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
import { carMesh, playerMats, passengerMesh, makeTankMesh, shapeCarMesh, ufoMesh } from './cars.js';
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
const PICKUP_LOOK = {
  turbo: { color: TURBO_COLOR, geo: () => new THREE.OctahedronGeometry(0.9) },
  ghost: { color: 0xf0f0ff, geo: () => new THREE.IcosahedronGeometry(0.9, 1) },
  wrench: { color: 0xffa726, geo: () => new THREE.BoxGeometry(1.5, 0.5, 0.5) },
  passenger: { color: 0xff8fb1, geo: () => new THREE.SphereGeometry(0.8, 14, 10) },
};
// a spinning marker over a glowing pad
const makePickup = (p) => {
  const look = PICKUP_LOOK[p.type];
  const group = new THREE.Group();
  const gem = new THREE.Mesh(look.geo(), new THREE.MeshBasicMaterial({
    color: look.color, transparent: p.type === 'ghost', opacity: p.type === 'ghost' ? 0.6 : 1 }));
  gem.position.y = 1.4;
  const pad = new THREE.Mesh(new THREE.BoxGeometry(CONFIG.laneWidth * 0.8, 0.02, 5), new THREE.MeshBasicMaterial({
    color: look.color, transparent: true, opacity: 0.45, depthWrite: false }));
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
    mesh.visible = !o.gone && Math.abs(Track.along(o.s) - here) < 620;
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
  // ghost: the player's car goes see-through, flickering as it runs out
  const ghostly = Player.ghost > 0 && (Player.ghost > 1.5 || Math.floor(Player.ghost * 8) % 2 === 0);
  for (const mat of playerMats) mat.opacity = ghostly ? 0.35 : 1;
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
    ufoMesh.userData.body.material.color.setHex(Player.evil ? CAR.evilColor : CAR.color);
  }
  tankMesh.visible = tank;
  // the garage's Tank wears its own liveries; a car in TANK RAGE turns army olive
  tankMesh.userData.body.material.color.setHex(!CAR.tank ? TANK_OLIVE : Player.evil ? CAR.evilColor : CAR.color);
  carMesh.userData.body.material.color.setHex(Player.evil ? CAR.evilColor : CAR.color); // each car has a livery per side
  // a car with an animated model of its own shows that in place of the standard box car,
  // and its animation runs for as long as it is on screen
  const custom = CAR.model && !tank ? playerModel(CAR) : null;
  for (const id in playerModels) playerModels[id].visible = playerModels[id] === custom;
  if (custom) {
    custom.userData.animate(performance.now() / 1000);
    custom.userData.body.material.color.setHex(Player.evil ? CAR.evilColor : CAR.color);
    custom.userData.body.material.opacity = ghostly ? 0.35 : 1;
  }
  const standard = !tank && !ufo && !custom;
  carMesh.userData.body.visible = carMesh.userData.cabin.visible = standard;
  for (const part of [...carMesh.userData.lights, ...carMesh.userData.trim]) part.visible = standard;
  passengerMesh.visible = Player.passenger > 0 && !tank && !ufo;
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
