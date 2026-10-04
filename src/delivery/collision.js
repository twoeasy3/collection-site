import { CONFIG } from './config.js';
import { LEVEL } from './levels.js';
import { clamp } from './util.js';
import { Track } from './track.js';
import { FxQueue, startRivalry, hurt, sfx } from './physics.js';
import { Player } from './player.js';
import { Traffic } from './traffic.js';
import { Game } from './game.js';

// ============================================================================
// COLLISION - oriented boxes in track space: x = distance along track, y = lateral
// All vehicles are bodies that trade momentum; damage scales with impact speed.
// ============================================================================
export const Collision = (() => {
  // built on first use: this module, the player and the traffic import one another
  let allBodies = null;
  const getBodies = () => allBodies || (allBodies = [Player, ...Traffic.cars]);

  // separating axis test; a car's long axis is (cos yaw, sin yaw) in (s, lat)
  const overlap = (a, b) => {
    const ca = Math.cos(a.yaw), sa = Math.sin(a.yaw);
    const cb = Math.cos(b.yaw), sb = Math.sin(b.yaw);
    const dx = b.s - a.s, dy = b.lat - a.lat;
    const axes = [ca, sa, -sa, ca, cb, sb, -sb, cb];
    for (let i = 0; i < 8; i += 2) {
      const ux = axes[i], uy = axes[i + 1];
      const ra = a.hl * Math.abs(ux * ca + uy * sa) + a.hw * Math.abs(uy * ca - ux * sa);
      const rb = b.hl * Math.abs(ux * cb + uy * sb) + b.hw * Math.abs(uy * cb - ux * sb);
      if (Math.abs(dx * ux + dy * uy) > ra + rb) return false;
    }
    return true;
  };

  let tick = 0; // counts calls to check(), to space out repeated damage from one long contact

  // is a crash between these two heard? The player's always; in the screensaver, any near the camera
  const heard = (a, b) => a.isPlayer || b.isPlayer ||
    (Game.screensaver && Math.abs(a.s - Player.s) < CONFIG.screensaver.soundRange);

  const resolve = (a, b) => {
    const ds = b.s - a.s, dl = b.lat - a.lat;
    const penS = Math.max(0.02, a.hl + b.hl - Math.abs(ds));
    const penLat = Math.max(0.02, a.hw + b.hw - Math.abs(dl));
    const sideOn = penLat < penS;           // they came together sideways, not nose to tail
    const headOn = a.bound !== b.bound;     // one northbound, one southbound

    // Contact with a police car is a bust, unless it wasn't the player's doing: the police car
    // ran into the back of the player, it was out of control, or it was oncoming.
    const police = a.isPlayer && b.kind === 'police' ? b : b.isPlayer && a.kind === 'police' ? a : null;
    if (police) {
      const behind = (police.s - Player.s) * Player.dir < 0;
      const closing = (police.vs - Player.speed) * Player.dir > 0;
      const rearEnded = !sideOn && behind && closing;
      const outOfControl = police.spin > 0 || police.wobble > 0;
      if (!rearEnded && !outOfControl && !headOn) Player.bust('bump');
    }
    if (a.isPlayer && a.tank > 0) {
      // TANK RAGE: whatever it touches is wrecked. Only a head-on costs the tank any health.
      b.health = 0;
      if (headOn) a.health -= a.maxHealth * CONFIG.tankHeadOnDamage;
      a.speed *= Math.max(0.35, 1 - CONFIG.tankRamSlow * b.mass); // ramming does slow it
      Game.shake = Math.max(Game.shake, 0.6);
      return;
    }
    if (headOn) {
      // a northbound and a southbound vehicle touching, however they touch, is a head-on:
      // both are wrecked outright
      a.health = 0;
      b.health = 0;
      if (heard(a, b)) {
        if (a.isPlayer || b.isPlayer) Game.shake = 1;
        sfx('crash');
      }
      return;
    }

    // Cars are only ever pushed along the road, never sideways. Overlapping cars are slid
    // apart nose to tail, a little each step, and trade momentum along the road.
    // (between traffic, the lighter body takes the bigger share of any push)
    const shareA = b.mass / (a.mass + b.mass), shareB = 1 - shareA;
    // The player always wins a shoving match with traffic, whatever the two weigh: the
    // player takes only a small share of any push, the traffic vehicle the rest. The one
    // exception is the player running into the back of a traffic vehicle: then it is the
    // traffic that has the better of it, and the player who loses the speed.
    const player = a.isPlayer ? a : b.isPlayer ? b : null, other = a.isPlayer ? b : a;
    const rearEnd = player && !sideOn && (other.s - player.s) * player.dir > 0 && (player.vs - other.vs) * player.dir > 0;
    const playerShare = rearEnd ? CONFIG.playerRearEndShare : CONFIG.playerPushShare;
    const pushA = a.isPlayer ? playerShare : b.isPlayer ? 1 - playerShare : shareA;
    const pushB = 1 - pushA;
    const n = ds >= 0 ? 1 : -1; // b is the one in front
    const slide = Math.min(penS, CONFIG.pushStep);
    a.s -= n * slide * pushA;
    b.s += n * slide * pushB;

    let impact = 0;
    const closing = (a.vs - b.vs) * n;
    if (closing > 0) {
      const j = (1 + CONFIG.bounce) * closing;
      a.vs -= n * j * pushA;
      b.vs += n * j * pushB;
      // (a rear-end swings nobody round: only a side-on contact that is also closing along
      // the road turns the cars, by how far off-centre it is)
      if (sideOn) {
        const spin = n * clamp(dl / (a.hw + b.hw), -1, 1) * CONFIG.spinKick * closing * 0.5;
        a.yawVel += spin * pushA * 2;
        b.yawVel += spin * pushB * 2;
      }
      impact = closing;
    }
    if (sideOn) {
      // steering into the side of another car: it hurts, but neither is shoved sideways.
      // One long scrape counts as one hit, not one per step.
      const sideways = (a.latVel - b.latVel) * (dl > 0 ? 1 : -1);
      if (sideways > CONFIG.minImpact && tick - (a.sideTick || -99) > 60 && tick - (b.sideTick || -99) > 60) {
        a.sideTick = b.sideTick = tick;
        const turn = -(dl > 0 ? 1 : -1) * clamp(ds / (a.hl + b.hl), -1, 1) * CONFIG.spinKick * sideways;
        a.yawVel += turn * pushA * 2;
        b.yawVel += turn * pushB * 2;
        impact = Math.max(impact, sideways + Math.abs(a.vs - b.vs) * CONFIG.scrape);
      }
    }

    if (impact > CONFIG.minImpact) {
      const damage = impact * CONFIG.damagePerSpeed;
      hurt(a, damage * shareA * 2);
      hurt(b, damage * shareB * 2);
      if (a.isPlayer) b.grudge = true;
      if (b.isPlayer) a.grudge = true;
      // traffic that collides with traffic tends to take it personally
      if (Math.random() < CONFIG.rivalryChance) startRivalry(a, b);
      if (Math.random() < CONFIG.rivalryChance) startRivalry(b, a);
      const stun = CONFIG.stunTime * clamp(impact / 10, 0.3, 1);
      a.stun = Math.max(a.stun, stun);
      b.stun = Math.max(b.stun, stun);
      if (heard(a, b)) {
        if (a.isPlayer || b.isPlayer) Game.shake = Math.max(Game.shake, clamp(impact / 15, 0.25, 1));
        sfx('crash', clamp(impact / 18, 0.3, 1));
      }
    }
  };

  // ---- obstacles: they exist only for the player; traffic drives straight through them ----
  //   barrier, bale, cone, sign  stay where they are put
  //   frog           hops all over the road within its stretch
  //   cow            ambles across the road, stands a while, ambles back
  //   asteroid       a rock of radius r whose centre is h above the road. Some sit at road
  //                  level; some pass just under or over it and can't be hit, and nothing
  //                  marks which. The moving ones drift across the road or bob through it
  // The list is filled by loadLevel() when a level is loaded (see Game.load).
  const SIZE = { // hw, hl, height
    barrier: [1.2, 0.6, 1.2], bale: [1.1, 1.1, 1.5], frog: [1.4, 1.4, 1.6], cow: [0.7, 1.3, 1.5],
    asteroid: [1, 1, 2], // replaced by each asteroid's own radius
    cone: [0.3, 0.3, 0.8], sign: [1.1, 0.15, 3.0],
    // the beach's own junk (Hurricane): a beach umbrella, a surfboard stuck upright, an ice
    // box, a lifeguard chair, and a wrecked car (which spins on the spot as it drifts)
    umbrella: [1.2, 1.2, 3.0], surfboard: [0.6, 0.25, 2.6], cooler: [0.8, 0.6, 1.2], chair: [1.0, 1.0, 3.4],
    wreck: [1.0, 2.1, 1.4],
  };
  const obstacles = [];
  const add = (kind, s, lat, extra) => {
    const [hw, hl, height] = SIZE[kind];
    // h = height off the ground (frogs), face = which way the model points, in track space
    obstacles.push({ kind, s, lat, h: 0, yaw: 0, face: 0, hw, hl, height, gone: false, ...extra });
  };
  const stretch = (z) => {
    const from = Track.place({ s: z.from, road: z.road, exit: z.exit });
    return { from, to: from + (z.to - z.from) };
  };
  const loadLevel = () => {
    obstacles.length = 0;
    for (const o of LEVEL.obstacles || []) {
      const s = Track.place(o);
      add(o.kind || 'barrier', s, Track.laneOffset(o.lane, s));
    }
    // rows of things standing on the shoulders (not beside an exit or merge lane, where a
    // side road's pavement runs over the shoulder as it forks off, nor on a bridge)
    const spot = {};
    for (const row of LEVEL.shoulderRows || []) {
      const sides = row.side === 'left' ? [-1] : row.side === 'right' ? [1] : [-1, 1];
      for (let s = row.from; s <= row.to; s += row.every || 10) {
        if (Track.onBridge(s)) continue;
        for (const side of sides) {
          if (side > 0 && Track.rampLaneZone(s)) continue;
          const lat = Track.shoulderOffset(side, s);
          Track.toWorld(s, lat, spot);
          if (Track.sideDistance(spot.x, spot.z) < CONFIG.laneWidth * 2) continue;
          add(row.kind || 'cone', s, lat);
        }
      }
    }
    for (const z of LEVEL.frogs || []) add('frog', 0, 0, { ...stretch(z), fromS: 0, fromLat: 0, toS: 0, toLat: 0, t: 1, rest: 0 });
    for (const z of LEVEL.herds || []) {
      // a cow walks across the road, so its hitbox lies across it too
      for (let i = 0; i < (z.count || 3); i++) add(z.kind || 'cow', 0, 0, { ...stretch(z), yaw: Math.PI / 2, dir: 1, rest: 0 });
    }
    // (seeded, so every drifter moves the same way every run)
    let driftSeed = 2654435761;
    const driftRand = () => {
      driftSeed = (driftSeed + 0x6D2B79F5) >>> 0;
      let x = Math.imul(driftSeed ^ (driftSeed >>> 15), 1 | driftSeed);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
    for (const z of LEVEL.drifters || []) {
      // each has a centre of its own along the stretch, spaced out, with the pattern's
      // reach along the road kept inside the stretch, and a rhythm of its own: its own
      // pace, and a second, unrelated wobble on top, so no two move quite alike
      const { from, to } = stretch(z), count = z.count || 4, kind = z.kind || 'cone';
      const reach = Math.max(CONFIG.drifters.circleRadius, CONFIG.drifters.eightLength) + 5;
      for (let i = 0; i < count; i++) {
        const centre = from + reach + (count > 1 ? i / (count - 1) : 0.5) * (to - from - 2 * reach);
        add(kind, centre, 0, { from, to, drift: z.pattern || 'circle', centre, time: 0,
          phase: driftRand() * Math.PI * 2, phase2: driftRand() * Math.PI * 2,
          pace: 0.7 + driftRand() * 0.6, pace2: 1.37 + driftRand() * 0.9, // (the second never a multiple of the first)
          spin: kind === 'wreck' ? CONFIG.drifters.wreckSpin * (driftRand() < 0.5 ? -1 : 1) * (0.6 + driftRand() * 0.8) : 0 });
      }
    }
    (LEVEL.asteroidFields || []).forEach((z, k) => {
      // seeded, so a field is laid out the same way every run
      let seed = ((z.seed || 1) * 7919 + k * 104729) >>> 0;
      const rand = () => {
        seed = (seed + 0x6D2B79F5) >>> 0;
        let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
      };
      const { from, to } = stretch(z);
      const resting = []; // rocks sitting still on the road
      // would a rock here still leave a car-sized gap across the road, shoulders included?
      const leavesGap = (s, lat, r) => {
        const spans = [[lat - r, lat + r]];
        for (const o of resting) if (Math.abs(o.s - s) < o.r + r + 8) spans.push([o.lat - o.r, o.lat + o.r]);
        spans.sort((a, b) => a[0] - b[0]);
        let edge = Track.lo(s), widest = 0;
        for (const [a, b] of spans) {
          widest = Math.max(widest, a - edge);
          edge = Math.max(edge, b);
        }
        return Math.max(widest, Track.hi(s) - edge) >= 5;
      };
      for (let i = 0; i < z.count; i++) {
        const s = from + rand() * (to - from);
        // mostly small, but some are massive: up to five lanes across
        const r = 0.8 + Math.pow(rand(), 2.5) * (CONFIG.laneWidth * 2.5 - 0.8);
        const lat = Track.lo(s) + rand() * (Track.hi(s) - Track.lo(s));
        const moves = rand() < (z.moving === undefined ? 0.5 : z.moving);
        // on the road, or just off its level. One that would leave no way past the rocks
        // already sitting there is put off the road's level instead.
        const onRoad = rand() < (z.onRoad === undefined ? 0.55 : z.onRoad) && (moves || leavesGap(s, lat, r));
        // Telling which is which is meant to be hard. A rock on the road sits anywhere from
        // mostly sunk below it to mostly proud of it; one off the road only just clears it,
        // usually skimming under the track, sometimes passing just over the car.
        const clear = 0.3 + rand() * 2.2;
        const h0 = onRoad ? r * (-0.6 + rand() * 1.4) : rand() < 0.7 ? -r - clear : 2.2 + r + clear;
        const extra = { r, hw: r * 0.85, hl: r * 0.85, height: r * 2, lat0: lat, h0, h: h0,
          vLat: 0, bob: 0, period: 1, phase: 0, time: 0, spin: 0.2 + rand() * 0.8 };
        if (moves) {
          if (rand() < 0.5) extra.vLat = (rand() < 0.5 ? -1 : 1) * (2 + rand() * 4); // drifts across
          else { // bobs up and down, through road level
            extra.bob = 3 + rand() * 5;
            extra.period = 3 + rand() * 3;
            extra.phase = rand() * Math.PI * 2;
          }
        }
        add('asteroid', s, lat, extra);
        if (onRoad && !moves) resting.push({ s, lat, r });
      }
    });
    resetObstacles();
  };
  const anywhereAcross = (o, s) => {
    const lo = Track.lo(s) + o.hl, hi = Track.hi(s) - o.hl;
    return lo + Math.random() * (hi - lo);
  };
  // puts a drifter where its pattern has it at o.time, facing the way it is moving. The
  // pattern runs at the drifter's own pace, with its own slower wobble laid over it, both
  // along and across the road, so the path never quite repeats.
  const driftTo = (o) => {
    const D = CONFIG.drifters, t = o.time * o.pace, p = o.phase;
    const wobble = D.wobble * Math.sin(o.time * o.pace2 + o.phase2);     // -wobble .. wobble
    const wobbleS = D.wobble * Math.sin(o.time * o.pace2 * 0.61 + o.phase2);
    let s = o.centre, across = 0; // across: -1 .. 1 of the road's reach either side of the centre
    if (o.drift === 'circle') {
      s += D.circleRadius * (1 - D.wobble + wobbleS) * Math.cos(t * D.circleRate + p);
      across = Math.sin(t * D.circleRate + p) + wobble;
    } else if (o.drift === 'zigzag') { // up and down the stretch, turning back at each end, weaving
      const span = o.to - o.from, u = (o.centre - o.from + D.zigzagSpeed * t) % (2 * span);
      s = o.from + (u < span ? u : 2 * span - u);
      across = Math.sin(t * D.zigzagRate + p) + wobble;
    } else if (o.drift === 'sweep') {
      across = Math.sin(t * D.sweepRate + p) + wobble;
      s += D.circleRadius * wobbleS;
    } else if (o.drift === 'figure8') {
      s += D.eightLength * (1 - D.wobble + wobbleS) * Math.sin(t * D.eightRate + p);
      across = Math.sin(2 * (t * D.eightRate + p)) + wobble;
    }
    s = clamp(s, o.from + o.hl, o.to - o.hl);
    const lo = Track.lo(s) + o.hl, hi = Track.hi(s) - o.hl;
    const lat = (lo + hi) / 2 + clamp(across, -1, 1) * (hi - lo) / 2 * D.across;
    if (o.time > 0 && !o.spin) o.face = Math.atan2(lat - o.lat, s - o.s);
    if (o.spin) o.face = o.yaw = o.time * o.spin; // (a wreck spins on the spot, hitbox and all)
    o.s = s;
    o.lat = lat;
  };
  const updateObstacles = (dt) => {
    for (const o of obstacles) {
      if (o.gone) continue;
      if (o.kind === 'frog') {
        if (o.t < 1) { // mid-hop
          o.t = Math.min(1, o.t + dt / CONFIG.frogHopTime);
          o.s = o.fromS + (o.toS - o.fromS) * o.t;
          o.lat = o.fromLat + (o.toLat - o.fromLat) * o.t;
          o.h = CONFIG.frogHopHeight * 4 * o.t * (1 - o.t);
        } else if ((o.rest -= dt) <= 0) { // sat long enough: hop to anywhere on the road nearby
          o.rest = CONFIG.frogRestMin + Math.random() * (CONFIG.frogRestMax - CONFIG.frogRestMin);
          o.fromS = o.s;
          o.fromLat = o.lat;
          o.toS = clamp(o.s + (Math.random() - 0.5) * 2 * CONFIG.frogHopMax, o.from, o.to);
          o.toLat = anywhereAcross(o, o.toS);
          o.face = Math.atan2(o.toLat - o.fromLat, o.toS - o.fromS);
          o.t = 0;
        }
      } else if (o.kind === 'cow') {
        if (o.rest > 0) { o.rest -= dt; continue; } // standing at the roadside
        o.lat += o.dir * CONFIG.cowSpeed * dt;
        o.face = o.dir * Math.PI / 2;
        const lo = Track.lo(o.s) + o.hl, hi = Track.hi(o.s) - o.hl;
        if (o.lat > hi || o.lat < lo) { // reached the far side: stand, then head back
          o.lat = clamp(o.lat, lo, hi);
          o.dir = -o.dir;
          o.rest = CONFIG.cowRestMin + Math.random() * (CONFIG.cowRestMax - CONFIG.cowRestMin);
        }
      } else if (o.drift) {
        o.time += dt;
        driftTo(o);
      } else if (o.kind === 'asteroid') {
        o.time += dt;
        o.h = o.h0 + o.bob * Math.sin(o.time / o.period * Math.PI * 2 + o.phase);
        if (o.vLat) { // drifts across the road and a little beyond, then back
          o.lat += o.dir * o.vLat * dt;
          const lo = Track.lo(o.s) - 4, hi = Track.hi(o.s) + 4;
          if (o.lat > hi || o.lat < lo) {
            o.lat = clamp(o.lat, lo, hi);
            o.dir = -o.dir;
          }
        }
      }
    }
  };

  // an asteroid can only be hit while some of it is at the height of the car
  const atRoadLevel = (o) => o.h - o.r < Player.height && o.h + o.r > 0;

  const hitObstacles = () => {
    if (!Player.active || Player.shield > 0 || Player.ghost > 0) return;
    for (const o of obstacles) {
      if (o.gone || Math.abs(o.s - Player.s) > CONFIG.broadPhaseDistance) continue;
      if (o.kind === 'asteroid' && !atRoadLevel(o)) continue; // it passes over or under the car
      if (!overlap(Player, o)) continue;
      // any touch blows the obstacle up: the car is damaged and loses speed, but drives on
      o.gone = true;
      const cost = CONFIG.obstacleKinds[o.kind];
      if (Player.tank <= 0) { // a tank just flattens it
        // (a bigger rock hurts more, up to a limit)
        hurt(Player, o.kind === 'asteroid' ? Math.min(cost.maxDamage, cost.damage * o.r) : cost.damage);
        Player.speed *= cost.speedKept;
        if (!cost.light) Player.stun = Math.max(Player.stun, CONFIG.stunTime * 0.5);
      }
      Game.shake = Math.max(Game.shake, cost.light ? 0.3 : 1);
      FxQueue.push({ type: 'explode', s: o.s, lat: o.lat, vs: Player.speed, big: false });
    }
  };
  // back to how the level starts: everything standing, the movers somewhere in their stretches
  const resetObstacles = () => {
    for (const o of obstacles) {
      o.gone = false;
      if (o.kind === 'asteroid') { // back to where the field put it
        o.lat = o.lat0;
        o.h = o.h0;
        o.time = 0;
        o.dir = 1;
        continue;
      }
      if (o.drift) { // back to the start of its pattern
        o.time = 0;
        o.face = 0;
        driftTo(o);
        continue;
      }
      if (o.from === undefined) continue; // barriers and bales stay where they were put
      o.s = o.from + Math.random() * (o.to - o.from);
      o.dir = Math.random() < 0.5 ? 1 : -1;
      o.h = 0;
      o.lat = anywhereAcross(o, o.s);
      o.rest = Math.random() * 1.2;
      o.t = 1;
    }
  };

  const check = () => {
    tick++;
    const bodies = getBodies();
    // a ghost only turns solid again once it is clear of every car
    if (Player.active && Player.ghost > 0 && Player.ghost < 0.2) {
      for (const car of Traffic.cars) {
        if (car.active && Math.abs(car.s - Player.s) < CONFIG.broadPhaseDistance && overlap(Player, car)) {
          Player.ghost = 0.2;
          break;
        }
      }
    }
    for (let i = 0; i < bodies.length; i++) {
      const a = bodies[i];
      if (!a.active || a.shield > 0 || a.ghost > 0) continue; // freshly dropped or ghosted player
      for (let j = i + 1; j < bodies.length; j++) {
        const b = bodies[j];
        if (!b.active) continue;
        // broad phase: nearby along the track and within neighbouring lanes
        if (Math.abs(b.s - a.s) > CONFIG.broadPhaseDistance ||
            Math.abs(b.lat - a.lat) > CONFIG.laneWidth * 1.5) continue;
        if (overlap(a, b)) resolve(a, b);
      }
    }
    hitObstacles();
    // anything out of health blows up (the explosion itself hurts nobody)
    for (const v of bodies) {
      if (!v.active || v.health > 0) continue;
      v.active = false;
      FxQueue.push({ type: 'explode', s: v.s, lat: v.lat, vs: v.vs, big: v.mass > 1, tyres: true });
    }
  };

  return { get bodies() { return getBodies(); }, obstacles, loadLevel, resetObstacles, updateObstacles, atRoadLevel, check, overlap };
})();
