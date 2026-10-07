// ---- THE BULLET TRAIN'S CARRIAGES (see bullettrain.js) ----
// The models alone (no game state, nothing added to a scene): built here so the game and the menu's pages
// (see ../gimmicks.js) can both use them. Each faces local +z, its feet on y = 0.
import * as THREE from 'three';
import { CONFIG } from '../config.js';

const T = CONFIG.bulletTrain;
const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const WHITE = lambert(0xf4f6f8), BLUE = lambert(0x1f4fa8), GLASS = lambert(0x1b2430), SKIRT = lambert(0x9aa1ab);
const LAMP = new THREE.MeshBasicMaterial({ color: 0xfff6d0 }), TAIL = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
const add = (group, geometry, material, x, y, z) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
};

// one carriage, its front towards local +z; `nose`: one with a nose (lamps lit: the front end)
export const makeCarriage = (nose, lit) => {
  const group = new THREE.Group();
  const w = T.hw * 2 - 0.2, h = T.height, L = T.carLength - 0.8;
  const nl = nose ? 9 : 0, body = L - nl; // (the nose takes the front of the carriage)
  const bz = -nl / 2; // the boxy part's centre
  add(group, new THREE.BoxGeometry(w, h - 0.5, body), WHITE, 0, 0.5 + (h - 0.5) / 2, bz);
  add(group, new THREE.BoxGeometry(w + 0.04, 0.5, body), SKIRT, 0, 0.35, bz);           // the skirt over the wheels
  add(group, new THREE.BoxGeometry(w + 0.06, 0.35, body), BLUE, 0, 1.25, bz);           // the stripe
  add(group, new THREE.BoxGeometry(w + 0.05, 0.75, body * 0.92), GLASS, 0, 2.3, bz);    // the windows
  if (nose) {
    // a long, low, flattened cone, and the cab's windscreen where it meets the body
    const cone = add(group, new THREE.ConeGeometry(w / 2, nl, 16, 1).rotateX(Math.PI / 2), WHITE, 0, 1.35, L / 2 - nl / 2);
    cone.scale.set(1, 0.55, 1);
    const stripe = add(group, new THREE.ConeGeometry(w / 2 + 0.03, nl * 0.85, 16, 1).rotateX(Math.PI / 2), BLUE, 0, 1.1, L / 2 - nl * 0.55);
    stripe.scale.set(1, 0.2, 1);
    add(group, new THREE.BoxGeometry(w * 0.7, 0.6, 1.6), GLASS, 0, 2.15, L / 2 - nl - 0.2);
    for (const side of [-1, 1]) add(group, new THREE.BoxGeometry(0.4, 0.2, 0.1), lit ? LAMP : TAIL, side * 0.65, 1.1, L / 2 - nl * 0.35);
  }
  group.rotation.order = 'YXZ'; // turn to the heading first, then pitch with the slope
  return group;
};
