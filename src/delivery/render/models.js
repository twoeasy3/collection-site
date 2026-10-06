// ---- animated models ---------------------------------------------------------------------
// Vehicles with a look of their own (a car's "model" field in src/cars.js). Each builder
// takes the car's entry and returns a group, front facing local +z, with:
//   userData.body     the mesh whose material is the paint (so the livery can be swapped)
//   userData.animate  (seconds) => void: poses the model for that moment. It is called every
//                     frame the model is drawn, in the game and in the garage alike, so the
//                     animation loops for as long as the model is on screen.
//   userData.livery   optional, (evil) => void: shows the parts that differ between the Good
//                     and Evil liveries (beyond the paint), called whenever the paint is set
import * as THREE from 'three';

const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const box = (parent, material, w, h, l, x, y, z) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
// (returns [tyre, hub]; the hub is gold unless given a material of its own)
const wheel = (parent, radius, width, x, y, z, hubMaterial = lambert(0xe6c15a)) => {
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 16), lambert(0x141414));
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, width + 0.04, 12), hubMaterial);
  for (const mesh of [tyre, hub]) {
    mesh.rotation.z = Math.PI / 2; // axle across the car
    mesh.position.set(x, y, z);
    parent.add(mesh);
  }
  return [tyre, hub];
};

// a flat panel tipped about the car's width: a windscreen, a fastback. `pitch` > 0 drops its front edge
const slab = (parent, material, w, t, l, x, y, z, pitch) => {
  const mesh = box(parent, material, w, t, l, x, y, z);
  mesh.rotation.x = pitch;
  return mesh;
};
// a round lamp (or anything disc-shaped) facing along the car
const disc = (parent, material, r, depth, x, y, z) => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, depth, 14), material);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
const GLASS = 0x232a35, CHROME = 0xd8d8d8, TRIM = 0x2a2c31;
const LAMP = new THREE.MeshBasicMaterial({ color: 0xfff3c4 }), TAIL = new THREE.MeshBasicMaterial({ color: 0xff2a2a });

export const MODELS = {
  // An 18-wheeler: a cab-over prime mover in the livery, its sleeper and wind fairing on top,
  // chrome stacks behind, and a long white box trailer on three axles
  semi: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, cabL = 3.4, front = l / 2;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), steel = lambert(0xb8bcc4);
    const chrome = lambert(CHROME), white = lambert(0xf1f1ee);
    const body = box(group, paint, w * 0.98, 2.3, cabL, 0, 2.0, front - cabL / 2);
    box(group, glass, w * 0.86, 0.9, 0.06, 0, 2.6, front + 0.01);                    // windscreen
    box(group, trim, w * 0.72, 0.8, 0.08, 0, 1.25, front + 0.02);                    // grille
    box(group, paint, w * 0.94, 1.0, 1.8, 0, 3.6, front - cabL + 0.9);               // sleeper and fairing
    box(group, trim, w * 0.98, 0.25, 0.3, 0, 0.75, front + 0.05);                    // bumper
    for (const side of [-1, 1]) {
      box(group, LAMP, 0.32, 0.22, 0.05, side * w * 0.36, 1.05, front + 0.07);       // headlamps
      const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 2.4, 8), chrome);
      stack.position.set(side * (w / 2 - 0.15), 3.3, front - cabL - 0.15);           // exhaust stacks
      group.add(stack);
    }
    box(group, trim, w * 0.55, 0.35, l - 1, 0, 0.75, -0.2);                         // chassis
    const trailer = l - cabL - 0.6;
    box(group, white, w, 2.9, trailer, 0, 2.6, -l / 2 + trailer / 2);                // trailer
    box(group, paint, w + 0.02, 0.35, trailer, 0, 1.3, -l / 2 + trailer / 2);        // a stripe of the livery
    for (const side of [-1, 1]) box(group, TAIL, 0.3, 0.25, 0.05, side * w * 0.38, 1.1, -l / 2 - 0.02);
    // wheels: the steer axle, two drive axles, and three under the trailer's tail
    for (const z of [front - 1.1, front - cabL - 0.4, front - cabL - 1.6, -l / 2 + 1.2, -l / 2 + 2.5, -l / 2 + 3.8]) {
      for (const side of [-1, 1]) wheel(group, 0.52, 0.42, side * (w / 2 - 0.22), 0.52, z, steel);
    }
    group.userData = { body, animate: () => {} };
    return group;
  },
  // The Commuter: an old three-door supermini (a first-generation Nissan Micra). Small and
  // boxy, with a tall glasshouse, a short sloping bonnet, square headlamps and chunky black
  // bumpers.
  commuter: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.3;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), steel = lambert(0xb8bcc4);
    const body = box(group, paint, w, 0.5, l, 0, 0.55, 0);
    box(group, paint, w * 0.95, 0.08, l * 0.22, 0, 0.83, l * 0.37);               // short bonnet
    box(group, glass, w * 0.9, 0.5, l * 0.58, 0, 1.08, -l * 0.08);                // tall glasshouse
    box(group, paint, w * 0.92, 0.07, l * 0.56, 0, 1.36, -l * 0.08);              // roof
    slab(group, glass, w * 0.86, 0.05, 0.6, 0, 1.06, l * 0.22, 0.55);             // windscreen
    slab(group, glass, w * 0.86, 0.05, 0.52, 0, 1.06, -l * 0.37, -0.22);          // the hatch's glass
    for (const side of [-1, 1]) {
      for (const z of [0.18, -0.02, -0.35]) box(group, paint, 0.08, 0.5, 0.09, side * w * 0.45, 1.08, l * z); // pillars
      box(group, trim, 0.03, 0.08, l * 0.8, side * (w / 2 + 0.01), 0.6, 0);        // rubbing strip
      box(group, trim, 0.12, 0.09, 0.1, side * (w / 2 + 0.06), 0.95, l * 0.2);     // mirror
      box(group, LAMP, w * 0.24, 0.16, 0.08, side * w * 0.32, 0.68, l / 2 + 0.01); // square headlamps
      box(group, TAIL, w * 0.16, 0.22, 0.08, side * w * 0.38, 0.7, -l / 2 - 0.01);
      wheel(group, R, 0.26, side * (w / 2 - 0.04), R, l * 0.31, steel);
      wheel(group, R, 0.26, side * (w / 2 - 0.04), R, -l * 0.31, steel);
    }
    for (let i = 0; i < 3; i++) box(group, trim, w * 0.3, 0.03, 0.04, 0, 0.62 + i * 0.06, l / 2 + 0.02); // grille slats
    box(group, trim, w + 0.06, 0.2, 0.16, 0, 0.36, l / 2 + 0.04);                 // chunky bumpers
    box(group, trim, w + 0.06, 0.2, 0.16, 0, 0.36, -l / 2 - 0.04);
    group.userData = { body, animate: () => {} };
    return group;
  },

  // The Darkvan: a full-size panel van with lifted suspension (the A-Team's, more or less):
  // big off-road tyres, a bull bar, a roof spoiler and a short nose. In its Evil livery it is
  // the A-Team's own: black over grey with the red stripe and red wheels; in its Good one,
  // plain light green.
  darkvan: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.5;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM);
    const grey = lambert(0x8d9096), red = lambert(0xc8102e), chrome = lambert(CHROME);
    const body = box(group, paint, w, 1.3, l * 0.8, 0, 1.6, -l * 0.1);            // the box
    box(group, paint, w * 0.96, 0.62, l * 0.2, 0, 1.25, l * 0.4);                 // short nose
    slab(group, glass, w * 0.9, 0.05, 0.8, 0, 1.86, l * 0.32, 0.5);               // windscreen
    box(group, trim, w * 0.6, 0.1, 0.5, 0, 2.3, -l * 0.43);                       // roof spoiler
    box(group, trim, w * 0.7, 0.14, l * 0.86, 0, 0.82, -l * 0.04);                // the lifted chassis, showing
    box(group, trim, w * 0.5, 0.36, 0.06, 0, 1.2, l / 2 + 0.01);                  // grille
    // the bull bar
    box(group, trim, w * 0.9, 0.08, 0.08, 0, 1.0, l / 2 + 0.22);
    box(group, trim, w * 0.9, 0.08, 0.08, 0, 1.45, l / 2 + 0.22);
    for (const x of [-0.3, 0.3]) box(group, trim, 0.08, 0.53, 0.08, x * w, 1.22, l / 2 + 0.22);
    box(group, trim, w + 0.1, 0.22, 0.18, 0, 0.98, -l / 2 - 0.05);                // rear bumper
    const evilOnly = [], hubs = [];
    for (const side of [-1, 1]) {
      box(group, glass, 0.02, 0.42, l * 0.16, side * (w / 2 + 0.005), 1.9, l * 0.22); // cab windows
      box(group, glass, 0.02, 0.36, l * 0.16, side * (w / 2 + 0.005), 1.9, -l * 0.34); // little rear windows
      box(group, trim, 0.14, 0.12, 0.12, side * (w / 2 + 0.07), 1.75, l * 0.32);       // mirrors
      box(group, trim, 0.22, 0.06, l * 0.4, side * (w / 2 + 0.1), 0.92, l * 0.02);     // side steps
      disc(group, LAMP, 0.14, 0.08, side * w * 0.36, 1.32, l / 2 + 0.02);             // round headlights
      box(group, TAIL, 0.14, 0.4, 0.08, side * w * 0.43, 1.6, -l / 2 - 0.01);
      evilOnly.push(
        box(group, grey, 0.02, 0.5, l * 0.98, side * (w / 2 + 0.006), 1.2, 0),           // grey lower panels
        slab(group, red, 0.02, 0.14, l * 0.62, side * (w / 2 + 0.012), 1.58, -l * 0.02, -0.12)); // the red stripe
      for (const z of [0.3, -0.3]) {
        hubs.push(wheel(group, R, 0.42, side * (w / 2 - 0.02), R, l * z, chrome)[1]);
        box(group, trim, 0.06, 0.5, 0.06, side * w * 0.36, 0.72, l * z);           // lift kit: the long shocks
      }
    }
    group.userData = {
      body,
      animate: () => {},
      livery: (evil) => { // (the A-Team's grey, stripe and red wheels are the Evil livery's)
        for (const part of evilOnly) part.visible = evil;
        for (const hub of hubs) hub.material = evil ? red : chrome;
      },
    };
    group.userData.livery(false);
    return group;
  },

  // The Minivan: the same full-size van as the Darkvan, but road-going: normal ride height,
  // a row of passenger windows down each side, chrome bumpers and hubcaps.
  minivan: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.38;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), chrome = lambert(CHROME);
    const body = box(group, paint, w, 1.3, l * 0.8, 0, 1.15, -l * 0.1);           // the box
    box(group, paint, w * 0.96, 0.6, l * 0.2, 0, 0.8, l * 0.4);                   // short nose
    slab(group, glass, w * 0.9, 0.05, 0.8, 0, 1.42, l * 0.32, 0.5);               // windscreen
    box(group, chrome, w * 0.5, 0.3, 0.06, 0, 0.8, l / 2 + 0.01);                 // grille
    box(group, chrome, w + 0.08, 0.18, 0.16, 0, 0.42, l / 2 + 0.04);              // chrome bumpers
    box(group, chrome, w + 0.08, 0.18, 0.16, 0, 0.42, -l / 2 - 0.04);
    box(group, glass, w * 0.7, 0.4, 0.02, 0, 1.45, -l / 2 - 0.005);               // rear windows
    for (const side of [-1, 1]) {
      for (const z of [0.22, 0.02, -0.16, -0.34]) {                                // passenger windows
        box(group, glass, 0.02, 0.42, l * 0.15, side * (w / 2 + 0.005), 1.45, l * z);
      }
      box(group, chrome, 0.02, 0.05, l * 0.9, side * (w / 2 + 0.008), 0.98, -l * 0.02); // body side trim
      box(group, trim, 0.13, 0.12, 0.12, side * (w / 2 + 0.07), 1.3, l * 0.32);   // mirrors
      box(group, LAMP, w * 0.2, 0.16, 0.08, side * w * 0.36, 0.86, l / 2 + 0.01);  // square headlamps
      box(group, TAIL, 0.14, 0.36, 0.08, side * w * 0.43, 1.0, -l / 2 - 0.01);
      wheel(group, R, 0.3, side * (w / 2 - 0.04), R, l * 0.3, chrome);
      wheel(group, R, 0.3, side * (w / 2 - 0.04), R, -l * 0.3, chrome);
    }
    group.userData = { body, animate: () => {} };
    return group;
  },

  // The Hearse: long and low, a long glasshouse running back over the coffin deck, curtains
  // drawn in the rear windows, chrome landau bars on the rear quarters and a chrome grille.
  hearse: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.36;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), curtain = lambert(0x4a2a4a);
    const body = box(group, paint, w, 0.62, l, 0, 0.66, 0);
    box(group, paint, w * 0.95, 0.06, l * 0.26, 0, 1.0, l * 0.36);               // long bonnet
    box(group, paint, w * 0.9, 0.62, l * 0.6, 0, 1.28, -l * 0.17);               // the long roofed body
    box(group, paint, w * 0.92, 0.07, l * 0.6, 0, 1.62, -l * 0.17);              // roof
    slab(group, glass, w * 0.86, 0.05, 0.6, 0, 1.26, l * 0.18, 0.45);            // windscreen
    box(group, curtain, w * 0.7, 0.45, 0.02, 0, 1.3, -l / 2 + 0.02);              // curtained back door
    for (const side of [-1, 1]) {
      box(group, glass, 0.02, 0.42, l * 0.14, side * (w * 0.45 + 0.005), 1.3, l * 0.06); // front side windows
      box(group, curtain, 0.02, 0.38, l * 0.16, side * (w * 0.45 + 0.005), 1.3, -l * 0.14); // curtained rear windows
      // the landau bar: an S of chrome on the blind rear quarter
      slab(group, chrome, 0.03, 0.05, 0.6, side * (w * 0.45 + 0.02), 1.32, -l * 0.36, 0.5);
      slab(group, chrome, 0.03, 0.05, 0.6, side * (w * 0.45 + 0.02), 1.32, -l * 0.36, -0.5);
      box(group, chrome, 0.02, 0.05, l * 0.94, side * (w / 2 + 0.006), 0.72, 0);   // chrome side trim
      box(group, chrome, 0.12, 0.08, 0.1, side * (w / 2 + 0.05), 1.05, l * 0.2);    // mirrors
      box(group, LAMP, w * 0.2, 0.14, 0.08, side * w * 0.34, 0.78, l / 2 + 0.01);
      box(group, TAIL, 0.12, 0.34, 0.08, side * w * 0.42, 0.8, -l / 2 - 0.01);       // tall tail lamps
      wheel(group, R, 0.3, side * (w / 2 - 0.04), R, l * 0.3, chrome);
      wheel(group, R, 0.3, side * (w / 2 - 0.04), R, -l * 0.3, chrome);
    }
    box(group, chrome, w * 0.6, 0.26, 0.06, 0, 0.78, l / 2 + 0.02);               // chrome grille
    box(group, chrome, w + 0.1, 0.16, 0.16, 0, 0.42, l / 2 + 0.04);               // bumpers
    box(group, chrome, w + 0.1, 0.16, 0.16, 0, 0.42, -l / 2 - 0.04);
    group.userData = { body, animate: () => {} };
    return group;
  },

  // The Sportscar: a little two-seat roadster (a first Mazda Miata), top down, pop-up
  // headlamps up, twin racing stripes over the bonnet and boot: white on red in the Good
  // livery, black on yellow in the Evil one.
  miata: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.32;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM);
    const stripe = lambert(0xf4f4f4), white = 0xf4f4f4, black = 0x151515;
    const body = box(group, paint, w, 0.42, l, 0, 0.55, 0);
    box(group, paint, w * 0.92, 0.06, l * 0.34, 0, 0.78, l * 0.3);               // bonnet
    box(group, paint, w * 0.92, 0.06, l * 0.22, 0, 0.8, -l * 0.36);              // boot
    box(group, trim, w * 0.8, 0.12, l * 0.3, 0, 0.72, -l * 0.06);                 // the cockpit
    slab(group, glass, w * 0.82, 0.04, 0.36, 0, 0.92, l * 0.1, 0.9);              // small windscreen
    for (const side of [-1, 1]) {
      box(group, trim, 0.32, 0.36, 0.1, side * w * 0.2, 0.95, -l * 0.18);          // seat backs
      box(group, paint, w * 0.18, 0.12, 0.3, side * w * 0.3, 0.86, l * 0.38);      // pop-up headlamps, up...
      box(group, LAMP, w * 0.16, 0.09, 0.02, side * w * 0.3, 0.86, l * 0.38 + 0.16); // ...and lit
      box(group, stripe, w * 0.08, 0.02, l * 0.34, side * w * 0.1, 0.815, l * 0.3); // racing stripes:
      box(group, stripe, w * 0.08, 0.02, l * 0.22, side * w * 0.1, 0.835, -l * 0.36); // bonnet and boot
      box(group, trim, 0.11, 0.08, 0.1, side * (w / 2 + 0.05), 0.85, l * 0.08);    // mirrors
      box(group, TAIL, w * 0.24, 0.1, 0.06, side * w * 0.3, 0.62, -l / 2 - 0.01);
      wheel(group, R, 0.28, side * (w / 2 - 0.04), R, l * 0.32, lambert(0xb8bcc4));
      wheel(group, R, 0.28, side * (w / 2 - 0.04), R, -l * 0.31, lambert(0xb8bcc4));
    }
    box(group, trim, w * 0.4, 0.08, 0.04, 0, 0.5, l / 2 + 0.02);                  // the little mouth
    box(group, trim, w + 0.04, 0.12, 0.12, 0, 0.36, -l / 2 - 0.02);
    group.userData = {
      body,
      animate: () => {},
      livery: (evil) => { stripe.color.setHex(evil ? black : white); },
    };
    return group;
  },

  // The Pick Up: a lifted square-body pickup (a Chevy C-10): a boxy cab and an open bed with
  // its tailgate, a wide chrome grille with square headlamps, big off-road tyres and the
  // chassis and long shocks of the lift showing beneath.
  pickup: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.48;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), chrome = lambert(CHROME);
    const body = box(group, paint, w, 0.6, l, 0, 1.25, 0);                        // the body, end to end
    box(group, paint, w * 0.96, 0.08, l * 0.28, 0, 1.58, l * 0.35);               // bonnet
    box(group, glass, w * 0.9, 0.5, l * 0.24, 0, 1.8, l * 0.07);                  // cab glass
    box(group, paint, w * 0.92, 0.08, l * 0.24, 0, 2.08, l * 0.07);               // cab roof
    slab(group, glass, w * 0.88, 0.05, 0.55, 0, 1.8, l * 0.2, 0.35);              // windscreen
    box(group, glass, w * 0.7, 0.36, 0.02, 0, 1.82, -l * 0.05 - 0.01);            // back window
    box(group, trim, w * 0.84, 0.06, l * 0.38, 0, 1.56, -l * 0.29);               // the bed floor
    box(group, paint, w * 0.94, 0.42, 0.08, 0, 1.76, -l / 2 + 0.04);              // tailgate
    for (const side of [-1, 1]) {
      box(group, paint, 0.08, 0.42, l * 0.42, side * (w / 2 - 0.04), 1.76, -l * 0.29); // bed sides
      box(group, paint, 0.08, 0.5, 0.1, side * w * 0.45, 1.8, l * 0.17);          // windscreen pillars
      box(group, chrome, 0.14, 0.12, 0.1, side * (w / 2 + 0.07), 1.65, l * 0.18); // mirrors
      box(group, LAMP, w * 0.16, 0.16, 0.06, side * w * 0.37, 1.32, l / 2 + 0.02); // square headlamps
      box(group, TAIL, 0.1, 0.3, 0.06, side * w * 0.44, 1.5, -l / 2 - 0.01);
      for (const z of [0.31, -0.3]) {
        wheel(group, R, 0.42, side * (w / 2 - 0.02), R, l * z, chrome);
        box(group, trim, 0.06, 0.5, 0.06, side * w * 0.34, 0.75, l * z);        // the lift's long shocks
      }
    }
    box(group, chrome, w * 0.56, 0.24, 0.05, 0, 1.32, l / 2 + 0.02);              // wide chrome grille
    box(group, trim, w * 0.7, 0.14, l * 0.86, 0, 0.8, 0);                         // the chassis, showing
    box(group, chrome, w + 0.08, 0.18, 0.16, 0, 0.98, l / 2 + 0.05);              // bumpers
    box(group, chrome, w + 0.08, 0.18, 0.16, 0, 0.98, -l / 2 - 0.05);
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A long, low car on hydraulics: the front end rises and falls in a smooth, endless bob,
  // pivoting about the rear axle. The front wheels hang on their suspension: they lift only
  // part of the way with the nose, so as it rises they droop below the body.
  lowrider: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.36;
    const rearZ = -l * 0.3, frontZ = l * 0.32;

    // everything that rises with the front end hangs off this, whose origin is the rear axle
    const chassis = new THREE.Group();
    chassis.position.set(0, R, rearZ);
    group.add(chassis);
    const at = (z) => z - rearZ; // a position along the car, measured from the pivot

    const paint = lambert(car.color);
    const body = box(chassis, paint, w, 0.42, l, 0, 0.18, at(0));
    box(chassis, lambert(0xd8d8d8), w + 0.06, 0.07, l * 0.92, 0, 0.1, at(0));          // chrome strip
    box(chassis, paint, w * 0.86, 0.1, l * 0.3, 0, 0.44, at(l * 0.3));                  // bonnet bulge
    box(chassis, lambert(0x23262d), w * 0.8, 0.36, l * 0.34, 0, 0.56, at(-l * 0.06));   // low cabin
    box(chassis, paint, w * 0.82, 0.06, l * 0.3, 0, 0.77, at(-l * 0.06));               // roof
    const chrome = lambert(CHROME), gold = lambert(0xe6c15a);
    slab(chassis, lambert(0x23262d), w * 0.78, 0.05, 0.6, 0, 0.56, at(l * 0.15), 0.62); // windscreen
    box(chassis, chrome, w + 0.1, 0.11, 0.13, 0, 0.03, at(l / 2 + 0.03));               // chrome bumpers
    box(chassis, chrome, w + 0.1, 0.11, 0.13, 0, 0.03, at(-l / 2 - 0.03));
    box(chassis, chrome, w * 0.4, 0.14, 0.06, 0, 0.22, at(l / 2 + 0.02));               // grille
    const lamp = LAMP, tail = TAIL;
    const frontAxle = new THREE.Group(); // (not part of the chassis: see animate)
    frontAxle.position.set(0, R, frontZ);
    group.add(frontAxle);
    for (const side of [-1, 1]) {
      box(chassis, paint, 0.09, 0.2, l * 0.24, side * (w / 2 - 0.045), 0.49, at(-l * 0.38)); // tail fins
      box(chassis, gold, 0.02, 0.04, l * 0.84, side * (w / 2 + 0.005), 0.3, at(0));     // pinstripe
      box(chassis, paint, 0.09, 0.36, 0.09, side * w * 0.38, 0.56, at(-l * 0.22));      // rear pillars
      box(chassis, chrome, 0.12, 0.08, 0.1, side * (w / 2 + 0.05), 0.46, at(l * 0.12)); // mirrors
      box(chassis, lamp, w * 0.2, 0.16, 0.1, side * w * 0.33, 0.22, at(l / 2 + 0.01));
      box(chassis, tail, w * 0.24, 0.1, 0.1, side * w * 0.3, 0.24, at(-l / 2 - 0.01));
      wheel(frontAxle, R, 0.3, side * (w / 2 - 0.05), 0, 0);         // front wheels, on their suspension
      wheel(group, R, 0.3, side * (w / 2 - 0.05), R, rearZ);        // rear wheels stay planted
    }

    group.userData = {
      body,
      animate: (t) => {
        const tilt = 0.27 * (1 - Math.cos(t * 4)) / 2; // 0 (level) .. 0.27 rad, and back, smoothly
        chassis.rotation.x = -tilt; // (negative pitch lifts the nose)
        // the front wheels rise only a third as far as the nose does
        frontAxle.position.y = R + Math.sin(tilt) * (frontZ - rearZ) * 0.3;
      },
    };
    return group;
  },

  // A rusty pickup: cab up front, an open load bed behind, a door in grey primer, rust
  // patches. It shudders as it idles.
  junker: (car) => {
    const group = new THREE.Group(), shell = new THREE.Group();
    group.add(shell);
    const w = car.hw * 2, l = car.hl * 2, R = 0.42;
    const paint = lambert(car.color), rust = lambert(0x6b3a1f), dark = lambert(0x23262d);
    const body = box(shell, paint, w, 0.5, l, 0, 0.75, 0);
    box(shell, paint, w * 0.92, 0.62, l * 0.3, 0, 1.3, l * 0.05);                 // cab
    box(shell, dark, w * 0.94, 0.34, l * 0.22, 0, 1.38, l * 0.06);                // windows
    box(shell, paint, w * 0.9, 0.16, l * 0.24, 0, 1.08, l * 0.36);                // bonnet
    for (const side of [-1, 1]) box(shell, paint, 0.1, 0.34, l * 0.4, side * (w / 2 - 0.05), 1.16, -l * 0.29); // bed sides
    box(shell, paint, w, 0.34, 0.1, 0, 1.16, -l / 2 + 0.05);                      // tailgate
    box(shell, dark, w * 0.86, 0.04, l * 0.38, 0, 1.02, -l * 0.29);               // bed floor
    box(shell, lambert(0x8d9096), 0.05, 0.42, l * 0.2, -w / 2 - 0.01, 0.82, l * 0.06); // a door in primer
    box(shell, rust, 0.05, 0.3, l * 0.22, w / 2 + 0.01, 0.72, -l * 0.3);          // rust patches
    box(shell, rust, w * 0.5, 0.04, l * 0.12, w * 0.15, 1.17, l * 0.4);
    box(shell, lambert(0x3a3a3a), w + 0.1, 0.16, 0.14, 0, 0.56, l / 2 + 0.04);    // bumper
    const lamp = new THREE.MeshBasicMaterial({ color: 0xfff3c4 }), tail = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
    box(shell, lamp, w * 0.2, 0.18, 0.1, -w * 0.33, 0.8, l / 2 + 0.01);           // one headlight works
    box(shell, dark, w * 0.2, 0.18, 0.1, w * 0.33, 0.8, l / 2 + 0.01);
    for (const side of [-1, 1]) {
      box(shell, tail, w * 0.16, 0.14, 0.1, side * w * 0.36, 0.86, -l / 2 - 0.01);
      wheel(group, R, 0.3, side * (w / 2 - 0.05), R, l * 0.3);
      wheel(group, R, 0.3, side * (w / 2 - 0.05), R, -l * 0.3);
    }
    group.userData = {
      body,
      animate: (t) => { // a rough idle: the body shudders on its springs
        shell.position.y = Math.sin(t * 31) * 0.012;
        shell.rotation.z = Math.sin(t * 23) * 0.008;
      },
    };
    return group;
  },

  // A small, low sports coupe: wedge nose, a centre stripe, a wing on the back.
  sport: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.36;
    const paint = lambert(car.color), dark = lambert(0x1c1f25), white = lambert(0xf4f4f4);
    const body = box(group, paint, w, 0.36, l, 0, 0.52, 0);
    box(group, paint, w * 0.94, 0.12, l * 0.3, 0, 0.72, l * 0.3);                 // low bonnet
    box(group, dark, w * 0.8, 0.32, l * 0.36, 0, 0.86, -l * 0.06);                // cabin
    box(group, paint, w * 0.76, 0.05, l * 0.26, 0, 1.04, -l * 0.08);              // roof
    box(group, white, w * 0.16, 0.02, l * 0.3, 0, 0.79, l * 0.3);                 // stripe: bonnet,
    box(group, white, w * 0.16, 0.02, l * 0.26, 0, 1.075, -l * 0.08);             // roof,
    box(group, white, w * 0.16, 0.02, l * 0.2, 0, 0.71, -l * 0.39);               // and boot
    for (const side of [-1, 1]) box(group, dark, 0.06, 0.2, 0.08, side * w * 0.36, 0.84, -l * 0.44); // wing posts
    box(group, paint, w * 1.02, 0.05, 0.3, 0, 0.96, -l * 0.45);                   // wing
    box(group, dark, w * 0.9, 0.1, 0.12, 0, 0.4, l / 2 + 0.02);                   // splitter
    const lamp = new THREE.MeshBasicMaterial({ color: 0xfff3c4 }), tail = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
    for (const side of [-1, 1]) {
      box(group, lamp, w * 0.22, 0.1, 0.1, side * w * 0.33, 0.6, l / 2 + 0.01);
      box(group, tail, w * 0.3, 0.08, 0.1, side * w * 0.3, 0.62, -l / 2 - 0.01);
      wheel(group, R, 0.3, side * (w / 2 - 0.04), R, l * 0.3);
      wheel(group, R, 0.32, side * (w / 2 - 0.04), R, -l * 0.31);
    }
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A big, boxy family 4x4: tall glasshouse, roof rails, a spare wheel on the back.
  wagon: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.46;
    const paint = lambert(car.color), dark = lambert(0x20242b), trim = lambert(0x2a2a2a);
    const body = box(group, paint, w, 0.7, l, 0, 0.95, 0);
    box(group, trim, w + 0.06, 0.2, l + 0.04, 0, 0.66, 0);                        // lower cladding
    box(group, paint, w * 0.96, 0.6, l * 0.64, 0, 1.6, -l * 0.12);                // upper body
    box(group, dark, w * 0.98, 0.36, l * 0.56, 0, 1.62, -l * 0.12);               // side windows
    box(group, dark, w * 0.84, 0.36, l * 0.66, 0, 1.62, -l * 0.12);               // screens, front and back
    for (const side of [-1, 1]) box(group, trim, 0.06, 0.06, l * 0.5, side * w * 0.38, 1.95, -l * 0.12); // roof rails
    box(group, lambert(0xcfd3d8), w * 0.5, 0.2, 0.06, 0, 1.0, l / 2 + 0.02);      // grille
    const lamp = new THREE.MeshBasicMaterial({ color: 0xfff3c4 }), tail = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
    for (const side of [-1, 1]) {
      box(group, lamp, w * 0.18, 0.2, 0.1, side * w * 0.37, 1.0, l / 2 + 0.01);
      box(group, tail, w * 0.12, 0.34, 0.1, side * w * 0.42, 1.05, -l / 2 - 0.01);
      wheel(group, R, 0.34, side * (w / 2 - 0.04), R, l * 0.3);
      wheel(group, R, 0.34, side * (w / 2 - 0.04), R, -l * 0.3);
    }
    const spare = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.26, 16), lambert(0x141414));
    spare.rotation.x = Math.PI / 2; // flat against the tailgate
    spare.position.set(0, 1.1, -l / 2 - 0.16);
    group.add(spare);
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A split-colour camper bus: painted below, white above, a V on its flat nose, big round
  // headlights and a surfboard on the roof. It sways gently as it goes.
  lovebus: (car) => {
    const group = new THREE.Group(), shell = new THREE.Group();
    group.add(shell);
    const w = car.hw * 2, l = car.hl * 2, R = 0.4;
    const paint = lambert(car.color), white = lambert(0xf6f3ea), dark = lambert(0x23262d);
    const body = box(shell, paint, w, 0.75, l, 0, 0.85, 0);
    box(shell, white, w * 0.99, 0.85, l * 0.99, 0, 1.65, 0);                      // upper half
    box(shell, dark, w * 1.01, 0.4, l * 0.78, 0, 1.68, -l * 0.04);                // side windows
    box(shell, dark, w * 0.84, 0.42, 0.06, 0, 1.7, l / 2);                        // split windscreen
    box(shell, white, 0.06, 0.44, 0.08, 0, 1.7, l / 2 + 0.01);
    for (const side of [-1, 1]) { // the V on the nose, in the body colour's opposite
      const arm = box(shell, white, 0.12, 0.62, 0.05, side * w * 0.14, 0.92, l / 2 + 0.01);
      arm.rotation.z = side * 0.42;
    }
    box(shell, lambert(0xd8d8d8), w + 0.08, 0.12, 0.12, 0, 0.5, l / 2 + 0.03);    // chrome bumpers
    box(shell, lambert(0xd8d8d8), w + 0.08, 0.12, 0.12, 0, 0.5, -l / 2 - 0.03);
    box(shell, lambert(0xff7eb6), w * 0.3, 0.07, l * 0.8, w * 0.18, 2.16, -l * 0.02); // surfboard
    const lamp = new THREE.MeshBasicMaterial({ color: 0xfff3c4 }), tail = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
    for (const side of [-1, 1]) {
      const light = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 14), lamp);
      light.rotation.x = Math.PI / 2;
      light.position.set(side * w * 0.33, 0.92, l / 2 + 0.03);
      shell.add(light);
      box(shell, tail, w * 0.1, 0.24, 0.1, side * w * 0.4, 0.9, -l / 2 - 0.01);
      wheel(group, R, 0.3, side * (w / 2 - 0.04), R, l * 0.32);
      wheel(group, R, 0.3, side * (w / 2 - 0.04), R, -l * 0.32);
    }
    group.userData = {
      body,
      animate: (t) => { // a slow, easy sway
        shell.rotation.z = Math.sin(t * 2.2) * 0.025;
        shell.position.y = Math.sin(t * 4.4) * 0.015;
      },
    };
    return group;
  },

  // A Checker Marathon cab: a long, upright sedan with a checker band down each side, quad
  // round headlights, big chrome bumpers and a lit TAXI sign on the roof.
  taxi: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.38;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM);
    const body = box(group, paint, w, 0.6, l, 0, 0.65, 0);
    box(group, paint, w * 0.95, 0.06, l * 0.27, 0, 0.98, l * 0.37);               // bonnet
    box(group, paint, w * 0.95, 0.06, l * 0.2, 0, 0.98, -l * 0.41);               // boot
    box(group, glass, w * 0.88, 0.52, l * 0.46, 0, 1.21, -l * 0.06);              // glasshouse
    box(group, paint, w * 0.9, 0.08, l * 0.44, 0, 1.5, -l * 0.06);                // roof
    slab(group, glass, w * 0.86, 0.05, 0.56, 0, 1.2, l * 0.19, 0.36);             // windscreen
    slab(group, glass, w * 0.84, 0.05, 0.54, 0, 1.2, -l * 0.3, -0.36);            // rear window
    // the checker band: two rows of black and white squares
    const checks = document.createElement('canvas');
    checks.width = 256; checks.height = 16;
    const g = checks.getContext('2d');
    for (let i = 0; i < 32; i++) {
      for (let row = 0; row < 2; row++) {
        g.fillStyle = (i + row) % 2 ? '#111111' : '#f4f4f4';
        g.fillRect(i * 8, row * 8, 8, 8);
      }
    }
    const band = new THREE.CanvasTexture(checks);
    band.colorSpace = THREE.SRGBColorSpace;
    const checker = new THREE.MeshLambertMaterial({ map: band });
    // the roof sign, lit from inside
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 128; signCanvas.height = 48;
    const s = signCanvas.getContext('2d');
    s.fillStyle = '#fff6c8';
    s.fillRect(0, 0, 128, 48);
    s.fillStyle = '#1b1b1b';
    s.font = 'bold 34px sans-serif';
    s.textAlign = 'center';
    s.textBaseline = 'middle';
    s.fillText('TAXI', 64, 26);
    const signMap = new THREE.CanvasTexture(signCanvas);
    signMap.colorSpace = THREE.SRGBColorSpace;
    box(group, new THREE.MeshBasicMaterial({ map: signMap }), 0.9, 0.26, 0.42, 0, 1.68, -l * 0.04);
    for (const side of [-1, 1]) {
      box(group, checker, 0.02, 0.14, l * 0.86, side * (w / 2 + 0.006), 0.84, 0);  // checker band
      for (const z of [0.12, -0.06, -0.26]) box(group, paint, 0.09, 0.52, 0.1, side * w * 0.43, 1.21, l * z); // pillars
      box(group, chrome, 0.12, 0.08, 0.1, side * (w / 2 + 0.05), 1.0, l * 0.16);    // mirrors
      for (const x of [0.22, 0.4]) disc(group, LAMP, 0.11, 0.08, side * w * x, 0.78, l / 2 + 0.02); // quad headlights
      box(group, TAIL, w * 0.12, 0.26, 0.1, side * w * 0.4, 0.75, -l / 2 - 0.01);
      wheel(group, R, 0.3, side * (w / 2 - 0.04), R, l * 0.3);
      wheel(group, R, 0.3, side * (w / 2 - 0.04), R, -l * 0.3);
    }
    box(group, chrome, w * 0.24, 0.22, 0.06, 0, 0.78, l / 2 + 0.02);               // grille
    box(group, chrome, w + 0.14, 0.2, 0.18, 0, 0.42, l / 2 + 0.05);               // big chrome bumpers
    box(group, chrome, w + 0.14, 0.2, 0.18, 0, 0.42, -l / 2 - 0.05);
    box(group, trim, w * 0.5, 0.18, 0.04, 0, 0.62, -l / 2 - 0.02);                // number plate
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A 2002 Jeep Liberty: tall and square, round headlights either side of the seven-slot
  // grille, black arch flares, roof rails and a spare wheel on the tailgate. It rocks a
  // little on its soft springs.
  suv: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.42;
    const shell = new THREE.Group(); // (what rocks on the springs: everything but the wheels)
    group.add(shell);
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), chrome = lambert(CHROME);
    const body = box(shell, paint, w, 0.75, l, 0, 0.78, 0);
    box(shell, paint, w * 0.96, 0.1, l * 0.24, 0, 1.18, l * 0.37);                // bonnet
    box(shell, glass, w * 0.9, 0.5, l * 0.6, 0, 1.42, -l * 0.08);                 // glasshouse
    box(shell, paint, w * 0.92, 0.08, l * 0.62, 0, 1.7, -l * 0.08);               // roof
    slab(shell, glass, w * 0.88, 0.05, 0.62, 0, 1.4, l * 0.25, 0.55);             // windscreen
    box(shell, paint, w * 0.56, 0.4, 0.06, 0, 0.9, l / 2 + 0.02);                 // grille...
    for (let i = 0; i < 7; i++) box(shell, trim, 0.06, 0.3, 0.04, (i - 3) * w * 0.075, 0.9, l / 2 + 0.05); // ...its seven slots
    box(shell, trim, w + 0.1, 0.24, 0.18, 0, 0.5, l / 2 + 0.05);                  // bumpers
    box(shell, trim, w + 0.1, 0.24, 0.18, 0, 0.5, -l / 2 - 0.05);
    // the spare wheel on the tailgate
    disc(shell, lambert(0x141414), 0.38, 0.24, 0, 1.0, -l / 2 - 0.15);
    disc(shell, lambert(0x8d9096), 0.2, 0.26, 0, 1.0, -l / 2 - 0.15);
    for (const side of [-1, 1]) {
      disc(shell, LAMP, 0.15, 0.08, side * w * 0.38, 0.98, l / 2 + 0.03);         // round headlights
      box(shell, TAIL, 0.14, 0.42, 0.1, side * w * 0.43, 1.0, -l / 2 - 0.01);       // tall tail lights
      for (const z of [0.18, -0.08, -0.36]) box(shell, paint, 0.09, 0.5, 0.1, side * w * 0.45, 1.42, l * z); // pillars
      box(shell, trim, 0.06, 0.06, l * 0.56, side * w * 0.4, 1.78, -l * 0.08);      // roof rails
      box(shell, trim, 0.14, 0.1, 0.12, side * (w / 2 + 0.07), 1.22, l * 0.2);      // mirrors
      for (const z of [0.3, -0.3]) box(shell, trim, 0.1, 0.12, 1.1, side * (w / 2 + 0.03), R * 2 + 0.08, l * z); // arch flares
      box(shell, chrome, 0.02, 0.05, l * 0.3, side * (w / 2 + 0.005), 0.98, 0);    // door handles strip
      wheel(group, R, 0.32, side * (w / 2 - 0.05), R, l * 0.3);
      wheel(group, R, 0.32, side * (w / 2 - 0.05), R, -l * 0.3);
    }
    group.userData = {
      body,
      animate: (t) => {
        shell.rotation.z = Math.sin(t * 1.7) * 0.012;
        shell.position.y = Math.sin(t * 3.4) * 0.012;
      },
    };
    return group;
  },

  // A Ford lo-boy hot rod: no fenders, a long narrow bonnet with the engine out in the open
  // (chrome stacks and all), big wheels at the back, skinny ones up front, and a chopped
  // windscreen over an open cockpit. The engine shakes as it idles.
  hotrod: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, RR = 0.5, RF = 0.34;
    const paint = lambert(car.color), chrome = lambert(CHROME), trim = lambert(TRIM), glass = lambert(GLASS);
    box(group, trim, w * 0.5, 0.12, l * 0.9, 0, 0.42, 0);                          // frame rails
    const body = box(group, paint, w * 0.78, 0.55, l * 0.36, 0, 0.78, -l * 0.12);   // the tub
    box(group, trim, w * 0.6, 0.2, l * 0.2, 0, 0.98, -l * 0.15);                    // cockpit and seat
    box(group, paint, w * 0.52, 0.32, l * 0.3, 0, 0.82, l * 0.2);                   // bonnet
    box(group, paint, w * 0.5, 0.62, 0.14, 0, 0.88, l * 0.36);                      // grille shell
    box(group, chrome, w * 0.38, 0.48, 0.04, 0, 0.88, l * 0.44);                    // grille bars
    box(group, glass, w * 0.7, 0.22, 0.04, 0, 1.18, l * 0.06);                      // chopped windscreen
    box(group, chrome, w * 0.74, 0.04, 0.06, 0, 1.3, l * 0.06);                     // its frame
    box(group, trim, w * 0.9, 0.08, 0.1, 0, 0.42, l * 0.33);                        // dropped front axle
    box(group, chrome, w * 0.5, 0.12, 0.1, 0, 0.42, -l / 2 + 0.05);                 // rear nerf bar
    const engine = new THREE.Group(); // (it shakes)
    engine.position.set(0, 1.0, l * 0.22);
    group.add(engine);
    box(engine, lambert(0x5a5e66), w * 0.4, 0.22, 0.6, 0, 0, 0);                    // the block, showing
    box(engine, chrome, w * 0.3, 0.2, 0.4, 0, 0.2, 0);                              // blower
    box(engine, lambert(0x8d9096), w * 0.24, 0.08, 0.3, 0, 0.34, -0.02);           // its scoop
    for (const side of [-1, 1]) {
      for (const z of [-0.15, 0.05, 0.25]) { // stacks
        const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8), chrome);
        stack.position.set(side * w * 0.27, 0.12, z);
        engine.add(stack);
      }
      box(group, chrome, 0.07, 0.07, l * 0.55, side * w * 0.3, 0.55, -l * 0.05);   // side pipes
      disc(group, LAMP, 0.13, 0.12, side * w * 0.33, 1.02, l * 0.38);              // headlights on a bar
      box(group, chrome, 0.04, 0.24, 0.04, side * w * 0.33, 0.86, l * 0.38);
      box(group, TAIL, 0.12, 0.12, 0.06, side * w * 0.3, 0.72, -l * 0.3 - 0.01);
      wheel(group, RR, 0.42, side * (w / 2 - 0.08), RR, -l * 0.3);                  // big ones at the back
      wheel(group, RF, 0.2, side * w * 0.42, RF, l * 0.33);                         // skinny ones up front
    }
    group.userData = {
      body,
      animate: (t) => {
        engine.rotation.z = Math.sin(t * 38) * 0.04;
        engine.position.y = 1.0 + Math.abs(Math.sin(t * 19)) * 0.02;
      },
    };
    return group;
  },
};
