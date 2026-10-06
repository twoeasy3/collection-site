import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { LEVEL } from '../levels.js';
import { Track } from '../track.js';
import { Game } from '../game.js';
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
const THEMES = {
  city: { sky: 0x9fc4e8, ground: 0x5d8a4e, road: 0x3a3d42, scenery: 'city' },
  farm: { sky: 0xc4e6f5, ground: 0x8fb556, road: 0x57514a, scenery: 'farm' },
  // beach: sand, a stormy sky, the sea along the right, palms and beach huts
  beach: { sky: 0x7e8d9e, ground: 0xdccb95, road: 0x45484e, scenery: 'beach' },
  // space: no ground and no road surface, only glowing lane lines among the stars
  // canberra: the bush capital: dry grass, gum trees and concrete, a grassy median
  canberra: { sky: 0xb9d8ee, ground: 0xa3ad66, road: 0x4a4c50, scenery: 'canberra', median: 0x7f9a4f },
  // suburb: lawns, pavements, picket fences and houses in a row
  suburb: { sky: 0xa9d6f5, ground: 0x6aa84f, road: 0x484b50, scenery: 'suburb' },
  hell: { sky: 0x2a0704, ground: 0x3a120a, road: 0x1b1414, scenery: 'hell', line: 0xffb36b },
  space: { sky: 0x05060d, ground: null, road: null, scenery: 'space', line: 0x7fe8ff, centre: 0xff62d6 },
  // night: the city after dark. The road and the ground are lit surfaces (lit: true), dark but
  // for a faint blue moon and the player's headlights; other cars show their own lamps.
  night: { sky: 0x05070e, ground: 0x34492d, road: 0x45484e, scenery: 'city', lit: true, headlights: true,
    light: { sky: 0x5d72b0, ground: 0x10141c, ambient: 0.3, sun: 0x9fb4ff, sunlight: 0.25 } },
};

// Everything built here for the loaded level goes in this group, which is emptied and
// rebuilt each time a level is loaded.
const levelGroup = new THREE.Group();
scene.add(levelGroup);

const buildRoad = () => {
  clearGroup(levelGroup);
  const theme = THEMES[LEVEL.theme] || THEMES.city;
  applySky(theme.sky);
  applyLight(theme.light);
  setHeadlights(!!theme.headlights);
  const flat = (color) => new (theme.lit ? THREE.MeshLambertMaterial : THREE.MeshBasicMaterial)({ color, side: THREE.DoubleSide });
  const add = (geo, mat) => {
    // (a lit surface needs to know which way it faces; the strips are built without that)
    if (theme.lit && !geo.attributes.normal) geo.computeVertexNormals();
    return levelGroup.add(new THREE.Mesh(geo, mat));
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
  const line = (a, b, lat, mat = lineMat) =>
    add(buildStrip(a, b, (s) => lat(s) - 0.1, (s) => lat(s) + 0.1, 0.02), mat);

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
  if (!twoWay && Track.leftLanes && Track.rightLanes) add(buildDashes(Track.start, Track.end, () => 0, () => true), lineMat);
  for (const side of [-1, 1]) {
    if (twoWay && !HM) add(buildStrip(Track.start, Track.end, side * 0.12, side * 0.28, 0.02), centreMat);
    if (HM) line(Track.start, Track.end, () => side * HM);
    // dashed dividers between the lanes of each side, only where both lanes exist
    for (let k = 1; k < (side < 0 ? Track.leftLanes : Track.rightLanes); k++) {
      add(buildDashes(Track.start, Track.end, () => side * (HM + k * LW),
        (s) => Track.lanesOn(side, s) >= k + 0.95), lineMat);
    }
  }
  // the median: a strip of its own colour between those lines and, on a level with a railway, a
  // track down the middle of it: sleepers on ballast, and two rails
  if (HM) {
    add(buildStrip(Track.start, Track.end, -HM + 0.1, HM - 0.1, 0.01), flat(theme.median || 0x6f8f4a));
    if (LEVEL.railway) {
      const GAUGE = 1.435;
      add(buildStrip(Track.start, Track.end, -1.6, 1.6, 0.03), flat(0x8b8378));
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
  Track.toWorld(Track.length / 2, 0, tmp);
  ground.position.set(tmp.x, -0.05, tmp.z);
  levelGroup.add(ground);

  if (Track.hilly && theme.ground !== null) {
    // Hills: the land beside the road rises and falls with it. It is a wide ribbon of grass
    // just under the road, with a skirt sloping down to the flat ground along each edge.
    // It writes depth (pushed back a little, so the road always wins) so that a crest hides
    // what lies beyond it.
    const LAND = 130;
    const land = new THREE.Mesh(
      buildStrip(Track.start, Track.end, (s) => Track.lo(s) - LAND, (s) => Track.hi(s) + LAND, -0.04, 6), flat(theme.ground));
    land.material.polygonOffset = true;
    land.material.polygonOffsetFactor = 2;
    land.material.polygonOffsetUnits = 2;
    land.renderOrder = -1.5;
    levelGroup.add(land);
    const bank = flat(new THREE.Color(theme.ground).multiplyScalar(0.8));
    for (const side of [-1, 1]) {
      const pos = [], idx = [];
      let n = 0;
      for (let s = Track.start; s <= Track.end; s += 6, n++) {
        const top = (side < 0 ? Track.lo(s) : Track.hi(s)) + side * LAND;
        Track.toWorld(s, top, tmp);
        const drop = tmp.y; // the further it has to fall, the further out the foot of the slope
        pos.push(tmp.x, tmp.y - 0.04, tmp.z);
        Track.toWorld(s, top + side * (2 + drop * 2.5), tmp);
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
  const instances = (geometry, color, list, glowing) => {
    if (!list.length) return;
    const material = glowing ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.InstancedMesh(geometry, material, list.length);
    list.forEach(([s, lat, y, sx, sy, sz], i) => {
      dummy.rotation.y = Track.toWorld(s, lat, tmp);
      dummy.position.set(tmp.x, tmp.y + y, tmp.z);
      dummy.scale.set(sx, sy, sz);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    levelGroup.add(mesh);
  };
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const tube = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
  const cone = new THREE.ConeGeometry(0.5, 1, 8);

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
    const WALLS = [0xf2e6c9, 0xbfd8e8, 0xf0c9b0, 0xd9e5c3, 0xe8d0e0, 0xfafafa];
    const walls = WALLS.map(() => []), roofs = [], doors = [], windows = [], drives = [];
    const pickets = [], rails = [], mailPosts = [], mailboxes = [], trunks = [], crowns = [], lampPosts = [], lampHeads = [];
    const tree = (at, lat) => {
      const h = 0.8 + Math.random() * 0.5;
      trunks.push([at, lat, 1.2 * h, 0.35, 2.4 * h, 0.35]);
      crowns.push([at, lat, 3.6 * h, 3.4 * h, 3.0 * h, 3.4 * h]);
    };
    const FENCE = 2.8, LOT = 26; // m off the pavement edge to the fence; m along the road per lot
    // (nothing goes where it would stand on a side road)
    const clear = (s, lat) => !exits.length || (Track.toWorld(s, lat, tmp), Track.sideDistance(tmp.x, tmp.z) > 24);
    for (const side of [-1, 1]) {
      for (let s = Track.start + (side > 0 ? 0 : LOT / 2); s < Track.end - LOT; s += LOT) {
        const mid = s + LOT / 2;
        if (!clear(mid, beside(side, mid, 12))) continue;
        if (Math.random() < 0.12) { // a little park
          for (let k = 0; k < 4; k++) tree(s + Math.random() * LOT, beside(side, mid, 5 + Math.random() * 22));
          continue;
        }
        const along = 9 + Math.random() * 4, across = 8 + Math.random() * 3;
        const tall = Math.random() < 0.4, h = tall ? 6 : 3.4;
        const front = 9 + Math.random() * 3; // m of front lawn, from the pavement edge to the house
        const lat = beside(side, mid, front + across / 2), face = beside(side, mid, front - 0.06);
        walls[Math.floor(Math.random() * WALLS.length)].push([mid, lat, h / 2, across, h, along]);
        roofs.push([mid, lat, h + 1.1, across * 1.12, 2.2, along * 1.12]);
        doors.push([mid - 1.5, face, 1.1, 0.12, 2.2, 1.1]);
        for (const floor of tall ? [1.6, 4.4] : [1.6]) {
          windows.push([mid + 2.2, face, floor, 0.1, 1.2, 1.7]);
          if (floor > 2) windows.push([mid - 1.5, face, floor, 0.1, 1.2, 1.7]);
        }
        // the driveway, beside the house, from the pavement to its far side, with the mailbox at its end
        const drive = mid + along / 2 + 2;
        drives.push([drive, beside(side, drive, (front + across) / 2 + 1.2), 0.03, front + across - 2.4, 0.06, 3.2]);
        mailPosts.push([drive - 2.3, beside(side, drive - 2.3, FENCE - 0.3), 0.5, 0.1, 1.0, 0.1]);
        mailboxes.push([drive - 2.3, beside(side, drive - 2.3, FENCE - 0.3), 1.1, 0.32, 0.3, 0.55]);
        // the picket fence along the front of the lot, open where the driveway crosses it
        for (const [from, to] of [[s, drive - 1.8], [drive + 1.8, s + LOT]]) {
          if (to - from < 1) continue;
          for (let q = from; q <= to; q += 1.2) pickets.push([q, beside(side, q, FENCE), 0.45, 0.1, 0.9, 0.1]);
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
    instances(roof, 0x6b4a3f, roofs);
    instances(cube, 0x7a3b2e, doors);
    instances(cube, 0x9cc7e0, windows);
    instances(cube, 0x9a9a95, drives);
    instances(cube, 0xffffff, pickets);
    instances(cube, 0xffffff, rails);
    instances(cube, 0x5a5a5a, mailPosts);
    instances(cube, 0x2a4a8a, mailboxes);
    instances(tube, 0x6b4a2b, trunks);
    instances(new THREE.SphereGeometry(0.5, 10, 8), 0x3f8f3f, crowns);
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
      stars.updateMatrixWorld();
    };
    levelGroup.add(stars);
  }
};
Game.onLoad.push(buildRoad);
