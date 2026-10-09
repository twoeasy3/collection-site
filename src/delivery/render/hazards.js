// ---- HAZARDS: Gimmick Road 2's things that aren't obstacles (what they do: ../hazards.js;
// the trolleys, runners, wide load and the rest that can be
// run into are drawn as obstacles) ----
// A school crossing: a zebra, a lollipop person at the kerb whose sign turns to STOP, and the children
// walking across. A burst water main: a jet of water out of the road and the wet lane beyond it. A
// hot-air balloon coming down on its lanes, its shadow flashing where it will land. A drawbridge: the
// river, two leaves that lift, a boom and lamps each side.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { LEVEL } from '../levels.js';
import { Track } from '../track.js';
import { Game } from '../game.js';
import { Player } from '../player.js';
import { Hazards } from '../hazards.js';
import { scene, tmp } from './scene.js';
import { buildStrip } from './road.js';
import { Particles, rnd } from './effects.js';
import { makeWorker } from './siteModels.js';

const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const glow = (color) => new THREE.MeshBasicMaterial({ color });
const flat = (color, offset, extra) => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: offset, polygonOffsetUnits: offset, ...extra });
const add = (parent, geometry, material, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
// a group set down on the road at (s, lat), facing along it (its local +z the player's way, +x to the left)
const at = (s, lat, y = 0) => {
  const g = new THREE.Group();
  g.rotation.y = Track.toWorld(s, lat, tmp);
  g.position.set(tmp.x, tmp.y + y, tmp.z);
  group.add(g);
  return g;
};
// words on a board (a canvas texture)
const board = (text, bg, fg, w, h) => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = Math.round(512 * h / w);
  const c = canvas.getContext('2d');
  c.fillStyle = bg;
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.fillStyle = fg;
  c.font = `bold ${Math.round(canvas.height * 0.55)}px system-ui, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, canvas.width / 2, canvas.height / 2 + 2);
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), side: THREE.DoubleSide }));
};
// a round sign's face, a word on a colour
const disc = (text, color) => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const c = canvas.getContext('2d');
  c.fillStyle = color;
  c.beginPath();
  c.arc(64, 64, 62, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#fff';
  c.font = 'bold 40px system-ui, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, 64, 66);
  return new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true });
};
const STOP = disc('STOP', '#d8262b'), WAIT = disc('', '#f2c21c');
const LAMP_ON = 0xff2a1a, LAMP_OFF = 0x3a1210;
// a red and white boom, `length` m long, reaching out along local +x from its pivot
const boom = (length) => {
  const swing = new THREE.Group();
  for (let k = 0; k < length; k++) {
    const piece = Math.min(1, length - k);
    add(swing, box(piece, 0.14, 0.14), lambert(k % 2 ? 0xf4f4f4 : 0xd8262b), k + piece / 2, 0, 0);
  }
  return swing;
};

const group = new THREE.Group();
scene.add(group);
let schools = [], mains = [], balloons = [], bridges = [];

Game.onLoad.push(() => {
  group.clear();
  const LW = CONFIG.laneWidth;
  // ---- school crossings
  schools = (LEVEL.schoolCrossings || []).map((c) => {
    const s = Track.place(c), lo = Track.laneLo(s), hi = Track.laneHi(s);
    for (let lat = lo + 0.5; lat < hi - 0.4; lat += 1.4) group.add(new THREE.Mesh(buildStrip(s - 2, s + 2, lat, lat + 0.7, 0.03, 2), flat(0xf4f4f4, -3)));
    // the lollipop person, at the kerb on the player's right, facing the traffic coming up
    const person = makeWorker(), h = Track.toWorld(s - 3, hi + 0.9, tmp);
    person.position.copy(tmp);
    person.rotation.y = h + Math.PI;
    add(person, box(0.06, 2.2, 0.06), lambert(0xf4f4f4), 0.35, 1.7, 0.2);
    const faces = [add(person, new THREE.CircleGeometry(0.6, 20), WAIT, 0.35, 3.05, 0.24), add(person, new THREE.CircleGeometry(0.6, 20), WAIT, 0.35, 3.05, 0.16)];
    faces[1].rotation.y = Math.PI;
    group.add(person);
    // (and a school sign either side, well short of it)
    for (const [d, lat, turn] of [[-45, Track.hi(s - 45) - 0.5, Math.PI], [45, Track.lo(s + 45) + 0.5, 0]]) {
      const post = at(s + d, lat);
      add(post, box(0.14, 2.8, 0.14), lambert(0x8a9096), 0, 1.4, 0);
      const sign = board('SCHOOL', '#f2c21c', '#111', 2, 0.9);
      sign.position.set(0, 3.1, 0);
      sign.rotation.y = turn;
      post.add(sign);
    }
    // the children: small, bright, in a line
    const colours = [0xff4f8b, 0x2f7de1, 0xffd23f, 0x39d353, 0xff7a1a, 0xb026ff];
    const children = Array.from({ length: CONFIG.schoolCrossing.children }, (_, k) => {
      const child = new THREE.Group();
      add(child, box(0.34, 0.5, 0.24), lambert(colours[k % colours.length]), 0, 0.75, 0);
      add(child, box(0.3, 0.5, 0.2), lambert(0x2b2f38), 0, 0.25, 0);
      add(child, new THREE.SphereGeometry(0.17, 10, 8), lambert(0xf2c09a), 0, 1.17, 0);
      add(child, box(0.3, 0.36, 0.16), lambert(colours[(k + 3) % colours.length]), 0, 0.8, -0.2); // (a school bag)
      group.add(child);
      return child;
    });
    return { s, lo: Track.lo(s) + 0.4, hi: Track.hi(s) - 0.4, faces, children };
  });
  // ---- burst water mains: the wet lane, and the broken cover the water comes out of
  mains = (LEVEL.waterMains || []).map((m) => {
    const from = Track.place(m), to = from + (m.length ?? CONFIG.waterMain.length);
    const lat = (s) => Track.laneOffset(m.lane, s);
    const wet = new THREE.Mesh(buildStrip(from, to, (s) => lat(s) - LW / 2 + 0.1, (s) => lat(s) + LW / 2 - 0.1, 0.035, 2),
      flat(0x6fb6d8, -4, { transparent: true, opacity: 0.55 }));
    group.add(wet);
    const cover = at(from + 1.5, lat(from + 1.5));
    add(cover, new THREE.CylinderGeometry(0.55, 0.55, 0.08, 12), lambert(0x3a3b3f), 0, 0.04, 0);
    add(cover, box(0.9, 0.06, 0.5), lambert(0x55575c), 0.5, 0.12, 0.3).rotation.z = 0.5;
    const jet = add(cover, new THREE.CylinderGeometry(0.25, 0.45, 5, 10), new THREE.MeshBasicMaterial({ color: 0xcfeaf7, transparent: true, opacity: 0.6 }), 0, 2.5, 0);
    return { from, lat: lat(from + 1.5), wet, jet };
  });
  // ---- hot-air balloons
  balloons = (LEVEL.balloons || []).map((b) => {
    const s = Track.place(b), lat = (Track.laneOffset(b.lanes[0], s) + Track.laneOffset(b.lanes[1], s)) / 2;
    const w = (b.lanes[1] - b.lanes[0] + 1) * LW;
    const model = at(s, lat);
    const stripes = [0xd8262b, 0xffd23f, 0x2f7de1, 0xf4f4f4];
    for (let k = 0; k < 8; k++) { // (the envelope: gores of colour round a sphere, drawn in at the mouth)
      const gore = add(model, new THREE.SphereGeometry(7, 6, 14, k * Math.PI / 4, Math.PI / 4), lambert(stripes[k % stripes.length]), 0, 12.5, 0);
      gore.scale.set(1, 1.15, 1);
    }
    add(model, new THREE.CylinderGeometry(2.4, 1.2, 3, 12, 1, true), lambert(0xd8262b, { side: THREE.DoubleSide }), 0, 4.6, 0);
    add(model, box(Math.min(w - 0.6, 4), 1.3, 2 * CONFIG.balloon.hl), lambert(0x9a6a3a), 0, 0.65, 0); // the basket
    add(model, box(Math.min(w - 0.4, 4.2), 0.16, 2 * CONFIG.balloon.hl + 0.2), lambert(0x6e4a26), 0, 1.3, 0);
    for (const x of [-1, 1]) for (const z of [-1, 1]) add(model, box(0.06, 2.4, 0.06), lambert(0x2b2f38), x * 1.3, 2.4, z * 1.2);
    add(model, new THREE.SphereGeometry(0.3, 8, 6), glow(0xffb020), 0, 3.4, 0); // the burner's flame
    const shadow = at(s, lat, 0.05);
    add(shadow, new THREE.CircleGeometry(Math.max(w / 2, 3), 24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0.45, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 }));
    return { model, shadow, y: model.position.y };
  });
  // ---- drawbridges: the river under the gap, the two leaves, and a boom and a pair of lamps each side
  const D = CONFIG.drawbridge;
  bridges = (LEVEL.drawbridges || []).map((c) => {
    const s = Track.place(c), lo = Track.lo(s), hi = Track.hi(s), width = hi - lo, mid = (lo + hi) / 2, L = D.leaf;
    // (the river under the whole span: the leaves, down, cover it)
    group.add(new THREE.Mesh(buildStrip(s - L, s + L, lo - 120, hi + 120, 0.08, 2), flat(0x2e6c8f, -14)));
    for (const d of [-1, 1]) { // (its banks: a stone quay each side, and a pier with a cabin either side of the road at each hinge)
      group.add(new THREE.Mesh(buildStrip(s + d * L, s + d * (L + 1.2), lo - 120, lo, 0.3, 2), flat(0x8a8378, -1)));
      group.add(new THREE.Mesh(buildStrip(s + d * L, s + d * (L + 1.2), hi, hi + 120, 0.3, 2), flat(0x8a8378, -1)));
      for (const lat of [lo - 1.6, hi + 1.6]) {
        const pier = at(s + d * (L + 1.5), lat);
        add(pier, box(2.4, 1.2, 4.2), lambert(0x8a8378), 0, 0.6, 0);
        add(pier, box(1.8, 2.4, 2.2), lambert(0xb9b2a4), 0, 2.4, 0);
        add(pier, box(2.2, 0.25, 2.6), lambert(0x3d5a6c), 0, 3.7, 0);
      }
    }
    // each leaf: hinged at its bank, its top (local y 0) the road, reaching `leaf` m to the middle. A line
    // from the hinge at Hazards.bridgeAngle: the same line Hazards.deck gives the car
    const deck = lambert(0x41444b), steel = lambert(0x9c4a3a), white = glow(0xf4f4f4), yellow = glow(0xffc400);
    const lines = []; // [x across the leaf (+ to the left), colour, dashed]
    const lanes = [];
    for (let n = 0; n < Track.laneCount; n++) lanes.push(Track.laneOffset(n, s));
    for (let n = 0; n + 1 < lanes.length; n++) {
      const between = (lanes[n] + lanes[n + 1]) / 2, median = lanes[n] < 0 && lanes[n + 1] > 0;
      if (median) lines.push([mid - between - 0.14, yellow, false], [mid - between + 0.14, yellow, false]);
      else lines.push([mid - between, white, true]);
    }
    lines.push([mid - Track.laneLo(s), white, false], [mid - Track.laneHi(s), white, false]);
    const leaves = [-1, 1].map((d) => {
      const pivot = at(s + d * L, mid, 0.11), leaf = new THREE.Group();
      add(leaf, box(width, 0.4, L), deck, 0, -0.2, -d * L / 2);
      for (const x of [-1, 1]) { // (a girder under each edge, deepest at the hinge; and a rail along the top)
        add(leaf, box(0.4, 1.0, L * 0.98), steel, x * (width / 2 - 0.2), -0.9, -d * L / 2);
        add(leaf, box(0.12, 0.12, L), steel, x * (width / 2 - 0.1), 0.9, -d * L / 2);
        for (let k = 0; k <= 5; k++) add(leaf, box(0.1, 0.9, 0.1), steel, x * (width / 2 - 0.1), 0.45, -d * (0.2 + k * (L - 0.4) / 5));
      }
      for (const [x, material, dashed] of lines) {
        if (!dashed) add(leaf, box(0.14, 0.02, L - 0.8), material, x, 0.012, -d * L / 2);
        else for (let z = 1.5; z < L - 1; z += 6) add(leaf, box(0.14, 0.02, 2.4), material, x, 0.012, -d * (z + 1.2));
      }
      for (let k = 0; k * 1.2 < width; k++) add(leaf, box(0.6, 0.03, 0.5), glow(k % 2 ? 0x1b1d22 : 0xffd23f), -width / 2 + 0.3 + k * 1.2, 0.015, -d * (L - 0.3)); // (its lip, marked)
      add(leaf, box(width, 0.5, 0.12), glow(0xffd23f), 0, -0.2, -d * L);
      pivot.add(leaf);
      return { leaf, d };
    });
    // (the speed that clears it, on a board on the way up to it)
    const need = Math.ceil(Hazards.bridgeJumpSpeed() * 3.6 / 5) * 5;
    for (const [back, lat] of [[D.sign, Track.hi(s - D.sign) - 0.6], [D.sign / 2, Track.hi(s - D.sign / 2) - 0.6]]) {
      if (s - back < 5) continue;
      const post = at(s - back, lat);
      add(post, box(0.2, 4, 0.2), lambert(0x8a9096), 0, 2, 0);
      const sign = board('JUMP ' + need + '+', '#ffd23f', '#111', 5.4, 1.8);
      sign.position.set(0, 4.6, 0);
      sign.rotation.y = Math.PI;
      post.add(sign);
    }
    const booms = [], lamps = [];
    for (const [d, lat, reach] of [[-1, Track.laneHi(s) + 0.4, Track.laneHi(s) + 0.4], [1, Track.laneLo(s) - 0.4, -(Track.laneLo(s) - 0.4)]]) {
      const post = at(s + d * D.boom, lat, 0);
      add(post, box(0.18, 3.4, 0.18), lambert(0x8a9096), 0, 1.7, 0);
      add(post, box(1.2, 0.45, 0.1), lambert(0x1b1d22), 0, 3.0, 0);
      for (const x of [-0.35, 0.35]) {
        const material = glow(LAMP_OFF);
        add(post, new THREE.SphereGeometry(0.18, 10, 8), material, x, 3.0, 0);
        lamps.push(material);
      }
      const arm = boom(Math.abs(reach) + 0.3), hinge = new THREE.Group();
      hinge.position.y = 1.1;
      hinge.rotation.y = d < 0 ? 0 : Math.PI; // (local +x is to the left: towards the centre line from the right kerb)
      hinge.add(arm);
      post.add(hinge);
      booms.push(arm);
    }
    return { leaves, booms, lamps };
  });
});

export const syncHazards = (now) => {
  const t = now / 1000, near = (s) => Math.abs(Track.along(s) - Track.along(Player.s)) < 400;
  Hazards.schools.forEach((c, k) => {
    const mesh = schools[k];
    if (!mesh) return;
    const stop = c.state === 'stop', u = Hazards.childrenAcross(c);
    for (const face of mesh.faces) face.material = stop ? STOP : WAIT;
    mesh.children.forEach((child, i) => {
      // (waiting at the kerb on the right; across, in a line, when the lollipop is up; gone to school after)
      const lat = mesh.hi + 0.6 - u * (mesh.hi - mesh.lo + 1.2) + (stop ? 0 : i * 0.05);
      const h = Track.toWorld(mesh.s + (i - 2) * 0.7, lat, tmp);
      child.position.set(tmp.x, tmp.y + (stop && u > 0 && u < 1 ? Math.abs(Math.sin(t * 8 + i)) * 0.08 : 0), tmp.z);
      child.rotation.y = h + Math.PI / 2;
      child.visible = u < 1;
    });
  });
  Hazards.mains.forEach((m, k) => {
    const mesh = mains[k];
    if (!mesh) return;
    mesh.wet.visible = mesh.jet.visible = m.on;
    if (!m.on || !near(m.from)) return;
    mesh.jet.scale.set(1 + Math.sin(t * 23) * 0.15, 1 + Math.sin(t * 17) * 0.08, 1 + Math.cos(t * 19) * 0.15);
    Track.toWorld(m.from + 1.5, mesh.lat, tmp);
    for (let i = 0; i < 3; i++) Particles.emit(tmp.x + rnd(0.3), tmp.y + 4.5, tmp.z + rnd(0.3), rnd(4), 2 + Math.random() * 4, rnd(4), 1.1, 0.18 + Math.random() * 0.15, 0, 16, 0xcfeaf7, tmp.y);
  });
  Hazards.balloons.forEach((b, k) => {
    const mesh = balloons[k];
    if (!mesh) return;
    const h = Hazards.balloonHeight(b);
    mesh.model.visible = b.state !== 'idle' && b.state !== 'gone';
    mesh.model.position.y = mesh.y + h + (h > 0 ? Math.sin(t * 1.3) * 0.3 : 0);
    mesh.model.rotation.z = h > 0 ? Math.sin(t * 0.9) * 0.03 : 0;
    mesh.shadow.visible = b.state === 'descend' && Math.floor(now / 140) % 2 === 0;
  });
  Hazards.bridges.forEach((c, k) => {
    const mesh = bridges[k];
    if (!mesh) return;
    const down = Hazards.bridgeBooms(c), phase = Math.floor(t * 2.5) % 2;
    for (const { leaf, d } of mesh.leaves) leaf.rotation.x = d * Hazards.bridgeAngle(c); // (its free end up: see ../hazards.js)
    mesh.booms.forEach((arm) => { arm.rotation.z = (1 - down) * Math.PI / 2 * 0.95; });
    mesh.lamps.forEach((lamp, i) => lamp.color.setHex(c.state !== 'idle' && i % 2 === phase ? LAMP_ON : LAMP_OFF));
  });
};
