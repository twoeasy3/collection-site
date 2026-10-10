// ---- MORE FOR THE OLDER THEMES: what was added to the scenery road.js draws for the construction site, Hong Kong,
// Tokyo, Mumbai and the alpine pass when their levels (26 to 30) were brought up to the newest levels' standard.
// road.js draws each of those themes as it always did and then calls the one named here, with what it has for
// standing things beside a road (as a theme with a file of its own is given: see index.js):
//   { theme, add, flat, instances, sideStrip, buildStrip, offRoads, standsClear, clearOfRoads, beside, inJunction,
//     exits, cube, tube, cone, levelGroup, terrainAt }
// Everything here is instanced (one mesh per colour and shape, however many things), goes through the shared tests
// (instances / sideStrip for what stands beside the road; offRoads for what is put at a world point), is laid out
// the same every run (a seed of the level's own), and is placed by the level's own data where there is any: its
// quarries and blasts, its tunnels, its tide, its parades and herds, and its "zones" (a theme's "sets" in
// ../../themes.js: the set-pieces a zone's `scenery` can ask for; a level with no zones gets them in equal shares).
import * as THREE from 'three';
import { CONFIG } from '../../config.js';
import { LEVEL } from '../../levels.js';
import { Track } from '../../track.js';

const seeded = (salt) => {
  let seed = salt + (LEVEL.id || '').length * 7919 + 17;
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
};
const SPHERE = new THREE.SphereGeometry(0.5, 10, 7);
const PYRAMID = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4); // (a square pyramid, a metre each way)
const HILL = new THREE.ConeGeometry(0.5, 1, 9);

// lists of road-placed things by colour and shape ([s, lat, y, sx, sy, sz, to?]: see instances in road.js), each
// drawn as one mesh; and world-placed ones (a point, a size, a turn; or a beam from one point to another), each
// checked against every road as it is put down
export const makeKit = ({ instances, offRoads, levelGroup, cube }) => { // (exported: the fallout zone, a theme with a file of its own, builds with it too)
  const road = new Map(), world = new Map(), o = new THREE.Object3D(), va = new THREE.Vector3(), vb = new THREE.Vector3(), p = {};
  const key = (map, color, geometry, glowing) => {
    const k = geometry.uuid + ':' + color + ':' + (glowing ? 1 : 0);
    if (!map.has(k)) map.set(k, { geometry, color, glowing, list: [] });
    return map.get(k).list;
  };
  const kit = {
    // a list of road-placed entries of that colour (and shape: a cube if not said)
    of: (color, geometry = cube, glowing = false) => key(road, color, geometry, glowing),
    // a world point beside the road: s m along, lat m across, y m over the road there
    point: (s, lat, y = 0) => { const h = Track.toWorld(s, lat, p); return { x: p.x, y: p.y + y, z: p.z, h }; },
    // a thing at a world point (its middle), turned ry; margin: m to keep it off every road (below 0: not checked)
    at: (color, geometry, x, y, z, sx, sy, sz, ry = 0, glowing = false, margin = 0) => {
      if (margin >= 0 && !offRoads(x, z, margin)) return false;
      o.position.set(x, y, z); o.rotation.set(0, ry, 0); o.scale.set(sx, sy, sz); o.updateMatrix();
      key(world, color, geometry, glowing).push(o.matrix.clone());
      return true;
    },
    // a beam from one world point to another (a conveyor, a cable, a boom), w wide and t deep
    span: (color, a, b, w, t, glowing = false, geometry = cube) => {
      if (!offRoads(a.x, a.z, 1) || !offRoads(b.x, b.z, 1) || !offRoads((a.x + b.x) / 2, (a.z + b.z) / 2, 1)) return false;
      va.set(a.x, a.y, a.z); vb.set(b.x, b.y, b.z);
      o.position.copy(va).add(vb).multiplyScalar(0.5); o.rotation.set(0, 0, 0); o.lookAt(vb); o.scale.set(w, t, va.distanceTo(vb)); o.updateMatrix();
      key(world, color, geometry, glowing).push(o.matrix.clone());
      return true;
    },
    draw: () => {
      for (const { geometry, color, glowing, list } of road.values()) instances(geometry, color, list, glowing);
      for (const { geometry, color, glowing, list } of world.values()) {
        if (!list.length) continue;
        const mesh = new THREE.InstancedMesh(geometry, glowing ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshLambertMaterial({ color }), list.length);
        list.forEach((m, i) => mesh.setMatrixAt(i, m));
        levelGroup.add(mesh);
      }
    },
  };
  return kit;
};
// a level's zones for a theme with sets: [{ set, from, to }], the level's own (each zone's `scenery`, if it is one
// of the theme's sets) or, on a level with none, the sets end to end in equal shares
export const setsOf = (theme) => {
  const sets = theme.sets || [], own = (LEVEL.zones || []).filter(z => sets.includes(z.scenery));
  if (own.length) return own.map(z => ({ set: z.scenery, from: z.from, to: z.to }));
  return sets.map((set, i) => ({ set, from: Math.round(Track.length * i / sets.length), to: Math.round(Track.length * (i + 1) / sets.length) }));
};

// ---- construction: the ground worked right up to the fence (a graded verge, wheel tracks), plant standing by the
// road (dozers, tippers, piling rigs, batching plants with their silos), spoil heaps on the skyline. And a level's
// quarries dressed as working ones: a haul road along the floor, a row of stockpiles each under its stacker
// conveyor, a wheel loader, loaded haul trucks, drill rigs on the top bench, an excavator on a bench, a catch
// fence under a face that stands close to the road; a blast siren on its mast before every quarry blast (a
// level's wreckage of kind 'blast' with rock: true) and at each end of every quarry
const construction = (ctx) => {
  const { add, flat, sideStrip, clearOfRoads, beside, cube, tube, cone } = ctx;
  const kit = makeKit(ctx), rand = seeded(31), Q = CONFIG.quarry;
  const YELLOW = 0xf2c21a, DARK = 0x2c3440, STEEL = 0x8a8f96, TYRE = 0x1c1c1c;
  const quarries = (LEVEL.quarries || []).map(q => ({ ...q, sg: q.side === 'left' ? -1 : 1, floorTo: q.floor ?? Q.floorTo }));
  const inQuarry = (s, side, pad = 30) => quarries.some(q => q.sg === side && s > q.from - pad && s < q.to + pad);
  // the verge: graded earth from the fence out, and the tracks the plant has worn along it
  for (const side of [-1, 1]) {
    add(sideStrip(Track.start, Track.end, (s) => beside(side, s, 1.7), (s) => beside(side, s, 11), 0.015, 6), flat(0xa58d69));
    for (const d of [4.4, 6.3]) add(sideStrip(Track.start, Track.end, (s) => beside(side, s, d), (s) => beside(side, s, d + 0.55), 0.03, 6), flat(0x86704f));
  }
  // plant standing by the road, a little way beyond the fence, each side in turn
  const tipper = (s, lat, loaded) => {
    kit.of(YELLOW).push([s - 0.6, lat, 2.5, 3.6, 2.2, 6.4]);
    kit.of(DARK).push([s + 3.8, lat, 2.7, 2.6, 2.2, 2]);
    kit.of(STEEL).push([s + 0.4, lat, 1.25, 2.8, 0.5, 8.6]);
    if (loaded) kit.of(0xa9a092, cone).push([s - 0.6, lat, 4.4, 3.2, 1.8, 5.6]);
    for (const dz of [-2.8, 2.9]) for (const dx of [-1.7, 1.7]) kit.of(TYRE, tube).push([s + dz, lat + dx, 1.0, 2, 0.8, 2]);
  };
  const dozer = (s, lat) => {
    kit.of(YELLOW).push([s, lat, 1.2, 2.6, 1.3, 4.2], [s - 0.5, lat, 2.5, 1.9, 1.4, 1.8]);
    kit.of(DARK).push([s, lat - 1.5, 0.5, 0.6, 1, 4.6], [s, lat + 1.5, 0.5, 0.6, 1, 4.6], [s - 0.5, lat, 2.6, 1.95, 0.8, 1.5]);
    kit.of(STEEL).push([s + 2.7, lat, 0.8, 3.6, 1.5, 0.3]);
  };
  const pilingRig = (s, lat) => {
    kit.of(YELLOW).push([s, lat, 1.4, 3, 1.6, 4.6], [s + 2.6, lat, 9, 0.6, 18, 0.6]);
    kit.of(DARK).push([s, lat - 1.6, 0.5, 0.7, 1, 5.2], [s, lat + 1.6, 0.5, 0.7, 1, 5.2], [s + 2.6, lat, 14, 1, 2.4, 1]);
    kit.of(STEEL, tube).push([s + 3.3, lat, 4, 0.5, 8, 0.5]);
  };
  const batchingPlant = (s, lat) => {
    for (const k of [-1, 1]) {
      kit.of(0xd9d6cc, tube).push([s + k * 2.2, lat, 8, 3.4, 9, 3.4]);
      kit.of(0xd9d6cc, cone).push([s + k * 2.2, lat, 13.2, 3.4, 1.4, 3.4]);
      for (const [dx, dz] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) kit.of(STEEL).push([s + k * 2.2 + dz, lat + dx, 1.8, 0.2, 3.6, 0.2]);
    }
    kit.of(0x3f7d3a).push([s, lat, 15.2, 0.9, 0.5, 6.6]);
    kit.of(0xe86a1e).push([s + 6.5, lat, 2.2, 3, 2.2, 3]);
    kit.of(STEEL).push([s + 6.5, lat, 0.55, 2.6, 1.1, 2.6]);
    const a = kit.point(s + 14, lat, 0.6), b = kit.point(s + 6.5, lat, 3.6);
    kit.span(DARK, a, b, 1, 0.3);
  };
  for (let s = Track.start + 70, k = 0; s < Track.end - 20; s += 130 + rand() * 60, k++) {
    const side = k % 2 ? 1 : -1, d = 13 + rand() * 5, lat = beside(side, s, d);
    if (inQuarry(s, side, 50)) continue;
    [tipper, dozer, pilingRig, batchingPlant, dozer, tipper][k % 6](s, lat, k % 4 === 0);
  }
  // spoil heaps on the skyline, all round
  const mid = kit.point(Track.length / 2, 0);
  for (let k = 0; k < 20; k++) {
    const a = k / 20 * Math.PI * 2 + rand() * 0.25, r = 110 + rand() * 120, h = 26 + rand() * 50;
    const at = clearOfRoads(mid.x, mid.z, Math.sin(a), Math.cos(a), 520 + rand() * 260, r, 40);
    kit.at(k % 3 ? 0x8f7d5e : 0x80705a, HILL, at.x, h / 2 - 2, at.z, r * 2, h, r * 2, rand() * 3, false, -1);
  }
  // a blast siren: a lattice mast, a platform, two red horns and an amber lamp, and a red board on the fence
  const siren = (s, sg) => {
    const lat = beside(sg, s, 4.2);
    for (const [dx, dz] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) kit.of(STEEL).push([s + dz, lat + dx, 5, 0.12, 10, 0.12]);
    for (const y of [2.5, 5, 7.5]) kit.of(STEEL).push([s, lat, y, 1.1, 0.1, 1.1]);
    kit.of(DARK).push([s, lat, 10.1, 1.6, 0.2, 1.6]);
    kit.of(0xd8262b, cone).push([s - 0.5, lat, 10.9, 1.1, 1.3, 1.1], [s + 0.5, lat, 10.9, 1.1, 1.3, 1.1]);
    kit.of(0xffa21a, SPHERE, true).push([s, lat, 11.9, 0.5, 0.5, 0.5]);
    kit.of(0xd8262b).push([s, beside(sg, s, 1.75), 1.5, 0.08, 1.1, 2.4]);
    kit.of(0xf4f4f4).push([s, beside(sg, s, 1.7), 1.5, 0.08, 0.28, 2]);
  };
  for (const e of LEVEL.wreckage || []) if (e.kind === 'blast' && e.rock && !e.road) siren(e.at - 46, e.from === 'left' ? -1 : 1);
  // the quarries
  const STONE = [0xb8b0a0, 0x8f8a80, 0xc9b48a, 0x77726a];
  for (const q of quarries) {
    const joinsBefore = quarries.some(o => o !== q && o.sg === q.sg && o.to === q.from), joinsAfter = quarries.some(o => o !== q && o.sg === q.sg && o.from === q.to);
    if (!joinsBefore) siren(q.from - 8, q.sg);
    if (!joinsAfter) siren(q.to + 8, q.sg);
    if (q.floorTo - Q.floorFrom < 25) {
      // a face close in to the road: a catch fence along its foot, tall posts and three wires
      for (let s = q.from; s < q.to; s += 6) {
        kit.of(STEEL).push([s, beside(q.sg, s, 11.5), 2.2, 0.16, 4.4, 0.16]);
        for (const y of [1.2, 2.6, 4]) kit.of(0x5f646b).push([s, beside(q.sg, s, 11.5), y, 0.05, 0.05, 6.02, [Math.min(q.to, s + 6), beside(q.sg, Math.min(q.to, s + 6), 11.5)]]);
      }
      continue;
    }
    const middle = (q.from + q.to) / 2;
    // the haul road along the floor, and what is on it
    add(sideStrip(q.from, q.to, (s) => beside(q.sg, s, Q.floorFrom + 0.6), (s) => beside(q.sg, s, Q.floorFrom + 7.6), 0.09, 6), flat(0x8d8372));
    for (let s = q.from + 18, k = 0; s < q.to - 14; s += 46 + rand() * 30, k++) tipper(s, beside(q.sg, s, Q.floorFrom + 4), k % 2 === 0);
    // stockpiles in a row, graded, each fed by a stacker conveyor on a trestle
    for (let s = q.from + 28, k = 0; s < q.to - 22; s += 36, k++) {
      if (Math.abs(s - middle) < 44 || Math.abs(s - middle - 26) < 26) continue; // (the crusher and its heap are there)
      const h = 6 + rand() * 3, d = Q.floorFrom + 19, colour = STONE[k % STONE.length];
      kit.of(colour, cone).push([s, beside(q.sg, s, d), h / 2, h * 2.3, h, h * 2.3]);
      const foot = kit.point(s - 15, beside(q.sg, s - 15, d + 9), 1.2), head = kit.point(s - 1, beside(q.sg, s - 1, d + 0.5), h + 1.6);
      if (kit.span(0x3a3d42, foot, head, 1.2, 0.35)) {
        kit.of(0xf2b51c).push([s - 15, beside(q.sg, s - 15, d + 9), 1, 2.2, 2, 2.6]);
        kit.of(STEEL).push([s - 8, beside(q.sg, s - 8, d + 4.8), (h + 2.8) / 4, 0.2, (h + 2.8) / 2, 0.2], [s - 3.5, beside(q.sg, s - 3.5, d + 2), (h + 1.2) * 0.42, 0.2, (h + 1.2) * 0.84, 0.2]);
      }
    }
    // a wheel loader at the big heap
    {
      const s = middle + 8, lat = beside(q.sg, middle + 8, Q.floorFrom + 12);
      kit.of(YELLOW).push([s, lat, 1.7, 2.6, 1.6, 4.4], [s - 1, lat, 3.1, 2, 1.4, 1.8]);
      kit.of(STEEL).push([s + 3.2, lat, 1.0, 3, 1.3, 1.2]);
      for (const dz of [-1.5, 1.6]) for (const dx of [-1.4, 1.4]) kit.of(TYRE, tube).push([s + dz, lat + dx, 0.9, 1.8, 0.7, 1.8]);
    }
    // drill rigs up on the top bench, and an excavator at work on the second
    const topY = Q.benches * Q.benchHeight, topD = q.floorTo + (Q.benches - 0.5) * Q.benchDepth;
    for (const s of [q.from + 70, q.to - 70]) {
      if (s < q.from + 40 || s > q.to - 40) continue;
      kit.of(YELLOW).push([s, beside(q.sg, s, topD), topY + 1, 2.4, 1.4, 4], [s + 1.4, beside(q.sg, s + 1.4, topD), topY + 5.4, 0.4, 9, 0.4]);
      kit.of(DARK).push([s, beside(q.sg, s, topD), topY + 0.3, 2.8, 0.6, 4.4]);
    }
    {
      const s = middle - 46, d = q.floorTo + 1.5 * Q.benchDepth, y = 2 * Q.benchHeight;
      if (s > q.from + 30) {
        kit.of(YELLOW).push([s, beside(q.sg, s, d), y + 1.7, 3, 1.8, 3.6]);
        kit.of(DARK).push([s, beside(q.sg, s, d), y + 0.45, 3.2, 0.9, 4.4]);
        const a = kit.point(s + 1.2, beside(q.sg, s, d), y + 2.4), b = kit.point(s + 5.5, beside(q.sg, s, d - 1), y + 5.6), c = kit.point(s + 8.4, beside(q.sg, s, d - 2), y + 2.2);
        kit.span(YELLOW, a, b, 0.5, 0.6);
        kit.span(YELLOW, b, c, 0.4, 0.5);
      }
    }
  }
  kit.draw();
};

// ---- city: a ring road's places, only where a level's own zones ask for them (the theme's "sets": a city level
// with no zones is drawn as it always was, grey blocks and poles). Along the whole of such a level: a sign gantry
// over the road before each exit and at each end, and the towers of the centre on the skyline to the left (the
// inside of the ring). By zone: 'estate', sound barriers down both sides and slab blocks of flats behind them;
// 'retail', big sheds with coloured fascias across their car park, and totem signs by the road; 'stadium', the
// bowl with its roof and floodlight masts, and banners down the road; 'services', a fuel canopy, a shop, a sign
// mast and lorries parked up; 'centre', glass towers close in on both sides. The big pieces stand on the left,
// away from the exits' side roads; road.js leaves its own blocks out where one stands (cityKeepsClear)
const CITY_SETS = ['estate', 'retail', 'stadium', 'services', 'centre'];
const cityZones = () => (LEVEL.zones || []).filter(z => CITY_SETS.includes(z.scenery));
const STADIUM = { reach: 190 }, SERVICES = { reach: 130 }; // m each way from the middle of its zone that it takes up
// is that stretch of that side (-1 left, 1 right) kept clear of the theme's own blocks, for a set-piece?
export const cityKeepsClear = (s, side) => cityZones().some(z => {
  if (s < z.from || s >= z.to) return false;
  const middle = (z.from + z.to) / 2;
  return z.scenery === 'centre' || (side < 0 && (z.scenery === 'retail' || (z.scenery === 'stadium' && Math.abs(s - middle) < STADIUM.reach) || (z.scenery === 'services' && Math.abs(s - middle) < SERVICES.reach)));
});
const city = (ctx) => {
  const zones = cityZones();
  if (!zones.length) return;
  const { add, flat, sideStrip, beside, cube, tube } = ctx;
  const kit = makeKit(ctx), rand = seeded(53);
  const STEEL = 0x8a8f96, DARK = 0x2c3440, WHITE = 0xf2f2ee, WINDOW = 0x3b4654, GLASS = [0x5f8fb4, 0x4a7396, 0x7aa6c2, 0x3f5f7d, 0x86b0b8];
  const RED = 0xd8262b, BLUE = 0x1f5fa8, GREEN = 0x2f8a4a, FASCIA = [RED, BLUE, 0xf2c21a, GREEN, 0xe8731c];
  const inZone = (set, s) => zones.some(z => z.scenery === set && s >= z.from && s < z.to);
  // a sign gantry over the whole road: two legs, a truss, blue boards with white lettering (a green one for an exit)
  const gantry = (s, exit) => {
    const lo = Track.lo(s) - 1.2, hi = Track.hi(s) + 1.2, mid = (lo + hi) / 2, w = hi - lo;
    kit.of(STEEL).push([s, lo, 3.6, 0.5, 7.2, 0.5], [s, hi, 3.6, 0.5, 7.2, 0.5], [s, mid, 7.0, w, 0.3, 0.5], [s, mid, 6.1, w, 0.2, 0.5]);
    for (let lat = lo + 1.5; lat < hi; lat += 3) kit.of(STEEL).push([s, lat, 6.55, 0.12, 0.9, 0.12]);
    for (const [share, colour] of exit ? [[0.3, BLUE], [0.78, GREEN]] : [[0.3, BLUE], [0.7, BLUE]]) {
      const lat = lo + w * share, bw = w * 0.3;
      kit.of(colour).push([s - 0.35, lat, 6.6, bw, 2.2, 0.15]);
      kit.of(WHITE).push([s - 0.45, lat, 7.1, bw * 0.7, 0.28, 0.06], [s - 0.45, lat - bw * 0.12, 6.5, bw * 0.46, 0.22, 0.06], [s - 0.45, lat + bw * 0.3, 6.1, bw * 0.18, 0.5, 0.06]);
    }
  };
  gantry(160, false);
  for (const x of LEVEL.exits || []) gantry(x.exitAt - 130, true);
  gantry(Track.length - 90, false);
  // the centre on the skyline, inside the ring: towers a long way off to the left, taller and nearer towards the end
  for (let s = 100, k = 0; s < Track.length; s += 55 + rand() * 60, k++) {
    const near = s / Track.length, d = 230 - near * 70 + rand() * 170, h = 55 + rand() * 75 + near * 35, w = 16 + rand() * 14;
    if (inZone('centre', s)) continue;
    kit.of(GLASS[k % GLASS.length]).push([s, beside(-1, s, d), h / 2, w, h, w]);
    if (k % 3 === 0) kit.of(DARK).push([s, beside(-1, s, d), h + 5, 1, 10, 1]);
  }
  // a slab block of flats: its bands of windows, a lift tower on the roof
  const flats = (s, lat, colour) => {
    const h = 30 + rand() * 18, w = 13, l = 30;
    kit.of(colour).push([s, lat, h / 2, w, h, l]);
    for (let y = 4; y < h - 1; y += 3.2) kit.of(WINDOW).push([s, lat, y, w + 0.15, 1.1, l - 2.4]);
    kit.of(0x6b7078).push([s - 6, lat, h + 1.6, 5, 3.2, 5]);
  };
  // a totem: a mast by the road with a stack of boards on it
  const totem = (s, lat, colours) => {
    kit.of(STEEL).push([s, lat, 5, 0.5, 10, 0.5]);
    colours.forEach((colour, i) => kit.of(colour).push([s, lat, 10.2 + i * 1.9, 4.6, 1.7, 0.5]));
  };
  for (const z of zones) {
    const middle = (z.from + z.to) / 2;
    if (z.scenery === 'estate') {
      // sound barriers: concrete panels with a clear strip along the top, a green one every fourth, a post every other
      for (const side of [-1, 1]) {
        for (let s = z.from + 3, k = 0; s < z.to; s += 6, k++) {
          const lat = beside(side, s, 3.2);
          kit.of(k % 4 === 0 ? 0x6f9a78 : 0xb9b6ab).push([s, lat, 1.6, 0.25, 3.2, 5.9]);
          kit.of(0xbfe0ea).push([s, lat, 3.55, 0.12, 0.7, 5.9]);
          if (k % 2 === 0) kit.of(STEEL).push([s - 3, lat, 2, 0.35, 4, 0.35]);
        }
      }
      for (let s = z.from + 50, k = 0; s < z.to - 20; s += 85, k++) flats(s, beside(k % 2 ? 1 : -1, s, 62 + rand() * 14), [0xd9cdb4, 0xb98a6a, 0xc9c4b8][k % 3]);
    } else if (z.scenery === 'retail') {
      // the car park, its lamps and the cars in it; the sheds across it, each with its fascia and its doors
      add(sideStrip(z.from + 20, z.to - 20, (s) => beside(-1, s, 12), (s) => beside(-1, s, 60), 0.02, 6), flat(0x4a4d53));
      for (let s = z.from + 60, k = 0; s < z.to - 50; s += 105, k++) {
        const lat = beside(-1, s, 78);
        kit.of(0xd6d3c8).push([s, lat, 5, 30, 10, 62]);
        kit.of(FASCIA[k % FASCIA.length]).push([s, lat + 15.3, 8.2, 0.5, 2.6, 62]);
        kit.of(WHITE).push([s, lat + 15.7, 8.2, 0.2, 1.1, 22]);
        kit.of(0x9aa0a8).push([s, lat, 10.3, 31, 0.6, 63]);
        kit.of(WINDOW).push([s, lat + 15.2, 2, 0.3, 3.4, 16]);
      }
      const PAINT = [RED, WHITE, 0x1f3f8f, 0x23262b, 0xc9ccd2, GREEN];
      for (let s = z.from + 30, k = 0; s < z.to - 30; s += 44, k++) {
        for (const d of [22, 46]) {
          kit.of(STEEL).push([s, beside(-1, s, d), 4.5, 0.25, 9, 0.25]);
          kit.of(0xfff3c4, cube, true).push([s, beside(-1, s, d), 9.1, 2.2, 0.2, 0.6]);
        }
        [17, 28, 40, 52].forEach((d, i) => { if ((k + i) % 3) kit.of(PAINT[(k * 3 + i) % PAINT.length]).push([s + 9, beside(-1, s + 9, d), 0.8, 1.9, 1.3, 4.3]); });
      }
      for (let s = z.from + 110, k = 0; s < z.to - 40; s += 210, k++) totem(s, beside(-1, s, 7), [FASCIA[k % 5], FASCIA[(k + 1) % 5], FASCIA[(k + 2) % 5]]);
    } else if (z.scenery === 'stadium') {
      const s = middle, lat = beside(-1, s, 150), R = 150;
      kit.of(0xc9ccd2, tube).push([s, lat, 12, R, 24, R]);             // the bowl,
      kit.of(RED, tube).push([s, lat, 17, R + 1, 3, R + 1]);           // a band of the club's red round it,
      kit.of(WINDOW, tube).push([s, lat, 6, R + 0.6, 2.4, R + 0.6]);   // its concourse windows,
      kit.of(WHITE, tube).push([s, lat, 25.2, R + 14, 2.4, R + 14]);   // and its roof, out over the stands
      for (const [ds, dl] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {    // four floodlight masts
        const ms = s + ds * 82, ml = lat + dl * 82;
        kit.of(STEEL).push([ms, ml, 26, 1.4, 52, 1.4]);
        kit.of(DARK).push([ms, ml, 53.5, 12, 6, 0.6]);
        kit.of(0xfff8d8, cube, true).push([ms, ml, 53.5, 11, 5, 1]);
      }
      // banners on masts down the road, in the club's red and white
      for (let b = z.from + 20, k = 0; b < z.to - 10; b += 38, k++) {
        for (const side of [-1, 1]) {
          const bl = beside(side, b, 3.4);
          kit.of(STEEL).push([b, bl, 3.5, 0.18, 7, 0.18]);
          kit.of(k % 2 ? WHITE : RED).push([b, bl + side * 0.6, 5.4, 1, 2.6, 0.08]);
        }
      }
    } else if (z.scenery === 'services') {
      const s = middle, at = (ds, d) => [s + ds, beside(-1, s + ds, d)];
      add(sideStrip(s - SERVICES.reach + 10, s + SERVICES.reach - 10, (q) => beside(-1, q, 6), (q) => beside(-1, q, 64), 0.02, 6), flat(0x4a4d53));
      kit.of(WHITE).push([...at(0, 24), 6.2, 16, 0.9, 34]);            // the canopy,
      kit.of(RED).push([...at(0, 24), 5.6, 16.3, 0.5, 34.3]);          // its red fascia,
      for (const ds of [-12, 0, 12]) for (const dd of [-5, 5]) kit.of(STEEL).push([...at(ds, 24 + dd), 2.9, 0.5, 5.8, 0.5]);
      for (const ds of [-12, -4, 4, 12]) kit.of(RED).push([...at(ds, 24), 0.9, 0.8, 1.8, 1.6]); // the pumps
      kit.of(0xe6e1d2).push([...at(0, 50), 3, 14, 6, 44]);             // the shop and cafe, under a green roof
      kit.of(GREEN).push([...at(0, 50), 6.3, 15, 0.6, 45]);
      kit.of(WINDOW).push([...at(0, 42.9), 2.2, 0.3, 3, 36]);
      totem(s - 96, beside(-1, s - 96, 7), [RED, WHITE, GREEN, 0xf2c21a]); // its sign, seen from well back
      for (let ds = 40, k = 0; ds < SERVICES.reach - 20; ds += 7, k++) {   // lorries parked up side by side beyond it
        kit.of([RED, BLUE, WHITE, GREEN][k % 4]).push([...at(ds, 22), 2.3, 2.6, 2.8, 2.6]);
        kit.of([WHITE, 0xc9ccd2, 0xe8731c][k % 3]).push([...at(ds, 31), 2.6, 2.6, 3.6, 13]);
      }
    } else if (z.scenery === 'centre') {
      // glass towers close in on both sides: bands of lit floors, a dark ground floor, masts on some
      for (let s = z.from + 14, k = 0; s < z.to + 120; s += 30 + rand() * 14, k++) {
        for (const side of [-1, 1]) {
          const w = 16 + rand() * 10, h = 38 + rand() * 80, d = 9 + w / 2 + rand() * 26, lat = beside(side, s, d);
          kit.of(GLASS[(k + (side > 0 ? 2 : 0)) % GLASS.length]).push([s, lat, h / 2, w, h, w]);
          for (let y = 6; y < h - 2; y += 9) kit.of(0xdfeaf2).push([s, lat, y, w + 0.2, 0.7, w + 0.2]);
          kit.of(WINDOW).push([s, lat, 2.2, w + 0.3, 4.4, w + 0.3]);
          if ((k + (side > 0 ? 1 : 0)) % 3 === 0) kit.of(DARK).push([s, lat, h + 6, 0.8, 12, 0.8]);
        }
      }
    }
  }
  kit.draw();
};

// ---- the bush road (the 'panorama' theme: road.js's bathurst scenery, roadside) as outback country: Outback
// Express's places. Only where a level's own zones ask for one of the theme's sets (a level with no zones,
// Panorama Avenue, gets nothing of this, and nor does the circuit):
//   roadhouse   a forecourt on the right: the long low roadhouse with its veranda, a fuel canopy and two pumps, a
//               tall sign, a tank on a stand and a windmill
//   siding      at the zone's level crossing: three grain silos, an elevator and its conveyor on one side before
//               the line, a station hut with its name board and a signal on the other, a tank on a stand after it
//   floodway    depth posts down both edges, a warning board at each end, the creek's sand either side of the dip
//   homestead   a tin-roofed house with a veranda, its rainwater tank, a shed, a windmill and a post-and-rail fence
// and, on such a level, flat-topped ranges on the skyline. Everything stands on the land where it is (terrainAt),
// within about 26 m of the road's edge; road.js keeps its gum trees out of each one's yard (outbackYard)
const outbackPlaces = (theme) => {
  const sets = theme.sets || [];
  return (LEVEL.zones || []).filter(z => sets.includes(z.scenery)).map((z, k) => {
    const crossing = (LEVEL.crossings || []).map(c => Track.place ? Track.place(c) : c.s).find(s => s >= z.from && s <= z.to);
    return { set: z.scenery, from: z.from, to: z.to, k, at: z.scenery === 'siding' && crossing !== undefined ? crossing : (z.from + z.to) / 2,
      side: z.scenery === 'roadhouse' ? 1 : k % 2 ? 1 : -1 };
  });
};
// is a spot d m off the road's edge on that side, s m along, in one of those places' yards? (no tree there)
export const outbackYard = (theme, s, side, d) => {
  if (!theme.sets || theme.scenery !== 'bathurst' || !(LEVEL.zones || []).length) return false;
  if (outbackYard.level !== LEVEL) { outbackYard.level = LEVEL; outbackYard.places = outbackPlaces(theme); }
  return outbackYard.places.some(p => p.set === 'roadhouse' ? side === p.side && d < 36 && Math.abs(s - p.at) < 56
    : p.set === 'siding' ? d < 28 && s > p.at - 92 && s < p.at + 56
    : p.set === 'homestead' ? side === p.side && d < 32 && Math.abs(s - p.at) < 44
    : d < 14 && s > p.from && s < p.to);
};
const bathurst = (ctx) => {
  const { theme, add, flat, sideStrip, offRoads, beside, cube, tube, cone, terrainAt } = ctx;
  const places = outbackPlaces(theme);
  if (!places.length) return;
  const kit = makeKit(ctx), rand = seeded(53);
  const CREAM = 0xe6dcc3, TIN = 0x9aa3a8, RUST = 0x9c4a32, STEEL = 0x8a8f96, DARK = 0x2c3440, WOOD = 0x6b5a45, WHITE = 0xf4f4f4, TANK = 0xb9bcc0, RED = 0xd8262b;
  // a thing standing on the land d m off the edge on that side, s m along, turned with the road: w across, h
  // high, l along, its foot `up` m over the ground
  const put = (color, s, side, d, w, h, l, up = 0, geometry = cube, glowing = false) => {
    const q = kit.point(s, beside(side, s, d)), y = terrainAt ? Math.max(terrainAt(q.x, q.z), q.y - 1.5) : q.y;
    return kit.at(color, geometry, q.x, y + up + h / 2, q.z, w, h, l, q.h, glowing, 1.5);
  };
  const spot = (s, side, d, up) => { const q = kit.point(s, beside(side, s, d)); q.y = (terrainAt ? Math.max(terrainAt(q.x, q.z), q.y - 1.5) : q.y) + up; return q; };
  const legs = (color, s, side, d, half, h, t = 0.16) => { for (const [ds, dd] of [[-half, -half], [half, -half], [-half, half], [half, half]]) put(color, s + ds, side, d + dd, t, h, t); };
  // a tank on a stand
  const tankStand = (s, side, d) => {
    legs(WOOD, s, side, d, 1.3, 4.2, 0.22);
    put(WOOD, s, side, d, 3.4, 0.2, 3.4, 4.2);
    put(TANK, s, side, d, 3.6, 2.6, 3.6, 4.4, tube);
    put(TIN, s, side, d, 3.8, 0.7, 3.8, 7, cone);
  };
  // a windmill: a lattice mast, its wheel face on to the road, a tail vane
  const windmill = (s, side, d) => {
    legs(STEEL, s, side, d, 0.7, 8.6, 0.12);
    for (const y of [2.6, 5.2, 7.8]) put(STEEL, s, side, d, 1.5, 0.08, 1.5, y);
    const top = 9.4, r = 1.9;
    for (let a = 0; a < 4; a++) {
      const ca = Math.cos(a * Math.PI / 4) * r, sa = Math.sin(a * Math.PI / 4) * r;
      kit.span(TANK, spot(s - ca, side, d, top - sa), spot(s + ca, side, d, top + sa), 0.5, 0.06);
    }
    put(DARK, s, side, d, 0.3, 0.3, 0.3, top - 0.15);
    put(TANK, s, side, d + side * 0 + 1.6, 1.8, 0.9, 0.06, top - 0.45);
  };
  const roadhouse = (p) => {
    const s = p.at, side = p.side;
    put(0x9a9486, s - 4, side, 11.5, 17, 0.1, 62);                                    // the forecourt
    put(CREAM, s + 12, side, 25, 9, 3.6, 24);                                          // the house
    put(RUST, s + 12, side, 25, 10.6, 0.5, 25.6, 3.6);
    put(RUST, s + 12, side, 18.8, 3.6, 0.18, 24, 2.9);                                 // its veranda
    for (let k = 0; k < 5; k++) put(WOOD, s + 0.5 + k * 5.75, side, 17.2, 0.18, 2.9, 0.18);
    put(DARK, s + 8, side, 20.4, 0.1, 1.3, 9, 1.1);
    put(DARK, s + 19, side, 20.4, 0.1, 2.2, 1.4);
    put(0xf2c21a, s + 12, side, 20, 0.3, 1, 12, 4.1);                                  // the board over the door
    put(RED, s + 12, side, 19.8, 0.1, 0.36, 9, 4.42);
    for (const ds of [-4.5, 4.5]) for (const dd of [-2.4, 2.4]) put(STEEL, s - 18 + ds, side, 10 + dd, 0.3, 4.8, 0.3); // the canopy
    put(WHITE, s - 18, side, 10, 7.4, 0.5, 12, 4.8);
    put(RED, s - 18, side, 10, 7.6, 0.24, 12.2, 4.9);
    for (const ds of [-2.6, 2.6]) { put(RED, s - 18 + ds, side, 10, 0.8, 1.6, 1); put(WHITE, s - 18 + ds, side, 10, 0.84, 0.4, 1.04, 1.0); }
    put(0xc9c2b2, s - 18, side, 10, 1.6, 0.25, 8.4);
    put(STEEL, s - 44, side, 4.6, 0.34, 9.5, 0.34);                                    // the sign by the road
    put(0xf2c21a, s - 44, side, 4.6, 3.6, 2.2, 0.3, 7.2);
    put(RED, s - 44, side, 4.6, 3.6, 0.7, 0.34, 6.4, cube, true);
    tankStand(s + 34, side, 24);
    windmill(s + 44, side, 13);
    for (let k = 0; k < 3; k++) put(k % 2 ? 0x3d6fa8 : RED, s + 28 + k * 1.2, side, 17, 0.9, 1.3, 0.9, 0, tube); // drums by the wall
  };
  const siding = (p) => {
    const c = p.at, side = p.side, far = -side;
    for (let k = 0; k < 3; k++) {                                                      // the silos
      put(0xd9d6cc, c - 78 + k * 9.4, side, 17, 8, 15, 8, 0, tube);
      put(TANK, c - 78 + k * 9.4, side, 17, 8.2, 2.6, 8.2, 15, cone);
      put(STEEL, c - 78 + k * 9.4, side, 17, 8.15, 0.3, 8.15, 5, tube);
      put(STEEL, c - 78 + k * 9.4, side, 17, 8.15, 0.3, 8.15, 10, tube);
    }
    put(0xc9c4b8, c - 46, side, 17, 4, 21, 4);                                         // the elevator, and its conveyor over the silos
    put(RUST, c - 46, side, 17, 4.6, 0.5, 4.6, 21);
    kit.span(STEEL, spot(c - 46, side, 17, 20), spot(c - 78, side, 17, 17.6), 1.2, 0.5);
    put(0x9a9486, c - 60, side, 9, 6, 0.1, 44);
    put(0xd8c9a2, c - 40, far, 9.5, 4.4, 3, 9);                                        // the station hut, its awning and its name board
    put(RUST, c - 40, far, 9.5, 5.2, 0.4, 10, 3);
    put(RUST, c - 40, far, 6.2, 2.4, 0.14, 9, 2.6);
    put(DARK, c - 40, far, 7.25, 0.1, 1.9, 1.1);
    for (const ds of [-2.2, 2.2]) put(WOOD, c - 52 + ds, far, 4.2, 0.16, 2.2, 0.16);
    put(WHITE, c - 52, far, 4.2, 0.12, 0.9, 5, 1.5);
    put(DARK, c - 52, far, 4.1, 0.1, 0.34, 3.6, 1.78);
    put(STEEL, c - 24, far, 4, 0.24, 6.4, 0.24);                                       // the signal
    put(RED, c - 24, far, 4.9, 2, 0.4, 0.12, 5.6);
    put(WHITE, c - 24, far, 4.5, 0.5, 0.42, 0.14, 5.6);
    put(RED, c - 24, far, 4, 0.36, 0.36, 0.36, 6.4, SPHERE, true);
    tankStand(c + 36, far, 11);
    for (let k = 0; k < 4; k++) put(0x4a3a2c, c + 30, side, 8 + k * 0.1, 2.6, 0.3 * (4 - k) / 4 + 0.3, 3 + k * 0.4, k * 0.3); // a stack of sleepers
  };
  const floodway = (p) => {
    for (const side of [-1, 1]) {
      add(sideStrip(p.from + 30, p.to - 30, (s) => beside(side, s, 1.7), (s) => beside(side, s, 11), 0.02, 6), flat(0xcdb07c)); // the creek's sand
      for (let s = p.from + 20; s <= p.to - 20; s += 16) {
        kit.of(WHITE).push([s, beside(side, s, 2.1), 1.2, 0.2, 2.4, 0.2]);
        for (const y of [0.5, 1.0, 1.5]) kit.of(0x1c1c1c).push([s, beside(side, s, 2.1), y, 0.22, 0.1, 0.22]);
        kit.of(RED).push([s, beside(side, s, 2.1), 2.3, 0.24, 0.3, 0.24]);
      }
    }
    for (const [s, side] of [[p.from, 1], [p.to, -1]]) {                               // FLOODWAY boards
      kit.of(STEEL).push([s, beside(side, s, 3), 1.1, 0.14, 2.2, 0.14]);
      kit.of(0xf2c21a).push([s, beside(side, s, 3), 2.6, 2.2, 1.3, 0.1]);
      kit.of(0x1c1c1c).push([s - side * 0.06, beside(side, s, 3), 2.6, 1.6, 0.24, 0.1]);
    }
    for (let k = 0; k < 10; k++) {                                                     // stones in the creek bed
      const s = p.from + 40 + rand() * (p.to - p.from - 80), side = k % 2 ? 1 : -1, w = 0.8 + rand() * 1.4;
      kit.of(0xb8915c, SPHERE).push([s, beside(side, s, 4 + rand() * 6), w * 0.2, w, w * 0.6, w * 1.2]);
    }
  };
  const homestead = (p) => {
    const s = p.at, side = p.side;
    put(CREAM, s, side, 18, 9, 3, 13);                                                 // the house
    put(TIN, s, side, 18, 11.6, 2.6, 15.6, 3, PYRAMID);
    put(0x7f8a90, s, side, 12.2, 2.8, 0.14, 13, 2.5);                                  // the veranda
    for (let k = 0; k < 4; k++) put(WOOD, s - 6.2 + k * 4.13, side, 11, 0.16, 2.5, 0.16);
    put(DARK, s - 3.5, side, 13.45, 0.1, 1.2, 2.2, 1.1);
    put(DARK, s + 3.5, side, 13.45, 0.1, 1.2, 2.2, 1.1);
    put(RUST, s, side, 13.45, 0.1, 2.1, 1.1);
    put(0x8b4a3a, s - 4, side, 20, 1, 5.6, 1);                                         // the chimney
    put(TANK, s + 9.4, side, 19, 3.6, 3.2, 3.6, 0, tube);                              // the rainwater tank
    put(TIN, s + 9.4, side, 19, 3.8, 0.6, 3.8, 3.2, cone);
    put(RUST, s + 24, side, 21, 7, 3.6, 9);                                            // the shed
    put(TIN, s + 24, side, 21, 7.8, 0.3, 9.8, 3.6);
    put(DARK, s + 24, side, 17.45, 0.1, 2.8, 4);
    windmill(s - 22, side, 14);
    for (let q = s - 36; q < s + 36; q += 4) {                                         // the fence, a gap at the gate
      kit.of(WOOD).push([q, beside(side, q, 5), 0.6, 0.16, 1.2, 0.16]);
      if (Math.abs(q + 2 - s) < 3) continue;
      for (const y of [0.45, 0.95]) kit.of(WOOD).push([q, beside(side, q, 5), y, 0.07, 0.1, 4, [q + 4, beside(side, q + 4, 5)]]);
    }
    put(RED, s - 3.6, side, 3.6, 0.4, 0.4, 0.6, 1.1);                                  // the mailbox
    put(WOOD, s - 3.6, side, 3.6, 0.12, 1.1, 0.12);
  };
  const draw = { roadhouse, siding, floodway, homestead };
  for (const p of places) draw[p.set](p);
  // the ranges on the skyline: flat-topped, red, a long way off to either side all down the road
  for (let k = 0; k < 12; k++) {
    const s = (k + 0.5) / 12 * Track.length, side = k % 2 ? 1 : -1, r = 110 + rand() * 120, h = 50 + rand() * 50;
    const q = kit.point(s, side * (400 + rand() * 220)), turn = rand() * 3;
    if (!offRoads(q.x, q.z, r * 1.6 + 140)) continue;
    kit.at(k % 3 ? 0xa5603c : 0xb4703f, tube, q.x, h / 2 - 6, q.z, r * 2, h, r * 2.6, turn, false, -1);
    kit.at(0x8f5234, tube, q.x, h * 0.2 - 6, q.z, r * 2.5, h * 0.4, r * 3.1, turn, false, -1);
  }
  kit.draw();
};

export const THEME_EXTRAS = { construction, city, bathurst };
