// ============================================================================
// POLICE PURSUIT (a level's "pursuits": { every: { min, max } }; see CONFIG.pursuit) - now and then a chase
// already under way comes through the level from behind the player: a getaway car flat out, taking any gap,
// the shoulder and the oncoming side, and behind it an interceptor (a car seen nowhere else), siren going,
// the traffic in its lane pulling aside for it and closing in again after. Never on a race or the Battlefield.
//
// What the player can do with it:
//   Good: get in the getaway car's way. Every second it is held below `turnBelow` of its pace the interceptor
//         comes up beside it, and after `turnTime` s turns it: caught. If the player was what held it (in its
//         path, or boxing it in from beside), that is standing, cash and a bust wiped. The risk: it brakes late.
//   Evil: get in the interceptor's way. After `bag.after` s of that the getaway driver throws out a bag of cash,
//         and if the interceptor falls `lost` m behind, the getaway is away. Or ride the channel the siren
//         clears, close behind the interceptor. The risk: both fill the interceptor's interest in the player
//         (heat), and at 1 the player is part of the chase: a bust.
//   Or move over: it costs nothing.
// How it ends: caught (the two stopped on the shoulder, lights going, the traffic slowing to look), crashed
// (the getaway wrecked: by whatever it hit, or found off the road further up), or away. Left to themselves the
// two go off up the road and one of the three is drawn (`odds`), a hand in it from the player weighing it.
//
// Both cars are the traffic's own (taken from the cars the level leaves unused), so they hit and are hit like
// any other; but each is driven from here (car.driver: see Traffic.update), not by a traffic driver's habits.
// ============================================================================
import { CONFIG } from './config.js';
import { LEVEL } from './levels.js';
import { clamp, damp } from './util.js';
import { Track } from './track.js';
import { Player } from './player.js';
import { Traffic } from './traffic.js';
import { Game } from './game.js';
import { Social } from './social.js';
import { Message } from './messages.js';
import { CAR } from './cars.js';
import { updateYaw, keepOnRoad, sfx, sfxAt } from './physics.js';

const between = (r) => r.min + Math.random() * (r.max - r.min);

// ---- driving, for a car driven from here ---------------------------------------------------------------------
// everything that can be in a car's way: the traffic on the road, and the player
const inTheWay = (o) => o.isPlayer ? Player.active && !(Player.ghost > 0) && !(Player.shield > 0) && !Player.testGhost
  : o.active && !o.junction && !(o.arrest >= 0);
const everyone = () => [Player, ...Traffic.cars];
// where across the road the car could be driving, at its s: every open lane (the oncoming side's too, where
// nothing stands between the two ways), and the right-hand shoulder where there is one
const slotsFor = (car) => {
  const s = car.s, out = [], [first, last] = Track.laneRange(1, s);
  const across = Track.flow === 'both' && !Track.medianHalf && !(Track.apart(s) > 0) && !(Track.apart(s + 200) > 0);
  for (let l = 0; l < Track.laneCount; l++) {
    const own = l >= first && l <= last;
    if ((!own && !across) || Track.openLane(l, s) !== l || Track.openLane(l, s + 80) !== l) continue;
    out.push({ lat: Track.laneOffset(l, s), wrong: !own, shoulder: false });
  }
  const room = (at) => Track.hi(at) - Track.laneHi(at) >= 2 * car.hw + 0.3 && !Track.onBridge(at);
  const sh = Track.shoulderOffset(1, s);
  if (Number.isFinite(sh) && room(s) && room(s + 100)) out.push({ lat: sh, wrong: false, shoulder: true });
  return out;
};
// s before the car, driving at `lat`, would be on top of something (up to `look`; 0: something is beside it there)
const clearTime = (car, lat, partner) => {
  const D = CONFIG.pursuit.driving, v = Math.abs(car.vs);
  let best = D.look;
  for (const o of everyone()) {
    if (o === car || o === partner || !inTheWay(o) || Math.abs(o.lat - lat) >= o.hw + car.hw + D.margin) continue;
    const d = (o.s - car.s) - o.hl - car.hl;
    if (d < -2 * (o.hl + car.hl) || d > v * D.look + 40) continue; // (behind it, or a long way off)
    if (d < 1) return 0;
    const closing = v - o.vs; // (something coming the other way: its speed adds)
    if (closing > 0.5) best = Math.min(best, d / closing);
  }
  return best;
};
// the nearest thing ahead where the car is driving now: { o, d (m to it) } or null
const ahead = (car, partner) => {
  let found = null;
  for (const o of everyone()) {
    if (o === car || o === partner || !inTheWay(o) || Math.abs(o.lat - car.lat) >= o.hw + car.hw + 0.15) continue;
    const d = (o.s - car.s) - o.hl - car.hl;
    if (d > -1 && (!found || d < found.d)) found = { o, d };
  }
  return found;
};
// One step of driving: `want` m/s, by whichever way across the road is clear longest (near `prefer`, if given;
// or exactly at `exact`), braking for what is in its way as hard as its brakes allow, which may not be enough.
// Returns what it is braking for: { o, d } or null
const drive = (car, dt, want, { prefer = null, exact = null, partner = null } = {}) => {
  const D = CONFIG.pursuit.driving;
  if (car.stun > 0) { // (knocked about: it coasts, as any car does)
    car.stun = Math.max(0, car.stun - dt);
    car.vs -= car.vs * CONFIG.stunDrag * dt;
    car.latVel -= car.latVel * damp(CONFIG.stunGrip, dt);
  } else {
    if (exact !== null) car.aimLat = exact;
    else if ((car.rethink = (car.rethink || 0) - dt) <= 0) {
      car.rethink = D.rethink;
      let best = null, top = -Infinity;
      for (const slot of slotsFor(car)) {
        const score = clearTime(car, slot.lat, partner) - (slot.wrong ? D.wrongSide : 0) - (slot.shoulder ? D.shoulder : 0) -
          Math.abs(slot.lat - (prefer ?? car.lat)) * D.drift + (Math.abs(slot.lat - car.aimLat) < 0.5 ? D.stick : 0);
        if (score > top) { top = score; best = slot; }
      }
      if (best) car.aimLat = best.lat;
    }
    const wantVel = clamp((car.aimLat - car.lat) * 3, -D.swerve, D.swerve);
    car.latVel += (wantVel - car.latVel) * damp(8, dt);
  }
  const block = ahead(car, partner);
  let target = want;
  if (block) target = Math.min(target, Math.max(0, block.o.vs) + Math.sqrt(2 * D.brake * Math.max(0, block.d - D.followGap)));
  car.braking = car.vs > target + 0.8;
  if (!(car.stun > 0)) car.vs += clamp(target - car.vs, -D.brake * dt, D.accel * dt);
  car.s += car.vs * dt;
  car.lat += car.latVel * dt;
  keepOnRoad(car, 0.3);
  updateYaw(car, dt);
  // (the lane the traffic takes it to be in: none, on the shoulder)
  car.lane = Track.onShoulder(car.lat, car.s) ? -9 : Track.nearestLane(car.lat, car.s);
  car.signal = 0;
  return block && car.vs < want - 1.5 ? block : null;
};
// pulling over and stopping: onto the right-hand shoulder (or the kerb lane, where there is none), no further
// than `stopAt` if that is given
const pullOver = (car, dt, stopAt = Infinity, out = 0) => {
  const P = CONFIG.pursuit, s = car.s;
  if (car.parkedUp) { // (stopped, and staying: a shove moves it along, no more)
    car.vs -= car.vs * Math.min(1, dt * 3);
    car.s += car.vs * dt;
    car.latVel = 0;
    car.braking = false;
    updateYaw(car, dt);
    return true;
  }
  const shoulder = Track.hi(s) - Track.laneHi(s) >= 2 * car.hw && !Track.onBridge(s);
  const aim = Math.min(Track.hi(s) - car.hw - 0.05, shoulder ? Track.shoulderOffset(1, s) + out : Track.laneOffset(Track.openLane(Track.laneRange(1, s)[1], s), s));
  const there = Math.abs(aim - car.lat) < 0.4;
  // (it creeps on until it is off the road, and then as far as stopAt)
  const target = !there ? Math.min(car.vs, 6) : car.s < stopAt && stopAt !== Infinity ? Math.max(3, Math.min(car.vs, 8)) : 0;
  car.stun = Math.max(0, car.stun - dt);
  car.vs = Math.max(target, car.vs - P.stop * dt);
  if (car.vs < 0.05 && !there) car.vs = 2;
  car.latVel = car.vs > 0.3 ? clamp((aim - car.lat) * 2, -4, 4) : 0;
  car.s += car.vs * dt;
  car.lat += car.latVel * dt;
  keepOnRoad(car, 0);
  updateYaw(car, dt);
  car.braking = car.vs > 0.5;
  car.lane = Track.onShoulder(car.lat, car.s) ? -9 : Track.nearestLane(car.lat, car.s);
  if (car.vs < 0.05) car.parkedUp = true;
  return car.parkedUp;
};

export const Pursuit = (() => {
  const P = CONFIG.pursuit;
  let next = Infinity; // s to the next one
  let st = null;       // the one going on: { phase, robber, cop, ... }
  const bags = [];     // bags of cash on the road: { s, lat, vs, taken }
  const listeners = []; // called as one ends: (kind, s) => {} (see robber.js)
  let last = null;     // how the last one ended: { kind, s, helped }

  const allowed = () => !!LEVEL.pursuits && !LEVEL.laps && !LEVEL.battle && !(LEVEL.grid && !LEVEL.grid.rival) &&
    Track.flow !== 'south' && Track.flow !== 'mixed';

  // a car of the traffic's, taken from those the level leaves unused, to be driven from here
  const take = (kind, s, lane) => {
    const car = Traffic.spare();
    if (!car) return null;
    car.dir = 1;
    car.bound = 'north';
    car.s = s;
    Traffic.outfit(car, kind, lane);
    if (car.toad) { Object.assign(car, car.toad); car.toad = null; } // (set off in TOAD RAGE: it stays what it is)
    Object.assign(car, { evil: kind === 'getaway', defiant: false, viaSide: false, hesitant: false, emotion: 'neutral', mood: 0, showMood: false,
      throwTimer: Infinity, aimLat: car.lat, rethink: 0, role: kind, parkedUp: false });
    return car;
  };

  // sets one off: the getaway car `behind` m behind the player and the interceptor `gap` m behind that. False
  // if there is no room for it just now
  const start = () => {
    if (st || !allowed() || !Player.active || !Track.isMain(Player.s)) return false;
    const s0 = Player.s - P.behind;
    if (!Track.inBounds(s0 - P.gap - 20) || Player.s > Track.length - P.clearOfEnd) return false;
    const [first, last] = Track.laneRange(1, s0), lanes = [];
    for (let l = first; l <= last; l++) {
      if (Track.openLane(l, s0) === l && Traffic.cars.every(o => !o.active || o.lane !== l || o.s < s0 - P.gap - 30 || o.s > s0 + 30)) lanes.push(l);
    }
    if (!lanes.length) return false;
    const lane = lanes[Math.floor(Math.random() * lanes.length)];
    const robber = take('getaway', s0, lane), cop = robber && take('interceptor', s0 - P.gap, lane);
    if (!cop) { if (robber) robber.active = false; return false; }
    const cruise = clamp(CAR.maxSpeed * P.pace, P.speed.min, P.speed.max);
    st = { phase: 'chase', robber, cop, cruise, t: 0, held: 0, byPlayer: 0, hindered: 0, rode: 0, heat: 0, warned: false, bagged: false,
      trail: [], lastHit: -1, seen: false, look: 0, scene: null };
    robber.vs = cop.vs = cruise + P.rush;
    robber.driver = flee;
    cop.driver = hunt;
    cop.sirenOn = true;
    Message.say('events', Player.evil ? 'pursuitEvil' : 'pursuit');
    return true;
  };

  // the getaway car: flat out (and faster still while it is far from the player: it comes, and it goes)
  const pace = (car, extra = 0) => st.cruise + extra + P.rush * clamp((Math.abs(car.s - Player.s) - P.near) / P.near, 0, 1);
  const flee = (car, dt) => {
    const block = drive(car, dt, pace(car), { partner: st.cop });
    if (st.phase !== 'chase') return;
    st.trail.push({ s: car.s, lat: car.lat });
    if (st.trail.length > 600) st.trail.splice(0, 200);
    // held up: by the player, if the player is what it is braking for, or is right beside it, shutting a way out
    if (car.vs < st.cruise * P.turnBelow) {
      st.held += dt;
      const beside = Player.active && Math.abs(Player.s - car.s) < P.box.along && Math.abs(Player.lat - car.lat) < P.box.across;
      if ((block && block.o === Player) || beside) st.byPlayer += dt;
    } else st.held = Math.max(0, st.held - dt * P.letUp);
  };
  // where the getaway car was across the road as it passed s (the interceptor follows its line)
  const lineAt = (s) => {
    const trail = st.trail;
    for (let i = trail.length - 1; i >= 0; i--) if (trail[i].s <= s) return trail[i].lat;
    return null;
  };
  // the interceptor: on the getaway car's line `gap` m behind it; and as that is held up, up beside it
  const hunt = (car, dt) => {
    const g = st.robber;
    if (st.phase !== 'chase' || !g.active) { drive(car, dt, pace(car), {}); return; }
    const gap = g.s - car.s - g.hl - car.hl, close = clamp(st.held / P.turnTime, 0, 1);
    const wantGap = P.gap * (1 - close) - close * (g.hl + car.hl);
    const want = clamp(g.vs + (gap - wantGap) * P.closing, 0, st.cruise + P.rush + P.catchUp);
    // (beside it: on whichever side of it there is more road)
    const side = g.lat - Track.lo(g.s) > Track.hi(g.s) - g.lat ? -1 : 1;
    const beside = close > 0.5 && gap < P.gap * 0.6;
    const block = drive(car, dt, want, beside ? { exact: g.lat + side * (g.hw + car.hw + P.beside), partner: g } : { prefer: lineAt(car.s) ?? g.lat, partner: g });
    // the player in its way; or riding the channel behind it
    const hindering = !!block && block.o === Player && block.d < P.reach;
    const back = car.s - Player.s - car.hl - Player.hl;
    const riding = Player.active && back > P.ride.from && back < P.ride.to && Math.abs(Player.lat - car.lat) < P.ride.width && Player.speed > P.ride.speed;
    if (hindering) st.hindered += dt;
    if (riding) st.rode += dt;
    if (car.hitBy === Player && car.hitAt !== st.lastHit) { // (the player ran into it)
      st.lastHit = car.hitAt;
      if (Player.evil) st.heat += P.heat.ram;
    }
    // (an Evil player doing either has the interceptor's interest: see heat)
    if (Player.evil && hindering) st.heat += dt / P.heat.block;
    else if (Player.evil && riding) st.heat += dt / P.heat.ride;
    else st.heat = Math.max(0, st.heat - dt / P.heat.cool);
    if (st.heat >= P.heat.warn && !st.warned) { st.warned = true; Message.say('events', 'pursuitHeat'); }
    if (st.heat < P.heat.warn * 0.4) st.warned = false;
    if (st.heat >= 1) { // (the player is part of the chase now)
      st.heat = P.heat.after;
      Player.bust('pursuit');
    }
    // the getaway driver pays for the help: a bag of cash out of the window, onto the road ahead of the player
    if (Player.evil && !st.bagged && st.hindered >= P.bag.after) {
      st.bagged = true;
      const far = g.s > Player.s + P.bag.ahead;
      bags.push({ s: far ? g.s - g.hl - 1 : Player.s + P.bag.ahead, lat: far ? g.lat : Player.lat, vs: far ? g.vs * P.bag.slide : 0, taken: false });
      Message.say('events', 'pursuitBag');
      sfxAt('cargoDrop', g.s, 0.8);
    }
    // turned: beside it, and it has been held long enough
    if (st.held >= P.turnTime && gap < P.turnWithin && Math.abs(car.lat - g.lat) < g.hw + car.hw + P.beside + 1) end('caught');
    else if (gap > P.lost) end('away');
  };
  // caught: both pull over and stop, the interceptor behind, its lights still going
  const stopped = (car, dt) => {
    const g = st.robber, isCop = car === st.cop;
    const done = pullOver(car, dt, isCop && g.active ? Math.max(car.s, g.s - g.hl - car.hl - P.parkGap) : Infinity);
    car.hazards = !isCop && done;
  };
  // crashed, up the road: the getaway car leaves the road and stops a wreck on the verge, smoking
  const wreckedOff = (car, dt) => {
    pullOver(car, dt, Infinity, 1.2);
    if (car.vs > 1) car.yawVel += P.wreckSpin * dt;
    else { car.yaw = P.wreckYaw; car.yawVel = 0; }
    car.hazards = false;
  };
  // ...and the interceptor stops by it
  const attend = (car, dt) => {
    if (car.s < st.scene.s - P.attendFrom) drive(car, dt, P.standDown * 1.5, {});
    else pullOver(car, dt, (st.robber.active && st.robber.driver ? st.robber.s : st.scene.s) - P.parkGap - 6);
  };
  // away: the getaway car goes on up the road until it is gone; the interceptor gives it up, lights off
  const bolt = (car, dt) => { drive(car, dt, pace(car, P.catchUp), {}); };
  // (and after a while pulls in and stops, to be left behind)
  const standDown = (car, dt) => {
    if (st.t - st.endT < P.standDownFor) drive(car, dt, P.standDown, {});
    else pullOver(car, dt);
  };

  // how it ends: caught | crashed | away
  const end = (kind) => {
    if (!st || st.phase !== 'chase') return;
    const g = st.robber, cop = st.cop, near = Math.abs(g.s - Player.s) < P.seenWithin;
    const helped = kind === 'caught' && !Player.evil && st.byPlayer >= P.credit;
    st.phase = kind;
    st.endT = st.t;
    st.scene = { s: g.s, lat: g.lat, t: 0 };
    if (kind === 'caught') {
      g.driver = cop.driver = stopped;
      g.yawVel += P.turnKick * (cop.lat > g.lat ? -1 : 1); // (turned)
      g.stun = Math.max(g.stun, 0.6);
      sfxAt('screech', g.s);
      if (helped) {
        Social.level = Math.min(1, Social.level + P.reward.standing / 100);
        Game.cash += P.reward.cash;
        const wiped = Game.busts > 0 && P.reward.busts > 0;
        if (wiped) Game.busts = Math.max(0, Game.busts - P.reward.busts);
        const line = Message.say('events', wiped ? 'pursuitHelpedBust' : 'pursuitHelped');
        if (line) line.text = line.text.replace('${dollar}', '$' + P.reward.cash);
        sfx('cash20');
      } else if (near) Message.say('events', 'pursuitCaught');
    } else if (kind === 'crashed') {
      if (g.active) { // (drawn, up the road: off it goes; one wrecked on the road has blown up already, see Collision)
        g.driver = wreckedOff;
        g.health = Math.min(g.health, g.maxHealth * P.wreckHealth);
        g.stun = 1;
        sfxAt('crashHard', g.s);
      }
      if (cop.active) cop.driver = attend;
      if (near) Message.say('events', 'pursuitCrashed');
    } else {
      if (g.active) g.driver = bolt;
      if (cop.active) { cop.driver = standDown; cop.sirenOn = false; }
      if (near) Message.say('events', 'pursuitAway');
    }
    last = { kind, s: st.scene.s, helped };
    for (const hook of listeners) hook(kind, st.scene.s);
  };
  // left to themselves, up the road: one of the three, the player's part in it weighing the odds
  const settle = () => {
    if (Pursuit.force?.end) { end(Pursuit.force.end); return; }
    const odds = { ...P.odds };
    if (st.byPlayer > 0 || st.held > P.turnTime * 0.5) odds.caught *= P.weigh;
    if (st.hindered > 0) odds.away *= P.weigh;
    let r = Math.random() * (odds.caught + odds.crashed + odds.away);
    end((r -= odds.caught) < 0 ? 'caught' : (r -= odds.crashed) < 0 ? 'crashed' : 'away');
  };
  const clear = () => {
    for (const car of [st.robber, st.cop]) if (car.driver) { car.active = false; car.driver = null; car.sirenOn = false; }
    st = null;
  };

  const reset = () => {
    for (const car of Traffic.cars) { car.driver = null; car.sirenOn = false; car.role = null; }
    st = null;
    last = null;
    bags.length = 0;
    next = allowed() ? between(LEVEL.pursuits.every) : Infinity;
    if (Pursuit.force && allowed()) next = Pursuit.force.at;
  };
  const update = (dt) => {
    // a bag of cash on the road: it slides to a stop, and is the player's to drive over
    for (let i = bags.length - 1; i >= 0; i--) {
      const b = bags[i];
      b.vs = Math.max(0, b.vs - P.bag.drag * dt);
      b.s += b.vs * dt;
      if (Player.active && !b.taken && Math.abs(b.s - Player.s) < Player.hl + 1.2 && Math.abs(b.lat - Player.lat) < Player.hw + 1.2) {
        b.taken = true;
        Game.cash += P.bag.cash;
        const line = Message.say('powerups', 'cashBonus');
        if (line) line.text = line.text.replace('${dollar}', '$' + P.bag.cash);
        sfx('cash20');
      }
      if (b.taken || b.s < Player.s - 150) bags.splice(i, 1);
    }
    if (!st) {
      if (allowed() && Player.active && (next -= dt) <= 0) next = start() ? between(LEVEL.pursuits.every) : P.retry;
      return;
    }
    st.t += dt;
    const g = st.robber, cop = st.cop;
    if (st.phase === 'chase') {
      if (!g.active || !g.driver) end(g.health <= 0 ? 'crashed' : 'away'); // (wrecked: by a head-on, or whatever it ran into)
      else if (!cop.active || !cop.driver) end('away');                     // (the interceptor wrecked)
      else if (g.s - Player.s > (Pursuit.force?.end ? P.forceSettle : P.settle) || st.t > P.longest || g.s > Track.length - 60) settle();
      return;
    }
    // over: what is left of it stays where it is until the player is well past, the traffic slowing to look
    // (the cars that went on, away, are taken off once they are out of sight)
    const sc = st.scene;
    if (st.phase !== 'away' && (sc.t -= dt) <= 0) {
      sc.t = CONFIG.rubberneck.linger * 0.8;
      Traffic.noteWreck({ s: g.active && g.driver ? g.s : sc.s, lat: sc.lat });
    }
    const gone = (car) => !car.active || !car.driver || car.s - Player.s > CONFIG.spawnMax + 150 || Player.s - car.s > P.linger || !Track.inBounds(car.s + 20);
    if (gone(g) && gone(cop)) clear();
    else for (const car of [g, cop]) if (car.driver && gone(car)) { car.active = false; car.driver = null; car.sirenOn = false; }
  };

  return { reset, update, start, bags, listeners,
    get on() { return !!st; },
    get state() { return st; },   // (for the drawing, and the checks)
    get last() { return last; },
    get next() { return next; }, set next(v) { next = v; },
    force: null, // { at, end? }: one set off `at` s into every run, to end that way (for a picture, or a check)
  };
})();
