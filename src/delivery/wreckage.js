// ============================================================================
// WRECKAGE - a level's "wreckage" (see levels.js): scripted destruction, set off as the player
// comes up to it. Something goes up at the roadside (or out of the sky) in a fireball, and its
// wreckage comes flying in and lands across some of the lanes: a fuel tanker, the control tower,
// a stack of containers, a hangar's roof, an airliner. Where it lands it blows up anything there,
// and from then on it blocks those lanes for good: whatever runs into it is wrecked (the player's
// car outright, but for a ghost, or one just set down by the helicopter). Traffic whose lane is
// blocked ahead pulls over onto the shoulder and stops there, hazards on (see Traffic).
// An airliner (slide: m) comes down out of the sky ahead, touches down that far beyond where it
// ends up, and slides back towards the player along its lanes, wrecking everything in its path,
// before it comes to rest. And a level's "tower": the control tower beside the road where the
// route turns off (onto the runway), which collapses across the road straight on as the player
// comes up to it: only a sight, as the route has turned away.
// This is the timing and the damage; render/wreckage.js draws it, and marks where it will land.
// ============================================================================
import { CONFIG } from './config.js';
import { LEVEL } from './levels.js';
import { Track } from './track.js';
import { Player } from './player.js';
import { Traffic } from './traffic.js';
import { FxQueue, sfx } from './physics.js';
import { Game } from './game.js';

export const Wreckage = {
  tower: null, // the level's control tower: { at, trigger, t (s since it went; -1 = standing), down }
  // each of the level's: { at, kind, lanes: [first, last], from ('left' | 'right' | 'sky'), trigger,
  //   s0, s1, lat0, lat1 (where it lands), t (s since it was set off; -1 = not yet), landed }
  list: [],

  reset() {
    const W = CONFIG.wreckage, LW = CONFIG.laneWidth;
    this.tower = LEVEL.tower ? { ...LEVEL.tower, t: -1, down: false } : null;
    this.list = (LEVEL.wreckage || []).map(e => {
      const depth = W.kinds[e.kind].depth, [a, b] = e.lanes;
      return { ...e, depth, s0: e.at - depth / 2, s1: e.at + depth / 2, t: -1, landed: false, sliding: false,
        lat0: Track.laneOffset(a, e.at) - LW / 2 + 0.2, lat1: Track.laneOffset(b, e.at) + LW / 2 - 0.2 };
    });
  },
  // where it goes up: off the road on its side, or high over the road ahead
  source(e) {
    const side = e.from === 'left' ? -1 : e.from === 'sky' ? 0 : 1;
    if (e.slide) return { s: e.at + e.slide + CONFIG.wreckage.approach, lat: (e.lat0 + e.lat1) / 2 }; // (far out, on its way in)
    return side ? { s: e.at, lat: side < 0 ? Track.lo(e.at) - 40 : Track.hi(e.at) + 40 } : { s: e.at + 90, lat: (e.lat0 + e.lat1) / 2 };
  },
  // an airliner coming in: where its middle is along the road, and how high, `t` s after it was set
  // off: diving in to touch down, then sliding back to where it comes to rest (sliding: true)
  airliner(e, t) {
    const W = CONFIG.wreckage, touch = e.at + e.slide;
    if (t < W.approachTime) {
      const u = t / W.approachTime;
      return { s: touch + W.approach * (1 - u), h: W.approachHeight * (1 - u) * (1 - u * 0.3), sliding: false };
    }
    const u = Math.min(1, (t - W.approachTime) / W.slideTime);
    return { s: touch - e.slide * (1 - (1 - u) * (1 - u)), h: 0, sliding: u < 1 }; // (slowing as it goes)
  },
  // does it cover v (anything with s, lat, hl, hw), give or take `margin` m along the road?
  covers(e, v, margin = 0) {
    return v.s + v.hl > e.s0 - margin && v.s - v.hl < e.s1 + margin && v.lat + v.hw > e.lat0 && v.lat - v.hw < e.lat1;
  },
  // is the lane blocked (or about to be) at s? (nothing new turns up there, and the helicopter sets no car down there)
  blocked(lane, s) {
    const lat = Track.laneOffset(lane, s);
    return this.list.some(e => e.t >= 0 && s > e.s0 - 20 && s < e.s1 + 20 && lat > e.lat0 - 0.5 && lat < e.lat1 + 0.5);
  },
  // is a car's lane blocked somewhere ahead of it (by wreckage that has been set off)?
  ahead(car) {
    return this.list.some(e => e.t >= 0 && (e.s0 - car.s) * car.dir > 0 && (e.s0 - car.s) * car.dir < CONFIG.wreckage.lookout &&
      car.lat + car.hw > e.lat0 && car.lat - car.hw < e.lat1);
  },

  // a spread of fireballs over a stretch, s0-s1 along the road and lat0-lat1 across it (one big blast
  // would be a single fireball of oversized pieces)
  fireballs(s0, s1, lat0, lat1, count) {
    for (let k = 0; k < count; k++) {
      const u = (k + 0.5) / count;
      FxQueue.push({ type: 'explode', s: s0 + (s1 - s0) * (count > 4 ? u : Math.random()), lat: lat0 + (lat1 - lat0) * (count > 4 ? Math.random() : u),
        vs: 0, big: true, scale: 1.3, ...(k ? { sound: 'none' } : {}) });
    }
  },
  update(dt) {
    const W = CONFIG.wreckage, T = this.tower;
    // the control tower: it goes as the player comes up to the turn, and comes crashing down
    if (T && T.t < 0 && Player.s >= T.at - T.trigger) {
      T.t = 0;
      sfx('explodeBig'); // (its fireballs are out by the old road, off the route: render/wreckage.js draws them)
    }
    if (T && T.t >= 0) {
      T.t += dt;
      if (!T.down && T.t >= W.towerFall) {
        T.down = true;
        sfx('explodeBig');
        Game.shake = 1;
      }
    }
    for (const e of this.list) {
      if (e.t < 0) {
        if (Player.s < e.at - (e.trigger ?? W.trigger)) continue;
        e.t = 0; // set off: up it goes, in a fireball
        const from = this.source(e);
        this.fireballs(from.s, from.s, from.lat - 3, from.lat + 3, 3);
      }
      e.t += dt;
      if (e.slide) { // an airliner: diving in, then sliding along its lanes (wrecking all in its path) to rest
        const at = this.airliner(e, e.t);
        e.s0 = at.s - e.depth / 2;
        e.s1 = at.s + e.depth / 2;
        e.sliding = at.sliding;
        if (e.t >= W.approachTime && e.t - dt < W.approachTime) { // touchdown
          this.fireballs(at.s - e.depth / 2, at.s + e.depth / 2, e.lat0, e.lat1, 7);
          if (Math.abs(at.s - Player.s) < 200) Game.shake = 1;
        }
        e.landed = e.t >= W.approachTime;
      }
      if (!e.slide && !e.landed && e.t >= W.flight) { // down it comes, blowing up whatever is there
        e.landed = true;
        this.fireballs(e.s0, e.s1, e.lat0, e.lat1, 4);
        if (Math.abs(e.at - Player.s) < 120) Game.shake = 1;
      }
      if (!e.landed) continue;
      // landed, it wrecks whatever is in it, or runs into it (a little more than it covers, as it lands)
      const margin = e.t < W.flight + 0.3 || e.sliding ? W.blast : 0;
      for (const car of Traffic.cars) {
        if (car.active && !car.junction && car.health > 0 && this.covers(e, car, margin)) car.health = 0; // (it blows up: Collision.check)
      }
      if (!Player.active || Player.shield > 0 || Player.health <= 0 || !this.covers(e, Player, margin)) continue;
      if (Player.ghost > 0) Player.ghost = Math.max(Player.ghost, 0.2); // (a ghost comes through, kept one until it is clear)
      else Player.health = 0;
    }
  },
};
