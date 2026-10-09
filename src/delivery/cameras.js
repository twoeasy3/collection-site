// ============================================================================
// SPEED CAMERAS - a level's "cameras" (see levels.js and CONFIG.speedCamera): each stands on its
// pole on a shoulder or on the centre line (an obstacle: see Collision). The player passing one
// faster than its limit is caught: the first time in a run it is a fine, taken off what the run
// banks (Game.fines); every time after that, a bust. Running one over is no offence: it is gone,
// and so is its film. A radar detector keeps the car from being caught at all, and nobody fines a tank.
// This is what they do; render/cameras.js draws the flash.
// ============================================================================
import { CONFIG } from './config.js';
import { LEVEL } from './levels.js';
import { Track } from './track.js';
import { Player } from './player.js';
import { Collision } from './collision.js';
import { Message } from './messages.js';
import { sfx } from './physics.js';
import { Game } from './game.js';

export const SpeedCameras = {
  // { s, limit (m/s), obstacle, passed, flash (s left of its flash) }
  list: [],
  caught: 0, // offences this run
  lastS: 0,  // where the player was last step (to see it pass a camera)

  reset() {
    const C = CONFIG.speedCamera;
    this.list = (LEVEL.cameras || []).map((c, i) => ({
      s: Track.place(c), limit: (c.limit ?? LEVEL.speedLimit ?? C.limit) / 3.6,
      obstacle: Collision.obstacles.find(o => o.camera === i), passed: false, warned: false, flash: 0,
    }));
    this.caught = 0;
    this.lastS = Player.s;
    // average-speed cameras (a level's "averageCameras"): { from, to, limit (m/s), t (s since the first gantry; -1 = not in it), flash }
    this.zones = (LEVEL.averageCameras || []).map(z => {
      const from = Track.place({ s: z.from, road: z.road, exit: z.exit });
      return { from, to: from + (z.to - z.from), limit: (z.limit ?? CONFIG.averageSpeed.limit) / 3.6, t: -1, flash: 0 };
    });
  },
  zones: [],
  // caught: the first time in a run a fine (by how far over, km/h), every time after it a bust
  offence(over, say) {
    sfx('camera');
    this.caught++;
    if (this.caught > 1) { Player.bust('speeding'); return; }
    const fine = this.fineFor(over);
    Game.fines += fine;
    say(fine);
  },
  // timed from one gantry to the next: over the limit on average, and it is an offence at the second
  updateZones(dt, from, to) {
    for (const z of this.zones) {
      z.flash = Math.max(0, z.flash - dt);
      if (z.t >= 0) z.t += dt;
      if (from < z.from && to >= z.from) {
        z.t = 0;
        const line = Message.say('events', 'averageStart');
        if (line) line.text = line.text.replace('${limit}', Math.round(z.limit * 3.6)).replace('${length}', Math.round(z.to - z.from));
      }
      if (z.t < 0 || !(from < z.to && to >= z.to)) continue;
      const average = (z.to - z.from) / Math.max(z.t, 0.01), kmh = Math.round(average * 3.6), limit = Math.round(z.limit * 3.6);
      z.t = -1;
      if (average <= z.limit || Player.radar > 0 || Player.tank > 0) {
        const line = Message.say('events', 'averageOk');
        if (line) line.text = line.text.replace('${speed}', kmh);
        continue;
      }
      z.flash = CONFIG.speedCamera.flash;
      this.offence((average - z.limit) * 3.6, (fine) => {
        const line = Message.say('events', 'averageFine');
        if (line) line.text = line.text.replace('${speed}', kmh).replace('${limit}', limit).replace('${fine}', '$' + fine);
      });
    }
  },

  update(dt) {
    for (const cam of this.list) cam.flash = Math.max(0, cam.flash - dt);
    const from = this.lastS, to = Player.s;
    this.lastS = to;
    if (!Player.active || Game.state !== 'playing' || to - from > 30) return; // (not a car set down further on)
    this.updateZones(dt, from, to);
    // a warning of one coming up, radar detector or not (CONFIG.speedCamera.warn): the limit, and how fast the car is going
    for (const cam of this.list) {
      if (cam.warned || cam.passed || cam.obstacle?.gone || cam.s - to > CONFIG.speedCamera.warn || cam.s < to) continue;
      cam.warned = true;
      const line = Message.say('events', 'speedCameraAhead');
      if (line) line.text = line.text.replace('${limit}', Math.round(cam.limit * 3.6));
    }
    for (const cam of this.list) {
      if (cam.passed || !(from < cam.s && to >= cam.s)) continue;
      cam.passed = true;
      if (cam.obstacle?.gone) continue; // (run over: no camera, no offence)
      if (Player.speed <= cam.limit || Player.radar > 0 || Player.tank > 0) continue;
      cam.flash = CONFIG.speedCamera.flash;
      sfx('camera');
      this.caught++;
      const kmh = Math.round(Player.speed * 3.6), limit = Math.round(cam.limit * 3.6);
      if (this.caught === 1) {
        const fine = this.fineFor((Player.speed - cam.limit) * 3.6);
        Game.fines += fine;
        const line = Message.say('events', 'speedFine');
        if (line) line.text = line.text.replace('${speed}', kmh).replace('${limit}', limit).replace('${fine}', '$' + fine);
      } else Player.bust('speeding');
    }
  },
  // the fine for being `over` km/h over the limit: the step it reached (CONFIG.speedCamera.fines)
  fineFor(over) {
    let fine = 0;
    for (const step of CONFIG.speedCamera.fines) if (over > step.over) fine = step.fine;
    return fine;
  },
  // the brightest flash going just now, 0..1 (for the screen's flash)
  get flash() { return Math.max(0, ...this.list.map(c => c.flash), ...this.zones.map(z => z.flash)) / CONFIG.speedCamera.flash; },
};
