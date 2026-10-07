// ---- A TRACTOR (traffic), AND THE UFO (a level's car) ----
// The models alone (no game state, nothing added to a scene): built here so the game and the menu's pages
// (see ../gimmicks.js) can both use them. Each faces local +z, its feet on y = 0.
import * as THREE from 'three';

const unitBox = new THREE.BoxGeometry(1, 1, 1);
// a green tractor: small wheels in front, big ones behind, a cab at the back
export const makeTractorModel = () => {
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
// a flying saucer, shown in place of the car's body when the car in use is a UFO: userData.body (its
// paint), userData.lamps (the ring of lights underneath, which spins)
export const makeUfo = () => {
  const ufoMesh = new THREE.Group();
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
  return ufoMesh;
};
