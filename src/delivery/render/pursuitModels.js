// ---- THE POLICE PURSUIT'S MODELS (see pursuit.js, CONFIG.pursuit): the interceptor, which is drawn for nothing
// else in the game, and the getaway car, both added to MODELS (./models.js) so they are drawn like any other
// vehicle (each faces local +z, its paint is userData.body's material, and userData.animate(t) moves what
// moves); and the bag of cash, the police helicopter with its light, and the robber with his bag. No game
// state in here: the gimmicks page shows them too.
import * as THREE from 'three';
import { MODELS } from './models.js';

const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const glow = (color, extra) => new THREE.MeshBasicMaterial({ color, ...extra });
const box = (parent, material, w, h, l, x, y, z) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
const wheels = (parent, w, zs, r, wide) => {
  const tyre = lambert(0x121212), hub = lambert(0x8d9299);
  for (const z of zs) for (const side of [-1, 1]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(r, r, wide, 14).rotateZ(Math.PI / 2), tyre);
    wheel.position.set(side * (w / 2 - wide / 2 + 0.04), r, z);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, wide + 0.02, 10).rotateZ(Math.PI / 2), hub);
    cap.position.copy(wheel.position);
    parent.add(wheel, cap);
  }
};
const GLASS = lambert(0x1a212b), LAMP = glow(0xfff3c4), TAIL = glow(0xff2a2a), DARK = lambert(0x16181c), STEEL = lambert(0xb9bec6);
const RED = 0xff2020, BLUE = 0x2060ff, OFF = 0x22252b;

Object.assign(MODELS, {
  // the interceptor: low and wide, black with white doors, a full-width light bar low on the roof, a steel
  // push bar on the nose, a wing on the tail, strobes in the grille. userData.lights(on): its lights going or not
  interceptor: (car) => {
    const group = new THREE.Group(), w = car.hw * 2, l = car.hl * 2, paint = lambert(car.color), white = lambert(0xf2f2f2);
    const body = box(group, paint, w, 0.44, l, 0, 0.5, 0);                                // a low slab of a body,
    box(group, paint, w * 0.96, 0.16, l * 0.36, 0, 0.78, l * 0.3).rotation.x = 0.07;      // a long bonnet falling to the nose,
    box(group, DARK, w * 1.02, 0.1, 0.5, 0, 0.26, l / 2 - 0.1);                           // a splitter under it,
    box(group, DARK, w * 1.03, 0.12, l * 0.5, 0, 0.3, 0);                                 // sills,
    for (const side of [-1, 1]) {
      box(group, white, 0.04, 0.34, l * 0.34, side * (w / 2 + 0.005), 0.52, -l * 0.04);   // white doors,
      box(group, glow(0xffd21f), 0.045, 0.07, l * 0.34, side * (w / 2 + 0.008), 0.36, -l * 0.04); // a yellow stripe along them,
      box(group, paint, 0.16, 0.2, l * 0.2, side * (w / 2 - 0.02), 0.62, l * 0.31);       // and arches swelling over the wheels
      box(group, paint, 0.16, 0.2, l * 0.2, side * (w / 2 - 0.02), 0.62, -l * 0.31);
    }
    box(group, GLASS, w * 0.8, 0.36, l * 0.4, 0, 0.9, -l * 0.07);                         // a shallow cabin,
    box(group, white, w * 0.78, 0.05, l * 0.3, 0, 1.1, -l * 0.08);                        // its white roof
    // the light bar: six lamps across a dark housing, the full width of the roof
    box(group, DARK, w * 0.8, 0.06, 0.34, 0, 1.15, -l * 0.02);
    const lamps = [];
    for (let k = 0; k < 6; k++) lamps.push(box(group, glow(k < 3 ? RED : BLUE), w * 0.8 / 6 - 0.03, 0.13, 0.26, (k - 2.5) * w * 0.8 / 6, 1.24, -l * 0.02));
    // the push bar: two uprights and two rails of steel, out ahead of the nose
    for (const side of [-1, 1]) box(group, STEEL, 0.09, 0.56, 0.09, side * w * 0.2, 0.56, l / 2 + 0.24);
    for (const y of [0.42, 0.72]) box(group, STEEL, w * 0.62, 0.08, 0.08, 0, y, l / 2 + 0.26);
    for (const side of [-1, 1]) box(group, STEEL, 0.07, 0.07, 0.3, side * w * 0.2, 0.42, l / 2 + 0.1);
    // strobes in the grille, slim headlights, a strip of tail light, a wing
    const strobes = [-1, 1].map(side => box(group, glow(side < 0 ? RED : BLUE), 0.22, 0.09, 0.05, side * w * 0.12, 0.52, l / 2 + 0.03));
    for (const side of [-1, 1]) box(group, LAMP, w * 0.2, 0.09, 0.06, side * w * 0.36, 0.66, l / 2 + 0.01);
    box(group, TAIL, w * 0.86, 0.08, 0.06, 0, 0.64, -l / 2 - 0.01);
    for (const side of [-1, 1]) box(group, DARK, 0.06, 0.2, 0.22, side * w * 0.34, 0.82, -l / 2 + 0.2);
    box(group, paint, w * 0.92, 0.04, 0.32, 0, 0.93, -l / 2 + 0.2);
    box(group, DARK, 0.03, 0.5, 0.03, w * 0.3, 1.38, -l * 0.3);                           // and an aerial
    wheels(group, w, [l * 0.31, -l * 0.31], 0.37, 0.36);
    let lit = true;
    group.userData = { body, lights: (on) => { lit = on; }, animate: (t) => {
      const phase = Math.floor(t * 9) % 4; // (red side, red side, blue side, blue side: each a double flash)
      lamps.forEach((lamp, k) => lamp.material.color.setHex(!lit ? OFF : (k < 3) === (phase < 2) && Math.floor(t * 18) % 2 === 0 ? (k < 3 ? RED : BLUE) : OFF));
      strobes.forEach((lamp, k) => lamp.material.color.setHex(lit && Math.floor(t * 6) % 2 === k ? (k ? BLUE : RED) : OFF));
    } };
    return group;
  },
  // the getaway car: a big old fastback, twin stripes over it, the boot lid up and a sack of money in it with
  // notes coming out
  getaway: (car) => {
    const group = new THREE.Group(), w = car.hw * 2, l = car.hl * 2, h = car.height, paint = lambert(car.color), stripe = lambert(0xf2ead8);
    const body = box(group, paint, w, h * 0.42, l, 0, 0.3 + h * 0.21, 0);
    box(group, GLASS, w * 0.84, h * 0.36, l * 0.34, 0, 0.3 + h * 0.6, -l * 0.02);         // the cabin,
    box(group, paint, w * 0.86, 0.06, l * 0.3, 0, 0.3 + h * 0.8, -l * 0.03);              // its roof,
    box(group, paint, w * 0.84, 0.06, l * 0.3, 0, 0.3 + h * 0.6, -l * 0.3).rotation.x = -0.5; // and the fastback falling away behind it
    for (const side of [-1, 1]) box(group, stripe, w * 0.12, 0.02, l * 0.36, side * w * 0.1, 0.3 + h * 0.425, l * 0.32); // stripes down the bonnet
    box(group, DARK, w * 0.3, 0.12, l * 0.14, 0, 0.3 + h * 0.46, l * 0.3);                // a scoop on it
    box(group, DARK, w * 0.8, 0.14, 0.06, 0, 0.3 + h * 0.24, l / 2 + 0.01);               // the grille
    for (const side of [-1, 1]) {
      box(group, LAMP, w * 0.14, 0.14, 0.06, side * w * 0.38, 0.3 + h * 0.26, l / 2 + 0.02);
      box(group, TAIL, w * 0.2, 0.12, 0.06, side * w * 0.34, 0.3 + h * 0.26, -l / 2 - 0.01);
    }
    box(group, STEEL, w * 1.02, 0.1, 0.1, 0, 0.36, l / 2 + 0.03);                         // a chrome bumper, the front one only
    const lid = box(group, paint, w * 0.8, 0.05, l * 0.16, 0, 0.3 + h * 0.62, -l * 0.44); // the boot lid, up
    lid.rotation.x = 0.9;
    const sack = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), lambert(0xc9b27c));
    sack.scale.set(1.2, 0.9, 1);
    sack.position.set(0, 0.3 + h * 0.5, -l * 0.42);
    group.add(sack);
    const notes = [0, 1, 2, 3].map(() => box(group, glow(0x58c36a), 0.2, 0.01, 0.11, 0, 0, 0));
    wheels(group, w, [l * 0.3, -l * 0.31], 0.35, 0.28);
    group.userData = { body, animate: (t) => notes.forEach((note, k) => { // (the notes blow out behind, over and over)
      const u = (t * 0.9 + k * 0.25) % 1;
      note.position.set(Math.sin(k * 2.1 + u * 5) * 0.5, 0.3 + h * 0.6 + u * 0.9, -l * 0.44 - u * 2.4);
      note.rotation.set(u * 9 + k, u * 7, k);
      note.visible = u < 0.9;
    }) };
    return group;
  },
});

// a bag of cash on the road: a tied sack with a green $ panel, notes turning over it. userData.animate(t)
export const makeCashBag = () => {
  const group = new THREE.Group(), cloth = lambert(0xc9b27c);
  const sack = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), cloth);
  sack.scale.set(1, 0.85, 1);
  sack.position.y = 0.47;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.12, 0.3, 8), cloth);
  neck.position.y = 1.0;
  const tie = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.04, 6, 10).rotateX(Math.PI / 2), lambert(0x6b4a2a));
  tie.position.y = 0.9;
  group.add(sack, neck, tie);
  for (const z of [-1, 1]) { // a "$" either side: two bars and a stroke, in green
    const sign = new THREE.Group();
    box(sign, glow(0x1f9d3a), 0.34, 0.07, 0.02, 0, 0.14, 0);
    box(sign, glow(0x1f9d3a), 0.34, 0.07, 0.02, 0, 0, 0);
    box(sign, glow(0x1f9d3a), 0.34, 0.07, 0.02, 0, -0.14, 0);
    box(sign, glow(0x1f9d3a), 0.07, 0.14, 0.02, -0.135, 0.07, 0);
    box(sign, glow(0x1f9d3a), 0.07, 0.14, 0.02, 0.135, -0.07, 0);
    box(sign, glow(0x1f9d3a), 0.05, 0.46, 0.02, 0, 0, 0);
    sign.position.set(0, 0.5, z * 0.55);
    group.add(sign);
  }
  const notes = [0, 1, 2].map((k) => box(group, glow(0x58c36a), 0.34, 0.01, 0.18, 0, 0, 0));
  group.userData = { animate: (t) => notes.forEach((note, k) => {
    const a = t * 2 + k * 2.1;
    note.position.set(Math.cos(a) * 0.8, 1.35 + Math.sin(t * 3 + k) * 0.15, Math.sin(a) * 0.8);
    note.rotation.set(t * 3 + k, a, 0.4);
  }) };
  return group;
};

// the police helicopter over a pursuit: blue and white, a beacon, and a searchlight: a cone of light `height`
// m down to a pool `beam` m across. userData.animate(t), userData.rotor
export const makePursuitHeli = (height = 9, beam = 5) => {
  const group = new THREE.Group(), blue = lambert(0x1d3f8f), white = lambert(0xeef1f5), dark = lambert(0x1c1c1c);
  box(group, blue, 2.2, 1.9, 4.4, 0, 0, 0);
  box(group, white, 2.24, 0.5, 4.44, 0, -0.3, 0);
  box(group, GLASS, 2.0, 0.9, 0.6, 0, 0.25, 2.0);
  box(group, blue, 0.5, 0.5, 4, 0, 0.4, -4);
  box(group, white, 0.2, 1.4, 0.8, 0, 1, -5.8);
  for (const side of [-1, 1]) box(group, dark, 0.15, 0.15, 3.5, side, -1.25, 0);
  const rotor = new THREE.Group();
  box(rotor, dark, 9, 0.1, 0.5, 0, 0, 0);
  box(rotor, dark, 0.5, 0.1, 9, 0, 0, 0);
  rotor.position.y = 1.25;
  const beacon = box(group, glow(RED), 0.5, 0.35, 0.5, 0, -1.15, -1.2);
  const lamp = box(group, glow(0xfff6cf), 0.6, 0.3, 0.6, 0, -1.1, 1.3);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(beam / 2, height, 20, 1, true).translate(0, -height / 2, 0),
    glow(0xfff2b0, { transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }));
  cone.position.set(0, -1.1, 1.3);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(beam / 2, 24).rotateX(-Math.PI / 2), glow(0xfff2b0, { transparent: true, opacity: 0.3, depthWrite: false }));
  pool.position.set(0, -height - 1.0, 1.3);
  group.add(rotor, cone, pool);
  group.userData = { rotor, cone, pool, lamp, animate: (t) => { beacon.material.color.setHex(Math.floor(t * 6.5) % 2 ? RED : BLUE); } };
  return group;
};

// a man with a bag (the bank robber wanting a lift: see robber.js): striped jersey, mask, a sack over one
// shoulder, the other arm out with its thumb up. About 1.8 m tall, facing local +z. userData.animate(t)
export const makeRobber = () => {
  const group = new THREE.Group(), skin = lambert(0xe2b48c), black = lambert(0x16181c), white = lambert(0xf2f2f2);
  for (const side of [-1, 1]) box(group, black, 0.2, 0.8, 0.22, side * 0.14, 0.4, 0);       // legs
  for (let k = 0; k < 5; k++) box(group, k % 2 ? white : black, 0.56, 0.13, 0.3, 0, 0.865 + k * 0.13, 0); // a striped jersey
  const head = box(group, skin, 0.3, 0.32, 0.3, 0, 1.63, 0);
  box(group, black, 0.32, 0.09, 0.32, 0, 1.66, 0);                                          // the mask
  box(group, black, 0.34, 0.1, 0.34, 0, 1.82, 0);                                           // a cap,
  box(group, black, 0.3, 0.04, 0.16, 0, 1.78, 0.22);                                        // its peak
  const arm = new THREE.Group();                                                             // the thumbing arm, out to his left (the road's side)
  box(arm, black, 0.5, 0.13, 0.14, -0.25, 0, 0);
  box(arm, skin, 0.13, 0.13, 0.14, -0.55, 0, 0);
  box(arm, skin, 0.06, 0.16, 0.06, -0.55, 0.13, 0);
  arm.position.set(-0.28, 1.36, 0);
  group.add(arm);
  box(group, black, 0.13, 0.5, 0.14, 0.34, 1.28, -0.05);                                    // the other arm, holding
  const sack = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), lambert(0xc9b27c));    // the sack over his shoulder
  sack.scale.set(1, 1.15, 1);
  sack.position.set(0.38, 1.2, -0.38);
  group.add(sack);
  box(group, glow(0x1f9d3a), 0.05, 0.3, 0.02, 0.38, 1.2, -0.75);
  box(group, glow(0x1f9d3a), 0.2, 0.05, 0.02, 0.38, 1.28, -0.75);
  box(group, glow(0x1f9d3a), 0.2, 0.05, 0.02, 0.38, 1.12, -0.75);
  group.userData = { head, animate: (t) => { arm.rotation.z = Math.sin(t * 5) * 0.25; arm.rotation.y = Math.sin(t * 2.5) * 0.2; } };
  return group;
};
