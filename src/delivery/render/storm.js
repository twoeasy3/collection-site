// ---- the storm: cars blown through the air over the road ---------------------------------------
// A level with a "storm" ({ from, to, count, seed }) has that many vehicles tumbling along above
// its road, carried north on the wind, swinging from side to side and rolling over as they go.
// Each loops back to the start of the stretch when it reaches the end. They are purely a sight:
// the game logic knows nothing of them and nothing collides with them.
import * as THREE from 'three';
import { LEVEL } from '../levels.js';
import { Track } from '../track.js';
import { Player } from '../player.js';
import { Game } from '../game.js';
import { scene, tmp, clearGroup } from './scene.js';
import { MODELS } from './models.js';

const group = new THREE.Group();
scene.add(group);
let flyers = [];
let time = 0;

const PAINTS = [0xffd23f, 0x4fc3f7, 0x7ee081, 0xff8fb1, 0xffffff, 0xff9f43, 0xe23b3b, 0x9b3fd1, 0x2f7de1];
// the garage's models, and the delivery van
const SHAPES = [
  { model: 'commuter', hw: 0.85, hl: 1.85, height: 1.45 },
  { model: 'junker', hw: 1.0, hl: 2.5, height: 1.95 },
  { model: 'darkvan', hw: 1.05, hl: 2.45, height: 2.4 },
  { model: 'lowrider', hw: 1.0, hl: 2.5, height: 1.1 },
  { model: 'wagon', hw: 1.05, hl: 2.4, height: 1.9 },
  { model: 'sport', hw: 0.85, hl: 1.9, height: 1.1 },
  { model: 'lovebus', hw: 1.0, hl: 2.3, height: 2.1 },
  { model: 'deliveryvan', hw: 1.1, hl: 2.7, height: 2.3, color: 0x1e5b3f },
];

const build = () => {
  clearGroup(group);
  flyers = [];
  time = 0;
  const storm = LEVEL.storm;
  if (!storm) return;
  // seeded, so the storm is the same every run
  let seed = ((storm.seed || 1) * 7919) >>> 0;
  const rand = () => {
    seed = (seed + 0x6D2B79F5) >>> 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  const span = storm.to - storm.from;
  for (let i = 0; i < (storm.count || 20); i++) {
    const shape = SHAPES[Math.floor(rand() * SHAPES.length)];
    const color = PAINTS[Math.floor(rand() * PAINTS.length)];
    const mesh = MODELS[shape.model]({ color, ...shape }); // (in any paint, but the van in its own)
    group.add(mesh);
    flyers.push({
      mesh,
      s0: storm.from + rand() * span,       // where along the stretch it starts
      speed: 8 + rand() * 22,               // m/s north on the wind
      amp: 4 + rand() * 14,                 // m it swings either side of the road's centre
      latRate: 0.25 + rand() * 0.5,         // swings per second (radians)
      height: 5 + rand() * 9,               // m above the road
      bob: 1 + rand() * 2.5,
      phase: rand() * Math.PI * 2,
      rx: (rand() - 0.5) * 3, ry: (rand() - 0.5) * 2.5, rz: (rand() - 0.5) * 3, // tumbling rates, radians/s
      animate: mesh.userData.animate,
    });
  }
};
Game.onLoad.push(build);

export const syncStorm = (dt) => {
  if (!flyers.length) return;
  if (!Game.paused) time += dt;
  const storm = LEVEL.storm, span = storm.to - storm.from;
  const here = Track.along(Player.s);
  for (const f of flyers) {
    const s = storm.from + (((f.s0 - storm.from + f.speed * time) % span) + span) % span;
    // (nothing is drawn beyond the fog)
    f.mesh.visible = Math.abs(Track.along(s) - here) < 700;
    if (!f.mesh.visible) continue;
    const lat = f.amp * Math.sin(time * f.latRate + f.phase);
    const heading = Track.toWorld(s, lat, tmp);
    f.mesh.position.set(tmp.x, tmp.y + f.height + f.bob * Math.sin(time * 0.8 + f.phase), tmp.z);
    f.mesh.rotation.set(time * f.rx, heading + time * f.ry, time * f.rz);
    if (f.animate) f.animate(time + f.phase);
  }
};
