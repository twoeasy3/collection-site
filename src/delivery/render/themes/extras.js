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
const makeKit = ({ instances, offRoads, levelGroup, cube }) => {
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
const setsOf = (theme) => {
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

// ---- zones (the coast): race day, on a level with pelotons (Tour de Coast; nothing on a coast level without them):
// an arch over the road at the start, before the cliff road (for the climb), into the harbour (for the sprint) and
// with the finish in sight; crowd barriers hung with banners and a crowd behind them where a bunch sets off and all
// down the finishing straight, team tents and camper vans on the verge, flags on poles through the harbour. And the
// place: a lighthouse and its cottage on the headland, fishing boats off the causeway, a jetty of yachts and a
// harbour light off the harbour. Nothing in the zone of the cliffs (the cliff stands on one side, the rail on the other)
const raceDay = (ctx) => {
  if (!(LEVEL.pelotons || []).length) return;
  const { beside, cube, tube, cone } = ctx;
  const kit = makeKit(ctx), rand = seeded(53);
  const zones = LEVEL.zones || [], zoneAt = (s) => zones.find(z => s >= z.from && s < z.to), looks = (s) => zoneAt(s)?.scenery;
  const BANNERS = [0xe23b3b, 0xf2c21a, 0x2f7fd0, 0x3aa655, 0xf4f4f0, 0xe8721c], SHIRTS = [0xd94b4b, 0x3f6fc4, 0xf0d24a, 0x4aa36a, 0xf2f2ee, 0x8a4fb0, 0x2f3542, 0xe98a3a];
  const SKIN = [0xe6b894, 0xc98e63, 0x8a5a3c], WHITE = 0xf6f6f2, STEEL = 0x8a8f96;
  // an arch over the whole road: two fat legs and a beam, a banner hung under it
  const arch = (s, color, trim) => {
    const lo = beside(-1, s, 1.3), hi = beside(1, s, 1.3), mid = (lo + hi) / 2;
    for (const lat of [lo, hi]) kit.of(color, tube).push([s, lat, 3.3, 1.2, 6.6, 1.2]);
    kit.of(color).push([s, mid, 7.1, hi - lo + 1.2, 1.3, 1.2]);
    kit.of(trim).push([s - 0.7, mid, 6.1, (hi - lo) * 0.55, 0.8, 0.15]);
  };
  // crowd barriers along a verge, a banner on every one, and people behind them (share: how many of the places are taken)
  const crowd = (from, to, side, share) => {
    for (let s = from, k = 0; s < to; s += 4, k++) {
      kit.of(STEEL).push([s, beside(side, s, 0.9), 0.55, 0.1, 1.1, 3.8]);
      kit.of(BANNERS[(k + (side > 0 ? 3 : 0)) % BANNERS.length]).push([s, beside(side, s, 0.82), 0.6, 0.06, 0.7, 3.4]);
      for (const ds of [0.6, 2, 3.3]) {
        if (rand() > share) continue;
        const at = s - 1.8 + ds, d = 1.6 + rand() * 1.8, tall = 1.45 + rand() * 0.35;
        kit.of(SHIRTS[Math.floor(rand() * SHIRTS.length)]).push([at, beside(side, at, d), tall / 2, 0.45, tall, 0.35]);
        kit.of(SKIN[Math.floor(rand() * SKIN.length)]).push([at, beside(side, at, d), tall + 0.17, 0.3, 0.3, 0.3]);
      }
    }
  };
  // a team tent: four poles and a pointed roof
  const tent = (s, side, d, color) => {
    for (const [ds, dd] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) kit.of(WHITE).push([s + ds, beside(side, s, d + dd), 1.2, 0.12, 2.4, 0.12]);
    kit.of(color, PYRAMID).push([s, beside(side, s, d), 3, 4, 1.3, 4]);
  };
  // a camper van come to watch: a white box, a coloured band, a pop-top
  const camper = (s, side, d, color) => {
    const lat = beside(side, s, d);
    kit.of(WHITE).push([s, lat, 1.35, 2.1, 1.9, 5.2], [s - 0.4, lat, 2.5, 1.8, 0.4, 3]);
    kit.of(color).push([s, lat, 1.05, 2.14, 0.45, 5.24]);
    kit.of(0x1c1c1c).push([s - 1.6, lat, 0.4, 2.2, 0.8, 0.8], [s + 1.6, lat, 0.4, 2.2, 0.8, 0.8], [s + 2.1, lat, 1.75, 1.9, 0.6, 1.05]);
  };
  // a lighthouse: a white tower with a band, a lit lantern and a cap, at a point off the road
  const lighthouse = (s, side, d, h, band, margin = 6) => {
    const at = kit.point(s, beside(side, s, d));
    if (!kit.at(WHITE, tube, at.x, at.y + h / 2, at.z, h * 0.2, h, h * 0.2, 0, false, margin)) return null;
    kit.at(band, tube, at.x, at.y + h * 0.55, at.z, h * 0.205, h * 0.16, h * 0.205, 0, false, -1);
    kit.at(0xfff3c4, tube, at.x, at.y + h + 1, at.z, h * 0.14, 2, h * 0.14, 0, true, -1);
    kit.at(band, cone, at.x, at.y + h + 2.9, at.z, h * 0.2, 1.8, h * 0.2, 0, false, -1);
    return at;
  };

  // the arches (none where the cliff road's sides leave no room for its legs, nor on the causeway, in the sea)
  for (const [s, color, trim] of [[45, 0x2f7fd0, WHITE], [1385, WHITE, 0xe23b3b], [3640, 0x3aa655, WHITE], [4345, 0xe23b3b, WHITE]]) {
    if (s < Track.end && !['seacliff', 'gois'].includes(looks(s))) arch(s, color, trim);
  }
  // where a bunch on the player's side sets off: the crowd on the right verge, a tent or two behind it
  for (const p of LEVEL.pelotons) {
    if (p.dir === -1 || p.road === 'side') continue;
    const look = looks(p.s);
    if (look === 'seacliff') continue;
    const side = look === 'gois' ? -1 : 1; // (the right of the causeway is the sea)
    crowd(p.s - 28, p.s + 36, side, 0.55);
    tent(p.s - 14, side, 7.5, BANNERS[Math.floor(rand() * 4)]);
    if (rand() < 0.6) tent(p.s + 12, side, 8.5, BANNERS[Math.floor(rand() * 4)]);
  }
  // the finishing straight: barriers and a crowd both sides, the last 420 m
  crowd(Math.max(0, Track.length - 420), Track.length - 12, -1, 0.75);
  crowd(Math.max(0, Track.length - 420), Track.length - 12, 1, 0.75);
  for (const z of zones) {
    if (z.scenery === 'bush') {
      // camper vans and tents on the verges of the headland, and the lighthouse out on its point, a cottage by it
      for (let s = z.from + 90, k = 0; s < z.to - 60; s += 110 + rand() * 70, k++) {
        const side = k % 2 ? 1 : -1;
        if (k % 3 === 2) tent(s, side, 9 + rand() * 4, BANNERS[k % 4]); else camper(s, side, 8 + rand() * 5, BANNERS[k % BANNERS.length]);
      }
      const at = lighthouse(z.to - 170, 1, 75, 26, 0xd22a2a);
      if (at) {
        const c = kit.point(z.to - 150, beside(1, z.to - 150, 68));
        kit.at(WHITE, cube, c.x, c.y + 1.6, c.z, 7, 3.2, 5, c.h, false, 4);
        kit.at(0xb5462f, PYRAMID, c.x, c.y + 4.2, c.z, 8, 2.2, 6, c.h, false, -1);
      }
    } else if (z.scenery === 'gois') {
      // fishing boats lying off the causeway, on the sea side
      for (let s = z.from + 80, k = 0; s < z.to - 60; s += 90 + rand() * 80, k++) {
        const d = 28 + rand() * 70, lat = beside(1, s, d), hull = [0x2f5f8f, 0xb5462f, 0x2f7d5a, 0xf2f2ee][k % 4];
        kit.of(hull).push([s, lat, 0.45, 2.6, 1.1, 7]);
        kit.of(WHITE).push([s - 1.4, lat, 1.6, 1.8, 1.3, 2.2]);
        kit.of(0x5b4632).push([s + 1, lat, 3.4, 0.14, 4.6, 0.14]);
      }
    } else if (z.scenery === 'shellharbour') {
      // flags on poles down both verges, a jetty with yachts moored along it, and the harbour light
      for (let s = z.from + 20, k = 0; s < z.to - 430; s += 28, k++) for (const side of [-1, 1]) {
        kit.of(WHITE).push([s, beside(side, s, 1.5), 2.6, 0.1, 5.2, 0.1]);
        kit.of(BANNERS[(k + (side > 0 ? 2 : 0)) % BANNERS.length]).push([s + 0.75, beside(side, s, 1.5), 4.5, 0.05, 1, 1.5]);
      }
      const out = (z.sea ?? 8) + 34, js = z.from + 520;
      if (js < z.to - 100) {
        kit.of(0x9a7b55).push([js, beside(1, js, out + 24), 0.7, 52, 0.3, 2.6]);
        for (let k = 0; k < 6; k++) {
          kit.of(0x5b4632).push([js, beside(1, js, out + 2 + k * 9), 0.2, 0.4, 1.6, 0.4]);
          const ys = js + (k % 2 ? 6.5 : -6.5), lat = beside(1, ys, out + 6 + k * 8);
          kit.of(k % 3 ? WHITE : 0x2f5f8f).push([ys, lat, 0.5, 2.2, 1.1, 6.4]);
          kit.of(0xd9d6cc).push([ys, lat, 5, 0.12, 8, 0.12]);
          kit.of(WHITE, cone).push([ys - 1.3, lat, 4.6, 0.12, 6, 2.4]);
        }
      }
      lighthouse(z.from + 880, 1, out + 80, 13, 0x2f7d5a);
    }
  }
  kit.draw();
};

export const THEME_EXTRAS = { construction, zones: raceDay };
