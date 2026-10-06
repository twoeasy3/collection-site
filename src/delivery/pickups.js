import { CONFIG } from './config.js';
import { LEVEL } from './levels.js';
import { Track } from './track.js';
import { Player } from './player.js';
import { sfx } from './physics.js';
import { Message } from './messages.js';

// ============================================================================
// PICKUPS - fixed positions on the track, collected by driving through them.
// The lists are filled by load() when a level is loaded (see Game.load). A level with a tide that
// washes things up (see Tide.washUp) also gets a pool of washed-up ones, a few of each type it
// can wash up, hidden (taken) until a wave puts one somewhere.
// ============================================================================
export const Pickups = (() => {
  const items = [];

  const load = () => {
    items.length = 0;
    for (const p of LEVEL.pickups || []) {
      const s = Track.place(p);
      items.push({ type: p.type, s, lat: Track.laneOffset(p.lane, s), taken: false });
    }
    for (const type of Object.keys(LEVEL.tide?.washUp?.types || {})) {
      for (let i = 0; i < CONFIG.tide.washedEach; i++) items.push({ type, s: 0, lat: 0, taken: true, washed: true });
    }
  };

  const reset = () => {
    for (const p of items) {
      p.taken = !!p.washed;
      p.pending = false;
    }
  };
  // a washed-up pickup of that type that isn't in use (one already behind the player will do), or null
  const washed = (type) => items.find(p => p.washed && !p.pending && p.type === type && (p.taken || p.s < Player.s - 60)) || null;

  const update = () => {
    if (!Player.active) return;
    for (const p of items) {
      if (p.taken || Math.abs(p.s - Player.s) > Player.hl + 1 ||
          Math.abs(p.lat - Player.lat) > Player.hw + 1) continue;
      p.taken = true;
      Player.collect(p.type);
      Message.say('powerups', p.type);
      sfx(p.type); // (each type has a sound of its own)
    }
  };

  return { items, load, reset, update, washed };
})();

// TANK RAGE targets: fixed spots beside the road, out of the car's reach but not a package's
export const Targets = (() => {
  const items = [];
  const load = () => {
    items.length = 0;
    for (const t of LEVEL.targets || []) {
      const s = Track.place(t);
      const lat = t.side === 'left' ? Track.lo(s) - CONFIG.targetOffset : Track.hi(s) + CONFIG.targetOffset;
      items.push({ s, lat, vs: 0, latVel: 0, height: 2, used: false });
    }
  };
  const reset = () => { for (const t of items) t.used = false; };
  return { items, load, reset };
})();
