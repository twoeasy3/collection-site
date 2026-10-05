import { CONFIG } from './config.js';
import { LEVEL } from './levels.js';
import { CAR } from './cars.js';
import { clamp, damp } from './util.js';
import { Track } from './track.js';
import { updateYaw, keepOnRoad, sfx } from './physics.js';
import { Traffic } from './traffic.js';
import { Message } from './messages.js';
import { UfoStrike } from './ufostrike.js';

export const Player = {
  isPlayer: true, active: true, dir: 1, bound: 'north', mass: 1,
  evil: false,         // the player is one of the good ones: its packages are gifts
  shield: 0,           // s of invulnerability left after a helicopter drop
  launching: true,     // pulling away to startSpeed on its own
  braking: false,      // braking hard by itself for a car ahead (the tyres squeal as it starts)
  turbo: 0,            // s of turbocharger left
  ghost: 0,            // s of passing through cars and barriers left
  passenger: 0,        // s of legal shoulder driving left
  mystery: '',         // the mystery effect running (see startMystery), '' = none...
  mysteryTime: 0,      // ...and s of it left
  nextMystery: '',     // the effect the next mystery will be, if not left to chance (?mystery= in the URL)
  tank: 0,             // 1 once TANK RAGE has started; it lasts for the rest of the level
  danger: CONFIG.dangerTime, // s of shoulder driving left before the police come
  busted: false,
  bustReason: '',      // why the police are after the car: shoulder | seen | assault | assaultCop | bump
  onShoulder: false,   // illegally on the shoulder right now
  camShift: 0,         // lat jump from changing road, for the camera to follow at once
  s: 0, lat: 0, latVel: 0, yaw: 0, yawVel: 0, stun: 0,
  speed: 0,
  health: CAR.health, maxHealth: CAR.health, smoke: 0, // (top speed, acceleration and health are the car's: see cars.js)
  hw: CAR.hw, hl: CAR.hl, height: CAR.height, // hitbox half width / half length, body height
  get vs() { return this.speed; },
  set vs(v) { this.speed = v; },

  reset() {
    // take on whichever car is in use now: it may have been swapped in the garage
    this.maxHealth = CAR.health;
    this.hw = CAR.hw;
    this.hl = CAR.hl;
    this.height = CAR.height;
    this.s = 0;
    this.lat = Track.laneOffset(Track.lanesEachWay, 0); // first lane going our way
    this.respawn();
    this.shield = 0;
    this.tank = CAR.tank ? 1 : 0; // the Tank from the garage is in TANK RAGE all the time
  },
  // wrecked: pick where the new car lands, never in an oncoming lane
  prepareDrop() {
    const [first, last] = Track.laneRange(1, this.s);
    const lane = clamp(Track.nearestLane(this.lat, this.s), first, last);
    this.lat = Track.laneOffset(lane, this.s);
  },
  // a fresh car at a standstill (the helicopter has just set it down)
  respawn(keepHealth) {
    this.active = true;
    this.danger = CONFIG.dangerTime;
    this.busted = false;
    this.speed = 0;
    this.launching = true;
    this.turbo = 0;
    this.ghost = 0;
    this.passenger = 0;
    this.endMystery();
    this.latVel = 0;
    this.yaw = 0;
    this.yawVel = 0;
    this.stun = 0;
    if (!keepHealth) this.health = this.maxHealth;
    this.smoke = 0;
    this.shield = CONFIG.respawnShield;
  },
  bust(reason) {
    if (this.busted || this.tank > 0) return; // nobody busts a tank
    this.busted = true;
    this.bustReason = reason;
    Message.say('busts', reason);
  },
  // TANK RAGE: fully repaired, wrecks what it touches, fires a cannon (see Collision, Packages)
  startTank() {
    this.tank = 1;
    this.health = this.maxHealth;
  },
  collect(type) {
    if (type === 'wrench') {
      this.health = Math.min(this.maxHealth, this.health + this.maxHealth * CONFIG.wrenchRepair);
      return;
    }
    // one powerup at a time: a new one cuts short whichever is running
    // (a ghost is let go of gently: it stays see-through until it is clear of every car)
    this.turbo = 0;
    this.passenger = 0;
    this.ghost = Math.min(this.ghost, 0.01);
    this.endMystery();
    if (type === 'turbo') this.turbo = CONFIG.turboTime;
    else if (type === 'ghost') this.ghost = CONFIG.ghostTime;
    else if (type === 'passenger') this.passenger = CONFIG.passengerTime;
    else if (type === 'mystery') this.startMystery();
  },
  // s left of the powerup that is running (0 = none)
  get powerLeft() { return Math.max(this.turbo, this.ghost, this.passenger, this.mysteryTime); },
  // the mystery pickup: a random effect. Most last CONFIG.mystery.time; the insurance ones
  // and the UFO air strike are over at once (the strike's show goes on by itself: UfoStrike)
  startMystery() {
    const { effects, time } = CONFIG.mystery;
    const effect = effects.find(e => e.toLowerCase() === this.nextMystery.toLowerCase()) || // (?mystery=UFO works too)
      effects[Math.floor(Math.random() * effects.length)];
    Message.say('powerups', 'mystery', effect);
    if (effect === 'ufo') UfoStrike.start();
    if (effect === 'ufo' || effect.startsWith('insurance')) return;
    this.mystery = effect;
    this.mysteryTime = time;
    if (effect === 'toad') Traffic.toadify(true);
    if (effect === 'angel' || effect === 'jerk') for (const car of Traffic.cars) car.showMood = true; // (moods: see Traffic)
  },
  endMystery() {
    if (this.mystery === 'toad') Traffic.toadify(false);
    this.mystery = '';
    this.mysteryTime = 0;
  },
  // how much of any damage the car takes (see hurt): none while invincible, more while rickety
  get damageScale() {
    return this.mystery === 'invincible' ? 0 : this.mystery === 'rickety' ? CONFIG.mystery.rickety : 1;
  },
  // nearest slower car in our path that we are closing on too fast, if any
  carAhead() {
    if (this.ghost > 0 || this.tank > 0) return null; // a ghost drives through, a tank ploughs through
    let lead = null, leadGap = Infinity;
    for (const car of Traffic.cars) {
      if (!car.active || car.dir < 0) continue; // braking won't save you from oncoming cars
      const gap = car.s - this.s - car.hl - this.hl;
      const closing = this.speed - car.vs;
      if (gap < -1 || closing <= 0 || gap > leadGap) continue;
      if (Math.abs(car.lat - this.lat) > car.hw + this.hw + 0.2) continue;
      if (gap < CONFIG.autoBrakeGap + closing * CONFIG.autoBrakeTime) { lead = car; leadGap = gap; }
    }
    return lead;
  },
  updateSpeed(dt, throttle, stopping) {
    if (stopping) {
      this.speed = Math.max(0, this.speed - CONFIG.brake * dt);
      return;
    }
    if (this.mystery === 'noBrakes') throttle = Math.max(0, throttle); // (and no braking by itself, below)
    if (this.busted) { // caught: the police slow the car to a crawl, it keeps rolling (no throttle or brake)
      this.speed = Math.max(Math.min(this.speed, CONFIG.policeCrawlSpeed), this.speed - CONFIG.brake * dt);
      return;
    }
    if (throttle < 0 || this.speed >= CONFIG.startSpeed) this.launching = false;
    // hands off, the speed simply holds; pulling away and recovering from a hit are automatic
    const boosted = this.turbo > 0;
    this.turbo = Math.max(0, this.turbo - dt);
    // (a turbo always adds something, even to a vehicle already faster than the turbo's own top speed)
    const top = boosted ? Math.max(CONFIG.turboMaxSpeed, CAR.maxSpeed + 16)
      : this.tank > 0 ? CONFIG.tankMaxSpeed : CAR.maxSpeed;
    let drive = throttle;
    if (drive <= 0 && (this.launching || this.speed < CONFIG.minSpeed)) drive = 1;
    if (drive === 0 && boosted) drive = 1; // the turbo pulls unless you brake
    if (this.speed > top) {
      // turbo ran out: ease back down to the normal top speed
      this.speed = Math.max(top, this.speed - CONFIG.brake * 0.5 * dt);
    } else if (drive > 0) {
      this.speed = Math.min(top, this.speed + drive * (boosted ? CONFIG.turboAccel : CAR.accel) * dt);
    } else if (drive < 0 && this.speed > CONFIG.minSpeed) {
      this.speed = Math.max(CONFIG.minSpeed, this.speed + drive * CONFIG.brake * dt);
    }
    // off the accelerator, the car brakes by itself for a slower car ahead
    const lead = throttle <= 0 && this.mystery !== 'noBrakes' ? this.carAhead() : null;
    const hard = !!lead && this.speed - lead.vs > CONFIG.brakeScreech;
    if (hard && !this.braking) sfx('brake', 0.7);
    this.braking = hard;
    if (lead) this.speed = Math.max(Math.max(0, lead.vs), this.speed - CONFIG.autoBrake * dt);
  },
  // The screensaver's camera dolly: no car (nothing of the player is drawn), just this point
  // gliding down the centre line at a steady speed for the chase camera to follow. It is a
  // ghost the whole time, so the traffic drives through it, but the traffic still sees it:
  // angry drivers crowd its lane and evil ones lob packages near it.
  dolly(dt, time) {
    const S = CONFIG.screensaver;
    this.speed = S.speed;
    this.s += this.speed * dt;
    const lat = S.swayCentre + S.sway * Math.sin(time * 2 * Math.PI / S.swayPeriod);
    this.latVel = (lat - this.lat) / dt;
    this.lat = lat;
    this.ghost = 1;
    this.shield = 0;
    this.health = this.maxHealth; // (a package splash near it does it no harm)
    this.yaw = 0;
    this.launching = false;
    this.onShoulder = false;
    this.danger = CONFIG.dangerTime;
  },
  update(dt, throttle, steer, stopping) {
    this.stun = Math.max(0, this.stun - dt);
    this.shield = Math.max(0, this.shield - dt);
    this.ghost = Math.max(0, this.ghost - dt);
    this.passenger = Math.max(0, this.passenger - dt);
    if (this.mystery && (this.mysteryTime -= dt) <= 0) this.endMystery();
    this.updateSpeed(dt, throttle, stopping);
    this.s += this.speed * dt;
    // on the right shoulder at the exit = taking the side road; at its end, back onto the expressway
    const latBefore = this.lat;
    Track.transfer(this);
    this.camShift += this.lat - latBefore;

    // steering moves the car freely; hands off, it stays where it is within its lane.
    // Busted, it can't be steered: it rolls straight on until the helicopter has it.
    let wantVel;
    if (this.busted) {
      wantVel = 0;
    } else if (steer !== 0) {
      wantVel = steer * CONFIG.steerSpeed * (CAR.agility || 1);
    } else {
      // only a faint nudge, and only once the car is close to a lane line: within
      // laneAssistFree of the centre it stays exactly where it was left
      const off = Track.assistOffset(this.lat, this.s) - this.lat;
      const pull = Math.sign(off) * Math.max(0, Math.abs(off) - CONFIG.laneAssistFree);
      wantVel = clamp(pull * CONFIG.laneAssist, -CONFIG.steerSpeed, CONFIG.steerSpeed);
    }
    // a hard knock briefly weakens steering
    const response = CONFIG.steerResponse * (this.stun > 0 ? 0.3 : 1) * Math.sqrt(CAR.agility || 1);
    this.latVel += (wantVel - this.latVel) * damp(response, dt);

    // the car can't be turned into the roadside or the bridge structure: sideways speed
    // toward a side fades to nothing as the car reaches it, so it straightens up
    const roomLeft = Math.max(0, this.lat - this.hw - Track.lo(this.s));
    const roomRight = Math.max(0, Track.hi(this.s) - this.hw - this.lat);
    this.latVel = clamp(this.latVel, -roomLeft * CONFIG.edgeBrake, roomRight * CONFIG.edgeBrake);

    this.lat += this.latVel * dt;
    keepOnRoad(this, 0);
    updateYaw(this, dt);

    // the shoulder is only tolerated briefly; back in the lanes the allowance refills
    // (an inflatable passenger makes the shoulder legal)
    // (a level can switch the timer off altogether: "shoulderTimer": false)
    this.onShoulder = LEVEL.shoulderTimer !== false && Track.onShoulder(this.lat, this.s) &&
      this.passenger <= 0 && this.tank <= 0;
    if (this.onShoulder) {
      this.danger = Math.max(0, this.danger - dt);
      if (this.danger === 0) this.bust('shoulder');
    } else {
      this.danger = Math.min(CONFIG.dangerTime, this.danger + CONFIG.dangerCooldown * dt);
    }
  },
};
