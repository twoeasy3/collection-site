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
  // each real level that has `field`: loaded and started (it must load without problems), then back to Gimmick Road 3
  const real = (field, each) => {
    const found = g.levels.LEVELS.filter(l => Array.isArray(l[field]) ? l[field].length : l[field]);
    check(found.length >= 2, field + ': on ' + found.length + ' real levels (' + found.map(l => l.id).join(', ') + ')');
    for (const l of found) {
      g.select(l); Progress.data.car = 'sport'; G.start();
      check(!T().problems.length, l.id + ': loads without problems' + (T().problems.length ? ': ' + T().problems.join(' | ') : ''));
      each(l);
    }
    g.select('gimmick-road-3');
    G.start();
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

  // ---- ramp over the jam (the foot of its ramps at 2400, lane 4; a queue of 4 beyond it, and in lanes 3 and 5;
  // barriers close the right shoulder: the way round is the oncoming side)
  await section('ramp', async () => {
    const J = C.jamRamp, r = () => Gambles.ramps[0];
    start(2200, 4, 20);
    const queue = () => g.Traffic.cars.filter(c => c.active && c.jam);
    const need = r().speed;
    check(queue().length === Gambles.queueSpots(r()).length && queue().every(c => Math.abs(c.vs) < 0.01), 'ramp: its queue is real traffic, stopped (' + queue().length + ' cars in lanes ' + r().lanes.join(' to ') + ', the last at ' + r().last + ' m)');
    check(need > g.cars.CARS[0].maxSpeed && need < 40, 'ramp: clearing the queue takes ' + Math.round(need * 3.6) + ' km/h at its foot (more than the Commuter has: ' + Math.round(g.cars.CARS[0].maxSpeed * 3.6) + ')');
    // at it at a speed, in a lane (held to that speed up to its foot, hands off from there)
    const at = (v, n, { car = 'sport', steer = null } = {}) => {
      start(2250, n, v, { car, keep: false });
      let top = 0, on = false, slowest = 99, slowestOn = 99;
      const health = P.health;
      const t = g.run(40, () => {
        for (const c of g.Traffic.cars) if (!c.fixed) c.active = false;
        if (P.s < 2400) P.speed = v; else if (!steer) g.drive(0, 0);
        if (steer) g.drive(1, steer());
        if (Gambles.onRamp) { on = true; slowestOn = Math.min(slowestOn, P.speed); }
        if (Gambles.fly) top = Math.max(top, P.air);
        slowest = Math.min(slowest, P.speed);
        return P.s > 2560 || G.wrecks > 0 || P.busted;
      });
      return { t, top, on, lost: health - P.health, wrecks: G.wrecks, slowest, slowestOn, busted: P.busted, s: P.s, hit: queue().filter(c => c.health < c.maxHealth).length };
    };
    const over = at(Math.ceil(need * 3.6 / 5) * 5 / 3.6, 4);
    check(over.on && over.top > r().top && over.wrecks === 0 && over.hit === 0 && over.s > 2560, 'ramp, the risk taken and right: at the speed on its board (' + Math.round(Math.ceil(need * 3.6 / 5) * 5) + ' km/h), hands off, the car goes up it (' + over.top.toFixed(1) + ' m up), over the whole queue, and lands (' + over.lost.toFixed(0) + ' health for the landing)');
    const short = at(need - 8, 4);
    check(short.on && (short.wrecks > 0 || short.lost > 25) && short.hit > 0, 'ramp, the risk taken and wrong: ' + Math.round((need - 8) * 3.6) + ' km/h is too slow: it comes down in the queue (' + (short.wrecks ? 'wrecked' : short.lost.toFixed(0) + ' health lost') + ', ' + short.hit + ' of the queue hit)');
    // the way round: the oncoming side, with nothing coming (the level's barriers close the shoulder)
    const round = at(22, 3, { steer: () => { const want = P.s > 2330 && P.s < 2470 ? lane(2, P.s) : lane(3, P.s); return Math.abs(want - P.lat) < 0.2 ? 0 : Math.sign(want - P.lat); } });
    check(round.wrecks === 0 && round.lost === 0 && !round.busted && round.slowest > 15 && round.s > 2560, 'ramp, the safe line: round the queue by the lane beyond the centre line, nothing coming: no damage, no bust, never under ' + Math.round(round.slowest * 3.6) + ' km/h');
    // beside the transporter, the car is kept out of it; and traffic coming up its lane moves over
    // (with the queue beside it taken away, to try the trailer alone)
    start(2380, 4, 15);
    for (const c of queue()) c.active = false;
    Object.assign(P, { s: 2405, lat: r().lat + 3, speed: 6 });
    let inside = false;
    g.run(1.2, () => { g.drive(0, -1); P.speed = 6; if (!Gambles.onRamp && Math.abs(P.lat - r().lat) < J.half + P.hw - 0.01) inside = true; });
    check(!inside && !Gambles.onRamp && P.health === P.maxHealth, 'ramp: steered at from beside it, the car is kept out of the trailer, at no cost');
    start(2000, 3, 0);
    g.drive(-1, 0);
    const van = put('van', 2200, lane(4, 2200), 18);
    van.fixed = false;
    let wentUp = false;
    g.run(14, () => { P.speed = 0; P.s = 2000; if (van.active && van.s > 2400 && van.s < 2415 && Math.abs(van.lat - r().lat) < 1) wentUp = true; return !van.active; });
    check(!wentUp && van.lane !== 4, 'ramp: a van coming up its lane moved over (to lane ' + van.lane + ') and never reached its ramps (it stopped at ' + Math.round(van.s) + ' m, doing ' + Math.abs(van.vs).toFixed(1) + ' m/s)');
    // the slowest car, crawling onto it, never comes to a stand on it: it goes off the lip into the queue
    const crawl = at(6, 4, { car: 'commuter' });
    check(crawl.on && crawl.slowestOn >= J.crawl - 0.01 && crawl.s > 2415, 'ramp: the Commuter at ' + Math.round(6 * 3.6) + ' km/h is never brought to a stand on it (slowest ' + crawl.slowestOn.toFixed(1) + ' m/s; it got to ' + Math.round(crawl.s) + ' m)');
    // on the real levels
    real('jamRamps', (l) => {
      const rr = Gambles.ramps[0], q = g.Traffic.cars.filter(c => c.active && c.jam).length, [first, last] = T().laneRange(1, rr.s);
      check(q === Gambles.queueSpots(rr).length && rr.speed < 34, l.id + ': the ramp at ' + rr.s + ' m, lane ' + rr.lane + ' of ' + first + ' to ' + last + ': its whole queue is out (' + q + ' cars), clearing it takes ' + Math.round(rr.speed * 3.6) + ' km/h');
    });
  });

  // ---- washboard dirt (2950 - 3450, through the two gentle bends; barriers to be steered round at 3120 (lane 4),
  // 3200 (lanes 3 and 5) and 3330 (lane 4): the line through is lane 3, lane 4, lane 3)
  await section('washboard', async () => {
    const B = C.washboard, b = () => Gambles.boards[0];
    // through it held at v, steering for the line through the barriers as a player would (at the stick's full
    // throw towards the lane wanted, let go within 0.3 m of it)
    const through = (v, car = 'sport') => {
      start(2900, 3, v, { car });
      const health = P.health;
      let off = 0, rough = 0, slowest = 99;
      const t = g.run(120, () => {
        quiet();
        P.speed = Math.min(P.speed, v);
        const want = lane(P.s > 3140 && P.s < 3270 ? 4 : 3, P.s), d = want - P.lat;
        g.drive(1, Math.abs(d) < 0.3 ? 0 : Math.sign(d));
        if (P.s > 2960 && P.s < 3440) { off = Math.max(off, Math.abs(d)); rough = Math.max(rough, Gambles.rough); slowest = Math.min(slowest, P.speed); }
        return P.s > 3460 || G.wrecks > 0;
      });
      return { t, off, rough, slowest, lost: health - P.health, wrecks: G.wrecks, busted: P.busted };
    };
    check(Gambles.roughness(B.calm) === 0 && Gambles.roughness(b().skim) === 0 && Gambles.roughness((B.calm + b().skim) / 2) === 1, 'washboard: smooth at ' + Math.round(B.calm * 3.6) + ' km/h or less and at ' + Math.round(b().skim * 3.6) + ' km/h or more, worst half way between');
    const fast = through(b().skim + 4);
    check(fast.rough === 0 && fast.lost === 0 && fast.wrecks === 0, 'washboard, the risk taken and right: at ' + Math.round((b().skim + 4) * 3.6) + ' km/h it skims: never rough, round all three barriers unhurt in ' + fast.t.toFixed(1) + ' s');
    check(said('Washboard'), 'washboard: it is announced');
    const mid = through((B.calm + b().skim) / 2);
    check(mid.rough > 0.95 && (mid.lost > 0 || mid.wrecks > 0), 'washboard, the risk taken and wrong: at ' + Math.round((B.calm + b().skim) / 2 * 3.6) + ' km/h, the same steering: it hops, wanders ' + mid.off.toFixed(1) + ' m off the line and hits a barrier (' + (mid.wrecks ? 'wrecked' : mid.lost.toFixed(0) + ' health lost') + ')');
    const slow = through(B.calm - 0.5);
    check(slow.rough === 0 && slow.lost === 0 && slow.wrecks === 0 && !slow.busted && slow.slowest > B.calm - 1.5, 'washboard, the safe line: crawling at ' + Math.round((B.calm - 0.5) * 3.6) + ' km/h it is never rough: round all three unhurt, never stopped, in ' + slow.t.toFixed(1) + ' s (' + (slow.t - fast.t).toFixed(1) + ' s slower than skimming)');
    // lifting off in it from above the skim speed drops the car into the rough
    start(3000, 3, b().skim + 2);
    let worst = 0;
    g.run(6, () => { quiet(); g.drive(-1, 0); worst = Math.max(worst, Gambles.rough); return P.speed < B.calm; });
    check(worst > 0.95, 'washboard: braking on it from skimming goes down through the rough (' + worst.toFixed(2) + ' at its worst)');
    // every garage car here can reach the skim speed; a ghost feels nothing
    check(g.cars.CARS.every(c => c.noWheels || c.maxSpeed > b().skim), 'washboard: every car in the garage has the speed to skim it (' + Math.round(b().skim * 3.6) + ' km/h)');
    start(3000, 3, 14, { ghost: true });
    g.run(0.5, () => { P.speed = 14; });
    check(Gambles.rough === 0, 'washboard: a ghost feels nothing of it');
    real('washboards', () => check(Gambles.boards.length > 0, '  its washboard: ' + Gambles.boards.map(x => x.from + ' to ' + x.to + ' m, skims at ' + Math.round(x.skim * 3.6) + ' km/h').join('; ')));
  });

  // ---- low bridge (the bar at 4400, 2 m; the exit at 4000 goes round it, back at 4800)
  await section('bridge', async () => {
    const L = C.lowBridge, bar = () => Gambles.bars[0];
    // from 3850 to 4900 at up to v: straight on in lane n, or (exit) over to the exit lane and round by the side road
    const go = (car, v, n, exit = false) => {
      start(3850, n, v, { car });
      const health = P.health;
      let slowest = 99, side = false, after = 0;
      const t = g.run(120, () => {
        quiet();
        P.speed = Math.min(P.speed, v);
        const main = T().isMain(P.s);
        if (!main) side = true;
        const want = exit && main && P.s > 4000 - C.ramps.laneZone + 15 && P.s < 4010 ? lane(5, P.s) + C.laneWidth : main ? lane(n, P.s) : P.lat, d = want - P.lat;
        g.drive(1, Math.abs(d) < 0.3 ? 0 : Math.sign(d));
        slowest = Math.min(slowest, P.speed);
        if (main && P.s > 4400 && !after) after = P.speed;
        return (main && P.s > 4900) || G.wrecks > 0;
      });
      return { t, lost: health - P.health, slowest, side, after, hits: bar().hits, wrecks: G.wrecks, busted: P.busted, height: P.height };
    };
    check(bar().exit && bar().exit.exitAt === 4000, 'low bridge: the bar at ' + bar().s + ' m, ' + bar().clearance + ' m up, has the exit at 4000 m round it');
    const low = go('sport', 28, 4);
    check(low.hits === 0 && low.lost === 0 && !low.side && low.slowest > 27, 'low bridge, a car that fits (' + low.height + ' m): straight under, untouched, never slowed (' + low.t.toFixed(1) + ' s)');
    check(said('you fit under') && said(low.height.toFixed(1) + ' m under'), 'low bridge: it is told that it fits, and what it measures');
    const hit = go('liftedtruck', 28, 4);
    check(hit.hits === 1 && hit.lost >= L.damage && hit.wrecks === 0 && hit.after < 28 * L.keep + 1 && hit.slowest > 5, 'low bridge, the risk taken by a car too tall (' + hit.height + ' m): it takes the knock (' + hit.lost.toFixed(0) + ' health, down to ' + Math.round(hit.after * 3.6) + ' km/h) and is through, never stopped (' + hit.t.toFixed(1) + ' s)');
    check(said('too tall') && said('CLANG'), 'low bridge: it is told it is too tall before the exit, and the knock is said');
    const round = go('liftedtruck', 28, 5, true);
    check(round.side && round.hits === 0 && round.lost === 0 && !round.busted && round.slowest > 15, 'low bridge, the safe line: the tall car takes the exit and comes back unhurt, never under ' + Math.round(round.slowest * 3.6) + ' km/h (' + round.t.toFixed(1) + ' s: ' + (round.t - low.t).toFixed(1) + ' s longer than under the bar)');
    // the oncoming side has no bar; a ghost goes through it
    const across = go('liftedtruck', 28, 2);
    check(across.hits === 0 && across.lost === 0, 'low bridge: the oncoming side is not barred');
    // tall traffic takes the exit
    start(3700, 3, 0);
    const bus = put('bus', 3800, lane(5, 3800), 18), van = put('commuter', 3800, lane(4, 3800), 18);
    bus.fixed = van.fixed = false; bus.viaSide = van.viaSide = false;
    let under = false;
    g.run(40, () => { for (const c of g.Traffic.cars) if (c !== bus && c !== van && !c.fixed) c.active = false; P.speed = 0; P.s = 3700; if (bus.active && T().isMain(bus.s) && bus.s > 4390 && bus.s < 4410) under = true; return !bus.active || (!T().isMain(bus.s)) || bus.s > 4500; });
    check(!under && bus.active && !T().isMain(bus.s) && !van.viaSide, 'low bridge: a bus coming up to it, with room to move over, takes the exit (a car that fits is left to choose)');
    real('lowBridges', () => check(Gambles.bars.every(x => x.exit), '  its bar' + (Gambles.bars.length > 1 ? 's' : '') + ': ' + Gambles.bars.map(x => x.s + ' m, ' + x.clearance + ' m up, round by the exit at ' + x.exit?.exitAt).join('; ')));
  });

  // ---- ford (5650 - 5720, 0.6 m deep; the exit at 5300 is the bridge, back at 6100)
  await section('ford', async () => {
    const F = C.ford, f = () => Gambles.fords[0];
    // from 5150 to 6200 at up to v: straight through in lane n, or (bridge) over to the exit lane and round
    const go = (car, v, n, bridge = false, ghost = false) => {
      start(5150, n, v, { car, ghost });
      const health = P.health, wades = Gambles.wades();
      let slowest = 99, side = false, wet = 0;
      const t = g.run(200, (now) => {
        quiet();
        P.speed = Math.min(P.speed, v);
        const main = T().isMain(P.s);
        if (!main) side = true;
        const want = bridge && main && P.s > 5300 - C.ramps.laneZone + 15 && P.s < 5310 ? lane(5, P.s) + C.laneWidth : main ? lane(n, P.s) : P.lat, d = want - P.lat;
        g.drive(1, Math.abs(d) < 0.3 ? 0 : Math.sign(d));
        slowest = Math.min(slowest, P.speed);
        if (Gambles.inFord) wet += 1 / 60;
        return (main && P.s > 6200) || G.wrecks > 0;
      });
      return { t, lost: health - P.health, slowest, side, wet, wades, wrecks: G.wrecks, busted: P.busted };
    };
    check(f().exit && f().exit.exitAt === 5300, 'ford: ' + f().from + ' to ' + f().to + ' m, ' + f().depth + ' m deep, has the exit at 5300 m as its bridge');
    check(Gambles.wades(0) === F.shallow && Gambles.wades(1) === F.deepest && Gambles.fordPace(0.3, 0.9) > Gambles.fordPace(0.8, 0.9) && Gambles.fordPace(0.9, 0.9) === F.slow && Gambles.fordPace(1, 0.9) === F.crawl,
      'ford: a car wades ' + F.shallow + ' m (the worst) to ' + F.deepest + ' m (the best); the deeper for it the slower, down to ' + Math.round(F.slow * 3.6) + ' km/h at its limit, and ' + Math.round(F.crawl * 3.6) + ' km/h beyond it');
    const good = go('liftedtruck', 28, 4);
    check(good.wet > 0 && good.lost === 0 && good.slowest > F.slow && !good.side, 'ford, the risk taken in the right car (wades ' + good.wades.toFixed(2) + ' m): through unhurt, never under ' + Math.round(good.slowest * 3.6) + ' km/h (' + good.t.toFixed(1) + ' s)');
    check(said('you can wade it') && said('0.6 m deep'), 'ford: it is told it can wade it, with the depth and what it wades');
    const bad = go('lowrider', 28, 4);
    check(bad.wet > 10 && bad.lost > 5 && bad.wrecks === 0 && bad.slowest >= F.crawl - 0.01, 'ford, the risk taken in the wrong car (wades ' + bad.wades.toFixed(2) + ' m): it crawls across, ' + bad.wet.toFixed(0) + ' s in the water and ' + bad.lost.toFixed(0) + ' health lost, never stopped (' + bad.t.toFixed(1) + ' s)');
    check(said('too deep for this car') && said('Out of your depth'), 'ford: it is told it is too deep before the exit, and again in it');
    const round = go('lowrider', 28, 5, true);
    check(round.side && round.wet === 0 && round.lost === 0 && !round.busted && round.slowest > 15, 'ford, the safe line: the same car over the bridge (the exit): dry, unhurt, never under ' + Math.round(round.slowest * 3.6) + ' km/h (' + round.t.toFixed(1) + ' s: ' + (bad.t - round.t).toFixed(1) + ' s quicker than wading, ' + (round.t - good.t).toFixed(1) + ' s slower than the truck through the water)');
    const ghost = go('lowrider', 28, 4, false, true);
    check(ghost.wet === 0 && ghost.lost === 0 && ghost.slowest > 25, 'ford: a ghost goes over it untouched');
    // traffic wades through slowly
    start(5500, 3, 0);
    const van = put('commuter', 5600, lane(4, 5600), 18);
    van.fixed = false;
    let fastest = 0;
    g.run(20, () => { P.speed = 0; P.s = 5500; if (van.active && van.s > 5670 && van.s < 5715) fastest = Math.max(fastest, van.vs); return !van.active || van.s > 5730; });
    check(fastest > 0 && fastest <= F.traffic + 0.5, 'ford: traffic wades it slowly (' + fastest.toFixed(1) + ' m/s in the water)');
    real('fords', () => check(Gambles.fords.every(x => x.exit), '  its ford' + (Gambles.fords.length > 1 ? 's' : '') + ': ' + Gambles.fords.map(x => x.from + ' to ' + x.to + ' m, ' + x.depth + ' m deep, the bridge the exit at ' + x.exit?.exitAt).join('; ')));
  });

  // ---- speed cushions (rows at 3520, 3565, 3610, 3655, 3700: a cushion in each lane, a gap on each lane line)
  await section('cushions', async () => {
    const K = C.cushion;
    // from 3480 to 3740 held at v, on the line `lat` m from the road's middle (a function of s), or braking for each row
    const over = (v, lat, { car = 'sport', brake = false } = {}) => {
      start(3480, 3, v, { car });
      P.lat = lat(3480);
      const health = P.health;
      let slowest = 99, air = 0;
      const t = g.run(90, () => {
        quiet();
        const next = Gambles.rows.find(r => r.s > P.s), slow = brake && next && next.s - P.s < 22 && P.speed > K.soft - 0.5;
        if (!brake) P.speed = Math.min(P.speed, v);
        const d = lat(P.s) - P.lat;
        g.drive(slow ? -1 : brake && P.speed > v ? 0 : 1, Math.abs(d) < 0.1 ? 0 : Math.sign(d));
        slowest = Math.min(slowest, P.speed);
        if (Gambles.fly) air += 1 / 60;
        return P.s > 3740 || G.wrecks > 0;
      });
      return { t, lost: health - P.health, hits: Gambles.cushionHits, slowest, air, wrecks: G.wrecks, busted: P.busted };
    };
    const line = (s) => (lane(3, s) + lane(4, s)) / 2, middle = (s) => lane(4, s);
    check(Gambles.rows.length === 5 && Gambles.onCushion(3520, middle(3520)) && !Gambles.onCushion(3520, line(3520)) && !Gambles.onCushion(3520, line(3520) + K.line - 0.05, K.hwRef) && Gambles.onCushion(3520, line(3520) + K.line + 0.05, K.hwRef),
      'cushions: 5 rows; the middle of a lane is on one, a lane line is between two, with ' + K.line + ' m to spare either side for a car as wide as the Commuter');
    check(Gambles.cushionRoom(1.12) < Gambles.cushionRoom(0.74) && Gambles.cushionRoom(1.4) === K.least, 'cushions: a wide car has less room in the gap (' + Gambles.cushionRoom(1.12).toFixed(2) + ' m against ' + Gambles.cushionRoom(0.74).toFixed(2) + ' m), never less than ' + K.least + ' m');
    const fast = over(30, line);
    check(fast.hits === 0 && fast.lost === 0 && fast.air === 0 && fast.slowest > 29, 'cushions, the risk taken and right: on the lane line at ' + Math.round(30 * 3.6) + ' km/h, through all five rows untouched (' + fast.t.toFixed(1) + ' s)');
    check(said('Speed cushions'), 'cushions: they are announced');
    const wrong = over(30, middle);
    check(wrong.hits >= 3 && wrong.lost > 3 * K.damage && wrong.air > 0.5 && wrong.wrecks === 0, 'cushions, the risk taken and wrong: down the middle of the lane at the same speed: over ' + wrong.hits + ' of them, thrown up each time (' + wrong.air.toFixed(1) + ' s in the air), ' + wrong.lost.toFixed(0) + ' health lost (' + wrong.t.toFixed(1) + ' s)');
    check(said('THUMP'), 'cushions: the first one hit is said');
    const off = over(30, (s) => line(s) + 0.7);
    check(off.hits >= 3, 'cushions: 0.7 m off the lane line is not in the gap (' + off.hits + ' hit)');
    const slow = over(22, middle, { brake: true });
    check(slow.hits === 0 && slow.lost === 0 && slow.wrecks === 0 && !slow.busted && slow.slowest > 5, 'cushions, the safe line: down the middle of the lane, braking to ' + Math.round(K.soft * 3.6) + ' km/h for each row: no damage, never under ' + Math.round(slow.slowest * 3.6) + ' km/h (' + slow.t.toFixed(1) + ' s: ' + (slow.t - fast.t).toFixed(1) + ' s slower than the line at speed)');
    // traffic crawls over them
    start(3300, 3, 0);
    const van = put('commuter', 3400, lane(4, 3400), 20);
    van.fixed = false;
    let fastest = 0;
    g.run(30, () => { P.speed = 0; P.s = 3300; if (van.active && van.s > 3530 && van.s < 3700) fastest = Math.max(fastest, van.vs); return !van.active || van.s > 3720; });
    check(fastest > 0 && fastest <= K.traffic + 3, 'cushions: traffic takes them slowly (' + fastest.toFixed(1) + ' m/s at most between the rows)');
    real('cushions', () => check(Gambles.rows.length > 0, '  its rows: ' + Gambles.rows.map(r => r.s).join(', ') + ' m'));
  });

  // ---- a whole run, start to finish, hands off the wheel in the middle lane, a ghost (nothing here stops it)
  await section('finish', async () => {
    start(0, 3, 20, { ghost: true, keep: true });
    let slowest = 99;
    const t = g.run(400, () => { if (P.s > 200) slowest = Math.min(slowest, P.speed); return G.state !== 'playing'; });
    check(G.state !== 'playing' && !P.busted && slowest > 5, 'a run finishes: ' + G.state + ' after ' + t.toFixed(0) + ' s, never under ' + Math.round(slowest * 3.6) + ' km/h after the start');
  });

  console.log(failures ? failures + ' FAILED' : 'all checks passed');
} catch (e) {
  failures++;
  console.log('THREW ' + (e.stack || e));
} finally {
  await g.close();
}
process.exit(failures ? 1 : 0);
