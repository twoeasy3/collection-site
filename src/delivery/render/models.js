// ---- animated models ---------------------------------------------------------------------
// Vehicles with a look of their own (a car's "model" field in src/cars.js). Each builder
// takes the car's entry and returns a group, front facing local +z, with:
//   userData.body     the mesh whose material is the paint (so the livery can be swapped)
//   userData.animate  (seconds) => void: poses the model for that moment. It is called every
//                     frame the model is drawn, in the game and in the garage alike, so the
//                     animation loops for as long as the model is on screen.
import * as THREE from 'three';

const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const box = (parent, material, w, h, l, x, y, z) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
const wheel = (parent, radius, width, x, y, z) => {
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 16), lambert(0x141414));
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, width + 0.04, 12), lambert(0xe6c15a));
  for (const mesh of [tyre, hub]) {
    mesh.rotation.z = Math.PI / 2; // axle across the car
    mesh.position.set(x, y, z);
    parent.add(mesh);
  }
};

// a flat panel tipped about the car's width: a windscreen, a fastback. `pitch` > 0 drops its front edge
const slab = (parent, material, w, t, l, x, y, z, pitch) => {
  const mesh = box(parent, material, w, t, l, x, y, z);
  mesh.rotation.x = pitch;
  return mesh;
};
const GLASS = 0x232a35, CHROME = 0xd8d8d8, TRIM = 0x2a2c31;
const LAMP = new THREE.MeshBasicMaterial({ color: 0xfff3c4 }), TAIL = new THREE.MeshBasicMaterial({ color: 0xff2a2a });

export const MODELS = {
  // The starter car: a tidy five-door hatchback with a delivery sign on the roof.
  hatch: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.36;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), white = lambert(0xf4f4f4);
    const body = box(group, paint, w, 0.5, l, 0, 0.62, 0);
    box(group, paint, w * 0.94, 0.08, l * 0.27, 0, 0.9, l * 0.355);               // bonnet
    box(group, glass, w * 0.86, 0.42, l * 0.56, 0, 1.08, -l * 0.12);              // glasshouse
    box(group, paint, w * 0.9, 0.08, l * 0.52, 0, 1.33, -l * 0.13);               // roof
    slab(group, glass, w * 0.84, 0.05, 0.74, 0, 1.09, l * 0.225, 0.6);            // windscreen
    for (const side of [-1, 1]) {
      for (const z of [0.16, -0.1, -0.39]) box(group, paint, 0.09, 0.42, 0.1, side * w * 0.43, 1.08, l * z); // pillars
      box(group, white, 0.02, 0.09, l * 0.74, side * (w / 2 + 0.005), 0.72, -l * 0.02); // side stripe
      box(group, trim, 0.02, 0.44, 0.03, side * (w / 2 + 0.006), 0.63, l * 0.02);  // door shut line
      box(group, paint, 0.14, 0.1, 0.12, side * (w / 2 + 0.07), 0.95, l * 0.15);   // mirror
      box(group, LAMP, w * 0.22, 0.16, 0.1, side * w * 0.34, 0.72, l / 2 + 0.01);
      box(group, TAIL, w * 0.14, 0.3, 0.1, side * w * 0.4, 0.82, -l / 2 - 0.01);
      wheel(group, R, 0.3, side * (w / 2 - 0.04), R, l * 0.31);
      wheel(group, R, 0.3, side * (w / 2 - 0.04), R, -l * 0.31);
    }
    box(group, trim, w * 0.42, 0.12, 0.06, 0, 0.7, l / 2 + 0.02);                  // grille
    box(group, trim, w + 0.08, 0.16, 0.14, 0, 0.44, l / 2 + 0.03);                 // bumpers
    box(group, trim, w + 0.08, 0.16, 0.14, 0, 0.44, -l / 2 - 0.03);
    box(group, lambert(0xffd23f), 0.34, 0.24, 0.8, 0, 1.49, -l * 0.1);             // roof sign
    box(group, trim, 0.4, 0.05, 0.6, 0, 1.385, -l * 0.1);
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A long-nosed fastback: raked glass front and back, sills, a boot lip, twin exhausts.
  coupe: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.36;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), white = lambert(0xf4f4f4);
    const body = box(group, paint, w, 0.4, l, 0, 0.57, 0);
    box(group, paint, w * 0.92, 0.07, l * 0.36, 0, 0.8, l * 0.3);                  // long bonnet
    box(group, paint, w * 0.3, 0.05, l * 0.2, 0, 0.855, l * 0.3);                  // power bulge
    box(group, glass, w * 0.82, 0.34, l * 0.3, 0, 0.94, -l * 0.1);                 // cabin
    box(group, paint, w * 0.82, 0.06, l * 0.27, 0, 1.13, -l * 0.115);              // roof
    slab(group, glass, w * 0.8, 0.05, 0.78, 0, 0.96, l * 0.125, 0.44);             // windscreen
    slab(group, glass, w * 0.76, 0.05, 0.94, 0, 0.955, -l * 0.345, -0.36);         // fastback
    box(group, paint, w * 0.94, 0.06, 0.22, 0, 0.83, -l * 0.47);                   // boot lip
    for (const side of [-1, 1]) {
      slab(group, paint, 0.1, 0.07, 0.96, side * w * 0.4, 0.96, -l * 0.345, -0.36); // rear pillars
      box(group, white, 0.02, 0.07, l * 0.8, side * (w / 2 + 0.005), 0.64, 0);     // side stripe
      box(group, trim, 0.06, 0.1, l * 0.52, side * (w / 2 + 0.01), 0.4, 0);        // sills
      box(group, paint, 0.13, 0.08, 0.12, side * (w / 2 + 0.06), 0.85, l * 0.07);  // mirror
      box(group, LAMP, w * 0.26, 0.1, 0.1, side * w * 0.33, 0.66, l / 2 + 0.01);
      box(group, lambert(0x8d9096), 0.11, 0.1, 0.14, side * w * 0.25, 0.4, -l / 2 - 0.04); // exhausts
      wheel(group, R, 0.3, side * (w / 2 - 0.04), R, l * 0.31);
      wheel(group, R, 0.32, side * (w / 2 - 0.04), R, -l * 0.31);
    }
    box(group, TAIL, w * 0.86, 0.08, 0.1, 0, 0.66, -l / 2 - 0.01);                 // tail light bar
    box(group, trim, w * 0.5, 0.1, 0.06, 0, 0.5, l / 2 + 0.02);                    // intake
    box(group, trim, w * 0.96, 0.08, 0.14, 0, 0.4, l / 2 + 0.02);                  // splitter
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A long, low car on hydraulics: the front end hops up off its wheels and drops again,
  // pivoting about the rear axle, over and over.
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
    for (const side of [-1, 1]) {
      box(chassis, paint, 0.09, 0.2, l * 0.24, side * (w / 2 - 0.045), 0.49, at(-l * 0.38)); // tail fins
      box(chassis, gold, 0.02, 0.04, l * 0.84, side * (w / 2 + 0.005), 0.3, at(0));     // pinstripe
      box(chassis, paint, 0.09, 0.36, 0.09, side * w * 0.38, 0.56, at(-l * 0.22));      // rear pillars
      box(chassis, chrome, 0.12, 0.08, 0.1, side * (w / 2 + 0.05), 0.46, at(l * 0.12)); // mirrors
      box(chassis, lamp, w * 0.2, 0.16, 0.1, side * w * 0.33, 0.22, at(l / 2 + 0.01));
      box(chassis, tail, w * 0.24, 0.1, 0.1, side * w * 0.3, 0.24, at(-l / 2 - 0.01));
      wheel(chassis, R, 0.3, side * (w / 2 - 0.05), 0, at(frontZ)); // front wheels leave the ground
      wheel(group, R, 0.3, side * (w / 2 - 0.05), R, rearZ);        // rear wheels stay planted
    }

    group.userData = {
      body,
      animate: (t) => {
        // up with a kick, down, a short rest, and again
        const hop = Math.max(0, Math.sin(t * 6.5));
        chassis.rotation.x = -0.27 * Math.pow(hop, 0.6); // (negative pitch lifts the nose)
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
};
