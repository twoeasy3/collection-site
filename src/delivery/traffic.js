import { CONFIG } from './config.js';
import { LEVEL } from './levels.js';
import { clamp, damp } from './util.js';
import { Track } from './track.js';
import { updateYaw, keepOnRoad, emotionOf, startRivalry, spinOut, sfxAt } from './physics.js';
import { Player } from './player.js';
import { Packages } from './packages.js';
import { CARS } from './cars.js';
import { Message } from './messages.js';

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
      lane: 0, baseSpeed: 0, kind: 'car', evil: false, emotion: 'neutral', mood: 0, paint: 0, think: 0, honkWait: 0,
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
  const mix = () => Object.entries(LEVEL.traffic || {}).filter(([kind, rate]) => CONFIG.vehicles[kind] && rate > 0);
  const pickKind = () => {
    const kinds = mix();
    let r = Math.random() * kinds.reduce((sum, [, rate]) => sum + rate, 0);
    for (const [kind, rate] of kinds) {
      r -= rate;
      if (r < 0) return kind;
    }
    return kinds[0][0];
  };
  // is a police car close enough to see what the player is doing?
  const policeNear = () => cars.some(c => c.active && c.kind === 'police' && !c.toad && c.stun <= 0 &&
    Math.abs(c.s - Player.s) < CONFIG.policeSightRange && Math.abs(c.lat - Player.lat) < 25);

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
    o === car || !o.active || o.lane !== lane || Math.abs(o.s - car.s) > gap);

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
    const [first, last] = Track.laneRange(car.dir, car.s);
    const lane = Track.openLane(first + Math.floor(Math.random() * (last - first + 1)), car.s);
    if (!laneClear(car, lane, 25)) return false;
    outfit(car, pickKind(), lane);
    return true;
  };

  // puts the car on the road somewhere between minAhead and maxAhead metres in front of the
  // player. One going the player's way too fast for the player ever to catch hesitates (see CONFIG.hesitation).
  const spawn = (car, minAhead, maxAhead) => {
    car.active = false;
    for (let tries = 0; tries < 5; tries++) {
      if (!placeAt(car, minAhead + Math.random() * (maxAhead - minAhead))) continue;
      if (hesitation() && car.dir === Player.dir && car.baseSpeed > H.above) {
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
  const hesitantAhead = () => cars.some(c => c.active && c.hesitant && c.dir === Player.dir && Track.along(c.s) > Track.along(Player.s));
  const spawnBehind = (car) => {
    car.active = false;
    for (let tries = 0; tries < 5; tries++) {
      if (!placeAt(car, -between(H.behind))) continue;
      const own = GARAGE_TOP[car.kind];
      car.baseSpeed = (own || CONFIG.vehicles[car.kind].speed * speeds().max) * between(H.behindPace);
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
    if (car.toad || car.emergency) return; // (an ambulance stays an ambulance)
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
    // (one of the garage's cars cruises near its own top speed; anything else at the level's pace)
    const own = GARAGE_TOP[kind], P = CONFIG.garagePace;
    car.baseSpeed = own ? own * (P.min + Math.random() * (P.max - P.min)) : type.speed * (min + Math.random() * (max - min));
    car.vs = car.dir * car.baseSpeed;
    const evilShare = drivers().evil !== undefined ? drivers().evil : CONFIG.evilShare;
    car.evil = !type.special && Math.random() < evilShare; // fixed for this car's life
    car.defiant = car.evil && Math.random() < CONFIG.emergency.defiance; // won't give way to an ambulance
    car.emotion = pickEmotion(car.evil);
    car.mood = MOOD_START[car.emotion];
    car.paint = Math.floor(Math.random() * 1000);
    car.showMood = false;
    car.wobble = 0;     // s left of wobbling after a critical hit, before it spins out
    car.spin = 0;       // s left of an uncontrolled spin, which ends in an explosion
    car.rival = null;   // another traffic car this one is bullying
    car.rivalTime = 0;
    car.grudge = false; // set once the player has upset this driver
    car.wreckedByPlayer = false; // set once one of the player's packages has doomed it (see Packages)
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

  // Vehicles the level puts in a fixed place (its tractors): each takes a car from the pool,
  // waits where it was put until the player comes within range, and is never recycled.
  const placeFixed = () => {
    for (const t of LEVEL.tractors || []) {
      const s = Track.place(t);
      const dir = Track.flow === 'north' ? 1 : Track.flow === 'south' ? -1
        : t.lane < Track.lanesEachWay ? -1 : 1; // (the left half of a two-way road is oncoming)
      const car = cars.find(c => !c.active && !c.unused && c.dir === dir);
      if (!car) continue;
      car.s = s;
      outfit(car, 'tractor', t.lane);
      car.fixed = true;
      car.viaSide = false;
      car.baseSpeed = CONFIG.tractorSpeed;
      car.vs = 0; // parked until the player is near
    }
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

  // a horn to suit the vehicle (police cars have sirens instead), only near the player
  const HORNS = { compact: 'hornSmall', sport: 'hornSmall', van: 'hornBig', tractor: 'hornBig', bus: 'hornBus' };
  const honk = (car) => {
    if (car.kind === 'police' || car.honkWait > 0 || Math.abs(car.s - Player.s) > CONFIG.hornRange) return;
    car.honkWait = CONFIG.hornWait;
    sfxAt(HORNS[car.kind] || 'horn', car.s);
  };

  // A car that hurts the player while the player's siren sounds is arrested: a police
  // helicopter comes down and carries it off (render/helicopter.js). Until it is gone it
  // touches nothing, and nothing touches it.
  const arrest = (car) => {
    if (!(Player.siren > 0) || Player.damageScale <= 0) return;
    arrestNow(car);
  };
  // (also what happens to a car that won't get out of an ambulance's way)
  const arrestNow = (car) => {
    if (!car || car.isPlayer || !car.active || car.toad || car.arrest >= 0) return;
    car.arrest = 0;
    car.rival = null;
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
    if (car.kind === 'tractor') return; // a tractor just trundles along its lane
    if (car.pendingLane !== null) return; // (already signalling for a move)
    if (sirenFor(car)) return; // (no lane changes of its own with a siren behind it)
    // angry drivers pick on whoever is nearest
    if (car.emotion === 'angry' && !car.rival && Math.random() < CONFIG.rivalryPickChance) {
      let best = null, bestGap = CONFIG.rivalryRange;
      for (const o of cars) {
        if (o === car || !o.active || o.dir !== car.dir) continue;
        const gap = Math.abs(o.s - car.s);
        if (gap < bestGap) { best = o; bestGap = gap; }
      }
      if (best) startRivalry(car, best);
    }
    const ahead = car.s - Player.s; // how far this car is ahead of the player
    const playerLane = Track.nearestLane(Player.lat, Player.s);
    const inRange = Player.active && car.dir > 0 && ahead > 8 && ahead < CONFIG.attitudeRange;
    if (car.emotion === 'angry' && inRange) {
      const dir = Math.sign(playerLane - car.lane);
      if (dir) tryMove(car, dir, true);
    } else if (car.emotion === 'happy' && inRange && playerLane === car.lane) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      tryMove(car, dir) || tryMove(car, -dir);
    } else if (Math.random() < CONFIG.laneChangeChance) {
      tryMove(car, Math.random() < 0.5 ? 1 : -1);
    }
  };

  // ---- emergency vehicles (see CONFIG.emergency) ------------------------------------------------
  let nextEmergency = Infinity; // s to the next one, on a level with "emergencies"
  // sets one off, going the player's way (dir 1: from behind the player, in the player's lane if
  // the player is in one going that way) or coming the other way (from up the road). It takes a
  // car from the pool that the level leaves unused. Returns it, or null if there was no room.
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
    for (const o of cars) if (o !== car && o.active && o.arrest < 0 && !o.toad && !o.emergency) consider(o);
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
    for (const car of cars) {
      if (!car.active) {
        // (a fixed vehicle that has gone stays gone: its slot is not reused this run)
        if (!car.fixed && !car.unused && mix().length) {
          const behind = hesitation() && car.dir === Player.dir && Math.random() < H.behindChance && hesitantAhead();
          if (!(behind && spawnBehind(car))) spawn(car, CONFIG.spawnMin, CONFIG.spawnMax);
        }
        continue;
      }
      const ahead = Track.along(car.s) - Track.along(Player.s); // along the course, whichever road
      if (car.fixed && ahead > CONFIG.spawnMax) continue; // still waiting where the level put it
      // (an emergency vehicle going the player's way starts out behind the player, and is gone
      // once it is well ahead; one coming the other way once it is behind)
      const gone = !car.emergency ? ahead < -CONFIG.despawnBehind || ahead > CONFIG.spawnMax + 150
        : car.dir > 0 ? ahead < -E.behind - 100 || ahead > CONFIG.spawnMax + 150
        : ahead < -CONFIG.despawnBehind || ahead > CONFIG.spawnMax + 300;
      if (gone || !Track.inBounds(car.s)) {
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
        if (car.wobble <= 0) spinOut(car);
      }

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
        // evil cars lob packages at other traffic; ones the player has upset aim near the player
        if (car.evil && Player.active &&
            Math.abs(car.s - Player.s) < CONFIG.enemyThrowRange) {
          car.throwTimer -= dt;
          if (car.throwTimer <= 0) {
            car.throwTimer = CONFIG.enemyThrowMin + Math.random() * (CONFIG.enemyThrowMax - CONFIG.enemyThrowMin);
            Packages.throwAtGround(car);
          }
        }

        // a rival nearby: this car chases it, crowds it and won't brake for it
        let rival = car.rival;
        if (rival) {
          car.rivalTime -= dt;
          if (car.rivalTime <= 0 || !rival.active || rival.dir !== car.dir ||
              Math.abs(rival.s - car.s) > CONFIG.rivalryRange * 1.5) rival = car.rival = null;
        }
        // a jerk (a mystery): every driver going the player's way and near enough goes after the
        // player as if the player were its rival, and an evil one throws at the player. (Not the
        // police, whose swerving into the player would be a bust, nor oncoming traffic: a head-on.)
        if (Player.mystery === 'jerk' && Player.active && car.kind !== 'police' && car.dir === Player.dir &&
            Math.abs(Player.s - car.s) < CONFIG.rivalryRange) {
          rival = Player;
          car.grudge = true;
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
        const lead = (reach) => ramp !== car.lane ? ramp : Track.openLane(car.lane, car.s + car.dir * reach);
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
        let target = squeezed ? car.baseSpeed * 0.6 : car.baseSpeed;
        if (car.pulledOver) target = car.baseSpeed * CONFIG.sirenPickup.pulledOverPace;
        if (rival) {
          // get into its lane, then catch it up or drop back onto it
          car.pendingLane = null;
          car.signal = 0;
          const [first, last] = Track.laneRange(car.dir, car.s);
          car.lane = clamp(rival.isPlayer ? Track.nearestLane(rival.lat, rival.s) : rival.lane, first, last);
          target = car.baseSpeed * ((rival.s - car.s) * car.dir > 0 ? 1.35 : 0.7);
        }
        for (const o of cars) {
          if (o === car || !o.active || o === rival) continue;
          const gap = (o.s - car.s) * car.dir;
          if (gap > 0 && gap < o.hl + car.hl + 8 && Math.abs(o.lat - car.lat) < o.hw + car.hw) {
            target = Math.min(target, Math.abs(o.vs) * 0.9);
          }
        }
        // held up behind a slow player: mood sours; angry cars don't brake for you
        const gap = Player.s - car.s;
        if (Player.active && Player.shield <= 0 && Player.ghost <= 0 && car.dir > 0 && gap > 0 && gap < Player.hl + car.hl + 8 &&
            Math.abs(Player.lat - car.lat) < Player.hw + car.hw && Player.speed < car.baseSpeed) {
          car.mood = Math.max(-1, car.mood - CONFIG.moodHoldUp * dt);
          car.grudge = true;
          honk(car);
          if (car.emotion !== 'angry') target = Math.min(target, Player.speed * 0.9);
        }
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
        car.vs += (car.dir * target - car.vs) * damp(car.tap > 0 ? 3 : 1.2, dt);

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
        const wantVel = clamp((aimLat + drift - car.lat) * CONFIG.trafficLaneChangeRate, -6, 6);
        car.latVel += (wantVel - car.latVel) * damp(6, dt);
      }

      // an oncoming car passing close by may lean on its horn as it goes
      if (car.dir < 0 && Player.active && car.s > Player.s && car.s + car.vs * dt <= Player.s &&
          Math.abs(car.lat - Player.lat) < CONFIG.passByRange && Math.random() < CONFIG.passByChance) sfxAt('passBy', car.s);
      car.s += car.vs * dt;
      Track.transfer(car); // onto the side road, a flyover or back, where the roads join
      car.lat += car.latVel * dt;
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

  return { cars, reset, update, lap, policeNear, toadify, arrest, startEmergency };
})();
