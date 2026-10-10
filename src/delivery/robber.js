// ============================================================================
// THE BANK ROBBER WHO WANTS A LIFT (a level's "robbers": [{ s }]; see CONFIG.robber) - a man with a bag on the
// right-hand shoulder, thumb out; and one more wherever a police pursuit's getaway car is wrecked (pursuit.js).
// Driving over where he stands picks him up, as a pickup is picked up. Leaving him there costs nothing.
//
// Carrying him pays `rate` $ for every 100 m, for `ride` m, when he gets out. But every police car about going
// the player's way comes after the car, sirens on, and now and then another comes up from behind:
//   - one of them close to the car for `hold` s, the car still going: a bust, he is taken, and what he paid with him;
//   - the car slowed below `handOver` beside any police car (one of those, a patrol car, a roadblock's): he is
//     handed over. No bust; a Good player gains `standing`, and keeps what he has paid so far.
// So: run for the fare, or drive him to the nearest police car for the standing.
// ============================================================================
import { CONFIG } from './config.js';
import { LEVEL } from './levels.js';
import { clamp } from './util.js';
import { Track } from './track.js';
import { Player } from './player.js';
import { Traffic } from './traffic.js';
import { Game } from './game.js';
import { Social } from './social.js';
import { Message } from './messages.js';
import { CAR } from './cars.js';
import { sfx } from './physics.js';
import { Pursuit, drive, takeCar, between } from './pursuit.js';

export const Robber = (() => {
  const R = CONFIG.robber;
  const spots = [];    // where one stands: { s, lat, taken, said }
  let carrying = null; // { left (m of his ride to go), metres (towards the next 100), paid ($ so far), patrol (s to the next car from behind), told }
  let lastS = 0;

  const allowed = () => !LEVEL.laps && !LEVEL.battle && !(LEVEL.grid && !LEVEL.grid.rival);
  const stand = (s) => {
    if (!(s >= 0 && s <= Track.length - 60) || !Track.isMain(s) || Track.onBridge(s)) return null;
    const lat = Track.shoulderOffset(1, s);
    if (!Number.isFinite(lat)) return null;
    const spot = { s, lat, taken: false, said: false };
    spots.push(spot);
    return spot;
  };
  // a police pursuit's getaway car wrecked: he is out of it, and thumbing a lift a little further up
  Pursuit.listeners.push((kind, s) => {
    if (kind === 'crashed' && allowed() && Game.state === 'playing') stand(Math.max(s + R.beyondWreck, Player.s + R.ahead));
  });

  // a police car after the player's car: up behind it (or, one that was ahead, easing off for it to come up)
  const chase = (car, dt) => {
    const gap = Player.s - car.s;
    const top = CAR.maxSpeed * R.pace + (gap > R.near ? R.rush : 0);
    const want = gap > 0 ? clamp(Player.speed + (gap - R.catch.along * 0.5) * 0.8, 0, top) : Math.max(R.easeTo, Player.speed - R.easeOff);
    drive(car, dt, want, { prefer: Player.lat });
  };
  const chasers = () => Traffic.cars.filter(c => c.active && c.driver === chase);
  // (back to being a police car like any other)
  const letGo = (car) => {
    const [first, last] = Track.laneRange(1, car.s);
    Object.assign(car, { driver: null, sirenOn: false, role: null, lane: clamp(Track.nearestLane(car.lat, car.s), first, last), pendingLane: null });
  };
  const release = () => { for (const car of chasers()) letGo(car); };
  const sendAfter = (car) => Object.assign(car, { driver: chase, sirenOn: true, role: 'chaser', aimLat: car.lat, rethink: 0, close: 0, pendingLane: null, signal: 0, hazards: false, pulledOver: false, pulledFor: null });
  // he is out of the car: 'done' (his ride over), 'handed' (to the police), 'busted'
  const out = (how) => {
    const c = carrying;
    carrying = null;
    release();
    if (how === 'busted') {
      Game.cash = Math.max(0, Game.cash - c.paid); // (what he paid goes with him)
      Player.bust('robber');
    } else if (how === 'handed') {
      if (Social.on) Social.level = Math.min(1, Social.level + R.standing / 100);
      Message.say('events', Social.on ? 'robberHanded' : 'robberHandedEvil');
    } else {
      const line = Message.say('events', 'robberOut');
      if (line) line.text = line.text.replace('${dollar}', '$' + c.paid);
    }
    Robber.last = { how, paid: how === 'busted' ? 0 : c.paid };
  };

  const reset = () => {
    for (const car of Traffic.cars) if (car.driver === chase) car.driver = null;
    spots.length = 0;
    carrying = null;
    Robber.last = null;
    lastS = Player.s;
    if (!allowed()) return;
    for (const r of LEVEL.robbers || []) stand(Track.place(r));
    if (Robber.force?.s !== undefined) stand(Robber.force.s);
    if (Robber.force?.carry) carrying = { left: R.ride, metres: 0, paid: 0, patrol: 1, told: true };
  };
  const update = (dt) => {
    const moved = Player.active ? Player.s - lastS : 0;
    lastS = Player.s;
    if (!Player.active) return;
    if (!carrying) {
      for (const spot of spots) {
        if (spot.taken) continue;
        const ahead = spot.s - Player.s;
        if (!spot.said && ahead > 0 && ahead < R.warn) { spot.said = true; Message.say('events', 'robberAhead'); }
        if (Math.abs(ahead) < Player.hl + 1.5 && Math.abs(spot.lat - Player.lat) < Player.hw + 1.3 && !(Player.tank > 0)) {
          spot.taken = true;
          carrying = { left: R.ride, metres: 0, paid: 0, patrol: between(R.patrolEvery) * 0.5, told: false };
          const line = Message.say('events', 'robberIn');
          if (line) line.text = line.text.replace('${dollar}', '$' + R.rate);
          sfx('passenger');
          break;
        }
      }
      return;
    }
    const c = carrying;
    // the fare, as he goes
    if (moved > 0 && moved < 50) {
      c.left -= moved;
      c.metres += moved;
      while (c.metres >= 100) { c.metres -= 100; c.paid += R.rate; Game.cash += R.rate; sfx('cash5'); }
    }
    if (c.left <= 0) { out('done'); return; }
    // every police car about, going the player's way, is after the car; and now and then one more from behind
    for (const car of Traffic.cars) {
      if (!car.active || car.kind !== 'police' || car.driver || car.dir < 0 || car.roadblock || car.stationed || car.parked || car.arrest >= 0 || car.toad || car.junction ||
          car.spin > 0 || !Track.isMain(car.s) || Math.abs(car.s - Player.s) > R.alert) continue;
      sendAfter(car);
    }
    if ((c.patrol -= dt) <= 0 && Track.isMain(Player.s)) {
      c.patrol = between(R.patrolEvery);
      const s0 = Player.s - R.behind, [first, last] = Track.laneRange(1, s0);
      const lane = [...Array(last - first + 1).keys()].map(k => first + k).find(l => Track.openLane(l, s0) === l && Traffic.cars.every(o => !o.active || o.lane !== l || Math.abs(o.s - s0) > 25));
      if (chasers().length < R.patrols && Track.inBounds(s0 - 10) && lane !== undefined) {
        const car = takeCar('police', s0, lane);
        if (car) { sendAfter(car); car.vs = Player.speed + 6; }
      }
    }
    for (const car of chasers()) if (Player.s - car.s > R.giveUp) letGo(car); // (left far behind: it gives up)
    if (!c.told && chasers().length) { c.told = true; Message.say('events', 'robberChased'); }
    // caught, or handed over
    for (const car of Traffic.cars) {
      if (!car.active || car.kind !== 'police' || car.arrest >= 0 || car.toad || car.junction) continue;
      const near = Math.abs(car.s - Player.s) < R.catch.along && Math.abs(car.lat - Player.lat) < R.catch.across;
      if (!near) { car.close = Math.max(0, (car.close || 0) - dt); continue; }
      if (Player.speed < R.handOver) { out('handed'); return; }
      if (car.driver === chase && (car.close = (car.close || 0) + dt) >= R.hold) { out('busted'); return; }
    }
  };

  return { reset, update, spots,
    get carrying() { return carrying; },
    get chasers() { return chasers(); },
    last: null,   // how the last lift ended: { how, paid }
    force: null,  // { s?, carry? }: one more standing at s, or the run begun with him aboard (for a picture, or a check)
  };
})();
