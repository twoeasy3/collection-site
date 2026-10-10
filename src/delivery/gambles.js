// ============================================================================
// GAMBLES - Gimmick Road 3's gimmicks (see levels.js and CONFIG, each under its own name): things the
// road does that the player can take a risk on, or not. None stops the car and none busts it: each has a
// fast line that pays when it is driven right and costs when it is not, and a slow line that always works.
//   crosswinds   a wind across an exposed stretch: tall cars are pushed harder, a tall vehicle gives shelter
//   crests       (no field: the road's own profile, a segment's grade and ease) a crest sharp enough that a fast
//                car leaves the ground over it: no steering in the air, and it lands on whatever is over the top
//   jamRamps     a car transporter with its ramps down at the back of a queue: fast enough, the car flies the queue
//   lowBridges   a height bar over the player's side, the exit before it the tall vehicles' way round: under the
//                bar a car that fits goes straight on; a taller one takes the knock
//   fords        the road runs through a river, so deep, between an exit and its merge (the side road is the bridge):
//                a car that wades that deep is only slowed; one that does not crawls through, and is damaged
//   washboards   corrugated dirt: at a middling speed the grip is shaken away; faster, the car skims the tops
// What each does is here; render/gambles.js draws it. Like Hazards, this runs after the player's own update
// (Game.update) and puts its hand on the car there: Player itself knows nothing of it.
// ============================================================================
import { CONFIG } from './config.js';
import { LEVEL } from './levels.js';
import { CAR } from './cars.js';
import { Track } from './track.js';
import { Player } from './player.js';
import { Traffic } from './traffic.js';
import { Message } from './messages.js';
import { hurt, sfx } from './physics.js';
import { Game } from './game.js';
import { Hazards } from './hazards.js';
import { Water } from './water.js';

const clamp01 = (u) => Math.max(0, Math.min(1, u));
const smooth = (u) => { u = clamp01(u); return u * u * (3 - 2 * u); };
const spot = {}; // (a point in the world, for Track.toWorld)
const FLAT = { y: 0, slope: 0 };

export const Gambles = {
  winds: [],      // { from, to, dir (-1: it blows to the left, 1: to the right), strength, every, length }
  lee: null,      // the vehicle the player is sheltered by, in a crosswind (null: none)
  windNow: 0,     // m/s^2 the wind is pushing the player's car sideways just now (signed; 0 out of the wind): for the drawing
  said: {},       // what has been said this run, once each
  crests: [],     // { s (its top), from, to (where the road falls away fastest), speed (m/s: faster than this, a car leaves the ground) }
  fly: null,      // the player's car in the air: { vy (m/s up), vx (along the road), latVel, t (s so far), top (m: the highest it got off the ground) }
  alt: 0,         // ...and how high it is, in the world (m)
  ground: null,   // the height of what was under the car last step (null: not known: just set down, or off the expressway)
  slope: 0,       // ...and its slope (rise per m), and where the car was
  lastS: 0,
  flights: 0,     // how many times the car has left the ground this run (for a check)
  ramps: [],      // { s (the foot of its ramps), lane, lat, run, top (m: its lip), queue, lanes: [first, last], last (s of the last car of its queue), clear (s the car must land beyond), speed (m/s that does) }
  onRamp: null,   // the ramp the car is on
  up: 0,          // m the car is above the road, by this file's doing (on a ramp, in the air)
  bars: [],       // low bridges: { s, clearance (m), lo, hi (lat: what it spans), exit (the Track.exits entry that goes round it), hits (times the player's car has hit it this run) }
  fords: [],      // { from, to, depth (m), exit (the Track.exits entry that is its bridge) }
  inFord: null,   // the ford the player's car is in (null: none)
  boards: [],     // washboards: { from, to, skim (m/s: at this speed or more the car skims it) }
  rough: 0,       // how much of its grip the washboard is shaking away from the player's car just now (0 .. 1)

  // the level's lists (as a level loads, for the drawing, and again as each run starts)
  build() {
    const W = CONFIG.crosswind;
    this.winds = (LEVEL.crosswinds || []).map(w => ({ from: w.from, to: w.to, dir: w.dir === 'left' ? -1 : 1,
      strength: w.strength ?? W.strength, every: w.every ?? W.every, length: w.length ?? W.length }));
    this.buildCrests();
    this.boards = (LEVEL.washboards || []).map(b => ({ from: b.from, to: b.to, skim: b.skim ?? CONFIG.washboard.skim }));
    this.bars = (LEVEL.lowBridges || []).map((b) => ({ s: b.s, clearance: b.clearance ?? CONFIG.lowBridge.clearance, lo: Track.laneOffset(Track.laneRange(1, b.s)[0], b.s) - CONFIG.laneWidth / 2, hi: Track.hi(b.s),
      exit: Track.exits.find(x => x.exitAt < b.s && x.mergeAt > b.s) || null, hits: 0 }));
    this.fords = (LEVEL.fords || []).map((f) => ({ from: f.from, to: f.to, depth: f.depth ?? CONFIG.ford.depth, exit: Track.exits.find(x => x.exitAt < f.from && x.mergeAt > f.to) || null }));
    this.ramps = (LEVEL.jamRamps || []).map((r) => {
      const R = CONFIG.jamRamp, [first, last] = Track.laneRange(1, r.s), queue = r.queue ?? R.queue;
      const ramp = { s: r.s, lane: r.lane, lat: Track.laneOffset(r.lane, r.s), run: R.run, top: R.run * Math.tan(R.angle), queue, lanes: r.lanes || [first, last] };
      ramp.last = r.s + R.run + R.gap + (queue - 1) * R.spacing;
      ramp.clear = ramp.last + R.margin;
      ramp.speed = this.rampSpeed(ramp);
      return ramp;
    });
  },
  // where a ramp's queue stands: [{ s, lane }], the last of each lane first (Traffic puts a stopped car at each)
  queueSpots(ramp) {
    const R = CONFIG.jamRamp, spots = [];
    for (let lane = ramp.lanes[0]; lane <= ramp.lanes[1]; lane++) {
      const from = lane === ramp.lane ? ramp.s + R.run + R.gap - 1 : ramp.s;
      for (let s = ramp.last; s >= from; s -= R.spacing) spots.push({ s, lane });
    }
    return spots;
  },
  // the speed (m/s) at the foot of a ramp that, hands off, lands the car beyond its queue
  rampSpeed(ramp) {
    const R = CONFIG.jamRamp, g = CONFIG.crest.gravity, sin = Math.sin(R.angle), dt = 1 / 120;
    for (let v0 = 8; v0 < 90; v0 += 0.25) {
      let v = v0, x = 0;
      while (x < ramp.run && v > 0) { v -= g * sin * dt; x += v * dt; }
      if (v <= 0) continue;
      const vy = v * Math.tan(R.angle), t = (vy + Math.sqrt(vy * vy + 2 * g * ramp.top)) / g;
      if (ramp.s + ramp.run + v * t >= ramp.clear) return v0;
    }
    return 90;
  },
  reset() {
    this.build();
    this.lee = null;
    this.windNow = 0;
    this.said = {};
    this.fly = null;
    Player.rampAhead = false;
    Player.shaken = this.rough = 0;
    this.barS = Player.s;
    this.inFord = null;
    this.up = 0;
    this.onRamp = null;
    this.ground = null;
    this.flights = 0;
    this.lastS = Player.s;
  },
  once(key, ...more) {
    if (this.said[key]) return;
    this.said[key] = true;
    Message.say('events', key, ...more);
  },

  // ---- crosswinds -------------------------------------------------------------------------------------
  // the crosswind over s, if any (on the expressway only)
  wind(s) { return Track.isMain(s) ? this.winds.find(w => s >= w.from && s <= w.to) || null : null; },
  // how hard it is blowing just now, as a share of its strength: `lull` between gusts, 1 in one
  gust(w, t = Game.time) {
    const W = CONFIG.crosswind, u = ((t % w.every) + w.every) % w.every;
    const g = u < w.length ? clamp01(Math.min(u, w.length - u) / W.rise) : 0;
    return W.lull + (1 - W.lull) * g;
  },
  // the push on a vehicle `height` m tall in it, out in the open (m/s^2, signed: + = to the right)
  windPush(w, height, t) {
    const W = CONFIG.crosswind;
    return w.dir * w.strength * this.gust(w, t) * Math.pow(height / W.heightRef, W.heightPower);
  },
  // the vehicle sheltering v from the wind w: a tall one alongside it, close by on the windward side
  shelter(w, v) {
    const W = CONFIG.crosswind;
    for (const car of Traffic.cars) {
      if (!car.active || car === v || car.junction || !Track.isMain(car.s)) continue;
      if (car.height < W.leeHeight || car.height < v.height) continue;
      if (Math.abs(car.s - v.s) > car.hl + v.hl * 0.5) continue;
      const across = (car.lat - v.lat) * -w.dir; // (m it is to windward)
      if (across > 0 && across < W.leeReach) return car;
    }
    return null;
  },
  updateWinds(dt) {
    const W = CONFIG.crosswind, P = Player;
    const w = P.active ? this.wind(P.s) : null;
    this.windNow = 0;
    if (w) {
      this.once('crosswind');
      const lee = this.shelter(w, P), open = this.windPush(w, P.height);
      // (out of a tall vehicle's lee: the wind is back all at once, with a shove)
      if (this.lee && !lee && !P.busted) { P.latVel += w.dir * W.shove * this.gust(w) * Math.pow(P.height / W.heightRef, W.heightPower); sfx('wave', 0.25); }
      this.lee = lee;
      this.windNow = open * (lee ? W.lee : 1);
      if (!P.busted && P.ghost <= 0 && !(P.tank > 0)) P.latVel += this.windNow * dt; // (a ghost, and a tank, feel nothing)
    } else this.lee = null;
    // the traffic in it drifts a little in its lanes (and leans: render/gambles.js)
    if (!this.winds.length) return;
    for (const car of Traffic.cars) {
      if (!car.active || car.junction || car.parked || car.spin > 0) continue;
      const cw = this.wind(car.s);
      if (cw) car.latVel += this.windPush(cw, car.height) * W.traffic * dt;
    }
  },

  // ---- leaving the ground: crests (and whatever else stands on the road to be driven up) ---------------------
  // The car follows the ground until the ground falls away under it faster than gravity can pull the car down
  // after it: then it flies, on the arc it left on (CONFIG.crest.gravity, the game's own, as the drawbridge's),
  // with no throttle, brake or steering, and comes down on whatever is there. All of it from the road's own
  // profile (Track's heights: a level's segments, their grade and ease), so a crest needs nothing placed on it.
  // the road's height at s (m, in the world), and its slope there (rise per m, over the 4 m about s)
  roadY(s) { Track.toWorld(s, 0, spot); return spot.y; },
  roadSlope(s) { return (this.roadY(s + 2) - this.roadY(s - 2)) / 4; },
  // what stands on the road at (s, lat) to be driven up: { y: m above the road, slope }: the ramp the car is on
  extra(s) {
    const r = this.onRamp;
    return r && s >= r.s && s < r.s + r.run ? { y: (s - r.s) * r.top / r.run, slope: r.top / r.run } : FLAT;
  },
  // a transporter's ramps: on at their foot, in line with them; off the lip at the top, or off the side. Beside
  // it, the car is kept out of its trailer (pushed aside: no damage)
  rideRamps() {
    const P = Player, R = CONFIG.jamRamp;
    if (this.onRamp && (P.s < this.onRamp.s || P.s >= this.onRamp.s + this.onRamp.run || Math.abs(P.lat - this.onRamp.lat) > R.half + 0.4)) this.onRamp = null;
    P.rampAhead = !!this.onRamp || !!this.fly;
    for (const r of this.ramps) {
      if (P.active && P.s > r.s - R.sign * 1.6 && P.s < r.s) this.once('jamAhead');
      if (P.s > r.s - R.commit && P.s < r.s + R.foot && Math.abs(P.lat - r.lat) <= R.half) P.rampAhead = true;
      if (P.s < r.s || P.s > r.s + r.run + R.cab || this.onRamp === r) continue;
      const across = P.lat - r.lat;
      if (!this.fly && P.s < r.s + R.foot && Math.abs(across) <= R.half) { this.onRamp = r; this.once('jamRamp'); }
      else if (this.up < 0.6 && Math.abs(across) < R.half + P.hw) { P.lat = r.lat + (across < 0 ? -1 : 1) * (R.half + P.hw); P.latVel = 0; }
    }
    // (nothing queues behind it: traffic coming up its lane moves over well before, so its ramps stay clear)
    for (const r of this.ramps) {
      if (Math.abs(r.s - P.s) > 700) continue;
      for (const car of Traffic.cars) {
        if (!car.active || car.fixed || car.dir < 0 || car.lane !== r.lane || car.s > r.s + r.run || car.s < r.s - R.keepClear || !Track.isMain(car.s)) continue;
        const [first, last] = Track.laneRange(1, car.s), other = r.lane > first ? r.lane - 1 : r.lane + 1;
        if (other > last) continue;
        car.lane = other;
        car.pendingLane = null;
        car.signal = other - r.lane;
      }
    }
  },
  // the crests of the loaded level: every place where the road falls away fast enough that a car at
  // CONFIG.crest.fastest or less would leave the ground, with the speed that does it
  buildCrests() {
    const C = CONFIG.crest, need = C.gravity / (C.fastest * C.fastest);
    this.crests = [];
    if (!Track || !Track.hilly) return;
    let run = null;
    for (let s = 4; s < Track.length - 4; s += 2) {
      const bend = -(this.roadSlope(s + 2) - this.roadSlope(s - 2)) / 4; // (how fast the slope is falling, per m)
      if (bend > need) {
        if (!run) run = { from: s, to: s, most: 0 };
        run.to = s;
        run.most = Math.max(run.most, bend);
      } else if (run) { this.crests.push({ s: (run.from + run.to) / 2, from: run.from, to: run.to, speed: Math.sqrt(C.gravity / run.most) }); run = null; }
    }
  },
  // how blind the road ahead of s is: 0 .. 1, coming up to a crest a garage car can fly (the camera comes
  // down behind the car, so the far side stays hidden until the car is over the top: render/scene.js)
  blind(s) {
    const C = CONFIG.crest;
    let most = 0;
    if (!this.crests.length || !Track.isMain(s)) return 0;
    for (const c of this.crests) {
      if (c.speed > C.signUnder) continue;
      most = Math.max(most, smooth((s - (c.from - C.camFrom)) / C.camEase) * (1 - smooth((s - c.s) / C.camEase)));
    }
    return most;
  },
  updateFlight(dt) {
    const P = Player, C = CONFIG.crest;
    if (Hazards.jump) { this.fly = null; this.ground = null; return; } // (off a drawbridge's leaf: Hazards has it)
    if (!P.active || CAR.noWheels || !Track.isMain(P.s) || Math.abs(P.s - this.lastS) > 30) { // (no car, one with no wheels (the UFO, the boat), a side road, or set down somewhere else)
      this.fly = null;
      this.ground = null;
      this.lastS = P.s;
      return;
    }
    if (this.fly) { // (in the air there is nothing to push against, brake on or steer with)
      const F = this.fly;
      P.s -= (P.speed - F.vx) * dt;
      P.speed = F.vx;
      P.lat = Math.max(Track.lo(P.s) + P.hw, Math.min(Track.hi(P.s) - P.hw, P.lat + (F.latVel - P.latVel) * dt));
      P.latVel = F.latVel;
    }
    const wasOn = this.onRamp;
    this.rideRamps();
    if (wasOn && !this.onRamp) this.up = 9; // (off its lip, or its side, this step: up in the air until the flight below says otherwise)
    const road = this.roadY(P.s), ex = this.extra(P.s, P.lat), slope = this.roadSlope(P.s) + ex.slope, ground = road + ex.y;
    const live = P.shield <= 0 && P.ghost <= 0 && P.tank <= 0;
    // off the ground: where the slope has dropped away since the last step by more than gravity makes up for
    if (!this.fly && this.ground !== null && P.speed * (this.slope - slope) - C.gravity * dt > C.slack) {
      this.fly = { vy: P.speed * this.slope, vx: P.speed, latVel: P.latVel, t: 0, top: 0 };
      this.alt = Math.max(ground, this.ground + this.fly.vy * dt);
    }
    this.lastS = P.s;
    if (this.fly) {
      const F = this.fly;
      F.vy -= C.gravity * dt;
      this.alt += F.vy * dt;
      F.t += dt;
      if (this.alt > ground) {
        P.air = this.up = this.alt - road;
        P.pitch = Math.atan2(F.vy, Math.max(P.speed, 6)) - Math.atan(Track.grade(P.s)); // (its nose the way it is flying: main.js adds the road's own slope)
        if (F.top <= C.hop && this.alt - ground > C.hop) this.flights++;
        F.top = Math.max(F.top, this.alt - ground);
        if (F.t > C.sayAfter && F.top > C.hop) this.once('airborne');
        return;
      }
      // down: hard, if it came down into the ground faster than landSoft
      const into = P.speed * slope - F.vy;
      if (F.top > C.hop) {
        if (live && into > C.landSoft) hurt(P, (into - C.landSoft) * C.landDamage);
        Game.shake = Math.max(Game.shake, Math.min(1, into / 14));
        sfx('drop', Math.min(1, into / 10));
      }
      this.fly = null;
    }
    this.ground = ground;
    this.slope = slope;
    this.up = ex.y;
    if (ex.y || ex.slope) { // (up a ramp: the climb takes some of its speed)
      P.air = ex.y;
      P.pitch = Math.atan(ex.slope);
      P.speed = Math.max(CONFIG.jamRamp.crawl, P.speed - C.gravity * Math.sin(P.pitch) * dt); // (never to a stand on it: the slowest car still crawls off its lip)
    }
  },

  // ---- washboard dirt ------------------------------------------------------------------------------------
  // Corrugations right across the road. Crawling over them (CONFIG.washboard.calm m/s or less) the car rides each
  // one; at its `skim` speed or more it skims their tops and runs smooth. Between the two the wheels hop: the
  // steering hardly takes (Player.shaken: see Player's steering), the car wanders, and in a bend it is carried
  // to the outside. Worst in the middle of that band
  board(s) { return Track.isMain(s) ? this.boards.find(b => s >= b.from && s <= b.to) || null : null; },
  // how rough a washboard that skims at `skim` is at v m/s: 0 (crawling, or skimming) .. 1
  roughness(v, skim = CONFIG.washboard.skim) {
    const calm = CONFIG.washboard.calm;
    return v <= calm || v >= skim ? 0 : Math.sin(Math.PI * (v - calm) / (skim - calm)) ** CONFIG.washboard.shape;
  },
  updateBoards(dt) {
    const B = CONFIG.washboard, P = Player;
    const b = P.active && !this.fly && !CAR.noWheels && P.ghost <= 0 && !(P.tank > 0) ? this.board(P.s) : null;
    if (P.active && this.board(P.s)) this.once('washboard');
    this.rough = P.shaken = b ? this.roughness(P.speed, b.skim) : 0;
    if (!this.rough || P.busted) return;
    const t = Game.time, r = this.rough;
    P.latVel += B.wander * r * (Math.sin(t * 2.3) + Math.sin(t * 3.9 + 1.7)) * dt; // (hopping about)
    P.latVel -= Math.sign(Track.bend(P.s)) * Math.min(B.slideMost, Math.abs(Track.bend(P.s)) * P.speed * P.speed * B.slide) * r * dt; // (and wide in a bend)
    Game.shake = Math.max(Game.shake, B.shake * r);
    if ((this.boardSound = (this.boardSound || 0) - dt) <= 0) { this.boardSound = B.soundEvery; sfx('gravel', 0.5 * r); }
  },

  // ---- low bridges ---------------------------------------------------------------------------------------
  // A height bar across the player's side of the road (and its shoulder), `clearance` m off it, between an exit
  // and its merge: the side road is the tall vehicles' way round, and tall traffic takes it. A car no taller
  // than the bar goes under; a taller one that goes at it anyway takes the knock (health, by how much too tall,
  // and most of its speed) and is through: it is never stopped. The oncoming side is not barred
  fits(bar, height = Player.height) { return height <= bar.clearance; },
  updateBars() {
    const L = CONFIG.lowBridge, P = Player, was = this.barS ?? P.s;
    this.barS = P.s;
    for (const bar of this.bars) {
      const from = (bar.exit ? bar.exit.exitAt : bar.s) - L.warn;
      if (P.active && Track.isMain(P.s) && P.s > from && P.s < bar.s && !this.said['bar' + bar.s]) {
        this.said['bar' + bar.s] = true;
        const line = Message.say('events', this.fits(bar) ? 'lowBridgeFits' : 'lowBridgeTall');
        if (line) line.text += ' (' + P.height.toFixed(1) + ' m under ' + bar.clearance.toFixed(1) + ' m)';
      }
      // tall traffic goes round by the exit (and one that turns up beyond the exit, far from the player, is taken away)
      for (const car of Traffic.cars) {
        if (!car.active || car.dir < 0 || car.fixed || car.height <= bar.clearance || !Track.isMain(car.s) || car.s > bar.s) continue;
        if (bar.exit && car.s < bar.exit.exitAt) car.viaSide = true;
        else if (car.s > bar.s - L.traffic && Math.abs(car.s - P.s) > L.unseen) car.active = false;
      }
      if (!P.active || !Track.isMain(P.s) || !(was < bar.s && P.s >= bar.s) || P.s - was > 30) continue;
      if (P.lat + P.hw < bar.lo || P.lat - P.hw > bar.hi || this.fits(bar, P.height + P.air) || P.ghost > 0) continue;
      bar.hits++;
      if (P.tank > 0) { sfx('crash', 0.6); continue; } // (a tank takes the bar with it)
      if (P.shield <= 0) hurt(P, L.damage + L.perMetre * (P.height + P.air - bar.clearance));
      P.speed *= L.keep;
      Game.shake = 1;
      sfx('crash', 1);
      Message.say('events', 'lowBridgeHit');
    }
  },

  // ---- fords ---------------------------------------------------------------------------------------------
  // The road runs through a river, `depth` m deep, between an exit and its merge: the side road is the bridge.
  // What a car wades is its `crossing` (cars.js): CONFIG.ford.shallow m for the worst, .deepest m for the best.
  // In water no deeper than that it is only slowed, the less the shallower (to `fast` m/s in next to none, `slow`
  // at its limit); in deeper it crawls (`crawl` m/s: never stopped) and is damaged for as long as it is in. A car
  // that floats, a ghost and a tank are not troubled
  wades(crossing = Player.crossing) { const F = CONFIG.ford; return F.shallow + (F.deepest - F.shallow) * crossing; },
  ford(s) { return Track.isMain(s) ? this.fords.find(f => s >= f.from && s <= f.to) || null : null; },
  // the fastest a car that wades `limit` m goes through water `depth` m deep (m/s)
  fordPace(depth, limit) { const F = CONFIG.ford; return depth > limit ? F.crawl : F.fast + (F.slow - F.fast) * depth / limit; },
  updateFords(dt) {
    const F = CONFIG.ford, P = Player;
    for (const f of this.fords) {
      const from = (f.exit ? f.exit.exitAt : f.from) - F.warn;
      if (P.active && Track.isMain(P.s) && P.s > from && P.s < f.from && !this.said['ford' + f.from]) {
        this.said['ford' + f.from] = true;
        const line = Message.say('events', f.depth <= this.wades() ? 'fordFits' : 'fordDeep');
        if (line) line.text += ' (' + f.depth.toFixed(1) + ' m deep: this car wades ' + this.wades().toFixed(1) + ' m)';
      }
    }
    for (const car of Traffic.cars) { // (the traffic wades through slowly)
      if (car.active && !car.junction && this.ford(car.s) && Math.abs(car.vs) > F.traffic) car.vs = Math.sign(car.vs) * Math.max(F.traffic, Math.abs(car.vs) - F.bite * dt);
    }
    const f = P.active && !this.fly && !CAR.noWheels && !Water.floats(CAR) && P.ghost <= 0 && !(P.tank > 0) ? this.ford(P.s) : null;
    if (f && !this.inFord) { sfx('waveCrash', Math.min(1, P.speed / 25)); Game.shake = Math.max(Game.shake, 0.5); }
    this.inFord = f;
    if (!f) return;
    const limit = this.wades(), pace = this.fordPace(f.depth, limit);
    if (P.speed > pace) P.speed = Math.max(pace, P.speed - F.bite * dt);
    if (f.depth > limit) {
      if (P.shield <= 0) P.health -= F.damage * (f.depth - limit) * P.damageScale * dt;
      Game.shake = Math.max(Game.shake, 0.2);
      this.once('fordStuck');
    }
  },

  update(dt) {
    if (Traffic.frozen) return; // (TRAFFIC FREEZE, a mystery: everything here stands still too)
    this.updateFlight(dt);
    this.updateFords(dt);
    this.updateBars();
    this.updateBoards(dt);
    this.updateWinds(dt);
  },
};
