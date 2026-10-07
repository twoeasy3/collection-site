// ============================================================================
// GUNFIRE - a level's gang war (The Hood: see levels.js "gunfire" and CONFIG.gunfire). In its stretches
// of turf, bursts of fire come from the houses beside the road, mostly at the player; a drive-by car
// (see Traffic) fires out of its window at whoever it has pulled up beside. Every bullet flies straight
// and stops in the first vehicle in its way (so a car between the player and the shooter is a shield),
// doing a little damage, and now and then puncturing a tyre: traffic pulls over onto the shoulder and
// stops; the player limps on (see Player.puncture) until it stops to change it.
// This is the shooting; render/gunfire.js draws the tracers and the muzzle flashes.
// ============================================================================
import { CONFIG } from './config.js';
import { LEVEL } from './levels.js';
import { Track } from './track.js';
import { Player } from './player.js';
import { Collision } from './collision.js';
import { hurt, sfxAt } from './physics.js';
import { Message } from './messages.js';

const between = (range) => range.min + Math.random() * (range.max - range.min);

// The suburb's lots (see render/road.js: the suburb scenery), the same every run: on each side, one
// every LOT m, and on most a house; where its front windows are, m out from the road's edge, or null
// for a little park. (A lot's odds come from its side and number, so the scenery and the shooters agree)
export const LOT = 26;
const lotRand = (side, k, salt) => {
  let x = Math.imul(k * 2654435761 + (side > 0 ? 97 : 31) + salt * 7919, 0x45d9f3b) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
};
export const houseAt = (side, k) => {
  if (lotRand(side, k, 1) < 0.12) return null; // (a little park)
  const s = Track.start + (side > 0 ? 0 : LOT / 2) + k * LOT + LOT / 2;
  return { s, front: 9 + lotRand(side, k, 2) * 3, along: 9 + lotRand(side, k, 3) * 4, across: 8 + lotRand(side, k, 4) * 3, tall: lotRand(side, k, 5) < 0.4 };
};

export const Gunfire = {
  bullets: [],  // { s, lat, y, vs, vl, vy, life, owner, s0, lat0, y0 }
  flashes: [],  // muzzle flashes: { s, lat, y, t }
  bursts: [],   // a house's burst under way: { s, lat, y, target, left, wait }
  wait: 0,      // s to the next burst from a house
  zone: null,   // the stretch of turf the player is in

  reset() {
    this.bullets.length = 0;
    this.flashes.length = 0;
    this.bursts.length = 0;
    this.wait = between(CONFIG.gunfire.every);
    this.zone = null;
  },

  // one shot from (s, lat, y) at a vehicle, led for its speed, a little off true
  shoot(from, target, owner) {
    const G = CONFIG.gunfire;
    const tv = target.isPlayer ? Player.speed * Player.dir : target.vs;
    const far = Math.hypot(target.s - from.s, target.lat - from.lat);
    const flight = far / G.speed;
    const aimS = target.s + tv * flight + (Math.random() - 0.5) * 2 * G.spread;
    const aimLat = target.lat + (Math.random() - 0.5) * 2 * G.spread;
    const aimY = 0.7 + Math.random() * 0.5;
    const ds = aimS - from.s, dl = aimLat - from.lat, dy = aimY - from.y, len = Math.hypot(ds, dl, dy) || 1;
    this.bullets.push({ s: from.s, lat: from.lat, y: from.y, vs: ds / len * G.speed, vl: dl / len * G.speed, vy: dy / len * G.speed,
      life: G.range / G.speed, owner, s0: from.s, lat0: from.lat, y0: from.y });
    this.flashes.push({ s: from.s, lat: from.lat, y: from.y, t: G.flashTime });
    sfxAt('gunshot', from.s, 0.7);
  },

  // a vehicle a bullet has stopped in: a little damage, and perhaps a puncture
  hit(v) {
    const G = CONFIG.gunfire;
    if (v.isPlayer) {
      if (Player.shield > 0 || Player.ghost > 0) return false; // (it passes through: see the shield after a respawn, and the ghost)
      if (Player.tank <= 0) hurt(Player, G.damage);
      if (Player.tank <= 0 && Math.random() < G.puncture) Player.punctureTyre(Math.random() < 0.5 ? -1 : 1);
    } else {
      hurt(v, G.damage);
      v.showMood = true;
      if (!v.courier && !v.racer && !CONFIG.vehicles[v.kind]?.noWheels && Math.random() < G.puncture) v.punctured = true; // (nothing without tyres)
    }
    return true;
  },

  update(dt) {
    const G = CONFIG.gunfire;
    // the turf: where the houses shoot (and the player is told so, on coming into it)
    const zone = Player.active ? (LEVEL.gunfire || []).find(z => Player.s >= z.from && Player.s <= z.to) || null : null;
    if (zone && zone !== this.zone) Message.say('events', 'turf');
    this.zone = zone;
    // a burst from a house, now and then, at the player (or the car it can see best, nearer the house)
    if (zone && (this.wait -= dt) <= 0) {
      this.wait = between(zone.every || G.every);
      const spots = [];
      for (const side of [-1, 1]) {
        const k0 = Math.floor((Player.s + G.near.min - Track.start - (side > 0 ? 0 : LOT / 2)) / LOT);
        const k1 = Math.floor((Player.s + G.near.max - Track.start - (side > 0 ? 0 : LOT / 2)) / LOT);
        for (let k = k0; k <= k1; k++) {
          const house = houseAt(side, k);
          if (house && house.s > zone.from && house.s < zone.to) spots.push({ side, house });
        }
      }
      if (spots.length) {
        const { side, house } = spots[Math.floor(Math.random() * spots.length)];
        const lat = side < 0 ? Track.lo(house.s) - house.front : Track.hi(house.s) + house.front;
        this.bursts.push({ s: house.s, lat, y: house.tall && Math.random() < 0.5 ? 4.4 : 1.6, left: Math.round(between(G.shots)), wait: 0 });
      }
    }
    for (const b of this.bursts) {
      if ((b.wait -= dt) > 0 || b.left <= 0) continue;
      b.wait = G.shotGap;
      b.left--;
      if (Player.active) this.shoot(b, Player, null);
    }
    this.bursts = this.bursts.filter(b => b.left > 0);
    // the bullets: straight on until they stop in something, or are spent
    const bodies = Collision.bodies;
    for (const p of this.bullets) {
      p.s += p.vs * dt;
      p.lat += p.vl * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.y < 0) p.life = 0; // (into the road)
      if (p.life <= 0) continue;
      for (const v of bodies) {
        if (!v.active || v === p.owner || v.junction || p.y > v.height + 0.2) continue;
        if (Math.abs(v.s - p.s) > v.hl || Math.abs(v.lat - p.lat) > v.hw) continue;
        if (this.hit(v)) { p.life = 0; break; }
      }
    }
    this.bullets = this.bullets.filter(p => p.life > 0);
    for (const f of this.flashes) f.t -= dt;
    this.flashes = this.flashes.filter(f => f.t > 0);
  },
};
