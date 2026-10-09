// ============================================================================
// THE GIMMICKS PAGE (delivery/gimmicks.html): everything the levels throw at the player beyond the
// plain obstacles and the everyday traffic, each with a model (the game's own where it has one, or
// one made to stand for it), what it does, and the levels it turns up in. The numbers come from the
// game's CONFIG and the levels from the level files themselves, so the page stays true as they change.
// As the power-ups page: one renderer draws every card, a canvas over the whole window, drawn into
// patch by patch (each card's .view), and left clear everywhere else.
// ============================================================================
import * as THREE from 'three';
import './powerups.css';
import './gimmicks.css';
import { CONFIG } from './config.js';
import { LEVELS, HIDDEN_LEVELS, levelLabel } from './levels.js';
import { LEVEL_CARS } from './cars.js';
import { MODELS, AMBULANCE_BOX } from './render/models.js';
import { OBSTACLE_MODELS } from './render/obstacleModels.js';
import { makeElephant } from './render/elephantModel.js';
import { makeHippo } from './render/hippoModel.js';
import { makeMachine, BEACON_ON, BEACON_OFF } from './render/machineModels.js';
import { makeWorker } from './render/siteModels.js';
import { makeCarriage } from './render/trainModel.js';
import { makeAirliner, makeTower } from './render/airportModels.js';
import { makeTractorModel, makeUfo } from './render/carExtras.js';
import { makePillbox } from './render/battleModels.js';

const kmh = (ms) => Math.round(ms * 3.6) + ' km/h';
const pct = (x) => Math.round(x * 100) + '%';
const range = (r, unit = '') => `${r.min}–${r.max}${unit}`;
const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const glow = (color) => new THREE.MeshBasicMaterial({ color });
const mesh = (geometry, material, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geometry, material); m.position.set(x, y, z); return m; };
const box = (w, h, d, material, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), material, x, y, z);
const group = (...parts) => { const g = new THREE.Group(); g.add(...parts); return g; };
const ob = (kind, o = {}) => OBSTACLE_MODELS[kind](o);
const vehicle = (kind, color) => MODELS[CONFIG.vehicles[kind].model]({ ...CONFIG.vehicles[kind], color });
// a car's model painted (its body's material is its paint)
const painted = (model, color) => { model.userData.body.material.color.setHex(color); return model; };
// a length of road, `l` m long and `w` wide, with dashed lane lines: the stage most of the models stand on
const road = (w = 9, l = 12, color = 0x3b3e44) => {
  const g = group(box(w, 0.1, l, lambert(color), 0, -0.05, 0));
  for (let z = -l / 2 + 1; z < l / 2; z += 4) for (const x of [-w / 4, w / 4]) g.add(box(0.15, 0.02, 2, glow(0xe8e8e8), x, 0.01, z));
  return g;
};
// a sign on a post: text on a coloured board (a canvas texture)
const sign = (text, bg, fg = '#fff', w = 3.2, h = 1.4) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = Math.round(256 * h / w);
  const c = canvas.getContext('2d');
  c.fillStyle = bg; c.fillRect(0, 0, canvas.width, canvas.height);
  c.strokeStyle = fg; c.lineWidth = 8; c.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
  c.fillStyle = fg; c.font = `bold ${Math.round(canvas.height * 0.5)}px system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(text, canvas.width / 2, canvas.height / 2 + 2);
  const board = mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), side: THREE.DoubleSide }), 0, 3.4, 0);
  return group(box(0.15, 3, 0.15, lambert(0x8a8f96), 0, 1.5, -0.05), board);
};
// where the levels are: every level (on the menu) that has it, by its number and name; and the test
// level, Gimmick Road (off the menu: ?hidden=gimmick-road), where the newest are tried out first
const where = (has) => [...LEVELS.map((level, i) => has(level) ? `<span>${levelLabel(i)}</span> ${level.name}` : null),
  has(HIDDEN_LEVELS['gimmick-road']) ? '<span>Test</span> Gimmick Road (?hidden=gimmick-road)' : null].filter(Boolean);

// ---- every gimmick, by group ---------------------------------------------------------------------
// { name, has: (level) => bool (the levels it is in), rules: [...], build: () => { model, tick?(t, dt) },
//   spin: false (the model doesn't turn on its stand), color (its card's glow) }
const S = CONFIG.site, MA = CONFIG.machinery, W = CONFIG.wreckage, BT = CONFIG.bulletTrain, TI = CONFIG.tide, IC = CONFIG.ice;
const D = CONFIG.drifters, GF = CONFIG.gunfire, DB = CONFIG.driveBy, PU = CONFIG.puncture, RV = CONFIG.rival, RC = CONFIG.race;
const GROUPS = [
  { name: 'The road itself', cards: [
    { name: 'Side roads', color: 0x2e8b4a, has: (l) => l.exits?.length, rules: [
      'An exit lane opens beside the right-hand lane: take it, and the side road runs on beside the expressway and joins it again further up.',
      'Traffic takes it too, and it can be a way round a jam (or into one).',
      'No two need be alike: one runs straight, another swings far out or winds through a string of bends; some are one-way, others have traffic coming at you in the other lane.',
    ], build: () => {
      const g = road(9, 14);
      const ramp = box(4, 0.1, 10, lambert(0x3b3e44), 6.2, 0.1, 2);
      ramp.rotation.y = -0.25;
      const exit = sign('EXIT ↗', '#1f6b3a', '#fff', 3.6, 1.3);
      exit.position.set(8.4, 0, -3);
      g.add(ramp, exit);
      return { model: g };
    } },
    { name: 'Crossroads', color: 0x5cf6ff, has: (l) => l.junctions?.length, rules: [
      'The road turns a corner at a crossroads (or runs straight through one). The arms you can\'t take are closed off with glowing chevrons.',
      `At a turn, ${pct(CONFIG.junction.forward)} of the traffic going your way carries straight on; at a crossing, ${pct(CONFIG.junction.turnOff)} of the outside lane turns off.`,
      'While a car is leaving across the box, everyone else waits at its edge.',
    ], build: () => {
      const g = group(box(9, 0.1, 22, lambert(0x3b3e44), 0, -0.05, 0), box(22, 0.09, 9, lambert(0x3b3e44), 0, -0.04, 0));
      for (let k = -3; k <= 3; k++) g.add(box(0.7, 0.02, 2.4, glow(0xf2f2f2), k * 1.2, 0.02, 6)); // a zebra crossing
      const chevrons = mesh(new THREE.PlaneGeometry(9, 4), new THREE.MeshBasicMaterial({ color: 0x5cf6ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide }), 0, 2, -9);
      g.add(chevrons);
      return { model: g, tick: (t) => { chevrons.material.opacity = 0.35 + Math.sin(t * 5) * 0.2; } };
    } },
    { name: 'Lanes closing', color: 0xff8a1a, has: (l) => l.narrows?.length, rules: [
      'The outer lanes close: each side of the road drops to fewer lanes for a stretch, and everyone has to squeeze in.',
      'Calm good drivers signal and merge early; evil and angry ones barge in at the last moment.',
    ], build: () => {
      const g = road(9, 14);
      for (let k = 0; k < 6; k++) { const c = ob('cone'); c.position.set(4.3 - k * 0.45, 0, 4 - k * 2); g.add(c); }
      const arrow = sign('⇦', '#ff8a1a', '#111', 1.6, 1.6);
      arrow.position.set(3.2, 0, 6);
      g.add(arrow);
      return { model: g };
    } },
    { name: 'Bridges', color: 0x9c4a3a, has: (l) => l.bridges?.length, rules: [
      'A bridge has no shoulder: its steel stands right beside the outer lanes.',
      'Arrive at one on the shoulder and you drive into the end of its structure: wrecked, there and then. Even a ghost can\'t pass through it.',
    ], build: () => {
      const g = group(mesh(new THREE.PlaneGeometry(26, 26).rotateX(-Math.PI / 2), lambert(0x2f6f9f), 0, -4, 0), box(10, 0.6, 16, lambert(0x8d9096), 0, -0.3, 0));
      const steel = lambert(0x9c4a3a);
      for (const x of [-5, 5]) {
        g.add(box(0.4, 0.4, 16, steel, x, 4, 0));
        for (let z = -8; z <= 8; z += 4) {
          g.add(box(0.35, 4, 0.35, steel, x, 2, z));
          if (z < 8) { const d = box(0.25, 5.6, 0.25, steel, x, 2, z + 2); d.rotation.x = 0.78 * (z % 8 === 0 ? 1 : -1); g.add(d); }
        }
      }
      for (let z = -8; z <= 8; z += 4) g.add(box(10, 0.3, 0.3, steel, 0, 4, z));
      return { model: g };
    } },
    { name: 'Ice', color: 0xbfe6f7, has: (l) => l.ice?.length, rules: [
      `On ice your brakes work at ${pct(IC.brakeGrip)} and your steering at ${pct(IC.steerGrip)} of their grip, and the car slews round as it hits it.`,
      'In a bend it understeers: it slides to the outside, the more so the faster, heavier and clumsier it is.',
      `Traffic hitting it may spin out and blow up: the faster, the likelier (${pct(IC.spinPerSpeed)} for every m/s).`,
    ], build: () => {
      const g = road(9, 12);
      const sheet = mesh(new THREE.PlaneGeometry(4.2, 8).rotateX(-Math.PI / 2), lambert(0xd6eef8, { transparent: true, opacity: 0.75 }), -2.2, 0.03, 0);
      g.add(sheet);
      for (let k = 0; k < 3; k++) { const st = box(0.12, 0.01, 3 + k, glow(0xffffff), -3 + k * 0.8, 0.05, k - 1); st.rotation.y = 0.3; g.add(st); }
      return { model: g, tick: (t) => { sheet.material.opacity = 0.65 + Math.sin(t * 3) * 0.1; } };
    } },
    { name: 'Mud', color: 0x7a5a38, has: (l) => l.mud?.length, rules: [
      'The road gives way to mud. It slows a car as a railway track does, by how well the car crosses rough ground: a nimble sports car worst of all.',
      `You steer with ${pct(CONFIG.mud.steerGrip)} of your grip, and traffic in it crawls along at ${pct(CONFIG.mud.trafficPace)} of its pace.`,
    ], build: () => {
      const g = group(box(9, 0.1, 12, lambert(0x5e4630), 0, -0.05, 0));
      for (const x of [-3, -1.2, 1.2, 3]) g.add(box(0.5, 0.02, 12, lambert(0x4a3622), x, 0.01, 0));
      for (const [x, z, r] of [[-2, 2, 1.2], [2.4, -3, 0.9], [0.4, -0.5, 0.7]]) g.add(mesh(new THREE.CircleGeometry(r, 18).rotateX(-Math.PI / 2), lambert(0x6b6a55), x, 0.03, z));
      return { model: g };
    } },
    { name: 'The tide', color: 0x4f8fb3, has: (l) => l.tide, rules: [
      'The sea comes in over your side of the road, a little further as the clock runs down. Every so often a wave is warned of, floods right across, then drains away and leaves the road bare for a while.',
      `In the water you are slowed (worse the worse your car wades) and steer with ${pct(TI.steerGrip)} grip; in deep water you take up to ${TI.damage} damage a second.`,
      'Good drivers move out of the water\'s way; evil ones plough on through. Waves leave pickups behind in the shallows.',
    ], build: () => {
      const g = road(9, 14);
      const water = mesh(new THREE.PlaneGeometry(5, 14).rotateX(-Math.PI / 2), lambert(0x2e6c8f, { transparent: true, opacity: 0.85 }), 2.7, 0.12, 0);
      const foam = box(0.5, 0.06, 14, glow(0xf2fafd), 0.3, 0.14, 0);
      const gauge = group(box(0.2, 3, 0.2, lambert(0xf6f6f2), 0, 1.5, 0), ...[0.5, 1.5, 2.5].map(y => box(0.22, 0.5, 0.22, lambert(0xd2302a), 0, y, 0)));
      gauge.position.set(5.2, 0, -3);
      g.add(water, foam, gauge);
      return { model: g, tick: (t) => { const reach = 2.7 - (Math.sin(t * 0.8) + 1) * 1.6; water.position.x = reach; foam.position.x = reach - 2.4; } };
    } },
    { name: 'The bullet train', color: 0x1f4fa8, has: (l) => l.railway, rules: [
      `A railway down the middle of the road slows any car crossing it, down to ${pct(CONFIG.railCrossing.slowest)} of its top speed for the worst at crossing.`,
      `Then the bullet train: it appears up the line and comes straight down it at ${kmh(BT.speed)}, about ${BT.warning} s after you're warned. It destroys everything it touches, you included (unless you're a ghost).`,
      `While it is about, the shoulder's police meter runs down at ${pct(BT.dangerMercy)} speed. It can also turn up in your lane as a mystery.`,
    ], build: () => {
      // (full size, filling the card: it stands where it is, and the sleepers run by under it)
      const g = group(box(5, 0.1, 28, lambert(0x6f6a60), 0, -0.05, 0)), sleepers = group();
      for (let z = -12.6; z <= 12.6; z += 1.2) sleepers.add(box(3.2, 0.12, 0.35, lambert(0x5a4636), 0, 0.03, z));
      for (const x of [-0.75, 0.75]) g.add(box(0.12, 0.15, 28, lambert(0x9aa1ab), x, 0.15, 0));
      const train = makeCarriage(true, true);
      train.visible = true;
      g.add(sleepers, train);
      g.rotation.y = Math.PI / 2;
      return { model: group(g), spin: false, tick: (t) => { sleepers.position.z = 0.6 - ((t * 5) % 1.2); } };
    } },
  ] },
  { name: 'Wildlife', cards: [
    { name: 'The giant frog', color: 0x3fa34a, has: (l) => l.frogs?.length, rules: [
      `A huge frog roams a stretch of road, hopping up to ${CONFIG.frogHopMax} m at a time (${CONFIG.frogHopHeight} m up), anywhere across it. You'll hear it croak first.`,
      `Hit it and it bursts: ${CONFIG.obstacleKinds.frog.damage} damage, and you keep ${pct(CONFIG.obstacleKinds.frog.speedKept)} of your speed. Over it while it's in the air, you're fine.`,
    ], build: () => {
      const frog = ob('frog');
      return { model: frog, tick: (t) => { const u = (t * 0.8) % 1; frog.position.y = u < 0.6 ? Math.sin(u / 0.6 * Math.PI) * 1.2 : 0; } };
    } },
    { name: 'Cows', color: 0xf2f2ee, has: (l) => l.herds?.some(h => (h.kind || 'cow') === 'cow'), rules: [
      `A herd wanders back and forth across the road at ${CONFIG.cowSpeed} m/s, stopping a moment at each side.`,
      `Hit one: ${CONFIG.obstacleKinds.cow.damage} damage, and you keep ${pct(CONFIG.obstacleKinds.cow.speedKept)} of your speed.`,
    ], build: () => ({ model: ob('cow') }) },
    { name: 'Kangaroos', color: 0xc08a50, has: (l) => l.herds?.some(h => h.kind === 'kangaroo'), rules: [
      `Kangaroos bound across the road at ${CONFIG.kangarooSpeed} m/s, hopping ${CONFIG.kangarooHop} m high, with a warning sign before their stretch.`,
      `Hit one: ${CONFIG.obstacleKinds.kangaroo.damage} damage, and you keep ${pct(CONFIG.obstacleKinds.kangaroo.speedKept)} of your speed.`,
    ], build: () => {
      const roo = ob('kangaroo');
      return { model: roo, tick: (t) => { roo.position.y = Math.abs(Math.sin(t * CONFIG.kangarooHops * Math.PI)) * CONFIG.kangarooHop; } };
    } },
    { name: 'Drop bears', color: 0x8a8f96, has: (l) => l.dropBears?.length, rules: [
      `They wait up in the gum trees, ${CONFIG.dropBear.height} m over the road, and drop when you come within ${range(CONFIG.dropBear.near, ' m')} (a different distance for each). Down, they stay down.`,
      `Hit one: ${CONFIG.obstacleKinds.dropBear.damage} damage, and you keep ${pct(CONFIG.obstacleKinds.dropBear.speedKept)} of your speed.`,
    ], build: () => {
      const bear = ob('dropBear');
      return { model: bear, tick: (t) => { const u = (t * 0.45) % 1; bear.position.y = u < 0.4 ? 3 * (1 - (u / 0.4) ** 2) : 0; } };
    } },
    { name: 'The great migration', color: 0xd9a441, has: (l) => l.migration?.length, rules: [
      `A great herd of wildebeest and zebra streams across the road, all one way, at ${range(CONFIG.migration.speed, ' m/s')} each, and round again.`,
      `Each one is an obstacle: ${CONFIG.obstacleKinds.wildebeest.damage} damage a time. Look for the gaps.`,
    ], build: () => {
      const w = ob('wildebeest'), z = ob('zebra');
      w.position.x = -1.4; z.position.set(1.4, 0, 1);
      return { model: group(w, z) };
    } },
    { name: 'Elephants', color: 0x8a8784, has: (l) => l.elephants?.length, rules: [
      `Elephants plod across the road and back at ${CONFIG.elephant.speed} m/s, resting a while in the grass at each side.`,
      'Whatever one walks into is destroyed outright: traffic, obstacles, and your car (unless you are a ghost).',
    ], build: () => {
      const e = makeElephant(), { ears } = e.userData;
      return { model: e, tick: (t) => { if (ears) ears.forEach?.((ear, i) => { ear.rotation.y = (i ? -1 : 1) * Math.sin(t * 3) * 0.3; }); } };
    } },
    { name: 'Hippos', color: 0x7d6a72, has: (l) => l.hippos?.length, rules: [
      `A river runs beside the road, and every so often a hippo surfaces and charges across at ${CONFIG.hippo.speed} m/s, aimed at where you'll be.`,
      'Whatever it touches is destroyed, you included (unless you are a ghost), and it carries on into the grass.',
    ], build: () => {
      const h = makeHippo(), { jaw } = h.userData;
      return { model: h, tick: (t) => { jaw.rotation.x = 0.1 + Math.max(0, Math.sin(t * 2)) * 0.55; } };
    } },
  ] },
  { name: 'On the move', cards: [
    { name: 'Drifting junk', color: 0xe8c547, has: (l) => l.drifters?.some(d => d.pattern !== 'dart'), rules: [
      'Obstacles that won\'t keep still: a hurricane\'s beach junk (umbrellas, surfboards, coolers, lifeguard chairs, wrecks) or hay bales, moving about the road in circles, figures of eight, sweeps across and zigzags along it.',
      `Each wobbles off its pattern a little (${pct(D.wobble)}), so no two move quite alike. They hit like any obstacle of their kind.`,
    ], build: () => {
      const u = ob('umbrella', { hw: 1.2, hl: 1.2, height: 3 }), s = ob('surfboard', { hw: 0.6, hl: 0.25, height: 2.6 }), c = ob('cooler', { hw: 0.8, hl: 0.6, height: 1.2 });
      const g = group(u, s, c);
      return { model: g, spin: false, tick: (t) => {
        [u, s, c].forEach((m, i) => { const a = t * 0.9 + i * 2.1; m.position.set(Math.cos(a) * 2.6, 0, Math.sin(a) * 1.6); m.rotation.y = -a; });
      } };
    } },
    { name: 'Darting mines', color: 0xe0e0e0, has: (l) => l.obstacles?.some(o => o.drift === 'dart') || l.drifters?.some(d => d.pattern === 'dart'), rules: [
      `Sea mines that won't stay put: each sits ${range(D.dartRest, ' s')}, shivers for ${D.dartShiver} s (the only warning), then darts off at ${range(D.dartSpeed, ' m/s')}, up to ${D.dartAlong} m along and ${D.dartAcross} m across from its spot. Differently every run.`,
      `Hit one: ${CONFIG.obstacleKinds.mine.damage} damage, and you keep ${pct(CONFIG.obstacleKinds.mine.speedKept)} of your speed.`,
    ], build: () => {
      const m = ob('mine');
      return { model: m, tick: (t) => {
        const from = Math.floor(t / 2.4) % 2 ? 1.6 : -1.6, u = t % 2.4;
        m.position.x = u < 1.5 ? from : u < 1.5 + D.dartShiver ? from + Math.sin(t * 70) * 0.1 : from - 2 * from * Math.min(1, (u - 1.5 - D.dartShiver) / 0.4);
      } };
    } },
    { name: 'The storm', color: 0x7f97b0, has: (l) => l.storm, rules: [
      'A hurricane hurls cars through the air above the road, tumbling end over end.',
      'Only a sight: nothing can hit them, and they never come down on you.',
    ], build: () => {
      const car = painted(vehicle('junker', 0xffffff), 0x8a9a6a), spinner = group(car); // (turning about its middle)
      car.position.y = -CONFIG.vehicles.junker.height / 2;
      return { model: spinner, spin: false, tick: (t, dt) => { spinner.rotation.x += dt * 1.7; spinner.rotation.z += dt * 1.1; spinner.rotation.y += dt * 0.6; } };
    } },
    { name: 'Asteroid fields', color: 0x8d8174, has: (l) => l.asteroidFields?.length, rules: [
      'Rocks of every size scattered over space. About half sit at the road\'s level; the rest pass just over or under it, unmarked, so you can\'t always tell which.',
      `Some drift across the road or bob up and down through it. A hit costs ${CONFIG.obstacleKinds.asteroid.damage} damage for every metre of the rock, up to ${CONFIG.obstacleKinds.asteroid.maxDamage}.`,
    ], build: () => {
      const a = ob('asteroid', { r: 1.6, hw: 1.4, hl: 1.4, height: 3.2 });
      return { model: a, tick: (t, dt) => { a.rotation.x += dt * 0.5; a.position.y = Math.sin(t * 0.9) * 0.4; } };
    } },
    { name: 'Dancing portaloos', color: 0x2f7fd8, has: (l) => l.potties?.length, rules: [
      `Rows of portaloos across the road, dancing in step: hopping (${CONFIG.potties.hop} m up, high enough to drive under), in a wave, sliding ${CONFIG.potties.slide} m to and fro, shuffling, stomping a lane over, or spinning round the row's middle.`,
      `Hit one and it bursts open: ${CONFIG.obstacleKinds.potty.damage} damage.`,
    ], build: () => {
      const row = [0, 1, 2].map(k => { const p = ob('potty'); p.position.x = (k - 1) * 2.6; return p; });
      return { model: group(...row), spin: false, tick: (t) => { row.forEach((p, k) => { const u = ((t / CONFIG.potties.period - k * 0.18) % 1 + 1) % 1; p.position.y = Math.sin(u * Math.PI) * 2.2; }); } };
    } },
  ] },
  { name: 'Construction site and airport', cards: [
    { name: 'Construction machinery', color: 0xf2b51c, has: (l) => l.machinery?.length, rules: [
      `Bulldozers, excavators and dump trucks trundle right across the road and back at ${MA.speed} m/s, waiting a moment off it at each side; road rollers crawl along the shoulder and forklifts back out onto it.`,
      `They're solid: running into one costs ${MA.damage} damage and you keep ${pct(MA.speedKept)} of your speed (it's blown up). Traffic passes through them.`,
    ], build: () => {
      const m = makeMachine('bulldozer');
      return { model: m, tick: (t) => { if (m.userData.beacon) m.userData.beacon.material = Math.floor(t * 4) % 2 ? BEACON_ON : BEACON_OFF; } };
    } },
    { name: 'Trenches', color: 0x8a6a45, has: (l) => l.siteWorks?.some(w => w.kind === 'trench'), rules: [
      `The shoulder is dug up into a deep trench, with a ${S.plateLength} m steel plate laid across it every ${S.plateEvery} m and open gaps between.`,
      `Drive along it and every gap a wheel drops into is a jolt: ${S.trenchDamage} damage, and you keep ${pct(S.trenchKept)} of your speed. Over and over, for as long as you stay on it. Each jolt is a ${pct(S.trenchPuncture)} chance of a flat tyre.`,
      'The lanes themselves are untouched: it is the price of using that shoulder.',
    ], build: () => {
      const g = road(7, 13);
      g.add(box(3.4, 0.1, 13, lambert(0x8a7a5c), 5.2, -0.05, 0));                       // the shoulder's dirt,
      g.add(box(2.4, 0.04, 13, lambert(0x17130f), 5, 0.02, 0));                         // the pit in it, dark and deep,
      for (let z = -6.5; z < 6.5; z += S.plateEvery) g.add(box(2.7, 0.08, S.plateLength, lambert(0x6f757c), 5, 0.06, z + S.plateLength / 2)); // its plates,
      for (const z of [-4.5, 0.5, 5]) {                                             // and the spoil heaped beside it
        const heap = mesh(new THREE.ConeGeometry(1, 1.1, 7), lambert(0x7a5a38), 7.4, 0.5, z);
        heap.scale.z = 1.6;
        g.add(heap);
      }
      for (const z of [-6, 0, 6]) { const c = ob('cone'); c.position.set(3.6, 0, z); g.add(c); }
      return { model: g };
    } },
    { name: 'Site works', color: 0xff8a1a, has: (l) => l.siteWorks?.some(w => w.kind !== 'trench'), rules: [
      `Long-reach excavators swing their buckets out over the road every ${S.swingPeriod} s (${S.bucketDamage} damage); workers push barrows along it and dive clear when you come too close; pipes roll off their stacks across the road (${CONFIG.obstacleKinds.pipe.damage} damage).`,
    ], build: () => {
      const worker = makeWorker(), barrow = ob('barrow'), pipe = ob('pipe');
      barrow.position.z = 1.1;
      pipe.position.set(2.6, 0, -1);
      return { model: group(worker, barrow, pipe) };
    } },
    { name: 'Falling wreckage', color: 0xff5a2a, has: (l) => l.wreckage?.length, rules: [
      'Scripted destruction as you come near: tankers, containers and hangars go up beside the road, a plane falls out of the sky, an airliner comes in to land and slides across the lanes.',
      'Whatever its wreckage lands on is wrecked, and it blocks those lanes for good; traffic pulls over for it. A building can blow out across the road too: keep up and you\'ll be past it, or not.',
    ], build: () => ({ model: makeAirliner(14, 30, true) }) },
    { name: 'The control tower', color: 0xd3cfc5, has: (l) => l.tower, rules: [
      'The airport\'s control tower stands beside the old road where the route turns off, and as you come up to it, it comes crashing down across that road.',
      'Only a sight (it falls across the road you don\'t take). The airport also has its runway, and airliners parked beside it.',
    ], build: () => { const t = makeTower(); t.scale.setScalar(0.16); return { model: t }; } },
  ] },
  { name: 'The Hood', cards: [
    { name: 'Gang houses', color: 0xff2a2a, has: (l) => l.gunfire?.length, rules: [
      `In the gangs' turf, ${pct(GF.gangShare)} of the houses are theirs, marked out for all to see: black, their windows glowing red, a red tag, and a red flag flying from the roof.`,
      `Each fires out across the road from its windows, only within ${Math.round(GF.arc * 180 / Math.PI)}° of straight out, at whatever is passing through that arc within ${GF.range} m, picked at random: ${range(GF.shots)} shots, then a wait of ${range(GF.every, ' s')}.`,
      `A bullet does ${GF.damage} damage and stops in the first thing in its way, so a car between you and the house is a shield. Each hit has a ${pct(GF.puncture)} chance of a puncture.`,
    ], build: () => {
      const black = lambert(0x1c1a1f), red = glow(0xff2a2a), g = new THREE.Group();
      g.add(box(8, 4, 7, black, 0, 2, 0));
      const roof = mesh(new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4), lambert(0x4a423c), 0, 5.1, 0);
      roof.scale.set(9, 2.2, 8);
      g.add(roof);
      for (const x of [-2.2, 2.2]) g.add(box(1.7, 1.2, 0.1, red, x, 1.8, 3.55));
      g.add(box(1.1, 2.2, 0.1, lambert(0xc81e1e), 0, 1.1, 3.56), box(6, 0.8, 0.06, lambert(0xe01818), 0, 3.2, 3.58));
      const flag = box(2.2, 1.4, 0.06, lambert(0xe31b1b), 1.1, 9.5, 0);
      g.add(box(0.14, 5, 0.14, lambert(0x2a2a2a), 0, 7.6, 0), flag, mesh(new THREE.SphereGeometry(0.3, 10, 8), glow(0xff3030), 0, 10.3, 0));
      const flash = mesh(new THREE.SphereGeometry(0.3, 8, 6), glow(0xfff3b0), 2.2, 1.8, 3.8);
      g.add(flash);
      return { model: g, tick: (t) => { flag.rotation.y = Math.sin(t * 4) * 0.25; flash.visible = (t % 1.6) < 0.5 && Math.floor(t * 20) % 2 === 0; } };
    } },
    { name: 'Drive-bys', color: 0xa05ad0, has: (l) => l.traffic?.driveby || l.trafficZones?.some(z => z.traffic.driveby), rules: [
      `A long, low sedan, always evil. Every ${range(DB.every, ' s')} near you it picks a target (you, more often than not, or a car near you), pulls up in the lane beside it and fires ${DB.shots} shots out of the window.`,
      `Then it makes its getaway for good at ${DB.fleePace} times its pace, pushing through the traffic, until it's gone. If it can't get alongside within ${DB.giveUp} s, it gives up.`,
    ], build: () => {
      const car = painted(vehicle('driveby', 0xffffff), 0x3a1840);
      return { model: car, tick: (t) => { car.userData.firing?.(t % 2.4 < 1.1); } };
    } },
    { name: 'Punctures', color: 0xffb03a, has: (l) => l.gunfire?.length || l.traffic?.driveby, rules: [
      `A shot can puncture a tyre. Traffic with a flat pulls over onto the shoulder and stops. You get ${pct(PU.topSpeed)} of your top speed and acceleration, and the car pulls to the flat side.`,
      `Stop to change it: ${PU.fixTime} s stopped in all (braking with a flat takes you right down to a stop). A wrench fixes it on the spot.`,
      `While punctured, and for ${PU.grace} s after, the shoulder's police meter leaves you alone. Armour keeps your tyres from being shot out; a ghost lets the bullets pass straight through; nothing without wheels can be punctured.`,
    ], build: () => {
      const car = painted(vehicle('commuter', 0xffffff), 0xff8a1a);
      car.rotation.z = 0.07;
      const hiss = mesh(new THREE.SphereGeometry(0.25, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }), -1, 0.3, 1.1);
      return { model: group(car, hiss), tick: (t) => { const u = (t * 1.5) % 1; hiss.position.set(-1 - u * 0.8, 0.3 + u * 0.5, 1.1); hiss.material.opacity = 0.6 * (1 - u); hiss.scale.setScalar(0.6 + u * 1.5); } };
    } },
    { name: 'Police stretches', color: 0x2f5fd8, has: (l) => !(l.traffic?.police > 0) && l.trafficZones?.some(z => z.traffic.police > 0), rules: [
      'Police only in some stretches of the level: heavy there, and none at all in the rest (the gangs\' turf).',
      'A police car that comes to the edge of its stretch stays there, parked on the shoulder with its lights going.',
    ], build: () => {
      const car = painted(vehicle('police', 0xffffff), 0xf5f5f5), v = CONFIG.vehicles.police;
      const red = box(0.6, 0.22, 0.35, glow(0xff2a2a), -0.33, v.height + 0.1, -0.15), blue = box(0.6, 0.22, 0.35, glow(0x2a6bff), 0.33, v.height + 0.1, -0.15);
      return { model: group(car, red, blue), tick: (t) => { const on = Math.floor(t * 6) % 2 === 0; red.visible = on; blue.visible = !on; } };
    } },
  ] },
  { name: 'Races and rivals', cards: [
    { name: 'Races', color: 0xd8262b, has: (l) => l.laps, rules: [
      'Laps of a real circuit against a full grid, in F1 cars, GT cars or Le Mans prototypes (the Race cars button on the menu). The slowest start at the front.',
      `Tuck in behind a car (within ${RC.towReach} m) for its slipstream: up to ${pct(RC.draft)} more top speed. Pull out of it and the slingshot carries you on past, the longer the faster the tow had you going.`,
      `A prototype is as quick as an F1 car and much tougher (${LEVEL_CARS.lmp.health} health to its ${LEVEL_CARS.f1.health}); a GT car is slower, and tougher than the F1 too (${LEVEL_CARS.gt.health}).`,
      'Every car understeers in the bends, the walls hurt when you slide into them, and steering into a car\'s side knocks it aside.',
    ], build: () => {
      const f1 = MODELS.f1({ ...LEVEL_CARS.f1 }), gt = MODELS.gt({ ...LEVEL_CARS.gt }), lmp = MODELS.lmp({ ...LEVEL_CARS.lmp });
      f1.position.x = -2.6; gt.position.set(2.6, 0, -1.5); lmp.position.z = 1.2;
      painted(gt, 0x0f4d2c);
      return { model: group(f1, gt, lmp) };
    } },
    { name: 'Rival couriers', color: 0xff2bd6, has: (l) => l.rival, rules: [
      'Up to three other couriers racing you to the drop, each marked with a glowing arrow, and an arrow at the foot of the screen when one is behind you. Each one there first takes its share of your tip.',
      `They're tough (${RV.health} health, no spin-outs), quicker when they've fallen behind, steer round obstacles and grab pickups (yours stay where they are), and win their scrapes with traffic, ramming whatever holds them up.`,
      `They'll use the shoulder and the oncoming lane to get by, but not with the police within ${RV.policeRange} m. An evil one throws packages at you; no package can hit them.`,
    ], build: () => {
      const car = MODELS.miata({ ...CONFIG.vehicles.miata, color: 0x4b1a7a });
      car.userData.stripe?.(0x9dff1f);
      const arrow = group(mesh(new THREE.ConeGeometry(0.5, 0.75, 4).rotateX(Math.PI), glow(0x9dff1f), 0, 0.375, 0), box(0.28, 0.6, 0.28, glow(0x9dff1f), 0, 1.05, 0));
      return { model: group(car, arrow), tick: (t) => { arrow.position.y = CONFIG.vehicles.miata.height + CONFIG.rivalMark.above + Math.sin(t * 3) * 0.15; arrow.rotation.y = t * 1.4; } };
    } },
  ] },
  { name: 'Vehicles', cards: [
    { name: 'Emergency vehicles', color: 0xd8262b, has: (l) => l.emergencies, rules: [
      `Now and then an ambulance comes through at ${kmh(CONFIG.emergency.speed)}, siren going, either way. One coming up behind you is announced.`,
      `Get out of its lane: whatever it closes up behind has ${CONFIG.emergency.giveWay} s to get clear, or is arrested (for you, a bust). Most traffic gives way; a few evil drivers won't. Packages pass over it.`,
    ], build: () => {
      const v = CONFIG.vehicles.ambulance, car = vehicle('ambulance', 0xffffff);
      const z = v.hl * AMBULANCE_BOX - 0.25, y = v.height + 0.16;
      const red = box(0.62, 0.22, 0.35, glow(0xff2a2a), -0.34, y, z), white = box(0.62, 0.22, 0.35, glow(0xffffff), 0.34, y, z);
      const mount = box(1.5, 0.12, 0.6, lambert(0x15171c), 0, v.height + 0.05, z); // (dark, so the white lamp shows on the white roof)
      return { model: group(car, mount, red, white), tick: (t) => { const on = Math.floor(t * 6) % 2 === 0; red.visible = on; white.visible = !on; } };
    } },
    { name: 'Tractors', color: 0x2e8b3d, has: (l) => l.tractors?.length, rules: [
      `Slow farm traffic at ${CONFIG.tractorSpeed} m/s. Each waits where it is until you come near, then sets off.`,
      'On a narrow road the queue behind one is only passed on the wrong side of the road.',
    ], build: () => ({ model: makeTractorModel() }) },
    { name: 'The UFO', color: 0x66f0ff, has: (l) => l.car === 'ufo', rules: [
      `On its level you fly a flying saucer instead of your car: ${kmh(LEVEL_CARS.ufo.maxSpeed)} top speed, very quick off the mark and nimble.`,
    ], build: () => {
      const ufo = makeUfo();
      return { model: ufo, tick: (t, dt) => { ufo.userData.lamps.rotation.y += dt * 4; ufo.position.y = Math.sin(t * 2) * 0.15; } };
    } },
    { name: 'The jetboat', color: 0xe8432e, has: (l) => l.car === 'jetboat', rules: [
      `On its level you drive a jetboat across open water: ${kmh(LEVEL_CARS.jetboat.maxSpeed)} top speed, nimble, bobbing on the chop. The way through is marked by breakwaters and buoys.`,
    ], build: () => {
      const boat = MODELS.jetboat({ ...LEVEL_CARS.jetboat });
      const sea = mesh(new THREE.PlaneGeometry(12, 12).rotateX(-Math.PI / 2), lambert(0x1d7a96), 0, 0.15, 0);
      return { model: group(sea, boat), tick: (t) => boat.userData.animate?.(t) };
    } },
  ] },
  { name: 'The Battlefield', cards: [
    { name: 'Two armies', color: 0x3f7a2e, has: (l) => l.battle, rules: [
      'Every lane runs both ways: your army (green) comes up the road from behind you and on by, the enemy (red) comes slowly down every lane at you.',
      `Jeeps, 8x8s and tanks. Each goes after the other army: 8x8s and tanks turn their guns on the nearest enemy within ${CONFIG.battle.reach} m (the green army's on any red within ${CONFIG.battle.goodFire.reach} m, even behind), jeeps lob packages.`,
      'Each kind in its own shade: jeeps light, 8x8s mid, tanks dark.',
      `A red vehicle that gets ${CONFIG.battle.evilBehind} m past you blows up, so it never thins out the green army coming up behind.`,
      `They steer for head-ons with an enemy they beat (a tank beats an 8x8, an 8x8 a jeep), which tries to dodge ${pct(CONFIG.battle.dodge)} of the time. The winner loses ${pct(CONFIG.battle.win)} of its health; anything else (a jeep and a tank, two of a kind) wrecks both.`,
    ], build: () => {
      const g = road(13, 26), B = CONFIG.battle;
      // (green's three, and red's coming the other way: each kind in its own shade)
      const army = [['jeep', 'good', -3.6, 5], ['apc', 'good', -3.6, -2], ['armytank', 'good', -3.6, -9], ['jeep', 'evil', 3.6, -6], ['apc', 'evil', 3.6, 1], ['armytank', 'evil', 3.6, 8]].map(([model, side, x, z], k) => {
        const kind = ['jeep', 'apc', 'tank'][k % 3], color = B.colors[side][kind];
        const m = MODELS[model]({ ...CONFIG.vehicles[kind], color });
        m.position.set(x, 0, z);
        if (side === 'evil') m.rotation.y = Math.PI;
        g.add(m);
        return m;
      });
      return { model: g, tick: (t) => army.forEach((m, k) => m.userData.aim?.(Math.sin(t * 0.8 + k) * 0.8)) };
    } },
    { name: 'Your 8x8', color: 0x2a5420, has: (l) => l.car === 'apc', rules: [
      `On the Battlefield you drive an 8x8, always in the green army: ${LEVEL_CARS.apc.health} health, heavy and slow to get going, its tyres run flat.`,
      `The throw button fires its small gun (every ${LEVEL_CARS.apc.cannon.cooldown} s) at the nearest red vehicle within ${LEVEL_CARS.apc.cannon.range} m, as a package is aimed, never at your own side; its turret turns to whatever it would fire at; with none in reach, dead ahead. A red jeep takes one shell, an 8x8 two, a tank four (tanks take no critical hits). A blast can break a tank's track: it grinds to a halt where it is, its gun still firing. Enemy shells cost you ${CONFIG.battle.shellOnPlayer.direct} on a direct hit.`,
      `Big Splash: ${CONFIG.bigSplash.gun.damage}x your shells' damage, and their blast reaches ${CONFIG.bigSplash.gun.splash}x as far, catching the enemies about your target.`,
      'You beat a jeep head-on (at half your health); a tank beats you; another 8x8 takes you both out.',
    ], build: () => {
      const m = MODELS.apc({ ...LEVEL_CARS.apc });
      return { model: m };
    } },
    { name: 'Landmines', color: 0xff2a1a, has: (l) => l.landmines?.length, rules: [
      `Mines scattered down the lanes, each with a red light flashing on top. Each lies buried until you are ${CONFIG.battle.mineRise.ahead} m off, then pops up out of the dirt.`,
      '<strong>Touch one and you are destroyed outright</strong>, whatever you are driving (a ghost passes over), and the mine is gone. The traffic pays them no heed, and goes up the same way.',
      'Shells and blasts never set one off: only driving onto it.',
    ], build: () => {
      const g = road(9, 12), mines = [[-2, 3], [2, -1], [-1.5, -4]].map(([x, z]) => { const m = ob('landmine'); m.position.set(x, 0, z); g.add(m); return m; });
      return { model: g, lift: 0.7, tick: (t) => mines.forEach((m, k) => {
        const lit = ((t / CONFIG.battle.mineFlash.period + k * 0.33) % 1) < CONFIG.battle.mineFlash.on;
        m.userData.light.color.setHex(lit ? 0xff2a1a : 0x3a0e0a);
        m.userData.halo.material.opacity = lit ? 0.55 : 0;
      }) };
    } },
    { name: 'Pillboxes', color: 0x9a2a22, has: (l) => l.pillboxes, rules: [
      `Concrete pillboxes beside the road every ${CONFIG.battle.pillboxEvery} m, each side's in its colour, firing bursts at the other army as it passes (as the gang houses do in The Hood). The red ones fire at you.`,
    ], build: () => {
      const g = road(9, 10);
      const red = makePillbox(-1), green = makePillbox(1);
      red.position.set(-7.5, 0, -1);
      red.rotation.y = Math.PI / 2;
      green.position.set(7.5, 0, 2);
      green.rotation.y = -Math.PI / 2;
      g.add(red, green);
      return { model: g };
    } },
  ] },
  { name: 'Gimmick Road', cards: [
    { name: 'Speed cameras', color: 0xf2c21c, has: (l) => l.cameras?.length, rules: [
      `A camera on its pole, on the shoulder or on the centre line, with a speed limit sign ${CONFIG.speedCamera.signAhead} m before it. You are warned of each ${CONFIG.speedCamera.warn} m out. Pass it over its limit (${CONFIG.speedCamera.limit} km/h unless it says otherwise) and the screen flashes white.`,
      `The first time in a run is a <strong>fine</strong>, taken off what you bank, by how far over you were: ${CONFIG.speedCamera.fines.map((f, i, all) => `$${f.fine}${i < all.length - 1 ? ` up to ${all[i + 1].over} km/h over` : ` beyond that`}`).join(', ')}. Every one after that is a <strong>bust</strong>.`,
      'Run it over and there is no offence (just the knock); the sign is only a knock. A radar detector keeps you from being caught at all, but you are still warned.',
    ], build: () => {
      const g = road(9, 12), cam = ob('camera', { height: 4.2 });
      cam.position.set(0, 0, 0);
      cam.rotation.y = Math.PI;
      g.add(cam);
      const sign = ob('limitSign', { height: 3, limit: CONFIG.speedCamera.limit });
      sign.position.set(-3, 0, 4);
      sign.rotation.y = Math.PI;
      g.add(sign);
      return { model: g, tick: (t) => cam.userData.lamp.color.setHex(t % 2 < 0.2 ? 0xffffff : 0x555a60) };
    } },
    { name: 'Funeral processions', color: 0x8a8a9a, has: (l) => l.processions, rules: [
      `Now and then a hearse and ${CONFIG.procession.cars} cars in black, nose to tail in one lane at ${kmh(CONFIG.procession.speed)}, either way. They keep their lane and never throw.`,
      'Crash into any of them and the whole procession is furious with you.',
    ], build: () => {
      const g = road(5, 26);
      const cars = ['hearse', ...CONFIG.procession.kinds.slice(0, CONFIG.procession.cars)];
      let z = 9;
      for (const kind of cars) {
        const car = kind === 'hearse' ? vehicle('hearse', 0x151515) : painted(vehicle(kind, CONFIG.procession.paint), CONFIG.procession.paint);
        car.position.set(1.2, 0, z);
        g.add(car);
        z -= CONFIG.vehicles[kind].hl + 2.8 + CONFIG.procession.gap;
      }
      return { model: g };
    } },
    { name: 'Level crossings', color: 0xd8262b, has: (l) => l.crossings?.length, rules: [
      `As you come within ${CONFIG.crossing.trigger} m the lights flash and the bell rings; the booms come down over ${CONFIG.crossing.lower} s, and ${CONFIG.crossing.warn} s on, a short train shoots across at ${kmh(CONFIG.crossing.speed)}.`,
      'Traffic waits at the booms. Anything on the line as the train goes by is wrecked, you included (unless you are a ghost).',
      `You can't stop, so ease off and arrive after it, or beat it across. A boom down is only a knock (${CONFIG.crossing.boomDamage} damage), and it breaks.`,
    ], build: () => {
      const g = road(9, 12);
      const line = group(box(16, 0.06, 2.8, lambert(0x5b544c), 0, 0.02, 0), box(16, 0.12, 0.1, lambert(0x9aa0a6), 0, 0.1, -0.75), box(16, 0.12, 0.1, lambert(0x9aa0a6), 0, 0.1, 0.75));
      g.add(line);
      const lamps = [glow(0x3a1210), glow(0x3a1210)];
      const post = group(box(0.16, 3.6, 0.16, lambert(0x8a9096), 0, 1.8, 0), box(1.2, 0.45, 0.08, lambert(0x1b1d22), 0, 2.5, 0),
        mesh(new THREE.CircleGeometry(0.17, 14), lamps[0], -0.35, 2.5, 0.05), mesh(new THREE.CircleGeometry(0.17, 14), lamps[1], 0.35, 2.5, 0.05));
      for (const r of [0.6, -0.6]) { const x = box(1.5, 0.22, 0.06, lambert(0xf4f4f4), 0, 3.3, 0); x.rotation.z = r; post.add(x); }
      post.position.set(5, 0, 4);
      const swing = new THREE.Group();
      for (let k = 0; k < 5; k++) swing.add(box(1, 0.14, 0.14, lambert(k % 2 ? 0xf4f4f4 : 0xd8262b), -k - 0.5, 0, 0));
      const pivot = group(swing);
      pivot.position.set(4.6, 1.1, 3.6);
      g.add(post, pivot);
      return { model: g, tick: (t) => {
        const phase = Math.floor(t * 2.5) % 2;
        lamps.forEach((lamp, i) => lamp.color.setHex(i === phase ? 0xff2a1a : 0x3a1210));
        swing.rotation.z = -Math.max(0, Math.sin(t * 0.8)) * Math.PI / 2 * 0.95;
      } };
    } },
    { name: 'Stop / go roadworks', color: 0x2e9b3d, has: (l) => l.stopGo?.length, rules: [
      'On a road of one lane each way, the oncoming side is dug up, so both ways take turns through the one lane left: yours.',
      `A worker at each end turns a STOP / GO sign: ${CONFIG.stopGo.go} s of GO each way, with ${CONFIG.stopGo.clear} s between for the last through to clear. Traffic waits at its STOP; an evil driver may run it.`,
      "Hold the brake to wait at the STOP, or chance it and meet whatever is coming the other way down your lane.",
    ], build: () => {
      const g = road(7, 12);
      g.add(box(3.2, 0.04, 12, lambert(0x3a2a1c), -1.8, 0.02, 0));
      for (let z = -5.5; z <= 5.5; z += 2.2) { const c = ob('cone'); c.position.set(-0.2, 0, z); g.add(c); }
      const worker = makeWorker();
      worker.position.set(4.3, 0, 3);
      const face = mesh(new THREE.CircleGeometry(0.62, 20), glow(0xd8262b), 0.35, 2.85, 0.24);
      worker.add(box(0.06, 1.9, 0.06, lambert(0x8a9096), 0.35, 1.6, 0.2), face);
      g.add(worker);
      return { model: g, tick: (t) => face.material.color.setHex(t % 6 < 3 ? 0xd8262b : 0x2e9b3d) };
    } },
    { name: 'Fog banks', color: 0xc4c9ce, has: (l) => l.fog?.length, rules: [
      `The fog closes right in round you: you can see only ${CONFIG.fog.far} m or so, easing in and out over ${CONFIG.fog.edge} m at each end.`,
      `The police see you from only ${pct(CONFIG.fog.policeSight)} as far as usual: the shoulder is easier to get away with. But everything else turns up late too.`,
    ], build: () => {
      const g = road(9, 14);
      for (const [x, z, r] of [[-3, -3, 2.2], [2.5, -1, 2.6], [0, 3, 2.4], [-2, 1, 1.8], [3, 4, 1.6]]) {
        g.add(mesh(new THREE.SphereGeometry(r, 12, 8), lambert(0xdfe3e6, { transparent: true, opacity: 0.55 }), x, r * 0.5, z));
      }
      return { model: g };
    } },
    { name: 'Potholes', color: 0x55504a, has: (l) => l.potholes?.length, rules: [
      `Ragged holes in the lanes. A wheel dropping into one is a jolt: ${S.potholeDamage} damage, and you keep ${pct(S.potholeKept)} of your speed.`,
      `Each one is a ${pct(S.potholePuncture)} chance of a flat tyre on the side that hit it.`,
    ], build: () => {
      const g = road(9, 12);
      for (const [x, z, r] of [[2.2, -2, 1], [-2, 3, 0.8], [2.6, 3.5, 0.6]]) {
        const rim = mesh(new THREE.CircleGeometry(r * 1.4, 9).rotateX(-Math.PI / 2), lambert(0x4d4a46), x, 0.02, z);
        const hole = mesh(new THREE.CircleGeometry(r, 7).rotateX(-Math.PI / 2), lambert(0x15120f), x, 0.03, z);
        g.add(rim, hole);
        for (let k = 0; k < 4; k++) { const chunk = box(0.2, 0.1, 0.25, lambert(0x3a3b3f), x + Math.cos(k * 1.7) * r * 1.7, 0.05, z + Math.sin(k * 1.7) * r * 1.7); chunk.rotation.y = k; g.add(chunk); }
      }
      return { model: g };
    } },
    { name: 'Rockfall', color: 0x8d8174, has: (l) => l.rockfall?.length, rules: [
      `Rocks come away from the hillside and tumble down onto the road as you come near (${range(CONFIG.rockfall.near, ' m')} short of them), bounding out across it to where they land.`,
      `A rock on the road is an obstacle: ${CONFIG.obstacleKinds.rock.damage} damage. Only you hit them: traffic drives straight through.`,
    ], build: () => {
      const g = road(9, 12), rocks = [0.8, 1.2, 0.6].map((r, k) => { const rock = ob('rock', { r }); rock.position.set(-2.5 + k * 2.6, 0, k - 1); g.add(rock); return rock; });
      return { model: g, tick: (t) => { rocks[2].position.y = Math.max(0, 4 - ((t * 3) % 6)) ; rocks[2].userData.rock.rotation.x = t * 4; } };
    } },
    { name: 'Cyclist pelotons', color: 0xff4f8b, has: (l) => l.pelotons?.length, rules: [
      `A bunch of cyclists riding two abreast by the kerb on your side at ${kmh(CONFIG.peloton.speed)}, setting off as you come within ${CONFIG.peloton.trigger} m.`,
      `Hit one and it is knocked flying (${CONFIG.obstacleKinds.cyclist.damage} damage); with a police car watching, that is a <strong>bust</strong>. Traffic drives straight through them.`,
    ], build: () => {
      const g = road(7, 12), riders = [];
      for (let k = 0; k < 4; k++) { const c = ob('cyclist'); c.position.set(1.6 + (k % 2) * 1.0, 0, 3 - Math.floor(k / 2) * 3); g.add(c); riders.push(c); }
      return { model: g, tick: (t) => riders.forEach((c, k) => c.userData.animate(t + k * 0.7)) };
    } },
  ] },
];

// ---- the page: the groups (a row of buttons to jump to each), then the cards -------------------------
const hex = (color) => '#' + color.toString(16).padStart(6, '0');
const slug = (name) => name.toLowerCase().replace(/[^a-z]+/g, '-');
document.getElementById('groups').innerHTML = GROUPS.map(g => `<a href="#${slug(g.name)}">${g.name}</a>`).join('');
const cardBox = document.getElementById('cards');
const views = [];
for (const g of GROUPS) {
  const heading = document.createElement('h2');
  heading.className = 'group';
  heading.id = slug(g.name);
  heading.textContent = g.name;
  cardBox.append(heading);
  for (const card of g.cards) {
    const levels = where(card.has);
    const el = document.createElement('article');
    el.className = 'card';
    el.style.setProperty('--glow', hex(card.color) + '55');
    el.style.setProperty('--swatch', hex(card.color));
    el.innerHTML = `
      <div class="view"></div>
      <div class="body">
        <h2>${card.name}</h2>
        <ul>${card.rules.map(r => `<li>${r}</li>`).join('')}</ul>
        <p class="levels">${levels.length ? 'In ' + levels.join(', ') : 'Not in any level yet'}</p>
      </div>`;
    cardBox.append(el);
    views.push(makeView(el.querySelector('.view'), card));
  }
}

// ---- a little scene per card: the model on its stand, framed whatever its size ------------------------
function makeView(el, card) {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(3, 6, 5);
  scene.add(sun);
  const { model, tick, spin = true, lift: built } = card.build();
  card.lift = built;
  const turn = new THREE.Group(); // (the turntable: the model turns on it, and animates on its own)
  turn.add(model);
  scene.add(turn);
  // framed: the camera back far enough for the whole of it, looking a little down on it
  // (over the whole of its animation: it is played through a few seconds and measured all the way, so
  // nothing that hops, drops or tumbles goes out of the picture)
  const bounds = new THREE.Box3().setFromObject(model);
  if (tick) {
    for (let t = 0; t < 8; t += 0.1) { tick(t, 0.1); model.updateMatrixWorld(true); bounds.union(new THREE.Box3().setFromObject(model)); }
  }
  const size = bounds.getSize(new THREE.Vector3()), mid = bounds.getCenter(new THREE.Vector3());
  turn.position.set(-mid.x, -bounds.min.y, -mid.z);
  const camera = new THREE.PerspectiveCamera(32, 1.6, 0.1, 400);
  const radius = bounds.getBoundingSphere(new THREE.Sphere()).radius, far = radius / Math.sin(THREE.MathUtils.degToRad(16)) * 0.92;
  const lift = card.lift ?? 0.42; // (how far down it is looked on)
  camera.position.set(0, size.y * 0.5 + far * Math.sin(lift), far * Math.cos(lift));
  camera.lookAt(0, size.y * 0.5, 0);
  return { el, scene, camera, turn, model, tick, spin, phase: Math.random() * 6 };
}

// ---- drawing ------------------------------------------------------------------------------------
const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
let last = performance.now();
const frame = (now) => {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const w = window.innerWidth, h = window.innerHeight;
  const size = renderer.getSize(new THREE.Vector2());
  if (size.x !== w || size.y !== h) renderer.setSize(w, h, false);
  renderer.setScissorTest(false);
  renderer.clear();
  renderer.setScissorTest(true);
  const t = now / 1000;
  for (const v of views) {
    const r = v.el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > h || r.width === 0) continue; // (off screen: neither drawn nor moved)
    const bottom = h - r.bottom;
    renderer.setViewport(r.left, bottom, r.width, r.height);
    renderer.setScissor(r.left, bottom, r.width, r.height);
    v.camera.aspect = r.width / r.height;
    v.camera.updateProjectionMatrix();
    if (v.spin) v.turn.rotation.y += dt * 0.5;
    v.tick?.(t + v.phase, dt);
    renderer.render(v.scene, v.camera);
  }
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
