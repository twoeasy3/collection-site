import { CONFIG } from './config.js';
import { LEVEL } from './levels.js';
import { clamp } from './util.js';
import { Track } from './track.js';
import { FxQueue, maybeSpinOut, startRivalry, hurt, sfx, sfxAt } from './physics.js';
import { Player } from './player.js';
import { Traffic } from './traffic.js';
import { Collision } from './collision.js';
import { Targets } from './pickups.js';
import { Game } from './game.js';
import { Message } from './messages.js';
import { Social } from './social.js';
import { CAR } from './cars.js';

// ============================================================================
// PACKAGES - thrown at the nearest car ahead within range; each flies an arc in
// track space and uses its own small hitbox, so a swerving target can dodge it
// ============================================================================
export const Packages = (() => {
  // kind: 'gift' (a Good player's care package), 'fire' (an Evil player's flaming one),
  // 'bomb' (an evil traffic car's, aimed at the road),
  // 'shell' (the tank's cannon; or a gun's on the Battlefield, the player's 8x8's or an army's: p.gun)
  const list = [];
  for (let i = 0; i < 64; i++) {
    list.push({ active: false, owner: null, kind: 'gift', s: 0, lat: 0, h: 0, endH: 0.6, arc: 0,
      vs: 0, vlat: 0, t: 0, flight: 1, yaw: 0, hw: 0.35, hl: 0.35 });
  }
  let cooldown = 0;
  const spread = (range) => (Math.random() - 0.5) * 2 * range;

  const reset = () => {
    cooldown = 0;
    for (const p of list) p.active = false;
  };

  // aim is a point { s, lat, vs, latVel }; the throw leads it by the flight time
  const launch = (owner, aim, kind, flight) => {
    const p = list.find(q => !q.active);
    if (!p) return false;
    p.owner = owner;
    p.kind = kind;
    p.s = owner.s + owner.dir * owner.hl;
    p.lat = owner.lat;
    p.t = 0;
    p.h = 1.2;
    p.endH = aim.height || 0.6;
    p.arc = kind === 'shell' ? 0.4 : CONFIG.throwArc;
    p.flight = flight || clamp(Math.hypot(aim.s - p.s, aim.lat - p.lat) / CONFIG.throwSpeed,
      CONFIG.throwFlightMin, CONFIG.throwFlightMax);
    p.vs = (aim.s + aim.vs * p.flight - p.s) / p.flight;
    p.vlat = (aim.lat + aim.latVel * p.flight - p.lat) / p.flight;
    p.from = p.to = null; // (see the cannon)
    p.gun = null;         // (a Battlefield gun's shell: how hard it hits, see blast)
    p.active = true;
    return p;
  };

  // the player throws at the nearest car within range, or at a TANK RAGE target if one is (null if
  // there is nothing to throw at). A car behind counts too, but as throwBehind times as far off
  const findTarget = () => {
    let best = null, bestDist = CONFIG.throwRange;
    for (const t of Targets.items) {
      if (t.used || t.s - Player.s <= Player.hl) continue;
      const dist = Math.hypot(t.s - Player.s, t.lat - Player.lat);
      if (dist < bestDist) { best = t; bestDist = dist; }
    }
    if (best) return best;
    for (const car of Traffic.cars) {
      if (!car.active || car.courier) continue; // (a rival courier is no target: see CONFIG.rival)
      const dist = Math.hypot(car.s - Player.s, car.lat - Player.lat) * (car.s < Player.s ? CONFIG.throwBehind : 1);
      if (dist < bestDist) { best = car; bestDist = dist; }
    }
    return best;
  };
  const throwOne = () => {
    if (!Player.active || Player.busted || cooldown > 0) return; // (no throwing while being busted)
    if (Player.butterfingers > 0) return; // (butterfingers: it slips through them)
    const gun = Player.tank > 0 ? null : CAR.cannon; // (the Battlefield's 8x8: a gun of its own, smaller)
    if (LEVEL.noPackages && !gun) return false; // (a level where nobody throws anything)
    if (Player.tank > 0 || gun) {
      // The cannon isn't aimed: the shell flies dead straight the way the tank is pointing, not
      // round a bend with the road, and lands cannonRange ahead of where the tank will be by
      // then. It is drawn flying between the two world points (from, to); where it lands is
      // that point's place on the road.
      const flight = 0.3, centre = {};
      const h = Track.toWorld(Player.s, Player.lat, centre) - Player.yaw; // (the way the nose points)
      const reach = (gun ? gun.range : CONFIG.cannonRange) + Player.speed * flight;
      const to = { x: centre.x + Math.sin(h) * reach, z: centre.z + Math.cos(h) * reach };
      const land = Track.fromWorld(to.x, to.z, Player.s + reach);
      Track.toWorld(land.s, land.lat, to); // (and its height there)
      const p = launch(Player, { s: land.s, lat: land.lat, vs: 0, latVel: 0 }, 'shell', flight);
      if (p) {
        p.from = {};
        Track.toWorld(p.s, p.lat, p.from); // (the muzzle)
        p.to = to;
        p.gun = gun;
        cooldown = gun ? gun.cooldown : CONFIG.cannonCooldown;
        sfx('cannon');
      }
      return;
    }
    // (with nothing in range it is thrown anyway, to land on the road ahead of the car)
    const target = findTarget() ||
      { s: Player.s + CONFIG.throwBlind, lat: Player.lat, vs: Player.speed, latVel: 0 };
    if (launch(Player, target, Player.evil ? 'fire' : 'gift')) {
      cooldown = CONFIG.throwCooldown;
      sfx('throw');
    }
  };

  // a Battlefield gun firing (an 8x8's or a tank's, gun: CONFIG.battle.guns): a shell flying straight from
  // its muzzle to where the target will be, quickly
  const fireShell = (car, target, gun) => {
    const tv = target.isPlayer ? Player.speed : target.vs;
    const far = Math.hypot(target.s - car.s, target.lat - car.lat), flight = Math.max(0.2, far / CONFIG.battle.shellSpeed);
    const p = launch(car, { s: target.s, lat: target.lat, vs: tv, latVel: target.latVel || 0 }, 'shell', flight);
    if (!p) return false;
    p.gun = gun;
    p.from = {};
    Track.toWorld(p.s, p.lat, p.from);
    p.from.y += car.height * 0.8;
    p.to = {};
    Track.toWorld(p.s + p.vs * flight, p.lat + p.vlat * flight, p.to);
    sfxAt('cannon', car.s, 0.7);
    return true;
  };
  // (on the Battlefield nobody's shell or package hurts its own side: an army's going the way it does,
  // the player's going the player's way)
  const sameSide = (v, owner) => LEVEL.battle && !!owner && (v.isPlayer ? 1 : v.dir) === (owner.isPlayer ? 1 : owner.dir);

  // an evil car's throw, aimed at the road where its victim will be (the splash does the
  // damage): near the player if the player has upset this driver (or, now and then, given it a gift), otherwise at
  // its rival or the nearest other vehicle within range, and with nobody about, a random spot ahead
  // of itself. (aim 'escort': a wingman's, never at the player, at whatever is nearest the player.)
  // Never at a police car: not even the angriest driver picks on the police
  const throwAtGround = (car, aim = null) => {
    const scatter = CONFIG.enemyThrowScatter;
    // (aim: 'escort', or a particular car to throw at: a rival courier clearing its way)
    let victim = aim && typeof aim === 'object' ? aim
      : (car.grudge || car.offended > 0 || (car.spite && Math.random() < CONFIG.giftSpite)) && aim !== 'escort' ? Player : null;
    if (!victim && aim === 'escort') {
      let best = CONFIG.enemyThrowCarRange;
      for (const o of Traffic.cars) {
        if (o === car || !o.active || o.kind === 'police' || o.courier) continue;
        const dist = Math.hypot(o.s - Player.s, o.lat - Player.lat);
        if (dist < best) { best = dist; victim = o; }
      }
    } else if (!victim) {
      let best = CONFIG.enemyThrowCarRange;
      const rival = car.rival && car.rival.active && car.rival.kind !== 'police' ? car.rival : null;
      for (const o of rival ? [rival] : Traffic.cars) {
        if (o === car || !o.active || o.kind === 'police' || o.courier) continue;
        const dist = Math.hypot(o.s - car.s, o.lat - car.lat);
        if (dist < best) { best = dist; victim = o; }
      }
    }
    if (victim) {
      launch(car, { s: victim.s + spread(scatter), lat: victim.lat + spread(scatter),
        vs: victim.vs, latVel: victim.latVel }, 'bomb');
    } else {
      const s = car.s + car.dir * (10 + Math.random() * 30);
      const lat = Track.laneLo(s) + Math.random() * (Track.laneHi(s) - Track.laneLo(s));
      launch(car, { s, lat, vs: 0, latVel: 0 }, 'bomb');
    }
  };

  // an evil car's package going off on the road
  const splash = (p) => {
    for (const v of Collision.bodies) {
      if (!v.active || v === p.owner || v.shield > 0 || v.tank > 0 || v.courier || sameSide(v, p.owner)) continue; // (nor a rival courier)
      if (Math.hypot(v.s - p.s, v.lat - p.lat) > CONFIG.splashRadius) continue;
      hurt(v, CONFIG.splashDamage);
      if (v.isPlayer) {
        Game.shake = Math.max(Game.shake, 0.4);
        Traffic.arrest(p.owner); // (under the player's siren, the thrower is taken away)
      }
      else {
        v.showMood = true;
        startRivalry(v, p.owner); // traffic caught in another car's blast holds it against them
      }
    }
  };

  // a car that is done for: out of health, spinning out, or wobbling before it does. One the
  // player's thrown package dooms is marked, so its explosion can be put down to the player (see
  // Collision); the tank's shells don't count
  const doomed = (car) => car.health <= 0 || car.spin > 0 || car.wobble > 0;

  // the cannon shell going off: destroys what it lands on, badly damages what is near
  // (it goes off with the lighter 'burst' sound, not a full explosion's)
  // (a Battlefield gun's shell hits as its gun says, p.gun: a direct hit only destroys a vehicle outright
  // if the gun's damage would; the rest of its splash, in proportion. Never its own side)
  const blast = (p) => {
    const G = p.gun, direct = G ? G.direct : CONFIG.cannonDirectRadius, reach = G ? G.splash : CONFIG.cannonSplashRadius;
    for (const car of Traffic.cars) {
      if (!car.active || car.courier || car === p.owner || sameSide(car, p.owner)) continue;
      const dist = Math.hypot(car.s - p.s, car.lat - p.lat);
      if (dist < direct + car.hl * 0.5) {
        if (G) hurt(car, G.damage * 2, CONFIG.cannonCrit);
        else car.health = 0;
      } else if (dist < reach) hurt(car, G ? G.damage * (1 - dist / reach) : CONFIG.cannonSplashDamage, CONFIG.cannonCrit);
      if (G && car.health <= 0 && p.owner === Player) car.wreckedByPlayer = true;
    }
    // (an army's shell, on the player: see CONFIG.battle.shellOnPlayer)
    if (p.owner !== Player && Player.active && Player.shield <= 0 && Player.ghost <= 0 && !sameSide(Player, p.owner)) {
      const dist = Math.hypot(Player.s - p.s, Player.lat - p.lat), S = CONFIG.battle.shellOnPlayer;
      if (dist < direct + Player.hl * 0.5) hurt(Player, S.direct);
      else if (dist < reach) hurt(Player, S.splash * (1 - dist / reach));
      if (dist < reach) Game.shake = Math.max(Game.shake, 0.8);
    }
    for (const o of Collision.obstacles) {
      if (o.gone || Math.hypot(o.s - p.s, o.lat - p.lat) > reach) continue;
      o.gone = true;
      FxQueue.push({ type: 'explode', s: o.s, lat: o.lat, vs: 0, big: false });
    }
    if (p.owner === Player) Game.shake = Math.max(Game.shake, 0.7);
    FxQueue.push({ type: 'explode', s: p.s, lat: p.lat, vs: 0, big: true,
      scale: G ? G.scale : CONFIG.cannonBlastScale, smoke: CONFIG.cannonSmoke, sound: 'burst' });
  };

  // a police car (not one turned into a toad in TOAD RAGE): it has reactions of its own
  const cop = (car) => car.kind === 'police' && !car.toad;
  // the player's care package arriving
  const deliver = (p, car) => {
    const boosted = Player.bigSplash > 0, B = CONFIG.bigSplash; // (Big Splash: harder hits)
    if (p.kind === 'fire') { // an Evil player's package: real damage, and it makes enemies
      const damage = boosted ? B.fireDamage : CONFIG.evilPackageDamage;
      car.health -= damage;
      car.mood = Math.max(-1, car.mood - damage * CONFIG.moodPerDamage);
      maybeSpinOut(car, damage, CONFIG.packageSpinScale);
      car.grudge = true;
      car.showMood = true;
      // attacking a police car, or anyone while a police car is watching, is a bust
      // (a police car turned into a toad in TOAD RAGE is just a toad)
      if (cop(car)) Player.bust('assaultCop');
      else if (Traffic.policeNear()) Player.bust('assault');
      // (the driver's reaction, unless the package has destroyed the car outright: a spin-out or a
      // critical hit still gets one. A police officer only has one when there is no bust for it,
      // the player's radar detector running; otherwise the bust says it all)
      if (car.health > 0) {
        if (!cop(car)) Message.say('reactions', car.evil ? 'anyOnEvil' : 'evilOnGood');
        else if (Player.radar > 0) Message.say('reactions', 'evilOnPolice');
      }
      FxQueue.push({ type: 'burst', s: p.s, lat: p.lat, vs: car.vs });
      return;
    }
    // (a boosted gift to an evil driver: a pelting, a point of damage at a time in quick succession,
    // each a chance of a critical hit: see update; to anyone else, a harder knock)
    if (boosted && car.evil) car.pelts = (car.pelts || 0) + B.giftDamage;
    else {
      const damage = boosted ? B.giftDamage : CONFIG.packageDamage;
      car.health -= damage;
      maybeSpinOut(car, damage, CONFIG.packageSpinScale);
    }
    if (car.evil) { // evil drivers take a gift as an insult: furious, though it shows only in a while of
      // throwing at you, then a throw at you now and then (no road rage: see Traffic's attitude)
      car.mood = -1;
      car.offended = CONFIG.giftOffence;
      car.spite = true;
      car.showMood = true;
    } else {
      car.mood = Math.min(1, car.mood + CONFIG.packageMoodBoost);
      Social.gift(cop(car)); // (a good deed: the player's standing goes up, the more for a police car)
    }
    // (the driver's reaction, unless the package has destroyed the car outright: a spin-out or a
    // critical hit still gets one)
    if (car.health > 0) Message.say('reactions', cop(car) ? 'goodOnPolice' : car.evil ? 'anyOnEvil' : 'goodOnGood');
    car.showMood = true;
    FxQueue.push({ type: 'gift', s: p.s, lat: p.lat, vs: car.vs });
  };

  // Big Splash (a pickup): the player's package catches every car within CONFIG.bigSplash.radius m
  // of where it hits a car (or lands), as if it had hit each of them
  const splashAround = (p, hit) => {
    if (!(Player.bigSplash > 0) || (p.kind !== 'gift' && p.kind !== 'fire')) return;
    for (const car of Traffic.cars) {
      if (car === hit || !car.active || car.arrest >= 0 || car.emergency || car.junction || car.courier) continue;
      if (Math.hypot(car.s - p.s, car.lat - p.lat) > CONFIG.bigSplash.radius) continue;
      const was = doomed(car);
      deliver(p, car);
      if (!was && doomed(car)) car.wreckedByPlayer = true;
    }
  };
  const update = (dt) => {
    cooldown = Math.max(0, cooldown - dt);
    // a boosted gift's pelting of an evil driver, a point of damage at a time (see deliver)
    for (const car of Traffic.cars) {
      if (!(car.pelts > 0)) continue;
      if (!car.active) { car.pelts = 0; continue; }
      if ((car.peltWait = (car.peltWait || 0) - dt) > 0) continue;
      car.peltWait = CONFIG.bigSplash.peltEvery;
      car.pelts--;
      const was = doomed(car);
      car.health -= 1;
      maybeSpinOut(car, 1, CONFIG.packageSpinScale);
      if (!was && doomed(car)) car.wreckedByPlayer = true;
    }
    for (const p of list) {
      if (!p.active) continue;
      p.t += dt;
      p.s += p.vs * dt;
      p.lat += p.vlat * dt;
      const u = p.t / p.flight;
      p.h = 1.2 + (p.endH - 1.2) * u + p.arc * 4 * u * (1 - u);

      if (p.kind === 'gift' || p.kind === 'fire') {
        for (const t of Targets.items) {
          if (t.used || Math.abs(t.s - p.s) > 2.5 || Math.abs(t.lat - p.lat) > 2.5) continue;
          t.used = true;
          // the next piece of the tank; the fifth completes it, and TANK RAGE begins
          Game.tankPieces = Math.min(CONFIG.tankPieces, Game.tankPieces + 1);
          if (Game.tankPieces >= CONFIG.tankPieces) {
            Player.startTank();
            sfx('tank');
            Message.say('powerups', 'tankRage');
          } else {
            sfx('tankPiece');
            Message.say('tankParts', CONFIG.tankParts[Game.tankPieces - 1]);
          }
          FxQueue.push({ type: 'gift', s: t.s, lat: t.lat, vs: 0, green: true });
          p.active = false;
          break;
        }
        for (const car of Traffic.cars) {
          if (!p.active) break;
          if (!car.active || car.arrest >= 0 || car.emergency || car.junction || car.courier || p.h > car.height + 0.6) continue; // (a package goes straight past a rival courier)
          if (Math.abs(car.s - p.s) > car.hl + 1 || !Collision.overlap(p, car)) continue;
          const was = doomed(car);
          deliver(p, car);
          if (!was && doomed(car)) car.wreckedByPlayer = true;
          splashAround(p, car);
          p.active = false;
        }
      }
      if (p.active && u >= 1) { // landed
        if (p.kind === 'shell') blast(p);
        else if (p.kind === 'bomb') splash(p);
        else splashAround(p, null);
        if (p.kind !== 'shell') FxQueue.push({ type: p.kind === 'gift' ? 'gift' : 'burst', s: p.s, lat: p.lat, vs: 0 });
        p.active = false;
      }
    }
  };

  // the screensaver going round again: packages in the air move back a lap with the road
  const lap = (length) => { for (const p of list) if (p.active) p.s -= length; };

  return { list, reset, update, lap, throwOne, throwAtGround, fireShell,
    get ready() { return cooldown <= 0 && !Player.busted; } };
})();
