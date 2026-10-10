// ============================================================================
// GAMBLES - Gimmick Road 3's gimmicks (see levels.js and CONFIG, each under its own name): things the
// road does that the player can take a risk on, or not. None stops the car and none busts it: each has a
// fast line that pays when it is driven right and costs when it is not, and a slow line that always works.
//   crosswinds   a wind across an exposed stretch: tall cars are pushed harder, a tall vehicle gives shelter
// What each does is here; render/gambles.js draws it. Like Hazards, this runs after the player's own update
// (Game.update) and puts its hand on the car there: Player itself knows nothing of it.
// ============================================================================
import { CONFIG } from './config.js';
import { LEVEL } from './levels.js';
import { Track } from './track.js';
import { Player } from './player.js';
import { Traffic } from './traffic.js';
import { Message } from './messages.js';
import { sfx } from './physics.js';
import { Game } from './game.js';

const clamp01 = (u) => Math.max(0, Math.min(1, u));

export const Gambles = {
  winds: [],      // { from, to, dir (-1: it blows to the left, 1: to the right), strength, every, length }
  lee: null,      // the vehicle the player is sheltered by, in a crosswind (null: none)
  windNow: 0,     // m/s^2 the wind is pushing the player's car sideways just now (signed; 0 out of the wind): for the drawing
  said: {},       // what has been said this run, once each

  // the level's lists (as a level loads, for the drawing, and again as each run starts)
  build() {
    const W = CONFIG.crosswind;
    this.winds = (LEVEL.crosswinds || []).map(w => ({ from: w.from, to: w.to, dir: w.dir === 'left' ? -1 : 1,
      strength: w.strength ?? W.strength, every: w.every ?? W.every, length: w.length ?? W.length }));
  },
  reset() {
    this.build();
    this.lee = null;
    this.windNow = 0;
    this.said = {};
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

  update(dt) {
    if (Traffic.frozen) return; // (TRAFFIC FREEZE, a mystery: everything here stands still too)
    this.updateWinds(dt);
  },
};
