// ---- the car ideas' models -----------------------------------------------------------------------
// Thirty vehicles drawn as ideas (ideas.js: IDEA_CARS), each after a real one, for the garage's "Car ideas"
// lot (render/ideaslot.js). Built as the garage's own models are (render/models.js): each builder takes the
// idea's entry and returns a group, front facing local +z, with
//   userData.body     the mesh whose material is the paint (so the livery can be swapped)
//   userData.animate  (seconds) => void: poses the model for that moment
//   userData.livery   optional, (evil) => void: the parts that differ between Good and Evil beyond the paint
// State-free: nothing here knows about the game. To make an idea a real car, move its builder to MODELS.
import * as THREE from 'three';

const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const box = (parent, material, w, h, l, x, y, z) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
const GLASS = 0x232a35, CHROME = 0xd8d8d8, TRIM = 0x2a2c31;
const TYRE = lambert(0x141414), STEEL = lambert(0xc4c8ce), ALLOY = lambert(0x8a8f96), WHITE = lambert(0xf4f2ec);
const LAMP = new THREE.MeshBasicMaterial({ color: 0xfff3c4 }), TAIL = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
const AMBER = new THREE.MeshBasicMaterial({ color: 0xffa31a });
// (returns [tyre, hub]; the hub is steel unless given a material of its own)
const wheel = (parent, radius, width, x, y, z, hubMaterial = STEEL) => {
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 16), TYRE);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, width + 0.04, 12), hubMaterial);
  for (const mesh of [tyre, hub]) {
    mesh.rotation.z = Math.PI / 2; // axle across the car
    mesh.position.set(x, y, z);
    parent.add(mesh);
  }
  return [tyre, hub];
};
// a wheel with a white wall to its tyre
const whitewall = (parent, radius, width, x, y, z, hubMaterial) => {
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.8, radius * 0.8, width + 0.02, 16), WHITE);
  wall.rotation.z = Math.PI / 2;
  wall.position.set(x, y, z);
  parent.add(wall);
  return wheel(parent, radius, width, x, y, z, hubMaterial);
};
// a flat panel tipped about the car's width: a windscreen, a fastback. `pitch` > 0 drops its front edge
const slab = (parent, material, w, t, l, x, y, z, pitch) => {
  const mesh = box(parent, material, w, t, l, x, y, z);
  mesh.rotation.x = pitch;
  return mesh;
};
// a solid block whose side view is the polygon `profile` ([z, y] points), `w` wide across the car, its
// middle at x
const prism = (parent, material, w, profile, x = 0) => {
  const shape = new THREE.Shape(profile.map(([z, y]) => new THREE.Vector2(z, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
  geo.rotateY(-Math.PI / 2); // (the profile's z along the car; extruded across it)
  geo.translate(x + w / 2, 0, 0);
  const mesh = new THREE.Mesh(geo, material);
  parent.add(mesh);
  return mesh;
};
// a side view with its corners rounded off: the polygon `points` ([z, y], or [z, y, r] for a corner of its
// own), each corner turned through a curve of about `r`. For `curved`
const rounded = (points, r = 0.08) => {
  const shape = new THREE.Shape(), n = points.length;
  points.forEach(([z, y, own], i) => {
    const [az, ay] = points[(i + n - 1) % n], [cz, cy] = points[(i + 1) % n];
    const la = Math.hypot(az - z, ay - y), lc = Math.hypot(cz - z, cy - y), k = Math.min(own ?? r, la / 2, lc / 2);
    const from = [z + (az - z) / la * k, y + (ay - y) / la * k], to = [z + (cz - z) / lc * k, y + (cy - y) / lc * k];
    if (i) shape.lineTo(from[0], from[1]); else shape.moveTo(from[0], from[1]);
    shape.quadraticCurveTo(z, y, to[0], to[1]);
  });
  shape.closePath();
  return shape;
};
// a solid whose side view is the curved THREE.Shape `shape` (x along the car, y up), `w` wide across it
// with its edges rounded off by `round`, its middle at x
const curved = (parent, material, w, shape, round, x = 0) => {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: w - 2 * round, curveSegments: 12, bevelEnabled: true, bevelThickness: round, bevelSize: round, bevelSegments: 2,
  });
  geo.rotateY(-Math.PI / 2);
  geo.translate(x + w / 2 - round, 0, 0);
  const mesh = new THREE.Mesh(geo, material);
  parent.add(mesh);
  return mesh;
};
// a windscreen (or a rear window), as `slab` tips it, made solid: the wedge under the glass filled in
const screen = (parent, material, w, t, l, x, y, z, pitch) => {
  const mesh = slab(parent, material, w, t, l, x, y, z, pitch);
  const dz = l / 2 * Math.cos(pitch), dy = l / 2 * Math.sin(pitch);
  const front = [z + dz, y - dy], back = [z - dz, y + dy]; // (its two edges, side on)
  const [high, low] = front[1] > back[1] ? [front, back] : [back, front];
  prism(parent, material, w, [low, high, [high[0], low[1]]], x);
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
// a round bar: `axis` 'x' across the car, 'y' upright, 'z' along it
const tube = (parent, material, r, length, x, y, z, axis = 'y') => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, length, 10), material);
  if (axis === 'x') mesh.rotation.z = Math.PI / 2;
  if (axis === 'z') mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
// a rounded lump (a wing over a wheel, a dome, a bubble): a ball squashed to rx, ry, rz
const BALL = new THREE.SphereGeometry(1, 16, 10);
const blob = (parent, material, rx, ry, rz, x, y, z) => {
  const mesh = new THREE.Mesh(BALL, material);
  mesh.scale.set(rx, ry, rz);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
// a mudguard: the top half of a drum lying across the car, its middle at (x, y, z)
const fender = (parent, material, r, width, x, y, z) => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, width, 14, 1, false, 0, Math.PI), material);
  mesh.rotation.z = Math.PI / 2;
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
// a block that narrows (or grows) along the car: from the cross-section `a` to `b`, each [z, width, bottom, top],
// its middle at x. A pointed nose, a snout
const taper = (parent, material, a, b, x = 0) => {
  const corners = [];
  for (const [z, w, y0, y1] of [a[0] < b[0] ? a : b, a[0] < b[0] ? b : a]) corners.push([-w / 2, y0, z], [w / 2, y0, z], [w / 2, y1, z], [-w / 2, y1, z]);
  const faces = [4, 5, 6, 4, 6, 7, 0, 2, 1, 0, 3, 2, 3, 7, 6, 3, 6, 2, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 0, 7, 3, 0, 4, 7];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(faces.flatMap(i => [corners[i][0] + x, corners[i][1], corners[i][2]]), 3));
  geo.computeVertexNormals(); // (no shared corners: each face flat)
  const mesh = new THREE.Mesh(geo, material);
  parent.add(mesh);
  return mesh;
};
// a strip of text (a destination blind, a sign), as a material
const lettered = (text, colour, ground, w = 256, h = 64) => {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = colour;
  ctx.font = 'bold ' + Math.round(h * 0.68) + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2 + h * 0.04, w * 0.9);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map });
};

export const IDEA_MODELS = {
  // A bubble car (a BMW Isetta): an egg on wheels. The whole front is its one door, hinged at the side, the
  // windscreen in it; a glass bubble over a bench seat; lamps in pods on its flanks; the two back wheels close
  // together under the pinched tail. It sits still
  bubble: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.25;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM);
    // (an egg: a ball squashed, and pinched in towards the tail)
    const egg = (material, rx, ry, rz, y, z, pinch) => {
      const geo = new THREE.SphereGeometry(1, 18, 12), at = geo.attributes.position;
      for (let i = 0; i < at.count; i++) at.setX(i, at.getX(i) * (1 - pinch * Math.max(0, -at.getZ(i))));
      const mesh = new THREE.Mesh(geo, material);
      mesh.scale.set(rx, ry, rz);
      mesh.position.set(0, y, z);
      group.add(mesh);
      return mesh;
    };
    const body = egg(paint, w / 2, 0.5, L, 0.66, 0, 0.45);                              // the shell
    egg(glass, w * 0.45, 0.44, L * 0.8, 0.88, 0.02, 0.3);                               // the bubble of glass in it
    egg(paint, w * 0.39, 0.475, L * 0.66, 0.88, -0.04, 0.3);                            // its roof, showing through the top
    // the front door: a flat panel across the whole nose, a dark gap round it, the windscreen above
    box(group, trim, w * 0.66, 0.5, 0.05, 0, 0.6, L * 0.86);
    box(group, paint, w * 0.61, 0.45, 0.07, 0, 0.6, L * 0.875);
    const windscreen = box(group, glass, w * 0.62, 0.42, 0.04, 0, 1.02, L * 0.76);
    windscreen.rotation.x = -0.38;
    for (const side of [-1, 1]) box(group, paint, 0.05, 0.44, 0.05, side * w * 0.32, 1.02, L * 0.76).rotation.x = -0.38; // its pillars
    box(group, chrome, 0.05, 0.14, 0.05, -w * 0.25, 0.66, L * 0.92);                    // the door's handle
    for (const y of [0.46, 0.76]) box(group, chrome, 0.04, 0.07, 0.05, w * 0.31, y, L * 0.88); // and its hinges
    for (const side of [-1, 1]) {
      box(group, chrome, w * 0.22, 0.06, 0.07, side * w * 0.2, 0.3, L * 0.9);           // a bumper bar each side
      blob(group, paint, 0.12, 0.12, 0.2, side * w * 0.44, 0.78, L * 0.5);              // the lamp pods on its flanks
      disc(group, LAMP, 0.085, 0.05, side * w * 0.44, 0.78, L * 0.5 + 0.18);
      disc(group, chrome, 0.1, 0.03, side * w * 0.44, 0.78, L * 0.5 + 0.165);
      fender(group, paint, R + 0.07, 0.17, side * (w / 2 - 0.1), R, L * 0.42);          // the front wheels' arches
      wheel(group, R, 0.13, side * (w / 2 - 0.1), R, L * 0.42);
      wheel(group, R, 0.13, side * 0.26, R, -L * 0.62);                                 // the back pair, close together
      disc(group, TAIL, 0.05, 0.04, side * w * 0.2, 0.66, -L * 0.9);
    }
    tube(group, trim, 0.05, 0.4, 0, R, -L * 0.62, 'x');                                 // their short axle
    box(group, chrome, w * 0.4, 0.03, 0.3, 0, 0.92, -L * 0.82);                         // a luggage rack on the tail
    for (const side of [-1, 1]) box(group, chrome, 0.03, 0.12, 0.03, side * w * 0.18, 0.86, -L * 0.74);
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A three-wheeler (a Reliant Robin): one wheel under a narrow wedge of a nose, a tall glassy cabin behind
  // it on two back wheels, frog-eyed lamps on the bonnet. It rocks from side to side, as if it might go over
  threewheeler: (car) => {
    const group = new THREE.Group(), shell = new THREE.Group();
    group.add(shell);
    const w = car.hw * 2, L = car.hl, R = 0.27;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), chrome = lambert(CHROME);
    const body = curved(shell, paint, w, rounded([[-L * 0.98, 0.36], [L * 0.3, 0.36], [L * 0.3, 0.84], [-L * 0.94, 0.86], [-L * 0.98, 0.7]], 0.06), 0.04);
    taper(shell, paint, [L * 0.28, w, 0.32, 0.88], [L, w * 0.46, 0.5, 0.64]);            // the nose, narrowing to its tip
    box(shell, trim, w * 0.3, 0.06, 0.03, 0, 0.57, L + 0.01);                            // a slot of a grille
    prism(shell, glass, w * 0.88, [[L * 0.3, 0.86], [L * 0.06, 1.3], [-L * 0.7, 1.3], [-L * 0.95, 0.88]]); // the cabin
    box(shell, paint, w * 0.9, 0.07, L * 0.8, 0, 1.335, -L * 0.33);                      // its roof
    for (const side of [-1, 1]) {
      box(shell, paint, 0.07, 0.44, 0.1, side * w * 0.44, 1.08, -L * 0.22);              // the door pillars
      disc(shell, LAMP, 0.095, 0.2, side * w * 0.26, 0.74, L * 0.66);                    // frog-eyed lamps on the bonnet
      disc(shell, chrome, 0.115, 0.16, side * w * 0.26, 0.74, L * 0.655);
      box(shell, TAIL, 0.1, 0.16, 0.04, side * w * 0.4, 0.7, -L - 0.02);
      box(shell, trim, 0.09, 0.07, 0.1, side * (w / 2 + 0.04), 0.94, L * 0.3);           // mirrors
      wheel(group, R, 0.17, side * (w / 2 - 0.06), R, -L * 0.6);
    }
    wheel(group, R, 0.16, 0, R, L * 0.64);                                               // the one front wheel
    box(shell, trim, w * 0.5, 0.07, 0.07, 0, 0.47, L + 0.02);                            // bumpers
    box(shell, trim, w + 0.04, 0.09, 0.08, 0, 0.42, -L - 0.03);
    box(shell, lambert(0xf2d21f), w * 0.3, 0.09, 0.02, 0, 0.56, -L - 0.03);              // a yellow number plate
    group.userData = { body, animate: (t) => { shell.rotation.z = Math.sin(t * 1.1) * 0.05; } };
    return group;
  },

  // A tin snail (a Citroen 2CV): one arch of a roofline from the windscreen to the back bumper, a canvas roof
  // rolled over it, a narrow hump of a bonnet between flowing wings, lamps on stalks, skinny wheels (the back
  // pair half hidden). It sways on its soft springs
  tinsnail: (car) => {
    const group = new THREE.Group(), shell = new THREE.Group();
    group.add(shell);
    const w = car.hw * 2, L = car.hl, R = 0.3;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM), canvas = lambert(0x4a4d52);
    const cabin = new THREE.Shape();                                                      // the cabin, side on:
    cabin.moveTo(L * 0.3, 0.42);
    cabin.lineTo(L * 0.3, 0.95);
    cabin.lineTo(L * 0.16, 1.48);                                                         // the upright windscreen
    cabin.quadraticCurveTo(-L * 0.2, 1.6, -L * 0.5, 1.4);                                 // the arch of the roof
    cabin.quadraticCurveTo(-L * 0.95, 1.08, -L * 0.96, 0.62);                             // and on down the tail
    cabin.lineTo(-L * 0.96, 0.42);
    const body = curved(shell, paint, w * 0.94, cabin, 0.04);
    const hood = new THREE.Shape();                                                       // the canvas roof, rolled over it
    hood.moveTo(L * 0.13, 1.54);
    hood.quadraticCurveTo(-L * 0.2, 1.67, -L * 0.5, 1.47);
    hood.quadraticCurveTo(-L * 0.8, 1.26, -L * 0.9, 0.96);
    hood.lineTo(-L * 0.8, 0.96);
    hood.quadraticCurveTo(-L * 0.74, 1.2, -L * 0.5, 1.36);
    hood.quadraticCurveTo(-L * 0.2, 1.56, L * 0.13, 1.44);
    curved(shell, canvas, w * 0.74, hood, 0.02);
    for (let i = 0; i < 4; i++) box(shell, trim, w * 0.76, 0.03, 0.04, 0, 1.61 - i * i * 0.022, L * (0.02 - i * 0.15)); // its ribs
    const windscreen = box(shell, glass, w * 0.8, 0.42, 0.03, 0, 1.22, L * 0.23 + 0.06);
    windscreen.rotation.x = -0.25;
    curved(shell, paint, w * 0.56, rounded([[L * 0.28, 0.45], [L * 0.28, 0.98], [L * 0.62, 0.95], [L * 0.97, 0.66], [L * 0.97, 0.45]], 0.1), 0.04); // the hump of a bonnet
    for (let i = -2; i <= 2; i++) box(shell, trim, 0.02, 0.02, L * 0.3, i * w * 0.09, 1.01, L * 0.46); // its ribs
    box(shell, chrome, w * 0.42, 0.24, 0.04, 0, 0.6, L * 0.97 + 0.04);                    // the grille,
    for (const y of [0.52, 0.6, 0.68]) box(shell, trim, w * 0.38, 0.04, 0.05, 0, y, L * 0.97 + 0.045); // its slats
    for (const side of [-1, 1]) {
      const x = side * (w / 2 - 0.13);
      fender(shell, paint, 0.43, 0.28, x, R, L * 0.64);                                   // the front wings,
      box(shell, paint, 0.28, 0.1, L * 0.3, x, 0.42, L * 0.36);                           // flowing back to the doors
      disc(shell, LAMP, 0.1, 0.06, side * w * 0.33, 0.93, L * 0.66);                      // lamps on stalks
      disc(shell, chrome, 0.12, 0.16, side * w * 0.33, 0.93, L * 0.6);
      box(shell, chrome, 0.03, 0.2, 0.03, side * w * 0.33, 0.8, L * 0.58);
      box(shell, glass, 0.02, 0.36, L * 0.3, side * (w * 0.47 + 0.005), 1.2, -L * 0.03);  // the side windows
      box(shell, glass, 0.02, 0.3, L * 0.24, side * (w * 0.47 + 0.005), 1.17, -L * 0.37);
      box(shell, TAIL, 0.08, 0.1, 0.04, side * w * 0.36, 0.72, -L * 0.96 - 0.05);
      wheel(group, R, 0.12, side * (w / 2 - 0.08), R, L * 0.64);                          // skinny wheels,
      wheel(group, R, 0.12, side * (w / 2 - 0.14), R, -L * 0.62);                         // the back pair tucked under the body
    }
    box(shell, chrome, w * 0.9, 0.06, 0.06, 0, 0.4, L + 0.02);                            // thin bumpers
    box(shell, chrome, w * 0.9, 0.06, 0.06, 0, 0.4, -L - 0.02);
    group.userData = {
      body,
      animate: (t) => { shell.rotation.z = Math.sin(t * 1.6) * 0.03; shell.rotation.x = Math.sin(t * 2.3) * 0.01; },
    };
    return group;
  },

  // A people's bug (a Volkswagen Beetle): a dome of a roof running down into a sloping tail with the engine's
  // vents in it, four separate round wings, lamps in the front pair, running boards between. It sits still
  bug: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.31;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM);
    const shell = new THREE.Shape();                                                      // the body, side on:
    shell.moveTo(L * 0.9, 0.36);
    shell.quadraticCurveTo(L * 0.99, 0.5, L * 0.92, 0.72);                                // the nose
    shell.quadraticCurveTo(L * 0.7, 0.9, L * 0.36, 0.96);                                 // the rounded front lid
    shell.bezierCurveTo(L * 0.26, 1.3, L * 0.12, 1.45, -L * 0.12, 1.45);                  // the windscreen, into the dome
    shell.bezierCurveTo(-L * 0.5, 1.45, -L * 0.72, 1.05, -L * 0.96, 0.62);                // and the long slope of the tail
    shell.lineTo(-L * 0.96, 0.36);
    const body = curved(group, paint, w * 0.8, shell, 0.05);
    curved(group, glass, w * 0.8 + 0.02, rounded([[L * 0.27, 1.0], [L * 0.15, 1.36], [-L * 0.22, 1.38], [-L * 0.48, 1.14], [-L * 0.48, 1.0]], 0.1), 0.01); // the side windows
    box(group, paint, w * 0.8 + 0.03, 0.4, 0.07, 0, 1.19, -L * 0.07);                     // the door pillar
    const windscreen = box(group, glass, w * 0.6, 0.34, 0.03, 0, 1.19, L * 0.277 + 0.075);
    windscreen.rotation.x = -0.55;
    slab(group, glass, w * 0.44, 0.03, 0.3, 0, 1.345, -L * 0.52, -0.44);                  // the small rear window
    for (let i = 0; i < 4; i++) slab(group, trim, w * 0.36, 0.02, 0.05, 0, 1.14 - i * 0.055, -L * (0.67 + i * 0.037), -0.63); // the engine's vents
    for (const side of [-1, 1]) {
      const x = side * (w / 2 - 0.2);
      blob(group, paint, 0.22, 0.3, 0.56, x, 0.5, L * 0.6);                               // the front wings,
      blob(group, paint, 0.24, 0.34, 0.6, side * (w / 2 - 0.21), 0.53, -L * 0.58);        // and the bigger back ones
      disc(group, LAMP, 0.105, 0.08, x, 0.66, L * 0.6 + 0.46);                            // lamps in the front wings
      disc(group, chrome, 0.125, 0.05, x, 0.66, L * 0.6 + 0.45);
      disc(group, TAIL, 0.06, 0.06, side * (w / 2 - 0.21), 0.66, -L * 0.58 - 0.5);
      box(group, trim, 0.18, 0.05, L * 0.52, side * (w / 2 - 0.12), 0.33, 0);             // the running boards
      wheel(group, R, 0.2, side * (w / 2 - 0.1), R, L * 0.6, lambert(CHROME));
      wheel(group, R, 0.2, side * (w / 2 - 0.1), R, -L * 0.58, lambert(CHROME));
      box(group, chrome, 0.06, 0.16, 0.07, side * w * 0.22, 0.43, L + 0.04);              // the bumpers' overriders
    }
    box(group, chrome, w * 0.92, 0.07, 0.07, 0, 0.4, L + 0.02);                           // chrome bumpers
    box(group, chrome, w * 0.92, 0.07, 0.07, 0, 0.4, -L - 0.0);
    box(group, chrome, 0.04, 0.03, 0.14, 0, 0.9, L * 0.72);                               // the front lid's handle
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A two-stroke saloon (a Trabant 601): a small, boxy two-door in a pale pastel with an ivory roof, round
  // lamps, a thick rear pillar and little fins on its tail. Its exhaust puffs blue smoke
  twostroke: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.28;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM), ivory = lambert(0xefe8d2);
    const body = curved(group, paint, w, rounded([[-L * 0.98, 0.34], [L * 0.98, 0.34], [L * 0.98, 0.7], [L * 0.4, 0.78], [-L * 0.98, 0.8]], 0.06), 0.04);
    prism(group, glass, w * 0.86, [[L * 0.4, 0.8], [L * 0.2, 1.34], [-L * 0.42, 1.34], [-L * 0.62, 0.82]]); // the glasshouse
    prism(group, paint, w * 0.88, [[-L * 0.28, 1.34], [-L * 0.42, 1.34], [-L * 0.62, 0.82], [-L * 0.42, 0.82]]); // its thick rear pillars
    box(group, ivory, w * 0.9, 0.07, L * 0.66, 0, 1.375, -L * 0.11);                      // the roof, in ivory
    slab(group, glass, w * 0.7, 0.03, 0.4, 0, 1.09, -L * 0.525, -1.2);                    // the rear window, between the pillars
    for (const side of [-1, 1]) {
      prism(group, paint, 0.1, [[-L * 0.4, 0.82], [-L * 1.02, 0.97], [-L * 1.02, 0.8]], side * (w / 2 - 0.05)); // the little fins
      box(group, TAIL, 0.1, 0.2, 0.04, side * (w / 2 - 0.06), 0.84, -L * 1.02 - 0.01);
      box(group, paint, 0.07, 0.5, 0.09, side * w * 0.43, 1.08, -L * 0.02);               // the door pillars
      disc(group, LAMP, 0.11, 0.08, side * w * 0.35, 0.6, L + 0.01);                      // round lamps
      disc(group, chrome, 0.135, 0.05, side * w * 0.35, 0.6, L);
      box(group, AMBER, 0.1, 0.05, 0.04, side * w * 0.35, 0.44, L + 0.02);
      wheel(group, R, 0.17, side * (w / 2 - 0.05), R, L * 0.62);
      wheel(group, R, 0.17, side * (w / 2 - 0.05), R, -L * 0.6);
    }
    box(group, trim, w * 0.42, 0.13, 0.04, 0, 0.58, L + 0.02);                            // a plain slot of a grille,
    box(group, chrome, w * 0.44, 0.025, 0.05, 0, 0.58, L + 0.025);                        // a bar across it
    box(group, chrome, w + 0.02, 0.06, 0.07, 0, 0.36, L + 0.03);                          // thin bumpers
    box(group, chrome, w + 0.02, 0.06, 0.07, 0, 0.36, -L - 0.03);
    // the exhaust's smoke: three puffs, each growing and thinning as it drifts back
    tube(group, trim, 0.035, 0.2, -w * 0.3, 0.27, -L - 0.02, 'z');
    const puffs = [0, 1, 2].map(() => {
      const puff = new THREE.Mesh(BALL, new THREE.MeshBasicMaterial({ color: 0x9fb2d6, transparent: true, opacity: 0.5, depthWrite: false }));
      group.add(puff);
      return puff;
    });
    group.userData = {
      body,
      animate: (t) => puffs.forEach((puff, i) => {
        const p = (t * 0.55 + i / 3) % 1;
        puff.position.set(-w * 0.3 + Math.sin(i * 2.1 + p * 3) * 0.06, 0.3 + p * 0.5, -L - 0.15 - p * 0.9);
        puff.scale.setScalar(0.08 + p * 0.22);
        puff.material.opacity = 0.55 * (1 - p);
      }),
    };
    group.userData.animate(0);
    return group;
  },

  // A brick of an estate (a Volvo 240): square everything. A long flat bonnet, an upright grille with a
  // slash across it between square lamps, a long flat roof running to an upright tailgate, tall tail lamps,
  // big black bumpers and roof rails. It sits still
  brickestate: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.33;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM);
    const body = box(group, paint, w, 0.5, L * 1.98, 0, 0.6, 0);
    box(group, paint, w * 0.97, 0.06, L * 0.64, 0, 0.87, L * 0.66);                       // the flat bonnet
    box(group, glass, w * 0.9, 0.5, L * 1.3, 0, 1.1, -L * 0.33);                          // the long glasshouse
    box(group, paint, w * 0.92, 0.07, L * 1.32, 0, 1.385, -L * 0.33);                     // and the long flat roof
    screen(group, glass, w * 0.88, 0.05, 0.6, 0, 1.1, L * 0.36, 0.62);                    // the windscreen
    box(group, paint, w * 0.92, 0.2, 0.06, 0, 0.95, -L * 0.98);                           // the tailgate, under its window
    for (const side of [-1, 1]) {
      for (const z of [0.3, 0.02, -0.36, -0.95]) box(group, paint, 0.08, 0.5, 0.1, side * w * 0.45, 1.1, L * z); // pillars
      box(group, trim, 0.05, 0.05, L * 1.1, side * w * 0.4, 1.45, -L * 0.33);             // roof rails
      box(group, trim, 0.02, 0.07, L * 1.8, side * (w / 2 + 0.01), 0.6, 0);               // rubbing strips
      for (const x of [0.3, 0.42]) box(group, LAMP, w * 0.11, 0.15, 0.04, side * w * x, 0.7, L + 0.0); // square lamps, two a side
      box(group, AMBER, w * 0.05, 0.15, 0.1, side * w * 0.485, 0.7, L - 0.04);
      box(group, TAIL, 0.14, 0.44, 0.05, side * w * 0.43, 0.74, -L + 0.01);               // tall tail lamps
      box(group, trim, 0.1, 0.1, 0.12, side * (w / 2 + 0.05), 0.95, L * 0.3);             // mirrors
      wheel(group, R, 0.22, side * (w / 2 - 0.04), R, L * 0.62);
      wheel(group, R, 0.22, side * (w / 2 - 0.04), R, -L * 0.58);
    }
    box(group, chrome, w * 0.5, 0.28, 0.03, 0, 0.7, L - 0.005);                           // the grille's frame,
    box(group, trim, w * 0.46, 0.24, 0.04, 0, 0.7, L);                                    // the grille,
    box(group, chrome, w * 0.5, 0.025, 0.03, 0, 0.7, L + 0.015).rotation.z = 0.5;         // and the slash across it
    box(group, trim, w + 0.1, 0.2, 0.26, 0, 0.44, L + 0.02);                              // big black bumpers
    box(group, trim, w + 0.1, 0.2, 0.26, 0, 0.44, -L - 0.02);
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A woody wagon (a 1949 Ford): a rounded bonnet with a chrome spinner in its grille, a long wagon body
  // framed and panelled in timber, a split windscreen, whitewall tyres, and a surfboard on the roof. It sits still
  woody: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.36;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM);
    const maple = lambert(0xd9a85c), mahogany = lambert(0x7a4a24);
    const body = curved(group, paint, w, rounded([[-L * 0.98, 0.38], [L * 0.97, 0.38], [L * 0.97, 0.84], [L * 0.3, 0.9], [-L * 0.98, 0.9]], 0.12), 0.05);
    curved(group, paint, w * 0.7, rounded([[L * 0.26, 0.8], [L * 0.26, 1.03], [L * 0.86, 0.99], [L * 0.99, 0.74]], 0.1), 0.05); // the bonnet's hump
    box(group, glass, w * 0.88, 0.48, L * 1.2, 0, 1.19, -L * 0.38);                       // the wagon's glasshouse
    curved(group, paint, w * 0.92, rounded([[-L * 0.99, 1.42], [L * 0.24, 1.42], [L * 0.2, 1.5], [-L * 0.97, 1.5]], 0.03), 0.04); // its roof
    screen(group, glass, w * 0.84, 0.05, 0.6, 0, 1.18, L * 0.27, 0.62);                   // the windscreen,
    slab(group, paint, 0.06, 0.06, 0.62, 0, 1.19, L * 0.27 + 0.01, 0.62);                 // split down the middle
    for (const side of [-1, 1]) {
      const x = side * (w / 2 + 0.012);
      box(group, maple, 0.04, 0.5, L * 1.18, x, 0.66, -L * 0.39);                         // the timber: a maple frame,
      for (const z of [0.0, -0.39, -0.78]) box(group, mahogany, 0.05, 0.36, L * 0.32, x + side * 0.003, 0.66, L * z); // mahogany panels in it
      for (const z of [0.2, -0.19, -0.58, -0.96]) box(group, maple, 0.08, 0.5, 0.11, side * w * 0.445, 1.19, L * z); // and maple pillars
      box(group, maple, 0.05, 0.07, L * 1.2, side * w * 0.45, 1.4, -L * 0.38);
      disc(group, LAMP, 0.12, 0.08, side * w * 0.38, 0.72, L + 0.02);                     // round lamps
      disc(group, chrome, 0.145, 0.05, side * w * 0.38, 0.72, L + 0.01);
      disc(group, TAIL, 0.07, 0.06, side * w * 0.42, 0.7, -L - 0.03);
      whitewall(group, R, 0.24, side * (w / 2 - 0.03), R, L * 0.6, lambert(CHROME));
      whitewall(group, R, 0.24, side * (w / 2 - 0.03), R, -L * 0.6, lambert(CHROME));
    }
    box(group, maple, w * 0.9, 0.5, 0.04, 0, 0.68, -L - 0.035);                           // the timber tailgate
    box(group, mahogany, w * 0.78, 0.36, 0.05, 0, 0.68, -L - 0.04);
    box(group, trim, w * 0.74, 0.2, 0.04, 0, 0.56, L + 0.03);                             // the grille's mouth,
    box(group, chrome, w * 0.8, 0.06, 0.07, 0, 0.56, L + 0.05);                           // the bar across it,
    disc(group, chrome, 0.11, 0.2, 0, 0.56, L + 0.07);                                    // and the spinner in its middle
    box(group, chrome, w + 0.1, 0.13, 0.14, 0, 0.4, L + 0.12);                            // chrome bumpers
    box(group, chrome, w + 0.1, 0.13, 0.14, 0, 0.4, -L - 0.12);
    for (const z of [-0.1, -0.66]) box(group, chrome, w * 0.86, 0.04, 0.06, 0, 1.56, L * z); // the roof bars,
    blob(group, lambert(0xf3e6c0), 0.3, 0.045, L * 0.56, w * 0.14, 1.62, -L * 0.36);      // and the surfboard on them,
    box(group, lambert(0xd8402f), 0.07, 0.02, L * 0.9, w * 0.14, 1.66, -L * 0.36);        // a stripe down it
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A stately saloon (a Rolls-Royce Silver Shadow): upright and formal, a tall chrome temple of a grille
  // standing above the bonnet with a mascot on it, twin round lamps each side, chrome bumpers with
  // overriders, and two shades of paint: the flanks in the livery, everything above the waist in a second
  // colour (silver on a Good one, black on an Evil one). It sits still
  stately: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.36;
    const paint = lambert(car.color), upper = lambert(0xc9ccd1), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM);
    const body = box(group, paint, w, 0.52, L * 1.98, 0, 0.62, 0);
    box(group, upper, w * 0.94, 0.07, L * 0.66, 0, 0.915, L * 0.64);                      // the long bonnet,
    box(group, upper, w * 0.94, 0.07, L * 0.44, 0, 0.915, -L * 0.76);                     // and the boot
    box(group, glass, w * 0.86, 0.5, L * 0.86, 0, 1.17, -L * 0.1);                        // the glasshouse
    box(group, upper, w * 0.88, 0.08, L * 0.86, 0, 1.46, -L * 0.1);                       // its roof
    screen(group, glass, w * 0.84, 0.05, 0.58, 0, 1.16, L * 0.36, 0.55);                  // the windscreen
    screen(group, glass, w * 0.82, 0.05, 0.56, 0, 1.16, -L * 0.56, -0.6);                 // the rear window
    for (const side of [-1, 1]) {
      for (const z of [0.3, -0.1]) box(group, upper, 0.08, 0.5, 0.1, side * w * 0.43, 1.17, L * z); // pillars,
      box(group, upper, 0.08, 0.5, L * 0.16, side * w * 0.43, 1.17, -L * 0.46);           // a broad one at the back
      box(group, chrome, 0.02, 0.035, L * 1.9, side * (w / 2 + 0.01), 0.86, 0);           // a chrome line along the waist,
      box(group, chrome, 0.02, 0.05, L * 1.1, side * (w / 2 + 0.01), 0.4, 0);             // and one along the sill
      box(group, chrome, w * 0.3, 0.2, 0.03, side * w * 0.33, 0.72, L - 0.005);           // the lamps' chrome panel,
      for (const x of [0.26, 0.4]) disc(group, LAMP, 0.085, 0.06, side * w * x, 0.72, L + 0.01); // twin round lamps
      box(group, TAIL, 0.12, 0.3, 0.04, side * w * 0.42, 0.7, -L + 0.0);
      for (const z of [1, -1]) box(group, chrome, 0.08, 0.22, 0.1, side * w * 0.2, 0.47, z * (L + 0.1)); // overriders
      box(group, chrome, 0.1, 0.07, 0.1, side * (w / 2 + 0.05), 0.98, L * 0.32);          // mirrors
      wheel(group, R, 0.24, side * (w / 2 - 0.04), R, L * 0.62, lambert(CHROME));
      wheel(group, R, 0.24, side * (w / 2 - 0.04), R, -L * 0.6, lambert(CHROME));
    }
    box(group, chrome, w * 0.3, 0.54, 0.12, 0, 0.77, L + 0.0);                            // the grille: tall, upright,
    for (let i = -3; i <= 3; i++) box(group, trim, 0.015, 0.44, 0.02, i * w * 0.036, 0.76, L + 0.06); // its slats,
    box(group, chrome, w * 0.33, 0.05, 0.16, 0, 1.06, L + 0.0);                           // a pediment on top,
    box(group, chrome, 0.04, 0.13, 0.04, 0, 1.15, L + 0.03);                              // and the mascot on that,
    box(group, chrome, 0.16, 0.03, 0.03, 0, 1.19, L + 0.0);                               // her wings out
    box(group, chrome, w + 0.1, 0.12, 0.14, 0, 0.44, L + 0.05);                           // chrome bumpers
    box(group, chrome, w + 0.1, 0.12, 0.14, 0, 0.44, -L - 0.05);
    group.userData = { body, animate: () => {}, livery: (evil) => upper.color.setHex(evil ? 0x16161a : 0xc9ccd1) };
    return group;
  },

  // A stretch limo (a Lincoln Town Car, stretched): as long as two cars, a row of dark windows down each
  // side with a blank panel behind the driver, an upright chrome grille between square lamps, a red bar
  // across the tail, whitewall tyres, and a boomerang of an aerial on the boot. It sits still
  limo: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.36;
    const paint = lambert(car.color), tint = lambert(0x0d0f14), chrome = lambert(CHROME), trim = lambert(TRIM);
    const body = box(group, paint, w, 0.5, L * 1.99, 0, 0.6, 0);
    box(group, paint, w * 0.95, 0.06, L * 0.36, 0, 0.87, L * 0.8);                        // the bonnet,
    box(group, paint, w * 0.95, 0.06, L * 0.24, 0, 0.87, -L * 0.86);                      // and the boot
    box(group, tint, w * 0.88, 0.46, L * 1.32, 0, 1.1, -L * 0.06);                        // the long glasshouse, blacked out
    box(group, paint, w * 0.9, 0.08, L * 1.3, 0, 1.37, -L * 0.06);                        // its roof
    screen(group, tint, w * 0.86, 0.05, 0.56, 0, 1.09, L * 0.62, 0.55);                   // the windscreen
    screen(group, tint, w * 0.84, 0.05, 0.5, 0, 1.09, -L * 0.74, -0.6);                   // the rear window
    for (const side of [-1, 1]) {
      const x = side * w * 0.44;
      for (const z of [0.57, 0.36, -0.06, -0.28, -0.5]) box(group, paint, 0.06, 0.46, 0.1, x, 1.1, L * z); // a pillar between each window,
      box(group, paint, 0.06, 0.46, L * 0.18, x, 1.1, L * 0.22);                          // the blank panel behind the driver,
      box(group, LAMP, 0.03, 0.14, 0.08, x + side * 0.03, 1.12, L * 0.22);                // a coach lamp on it,
      box(group, paint, 0.06, 0.46, L * 0.12, x, 1.1, -L * 0.67);                         // and a broad pillar at the back
      box(group, chrome, 0.02, 0.05, L * 1.94, side * (w / 2 + 0.01), 0.62, 0);           // chrome strips
      box(group, chrome, 0.02, 0.04, L * 1.4, side * (w / 2 + 0.01), 0.37, 0);
      for (const k of [0.27, 0.41]) box(group, LAMP, w * 0.12, 0.11, 0.04, side * w * k, 0.7, L + 0.0); // square lamps, two a side
      whitewall(group, R, 0.26, side * (w / 2 - 0.04), R, L * 0.76, lambert(CHROME));
      whitewall(group, R, 0.26, side * (w / 2 - 0.04), R, -L * 0.72, lambert(CHROME));
      box(group, chrome, 0.26, 0.025, 0.05, side * 0.11, 1.03, -L * 0.86).rotation.y = side * 0.5; // the boomerang aerial's arms,
    }
    box(group, chrome, 0.03, 0.14, 0.03, 0, 0.96, -L * 0.86);                             // on its post
    box(group, chrome, w * 0.34, 0.3, 0.06, 0, 0.7, L + 0.0);                             // the upright grille,
    for (let i = -4; i <= 4; i++) box(group, trim, 0.012, 0.24, 0.02, i * w * 0.034, 0.7, L + 0.03); // its bars
    box(group, TAIL, w * 0.92, 0.12, 0.04, 0, 0.72, -L + 0.0);                            // a red bar across the tail
    box(group, chrome, w + 0.12, 0.16, 0.16, 0, 0.42, L + 0.04);                          // chrome bumpers
    box(group, chrome, w + 0.12, 0.16, 0.16, 0, 0.42, -L - 0.04);
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A milk float (a Smith's or a Wales & Edwards electric): a flat-fronted cab with a big windscreen, and behind
  // it an open deck under a roof on posts, stacked with crates of bottles, on tiny wheels. The crates rattle
  milkfloat: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.22, deck = 0.64;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), chrome = lambert(CHROME);
    box(group, trim, w * 0.8, 0.14, L * 1.9, 0, 0.36, 0);                                 // the chassis, and its batteries
    box(group, trim, w * 0.98, 0.2, L * 0.6, 0, 0.3, -L * 0.05);
    const body = box(group, paint, w, 0.22, L * 2, 0, deck - 0.11, 0);                    // the deck's skirt
    const cabZ = L * 0.74, cabL = L * 0.52;
    box(group, paint, w, 0.5, cabL, 0, deck + 0.25, cabZ);                                // the cab, flat-fronted,
    box(group, glass, w * 0.94, 0.68, cabL - 0.06, 0, deck + 0.84, cabZ);                 // glass all round above the waist
    box(group, WHITE, w * 0.92, 0.1, 0.03, 0, deck + 0.3, L + 0.005);                     // a white band across its front
    box(group, WHITE, w * 1.04, 0.09, L * 2.04, 0, deck + 1.225, 0);                      // the roof, over cab and deck alike
    box(group, paint, w * 0.8, 0.16, 0.06, 0, deck + 1.35, L * 0.94);                     // a headboard on it
    for (const side of [-1, 1]) {
      for (const z of [L - 0.04, cabZ - cabL / 2 + 0.04]) box(group, paint, 0.08, 0.7, 0.08, side * w * 0.46, deck + 0.84, z); // the cab's posts
      for (const z of [-L + 0.05, -L * 0.24]) box(group, WHITE, 0.06, 1.2, 0.06, side * w * 0.47, deck + 0.6, z); // the roof's posts
      disc(group, LAMP, 0.09, 0.06, side * w * 0.3, deck + 0.12, L + 0.02);
      box(group, TAIL, 0.1, 0.1, 0.04, side * w * 0.4, deck - 0.1, -L - 0.01);
      wheel(group, R, 0.16, side * (w / 2 - 0.08), R, L * 0.6);                           // tiny wheels
      wheel(group, R, 0.16, side * (w / 2 - 0.08), R, -L * 0.55);
    }
    box(group, chrome, w * 0.9, 0.07, 0.06, 0, deck - 0.16, L + 0.03);                    // a bumper bar
    // the crates: six stacks, two abreast, each crate with its bottles' tops showing
    const crate = new THREE.BoxGeometry(w * 0.4, 0.24, 0.6), tops = new THREE.BoxGeometry(w * 0.33, 0.07, 0.5);
    const colours = [lambert(0xc0392b), lambert(0x2e6bb3), lambert(0x7d8790)], silver = lambert(0xe9edf2);
    const stacks = [];
    for (let i = 0; i < 3; i++) for (const side of [-1, 1]) {
      const stack = new THREE.Group();
      stack.position.set(side * w * 0.22, deck, -L * 0.72 + i * 0.68);
      group.add(stack);
      stacks.push(stack);
      const high = 2 + (i + (side > 0 ? 1 : 0)) % 2;
      for (let k = 0; k < high; k++) {
        const one = new THREE.Mesh(crate, colours[(i + k + (side > 0 ? 1 : 0)) % 3]);
        one.position.y = 0.13 + k * 0.3;
        const caps = new THREE.Mesh(tops, silver);
        caps.position.y = 0.26 + k * 0.3;
        stack.add(one, caps);
      }
    }
    group.userData = {
      body,
      animate: (t) => stacks.forEach((stack, i) => {
        stack.position.y = deck + Math.abs(Math.sin(t * 9 + i * 1.7)) * 0.012;
        stack.rotation.z = Math.sin(t * 13 + i * 2.3) * 0.012;
      }),
    };
    return group;
  },
};
