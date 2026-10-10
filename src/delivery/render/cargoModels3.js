// ---- the malicious deliveries (fourteen more Evil cargo models) and six more Good ones ----------
// As cargoModelsEvil2.js's twenty (cargoModels.js spreads these into CARGO_MODELS): each a group
// standing on y = 0, facing +z, about a metre tall when calm, with userData.animate(t), and for an Evil
// one userData.setState(0 | 1 | 2). Plain three.js: nothing here touches the game. The ids are cargo.js's.
// The Evil ones are deliveries that are bad news for whoever gets them: people and paperwork, seen only
// in part (hands out of a crate, a hat on a sack, a megaphone out of a box), never a whole person. Calm is
// a plain container with one tell; agitated is hands and props coming out; furious is the container
// overwhelmed. Paper, tickets, stickers, notes and glitter are their particles, as sparks and bees are
// for the others. Each is told apart at thumbnail size in each state: its outline changes.
import * as THREE from 'three';

const TRANSITION = 0.5; // s from one state to the next: as cargoModels.js's

const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const glow = (color, extra) => new THREE.MeshBasicMaterial({ color, ...extra });
const haze = (color, opacity = 0.5) => glow(color, { transparent: true, opacity, depthWrite: false });
const sheetMat = (color = 0xfbf7ea) => lambert(color, { side: THREE.DoubleSide });
const sphere = (r, w = 12, h = 8) => new THREE.SphereGeometry(r, w, h);
const cyl = (top, bottom, h, n = 14) => new THREE.CylinderGeometry(top, bottom, h, n);
const cone = (r, h, n = 8) => new THREE.ConeGeometry(r, h, n);
const torus = (r, t, n = 20, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, 6, n, arc);
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const plane = (w, h) => new THREE.PlaneGeometry(w, h);
const mix = (a, b, k) => a + (b - a) * k;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const FLAT = Math.PI / 2;
// a part of a model: a mesh at (x, y, z), optionally turned (rx, ry, rz)
const part = (group, geometry, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  group.add(mesh);
  return mesh;
};
const sub = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
// shown `k` of the way (0: gone, as near as a scale can be)
const show = (object, k) => object.scale.setScalar(Math.max(0.001, k));
// a material's colour, somewhere between two
const shade = new THREE.Color();
const tint = (material, from, to, k) => material.color.setHex(from).lerp(shade.setHex(to), clamp01(k));
// a shake that never repeats in step: -1 .. 1
const jitter = (t, k = 0) => Math.sin(t * 37.1 + k * 5.3) * Math.sin(t * 23.3 + k * 2.1);
// a chain of joints, each `step` up (or down) the last: a sleeve, a hose
const chain = (parent, n, step, make) => {
  const joints = [];
  let p = parent;
  for (let j = 0; j < n; j++) { const joint = sub(p, 0, j ? step : 0, 0); make(joint, j); joints.push(joint); p = joint; }
  return joints;
};
// things that go round and round a cycle (sheets of paper, puffs of glitter): fn(mesh, 0 .. 1, k)
const cycle = (list, t, rate, fn) => list.forEach((m, k) => fn(m, (((t * rate + k / list.length) % 1) + 1) % 1, k));
// a word on a label (SEIZED, AUDIT, SURPRISE), as a material: plain `ground` where there is no canvas
// to draw on (headless checks), and a word is only a tell: each label reads by its colour and shape too
const lettered = (text, colour, ground, w = 256, h = 96) => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#' + ground.toString(16).padStart(6, '0');
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#' + colour.toString(16).padStart(6, '0');
    ctx.font = 'bold ' + Math.round(h * 0.62) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + h * 0.04, w * 0.9);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({ map });
  } catch { return glow(ground); }
};
// an Evil item: pose(t, agitated, furious, dt), the two weights 0 .. 1 easing as its state changes
const stated = (group, pose) => {
  const w = [1, 0, 0];
  let target = 0, last = null;
  group.userData.state = 0;
  group.userData.setState = (state, snap = false) => {
    target = Math.max(0, Math.min(2, Math.round(state) || 0));
    group.userData.state = target;
    if (snap) for (let i = 0; i < 3; i++) w[i] = i === target ? 1 : 0;
  };
  group.userData.animate = (t) => {
    const dt = last === null ? 0 : Math.min(0.1, Math.abs(t - last));
    last = t;
    for (let i = 0; i < 3; i++) w[i] += Math.max(-dt / TRANSITION, Math.min(dt / TRANSITION, (i === target ? 1 : 0) - w[i]));
    pose(t, w[1], w[2], dt);
  };
  group.userData.animate(0);
  return group;
};
// a Good item: it only idles
const idle = (group, pose) => {
  group.userData.animate = pose;
  pose(0);
  return group;
};

// ---- the shared pieces of the malicious ones ----------------------------------------------------
const SLEEVE = lambert(0x2b2f3a), CUFF = lambert(0xf4f1e8), SKIN = lambert(0xf0b48a), CARD = lambert(0xc8955a), PLANK = lambert(0xb07e45);
// a cuffed arm out of a hole, along its root's +z: a dark sleeve, a white cuff, a hand; `prop` hangs
// from the hand (a briefcase, a clipboard, a stamp). Wave the root
const arm = (parent, len = 0.3) => {
  const root = sub(parent);
  part(root, cyl(0.045, 0.052, len, 8), SLEEVE, 0, 0, len / 2, FLAT);
  part(root, cyl(0.056, 0.056, 0.05, 8), CUFF, 0, 0, len + 0.02, FLAT);
  const hand = sub(root, 0, 0, len + 0.1);
  part(hand, sphere(0.06, 8, 6), SKIN).scale.set(0.8, 1, 1.25);
  const prop = sub(hand, 0, -0.03, 0.03);
  return { root, hand, prop };
};
// a briefcase hanging from a hand: a leather box with a handle; its lid (hinged at the back) can open
const briefcase = (parent, colour = 0x6b3f22) => {
  const g = sub(parent, 0, -0.14, 0);
  const leather = lambert(colour), brass = lambert(0xd4a94a);
  part(g, box(0.26, 0.17, 0.07), leather, 0, 0, 0);
  part(g, torus(0.045, 0.012, 10, Math.PI), brass, 0, 0.09, 0);
  for (const x of [-0.08, 0.08]) part(g, box(0.03, 0.02, 0.075), brass, x, 0.07, 0);
  const lid = sub(g, 0, 0.085, -0.035);
  part(lid, box(0.26, 0.015, 0.07), leather, 0, 0.0075, 0.035);
  return { case: g, lid };
};
// a slatted wooden crate, w wide, h tall, d deep, standing on y = 0: a body with planks across its sides
const crate = (parent, w, h, d, body = CARD) => {
  const g = sub(parent);
  part(g, box(w, h, d), body, 0, h / 2, 0);
  const rows = Math.max(2, Math.round(h / 0.22));
  for (let r = 0; r < rows; r++) {
    const y = h * (r + 0.5) / rows;
    part(g, box(w + 0.02, h / rows * 0.55, d + 0.02), PLANK, 0, y, 0);
  }
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) part(g, box(0.05, h, 0.05), PLANK, x * (w / 2 - 0.01), h / 2, z * (d / 2 - 0.01));
  return g;
};
// a hole in a crate's side: a dark patch, so an arm comes out of somewhere
const hole = (parent, r = 0.075) => part(parent, new THREE.CircleGeometry(r, 10), glow(0x14100c));
// n sheets of paper, to fly: flat, white, tumbling
const sheets = (parent, n, material = sheetMat()) => Array.from({ length: n }, () => part(parent, plane(0.13, 0.17), material));
// paper flying up and out of a point: sheet k at u of its way, out to `reach`, up to `rise`, tumbling
const flutter = (sheet, u, k, t, reach, rise, weight) => {
  const a = k * 2.4 + Math.floor(t * 0.7 + k / 7) * 1.1;
  sheet.position.set(Math.sin(a) * reach * (0.2 + u), rise * (0.2 + u * 1.4 - u * u * 0.6) + Math.sin(t * 5 + k) * 0.03, Math.cos(a) * reach * (0.2 + u));
  sheet.rotation.set(t * 3 + k, t * 2.2 + k * 2, Math.sin(t * 4 + k) * 0.8);
  show(sheet, weight * (1 - u * 0.5));
};

// ---- C41 a crate of lawyers: one arm out of each of the crate's four sides, a briefcase in each hand,
// waving / flailing, the briefcases banging on the planks, a few sheets getting out / flailing wildly,
// the briefcases flung open, a blizzard of paper, the lid lifted on a hand waving a writ
const makeLawyers = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const W = 0.62, H = 0.62;
  for (const x of [-0.22, 0.22]) part(all, box(0.1, 0.06, W + 0.04), PLANK, x, 0.03, 0);
  const body = crate(all, W, H, W);
  body.position.y = 0.06;
  const lid = sub(all, 0, H + 0.06, -W / 2);
  part(lid, box(W + 0.06, 0.05, W + 0.06), PLANK, 0, 0.025, W / 2);
  const writArm = arm(lid, 0.26);
  writArm.root.position.set(0.05, 0.03, W / 2);
  writArm.root.rotation.x = -FLAT; // (straight up)
  const writ = part(writArm.prop, plane(0.2, 0.26), sheetMat(), 0, 0.12, 0.02, 0, 0, 0.1);
  part(writ, new THREE.CircleGeometry(0.03, 8), glow(0xc0202a), -0.05, -0.08, 0.002);
  for (let k = 0; k < 5; k++) part(writ, box(0.13, 0.01, 0.001), glow(0x5a5a66), 0.01, 0.1 - k * 0.04, 0.002);
  const arms = [0, 1, 2, 3].map(k => {
    const side = sub(all, 0, 0.06 + H * 0.55, 0);
    side.rotation.y = k * FLAT;
    hole(side, 0.08).position.set(0, 0, W / 2 + 0.012);
    const a = arm(side, 0.3);
    a.root.position.set(0, 0, W / 2 - 0.02);
    const bc = briefcase(a.prop, k % 2 ? 0x3a2a3c : 0x6b3f22);
    return { ...a, ...bc, k };
  });
  const paper = sheets(all, 18);
  return stated(group, (t, flail, rage) => {
    const calm = clamp01(1 - flail - rage), up = clamp01(flail + rage);
    arms.forEach((a, k) => {
      const w = 1 + flail * 3 + rage * 5, s = k * 1.7;
      a.root.rotation.set(
        -0.3 + Math.sin(t * 1.3 * w + s) * (0.25 + flail * 0.5 + rage * 0.8),
        Math.sin(t * 1.7 * w + s * 2) * (0.3 + flail * 0.55 + rage * 0.8),
        0);
      a.hand.rotation.z = Math.sin(t * 2 * w + s) * (0.3 + up * 0.6);
      a.case.rotation.x = Math.sin(t * 2.3 * w + s) * (0.15 + flail * 0.6 + rage * 0.9);
      a.lid.rotation.x = -rage * (0.9 + Math.abs(Math.sin(t * 9 + s)) * 0.8);
    });
    lid.rotation.x = -rage * (0.9 + Math.sin(t * 7) * 0.08);
    show(writArm.root, rage);
    writArm.root.rotation.set(-FLAT + Math.sin(t * 9) * 0.5 * rage, 0, Math.sin(t * 11) * 0.35);
    cycle(paper, t, mix(0.35, 0.9, rage), (s, u, k) => flutter(s, u, k, t, 0.55 + rage * 0.3, 0.55 + rage * 0.6, up * (k < 6 ? 1 : rage)));
    all.position.set(flail * jitter(t, 1) * 0.015 + rage * jitter(t, 2) * 0.03, rage * Math.abs(Math.sin(t * 10)) * 0.05, 0);
    all.rotation.z = flail * Math.sin(t * 12) * 0.02 + rage * Math.sin(t * 13) * 0.06 + calm * 0;
  });
};

// ---- C48 a chain letter: one envelope with a wax seal, standing on its stand / it has become five,
// fanned out and shuffling / dozens orbiting in a swarm, every one sprouting another
const makeChainletter = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const paper = lambert(0xf6efd8), flapMat = lambert(0xe8dfc2), wax = glow(0xb8101e);
  part(all, box(0.5, 0.05, 0.3), lambert(0x4a3525), 0, 0.025, 0);
  const envelope = (parent, w = 0.42, h = 0.28) => {
    const e = sub(parent);
    part(e, box(w, h, 0.02), paper);
    part(e, cone(w * 0.5, h * 0.55, 4), flapMat, 0, h * 0.22, 0.012, FLAT, 0, 0).scale.set(1.3, 1, 0.1);
    part(e, cyl(0.035, 0.035, 0.012, 10), wax, 0, -h * 0.05, 0.02, FLAT);
    for (let k = 0; k < 3; k++) part(e, box(w * 0.3, 0.012, 0.004), glow(0x7a7a88), -w * 0.2, -h * 0.25 - k * 0.025 + 0.05, 0.012);
    return e;
  };
  const one = envelope(all);
  one.position.set(0, 0.2, 0);
  one.rotation.x = -0.25;
  const fan = [1, 2, 3, 4].map(() => { const e = envelope(all); e.rotation.x = -0.25; return e; });
  const swarm = Array.from({ length: 14 }, (_, k) => { const e = envelope(all, 0.3, 0.2); e.userData.k = k; return e; });
  return stated(group, (t, shuffle, swarmed) => {
    const up = clamp01(shuffle + swarmed);
    one.rotation.set(-0.25 + Math.sin(t * 1.2) * 0.04 * (1 - up), Math.sin(t * 0.9) * 0.05, 0);
    one.position.y = 0.2 + swarmed * 0.3;
    fan.forEach((e, k) => {
      const d = k < 2 ? -(k + 1) : k - 1, lift = Math.sin(t * 6 + k * 1.7);
      show(e, shuffle + swarmed * 0.9);
      e.position.set(d * (0.17 + shuffle * 0.02 * lift + swarmed * 0.15), 0.2 + Math.abs(lift) * 0.03 * shuffle + swarmed * (0.3 + Math.sin(t * 2 + k) * 0.2), (k % 2 ? 0.03 : -0.03) + swarmed * d * 0.1);
      e.rotation.set(-0.25, d * 0.3 + swarmed * Math.sin(t * 2.5 + k) * 0.6, d * 0.08);
    });
    swarm.forEach((e) => {
      const k = e.userData.k, a = t * (0.8 + (k % 3) * 0.2) * (k % 2 ? 1 : -1) + k * 0.45, r = 0.3 + (k % 4) * 0.08;
      e.position.set(Math.sin(a) * r, 0.25 + ((k * 0.618) % 1) * 0.75 + Math.sin(t * 3 + k) * 0.05, Math.cos(a) * r);
      e.rotation.set(Math.sin(t * 2 + k) * 0.4, a + FLAT, Math.sin(t * 1.5 + k) * 0.3);
      const born = ((t * 0.5 + k / 14) % 1); // (each sprouts another: it swells from nothing, again and again)
      show(e, swarmed * (0.5 + Math.min(1, born * 3) * 0.5));
    });
    all.rotation.y = swarmed * Math.sin(t * 0.7) * 0.1;
  });
};

// ---- C49 a glitter bomb: a cheerful gift tube with a bow / shaking, puffs of glitter at its seams /
// the lid blown off, glitter erupting like a fountain and piling up round the tube
const makeGlitter = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const tubeMat = lambert(0xff6fa8), stripe = lambert(0xfff1b8), ribbon = lambert(0x3fc1ff);
  const tube = sub(all);
  part(tube, cyl(0.16, 0.16, 0.6, 18), tubeMat, 0, 0.3, 0);
  for (let k = 0; k < 4; k++) part(tube, cyl(0.163, 0.163, 0.05, 18), stripe, 0, 0.1 + k * 0.14, 0);
  part(tube, box(0.05, 0.6, 0.33), ribbon, 0, 0.3, 0);
  part(tube, box(0.33, 0.6, 0.05), ribbon, 0, 0.3, 0);
  const lid = sub(all, 0, 0.6, 0);
  part(lid, cyl(0.175, 0.175, 0.08, 18), tubeMat, 0, 0.04, 0);
  for (const d of [-1, 1]) part(lid, torus(0.07, 0.025, 12), ribbon, d * 0.07, 0.13, 0, 0, 0, d * 0.35).scale.set(1.2, 1, 0.5);
  part(lid, sphere(0.035, 8, 6), ribbon, 0, 0.11, 0);
  const sparkle = [0xffd23f, 0xff5fa0, 0x5fe0ff, 0xc7ff5f];
  const spark = (n, r) => Array.from({ length: n }, (_, k) => part(all, new THREE.OctahedronGeometry(r), glow(sparkle[k % 4])));
  const puffs = spark(14, 0.022), fountain = spark(36, 0.026);
  const pile = part(all, cyl(0.001, 0.34, 0.06, 18), glow(0xffd23f), 0, 0.03, 0);
  const piled = Array.from({ length: 16 }, (_, k) => part(all, new THREE.OctahedronGeometry(0.03), glow(sparkle[k % 4]), Math.sin(k * 2.4) * (0.2 + (k % 3) * 0.07), 0.04, Math.cos(k * 2.4) * (0.2 + (k % 3) * 0.07)));
  return stated(group, (t, shake, burst) => {
    const up = clamp01(shake + burst);
    all.rotation.z = Math.sin(t * 1.1) * 0.04 * (1 - up) + shake * jitter(t, 1) * 0.08 + burst * jitter(t, 2) * 0.05;
    all.position.x = shake * jitter(t, 3) * 0.02;
    tube.scale.set(1 + shake * Math.abs(Math.sin(t * 15)) * 0.06 + burst * 0.08, 1, 1 + shake * Math.abs(Math.sin(t * 15)) * 0.06 + burst * 0.08);
    lid.position.set(burst * 0.3, 0.6 + shake * Math.abs(Math.sin(t * 17)) * 0.03 + burst * (0.9 + Math.sin(t * 6) * 0.08), burst * 0.15);
    lid.rotation.set(burst * 0.6, burst * t * 2, burst * (2.3 + Math.sin(t * 5) * 0.3));
    cycle(puffs, t, 1.2, (p, u, k) => {
      const a = k * 1.9 + Math.floor(t * 1.2 + k / 14) * 0.7, y = k % 2 ? 0.6 : 0.11 + (k % 4) * 0.14;
      p.position.set(Math.sin(a) * (0.17 + u * 0.25), y + u * 0.15 - u * u * 0.3 + 0.06, Math.cos(a) * (0.17 + u * 0.25));
      p.rotation.set(t * 5, t * 3 + k, 0);
      show(p, shake * (1.2 - u) * (0.6 + Math.abs(Math.sin(t * 9 + k))));
    });
    cycle(fountain, t, 0.9, (p, u, k) => {
      const a = k * 2.4 + Math.floor(t * 0.9 + k / 36) * 1.3, r = 0.1 + u * (0.3 + (k % 5) * 0.1);
      p.position.set(Math.sin(a) * r, 0.62 + u * 1.9 - u * u * 1.9, Math.cos(a) * r);
      p.rotation.set(t * 6 + k, t * 4, k);
      show(p, burst * (1.3 - u * 0.6));
    });
    show(pile, burst);
    pile.position.y = 0.03 * burst;
    piled.forEach((p, k) => { show(p, burst); p.rotation.y = t * 2 + k; });
  });
};

// ---- C50 the recorder class: a school satchel with six recorders sticking out of it, a note drifting
// off / bobbing, sour notes / all six shrieking, the notes red and jagged, the satchel vibrating across the
// floor
const makeRecorders = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const leather = lambert(0x8a4a1e), strap = lambert(0x5a2e12), brass = lambert(0xd4a94a), cream = lambert(0xf5efdc), holeMat = glow(0x2a2018);
  const bag = sub(all);
  part(bag, box(0.5, 0.38, 0.2), leather, 0, 0.19, 0);
  part(bag, box(0.52, 0.17, 0.22), strap, 0, 0.3, 0);
  part(bag, box(0.12, 0.12, 0.03), strap, 0, 0.14, 0.11);
  part(bag, box(0.05, 0.05, 0.01), brass, 0, 0.14, 0.13);
  part(bag, torus(0.12, 0.02, 14, Math.PI), strap, 0, 0.38, -0.05);
  for (const z of [-0.06, 0.06]) part(bag, box(0.36, 0.12, 0.012), strap, 0, 0.06, z * 1.75);
  const recorders = [0, 1, 2, 3, 4, 5].map(k => {
    const r = sub(bag, -0.19 + k * 0.076, 0.36, (k % 2 ? 0.05 : -0.05));
    r.rotation.z = (k - 2.5) * 0.16;
    part(r, cyl(0.02, 0.026, 0.42, 8), cream, 0, 0.21, 0);
    part(r, cyl(0.025, 0.02, 0.05, 8), lambert(0xf8f8f4), 0, 0.44, 0);
    for (let n = 0; n < 4; n++) part(r, new THREE.CircleGeometry(0.008, 6), holeMat, 0, 0.12 + n * 0.07, 0.021);
    part(r, box(0.02, 0.015, 0.006), holeMat, 0, 0.39, 0.024);
    return r;
  });
  const noteMat = glow(0x3a3a48);
  const notes = Array.from({ length: 8 }, (_, k) => {
    const n = sub(all);
    part(n, sphere(0.028, 7, 5), noteMat).scale.set(1.2, 0.8, 1);
    part(n, box(0.012, 0.11, 0.012), noteMat, 0.03, 0.05, 0);
    part(n, box(0.05, 0.012, 0.012), noteMat, 0.05, 0.1, 0, 0, 0, -0.5);
    n.userData.k = k;
    return n;
  });
  const jagged = Array.from({ length: 6 }, (_, k) => {
    const j = sub(all);
    for (let s = 0; s < 4; s++) part(j, box(0.012, 0.06, 0.012), glow(0xff2a2a), s * 0.03 - 0.045, 0, 0, 0, 0, s % 2 ? 0.7 : -0.7);
    j.userData.k = k;
    return j;
  });
  return stated(group, (t, sour, shriek) => {
    const up = clamp01(sour + shriek);
    tint(noteMat, 0x3a3a48, 0xff2a2a, up);
    bag.position.set(shriek * Math.sin(t * 2.2) * 0.22 + shriek * jitter(t, 1) * 0.02, shriek * Math.abs(Math.sin(t * 22)) * 0.02, 0);
    bag.rotation.z = sour * jitter(t, 2) * 0.04 + shriek * jitter(t, 3) * 0.1;
    recorders.forEach((r, k) => {
      r.rotation.z = (k - 2.5) * 0.16 + Math.sin(t * (1.2 + up * 6) + k) * (0.04 + sour * 0.12 + shriek * 0.2) + shriek * jitter(t, k) * 0.08;
      r.position.y = 0.36 + Math.abs(Math.sin(t * (1 + up * 8) + k * 1.3)) * (0.02 + sour * 0.05 + shriek * 0.07);
    });
    cycle(notes, t, mix(0.3, 0.8, up), (n, u, k) => {
      const x = -0.19 + (k % 6) * 0.076;
      n.position.set(x + Math.sin(t * 3 + k) * 0.06 * (1 + sour), 0.8 + u * 0.6, Math.sin(k) * 0.08);
      n.rotation.z = sour * Math.sin(t * 7 + k) * 0.5 + shriek * jitter(t, k) * 0.6;
      show(n, (k < 2 ? 1 : up) * (1 - u) * (1 - shriek * 0.5));
    });
    cycle(jagged, t, 1.1, (j, u, k) => {
      j.position.set(-0.19 + k * 0.076 + Math.sin(t * 9 + k) * 0.05, 0.82 + u * 0.7, 0);
      j.rotation.z = jitter(t, k) * 0.6;
      show(j, shriek * (1.2 - u) * (1.2 + jitter(t, k + 3) * 0.5));
    });
  });
};

// ---- C54 a subpoena: one long scroll, rolled and sealed, on a cushion / unrolling by itself, the
// sheet growing / coiled round the crate like a snake, the seal for a head, rearing, still unrolling
const makeSubpoena = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const paper = lambert(0xf3ead2), paperSheet = sheetMat(0xf3ead2), ribbon = lambert(0xb8101e), waxMat = glow(0xb8101e);
  const crateW = 0.5;
  crate(all, crateW, 0.42, crateW);
  const cushion = part(all, box(0.36, 0.08, 0.22), lambert(0x5a2a7a), 0, 0.46, 0);
  const scroll = sub(all, 0, 0.56, 0);
  const roll = part(scroll, cyl(0.065, 0.065, 0.46, 12), paper, 0, 0, 0, 0, 0, FLAT);
  for (const x of [-0.24, 0.24]) part(scroll, cyl(0.03, 0.03, 0.04, 8), lambert(0xd8c7a0), x, 0, 0, 0, 0, FLAT);
  part(scroll, cyl(0.068, 0.068, 0.05, 12), ribbon, 0, 0, 0, 0, 0, FLAT);
  part(scroll, cyl(0.045, 0.045, 0.02, 10), waxMat, 0, 0, 0.07, FLAT); // (its seal)
  // unrolling: a sheet hanging from the scroll down the crate's front and across the ground
  const sheet = sub(scroll, 0, -0.04, crateW / 2 + 0.015); // (down the crate's front)
  part(sheet, plane(0.42, 0.26), paperSheet, 0, 0.02, -0.13, -FLAT); // (the stretch from the scroll to the edge)
  const drop = part(sheet, plane(0.42, 0.5), paperSheet, 0, -0.25, 0);
  const run = part(sheet, plane(0.42, 0.36), paperSheet, 0, -0.5, 0.18, -FLAT);
  for (let k = 0; k < 6; k++) part(drop, box(0.26, 0.012, 0.001), glow(0x6a6a7a), 0, 0.18 - k * 0.06, 0.002);
  // the snake: the paper coiled round the crate, a head of wax rearing off the top
  const snake = sub(all);
  const N = 22, coils = Array.from({ length: N }, (_, k) => {
    const a = k * 0.5, r = crateW * 0.72 + 0.03;
    const seg = part(snake, box(0.2, 0.012, 0.18), paperSheet, Math.sin(a) * r, 0.06 + k * 0.036, Math.cos(a) * r, 0.12, a, 0.1);
    return seg;
  });
  const head = sub(snake, Math.sin(N * 0.5) * (crateW * 0.72 + 0.03), 0.06 + N * 0.036, Math.cos(N * 0.5) * (crateW * 0.72 + 0.03));
  const neck = sub(head);
  part(neck, box(0.2, 0.012, 0.24), paperSheet, 0, 0.08, 0, -1.1);
  const face = sub(neck, 0, 0.18, 0.08);
  part(face, cyl(0.05, 0.05, 0.03, 12), waxMat, 0, 0, 0, 0.6);
  for (const x of [-0.022, 0.022]) part(face, sphere(0.011, 6, 5), glow(0x1a1010), x, 0.015, 0.022);
  const tongue = part(face, box(0.008, 0.003, 0.08), glow(0xff5a7a), 0, -0.02, 0.06, 0.3);
  const loose = sheets(all, 8, paperSheet);
  return stated(group, (t, unroll, coiled) => {
    const calm = clamp01(1 - unroll - coiled);
    scroll.rotation.z = Math.sin(t * 1.5) * 0.05 * calm;
    scroll.position.y = 0.56 + Math.abs(Math.sin(t * 2.2)) * 0.03 * unroll;
    roll.scale.set(1 - unroll * 0.35 - coiled * 0.3, 1, 1 - unroll * 0.35 - coiled * 0.3);
    show(cushion, 1 - coiled * 0.999);
    show(scroll, 1 - coiled);
    // the sheet grows down the front and along the ground
    const grown = unroll * (0.6 + Math.min(1, (t % 6) / 4) * 0.4);
    sheet.scale.set(Math.max(0.001, grown), Math.max(0.001, grown), Math.max(0.001, grown));
    drop.rotation.y = Math.sin(t * 2) * 0.04 * unroll;
    run.position.z = 0.18 + Math.sin(t * 1.7) * 0.03;
    show(snake, coiled);
    coils.forEach((seg, k) => { seg.position.y = 0.06 + k * 0.036 + coiled * Math.sin(t * 4 - k * 0.5) * 0.015; seg.rotation.z = 0.1 + Math.sin(t * 4 - k * 0.5) * 0.08; });
    head.position.y = 0.06 + N * 0.036 + Math.sin(t * 4 - N * 0.5) * 0.015;
    neck.rotation.set(Math.sin(t * 2.3) * 0.25, Math.sin(t * 1.6) * 0.6, Math.sin(t * 3.1) * 0.15);
    face.rotation.y = Math.sin(t * 2.7) * 0.5;
    tongue.scale.z = 0.5 + Math.abs(Math.sin(t * 11)) * 0.8;
    cycle(loose, t, 0.5, (s, u, k) => flutter(s, u, k, t, 0.45, 0.6, coiled * (k < 4 ? 1 : 0.6)));
    all.rotation.z = coiled * Math.sin(t * 9) * 0.02;
  });
};

// ---- C42 a box of telemarketers: a cardboard box, headset microphones poking out of its flaps /
// hands thrust phone handsets out of the flaps, the cords tangling / a forest of ringing phones on
// springing cords, speech bubbles of LIMITED OFFER
const makeTelemarketers = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const tape = lambert(0xa0773c), black = lambert(0x1e1e24), handsetMat = lambert(0xf4f4f0), cordMat = lambert(0x2a2a30);
  const W = 0.62, H = 0.42;
  part(all, box(W, H, 0.5), CARD, 0, H / 2, 0);
  part(all, box(W + 0.01, 0.06, 0.5 + 0.01), tape, 0, H * 0.5, 0);
  const flaps = [-1, 1].map(d => { const f = sub(all, d * W / 2, H, 0); part(f, box(W / 2 + 0.01, 0.02, 0.5), CARD, -d * W / 4, 0.01, 0); f.rotation.z = d * 0.5; return f; });
  for (const z of [-1, 1]) part(all, box(W, 0.02, 0.1), CARD, 0, H, z * 0.2);
  // the headsets: a black arc with a foam tip, poking up from the gap
  const headsets = [0, 1, 2].map(k => {
    const h = sub(all, -0.15 + k * 0.15, H - 0.02, (k % 2 ? 0.05 : -0.05));
    part(h, torus(0.09, 0.012, 14, Math.PI), black, 0, 0, 0);
    part(h, box(0.01, 0.01, 0.07), black, 0.085, -0.02, 0.03, 0, 0.6, 0);
    part(h, sphere(0.022, 7, 5), black, 0.075, -0.03, 0.07);
    return h;
  });
  // a phone handset in a hand, on a cord: hands out of the flaps' gap at the top
  const handset = (parent) => {
    const g = sub(parent);
    part(g, box(0.2, 0.035, 0.04), handsetMat, 0, 0.04, 0);
    for (const x of [-0.09, 0.09]) part(g, sphere(0.04, 8, 6), handsetMat, x, 0.02, 0).scale.set(1, 0.9, 1.2);
    return g;
  };
  const phones = [0, 1, 2, 3].map(k => {
    const root = sub(all, -0.2 + k * 0.13, H - 0.05, k % 2 ? 0.08 : -0.08);
    const a = arm(root, 0.24);
    a.root.rotation.x = -FLAT;
    const set = handset(a.prop);
    set.position.set(0, 0.05, 0);
    const cord = part(root, torus(0.06, 0.012, 10, Math.PI * 1.5), cordMat, (k % 2 ? 0.1 : -0.1), 0.1, 0, 0, 0, k);
    return { root, a, set, cord, k };
  });
  // the forest: handsets up on springing cords (coils), and the speech bubbles
  const springs = [0, 1, 2, 3, 4].map(k => {
    const root = sub(all, -0.22 + k * 0.11, H, (k % 2 ? 0.1 : -0.1));
    const coil = [0, 1, 2, 3, 4, 5].map(j => part(root, torus(0.04, 0.01, 8), cordMat, 0, 0.05 + j * 0.09, 0, FLAT));
    const set = handset(root);
    set.position.y = 0.58;
    return { root, coil, set, k };
  });
  const bubbleMat = lettered('LIMITED OFFER', 0xd81e2a, 0xffffff, 256, 80);
  const bubbles = [0, 1, 2].map(k => {
    const b = sub(all);
    part(b, box(0.36, 0.12, 0.012), bubbleMat);
    part(b, cone(0.03, 0.08, 4), glow(0xffffff), -0.1, -0.09, 0, Math.PI);
    b.userData.k = k;
    return b;
  });
  return stated(group, (t, thrust, forest) => {
    const up = clamp01(thrust + forest), calm = clamp01(1 - up);
    headsets.forEach((h, k) => { h.position.y = H - 0.02 + Math.sin(t * 1.6 + k * 2) * 0.03 * calm; h.rotation.z = Math.sin(t * 1.1 + k) * 0.12; show(h, 1 - up * 0.9); });
    flaps.forEach((f, k) => { f.rotation.z = (k ? 1 : -1) * (0.5 + thrust * 0.4 + forest * 0.9) + jitter(t, k) * 0.05 * up; });
    phones.forEach((p) => {
      show(p.root, thrust);
      p.a.root.rotation.set(-FLAT + Math.sin(t * 4 + p.k * 2) * 0.35, 0, Math.sin(t * 3.3 + p.k) * 0.4);
      p.set.rotation.set(0, 0, Math.sin(t * 5 + p.k) * 0.4);
      p.cord.rotation.y = t * 2 + p.k;
    });
    springs.forEach((s) => {
      show(s.root, forest);
      const bounce = Math.abs(Math.sin(t * 7 + s.k * 1.3));
      s.coil.forEach((c, j) => { c.position.y = 0.05 + j * (0.07 + bounce * 0.05); c.position.x = Math.sin(t * 9 + j + s.k) * 0.015; });
      s.set.position.set(Math.sin(t * 9 + s.k) * 0.03, 0.42 + bounce * 0.32, 0);
      s.set.rotation.z = Math.sin(t * 18 + s.k) * 0.4 * forest; // (ringing: it shivers)
    });
    bubbles.forEach((b) => {
      const k = b.userData.k, u = ((t * 0.6 + k / 3) % 1);
      b.position.set(-0.35 + k * 0.32, 0.95 + u * 0.3 + (k % 2) * 0.12, 0.15 - (k % 2) * 0.3);
      b.rotation.y = Math.sin(t * 2 + k) * 0.3;
      show(b, forest * Math.min(1, u * 5) * (1 - u * 0.6));
    });
    all.position.set(thrust * jitter(t, 1) * 0.012 + forest * jitter(t, 2) * 0.025, forest * Math.abs(Math.sin(t * 9)) * 0.04, 0);
    all.rotation.z = up * Math.sin(t * 11) * 0.03;
  });
};

// ---- C43 a sack of tax inspectors: a mail sack with a bowler hat on top and a calculator tape trailing
// out / arms out with clipboards and a magnifying glass, the tape spooling / rubber stamps hammering
// AUDIT on everything in reach, red tape flying in loops
const makeTaxmen = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const sackMat = lambert(0x8d8372), rope = lambert(0xd2b98a), black = lambert(0x1a1a1e), tapeMat = sheetMat(0xffffff), red = lambert(0xd81e2a);
  const sack = sub(all);
  part(sack, new THREE.LatheGeometry([[0.02, 0], [0.3, 0.02], [0.33, 0.25], [0.28, 0.5], [0.16, 0.66], [0.14, 0.72], [0.17, 0.78]].map(([r, y]) => new THREE.Vector2(r, y)), 16), sackMat);
  part(sack, torus(0.145, 0.02, 12), rope, 0, 0.7, 0, FLAT);
  part(sack, box(0.02, 0.12, 0.02), rope, 0.15, 0.64, 0.05, 0, 0, 0.4);
  const hat = sub(sack, 0.03, 0.78, 0);
  part(hat, cyl(0.14, 0.15, 0.12, 14), black, 0, 0.06, 0);
  part(hat, torus(0.17, 0.025, 16), black, 0, 0.01, 0, FLAT);
  part(hat, cyl(0.151, 0.151, 0.025, 14), lambert(0x3a3a48), 0, 0.03, 0);
  // the tape: a white strip curling out of the neck and down the side
  const tape = sub(sack, -0.1, 0.7, 0.1);
  const tapeBits = Array.from({ length: 10 }, () => part(tape, plane(0.08, 0.09), tapeMat));
  // arms: clipboards and a magnifying glass
  const clipboard = (parent) => {
    const g = sub(parent, 0, -0.1, 0.04);
    part(g, box(0.16, 0.22, 0.012), lambert(0x6b4a2a));
    part(g, box(0.14, 0.18, 0.004), glow(0xfbf7ea), 0, -0.01, 0.008);
    part(g, box(0.06, 0.03, 0.02), lambert(0x9a9aa6), 0, 0.1, 0.008);
    for (let k = 0; k < 4; k++) part(g, box(0.1, 0.008, 0.001), glow(0x8a8a9a), 0, 0.05 - k * 0.035, 0.011);
    return g;
  };
  const arms = [[-1, 0.45, 0], [1, 0.42, 0], [0, 0.5, 1]].map(([d, y, z], k) => {
    const root = sub(sack, d * 0.26, y, z ? 0.26 : 0);
    root.rotation.y = z ? 0 : d * FLAT;
    const a = arm(root, 0.26);
    if (k < 2) clipboard(a.prop);
    else { // (the magnifying glass)
      const g = sub(a.prop, 0, 0.02, 0.06);
      part(g, torus(0.07, 0.014, 14), black, 0, 0.08, 0);
      part(g, new THREE.CircleGeometry(0.065, 14), haze(0xbfe6ff, 0.45), 0, 0.08, 0);
      part(g, box(0.02, 0.1, 0.02), black, 0, 0, 0);
    }
    return { root, a, k };
  });
  // the stamps: two arms hammering down, and the AUDIT marks they leave
  const auditMat = lettered('AUDIT', 0xffffff, 0xd81e2a, 192, 72);
  const stamps = [-1, 1].map((d, k) => {
    const root = sub(sack, d * 0.1, 0.72, 0);
    const a = arm(root, 0.22);
    const block = sub(a.prop, 0, 0.02, 0.03);
    part(block, cyl(0.035, 0.03, 0.09, 8), lambert(0x6b4a2a), 0, 0.03, 0);
    part(block, box(0.11, 0.025, 0.07), red, 0, -0.03, 0);
    return { root, a, k, d };
  });
  const marks = Array.from({ length: 7 }, (_, k) => {
    const a = k * 0.9 + 0.3, y = 0.12 + (k % 4) * 0.13, r = 0.33 - Math.abs(y - 0.25) * 0.3 + 0.012;
    const m = part(sack, plane(0.16, 0.06), auditMat, Math.sin(a) * r, y, Math.cos(a) * r, 0, a, (k % 2 ? 0.3 : -0.3));
    m.userData.k = k;
    return m;
  });
  const loops = Array.from({ length: 6 }, (_, k) => { const l = part(all, torus(0.1 + (k % 3) * 0.04, 0.01, 16), red); l.userData.k = k; return l; });
  return stated(group, (t, spool, audit) => {
    const up = clamp01(spool + audit);
    sack.rotation.z = Math.sin(t * 1.3) * 0.03 + spool * jitter(t, 1) * 0.04 + audit * jitter(t, 2) * 0.08;
    sack.position.y = audit * Math.abs(Math.sin(t * 8)) * 0.04;
    hat.rotation.set(Math.sin(t * 1.1) * 0.05 + audit * Math.sin(t * 9) * 0.2, 0, 0.1 + up * Math.sin(t * 7) * 0.25);
    hat.position.y = 0.78 + up * Math.abs(Math.sin(t * 6)) * 0.06;
    // the tape: it spools down and along as it goes
    tapeBits.forEach((bit, k) => {
      const len = 0.3 + spool * 0.7 + audit * 0.8, u = k / 10, along = u * len, bend = Math.min(1, along / 0.5);
      bit.position.set(-along * 0.2, -along * (0.9 - bend * 0.5) + Math.sin(t * 3 + k) * 0.01 * up, along * 0.35 + spool * Math.sin(t * 2 + k) * 0.03);
      bit.rotation.set(-0.5 - bend * 0.9, 0.2, 0);
      show(bit, u < len ? 1 : 0.001);
    });
    arms.forEach((p) => {
      show(p.root, up);
      p.a.root.rotation.set(-0.4 + Math.sin(t * (2 + audit * 4) + p.k * 2) * (0.25 + audit * 0.4), Math.sin(t * 1.7 + p.k) * 0.3, 0);
    });
    stamps.forEach((st) => {
      show(st.root, audit);
      const hit = Math.pow(Math.abs(Math.sin(t * 6 + st.k * 1.57)), 3);
      st.a.root.rotation.set(-FLAT + 0.7 + hit * 1.6, 0, st.d * (0.4 + Math.sin(t * 2.5 + st.k) * 0.3));
    });
    marks.forEach((m) => { const k = m.userData.k; show(m, audit * (((t * 0.8 + k / 7) % 1) < 0.85 ? 1 : 0.001)); });
    cycle(loops, t, 0.4, (l, u, k) => {
      const a = k * 1.7 + t * 1.2;
      l.position.set(Math.sin(a) * (0.3 + u * 0.3), 0.3 + u * 0.8, Math.cos(a) * (0.3 + u * 0.3));
      l.rotation.set(t * 2 + k, t * 1.5, 0);
      show(l, audit * (1.1 - u));
    });
  });
};

// ---- C44 a crate of bailiffs: a crate with a clipboard chained to it and one SEIZED sticker / hands
// out slapping SEIZED stickers on the crate itself / stickers on everything, the lid up, and a hand
// dragging the customer's garden gnome into the crate
const makeBailiffs = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const W = 0.64, H = 0.56;
  const body = crate(all, W, H, W, lambert(0xb5925c));
  const lid = sub(all, 0, H, -W / 2);
  part(lid, box(W + 0.05, 0.05, W + 0.05), PLANK, 0, 0.025, W / 2);
  const seizedMat = lettered('SEIZED', 0xd81e2a, 0xffe24a, 192, 64);
  const sticker = (parent, x, y, z, ry, rz = 0) => part(parent, plane(0.2, 0.07), seizedMat, x, y, z, 0, ry, rz);
  sticker(body, 0.08, 0.36, W / 2 + 0.012, 0, -0.15);
  // the clipboard on its chain, hanging off the front
  const chain = Array.from({ length: 5 }, (_, k) => part(body, torus(0.018, 0.006, 8), lambert(0x8a8a96), -0.22, H - 0.03 - k * 0.03, W / 2 + 0.02, k % 2 ? FLAT : 0, 0, 0));
  const clip = sub(body, -0.22, H - 0.18, W / 2 + 0.025);
  part(clip, box(0.12, 0.17, 0.01), lambert(0x6b4a2a));
  part(clip, box(0.1, 0.14, 0.004), glow(0xfbf7ea), 0, -0.01, 0.007);
  part(clip, box(0.05, 0.025, 0.015), lambert(0x9a9aa6), 0, 0.075, 0.006);
  // the stickers that appear: round the crate, then on the lid too, everywhere
  const more = [[0.2, 0.15, 0], [-0.1, 0.2, 1], [0.15, 0.4, 2], [-0.15, 0.12, 3], [0.05, 0.45, 1], [-0.2, 0.3, 2], [0.2, 0.28, 3], [-0.05, 0.08, 0]].map(([x, y, side], k) => {
    const g = sub(body);
    g.rotation.y = side * FLAT;
    const st = sticker(g, x, y, W / 2 + 0.012 + (k % 3) * 0.002, 0, (k % 2 ? 0.25 : -0.2));
    st.userData.k = k;
    return st;
  });
  const lidStickers = [0, 1, 2].map(k => { const st = sticker(lid, -0.15 + k * 0.17, 0.052, W / 2 + (k % 2) * 0.12, 0, 0); st.rotation.x = -FLAT; st.rotation.z = k * 0.5; return st; });
  // the slapping hands, out of the sides
  const hands = [[1, 0.3], [-1, 0.38]].map(([d, y], k) => {
    const root = sub(all, d * (W / 2 - 0.02), y, 0.1);
    root.rotation.y = d * FLAT;
    hole(root, 0.075).position.z = 0.03;
    const a = arm(root, 0.22);
    return { root, a, k, d };
  });
  // the gnome, dragged in by a hand over the lid
  const dragger = sub(all, 0.1, H - 0.02, 0.1);
  const drag = arm(dragger, 0.3);
  drag.root.rotation.x = -FLAT;
  const gnome = sub(drag.prop, 0, 0.04, 0.05);
  part(gnome, cone(0.07, 0.2, 10), lambert(0xd81e2a), 0, 0.3, 0);
  part(gnome, sphere(0.06, 10, 8), SKIN, 0, 0.17, 0);
  part(gnome, sphere(0.065, 10, 8), lambert(0xfafafa), 0, 0.1, 0.02).scale.set(1, 1.3, 0.8);
  part(gnome, cyl(0.07, 0.09, 0.2, 10), lambert(0x2a5ab8), 0, 0.0, 0);
  part(gnome, sphere(0.02, 7, 5), lambert(0xff8a8a), 0, 0.17, 0.06);
  return stated(group, (t, slap, seized) => {
    const up = clamp01(slap + seized);
    clip.rotation.z = Math.sin(t * 1.4) * 0.05 + up * Math.sin(t * 6) * 0.2;
    chain.forEach((c, k) => { c.rotation.z = up * Math.sin(t * 6 + k) * 0.2; });
    more.forEach((st) => { const k = st.userData.k; show(st, k < 4 ? slap * (((t * 0.5 + k / 4) % 1) < 0.9 ? 1 : 0) + seized : seized); });
    lidStickers.forEach((st) => show(st, seized));
    hands.forEach((h) => {
      show(h.root, slap + seized * 0.9);
      const hit = Math.pow(Math.abs(Math.sin(t * 5 + h.k * 1.3)), 2);
      h.a.root.rotation.set(0.2 - hit * 0.5, 0, (h.d > 0 ? 1 : -1) * (-0.6 + hit * 1.3));
      h.a.hand.rotation.x = -0.6 - hit * 0.5;
    });
    lid.rotation.x = -seized * (0.7 + Math.sin(t * 5) * 0.06);
    show(dragger, seized);
    drag.root.rotation.set(-FLAT + 0.5 + Math.sin(t * 4) * 0.25, 0, 0.3 + Math.sin(t * 3) * 0.2);
    gnome.rotation.set(0.4 + Math.sin(t * 5) * 0.3, Math.sin(t * 2) * 0.5, 0.3 + Math.sin(t * 4) * 0.2); // (the gnome struggling)
    all.position.set(slap * jitter(t, 1) * 0.012 + seized * jitter(t, 2) * 0.02, seized * Math.abs(Math.sin(t * 8)) * 0.03, 0);
    all.rotation.z = up * Math.sin(t * 10) * 0.025;
  });
};

// ---- C47 parking wardens in a van-shaped box: a small cardboard box cut like a van, a peaked cap
// resting on it / a hand out of each side writing tickets / tickets fired like confetti, a wheel clamp
// snapping at the air out of the roof
const makeWardens = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const van = sub(all);
  const navy = lambert(0x1e2a5a), ticketMat = sheetMat(0xfff07a), ticketLine = glow(0x9a3a2a), glass = lambert(0x8bb8d8);
  part(van, box(0.5, 0.36, 0.7), CARD, 0, 0.28, -0.05); // (the body)
  part(van, box(0.5, 0.26, 0.2), CARD, 0, 0.23, 0.35); // (the bonnet)
  part(van, box(0.48, 0.14, 0.02), glass, 0, 0.37, 0.3, -0.5); // (the windscreen drawn on)
  for (const x of [-0.251, 0.251]) part(van, box(0.02, 0.12, 0.3), glass, x, 0.33, 0.05); // (side windows)
  for (const [x, z] of [[-0.26, 0.25], [0.26, 0.25], [-0.26, -0.25], [0.26, -0.25]]) part(van, cyl(0.09, 0.09, 0.03, 12), lambert(0x2a2a30), x, 0.1, z, 0, 0, FLAT);
  for (const x of [-0.12, 0.12]) part(van, new THREE.CircleGeometry(0.035, 10), glow(0xfff3c0), x, 0.3, 0.451);
  const cap = sub(van, 0, 0.46, -0.1);
  part(cap, cyl(0.13, 0.12, 0.08, 14), navy, 0, 0.04, 0);
  part(cap, cyl(0.135, 0.135, 0.015, 14), lambert(0xffe24a), 0, 0.045, 0);
  part(cap, box(0.2, 0.012, 0.1), lambert(0x101018), 0, 0.005, 0.15, 0.15);
  part(cap, cyl(0.03, 0.03, 0.006, 8), lambert(0xd4a94a), 0, 0.05, 0.125, FLAT);
  // a hand out of each side, a ticket pad in it, the pen scribbling
  const writers = [-1, 1].map((d, k) => {
    const root = sub(van, d * 0.25, 0.22, 0.05);
    root.rotation.y = d * FLAT;
    hole(root, 0.07).position.z = 0.003;
    const a = arm(root, 0.2);
    const pad = sub(a.prop, 0, 0.01, 0.04);
    part(pad, box(0.1, 0.012, 0.14), ticketMat, 0, 0, 0, 0, 0, 0);
    for (let n = 0; n < 3; n++) part(pad, box(0.06, 0.002, 0.008), ticketLine, 0, 0.007, -0.04 + n * 0.035);
    const pen = part(pad, cyl(0.006, 0.006, 0.12, 6), lambert(0x101018), 0.03, 0.04, 0, 0.5, 0, 0.5);
    return { root, a, pad, pen, k, d };
  });
  const tickets = Array.from({ length: 16 }, () => { const tk = part(all, plane(0.07, 0.1), ticketMat); part(tk, box(0.04, 0.006, 0.001), ticketLine, 0, 0.02, 0.001); part(tk, box(0.04, 0.006, 0.001), ticketLine, 0, -0.01, 0.001); return tk; });
  // the clamp: a yellow ring with a jaw that snaps, up out of the roof
  const clampRoot = sub(van, 0, 0.46, -0.1);
  const clampArm = arm(clampRoot, 0.22);
  clampArm.root.rotation.x = -FLAT;
  const clamp = sub(clampArm.prop, 0, 0.1, 0);
  const yellow = lambert(0xffd23f);
  part(clamp, torus(0.1, 0.03, 14, Math.PI * 1.3), yellow, 0, 0, 0, 0, 0, 0.9);
  part(clamp, box(0.12, 0.05, 0.05), yellow, 0.1, -0.06, 0);
  const jaw = sub(clamp, -0.08, 0.06, 0);
  part(jaw, torus(0.1, 0.03, 10, Math.PI * 0.6), yellow, 0.08, -0.06, 0, 0, 0, 2.2);
  part(jaw, box(0.1, 0.05, 0.05), lambert(0xd81e2a), 0.02, 0.03, 0);
  return stated(group, (t, write, fire) => {
    const up = clamp01(write + fire);
    cap.rotation.set(Math.sin(t * 0.9) * 0.04, 0.3, 0.08 + up * Math.sin(t * 6) * 0.15);
    cap.position.set(0, 0.46 + fire * 0.12 + up * Math.abs(Math.sin(t * 7)) * 0.04, -0.1 - fire * 0.22);
    cap.scale.setScalar(1 - fire * 0.2 + 0.001);
    writers.forEach((w) => {
      show(w.root, up);
      w.a.root.rotation.set(-0.5 + Math.sin(t * 2 + w.k) * 0.1 * write + fire * Math.sin(t * 7 + w.k) * 0.5, 0, w.d * (0.2 + fire * Math.sin(t * 5 + w.k * 2) * 0.5));
      w.pen.position.set(0.03 + Math.sin(t * 14 + w.k) * 0.02 * write, 0.04, Math.cos(t * 11 + w.k) * 0.03 * write);
      w.pen.rotation.x = 0.5 + Math.sin(t * 14) * 0.2;
    });
    cycle(tickets, t, 0.8, (tk, u, k) => {
      const a = k * 1.3 + Math.floor(t * 0.8 + k / 16) * 0.9, side = k % 2 ? 1 : -1;
      tk.position.set(side * (0.25 + u * 0.7) * Math.abs(Math.cos(a * 0.5)), 0.25 + u * 1.1 - u * u * 0.9, Math.sin(a) * (0.1 + u * 0.5));
      tk.rotation.set(t * 4 + k, t * 3, Math.sin(t * 5 + k));
      show(tk, fire * (1.2 - u * 0.7));
    });
    show(clampRoot, fire);
    clampArm.root.rotation.set(-FLAT + Math.sin(t * 3) * 0.3, 0, Math.sin(t * 2.3) * 0.4);
    clamp.rotation.y = Math.sin(t * 1.7) * 0.8;
    jaw.rotation.z = Math.pow(Math.abs(Math.sin(t * 6)), 3) * 1.1;
    van.position.set(write * jitter(t, 1) * 0.01 + fire * jitter(t, 2) * 0.02, fire * Math.abs(Math.sin(t * 9)) * 0.03, 0);
    van.rotation.z = up * Math.sin(t * 9) * 0.02;
  });
};

// ---- C51 a crate of consultants: a crate labelled SYNERGY, a laser pointer's dot wandering over it /
// hands push out a flip-chart and sticky notes / sticky notes plastered over the crate, a pie chart
// spinning above it, an invoice unrolling out of the side
const makeConsultants = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const W = 0.6, H = 0.6;
  const body = crate(all, W, H, W, lambert(0xc6a16a));
  part(body, plane(0.42, 0.13), lettered('SYNERGY', 0xffffff, 0x1f5fd0, 256, 80), 0, 0.36, W / 2 + 0.012);
  const dot = part(body, new THREE.CircleGeometry(0.018, 8), glow(0xff2020), 0, 0.3, W / 2 + 0.014);
  const noteColours = [0xfff176, 0xff9ad5, 0x9df0a0, 0x8fd8ff];
  const note = (parent, x, y, z, ry, k) => part(parent, plane(0.09, 0.09), lambert(noteColours[k % 4], { side: THREE.DoubleSide }), x, y, z, 0, ry, (k % 3 - 1) * 0.2);
  // the flip-chart: a sheet on a pole, pushed up out of the lid by a hand
  const chartRoot = sub(all, -0.12, H - 0.02, 0);
  const chartArm = arm(chartRoot, 0.22);
  chartArm.root.rotation.x = -FLAT;
  const chart = sub(chartArm.prop, 0, 0.05, 0);
  part(chart, cyl(0.012, 0.012, 0.5, 6), lambert(0x8a8a96), 0, 0.2, 0);
  const sheet = part(chart, plane(0.32, 0.26), sheetMat(0xffffff), 0, 0.32, 0.02);
  for (let k = 0; k < 3; k++) part(sheet, box(0.2 - k * 0.04, 0.012, 0.001), glow(0x1f5fd0), -0.03 - k * 0.02, 0.06 - k * 0.06, 0.002);
  part(sheet, box(0.16, 0.012, 0.001), glow(0xd81e2a), 0.02, 0, 0.002, 0, 0, 0.55); // (the line that goes up)
  // notes pushed out by a hand at the side, and the plastering
  const noteRoot = sub(all, W / 2 - 0.02, 0.4, 0.1);
  noteRoot.rotation.y = FLAT;
  hole(noteRoot, 0.075).position.z = 0.03;
  const noteArm = arm(noteRoot, 0.2);
  const held = [0, 1, 2].map(k => note(noteArm.prop, 0, 0.02 + k * 0.012, 0.04 + k * 0.004, 0, k));
  const plastered = Array.from({ length: 22 }, (_, k) => {
    const g = sub(body);
    g.rotation.y = (k % 4) * FLAT;
    const n = note(g, -0.2 + ((k * 0.37) % 1) * 0.4, 0.08 + ((k * 0.61) % 1) * 0.45, W / 2 + 0.014 + (k % 3) * 0.002, 0, k);
    n.userData.k = k;
    return n;
  });
  const lidNotes = [0, 1, 2, 3].map(k => { const n = note(all, -0.18 + k * 0.12, H + 0.014, (k % 2 ? 0.1 : -0.1), 0, k); n.rotation.x = -FLAT; return n; });
  // the pie chart, held up above, and the invoice out of the other side
  const pie = sub(all, 0.1, H + 0.5, 0);
  const wedges = [[0, 2.4, 0x1f5fd0], [2.4, 1.6, 0xff8a2a], [4.0, 1.4, 0x9df0a0], [5.4, 0.88, 0xd81e2a]];
  for (const [from, len, colour] of wedges) part(pie, new THREE.CylinderGeometry(0.2, 0.2, 0.04, 16, 1, false, from, len), lambert(colour), 0, 0, 0);
  const pieArm = arm(sub(all, 0.1, H - 0.02, 0), 0.24);
  pieArm.root.rotation.x = -FLAT;
  const invoice = sub(all, -W / 2 - 0.01, 0, 0);
  const invoiceBits = Array.from({ length: 8 }, (_, k) => { const b = part(invoice, plane(0.14, 0.12), sheetMat(0xffffff)); if (k % 2) part(b, box(0.09, 0.008, 0.001), glow(0x5a5a66), 0, 0, 0.001); return b; });
  const total = part(invoice, plane(0.14, 0.06), lettered('$$$$', 0xd81e2a, 0xffffff, 128, 56));
  return stated(group, (t, push, over) => {
    const up = clamp01(push + over);
    dot.position.set(Math.sin(t * 1.7) * 0.2 + Math.sin(t * 5.3) * 0.04, 0.3 + Math.sin(t * 2.3) * 0.15, W / 2 + 0.014);
    show(dot, 1 + over);
    show(chartRoot, up);
    chartArm.root.rotation.set(-FLAT + Math.sin(t * 2.5) * 0.15 * (1 + over), 0, Math.sin(t * 1.8) * 0.2 * (1 + over));
    sheet.rotation.x = Math.sin(t * 3) * 0.08;
    show(noteRoot, up);
    noteArm.root.rotation.set(-0.3 + Math.sin(t * (2 + over * 4)) * (0.3 + over * 0.4), 0, Math.sin(t * 1.6) * 0.2);
    held.forEach((n, k) => { n.position.y = 0.02 + k * 0.012 + Math.abs(Math.sin(t * 7 + k)) * 0.03 * up; });
    plastered.forEach((n) => { const k = n.userData.k; show(n, k < 6 ? push * (((t * 0.6 + k / 6) % 1) < 0.9 ? 1 : 0) + over : over); });
    lidNotes.forEach((n) => show(n, over));
    show(pie, over);
    show(pieArm.root, over);
    pieArm.root.rotation.set(-FLAT + Math.sin(t * 2) * 0.2, 0, Math.sin(t * 1.5) * 0.2);
    pie.position.set(0.1 + Math.sin(t * 1.5) * 0.06, H + 0.42 + Math.sin(t * 2) * 0.05, 0);
    pie.rotation.set(0.5 + Math.sin(t * 1.5) * 0.2, t * 3, 0);
    // the invoice: down the side and along the ground, growing
    const len = over * (0.5 + Math.min(1, (t % 5) / 3.5) * 0.5);
    invoiceBits.forEach((b, k) => {
      const along = k * 0.12;
      if (along < 0.24) { b.position.set(-0.002, 0.3 - along, 0); b.rotation.set(0, -FLAT, 0); }
      else { b.position.set(-(along - 0.24) - 0.06, 0.004, 0); b.rotation.set(-FLAT, 0, 0); }
      show(b, along <= len ? 1 : 0.001);
    });
    total.position.set(-(len - 0.24) - 0.12, 0.005, 0);
    total.rotation.set(-FLAT, 0, 0);
    show(total, over * (len > 0.9 ? 1 : 0.001));
    all.position.set(push * jitter(t, 1) * 0.01 + over * jitter(t, 2) * 0.02, over * Math.abs(Math.sin(t * 8)) * 0.03, 0);
    all.rotation.z = up * Math.sin(t * 10) * 0.025;
  });
};

// ---- C45 the in-laws' luggage: a neat stack of floral suitcases / the cases bulge; knitting needles,
// slippers and a framed photo poke out between them / burst open: a rocking chair unfolds on top, and a
// finger wags from behind a newspaper
const makeInlaws = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const floral = [lambert(0xf2c6d0), lambert(0xf7e3b5), lambert(0xd9e8c8)], flower = [glow(0xd84a7a), glow(0x6a9ad0), glow(0xe0a030)], trim = lambert(0x6b4a2a), brass = lambert(0xd4a94a);
  const sizes = [[0.7, 0.22, 0.46], [0.6, 0.2, 0.4], [0.5, 0.17, 0.34]];
  let y = 0;
  const cases = sizes.map(([w, h, d], k) => {
    const c = sub(all, 0, y, 0);
    const body = sub(c);
    part(body, box(w, h, d), floral[k], 0, h / 2, 0);
    part(body, box(w + 0.01, h * 0.3, d + 0.01), trim, 0, h / 2, 0); // (the strap round its middle)
    part(body, box(w + 0.012, 0.03, d + 0.012), trim, 0, h - 0.02, 0);
    if (k === 2) part(body, torus(0.05, 0.012, 10, Math.PI), trim, 0, h, 0).scale.set(1.8, 1, 1); // (the top one's handle)
    for (const x of [-0.15, 0.15]) part(body, box(0.05, 0.04, 0.012), brass, x, h * 0.55, d / 2 + 0.006);
    for (let n = 0; n < 7; n++) part(body, new THREE.CircleGeometry(0.018, 6), flower[(n + k) % 3], -w * 0.4 + ((n * 0.37 + k * 0.2) % 1) * w * 0.8, 0.03 + ((n * 0.61) % 1) * (h - 0.06), d / 2 + 0.002);
    const lid = sub(c, 0, h, -d / 2);
    part(lid, box(w + 0.014, 0.012, d + 0.014), floral[k], 0, 0.006, d / 2);
    y += h;
    return { c, body, lid, w, h, d, k };
  });
  // what pokes out: needles, slippers, the photo
  const needles = [0, 1].map(k => part(all, cyl(0.006, 0.006, 0.4, 6), lambert(0xb8b8c8), 0.2, 0.22, 0.1, 0.3 + k * 0.2, 0, FLAT - 0.3 + k * 0.3));
  const slipper = sub(all, -0.28, 0.42, 0.05);
  part(slipper, sphere(0.06, 8, 6), lambert(0xe28ab0)).scale.set(1, 0.6, 1.8);
  part(slipper, torus(0.04, 0.015, 10), lambert(0xffffff), 0, 0.02, 0.03, FLAT);
  const photo = sub(all, 0.22, 0.6, 0.1);
  part(photo, box(0.16, 0.2, 0.012), brass);
  part(photo, box(0.13, 0.16, 0.004), lambert(0xe8e0d0), 0, 0, 0.007);
  part(photo, sphere(0.03, 8, 6), lambert(0xd8d0c8), -0.025, 0.03, 0.01);
  part(photo, sphere(0.03, 8, 6), lambert(0xd8d0c8), 0.03, 0.03, 0.01);
  // the rocking chair, on the top case
  const chair = sub(all, 0, 0.59, 0);
  const wood = lambert(0x7a4a22);
  const seat = part(chair, box(0.3, 0.025, 0.28), wood, 0, 0.18, 0);
  for (const x of [-0.13, 0.13]) for (const z of [-0.12, 0.12]) part(chair, cyl(0.012, 0.012, 0.16, 6), wood, x, 0.1, z);
  for (const z of [-1, 1]) part(chair, torus(0.26, 0.012, 14, 1.2), wood, 0, 0.26, z * 0.14, 0, 0, FLAT + 0.6 + 1.0);
  const back = sub(chair, 0, 0.19, -0.13);
  for (let k = 0; k < 5; k++) part(back, cyl(0.01, 0.01, 0.32, 6), wood, -0.12 + k * 0.06, 0.16, 0);
  part(back, box(0.3, 0.03, 0.025), wood, 0, 0.32, 0);
  // the newspaper, with a finger wagging beside it
  const paper = sub(all, -0.12, 0.45, 0.28);
  part(paper, box(0.28, 0.26, 0.01), lambert(0xd8d4c8));
  for (let k = 0; k < 5; k++) part(paper, box(0.2, 0.012, 0.002), glow(0x55555f), 0, 0.08 - k * 0.04, 0.006);
  part(paper, box(0.22, 0.03, 0.002), glow(0x222228), 0, 0.1, 0.006);
  const wag = arm(sub(all, 0.1, 0.42, 0.26), 0.18);
  wag.root.rotation.x = -FLAT;
  const finger = part(wag.hand, cyl(0.016, 0.018, 0.1, 6), SKIN, 0, 0, 0.08, FLAT);
  return stated(group, (t, bulge, burst) => {
    const up = clamp01(bulge + burst);
    cases.forEach((c) => {
      const swell = 1 + bulge * (0.06 + Math.abs(Math.sin(t * 5 + c.k)) * 0.04) + burst * 0.05;
      c.body.scale.set(swell, 1, swell);
      c.lid.rotation.x = -burst * (c.k === 2 ? 1.6 : 0.3 + c.k * 0.1) * (0.9 + Math.sin(t * 3 + c.k) * 0.1);
      c.c.position.y = sizes.slice(0, c.k).reduce((s, [, h]) => s + h, 0) + up * c.k * 0.025;
    });
    needles.forEach((n, k) => { show(n, up); n.rotation.z = FLAT - 0.3 + k * 0.3 + Math.sin(t * 4 + k) * 0.2 * up; });
    show(slipper, up);
    slipper.rotation.z = Math.sin(t * 3) * 0.2 * up;
    show(photo, up);
    photo.rotation.set(-0.2, Math.sin(t * 1.5) * 0.3, 0);
    show(chair, burst);
    chair.rotation.x = Math.sin(t * 2.2) * 0.25 * burst;
    chair.position.y = 0.59 + burst * 0.02;
    seat.position.y = 0.18;
    show(paper, burst);
    paper.rotation.y = Math.sin(t * 1.3) * 0.15;
    show(wag.root, burst);
    wag.root.rotation.set(-FLAT + 0.2, 0, Math.sin(t * 8) * 0.45);
    finger.rotation.y = Math.sin(t * 8) * 0.1;
    all.position.x = bulge * jitter(t, 1) * 0.01 + burst * jitter(t, 2) * 0.02;
    all.rotation.z = up * Math.sin(t * 9) * 0.02;
  });
};

// ---- C46 a marching band in a box: a drum-sized hatbox, a faint oompah / a trombone slide shooting in
// and out of its side, cymbals clapping at the lid / the lid off: a tuba bell, drumsticks, a twirling
// baton, notes pouring out
const makeBand = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const red = lambert(0xc82a3a), band = lambert(0xf4ead8), brassMat = lambert(0xe0b04a), gold = glow(0xffd23f), dark = lambert(0x3a2a20);
  const R = 0.3, H = 0.36;
  const drum = sub(all);
  part(drum, cyl(R, R, H, 20), red, 0, H / 2, 0);
  part(drum, cyl(R + 0.005, R + 0.005, 0.07, 20), band, 0, H / 2, 0);
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; part(drum, box(0.01, H, 0.01), band, Math.sin(a) * (R + 0.005), H / 2, Math.cos(a) * (R + 0.005), 0, 0, 0); }
  const lid = sub(all, 0, H, 0);
  part(lid, cyl(R + 0.02, R + 0.02, 0.05, 20), red, 0, 0.025, 0);
  part(lid, cyl(R + 0.025, R + 0.025, 0.02, 20), band, 0, 0.02, 0);
  part(lid, torus(0.05, 0.012, 10, Math.PI), dark, 0, 0.05, 0);
  // the trombone slide, out of the side
  const slide = sub(drum, R, 0.2, 0);
  for (const z of [-0.03, 0.03]) part(slide, cyl(0.014, 0.014, 0.5, 8), brassMat, 0.25, 0, z, 0, 0, FLAT);
  part(slide, torus(0.03, 0.014, 8, Math.PI), brassMat, 0.5, 0, 0, 0, 0, -FLAT).rotation.y = FLAT;
  // the cymbals, two discs at the lid's edge
  const cymbals = [-1, 1].map(d => { const c = sub(drum, d * 0.12, H + 0.04, 0.12); part(c, cyl(0.1, 0.1, 0.008, 16), gold); part(c, sphere(0.02, 8, 6), brassMat, 0, 0.01, 0); return c; });
  // the band at full blast: the tuba bell, drumsticks, the baton, the notes
  const tuba = sub(drum, 0.08, H, -0.06);
  part(tuba, cyl(0.04, 0.04, 0.35, 10), brassMat, 0, 0.17, 0);
  part(tuba, cone(0.22, 0.3, 16), brassMat, 0, 0.5, 0, Math.PI).scale.set(1, 1, 1);
  part(tuba, new THREE.CircleGeometry(0.21, 16), lambert(0x6a4a10), 0, 0.651, 0, -FLAT);
  for (let k = 0; k < 3; k++) part(tuba, torus(0.05, 0.012, 10), brassMat, 0.05, 0.1 + k * 0.08, 0.03, 0.4, 0, 0);
  const sticks = [-1, 1].map(d => { const s = sub(drum, d * 0.2, H, 0.1); part(s, cyl(0.008, 0.01, 0.3, 6), lambert(0xe8d8b0), 0, 0.15, 0); part(s, sphere(0.018, 8, 6), lambert(0xe8d8b0), 0, 0.3, 0); return s; });
  const baton = sub(drum, -0.1, H + 0.55, -0.1);
  part(baton, cyl(0.008, 0.008, 0.4, 6), lambert(0xf4f4f4), 0, 0, 0, 0, 0, FLAT);
  for (const x of [-0.2, 0.2]) part(baton, sphere(0.025, 8, 6), gold, x, 0, 0);
  const noteMat = glow(0x2a2a36);
  const notes = Array.from({ length: 12 }, () => {
    const n = sub(all);
    part(n, sphere(0.028, 7, 5), noteMat).scale.set(1.2, 0.8, 1);
    part(n, box(0.012, 0.11, 0.012), noteMat, 0.03, 0.05, 0);
    part(n, box(0.05, 0.012, 0.012), noteMat, 0.05, 0.1, 0, 0, 0, -0.5);
    return n;
  });
  return stated(group, (t, play, blast) => {
    const up = clamp01(play + blast), calm = clamp01(1 - up);
    drum.rotation.z = Math.sin(t * 2.4) * 0.02 * (1 + play * 3) + blast * jitter(t, 1) * 0.06;
    drum.position.y = (play * 0.5 + blast) * Math.abs(Math.sin(t * 6)) * 0.05;
    lid.position.set(blast * 0.42, H + play * Math.abs(Math.sin(t * 6)) * 0.04 - blast * (H - 0.03), blast * 0.1);
    lid.rotation.set(blast * 0.2, 0, blast * 1.3 + play * jitter(t, 2) * 0.05);
    show(slide, up);
    slide.position.x = R + Math.abs(Math.sin(t * (3 + blast * 3))) * (0.25 + blast * 0.1) * up - 0.2;
    cymbals.forEach((c, k) => { show(c, up); const clap = Math.abs(Math.sin(t * 6 + k * Math.PI)); c.position.x = (k ? 1 : -1) * (0.03 + clap * 0.12); c.rotation.z = (k ? 1 : -1) * (FLAT - 0.3 + clap * 0.3); });
    show(tuba, blast);
    tuba.rotation.set(0.2 + Math.sin(t * 2.5) * 0.15, 0, -0.2 + Math.sin(t * 2) * 0.15);
    sticks.forEach((s, k) => { show(s, blast); s.rotation.set(0.4 + Math.abs(Math.sin(t * 9 + k * 1.57)) * 0.8, 0, (k ? -1 : 1) * 0.3); });
    show(baton, blast);
    baton.rotation.set(0, Math.sin(t) * 0.4, t * 9);
    baton.position.y = H + 0.6 + Math.abs(Math.sin(t * 2)) * 0.15;
    cycle(notes, t, mix(0.25, 0.7, up), (n, u, k) => {
      const a = k * 2.2 + t * 0.3;
      n.position.set(Math.sin(a) * (0.15 + u * 0.4 * up), H + 0.1 + u * (0.4 + up * 0.7), Math.cos(a) * (0.15 + u * 0.4 * up));
      n.rotation.z = Math.sin(t * 3 + k) * 0.3;
      show(n, (k < 2 ? calm * 0.7 : 0) + play * (k < 6 ? 1 : 0) + blast * 1.1 - u * 0.5 * (1 - calm * 0.5));
    });
  });
};

// ---- C52 a door-to-door salesman's case: a sample case, shut / the lid opens a crack, a foot wedged in
// it, a hand offering a brush / wide open: brushes, encyclopaedias and a vacuum hose spilling out, the
// foot tapping
const makeSalesman = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const leather = lambert(0x5a3a22), brass = lambert(0xd4a94a), shoe = lambert(0x161616);
  const W = 0.64, H = 0.26, D = 0.44;
  part(all, box(W, H, D), leather, 0, H / 2, 0);
  for (const x of [-0.2, 0.2]) part(all, box(0.06, 0.04, 0.015), brass, x, H - 0.03, D / 2 + 0.005);
  part(all, torus(0.07, 0.014, 10, Math.PI), leather, 0, H + 0.06, 0).scale.set(1.6, 1, 1);
  const lid = sub(all, 0, H, -D / 2);
  part(lid, box(W, 0.14, D), leather, 0, 0.07, D / 2);
  part(lid, box(W - 0.04, 0.02, D - 0.04), lambert(0x8a1a2a), 0, -0.005, D / 2); // (its red lining)
  // the foot: a black shoe wedged in the gap
  const foot = sub(all, 0.2, H - 0.02, D / 2 - 0.05);
  part(foot, sphere(0.07, 10, 8), shoe, 0, 0.03, 0.08).scale.set(0.9, 0.6, 1.8);
  part(foot, box(0.13, 0.02, 0.26), lambert(0x3a2a20), 0, -0.005, 0.08);
  part(foot, cyl(0.05, 0.055, 0.14, 8), lambert(0x4a4a58), 0, 0.09, -0.04);
  // the hand with a brush, out of the gap
  const brush = (parent, len = 0.2) => {
    const b = sub(parent);
    part(b, box(0.035, 0.035, len), lambert(0xe0c890), 0, 0, len / 2);
    for (let k = 0; k < 6; k++) part(b, box(0.03, 0.03, 0.03), lambert(0x6a4a2a), 0, -0.03, 0.04 + k * 0.025);
    return b;
  };
  const offer = arm(sub(all, -0.15, H + 0.02, D / 2 - 0.08), 0.16);
  brush(offer.prop).rotation.x = -0.3;
  // the spill: brushes, books and the vacuum hose
  const spill = sub(all, 0, H, 0);
  for (let k = 0; k < 4; k++) brush(spill, 0.24).rotation.set(0.6 + k * 0.5, k * 1.3, 0.3);
  const bookColours = [0x8a1a2a, 0x1a3a7a, 0x2a6a3a, 0x6a2a7a];
  bookColours.forEach((c, k) => { const b = part(spill, box(0.1, 0.16, 0.04), lambert(c), 0.08 + k * 0.03, 0.08 + k * 0.025, 0.05 + (k % 2) * 0.1, 0.1 * k, 0.3 * k, 0.5 + k * 0.2); part(b, box(0.085, 0.14, 0.004), lambert(0xf4ead8), 0, 0, 0.02); });
  const hoseMat = lambert(0x8a8a96);
  const hose = Array.from({ length: 14 }, () => part(spill, torus(0.045, 0.012, 10), hoseMat));
  const nozzle = part(spill, cyl(0.05, 0.035, 0.12, 10), lambert(0x3a3a48));
  return stated(group, (t, crack, open) => {
    const up = clamp01(crack + open);
    lid.rotation.x = -(crack * 0.35 + open * 1.9) * (1 + Math.sin(t * 4) * 0.03 * up);
    show(foot, up);
    foot.rotation.x = -0.3 - open * (0.2 + Math.pow(Math.abs(Math.sin(t * 7)), 2) * 0.5); // (tapping, furious)
    foot.position.y = H - 0.02 + crack * 0.02 + open * 0.08;
    show(offer.root, up);
    offer.root.rotation.set(-0.4 - Math.sin(t * 2.5) * 0.2, Math.sin(t * 1.7) * 0.3, 0);
    offer.root.position.y = H + 0.02 + open * 0.1;
    show(spill, open);
    spill.children.forEach((c, k) => { if (k < 4) c.position.set(-0.22 + k * 0.1, 0.05 + Math.abs(Math.sin(t * 3 + k)) * 0.06, 0.15 + (k % 2) * 0.1); });
    hose.forEach((h, k) => {
      const a = k * 0.55 + t * 1.2, r = 0.1 + k * 0.012;
      h.position.set(-0.2 + Math.sin(a) * r, 0.06 + k * 0.045 + Math.sin(t * 2 + k * 0.4) * 0.03, -0.05 + Math.cos(a) * r);
      h.rotation.set(FLAT + Math.sin(t * 2 + k) * 0.3, a, 0);
    });
    nozzle.position.set(-0.2 + Math.sin(14 * 0.55 + t * 1.2) * 0.27, 0.72 + Math.sin(t * 2 + 5.6) * 0.03, -0.05 + Math.cos(14 * 0.55 + t * 1.2) * 0.27);
    nozzle.rotation.set(Math.sin(t * 2) * 0.5, 0, 0.5 + Math.sin(t * 1.5) * 0.4);
    all.position.x = crack * jitter(t, 1) * 0.01 + open * jitter(t, 2) * 0.015;
    all.rotation.z = up * Math.sin(t * 8) * 0.02;
  });
};

// ---- C53 the surprise party: a big plain box that says nothing / it giggles: a party hat pokes up and
// ducks / hands burst out with streamers and a cake, and a banner unrolls: SURPRISE
const makeParty = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const W = 0.68, H = 0.6;
  const plain = lambert(0xb9a98a);
  part(all, box(W, H, W), plain, 0, H / 2, 0);
  const lid = sub(all, 0, H, -W / 2);
  part(lid, box(W + 0.02, 0.03, W + 0.02), plain, 0, 0.015, W / 2);
  // the party hat that pokes up, through a gap at the lid's front
  const hat = sub(all, 0.12, H - 0.2, 0.08);
  part(hat, cone(0.09, 0.26, 12), lambert(0xff5fa0), 0, 0.13, 0);
  for (let k = 0; k < 3; k++) part(hat, cyl(0.09 - k * 0.028, 0.09 - k * 0.028, 0.02, 12), lambert(0xfff176), 0, 0.03 + k * 0.08, 0);
  part(hat, sphere(0.03, 8, 6), lambert(0xfff176), 0, 0.27, 0);
  // the giggles: little bubbles beside the box
  const giggles = [0, 1, 2].map(k => { const g = sub(all); part(g, sphere(0.055, 10, 8), glow(0xffffff)).scale.set(1.3, 1, 1); [0, 1, 2].forEach(n => part(g, sphere(0.011, 5, 4), glow(0x5a5a6a), -0.024 + n * 0.024, 0, 0.052)); g.userData.k = k; return g; });
  // the burst: hands with streamers, a cake, the banner
  const colours = [0xff5fa0, 0x5fd0ff, 0xfff176, 0x9df0a0, 0xff8a2a];
  const streamerArms = [[-0.22, 0.1], [0.22, -0.05], [0, -0.2]].map(([x, z], k) => {
    const a = arm(sub(all, x, H - 0.02, z), 0.3);
    a.root.rotation.x = -FLAT;
    const curls = Array.from({ length: 7 }, (_, j) => part(a.prop, box(0.025, 0.012, 0.06), lambert(colours[(k + j) % 5], { side: THREE.DoubleSide })));
    return { a, curls, k };
  });
  const cakeArm = arm(sub(all, 0.1, H - 0.02, 0.18), 0.28);
  cakeArm.root.rotation.x = -FLAT;
  const cake = sub(cakeArm.prop, 0, 0.04, 0);
  part(cake, cyl(0.14, 0.14, 0.1, 16), lambert(0xf4d6a0), 0, 0.05, 0);
  part(cake, cyl(0.145, 0.145, 0.03, 16), lambert(0xff8ab8), 0, 0.1, 0);
  for (let k = 0; k < 4; k++) { const an = k * 1.57; part(cake, cyl(0.01, 0.01, 0.08, 6), lambert(colours[k]), Math.sin(an) * 0.08, 0.15, Math.cos(an) * 0.08); part(cake, sphere(0.015, 6, 5), glow(0xffd23f), Math.sin(an) * 0.08, 0.2, Math.cos(an) * 0.08); }
  const banner = sub(all, 0, H + 0.55, 0.1);
  for (const x of [-0.36, 0.36]) part(banner, cyl(0.012, 0.012, 0.5, 6), lambert(0x8a8a96), x, -0.1, 0);
  const cloth = part(banner, plane(0.7, 0.18), lettered('SURPRISE', 0xffffff, 0xd81e2a, 320, 80), 0, 0, 0);
  const confetti = Array.from({ length: 24 }, (_, k) => part(all, plane(0.04, 0.04), lambert(colours[k % 5], { side: THREE.DoubleSide })));
  return stated(group, (t, giggle, burst) => {
    const up = clamp01(giggle + burst);
    const peek = (0.35 + Math.max(0, Math.sin(t * 2.5)) * 0.65) * giggle; // (up, and ducks back, never quite out of sight)
    hat.position.y = H - 0.3 + peek * 0.36 + burst * 0.6;
    hat.rotation.set(burst * 0.3, 0, Math.sin(t * 3) * 0.1 * up + burst * 0.4);
    // the lid: lifted a touch by the hat, then thrown off, leaning against the box's side
    lid.position.set(burst * (W / 2 + 0.3), H + peek * 0.03 + giggle * Math.abs(Math.sin(t * 9)) * 0.01 - burst * (H - 0.05), -W / 2 + burst * (W / 2 - 0.1));
    lid.rotation.set(-giggle * peek * 0.08, burst * 0.4, burst * 1.25);
    giggles.forEach((g) => { const k = g.userData.k, u = ((t * 0.8 + k / 3) % 1); g.position.set(W / 2 - 0.05 + k * 0.08, H + 0.12 + k * 0.1 + u * 0.2, 0.15 - k * 0.2); show(g, giggle * (1 - u) * Math.min(1, u * 6)); });
    streamerArms.forEach((s) => {
      show(s.a.root, burst);
      s.a.root.rotation.set(-FLAT + Math.sin(t * 5 + s.k * 2) * 0.4, 0, Math.sin(t * 4 + s.k) * 0.5);
      s.curls.forEach((c, j) => { const a = j * 0.9 + t * 4 + s.k; c.position.set(Math.sin(a) * 0.05, 0.04 + j * 0.05, Math.cos(a) * 0.05 + 0.02); c.rotation.set(0.5, a, 0); });
    });
    show(cakeArm.root, burst);
    cakeArm.root.rotation.set(-FLAT + 0.2 + Math.sin(t * 3) * 0.15, 0, Math.sin(t * 2.2) * 0.2);
    cake.rotation.y = t;
    show(banner, burst);
    banner.position.y = H + 0.3 + burst * 0.3;
    cloth.rotation.y = Math.sin(t * 2) * 0.12;
    cloth.scale.x = Math.max(0.001, burst);
    cycle(confetti, t, 0.5, (c, u, k) => {
      const a = k * 2.4;
      c.position.set(Math.sin(a) * (0.15 + u * 0.5), H + 0.6 + 0.4 - u * 1.0, Math.cos(a) * (0.15 + u * 0.5));
      c.rotation.set(t * 3 + k, t * 2, 0);
      show(c, burst * (1.1 - u * 0.5));
    });
    all.position.x = giggle * jitter(t, 1) * 0.008 + burst * jitter(t, 2) * 0.02;
    all.rotation.z = up * Math.sin(t * 9) * 0.02;
  });
};

// ---- C55 a thank-you casserole: an oval dish under a tea towel; the lid lifts on the steam and settles
const makeCasserole = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const enamel = lambert(0xd85a3a), rim = lambert(0xf0c0a0), towel = lambert(0xf2f0e8, { side: THREE.DoubleSide }), check = lambert(0x4a7ad0, { side: THREE.DoubleSide });
  const dish = sub(all);
  part(dish, cyl(0.26, 0.22, 0.2, 20), enamel, 0, 0.1, 0).scale.x = 1.35;
  part(dish, torus(0.26, 0.018, 24), rim, 0, 0.2, 0, FLAT).scale.set(1.35, 1, 1);
  for (const x of [-1, 1]) part(dish, torus(0.05, 0.015, 10, Math.PI), enamel, x * 0.37, 0.14, 0, 0, 0, x > 0 ? -FLAT : FLAT).rotation.x = FLAT;
  const lid = sub(all, 0, 0.2, 0);
  part(lid, new THREE.SphereGeometry(0.26, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), enamel).scale.set(1.35, 0.45, 1);
  part(lid, sphere(0.035, 10, 8), rim, 0, 0.13, 0);
  // the tea towel over it: a strip across the top, hanging down both sides, in a check
  const cloth = sub(lid, 0, 0.1, 0);
  part(cloth, plane(0.74, 0.26), towel, 0, 0.025, 0, -FLAT); // (across the top, the long way)
  for (const [x, z] of [[-0.25, -0.06], [-0.1, 0.06], [0.05, -0.06], [0.2, 0.06]]) part(cloth, plane(0.1, 0.08), check, x, 0.027, z, -FLAT);
  for (const d of [-1, 1]) { // (hanging down over each end, flaring a little at the hem)
    const side = sub(cloth, d * 0.37, 0.02, 0);
    side.rotation.set(0, d * FLAT, -d * 0.12);
    part(side, plane(0.26, 0.3), towel, 0, -0.15, 0);
    part(side, plane(0.2, 0.05), check, 0, -0.26, 0.002);
    part(side, plane(0.2, 0.03), check, 0, -0.08, 0.002);
  }
  const steam = [0, 1, 2, 3].map(() => part(all, sphere(0.05, 7, 5), haze(0xffffff, 0.45)));
  return idle(group, (t) => {
    const puff = Math.max(0, Math.sin(t * 1.1)); // (the steam builds, the lid lifts, it settles)
    lid.position.y = 0.2 + Math.pow(puff, 3) * 0.05;
    lid.rotation.z = Math.pow(puff, 3) * 0.06;
    cloth.children.forEach((c, k) => { if (k > 4) c.rotation.z = (k % 2 ? 1 : -1) * (0.12 + Math.sin(t * 2 + k) * 0.03); });
    cycle(steam, t, 0.5, (s, u, k) => {
      s.position.set((k % 2 ? 0.3 : -0.3) + Math.sin(t * 1.5 + k) * 0.03, 0.26 + u * 0.35, Math.cos(t + k) * 0.05);
      show(s, puff * (0.5 + u) * (1 - u));
      s.material.opacity = 0.45 * (1 - u);
    });
  });
};

// ---- C56 a box of kittens: ears and one paw over the rim of a cardboard box; a paw bats at a string
// dangling from the flap
const makeKittens = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const W = 0.56, H = 0.34, D = 0.42;
  part(all, box(W, H, D), CARD, 0, H / 2, 0);
  part(all, box(W + 0.01, 0.05, D + 0.01), lambert(0xa0773c), 0, H * 0.45, 0);
  const flap = sub(all, 0, H, -D / 2);
  part(flap, box(W, 0.015, D / 2), CARD, 0, 0, -D / 4);
  flap.rotation.x = 0.35;
  const furs = [lambert(0xf0a050), lambert(0x4a4a50), lambert(0xf4f0e8)];
  // a kitten: a head just over the rim, two ears, eyes; one has a paw up on the rim
  const kitten = (x, z, fur, k) => {
    const kit = sub(all, x, H - 0.03, z);
    part(kit, sphere(0.085, 12, 10), fur, 0, 0, 0);
    for (const d of [-1, 1]) { part(kit, cone(0.035, 0.07, 4), fur, d * 0.055, 0.085, 0, 0, 0.8, d * 0.3); part(kit, cone(0.018, 0.045, 4), lambert(0xffb0b0), d * 0.055, 0.082, 0.008, 0, 0.8, d * 0.3); }
    for (const d of [-1, 1]) { part(kit, sphere(0.018, 8, 6), glow(0x4fd0a0), d * 0.035, 0.015, 0.072); part(kit, sphere(0.008, 6, 5), glow(0x101010), d * 0.035, 0.015, 0.088).scale.set(0.5, 1.2, 1); }
    part(kit, sphere(0.012, 6, 5), lambert(0xff9aa8), 0, -0.02, 0.085);
    for (const d of [-1, 1]) for (let n = 0; n < 2; n++) part(kit, box(0.09, 0.003, 0.003), glow(0xffffff), d * 0.07, -0.02 - n * 0.012, 0.075, 0, 0, d * (0.1 + n * 0.25));
    kit.userData.k = k;
    return kit;
  };
  const kits = [kitten(-0.14, 0.05, furs[0], 0), kitten(0.1, -0.02, furs[1], 1), kitten(0.0, 0.12, furs[2], 2)];
  const paw = sub(all, -0.2, H + 0.02, D / 2 - 0.02);
  part(paw, sphere(0.035, 8, 6), furs[0]).scale.set(1.1, 0.7, 1.2);
  part(paw, cyl(0.03, 0.03, 0.1, 8), furs[0], 0, -0.05, -0.03, 0.4);
  const batter = sub(all, 0.2, H + 0.02, D / 2 - 0.04); // (a paw up over the front rim, batting)
  part(batter, cyl(0.028, 0.028, 0.14, 8), furs[1], 0, 0.07, 0);
  part(batter, sphere(0.04, 8, 6), furs[1], 0, 0.15, 0.01).scale.set(1.2, 0.8, 1.2);
  for (let n = 0; n < 3; n++) part(batter, sphere(0.012, 6, 5), lambert(0xffb0b0), -0.025 + n * 0.025, 0.14, 0.05);
  // the string, from the flap's corner, with a knot: it swings as the paw bats it
  const string = sub(all, 0.26, H + 0.3, D / 2 + 0.02);
  part(string, cyl(0.006, 0.006, 0.36, 5), lambert(0xe8d8a0), 0, -0.18, 0);
  part(string, sphere(0.028, 8, 6), lambert(0xd84a4a), 0, -0.38, 0);
  part(all, cyl(0.008, 0.008, 0.42, 6), lambert(0x6a4a2a), 0.26, H + 0.1, D / 2 + 0.02); // (the stick it hangs from, poked in the box's corner)
  return idle(group, (t) => {
    kits.forEach((kit) => {
      const k = kit.userData.k, bob = Math.sin(t * (1.1 + k * 0.3) + k * 2);
      kit.position.y = H - 0.03 + Math.max(0, bob) * 0.05;
      kit.rotation.set(-0.15 + bob * 0.08, Math.sin(t * 0.7 + k) * 0.35, 0);
    });
    const bat = Math.pow(Math.max(0, Math.sin(t * 2.2)), 2);
    batter.rotation.set(0.6 + bat * 0.7, 0, 0.2 - bat * 0.4);
    string.rotation.set(Math.sin(t * 2.2 - 0.4) * 0.35, 0, Math.sin(t * 1.3) * 0.15 + bat * 0.5);
    paw.rotation.x = -0.3 + Math.sin(t * 1.4) * 0.1;
  });
};

// ---- C57 a hand-knitted jumper: folded on a hanger, one sleeve far too long trailing to the floor;
// a ball of wool rolls back and forth beside it
const makeJumper = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const wool = lambert(0xd8503a), stripe = lambert(0xf4d35e), wire = lambert(0xb8b8c8), wood = lambert(0x9a6a3a);
  // the stand: a rail on two feet, the hanger hooked over it
  for (const x of [-0.28, 0.28]) part(all, box(0.16, 0.03, 0.16), wood, x, 0.015, 0);
  for (const x of [-0.28, 0.28]) part(all, cyl(0.012, 0.012, 0.95, 8), wood, x, 0.49, 0);
  part(all, cyl(0.014, 0.014, 0.62, 8), wood, 0, 0.96, 0, 0, 0, FLAT);
  const hanger = sub(all, 0, 0.96, 0);
  part(hanger, torus(0.035, 0.005, 10, Math.PI * 1.4), wire, 0, 0.0, 0, 0, 0, 0.6);
  part(hanger, cyl(0.005, 0.005, 0.1, 6), wire, 0, -0.07, 0);
  const body = sub(hanger, 0, -0.12, 0);
  part(body, box(0.36, 0.015, 0.1), wood, 0, 0, 0); // (the hanger's bar)
  // the jumper: a ribbed body, stripes across, and the two sleeves
  part(body, box(0.4, 0.46, 0.14), wool, 0, -0.23, 0);
  for (let k = 0; k < 3; k++) part(body, box(0.405, 0.04, 0.145), stripe, 0, -0.1 - k * 0.14, 0);
  part(body, box(0.42, 0.05, 0.15), lambert(0xb83a2a), 0, -0.46, 0); // (the hem's rib)
  part(body, torus(0.08, 0.025, 12, Math.PI), lambert(0xb83a2a), 0, 0.0, 0, 0, 0, Math.PI); // (the neck)
  const short = part(body, cyl(0.055, 0.065, 0.3, 10), wool, 0.26, -0.15, 0, 0, 0, 0.7);
  part(short, cyl(0.06, 0.06, 0.04, 10), lambert(0xb83a2a), 0, -0.15, 0);
  // the long sleeve: a chain of segments, down to the floor and along it
  const sleeve = sub(body, -0.22, -0.02, 0);
  const segs = chain(sleeve, 9, -0.13, (joint, j) => { part(joint, cyl(0.055, 0.055, 0.14, 10), j % 3 === 2 ? stripe : wool, 0, -0.065, 0); });
  part(segs[8], cyl(0.058, 0.058, 0.04, 10), lambert(0xb83a2a), 0, -0.13, 0);
  // the ball of wool, rolling
  const ball = sub(all, 0, 0.07, 0.22);
  part(ball, sphere(0.07, 12, 10), wool);
  for (let k = 0; k < 4; k++) part(ball, torus(0.07, 0.006, 16), lambert(0xe8604a), 0, 0, 0, k * 0.8, k * 0.5, 0);
  const strandMat = lambert(0xe8604a);
  const strand = part(all, cyl(0.005, 0.005, 0.5, 5), strandMat, 0, 0.02, 0.2, 0, 0, FLAT);
  return idle(group, (t) => {
    hanger.rotation.y = Math.sin(t * 0.6) * 0.15;
    body.rotation.z = Math.sin(t * 1.1) * 0.03;
    segs.forEach((seg, j) => { seg.rotation.z = j < 5 ? 0.05 + Math.sin(t * 1.5 + j) * 0.04 : 0.5 + Math.sin(t * 1.5 + j) * 0.08; seg.rotation.x = j > 5 ? 0.15 : 0; });
    const roll = Math.sin(t * 0.9) * 0.22;
    ball.position.x = roll;
    ball.rotation.z = -roll / 0.07;
    strand.position.set(roll / 2 - 0.1, 0.02, 0.2);
    strand.scale.y = Math.max(0.1, (0.3 + roll) / 0.5);
  });
};

// ---- C58 returned library books: a strapped stack, late; the top one's pages riffle and a bookmark waves
const makeBooks = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const colours = [0x2a4a8a, 0x8a2a2a, 0x2a6a3a, 0x7a5a2a, 0x5a2a7a], pages = lambert(0xf4ead8), strap = lambert(0x3a2a20);
  const sizes = [[0.46, 0.07, 0.34], [0.42, 0.06, 0.3], [0.44, 0.05, 0.32], [0.4, 0.06, 0.3]];
  let y = 0;
  sizes.forEach(([w, h, d], k) => {
    const b = sub(all, (k % 2 ? 0.02 : -0.02), y, 0);
    b.rotation.y = (k % 2 ? -0.08 : 0.06);
    part(b, box(w, h, d), lambert(colours[k]), 0, h / 2, 0);
    part(b, box(w - 0.03, h - 0.012, d - 0.02), pages, 0.015, h / 2, 0.012);
    part(b, box(0.04, 0.012, d - 0.08), lambert(0xd4a94a), -0.12, h + 0.001, 0, 0, FLAT); // (a title on the cover)
    y += h;
  });
  // the strap round the stack, with a buckle
  part(all, box(0.06, y + 0.02, 0.37), strap, 0, (y + 0.02) / 2, 0);
  part(all, box(0.07, 0.03, 0.03), lambert(0xd4a94a), 0, y + 0.015, 0.1);
  // the top book: its cover and the pages that riffle, and a bookmark ribbon
  const top = sub(all, 0.1, y, 0.02);
  const [tw, td] = [0.42, 0.3];
  part(top, box(tw, 0.008, td), lambert(colours[4]), 0, 0.004, 0);
  const leaves = Array.from({ length: 7 }, (_, k) => part(top, box(tw - 0.02, 0.004, td - 0.02), pages, -0.01, 0.01 + k * 0.004, 0.01));
  const cover = sub(top, -tw / 2, 0.04, 0);
  part(cover, box(tw, 0.008, td), lambert(colours[4]), tw / 2, 0, 0);
  part(cover, box(0.2, 0.004, 0.06), lambert(0xd4a94a), tw / 2, 0.006, 0);
  part(cover, plane(0.14, 0.05), lettered('OVERDUE', 0xffffff, 0xd81e2a, 192, 64), tw / 2 + 0.05, 0.007, 0.09, -FLAT);
  const ribbon = sub(top, 0.1, 0.03, -td / 2);
  part(ribbon, box(0.03, 0.002, 0.16), lambert(0xd81e2a), 0, 0, -0.08);
  return idle(group, (t) => {
    const breeze = Math.sin(t * 0.8);
    cover.rotation.z = -0.15 - Math.max(0, breeze) * 0.5;
    leaves.forEach((leaf, k) => { leaf.position.set(-0.01, 0.012 + k * 0.004, 0.01); leaf.rotation.z = -Math.max(0, Math.sin(t * 2.3 + k * 0.7)) * (0.06 + k * 0.03) * Math.max(0, breeze + 0.3); leaf.position.x = -tw / 2 + 0.01 + (tw - 0.02) / 2 * Math.cos(leaf.rotation.z); });
    ribbon.rotation.set(0.2 + Math.sin(t * 2.5) * 0.3, Math.sin(t * 1.7) * 0.25, 0);
    all.rotation.y = Math.sin(t * 0.4) * 0.05;
  });
};

// ---- C59 the new neighbour's fruit basket: a wicker basket piled with fruit; it shuffles, and the
// pineapple's crown sways
const makeFruit = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const wicker = lambert(0xc49a5a), wickerDark = lambert(0x9a7238);
  part(all, cyl(0.3, 0.22, 0.24, 18), wicker, 0, 0.12, 0);
  for (let k = 0; k < 4; k++) part(all, torus(0.23 + k * 0.022, 0.012, 20), wickerDark, 0, 0.04 + k * 0.06, 0, FLAT);
  part(all, torus(0.3, 0.02, 20), wickerDark, 0, 0.24, 0, FLAT);
  part(all, torus(0.3, 0.018, 20, Math.PI), wickerDark, 0, 0.24, 0, 0, FLAT, 0); // (the handle, over the top)
  const fruit = [];
  const add = (mesh, k) => { mesh.userData.k = k; mesh.userData.at = mesh.position.clone(); fruit.push(mesh); return mesh; };
  add(part(all, sphere(0.075, 12, 10), lambert(0xd83a2a), -0.14, 0.3, 0.08), 0); // apples
  add(part(all, sphere(0.07, 12, 10), lambert(0x8ac83a), 0.12, 0.28, 0.12), 1);
  add(part(all, sphere(0.08, 12, 10), lambert(0xff8a2a), 0.15, 0.3, -0.1), 2); // an orange
  add(part(all, sphere(0.06, 12, 10), lambert(0xffd23f), -0.02, 0.27, 0.19), 3); // a lemon
  fruit[3].scale.set(1.3, 0.9, 0.9);
  const bunch = sub(all, -0.15, 0.3, -0.12); // (grapes)
  for (let k = 0; k < 9; k++) part(bunch, sphere(0.03, 8, 6), lambert(0x6a3a8a), Math.sin(k * 2.4) * 0.05, (k % 3) * 0.04 - 0.02, Math.cos(k * 2.4) * 0.05);
  add(bunch, 4);
  const bananas = sub(all, 0.02, 0.33, -0.02);
  for (let k = 0; k < 3; k++) part(bananas, torus(0.09, 0.02, 10, 2), lambert(0xf4d35e), k * 0.035, 0, k * 0.02, 0, 0.3, 0.5);
  add(bananas, 5);
  const pineapple = sub(all, 0.0, 0.32, 0);
  part(pineapple, sphere(0.1, 12, 10), lambert(0xc8a040), 0, 0.1, 0).scale.set(1, 1.5, 1);
  for (let k = 0; k < 10; k++) part(pineapple, sphere(0.02, 5, 4), lambert(0x8a6a20), Math.sin(k * 2.4) * 0.09, 0.02 + (k % 5) * 0.045, Math.cos(k * 2.4) * 0.09);
  const crown = sub(pineapple, 0, 0.25, 0);
  const leaves = Array.from({ length: 9 }, (_, k) => { const a = k * 0.7; const l = part(crown, cone(0.022, 0.2, 4), lambert(0x3f9b4b), Math.sin(a) * 0.03, 0.08, Math.cos(a) * 0.03, Math.cos(a) * (0.3 + (k % 3) * 0.2), 0, -Math.sin(a) * (0.3 + (k % 3) * 0.2)); l.userData.a = a; return l; });
  return idle(group, (t) => {
    fruit.forEach((f) => { // (a shuffle: each settles, now and then)
      const k = f.userData.k, u = ((t * 0.5 + k / 6) % 1), hop = Math.pow(Math.max(0, Math.sin(u * Math.PI * 2)), 4);
      f.position.set(f.userData.at.x + Math.sin(k) * hop * 0.02, f.userData.at.y + hop * 0.03, f.userData.at.z);
      f.rotation.y = Math.sin(t * 0.7 + k) * 0.3;
    });
    crown.rotation.set(Math.sin(t * 1.3) * 0.15, 0, Math.cos(t * 1.1) * 0.15);
    leaves.forEach((l, k) => { l.rotation.z = -Math.sin(l.userData.a) * (0.3 + (k % 3) * 0.2) + Math.sin(t * 2 + k) * 0.05; });
    pineapple.rotation.y = Math.sin(t * 0.5) * 0.1;
  });
};

// ---- C60 grandad's repaired radio: a wooden wireless; the dial glows, the needle sweeps along it and a
// note floats off the grille
const makeRadio = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const wood = lambert(0x7a4a22), woodDark = lambert(0x5a3416), cloth = lambert(0xd8c8a0), brass = lambert(0xd4a94a);
  const body = sub(all);
  part(body, box(0.6, 0.44, 0.3), wood, 0, 0.26, 0);
  part(body, cyl(0.3, 0.3, 0.6, 20, 1, false, 0, Math.PI), wood, 0, 0.26, 0, 0, 0, FLAT).scale.set(0.6, 1, 0.48); // (its rounded top)
  for (const x of [-0.24, 0.24]) part(body, cyl(0.025, 0.025, 0.03, 10), woodDark, x, 0.015, 0.1);
  // the grille, with its ribs, and the dial window with its glow and the needle
  part(body, box(0.26, 0.22, 0.02), cloth, -0.12, 0.26, 0.15);
  for (let k = 0; k < 5; k++) part(body, box(0.02, 0.24, 0.025), woodDark, -0.22 + k * 0.05, 0.26, 0.152);
  const dialMat = glow(0xffd98a);
  part(body, box(0.2, 0.12, 0.01), dialMat, 0.15, 0.3, 0.152); // (the dial's glass)
  for (let k = 0; k < 7; k++) part(body, box(0.004, 0.03, 0.002), glow(0x6a4a10), 0.07 + k * 0.027, 0.33, 0.158);
  const needle = part(body, box(0.006, 0.11, 0.004), glow(0xd81e2a), 0.15, 0.3, 0.159);
  for (const x of [0.1, 0.2]) part(body, cyl(0.03, 0.03, 0.025, 12), brass, x, 0.15, 0.16, FLAT);
  part(body, box(0.5, 0.02, 0.012), woodDark, 0, 0.09, 0.155);
  const aerial = part(body, cyl(0.006, 0.006, 0.5, 6), lambert(0xb8b8c8), 0.22, 0.6, -0.08, 0, 0, -0.35);
  const noteMat = glow(0x3a3a48);
  const notes = Array.from({ length: 4 }, () => {
    const n = sub(all);
    part(n, sphere(0.024, 7, 5), noteMat).scale.set(1.2, 0.8, 1);
    part(n, box(0.01, 0.09, 0.01), noteMat, 0.025, 0.04, 0);
    part(n, box(0.04, 0.01, 0.01), noteMat, 0.04, 0.085, 0, 0, 0, -0.5);
    return n;
  });
  return idle(group, (t) => {
    const sweep = (Math.sin(t * 0.45) + 1) / 2;
    needle.position.x = 0.07 + sweep * 0.16;
    dialMat.color.setHex(0xffd98a).multiplyScalar(0.85 + Math.sin(t * 3) * 0.08 + Math.sin(t * 11) * 0.04);
    body.rotation.z = Math.sin(t * 1.6) * 0.006; // (humming along)
    aerial.rotation.z = -0.35 + Math.sin(t * 1.1) * 0.03;
    cycle(notes, t, 0.35, (n, u, k) => {
      n.position.set(-0.12 + Math.sin(t * 1.5 + k * 2) * 0.05, 0.36 + u * 0.5, 0.18 + u * 0.15);
      n.rotation.z = Math.sin(t * 2 + k) * 0.25;
      show(n, Math.min(1, u * 4) * (1 - u));
    });
  });
};

// these models, by their ids in cargo.js
export const MORE_MODELS = {
  lawyers: makeLawyers, chainletter: makeChainletter, glitter: makeGlitter, recorders: makeRecorders, subpoena: makeSubpoena,
  telemarketers: makeTelemarketers, taxmen: makeTaxmen, bailiffs: makeBailiffs, wardens: makeWardens, consultants: makeConsultants,
  inlaws: makeInlaws, band: makeBand, salesman: makeSalesman, party: makeParty, casserole: makeCasserole,
  kittens: makeKittens, jumper: makeJumper, books: makeBooks, fruit: makeFruit, radio: makeRadio,
};
