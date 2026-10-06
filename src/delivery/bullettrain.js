// ============================================================================
// BULLET TRAIN - one of the mystery pickup's effects. A bullet train turns up the road in the
// player's lane, where new traffic turns up, and comes straight down that lane the wrong way,
// far faster than anything else, reaching where the player was about CONFIG.bulletTrain.warning
// seconds later. Whatever any part of it touches is destroyed: traffic, obstacles, and the
// player's car, outright (like the bridge structure), nose on or steered into its side. It
// keeps to its lane, following it where the road narrows, and is gone once it is well past.
// This is the movement and the damage; render/bullettrain.js draws it.
// ============================================================================
import { CONFIG } from './config.js';
import { Track } from './track.js';
import { Player } from './player.js';
import { Traffic } from './traffic.js';
import { Collision } from './collision.js';
import { FxQueue, sfx } from './physics.js';

const box = { s: 0, lat: 0, yaw: 0, hl: 0, hw: 0 }; // one carriage's hitbox, for Collision.overlap

export const BulletTrain = {
  active: false,
  s: 0,          // where its nose is; the carriages trail behind it, up the road (higher s)
  lane: 0,       // the lane it keeps to: the player's when it was set off
  end: 0,        // the s at which its road runs out
  passed: false, // its nose has gone by the player
  get length() { return CONFIG.bulletTrain.cars * CONFIG.bulletTrain.carLength; },
  // where carriage i is (0 = the nose's), into `out` ({ s, lat })
  carriage(i, out) {
    out.s = this.s + (i + 0.5) * CONFIG.bulletTrain.carLength;
    out.lat = Track.laneOffset(Track.openLane(this.lane, out.s), out.s);
    return out;
  },
  start() {
    const T = CONFIG.bulletTrain;
    this.lane = Track.nearestLane(Player.lat, Player.s);
    // as far up the player's road as it covers in the warning time, closing on the player
    // (or as far as that road goes)
    const side = Track.isMain(Player.s) ? null : Track.exits.find(x => Player.s >= x.side0 && Player.s <= x.sideEnd);
    const last = side ? side.sideEnd - 5 : Track.end - 20;
    this.s = Math.min(last, Player.s + (T.speed + Math.max(0, Player.speed)) * T.warning);
    this.end = side ? side.side0 : Track.start;
    this.active = true;
    this.passed = false;
    sfx('trainHorn');
  },
  reset() {
    this.active = false;
  },
  update(dt) {
    if (!this.active) return;
    const T = CONFIG.bulletTrain;
    this.s -= T.speed * dt;
    if (!this.passed && this.s < Player.s) {
      this.passed = true;
      sfx('trainPass');
    }
    // gone once its tail is well behind the player, or its road has run out
    if (this.s < this.end || Track.along(this.s + this.length) < Track.along(Player.s) - CONFIG.despawnBehind) {
      this.active = false;
      return;
    }
    box.hl = T.carLength / 2;
    box.hw = T.hw;
    for (let i = 0; i < T.cars; i++) {
      this.carriage(i, box);
      const near = (o) => Math.abs(o.s - box.s) < box.hl + 12 && Math.abs(o.lat - box.lat) < box.hw + 6;
      for (const car of Traffic.cars) {
        if (car.active && car.health > 0 && near(car) && Collision.overlap(box, car)) car.health = 0; // (it blows up: Collision.check)
      }
      for (const o of Collision.obstacles) {
        if (o.gone || !near(o) || (o.kind === 'asteroid' && o.h - o.r > T.height)) continue;
        if (!Collision.overlap(box, o)) continue;
        o.gone = true;
        FxQueue.push({ type: 'explode', s: o.s, lat: o.lat, vs: -T.speed * 0.2, big: false });
      }
      // the player's car is wrecked outright, whatever it is: only a freshly dropped one is spared
      if (Player.active && Player.shield <= 0 && Player.health > 0 && near(Player) && Collision.overlap(box, Player)) Player.health = 0;
    }
  },
};
