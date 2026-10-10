// A check of Gimmick Road 3's gimmicks (src/delivery/gambles.js), one at a time, headless: for each, both sides
// of its gamble (the risky line pays when it is driven right and costs when it is not), that the safe line
// always works, that nothing forces a stop, and at the end that a run still finishes.
//   node scripts/.gimmicks3-check.mjs [name ...]     (names: only those sections: wind crest ramp ...)
import { boot } from './delivery-headless.mjs';

const ONLY = process.argv.slice(2);
const g = await boot({ cars: ['commuter', 'sport', 'darkvan', 'lowrider', 'liftedtruck', 'pickup', 'buggy', 'miata'] });
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const section = (name, run) => { if (!ONLY.length || ONLY.includes(name)) { console.log('---- ' + name); return run(); } };
try {
  const { Gambles } = await g.load('gambles.js');
  const { Hazards } = await g.load('hazards.js');
  const { SpeedCameras } = await g.load('cameras.js');
  const { Progress } = await g.load('progress.js');
  const P = g.Player, G = g.Game, C = g.CONFIG;
  const T = () => g.track.Track;
  const level = g.select('gimmick-road-3');
  const lane = (n, s) => T().laneOffset(n, s);
  const quiet = () => { for (const car of g.Traffic.cars) if (!car.fixed) car.active = false; };
  const said = (text) => g.said.some(line => line.includes(text));
  // a fresh run in `car`, set down at s in lane n doing v, no traffic to get in the way (the level's own
  // fixed vehicles stay)
  const start = (s, n, v, { car = 'sport', ghost = false, keep = false } = {}) => {
    Progress.data.car = car;
    P.testGhost = false;
    G.evil = false;
    g.said.length = 0;
    G.start();
    if (!keep) quiet();
    Object.assign(P, { s, lat: lane(n, s), speed: v, launching: false, shield: 0 });
    Hazards.lastS = SpeedCameras.lastS = s;
    P.testGhost = ghost;
    g.drive(1, 0);
  };
  // a traffic vehicle of a kind put at (s, lat) doing v the player's way, for a check
  const put = (kind, s, lat, v) => {
    const car = g.Traffic.cars.find(c => !c.active && c.dir > 0);
    const type = C.vehicles[kind];
    Object.assign(car, { active: true, fixed: true, kind, s, lat, lane: T().nearestLane(lat, s), vs: v, baseSpeed: v, hw: type.hw, hl: type.hl, height: type.height, mass: type.mass,
      health: type.health, maxHealth: type.health, latVel: 0, yaw: 0, spin: 0, stun: 0, junction: null, parked: false, viaSide: false, evil: false });
    return car;
  };
  start(100, 3, 20);
  console.log('Level problems: ' + (T().problems.join(' | ') || 'none'));
  check(!T().problems.length, 'the level loads without problems');

  // ---- crosswind (300 - 900, blowing to the left: towards the oncoming lanes)
  await section('wind', async () => {
    const W = C.crosswind, w = () => Gambles.winds[0];
    // hands off through the whole stretch at a steady 25 m/s: how far the car is carried
    const drift = (car, opts = {}) => {
      start(280, 4, 25, { car });
      let most = 0, stopped = false;
      const lat0 = P.lat;
      g.run(40, (t) => {
        quiet();
        if (opts.each) opts.each();
        P.speed = 25;
        if (P.s > 300 && P.s < 900) most = Math.max(most, lat0 - P.lat);
        if (P.speed < 1) stopped = true;
        return P.s > 900;
      });
      return { most, stopped, busted: P.busted, wrecks: G.wrecks };
    };
    const low = drift('lowrider'), tall = drift('liftedtruck');
    check(said('Crosswind'), 'crosswind: it is announced');
    check(tall.most > low.most * 2 && low.most > 0.3, 'crosswind: hands off, a tall car is carried further than a low one (Lifted Truck ' + tall.most.toFixed(1) + ' m, Lowrider ' + low.most.toFixed(1) + ' m)');
    check(tall.most > C.laneWidth, 'crosswind, the cost: the tall car, hands off, is carried out of its lane (' + tall.most.toFixed(1) + ' m: a lane is ' + C.laneWidth + ' m)');
    // steering against it: taps hold the lane (the risky, fast line done right), flat out
    start(280, 4, 25, { car: 'liftedtruck' });
    let worst = 0, slowest = 99;
    const lat0 = P.lat;
    g.run(40, () => { quiet(); g.drive(1, P.lat < lat0 - 0.25 ? 1 : 0); if (P.s > 300) { worst = Math.max(worst, Math.abs(P.lat - lat0)); slowest = Math.min(slowest, P.speed); } return P.s > 900; });
    check(worst < 1 && slowest > 20 && !P.busted && G.wrecks === 0, 'crosswind, done right: the tall car, flat out, steered against it in taps, never leaves its lane (' + worst.toFixed(2) + ' m off its line at most, never under ' + Math.round(slowest * 3.6) + ' km/h)');
    // the push is no more than the steering can answer, for the tallest garage car in the hardest gust
    const tallest = Math.max(...g.cars.CARS.map(c => c.height));
    const hardest = Math.abs(Gambles.windPush({ ...w(), every: 1, length: 1 }, tallest, 0.5)) / C.steerResponse;
    check(hardest < C.steerSpeed * 0.5, 'crosswind: the hardest gust on the tallest garage car (' + tallest + ' m) is a drift of ' + hardest.toFixed(1) + ' m/s, well under the ' + C.steerSpeed + ' m/s the steering gives');
    // the gusts: a rhythm, the same every run
    const levels = [];
    for (let t = 0; t < w().every; t += 0.1) levels.push(Gambles.gust(w(), t));
    check(Math.max(...levels) === 1 && Math.abs(Math.min(...levels) - W.lull) < 1e-9 && Gambles.gust(w(), 1.3) === Gambles.gust(w(), 1.3 + w().every),
      'crosswind: it gusts in a fixed rhythm, from ' + W.lull + ' of its strength to all of it every ' + w().every + ' s');
    // shelter: a bus alongside on the windward side (the right: it blows to the left), keeping pace
    start(280, 4, 25, { car: 'liftedtruck' });
    let bus = null, sheltered = 0, mostIn = 0, kicked = 0;
    const latA = P.lat;
    g.run(12, () => {
      quiet();
      P.speed = 25;
      if (!bus) bus = put('bus', P.s, lane(5, P.s), 25);
      bus.s = P.s; bus.lat = lane(5, P.s); bus.vs = 25; bus.active = true;
      if (P.s > 320) { if (Gambles.lee === bus) sheltered++; mostIn = Math.max(mostIn, latA - P.lat); }
      return P.s > 560;
    });
    check(sheltered > 100 && mostIn < tall.most * 0.25, 'crosswind: in the lee of a bus alongside, the tall car is hardly moved (' + mostIn.toFixed(2) + ' m over 240 m)');
    // ...and clearing it: the bus drops back, and the wind is back with a shove
    const before = P.latVel;
    bus.active = false;
    g.run(0.05, () => { kicked = Math.min(kicked, P.latVel - before); });
    check(kicked < -1 && !Gambles.lee, 'crosswind: clearing the bus, the wind is back at once with a shove (' + kicked.toFixed(1) + ' m/s sideways)');
    // a low vehicle gives none
    start(280, 4, 25, { car: 'liftedtruck' });
    let taxi = null, lee = 0;
    g.run(6, () => { quiet(); if (!taxi) taxi = put('taxi', P.s, lane(5, P.s), 25); taxi.s = P.s; taxi.lat = lane(5, P.s); taxi.active = true; if (Gambles.lee) lee++; return P.s > 420; });
    check(lee === 0, 'crosswind: a vehicle lower than the car gives no shelter');
    // traffic drifts in its lane, and no more
    start(100, 3, 0, { car: 'sport' });
    g.drive(-1, 0);
    const semi = put('semi', 320, lane(5, 320), 20);
    semi.fixed = false;
    let off = 0;
    g.run(20, () => { P.speed = 0; if (!semi.active) return true; if (semi.s > 340 && semi.s < 880) off = Math.max(off, lane(5, semi.s) - semi.lat); return semi.s > 880; });
    check(off > 0.2 && off < 1.2, 'crosswind: a semi in it drifts ' + off.toFixed(2) + ' m downwind in its lane, and stays in it');
    // the safe line: a low car in the right-hand lane (the windward one: the most room), its driver only correcting
    // once it is a metre off its line, never leaves that lane; and hands off for a whole gust it moves less than half a lane
    start(280, 5, 25, { car: 'lowrider' });
    let lazy = 0, slow = 99;
    const latL = P.lat;
    g.run(40, () => { quiet(); g.drive(1, P.lat < latL - 1 ? 1 : 0); if (P.s > 300) { lazy = Math.max(lazy, Math.abs(P.lat - latL)); slow = Math.min(slow, P.speed); } return P.s > 900; });
    const perGust = Math.abs(Gambles.windPush({ ...w(), every: 1, length: 1 }, g.cars.CARS.find(c => c.id === 'lowrider').height, 0.5)) / C.steerResponse * w().length;
    check(lazy < C.laneWidth / 2 && slow > 20 && !P.busted && G.wrecks === 0 && perGust < C.laneWidth / 2,
      'crosswind, the safe line: a low car in the windward lane, corrected only when a metre off its line, stays in its lane (' + lazy.toFixed(2) + ' m off at most; a whole gust hands off moves it ' + perGust.toFixed(1) + ' m), never slowed, no bust');
  });

  // ---- crest jumps (two crests, their tops at 1190 and 1490; a barrier over the first in lane 4, over the
  // second in lanes 3 and 5)
  await section('crest', async () => {
    const K = C.crest, crests = () => Gambles.crests;
    start(1000, 3, 20);
    check(crests().length === 2 && crests().every(c => c.speed < K.signUnder), 'crests: the level has two, found from its profile alone (flying from ' + crests().map(c => Math.round(c.speed * 3.6) + ' km/h').join(', ') + ')');
    const need = crests()[0].speed;
    // over the first crest at a held speed, in a lane: what happened
    const over = (v, n, { steer = null, car = 'sport', to = 1300, from = 1060 } = {}) => {
      start(from, n, v, { car });
      let top = 0, steered = 0, slowest = 99;
      const lat0 = P.lat, health = P.health;
      const t = g.run(30, () => {
        quiet();
        P.speed = Math.min(P.speed, v);
        if (steer) g.drive(1, steer());
        if (Gambles.fly) { top = Math.max(top, Gambles.fly.top); steered = Math.max(steered, Math.abs(P.latVel)); }
        slowest = Math.min(slowest, P.speed);
        return P.s > to || G.wrecks > 0;
      });
      return { t, top, lost: health - P.health, flights: Gambles.flights, wrecks: G.wrecks, steered, slowest, lat: P.lat - lat0 };
    };
    // the risky line, done right: flat out in a clear lane
    const fast = over(31, 3);
    check(fast.flights === 1 && fast.top > 0.5 && fast.lost === 0 && fast.wrecks === 0, 'crest, the risk taken and right: at ' + Math.round(31 * 3.6) + ' km/h in a clear lane the car flies (' + fast.top.toFixed(1) + ' m up) and lands unhurt');
    check(said('Airborne'), 'crest: being in the air is said');
    // ...done wrong: flat out in the lane with the barrier over the top
    const wrong = over(31, 4);
    check(wrong.flights === 1 && (wrong.lost > 10 || wrong.wrecks > 0), 'crest, the risk taken and wrong: flying in the lane the barrier is in, it lands in it (' + (wrong.wrecks ? 'wrecked' : wrong.lost.toFixed(0) + ' health lost') + ')');
    // no steering in the air: full lock held all the way over moves it no faster across than it left the ground with
    start(1060, 3, 31);
    let turned = 0, air = 0, atOff = null;
    g.run(10, () => { quiet(); P.speed = 31; g.drive(1, P.s > 1150 ? 1 : 0); if (Gambles.fly) { if (atOff === null) atOff = P.latVel; air++; turned = Math.max(turned, Math.abs(P.latVel - atOff)); } return P.s > 1300; });
    check(air > 20 && turned < 1e-6, 'crest: in the air the steering does nothing (' + air + ' steps in the air at full lock, sideways speed unchanged)');
    // the safe line: under the crest's speed the car stays on the ground, sees the barrier from the top and steers round it
    const slow = over(need - 3, 4, { steer: () => (P.s > 1185 && P.s < 1225 && P.lat < lane(5, P.s) - 0.2 ? 1 : 0) });
    check(slow.flights === 0 && slow.lost === 0 && slow.wrecks === 0 && slow.slowest > 15, 'crest, the safe line: at ' + Math.round((need - 3) * 3.6) + ' km/h it stays on the ground, and steers round the barrier from the top (no damage, never under ' + Math.round(slow.slowest * 3.6) + ' km/h)');
    check(fast.t < slow.t - 0.4, 'crest: flying is the faster way over (' + fast.t.toFixed(1) + ' s against ' + slow.t.toFixed(1) + ' s from 1060 to 1300 m)');
    // a slow car never leaves the ground at all, flat out
    const commuter = over(g.cars.CARS[0].maxSpeed, 3, { car: 'commuter' });
    check(commuter.flights === 0, 'crest: the Commuter, flat out (' + Math.round(g.cars.CARS[0].maxSpeed * 3.6) + ' km/h), never leaves the ground');
    // a hard landing costs: a fast car flies further and comes down harder
    const hard = over(42, 3, { car: 'miata' });
    check(hard.flights === 1 && hard.top > 2 && hard.lost > 0 && hard.lost < 40 && hard.wrecks === 0, 'crest: at ' + Math.round(42 * 3.6) + ' km/h it flies ' + hard.top.toFixed(1) + ' m up and the landing costs ' + hard.lost.toFixed(0) + ' health');
    // the camera: coming up to the top it is down behind the car; over it, back up
    check(Gambles.blind(1000) === 0 && Gambles.blind(1170) > 0.9 && Gambles.blind(1260) === 0, 'crest: the camera comes down behind the car on the way up (' + Gambles.blind(1170).toFixed(2) + ' at 1170 m) and is back over the top');
    // no other level has a crest by accident
    const others = [];
    for (const l of [...g.levels.LEVELS, ...Object.values(g.levels.HIDDEN_LEVELS)]) {
      if (l.id === 'gimmick-road-3' || l.segments.some(seg => seg.ease)) continue;
      g.select(l); G.start();
      if (Gambles.crests.length && !g.cars.CAR.noWheels) others.push(l.id + ' (' + Gambles.crests.map(c => Math.round(c.speed * 3.6)).join(', ') + ' km/h)');
    }
    g.select('gimmick-road-3');
    check(!others.length, 'crest: no level without an "ease" of its own has a crest a car could fly' + (others.length ? ': ' + others.join('; ') : ''));
  });

  console.log(failures ? failures + ' FAILED' : 'all checks passed');
} catch (e) {
  failures++;
  console.log('THREW ' + (e.stack || e));
} finally {
  await g.close();
}
process.exit(failures ? 1 : 0);
