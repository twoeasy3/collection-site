// ============================================================================
// LEVEL CROSSINGS - a level's "crossings" (see levels.js and CONFIG.crossing): a railway line
// across the road. As the player comes within trigger m of one (and every so often after that,
// while the player hasn't gone by), its lights flash and its bell rings, its booms come down
// across the lanes coming up to it (one each side, at its stop lines), and a short, fast train
// shoots across the road. Traffic waits at the booms (one too close to stop carries on over);
// whatever is on the line as the train goes by is wrecked, the player's car included (but for a
// ghost). The player can't stop, so it is a matter of easing off to arrive after the train, or
// getting over first; a boom down is no barrier to that, only a knock (and it breaks).
// This is what they do; render/crossing.js draws them.
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
const box = { s: 0, lat: 0, yaw: Math.PI / 2, hl: 0, hw: 0 }; // a carriage, lying across the road
const clamp01 = (u) => Math.max(0, Math.min(1, u));

export const Crossings = {
  // { s, trigger, every, state: 'idle' | 'warn' | 'train' | 'raise', t, triggered, next, dir (the way
  //   the train goes across: 1 = towards +lat), train (lat of its nose), broken: [ours, theirs], bell }
  list: [],

  reset() {
    const C = CONFIG.crossing;
    this.list = (LEVEL.crossings || []).map(c => ({ s: Track.place(c), trigger: c.trigger ?? C.trigger, every: c.every || C.every,
      state: 'idle', t: 0, triggered: false, next: 0, dir: 1, train: 0, broken: [false, false], bell: 0 }));
  },
  // how far down its booms are, 0 (up) .. 1 (down across the road)
  lowered(c) {
    const C = CONFIG.crossing;
    return c.state === 'warn' ? clamp01(c.t / C.lower) : c.state === 'train' ? 1 : c.state === 'raise' ? 1 - clamp01(c.t / C.raise) : 0;
  },
  flashing: (c) => c.state === 'warn' || c.state === 'train',
  get trainLength() { return CONFIG.crossing.cars * CONFIG.crossing.carLength; },
  // the boom going way dir comes to: where it stands (s), and across which lats
  boom(c, dir) {
    const s = c.s - dir * CONFIG.crossing.stopLine;
    return dir > 0 ? { s, lo: 0, hi: Track.laneHi(s) } : { s, lo: Track.laneLo(s), hi: 0 };
  },
  // carriage i's middle (lat), the nose's first
  carriage(c, i) { return c.train - c.dir * (i + 0.5) * CONFIG.crossing.carLength; },

  // how fast a traffic car may go, coming up to a crossing with its lights flashing: it stops at
  // its stop line (one already too close to stop goes on over)
  holdFor(car) {
    let most = Infinity;
    for (const c of this.list) {
      if (!this.flashing(c)) continue;
      const line = c.s - car.dir * (CONFIG.crossing.stopLine + 1.5 + car.hl);
      const d = (line - car.s) * car.dir;
      if (d < -0.5 || d > 80) continue;
      if (c.state === 'warn' && c.t < 0.3 && car.vs * car.vs / (2 * CONFIG.junction.stopping) > d + 4) continue; // (too close to stop)
      most = Math.min(most, Math.sqrt(2 * CONFIG.junction.stopping * Math.max(0, d - 0.5)));
    }
    return most;
  },

  start(c) {
    c.state = 'warn';
    c.t = 0;
    c.dir = Math.random() < 0.5 ? 1 : -1;
    c.broken = [false, false];
    if (!c.triggered) Message.say('events', 'crossing');
    c.triggered = true;
  },

  update(dt) {
    const C = CONFIG.crossing;
    for (const c of this.list) {
      c.t += dt;
      const ahead = c.s - Player.s; // (how far the player has still to go to it)
      if (c.state === 'idle') {
        c.next -= dt;
        if (Player.active && ahead > 0 && ((!c.triggered && ahead < c.trigger) || (c.triggered && c.next <= 0 && ahead < C.reach * 4))) this.start(c);
      } else if (c.state === 'warn') {
        if (c.t >= C.warn) {
          c.state = 'train';
          c.t = 0;
          c.train = -c.dir * C.reach;
          sfxAt('trainPass', c.s);
        }
      } else if (c.state === 'train') {
        c.train += c.dir * C.speed * dt;
        this.hit(c);
        if ((c.train - c.dir * this.trainLength) * c.dir > C.reach) {
          c.state = 'raise';
          c.t = 0;
        }
      } else if (c.state === 'raise' && c.t >= C.raise) {
        c.state = 'idle';
        c.next = between(c.every);
      }
      // the bell, while the lights flash (only near the player)
      if (this.flashing(c) && (c.bell -= dt) <= 0) {
        c.bell = 0.5;
        if (Math.abs(ahead) < 300) sfxAt('bell', c.s, 1);
      }
      // a boom down: driving through it breaks it (a knock, no more)
      if (this.lowered(c) > 0.5 && Player.active && Player.shield <= 0 && Player.ghost <= 0) {
        [1, -1].forEach((dir, k) => {
          if (c.broken[k]) return;
          const b = this.boom(c, dir);
          if (Math.abs(Player.s - b.s) > Player.hl + 0.15 || Player.lat + Player.hw < b.lo || Player.lat - Player.hw > b.hi) return;
          c.broken[k] = true;
          if (Player.tank <= 0) {
            hurt(Player, C.boomDamage);
            Player.speed *= C.boomKept;
          }
          Game.shake = Math.max(Game.shake, 0.4);
          sfx('crash', 0.7);
        });
      }
    }
  },

  // the train wrecks whatever is on the line
  hit(c) {
    const C = CONFIG.crossing;
    box.s = c.s;
    box.hl = C.carLength / 2;
    box.hw = C.hw;
    for (let i = 0; i < C.cars; i++) {
      box.lat = this.carriage(c, i);
      for (const car of Traffic.cars) {
        if (car.active && !car.junction && car.health > 0 && Math.abs(car.s - c.s) < car.hl + C.hw + 1 && Collision.overlap(box, car)) car.health = 0;
      }
      if (!Player.active || Player.shield > 0 || Player.health <= 0 || Math.abs(Player.s - c.s) > Player.hl + C.hw + 1 || !Collision.overlap(box, Player)) continue;
      if (Player.ghost > 0) Player.ghost = Math.max(Player.ghost, 0.2);
      else Player.health = 0; // (wrecked: see Collision.check)
    }
  },
};
