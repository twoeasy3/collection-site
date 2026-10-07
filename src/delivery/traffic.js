import { CONFIG } from './config.js';
import { LEVEL } from './levels.js';
import { clamp, damp } from './util.js';
import { Track } from './track.js';
import { updateYaw, keepOnRoad, emotionOf, startRivalry, spinOut, sfxAt, cornerSpeed, weightOf } from './physics.js';
import { Player } from './player.js';
import { Packages } from './packages.js';
import { CARS, LEVEL_CARS } from './cars.js';
import { Message } from './messages.js';
import { Tide } from './tide.js';
import { Wreckage } from './wreckage.js';
import { Game } from './game.js';
import { Social } from './social.js';

// ---- traffic ---------------------------------------------------------------
// One pool of cars recycled ahead of the player: some northbound (the player's way), the
// rest southbound (oncoming), or all one way on a level with a "flow". Set when a run starts.
// Cars hold a lane with a spring, so they can be shoved around and then recover.
// Morality is fixed per car: evil cars throw packages at the road, good cars never do.
// Emotion changes with what happens to the car: angry cars drift into the player's lane
// and won't brake for the player, happy ones clear the lane, neutral ones ignore the player.
export const Traffic = (() => {
  const cars = [];
  for (let i = 0; i < CONFIG.trafficPool; i++) {
    // bound: 'north' is the way the player is going, 'south' is oncoming. It never changes
    // during a run (reset() deals the directions out again for the level being started, and
    // marks the cars beyond the level's counts unused).
    const north = i < CONFIG.trafficCount;
    cars.push({ active: false, unused: false, dir: north ? 1 : -1, bound: north ? 'north' : 'south', mass: 1,
      s: 0, lat: 0, vs: 0, latVel: 0, yaw: 0, yawVel: 0, stun: 0,
      lane: 0, baseSpeed: 0, kind: 'commuter', evil: false, emotion: 'neutral', mood: 0, paint: 0, think: 0, honkWait: 0,
      health: 1, maxHealth: 1, smoke: 0, hw: 1, hl: 2.1, height: 1.4,
      braking: false, signal: 0, hazards: false, pendingLane: null, hesitant: false, fromBehind: false });
  }

  // ramps: the expressway's shoulder is the exit / merge lane there, lane index -1 on the
  // left and laneCount on the right. Returns the lane this car should be heading for.
  const rampLane = (car) => {
    if (!Track.isMain(car.s)) return car.lane;
    const zone = CONFIG.ramps.laneZone, last = Track.laneCount - 1;
    let leaving = false;
    if (car.viaSide) {
      for (const x of Track.exits) {
        if (car.dir > 0 ? car.s > x.exitAt - zone && car.s < x.exitAt
          : car.s > x.flyoverAt && car.s < x.flyoverAt + zone) leaving = true;
      }
    }
    if (car.dir > 0) {
      if (car.lane === last && leaving) return last + 1;   // out onto the exit lane
      if (car.lane === last + 1 && !leaving) return last;  // in from the merge lane
    } else {
      if (car.lane === 0 && leaving) return -1;            // out toward the flyover
      if (car.lane === -1 && !leaving) return 0;           // in from the flyover
    }
    return car.lane;
  };

  // the level's "traffic" list: which kinds of vehicle turn up, and how often relative to
  // each other. An empty list means no traffic.
  // (in a zone with a traffic list of its own, at s, that one)
  const mix = (s) => Object.entries((s !== undefined && Track.zoneAt(s)?.traffic) || LEVEL.traffic || {})
    .filter(([kind, rate]) => CONFIG.vehicles[kind] && rate > 0);
  const pickKind = (s) => {
    const kinds = mix(s);
    let r = Math.random() * kinds.reduce((sum, [, rate]) => sum + rate, 0);
    for (const [kind, rate] of kinds) {
      r -= rate;
      if (r < 0) return kind;
    }
    return kinds[0][0];
  };
  // is a police car close enough to see what the player is doing?
  const policeNear = () => cars.some(c => c.active && !c.junction && c.kind === 'police' && !c.toad && c.stun <= 0 &&
    Math.abs(c.s - Player.s) < Social.policeSight && Math.abs(c.lat - Player.lat) < 25); // (as far as the player's standing lets it)

  const MOOD_START = { happy: 0.7, neutral: 0, angry: -0.7 };
  // evil cars are more likely to start out angry (a level's "drivers" can set the chances
  // for every driver, and the share of evil ones)
  const drivers = () => LEVEL.drivers || {};
  const pickEmotion = (evil) => {
    const d = drivers(), r = Math.random();
    const chance = d.happy !== undefined || d.angry !== undefined
      ? { happy: d.happy || 0, angry: d.angry || 0 } : CONFIG.startMood[evil ? 'evil' : 'good'];
    return r < chance.happy ? 'happy' : r < chance.happy + chance.angry ? 'angry' : 'neutral';
  };
  const speeds = () => LEVEL.trafficSpeed || { min: CONFIG.trafficMinSpeed, max: CONFIG.trafficMaxSpeed };

  const laneClear = (car, lane, gap) => cars.every(o =>
    o === car || !o.active || o.junction || o.lane !== lane || Math.abs(o.s - car.s) > gap);

  const playerInWay = (car, lane) => Player.active &&
    Math.abs(Player.lat - Track.laneOffset(lane, car.s)) < CONFIG.laneWidth * 0.9 &&
    Player.s > car.s - 30 && Player.s < car.s + 12;

  const H = CONFIG.hesitation;
  const between = (range) => range.min + Math.random() * (range.max - range.min);
  const hesitation = () => LEVEL.hesitation !== false;

  // puts the car on the road `distance` metres from the player (negative: behind), in a lane of
  // its own direction with room around it; false if there is no room there
  const placeAt = (car, distance) => {
    car.s = Track.spawnAt(Player.s, distance, car.dir);
    if (Number.isNaN(car.s) || !Track.inBounds(car.s)) return false;
    const [first, all] = Track.laneRange(car.dir, car.s), kind = pickKind(car.s);
    const last = car.dir > 0 ? Math.max(first, Math.min(all, Tide.dryLane(car.s))) : all; // (none turns up in the tide's water)
    // (a vehicle that keeps to the kerb starts out there)
    const lane = CONFIG.vehicles[kind].kerb ? Track.openLane(kerbLane(car.dir, car.s), car.s)
      : Track.openLane(first + Math.floor(Math.random() * (last - first + 1)), car.s);
    if (!laneClear(car, lane, 25) || Wreckage.blocked(lane, car.s)) return false;
    outfit(car, kind, lane);
    return true;
  };
  // the lane by the kerb for traffic going way dir: its outside lane
  const kerbLane = (dir, s) => Track.laneRange(dir, s)[dir > 0 ? 1 : 0];

  // puts the car on the road somewhere between minAhead and maxAhead metres in front of the
  // player. One going the player's way too fast for the player ever to catch hesitates (see CONFIG.hesitation).
  const spawn = (car, minAhead, maxAhead) => {
    car.active = false;
    for (let tries = 0; tries < 5; tries++) {
      if (!placeAt(car, minAhead + Math.random() * (maxAhead - minAhead))) continue;
      if (hesitation() && car.dir === Player.dir && car.baseSpeed > H.above && !CONFIG.vehicles[car.kind].cruise) {
        car.hesitant = true;
        car.baseSpeed = between(H.pace);
        car.vs = car.dir * car.baseSpeed;
        car.tapWait = between(H.tapEvery);
      }
      return;
    }
  };
  // ...and while a hesitant car is ahead of the player, a car going the player's way may come
  // up from behind instead, near full speed. False if there was no room.
  const hesitantAhead = () => cars.some(c => c.active && !c.junction && c.hesitant && c.dir === Player.dir && Track.along(c.s) > Track.along(Player.s));
  const spawnBehind = (car) => {
    car.active = false;
    for (let tries = 0; tries < 5; tries++) {
      if (!placeAt(car, -between(H.behind))) continue;
      const own = GARAGE_TOP[car.kind];
      const type = CONFIG.vehicles[car.kind];
      car.baseSpeed = type.cruise ? between(type.cruise) : (own || type.speed * speeds().max) * between(H.behindPace);
      car.vs = car.dir * car.baseSpeed;
      car.fromBehind = true;
      return true;
    }
    car.active = false;
    return false;
  };

  // TOAD RAGE (a mystery): while it lasts, every vehicle is a toad (new ones too). A toad goes
  // straight on at one slow speed: no moods, no lane changes, no braking, and 1 health, so it
  // bursts on touching anything (see Collision). Afterwards each turns back into what it was.
  let toads = false;
  const makeToad = (car) => {
    if (car.toad || car.emergency || car.parked || car.junction) return; // (an ambulance stays an ambulance, and a parked car parked)
    const T = CONFIG.mystery.toad;
    car.toad = { health: car.health, maxHealth: car.maxHealth, hw: car.hw, hl: car.hl, height: car.height, mass: car.mass };
    Object.assign(car, T, { health: 1, maxHealth: 1, spin: 0, wobble: 0, rival: null, stun: 0 });
  };
  const toadify = (on) => {
    toads = on;
    for (const car of cars) {
      if (on) makeToad(car);
      else if (car.toad) {
        Object.assign(car, car.toad);
        car.toad = null;
      }
    }
  };

  // the top speed of each of the garage's cars, by id (which is also its kind of traffic)
  const GARAGE_TOP = Object.fromEntries(CARS.map(c => [c.id, c.maxSpeed]));
  const CARS_BY_ID = LEVEL_CARS;

  // makes the car a vehicle of that kind, in that lane at car.s, fresh off the line
  const outfit = (car, kind, lane) => {
    car.fixed = false;
    car.viaSide = Math.random() < CONFIG.ramps.trafficShare; // will take a ramp / flyover if it meets one
    car.kind = kind;
    const type = CONFIG.vehicles[car.kind];
    car.hw = type.hw;
    car.hl = type.hl;
    car.height = type.height;
    car.mass = type.mass;
    car.maxHealth = car.health = type.health;
    car.smoke = 0;
    car.lane = lane;
    car.lat = Track.laneOffset(lane, car.s);
    car.latVel = 0;
    car.yaw = 0;
    car.yawVel = 0;
    car.stun = 0;
    const { min, max } = speeds();
    // (one of the garage's cars cruises near its own top speed, unless it has a speed of its own;
    // anything else at the level's pace)
    const own = type.speed ? 0 : GARAGE_TOP[kind], P = CONFIG.garagePace;
    car.baseSpeed = type.cruise ? type.cruise.min + Math.random() * (type.cruise.max - type.cruise.min)
      : own ? own * (P.min + Math.random() * (P.max - P.min)) : type.speed * (min + Math.random() * (max - min));
    car.vs = car.dir * car.baseSpeed;
    const evilShare = drivers().evil !== undefined ? drivers().evil : CONFIG.evilShare;
    car.evil = !type.special && Math.random() < Social.evilShare(evilShare); // fixed for this car's life (fewer, the higher the player's standing)
    car.defiant = car.evil && Math.random() < CONFIG.emergency.defiance; // won't give way to an ambulance
    // (and the higher the player's standing, the happier every driver starts out)
    car.mood = clamp(MOOD_START[pickEmotion(car.evil)] + Social.moodLift, -1, 1);
    car.emotion = emotionOf(car.mood);
    car.paint = Math.floor(Math.random() * 1000);
    car.showMood = false;
    car.wobble = 0;     // s left of wobbling after a critical hit, before it spins out
    car.spin = 0;       // s left of an uncontrolled spin, which ends in an explosion
    car.rival = null;   // another traffic car this one is bullying
    car.rivalTime = 0;
    car.grudge = false; // set once the player has upset this driver
    car.wreckedByPlayer = false; // set once one of the player's packages has doomed it (see Packages)
    car.spite = false;           // an evil driver given a gift by the player: it throws at the player now and then...
    car.offended = 0;            // ...after this many s of throwing only at the player (see CONFIG.giftOffence)
    car.ufoBurning = false; // burning up after a UFO air strike (see UfoStrike)
    car.toad = null;        // in TOAD RAGE: what it was before it became a toad (see toadify)
    car.pulledOver = false; // on the shoulder, out of the way of the player's siren
    car.arrest = -1;        // s into being carried off by the police (see arrest); -1 = not
    car.braking = false;    // its brake lights are on
    car.signal = 0;         // indicating: +1 towards the next lane up (lat increasing), -1 the next down
    car.hazards = false;    // hazard lights: pulled over onto the shoulder for a siren
    car.pendingLane = null; // the lane it is signalling for, until it moves over (see signalTo)
    car.pendingForced = false; // ...because its lane ends or it is taking a ramp
    car.signalTime = 0;     // s of signalling left before it moves over
    car.hesitant = false;   // hesitating (see CONFIG.hesitation)...
    car.tap = 0;            // ...s left of a touch of the brakes...
    car.tapWait = 0;        // ...s to the next
    car.wander = Math.random() * 6; // (where it is in its drift about the lane)
    car.fromBehind = false; // came up from behind the player
    car.onIce = false;      // on an ice patch (see CONFIG.ice)
    car.racer = false;      // one of a race's grid (see placeFixed)
    car.slideVel = 0;       // m/s it is sliding wide in a bend (a level with "understeer")
    car.stalled = false;    // stalled in the tide's water, hazards on (see Tide)
    car.halted = 0;         // pulled over for good (to the shoulder on this side: -1 | 1), its lane blocked ahead (see Wreckage)
    car.junction = null;    // leaving the road at a junction: on its way off, in the world (see leaveAtJunction)
    car.junctionSeen = -1;  // the s of the last junction it came to (and chose a way at)
    car.parked = false;     // parked on a shoulder, hazards on (see placeFixed)...
    car.parkSide = 1;       // ...on this side (-1 left, 1 right)
    car.pulledFor = null;   // the siren it is pulled over for: Player, or an emergency vehicle
    car.emergency = false;  // an emergency vehicle (see startEmergency)...
    car.blocker = null;     // ...the vehicle in its way, if any...
    car.blockTime = 0;      // ...for how long (s) it has been close behind it...
    car.sparePlayer = false; // ...and done waiting for a player nobody could bust
    if (toads) makeToad(car);
    car.throwTimer = CONFIG.enemyThrowMin + Math.random() * (CONFIG.enemyThrowMax - CONFIG.enemyThrowMin);
    car.think = Math.random() * 2;
    car.active = true;
  };

  // where a parked car stands: on the outer half of its shoulder, leaving passing traffic room
  const parkedLat = (side, s) => Track.shoulderOffset(side, s) + side * 0.5;
  // Vehicles the level puts in a fixed place (its tractors): each takes a car from the pool,
  // waits where it was put until the player comes within range, and is never recycled.
  const placeFixed = () => {
    for (const t of LEVEL.tractors || []) {
      const s = Track.place(t);
      const dir = Track.flow === 'north' ? 1 : Track.flow === 'south' ? -1
        : t.lane < Track.leftLanes ? -1 : 1; // (the left side of a two-way road is oncoming)
      const car = cars.find(c => !c.active && !c.unused && c.dir === dir);
      if (!car) continue;
      car.s = s;
      outfit(car, 'tractor', t.lane);
      car.fixed = true;
      car.viaSide = false;
      car.baseSpeed = CONFIG.tractorSpeed;
      car.vs = 0; // parked until the player is near
    }
    // ...and a race's grid (a level's "grid"): `count` cars of its kind, two by two, staggered, ahead
    // of the player, all the player's way; half of them evil (see addRacer)
    if (LEVEL.grid) {
      // (two by two in the middle lanes; on a two-lane road, in both)
      const G = LEVEL.grid, [first, last] = Track.laneRange(1, 0), lanes = last - first >= 2 ? [first + 1, first + 2] : [first, last];
      for (let k = 0; k < G.count; k++) {
        if (!addRacer((G.from ?? 14) + (G.count - 1 - k) * G.gap, lanes[k % 2], k % 2 === 1)) break;
      }
      sortGrid();
    }
    // ...and its parked cars, on the shoulders with their hazards on: a car of one of the
    // level's ordinary kinds, facing the way that side's traffic goes, that never moves off
    const ordinary = mix().filter(([kind]) => !CONFIG.vehicles[kind].special);
    for (const p of LEVEL.parked || []) {
      const side = p.side === 'left' ? -1 : 1;
      const dir = Track.flow === 'north' ? 1 : Track.flow === 'south' ? -1 : side;
      const car = cars.find(c => !c.active && c.unused) || cars.find(c => !c.active && !c.unused && c.dir === dir);
      if (!car) continue;
      car.dir = dir;
      car.bound = dir > 0 ? 'north' : 'south';
      car.s = Track.place(p);
      let r = Math.random() * ordinary.reduce((sum, [, rate]) => sum + rate, 0), kind = 'commuter';
      for (const [k, rate] of ordinary) if ((r -= rate) < 0) { kind = k; break; }
      outfit(car, kind, side > 0 ? Track.laneCount - 1 : 0);
      Object.assign(car, { fixed: true, parked: true, parkSide: side, viaSide: false, evil: false, defiant: false,
        baseSpeed: 0, vs: 0, lat: parkedLat(side, car.s), hazards: true });
    }
  };

  // a racer on the grid (a level's "grid") at s, in that lane: false if the pool has no car spare.
  // It never stops racing (however far ahead or behind), throws nothing, and goes as fast as its pace
  // allows, a share of the player's car's top speed
  const addRacer = (s, lane, evil) => {
    const car = cars.find(c => !c.active && c.unused);
    if (!car) return false;
    const G = LEVEL.grid, top = CARS_BY_ID[LEVEL.car]?.maxSpeed ?? 40;
    car.dir = 1;
    car.bound = 'north';
    car.s = s;
    outfit(car, G.kind, lane);
    Object.assign(car, { fixed: true, racer: true, evil, defiant: false, viaSide: false, hesitant: false,
      vs: 0, baseSpeed: top * between(G.pace), throwTimer: Infinity, paint: Math.floor(Math.random() * 1000), laps: 0,
      nerve: between(CONFIG.race.nerve), attack: 0, sling: 0 });
    car.emotion = pickEmotion(car.evil);
    car.mood = MOOD_START[car.emotion];
    car.place = undefined; // (its place in the running order: see raceMood)
    return true;
  };
  // the grid put in order: the slowest driver on pole, the fastest at the back (so the race is one
  // of coming through the field). A driver's pace: its top speed, and its speed through the bends
  // (which goes with the square root of its nerve)
  const sortGrid = () => {
    const field = cars.filter(c => c.active && c.racer);
    const slots = field.map(c => ({ s: c.s, lane: c.lane })).sort((a, b) => b.s - a.s);
    const pace = (c) => c.baseSpeed * Math.sqrt(c.nerve || 1);
    field.sort((a, b) => pace(a) - pace(b)).forEach((c, i) => {
      c.s = slots[i].s;
      c.lane = slots[i].lane;
      c.lat = Track.laneOffset(c.lane, c.s);
    });
  };
  // how a traffic driver treats the player (see CONFIG.attitude): by its side, its mood and the
  // player's side. null: it pays the player no special attention. (Not racers, who have race rules
  // of their own; nor the police, ambulances, nor trucks and tractors, which keep to themselves)
  const minds = (car) => Player.active && !car.racer && car.kind !== 'police' && !car.emergency && car.kind !== 'tractor' &&
    !CONFIG.vehicles[car.kind].kerb && car.dir === Player.dir;
  const attitude = (car) => {
    if (!minds(car)) return null;
    const mood = car.emotion;
    if (!car.evil) {
      if (mood === 'happy') return Player.evil ? 'wary' : 'friendly';
      if (mood === 'angry') return Player.evil ? 'vigilante' : 'sulky';
      return Player.evil ? 'distant' : null;
    }
    if (mood === 'happy') return Player.evil ? 'wingman' : 'smug';
    if (mood === 'angry') return Player.evil ? 'turf' : car.spite ? null : 'rage'; // (angry at a gift: no road rage, see Packages)
    return null;
  };
  // the turf war (CONFIG.attitude.hunt): a driver starts hunting the player
  const startHunt = (car) => {
    car.hunt = CONFIG.attitude.hunt.time;
    car.grudge = true;
  };
  // a car wrecked by the player: an evil player wins the respect of the evil drivers about
  const wreckedByPlayer = (wreck) => {
    const W = CONFIG.attitude.wreckCheer;
    if (!Player.evil) return;
    for (const o of cars) {
      if (o === wreck || !o.active || !o.evil || o.racer || o.hunt > 0 || Math.abs(o.s - wreck.s) > W.range) continue;
      o.mood = Math.min(1, o.mood + W.mood);
      o.showMood = true;
    }
  };
  // the hunters' roles, worked out once a frame: with two or more on the player, the nearest ahead
  // blocks, the nearest behind tails, and the rest flank (alone: it just goes for the player)
  const huntRoles = () => {
    const hunters = cars.filter(c => c.active && c.hunt > 0);
    for (const c of hunters) c.huntRole = 'solo';
    if (hunters.length < 2) return;
    const ahead = hunters.filter(c => c.s > Player.s).sort((a, b) => a.s - b.s);
    const behind = hunters.filter(c => c.s <= Player.s).sort((a, b) => b.s - a.s);
    for (const c of ahead) c.huntRole = 'drop';
    if (ahead[0]) ahead[0].huntRole = 'block';
    for (const c of behind) c.huntRole = 'flank';
    if (behind[0]) behind[0].huntRole = 'tail';
  };
  // could the car move over into that lane right now?
  const canMove = (car, lane, ignorePlayer) => {
    const [first, last] = Track.laneRange(car.dir, car.s);
    if (lane < first || lane > last) return false;
    if (Track.openLane(lane, car.s) !== lane || Track.openLane(lane, car.s + car.dir * 70) !== lane) {
      return false; // that lane isn't there, or ends just ahead
    }
    if (!laneClear(car, lane, CONFIG.laneChangeGap)) return false;
    if (!ignorePlayer && playerInWay(car, lane)) return false;
    if (car.dir > 0 && lane > car.lane && lane > Tide.dryLane(car.s + 70)) return false; // (nobody moves over into the tide's water)
    return true;
  };
  // A calm (happy or neutral), good driver decides early and signals: it moves over
  // CONFIG.signalTime later, if the lane is still free then (see update). Evil and angry drivers just go.
  const courteous = (car) => !car.evil && car.emotion !== 'angry';
  const signalTo = (car, lane, forced) => {
    car.pendingLane = lane;
    car.pendingForced = forced; // (its lane ends, or it is taking a ramp: it waits for room, however long)
    car.signal = Math.sign(lane - car.lane);
    car.signalTime = CONFIG.signalTime;
  };
  const tryMove = (car, dir, ignorePlayer) => {
    const lane = car.lane + dir;
    if (!canMove(car, lane, ignorePlayer)) return false;
    if (courteous(car)) signalTo(car, lane, false);
    else car.lane = lane;
    return true;
  };

  // a hard touch of the brakes, every so often, in front of the player (see CONFIG.attitude)
  const brakeCheck = (car, dt) => {
    const A = CONFIG.attitude, ds = car.s - Player.s;
    if ((car.checkWait = (car.checkWait ?? between(A.brakeCheckEvery)) - dt) > 0 || ds <= 0 || ds > A.brakeCheckRange + car.hl + Player.hl) return;
    car.checkWait = between(A.brakeCheckEvery);
    car.tap = CONFIG.hesitation.tapTime;
  };
  // an evil racer that is angry: in a fury, faster all round (see CONFIG.race.fury)
  const furious = (car) => car.racer && car.evil && car.emotion === 'angry';
  // how hard an evil racer left behind is chasing down the car in front of it: 0 .. 1 (see CONFIG.race.chase)
  const chasing = (car) => {
    const C = CONFIG.race.chase;
    return car.racer && car.evil ? clamp(((car.aheadGap || 0) - C.from) / (C.full - C.from), 0, 1) : 0;
  };
  // how fast a racer may go for the bends ahead of it (see CONFIG.race): as fast as its nerve allows
  const racingLine = (car) => {
    const R = CONFIG.race, type = CONFIG.vehicles[car.kind];
    let sharpest = 0;
    for (let d = 0; d <= R.aiLookout; d += 5) sharpest = Math.max(sharpest, Math.abs(Track.bend(car.s + car.dir * d)));
    const nerve = (car.nerve || 1) * (car.attack > 0 ? R.attackNerve : 1) * (furious(car) ? R.fury.nerve : 1) *
      (1 + (R.chase.nerve - 1) * chasing(car)); // (its own, and more on the attack, in a fury, or chasing down the car in front)
    return sharpest > 1e-4 ? Math.sqrt(CONFIG.ice.grip * R.aiTyres * R.aiGrip * nerve * (type.agility || 1) / (weightOf(car) * sharpest)) : Infinity;
  };
  // the slipstream (a race: see CONFIG.race): how deep in the tow of a car ahead a car at s, lat
  // (so wide) is, from 0 (none) to 1 (on its gearbox). Any racer ahead gives a tow, and so does the player
  const tow = (self, s, lat, hw) => {
    if (!LEVEL.grid) return 0;
    const R = CONFIG.race;
    let best = 0;
    const behind = (os, olat, ohw) => {
      let gap = os - s;
      if (Track.loop && gap < -Track.length / 2) gap += Track.length; // (just over the line)
      if (gap > 0 && gap < R.towReach && Math.abs(olat - lat) < (ohw + hw) * 0.8) best = Math.max(best, 1 - gap / R.towReach);
    };
    for (const o of cars) if (o !== self && o.active && o.racer) behind(o.s, o.lat, o.hw);
    if (self !== Player && Player.active) behind(Player.s, Player.lat, Player.hw);
    return best;
  };
  // a racer on a straight, out of any tow, looks for one: a car not far ahead in the lane beside, and
  // moves over in behind it (then, closing on it, it is held up and pulls out to pass: see update)
  const seekTow = (car, dt) => {
    const R = CONFIG.race;
    if (car.tow > 0.2 || car.pendingLane !== null || (car.seek = (car.seek || 0) - dt) > 0) return;
    car.seek = R.seekEvery * (0.6 + Math.random() * 0.8);
    if (racingLine(car) < car.baseSpeed * 1.05) return; // (a bend coming: no time for it)
    let best = null, nearest = Infinity;
    for (const o of cars) {
      if (o === car || !o.active || !o.racer || o.lane === car.lane || Math.abs(o.lane - car.lane) > 1) continue;
      const gap = o.s - car.s;
      if (gap > o.hl + car.hl + 3 && gap < R.seekReach && gap < nearest) { nearest = gap; best = o; } // (anywhere it is not alongside)
    }
    if (best && canMove(car, best.lane, false)) {
      car.signal = best.lane - car.lane;
      car.lane = best.lane;
    }
  };
  // a race's moods (see CONFIG.race): the running order (the racers and the player, furthest round
  // first), and each racer's place in it against the last: places gained cheer it up, places lost get
  // it down, the more so up front; and up front, it cheers up as the race goes on, unless there is
  // someone right behind it. And an evil racer that wrecks another is delighted
  const raceMood = (dt) => {
    const R = CONFIG.race, field = cars.filter(c => c.racer).map(c => ({ c, at: (c.laps || 0) * Track.length + c.s }));
    if (Player.active) field.push({ c: Player, at: Game.lap * Track.length + Player.s });
    field.sort((a, b) => b.at - a.at);
    field.forEach(({ c, at }, place) => {
      if (c === Player) return;
      if (c.wasRacing && !c.active) { // (wrecked just now: another racer's doing, if it hit it just now)
        const by = c.hitBy;
        if (by && by.racer && by !== c && by.evil && Game.time - c.hitAt < R.killWindow) by.mood = Math.min(1, by.mood + R.killMood);
      }
      c.wasRacing = c.active;
      const front = Math.max(0, 1 - 2 * place / field.length); // (1 for the leader, down to 0 halfway back)
      if (c.active && c.place !== undefined && place !== c.place) {
        const swing = 1 + (R.frontSwing - 1) * front;
        c.mood += (place < c.place ? (c.place - place) * R.passMood : -(place - c.place) * R.passedMood) * swing;
      }
      const chased = field[place + 1] && at - field[place + 1].at < R.pressure;
      if (c.active) c.mood += (chased ? -R.pressureMood * front : R.leadMood) * front * dt;
      c.mood = clamp(c.mood, -1, 1);
      c.place = place;
      c.aheadGap = place > 0 ? field[place - 1].at - at : 0; // (to the car in front in the running order: see chasing)
    });
  };
  // a horn to suit the vehicle (police cars have sirens instead), only near the player
  const HORNS = { commuter: 'hornSmall', sport: 'hornSmall', darkvan: 'hornBig', van: 'hornBig', tractor: 'hornBig', bus: 'hornBus' };
  const honk = (car) => {
    if (car.kind === 'police' || car.honkWait > 0 || Math.abs(car.s - Player.s) > CONFIG.hornRange) return;
    car.honkWait = CONFIG.hornWait;
    sfxAt(HORNS[car.kind] || 'horn', car.s);
  };

  // A car that hurts the player while the player's siren sounds is arrested: a police
  // helicopter comes down and carries it off (render/helicopter.js). Until it is gone it
  // touches nothing, and nothing touches it.
  // (with the player's standing high enough, an evil car that assaults it with a police car about
  // is arrested too: see Social)
  // (and the driver has something to say about it: messages.json, reactions)
  const arrest = (car) => {
    if (Player.damageScale <= 0) return;
    const siren = Player.siren > 0;
    if ((siren || (Social.protected && car && car.evil && policeNear())) && arrestNow(car)) {
      Message.say('reactions', !siren ? 'arrestedStanding' : car.evil ? 'arrestedSirenEvil' : 'arrestedSirenGood');
    }
  };
  // (also what happens to a car that won't get out of an ambulance's way)
  // (true: it is arrested now)
  const arrestNow = (car) => {
    if (!car || car.isPlayer || !car.active || car.toad || car.arrest >= 0) return false;
    car.arrest = 0;
    car.rival = null;
    return true;
  };

  // in range of the player's siren: ahead of the player (coming its way, or going it)
  const underSiren = (car) => Player.siren > 0 && Player.active &&
    car.s - Player.s > 0 && car.s - Player.s < CONFIG.sirenPickup.range;
  // the siren a car gives way to, if any: the player's, or an emergency vehicle's coming up behind
  // it in its lane (unless it is one of the few evil drivers who won't give way to that)
  const E = CONFIG.emergency;
  const sirenFor = (car) => {
    if (underSiren(car)) return Player;
    if (car.emergency || car.defiant) return null;
    for (const a of cars) {
      if (!a.active || !a.emergency || a.dir !== car.dir) continue;
      const gap = (car.s - a.s) * a.dir;
      if (gap > 0 && gap < E.range && Track.openLane(car.lane, car.s) === Track.openLane(a.lane, car.s)) return a;
    }
    return null;
  };
  // the lane that siren wants cleared, where the car is
  const sirenLane = (siren, car) => siren.isPlayer ? Track.nearestLane(Player.lat, Player.s) : Track.openLane(siren.lane, car.s);
  // a car stays pulled over while the player's siren sounds, or until the emergency vehicle is by
  const stillPulledOver = (car) => {
    const siren = car.pulledFor;
    if (siren === Player) return Player.siren > 0;
    return !!siren && siren.active && siren.emergency && (car.s - siren.s) * siren.dir > -(car.hl + siren.hl + 10);
  };

  const think = (car) => {
    if (car.kind === 'tractor' || CONFIG.vehicles[car.kind].kerb) return; // a tractor just trundles along its lane, and a truck keeps to the kerb
    if (car.pendingLane !== null) return; // (already signalling for a move)
    if (sirenFor(car)) return; // (no lane changes of its own with a siren behind it)
    // angry evil drivers pick on whoever is nearest (a good one only fights back, when it is hit)
    if (car.emotion === 'angry' && car.evil && !car.rival && Math.random() < CONFIG.rivalryPickChance) {
      let best = null, bestGap = CONFIG.rivalryRange;
      for (const o of cars) {
        if (o === car || !o.active || o.junction || o.dir !== car.dir) continue;
        const gap = Math.abs(o.s - car.s);
        if (gap < bestGap) { best = o; bestGap = gap; }
      }
      if (best) startRivalry(car, best);
    }
    // its attitude to the player (see CONFIG.attitude), with the player coming up behind it (or,
    // for a wary one, anywhere near)
    const ahead = car.s - Player.s; // how far this car is ahead of the player
    const playerLane = Track.nearestLane(Player.lat, Player.s);
    const inRange = Player.active && car.dir > 0 && ahead > 8 && ahead < CONFIG.attitudeRange;
    const near = Player.active && car.dir > 0 && Math.abs(ahead) < CONFIG.attitudeRange;
    const att = attitude(car), aside = () => {
      const dir = Math.random() < 0.5 ? 1 : -1;
      tryMove(car, dir) || tryMove(car, -dir);
    };
    if (att === 'turf' && car.hunt > 0) return; // (hunting: see update)
    if ((att === 'smug' || att === 'rage' || att === 'vigilante') && inRange) { // into the player's lane, in its way
      const dir = Math.sign(playerLane - car.lane);
      if (dir) tryMove(car, dir, true);
    } else if ((att === 'friendly' || att === 'wingman') && inRange && playerLane === car.lane) aside();
    else if (att === 'wary' && near && playerLane === car.lane) aside();
    else if (att === 'sulky' && inRange) { /* it holds its lane */ } else if (Math.random() < CONFIG.laneChangeChance) {
      tryMove(car, Math.random() < 0.5 ? 1 : -1);
    }
  };

  // ---- emergency vehicles (see CONFIG.emergency) ------------------------------------------------
  let nextEmergency = Infinity; // s to the next one, on a level with "emergencies"
  // sets one off, going the player's way (dir 1: from behind the player, in the player's lane if
  // the player is in one going that way) or coming the other way (from up the road), never a way
  // the level's traffic doesn't go (see update). It takes a car from the pool that the level
  // leaves unused (so a level needs one spare). Returns it, or null if there was no room.
  const startEmergency = (dir) => {
    const car = cars.find(c => !c.active && c.unused);
    if (!car || !Player.active || !Track.isMain(Player.s)) return null;
    const s = Player.s + (dir > 0 ? -E.behind : CONFIG.spawnMin + Math.random() * (CONFIG.spawnMax - CONFIG.spawnMin));
    if (!Track.inBounds(s)) return null;
    car.dir = dir;
    car.bound = dir > 0 ? 'north' : 'south';
    car.s = s;
    const [first, last] = Track.laneRange(dir, s), mine = Track.nearestLane(Player.lat, Player.s);
    const lane = dir > 0 && mine >= first && mine <= last ? mine : first + Math.floor(Math.random() * (last - first + 1));
    outfit(car, 'ambulance', Track.openLane(lane, s));
    if (car.toad) { // (set off in TOAD RAGE: an ambulance stays an ambulance)
      Object.assign(car, car.toad);
      car.toad = null;
    }
    Object.assign(car, { emergency: true, evil: false, defiant: false, viaSide: false, emotion: 'neutral', mood: 0, baseSpeed: E.speed, vs: dir * E.speed });
    if (dir > 0) Message.say('events', 'emergency'); // (only one coming up behind the player says so)
    return car;
  };
  // where its lane is at s
  const pathLat = (car, s) => Track.laneOffset(Track.openLane(car.lane, s), s);
  const driveEmergency = (car, dt) => {
    // the nearest thing ahead in its lane, not yet fully out of it (cars being carried off, which
    // touch nothing, and toads, which it bursts, don't count)
    let blocker = null, gap = Infinity;
    const consider = (v) => {
      const d = (v.s - car.s) * car.dir - v.hl - car.hl;
      if (d < -1 || d > E.range || d >= gap) return;
      if (Math.abs(v.lat - pathLat(car, v.s)) >= v.hw + car.hw) return;
      blocker = v;
      gap = d;
    };
    for (const o of cars) if (o !== car && o.active && o.arrest < 0 && !o.toad && !o.emergency && !o.junction) consider(o);
    if (Player.active && Player.ghost <= 0) consider(Player);
    // close behind it: it has giveWay s to get out of the way, or it is arrested (the player busted;
    // a player who is busted already, or can't be, it just waits behind)
    if (blocker !== car.blocker || gap > E.reach) car.blockTime = 0;
    car.blocker = blocker;
    const caught = blocker && blocker.isPlayer && (Player.busted || car.sparePlayer);
    if (blocker && !caught && gap <= E.reach && (car.blockTime += dt) >= E.giveWay) {
      if (blocker.isPlayer) {
        Player.bust('emergency');
        if (!Player.busted) car.sparePlayer = true; // (a radar detector, or a tank)
      } else arrestNow(blocker);
      car.blocker = null;
      car.blockTime = 0;
    }
    // full speed, or as fast as lets it stop in time behind what is in its way
    // (an ambulance on a call takes the bends flat out)
    let target = car.baseSpeed;
    if (car.blocker) {
      const theirs = Math.max(0, car.blocker.vs * car.dir);
      target = Math.min(target, theirs + Math.sqrt(2 * E.brake * Math.max(0, gap - E.followGap)));
    }
    car.braking = Math.abs(car.vs) > target + 0.8;
    car.vs += (car.dir * target - car.vs) * damp(car.braking ? 8 : 1.5, dt);
    car.s += car.vs * dt;
    if (car.blocker) { // (and it never runs into it)
      const room = (car.blocker.s - car.s) * car.dir - car.blocker.hl - car.hl;
      if (room < 1) {
        car.s = car.blocker.s - car.dir * (car.blocker.hl + car.hl + 1);
        car.vs = car.dir * Math.max(0, car.blocker.vs * car.dir);
      }
    }
    Track.transfer(car);
    // held to its lane
    car.latVel = (pathLat(car, car.s) - car.lat) * 4;
    car.lat += car.latVel * dt;
    car.signal = 0;
    car.hazards = false;
    keepOnRoad(car, 0.3);
    updateYaw(car, dt);
  };

  // ---- junctions (see CONFIG.junction and Track.junctions) ------------------------------------
  // A car leaving the road at a junction leaves its s and lat behind for a path in the world:
  // car.junction = { j (which junction), path: [pieces], u (m along it), length, into / outOf (u at
  // the box's edges) }. A piece is a straight { start, dir, length } or a quarter turn
  // { start, dir, radius, turn (1 right, -1 left), length }. At the end of its path it is gone. It
  // touches nothing on the way (see Collision); car.wx / wy / wz / wh are where it is and which
  // way it faces, for drawing.
  const J = CONFIG.junction;
  const rightOf = (d) => ({ x: -d.z, z: d.x });
  const along = (p, d, u) => ({ x: p.x + d.x * u, z: p.z + d.z * u });
  // where a piece puts a car `l` m along it, and which way it faces
  const onPiece = (piece, l) => {
    if (!piece.radius) return { at: along(piece.start, piece.dir, l), dir: piece.dir };
    const r = rightOf(piece.dir), t = piece.turn, a = l / piece.radius, R = piece.radius;
    const side = { x: r.x * t, z: r.z * t }; // (towards the middle of the turn)
    return {
      at: { x: piece.start.x + side.x * R * (1 - Math.cos(a)) + piece.dir.x * R * Math.sin(a),
            z: piece.start.z + side.z * R * (1 - Math.cos(a)) + piece.dir.z * R * Math.sin(a) },
      dir: { x: piece.dir.x * Math.cos(a) + side.x * Math.sin(a), z: piece.dir.z * Math.cos(a) + side.z * Math.sin(a) },
    };
  };
  const placeOnJunction = (car) => {
    const g = car.junction;
    let u = g.u;
    for (const piece of g.path) {
      if (u > piece.length && piece !== g.path[g.path.length - 1]) { u -= piece.length; continue; }
      const { at, dir } = onPiece(piece, Math.min(u, piece.length));
      car.wx = at.x;
      car.wz = at.z;
      car.wh = Math.atan2(dir.x, dir.z);
      break;
    }
    car.wy = Track.junctions[g.j].centre.y;
  };
  // a car going the player's way, just at a junction: does it leave the road here? At a turn, carrying
  // straight on (from any lane); straight on, turning off down the arm on its side (from the outside lane)
  const leaveAtJunction = (car) => {
    if (car.dir < 0 || !Track.isMain(car.s) || car.parked || car.emergency || car.toad || car.fixed ||
        car.spin > 0 || car.stun > 0 || car.wobble > 0 || car.arrest >= 0 || car.pulledOver) return false;
    const i = Track.junctions.findIndex(jn => car.s >= jn.s && car.s < jn.s + 4);
    if (i < 0 || car.junctionSeen === Track.junctions[i].s) return false;
    const jn = Track.junctions[i];
    car.junctionSeen = jn.s;
    const start = {};
    Track.toWorld(jn.s, car.lat, start);
    let path;
    if (jn.way) {
      // (not across an oncoming car that is in the box, or about to be: then it follows the road)
      const oncoming = cars.some(c => c.active && !c.junction && c.dir < 0 && c.s > jn.s - 2 && c.s < jn.end + 12);
      if (oncoming || Math.random() >= jn.forward) return false;
      path = [{ start, dir: jn.f0, length: jn.radius + jn.arms[0].length }];
    } else {
      const [, last] = Track.laneRange(1, car.s);
      if (Track.openLane(car.lane, car.s) !== last || Math.random() >= jn.turnOff) return false;
      // a quarter turn to its side, into that arm's lane going away (as far out as it is now), then on down it
      const radius = Math.max(3, jn.half - Math.abs(car.lat)), arm = jn.arms[0];
      const turn = { start, dir: jn.f0, radius, turn: 1, length: radius * Math.PI / 2 };
      const end = onPiece(turn, turn.length);
      path = [turn, { start: end.at, dir: arm.dir, length: arm.length - jn.half }];
    }
    car.junction = { j: i, path, u: 0, length: path.reduce((sum, piece) => sum + piece.length, 0),
      into: 0, outOf: jn.way ? jn.radius + jn.half : path[0].length + 2 };
    car.vs = Math.abs(car.vs);
    car.pendingLane = null;
    car.signal = 0;
    placeOnJunction(car);
    return true;
  };
  const driveJunction = (car, dt) => {
    const g = car.junction;
    car.braking = false;
    car.signal = 0;
    car.hazards = false;
    g.u += car.vs * dt;
    if (g.u >= g.length) { car.active = false; return; } // (gone, off down the arm)
    placeOnJunction(car);
  };
  // is a car leaving across each junction's box just now? (traffic coming the other way gives way)
  const junctionState = () => {
    Track.junctions.forEach((jn, i) => {
      jn.busy = cars.some(c => c.active && c.junction && c.junction.j === i && c.junction.u < c.junction.outOf + 1);
    });
  };
  // how fast a car on the road may go, giving way at a box that a car is leaving across: it waits
  // at the box's edge (coming the other way, at its far edge) until the box is clear again
  const giveWay = (car) => {
    for (const jn of Track.junctions) {
      const d = car.dir > 0 ? jn.s - 3 - car.s : car.s - (jn.end + 3);
      if (d > 0 && d < 30 && jn.busy) return Math.sqrt(2 * J.stopping * Math.max(0, d - 1));
    }
    return Infinity;
  };

  const reset = () => {
    // how many are about, each way: the level's counts, or the usual ones
    const count = LEVEL.trafficCount !== undefined ? LEVEL.trafficCount : CONFIG.trafficCount;
    const oncoming = LEVEL.oncomingCount !== undefined ? LEVEL.oncomingCount : CONFIG.oncomingCount;
    cars.forEach((car, i) => {
      const north = Track.flow === 'north' || (Track.flow !== 'south' && i < count);
      car.dir = north ? 1 : -1;
      car.bound = north ? 'north' : 'south';
      car.active = false;
      car.unused = i >= count + oncoming; // (never spawned on this level)
      car.fixed = false;
      // (and nothing left over from the last run, on a car that may not be dealt out again for a while)
      Object.assign(car, { junction: null, parked: false, stalled: false, halted: 0, racer: false, slideVel: 0, respawnIn: 0, shield: 0, emergency: false, hesitant: false, pulledOver: false, pulledFor: null, rival: null, toad: null });
    });
    placeFixed();
    nextEmergency = LEVEL.emergencies ? between(LEVEL.emergencies.every) : Infinity;
    if (!mix().length) return; // otherwise an empty road
    // (when everything is oncoming, the first of it starts further off)
    for (const car of cars) if (!car.active && !car.unused) spawn(car, Track.flow === 'south' ? 200 : 60, CONFIG.spawnMax);
  };

  const update = (dt) => {
    // now and then an emergency vehicle, either way (one at a time; if there is no room for it
    // just now, it tries again a second later)
    if (LEVEL.emergencies && !cars.some(c => c.active && c.emergency) && (nextEmergency -= dt) <= 0) {
      const dir = Track.flow === 'north' ? 1 : Track.flow === 'south' ? -1 : Math.random() < 0.5 ? 1 : -1;
      nextEmergency = startEmergency(dir) ? between(LEVEL.emergencies.every) : 1;
    }
    if (Track.junctions.length) junctionState();
    if (LEVEL.grid) raceMood(dt);
    huntRoles();
    for (const car of cars) {
      if (car.active && car.junction) { // leaving the road at a junction
        driveJunction(car, dt);
        continue;
      }
      if (!car.active && car.racer) { // a racer wrecked: back in the race where it was wrecked, a moment later
        if ((car.respawnIn = (car.respawnIn || CONFIG.race.respawnTime) - dt) <= 0) {
          const [first, last] = Track.laneRange(1, car.s), lane = clamp(Track.nearestLane(car.lat, car.s), first, last);
          Object.assign(car, { active: true, respawnIn: 0, health: car.maxHealth, smoke: 0, vs: 0, lane, lat: Track.laneOffset(lane, car.s),
            latVel: 0, slideVel: 0, yaw: 0, yawVel: 0, stun: 0, spin: 0, wobble: 0, rival: null, pendingLane: null, signal: 0,
            shield: CONFIG.race.respawnShield, wreckedByPlayer: false });
        }
        continue;
      }
      if (car.racer) car.shield = Math.max(0, (car.shield || 0) - dt); // (untouchable, just set down)
      if (!car.active) {
        // (a fixed vehicle that has gone stays gone: its slot is not reused this run)
        if (!car.fixed && !car.unused && mix().length) {
          const behind = hesitation() && car.dir === Player.dir && Math.random() < H.behindChance && hesitantAhead();
          if (!(behind && spawnBehind(car))) spawn(car, CONFIG.spawnMin, CONFIG.spawnMax);
        }
        continue;
      }
      if (car.racer && Track.loop && car.s >= Track.length) { // (a racer over the line: a lap done, round again)
        car.s -= Track.length;
        car.laps++;
      }
      const ahead = Track.along(car.s) - Track.along(Player.s); // along the course, whichever road
      if (car.fixed && !car.racer && ahead > CONFIG.spawnMax) continue; // still waiting where the level put it
      // (an emergency vehicle going the player's way starts out behind the player, and is gone
      // once it is well ahead; one coming the other way once it is behind)
      const gone = !car.emergency ? ahead < -CONFIG.despawnBehind || ahead > CONFIG.spawnMax + 150
        : car.dir > 0 ? ahead < -E.behind - 100 || ahead > CONFIG.spawnMax + 150
        : ahead < -CONFIG.despawnBehind || ahead > CONFIG.spawnMax + 300;
      if ((gone && !car.racer && !(car.hunt > 0)) || !Track.inBounds(car.s)) { // (a racer races on, wherever it is; so does a hunter)
        car.active = false;
        continue;
      }

      car.honkWait = Math.max(0, car.honkWait - dt);
      if (car.arrest >= 0) { // being carried off by the police: it brakes to a stop, and is gone at the end
        car.arrest += dt;
        car.braking = true;
        car.signal = 0;
        car.hazards = false;
        car.vs -= car.vs * Math.min(1, dt * 1.5);
        car.latVel = 0;
        car.s += car.vs * dt;
        Track.transfer(car);
        if (car.arrest >= CONFIG.sirenPickup.arrestTime) car.active = false;
        continue;
      }
      // an angel or a jerk (mysteries): everyone thinks the world of the player, or hates them
      if (Player.mystery === 'angel') car.mood = 1;
      else if (Player.mystery === 'jerk') car.mood = -1;
      if (car.toad) { // TOAD RAGE: straight on at a toad's pace, whatever is in the way
        car.vs = car.dir * CONFIG.mystery.toadSpeed;
        car.latVel = 0;
        car.yaw = car.yawVel = 0;
        car.s += car.vs * dt;
        Track.transfer(car);
        keepOnRoad(car, 0);
        continue;
      }
      // ice: a car hitting a patch may spin out (and blow up), the likelier the faster it is going
      // (not one that is parked, nor an ambulance)
      const icy = !!Track.icy(car.s, car.lat);
      if (icy && !car.onIce && !car.parked && !car.emergency && !(car.spin > 0) && !CONFIG.vehicles[car.kind].noSpin &&
          Math.random() < CONFIG.ice.spinPerSpeed * Math.abs(car.vs)) {
        spinOut(car);
        car.spinIce = true; // (it skidded: it isn't damaged, so it doesn't smoke for it)
      }
      car.onIce = icy;
      // the tide (going the player's way): a car a wave catches in deep water stalls there
      // (not one that is parked, nor an ambulance)
      const depth = car.dir > 0 ? Tide.depth(car.s, car.lat) : 0;
      if (depth >= CONFIG.tide.deep && !car.stalled && !car.parked && !car.emergency && !car.fixed && !(car.spin > 0) && Tide.surging(car.s)) {
        car.stalled = true;
        car.pendingLane = null;
      }
      // wreckage: a car whose lane is blocked ahead pulls over onto the nearer shoulder, and stops there
      if (!car.halted && !car.emergency && !car.parked && !car.fixed && !(car.spin > 0) && Wreckage.ahead(car)) {
        car.halted = car.lat < (Track.laneLo(car.s) + Track.laneHi(car.s)) / 2 ? -1 : 1;
        car.pendingLane = null;
      }
      if (car.spin > 0 || car.stun > 0) { // (out of control: no signalling, no brakes)
        car.braking = car.hazards = false;
        car.signal = 0;
        car.pendingLane = null;
      }
      if (car.spin > 0) {
        // spun out: no control at all. Its momentum swings round in an arc while the body
        // slowly turns a full circle; it can still hit, and be hit by, anything in its way
        // (a head-on included). When the time is up it blows.
        // (the turn goes into yaw, which is what the hitbox and the model are both drawn from,
        // so the two keep turning together)
        car.spin -= dt;
        car.yaw -= car.spinTurn * dt * 2 * Math.PI / CONFIG.spinTime;
        const speed = Math.hypot(car.vs, car.latVel) * (1 - CONFIG.spinDrag * dt);
        const angle = Math.atan2(car.latVel, car.vs) + car.spinRate * dt;
        car.vs = Math.cos(angle) * speed;
        car.latVel = Math.sin(angle) * speed;
        car.s += car.vs * dt;
        Track.transfer(car);
        car.lat += car.latVel * dt; // (nothing keeps it on the road: it can spin off onto the grass)
        if (car.spin <= 0) car.health = 0;
        continue;
      }

      if (car.wobble > 0) {
        // a critical hit: it shakes from side to side for a moment, then goes
        car.wobble -= dt;
        car.yawVel = Math.sin(car.wobble * 24) * 4;
        // (then it spins out; an 18-wheeler, which never spins, blows up there and then)
        if (car.wobble <= 0) {
          if (CONFIG.vehicles[car.kind].noSpin) car.health = 0;
          else spinOut(car);
        }
      }

      if (car.parked) { // parked, hazards on: it goes nowhere, but a shove moves it along the shoulder
        car.vs -= car.vs * Math.min(1, dt * 3);
        car.s += car.vs * dt;
        car.latVel = 0;
        car.lat = parkedLat(car.parkSide, car.s);
        car.braking = false;
        car.signal = 0;
        car.hazards = true;
        updateYaw(car, dt);
        continue;
      }
      if (car.stalled) { // stalled in the water, hazards on: it goes nowhere, but can still be shoved about
        car.vs -= car.vs * Math.min(1, dt * 2);
        car.latVel -= car.latVel * Math.min(1, dt * 3);
        car.s += car.vs * dt;
        Track.transfer(car);
        car.lat += car.latVel * dt;
        keepOnRoad(car, 0.3);
        car.braking = false;
        car.signal = 0;
        car.hazards = true;
        updateYaw(car, dt);
        continue;
      }
      if (car.halted) { // pulling over, signalling, then stopped on the shoulder with its hazards on
        const aim = Track.shoulderOffset(car.halted, car.s) + car.halted * 0.4;
        car.vs -= car.vs * Math.min(1, dt * 1.5);
        car.latVel = clamp((aim - car.lat) * 2, -4, 4);
        car.s += car.vs * dt;
        Track.transfer(car);
        car.lat += car.latVel * dt;
        keepOnRoad(car, 0.3);
        const there = Math.abs(aim - car.lat) < 0.5;
        car.braking = Math.abs(car.vs) > 0.5;
        car.signal = there ? 0 : car.halted;
        car.hazards = there;
        updateYaw(car, dt);
        continue;
      }
      // at a junction, some leave the road down an arm the player can't take (see leaveAtJunction)
      if (leaveAtJunction(car)) continue;
      if (car.emergency) { // an ambulance on its way: see driveEmergency
        driveEmergency(car, dt);
        continue;
      }

      const emotion = emotionOf(car.mood);
      if (emotion === 'angry' && car.emotion !== 'angry') honk(car); // fed up
      car.emotion = emotion;

      if (car.stun > 0) {
        // knocked out of control: coast, scrub off sideways speed, no lane keeping
        car.stun = Math.max(0, car.stun - dt);
        car.vs -= car.vs * CONFIG.stunDrag * dt;
        car.latVel -= car.latVel * damp(CONFIG.stunGrip, dt);
        const [first, last] = Track.laneRange(car.dir, car.s);
        car.lane = clamp(Track.nearestLane(car.lat, car.s), first, last);
      } else {
        // evil cars lob packages at other traffic; ones the player has upset aim near the player.
        // In road rage (at a good player) they throw more often; in a turf war (at an evil one) more
        // often still; a wingman throws only at the cars about the player
        if (car.offended > 0) car.offended -= dt;
        const att = attitude(car);
        if (car.evil && Player.active && !LEVEL.noPackages &&
            Math.abs(car.s - Player.s) < CONFIG.enemyThrowRange) {
          const A = CONFIG.attitude;
          car.throwTimer -= dt * (att === 'turf' ? A.turfThrowRate : att === 'rage' ? A.rageThrowRate : 1);
          if (car.throwTimer <= 0) {
            car.throwTimer = CONFIG.enemyThrowMin + Math.random() * (CONFIG.enemyThrowMax - CONFIG.enemyThrowMin);
            Packages.throwAtGround(car, att === 'wingman' ? 'escort' : null);
          }
        }

        // a rival nearby: this car chases it, crowds it and won't brake for it
        let rival = car.rival;
        if (rival) {
          car.rivalTime -= dt;
          if (car.rivalTime <= 0 || !rival.active || rival.dir !== car.dir ||
              Math.abs(rival.s - car.s) > CONFIG.rivalryRange * 1.5) rival = car.rival = null;
        }
        if (CONFIG.vehicles[car.kind].kerb) rival = car.rival = null; // (a truck keeps out of feuds)
        // a jerk (a mystery): every driver going the player's way and near enough goes after the
        // player as if the player were its rival, and an evil one throws at the player. (Not the
        // police, whose swerving into the player would be a bust, nor oncoming traffic: a head-on.)
        if (Player.mystery === 'jerk' && Player.active && car.kind !== 'police' && !CONFIG.vehicles[car.kind].kerb && car.dir === Player.dir &&
            Math.abs(Player.s - car.s) < CONFIG.rivalryRange) {
          rival = Player;
          car.grudge = true;
        }
        // a turf war (an angry evil driver, an evil player): it starts hunting the player once near,
        // and goes after it as its rival until it gives up (see CONFIG.attitude.hunt)
        if (att === 'turf' && !(car.hunt > 0) && Math.abs(Player.s - car.s) < CONFIG.attitudeRange) startHunt(car);
        if (car.hunt > 0) {
          car.hunt -= dt;
          if (att === null || Player.s - car.s > CONFIG.attitude.hunt.lost) car.hunt = 0;
          if (car.hunt <= 0) { // (it gives up, and cools off)
            car.hunt = 0;
            car.mood = Math.max(car.mood, -0.2);
          } else rival = Player;
        }

        // a siren (the player's, a pickup, or an emergency vehicle's): a car ahead in the lane it
        // wants cleared moves over to its own right: a lane over if that one is clear, or else
        // (from its outside lane, or with the next lane taken) onto the shoulder, the only time
        // traffic uses one; never towards the oncoming lanes. It stays pulled over, slowed, for as
        // long as the player's siren sounds, or until the emergency vehicle is by.
        const siren = sirenFor(car);
        if (car.pulledOver && !stillPulledOver(car)) {
          car.pulledOver = false;
          car.pulledFor = null;
        }
        // (lanes are compared where they lead here: where the road narrows, a car's lane may have
        // merged into the siren's, and there may be no lane to move over into, only the shoulder)
        if (siren && !car.pulledOver && Track.openLane(car.lane, car.s) === sirenLane(siren, car)) {
          const [first, last] = Track.laneRange(car.dir, car.s);
          const here = Track.openLane(car.lane, car.s), next = here + (car.dir > 0 ? 1 : -1);
          if (next >= first && next <= last && Track.openLane(next, car.s) === next && laneClear(car, next, 10)) car.lane = next;
          else {
            car.pulledOver = true;
            car.pulledFor = siren;
          }
          // (signalling to its right as it goes, whatever its manners: see the hazards below)
          car.pendingLane = null;
          car.signal = car.dir;
        }
        // (with a siren behind it, a car drops any feud it has, so its rival can't drag it back
        // into the siren's way; the feud may start up again once the siren has passed)
        if (siren) rival = null;

        // heading for a ramp, or the lane ends ahead: change lane, or ease off until there is room.
        // (a courteous driver sees it coming that much sooner, and signals first)
        const ramp = rampLane(car);
        // (a vehicle that keeps to the kerb heads back to it once it can, after a narrowing)
        const home = CONFIG.vehicles[car.kind].kerb ? kerbLane(car.dir, car.s) : car.lane;
        // (and going the player's way, a good driver moves out of the way of the tide's water as it
        // comes in, and of a wave as soon as it is warned of; an evil one ploughs on through)
        const dry = (s) => car.dir > 0 && !car.evil ? Tide.dryLane(s) : Infinity;
        const lead = (reach) => ramp !== car.lane ? ramp : Math.min(Track.openLane(home, car.s + car.dir * reach), dry(car.s + car.dir * reach));
        const open = lead(70);
        let squeezed = false;
        if (courteous(car)) {
          const soon = lead(70 + Math.abs(car.vs) * CONFIG.signalTime);
          if (soon !== car.lane && car.pendingLane !== soon) signalTo(car, soon, true);
          squeezed = open !== car.lane; // (until it has moved over)
        } else if (open !== car.lane) {
          if (laneClear(car, open, 12)) car.lane = open;
          else squeezed = true;
        }
        // signalled long enough: move over if there is room (a move it has to make waits for it)
        if (car.pendingLane !== null && (car.signalTime -= dt) <= 0) {
          const lane = car.pendingLane;
          if (car.pendingForced ? laneClear(car, lane, 12) : canMove(car, lane, false)) {
            car.lane = lane;
            car.pendingLane = null;
          } else if (!car.pendingForced) {
            car.pendingLane = null;
            car.signal = 0;
          }
        }

        car.think -= dt;
        if (car.think <= 0) {
          car.think = 1 + Math.random() * 2;
          think(car);
        }

        // hold back behind anything directly ahead (in this car's direction of travel)
        // (a racer in another's slipstream can go that much faster: see CONFIG.race)
        // (and one on the attack, just out of a tow, is carried on by it a while: its slingshot)
        car.tow = car.racer ? tow(car, car.s, car.lat, car.hw) : 0;
        if (car.racer) car.attack = Math.max(0, (car.attack || 0) - dt);
        const sling = car.attack > 0 ? car.sling * car.attack / CONFIG.race.attackTime : 0;
        let target = (squeezed ? car.baseSpeed * 0.6 : car.baseSpeed) * (1 + CONFIG.race.draft * Math.max(car.tow, sling)) *
          (furious(car) ? CONFIG.race.fury.pace : 1) * (1 + (CONFIG.race.chase.pace - 1) * chasing(car));
        if (car.pulledOver) target = car.baseSpeed * CONFIG.sirenPickup.pulledOverPace;
        if (rival) {
          // get into its lane, then catch it up or drop back onto it
          // (in a race, a rival behind is only blocked: see CONFIG.race.blockEvery; and one alongside
          // is kept pace with, not dropped back on)
          car.pendingLane = null;
          car.signal = 0;
          const [first, last] = Track.laneRange(car.dir, car.s);
          const lane = clamp(rival.isPlayer ? Track.nearestLane(rival.lat, rival.s) : rival.lane, first, last);
          let gap = (rival.s - car.s) * car.dir;
          if (Track.loop) gap = ((gap % Track.length) + Track.length * 1.5) % Track.length - Track.length / 2; // (either side of the line)
          car.blockWait = Math.max(0, (car.blockWait || 0) - dt);
          if (!car.racer) {
            car.lane = lane;
            target = car.baseSpeed * (gap > 0 ? 1.35 : 0.7);
          } else if (gap < -(rival.hl + car.hl)) { // (behind it: a block)
            if (lane !== car.lane && car.blockWait <= 0 && laneClear(car, lane, 6)) {
              car.lane = lane;
              car.blockWait = CONFIG.race.blockEvery;
            }
          } else {
            car.lane = lane;
            target = gap > 0 ? car.baseSpeed * 1.35 : Math.max(target, Math.abs(rival.vs));
          }
        }
        // (the hunters: see CONFIG.attitude.hunt)
        if (car.hunt > 0 && rival === Player) {
          const H2 = CONFIG.attitude.hunt, [first, last] = Track.laneRange(car.dir, car.s);
          const playerLane = clamp(Track.nearestLane(Player.lat, Player.s), first, last);
          if (car.huntRole === 'block') { // ahead of it in its lane, slowing it, braking hard now and then
            car.lane = playerLane;
            target = Player.speed * H2.blockPace;
            brakeCheck(car, dt);
          } else if (car.huntRole === 'flank') { // in the lane beside it, coming up alongside to lean on it
            const side = playerLane + 1 <= last ? playerLane + 1 : playerLane - 1;
            if (side >= first) car.lane = side;
            target = Player.s - car.s > car.hl + Player.hl ? Player.speed + H2.catchUp : Player.speed;
          } else if (car.huntRole === 'drop') { // one too many ahead of it: dropping back, to come at it from behind
            target = Math.max(0, Player.speed - H2.catchUp);
          } else if (Player.s > car.s) { // behind it: closing in, never falling away
            target = Math.max(target, Player.speed + H2.catchUp);
          }
        }
        // (the other attitudes to the player that show in how fast it goes)
        if (att && att !== 'turf') {
          const A = CONFIG.attitude, dl = Math.abs(Track.nearestLane(Player.lat, Player.s) - car.lane);
          const ds = Player.s - car.s; // (how far the player is ahead of it)
          const besideIt = dl === 1 && Math.abs(ds) < car.hl + Player.hl + 4;
          if (att === 'friendly' && besideIt) target *= A.letIn; // (easing off: in you come)
          if ((att === 'sulky' || att === 'vigilante') && besideIt && ds > 0) target = Math.max(target, Math.min(Player.speed, car.baseSpeed * 1.2)); // (keeping level: no you don't)
          if (att === 'distant' && ds > 0 && ds < A.distance) target *= A.distantPace;
          if (att === 'smug' && ds < 0 && -ds < A.brakeCheckRange + 10 && dl === 0) { // (in the way, dawdling, braking hard now and then)
            target *= A.dawdle;
            brakeCheck(car, dt);
          }
        }
        let held = false;
        // (a racer's rival ahead: it closes right up on it, and gives it a shove: see CONFIG.race.nudge)
        const nudging = car.racer && rival && !rival.isPlayer;
        for (const o of cars) {
          if (o === car || !o.active || (o === rival && !nudging) || o.junction) continue;
          const gap = (o.s - car.s) * car.dir;
          if (o === rival) {
            if (gap > 0 && gap < o.hl + car.hl + 6 && Math.abs(o.lat - car.lat) < o.hw + car.hw) target = Math.min(target, Math.abs(o.vs) + CONFIG.race.nudge);
            continue;
          }
          // (a racer, at racing speed, holds back further the faster it is closing; but sitting on the
          // grid it keeps close behind, and gets away with the rest)
          const room = o.hl + car.hl + (car.racer ? 2 + Math.max(0, Math.abs(car.vs) - Math.abs(o.vs)) * 1.5 : 8);
          if (gap > 0 && gap < room && Math.abs(o.lat - car.lat) < o.hw + car.hw) {
            target = Math.min(target, Math.abs(o.vs) * 0.9);
            held = true;
          }
        }
        // good and evil racers close together: the evil one bullies, the good one, racing clean, gives way
        car.squeeze = 0;
        if (car.racer) {
          const B = CONFIG.race.bully;
          car.yieldWait = Math.max(0, (car.yieldWait || 0) - dt);
          let lifted = false;
          for (const o of cars) {
            if (o === car || !o.active || !o.racer || o.evil === car.evil || o.shield > 0) continue;
            let ds = o.s - car.s;
            if (Track.loop) ds = ((ds % Track.length) + Track.length * 1.5) % Track.length - Track.length / 2; // (either side of the line)
            const alongside = Math.abs(ds) < o.hl + car.hl + 1 && Math.abs(o.lat - car.lat) < o.hw + car.hw + B.room;
            if (car.evil) { // leaning on it
              if (alongside) car.squeeze = Math.sign(o.lat - car.lat) || 1;
              continue;
            }
            if (alongside && !lifted) { // lifting, to keep out of trouble
              target *= B.lift;
              lifted = true;
            }
            // one on its gearbox: it moves over and lets it by
            if (ds < 0 && ds > -(o.hl + car.hl + B.behind) && Math.abs(o.lat - car.lat) < o.hw + car.hw && car.yieldWait <= 0) {
              car.yieldWait = B.yieldEvery;
              for (const d of [1, -1]) {
                if (!canMove(car, car.lane + d, false)) continue;
                car.lane += d;
                car.signal = d;
                car.pendingLane = null;
                break;
              }
            }
            if (alongside || ds < 0 && ds > -(o.hl + car.hl + B.behind)) { // (and sours at being pushed about, as the bully cheers up)
              car.mood = Math.max(-1, car.mood - B.mood * dt);
              o.mood = Math.min(1, o.mood + B.mood * dt);
            }
          }
        }
        // (and an evil racer bullies the player as it does a good racer: it leans on the player alongside,
        // and just ahead of the player, it moves across into the player's lane)
        if (car.racer && car.evil && Player.active) {
          const B = CONFIG.race.bully, ds = car.s - Player.s;
          if (Math.abs(ds) < Player.hl + car.hl + 1 && Math.abs(Player.lat - car.lat) < Player.hw + car.hw + B.room) car.squeeze = Math.sign(Player.lat - car.lat) || 1;
          const lane = Track.nearestLane(Player.lat, Player.s);
          if (ds > car.hl + Player.hl && ds < car.hl + Player.hl + 12 && lane !== car.lane && car.blockWait <= 0 && laneClear(car, lane, 6)) {
            car.lane = lane;
            car.blockWait = CONFIG.race.blockEvery;
          }
        }
        // a racer out on its own goes looking for a tow
        if (car.racer && !held && !rival) seekTow(car, dt);
        // a racer held up behind a slower car (or catching it in its tow) pulls out to pass it, into whichever lane beside is clear
        if (car.racer && held && !rival && (car.overtake = (car.overtake || 0) - dt) <= 0) {
          car.overtake = 0.6;
          for (const d of Math.random() < 0.5 ? [1, -1] : [-1, 1]) {
            if (!canMove(car, car.lane + d, false)) continue;
            car.lane += d;
            car.signal = d;
            car.pendingLane = null;
            car.attack = CONFIG.race.attackTime; // (on the attack: see CONFIG.race)
            car.sling = car.tow;
            break;
          }
        }
        // held up behind a slow player: mood sours; angry evil drivers don't brake for you (they ram
        // you), angry good ones sit right on your bumper; an evil racer gives you a nudge
        const gap = Player.s - car.s, tailgater = att === 'sulky' || att === 'vigilante';
        if (Player.active && Player.shield <= 0 && Player.ghost <= 0 && car.dir > 0 && gap > 0 && gap < Player.hl + car.hl + (tailgater ? CONFIG.attitude.tailgate : 8) &&
            Math.abs(Player.lat - car.lat) < Player.hw + car.hw && Player.speed < car.baseSpeed) {
          car.mood = Math.max(-1, car.mood - CONFIG.moodHoldUp * dt);
          car.grudge = true;
          honk(car);
          if (car.racer && car.evil) target = Math.min(target, Player.speed + CONFIG.race.nudge);
          else if (!(car.evil && car.emotion === 'angry' && !car.spite) || car.racer) target = Math.min(target, Player.speed * (tailgater ? 0.98 : 0.9));
        }
        // giving way at a junction while a car is leaving across it; and no faster than the bends ahead allow
        // (on ice, and on a level where cars understeer, they don't slow for a bend: they slide wide instead;
        // though a racer, knowing the track, slows for the bends ahead as much as lets it slide a little)
        target = Math.min(target, giveWay(car), car.onIce || LEVEL.understeer ? Infinity : cornerSpeed(car.s, weightOf(car)));
        if (car.racer) target = Math.min(target, racingLine(car));
        if (Track.muddy(car.s)) target *= CONFIG.mud.trafficPace; // (in mud)
        // wading through the tide's water: slowed, the more so in deep water
        if (depth > CONFIG.tide.wet) target *= depth >= CONFIG.tide.deep ? CONFIG.tide.trafficPace : 0.8;
        // hesitating: every so often a touch of the brakes, sharply
        if (car.hesitant && (car.tapWait -= dt) <= 0) {
          car.tap = H.tapTime;
          car.tapWait = between(H.tapEvery);
        }
        if (car.tap > 0) {
          car.tap -= dt;
          target *= H.tapPace;
        }
        car.braking = car.tap > 0 || Math.abs(car.vs) > target + 0.8;
        car.vs += (car.dir * target - car.vs) * damp(car.tap > 0 || (car.racer && car.braking) ? 3 : car.racer ? 1.2 * CONFIG.race.aiPickup : 1.2, dt);

        // spring back to the lane centre
        // (alongside its rival it steers straight at it)
        const beside = rival && Math.abs(rival.s - car.s) < rival.hl + car.hl + 2;
        const aimLat = beside ? rival.lat
          : car.pulledOver ? Track.shoulderOffset(car.dir > 0 ? 1 : -1, car.s) // (the shoulder on its right)
          : Track.laneOffset(car.lane, car.s);
        // the indicator goes off once the car is in its new lane (or on the shoulder), and a car
        // pulled over onto the shoulder puts its hazards on
        const settled = Math.abs(aimLat - car.lat) < 0.3;
        if (settled && car.pendingLane === null) car.signal = 0;
        car.hazards = car.pulledOver && (car.hazards || settled);
        const drift = car.hesitant && !beside && !car.pulledOver ? Math.sin(car.wander += dt * 1.3) * H.wander : 0;
        // (and nothing is ever steered into a median: not even after a rival who has gone in there)
        let aim = aimLat + drift + (beside ? 0 : car.squeeze * CONFIG.race.bully.squeeze); // (an evil racer leaning on a good one)
        if (Track.medianHalf) aim = car.dir > 0 ? Math.max(aim, Track.medianHalf + car.hw) : Math.min(aim, -Track.medianHalf - car.hw);
        const wantVel = clamp((aim - car.lat) * CONFIG.trafficLaneChangeRate, -6, 6);
        car.latVel += (wantVel - car.latVel) * damp(6, dt);
      }

      // an oncoming car passing close by may lean on its horn as it goes
      if (car.dir < 0 && Player.active && car.s > Player.s && car.s + car.vs * dt <= Player.s &&
          Math.abs(car.lat - Player.lat) < CONFIG.passByRange && Math.random() < CONFIG.passByChance) sfxAt('passBy', car.s);
      // understeer (a level with "understeer"): in a bend, what it asks of the tyres beyond the ice's
      // grip slides it to the outside, the more so the faster and heavier it is (as the player on ice)
      if (LEVEL.understeer && !(car.spin > 0)) {
        const bend = Track.bend(car.s), type = CONFIG.vehicles[car.kind];
        const grip = CONFIG.ice.grip * (car.racer ? CONFIG.race.aiTyres : 1); // (a racer's tyres hold on longer)
        const slide = Math.max(0, car.vs * car.vs * Math.abs(bend) * weightOf(car) / (type.agility || 1) - grip) * CONFIG.ice.understeer *
          (car.onIce ? 1 : CONFIG.race.understeer);
        car.slideVel = (car.slideVel - Math.sign(bend) * car.dir * slide * dt) * (1 - Math.min(1, dt * 2)); // (gripping again as it eases)
        car.vs -= Math.sign(car.vs) * Math.min(Math.abs(car.vs), slide * CONFIG.race.scrub * dt); // (scrubbing off speed as it slides)
      } else car.slideVel = 0;
      car.s += car.vs * dt;
      Track.transfer(car); // onto the side road, a flyover or back, where the roads join
      car.lat += (car.latVel + car.slideVel) * dt;
      keepOnRoad(car, 0.3);
      updateYaw(car, dt);
    }
  };

  // the screensaver going round again: everything on the expressway is moved back a lap
  // (the road's s runs from 0 again), and the level's fixed vehicles are put out afresh
  const lap = (length) => {
    for (const car of cars) {
      if (car.active && car.fixed) car.active = false;
      else if (car.active && Track.isMain(car.s)) car.s -= length;
    }
    placeFixed();
  };

  return { cars, reset, update, lap, policeNear, toadify, arrest, startEmergency, addRacer, sortGrid, tow, wreckedByPlayer };
})();
