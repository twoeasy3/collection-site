import { CONFIG } from './config.js';
import { LEVEL } from './levels.js';
import { CAR, CARS, lendCar, returnCar } from './cars.js';
import { clamp, damp } from './util.js';
import { Track } from './track.js';
import { updateYaw, keepOnRoad, sfx, cornerSpeed } from './physics.js';
import { Traffic } from './traffic.js';
import { Message } from './messages.js';
import { UfoStrike } from './ufostrike.js';
import { BulletTrain } from './bullettrain.js';
import { Tide } from './tide.js';
import { Wreckage } from './wreckage.js';
import { Game } from './game.js';
import { Social } from './social.js';

// how hard a car is pushed to the outside of the bend it is in, beyond what its tyres hold (m/s^2,
// signed: a bend to the right pushes it left); 0 within their grip, and 0 where the car doesn't
// understeer at all but slows for the bend instead (see CONFIG.cornering)
const understeer = (v) => {
  const bend = Track.bend(v.s), asked = v.speed * v.speed * Math.abs(bend) * v.weight / v.agility;
  let grip, hard = 1;
  if (LEVEL.understeer) { // a race: everywhere, and far harder off the ice (see CONFIG.race)
    grip = CONFIG.ice.grip;
    if (!v.onIce) hard = CONFIG.race.understeer;
  } else if (v.onIce) grip = CONFIG.ice.grip; // on ice (see CONFIG.ice)
  else if (v.mystery === 'noBrakes') grip = CONFIG.cornering.grip; // no brakes: past the bend's limit (see CONFIG.mystery.noBrakes)
  else return 0;
  return -Math.sign(bend) * Math.max(0, asked - grip) * CONFIG.ice.understeer * hard;
};

export const Player = {
  isPlayer: true, active: true, dir: 1, bound: 'north',
  evil: false,         // the player is one of the good ones: its packages are gifts
  shield: 0,           // s of invulnerability left after a helicopter drop
  launching: true,     // pulling away to startSpeed on its own
  braking: false,      // braking hard by itself for a car ahead (the tyres squeal as it starts)
  brakeLight: false,   // braking at all: the brake lights are on
  onIce: false,        // on an ice patch (see CONFIG.ice)
  wading: 0,           // how deep the tide's water is where the car is (see Tide): 0 = dry, 1 = full depth
  dropOncoming: false, // the helicopter is setting the car down on the oncoming side (no dry lane on its own)
  turbo: 0,            // s of turbocharger left
  ghost: 0,            // s of passing through cars and barriers left
  passenger: 0,        // s of legal shoulder driving left
  radar: 0,            // s of radar detector left: the police can't bust the car
  siren: 0,            // s of siren left: traffic ahead pulls over (see Traffic)
  badGas: 0,           // s of bad gas left: a much lower top speed and acceleration
  heavy: 0,            // s of the 1000 lb weight left: heavier, slower, wins collisions (see Collision)
  mystery: '',         // the mystery effect running (see startMystery), '' = none...
  mysteryTime: 0,      // ...and s of it left
  nextMystery: '',     // the effect the next mystery will be, if not left to chance (?mystery= in the URL)
  tank: 0,             // 1 once TANK RAGE has started; it lasts for the rest of the level
  danger: CONFIG.dangerTime, // s of shoulder driving left before the police come (see Social.dangerTime)
  busted: false,
  bustReason: '',      // why the police are after the car: shoulder | seen | assault | assaultCop | bump
  onShoulder: false,   // illegally on the shoulder right now
  camShift: 0,         // lat jump from changing road, for the camera to follow at once
  s: 0, lat: 0, latVel: 0, yaw: 0, yawVel: 0, stun: 0,
  speed: 0,
  health: CAR.health, maxHealth: CAR.health, smoke: 0, // (top speed, acceleration and health are the car's: see cars.js)
  hw: CAR.hw, hl: CAR.hl, height: CAR.height, // hitbox half width / half length, body height
  get mass() { return this.heavy > 0 ? CONFIG.heavyMass.mass : 1; },
  // how heavy the car is, for sliding on ice: by its size, against the Commuter's, and its mass
  get weight() { return this.mass * Math.sqrt(this.hw * this.hl * this.height / CONFIG.ice.weightRef); },
  // how well the car takes a railway track, and wades through water: 1 = no bother, 0 = worst of all
  // (a tank, whatever it is, takes anything)
  get crossing() { return this.tank > 0 ? 1 : CAR.crossing ?? CONFIG.railCrossing.usual; },
  // how quickly the car steers: its own agility, less under the weight
  get agility() { return (CAR.agility || 1) * (this.heavy > 0 ? CONFIG.heavyMass.agility : 1); },
  get vs() { return this.speed; },
  set vs(v) { this.speed = v; },

  // swap the car under the player mid-run (Car Swap: see startMystery): its shape and health are
  // the new car's, keeping the same share of health it had
  takeCar(swap) {
    const share = this.maxHealth > 0 ? this.health / this.maxHealth : 1;
    swap();
    Object.assign(this, { maxHealth: CAR.health, health: CAR.health * share, hw: CAR.hw, hl: CAR.hl, height: CAR.height });
  },
  reset() {
    // take on whichever car is in use now: it may have been swapped in the garage
    this.maxHealth = CAR.health;
    this.hw = CAR.hw;
    this.hl = CAR.hl;
    this.height = CAR.height;
    this.s = 0;
    // the innermost lane on the right: the first going our way (on a one-way road, the lane
    // just right of the centre line)
    this.lat = Track.laneOffset(Math.min(Track.laneCount - 1, Track.leftLanes + Track.medianLanes), 0);
    this.respawn();
    this.shield = 0;
    this.tank = CAR.tank ? 1 : 0; // the Tank from the garage is in TANK RAGE all the time
  },
  // wrecked (or busted): pick where the new car lands, in a lane going its way. With the tide in,
  // the nearest of them that will still be dry when it is set down; if none will be, the nearest
  // oncoming lane, with a longer shield to get out of it
  prepareDrop() {
    const [first, last] = Track.laneRange(1, this.s);
    let lane = clamp(Track.nearestLane(this.lat, this.s), first, last);
    this.dropOncoming = false;
    if (Wreckage.blocked(lane, this.s)) { // (nor where wreckage blocks the lane: the nearest one it doesn't)
      const open = [];
      for (let l = first; l <= last; l++) if (!Wreckage.blocked(l, this.s)) open.push(l);
      open.sort((a, b) => Math.abs(a - lane) - Math.abs(b - lane));
      if (open.length) lane = open[0];
    }
    if (Tide.on) {
      const later = CONFIG.respawnTime;
      const dry = (l) => Tide.depth(this.s, Track.laneOffset(l, this.s), later, true) <= CONFIG.tide.wet; // (not trusting a sea gone out)
      const own = [];
      for (let l = first; l <= last; l++) own.push(l);
      own.sort((a, b) => Math.abs(a - lane) - Math.abs(b - lane));
      const safe = own.find(dry);
      if (safe !== undefined) lane = safe;
      else {
        lane = Track.laneRange(-1, this.s)[1]; // (the oncoming side's innermost lane)
        this.dropOncoming = true;
      }
    }
    this.lat = Track.laneOffset(lane, this.s);
  },
  // a fresh car at a standstill (the helicopter has just set it down)
  respawn(keepHealth) {
    this.active = true;
    this.grace = 0;      // s left to get off the shoulder after a caution for it (see bust)
    this.danger = Social.dangerTime;
    this.busted = false;
    this.speed = 0;
    this.launching = true;
    this.turbo = 0;
    this.ghost = 0;
    this.passenger = 0;
    this.radar = 0;
    this.siren = 0;
    this.badGas = 0;
    this.heavy = 0;
    this.armour = 0;
    this.sling = this.slingTime = this.slingTotal = 0;
    this.bigSplash = 0;
    this.butterfingers = 0;
    this.puncture = 0;   // a flat tyre: -1 (left) or 1 (right), 0 none (see punctureTyre)
    this.fixing = 0;     // s stopped so far, changing it
    this.tyreGrace = 0;  // s since it was changed, still let off the shoulder meter
    this.endMystery();
    this.latVel = 0;
    this.yaw = 0;
    this.yawVel = 0;
    this.stun = 0;
    this.onIce = false;
    this.wading = 0;
    if (!keepHealth) this.health = this.maxHealth;
    this.smoke = 0;
    this.shield = CONFIG.respawnShield + (this.dropOncoming ? CONFIG.tide.oncomingShield : 0);
    this.dropOncoming = false;
  },
  bust(reason) {
    if (this.busted || this.tank > 0 || this.radar > 0) return; // nobody busts a tank, nor a car with a radar detector
    // (nor anyone for the shoulder with a bullet train about, or just gone: an empty danger meter
    // busts the car once that is over, if it is still on the shoulder)
    if ((reason === 'shoulder' || reason === 'seen') && BulletTrain.mercy) return;
    // (nor for the shoulder in the grace after a caution for it: time to get back in a lane)
    const shoulder = reason === 'shoulder' || reason === 'seen';
    if (shoulder && this.grace > 0) return;
    // a bust costs a good player social standing; and one in high standing is let off with a caution
    if (Social.busted()) {
      if (shoulder) this.grace = CONFIG.social.grace;
      const line = Message.say('busts', reason);
      if (line) line.text = 'CAUTION: ' + line.text + (shoulder ? ' Back in your lane!' : '');
      return;
    }
    this.busted = true;
    this.bustReason = reason;
    // the bust's message, led by which bust of the run this is (messages.json: bustCount)
    const line = Message.say('busts', reason);
    if (line) line.text = Message.pick('bustCount', String(Math.min(CONFIG.maxBusts, Game.busts + 1))) + line.text;
  },
  // TANK RAGE: fully repaired, wrecks what it touches, fires a cannon (see Collision, Packages)
  startTank() {
    this.tank = 1;
    this.health = this.maxHealth;
  },
  collect(type) {
    if (type === 'wrench') {
      this.health = Math.min(this.maxHealth, this.health + this.maxHealth * CONFIG.wrenchRepair);
      if (this.puncture) { // (and a flat tyre fixed there and then, no need to stop: see punctureTyre)
        this.puncture = 0;
        this.fixing = 0;
        this.tyreGrace = CONFIG.puncture.grace;
        Message.say('events', 'tyreChanged');
      }
      return;
    }
    // cash: kept, and banked with the tip on delivery; it leaves the powerup running alone
    if (CONFIG.cashPickup[type]) {
      Game.cash += CONFIG.cashPickup[type];
      return;
    }
    // a stopwatch moves the clock (and so the tip countdown), and leaves the powerup running alone
    if (type === 'timePlus' || type === 'timeMinus') {
      Game.allowed += (type === 'timePlus' ? 1 : -1) * CONFIG.timePickup;
      return;
    }
    // one powerup at a time: a new one cuts short whichever is running
    // (a ghost is let go of gently: it stays see-through until it is clear of every car;
    // a radar detector cut short with the shoulder meter full leaves the car busted, even for
    // another radar detector, which only starts once the bust has; unless it is for a
    // passenger, who makes the shoulder legal anyway)
    const caught = this.radar > 0 && this.danger <= 0 && type !== 'passenger';
    this.turbo = 0;
    this.passenger = 0;
    this.radar = 0;
    this.siren = 0;
    this.badGas = 0;
    this.heavy = 0;
    this.armour = 0;
    this.bigSplash = 0;
    this.butterfingers = 0;
    this.ghost = Math.min(this.ghost, 0.01);
    this.endMystery();
    if (caught) this.bust('shoulder');
    // (longer if good, shorter if bad, the higher the player's standing: see Social)
    const shift = Social.powerUpShift(type);
    if (type === 'turbo') this.turbo = CONFIG.turboTime + shift;
    else if (type === 'radarDetector') this.radar = CONFIG.radarTime + shift;
    else if (type === 'siren') this.siren = CONFIG.sirenPickup.time + shift;
    else if (type === 'ghost') this.ghost = CONFIG.ghostTime + shift;
    else if (type === 'passenger') this.passenger = CONFIG.passengerTime + shift;
    else if (type === 'badGas') this.badGas = CONFIG.badGas.time + shift;
    else if (type === 'heavyMass') this.heavy = CONFIG.heavyMass.time + shift;
    else if (type === 'armour') this.armour = CONFIG.armour.time + shift;
    else if (type === 'bigSplash') this.bigSplash = CONFIG.bigSplash.time + shift;
    else if (type === 'butterfingers') this.butterfingers = CONFIG.butterfingers.time + shift;
    else if (type === 'mystery') this.startMystery();
  },
  // s left of the powerup that is running (0 = none)
  get powerLeft() { return Math.max(this.turbo, this.ghost, this.passenger, this.radar, this.siren, this.badGas, this.heavy, this.armour, this.bigSplash, this.butterfingers, this.mysteryTime); },
  // the mystery pickup: a random effect. Most last CONFIG.mystery.time; the insurance ones, the
  // UFO air strike and the bullet train are over at once (the strike and the train go on by
  // themselves: UfoStrike, BulletTrain)
  startMystery() {
    const { effects, extraEffects, time } = CONFIG.mystery;
    // (a tank only ever gets the air strike)
    // (the good ones the likelier, the higher the player's standing: see Social)
    const weights = effects.map(e => Social.mysteryWeight(e));
    let roll = Math.random() * weights.reduce((a, w) => a + w, 0), drawn = effects[effects.length - 1];
    for (let i = 0; i < effects.length; i++) if ((roll -= weights[i]) < 0) { drawn = effects[i]; break; }
    const effect = this.tank > 0 ? 'ufo'
      : [...effects, ...extraEffects].find(e => e.toLowerCase() === this.nextMystery.toLowerCase()) || drawn; // (?mystery=UFO works too, and picks from the unused pool)
    Message.say('powerups', 'mystery', effect);
    if (effect === 'ufo') UfoStrike.start();
    if (effect === 'bulletTrain') BulletTrain.start();
    if (effect === 'ufo' || effect === 'bulletTrain' || effect.startsWith('insurance')) return;
    this.mystery = effect;
    this.mysteryTime = time + Social.powerUpShift(effect);
    if (effect === 'toad') Traffic.toadify(true);
    if (effect === 'angel' || effect === 'jerk') for (const car of Traffic.cars) car.showMood = true; // (moods: see Traffic)
    if (effect === 'rushHour') Traffic.rushHour(true);
    if (effect === 'moodSwing') Traffic.moodSwing(true);
    if (effect === 'carSwap') { // (any of the garage's cars but this one and the Tank; none for a level's own vehicle)
      const others = CARS.includes(CAR) ? CARS.filter(c => c !== CAR && !c.tank) : [];
      if (others.length) this.takeCar(() => lendCar(others[Math.floor(Math.random() * others.length)]));
    }
  },
  endMystery() {
    if (this.mystery === 'toad') Traffic.toadify(false);
    if (this.mystery === 'rushHour') Traffic.rushHour(false);
    if (this.mystery === 'moodSwing') Traffic.moodSwing(false);
    if (this.mystery === 'carSwap') this.takeCar(returnCar);
    this.mystery = '';
    this.mysteryTime = 0;
  },
  // how much of any damage the car takes (see hurt): none while invincible, more while rickety, less in armour
  get damageScale() {
    return (this.mystery === 'invincible' ? 0 : this.mystery === 'rickety' ? CONFIG.mystery.rickety : 1) *
      (this.armour > 0 ? CONFIG.armour.damage : 1);
  },
  // nearest slower car in our path that we are closing on too fast, if any
  carAhead() {
    if (this.ghost > 0 || this.tank > 0) return null; // a ghost drives through, a tank ploughs through
    let lead = null, leadGap = Infinity;
    for (const car of Traffic.cars) {
      if (!car.active || car.dir < 0 || car.junction) continue; // braking won't save you from oncoming cars
      const gap = car.s - this.s - car.hl - this.hl;
      const closing = this.speed - car.vs;
      if (gap < -1 || closing <= 0 || gap > leadGap) continue;
      if (Math.abs(car.lat - this.lat) > car.hw + this.hw + 0.2) continue;
      if (gap < CONFIG.autoBrakeGap + closing * CONFIG.autoBrakeTime) { lead = car; leadGap = gap; }
    }
    return lead;
  },
  // a tyre shot out (see Gunfire): a limp on, slower and pulling to that side, until the car stops to
  // change it. (Nothing without tyres: the tank, the UFO, the boat)
  punctureTyre(side) {
    if (this.puncture || this.tank > 0 || CAR.noWheels || !this.active || this.armour > 0) return; // (armour shields the tyres too)
    this.puncture = side;
    this.fixing = 0;
    Message.say('events', 'puncture');
    sfx('puncture');
  },
  updateSpeed(dt, throttle, stopping) {
    if (stopping) {
      this.speed = Math.max(0, this.speed - CONFIG.brake * dt);
      this.brakeLight = this.speed > 0;
      return;
    }
    // no brakes: braking only lifts off (it coasts down: see CONFIG.mystery.noBrakes), and no braking by itself, below
    const lifting = this.mystery === 'noBrakes' && throttle < 0;
    if (this.mystery === 'noBrakes') throttle = Math.max(0, throttle);
    if (this.busted) { // caught: the police slow the car to a crawl, it keeps rolling (no throttle or brake)
      this.speed = Math.max(Math.min(this.speed, CONFIG.policeCrawlSpeed), this.speed - CONFIG.brake * dt);
      this.brakeLight = true;
      return;
    }
    if (throttle < 0 || this.speed >= CONFIG.startSpeed) this.launching = false;
    // hands off, the speed simply holds; pulling away and recovering from a hit are automatic
    const boosted = this.turbo > 0;
    this.turbo = Math.max(0, this.turbo - dt);
    // (a turbo adds the same to every car's top speed: a slow car stays the slower one)
    // (bad gas and the weight hold the car back: a share of its top speed and acceleration)
    const held = this.badGas > 0 ? CONFIG.badGas : this.heavy > 0 ? CONFIG.heavyMass : null;
    let top = ((this.tank > 0 ? CONFIG.tankMaxSpeed : CAR.maxSpeed) + (boosted ? CONFIG.turboBoost : 0)) * (held ? held.topSpeed : 1) *
      (this.puncture ? CONFIG.puncture.topSpeed : 1); // (and a flat tyre)
    // in a race, in another car's slipstream: faster (see CONFIG.race); and pulling out of it, flung on
    // past it: the slingshot, a kick on top of the tow's speed, both fading away (the longer, the more
    // speed the tow had given it)
    const RC = CONFIG.race, wasTow = this.tow || 0;
    this.tow = Traffic.tow(this, this.s, this.lat, this.hw);
    const slingFor = Math.min(RC.slingMax, Math.max(0, this.speed - top) * RC.slingPerGain);
    if (wasTow >= RC.slingFrom && this.tow === 0 && slingFor > 0.2) {
      this.sling = wasTow;
      this.slingTime = this.slingTotal = slingFor;
      this.speed += top * RC.slingKick * wasTow; // (the kick)
    }
    this.slingTime = Math.max(0, (this.slingTime || 0) - dt);
    const sling = this.slingTime > 0 ? this.sling * this.slingTime / this.slingTotal : 0;
    top *= 1 + RC.draft * Math.max(this.tow, sling) + RC.slingKick * sling;
    // over a railway track, slowed by how well the car crosses one (a tank, whatever it is, crosses fine)
    const R = CONFIG.railCrossing, rails = Track.onRails(this.s, this.lat, this.hw);
    const crossing = this.crossing;
    if (rails) {
      top *= R.slowest + (1 - R.slowest) * crossing;
      if (crossing < 1) Game.shake = Math.max(Game.shake, 0.25 * (1 - crossing));
    }
    // in a bend, a lower top speed: the sharper, and the heavier and less agile the car, the lower
    // (but not on ice, nor where cars understeer, nor with no brakes: there they slide wide instead)
    if (!this.onIce && !LEVEL.understeer && this.mystery !== 'noBrakes') top = Math.min(top, cornerSpeed(this.s, this.weight, this.agility));
    // in mud, slowed just as on a railway track (see CONFIG.mud)
    const mud = Track.muddy(this.s);
    if (mud) {
      top *= R.slowest + (1 - R.slowest) * crossing;
      if (crossing < 1) Game.shake = Math.max(Game.shake, 0.12 * (1 - crossing));
    }
    // in the tide's water, slowed the same way, only more so (see CONFIG.tide)
    const wet = this.wading > CONFIG.tide.wet;
    if (wet) top *= Math.max(CONFIG.tide.slowest, 1 - CONFIG.tide.crossing * (1 - R.slowest) * (1 - crossing));
    let drive = throttle;
    const grip = this.onIce ? CONFIG.ice.brakeGrip : 1; // (braking on ice)
    // (but with a flat tyre, not: the car can be brought to a stop to change it, and stays there)
    if (drive <= 0 && (this.launching || this.speed < CONFIG.minSpeed) && !this.puncture) drive = 1;
    if (drive === 0 && boosted && !lifting) drive = 1; // the turbo pulls unless you brake (or lift off)
    if (this.speed > top) {
      // turbo ran out (or bad gas or the weight came on): ease back down to the top speed
      // (or on a railway track: slowed down to it hard)
      this.speed = Math.max(top, this.speed - (rails || wet || mud ? R.bite : CONFIG.brake * 0.5) * dt);
    } else if (drive > 0) {
      this.speed = Math.min(top, this.speed + drive * (boosted ? CONFIG.turboAccel : CAR.accel * (held ? held.accel : 1)) * (this.puncture ? CONFIG.puncture.accel : 1) * dt);
    } else if (drive < 0 && this.puncture) { // (a flat tyre: hard, and all the way down to a stop)
      this.speed = Math.max(0, this.speed + drive * CONFIG.brake * CONFIG.puncture.brake * grip * dt);
    } else if (drive < 0 && this.speed > CONFIG.minSpeed) {
      this.speed = Math.max(CONFIG.minSpeed, this.speed + drive * CONFIG.brake * grip * dt);
    } else if (lifting && drive === 0) { // (no brakes, lifting off: coasting down; with a flat tyre, to a stop to change it)
      this.speed = Math.max(Math.min(this.speed, this.puncture ? 0 : CONFIG.minSpeed), this.speed - CONFIG.mystery.noBrakes.coast * dt);
    }
    // off the accelerator, the car brakes by itself for a slower car ahead
    const lead = throttle <= 0 && this.mystery !== 'noBrakes' ? this.carAhead() : null;
    const hard = !!lead && this.speed - lead.vs > CONFIG.brakeScreech;
    if (hard && !this.braking) sfx('brake', 0.7);
    this.braking = hard;
    if (lead) this.speed = Math.max(Math.max(0, lead.vs), this.speed - CONFIG.autoBrake * grip * dt);
    this.brakeLight = (throttle < 0 && this.speed > CONFIG.minSpeed) || !!lead;
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
    this.danger = Social.dangerTime;
  },
  update(dt, throttle, steer, stopping) {
    this.stun = Math.max(0, this.stun - dt);
    this.shield = Math.max(0, this.shield - dt);
    this.grace = Math.max(0, (this.grace || 0) - dt); // (after a caution: see bust)
    this.ghost = Math.max(0, this.ghost - dt);
    this.passenger = Math.max(0, this.passenger - dt);
    this.radar = Math.max(0, this.radar - dt); // (when it runs out with the shoulder meter full: a bust, below)
    this.siren = Math.max(0, this.siren - dt);
    this.badGas = Math.max(0, this.badGas - dt);
    this.heavy = Math.max(0, this.heavy - dt);
    this.armour = Math.max(0, this.armour - dt);
    this.bigSplash = Math.max(0, this.bigSplash - dt);
    this.butterfingers = Math.max(0, this.butterfingers - dt);
    if (this.mystery && (this.mysteryTime -= dt) <= 0) this.endMystery();
    // ice: hitting it, the car slews round (the look of it only), with a squeal of tyres
    const icy = !!Track.icy(this.s, this.lat);
    if (icy && !this.onIce) {
      this.yawVel += (Math.random() < 0.5 ? -1 : 1) * CONFIG.ice.yawKick * Math.min(1, this.speed / 25);
      if (this.speed > 8) sfx('brake', 0.5);
    }
    if (icy) this.yawVel += (Math.random() - 0.5) * 8 * Math.min(1, this.speed / 25) * dt; // (and twitches about on it)
    this.onIce = icy;
    // the tide: in deep water the car is damaged, the more so the worse it wades (a ghost skims
    // over the water, and a car just set down is spared)
    this.wading = this.ghost > 0 ? 0 : Tide.depth(this.s, this.lat);
    if (this.wading >= CONFIG.tide.deep && this.shield <= 0) {
      this.health -= CONFIG.tide.damage * (1 - this.crossing) * this.damageScale * dt;
    }
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
      wantVel = steer * CONFIG.steerSpeed * this.agility;
    } else {
      // only a faint nudge, and only once the car is close to a lane line: within
      // laneAssistFree of the centre it stays exactly where it was left
      const off = Track.assistOffset(this.lat, this.s) - this.lat;
      const pull = Math.sign(off) * Math.max(0, Math.abs(off) - CONFIG.laneAssistFree);
      wantVel = clamp(pull * CONFIG.laneAssist, -CONFIG.steerSpeed, CONFIG.steerSpeed);
    }
    // (a flat tyre drags the car towards its side, the harder the faster it goes)
    if (this.puncture && !this.busted) wantVel += this.puncture * CONFIG.puncture.pull * Math.min(1, this.speed / 15);
    // a hard knock briefly weakens steering
    // (a car sliding wide in a bend, on a level where cars understeer or with no brakes, has lost its grip, as on ice)
    const push = understeer(this), sliding = !this.onIce && push !== 0;
    const response = CONFIG.steerResponse * (this.stun > 0 ? 0.3 : 1) * Math.sqrt(this.agility) * (this.onIce || sliding ? CONFIG.ice.steerGrip : 1) *
      (this.wading > CONFIG.tide.wet ? CONFIG.tide.steerGrip : 1) * (Track.muddy(this.s) ? CONFIG.mud.steerGrip : 1);
    this.latVel += (wantVel - this.latVel) * damp(response, dt);
    // a wave rushing in shoves a car in the water towards the centre line
    if (this.wading > CONFIG.tide.wet && !this.busted && Tide.rushing(this.s)) this.latVel -= CONFIG.tide.shove * dt;
    // on ice in a bend, the car understeers: what the bend asks of the tyres beyond the little
    // grip they have left pushes it to the outside (heavier cars more, more agile ones less)
    // (and on a level where cars understeer, "understeer", everywhere; and with no brakes, taken too fast)
    const slide = this.busted ? 0 : push;
    const scrub = LEVEL.understeer ? CONFIG.race.scrub : this.mystery === 'noBrakes' ? CONFIG.mystery.noBrakes.scrub : 0;
    this.speed = Math.max(0, this.speed - Math.abs(slide) * scrub * dt); // (the tyres scrubbing, sliding wide)
    // no brakes: steering scrubs off a little speed too, by how fast the car is moving across
    // (only a feel of control before a bend: see CONFIG.mystery.noBrakes)
    if (this.mystery === 'noBrakes' && steer !== 0 && !this.busted && this.speed > CONFIG.minSpeed) {
      const across = Math.min(1, Math.abs(this.latVel) / (CONFIG.steerSpeed * this.agility));
      this.speed = Math.max(CONFIG.minSpeed, this.speed - CONFIG.mystery.noBrakes.steerScrub * Math.abs(steer) * across * dt);
    }
    // (where walls hurt, "wallDamage", nothing stops the slide carrying the car into one: see keepOnRoad)
    if (!LEVEL.wallDamage) this.latVel += slide * dt;

    // the car can't be turned into the roadside or the bridge structure: sideways speed
    // toward a side fades to nothing as the car reaches it, so it straightens up
    const roomLeft = Math.max(0, this.lat - this.hw - Track.lo(this.s));
    const roomRight = Math.max(0, Track.hi(this.s) - this.hw - this.lat);
    // (but where walls hurt, "wallDamage", nothing eases the car off them: it hits them, see keepOnRoad)
    if (!LEVEL.wallDamage) this.latVel = clamp(this.latVel, -roomLeft * CONFIG.edgeBrake, roomRight * CONFIG.edgeBrake);
    else this.latVel += slide * dt;

    this.lat += this.latVel * dt;
    keepOnRoad(this, 0);
    updateYaw(this, dt);

    // the shoulder is only tolerated briefly; back in the lanes the allowance refills
    // (an inflatable passenger makes the shoulder legal)
    // (a level can switch the timer off altogether: "shoulderTimer": false)
    // (and nor does a car pulled over with a flat tyre, or just after changing it)
    if (this.puncture) {
      if (this.speed < 0.3) this.fixing += dt; // (stopped, the tyre is being changed: the work so far is kept, if it moves off before it's done)
      if (this.fixing >= CONFIG.puncture.fixTime) {
        this.puncture = 0;
        this.tyreGrace = CONFIG.puncture.grace;
        Message.say('events', 'tyreChanged');
        sfx('wrench');
      }
    }
    this.tyreGrace = Math.max(0, (this.tyreGrace || 0) - dt);
    this.onShoulder = LEVEL.shoulderTimer !== false && Track.onShoulder(this.lat, this.s) &&
      this.passenger <= 0 && this.tank <= 0 && !this.puncture && !(this.tyreGrace > 0);
    if (this.onShoulder) {
      // (mercy: with a bullet train about, the shoulder may be the only way out of its path)
      this.danger = Math.max(0, this.danger - dt * (BulletTrain.active ? CONFIG.bulletTrain.dangerMercy : 1));
      if (this.danger === 0) this.bust('shoulder');
    } else {
      this.danger = Math.min(Social.dangerTime, this.danger + CONFIG.dangerCooldown * dt);
    }
  },
};
