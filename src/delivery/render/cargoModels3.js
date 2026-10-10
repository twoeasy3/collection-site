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
  const fan = [1, 2, 3, 4].map(k => { const e = envelope(all); e.rotation.x = -0.25; return e; });
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
  const base = crate(all, crateW, 0.42, crateW);
  const cushion = part(all, box(0.36, 0.08, 0.22), lambert(0x5a2a7a), 0, 0.46, 0);
  const scroll = sub(all, 0, 0.56, 0);
  const roll = part(scroll, cyl(0.065, 0.065, 0.46, 12), paper, 0, 0, 0, 0, 0, FLAT);
  for (const x of [-0.24, 0.24]) part(scroll, cyl(0.03, 0.03, 0.04, 8), lambert(0xd8c7a0), x, 0, 0, 0, 0, FLAT);
  part(scroll, cyl(0.068, 0.068, 0.05, 12), ribbon, 0, 0, 0, 0, 0, FLAT);
  const seal = part(scroll, cyl(0.045, 0.045, 0.02, 10), waxMat, 0, 0, 0.07, FLAT);
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

// these models, by their ids in cargo.js
export const MORE_MODELS = {
  lawyers: makeLawyers, chainletter: makeChainletter, glitter: makeGlitter, recorders: makeRecorders, subpoena: makeSubpoena,
};
