// ============================================================================
// HAZARDS - Gimmick Road 2's gimmicks (see levels.js and CONFIG, each under its own name): school
// crossings, burst water mains, hot-air balloons, drawbridges, wide loads with an escort, shopping
// trolleys, marathons, toll plazas and stampedes. Each is a list in the level, barebones: what it
// does is here, render/hazards.js draws it (the things that can be run into are obstacles, drawn
// as obstacles: see Collision, which this adds them to, and render/obstacleModels.js).
// As with every obstacle, traffic drives straight through the moving ones (trolleys, runners, a wide
// load, a stampede); it does wait at a school crossing, a balloon, a drawbridge and a toll.
// (Average-speed cameras are cameras.js's; a road train jackknifing is wreckage.js's.)
// ============================================================================
import { CONFIG } from './config.js';
import { LEVEL } from './levels.js';
import { Track } from './track.js';
import { Player } from './player.js';
import { Traffic } from './traffic.js';
import { Collision } from './collision.js';
import { Message } from './messages.js';
import { hurt, sfx, sfxAt } from './physics.js';
import { Game } from './game.js';

const between = (r) => r.min + Math.random() * (r.max - r.min);
const clamp01 = (u) => Math.max(0, Math.min(1, u));
// how fast a car may go so as to stop at `line` (Infinity if it is past it, or far off)
const stopAt = (car, line) => {
  const d = (line - car.s) * car.dir;
  return d < -0.5 || d > 80 ? Infinity : Math.sqrt(2 * CONFIG.junction.stopping * Math.max(0, d - 0.5));
};
// is the player `seconds` or less from s, at the speed it is going? (ahead of it, on the same road)
const within = (s, seconds) => {
  const ahead = s - Player.s;
  return Player.active && ahead > 0 && ahead < 2000 && ahead / Math.max(Player.speed, 8) <= seconds;
};
// did the player go over s this step?
const crossed = (s, from) => from < s && Player.s >= s && Player.s - from < 30;
// (seeded: everything is laid out the same way every run)
let seed = 1;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

let attached = false;

export const Hazards = {
  schools: [],   // { s, state: 'idle' | 'stop', t, next, started }
  mains: [],     // { from, to, lane, lat, on, t, warned }: its patch of ice is Track.sprays' (same order)
  balloons: [],  // { s, lat0, lat1, state: 'idle' | 'descend' | 'sit' | 'rise' | 'gone', t, hit }
  bridges: [],   // { s, state: 'idle' | 'warn' | 'open' | 'close', t, next, started, bell }
  loads: [],     // { s0, lat(s), load, escort (obstacles), on, t, passed, done }
  trolleys: [],  // obstacles, each with cart: { lat0, vel0, vel }
  marathons: [], // { s0, lane, on, members: obstacles with run: { s0, off } }
  tolls: [],     // { s, fee, paid, rammed, lift }
  stampedes: [], // { from, to, on, animals: obstacles with charge: { s0, lat0, speed, phase } }
  jump: null,    // the player jumping a drawbridge: { from, to }
  lastS: 0,

  // adds this level's obstacles to Collision's as it loads a level (Game.load attaches it, once)
  attach() {
    if (attached) return;
    attached = true;
    Collision.loaders.push((add) => this.load(add));
  },
  load(add) {
    const put = (kind, s, lat, extra) => {
      add(kind, s, lat, { hazard: true, ...extra });
      return Collision.obstacles[Collision.obstacles.length - 1];
    };
    seed = 24680;
    this.trolleys = [];
    for (const z of LEVEL.trolleys || []) {
      for (let i = 0; i < (z.count || 4); i++) {
        const s = Track.place({ s: z.from + (z.to - z.from) * (i + rand()) / (z.count || 4), road: z.road, exit: z.exit });
        const lat0 = Track.lo(s) + 0.6 + rand() * (Track.hi(s) - Track.lo(s) - 1.2);
        this.trolleys.push(put('trolley', s, lat0, { cart: { lat0, vel0: (rand() - 0.5) * 4, vel: 0 } }));
      }
    }
    this.marathons = (LEVEL.marathons || []).map((m) => {
      const M = CONFIG.marathon, s0 = Track.place(m), members = [];
      for (let i = 0; i < (m.count || 8); i++) {
        const s = s0 - Math.floor(i / 2) * M.spacing, off = i % 2 ? 0.7 : -0.7;
        members.push(put('runner', s, Track.laneOffset(m.lane, s) + off, { run: { s0: s, off, k: i } }));
      }
      members.push(put('paceCar', s0 + M.lead, Track.laneOffset(m.lane, s0 + M.lead), { run: { s0: s0 + M.lead, off: 0, k: 0 } }));
      if (m.water !== undefined) { // (the water station: two tables standing in the lane, to its outer side)
        for (const d of [0, 7]) { const s = Track.place({ s: m.water + d }); put('waterTable', s, Track.laneOffset(m.lane, s) + 1.05); }
      }
      return { s0, lane: m.lane, on: false, members };
    });
    this.loads = (LEVEL.wideLoads || []).map((w) => {
      const s0 = Track.place(w), [a, b] = w.lanes;
      const lat = (s) => (Track.laneOffset(a, s) + Track.laneOffset(b, s)) / 2;
      const load = put('wideLoad', s0, lat(s0)), back = s0 - load.hl - CONFIG.wideLoad.behind;
      return { s0, lat, load, escort: put('escort', back, lat(back)), on: false, t: 0, passed: false, done: false };
    });
    this.tolls = (LEVEL.tolls || []).map((t) => {
      const s = Track.place(t);
      for (const side of [-1, 1]) put('tollBooth', s, Track.shoulderOffset(side, s)); // (no way round by a shoulder)
      return { s, fee: t.fee ?? CONFIG.toll.fee, paid: false, rammed: false, lift: 0 };
    });
    this.stampedes = (LEVEL.stampedes || []).map((z) => {
      const from = Track.place({ s: z.from, road: z.road, exit: z.exit }), to = from + (z.to - z.from), animals = [];
      for (let i = 0; i < (z.count || 8); i++) {
        const s = from + (to - from) * (i + rand()) / (z.count || 8), lat0 = Track.lo(s) + 1 + rand() * (Track.hi(s) - Track.lo(s) - 2);
        const S = CONFIG.stampede.speed;
        animals.push(put(z.kind || 'cow', s, lat0, { face: Math.PI, charge: { s0: s, lat0, speed: S.min + rand() * (S.max - S.min), phase: rand() * 6 } }));
      }
      // (they run `run` m down the road from where they waited, no further than the start of their road)
      return { from, to, on: false, animals, floor: Math.max(from - CONFIG.stampede.run, Track.place({ s: 5, road: z.road, exit: z.exit })) };
    });
  },

  reset() {
    const place = (c) => Track.place(c);
    this.schools = (LEVEL.schoolCrossings || []).map(c => ({ s: place(c), state: 'idle', t: 0, next: 0, started: false }));
    this.mains = (LEVEL.waterMains || []).map((m) => {
      const from = place(m), to = from + (m.length ?? CONFIG.waterMain.length);
      return { from, to, lane: m.lane, lat: Track.laneOffset(m.lane, from), on: false, t: 0, warned: false };
    });
    Track.sprays.length = 0;
    for (const m of this.mains) Track.sprays.push({ from: m.from, to: m.to, lane: m.lane, on: false });
    this.balloons = (LEVEL.balloons || []).map((b) => {
      const s = place(b), LW = CONFIG.laneWidth;
      return { s, lat0: Track.laneOffset(b.lanes[0], s) - LW / 2, lat1: Track.laneOffset(b.lanes[1], s) + LW / 2, state: 'idle', t: 0, hit: false };
    });
    this.bridges = (LEVEL.drawbridges || []).map(c => ({ s: place(c), state: 'idle', t: 0, next: 0, started: false, bell: 0 }));
    for (const w of this.loads) {
      Object.assign(w, { on: false, t: 0, passed: false, done: false });
      w.load.s = w.s0; w.load.lat = w.lat(w.s0);
      w.escort.s = w.s0 - w.load.hl - CONFIG.wideLoad.behind; w.escort.lat = w.lat(w.escort.s);
    }
    for (const o of this.trolleys) { o.lat = o.cart.lat0; o.cart.vel = o.cart.vel0; }
    for (const m of this.marathons) {
      m.on = false;
      for (const o of m.members) { o.s = o.run.s0; o.lat = Track.laneOffset(m.lane, o.s) + o.run.off; o.run.t = 0; }
    }
    for (const t of this.tolls) Object.assign(t, { paid: false, rammed: false, lift: 0 });
    for (const z of this.stampedes) {
      z.on = false;
      for (const o of z.animals) { o.s = o.charge.s0; o.lat = o.charge.lat0; o.h = 0; }
    }
    this.jump = null;
    Player.air = 0;
    this.lastS = Player.s;
  },

  // ---- what each is doing, for the drawing (and the rules below) --------------------------------------
  // a school crossing's children: how far across the road they are, 0 (one kerb) .. 1 (the other)
  childrenAcross: (c) => c.state === 'stop' ? clamp01((c.t - 0.8) / (CONFIG.schoolCrossing.hold - 1.6)) : 0,
  // how high a balloon's basket is off the road (m)
  balloonHeight(b) {
    const B = CONFIG.balloon;
    return b.state === 'descend' ? B.height * (1 - clamp01(b.t / B.descend)) ** 2 : b.state === 'sit' ? 0
      : b.state === 'rise' ? B.height * clamp01(b.t / B.rise) ** 2 : B.height;
  },
  // how far up a drawbridge's leaves are, 0 (down) .. 1 (right up); and its booms, 0 (up) .. 1 (down)
  bridgeOpen(c) {
    const D = CONFIG.drawbridge;
    return c.state === 'open' ? clamp01(c.t / D.raise) : c.state === 'close' ? 1 - clamp01(c.t / D.close) : 0;
  },
  bridgeBooms: (c) => c.state === 'idle' ? 0 : c.state === 'warn' ? clamp01(c.t / 1.2) : 1,
  // is a wide load's escort watching just now?
  watching(w) {
    const W = CONFIG.wideLoad;
    return w.on && !w.done && w.t % (W.watch + W.rest) < W.watch;
  },

  // how fast a traffic car may go, for the ones it waits at: a school crossing's STOP, a balloon on
  // (or nearly on) its lane, a drawbridge not down, and (going the player's way) the roll through a toll
  holdFor(car) {
    let most = Infinity;
    const S = CONFIG.schoolCrossing, B = CONFIG.balloon, D = CONFIG.drawbridge, T = CONFIG.toll;
    for (const c of this.schools) if (c.state === 'stop') most = Math.min(most, stopAt(car, c.s - car.dir * (S.stopLine + car.hl)));
    for (const b of this.balloons) {
      if ((b.state === 'sit' || (b.state === 'descend' && b.t > B.descend * 0.4)) && car.lat + car.hw > b.lat0 && car.lat - car.hw < b.lat1) {
        most = Math.min(most, stopAt(car, b.s - car.dir * (B.stopLine + car.hl)));
      }
    }
    for (const c of this.bridges) if (c.state !== 'idle') most = Math.min(most, stopAt(car, c.s - car.dir * (D.stopLine + car.hl)));
    if (car.dir > 0) for (const t of this.tolls) if (car.s > t.s - T.zone && car.s < t.s + 4) most = Math.min(most, T.slow);
    return most;
  },

  update(dt) {
    const from = this.lastS;
    this.lastS = Player.s;
    const live = Player.active && Player.shield <= 0, solid = live && Player.ghost <= 0;

    // ---- school crossings
    const S = CONFIG.schoolCrossing;
    for (const c of this.schools) {
      c.t += dt;
      if (c.state === 'idle') {
        c.next -= dt;
        const ahead = c.s - Player.s;
        if (!c.started ? within(c.s, S.notice) : c.next <= 0 && ahead > 0 && ahead < S.again && Player.active) {
          if (!c.started) Message.say('events', 'schoolCrossing');
          Object.assign(c, { state: 'stop', t: 0, started: true });
          sfxAt('bell', c.s, 1);
        }
      } else if (c.t >= S.hold) Object.assign(c, { state: 'idle', t: 0, next: between(S.every) });
      if (c.state === 'stop' && live && crossed(c.s, from)) Player.bust('school');
    }

    // ---- burst water mains
    const M = CONFIG.waterMain;
    this.mains.forEach((m, i) => {
      m.t += dt;
      if (m.t >= (m.on ? M.on : M.off)) { m.on = !m.on; m.t = 0; if (m.on && Math.abs(m.from - Player.s) < 200) sfxAt('wave', m.from, 0.5); }
      Track.sprays[i].on = m.on;
      if (!m.warned && Player.active && m.from - Player.s > 0 && m.from - Player.s < M.warn) { m.warned = true; Message.say('events', 'waterMain'); }
    });

    // ---- hot-air balloons
    const B = CONFIG.balloon;
    for (const b of this.balloons) {
      b.t += dt;
      if (b.state === 'idle') {
        if (within(b.s, B.notice)) { Object.assign(b, { state: 'descend', t: 0, hit: false }); Message.say('events', 'balloon'); }
      } else if (b.state === 'descend' && b.t >= B.descend) { Object.assign(b, { state: 'sit', t: 0 }); sfxAt('drop', b.s, 0.8); }
      else if (b.state === 'sit' && b.t >= B.sit) Object.assign(b, { state: 'rise', t: 0 });
      else if (b.state === 'rise' && b.t >= B.rise) b.state = 'gone';
      // (its basket, low enough to be run into: once a landing)
      if (b.state !== 'gone' && b.state !== 'idle' && !b.hit && solid && this.balloonHeight(b) < Player.height &&
          Math.abs(Player.s - b.s) < Player.hl + B.hl && Player.lat + Player.hw > b.lat0 && Player.lat - Player.hw < b.lat1) {
        b.hit = true;
        if (Player.tank <= 0) { hurt(Player, B.damage); Player.speed *= B.speedKept; Player.stun = Math.max(Player.stun, CONFIG.stunTime * 0.5); }
        Game.shake = 1;
        sfx('crash', 0.9);
      }
    }

    // ---- drawbridges
    const D = CONFIG.drawbridge;
    for (const c of this.bridges) {
      c.t += dt;
      const ahead = c.s - Player.s;
      if (c.state === 'idle') {
        c.next -= dt;
        if (!c.started ? within(c.s, D.notice) : c.next <= 0 && ahead > 0 && ahead < D.again && Player.active) {
          if (!c.started) Message.say('events', 'drawbridge');
          Object.assign(c, { state: 'warn', t: 0, started: true });
        }
      } else if (c.state === 'warn' && c.t >= D.warn) Object.assign(c, { state: 'open', t: 0 });
      else if (c.state === 'open' && c.t >= D.open) Object.assign(c, { state: 'close', t: 0 });
      else if (c.state === 'close' && c.t >= D.close) Object.assign(c, { state: 'idle', t: 0, next: between(D.every) });
      if (c.state !== 'idle' && (c.bell -= dt) <= 0) { c.bell = 0.5; if (Math.abs(ahead) < 300) sfxAt('bell', c.s, 1); }
      const open = this.bridgeOpen(c), lo = c.s - D.gap / 2, hi = c.s + D.gap / 2;
      if (open > 0.5) { // (traffic caught on it as it opens goes in)
        for (const car of Traffic.cars) if (car.active && !car.junction && car.health > 0 && car.s > lo && car.s < hi) car.health = 0;
      }
      // the player reaching the gap: over it at speed (or as a ghost), or into it
      if (open > 0.15 && live && Player.health > 0 && !this.jump && crossed(lo, from)) {
        if (Player.ghost > 0 || Player.speed >= D.jumpSpeed || Player.tank > 0) {
          this.jump = { from: lo, to: hi + (Player.speed - D.jumpSpeed) * 0.3 };
          sfx('turbo', 0.5);
        } else {
          Player.health = 0; // (into the water: wrecked, see Collision.check)
          Message.say('events', 'drawbridgeFall');
        }
      }
    }
    if (this.jump) {
      const u = (Player.s - this.jump.from) / (this.jump.to - this.jump.from);
      if (!Player.active || u >= 1) {
        if (Player.active && Player.ghost <= 0 && Player.tank <= 0) hurt(Player, D.landDamage);
        if (Player.active) { Game.shake = Math.max(Game.shake, 0.7); sfx('drop'); Message.say('events', 'drawbridgeJump'); }
        this.jump = null;
        Player.air = 0;
      } else Player.air = D.jumpHeight * 4 * u * (1 - u);
    }

    // ---- wide loads
    const W = CONFIG.wideLoad;
    for (const w of this.loads) {
      if (w.done) continue;
      if (!w.on && w.s0 - Player.s < W.trigger && w.s0 - Player.s > -50) { w.on = true; Message.say('events', 'wideLoad'); }
      if (!w.on) continue;
      w.t += dt;
      const { load, escort } = w, was = from - (load.s + load.hl) > 0; // (was the player past its nose already, last step?)
      if (!load.gone) { load.s += W.speed * dt; load.lat = w.lat(load.s); }
      if (!escort.gone) { escort.s += W.speed * dt; escort.lat = w.lat(escort.s); }
      // past its nose: a bust if the escort was watching, and near enough to see
      if (!w.passed && live && !was && Player.s - (load.s + load.hl) > 0 && Player.s - load.s < 40) {
        w.passed = true;
        if (!load.gone && !escort.gone && this.watching(w) && Math.abs(Player.s - escort.s) < W.sight) Player.bust('wideLoad');
      }
      if (load.s > Track.length - 60 || Player.s - load.s > 200) { w.done = true; load.gone = escort.gone = true; }
    }

    // ---- shopping trolleys: rolling with the camber, bouncing back off the kerbs
    const T = CONFIG.trolley;
    for (const o of this.trolleys) {
      if (o.gone || Math.abs(o.s - Player.s) > 400) continue;
      const bend = Track.bend(o.s), r = o.cart, mid = (Track.lo(o.s) + Track.hi(o.s)) / 2;
      const pull = Math.abs(bend) > 5e-4 ? Math.sign(bend) * T.accel * Math.min(T.bend, 1 + Math.abs(bend) / 0.002) : Math.sign(o.lat - mid || 1) * T.accel;
      r.vel = Math.max(-T.top, Math.min(T.top, r.vel + pull * dt));
      o.lat += r.vel * dt;
      const lo = Track.lo(o.s) + o.hw, hi = Track.hi(o.s) - o.hw;
      if (o.lat < lo || o.lat > hi) {
        const side = o.lat < lo ? 1 : -1; // (the way back onto the road)
        o.lat = o.lat < lo ? lo : hi;
        r.vel = side * Math.max(T.kick, Math.abs(r.vel) * T.bounce);
      }
      o.face = r.vel > 0 ? Math.PI / 2 : -Math.PI / 2;
    }

    // ---- marathons
    const R = CONFIG.marathon;
    for (const m of this.marathons) {
      if (!m.on && m.s0 - Player.s < R.trigger) m.on = true;
      if (!m.on) continue;
      for (const o of m.members) {
        if (o.gone) continue;
        o.run.t += dt;
        o.s += R.speed * dt;
        o.lat = Track.laneOffset(m.lane, o.s) + o.run.off + Math.sin(o.run.t * 2.1 + o.run.k) * R.wobble;
        if (o.s > Track.length - 20) o.gone = true;
      }
    }

    // ---- toll plazas
    const P = CONFIG.toll;
    for (const t of this.tolls) {
      const ahead = t.s - Player.s;
      if (!t.paid && !t.rammed && Player.active && ahead > 0 && ahead < P.reach && Player.speed <= P.paySpeed) {
        t.paid = true;
        Game.fines += t.fee;
        sfx('cash5');
        const line = Message.say('events', 'tollPaid');
        if (line) line.text = line.text.replace('${fee}', '$' + t.fee);
      }
      if (t.paid) t.lift = Math.min(1, t.lift + dt / P.lift);
      if (!t.paid && !t.rammed && live && crossed(t.s, from)) {
        t.rammed = true;
        if (Player.ghost <= 0 && Player.tank <= 0 && Player.lat > 0) { hurt(Player, P.boomDamage); Player.speed *= P.boomKept; }
        Game.shake = Math.max(Game.shake, 0.5);
        sfx('crash', 0.8);
        Message.say('events', 'tollRam');
        if (Traffic.policeNear() || Math.random() < P.bustChance) Player.bust('toll');
      }
    }

    // ---- stampedes: charging down the road at the player
    const Z = CONFIG.stampede;
    for (const z of this.stampedes) {
      if (!z.on && Player.active && z.from - Player.s > 0 && z.from - Player.s < Z.trigger) { z.on = true; Message.say('events', 'stampede'); }
      if (!z.on) continue;
      for (const o of z.animals) {
        if (o.gone) continue;
        const c = o.charge;
        o.s -= c.speed * dt;
        c.phase += dt * 2.4;
        const lo = Track.lo(o.s) + o.hw, hi = Track.hi(o.s) - o.hw;
        o.lat = Math.max(lo, Math.min(hi, c.lat0 + Math.sin(c.phase) * Z.weave));
        o.h = o.kind === 'kangaroo' ? CONFIG.kangarooHop * Math.abs(Math.sin(c.phase * 1.4)) : 0;
        if (o.s < Player.s - Z.past || o.s < z.floor) o.gone = true;
      }
    }
  },
};
