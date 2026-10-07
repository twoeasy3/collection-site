// ---- OBSTACLE MODELS: one builder per kind of obstacle (and the animals, which are obstacles too) ----
// The models alone (no game state, nothing added to a scene): built here so the game and the menu's pages
// (see ../gimmicks.js) can both use them. Each faces local +z, its feet on y = 0.
import * as THREE from 'three';

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
export const OBSTACLE_MODELS = {
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
  // a portaloo: a plastic cabin (blue, green or orange), a pale roof, its door at the front with a
  // little vent, and a pipe out of the roof
  potty: () => {
    const shell = lambert([0x2f7fbf, 0x3a9a4a, 0xd96a1e][Math.floor(Math.random() * 3)]), pale = lambert(0xe8e4dc), dark = lambert(0x24323c);
    return boxModel([
      [shell, 1.35, 2.25, 1.35, 0, 1.125, 0],     // the cabin
      [pale, 1.5, 0.14, 1.5, 0, 2.32, 0],         // roof
      [pale, 0.9, 1.8, 0.05, 0, 1.05, 0.7],       // door
      [dark, 0.35, 0.12, 0.06, 0, 1.75, 0.73],    // its vent
      [dark, 0.1, 0.12, 0.08, 0.32, 1.1, 0.74],   // its latch
      [pale, 0.12, 0.5, 0.12, -0.45, 2.6, -0.4],  // the pipe out of the roof
    ]);
  },
  // a heap of sewage: a brown mound, darker lumps, a green tinge
  sewage: () => {
    const g = new THREE.Group(), brown = lambert(0x5a3d1e), dark = lambert(0x3c2812), green = lambert(0x6f7a2a);
    const mound = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), brown);
    mound.scale.set(1, 0.65, 0.95);
    g.add(mound);
    for (const [x, z, r, m] of [[0.4, 0.3, 0.45, dark], [-0.5, -0.2, 0.4, dark], [0.1, -0.5, 0.35, green], [-0.2, 0.5, 0.3, green]]) {
      const lump = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), m);
      lump.position.set(x, 0.45, z);
      g.add(lump);
    }
    return g;
  },
  // a heap of dirt
  pile: () => {
    const g = new THREE.Group();
    const heap = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.7, 9), lambert(0x8a6a45));
    heap.position.y = 0.85;
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.5, 7), lambert(0x9b7a52));
    top.position.set(0.3, 1.2, 0.2);
    g.add(heap, top);
    return g;
  },
  // a wheelbarrow: a green tray on a wheel at the front, two legs and handles at the back
  barrow: () => {
    const g = boxModel([
      [lambert(0x2f7a3a), 0.75, 0.32, 1.0, 0, 0.62, 0.05],     // the tray
      [lambert(0x6e5232), 0.62, 0.12, 0.8, 0, 0.82, 0.05],     // a load of sand in it
      [lambert(0x3a3a3a), 0.06, 0.4, 0.06, -0.25, 0.25, -0.35], // legs
      [lambert(0x3a3a3a), 0.06, 0.4, 0.06, 0.25, 0.25, -0.35],
      [lambert(0x8a6a45), 0.05, 0.05, 1.0, -0.28, 0.6, -0.6],   // handles
      [lambert(0x8a6a45), 0.05, 0.05, 1.0, 0.28, 0.6, -0.6],
    ]);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 12).rotateZ(Math.PI / 2), lambert(0x161616));
    wheel.position.set(0, 0.22, 0.6);
    g.add(wheel);
    return g;
  },
  // a concrete pipe on its side, along the road, rolling across it (userData.roller turns)
  pipe: () => {
    const g = new THREE.Group(), roller = new THREE.Group();
    roller.position.y = 0.9;
    roller.add(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.6, 16, 1, true).rotateX(Math.PI / 2),
      new THREE.MeshLambertMaterial({ color: 0xb5b0a6, side: THREE.DoubleSide })));
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.05, 6, 16), lambert(0x8a857c)); // (a mark, to see it turn)
    band.position.z = 0.6;
    roller.add(band);
    g.add(roller);
    g.userData.roller = roller;
    return g;
  },
  // a steel I-beam lying across a lane, in red primer
  beam: () => {
    const red = lambert(0xa8452a);
    return boxModel([
      [red, 3.3, 0.5, 0.06, 0, 0.3, 0],           // web
      [red, 3.3, 0.06, 0.4, 0, 0.55, 0],          // flanges
      [red, 3.3, 0.06, 0.4, 0, 0.05, 0],
    ]);
  },
  // a wildebeest: dark grey-brown, high in the shoulder, a black mane and beard, curved horns
  wildebeest: () => {
    const hide = lambert(0x5d544c), dark = lambert(0x24201d), horn = lambert(0x3a3632);
    return boxModel([
      [hide, 0.9, 0.95, 2.0, 0, 1.25, -0.1],      // body
      [hide, 0.95, 0.5, 0.8, 0, 1.75, 0.45],      // the shoulders' hump
      [dark, 0.2, 0.55, 1.0, 0, 1.95, 0.35],      // mane
      [hide, 0.55, 0.6, 0.9, 0, 1.6, 1.25],       // head, low
      [dark, 0.3, 0.45, 0.25, 0, 1.15, 1.35],     // beard
      [horn, 1.0, 0.12, 0.12, 0, 2.0, 1.1],       // horns...
      [horn, 0.12, 0.3, 0.12, -0.48, 2.15, 1.1],  // ...curving up
      [horn, 0.12, 0.3, 0.12, 0.48, 2.15, 1.1],
      [dark, 0.22, 0.8, 0.22, -0.3, 0.4, 0.7],    // legs
      [dark, 0.22, 0.8, 0.22, 0.3, 0.4, 0.7],
      [dark, 0.22, 0.8, 0.22, -0.3, 0.4, -0.85],
      [dark, 0.22, 0.8, 0.22, 0.3, 0.4, -0.85],
      [dark, 0.1, 0.7, 0.1, 0, 1.05, -1.15],      // tail
    ]);
  },
  // a zebra: white with black stripes all over, a black-and-white mane
  zebra: () => {
    const white = lambert(0xf2f1ec), black = lambert(0x1c1c1c);
    const parts = [
      [white, 0.8, 0.85, 1.9, 0, 1.25, 0],        // body
      [white, 0.35, 0.9, 0.4, 0, 1.75, 0.95],     // neck
      [white, 0.4, 0.4, 0.8, 0, 2.05, 1.35],      // head
      [black, 0.3, 0.2, 0.25, 0, 1.95, 1.75],     // muzzle
      [black, 0.12, 0.5, 0.6, 0, 2.05, 0.95],     // mane
    ];
    for (let k = -3; k <= 3; k++) parts.push([black, 0.82, 0.87, 0.12, 0, 1.25, k * 0.25]); // stripes
    for (const [x, z] of [[-0.25, 0.7], [0.25, 0.7], [-0.25, -0.7], [0.25, -0.7]]) {
      parts.push([white, 0.18, 0.85, 0.18, x, 0.42, z], [black, 0.19, 0.1, 0.19, x, 0.55, z], [black, 0.19, 0.1, 0.19, x, 0.25, z]);
    }
    return boxModel(parts);
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
// a sea mine (Oh Mine!), afloat: a white ball half out of the water, studded with horns, a ring of
// foam round it; it bobs on the swell (see syncPickups: bob)
OBSTACLE_MODELS.mine = () => {
  const group = new THREE.Group();
  const white = new THREE.MeshPhongMaterial({ color: 0xf4f4f2, shininess: 50, specular: 0x555555 });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12), white);
  ball.position.y = 0.1;
  group.add(ball);
  for (const [a, e] of [[0, 1.2], [1.26, 0.75], [2.51, 0.75], [3.77, 0.75], [5.03, 0.75], [0.63, 0.25], [1.88, 0.25], [3.14, 0.25], [4.4, 0.25], [5.65, 0.25]]) {
    const dir = new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e));
    const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.16, 6), white);
    horn.position.copy(dir).multiplyScalar(0.42).add(ball.position);
    horn.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    group.add(horn);
  }
  const foam = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 6, 20), new THREE.MeshBasicMaterial({ color: 0xdff0f6 }));
  foam.rotation.x = Math.PI / 2;
  foam.position.y = 0.03;
  group.add(foam);
  group.userData.bob = true;
  group.scale.setScalar(1.3);
  return group;
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
