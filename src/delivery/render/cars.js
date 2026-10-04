import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { CAR } from '../cars.js';
import { Track } from '../track.js';
import { Player } from '../player.js';
import { Traffic } from '../traffic.js';
import { scene, tmp } from './scene.js';
import { MODELS } from './models.js';

// ---- cars (front faces local +z), sized from each vehicle's hitbox -----------
export const unitBox = new THREE.BoxGeometry(1, 1, 1);
const cabinMat = new THREE.MeshLambertMaterial({ color: 0x2b2f38 });
const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfff3c4 });
const taillightMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
const bumperMat = new THREE.MeshLambertMaterial({ color: 0x2a2c31 });
const tyreMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
const wheelGeo = new THREE.CylinderGeometry(1, 1, 1, 12).rotateZ(Math.PI / 2); // axle across the car
export const makeCarMesh = (color) => {
  const group = new THREE.Group();
  const body = new THREE.Mesh(unitBox, new THREE.MeshLambertMaterial({ color }));
  const cabin = new THREE.Mesh(unitBox, cabinMat);
  // two headlights at the front, two tail lights at the back
  const lights = [headlightMat, headlightMat, taillightMat, taillightMat].map(mat => new THREE.Mesh(unitBox, mat));
  const roof = new THREE.Mesh(unitBox, body.material); // (in the body's paint)
  const bumpers = [0, 1].map(() => new THREE.Mesh(unitBox, bumperMat));
  const wheels = [0, 1, 2, 3].map(() => new THREE.Mesh(wheelGeo, tyreMat));
  group.add(body, cabin, ...lights, roof, ...bumpers, ...wheels);
  // (trim: everything that is hidden along with the body when another model stands in for it)
  group.userData = { body, cabin, lights, roof, bumpers, wheels, trim: [roof, ...bumpers, ...wheels] };
  group.rotation.order = 'YXZ'; // turn to the heading first, then pitch with the slope
  scene.add(group);
  return group;
};
export const shapeCarMesh = (group, v) => {
  const { body, cabin, lights, roof, bumpers, wheels } = group.userData;
  const w = v.hw * 2, l = v.hl * 2, h = v.height;
  const boxy = v.kind === 'bus' || v.kind === 'van';
  const R = v.kind === 'bus' ? 0.45 : 0.34;
  wheels.forEach((wheel, i) => {
    wheel.scale.set(0.28, R, R);
    wheel.position.set((i % 2 ? 1 : -1) * (w / 2 - 0.08), R, (i < 2 ? 1 : -1) * l * 0.31);
  });
  bumpers.forEach((bumper, i) => {
    bumper.scale.set(w + 0.08, 0.16, 0.14);
    bumper.position.set(0, 0.42, (i ? -1 : 1) * (l / 2 + 0.02));
  });
  lights.forEach((light, i) => {
    const front = i < 2, side = i % 2 ? 1 : -1;
    light.scale.set(w * 0.22, front ? 0.22 : 0.16, 0.1);
    light.position.set(side * w * 0.32, 0.3 + (boxy ? 0.5 : h * 0.3), (front ? 1 : -1) * (l / 2 + 0.01));
  });
  if (boxy) {
    // boxy: full-height body with a band of windows round it
    const bus = v.kind === 'bus';
    body.scale.set(w, h - 0.3, l);
    body.position.y = 0.3 + (h - 0.3) / 2;
    cabin.scale.set(w * 1.03, h * 0.24, l * (bus ? 0.92 : 0.5));
    cabin.position.set(0, 0.3 + h * 0.62, bus ? 0 : l * 0.22);
    roof.scale.set(w * 0.94, 0.08, l * 0.96);
    roof.position.set(0, h, 0);
  } else {
    body.scale.set(w, h * 0.5, l);
    body.position.y = 0.3 + h * 0.25;
    cabin.scale.set(w * 0.85, h * 0.45, l * 0.5);
    cabin.position.set(0, 0.3 + h * 0.725, -l * 0.07);
    roof.scale.set(w * 0.87, 0.07, l * 0.46);
    roof.position.set(0, 0.3 + h * 0.95, -l * 0.08);
  }
};

// a tank, front facing local +z. Its paint is userData.body.material, like a car's.
export const makeTankMesh = (color) => {
  const group = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color });
  const dark = new THREE.MeshLambertMaterial({ color: 0x23261c });
  const steel = new THREE.MeshLambertMaterial({ color: 0x4a4d45 });
  const part = (material, w, hgt, l, x, y, z) => {
    const mesh = new THREE.Mesh(unitBox, material);
    mesh.scale.set(w, hgt, l);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };
  // a cylinder lying along the car's width ('x') or its length ('z'), or standing up ('y')
  const drum = (material, radius, length, axis, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 14), material);
    if (axis === 'x') mesh.rotation.z = Math.PI / 2;
    if (axis === 'z') mesh.rotation.x = Math.PI / 2;
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };
  for (const side of [-1, 1]) {
    part(dark, 0.55, 0.62, 4.1, side, 0.4, 0);                         // track run,
    drum(dark, 0.4, 0.55, 'x', side, 0.4, 2.0);                        // rounded off at each end
    drum(dark, 0.4, 0.55, 'x', side, 0.4, -2.0);
    for (let i = 0; i < 5; i++) drum(steel, 0.27, 0.08, 'x', side * 1.28, 0.34, -1.6 + i * 0.8); // road wheels
    part(paint, 0.66, 0.07, 4.7, side, 0.84, 0);                       // mudguards
    part(new THREE.MeshBasicMaterial({ color: 0xfff3c4 }), 0.2, 0.14, 0.08, side * 0.72, 1.12, 2.17); // headlights
    drum(steel, 0.17, 0.75, 'x', side * 0.45, 1.12, -2.3);             // fuel drums on the back
  }
  const hull = part(paint, 2.0, 0.8, 4.3, 0, 0.9, 0);
  const glacis = part(paint, 1.5, 0.07, 0.95, 0, 1.02, 2.1);           // sloping front plate
  glacis.rotation.x = 0.72;
  part(dark, 1.2, 0.05, 0.7, 0, 1.31, -1.7);                           // engine grille
  part(paint, 1.4, 0.65, 1.9, 0, 1.6, -0.3);                           // turret,
  part(paint, 1.0, 0.45, 0.5, 0, 1.58, -1.45);                         // its bustle,
  part(dark, 0.6, 0.42, 0.3, 0, 1.62, 0.75);                           // and gun mantlet
  drum(dark, 0.12, 2.5, 'z', 0, 1.65, 2.05);                           // barrel
  drum(dark, 0.18, 0.36, 'z', 0, 1.65, 3.15);                          // muzzle brake
  drum(dark, 0.3, 0.1, 'y', 0.3, 1.97, -0.55);                         // hatch
  part(dark, 0.07, 0.07, 0.6, 0.3, 2.1, -0.15);                        // machine gun
  part(dark, 0.03, 1.3, 0.03, -0.55, 2.55, -1.05);                     // aerial
  group.userData = { body: hull };
  return group;
};

export const carMesh = makeCarMesh(CAR.color);
shapeCarMesh(carMesh, Player);
// a different car picked in the garage: the player's model takes its shape
// (its colour is set every frame, in items.js)
// a flying saucer, shown in place of the car's body when the car in use is a UFO
export const ufoMesh = new THREE.Group();
{
  const hull = new THREE.MeshLambertMaterial({ color: 0xc9d2dc });
  const saucer = new THREE.Mesh(new THREE.SphereGeometry(1.5, 24, 12), hull);
  saucer.scale.y = 0.28;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.12, 8, 28), new THREE.MeshBasicMaterial({ color: 0x66f0ff }));
  rim.rotation.x = Math.PI / 2;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.75, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: 0x7fe8ff, transparent: true, opacity: 0.7 }));
  dome.position.y = 0.25;
  const lamps = new THREE.Group(); // a ring of lights underneath, which spins
  for (let i = 0; i < 6; i++) {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff3a0 }));
    lamp.position.set(Math.cos(i * Math.PI / 3) * 1.0, -0.28, Math.sin(i * Math.PI / 3) * 1.0);
    lamps.add(lamp);
  }
  ufoMesh.add(saucer, rim, dome, lamps);
  ufoMesh.userData = { body: saucer, lamps };
  ufoMesh.visible = false;
  carMesh.add(ufoMesh);
}
// the player's car can turn see-through (ghost), so it needs materials of its own
carMesh.userData.cabin.material = cabinMat.clone();
export const playerMats = [carMesh.userData.body.material, carMesh.userData.cabin.material];
for (const mat of playerMats) mat.transparent = true;
// the inflatable passenger: a pink balloon figure riding along while it is active
export const passengerMesh = new THREE.Group();
{
  const pink = new THREE.MeshLambertMaterial({ color: 0xff8fb1 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.33, 12, 8), pink);
  head.position.y = 0.55;
  const torso = new THREE.Mesh(unitBox, pink);
  torso.scale.set(0.5, 0.6, 0.35);
  passengerMesh.add(head, torso);
  passengerMesh.position.set(-0.4, 2.2, -0.3); // sticking out of the roof, passenger side
  passengerMesh.visible = false;
  carMesh.add(passengerMesh);
}

// a green tractor: small wheels in front, big ones behind, a cab at the back
const makeTractorModel = () => {
  const lambert = (color) => new THREE.MeshLambertMaterial({ color });
  const green = lambert(0x2e8b3d), yellow = lambert(0xf2c230);
  const group = new THREE.Group();
  for (const [material, w, hgt, l, x, y, z] of [
    [green, 1.3, 0.9, 2.2, 0, 1.2, 0.9],                // bonnet
    [green, 1.7, 0.5, 1.8, 0, 1.0, -0.9],               // rear deck
    [lambert(0x2b2f38), 1.5, 1.3, 1.4, 0, 1.9, -0.9],   // cab
    [yellow, 1.7, 0.15, 1.6, 0, 2.6, -0.9],             // cab roof
    [lambert(0x444444), 0.2, 1.0, 0.2, 0.4, 2.1, 1.5],  // exhaust
  ]) {
    const part = new THREE.Mesh(unitBox, material);
    part.scale.set(w, hgt, l);
    part.position.set(x, y, z);
    group.add(part);
  }
  const rubber = lambert(0x161616);
  for (const [radius, width, x, z] of [[1.0, 0.6, 1.2, -1.0], [1.0, 0.6, -1.2, -1.0], [0.55, 0.4, 0.95, 1.4], [0.55, 0.4, -0.95, 1.4]]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 14), rubber);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, radius, z);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.45, radius * 0.45, width + 0.04, 10), yellow);
    hub.rotation.z = Math.PI / 2;
    hub.position.copy(wheel.position);
    group.add(wheel, hub);
  }
  return group;
};

// good cars wear bright colours, evil cars dark ones
const PAINTS = {
  good: [0xffd23f, 0x4fc3f7, 0x7ee081, 0xff8fb1, 0xffffff, 0xff9f43],
  evil: [0x24242b, 0x3a1f4d, 0x4a1c1c, 0x1f3a3a, 0x3b3b1f, 0x1c2a4a],
};
const POLICE_PAINT = 0xf5f5f5;
const trafficMeshes = Traffic.cars.map(() => {
  const mesh = makeCarMesh(PAINTS.good[0]);
  // roof light bar, only shown (and flashing) on police cars
  const bar = new THREE.Mesh(unitBox, new THREE.MeshBasicMaterial({ color: 0x2060ff }));
  bar.scale.set(1.3, 0.22, 0.35);
  bar.position.set(0, 1.85, -0.3);
  mesh.add(bar);
  mesh.userData.bar = bar;
  mesh.userData.models = {};
  return mesh;
});
// A kind of vehicle with a model of its own (the tractor, and any kind with a "model" in
// CONFIG.vehicles): built the first time this mesh needs it, and kept for the next time.
const ownModel = (mesh, car) => {
  const type = CONFIG.vehicles[car.kind];
  if (car.kind !== 'tractor' && !type.model) return null;
  const models = mesh.userData.models;
  if (!models[car.kind]) {
    models[car.kind] = car.kind === 'tractor' ? makeTractorModel() : MODELS[type.model]({ ...type, color: 0xffffff });
    mesh.add(models[car.kind]);
  }
  return models[car.kind];
};
export const syncTraffic = () => {
  for (let i = 0; i < Traffic.cars.length; i++) {
    const car = Traffic.cars[i], mesh = trafficMeshes[i];
    mesh.visible = car.active;
    if (!car.active) continue;
    mesh.rotation.y = Track.toWorld(car.s, car.lat, tmp) - car.yaw + (car.dir < 0 ? Math.PI : 0); // (a spin-out's turn is in yaw too)
    mesh.position.copy(tmp);
    mesh.rotation.x = car.spin > 0 ? 0 : -Math.atan(Track.grade(car.s)) * car.dir; // tilt with the slope
    shapeCarMesh(mesh, car);
    const police = car.kind === 'police';
    const paints = PAINTS[car.evil ? 'evil' : 'good'];
    const paint = police ? POLICE_PAINT : paints[car.paint % paints.length];
    mesh.userData.body.material.color.setHex(paint);
    mesh.userData.bar.visible = police;
    // a vehicle with a model of its own shows that in place of the standard box car
    const own = ownModel(mesh, car);
    for (const kind in mesh.userData.models) mesh.userData.models[kind].visible = mesh.userData.models[kind] === own;
    if (own && own.userData.body) { // (one of the garage's models: it takes this car's paint, and animates)
      own.userData.body.material.color.setHex(paint);
      own.userData.animate(performance.now() / 1000 + i);
    }
    mesh.userData.body.visible = mesh.userData.cabin.visible = !own;
    for (const part of [...mesh.userData.lights, ...mesh.userData.trim]) part.visible = !own;
    if (police) {
      mesh.userData.bar.material.color.setHex(Math.floor(performance.now() / 160 + i) % 2 ? 0xff2020 : 0x2060ff);
    }
  }
};
