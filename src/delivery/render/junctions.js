// ---- junctions: the box, the arms the road doesn't take, and the arrows -----------------------------
// (The layout is Track.junctions; the traffic leaving the road down the arms is Traffic's.) Each
// junction's box and arms are paved and marked like the road. Across the mouth of each arm the road
// doesn't take stands a row of glowing chevron boards, pointing the way the road goes, which pulse
// in a chase: video-game arrows that keep the player on the one route (traffic goes through them).
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Track } from '../track.js';
import { Game } from '../game.js';
import { scene, clearGroup } from './scene.js';

const group = new THREE.Group();
scene.add(group);
const boards = []; // { material, halo, phase } per chevron board, for the chase

const ASPHALT = new THREE.MeshBasicMaterial({ color: 0x3a3d42, side: THREE.DoubleSide });
const paint = (color, order) => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide,
  polygonOffset: true, polygonOffsetFactor: order, polygonOffsetUnits: order });
const WHITE = paint(0xf2f2f2, -2), YELLOW = paint(0xffc400, -2);
const rightOf = (d) => ({ x: -d.z, z: d.x });

// a flat rectangle: `length` m on from (x, z) in direction d, from `a` to `b` m right of that line, at height y
const slab = (x, z, d, length, a, b, y, material) => {
  const r = rightOf(d), p = [];
  for (const [u, v] of [[0, a], [0, b], [length, a], [length, b]]) p.push(x + d.x * u + r.x * v, y, z + d.z * u + r.z * v);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  geo.setIndex([0, 1, 2, 1, 3, 2]);
  const mesh = new THREE.Mesh(geo, material);
  group.add(mesh);
  return mesh;
};

// one chevron board: a dark translucent panel with a double glowing chevron on it, facing `normal`,
// its chevrons pointing along `point`
const board = (x, y, z, normal, point, phase) => {
  const holder = new THREE.Group();
  holder.position.set(x, y, z);
  holder.lookAt(x + normal.x, y, z + normal.z);
  // (which way local +x points after turning to face: the chevrons point along +x, or are turned round)
  const localX = new THREE.Vector3(1, 0, 0).applyQuaternion(holder.quaternion);
  const flip = localX.x * point.x + localX.z * point.z < 0;
  const back = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.2), new THREE.MeshBasicMaterial({
    color: 0x061018, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
  const material = new THREE.MeshBasicMaterial({ color: 0x3cf0ff, transparent: true, opacity: 1, side: THREE.DoubleSide, depthWrite: false });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.6), new THREE.MeshBasicMaterial({
    color: 0x3cf0ff, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
  halo.position.z = -0.02;
  const marks = new THREE.Group();
  for (const dx of [-0.35, 0.3]) for (const sign of [1, -1]) { // two ">"s, each of two bars
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.15, 0.04), material);
    bar.position.set(dx - 0.05, sign * 0.17, 0.03);
    bar.rotation.z = -sign * 0.675;
    marks.add(bar);
  }
  if (flip) marks.rotation.y = Math.PI;
  holder.add(halo, back, marks);
  group.add(holder);
  boards.push({ material, halo: halo.material, phase });
};

const build = () => {
  clearGroup(group);
  boards.length = 0;
  const LW = CONFIG.laneWidth;
  for (const jn of Track.junctions) {
    const { centre: c, half, f0 } = jn, y = c.y + 0.004;
    // the box, and each arm the road doesn't take, out into the distance
    slab(c.x - f0.x * half, c.z - f0.z * half, f0, 2 * half, -half, half, y, ASPHALT);
    const lanes = Math.max(Track.leftLanes, Track.rightLanes), edge = Track.medianHalf + lanes * LW;
    const toward = jn.way ? jn.out : f0; // (the way the road goes on from here)
    jn.arms.forEach((arm, k) => {
      const d = arm.dir, mx = c.x + d.x * half, mz = c.z + d.z * half, run = arm.length - half;
      slab(mx, mz, d, run, -half, half, y, ASPHALT);
      // edge lines, double yellow down the middle, dashed lane lines, and a stop line across the
      // lanes coming in (on the left, looking out along the arm)
      for (const side of [-1, 1]) {
        slab(mx, mz, d, run, side * edge - 0.1, side * edge + 0.1, y + 0.01, WHITE);
        slab(mx, mz, d, run, side * 0.12 - 0.08, side * 0.12 + 0.08, y + 0.01, YELLOW);
        for (let n = 1; n < lanes; n++) {
          for (let u = 4; u < run - 3; u += 9) {
            const lat = side * (Track.medianHalf + n * LW);
            slab(mx + d.x * u, mz + d.z * u, d, 3, lat - 0.08, lat + 0.08, y + 0.01, WHITE);
          }
        }
      }
      const r = rightOf(d);
      // the arrows across its mouth, and a glowing line on the road beneath them, each board
      // turned to face a player coming up the road
      const glow = slab(mx - d.x * 0.6, mz - d.z * 0.6, d, 0.35, -half, half, y + 0.02, new THREE.MeshBasicMaterial({
        color: 0x3cf0ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
      boards.push({ material: glow.material, halo: null, phase: k * 3 });
      const n = { x: -f0.x - d.x, z: -f0.z - d.z }, len = Math.hypot(n.x, n.z) || 1;
      const normal = { x: n.x / len, z: n.z / len };
      let i = 0;
      for (let v = -half + 1.2; v <= half - 1.2; v += 2.4, i++) {
        board(mx + r.x * v, y + 1.3, mz + r.z * v, normal, toward, i);
      }
    });
  }
};
Game.onLoad.push(build);

// every frame: the arrows' chase
export const syncJunctions = (now) => {
  const t = now / 1000;
  for (const b of boards) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 7 - b.phase * 0.9);
    b.material.opacity = 0.35 + 0.65 * pulse;
    if (b.halo) b.halo.opacity = 0.08 + 0.25 * pulse;
  }
};
