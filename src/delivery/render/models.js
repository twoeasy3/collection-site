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
// a solid block whose side view is the polygon `profile` ([z, y] points), `w` wide across the car
const prism = (parent, material, w, profile, x = 0) => {
  const shape = new THREE.Shape(profile.map(([z, y]) => new THREE.Vector2(z, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
  geo.rotateY(-Math.PI / 2); // (the profile's z along the car; extruded across it)
  geo.translate(x + w / 2, 0, 0);
  const mesh = new THREE.Mesh(geo, material);
  parent.add(mesh);
  return mesh;
};
// a windscreen (or a rear window), as `slab` tips it, made solid: the wedge under the glass, from its
// lower edge back (or forward) to beneath its upper edge, filled in, so there is no seeing through
// the car's sides past it
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
const GLASS = 0x232a35, CHROME = 0xd8d8d8, TRIM = 0x2a2c31;
// an F1 car's second colour, by its paint number (see Traffic: paint)
export const F1_ACCENTS = [0xf4f4f4, 0x151515, 0xf2d21f, 0x1d4f9c, 0x18a35a, 0xe0701e, 0xc81f3a, 0x6fd0ff];
const LAMP = new THREE.MeshBasicMaterial({ color: 0xfff3c4 }), TAIL = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
// where an ambulance's box body starts, ahead of its middle, as a share of its half length (its light
// bar sits on the front of the box's roof: render/cars.js)
export const AMBULANCE_BOX = 0.36;

export const MODELS = {
  // A Formula 1 car: a long, low nose and monocoque in the livery, sidepods, the engine cover with
  // its fin, the halo over the cockpit, big front and rear wings in a second colour, four fat
  // tyres standing clear of the body. userData.accent(n) picks the second colour.
  f1: (car) => {
    const group = new THREE.Group();
    const l = car.hl * 2, paint = lambert(car.color), accent = lambert(0xf4f4f4), carbon = lambert(0x1b1b1e);
    const body = box(group, paint, 0.75, 0.42, l * 0.62, 0, 0.42, -l * 0.02);                   // monocoque
    box(group, paint, 0.4, 0.28, l * 0.3, 0, 0.36, l * 0.36);                                     // the nose
    for (const side of [-1, 1]) box(group, paint, 0.42, 0.36, l * 0.3, side * 0.55, 0.38, -l * 0.05); // sidepods
    box(group, paint, 0.5, 0.42, l * 0.28, 0, 0.72, -l * 0.18);                                   // engine cover...
    box(group, accent, 0.05, 0.36, l * 0.24, 0, 1.0, -l * 0.24);                                  // ...and its fin
    box(group, carbon, 0.42, 0.16, 0.5, 0, 0.72, l * 0.06);                                       // the cockpit
    box(group, lambert(0xf2d21f), 0.24, 0.24, 0.24, 0, 0.82, l * 0.02);                           // a helmet
    // the halo: a hoop round the cockpit, its two arms running from the engine cover behind the driver's
    // shoulders forward to a point ahead of the helmet, held up there by a pillar down to the monocoque
    const haloY = 0.99, back = -l * 0.045, tip = l * 0.125, arm = 0.25;
    for (const side of [-1, 1]) {
      const rail = box(group, carbon, 0.07, 0.07, Math.hypot(arm, tip - back) + 0.04, side * arm / 2, haloY, (back + tip) / 2);
      rail.rotation.y = Math.atan2(-side * arm, tip - back);
      box(group, carbon, 0.09, haloY - 0.9, 0.12, side * arm, (haloY + 0.9) / 2, back);        // (its mounts on the cover)
    }
    const foot = tip + 0.2, deck = 0.63; // (where the pillar meets the monocoque's top)
    slab(group, carbon, 0.07, 0.07, Math.hypot(foot - tip, haloY - deck) + 0.06, 0, (haloY + deck) / 2, (tip + foot) / 2, Math.atan2(haloY - deck, foot - tip));
    box(group, accent, 1.9, 0.05, 0.45, 0, 0.12, l * 0.5);                                         // front wing
    for (const side of [-1, 1]) box(group, accent, 0.05, 0.22, 0.5, side * 0.95, 0.2, l * 0.5);
    box(group, accent, 1.2, 0.08, 0.42, 0, 1.05, -l * 0.47);                                       // rear wing...
    for (const side of [-1, 1]) box(group, carbon, 0.05, 0.6, 0.45, side * 0.6, 0.8, -l * 0.47);  // ...on its end plates
    const wheels = [];
    for (const [z, r, w] of [[l * 0.33, 0.33, 0.36], [-l * 0.33, 0.37, 0.44]]) {
      for (const side of [-1, 1]) wheels.push(...wheel(group, r, w, side * 0.78, r, z, lambert(0x8a8f96)));
    }
    group.userData = {
      body,
      animate: (t) => { for (const w of wheels) w.rotation.x = t * 30; },
      accent: (n) => accent.color.setHex(F1_ACCENTS[n % F1_ACCENTS.length]),
    };
    return group;
  },
  // A Le Mans prototype: low and wide, its wheels shut in under four pontoon wings joined by the sidepods, a
  // narrow tub between them with a glass bubble of a cockpit, the engine cover running back from it under a
  // shark fin to a wing right across the tail; lamps in the front wings' noses. In the livery, with a second
  // colour (userData.accent(n), as an F1 car's) on its fin, wing, nose and mirrors.
  lmp: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.34;
    const paint = lambert(car.color), accent = lambert(0xf4f4f4), carbon = lambert(0x1b1b1e), glass = lambert(GLASS);
    const body = prism(group, paint, w * 0.52, [[-L, 0.2], [L * 0.98, 0.2], [L, 0.32], [L * 0.42, 0.56], [-L * 0.9, 0.66], [-L, 0.5]]); // the tub
    prism(group, glass, w * 0.4, [[L * 0.42, 0.55], [L * 0.14, 0.98], [-L * 0.1, 1.0], [-L * 0.16, 0.6]]);             // the cockpit's bubble
    box(group, paint, w * 0.3, 0.04, L * 0.24, 0, 1.01, L * 0.02);                                                     // its roof
    prism(group, paint, w * 0.34, [[-L * 0.1, 1.0], [-L * 0.84, 0.7], [-L * 0.84, 0.6], [-L * 0.1, 0.6]]);             // the engine cover
    prism(group, accent, 0.05, [[-L * 0.14, 1.0], [-L * 0.2, 1.2], [-L * 0.86, 1.2], [-L * 0.86, 0.7]]);               // the shark fin
    box(group, carbon, 0.16, 0.14, 0.3, 0, 1.1, -L * 0.02);                                                            // the roof's air intake
    slab(group, accent, w * 0.2, 0.02, L * 0.5, 0, 0.455, L * 0.7, Math.atan2(0.24, L * 0.58));                        // a stripe down the nose
    const wheels = [];
    for (const side of [-1, 1]) {
      const x = side * (w / 2 - 0.26);
      prism(group, paint, 0.5, [[L, 0.2], [L, 0.42], [L * 0.76, 0.78], [L * 0.42, 0.78], [L * 0.3, 0.5], [L * 0.3, 0.2]], x);       // the front wing over its wheel,
      prism(group, paint, 0.5, [[-L * 0.3, 0.2], [-L * 0.3, 0.5], [-L * 0.42, 0.84], [-L * 0.92, 0.84], [-L, 0.62], [-L, 0.2]], x); // the rear one,
      box(group, paint, 0.42, 0.3, L * 0.62, x, 0.37, 0);                                                              // and the sidepod between
      box(group, carbon, 0.3, 0.16, 0.05, x, 0.42, L * 0.3 - 0.02);                                                    // (its radiator's mouth)
      slab(group, LAMP, 0.34, 0.03, 0.26, x, 0.56, L * 0.9, Math.atan2(0.36, L * 0.24));                               // lamps in the wing's nose
      box(group, TAIL, 0.06, 0.34, 0.05, side * (w / 2 - 0.08), 0.56, -L - 0.01);                                      // tall thin tail lamps
      box(group, accent, 0.16, 0.08, 0.12, side * w * 0.27, 0.82, L * 0.3);                                            // mirrors
      box(group, carbon, 0.05, 0.5, 0.5, side * (w / 2 - 0.04), 1.02, -L + 0.1);                                       // the wing's end plates
      wheels.push(...wheel(group, R, 0.3, side * (w / 2 - 0.13), R, L * 0.6, lambert(0x8a8f96)));
      wheels.push(...wheel(group, R + 0.02, 0.32, side * (w / 2 - 0.13), R + 0.02, -L * 0.62, lambert(0x8a8f96)));
    }
    box(group, accent, w - 0.08, 0.06, 0.42, 0, 1.22, -L + 0.1);                                                       // the rear wing
    box(group, carbon, w * 0.98, 0.05, 0.3, 0, 0.2, L - 0.05);                                                         // the splitter
    box(group, carbon, w * 0.5, 0.18, 0.2, 0, 0.3, -L + 0.02);                                                         // the diffuser
    group.userData = {
      body,
      animate: (t) => { for (const wh of wheels) wh.rotation.x = t * 30; },
      accent: (n) => accent.color.setHex(F1_ACCENTS[n % F1_ACCENTS.length]),
    };
    return group;
  },
  // A GT road car, raced: one of three shapes, by its paint number (userData.style(n)): a
  // front-engined grand tourer (a long bonnet, the cabin set back, a fastback), a rear-engined
  // coupe (a short sloping nose, the roof running down to the tail, a whale tail) or a mid-engined
  // wedge (a low nose, the cabin forward, a louvred engine deck behind it, intakes in its flanks).
  // Each is a side profile in the livery, a glasshouse on it, a white roundel on each door, a
  // splitter, a diffuser, lamps, and big wheels in dark alloys.
  gt: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.36; // (L: half its length; the profiles are drawn for 2.3, and scaled)
    const paint = lambert(car.color), glass = lambert(GLASS), dark = lambert(0x16171a), white = lambert(0xf4f4f4);
    const alloy = lambert(0x3a3d44);
    const k = L / 2.3, at = (pts) => pts.map(([z, y]) => [z * k, y]);
    const styles = [], wheels = [];
    const SHAPES = [
      { // front-engined grand tourer
        body: [[-2.3, 0.3], [2.3, 0.3], [2.33, 0.55], [2.2, 0.72], [0.5, 0.82], [-1.6, 0.86], [-2.3, 0.8], [-2.33, 0.45]],
        glass: [[0.52, 0.8], [-0.2, 1.2], [-0.95, 1.22], [-1.95, 0.84], [-1.95, 0.8]],
        roof: [-0.2, -0.95, 1.2], lamps: 0.62, tails: 0.7, stripes: true,
      },
      { // rear-engined coupe
        body: [[-2.3, 0.32], [2.3, 0.32], [2.33, 0.52], [2.05, 0.7], [0.9, 0.8], [0.55, 0.84], [-1.7, 0.86], [-2.3, 0.68], [-2.33, 0.42]],
        glass: [[0.6, 0.82], [0.0, 1.24], [-0.7, 1.26], [-2.0, 0.84], [-2.0, 0.8]],
        roof: [0.0, -0.7, 1.24], lamps: 0.64, tails: 0.62, whale: true, blackRoof: true,
      },
      { // mid-engined wedge
        body: [[-2.3, 0.3], [2.3, 0.3], [2.34, 0.44], [1.0, 0.68], [-1.1, 0.84], [-2.3, 0.84], [-2.33, 0.4]],
        glass: [[1.05, 0.66], [0.25, 1.06], [-0.45, 1.08], [-1.05, 0.9], [-1.05, 0.78]],
        roof: [0.25, -0.45, 1.06], lamps: 0.5, tails: 0.66, louvres: true, wing: true,
      },
    ];
    let body = null;
    for (const S of SHAPES) {
      const g = new THREE.Group();
      group.add(g);
      styles.push(g);
      const shell = prism(g, paint, w, at(S.body));
      body ||= shell;
      // the glasshouse: the windscreen and side windows up to the back of the roof; behind it the
      // fastback (or the engine cover's buttresses) in the livery, a rear window set into it
      const [r0, r1, ry] = S.roof, [tz, ty] = S.glass[S.glass.length - 2], base = S.glass[S.glass.length - 1][1];
      prism(g, glass, w * 0.78, at([...S.glass.slice(0, 3), [r1, base]]));
      prism(g, paint, w * 0.8, at([[r1, ry], [tz, ty], [tz, base], [r1, base]]));
      box(g, paint, w * 0.8, 0.05, (r0 - r1) * k, 0, ry + 0.02, (r0 + r1) / 2 * k); // (the roof)
      const run = (r1 - tz) * k, rise = ry - ty;
      slab(g, glass, w * 0.56, 0.03, Math.hypot(run, rise) * 0.78, 0, (ry + ty) / 2 + 0.02, (r1 + tz) / 2 * k, -Math.atan2(rise, run));
      box(g, dark, w * 0.92, 0.07, 0.3, 0, 0.3, L - 0.1);                          // splitter
      box(g, dark, w * 0.84, 0.16, 0.25, 0, 0.36, -L + 0.08);                       // diffuser
      box(g, dark, w * 1.01, 0.1, L * 1.1, 0, 0.38, 0);                             // sills
      // (told apart at a glance, from behind and above: the tourer's twin white stripes nose to tail, the
      // coupe's black roof, wide hips and whale tail, the wedge's black engine deck and tall full-width wing)
      if (S.stripes) {
        for (const side of [-1, 1]) {
          const x = side * w * 0.13, sw = w * 0.13;
          slab(g, white, sw, 0.02, 1.72 * k, x, 0.785, 1.35 * k, Math.atan2(0.1, 1.7 * k)); // down the bonnet,
          box(g, white, sw, 0.02, (r0 - r1) * k, x, ry + 0.055, (r0 + r1) / 2 * k);          // over the roof,
          box(g, white, sw, 0.02, 0.72 * k, x, 0.85, -1.95 * k);                             // and across the boot
        }
        box(g, paint, w * 0.9, 0.07, 0.16, 0, 0.88, -L + 0.06);                              // a ducktail
      }
      if (S.blackRoof) box(g, dark, w * 0.74, 0.03, (r0 - r1) * k + 0.1, 0, ry + 0.055, (r0 + r1) / 2 * k);
      if (S.whale) { // a whale tail on the engine lid, and the wide hips over the rear wheels
        box(g, paint, w * 0.98, 0.07, 0.5, 0, 1.0, -L * 0.83);
        box(g, dark, w * 0.98, 0.04, 0.1, 0, 1.03, -L * 0.83 - 0.24);
        for (const side of [-1, 1]) {
          box(g, dark, 0.05, 0.14, 0.3, side * w * 0.3, 0.92, -L * 0.83);
          box(g, paint, 0.14, 0.34, L * 0.62, side * (w / 2 + 0.03), 0.62, -L * 0.6);
        }
      }
      if (S.wing) { // a black engine deck, and a tall wing right across the tail between end plates
        box(g, dark, w * 0.72, 0.03, 1.15 * k, 0, 0.855, -1.7 * k);
        box(g, dark, w * 1.04, 0.05, 0.4, 0, 1.24, -L + 0.12);
        for (const side of [-1, 1]) {
          box(g, paint, 0.05, 0.46, 0.5, side * w * 0.52, 1.08, -L + 0.12);
          box(g, dark, 0.06, 0.38, 0.1, side * w * 0.26, 1.04, -L + 0.14);
        }
        box(g, dark, w * 0.3, 0.1, 0.5 * k, 0, 1.12, -0.1 * k);                              // a roof scoop
      }
      if (S.louvres) { // the engine deck's louvres, and intakes in its flanks
        for (let i = 0; i < 4; i++) box(g, dark, w * 0.56, 0.03, 0.08, 0, 0.86, -L * (0.55 + i * 0.09));
        for (const side of [-1, 1]) box(g, dark, 0.04, 0.2, 0.55, side * (w / 2 + 0.005), 0.62, -L * 0.3);
        box(g, paint, w * 0.9, 0.04, 0.2, 0, 0.9, -L * 0.95);                       // a lip spoiler
      }
      for (const side of [-1, 1]) {
        // lamps of its own: the tourer's wide oblong headlamps and twin round tail lamps a side; the coupe's
        // round headlamps and one red bar right across its tail; the wedge's thin slits of headlamps and tall
        // red blades at the corners of its tail
        if (S.stripes) {
          box(g, LAMP, w * 0.26, 0.1, 0.08, side * w * 0.32, S.lamps, L + 0.02);
          for (const x of [0.2, 0.38]) disc(g, TAIL, 0.085, 0.08, side * w * x, S.tails, -L - 0.02);
        } else if (S.whale) {
          disc(g, LAMP, 0.11, 0.08, side * w * 0.34, S.lamps, L - 0.04);
          disc(g, dark, 0.14, 0.06, side * w * 0.34, S.lamps, L - 0.06);
          if (side > 0) box(g, TAIL, w * 0.94, 0.06, 0.08, 0, S.tails, -L - 0.02);
        } else {
          box(g, LAMP, w * 0.3, 0.035, 0.08, side * w * 0.3, 0.45, L + 0.03);
          box(g, TAIL, 0.07, 0.22, 0.08, side * w * 0.44, S.tails, -L - 0.02);
          box(g, TAIL, 0.07, 0.22, 0.08, side * w * 0.34, S.tails, -L - 0.02);
        }
        const roundel = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.02, 16), white); // (its race number's disc)
        roundel.rotation.z = Math.PI / 2;
        roundel.position.set(side * (w / 2 + 0.01), 0.6, -L * 0.05);
        g.add(roundel);
      }
    }
    for (const z of [L * 0.62, -L * 0.62]) {
      for (const side of [-1, 1]) wheels.push(...wheel(group, R, 0.3, side * (w / 2 - 0.02), R, z, alloy));
    }
    group.userData = {
      body,
      animate: (t) => { for (const wh of wheels) wh.rotation.x = t * 30; },
      style: (n) => styles.forEach((g, i) => { g.visible = i === n % styles.length; }),
    };
    group.userData.style(0);
    return group;
  },
  // A drive-by car (The Hood): a long, low 80s sedan in deep plum, blacked-out windows all round, chrome
  // bumpers and a chrome strip down each side, gold wire wheels with whitewalls; firing, a gun barrel pokes
  // out of each rear window (userData.firing(on))
  driveby: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.36;
    const paint = lambert(car.color), tint = lambert(0x0b0b10), chrome = lambert(CHROME), white = lambert(0xf1f1ee);
    const body = box(group, paint, w, 0.5, l, 0, 0.6, 0);
    box(group, paint, w * 0.96, 0.08, l * 0.32, 0, 0.88, l * 0.32);                // the long bonnet
    box(group, paint, w * 0.96, 0.08, l * 0.22, 0, 0.88, -l * 0.38);               // and boot
    box(group, tint, w * 0.88, 0.5, l * 0.38, 0, 1.15, -l * 0.04);                 // the glasshouse, blacked out
    box(group, paint, w * 0.9, 0.08, l * 0.36, 0, 1.43, -l * 0.04);                // a flat roof
    screen(group, tint, w * 0.86, 0.04, 0.6, 0, 1.12, l * 0.17, 0.75);             // the windscreen
    screen(group, tint, w * 0.86, 0.04, 0.5, 0, 1.12, -l * 0.25, -0.85);           // the rear window
    box(group, chrome, w + 0.06, 0.14, 0.14, 0, 0.42, l / 2 + 0.03);               // chrome bumpers,
    box(group, chrome, w + 0.06, 0.14, 0.14, 0, 0.42, -l / 2 - 0.03);
    box(group, chrome, w * 0.6, 0.22, 0.04, 0, 0.66, l / 2 + 0.01);                 // a big grille,
    for (const side of [-1, 1]) {
      box(group, chrome, 0.03, 0.05, l * 0.9, side * (w / 2 + 0.01), 0.68, 0);       // the side strips
      box(group, LAMP, w * 0.16, 0.12, 0.04, side * w * 0.36, 0.66, l / 2 + 0.02);   // square headlamps
      box(group, TAIL, w * 0.2, 0.14, 0.04, side * w * 0.34, 0.66, -l / 2 - 0.02);
      for (const z of [l * 0.31, -l * 0.31]) {
        wheel(group, R, 0.26, side * (w / 2 - 0.04), R, z);                          // (gold hubs)
        const wall = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.78, R * 0.78, 0.27, 16), white); // whitewalls
        wall.rotation.z = Math.PI / 2;
        wall.position.set(side * (w / 2 - 0.04), R, z);
        group.add(wall);
      }
    }
    const guns = [-1, 1].map(side => { // (out of each rear window)
      const gun = box(group, lambert(0x1a1a1a), 0.5, 0.08, 0.08, side * (w / 2 + 0.18), 1.12, -l * 0.12);
      gun.visible = false;
      return gun;
    });
    group.userData = {
      body,
      animate: () => {},
      firing: (on) => { for (const gun of guns) gun.visible = on; },
    };
    return group;
  },
  // A fishing trawler, sat in the water: a deep hull in the livery with a raked bow and a white gunwale, a
  // white wheelhouse aft with its funnel, a mast forward and a boom out over the stern with its net drum.
  // It rolls slowly on the swell.
  trawler: (car) => {
    const group = new THREE.Group(), shell = new THREE.Group();
    group.add(shell);
    const w = car.hw * 2, l = car.hl * 2, f = l / 2;
    const paint = lambert(car.color), white = lambert(0xf2f2f0), dark = lambert(0x1b1d22), glass = lambert(GLASS), wood = lambert(0x8a6a45), rust = lambert(0xb5532a);
    const body = prism(shell, paint, w, [[-f, -0.4], [f * 0.72, -0.4], [f, 1.15], [-f, 0.9]]);          // the hull
    for (const side of [-1, 1]) prism(shell, white, 0.12, [[-f, 0.8], [f * 0.97, 1.02], [f, 1.2], [-f, 0.95]], side * w / 2); // its gunwales
    prism(shell, wood, w * 0.9, [[-f * 0.98, 0.9], [f * 0.9, 1.12], [f * 0.9, 1.16], [-f * 0.98, 0.94]]);  // the deck
    const hz = -f * 0.45;                                                                                // the wheelhouse
    box(shell, white, w * 0.7, 1.3, l * 0.24, 0, 1.55, hz);
    box(shell, glass, w * 0.72, 0.4, l * 0.2, 0, 1.85, hz + 0.08);
    box(shell, dark, w * 0.78, 0.08, l * 0.28, 0, 2.24, hz);
    box(shell, rust, 0.4, 0.8, 0.4, 0, 2.6, hz - 0.3);                                                   // the funnel
    box(shell, dark, 0.42, 0.14, 0.42, 0, 2.95, hz - 0.3);
    box(shell, dark, 0.12, 2.6, 0.12, 0, 2.2, f * 0.35);                                                 // the mast,
    box(shell, dark, 1.4, 0.08, 0.08, 0, 2.9, f * 0.35);                                                 // its yard
    slab(shell, dark, 0.1, 0.1, l * 0.36, 0, 1.75, -f * 0.82, 0.5);                                      // the boom aft
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, w * 0.6, 12), lambert(0x2f6f4a));   // and its net drum
    drum.rotation.z = Math.PI / 2;
    drum.position.set(0, 1.3, -f * 0.8);
    shell.add(drum);
    for (const side of [-1, 1]) {
      box(shell, rust, 0.5, 0.35, 0.7, side * w * 0.26, 1.1, f * 0.08);                                  // fish crates on deck
      box(shell, TAIL, 0.1, 0.1, 0.04, side * w * 0.4, 0.7, -f - 0.01);
    }
    group.userData = {
      body,
      animate: (t) => { // (heavy: a slow roll and pitch)
        shell.position.y = Math.sin(t * 2.1) * 0.08;
        shell.rotation.x = Math.sin(t * 1.7) * 0.03;
        shell.rotation.z = Math.sin(t * 1.3) * 0.045;
      },
    };
    return group;
  },
  // A sleek sports cruiser, sat in the water (its hull's bottom under the surface): a long white
  // hull, pointed at the bow, with a stripe in the livery down its side; a raised foredeck, and
  // amidships the captain's cabin: a raked windshield, a hardtop roof on slim pillars, glass round
  // the sides, and the captain at the wheel; a swim platform and the jet's nozzle at the stern.
  // It bobs on the swell, pitching and rolling a little.
  jetboat: (car) => {
    const group = new THREE.Group(), shell = new THREE.Group();
    group.add(shell);
    const w = car.hw * 2, l = car.hl * 2, front = l / 2;
    const white = lambert(0xf2f2f0), paint = lambert(car.color), dark = lambert(0x1b1d22), glass = lambert(GLASS), chrome = lambert(CHROME);
    // the hull, seen from above: square at the stern, sweeping in to a point at the bow, extruded down
    const plan = (scale, inset = 0) => {
      const shape = new THREE.Shape(), hw = w / 2 * scale - inset;
      shape.moveTo(-hw, -front + inset);
      for (const [x, z] of [[hw, -front + inset], [hw, front * 0.15], [hw * 0.72, front * 0.7], [0, front - inset]]) shape.lineTo(x, z);
      shape.lineTo(-hw * 0.72, front * 0.7);
      shape.lineTo(-hw, front * 0.15);
      shape.closePath();
      return shape;
    };
    const slabOf = (shape, from, to, material) => {
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: to - from, bevelEnabled: false, curveSegments: 4 });
      geometry.rotateX(Math.PI / 2); // (the plan's z along the car, extruded downwards)
      geometry.translate(0, to, 0);
      const mesh = new THREE.Mesh(geometry, material);
      shell.add(mesh);
      return mesh;
    };
    slabOf(plan(1), -0.3, 0.5, white);                                                   // the hull
    const body = slabOf(plan(1.015), 0.24, 0.36, paint);                                 // its stripe, in the livery
    slabOf(plan(0.96, 0.05), 0.5, 0.56, lambert(0xe2dccf));                              // the teak deck
    prism(shell, white, w * 0.62, [[front * 0.15, 0.56], [front * 0.75, 0.56], [front * 0.15, 0.8]]); // the raised foredeck
    // the captain's cabin
    const cabFront = front * 0.18, cabBack = -front * 0.42, roof = 1.55;
    box(shell, white, w * 0.86, 0.36, cabFront - cabBack, 0, 0.74, (cabFront + cabBack) / 2); // its lower walls
    screen(shell, glass, w * 0.82, 0.04, 0.72, 0, 1.22, cabFront - 0.2, 0.95);           // the raked windshield
    box(shell, white, w * 0.9, 0.07, cabFront - cabBack + 0.25, 0, roof, (cabFront + cabBack) / 2 - 0.12); // the hardtop roof
    for (const side of [-1, 1]) {
      box(shell, glass, 0.03, 0.55, (cabFront - cabBack) * 0.75, side * w * 0.43, 1.2, (cabFront + cabBack) / 2 - 0.05); // side glass
      box(shell, white, 0.06, 0.62, 0.06, side * w * 0.42, 1.22, cabBack - 0.15);        // the roof's rear pillars
      box(shell, chrome, 0.03, 0.03, front * 0.4, side * w * 0.24, 0.95, front * 0.48);  // the bow rails
      box(shell, TAIL, 0.08, 0.08, 0.04, side * w * 0.4, 0.45, -front - 0.01);
    }
    box(shell, glass, w * 0.7, 0.4, 0.03, 0, 1.2, cabBack - 0.13);                       // the back of the cabin, glass
    box(shell, dark, 0.34, 0.5, 0.3, -0.3, 0.96, -front * 0.08);                         // the captain: sat at the wheel...
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), lambert(0xe0b48c));     // ...the head...
    head.position.set(-0.3, 1.32, -front * 0.08);
    shell.add(head);
    box(shell, lambert(0xf4f4f4), 0.3, 0.08, 0.3, -0.3, 1.45, -front * 0.08);            // ...and cap
    box(shell, dark, 0.06, 0.25, 0.06, -0.3, 1.0, cabFront - 0.45);                      // the wheel's column
    box(shell, dark, w * 0.96, 0.05, 0.45, 0, 0.08, -front - 0.2);                       // the swim platform
    disc(shell, dark, 0.18, 0.3, 0, 0.0, -front - 0.15);                                 // the jet's nozzle
    group.userData = {
      body,
      animate: (t) => { // bobbing on the chop: quick, and never quite the same twice
        shell.position.y = Math.sin(t * 6.1) * 0.07 + Math.sin(t * 9.7 + 1) * 0.025;
        shell.rotation.x = Math.sin(t * 4.4) * 0.035 + Math.sin(t * 7.3) * 0.01;
        shell.rotation.z = Math.sin(t * 3.4) * 0.03;
      },
    };
    return group;
  },

  // A police cruiser: a big late-90s sedan in black and white (the paint is the white: its doors and
  // roof), a push bar on the nose and a spotlight by the windscreen. Its light bar is the traffic
  // mesh's own (render/cars.js), on the roof
  police: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.34;
    const paint = lambert(car.color), black = lambert(0x121316), glass = lambert(GLASS), trim = lambert(TRIM);
    const steel = lambert(0x8a8f96);
    box(group, black, w, 0.46, l, 0, 0.6, 0);                                          // the black body...
    const body = box(group, paint, w + 0.02, 0.44, l * 0.42, 0, 0.62, -l * 0.02);       // ...its white doors
    box(group, black, w * 0.94, 0.12, l * 0.27, 0, 0.88, l * 0.33);                    // bonnet
    box(group, black, w * 0.94, 0.1, l * 0.2, 0, 0.87, -l * 0.38);                     // boot
    box(group, glass, w * 0.86, 0.42, l * 0.44, 0, 1.06, -l * 0.03);                   // the glasshouse
    box(group, paint, w * 0.88, 0.07, l * 0.36, 0, 1.3, -l * 0.04);                    // white roof
    screen(group, glass, w * 0.84, 0.05, 0.62, 0, 1.06, l * 0.22, 0.6);                  // windscreen
    screen(group, glass, w * 0.84, 0.05, 0.5, 0, 1.05, -l * 0.26, -0.55);                // rear window
    for (const side of [-1, 1]) {
      for (const z of [0.15, -0.02, -0.2]) box(group, black, 0.07, 0.42, 0.08, side * w * 0.44, 1.06, l * z); // pillars
      box(group, LAMP, w * 0.24, 0.13, 0.06, side * w * 0.3, 0.72, l / 2 + 0.01);      // headlamps
      box(group, TAIL, w * 0.26, 0.12, 0.06, side * w * 0.3, 0.74, -l / 2 - 0.01);
      box(group, trim, 0.05, 0.5, 0.06, side * w * 0.3, 0.55, l / 2 + 0.24);           // the push bar's uprights
      wheel(group, R, 0.26, side * (w / 2 - 0.05), R, l * 0.31, steel);
      wheel(group, R, 0.26, side * (w / 2 - 0.05), R, -l * 0.31, steel);
    }
    box(group, trim, w * 0.7, 0.08, 0.06, 0, 0.72, l / 2 + 0.25);                      // the push bar
    box(group, trim, w * 0.7, 0.08, 0.06, 0, 0.42, l / 2 + 0.25);
    box(group, trim, w * 0.4, 0.14, 0.05, 0, 0.66, l / 2 + 0.02);                      // grille
    disc(group, lambert(CHROME), 0.08, 0.14, -w * 0.47, 1.18, l * 0.2);                // the spotlight
    box(group, trim, w + 0.04, 0.16, 0.14, 0, 0.42, l / 2 + 0.03);                     // bumpers
    box(group, trim, w + 0.04, 0.16, 0.14, 0, 0.42, -l / 2 - 0.03);
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A city bus: a long, tall box in the livery with a white roof, a dark band of windows all round,
  // a tall windscreen under a glowing destination sign, folding doors on the kerb side, and six
  // big wheels. (The traffic bus, and the secret City Bus you can drive)
  citybus: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, h = car.height, R = 0.5;
    const paint = lambert(car.color), glass = lambert(GLASS), white = lambert(0xf1f1ee), black = lambert(0x16171a);
    const steel = lambert(0x8a8f96);
    const body = box(group, paint, w, h - 0.45, l, 0, 0.45 + (h - 0.45) / 2, 0);       // the body
    box(group, white, w * 0.97, 0.12, l * 0.98, 0, h + 0.03, 0);                        // white roof
    box(group, glass, w + 0.02, 0.95, l * 0.84, 0, h - 0.95, -l * 0.04);                // the window band...
    for (let i = 1; i < 7; i++) {                                                         // ...split into windows
      for (const side of [-1, 1]) box(group, paint, 0.04, 0.95, 0.12, side * (w / 2 + 0.01), h - 0.95, -l * 0.46 + i * l * 0.12);
    }
    box(group, glass, w * 0.9, 1.5, 0.05, 0, h - 1.15, l / 2 + 0.01);                   // the tall windscreen
    box(group, new THREE.MeshBasicMaterial({ color: 0xffb21a }), w * 0.7, 0.26, 0.05, 0, h - 0.22, l / 2 + 0.02); // destination sign
    box(group, glass, w * 0.8, 0.7, 0.05, 0, h - 0.95, -l / 2 - 0.01);                  // rear window
    box(group, black, 0.04, 1.9, 0.9, -(w / 2 + 0.01), 1.4, l * 0.36);                  // the front doors (kerb side)...
    box(group, black, 0.04, 1.9, 0.9, -(w / 2 + 0.01), 1.4, -l * 0.08);                 // ...and the middle ones
    box(group, white, w + 0.03, 0.18, l * 0.9, 0, 1.0, -l * 0.02);                     // a white stripe along
    for (const side of [-1, 1]) {
      box(group, LAMP, w * 0.16, 0.18, 0.06, side * w * 0.36, 0.75, l / 2 + 0.02);     // headlamps
      box(group, TAIL, w * 0.12, 0.3, 0.06, side * w * 0.4, 0.9, -l / 2 - 0.02);
      box(group, black, 0.12, 0.3, 0.1, side * (w / 2 + 0.08), h - 0.8, l / 2 - 0.1); // mirrors
      wheel(group, R, 0.34, side * (w / 2 - 0.12), R, l * 0.34, steel);
      for (const z of [-0.26, -0.36]) wheel(group, R, 0.34, side * (w / 2 - 0.12), R, l * z, steel);
    }
    box(group, black, w + 0.04, 0.3, 0.14, 0, 0.45, l / 2 + 0.04);                     // bumpers
    box(group, black, w + 0.04, 0.3, 0.14, 0, 0.45, -l / 2 - 0.04);
    group.userData = { body, animate: () => {} };
    return group;
  },

  // An ambulance: a short cab up front and a tall box body behind it, white (the paint), with a red
  // band and a red cross on each side and the back. Its light bar is the traffic mesh's own, on the
  // front of the box's roof, just behind the cab (render/cars.js: AMBULANCE_BOX)
  ambulance: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, h = car.height, R = 0.4;
    const paint = lambert(car.color), red = lambert(0xd8202a), glass = lambert(GLASS), trim = lambert(TRIM);
    const steel = lambert(0x8a8f96);
    const front = car.hl * AMBULANCE_BOX;                                                 // where the box starts
    const body = box(group, paint, w, h - 0.5, l / 2 + front, 0, 0.5 + (h - 0.5) / 2, (front - l / 2) / 2); // the box
    const nose = l * 0.38;                                                                // where the cab ends
    box(group, paint, w * 0.94, 1.1, nose - front, 0, 1.05, (front + nose) / 2);        // the cab...
    box(group, paint, w * 0.9, 0.55, l / 2 - nose, 0, 0.78, (nose + l / 2) / 2);         // ...its stubby bonnet
    screen(group, glass, w * 0.84, 0.05, 0.62, 0, 1.3, nose + 0.06, 0.35);                 // and windscreen
    for (const side of [-1, 1]) {
      box(group, glass, 0.04, 0.42, (nose - front) * 0.7, side * (w * 0.47 + 0.01), 1.35, (front + nose) / 2 + 0.05); // cab side windows
      box(group, red, 0.03, 0.22, l / 2 + front, side * (w / 2 + 0.01), 1.1, (front - l / 2) / 2); // red band
      box(group, red, 0.03, 0.62, 0.2, side * (w / 2 + 0.015), h - 0.75, -l * 0.15);     // the red cross
      box(group, red, 0.03, 0.2, 0.62, side * (w / 2 + 0.015), h - 0.75, -l * 0.15);
      box(group, LAMP, w * 0.18, 0.16, 0.06, side * w * 0.32, 0.8, l / 2 + 0.01);        // headlamps
      box(group, TAIL, w * 0.1, 0.3, 0.06, side * w * 0.42, 1.0, -l / 2 - 0.01);
      wheel(group, R, 0.3, side * (w / 2 - 0.1), R, l * 0.32, steel);
      wheel(group, R, 0.3, side * (w / 2 - 0.1), R, -l * 0.3, steel);
    }
    box(group, red, 0.62, 0.2, 0.03, 0, h - 0.75, -l / 2 - 0.02);                       // a cross on the back doors
    box(group, red, 0.2, 0.62, 0.03, 0, h - 0.75, -l / 2 - 0.02);
    box(group, trim, 0.03, h - 0.7, 0.04, 0, 0.5 + (h - 0.7) / 2, -l / 2 - 0.015);      // the back doors' split
    box(group, trim, w + 0.04, 0.18, 0.14, 0, 0.45, l / 2 + 0.03);                     // bumpers
    box(group, trim, w + 0.04, 0.18, 0.14, 0, 0.45, -l / 2 - 0.03);
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A vintage delivery van (a 1930s Ford panel truck, more or less): a tall box body with a cream
  // sign panel down each side, an upright cab, a long narrow bonnet behind a tall chrome grille,
  // round headlamps on stalks, separate black mudguards and running boards, cream-spoked wheels
  deliveryvan: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, l = car.hl * 2, R = 0.42;
    const paint = lambert(car.color), glass = lambert(GLASS), black = lambert(0x161616), chrome = lambert(CHROME);
    const cream = lambert(0xf0e2bd);
    const body = box(group, paint, w * 0.96, 1.55, l * 0.6, 0, 1.38, -l * 0.2);       // the box body
    box(group, paint, w * 0.9, 1.5, l * 0.17, 0, 1.36, l * 0.175);                     // the cab
    box(group, glass, w * 0.92, 0.48, l * 0.13, 0, 1.78, l * 0.18);                    // its side windows
    box(group, glass, w * 0.76, 0.5, 0.05, 0, 1.78, l * 0.262);                        // the upright windscreen
    box(group, black, w * 0.99, 0.1, l * 0.78, 0, 2.2, -l * 0.115);                    // the roof
    box(group, paint, w * 0.46, 0.5, l * 0.19, 0, 1.12, l * 0.355);                    // the long, narrow bonnet
    box(group, chrome, w * 0.4, 0.66, 0.08, 0, 1.08, l * 0.45);                        // the tall grille
    box(group, chrome, 0.08, 0.08, 0.08, 0, 1.43, l * 0.43);                           // radiator cap
    box(group, chrome, w * 0.86, 0.1, 0.1, 0, 0.5, l / 2 - 0.02);                      // front bumper
    box(group, black, w * 0.9, 0.16, 0.1, 0, 0.62, -l / 2 + 0.02);                     // rear bumper
    for (const side of [-1, 1]) {
      box(group, cream, 0.02, 0.72, l * 0.46, side * (w * 0.48 + 0.01), 1.5, -l * 0.2); // the sign panel...
      box(group, black, 0.025, 0.05, l * 0.48, side * (w * 0.48 + 0.012), 1.9, -l * 0.2); // ...edged above
      box(group, black, 0.025, 0.05, l * 0.48, side * (w * 0.48 + 0.012), 1.1, -l * 0.2); // ...and below
      // the front mudguard sweeping down to the running board, and the rear one over its wheel
      box(group, black, w * 0.2, 0.08, l * 0.17, side * w * 0.39, 0.92, l * 0.33);
      slab(group, black, w * 0.2, 0.08, l * 0.1, side * w * 0.39, 0.74, l * 0.43, 0.75);
      slab(group, black, w * 0.2, 0.08, l * 0.09, side * w * 0.39, 0.72, l * 0.215, -0.75);
      box(group, black, w * 0.16, 0.06, l * 0.12, side * w * 0.41, 0.56, l * 0.13);     // running board
      box(group, black, 0.16, 0.36, l * 0.2, side * (w * 0.48 + 0.06), 0.88, -l * 0.3); // rear mudguard
      box(group, chrome, 0.05, 0.3, 0.05, side * w * 0.3, 1.0, l * 0.43);              // a headlamp's stalk...
      disc(group, chrome, 0.19, 0.16, side * w * 0.3, 1.2, l * 0.43);                  // ...its shell...
      disc(group, LAMP, 0.15, 0.04, side * w * 0.3, 1.2, l * 0.43 + 0.09);             // ...and lamp
      disc(group, TAIL, 0.08, 0.05, side * w * 0.4, 0.95, -l / 2 - 0.01);              // round tail lamps
      box(group, chrome, 0.1, 0.1, 0.12, side * (w * 0.46 + 0.06), 1.72, l * 0.25);    // mirrors
      box(group, black, 0.02, 1.3, 0.04, side * w * 0.003, 1.38, -l / 2 - 0.005);     // the rear doors' split
      wheel(group, R, 0.24, side * (w / 2 - 0.16), R, l * 0.33, cream);
      wheel(group, R, 0.24, side * (w / 2 - 0.12), R, -l * 0.3, cream);
    }
    box(group, glass, w * 0.6, 0.36, 0.04, 0, 1.75, -l / 2 - 0.01);                   // the rear doors' windows
    group.userData = { body, animate: () => {} };
    return group;
  },
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
    screen(group, glass, w * 0.86, 0.05, 0.6, 0, 1.06, l * 0.22, 0.55);             // windscreen
    screen(group, glass, w * 0.86, 0.05, 0.52, 0, 1.06, -l * 0.37, -0.22);          // the hatch's glass
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
    screen(group, glass, w * 0.9, 0.05, 0.8, 0, 1.86, l * 0.32, 0.5);               // windscreen
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
    screen(group, glass, w * 0.9, 0.05, 0.8, 0, 1.42, l * 0.32, 0.5);               // windscreen
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
    screen(group, glass, w * 0.86, 0.05, 0.6, 0, 1.26, l * 0.18, 0.45);            // windscreen
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
    screen(group, glass, w * 0.82, 0.04, 0.36, 0, 0.92, l * 0.1, 0.9);              // small windscreen
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
      stripe: (hex) => stripe.color.setHex(hex), // (a scheme of its own: see Traffic, a rival courier)
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
    screen(group, glass, w * 0.88, 0.05, 0.55, 0, 1.8, l * 0.2, 0.35);              // windscreen
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
    screen(chassis, lambert(0x23262d), w * 0.78, 0.05, 0.6, 0, 0.56, at(l * 0.15), 0.62); // windscreen
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

  // A rusty old pickup (a 70s full-size one): a long bonnet, a tall cab with a raked windscreen, an
  // open load bed behind with a heap in it piled higher than the cab (purple for a good driver, yellow
  // for an evil one), a door
  // in grey primer, rust patches, one headlight out. It shudders as it idles.
  junker: (car) => {
    const group = new THREE.Group(), shell = new THREE.Group();
    group.add(shell);
    const w = car.hw * 2, l = car.hl * 2, R = 0.42;
    const paint = lambert(car.color), rust = lambert(0x6b3a1f), dark = lambert(0x23262d), glass = lambert(GLASS);
    const primer = lambert(0x8d9096), dull = lambert(0x9a9c9e);
    const cabFront = l * 0.15, cabBack = -l * 0.09, bonnetFront = l / 2, top = 1.12, roof = 1.9;
    const body = box(shell, paint, w, 0.55, l, 0, 0.85, 0);                                // the body sides
    box(shell, paint, w * 0.92, 0.26, bonnetFront - cabFront - 0.1, 0, top + 0.13, (bonnetFront + cabFront + 0.1) / 2); // the long bonnet
    box(shell, paint, w * 0.94, roof - top, cabFront - cabBack, 0, (top + roof) / 2, (cabFront + cabBack) / 2); // the cab
    // the windscreen, raked back from the bonnet's tail to the cab roof
    const fz = cabFront + 0.1, fy = top + 0.26, bz = cabFront - 0.18, by = roof;
    screen(shell, glass, w * 0.86, 0.05, Math.hypot(fz - bz, by - fy), 0, (fy + by) / 2, (fz + bz) / 2, Math.atan2(by - fy, fz - bz));
    box(shell, paint, w * 0.94, 0.06, cabFront - cabBack, 0, roof + 0.03, (cabFront + cabBack) / 2); // roof
    box(shell, glass, w * 0.7, 0.34, 0.04, 0, roof - 0.3, cabBack - 0.01);                // back window
    for (const side of [-1, 1]) {
      box(shell, glass, 0.04, 0.36, (cabFront - cabBack) * 0.6, side * (w * 0.47 + 0.01), roof - 0.3, (cabFront + cabBack) / 2 - 0.05); // side windows
      box(shell, paint, 0.1, 0.45, l / 2 + cabBack - 0.1, side * (w / 2 - 0.05), top + 0.22, (cabBack - l / 2) / 2 - 0.05); // bed sides
      box(shell, dull, 0.12, 0.1, 0.1, side * (w / 2 + 0.06), roof - 0.35, cabFront - 0.05); // mirrors
      wheel(group, R, 0.3, side * (w / 2 - 0.05), R, l * 0.31);
      wheel(group, R, 0.3, side * (w / 2 - 0.05), R, -l * 0.3);
    }
    box(shell, paint, w, 0.45, 0.1, 0, top + 0.22, -l / 2 + 0.05);                       // tailgate
    box(shell, dark, w * 0.86, 0.04, l / 2 + cabBack - 0.2, 0, top + 0.02, (cabBack - l / 2) / 2); // bed floor
    // the heap in the bed, its colour by the driver's side (see livery)
    const heap = lambert(0x8e44ad);
    // (domes on the bed's floor, heaped high, over the cab's roof)
    const dome = new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    for (const [x, y, z, sx, sy, sz] of [[0, top, -l * 0.29, w * 0.44, 1.3, l * 0.18], [-w * 0.17, top, -l * 0.17, w * 0.28, 0.85, l * 0.1],
      [w * 0.18, top, -l * 0.42, w * 0.27, 0.75, l * 0.08], [-w * 0.08, top + 0.7, -l * 0.31, w * 0.24, 0.6, l * 0.1]]) {
      const lump = new THREE.Mesh(dome, heap);
      lump.scale.set(sx, sy, sz);
      lump.position.set(x, y, z);
      shell.add(lump);
    }
    box(shell, primer, 0.05, 0.5, (cabFront - cabBack) * 0.8, -w / 2 - 0.01, 1.0, (cabFront + cabBack) / 2); // a door in primer
    box(shell, rust, 0.05, 0.3, l * 0.18, w / 2 + 0.01, 0.78, -l * 0.3);                // rust patches
    box(shell, rust, w * 0.45, 0.03, l * 0.1, w * 0.15, top + 0.27, l * 0.38);
    box(shell, dull, w * 0.6, 0.3, 0.05, 0, 0.92, l / 2 + 0.01);                        // the grille
    box(shell, dull, w + 0.1, 0.16, 0.14, 0, 0.56, l / 2 + 0.04);                       // bumpers
    box(shell, dull, w + 0.1, 0.16, 0.14, 0, 0.56, -l / 2 - 0.04);
    disc(shell, LAMP, 0.13, 0.06, -w * 0.38, 0.92, l / 2 + 0.02);                       // one headlight works...
    disc(shell, dark, 0.13, 0.06, w * 0.38, 0.92, l / 2 + 0.02);                        // ...the other's out
    for (const side of [-1, 1]) box(shell, TAIL, w * 0.12, 0.2, 0.08, side * w * 0.4, 0.95, -l / 2 - 0.01);
    group.userData = {
      body,
      livery: (evil) => heap.color.setHex(evil ? 0xe0bd1c : 0x8e44ad), // (a yellow heap of who knows what, or a purple one)
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
  // headlights, a surfboard on the roof, and its spare tyre carried on the nose. It sways gently as it goes.
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
    disc(shell, lambert(0x141414), 0.3, 0.2, 0, 0.62, l / 2 + 0.16);              // the spare tyre, on the bumper...
    disc(shell, lambert(CHROME), 0.15, 0.22, 0, 0.62, l / 2 + 0.16);              // ...and its hubcap
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
    screen(group, glass, w * 0.86, 0.05, 0.56, 0, 1.2, l * 0.19, 0.36);             // windscreen
    screen(group, glass, w * 0.84, 0.05, 0.54, 0, 1.2, -l * 0.3, -0.36);            // rear window
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
    screen(shell, glass, w * 0.88, 0.05, 0.62, 0, 1.4, l * 0.25, 0.55);             // windscreen
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
