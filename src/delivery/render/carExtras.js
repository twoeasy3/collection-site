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

// ---- A SUPER CAR'S BODY KIT (see cars.js superOf) ----
// Added to any vehicle model (a group facing +z, its feet on y = 0): a rear wing on two struts, a bonnet
// scoop, twin side exhausts, side skirts for a lowered look, an underglow and a racing stripe down the
// centreline, in the Super livery's second colour (car.stripe / car.evilStripe: the kit wraps the model's
// userData.livery to swap it). Every part is set down on the model's own surface, found by casting rays
// down onto it, so it neither floats nor sinks whatever the shape. car.kit turns parts off ({ wing: false })
// or on ({ lights: true }: a roof rack of lamps, for a van).
const RAY = new THREE.Raycaster(), FROM = new THREE.Vector3(), DOWN = new THREE.Vector3(0, -1, 0);
export const addSuperKit = (model, car) => {
  const kit = { wing: true, scoop: true, exhausts: true, skirts: true, glow: true, stripe: true, lights: false, ...(car.kit || {}) };
  const w = car.hw * 2, l = car.hl * 2, H = car.height;
  model.updateMatrixWorld(true);
  // the height of the model's surface at (x, z), seen from above (null where there is nothing)
  const top = (x, z) => {
    FROM.set(x, H + 5, z);
    RAY.set(FROM, DOWN);
    const hit = RAY.intersectObject(model, true)[0];
    return hit ? hit.point.y : null;
  };
  // the wheels (the tyres: cylinders on their side), for where the skirts and exhausts fit between them
  const tyres = [];
  model.traverse((m) => {
    if (m.isMesh && m.geometry.type === 'CylinderGeometry' && Math.abs(Math.abs(m.rotation.z) - Math.PI / 2) < 0.01 && m.geometry.parameters.radiusTop >= 0.2) tyres.push(m);
  });
  const R = tyres.length ? Math.max(...tyres.map(t => t.geometry.parameters.radiusTop)) : 0.35;
  const frontZ = tyres.length ? Math.max(...tyres.map(t => t.position.z)) : l * 0.3;
  const rearZ = tyres.length ? Math.min(...tyres.map(t => t.position.z)) : -l * 0.3;
  const sideX = tyres.length ? Math.max(...tyres.map(t => Math.abs(t.position.x))) : w / 2 - 0.04;
  // the body's own box: its sill (how low the body hangs) and how far out its sides are
  const bodyBox = new THREE.Box3().setFromObject(model.userData.body);
  const sill = Math.max(0.12, bodyBox.min.y), side = Math.max(w / 2, bodyBox.max.x);
  const parts = new THREE.Group();
  const stripeMat = new THREE.MeshLambertMaterial({ color: car.stripe });
  const glowMat = new THREE.MeshBasicMaterial({ color: car.stripe, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  const dark = new THREE.MeshLambertMaterial({ color: 0x1b1d22 }), chrome = new THREE.MeshLambertMaterial({ color: 0xd8d8d8 });
  const lamp = new THREE.MeshBasicMaterial({ color: 0xfff3c4 });
  const box = (material, sx, sy, sz, x, y, z) => {
    const mesh = new THREE.Mesh(unitBox, material);
    mesh.scale.set(sx, sy, sz);
    mesh.position.set(x, y, z);
    parts.add(mesh);
    return mesh;
  };
  // the racing stripe: short lengths laid along the centreline, each on the surface and tipped to its slope
  if (kit.stripe) {
    const step = 0.22, sw = Math.max(0.12, w * 0.14);
    for (let z = -l * 0.49; z < l * 0.49; z += step) {
      const a = top(0, z), b = top(0, Math.min(l * 0.49, z + step));
      if (a === null || b === null || Math.abs(a - b) > 0.5) continue; // (a gap, or a step too steep: a windscreen's foot)
      const seg = box(stripeMat, sw, 0.03, Math.hypot(step, b - a) + 0.01, 0, (a + b) / 2 + 0.015, z + step / 2);
      seg.rotation.x = -Math.atan2(b - a, step);
    }
  }
  // the bonnet scoop: on the front third, where the surface is lowest there (the bonnet, not the windscreen's
  // foot nor a van's screen), its mouth open to the front
  if (kit.scoop) {
    let z = l * 0.3, y = null;
    for (const k of [0.3, 0.34, 0.26, 0.38, 0.22, 0.42, 0.46]) {
      const h = top(0, l * k);
      if (h !== null && (y === null || h < y - 0.01)) { y = h; z = l * k; }
    }
    if (y !== null) {
      const sl = Math.max(0.3, l * 0.16), sw = Math.max(0.3, w * 0.3);
      box(car.id.includes('darkvan') ? dark : stripeMat, sw, 0.12, sl, 0, y + 0.05, z);
      box(dark, sw * 0.8, 0.08, 0.04, 0, y + 0.06, z + sl / 2 + 0.01); // (the mouth)
    }
  }
  // the rear wing on two struts, standing on whatever is below it at the tail (a boot, a hatch, a roof)
  if (kit.wing) {
    const z = -l * 0.42, feet = [top(-w * 0.3, z), top(w * 0.3, z)].filter(y => y !== null);
    const foot = feet.length ? Math.max(...feet) : H * 0.6, y = Math.max(foot + 0.32, H * 0.85);
    for (const s of [-1, 1]) box(dark, 0.06, y - foot, 0.22, s * w * 0.3, (y + foot) / 2, z);
    box(stripeMat, w * 1.1, 0.05, 0.34, 0, y, z);
    for (const s of [-1, 1]) box(dark, 0.03, 0.22, 0.38, s * w * 0.55, y + 0.04, z); // (end plates)
  }
  // a roof rack of lamps across the front of the roof, for a van or a bus that is no place for a wing
  if (kit.lights) {
    const z = l * 0.18, y = top(0, z);
    if (y !== null) {
      box(dark, w * 0.9, 0.07, 0.09, 0, y + 0.18, z);
      for (const s of [-1, 1]) box(dark, 0.05, 0.18, 0.05, s * w * 0.4, y + 0.09, z);
      for (let i = 0; i < 4; i++) {
        const x = (i - 1.5) * w * 0.22;
        box(dark, 0.17, 0.15, 0.1, x, y + 0.26, z);
        box(lamp, 0.13, 0.11, 0.02, x, y + 0.26, z + 0.06);
      }
    }
  }
  // side skirts between the wheels, hanging from the sill nearly to the ground
  const from = rearZ + R + 0.08, to = frontZ - R - 0.08;
  if (kit.skirts && to - from > 0.4) {
    const h = Math.max(0.06, sill - 0.12);
    for (const s of [-1, 1]) box(dark, 0.07, h, to - from, s * (side + 0.02), sill - h / 2, (from + to) / 2);
  }
  // twin side exhausts: a chrome pipe each side under the sill, ahead of the rear wheel, with a flared tip
  if (kit.exhausts && to - from > 0.4) {
    const pl = Math.min(l * 0.22, to - from - 0.1);
    for (const s of [-1, 1]) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, pl, 10), chrome);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(s * (side + 0.1), Math.max(0.1, sill - 0.04), from + pl / 2);
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.14, 10), chrome);
      tip.rotation.x = Math.PI / 2;
      tip.position.set(s * (side + 0.1), pipe.position.y, from + 0.02);
      parts.add(pipe, tip);
    }
  }
  // the underglow: a flat quad of light under the car
  if (kit.glow) {
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.5, l * 1.05), glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.03;
    parts.add(glow);
  }
  model.add(parts);
  const livery = model.userData.livery;
  model.userData.livery = (evil) => { // (the stripe and the glow in the livery's second colour)
    livery?.(evil);
    stripeMat.color.setHex(evil ? car.evilStripe : car.stripe);
    glowMat.color.setHex(evil ? car.evilStripe : car.stripe);
  };
  model.userData.kit = parts;
  return model;
};
