// ============================================================================
// BURST WATER MAINS - a level's "waterMains" (see levels.js and CONFIG.waterMain): a main under the
// road at s (in a lane, or on the centre line) that has burst. Now and then it sprays: a geyser up
// out of the road for a few seconds, and while it does (and for a little after, as the water drains),
// the road around it is as slippery as ice (a slick: see Track.icy). Each goes off in its own time, every
// so often; the player coming up to one that is spraying is warned. This is the timing and the
// slicks; render/watermains.js draws the water.
// ============================================================================
import { CONFIG } from './config.js';
import { LEVEL } from './levels.js';
import { Track } from './track.js';
import { Player } from './player.js';
import { Message } from './messages.js';
import { sfxAt } from './physics.js';

const between = (range) => typeof range === 'number' ? range : (range?.min ?? 6) + Math.random() * ((range?.max ?? 11) - (range?.min ?? 6));

export const WaterMains = {
  list: [], // { s, lat, wait (s to the next burst, or left of this one), on (spraying), wet (s the road stays slippery after), slick, warned }

  reset() {
    const W = CONFIG.waterMain;
    this.list = (LEVEL.waterMains || []).map((m) => {
      const s = Track.place(m), lat = m.lane === undefined ? 0 : Track.laneOffset(m.lane, s);
      const everyRange = m.every || W?.every || { min: 6, max: 11 };
      return { s, lat, every: everyRange, wait: between(everyRange) * Math.random(), on: false, wet: 0, slick: null, warned: false };
    });
    Track.slicks.length = 0;
  },
  // how far the water has spread on the road (0 .. 1), for the drawing: out over `spread` s as the main
  // starts to spray, and back in as it drains
  spread(m) {
    const W = CONFIG.waterMain;
    return m.on ? Math.min(1, 0.2 + (W.spray - m.wait) / W.spread) : Math.sqrt(Math.max(0, m.wet / W.drain));
  },
  // how much of the geyser is up at the main (0 .. 1), for the drawing
  jet(m) { return m.on ? Math.min(1, m.wait / 0.6, (CONFIG.waterMain.spray - m.wait) / 0.4 + 1) : 0; },

  update(dt) {
    if (!this.list.length) return;
    const W = CONFIG.waterMain;
    for (const m of this.list) {
      m.wait -= dt;
      if (m.wait <= 0) {
        m.on = !m.on;
        m.wait = m.on ? W.spray : between(m.every);
        if (m.on) {
          m.wet = W.spray + W.drain;
          m.warned = false;
          if (Math.abs(m.s - Player.s) < 300) sfxAt('waterMain', m.s, 0.8);
        }
      }
      m.wet = Math.max(0, m.wet - dt);
      // the slick: on the road while the water is about, and gone once it has drained
      if (m.wet > 0 && !m.slick) {
        m.slick = { from: m.s - W.radius, to: m.s + W.radius, lat: m.lat, half: W.half, water: true };
        Track.slicks.push(m.slick);
      } else if (m.wet <= 0 && m.slick) {
        Track.slicks.splice(Track.slicks.indexOf(m.slick), 1);
        m.slick = null;
      }
      // the warning, coming up to one spraying
      if (m.on && !m.warned && Player.active && m.s - Player.s > 0 && m.s - Player.s < W.warn) {
        m.warned = true;
        Message.say('events', 'waterMain');
      }
    }
  },
};
