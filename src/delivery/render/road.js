import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { LEVEL } from '../levels.js';
import { Track } from '../track.js';
import { houseAt, gangHouse, LOT } from '../gunfire.js';
import { Game } from '../game.js';
import { Player } from '../player.js';
import { scene, tmp, applySky, applyLight, clearGroup } from './scene.js';
import { setHeadlights } from './headlights.js';

// ---- track meshes ----------------------------------------------------------
// flat strip following a road between lateral offsets latA and latB,
// each either a number or a function of s. Sits y above the road surface.
export const buildStrip = (sFrom, sTo, latA, latB, y, step = 4) => {
  const fa = typeof latA === 'function' ? latA : () => latA;
  const fb = typeof latB === 'function' ? latB : () => latB;
  const pos = [], idx = [];
  for (let n = 0; ; n++) {
    const s = Math.min(sFrom + n * step, sTo);
    Track.toWorld(s, fa(s), tmp); pos.push(tmp.x, tmp.y + y, tmp.z);
    Track.toWorld(s, fb(s), tmp); pos.push(tmp.x, tmp.y + y, tmp.z);
    if (n > 0) {
      const a = (n - 1) * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    if (s >= sTo) break;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  return geo;
};

// dashed line along lat(s), drawn only where show(s) is true
const buildDashes = (sFrom, sTo, lat, show) => {
  const pos = [], idx = [];
  const half = 0.08;
  let n = 0;
  for (let s = sFrom; s < sTo; s += CONFIG.dashSpacing) {
    if (!show(s)) continue;
    for (const [ds, dl] of [[0, -half], [0, half], [CONFIG.dashLength, -half], [CONFIG.dashLength, half]]) {
      Track.toWorld(s + ds, lat(s + ds) + dl, tmp);
      pos.push(tmp.x, tmp.y + 0.02, tmp.z);
    }
    idx.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
    n += 4;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  return geo;
};

// The looks a level can have (its "theme" field).
export const THEMES = {
  city: { sky: 0x9fc4e8, ground: 0x5d8a4e, road: 0x3a3d42, scenery: 'city' },
  farm: { sky: 0xc4e6f5, ground: 0x8fb556, road: 0x57514a, scenery: 'farm' },
  // beach: sand, a stormy sky, the sea along the right, palms and beach huts
  beach: { sky: 0x7e8d9e, ground: 0xdccb95, road: 0x45484e, scenery: 'beach' },
  // space: no ground and no road surface, only glowing lane lines among the stars
  // singapore: the garden city: towers and housing blocks, rain trees, Supertrees and Marina Bay Sands
  singapore: { sky: 0xc9dde6, ground: 0x6d9a52, road: 0x3a3d42, scenery: 'singapore' },
  // singaporeNight: the same city at night, floodlit as for the Grand Prix (a city that is never
  // dark: a glowing navy sky, and everything well lit): lit windows, glowing Supertrees, light
  // pylons over the road, concrete walls and catch fences, kerbs on the corners
  singaporeNight: { sky: 0x1d2d55, ground: 0x3f6440, road: 0x4b4f57, scenery: 'singapore', night: true, lit: true, headlights: true,
    light: { sky: 0xd6dcff, ground: 0x6a6878, ambient: 1.25, sun: 0xfff0d6, sunlight: 0.75 } },
  // coast: a level in zones (its "zones"), each with a look of its own: see the 'zones' scenery,
  // and syncZones, which blends the sky and the ground from one zone's colours to the next
  coast: { sky: 0x9fc8ee, ground: 0x6f9a52, road: 0x44474d, scenery: 'zones' },
  // safari: a level in zones on a dirt road: no markings, only the ruts worn into it
  safari: { sky: 0xc6dcea, ground: 0xc2a85a, road: 0xa47a4c, scenery: 'zones', unmarked: true },
  // construction: a road being built: bare earth all round, a hazy sky, the road giving way to mud
  construction: { sky: 0xc4d2dc, ground: 0x9a8160, road: 0x4a4c50, scenery: 'construction' },
  // airport: an airport going up in flames: a smoky orange sky, dry grass between concrete aprons, the runway
  airport: { sky: 0xc98e62, ground: 0x8c8f62, road: 0x45484d, scenery: 'airport' },
  // snow: an alpine pass in winter. terrain: true = the land is a mountainside (see buildTerrain)
  snow: { sky: 0xd3dfe9, ground: 0xf0f4f7, road: 0x4f535a, scenery: 'alpine', terrain: true },
  // canberra: the bush capital: dry grass, gum trees and concrete, a grassy median
  canberra: { sky: 0xb9d8ee, ground: 0xa3ad66, road: 0x4a4c50, scenery: 'canberra', median: 0x7f9a4f },
  // hood: the same suburb gone to seed (rundown: see the suburb scenery): dead grass and bare dirt, drab
  // houses with boarded-up windows, burnt-out shells, broken fences, dead trees, wrecks and rubbish
  hood: { sky: 0xbcc3c2, ground: 0x9a8d55, road: 0x46474a, scenery: 'suburb', rundown: true },
  // suburb: lawns, pavements, picket fences and houses in a row
  suburb: { sky: 0xa9d6f5, ground: 0x6aa84f, road: 0x484b50, scenery: 'suburb' },
  hell: { sky: 0x2a0704, ground: 0x3a120a, road: 0x1b1414, scenery: 'hell', line: 0xffb36b },
  // battlefield: a dirt track through a war (unmarked: only the ruts worn into it), churned mud under a smoky
  // sky, shell craters, sandbagged trenches, tank traps, barbed wire and shattered trees (and the pillboxes:
  // render/battle.js)
  battlefield: { sky: 0xa89f92, ground: 0x6d6248, road: 0x7d6440, scenery: 'battlefield', unmarked: true },
  // bathurst: Mount Panorama, a racetrack on a mountain in the New South Wales bush: the land climbs
  // and falls with the circuit (terrain: grass where it is gentle, red clay where it is steep), gum
  // trees all over the hill
  bathurst: { sky: 0xa9d2ef, ground: 0x9aa55e, road: 0x45474c, scenery: 'bathurst', terrain: { gentle: 0x93a25a, steep: 0x9b6b4a, rough: 0.35, flat: 10, rise: 60 } },
  // panorama: the same mountain as an everyday road through the bush (Panorama Avenue: roadside: no circuit
  // walls, kerbs or stands, white guide posts along the edges and rocks in the grass), in the colours of
  // the Southern Highlands bushland (Sydney to Kiama's bush)
  panorama: { sky: 0xb3d0e2, ground: 0x7d8a52, road: 0x4a4c50, scenery: 'bathurst', roadside: true, terrain: { gentle: 0x7d8a52, steep: 0x8f6e4c, rough: 0.35, flat: 10, rise: 60 } },
  // montreal: Circuit Gilles-Villeneuve, on Île Notre-Dame in the St Lawrence: parkland, a summer sky
  montreal: { sky: 0xa6d2f2, ground: 0x5d9a4a, road: 0x3e4147, scenery: 'montreal' },
  // sea: open water everywhere, the way through it the same water, unmarked (water: no ruts either),
  // its edges blocked by breakwaters of rock and lines of marker buoys, islands off in the distance
  sea: { sky: 0x9fd2f0, ground: 0x1d7a96, road: 0x1d7a96, scenery: 'sea', unmarked: true, water: true },
  space: { sky: 0x05060d, ground: null, road: null, scenery: 'space', line: 0x7fe8ff, centre: 0xff62d6 },
  // night: the city after dark. The road and the ground are lit surfaces (lit: true), dark but
  // for a faint blue moon and the player's headlights; other cars show their own lamps.
  night: { sky: 0x05070e, ground: 0x34492d, road: 0x45484e, scenery: 'city', lit: true, headlights: true,
    light: { sky: 0x5d72b0, ground: 0x10141c, ambient: 0.3, sun: 0x9fb4ff, sunlight: 0.25 } },
};

// Everything built here for the loaded level goes in this group, which is emptied and
// rebuilt each time a level is loaded.
export const levelGroup = new THREE.Group();
scene.add(levelGroup);

// ---- terrain (a theme with "terrain"): a mountainside --------------------------------------------
// The land round the road as a grid of heights, each blended from the heights of the road around
// it (the nearer a stretch of road, the more it counts), so the land climbs and falls with the road
// and fills in between its switchbacks: steep rock where two stretches at different heights come
// close, snow where it is gentler. It is flat, just under the road, for a strip each side of it,
// rougher the further it is from any road, and it sinks to the valley floor all round at the edge.
// (theme.terrain may give its colours: { gentle, steep }, snow and rock otherwise; how rough the
// land is away from the road, `rough` (1: as the alpine pass); and `flat`, m more of it level with the road)
// Returns the height of the land at a world point (x, z).
const buildTerrain = (colours) => {
  const pts = [], p = {};
  for (let s = Track.start; s <= Track.end; s += 8) {
    Track.toWorld(s, 0, p);
    pts.push(p.x, p.y, p.z);
  }
  const N = pts.length / 3;
  const flatTo = Math.max(Track.hi(0), -Track.lo(0)) + 12 + (colours?.flat ?? 0); // (wider than a grid square, so no slope reaches the road)
  const heightAt = (x, z) => {
    let best = Infinity, bi = 0, wsum = 0, hsum = 0;
    for (let i = 0; i < N; i++) {
      const dx = x - pts[i * 3], dz = z - pts[i * 3 + 2], d2 = dx * dx + dz * dz;
      if (d2 < best) { best = d2; bi = i; }
      const w = 1 / (d2 * d2 + 1);
      wsum += w;
      hsum += w * pts[i * 3 + 1];
    }
    // (the road's height there: along the line between the samples either side of the nearest,
    // not the nearest sample's own, which on a steep hill can be most of a metre out)
    let bestY = pts[bi * 3 + 1];
    for (const j of [bi - 1, bi]) {
      if (j < 0 || j + 1 >= N) continue;
      const ax = pts[j * 3], az = pts[j * 3 + 2], ex = pts[j * 3 + 3] - ax, ez = pts[j * 3 + 5] - az;
      const u = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez || 1)));
      const qx = ax + ex * u - x, qz = az + ez * u - z, q2 = qx * qx + qz * qz;
      if (q2 <= best + 1e-6) { best = q2; bestY = pts[j * 3 + 1] + (pts[j * 3 + 4] - pts[j * 3 + 1]) * u; }
    }
    const d = Math.sqrt(best), road = bestY - 0.3;
    if (d < flatTo) return road;
    const away = d - flatTo;
    const rough = (Math.sin(x * 0.05) * Math.cos(z * 0.043) * 5 + Math.sin(x * 0.013 + z * 0.017) * 16) * Math.min(1, away / 90) * (colours?.rough ?? 1);
    const t = Math.min(1, away / (colours?.rise ?? 20)); // (over this many m, from the road's height to the land's)
    const h = road * (1 - t) + (hsum / wsum + rough) * t;
    return h * Math.min(1, Math.max(0, (340 - d) / 140)); // (down to the valley floor at the edge)
  };
  // the grid: every 8 m, over the road and 350 m round it
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let i = 0; i < N; i++) {
    x0 = Math.min(x0, pts[i * 3]); x1 = Math.max(x1, pts[i * 3]);
    z0 = Math.min(z0, pts[i * 3 + 2]); z1 = Math.max(z1, pts[i * 3 + 2]);
  }
  const G = 8, M = 350;
  const cols = Math.ceil((x1 - x0 + 2 * M) / G) + 1, rows = Math.ceil((z1 - z0 + 2 * M) / G) + 1;
  const pos = new Float32Array(cols * rows * 3), idx = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = x0 - M + c * G, z = z0 - M + r * G, k = (r * cols + c) * 3;
      pos[k] = x; pos[k + 1] = heightAt(x, z); pos[k + 2] = z;
      if (r && c) {
        const a = (r - 1) * cols + c - 1, b = a + 1, d = r * cols + c - 1, e = d + 1;
        idx.push(a, d, b, b, d, e);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  // snow where it is gentle, rock where it is steep (or the theme's own colours)
  const n = geo.attributes.normal, colors = new Float32Array(cols * rows * 3);
  const snow = new THREE.Color(colours?.gentle ?? 0xf3f6f9), rock = new THREE.Color(colours?.steep ?? 0x767c84), mixed = new THREE.Color();
  for (let i = 0; i < cols * rows; i++) {
    mixed.copy(rock).lerp(snow, Math.min(1, Math.max(0, (n.getY(i) - 0.55) / 0.3)));
    colors[i * 3] = mixed.r; colors[i * 3 + 1] = mixed.g; colors[i * 3 + 2] = mixed.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const land = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  land.material.polygonOffset = true; // (the road always wins where they meet)
  land.material.polygonOffsetFactor = 2;
  land.material.polygonOffsetUnits = 2;
  levelGroup.add(land);
  return heightAt;
};

// how far out from the centre line (m) anything may reach on a side (-1 left, 1 right) at s: on the
// inside of a bend, short of its middle (with the sharpest bend within 200 m either way), so that
// a wide surface's edge never crosses back over itself; elsewhere, as far as you like
const reach = (s, side) => {
  let sharpest = 0;
  for (let q = s - 200; q <= s + 200; q += 20) {
    const c = Track.bend(q) * side;
    if (c > sharpest) sharpest = c;
  }
  return sharpest > 0 ? 0.85 / sharpest : Infinity;
};
// a lateral position, kept within that reach
const within = (s, lat) => {
  const side = lat < 0 ? -1 : 1;
  return side * Math.min(Math.abs(lat), reach(s, side));
};
// the stretches [from, to, ...rest] with the level's bridges cut out of them
const offBridges = (stretches) => {
  let out = stretches;
  for (const b of LEVEL.bridges || []) {
    out = out.flatMap(([from, to, ...rest]) => {
      if (to <= b.from + 4 || from >= b.to - 4) return [[from, to, ...rest]];
      return [[from, b.from + 4, ...rest], [b.to - 4, to, ...rest]].filter(([f, t]) => t - f > 1);
    });
  }
  return out;
};
// ---- zones (a level whose theme's scenery is 'zones'): each stretch of the level (LEVEL.zones)
// dressed as its zone.scenery says. Kits of things beside the road, each over a stretch [a, b],
// collected per kind and drawn at the end, one draw call each; and the landmarks, one by one.
let groundMesh = null;
const SEA = 0x2b6fa8, SAND = 0xe4d29a, SANDSTONE = 0xc9a26b;
const buildZones = (beside, instances, add, flat, { cube, tube, cone }) => {
  const sphere = new THREE.SphereGeometry(0.5, 9, 6), p = {};
  const kinds = {}; // name -> [geometry, colour, list, glowing]
  const thing = (name, geometry, colour, glowing = false) => kinds[name] || (kinds[name] = [geometry, colour, [], glowing]);
  const putAt = (name, entry) => kinds[name][2].push(entry);
  const clear = (s, side, d) => { Track.toWorld(s, beside(side, s, d), p); return Track.mainDistance(p.x, p.z) > Math.max(Track.hi(s), -Track.lo(s)) + 3; };
  thing('trunk', tube, 0xd9cfbf); thing('gum', sphere, 0x7a8f62); thing('tower', cube, 0x6f8fa8); thing('sandTower', cube, 0xd8c39b);
  thing('windows', cube, 0x2f3a46); thing('house', cube, 0xe8dcc4); thing('roof', cone, 0x8c4a3a); thing('rock', cube, 0xb8915c);
  thing('pine', cone, 0x2e5b33); thing('pineTrunk', tube, 0x5a4636); thing('stoneWall', cube, 0x8f8a80); thing('midrise', cube, 0xd6d0c2);
  thing('cottage', cube, 0xf4f1e8); thing('poplar', sphere, 0x5f7f3e); thing('canal', cube, 0x5b8fa8); thing('crown', sphere, 0x3f6034);
  thing('saltPan', cube, 0xaebfc6); thing('salt', cone, 0xfbfbf7); thing('weed', cube, 0x4b5b33); thing('pool', cube, 0x6f9fb0);
  thing('stake', cube, 0x4a3b2c); thing('refuge', cube, 0x5a4a3a); thing('rail', cube, 0xd8d2c4); thing('gaugeRed', cube, 0xd2302a);
  thing('gaugeWhite', cube, 0xf6f6f2); thing('coat', cube, 0x3b5e8c); thing('face', sphere, 0xe0b48c);
  thing('tallGrass', cone, 0xc9a548); thing('acacia', sphere, 0x5f7a32); thing('boulder', sphere, 0x8d8272); thing('kopje', sphere, 0x9a8b74);
  thing('reed', cube, 0x6f8a3a); thing('hippoBack', sphere, 0x6a5a62); thing('mound', cone, 0xa0603a); thing('spots', cube, 0xd9a441);
  thing('neck', cube, 0xd9a441); thing('zebra', cube, 0xf2f2ee); thing('stripe', cube, 0x1e1e1e);
  // gum trees: pale trunks and untidy clumps of grey-green leaves
  const gums = (a, b, every, dMax, sides = [-1, 1]) => {
    for (let s = a; s < b; s += every) for (const side of sides) {
      const at = s + Math.random() * every, d = 4 + Math.random() * dMax;
      if (!clear(at, side, d)) continue;
      const h = 7 + Math.random() * 7, lat = beside(side, at, d);
      putAt('trunk', [at, lat, h / 2, 0.45, h, 0.45]);
      for (let k = 0; k < 3; k++) { const z = 2 + Math.random() * 2; putAt('gum', [at + Math.random() * 2 - 1, lat + Math.random() * 2 - 1, h * (0.7 + k * 0.15), z, z * 0.7, z]); }
    }
  };
  // towers (banded with windows), standing back from the road
  const towers = (a, b, every, d0, d1, hMin, hMax, kind = 'tower', sides = [-1, 1]) => {
    for (let s = a; s < b; s += every) for (const side of sides) {
      const w = 14 + Math.random() * 16, dd = 14 + Math.random() * 14, d = d0 + dd / 2 + Math.random() * (d1 - d0);
      if (!clear(s, side, d - dd / 2 - 4)) continue;
      const h = hMin + Math.random() * (hMax - hMin), lat = beside(side, s, d);
      putAt(kind, [s, lat, h / 2, dd, h, w]);
      for (let y = 4; y < h - 2; y += 4) putAt('windows', [s, lat, y, dd + 0.1, 1.1, w + 0.1]);
    }
  };
  // houses with hipped roofs, on their blocks
  const houses = (a, b, every, d0, sides = [-1, 1]) => {
    const roof = thing('hip', new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4), 0x8c4a3a);
    for (let s = a; s < b; s += every) for (const side of sides) {
      const d = d0 + Math.random() * 20, lat = beside(side, s, d);
      if (!clear(s, side, d - 6)) continue;
      const w = 9 + Math.random() * 4, dd = 8 + Math.random() * 3;
      putAt('house', [s, lat, 1.7, dd, 3.4, w]);
      putAt('hip', [s, lat, 4.4, dd * 1.12, 2.2, w * 1.12]);
    }
  };
  // Vendee cottages: low, whitewashed, with shallow roofs of orange tiles
  const cottages = (a, b, every, d0, sides = [-1, 1]) => {
    thing('tiles', new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4), 0xc8643a);
    for (let s = a; s < b; s += every) for (const side of sides) {
      const at = s + Math.random() * every * 0.6, d = d0 + Math.random() * 25, lat = beside(side, at, d);
      if (!clear(at, side, d - 6)) continue;
      const w = 8 + Math.random() * 6, dd = 6 + Math.random() * 2;
      putAt('cottage', [at, lat, 1.4, dd, 2.8, w]);
      putAt('tiles', [at, lat, 3.3, dd * 1.15, 1.1, w * 1.1]);
    }
  };
  // tall, narrow poplars in lines along the marsh's ditches
  const poplars = (a, b, every, side, d) => {
    for (let s = a; s < b; s += every) {
      const h = 14 + Math.random() * 6, lat = beside(side, s, d + Math.random() * 2);
      putAt('pineTrunk', [s, lat, 2, 0.4, 4, 0.4]);
      putAt('poplar', [s, lat, h * 0.55, 2.6, h * 0.85, 2.6]);
    }
  };
  // tall grass, in clumps from the road's edge out to d1, thick enough to hide anything in it
  const tallGrass = (a, b, side, d1, every = 2.5) => {
    for (let s = a; s < b; s += every) {
      for (let d = 0.6 + Math.random(); d < d1; d += 2 + Math.random() * 2) {
        const at = s + Math.random() * every, h = 1.4 + Math.random() * 1.2, w = 1.4 + Math.random() * 1.4;
        putAt('tallGrass', [at, beside(side, at, d), h / 2, w, h, w]);
      }
    }
  };
  // acacias: a thin trunk and a wide, flat crown
  const acacias = (a, b, every, side, d0, d1) => {
    for (let s = a; s < b; s += every) {
      const at = s + Math.random() * every, d = d0 + Math.random() * (d1 - d0), lat = beside(side, at, d), h = 5 + Math.random() * 3;
      if (!clear(at, side, d)) continue;
      putAt('pineTrunk', [at, lat, h / 2, 0.35, h, 0.35]);
      putAt('acacia', [at, lat, h, 7 + Math.random() * 4, 1.4, 7 + Math.random() * 4]);
    }
  };
  // a line of boulders along the road's edge, end to end
  const rockLine = (a, b, side) => {
    for (let s = a; s < b;) {
      const r = 1.2 + Math.random() * 1.6;
      putAt('boulder', [s + r / 2, beside(side, s + r / 2, 0.4 + r / 2), r * 0.35, r, r * 0.8, r * 1.1]);
      s += r * 0.9;
    }
  };
  // giraffes, browsing, and zebras, out in the grass
  const giraffes = (a, b, every, side, d0, d1) => {
    for (let s = a; s < b; s += every) {
      const at = s + Math.random() * every, lat = beside(side, at, d0 + Math.random() * (d1 - d0));
      putAt('spots', [at, lat, 2.4, 1.0, 1.4, 2.0]);
      putAt('neck', [at + 0.9, lat, 3.9, 0.45, 2.4, 0.45]);
      putAt('spots', [at + 1.25, lat, 5.1, 0.45, 0.4, 0.9]);
      for (const [dz, dx] of [[0.7, -0.35], [0.7, 0.35], [-0.7, -0.35], [-0.7, 0.35]]) putAt('neck', [at + dz, lat + dx, 0.9, 0.2, 1.8, 0.2]);
    }
  };
  const zebras = (a, b, every, side, d0, d1) => {
    for (let s = a; s < b; s += every) {
      for (let k = 0; k < 4; k++) { // (a few together)
        const at = s + Math.random() * 12, lat = beside(side, at, d0 + Math.random() * (d1 - d0));
        putAt('zebra', [at, lat, 1.1, 0.7, 0.8, 1.7]);
        for (let q = -2; q <= 2; q++) putAt('stripe', [at + q * 0.3, lat, 1.1, 0.72, 0.82, 0.1]);
        putAt('zebra', [at + 1.0, lat, 1.5, 0.35, 0.8, 0.35]);
        for (const dz of [-0.6, 0.6]) putAt('stripe', [at + dz, lat, 0.4, 0.5, 0.8, 0.12]);
      }
    }
  };
  // Norfolk Island pines: tall, dark, in tiers
  const pines = (a, b, every, side, d0, d1) => {
    for (let s = a; s < b; s += every) {
      const d = d0 + Math.random() * (d1 - d0), lat = beside(side, s, d), h = 14 + Math.random() * 10;
      if (!clear(s, side, d)) continue;
      putAt('pineTrunk', [s, lat, h * 0.15, 0.6, h * 0.3, 0.6]);
      for (let k = 0; k < 4; k++) putAt('pine', [s, lat, h * (0.3 + k * 0.18), h * (0.32 - k * 0.06), h * 0.22, h * (0.32 - k * 0.06)]);
    }
  };
  // a face of rock beside the road on a side, rising from its edge at d0 to a brow `rise` m up at
  // d1, and (with `top`) a slope back down to the land `top` m beyond (a cutting, or a cliff); with
  // `rise` < 0, a drop from the road to the
  // water, its foot at sea level (an absolute height)
  const face = (a, b, side, d0, d1, rise, colour, top = 0) => {
    const pos = [], idx = [];
    let n = 0;
    for (let s = a; s <= b + 0.001; s += 6, n++) {
      const q = Math.min(s, b);
      Track.toWorld(q, beside(side, q, d0), p);
      pos.push(p.x, p.y, p.z);
      const y = rise < 0 ? -0.05 : p.y + rise;
      Track.toWorld(q, beside(side, q, d1), p);
      pos.push(p.x, y, p.z);
      if (n) { const k = (n - 1) * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
      // (the top slopes back down to the land behind it, so that it never ends in the air)
      if (top) { Track.toWorld(q, beside(side, q, d1 + top), p); pos.push(p.x, p.y - 0.05, p.z); }
    }
    const geo = new THREE.BufferGeometry();
    if (top) { // (three points a row: the edge, the brow, the far edge of the top)
      const tri = [];
      for (let k = 1; k < n; k++) {
        const a0 = (k - 1) * 3, b0 = k * 3;
        tri.push(a0, a0 + 1, b0, a0 + 1, b0 + 1, b0, a0 + 1, a0 + 2, b0 + 1, a0 + 2, b0 + 2, b0 + 1);
      }
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setIndex(tri);
    } else {
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setIndex(idx);
    }
    geo.computeVertexNormals();
    levelGroup.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: colour, side: THREE.DoubleSide })));
  };
  // the sea, on the right, from d0 out to the horizon, at sea level; and a beach before it
  const sea = (a, b, d0) => {
    const pos = [], idx = [];
    let n = 0;
    for (let s = a; s <= b + 0.001; s += 10, n++) {
      const q = Math.min(s, b);
      for (const d of [d0, 2500]) { Track.toWorld(q, within(q, beside(1, q, d)), p); pos.push(p.x, -0.05, p.z); }
      if (n) { const k = (n - 1) * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    const water = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: SEA, side: THREE.DoubleSide, depthWrite: false }));
    water.renderOrder = -1.8;
    levelGroup.add(water);
  };
  const beach = (a, b, d0, d1) => {
    const sand = new THREE.Mesh(buildStrip(a, b, (q) => beside(1, q, d0), (q) => beside(1, q, d1), -0.02, 8),
      new THREE.MeshBasicMaterial({ color: SAND, side: THREE.DoubleSide, depthWrite: false }));
    sand.renderOrder = -1.6;
    levelGroup.add(sand);
  };
  // a white lighthouse on a green headland out in the water
  const lighthouse = (s, d, h, band) => {
    Track.toWorld(s, beside(1, s, d), p);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(45, 55, 6, 20), new THREE.MeshLambertMaterial({ color: 0x5f8f45 }));
    head.position.set(p.x, 1, p.z);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3, h, 14), new THREE.MeshLambertMaterial({ color: 0xf6f6f2 }));
    tower.position.set(p.x, 4 + h / 2, p.z);
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 2.4, 12), new THREE.MeshBasicMaterial({ color: 0xfff3c4 }));
    lantern.position.set(p.x, 4 + h + 1.2, p.z);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(2.4, 2, 12), new THREE.MeshLambertMaterial({ color: band }));
    cap.position.set(p.x, 4 + h + 3.4, p.z);
    levelGroup.add(head, tower, lantern, cap);
    return p;
  };

  for (const z of LEVEL.zones) {
    const a = z.from, b = z.to;
    if (z.sea !== undefined) { // (under the cliffs, straight into the sea; elsewhere, a beach first)
      const cliffs = z.scenery === 'seacliff';
      sea(a, b, cliffs ? -40 : z.sea + 30); // (under the cliffs, in under the bridge, to the foot of the cliff)
      if (!cliffs) beach(a, b, z.sea, z.sea + 32);
      for (const [f, t] of offBridges([[a, b]])) face(f, t, 1, z.sea, z.sea + 2, -1, cliffs ? 0x7c5e40 : 0xb89c6a);
    }
    if (z.scenery === 'sydney') {
      // the city: towers of glass and sandstone near the Harbour Bridge, then lower down; and the
      // Opera House on the harbour beside the bridge (see render/items.js for the bridge)
      // (towers either side of the bridge: the city behind the start, and beyond the bridge)
      for (const [from, to] of [[Track.start, a + 140], [a + 650, a + 1050]]) {
        towers(from, to, 24, 18, 70, 50, 170);
        towers(from, to, 40, 20, 60, 20, 60, 'sandTower');
      }
      towers(a + 1050, b, 30, 22, 60, 12, 40, 'midrise');
      gums(a + 1050, b, 40, 30);
      const bridge = (LEVEL.bridges || []).find(x => x.style === 'harbour');
      if (bridge) {
        const at = (bridge.from + bridge.to) / 2 + 40, h = Track.toWorld(at, beside(1, at, 140), p);
        const white = new THREE.MeshLambertMaterial({ color: 0xf8f6ee }), podium = new THREE.MeshLambertMaterial({ color: 0xc9a77a });
        const house = new THREE.Group();
        const base = new THREE.Mesh(new THREE.BoxGeometry(60, 6, 120), podium);
        base.position.y = 3;
        house.add(base);
        [[0, 34, 26], [0, 4, 22], [0, -24, 17], [18, 30, 13], [18, 6, 11]].forEach(([x, z0, r], k) => {
          const sail = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 10, 0, Math.PI, 0, Math.PI / 2), white);
          sail.scale.set(0.75, 1.5, 1);
          sail.rotation.set(0, Math.PI / 2, 0);
          sail.position.set(x - 8, 6, z0);
          house.add(sail);
        });
        house.position.set(p.x, -0.05, p.z);
        house.rotation.y = h;
        levelGroup.add(house);
      }
    } else if (z.scenery === 'bush') {
      gums(a, b, 9, 55);
      for (let s = a; s < b; s += 70) for (const side of [-1, 1]) {
        const d = 6 + Math.random() * 30;
        if (clear(s, side, d)) putAt('rock', [s, beside(side, s, d), 0.8, 3 + Math.random() * 4, 1.6 + Math.random() * 2, 4 + Math.random() * 5]);
      }
    } else if (z.scenery === 'ousley') {
      // the escarpment: sandstone cuttings on the uphill side (the left), the bush falling away on
      // the right to the coastal plain and the sea far below
      face(a + 60, b - 300, -1, 2, 16, 26, SANDSTONE, 50);
      gums(a, b, 14, 50, [1]);
      sea(a + 400, b, 650);
    } else if (z.scenery === 'seacliff') {
      // sheer cliffs on the left, the sea on the right (the bridge itself: render/items.js)
      face(a, b, -1, 1.5, 22, 70, 0x8c6c4a, 40);
    } else if (z.scenery === 'wollongong') {
      towers(a, b, 32, 22, 70, 15, 55, 'midrise', [-1]);
      pines(a, b, 45, 1, z.sea + 4, z.sea + 20);
      gums(a, b, 50, 25, [-1]);
      lighthouse(b - 300, z.sea + 160, 22, 0xd22a2a);
    } else if (z.scenery === 'shellharbour') {
      houses(a, b, 26, 14, [-1]);
      pines(a, b, 60, 1, z.sea + 4, z.sea + 20);
    } else if (z.scenery === 'marais') {
      // the marsh at Beauvoir-sur-Mer: flat green fields cut by ditches, lines of poplars,
      // whitewashed cottages
      for (const side of [-1, 1]) {
        putAt('canal', [(a + b) / 2, beside(side, (a + b) / 2, 14), -0.03, 3, 0.04, b - a]);
        poplars(a, b, 22, side, 20);
      }
      cottages(a, b - 100, 45, 30);
    } else if (z.scenery === 'gois') {
      // the causeway at mid-tide: the sea coming in on the right, up to the road; on the left the
      // sand flats, with pools, weed, rows of mussel stakes and people out gathering shellfish; and
      // along it the refuge towers to climb if the sea catches you, and depth gauges in the water
      sea(a, b, 0.6);
      for (let s = a; s < b; s += 18) {
        const d = 6 + Math.random() * 140, lat = beside(-1, s, d), k = Math.random();
        if (k < 0.45) putAt('weed', [s, lat, -0.02, 3 + Math.random() * 6, 0.05, 4 + Math.random() * 8]);
        else if (k < 0.7) putAt('pool', [s, lat, -0.03, 3 + Math.random() * 6, 0.03, 5 + Math.random() * 9]);
      }
      for (let s = a + 150; s < b - 150; s += 380) { // mussel stakes, in rows out across the flats
        const d0 = 40 + Math.random() * 80;
        for (let k = 0; k < 14; k++) putAt('stake', [s + (k % 2) * 1.5, beside(-1, s, d0 + k * 2.2), 0.8, 0.2, 1.6, 0.2]);
      }
      for (let s = a + 60; s < b; s += 90) { // shellfish gatherers
        if (Math.random() < 0.4) continue;
        const at = s + Math.random() * 40, lat = beside(-1, at, 15 + Math.random() * 90);
        putAt('coat', [at, lat, 0.6, 0.45, 1.2, 0.35]);
        putAt('face', [at, lat, 1.4, 0.3, 0.3, 0.3]);
      }
      for (let s = a + 200; s < b - 100; s += 470) { // the refuge towers: a tall post, a platform, a rail round it
        const lat = beside(-1, s, 3);
        putAt('refuge', [s, lat, 4.5, 0.4, 9, 0.4]);
        putAt('refuge', [s, lat, 7.2, 2.8, 0.25, 2.8]);
        for (const [x, z, w, l] of [[-1.35, 0, 0.08, 2.8], [1.35, 0, 0.08, 2.8], [0, -1.35, 2.8, 0.08], [0, 1.35, 2.8, 0.08]]) {
          putAt('rail', [s + z, lat + x, 7.75, w, 0.9, l]);
        }
        for (let y = 0.6; y < 7; y += 0.5) putAt('rail', [s - 0.3, lat, y, 0.5, 0.06, 0.06]); // (the rungs of its ladder)
      }
      for (let s = a + 40; s < b; s += 60) { // depth gauges: posts banded red and white, in the water
        for (let k = 0; k < 6; k++) putAt(k % 2 ? 'gaugeWhite' : 'gaugeRed', [s, beside(1, s, 1.2), 0.25 + k * 0.5, 0.16, 0.5, 0.16]);
      }
    } else if (z.scenery === 'noirmoutier') {
      // the island: salt pans with their white heaps of salt, umbrella pines, cottages, and the
      // sea beyond a beach on the right
      for (let s = a + 30; s < b - 30; s += 34) {
        const lat = beside(-1, s, 22 + Math.random() * 10);
        putAt('saltPan', [s, lat, -0.02, 14, 0.04, 26]);
        if (Math.random() < 0.7) putAt('salt', [s + 8, lat - 9, 0.7, 2.6, 1.4, 2.6]);
      }
      for (let s = a; s < b; s += 16) {
        const lat = beside(1, s, 8 + Math.random() * 30), h = 7 + Math.random() * 4;
        putAt('pineTrunk', [s, lat, h * 0.45, 0.35, h * 0.9, 0.35]);
        putAt('crown', [s, lat, h, 6, 2, 6]);
      }
      cottages(a + 60, b, 50, 45, [-1]);
      sea(a, b, 70);
      beach(a, b, 40, 72);
    } else if (z.scenery === 'savanna') {
      // tall golden grass right up to the road on both sides, acacias and giraffes beyond it
      for (const side of [-1, 1]) {
        tallGrass(a, b, side, 22);
        acacias(a, b, 70, side, 30, 160);
        giraffes(a + 100, b, 260, side, 40, 120);
      }
    } else if (z.scenery === 'kopjes') {
      // a line of boulders along each edge of the road, and the great piles of rock (the kopjes) beyond
      for (const side of [-1, 1]) {
        rockLine(a, b, side);
        for (let s = a + 40; s < b; s += 110) {
          const at = s + Math.random() * 40, d = 25 + Math.random() * 60;
          for (let k = 0; k < 6; k++) {
            const r = 4 + Math.random() * 8;
            putAt('kopje', [at + Math.random() * 14, beside(side, at, d + Math.random() * 14), r * 0.4 + k * 1.2, r, r * 0.8, r]);
          }
        }
        acacias(a, b, 120, side, 20, 140);
      }
    } else if (z.scenery === 'river') {
      // the river on the right, beyond a muddy bank: reeds at its edge, hippos wallowing in it, and
      // the far bank's trees; tall grass on the left
      const H = CONFIG.hippo, RIVER = 75;
      const bankMud = new THREE.Mesh(buildStrip(a, b, (q) => beside(1, q, 0), (q) => beside(1, q, H.bank + 0.5), -0.02, 6),
        new THREE.MeshBasicMaterial({ color: 0x6b5536, side: THREE.DoubleSide, depthWrite: false }));
      bankMud.renderOrder = -1.7;
      const river = new THREE.Mesh(buildStrip(a, b, (q) => beside(1, q, H.bank), (q) => within(q, beside(1, q, RIVER)), -0.03, 6),
        new THREE.MeshBasicMaterial({ color: 0x4d7f78, side: THREE.DoubleSide, depthWrite: false }));
      river.renderOrder = -1.6;
      levelGroup.add(bankMud, river);
      for (let s = a; s < b; s += 3) {
        if (Math.random() < 0.5) putAt('reed', [s, beside(1, s, H.bank + Math.random() * 1.5), 0.8, 0.12, 1.6 + Math.random(), 0.12]);
      }
      for (let s = a + 30; s < b; s += 45) { // hippos wallowing: backs, ears and eyes just out of the water
        const at = s + Math.random() * 30, lat = beside(1, at, H.out + 4 + Math.random() * 40);
        putAt('hippoBack', [at, lat, 0, 2, 0.7, 3.4]);
        putAt('hippoBack', [at + 1.9, lat, 0.1, 1, 0.5, 1]);
      }
      acacias(a, b, 40, 1, RIVER + 5, RIVER + 60);
      tallGrass(a, b, -1, 20);
      acacias(a, b, 90, -1, 25, 140);
    } else if (z.scenery === 'plains') {
      // short grass to the horizon: zebras, termite mounds, the odd acacia
      for (const side of [-1, 1]) {
        zebras(a, b, 180, side, 25, 110);
        acacias(a, b, 110, side, 20, 200);
        for (let s = a; s < b; s += 60) {
          const at = s + Math.random() * 60, h = 1.5 + Math.random() * 2.5;
          putAt('mound', [at, beside(side, at, 8 + Math.random() * 50), h / 2, 1.4, h, 1.4]);
        }
      }
    } else if (z.scenery === 'kiama') {
      // green hills with dry-stone walls, the lighthouse on its point at the end, and the blowhole beside it
      for (let s = a; s < b; s += 4) putAt('stoneWall', [s + 2, beside(-1, s + 2, 18), 0.5, 0.6, 1, 4.02]);
      gums(a, b, 60, 40, [-1]);
      houses(a, a + 300, 30, 26, [-1]);
      const lh = lighthouse(b - 120, z.sea + 110, 16, 0xf6f6f2);
      const spout = new THREE.Mesh(new THREE.ConeGeometry(5, 26, 12, 1, true), new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }));
      spout.position.set(lh.x + 30, 13, lh.z + 10);
      spout.rotation.x = Math.PI;
      levelGroup.add(spout);
    }
  }
  for (const [geometry, colour, list, glowing] of Object.values(kinds)) instances(geometry, colour, list, glowing);
  // the sign before the causeway: the road goes under the sea at high tide
  if (LEVEL.tide && LEVEL.zones.some(z => z.scenery === 'gois')) {
    const at = LEVEL.tide.from - 90, steel = new THREE.MeshLambertMaterial({ color: 0x9a9da3 });
    for (const dl of [-1.6, 1.6]) {
      Track.toWorld(at, beside(1, at, 2 + dl), p);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 4, 0.15), steel);
      post.position.set(p.x, p.y + 2, p.z);
      levelGroup.add(post);
    }
    const h = Track.toWorld(at, beside(1, at, 2), p);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.2), new THREE.MeshBasicMaterial({ map: goisSign(), side: THREE.DoubleSide }));
    sign.position.set(p.x, p.y + 3.6, p.z);
    sign.rotation.y = h + Math.PI;
    sign.userData.text = true;
    if (Track.mirrored) sign.scale.x = -1;
    levelGroup.add(sign);
  }
  // a kangaroo crossing sign on the kerb 60 m before each stretch kangaroos cross, facing the player
  for (const herd of (LEVEL.herds || []).filter(h => h.kind === 'kangaroo')) {
    const at = herd.from - 60, h = Track.toWorld(at, beside(1, at, 1.2), p);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.4, 0.1), new THREE.MeshLambertMaterial({ color: 0x9a9da3 }));
    post.position.set(p.x, p.y + 1.2, p.z);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: kangarooSign(), transparent: true, side: THREE.DoubleSide }));
    sign.position.set(p.x, p.y + 2.9, p.z);
    sign.rotation.y = h + Math.PI;
    sign.userData.text = true; // (kept the right way round on a left-hand level: see render/items.js)
    if (Track.mirrored) sign.scale.x = -1;
    levelGroup.add(post, sign);
  }
};
// the Passage du Gois sign's face: blue, the name, and the warning that the road floods
let goisSignTexture = null;
const goisSign = () => {
  if (goisSignTexture) return goisSignTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 256;
  const g = canvas.getContext('2d');
  g.fillStyle = '#1d4f9c';
  g.fillRect(0, 0, 512, 256);
  g.strokeStyle = '#fff'; g.lineWidth = 8;
  g.strokeRect(10, 10, 492, 236);
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.font = 'bold 58px sans-serif';
  g.fillText('PASSAGE DU GOIS', 256, 84);
  g.font = 'bold 30px sans-serif';
  g.fillText('ROUTE SUBMERSIBLE', 256, 138);
  g.fillText('À MARÉE HAUTE', 256, 176);
  g.font = '26px sans-serif';
  g.fillText('4,2 km', 256, 222);
  goisSignTexture = new THREE.CanvasTexture(canvas);
  goisSignTexture.colorSpace = THREE.SRGBColorSpace;
  return goisSignTexture;
};
// the road works sign's face: a yellow diamond, a black border, ROAD WORK
let roadWorkTexture = null;
const roadWorkSign = () => {
  if (roadWorkTexture) return roadWorkTexture;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const g = canvas.getContext('2d');
  g.translate(128, 128);
  g.rotate(Math.PI / 4);
  g.fillStyle = '#111';
  g.fillRect(-88, -88, 176, 176);
  g.fillStyle = '#ffb21f';
  g.fillRect(-80, -80, 160, 160);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#111';
  g.textAlign = 'center';
  g.font = 'bold 40px sans-serif';
  g.fillText('ROAD', 128, 118);
  g.fillText('WORK', 128, 162);
  roadWorkTexture = new THREE.CanvasTexture(canvas);
  roadWorkTexture.colorSpace = THREE.SRGBColorSpace;
  return roadWorkTexture;
};
// the kangaroo crossing sign's face: a yellow diamond with a black border and a kangaroo
let kangarooSignTexture = null;
const kangarooSign = () => {
  if (kangarooSignTexture) return kangarooSignTexture;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const g = canvas.getContext('2d');
  g.translate(128, 128);
  g.rotate(Math.PI / 4);
  g.fillStyle = '#111';
  g.fillRect(-88, -88, 176, 176);
  g.fillStyle = '#ffd21f';
  g.fillRect(-80, -80, 160, 160);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#111';
  g.beginPath(); g.ellipse(128, 132, 30, 40, -0.5, 0, Math.PI * 2); g.fill();          // body
  g.beginPath(); g.ellipse(160, 88, 14, 11, -0.3, 0, Math.PI * 2); g.fill();          // head
  g.beginPath(); g.moveTo(152, 80); g.lineTo(150, 62); g.lineTo(160, 78); g.fill();     // ear
  g.lineWidth = 11; g.lineCap = 'round'; g.strokeStyle = '#111';
  g.beginPath(); g.moveTo(108, 156); g.quadraticCurveTo(80, 185, 58, 190); g.stroke(); // tail
  g.lineWidth = 9;
  g.beginPath(); g.moveTo(132, 164); g.lineTo(150, 186); g.lineTo(176, 188); g.stroke(); // leg and foot
  g.lineWidth = 5;
  g.beginPath(); g.moveTo(150, 118); g.lineTo(166, 128); g.stroke();                   // arm
  kangarooSignTexture = new THREE.CanvasTexture(canvas);
  kangarooSignTexture.colorSpace = THREE.SRGBColorSpace;
  return kangarooSignTexture;
};

// every frame: on a level in zones, the sky (and the fog with it) and the ground blend towards
// the colours of the zone the player is in
// (all at once when the player has jumped there: a new run, or ?at= in the address)
const skyNow = new THREE.Color(), skyWant = new THREE.Color();
let zoneS = 0;
export const syncZones = (dt) => {
  if (!LEVEL.zones || !Track) return;
  const zone = Track.zoneAt(Player.s) || LEVEL.zones[Player.s < 0 ? 0 : LEVEL.zones.length - 1];
  const k = Math.abs(Player.s - zoneS) > 100 ? 1 : Math.min(1, dt * 0.6);
  zoneS = Player.s;
  skyWant.set(zone.sky ?? (THEMES[LEVEL.theme] || THEMES.city).sky);
  skyNow.lerp(skyWant, k);
  applySky(skyNow.getHex());
  if (groundMesh && zone.ground !== undefined) groundMesh.material.color.lerp(skyWant.set(zone.ground), k);
};

const buildRoad = () => {
  // a left-hand level is the game seen in a mirror: the whole scene drawn with x reversed
  scene.scale.x = Track.mirrored ? -1 : 1;
  clearGroup(levelGroup);
  const theme = THEMES[LEVEL.theme] || THEMES.city;
  applySky(theme.sky);
  if (LEVEL.zones) skyNow.set((LEVEL.zones[0].sky ?? theme.sky));
  applyLight(theme.light);
  setHeadlights(!!theme.headlights);
  const flat = (color) => new (theme.lit ? THREE.MeshLambertMaterial : THREE.MeshBasicMaterial)({ color, side: THREE.DoubleSide });
  const add = (geo, mat) => {
    // (a lit surface needs to know which way it faces; the strips are built without that)
    if (theme.lit && !geo.attributes.normal) geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.flat = true; // (a surface laid on the ground: nothing a camera can't see over, see render/racewatch.js)
    return levelGroup.add(mesh);
  };
  const asphalt = flat(theme.road || 0), lineMat = flat(theme.line || 0xf2f2f2), centreMat = flat(theme.centre || 0xffc400);
  const pave = (geo) => { if (theme.road !== null) add(geo, asphalt); }; // (no road surface in space)
  const LW = CONFIG.laneWidth, ZONE = CONFIG.ramps.laneZone, RAMP = CONFIG.ramps.ramp;
  const exits = Track.exits;
  // painted markings lie a couple of centimetres above the road; this keeps them on top of it
  for (const mat of [lineMat, centreMat]) {
    mat.polygonOffset = true;
    mat.polygonOffsetFactor = -2;
    mat.polygonOffsetUnits = -2;
  }
  // a junction's box has no lines through it, like a real one: the road's markings stop at its
  // edges (its crossings and stop lines are render/junctions.js's)
  // (nor anywhere on a runway, which has markings of its own: see the airport's scenery)
  const inJunction = (s) => Track.junctions.some(jn => s > jn.s - 1 && s < jn.end + 1) || (!!LEVEL.runway && s > LEVEL.runway.from - 1) ||
    Track.muddy(s); // (nor in mud)
  const unmarked = (a, b) => { // the pieces of a..b to be marked: outside every junction (and runway, and mud)
    const pieces = [];
    let from = null;
    for (let s = a; ; s = Math.min(b, s + 1)) {
      const marked = !inJunction(s);
      if (marked && from === null) from = s;
      if ((!marked || s >= b) && from !== null) {
        if (s - from > 0.5) pieces.push([from, s]);
        from = null;
      }
      if (s >= b) break;
    }
    return pieces;
  };
  const dashOutside = (s) => !inJunction(s) && !inJunction(s + CONFIG.dashLength);
  const line = (a, b, lat, mat = lineMat) => {
    for (const [p, q] of unmarked(a, b)) add(buildStrip(p, q, (s) => lat(s) - 0.1, (s) => lat(s) + 0.1, 0.02), mat);
  };

  // ---- expressway -------------------------------------------------------------------
  pave(buildStrip(Track.start, Track.end, Track.lo, Track.hi, 0));
  line(Track.start, Track.end, Track.laneLo);
  // right edge line: solid, along the outside of the exit / merge lane where there is one. At
  // each fork it is in two pieces: the expressway's own edge, which runs on under the side
  // road's pavement from the exit to the merge, and the extra lane's edge, which the side
  // road's own edge line carries on from. The two meet at the fork and part, like the roads.
  // A dashed line divides the extra lane from the lane beside it while it is open.
  {
    let from = Track.start;
    for (const x of [...exits].sort((a, b) => a.exitAt - b.exitAt)) {
      line(from, x.exitAt, Track.laneHi);
      line(x.exitAt, x.mergeAt, Track.edge);
      const open = (s) => Track.extraLane(s) > 0.3;
      add(buildDashes(x.exitAt - ZONE, x.exitAt, Track.edge, open), lineMat);
      add(buildDashes(x.mergeAt, x.mergeAt + ZONE, Track.edge, open), lineMat);
      from = x.mergeAt;
    }
    line(from, Track.end, Track.laneHi);
  }
  // double yellow centre line (a one-way road has an ordinary lane divider there instead, and
  // a road with a median a solid line along each side of it)
  const twoWay = Track.flow === 'both', HM = Track.medianHalf;
  if (!twoWay && Track.leftLanes && Track.rightLanes) add(buildDashes(Track.start, Track.end, () => 0, dashOutside), lineMat);
  for (const side of [-1, 1]) {
    if (twoWay && !HM) for (const [p, q] of unmarked(Track.start, Track.end)) add(buildStrip(p, q, side * 0.12, side * 0.28, 0.02), centreMat);
    if (HM) line(Track.start, Track.end, () => side * HM);
    // dashed dividers between the lanes of each side, only where both lanes exist
    for (let k = 1; k < (side < 0 ? Track.leftLanes : Track.rightLanes); k++) {
      add(buildDashes(Track.start, Track.end, () => side * (HM + k * LW),
        (s) => Track.lanesOn(side, s) >= k + 0.95 && dashOutside(s)), lineMat);
    }
  }
  // a dirt road has no markings at all: only a pair of ruts worn along each lane (merging where
  // the lane does)
  if (theme.unmarked) {
    lineMat.visible = centreMat.visible = false;
  }
  if (theme.unmarked && !theme.water) {
    const rut = flat(new THREE.Color(theme.road).multiplyScalar(0.8).getHex());
    for (let lane = 0; lane < Track.laneCount; lane++) {
      for (const side of [-1, 1]) {
        const at = (s) => Track.laneOffset(Track.openLane(lane, s), s) + side * 0.85;
        add(buildStrip(Track.start, Track.end, (s) => at(s) - 0.22, (s) => at(s) + 0.22, 0.01), rut);
      }
    }
  }
  // the median: a strip of its own colour between those lines and, on a level with a railway, a
  // track down the middle of it: sleepers on ballast, and two rails
  if (HM) {
    add(buildStrip(Track.start, Track.end, -HM + 0.1, HM - 0.1, 0.01), flat(theme.median || 0x6f8f4a));
    if (LEVEL.railway) {
      const GAUGE = 1.435;
      const BED = CONFIG.railCrossing.width / 2;
      add(buildStrip(Track.start, Track.end, -BED, BED, 0.03), flat(0x8b8378));
      const sleeper = new THREE.InstancedMesh(new THREE.BoxGeometry(2.6, 0.12, 0.26), new THREE.MeshLambertMaterial({ color: 0x5e4b3a }),
        Math.ceil((Track.end - Track.start) / 0.7));
      const spot = new THREE.Object3D();
      let n = 0;
      for (let s = Track.start; s < Track.end; s += 0.7, n++) {
        spot.rotation.y = Track.toWorld(s, 0, tmp);
        spot.position.set(tmp.x, tmp.y + 0.08, tmp.z);
        spot.updateMatrix();
        sleeper.setMatrixAt(n, spot.matrix);
      }
      sleeper.count = n;
      levelGroup.add(sleeper);
      for (const side of [-1, 1]) {
        add(buildStrip(Track.start, Track.end, side * GAUGE / 2 - 0.04, side * GAUGE / 2 + 0.04, 0.2), flat(0xb8bcc4));
      }
    }
  }
  // mud: where the road gives way to it, a sheet of churned brown right across, its ruts and puddles
  // darker, and a ragged edge where the road begins again
  for (const m of LEVEL.mud || []) {
    const mudMat = flat(0x5e4630);
    mudMat.polygonOffset = true;
    mudMat.polygonOffsetFactor = -1;
    mudMat.polygonOffsetUnits = -1;
    add(buildStrip(m.from, m.to, (s) => Track.lo(s) - 2, (s) => Track.hi(s) + 2, 0.006, 3), mudMat);
    const rut = flat(0x4a3622);
    rut.polygonOffset = true;
    rut.polygonOffsetFactor = -2;
    rut.polygonOffsetUnits = -2;
    for (let lane = 0; lane < Track.laneCount; lane++) {
      for (const side of [-1, 1]) {
        const at = (s) => Track.laneOffset(lane, s) + side * 0.85 + 0.15 * Math.sin(s * 0.13 + lane);
        add(buildStrip(m.from, m.to, (s) => at(s) - 0.25, (s) => at(s) + 0.25, 0.012, 3), rut);
      }
    }
    const puddle = flat(0x6b6a55);
    puddle.polygonOffset = true;
    puddle.polygonOffsetFactor = -2;
    puddle.polygonOffsetUnits = -2;
    for (let s = m.from + 8; s < m.to - 8; s += 14 + Math.random() * 20) {
      const lat = Track.lo(s) + Math.random() * (Track.hi(s) - Track.lo(s)), w = 1 + Math.random() * 2, l = 2 + Math.random() * 4;
      add(buildStrip(s, s + l, lat - w, lat + w, 0.014, 1), puddle);
    }
  }
  // ice patches: a pale, glassy sheet over the lane (or the whole road), with brighter streaks on it
  if (LEVEL.ice) {
    const sheet = new THREE.MeshBasicMaterial({ color: 0xd6eef8, transparent: true, opacity: 0.72, depthWrite: false,
      side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    const shine = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false,
      side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    for (const p of LEVEL.ice) {
      const a = (s) => p.lane === undefined ? Track.laneLo(s) : Track.laneOffset(p.lane, s) - LW / 2 + 0.15;
      const b = (s) => p.lane === undefined ? Track.laneHi(s) : Track.laneOffset(p.lane, s) + LW / 2 - 0.15;
      add(buildStrip(p.from, p.to, a, b, 0.025, 2), sheet);
      for (let k = 0; k < 3; k++) { // (streaks, staggered along it)
        const from = p.from + (p.to - p.from) * (0.1 + k * 0.27), to = from + (p.to - p.from) * 0.18, at = 0.25 + k * 0.25;
        const lat = (s) => a(s) + (b(s) - a(s)) * at;
        add(buildStrip(from, to, (s) => lat(s) - 0.12, (s) => lat(s) + 0.12, 0.03, 2), shine);
      }
    }
  }
  // start and finish lines
  add(buildStrip(-1, 0, Track.lo, Track.hi, 0.03, 1), lineMat);
  add(buildStrip(Track.length, Track.length + 2, Track.lo, Track.hi, 0.03, 1), flat(0xffd23f));

  // ---- each exit: side road, flyovers, sign ---------------------------------------------
  const deck = flat(0x8d9096);
  const steel = new THREE.MeshLambertMaterial({ color: 0x9a9da3 });
  const pillars = [];
  for (const x of exits) {
    // side road: two lanes, yellow centre line where both exist
    pave(buildStrip(x.side0, x.sideEnd, Track.lo, Track.hi, 0.005));
    line(x.side0, x.sideEnd, Track.laneLo);
    line(x.side0, x.sideEnd, Track.laneHi);
    if (twoWay) add(buildStrip(x.side0 + RAMP, x.sideEnd - RAMP, -0.08, 0.08, 0.02), centreMat);
    else add(buildDashes(x.side0 + RAMP, x.sideEnd - RAMP, () => 0, () => true), lineMat);

    // flyovers: raised decks with kerbs, so they read as structures
    // (they carry the oncoming traffic, so a one-way road has none)
    for (const from of twoWay ? [x.flyA0, x.flyB0] : []) {
      const to = from + CONFIG.ramps.flyoverLength;
      add(buildStrip(from, to, -LW / 2 - 0.4, LW / 2 + 0.4, 0.03, 3), deck);
      for (const side of [-1, 1]) {
        add(buildStrip(from, to, side * (LW / 2 + 0.15), side * (LW / 2 + 0.4), 0.5, 3), lineMat);
      }
      for (let s = from; s < to; s += 18) if (Track.flyPillar(s)) pillars.push(s);
    }

    // exit sign on a post beside the right shoulder, where the exit lane begins
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 160;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1b7a3a';
    ctx.fillRect(0, 0, 512, 160);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 496, 144);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT  ↗', 256, 78);
    ctx.font = 'bold 34px sans-serif';
    const saved = Math.round(x.span - x.length);
    ctx.fillText('side road  ' + (saved >= 0 ? saved + ' m shorter' : -saved + ' m longer'), 256, 128);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    const sAt = x.exitAt - ZONE;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.8), new THREE.MeshBasicMaterial({ map }));
    sign.rotation.y = Track.toWorld(sAt, Track.hi(sAt) - 3, tmp) + Math.PI; // faces oncoming drivers
    sign.scale.x = Track.mirrored ? -1 : 1; // (mirrored back on a left-hand level, so it still reads)
    sign.position.set(tmp.x, tmp.y + 8, tmp.z);
    levelGroup.add(sign);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 8, 0.5), steel);
    Track.toWorld(sAt, Track.hi(sAt) + 1.5, tmp);
    post.position.set(tmp.x, tmp.y + 4, tmp.z);
    levelGroup.add(post);
  }
  const dummy = new THREE.Object3D();
  if (pillars.length) {
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), steel, pillars.length);
    pillars.forEach((s, i) => {
      dummy.rotation.y = Track.toWorld(s, 0, tmp);
      dummy.position.set(tmp.x, tmp.y / 2, tmp.z);
      dummy.scale.set(1.2, tmp.y, 1.2);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    levelGroup.add(mesh);
  }

  // ---- ground and finish gate -----------------------------------------------------------------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), flat(theme.ground || 0));
  ground.visible = theme.ground !== null; // (space has none)
  ground.rotation.x = -Math.PI / 2;
  // The ground is drawn first and leaves no mark in the depth buffer, so everything else
  // simply draws over it. (A road a few centimetres above a plane this size is too fine a
  // gap to leave to depth testing: on some devices the grass showed through the road.)
  ground.renderOrder = -2;
  ground.material.depthWrite = false;
  groundMesh = ground;
  Track.toWorld(Track.length / 2, 0, tmp);
  ground.position.set(tmp.x, -0.05, tmp.z);
  levelGroup.add(ground);

  const terrainAt = theme.terrain ? buildTerrain(theme.terrain === true ? null : theme.terrain) : null; // (the height of the land at a world point)
  if (Track.hilly && theme.ground !== null && !theme.terrain) {
    // Hills: the land beside the road rises and falls with it. It is a wide ribbon of grass
    // just under the road, with a skirt sloping down to the flat ground along each edge.
    // It writes depth (pushed back a little, so the road always wins) so that a crest hides
    // what lies beyond it.
    const LAND = 130;
    // (a level in zones has its land in each zone's own colour; and where a zone is by the sea
    // (zone.sea: m from the road to the water), none out over the sea on that side, the right)
    const zones = LEVEL.zones && LEVEL.zones.length ? LEVEL.zones : null;
    // (and none under a bridge, where there is the water to see, far below)
    const stretches = offBridges(zones ? zones.map((z, i) => [i ? z.from : Track.start, i === zones.length - 1 ? Track.end : zones[i + 1].from, z.ground ?? theme.ground, z.sea])
      : [[Track.start, Track.end, theme.ground, undefined]]);
    for (const [from, to, colour, sea] of stretches) {
      const land = new THREE.Mesh(buildStrip(from, to, (s) => within(s, Track.lo(s) - LAND), (s) => within(s, Track.hi(s) + (sea ?? LAND)), -0.04, 6), flat(colour));
      land.material.polygonOffset = true;
      land.material.polygonOffsetFactor = 2;
      land.material.polygonOffsetUnits = 2;
      land.renderOrder = -1.5;
      levelGroup.add(land);
    }
    for (const [from, to, colour, sea] of stretches) for (const side of [-1, 1]) {
      const bank = flat(new THREE.Color(colour).multiplyScalar(0.8));
      const out = side > 0 && sea !== undefined ? sea : LAND; // (by the sea, a short drop to the water's edge)
      const pos = [], idx = [];
      let n = 0;
      for (let s = from; s <= to; s += 6, n++) {
        const top = within(s, (side < 0 ? Track.lo(s) : Track.hi(s)) + side * out);
        Track.toWorld(s, top, tmp);
        const drop = tmp.y; // the further it has to fall, the further out the foot of the slope
        pos.push(tmp.x, tmp.y - 0.04, tmp.z);
        Track.toWorld(s, within(s, top + side * (out === LAND ? 2 + drop * 2.5 : 1 + drop * 0.6)), tmp);
        pos.push(tmp.x, -0.04, tmp.z);
        if (n > 0) {
          const a = (n - 1) * 2;
          idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setIndex(idx);
      levelGroup.add(new THREE.Mesh(geo, bank));
    }
    // where the land stops at each end of a bridge, an embankment down to the water, right across
    // the land and its banks, so that it never ends in the air
    for (const b of LEVEL.bridges || []) {
      for (const [at, toward] of [[b.from + 4, 1], [b.to - 4, -1]]) {
        Track.toWorld(at, 0, tmp);
        const drop = tmp.y;
        if (drop < 1) continue;
        const zone = Track.zoneAt(at), sea = zone ? zone.sea : undefined, right = sea ?? LAND;
        const bank = flat(new THREE.Color(zone && zone.ground !== undefined ? zone.ground : theme.ground).multiplyScalar(0.8));
        const lo = Track.lo(at) - LAND - 2 - drop * 2.5, hi = Track.hi(at) + right + (sea === undefined ? 2 + drop * 2.5 : 1 + drop * 0.6);
        const pos = [], idx = [];
        let n = 0;
        for (let lat = lo; lat <= hi + 0.001; lat += 10, n++) {
          const l = Math.min(lat, hi);
          Track.toWorld(at, l, tmp);
          pos.push(tmp.x, tmp.y - 0.04, tmp.z);
          Track.toWorld(at + toward * (2 + drop * 1.2), l, tmp);
          pos.push(tmp.x, -0.04, tmp.z);
          if (n) { const a = (n - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setIndex(idx);
        levelGroup.add(new THREE.Mesh(geo, bank));
      }
    }
  }

  const hw = Track.hi(Track.length);
  const gateMat = new THREE.MeshLambertMaterial({ color: 0xffd23f });
  const gate = new THREE.Group();
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.6, 7, 0.6), gateMat);
    post.position.set(side * (hw + 0.5), 3.5, 0);
    gate.add(post);
  }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(hw * 2 + 1.6, 1.2, 0.6), gateMat);
  bar.position.y = 7;
  gate.add(bar);
  gate.rotation.y = Track.toWorld(Track.length, 0, tmp);
  gate.position.copy(tmp);
  levelGroup.add(gate);

  const beside = (side, s, d) => side < 0 ? Track.lo(s) - d : Track.hi(s) + d; // d metres off the pavement
  // one draw call per kind of thing. list entries: [s, lat, y, sx, sy, sz]
  // (an entry with a 7th, [s1, lat1], is a run of wall or the like from (s, lat) to there: placed
  // between the two in the world, turned along the line from one to the other and as long as it,
  // so it follows an edge that swings out from the road, a run-off's, and meets the next one)
  const placeEntry = ([s, lat, y, sx, sy, sz, to]) => {
    if (to) {
      const a = {}, b = {};
      Track.toWorld(s, lat, a);
      Track.toWorld(to[0], to[1], b);
      // (from one point to the other: turned to it, and tipped up or down to it, so that on a hill
      // the pieces run on from one to the next, not in steps)
      const run = Math.hypot(b.x - a.x, b.z - a.z);
      dummy.rotation.order = 'YXZ';
      dummy.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
      dummy.rotation.x = -Math.atan2(b.y - a.y, run);
      dummy.position.set((a.x + b.x) / 2, (a.y + b.y) / 2 + y, (a.z + b.z) / 2);
      dummy.scale.set(sx, sy, Math.hypot(run, b.y - a.y) + 0.02);
      dummy.updateMatrix();
      dummy.rotation.x = 0; // (nothing else placed with it is tipped)
      return;
    } else {
      dummy.rotation.y = Track.toWorld(s, lat, tmp);
      dummy.position.set(tmp.x, tmp.y + y, tmp.z);
      dummy.scale.set(sx, sy, sz);
    }
    dummy.updateMatrix();
  };
  const instances = (geometry, color, list, glowing) => {
    if (!list.length) return;
    const material = glowing ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.InstancedMesh(geometry, material, list.length);
    list.forEach((entry, i) => {
      placeEntry(entry);
      mesh.setMatrixAt(i, dummy.matrix);
    });
    levelGroup.add(mesh);
  };
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const tube = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
  const cone = new THREE.ConeGeometry(0.5, 1, 8);

  // ---- a race circuit's trackside (Singapore's Grand Prix at night, Montreal): concrete walls and
  // catch fences along both edges (broken off at each junction, and on a bridge, which has sides of its
  // own), red and white kerbs round every bend, and (lit) light pylons with lamps over the road
  const circuitTrackside = (lit) => {
    const breaks = Track.junctions.map(jn => [jn.s - 6, jn.end + 6]);
    const walls = [], fences = [], posts = [];
    for (const side of [-1, 1]) {
      let from = Track.start;
      for (const [a, b] of [...breaks, [Track.end, Track.end]]) {
        for (let s = from; s + 4 <= a; s += 4) {
          if (Track.onBridge(s) || Track.onBridge(s + 4)) continue; // (a bridge has its own sides)
          walls.push([s, beside(side, s, 0.3), 0.55, 0.5, 1.1, 4.02, [s + 4, beside(side, s + 4, 0.3)]]);
          fences.push([s, beside(side, s, 0.32), 2.9, 0.03, 3.6, 4.02, [s + 4, beside(side, s + 4, 0.32)]]);
          posts.push([s, beside(side, s, 0.32), 2.9, 0.1, 3.6, 0.1]);
        }
        from = b;
      }
    }
    instances(cube, 0xdedede, walls);
    instances(cube, 0x4a4f57, posts);
    // (the catch fence: a see-through mesh)
    const fence = new THREE.InstancedMesh(cube, new THREE.MeshBasicMaterial({ color: 0x9aa4ae, transparent: true, opacity: 0.3, depthWrite: false }), fences.length);
    fences.forEach((entry, i) => {
      placeEntry(entry);
      fence.setMatrixAt(i, dummy.matrix);
    });
    levelGroup.add(fence);
    if (lit) { // light pylons each side, their lamps overhanging the road
      const poles = [], arms = [], lamps = [];
      for (let s = Track.start + 10, k = 0; s < Track.end; s += 26, k++) {
        if (inJunction(s) || Track.onBridge(s)) continue;
        for (const side of [-1, 1]) {
          poles.push([s, beside(side, s, 1.0), 5.5, 0.3, 11, 0.3]);
          arms.push([s, beside(side, s, 0.1), 10.9, 1.9, 0.15, 0.15]);
          lamps.push([s, beside(side, s, -0.9), 10.8, 1.6, 0.3, 0.8]);
        }
      }
      instances(cube, 0x3a3f47, poles);
      instances(cube, 0x3a3f47, arms);
      instances(cube, 0xffffff, lamps, true);
    }
    // kerbs, red and white, along both edges of every bend that isn't a junction's
    // (blocks of each colour as one instanced mesh: a circuit is bends nearly all the way round)
    const redKerbs = [], whiteKerbs = [];
    let at = 0;
    for (const seg of LEVEL.segments) {
      const from = at, to = at + seg.length;
      at = to;
      if (Math.abs(seg.curve) < 0.004 || Track.junctions.some(jn => from < jn.end + 1 && to > jn.s - 1)) continue;
      // (each block from one point on the kerb's line to the next, as the walls are, so that round a
      // bend they meet end to end; the white a hair higher, so where they do still overlap, on the
      // inside of a tight one, neither flickers through the other)
      for (let s = from, k = 0; s < to; s += 2.5, k++) {
        const e = Math.min(to, s + 2.5), y = (white) => white ? 0.034 : 0.03;
        (k % 2 ? whiteKerbs : redKerbs).push([s, Track.laneHi(s) + 0.5, y(k % 2), 1, 0.06, 2.5, [e, Track.laneHi(e) + 0.5]]);
        (k % 2 ? redKerbs : whiteKerbs).push([s, Track.laneLo(s) - 0.5, y(!(k % 2)), 1, 0.06, 2.5, [e, Track.laneLo(e) - 0.5]]);
      }
    }
    instances(cube, 0xd62a2a, redKerbs);
    instances(cube, 0xf2f2f2, whiteKerbs);
  };
  // a level's grandstands, stepped and roofed, and its pit garages (lit within, at night): "stands"
  const grandstands = (night) => {
    for (const st of LEVEL.stands || []) {
      const side = st.side === 'left' ? -1 : 1, rows = [], roofs = [];
      for (let s = st.from; s < st.to; s += 10) {
        if (st.pits) {
          rows.push([s + 5, beside(side, s + 5, 8), 4, 10, 8, 9.6]);
          roofs.push([s + 5, beside(side, s + 5, 4.1), 3.2, 0.2, 5, 8], [s + 5, beside(side, s + 5, 8), 8.4, 11, 0.8, 10]);
        } else {
          for (let k = 0; k < 5; k++) rows.push([s + 5, beside(side, s + 5, 4 + k * 2.2), 0.8 + k * 1.4, 2.2, 1.6 + k * 2.8, 9.8]);
          roofs.push([s + 5, beside(side, s + 5, 9), 13, 12, 0.5, 10]);
        }
      }
      instances(cube, st.pits ? 0xe9ecef : 0x2a5f9c, rows);
      instances(cube, st.pits ? (night ? 0xffe9b0 : 0x9aa3ab) : 0xe9ecef, roofs, st.pits && night);
    }
  };

  if (theme.scenery === 'city') {
    // ---- roadside poles and blocks (instanced), so speed is readable -----------------------------
    // nothing is put where it would stand on another road, at a junction, or in a river
    // (a one-way road has no flyovers, so only the ramps themselves need to be kept clear)
    const junction = (s) => exits.some(x => twoWay
      ? (s > x.landingAt - 60 && s < x.exitAt + 120) || (s > x.mergeAt - 120 && s < x.flyoverAt + 60)
      : (s > x.exitAt - 20 && s < x.exitAt + 120) || (s > x.mergeAt - 120 && s < x.mergeAt + 20));
    const nearBridge = (s) => (LEVEL.bridges || []).some(b => s > b.from - 30 && s < b.to + 30);
    const poleSpots = [], blockSpots = [];
    for (let s = Track.start; s < Track.end; s += CONFIG.poleSpacing) {
      if (Track.onBridge(s) || junction(s)) continue;
      poleSpots.push([s, Track.lo(s) - 1.5], [s, Track.hi(s) + 1.5]);
    }
    for (let s = Track.start; s < Track.end; s += CONFIG.buildingSpacing) {
      if (!junction(s) && !nearBridge(s)) blockSpots.push([s, -1, true], [s, 1, true]);
    }
    for (const x of exits) {
      for (let s = x.side0 + 130; s < x.sideEnd - 130; s += CONFIG.poleSpacing) {
        poleSpots.push([s, Track.lo(s) - 1.5], [s, Track.hi(s) + 1.5]);
      }
      for (let s = x.side0 + 140; s < x.sideEnd - 140; s += CONFIG.buildingSpacing) {
        blockSpots.push([s, -1, false], [s, 1, false]);
      }
    }
    const poles = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 5, 0.3),
      new THREE.MeshLambertMaterial({ color: 0xd9d9d9 }), poleSpots.length);
    poleSpots.forEach(([s, lat], i) => {
      dummy.rotation.y = Track.toWorld(s, lat, tmp);
      dummy.position.set(tmp.x, tmp.y + 2.5, tmp.z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      poles.setMatrixAt(i, dummy.matrix);
    });
    levelGroup.add(poles);

    const blocks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshLambertMaterial({ color: 0x8b93a1 }), blockSpots.length);
    blockSpots.forEach(([s0, side, onMain], i) => {
      const s = s0 + Math.random() * 10;
      const w = 6 + Math.random() * 10, h = 5 + Math.random() * 22, d = 6 + Math.random() * 12;
      const far = 8 + w / 2 + Math.random() * 30;
      const lat = side < 0 ? Track.lo(s) - far : Track.hi(s) + far;
      dummy.rotation.y = Track.toWorld(s, lat, tmp);
      // skip any that would land on, or right beside, the other road
      const clash = onMain ? Track.sideDistance(tmp.x, tmp.z) < 24 : Track.mainDistance(tmp.x, tmp.z) < 30;
      dummy.position.set(tmp.x, tmp.y + h / 2, tmp.z);
      if (clash) dummy.scale.setScalar(0); // (gone entirely: flattening it alone left its roof hanging in the air)
      else dummy.scale.set(w, h, d);
      dummy.updateMatrix();
      blocks.setMatrixAt(i, dummy.matrix);
    });
    levelGroup.add(blocks);
  } else if (theme.scenery === 'farm') {
    // ---- farm: fenced fields of crops, trees, barns, silos and hay stacks -------------------------
    // fields: strips of different crops running alongside the road, drawn just after the ground
    const crops = [0xd9b84a, 0x6fae45, 0x9a7b4f, 0xc7d44f];
    for (const side of [-1, 1]) {
      for (let s = Track.start, k = side > 0 ? 0 : 2; s < Track.end; s += 140, k++) {
        const field = new THREE.Mesh(
          buildStrip(s, Math.min(Track.end, s + 132), (q) => beside(side, q, 4), (q) => beside(side, q, 110), -0.03, 8),
          new THREE.MeshBasicMaterial({ color: crops[k % crops.length], side: THREE.DoubleSide, depthWrite: false }));
        field.renderOrder = -1;
        levelGroup.add(field);
      }
      // a two-rail fence along the roadside: it also makes speed readable
      for (const y of [0.5, 1.0]) {
        add(buildStrip(Track.start, Track.end, (q) => beside(side, q, 1.32), (q) => beside(side, q, 1.48), y), flat(0x8a6a45));
      }
    }
    const posts = [], trunks = [], crowns = [], barns = [], roofs = [], silos = [], caps = [], stacks = [];
    for (let s = Track.start; s < Track.end; s += 6) {
      for (const side of [-1, 1]) posts.push([s, beside(side, s, 1.4), 0.6, 0.2, 1.2, 0.2]);
    }
    for (let s = Track.start; s < Track.end; s += 26) {
      for (const side of [-1, 1]) {
        const roll = Math.random(), at = s + Math.random() * 14;
        if (roll < 0.5) { // a tree
          const h = 4 + Math.random() * 4, lat = beside(side, at, 7 + Math.random() * 45);
          trunks.push([at, lat, h * 0.2, 0.6, h * 0.4, 0.6]);
          crowns.push([at, lat, h * 0.75, h * 0.6, h * 0.9, h * 0.6]);
        } else if (roll < 0.58) { // a red barn with a dark roof
          const lat = beside(side, at, 22 + Math.random() * 30);
          barns.push([at, lat, 3, 10, 6, 14]);
          roofs.push([at, lat, 6.6, 10.8, 1.2, 14.8]);
        } else if (roll < 0.64) { // a silo
          const lat = beside(side, at, 18 + Math.random() * 30);
          silos.push([at, lat, 6, 5, 12, 5]);
          caps.push([at, lat, 13.2, 5.4, 2.4, 5.4]);
        } else if (roll < 0.78) { // a stack of hay in the field
          stacks.push([at, beside(side, at, 8 + Math.random() * 30), 0.8, 2.4, 1.6, 2.4]);
        }
      }
    }
    instances(cube, 0x7a5a3a, posts);
    instances(tube, 0x6b4a2b, trunks);
    instances(cone, 0x3f8f3f, crowns);
    instances(cube, 0xb5382e, barns);
    instances(cube, 0x4a3a34, roofs);
    instances(tube, 0xc9ccd1, silos);
    instances(cone, 0x8a8f96, caps);
    instances(tube, 0xe0c060, stacks);
  } else if (theme.scenery === 'beach') {
    // ---- beach: the sea along the right with a line of surf, palms, umbrellas and huts ---------
    for (const [a, b, color, order] of [[30, 600, 0x2f6f9f, -1], [28, 32, 0xd8e6ea, -0.9]]) {
      const water = new THREE.Mesh(buildStrip(Track.start, Track.end, (q) => beside(1, q, a), (q) => beside(1, q, b), -0.03, 8),
        new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, depthWrite: false }));
      water.renderOrder = order;
      levelGroup.add(water);
    }
    const trunks = [], crowns = [], poles = [], shades = [], huts = [], roofs = [];
    for (let s = Track.start; s < Track.end; s += 18) {
      for (const side of [-1, 1]) {
        const roll = Math.random(), at = s + Math.random() * 12;
        // the sea side has the beach: umbrellas and huts between the road and the water,
        // palms behind the road on the land side and here and there along the shore
        if (side > 0 && roll < 0.35) {
          const lat = beside(1, at, 6 + Math.random() * 18);
          poles.push([at, lat, 1.2, 0.12, 2.4, 0.12]);
          shades.push([at, lat, 2.5, 3, 0.9, 3]);
        } else if (side > 0 && roll < 0.45) {
          const lat = beside(1, at, 8 + Math.random() * 12);
          huts.push([at, lat, 1.4, 3.2, 2.8, 3.2]);
          roofs.push([at, lat, 3.3, 3.8, 1.2, 3.8]);
        } else if (roll < (side > 0 ? 0.6 : 0.5)) {
          const h = 6 + Math.random() * 5, lat = beside(side, at, side > 0 ? 4 + Math.random() * 20 : 5 + Math.random() * 50);
          trunks.push([at, lat, h / 2, 0.5, h, 0.5]);
          crowns.push([at, lat, h + 0.4, 6, 1.8, 6]);
        }
      }
    }
    instances(tube, 0x8a6a45, trunks);
    instances(cone, 0x3f9f4f, crowns);
    instances(tube, 0xf4f4f4, poles);
    instances(cone, 0xff6a5a, shades, true);
    instances(cube, 0x62b0d8, huts);
    instances(cone, 0xf2e3c4, roofs);
  } else if (theme.scenery === 'suburb') {
    // ---- suburb: a pavement each side, then lots: a front lawn behind a picket fence, a house
    // with a door and windows facing the road, a driveway and a mailbox; here and there a little
    // park of trees instead. Trees in the gardens, and street lamps along the pavement.
    for (const side of [-1, 1]) {
      add(buildStrip(Track.start, Track.end, (q) => beside(side, q, 0.4), (q) => beside(side, q, 2.4), 0.03), flat(0xcfd0cb));
    }
    // (run down, theme.rundown: drab walls, boarded windows, gaps in the fences, dead trees, bare dirt,
    // burnt-out houses, wrecks on the lawns, rubbish and graffiti)
    const rundown = !!theme.rundown, odds = (p) => rundown && Math.random() < p;
    const WALLS = rundown ? [0x9a9282, 0xa8a08a, 0x7f8a8c, 0x9c8c7a, 0x77726a, 0xb0a88f] : [0xf2e6c9, 0xbfd8e8, 0xf0c9b0, 0xd9e5c3, 0xe8d0e0, 0xfafafa];
    const walls = WALLS.map(() => []), roofs = [], doors = [], windows = [], drives = [];
    const pickets = [], rails = [], mailPosts = [], mailboxes = [], trunks = [], crowns = [], lampPosts = [], lampHeads = [];
    const boards = [], holes = [], burnt = [], burntRoofs = [], dirt = [], branches = [], wrecks = [], wreckTops = [], bags = [], tags = [[], [], []];
    const gangWalls = [], gangWindows = [], gangDoors = [], gangTags = [], poles = [], flags = [], beacons = [];
    const tree = (at, lat) => {
      const h = 0.8 + Math.random() * 0.5;
      if (odds(0.5)) { // (a dead one: a bare trunk and a few bare branches)
        trunks.push([at, lat, 1.6 * h, 0.3, 3.2 * h, 0.3]);
        for (let k = 0; k < 3; k++) branches.push([at + Math.random() * 1.2 - 0.6, lat + Math.random() * 1.2 - 0.6, (2.2 + k * 0.5) * h, 0.12, 0.12, 1.6 + Math.random()]);
        return;
      }
      trunks.push([at, lat, 1.2 * h, 0.35, 2.4 * h, 0.35]);
      crowns.push([at, lat, 3.6 * h, 3.4 * h, 3.0 * h, 3.4 * h]);
    };
    const FENCE = 2.8; // m off the pavement edge to the fence (and LOT m along the road per lot: see gunfire.js)
    // (nothing goes where it would stand on a side road)
    const clear = (s, lat) => !exits.length || (Track.toWorld(s, lat, tmp), Track.sideDistance(tmp.x, tmp.z) > 24);
    for (const side of [-1, 1]) {
      for (let s = Track.start + (side > 0 ? 0 : LOT / 2), lot = 0; s < Track.end - LOT; s += LOT, lot++) {
        const mid = s + LOT / 2;
        if (!clear(mid, beside(side, mid, 12))) continue;
        // (each lot the same every time: The Hood's shooters are in these houses, see gunfire.js)
        const house = houseAt(side, lot);
        if (!house) { // a little park
          for (let k = 0; k < 4; k++) tree(s + Math.random() * LOT, beside(side, mid, 5 + Math.random() * 22));
          continue;
        }
        const { along, across, tall, front } = house, h = tall ? 6 : 3.4; // (front: m of front lawn, from the pavement edge to the house)
        const lat = beside(side, mid, front + across / 2), face = beside(side, mid, front - 0.06);
        // (a gang house, which shoots: see gunfire.js. Marked out: black, its windows glowing red behind
        // the guns, a red door, a red tag across the front, and a red flag flying from a pole on the roof)
        const gang = rundown && gangHouse(side, lot);
        const shell = !gang && odds(0.1); // (burnt out: blackened, its roof fallen in, its windows empty)
        if (gang) {
          gangWalls.push([mid, lat, h / 2, across, h, along]);
          roofs.push([mid, lat, h + 1.1, across * 1.12, 2.2, along * 1.12]);
          gangTags.push([mid, beside(side, mid, front - 0.09), h * 0.55, 0.06, 1.2, along * 0.85]);
          const pole = beside(side, mid, front + across / 2);
          poles.push([mid, pole, h + 3.6, 0.14, 5, 0.14]);
          flags.push([mid + 1.1, pole, h + 5.3, 0.06, 1.4, 2.2]);
          beacons.push([mid, pole, h + 6.2, 0.45, 0.45, 0.45]);
        } else if (shell) {
          burnt.push([mid, lat, h / 2, across, h, along]);
          burntRoofs.push([mid, lat, h + 0.35, across * 0.9, 0.7, along * 0.9]);
        } else {
          walls[Math.floor(Math.random() * WALLS.length)].push([mid, lat, h / 2, across, h, along]);
          roofs.push([mid, lat, h + 1.1, across * 1.12, 2.2, along * 1.12]);
        }
        (gang ? gangDoors : shell || odds(0.25) ? holes : doors).push([mid - 1.5, face, 1.1, 0.12, 2.2, 1.1]); // (a door, or the hole where it was)
        const pane = (at, y) => (gang ? gangWindows : shell ? holes : odds(0.5) ? boards : windows).push([at, face, y, 0.1, 1.2, 1.7]); // (or boarded up)
        for (const floor of tall ? [1.6, 4.4] : [1.6]) {
          pane(mid + 2.2, floor);
          if (floor > 2) pane(mid - 1.5, floor);
        }
        if (!shell && !gang && odds(0.35)) tags[Math.floor(Math.random() * 3)].push([mid + Math.random() * 3 - 1.5, beside(side, mid, front - 0.08), 0.9, 0.06, 1.1, 2.4 + Math.random() * 2]); // (graffiti)
        if (rundown) { // the lawn: bare dirt in patches, now and then a wreck on it, and bags of rubbish by the mailbox
          for (let k = 0; k < 2; k++) dirt.push([s + 3 + Math.random() * (LOT - 6), beside(side, mid, FENCE + 1.5 + Math.random() * (front - FENCE - 3)), 0.02, 2 + Math.random() * 3, 0.04, 3 + Math.random() * 4]);
          if (odds(0.2)) {
            const w = beside(side, mid, FENCE + 3.2);
            wrecks.push([mid + 3, w, 0.55, 1.8, 0.8, 4.2]);
            wreckTops.push([mid + 3.3, w, 1.15, 1.5, 0.5, 2]);
          }
          for (let k = Math.floor(Math.random() * 3); k > 0; k--) bags.push([mid + along / 2 + 1 + Math.random() * 1.5, beside(side, mid, FENCE - 0.6 - Math.random() * 0.6), 0.3, 0.6, 0.6, 0.6]);
        }
        // the driveway, beside the house, from the pavement to its far side, with the mailbox at its end
        const drive = mid + along / 2 + 2;
        drives.push([drive, beside(side, drive, (front + across) / 2 + 1.2), 0.03, front + across - 2.4, 0.06, 3.2]);
        mailPosts.push([drive - 2.3, beside(side, drive - 2.3, FENCE - 0.3), 0.5, 0.1, 1.0, 0.1]);
        mailboxes.push([drive - 2.3, beside(side, drive - 2.3, FENCE - 0.3), 1.1, 0.32, 0.3, 0.55]);
        // the picket fence along the front of the lot, open where the driveway crosses it
        for (const [from, to] of [[s, drive - 1.8], [drive + 1.8, s + LOT]]) {
          if (to - from < 1 || odds(0.2)) continue; // (run down: some stretches of fence gone altogether...)
          for (let q = from; q <= to; q += 1.2) if (!odds(0.3)) pickets.push([q, beside(side, q, FENCE), 0.45, 0.1, 0.9, 0.1]); // (...and pickets missing)
          for (const y of [0.3, 0.65]) rails.push([(from + to) / 2, beside(side, (from + to) / 2, FENCE), y, 0.06, 0.08, to - from]);
        }
        if (Math.random() < 0.6) tree(s + 2 + Math.random() * 5, beside(side, s, FENCE + 2 + Math.random() * 3)); // in the front garden
        tree(mid + Math.random() * 8 - 4, beside(side, mid, front + across + 5 + Math.random() * 10));   // and the back
      }
    }
    for (let s = Track.start, k = 0; s < Track.end; s += 55, k++) { // street lamps, each side in turn
      const side = k % 2 ? 1 : -1;
      if (!clear(s, beside(side, s, 0.8))) continue;
      lampPosts.push([s, beside(side, s, 0.8), 2.75, 0.16, 5.5, 0.16]);
      lampHeads.push([s, beside(side, s, 0.2), 5.45, 1.2, 0.18, 0.4]);
    }
    // (a four-sided cone turned an eighth is a square pyramid over a unit square: a hip roof)
    const roof = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4);
    WALLS.forEach((color, i) => instances(cube, color, walls[i]));
    instances(roof, rundown ? 0x4a423c : 0x6b4a3f, roofs);
    instances(cube, rundown ? 0x5a3a2e : 0x7a3b2e, doors);
    instances(cube, rundown ? 0x6f8794 : 0x9cc7e0, windows);
    instances(cube, rundown ? 0x8a8780 : 0x9a9a95, drives);
    instances(cube, rundown ? 0xb3ab98 : 0xffffff, pickets);
    instances(cube, rundown ? 0xb3ab98 : 0xffffff, rails);
    instances(cube, 0x5a5a5a, mailPosts);
    instances(cube, rundown ? 0x4a4f58 : 0x2a4a8a, mailboxes);
    instances(tube, rundown ? 0x5b4a3a : 0x6b4a2b, trunks);
    instances(new THREE.SphereGeometry(0.5, 10, 8), rundown ? 0x6f7a3a : 0x3f8f3f, crowns);
    if (rundown) {
      instances(cube, 0x8a6a42, boards);            // boarded-up windows
      instances(cube, 0x161616, holes);             // doorways and windows with nothing in them
      instances(cube, 0x57514b, burnt);             // burnt-out shells, sooty grey (only the gang's houses are black)
      instances(cube, 0x3a3532, burntRoofs);
      instances(cube, 0x7a6644, dirt);              // bare dirt on the lawns
      instances(cube, 0x4a3c30, branches);          // dead trees' branches
      instances(cube, 0x7a4a2a, wrecks);            // rusting wrecks
      instances(cube, 0x5a3a24, wreckTops);
      instances(new THREE.SphereGeometry(0.5, 8, 6), 0x161618, bags); // rubbish bags
      [0xd9367a, 0x2fb3d9, 0xe0d23a].forEach((color, i) => instances(cube, color, tags[i])); // graffiti
      instances(cube, 0x1c1a1f, gangWalls);           // the gang houses: black,
      instances(cube, 0xff2a2a, gangWindows, true);   // their windows glowing red,
      instances(cube, 0xc81e1e, gangDoors);           // a red door,
      instances(cube, 0xe01818, gangTags);            // a red tag across the front,
      instances(cube, 0x2a2a2a, poles);               // and a red flag on a pole,
      instances(cube, 0xe31b1b, flags);
      instances(new THREE.SphereGeometry(0.5, 10, 8), 0xff3030, beacons, true); // with a red light on top
    }
    instances(cube, 0x55595f, lampPosts);
    instances(cube, 0xfff3c4, lampHeads, true);
  } else if (theme.scenery === 'canberra') {
    // ---- canberra: gum trees in the dry grass, concrete government blocks set back from the road,
    // kangaroos, Lake Burley Griffin under each bridge with the Captain Cook jet, Black Mountain and
    // its tower off to the left, and Parliament House and its flag mast past the finish
    const trunks = [], leaves = [], blocks = [], bands = [], roos = [], heads = [];
    const gum = (at, lat) => {
      const h = 7 + Math.random() * 6;
      trunks.push([at, lat, h / 2, 0.45, h, 0.45]);
      for (let k = 0; k < 3; k++) { // (clumps of leaves, untidy, up the top of it)
        const size = 2.2 + Math.random() * 2;
        leaves.push([at + Math.random() * 2 - 1, lat + Math.random() * 2 - 1, h * (0.7 + k * 0.15), size, size * 0.7, size]);
      }
    };
    const nearLake = (s) => (LEVEL.bridges || []).some(b => s > b.from - 40 && s < b.to + 40);
    for (let s = Track.start; s < Track.end; s += 14) {
      if (nearLake(s)) continue;
      for (const side of [-1, 1]) {
        const roll = Math.random(), at = s + Math.random() * 10;
        if (roll < 0.45) gum(at, beside(side, at, 4 + Math.random() * 50));
        else if (roll < 0.5) { // a kangaroo or two, sitting up in the grass
          const lat = beside(side, at, 8 + Math.random() * 30);
          roos.push([at, lat, 0.75, 0.7, 1.3, 0.8]);
          heads.push([at + 0.3, lat, 1.55, 0.35, 0.45, 0.5]);
        }
      }
    }
    for (let s = Track.start + 60, k = 0; s < Track.end; s += 110, k++) { // concrete blocks, each side in turn
      if (nearLake(s) || nearLake(s + 40)) continue;
      const side = k % 2 ? 1 : -1, w = 26 + Math.random() * 22, h = 8 + Math.random() * 7, d = 14 + Math.random() * 10;
      const lat = beside(side, s, 28 + d / 2 + Math.random() * 25);
      blocks.push([s, lat, h / 2, d, h, w]);
      for (let y = 2.4; y < h - 1; y += 3) bands.push([s, lat, y, d + 0.1, 0.9, w + 0.1]); // (rows of windows)
    }
    instances(tube, 0xe3dccb, trunks);
    instances(new THREE.SphereGeometry(0.5, 8, 6), 0x7e9468, leaves);
    instances(cube, 0xbdb6a8, blocks);
    instances(cube, 0x3e464f, bands);
    instances(new THREE.SphereGeometry(0.5, 8, 6), 0x8a6a4a, roos);
    instances(new THREE.SphereGeometry(0.5, 8, 6), 0x7a5c3e, heads);
    // the lake under each bridge, out to either side, and the jet (a plume of spray) on the left
    for (const b of LEVEL.bridges || []) {
      for (const side of [-1, 1]) {
        const lake = new THREE.Mesh(buildStrip(b.from - 20, b.to + 20, (q) => beside(side, q, 2), (q) => beside(side, q, 500), -0.02, 8),
          new THREE.MeshBasicMaterial({ color: 0x4f86a8, side: THREE.DoubleSide, depthWrite: false }));
        lake.renderOrder = -1;
        levelGroup.add(lake);
      }
      const jet = new THREE.Mesh(new THREE.ConeGeometry(4, 70, 12, 1, true), new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }));
      Track.toWorld((b.from + b.to) / 2, beside(-1, (b.from + b.to) / 2, 160), tmp);
      jet.position.set(tmp.x, 35, tmp.z);
      levelGroup.add(jet);
    }
    // Black Mountain, with Telstra Tower on top: a third of the way along, off to the left
    {
      const at = Track.length / 3;
      Track.toWorld(at, beside(-1, at, 380), tmp);
      const hill = new THREE.Mesh(new THREE.ConeGeometry(160, 70, 16), new THREE.MeshLambertMaterial({ color: 0x5f7448 }));
      hill.position.set(tmp.x, 35, tmp.z);
      const concrete = new THREE.MeshLambertMaterial({ color: 0xd8d8d2 });
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.2, 120, 12), concrete);
      shaft.position.set(tmp.x, 70 + 60, tmp.z);
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(9, 7, 14, 16), concrete);
      pod.position.set(tmp.x, 70 + 80, tmp.z);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.2, 50, 8), concrete);
      mast.position.set(tmp.x, 70 + 145, tmp.z);
      levelGroup.add(hill, shaft, pod, mast);
    }
    // Parliament House, just past the end of the road: a long low front, and the flag mast on its
    // four legs over the middle, flying the flag
    {
      const at = Track.end + 140, h = Track.toWorld(at, 0, tmp);
      const house = new THREE.Group();
      const white = new THREE.MeshLambertMaterial({ color: 0xece8de });
      const front = new THREE.Mesh(new THREE.BoxGeometry(220, 14, 40), white);
      front.position.y = 7;
      const hill = new THREE.Mesh(new THREE.SphereGeometry(60, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x6f8f4a }));
      hill.scale.set(1.8, 0.35, 1.2);
      hill.position.z = 40;
      house.add(front, hill);
      const steel = new THREE.MeshLambertMaterial({ color: 0xc9ccd1 });
      for (const [x, z] of [[-14, 25], [14, 25], [-14, 55], [14, 55]]) { // the four legs, leaning in to the top
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 82, 6), steel);
        leg.position.set(x / 2, 40, (z + 40) / 2);
        leg.lookAt(0, 81, 40);
        leg.rotateX(Math.PI / 2);
        house.add(leg);
      }
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 30, 6), steel);
      pole.position.set(0, 95, 40);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), new THREE.MeshBasicMaterial({ color: 0x0b2a6f, side: THREE.DoubleSide }));
      flag.position.set(6, 106, 40);
      house.add(pole, flag);
      house.rotation.y = h;
      house.position.copy(tmp);
      levelGroup.add(house);
    }
  } else if (theme.scenery === 'singapore') {
    // ---- singapore: pavements, rain trees along the road, glass towers, housing blocks with bands
    // of colour and low shophouses set back from it, a grove of Supertrees, the Singapore Flyer near
    // the start and Marina Bay Sands by the finish. Nothing stands on a junction or its arms, nor on
    // another stretch of road. At night (theme.night) it is the Grand Prix: windows lit, the
    // landmarks glowing, light pylons over the road, walls and catch fences in place of the
    // pavements, and kerbs on the corners.
    const p = {}, night = !!theme.night;
    const glowMat = (color) => new THREE.MeshBasicMaterial({ color });
    // (a level with its real landmarks, "landmarks", puts them where they are, and keeps the town clear of them)
    const marks = LEVEL.landmarks || [], mark = (kind) => marks.find(l => l.kind === kind);
    const clearOf = (x, z, margin) => Track.mainDistance(x, z) > Math.max(Track.hi(0), -Track.lo(0)) + margin &&
      !marks.some(l => Math.hypot(x - l.x, z - l.z) < l.r + margin) &&
      !Track.junctions.some(jn => jn.arms.some(arm => {
        const dx = x - jn.centre.x, dz = z - jn.centre.z, u = dx * arm.dir.x + dz * arm.dir.z;
        const v = Math.abs(-dx * arm.dir.z + dz * arm.dir.x);
        return u > -jn.half - margin && u < arm.length + margin && v < jn.half + margin;
      }) || Math.hypot(x - jn.centre.x, z - jn.centre.z) < jn.half * 1.5 + margin);
    // pavements (or at night, the circuit's trackside: see circuitTrackside), broken off at each junction
    if (night) circuitTrackside(true);
    else {
      const breaks = Track.junctions.map(jn => [jn.s - 6, jn.end + 6]);
      for (const side of [-1, 1]) {
        let from = Track.start;
        for (const [a, b] of [...breaks, [Track.end, Track.end]]) {
          if (a > from) add(buildStrip(from, a, (q) => beside(side, q, 0.4), (q) => beside(side, q, 3), 0.03), flat(0xc9c7c0));
          from = b;
        }
      }
    }
    const trunks = [], canopies = [], towers = [], glass = [], blocks = [], bands = [], shops = [], roofs = [];
    // (none along a circuit's start / finish straight: the straight either side of the line)
    const straight = (q) => Math.abs(Track.bend(q)) < 0.002;
    let straightTo = 0, straightFrom = Track.length;
    if (Track.loop) {
      while (straightTo < Track.length && straight(straightTo)) straightTo += 2;
      while (straightFrom > 0 && straight(straightFrom - 1)) straightFrom -= 2;
    }
    for (let s = Track.start; s < Track.end; s += 16) {
      if (Track.loop && (s < straightTo || s > straightFrom)) continue;
      for (const side of [-1, 1]) {
        const lat = beside(side, s, 4.5);
        Track.toWorld(s, lat, p);
        if (!clearOf(p.x, p.z, 4)) continue;
        trunks.push([s, lat, 1.8, 0.5, 3.6, 0.5]);
        canopies.push([s, lat, 4.6, 9, 2.6, 9]); // (a rain tree: a wide, flat umbrella of leaves)
      }
    }
    for (let s = Track.start, k = 0; s < Track.end; s += 30, k++) {
      for (const side of [-1, 1]) {
        const roll = Math.random(), w = 16 + Math.random() * 14, d = 16 + Math.random() * 14;
        const lat = beside(side, s, 16 + d / 2 + Math.random() * 30);
        Track.toWorld(s, lat, p);
        if (!clearOf(p.x, p.z, Math.max(w, d) / 2 + 6)) continue;
        if (roll < 0.4) { // a glass tower, with a lighter crown
          const h = 60 + Math.random() * 100;
          towers.push([s, lat, h / 2, d, h, w]);
          glass.push([s, lat, h + 2, d * 0.8, 4, w * 0.8]);
        } else if (roll < 0.8) { // a housing block, with bands of colour
          const h = 30 + Math.random() * 25;
          blocks.push([s, lat, h / 2, d * 0.7, h, w * 1.3]);
          for (let y = 3; y < h - 1; y += 6) bands.push([s, lat, y, d * 0.7 + 0.1, 0.8, w * 1.3 + 0.1]);
        } else { // a row of shophouses
          const h = 9 + Math.random() * 4;
          shops.push([s, lat, h / 2, d * 0.6, h, w]);
          roofs.push([s, lat, h + 0.6, d * 0.65, 1.2, w + 0.4]);
        }
      }
    }
    // (at night the towers are dark glass with rows of lit windows, the blocks' bands are lit
    // windows, and the shophouses glow at street level)
    if (night) {
      for (const [s, lat, , d, h, w] of towers) for (let y = 4; y < h - 2; y += 4.5) bands.push([s, lat, y, d + 0.1, 1.3, w + 0.1]);
      for (const [s, lat, , d, , w] of shops) roofs.push([s, lat, 3.2, d + 0.1, 1.6, w + 0.1]);
    }
    instances(tube, 0x6b5440, trunks);
    instances(new THREE.SphereGeometry(0.5, 10, 6), 0x4f8a3c, canopies);
    instances(cube, night ? 0x4a6582 : 0x6fa3b8, towers);
    instances(cube, night ? 0x9fd8ff : 0xe8f1f4, glass, night);
    instances(cube, night ? 0xcabd9f : 0xf1e4c9, blocks);
    instances(cube, night ? 0xffe2a0 : 0x3f8f8a, bands, night);
    instances(cube, night ? 0xd29a70 : 0xe7b48a, shops);
    instances(cube, night ? 0xffc070 : 0x9c4a3a, roofs, night);
    // a grove of Supertrees, half way along on the right: purple trunks widening up to a flat crown
    // (glowing, at night)
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7b3fa8, emissive: night ? 0x3a1060 : 0x000000 });
    const crownMat = night ? glowMat(0xff4fd8) : new THREE.MeshLambertMaterial({ color: 0xd9468f });
    for (let k = 0, tries = 0; k < (mark('gardens') ? 14 : 7) && tries < 120; tries++) {
      const at = Track.length * 0.5 + Math.random() * 120 - 60, garden = mark('gardens');
      if (garden) Object.assign(p, { x: garden.x + (Math.random() - 0.5) * garden.r * 2, y: 0, z: garden.z + (Math.random() - 0.5) * garden.r * 2 });
      else Track.toWorld(at, beside(1, at, 45 + Math.random() * 60), p);
      if (!garden && !clearOf(p.x, p.z, 12)) continue;
      const h = 22 + Math.random() * 26;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 1.2, h, 10), trunkMat);
      trunk.position.set(p.x, p.y + h / 2, p.z);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(7, 4, 2.2, 14), crownMat);
      crown.position.set(p.x, p.y + h + 1.1, p.z);
      levelGroup.add(trunk, crown);
      k++;
    }
    // Marina Bay Sands by the finish, on the left: three towers with the boat of a park across their tops
    for (let tries = 0, at = Track.length - 40; tries < 20; tries++, at -= 15) {
      const m = mark('mbs'), h = m ? (Object.assign(p, { x: m.x, y: 0, z: m.z }), m.rot) : Track.toWorld(at, beside(-1, at, 120), p);
      if (!m && !clearOf(p.x, p.z, 70)) continue;
      const fx = Math.sin(h), fz = Math.cos(h);
      const white = new THREE.MeshLambertMaterial({ color: 0xe9ecee, emissive: night ? 0x5a5648 : 0x000000 });
      for (const k of [-1, 0, 1]) {
        const tower = new THREE.Mesh(new THREE.BoxGeometry(30, 190, 16), white);
        tower.position.set(p.x + fx * k * 38, p.y + 95, p.z + fz * k * 38);
        tower.rotation.y = h + Math.PI / 2;
        levelGroup.add(tower);
      }
      const park = new THREE.Mesh(new THREE.BoxGeometry(36, 7, 150), night ? glowMat(0xbfe6ff) : new THREE.MeshLambertMaterial({ color: 0xc8d4d8 }));
      park.position.set(p.x + fx * 8, p.y + 194, p.z + fz * 8);
      park.rotation.y = h;
      levelGroup.add(park);
      break;
    }
    // the Singapore Flyer near the start, off to the left: a great wheel standing side-on to the
    // road, on a pair of legs, with its capsules round the rim (lit, at night)
    for (let tries = 0, at = Math.min(260, Track.length * 0.1); tries < 20; tries++, at += 20) {
      const m = mark('flyer'), h = m ? (Object.assign(p, { x: m.x, y: 0, z: m.z }), m.rot) : Track.toWorld(at, beside(-1, at, 150), p);
      if (!m && !clearOf(p.x, p.z, 25)) continue;
      const wheel = new THREE.Group(), R = 70, HUB = 85;
      const steel = night ? glowMat(0x9fe8ff) : new THREE.MeshLambertMaterial({ color: 0xe8ecef });
      const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 1.2, 8, 72), steel);
      rim.position.y = HUB;
      wheel.add(rim);
      for (let k = 0; k < 14; k++) { // spokes, and a capsule at the end of each... and between
        const a = k / 14 * Math.PI * 2;
        const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, R, 4), steel);
        spoke.position.set(Math.cos(a) * R / 2, HUB + Math.sin(a) * R / 2, 0);
        spoke.rotation.z = a - Math.PI / 2;
        wheel.add(spoke);
      }
      const capsuleMat = night ? glowMat(0xfff3c4) : new THREE.MeshLambertMaterial({ color: 0xbfd9e6 });
      for (let k = 0; k < 28; k++) {
        const a = k / 28 * Math.PI * 2;
        const capsule = new THREE.Mesh(new THREE.BoxGeometry(3, 2.2, 2.2), capsuleMat);
        capsule.position.set(Math.cos(a) * (R + 2), HUB + Math.sin(a) * (R + 2), 0);
        wheel.add(capsule);
      }
      const legMat = new THREE.MeshLambertMaterial({ color: 0xcfd4d8 });
      for (const side of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.8, HUB / Math.cos(0.25), 8), legMat);
        leg.position.set(side * HUB * Math.tan(0.25) / 2, HUB / 2, 0);
        leg.rotation.z = side * 0.25;
        wheel.add(leg);
      }
      wheel.position.set(p.x, p.y, p.z);
      wheel.rotation.y = h - Math.PI / 2; // (its face towards the road)
      levelGroup.add(wheel);
      break;
    }
    // ...and the rest of a level's real landmarks, and its grandstands and pits
    const lit = (color, glow) => new THREE.MeshLambertMaterial({ color, emissive: night ? glow : 0x000000 });
    for (const l of marks) {
      const g = new THREE.Group();
      g.position.set(l.x, 0, l.z);
      g.rotation.y = l.rot || 0;
      const put = (geometry, material, x, y, z) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); g.add(mesh); return mesh; };
      if (l.kind === 'bay') { // the water of Marina Bay, lights shimmering on it at night
        const water = put(new THREE.CircleGeometry(l.r, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: night ? 0x17304d : 0x2d6f96, depthWrite: false }), 0, -0.03, 0);
        water.renderOrder = -1.8;
      } else if (l.kind === 'esplanade') { // Esplanade - Theatres on the Bay: two spiky "durian" domes
        for (const [dx, r] of [[-28, 30], [30, 26]]) {
          put(new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), lit(0xb98d52, 0x4a3218), dx, 0, 0).scale.set(1, 0.7, 1.25);
          const spikes = new THREE.InstancedMesh(new THREE.ConeGeometry(1.2, 3.5, 4), lit(0x8f6a3c, 0x2a1a0a), 90);
          const d = new THREE.Object3D();
          for (let k = 0; k < 90; k++) {
            const a = Math.random() * Math.PI * 2, e = Math.random() * 1.3;
            d.position.set(dx + Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r * 0.7, Math.sin(a) * Math.cos(e) * r * 1.25);
            d.lookAt(dx, -r, 0);
            d.rotateX(-Math.PI / 2);
            d.updateMatrix();
            spikes.setMatrixAt(k, d.matrix);
          }
          g.add(spikes);
        }
      } else if (l.kind === 'fullerton') { // the Fullerton Hotel: a great neoclassical block, columns along its front
        put(new THREE.BoxGeometry(70, 26, 60), lit(0xe6dcc6, 0x5a4f3a), 0, 13, 0);
        put(new THREE.BoxGeometry(74, 3, 64), lit(0xd8ccb2, 0x4a4030), 0, 27.5, 0);
        for (let k = -6; k <= 6; k++) put(new THREE.CylinderGeometry(1, 1, 18, 8), lit(0xf2ecdc, 0x6a6048), k * 5, 9, 31);
        put(new THREE.BoxGeometry(14, 8, 14), lit(0xffe2a0, 0x8a6a30), 0, 33, 0); // (its lit crown)
      } else if (l.kind === 'merlion') { // the Merlion, spouting into the bay
        put(new THREE.CylinderGeometry(2.5, 3.2, 3, 10), lit(0xc9c3b6, 0x403c34), 0, 1.5, 0);
        put(new THREE.CylinderGeometry(1.6, 2.2, 5, 10), lit(0xf2f0ea, 0x6a6860), 0, 5.5, 0);
        put(new THREE.SphereGeometry(1.8, 12, 10), lit(0xf2f0ea, 0x6a6860), 0, 8.8, 0.4);
        const spout = put(new THREE.CylinderGeometry(0.3, 0.9, 9, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xcfefff, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }), 0, 7, 5);
        spout.rotation.x = Math.PI / 2.6;
      } else if (l.kind === 'padang') { // the Padang: a green field, the pavilion at one end
        put(new THREE.PlaneGeometry(l.r * 1.6, l.r * 1.1).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x3f7a3a }), 0, 0.02, 0);
        put(new THREE.BoxGeometry(40, 10, 16), lit(0xf2efe6, 0x5a5850), 0, 5, -l.r * 0.65);
        put(new THREE.BoxGeometry(44, 2, 20), lit(0x8a3a2a, 0x2a0a06), 0, 11, -l.r * 0.65);
      } else if (l.kind === 'artscience') { // the ArtScience Museum: a white lotus, its petals opening up from a round base
        const white = lit(0xf1f1ee, 0x6a6a64);
        put(new THREE.CylinderGeometry(9, 12, 6, 20), white, 0, 3, 0);
        for (let k = 0; k < 10; k++) { // (broad, rounded fingers, leaning out, some taller than the rest)
          const a = k / 10 * Math.PI * 2, half = 15 + (k % 3) * 4;
          const petal = put(new THREE.SphereGeometry(1, 14, 10), white, Math.sin(a) * (8 + half * 0.4), 4 + half * 0.9, Math.cos(a) * (8 + half * 0.4));
          petal.rotation.order = 'YXZ';
          petal.rotation.y = a;
          petal.rotation.x = 0.45;
          petal.scale.set(6.5, half, 2.4);
        }
      } else if (l.kind === 'helix') { // the Helix Bridge: a walkway over the water inside a double helix of steel (in lights, at night)
        const L = l.r * 2, deckY = 6;
        put(new THREE.BoxGeometry(6, 0.8, L), lit(0xb9bec4, 0x30343a), 0, deckY, 0);
        for (const [phase, glow] of [[0, 0x9fe8ff], [Math.PI, 0xff6fd0]]) {
          const curve = [];
          for (let k = 0; k <= 240; k++) {
            const zz = -L / 2 + L * k / 240, a = zz / 9 + phase;
            curve.push(new THREE.Vector3(Math.cos(a) * 4.5, deckY + 3.6 + Math.sin(a) * 4.5, zz));
          }
          put(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curve), 480, 0.35, 6), night ? glowMat(glow) : lit(0xdfe6ec, 0), 0, 0, 0);
        }
        for (const zz of [-L / 2 + 20, -L / 6, L / 6, L / 2 - 20]) put(new THREE.CylinderGeometry(0.9, 0.9, deckY, 8), lit(0x9aa0a6, 0x202428), 0, deckY / 2, zz);
      } else if (l.kind === 'float') { // The Float @ Marina Bay: a great steel platform on the water, its grandstand stepped up on the shore
        put(new THREE.BoxGeometry(110, 1.2, 80), lit(0x8d949b, 0x2a2e33), 0, 0.6, 0);
        put(new THREE.BoxGeometry(96, 0.1, 66), lit(0x3d7f5a, 0x0f2a1a), 0, 1.25, 0); // (its pitch)
        for (let k = 0; k < 9; k++) {
          put(new THREE.BoxGeometry(116, 1.3, 3), lit(k % 2 ? 0xd94a3a : 0xe8e8e8, k % 2 ? 0x5a1a10 : 0x5a5a5a), 0, 1.3 + k * 1.3, -44 - k * 2.8);
        }
        put(new THREE.BoxGeometry(120, 0.6, 30), lit(0xf2f2f2, 0x6a6a6a), 0, 17, -56); // (the stand's roof)
      } else if (l.kind === 'cbd' || l.kind === 'suntec') {
        // Raffles Place and the Financial Centre: the city's tallest towers, packed together (some
        // octagonal, as UOB Plaza is); or Suntec City: five towers round a ring, the Fountain of
        // Wealth in the middle, a bronze ring on four legs. Lit windows at night
        let seed = l.kind === 'cbd' ? 11 : 23;
        const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        const tones = [0x5f7d99, 0x8aa1b5, 0x3f566e, 0xa9b8c4, 0x6d7f8c], windows = [];
        const tower = (x, z, w, d, ht, turn, octagonal, color) => {
          // (at night, a dark silhouette that shows through the haze, as its windows do)
          const t = put(octagonal ? new THREE.CylinderGeometry(w / 2, w / 2, ht, 8) : new THREE.BoxGeometry(w, ht, d), night ? new THREE.MeshBasicMaterial({ color: 0x1b2638, fog: false }) : lit(color, 0), x, ht / 2, z);
          t.rotation.y = turn;
          for (let y = 6; y < ht - 4; y += 7) windows.push([x, y, z, w + 0.3, d + 0.3, turn]);
          return t;
        };
        if (l.kind === 'cbd') {
          for (let k = 0; k < 26; k++) {
            const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * l.r * 0.85;
            tower(Math.sin(a) * d, Math.cos(a) * d, 22 + rand() * 18, 22 + rand() * 18, 110 + rand() * 170, rand() * 0.6, rand() < 0.2, tones[k % tones.length]);
          }
        } else {
          for (let k = 0; k < 5; k++) {
            const a = k / 5 * Math.PI * 2 + 0.3, ht = k === 4 ? 75 : 175;
            tower(Math.sin(a) * 62, Math.cos(a) * 62, 32, 30, ht, a, false, 0x7f9cb3);
            const cap = put(new THREE.ConeGeometry(22, 12, 4), lit(0x5f7d99, 0x101820), Math.sin(a) * 62, ht + 6, Math.cos(a) * 62);
            cap.rotation.y = a + Math.PI / 4;
          }
          const bronze = lit(0xb08d57, 0x4a3a1a);
          const ring = put(new THREE.TorusGeometry(11, 1.3, 8, 40), bronze, 0, 13, 0);
          ring.rotation.x = Math.PI / 2;
          for (let k = 0; k < 4; k++) {
            const a = k / 4 * Math.PI * 2, leg = put(new THREE.CylinderGeometry(0.9, 1.4, 14, 8), bronze, Math.sin(a) * 9, 6.5, Math.cos(a) * 9);
            leg.rotation.order = 'YXZ';
            leg.rotation.y = a;
            leg.rotation.x = -0.2;
          }
          put(new THREE.CylinderGeometry(0.6, 1.6, 14, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xcfefff, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }), 0, 7, 0);
        }
        if (night && windows.length) { // (rows of lit windows, one draw for them all)
          const lights = new THREE.InstancedMesh(cube, glowMat(0xffe2a0), windows.length), d = new THREE.Object3D();
          lights.material.fog = false; // (city lights carry far through the haze: the skyline shows from the circuit)
          windows.forEach(([x, y, z, w, dd, turn], i) => {
            d.position.set(x, y, z);
            d.rotation.set(0, turn, 0);
            d.scale.set(w, 1.4, dd);
            d.updateMatrix();
            lights.setMatrixAt(i, d.matrix);
          });
          g.add(lights);
        }
      } else if (l.kind === 'gallery') { // the National Gallery: City Hall's colonnade, and the old Supreme Court with its green dome
        const stone = lit(0xe9e2d0, 0x5a5444);
        put(new THREE.BoxGeometry(110, 24, 40), stone, -35, 12, -20);
        for (let k = -9; k <= 9; k++) put(new THREE.CylinderGeometry(1.3, 1.3, 18, 10), stone, -35 + k * 5.6, 11, 2);
        put(new THREE.BoxGeometry(112, 3, 6), stone, -35, 21.5, 2);
        put(new THREE.BoxGeometry(70, 22, 50), stone, 58, 11, -25);
        for (let k = -4; k <= 4; k++) put(new THREE.CylinderGeometry(1.2, 1.2, 15, 10), stone, 58 + k * 5.5, 8.5, 1);
        put(new THREE.CylinderGeometry(12, 12, 10, 20), stone, 58, 27, -25);
        put(new THREE.SphereGeometry(12, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), lit(0x6f9c8a, 0x1a3a30), 58, 32, -25);
      } else if (l.kind === 'domes') { // Gardens by the Bay's conservatories: the Flower Dome and the taller Cloud Forest, glass on steel ribs
        for (const [dx, dz, rx, ry, rz] of [[-45, 0, 55, 30, 40], [52, 10, 38, 44, 32]]) {
          const shell = new THREE.MeshLambertMaterial({ color: 0xbfe3ef, transparent: true, opacity: 0.5, emissive: night ? 0x2a5a6a : 0x000000, depthWrite: false });
          put(new THREE.SphereGeometry(1, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), lit(0x4f8a3c, 0x0a2a0a), dx, 0, dz).scale.set(rx * 0.7, ry * 0.55, rz * 0.7); // (the gardens inside)
          put(new THREE.SphereGeometry(1, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), shell, dx, 0, dz).scale.set(rx, ry, rz);
          put(new THREE.SphereGeometry(1, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: night ? 0x9fe8ff : 0x7d8790, wireframe: true, fog: !night }), dx, 0, dz).scale.set(rx * 1.01, ry * 1.01, rz * 1.01);
        }
      }
      levelGroup.add(g);
    }
    grandstands(night);
  } else if (theme.scenery === 'montreal') {
    // ---- montreal: Circuit Gilles-Villeneuve on Île Notre-Dame: the circuit's trackside (walls, catch
    // fences, kerbs), its grandstands and the pits, parkland all round, and each where it really is
    // (the level's "landmarks"): the St Lawrence round the island, the Olympic rowing basin, the
    // Casino, the Biosphère's dome, and the city's towers across the river with Mount Royal behind
    circuitTrackside(false);
    grandstands(false);
    const marks = LEVEL.landmarks || [], p = {};
    const roadHalf = Math.max(Track.hi(0), -Track.lo(0));
    const inMark = (l, x, z, margin) => { // (is that point on the landmark, or within margin of it?)
      const dx = x - l.x, dz = z - l.z;
      if (l.kind === 'basin') {
        const ux = Math.sin(l.rot), uz = Math.cos(l.rot);
        return Math.abs(dx * ux + dz * uz) < l.r + margin && Math.abs(dx * uz - dz * ux) < l.w + margin;
      }
      return Math.hypot(dx, dz) < l.r + margin;
    };
    const clearOf = (x, z, margin) => Track.mainDistance(x, z) > roadHalf + margin && !marks.some(l => inMark(l, x, z, margin));
    const water = new THREE.MeshLambertMaterial({ color: 0x2f6f8e });
    for (const l of marks) {
      const g = new THREE.Group();
      g.position.set(l.x, 0, l.z);
      g.rotation.y = l.rot || 0;
      const put = (geo, mat, x, y, z) => { const mesh = new THREE.Mesh(geo, mat); mesh.position.set(x, y, z); g.add(mesh); return mesh; };
      if (l.kind === 'river') { // the St Lawrence, round the island
        put(new THREE.CircleGeometry(l.r, 72).rotateX(-Math.PI / 2), water, 0, -0.02, 0);
      } else if (l.kind === 'basin') { // the Olympic rowing basin: a long, straight strip of water, its lanes buoyed
        put(new THREE.PlaneGeometry(l.w * 2, l.r * 2).rotateX(-Math.PI / 2), water, 0, -0.02, 0);
        for (let k = -2; k <= 2; k++) put(new THREE.BoxGeometry(0.4, 0.1, l.r * 2 - 40), new THREE.MeshBasicMaterial({ color: 0xf2f2f2 }), k * l.w * 0.3, 0.02, 0);
        put(new THREE.BoxGeometry(14, 16, 10), new THREE.MeshLambertMaterial({ color: 0xe6e8ea }), l.w + 12, 8, -l.r + 30); // the finish tower
      } else if (l.kind === 'casino') { // the Casino (once France's pavilion at Expo 67): white tiers, glass between, gold fins
        const white = new THREE.MeshLambertMaterial({ color: 0xf0f0ec }), glass = new THREE.MeshLambertMaterial({ color: 0x5f86a3 });
        const gold = new THREE.MeshLambertMaterial({ color: 0xd9b45a });
        put(new THREE.BoxGeometry(90, 10, 56), white, 0, 5, 0);
        put(new THREE.BoxGeometry(78, 14, 46), glass, 0, 17, 0);
        put(new THREE.BoxGeometry(66, 6, 40), white, 0, 27, 0);
        put(new THREE.BoxGeometry(48, 10, 30), glass, 0, 35, 0);
        for (let k = -3; k <= 3; k++) {
          const fin = put(new THREE.BoxGeometry(1.4, 36, 3), gold, k * 13, 18, 29);
          fin.rotation.z = 0.25 * Math.sign(k);
        }
      } else if (l.kind === 'biosphere') { // the Biosphère: Buckminster Fuller's geodesic dome, a lattice round a glassy sphere
        put(new THREE.IcosahedronGeometry(l.r, 3), new THREE.MeshBasicMaterial({ color: 0xdfe5ea, wireframe: true }), 0, l.r * 0.55, 0);
        put(new THREE.SphereGeometry(l.r * 0.97, 32, 20), new THREE.MeshLambertMaterial({ color: 0x9fb8cc, transparent: true, opacity: 0.45 }), 0, l.r * 0.55, 0);
      } else if (l.kind === 'skyline') { // the city across the river: towers along its waterfront, Mount Royal behind
        let seed = 7;
        const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        const tones = [0x7d8a99, 0x9aa6b3, 0x5d6b7c, 0xb9c2cc, 0x4f5966].map(c => new THREE.MeshLambertMaterial({ color: c }));
        for (let k = 0; k < 34; k++) {
          const h = 40 + Math.pow(rand(), 1.6) * 170, w = 18 + rand() * 22;
          put(new THREE.BoxGeometry(w, h, w * (0.7 + rand() * 0.6)), tones[k % tones.length], (rand() - 0.5) * l.r * 2, h / 2, -rand() * 160);
        }
        const hill = put(new THREE.SphereGeometry(700, 32, 16), new THREE.MeshLambertMaterial({ color: 0x4f7d43 }), 0, -40, -900);
        hill.scale.y = 0.32;
      }
      levelGroup.add(g);
    }
    // the parkland: broadleaf trees all over the island, in clumps of every shade of green (none on
    // the straight either side of the start line, where the stands and the pits are)
    const straight = (q) => Math.abs(Track.bend(q)) < 0.002;
    let straightTo = 0, straightFrom = Track.length;
    while (straightTo < Track.length && straight(straightTo)) straightTo += 2;
    while (straightFrom > 0 && straight(straightFrom - 1)) straightFrom -= 2;
    const trunks = [], greens = [[], [], []];
    for (let s = Track.start; s < Track.end; s += 9) {
      if (s < straightTo + 40 || s > straightFrom - 40) continue;
      for (const side of [-1, 1]) {
        for (let k = 0; k < 3; k++) {
          const lat = beside(side, s, 9 + Math.random() * 70 + k * 25), at = s + Math.random() * 8;
          Track.toWorld(at, lat, p);
          if (!clearOf(p.x, p.z, 6)) continue;
          const size = 5 + Math.random() * 5;
          trunks.push([at, lat, 1.6, 0.6, 3.2, 0.6]);
          greens[Math.floor(Math.random() * 3)].push([at, lat, 3.2 + size * 0.45, size, size * 0.9, size]);
        }
      }
    }
    instances(tube, 0x5a4330, trunks);
    const leaf = new THREE.IcosahedronGeometry(0.5, 1);
    [0x3f7f36, 0x4f8f3f, 0x6a9a44].forEach((color, i) => instances(leaf, color, greens[i]));
  } else if (theme.scenery === 'zones') {
    buildZones(beside, instances, add, flat, { cube, tube, cone });
  } else if (theme.scenery === 'construction') {
    // ---- construction: orange barrier fencing along both sides, and beyond it the site: tower
    // cranes, the steel frames of buildings going up, site huts, heaps of gravel, stacks of pipes,
    // floodlights on masts
    const kinds = { fence: [], post: [], mast: [], lamp: [], frame: [], floor: [], hut: [], gravel: [], pipe: [], craneMast: [], jib: [], counter: [],
      jersey: [], waterRed: [], waterWhite: [], skip: [], pallet: [], brick: [], rebar: [], timber: [], spool: [], hivis: [], skin: [], hat: [],
      beacon: [], bags: [], scaffold: [], plank: [], genset: [], dirt: [], drum: [], mixer: [] };
    const sphereGeo = new THREE.SphereGeometry(0.5, 10, 8);
    for (let s = Track.start; s < Track.end; s += 2.5) {
      for (const side of [-1, 1]) {
        kinds.fence.push([s + 1.25, beside(side, s, 1.5), 0.6, 0.05, 1.1, 2.5]);
        kinds.post.push([s, beside(side, s, 1.5), 0.6, 0.12, 1.2, 0.12]);
      }
    }
    for (let s = 60; s < Track.end; s += 120) {
      for (const side of [-1, 1]) {
        const lat = beside(side, s + side * 30, 6);
        kinds.mast.push([s + side * 30, lat, 6, 0.3, 12, 0.3]);
        kinds.lamp.push([s + side * 30, lat, 12.2, 1.6, 0.6, 0.8]);
      }
    }
    for (let s = 40; s < Track.end; s += 90 + Math.random() * 70) {
      const side = Math.random() < 0.5 ? -1 : 1, d = 25 + Math.random() * 40, lat = beside(side, s, d), r = Math.random();
      if (r < 0.35) { // a steel frame going up: columns and floor beams, a few storeys
        const floors = 3 + Math.floor(Math.random() * 5), w = 18, dd = 14;
        for (const [x, z] of [[-w / 2, -dd / 2], [w / 2, -dd / 2], [-w / 2, dd / 2], [w / 2, dd / 2], [0, -dd / 2], [0, dd / 2]]) {
          kinds.frame.push([s + x, lat + z, floors * 1.75, 0.35, floors * 3.5, 0.35]);
        }
        for (let f = 1; f <= floors; f++) {
          kinds.frame.push([s, lat - dd / 2, f * 3.5, 0.3, 0.35, w], [s, lat + dd / 2, f * 3.5, 0.3, 0.35, w]);
          if (f < floors - 1) kinds.floor.push([s, lat, f * 3.5 - 0.2, dd, 0.25, w]);
        }
      } else if (r < 0.55) { // a tower crane, its jib out over the site
        const h = 30 + Math.random() * 15;
        kinds.craneMast.push([s, lat, h / 2, 1.4, h, 1.4]);
        kinds.jib.push([s, lat, h + 0.6, 0.9, 1.2, 40]);
        kinds.counter.push([s - 12, lat, h - 0.6, 2.4, 2.4, 3]);
      } else if (r < 0.75) { // site huts, stacked
        kinds.hut.push([s, lat, 1.3, 2.6, 2.6, 7], [s + 8, lat, 1.3, 2.6, 2.6, 7], [s + 4, lat, 3.9, 2.6, 2.6, 7]);
      } else if (r < 0.9) { // heaps of gravel
        for (let k = 0; k < 3; k++) kinds.gravel.push([s + k * 7, lat + Math.random() * 4, 1.6, 6, 3.2, 6]);
      } else { // concrete manhole rings, stacked
        for (let k = 0; k < 4; k++) for (let y = 0; y < 1 + (k % 2); y++) kinds.pipe.push([s + k * 2.4, lat, 0.75 + y * 1.5, 2, 1.5, 2]);
      }
    }
    // right by the road, between the fence and the site: the clutter of the job, close enough to
    // read at speed. (Every so often a line of barriers along the fence; and beacons on its posts.)
    for (let s = Track.start + 10; s < Track.end; s += 5 + Math.random() * 6) {
      for (const side of [-1, 1]) {
        if (Math.random() < 0.15) continue;
        const d = 3 + Math.random() * 14, at = s + Math.random() * 4, lat = beside(side, at, d), r = Math.random();
        if (r < 0.1) { // a skip, piled with rubble
          kinds.skip.push([at, lat, 0.75, 2, 1.5, 4]);
          kinds.dirt.push([at, lat, 1.6, 1.6, 0.8, 3]);
        } else if (r < 0.2) { // pallets of bricks
          for (let k = 0; k < 2; k++) {
            kinds.pallet.push([at + k * 1.4, lat, 0.08, 1.2, 0.16, 1.2]);
            kinds.brick.push([at + k * 1.4, lat, 0.6, 1.1, 0.9, 1.1]);
          }
        } else if (r < 0.28) { // a bundle of rebar
          for (let k = 0; k < 6; k++) kinds.rebar.push([at, lat + (k % 3) * 0.12, 0.08 + Math.floor(k / 3) * 0.12, 0.08, 0.08, 6]);
        } else if (r < 0.36) { // a stack of timber
          for (let y = 0; y < 4; y++) kinds.timber.push([at, lat, 0.12 + y * 0.22, 1.3, 0.2, 4.8]);
        } else if (r < 0.43) { // cable drums
          kinds.spool.push([at, lat, 0.7, 1.6, 1.4, 1.6], [at + 2, lat + 0.4, 0.5, 1.2, 1.0, 1.2]);
        } else if (r < 0.55) { // workers in hi-vis and hard hats, standing about
          for (let k = 0; k < 1 + Math.floor(Math.random() * 3); k++) {
            const wl = lat + k * 0.9, ws = at + Math.random() * 2;
            kinds.hivis.push([ws, wl, 1.05, 0.5, 1.1, 0.35]);
            kinds.drum.push([ws, wl, 0.4, 0.22, 0.8, 0.22]);           // (legs, in dark trousers)
            kinds.skin.push([ws, wl, 1.78, 0.3, 0.32, 0.3]);
            kinds.hat.push([ws, wl, 2.0, 0.38, 0.14, 0.38]);
          }
        } else if (r < 0.63) { // sandbags
          for (let k = 0; k < 5; k++) kinds.bags.push([at + k * 0.7, lat, 0.15 + (k % 2) * 0.25, 0.6, 0.3, 0.65]);
        } else if (r < 0.7) { // a generator
          kinds.genset.push([at, lat, 0.7, 1.4, 1.4, 2.6]);
        } else if (r < 0.78) { // scaffolding, two storeys, boards across
          for (const [x, z] of [[-1, -2], [1, -2], [-1, 2], [1, 2]]) kinds.scaffold.push([at + z, lat + x, 3, 0.1, 6, 0.1]);
          for (const y of [3, 6]) kinds.plank.push([at, lat, y, 2.2, 0.08, 4.4]);
        } else if (r < 0.85) { // a cement mixer
          kinds.genset.push([at, lat, 0.5, 1.0, 1.0, 1.2]);
          kinds.mixer.push([at, lat, 1.4, 1.1, 1.1, 1.1]);
        } else { // a heap of spoil
          kinds.dirt.push([at, lat, 0.9, 4, 1.8, 5]);
        }
      }
    }
    for (let s = Track.start + 30; s < Track.end; s += 160 + Math.random() * 120) { // lines of barriers along the fence
      const side = Math.random() < 0.5 ? -1 : 1, water = Math.random() < 0.5;
      for (let k = 0; k < 12; k++) {
        const at = s + k * 2.1, lat = beside(side, at, 0.6);
        if (water) (k % 2 ? kinds.waterWhite : kinds.waterRed).push([at, lat, 0.5, 0.5, 1.0, 2]);
        else kinds.jersey.push([at, lat, 0.4, 0.6, 0.8, 2]);
      }
    }
    for (let s = Track.start; s < Track.end; s += 25) for (const side of [-1, 1]) kinds.beacon.push([s, beside(side, s, 1.5), 1.35, 0.18, 0.18, 0.18]);
    const colours = { fence: 0xff7a1a, post: 0xd8d8d8, mast: 0x8a8f96, lamp: 0xfff4c8, frame: 0xb04a2a, floor: 0x9a9a96, hut: 0xe8e2d4,
      jersey: 0xb9b6ae, waterRed: 0xd8342a, waterWhite: 0xf2f2f2, skip: 0xf2b51c, pallet: 0x9a7a4e, brick: 0xa8503a, rebar: 0x7a4a2c,
      timber: 0xd4b07a, spool: 0x8a6a45, hivis: 0xff8a1a, skin: 0xe0b48c, hat: 0xf6e12a, beacon: 0xffa21a, bags: 0xb8a77a,
      scaffold: 0x9aa3ab, plank: 0xb8925a, genset: 0x3f7d3a, dirt: 0x7a6248, drum: 0x2c3440, mixer: 0xe86a1e,
      gravel: 0x9c968a, pipe: 0xb5b0a6, craneMast: 0xf2c21a, jib: 0xf2c21a, counter: 0x8a8f96 };
    for (const [name, list] of Object.entries(kinds)) {
      instances(name === 'gravel' || name === 'dirt' ? cone : name === 'pipe' || name === 'spool' ? tube : name === 'mixer' || name === 'skin' ? sphereGeo : cube,
        colours[name], list, name === 'lamp' || name === 'beacon' || name === 'hivis');
    }
    // "ROAD WORK" signs, yellow diamonds on posts beside the road, every so often, facing the player
    for (let s = 40; s < Track.end; s += 260) {
      const side = (s / 260) % 2 < 1 ? 1 : -1, h = Track.toWorld(s, beside(side, s, 1.2), tmp);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.4, 0.1), new THREE.MeshLambertMaterial({ color: 0x9a9da3 }));
      post.position.set(tmp.x, tmp.y + 1.2, tmp.z);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), new THREE.MeshBasicMaterial({ map: roadWorkSign(), transparent: true, side: THREE.DoubleSide }));
      sign.position.set(tmp.x, tmp.y + 3.0, tmp.z);
      sign.rotation.y = h + Math.PI;
      sign.userData.text = true;
      if (Track.mirrored) sign.scale.x = -1;
      levelGroup.add(post, sign);
    }
  } else if (theme.scenery === 'airport') {
    // ---- airport: the perimeter road past the terminal, through the fence onto the runway --------
    // Before the turn: a fence along both sides; buildings close by on both sides (offices, cargo
    // sheds), the terminal further out on the right, the apron on the left with hangars and fuel
    // tanks out beyond it. The runway (LEVEL.runway): wide concrete with a runway's markings in
    // place of lanes (see inJunction), edge lights, and hangars and terminal piers beyond its edges.
    // Nothing on the old road carrying straight on where the route turns off, nor by the buildings
    // that blow up (both: see render/wreckage.js), nor where the parked airliners stand.
    const T = LEVEL.tower, R = LEVEL.runway, turn = T ? T.at : Infinity, runway = R ? R.from : Infinity, RW = R ? R.width : 0;
    const stubFrom = {}, h = T ? Track.toWorld(T.at, 0, stubFrom) : 0;
    const offStub = (s, lat) => { // (clear of the old road and the fallen tower)
      if (!T) return true;
      Track.toWorld(s, lat, tmp);
      const dx = tmp.x - stubFrom.x, dz = tmp.z - stubFrom.z, along = dx * Math.sin(h) + dz * Math.cos(h);
      const side = -(dx * Math.cos(h) - dz * Math.sin(h)); // (to the right of it)
      return along < -10 || along > T.stub + 10 || side < -100 || side > 50;
    };
    const blasts = (LEVEL.wreckage || []).filter(e => e.kind === 'blast');
    const free = (s, side, d) => !blasts.some(e => (e.from === 'left' ? -1 : 1) === side && Math.abs(e.at - s) < 45) &&
      !(side < 0 && s < turn && (LEVEL.parkedPlanes || []).some(p => Math.abs(p.s - s) < 50)) && offStub(s, beside(side, s, d));
    const kinds = { post: [], rail: [], terminal: [], glass: [], bridge: [], hangar: [], roof: [], tank: [], light: [], apron: [],
      office: [], windows: [], shed: [], door: [], pier: [] };
    for (let s = Track.start; s < Math.min(turn, Track.end); s += 4) {
      for (const side of [-1, 1]) {
        const lat = beside(side, s, 2);
        kinds.post.push([s, lat, 1.2, 0.12, 2.4, 0.12]);
        kinds.rail.push([s + 2, lat, 2.3, 0.05, 0.05, 4]);
        kinds.rail.push([s + 2, lat, 1.2, 0.05, 0.05, 4]);
      }
    }
    for (let s = 60; s < turn - 60; s += 140) { // the terminal, in sections, with a jet bridge each
      if (!offStub(s, Track.hi(s) + 60)) continue;
      const lat = beside(1, s, 75);
      kinds.terminal.push([s, lat, 7, 30, 14, 120]);
      kinds.glass.push([s, lat, 8, 30.4, 6, 118]);
      kinds.bridge.push([s, beside(1, s, 52), 4, 16, 3, 3]);
    }
    for (let s = 200; s < turn - 100; s += 380) { // hangars and fuel tanks, out beyond the apron
      const lat = beside(-1, s, 140 + Math.random() * 40);
      kinds.hangar.push([s, lat, 10, 60, 20, 50]);
      kinds.roof.push([s, lat, 21, 62, 3, 52]);
      for (let k = 0; k < 3; k++) kinds.tank.push([s + 120 + k * 22, beside(-1, s, 70), 6, 16, 12, 16]);
    }
    kinds.apron.push([Math.min(turn, Track.end) / 2, beside(-1, turn / 2, 45), -0.02, 80, 0.04, Math.min(turn, Track.end)]);
    // buildings close by along both sides, all the way: offices with bands of windows, and cargo
    // sheds with roller doors; along the runway, out beyond its concrete, hangars and terminal piers
    for (let s = 30; s < Track.end - 30; s += 55 + Math.random() * 35) {
      for (const side of [-1, 1]) {
        if (s > turn - 80 && s < runway + 40) continue; // (the turn onto the runway: open ground)
        const onRunway = s >= runway, d0 = onRunway ? RW + 18 : 14 + Math.random() * 8;
        if (!free(s, side, d0 + 10)) continue;
        const r = Math.random();
        if (onRunway && r < 0.4) { // a hangar, its doors to the runway
          const d = d0 + 25, lat = beside(side, s, d);
          kinds.hangar.push([s, lat, 9, 50, 18, 45]);
          kinds.roof.push([s, lat, 19, 52, 2.5, 47]);
        } else if (onRunway && r < 0.6) { // a terminal pier, glass-fronted
          const lat = beside(side, s, d0 + 12);
          kinds.pier.push([s, lat, 5, 20, 10, 45]);
          kinds.glass.push([s, lat, 6, 20.4, 4, 44]);
        } else if (r < 0.55) { // an office block
          const w = 18 + Math.random() * 18, dd = 12 + Math.random() * 8, ht = 10 + Math.random() * 16, lat = beside(side, s, d0 + dd / 2);
          kinds.office.push([s, lat, ht / 2, dd, ht, w]);
          for (let y = 3; y < ht - 1.5; y += 3.5) kinds.windows.push([s, lat, y, dd + 0.2, 1.4, w + 0.2]);
        } else { // a cargo shed
          const w = 30 + Math.random() * 20, dd = 18, lat = beside(side, s, d0 + dd / 2);
          kinds.shed.push([s, lat, 4.5, dd, 9, w]);
          for (let k = -1; k <= 1; k++) kinds.door.push([s + k * w * 0.28, beside(side, s, d0 - 0.1), 3, 0.2, 6, 6]);
        }
      }
    }
    if (R) {
      // the runway: one sweep of concrete over the road and well out either side, with a runway's
      // markings in place of lanes: edge lines, the threshold's stripes and its number, touchdown
      // zone bars and the aiming point, and dashes down the centre line; lights along its edges
      const lo = (q) => Track.lo(q) - RW, hi = (q) => Track.hi(q) + RW, mid = (q) => (Track.lo(q) + Track.hi(q)) / 2;
      const concrete = flat(0x6c6f73);
      concrete.polygonOffset = true;
      concrete.polygonOffsetFactor = -1;
      concrete.polygonOffsetUnits = -1;
      add(buildStrip(runway - 20, Track.end, lo, hi, 0.004, 8), concrete);
      const paint = (from, to, lat, width) => add(buildStrip(from, to, (q) => mid(q) + lat - width / 2, (q) => mid(q) + lat + width / 2, 0.02, 4), lineMat);
      for (const side of [-1, 1]) {
        const edge = (q) => side < 0 ? lo(q) + 1.5 : hi(q) - 1.5;
        add(buildStrip(runway, Track.end, (q) => edge(q) - 0.45, (q) => edge(q) + 0.45, 0.02, 8), lineMat);
        for (let q = runway; q < Track.end; q += 30) kinds.light.push([q, beside(side, q, RW - 0.5), 0.3, 0.4, 0.4, 0.4]);
        for (let j = 0; j < 6; j++) paint(runway + 10, runway + 40, side * (2.7 + j * 3.6), 1.8);          // the threshold
        for (const [at, bars] of [[150, 3], [450, 2], [600, 1]]) {                                      // touchdown zone
          for (let k = 0; k < bars; k++) paint(runway + at, runway + at + 22, side * (5 + k * 3), 1.8);
        }
        paint(runway + 300, runway + 345, side * 9, 7);                                                 // aiming point
      }
      for (let q = runway + 110; q < Track.end - 30; q += 50) paint(q, q + 30, 0, 0.9);                 // centre line
      // the runway's number, "27", read from the threshold
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 512;
      const g = canvas.getContext('2d');
      g.fillStyle = '#f2f2f2';
      g.font = 'bold 400px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('27', 256, 270);
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      const number = new THREE.Mesh(new THREE.PlaneGeometry(18, 18).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
      const nh = Track.toWorld(runway + 62, mid(runway + 62), tmp);
      number.position.set(tmp.x, tmp.y + 0.03, tmp.z);
      number.rotation.y = nh + Math.PI; // (its top furthest away, as a pilot coming in reads it)
      levelGroup.add(number);
    }
    const colours = { post: 0x8a8f96, rail: 0x9aa0a6, terminal: 0xcfd3d6, glass: 0x35576a, bridge: 0xa9aeb3, hangar: 0x9ba3a8,
      roof: 0x6f777d, tank: 0xe4e2dc, light: 0xffe08a, apron: 0x8d9196, office: 0xb9b2a6, windows: 0x2f3e4a, shed: 0x8e9aa4,
      door: 0x5d6770, pier: 0xd8dcdf };
    for (const [name, list] of Object.entries(kinds)) {
      instances(name === 'tank' ? tube : cube, colours[name], list.filter(([q, lat]) => offStub(q, lat)), name === 'light');
    }
  } else if (theme.scenery === 'bathurst') {
    // ---- bathurst: Mount Panorama: the circuit's trackside (walls, catch fences, kerbs), the pits and
    // grandstands, and gum trees standing on the hill all round (never on the road). As an everyday road
    // (theme.roadside: Panorama Avenue), white guide posts along both edges instead, the bush thicker, and
    // sandstone rocks in the grass
    const trunks = [], clumps = [], rocks = [], p = {}, spot = new THREE.Object3D();
    if (theme.roadside) {
      const posts = [], reflectors = [];
      for (let s = Track.start; s < Track.end; s += 25) for (const side of [-1, 1]) {
        posts.push([s, beside(side, s, 0.6), 0.55, 0.14, 1.1, 0.14]);
        reflectors.push([s, beside(side, s, 0.6), 0.95, 0.15, 0.12, 0.15]);
      }
      instances(cube, 0xf2f2ee, posts);
      instances(cube, 0xd8261b, reflectors, true);
    } else {
      circuitTrackside(false);
      grandstands(false);
    }
    const roadHalf = Math.max(Track.hi(0), -Track.lo(0));
    for (let s = Track.start; s < Track.end; s += theme.roadside ? 5 : 7) {
      for (const side of [-1, 1]) {
        if (Math.random() < 0.3) continue;
        const d = (theme.roadside ? 6 : 9) + Math.random() * 70;
        Track.toWorld(s + Math.random() * 6, beside(side, s, d), p);
        if (Track.mainDistance(p.x, p.z) < roadHalf + (theme.roadside ? 4 : 7)) continue;
        const y = terrainAt(p.x, p.z), h = 9 + Math.random() * 9;
        if (theme.roadside && Math.random() < 0.12) { // (a sandstone rock, half sunk in the grass)
          const w = 1.5 + Math.random() * 3;
          rocks.push([p.x, y + w * 0.15, p.z, w, w * 0.55, w * (0.8 + Math.random() * 0.6)]);
          continue;
        }
        trunks.push([p.x, y + h * 0.3, p.z, 0.5, h * 0.6, 0.5]); // (pale, and bare a long way up)
        for (let k = 0; k < 3; k++) {
          const w = 3 + Math.random() * 3;
          clumps.push([p.x + Math.random() * 3 - 1.5, y + h * (0.62 + k * 0.14), p.z + Math.random() * 3 - 1.5, w, w * 0.6, w]);
        }
      }
    }
    const placed = (geometry, color, list) => { // (like instances(), but at world points, not road ones)
      const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshLambertMaterial({ color }), list.length);
      list.forEach(([x, y, z, sx, sy, sz], i) => {
        spot.position.set(x, y, z);
        spot.scale.set(sx, sy, sz);
        spot.updateMatrix();
        mesh.setMatrixAt(i, spot.matrix);
      });
      levelGroup.add(mesh);
    };
    placed(tube, 0xd9cfbf, trunks);
    placed(new THREE.SphereGeometry(0.5, 8, 6), 0x7a8f62, clumps);
    if (rocks.length) placed(new THREE.DodecahedronGeometry(0.6), 0xb8915c, rocks);
  } else if (theme.scenery === 'alpine') {
    // ---- alpine: guardrails and snowbanks along both edges, snowy pines on the mountainside,
    // peaks all round in the haze, and snow falling
    const posts = [], rails = [], banks = [];
    for (let s = Track.start; s < Track.end; s += 4) {
      for (const side of [-1, 1]) {
        posts.push([s, beside(side, s, 0.5), 0.4, 0.12, 0.8, 0.12]);
        rails.push([s + 2, beside(side, s + 2, 0.45), 0.65, 0.08, 0.3, 4.05]);
        if (Math.random() < 0.6) banks.push([s + Math.random() * 4, beside(side, s, -0.1), 0.1, 1.2 + Math.random(), 0.7, 2 + Math.random() * 2]);
      }
    }
    instances(cube, 0x5a5f66, posts);
    instances(cube, 0xb9bec5, rails);
    instances(new THREE.SphereGeometry(0.5, 8, 6), 0xffffff, banks);
    // pines: dark green tiers dusted with snow, standing on the land itself, never on another stretch of road
    const trunks = [], tiers = [], caps = [], spot = new THREE.Object3D(), p = {};
    for (let s = Track.start; s < Track.end; s += 9) {
      for (const side of [-1, 1]) {
        if (Math.random() < 0.35) continue;
        const d = 10 + Math.random() * 45;
        Track.toWorld(s + Math.random() * 6, beside(side, s, d), p);
        if (Track.mainDistance(p.x, p.z) < Math.max(Track.hi(s), -Track.lo(s)) + 4) continue;
        const y = terrainAt(p.x, p.z), h = 6 + Math.random() * 6;
        trunks.push([p.x, y + h * 0.1, p.z, 0.5, h * 0.2, 0.5]);
        for (let k = 0; k < 3; k++) {
          const w = h * (0.55 - k * 0.13);
          tiers.push([p.x, y + h * (0.35 + k * 0.22), p.z, w, h * 0.4, w]);
          caps.push([p.x, y + h * (0.47 + k * 0.22), p.z, w * 0.6, h * 0.18, w * 0.6]);
        }
      }
    }
    const placed = (geometry, color, list) => { // (like instances(), but at world points, not road ones)
      const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshLambertMaterial({ color }), list.length);
      list.forEach(([x, y, z, sx, sy, sz], i) => {
        spot.position.set(x, y, z);
        spot.scale.set(sx, sy, sz);
        spot.updateMatrix();
        mesh.setMatrixAt(i, spot.matrix);
      });
      levelGroup.add(mesh);
    };
    placed(tube, 0x4a3426, trunks);
    placed(cone, 0x2f5a3c, tiers);
    placed(cone, 0xf6f8fa, caps);
    // peaks all round, out in the haze: rock with snow on top
    const middle = {};
    Track.toWorld(Track.length / 2, 0, middle);
    const rock = new THREE.MeshLambertMaterial({ color: 0x7d838c }), white = new THREE.MeshLambertMaterial({ color: 0xffffff });
    for (let k = 0; k < 16; k++) {
      const a = k / 16 * Math.PI * 2 + Math.random() * 0.2, far = 700 + Math.random() * 250;
      const r = 180 + Math.random() * 140, h = 260 + Math.random() * 220;
      const peak = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), rock);
      peak.position.set(middle.x + Math.sin(a) * far, h / 2 - 20, middle.z + Math.cos(a) * far);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.42, h * 0.42, 7), white);
      cap.position.set(peak.position.x, h - 20 - h * 0.21 + 1, peak.position.z);
      peak.material.fog = cap.material.fog = true;
      levelGroup.add(peak, cap);
    }
    // snow falling: two layers of flakes in a box round the camera, drifting down, one above
    // the other, each starting again at the top as it reaches the bottom
    const BOX = 70, flakes = [];
    for (let i = 0; i < 1400; i++) flakes.push((Math.random() - 0.5) * BOX * 2, Math.random() * BOX, (Math.random() - 0.5) * BOX * 2);
    const flakeGeo = new THREE.BufferGeometry();
    flakeGeo.setAttribute('position', new THREE.Float32BufferAttribute(flakes, 3));
    const flakeMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.18, transparent: true, opacity: 0.85, depthWrite: false });
    for (const layer of [0, 1]) {
      const snow = new THREE.Points(flakeGeo, flakeMat);
      snow.frustumCulled = false;
      snow.onBeforeRender = (renderer, scene, camera) => {
        const fall = (performance.now() / 1000 * 2.5 + layer * BOX) % (BOX * 2);
        const x = scene.scale.x < 0 ? -camera.position.x : camera.position.x; // (in the scene's own terms)
        snow.position.set(x + Math.sin(performance.now() / 3000) * 2, camera.position.y + BOX - fall, camera.position.z);
        snow.updateMatrixWorld();
      };
      levelGroup.add(snow);
    }
  } else if (theme.scenery === 'battlefield') {
    // ---- battlefield: craters, sandbags, tank traps, barbed wire and shattered trees ------------------
    const craters = [], rims = [], bags = [], traps = [], posts = [], stumps = [], wrecks = [];
    for (let s = Track.start; s < Track.end; s += 9) {
      for (const side of [-1, 1]) {
        const at = s + Math.random() * 8, roll = Math.random();
        if (roll < 0.22) { // a shell crater: a dark pit inside a ring of thrown-up earth
          const r = 2 + Math.random() * 4, lat = beside(side, at, 6 + Math.random() * 70);
          rims.push([at, lat, 0.05, r * 2.6, 0.3, r * 2.6]);
          craters.push([at, lat, 0.12, r * 2, 0.3, r * 2]);
        } else if (roll < 0.3) { // a line of sandbags
          bags.push([at, beside(side, at, 3 + Math.random() * 14), 0.45, 1.2, 0.9, 6 + Math.random() * 6]);
        } else if (roll < 0.4) { // a tank trap: three steel beams crossed
          const lat = beside(side, at, 2 + Math.random() * 22);
          traps.push([at, lat, 0.7, 0.25, 1.4, 1.6], [at, lat, 0.7, 1.6, 1.4, 0.25], [at, lat, 0.7, 0.25, 0.25, 1.8]);
        } else if (roll < 0.5) { // a shattered tree
          const h = 2 + Math.random() * 5;
          stumps.push([at, beside(side, at, 8 + Math.random() * 60), h / 2, 0.5, h, 0.5]);
        } else if (roll < 0.53) { // a burnt-out wreck
          wrecks.push([at, beside(side, at, 10 + Math.random() * 50), 0.9, 3, 1.8, 6]);
        }
      }
    }
    // barbed wire on posts along both sides
    for (let s = Track.start; s < Track.end; s += 5) for (const side of [-1, 1]) posts.push([s, beside(side, s, 1.6), 0.55, 0.12, 1.1, 0.12]);
    for (const side of [-1, 1]) for (const y of [0.45, 0.85]) add(buildStrip(Track.start, Track.end, (q) => beside(side, q, 1.55), (q) => beside(side, q, 1.65), y), flat(0x6d6a63));
    instances(tube, 0x5a4e36, rims);
    instances(tube, 0x2e2618, craters);
    instances(cube, 0xb8a676, bags);
    instances(cube, 0x3c3a36, traps);
    instances(cube, 0x5a554c, posts);
    instances(tube, 0x2b231a, stumps);
    instances(cube, 0x2a2622, wrecks);
  } else if (theme.scenery === 'hell') {
    // ---- hell: rivers of lava, black spires of rock, and fires along the roadside ------------------
    const glow = (color) => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, depthWrite: false });
    for (const side of [-1, 1]) {
      for (let s = Track.start, k = side > 0 ? 0 : 1; s < Track.end; s += 170, k++) {
        const near = 12 + (k % 3) * 9, far = near + 30 + (k % 2) * 25, to = Math.min(Track.end, s + 120);
        // (a brighter core down the middle of each river, drawn after it)
        for (const [a, b, color, order] of [[near, far, 0xff4a12, -1], [near + 6, far - 8, 0xffb52e, -0.9]]) {
          const lava = new THREE.Mesh(buildStrip(s, to, (q) => beside(side, q, a), (q) => beside(side, q, b), -0.03, 8), glow(color));
          lava.renderOrder = order;
          levelGroup.add(lava);
        }
      }
    }
    const spires = [], flames = [], cores = [];
    for (let s = Track.start; s < Track.end; s += 12) {
      for (const side of [-1, 1]) {
        const at = s + Math.random() * 10, h = 5 + Math.pow(Math.random(), 2) * 34;
        spires.push([at, beside(side, at, 5 + h * 0.2 + Math.random() * 90), h / 2, h * 0.35, h, h * 0.35]);
        if (Math.random() < 0.3) {
          const f = 2 + Math.random() * 3, lat = beside(side, at, 2.5 + Math.random() * 4);
          flames.push([at, lat, f * 0.35, f * 0.5, f * 0.7, f * 0.5]);   // a wide base,
          cores.push([at, lat, f * 0.6, f * 0.2, f * 1.2, f * 0.2]);      // and a bright tongue rising out of it
        }
      }
    }
    instances(cone, 0x2a1512, spires);
    instances(cone, 0xff5a14, flames, true);
    instances(cone, 0xffd23f, cores, true);
  } else if (theme.scenery === 'sea') {
    // ---- the sea: a breakwater of rocks along each edge, half under the water, red and white marker
    // buoys along it, and rocky islands off in the distance --------------------------------------------
    const rock = new THREE.DodecahedronGeometry(0.5, 0), buoy = new THREE.CylinderGeometry(0.5, 0.5, 1, 10);
    const rocks = [], red = [], white = [], isles = [], tops = [];
    for (let s = Track.start; s < Track.end; s += 1.8) {
      for (const side of [-1, 1]) {
        const size = 1.2 + Math.random() * 1.8;
        rocks.push([s + Math.random(), beside(side, s, 0.4 + size * 0.4 + Math.random() * 0.8), size * 0.15, size, size * (0.5 + Math.random() * 0.5), size]);
      }
    }
    for (let s = Track.start, k = 0; s < Track.end; s += 14, k++) {
      for (const side of [-1, 1]) (k % 2 ? red : white).push([s, beside(side, s, 0.2), 0.45, 0.6, 1.1, 0.6]);
    }
    for (let s = Track.start; s < Track.end; s += 90) {
      for (const side of [-1, 1]) {
        if (Math.random() < 0.45) continue;
        const r = 12 + Math.random() * 30, at = s + Math.random() * 60, lat = beside(side, at, 60 + Math.random() * 220);
        isles.push([at, lat, r * 0.25, r * 2, r * 0.8, r * 1.6]);
        if (Math.random() < 0.6) tops.push([at, lat, r * 0.55, r * 0.9, r * 0.6, r * 0.8]);
      }
    }
    instances(rock, 0x6f6a64, rocks);
    instances(buoy, 0xd8262b, red);
    instances(buoy, 0xf2f2f2, white);
    instances(rock, 0x7a776f, isles);
    instances(rock, 0x5f8a4a, tops);
  } else if (theme.scenery === 'space') {
    // ---- space: stars all round, which travel with the camera so they never get nearer -----
    const points = [];
    for (let i = 0; i < 1800; i++) {
      const a = Math.random() * Math.PI * 2, y = Math.random() * 2 - 1, r = Math.sqrt(1 - y * y);
      points.push(Math.cos(a) * r * 600, y * 600, Math.sin(a) * r * 600);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    const stars = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xffffff, size: 2, sizeAttenuation: false, fog: false, depthWrite: false }));
    stars.frustumCulled = false;
    stars.renderOrder = -3;
    stars.onBeforeRender = (renderer, scene, camera) => {
      stars.position.copy(camera.position);
      if (scene.scale.x < 0) stars.position.x = -stars.position.x; // (in the scene's own terms)
      stars.updateMatrixWorld();
    };
    levelGroup.add(stars);
  }
};
Game.onLoad.push(buildRoad);
