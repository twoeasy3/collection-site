// Headless smoke test: runs the game logic (no rendering) through every level and checks
// that nothing breaks. Run with: npm test
import { createServer } from 'vite';

// the game logic touches the DOM only to show / hide screens
const element = () => ({ classList: { add() {}, remove() {} }, addEventListener() {}, style: {}, textContent: '' });
globalThis.window = { addEventListener() {} };
// every level unlocked and every car owned, so each can be loaded and tested
const allOpen = encodeURIComponent(JSON.stringify({ unlocked: 99, cars: ['hatch', 'junker', 'coupe', 'lowrider', 'wagon', 'sport', 'lovebus', 'tank'] }));
globalThis.document = { getElementById: element, body: element(), cookie: 'delivery_racer_progress=' + allOpen };

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
let failures = 0;
const check = (ok, what) => {
  if (!ok) failures++;
  console.log((ok ? '  ok    ' : '  FAIL  ') + what);
};

try {
  const load = (path) => server.ssrLoadModule(path);
  const levels = await load('/src/delivery/levels.js');
  const track = await load('/src/delivery/track.js');
  const { Game } = await load('/src/delivery/game.js');
  const { Player } = await load('/src/delivery/player.js');
  const { Collision } = await load('/src/delivery/collision.js');
  const { Traffic } = await load('/src/delivery/traffic.js');
  const { Input } = await load('/src/delivery/input.js');
  const { FxQueue } = await load('/src/delivery/physics.js');
  const cars = await load('/src/delivery/cars.js');
  const { CONFIG } = await load('/src/delivery/config.js');
  Object.defineProperty(Input, 'throttle', { get: () => 1, configurable: true });

  check(track.Track === null, 'nothing of a level is built before a run starts');

  for (let n = 0; n < levels.LEVELS.length; n++) {
    levels.selectLevel(n);
    console.log(`level ${n + 1}: ${levels.LEVEL.name}`);

    // drive flat out, throwing packages, kept alive so the whole course is covered
    for (const evil of [false, true]) {
      Game.evil = evil;
      Game.start(); // this is what loads the level
      if (!evil) {
        const problems = track.Track.problems;
        check(Game.loaded === levels.LEVEL, 'starting a run loads the level picked on the menu');
        check(problems.length === 0, 'level data has no problems' + (problems.length ? ': ' + problems.join('; ') : ''));
        // heights: a level with grades has hills, the rest are flat; slopes stay gentle and smooth
        const T = track.Track, p = {}, wantHills = levels.LEVEL.segments.some(seg => seg.grade);
        let low = Infinity, high = -Infinity, steepest = 0, sharpest = 0, last = null;
        for (let s = T.start; s <= T.end; s += 2) {
          T.toWorld(s, 0, p);
          low = Math.min(low, p.y); high = Math.max(high, p.y);
          steepest = Math.max(steepest, Math.abs(T.grade(s)));
          if (last !== null) sharpest = Math.max(sharpest, Math.abs(T.grade(s) - last));
          last = T.grade(s);
        }
        check(T.hilly === wantHills && Number.isFinite(high) && Math.abs(low) < 1e-6 &&
          (wantHills ? high > 5 && steepest <= Math.max(...levels.LEVEL.segments.map(seg => Math.abs(seg.grade || 0))) + 1e-9 && sharpest < 0.03 : high === 0),
          wantHills ? `hills: road height runs from 0 to ${high.toFixed(1)} m, steepest slope ${(steepest * 100).toFixed(1)}%, no sharp kinks`
            : 'the road is flat');
      }
      let sane = true, steps = 0;
      while (Game.state === 'playing' && steps < 120 * 600) {
        if (steps % 40 === 0) Input.emit('throw');
        Player.health = Player.maxHealth;
        Game.busts = 0;
        Game.time = 0; // hold the clock: this run is about the road, not the deadline
        Game.update(1 / 120);
        FxQueue.length = 0;
        for (const v of Collision.bodies) {
          if (v.active && ![v.s, v.lat, v.vs, v.health].every(Number.isFinite)) sane = false;
        }
        for (const o of Collision.obstacles) {
          if (![o.s, o.lat, o.h].every(Number.isFinite)) sane = false;
        }
        steps++;
      }
      const side = evil ? 'Evil' : 'Good';
      check(sane, `${side}: every vehicle and obstacle keeps a finite position, speed and health`);
      check(Game.outcome === 'delivered', `${side}: reaches the finish (outcome: ${Game.outcome || 'still driving'})`);
    }

    // obstacles: the movers stay on the road in their stretches, and driving into one of
    // each kind blows it up and costs what CONFIG says
    Game.evil = false;
    Game.start();
    const kinds = [...new Set(Collision.obstacles.map(o => o.kind))];
    let contained = true;
    for (let i = 0; i < 120 * 60; i++) {
      Collision.updateObstacles(1 / 120);
      for (const o of Collision.obstacles) {
        if (o.from === undefined) continue;
        const reach = o.kind === 'tractor' ? o.hw : o.hl; // cows and frogs lie across the road
        if (o.s < o.from - 0.01 || o.s > o.to + 0.01) contained = false;
        if (o.lat < track.Track.lo(o.s) + reach - 0.01 || o.lat > track.Track.hi(o.s) - reach + 0.01) contained = false;
      }
    }
    check(contained, `obstacles (${kinds.join(', ')}) stay on the road within their stretches`);
    for (const kind of kinds) {
      Game.start();
      for (const c of Traffic.cars) c.active = false;
      // (for an asteroid, one that is at road level: the others pass over or under the car)
      const o = Collision.obstacles.find(x => x.kind === kind && (kind !== 'asteroid' || (Collision.atRoadLevel(x) && !x.bob)));
      for (const other of Collision.obstacles) if (other !== o) other.gone = true; // (herds can stand two deep)
      Player.s = o.s - 1; Player.lat = o.lat; // overlapping it Player.speed = 20; Player.launching = false;
      Collision.check();
      FxQueue.length = 0;
      const cost = CONFIG.obstacleKinds[kind];
      const damage = kind === 'asteroid' ? Math.min(cost.maxDamage, cost.damage * o.r) : cost.damage;
      check(o.gone && Math.abs(Player.health - (Player.maxHealth - damage)) < 1e-6,
        `hitting a ${kind} destroys it and costs ${damage.toFixed(0)} health`);
    }

    if (kinds.includes('asteroid')) {
      // asteroids: the same field every run, a mix of sizes, some off the road's level
      // (which can't be hit), some moving
      let rocks = Collision.obstacles.filter(o => o.kind === 'asteroid');
      const layout = rocks.map(o => [o.s, o.lat0, o.r, o.h0].map(v => v.toFixed(3)).join()).join(';');
      Game.load();
      rocks = Collision.obstacles.filter(o => o.kind === 'asteroid'); // the freshly built ones
      const again = Collision.obstacles.filter(o => o.kind === 'asteroid').map(o => [o.s, o.lat0, o.r, o.h0].map(v => v.toFixed(3)).join()).join(';');
      const level = rocks.filter(o => Collision.atRoadLevel(o)).length;
      const moving = rocks.filter(o => o.vLat || o.bob).length;
      const sizes = rocks.map(o => o.r);
      check(layout === again && level > 0 && level < rocks.length && moving > 0 && moving < rocks.length,
        `${rocks.length} asteroids, radius ${Math.min(...sizes).toFixed(1)}-${Math.max(...sizes).toFixed(1)} m: ${level} at road level, ${rocks.length - level} above or below it, ${moving} moving; same layout every run`);
      const off = rocks.find(o => !Collision.atRoadLevel(o) && !o.bob && !o.vLat);
      Game.start();
      Player.s = off.s; Player.lat = off.lat; Player.speed = 20; Player.launching = false;
      Collision.check();
      check(!off.gone && Player.health === Player.maxHealth, `an asteroid ${off.h.toFixed(1)} m off the road's level can be driven straight under or over`);
      check(cars.CAR.ufo === true && Player.hw === cars.LEVEL_CARS.ufo.hw, 'the level is flown in a UFO, whatever car is in the garage');
      // the UFO is very fast and agile: flat out on a clear road, then a hard swerve
      Game.start();
      let steerNow = 0, topSpeed = 0, sideSpeed = 0;
      Object.defineProperty(Input, 'steer', { get: () => steerNow, configurable: true });
      for (let i = 0; i < 120 * 8; i++) {
        for (const o of Collision.obstacles) o.gone = true;
        steerNow = i > 120 * 7 ? 1 : 0;
        Game.update(1 / 120);
        FxQueue.length = 0;
        topSpeed = Math.max(topSpeed, Player.speed);
        sideSpeed = Math.max(sideSpeed, Player.latVel);
      }
      steerNow = 0;
      check(topSpeed > 85 && sideSpeed > 20, `the UFO reaches ${(topSpeed * 3.6).toFixed(0)} km/h and moves sideways at ${sideSpeed.toFixed(0)} m/s (a car manages ${CONFIG.steerSpeed})`);
      // this level has the shoulder timer off: the shoulder is there and can be driven on
      // for as long as you like
      Game.start();
      steerNow = 1;
      let onShoulder = false, lowestDanger = Infinity;
      for (let i = 0; i < 120 * 6; i++) {
        for (const o of Collision.obstacles) o.gone = true;
        Game.update(1 / 120);
        FxQueue.length = 0;
        if (Player.onShoulder) onShoulder = true;
        lowestDanger = Math.min(lowestDanger, Player.danger);
      }
      steerNow = 0;
      const T2 = track.Track;
      check(T2.shoulder === CONFIG.shoulder && Player.lat > T2.laneHi(Player.s) && !onShoulder &&
        lowestDanger === CONFIG.dangerTime && Game.busts === 0 && !Player.busted,
        'shoulder timer off: 6 s on the shoulder, the timer never moves and nobody is busted');
      let anyTraffic = false;
      for (let i = 0; i < 120 * 20; i++) { Game.update(1 / 120); FxQueue.length = 0; if (Traffic.cars.some(c => c.active)) anyTraffic = true; }
      check(!anyTraffic, 'no traffic at all');
    } else {
      check(track.Track.shoulder === CONFIG.shoulder, 'the shoulders are there');
      check(!cars.CAR.ufo, 'the garage car is back on this level');
    }

    if ((levels.LEVEL.tractors || []).length) {
      // tractors: traffic vehicles, starting from the same spots every run
      const spots = () => Traffic.cars.filter(c => c.active && c.kind === 'tractor').map(c => c.s.toFixed(1) + '/' + c.lane).sort().join(' ');
      Game.start();
      const first = spots();
      Game.start();
      const tractors = Traffic.cars.filter(c => c.active && c.kind === 'tractor');
      check(first === spots() && tractors.length === levels.LEVEL.tractors.length &&
        !Collision.obstacles.some(o => o.kind === 'tractor'),
        `${tractors.length} tractors are traffic, not obstacles, and start in the same places every run (${first})`);
      // one of them is hit like any other vehicle: it shoves and is shoved, it doesn't just vanish
      const t = tractors.find(c => c.dir > 0);
      for (const c of Traffic.cars) if (c !== t) c.active = false;
      for (const o of Collision.obstacles) o.gone = true;
      Player.s = t.s - 6; Player.lat = t.lat; Player.speed = 30; Player.launching = false;
      const before = t.health;
      for (let i = 0; i < 60; i++) { for (const c of Traffic.cars) if (c !== t) c.active = false; Game.update(1 / 120); FxQueue.length = 0; }
      check(t.active && t.health < before && Player.health < Player.maxHealth && t.vs > 0,
        `running into a tractor is a crash: it takes ${(before - t.health).toFixed(0)} damage, the player ${(Player.maxHealth - Player.health).toFixed(0)}, and it is shoved forward`);
    }

    // the clock: sitting still runs it out and drains the tip
    Game.start();
    for (let i = 0; i < 120 * 400 && Game.state === 'playing'; i++) {
      Player.speed = 0;
      Player.launching = false;
      Player.health = Player.maxHealth;
      Game.update(1 / 120);
      FxQueue.length = 0;
    }
    check(Game.outcome === 'timeout' && Game.tip === 0, `standing still ends in a timeout with no tip (outcome: ${Game.outcome}, tip: ${Game.tip})`);
  }

  // the screensaver: its own level, no player car, traffic that crashes on its own, and the
  // road goes round and round until Exit
  console.log('screensaver');
  {
    levels.selectLevel(2);
    Game.startScreensaver();
    const T = track.Track;
    check(Game.state === 'playing' && Game.screensaver && levels.LEVEL === levels.SCREENSAVER_LEVEL && T.problems.length === 0 &&
      T.laneCount === 8 && T.flow === 'south' && Traffic.cars.every(c => c.unused || c.dir < 0),
    `starts on "${levels.LEVEL.name}": ${T.laneCount} lanes, everything oncoming, no level problems`);
    const inPlay = Traffic.cars.filter(c => !c.unused).length;
    let crashes = 0, wrecks = 0, laps = 0, ghost = true, lowest = Infinity, highest = -Infinity, maxActive = 0, lastS = 0;
    for (let i = 0; i < 120 * 300; i++) { // five minutes
      Game.update(1 / 120);
      for (const e of FxQueue) {
        if (e.type === 'sound' && e.name === 'crash') crashes++;
        if (e.type === 'explode' && e.tyres) wrecks++;
      }
      FxQueue.length = 0;
      if (Player.ghost <= 0 || Player.speed !== CONFIG.screensaver.speed) ghost = false;
      lowest = Math.min(lowest, Player.lat); highest = Math.max(highest, Player.lat);
      if (Player.s < lastS) laps++;
      lastS = Player.s;
      maxActive = Math.max(maxActive, Traffic.cars.filter(c => c.active).length);
    }
    check(inPlay === levels.SCREENSAVER_LEVEL.trafficCount + levels.SCREENSAVER_LEVEL.oncomingCount && maxActive > CONFIG.trafficCount + CONFIG.oncomingCount,
      `${inPlay} vehicles in play, up to ${maxActive} on the road at once (a normal level has ${CONFIG.trafficCount + CONFIG.oncomingCount})`);
    check(ghost && Player.health === Player.maxHealth && Game.busts === 0 && lowest === 0 && highest === 0,
      `the dolly is a ghost at a steady ${CONFIG.screensaver.speed} m/s, never hurt, on the centre line (lat ${lowest} to ${highest})`);
    check(laps >= 1 && Game.state === 'playing' && Game.outcome === '', `went round ${laps} time(s) with no finish and no timeout`);
    check(crashes > 50 && wrecks > 20, `chaos: ${crashes} crashes heard and ${wrecks} vehicles wrecked in five minutes, with no player`);
    const tractors = Traffic.cars.filter(c => c.active && c.kind === 'tractor').length;
    check(tractors > 0, `${tractors} tractors are out again on the new lap`);
    Game.togglePause();
    const s = Player.s;
    Game.update(1 / 120);
    check(Game.paused && Player.s === s, 'paused: nothing moves');
    Game.togglePause();
    Game.update(1 / 120);
    check(!Game.paused && Player.s > s, 'resumed: it moves again');
    Game.exit();
    check(Game.state === 'start' && !Game.screensaver && !Game.paused && levels.LEVEL === levels.LEVELS[2],
      'Exit: back on the menu with the level the menu had picked');
    // a normal run keeps its usual traffic counts
    levels.selectLevel(1);
    Game.start();
    const L1 = levels.LEVEL;
    const usual = (L1.trafficCount ?? CONFIG.trafficCount) + (L1.oncomingCount ?? CONFIG.oncomingCount);
    let most = 0;
    for (let i = 0; i < 120 * 20; i++) { Game.update(1 / 120); FxQueue.length = 0; most = Math.max(most, Traffic.cars.filter(c => c.active).length); }
    check(Traffic.cars.filter(c => !c.unused).length === usual && most <= usual && usual < CONFIG.trafficPool && !Game.screensaver,
      `a normal run (${L1.name}): never more than its ${usual} vehicles on the road (at most ${most} in 20 s), and a player car`);
    const clock = Game.time;
    Game.togglePause();
    Game.update(1 / 120);
    check(Game.paused && Game.time === clock, 'a run can be paused: the clock stops too');
    Game.exit();
    check(Game.state === 'start' && !Game.paused, 'Exit level: back on the menu');
  }

  // going back to the menu and picking another level loads that one on the next start
  console.log('menu');
  Game.toMenu();
  levels.selectLevel(0);
  check(Game.state === 'start' && Game.loaded !== levels.LEVEL, 'back on the menu, picking a level does not load it');
  Game.start();
  check(Game.loaded === levels.LEVEL && track.Track.length === 3300, 'starting a run loads it (Expressway, 3300 m)');

  // collisions
  console.log('collisions');
  {
    const physics = await load('/src/delivery/physics.js');
    levels.selectLevel(0);
    // an empty road with the player at 200 m in lane 2 and one chosen vehicle beside / ahead
    const stage = (kind, bound, set) => {
      Game.evil = false;
      Game.start();
      for (const c of Traffic.cars) c.active = false;
      for (const o of Collision.obstacles) o.gone = true;
      const other = Traffic.cars.find(c => c.bound === bound), type = CONFIG.vehicles[kind];
      Object.assign(other, { active: true, kind, lane: 2, latVel: 0, yaw: 0, yawVel: 0, stun: 0, spin: 0, wobble: 0, fixed: false,
        hw: type.hw, hl: type.hl, height: type.height, mass: type.mass, health: type.health, maxHealth: type.health, sideTick: -999 });
      Player.s = 200; Player.launching = false; Player.lat = track.Track.laneOffset(2, 200); Player.speed = 30; Player.sideTick = -999;
      set(other);
      return other;
    };
    const tags = new Set(Traffic.cars.map(c => c.bound));
    check(Player.bound === 'north' && tags.size === 2 && Traffic.cars.every(c => (c.bound === 'north') === (c.dir > 0)),
      'every vehicle is tagged northbound (with the player) or southbound');

    // opposite directions: a head-on however they touch, here side by side
    let o = stage('car', 'south', (c) => { c.s = 200; c.lat = Player.lat - 1.7; c.vs = -30; });
    Collision.check();
    check(!Player.active && !o.active, 'a southbound car brushing the side of the northbound player is a head-on: both wrecked');

    // same direction, side contact: nobody moves sideways; they are slid apart along the road
    o = stage('car', 'north', (c) => { c.s = 200.5; c.lat = Player.lat + 1.6; c.vs = 30; });
    const lat0 = o.lat, playerLat0 = Player.lat, gap0 = o.s - Player.s;
    Player.latVel = 6; // steering into it
    for (let i = 0; i < 30; i++) { Player.latVel = 6; Collision.check(); }
    FxQueue.length = 0;
    check(o.lat === lat0 && Player.lat === playerLat0 && o.s - Player.s > gap0 + 2 && Player.health < Player.maxHealth && o.health < o.maxHealth,
      `steering into the side of a car: neither is shoved sideways, they slide ${(o.s - Player.s - gap0).toFixed(1)} m apart along the road, and both take damage once (player ${(Player.maxHealth - Player.health).toFixed(0)})`);

    // the player wins shoving matches: sideswiping a much slower car, or being rammed from
    // behind by a faster one, costs little speed, and the other vehicle is the one sent on its way
    o = stage('car', 'north', (c) => { c.s = 200.5; c.lat = Player.lat + 1.6; c.vs = 15; });
    Player.speed = 45;
    for (let i = 0; i < 30; i++) { Player.latVel = 6; Collision.check(); }
    FxQueue.length = 0;
    const afterSwipe = Player.speed, carAfter = o.vs;
    o = stage('car', 'north', (c) => { c.s = 196; c.lat = Player.lat; c.vs = 45; });
    Player.speed = 15;
    Collision.check();
    FxQueue.length = 0;
    check(afterSwipe > 41 && carAfter > 40 && Player.speed < 20 && o.vs < 20,
      `at 45 m/s into traffic doing 15: a sideswipe leaves the player at ${afterSwipe.toFixed(1)} m/s (the car is sent off at ${carAfter.toFixed(1)}); rammed from behind at 45 while doing 15, the player is at ${Player.speed.toFixed(1)} and the rammer at ${o.vs.toFixed(1)}`);
    // ...except that running into the back of a traffic vehicle is the one shove the traffic
    // wins: the player loses most of the speed difference and is left behind it
    o = stage('bus', 'north', (c) => { c.s = 207; c.lat = Player.lat; c.vs = 15; });
    Player.speed = 45;
    Collision.check();
    FxQueue.length = 0;
    check(Player.speed < 30 && o.vs < 35 && Player.speed < o.vs,
      `ramming a bus doing 15 from behind at 45 leaves the player at ${Player.speed.toFixed(1)} m/s, behind the bus at ${o.vs.toFixed(1)}`);
    // a rear-end, even an off-centre one, turns neither vehicle
    o = stage('car', 'north', (c) => { c.s = 204; c.lat = Player.lat + 1.2; c.vs = 15; });
    Player.speed = 45;
    Collision.check();
    FxQueue.length = 0;
    check(Player.yawVel === 0 && o.yawVel === 0, 'an off-centre rear-end gives neither vehicle any yaw');

    // a spinning car is not kept on the road
    o = stage('car', 'north', (c) => { c.s = 260; c.lat = track.Track.laneOffset(3, 260); c.vs = 25; });
    physics.spinOut(o);
    o.spinRate = 0.8;
    let furthest = 0;
    for (let i = 0; i < 120 * 3 && o.active; i++) {
      Player.speed = 20;
      Game.update(1 / 120);
      FxQueue.length = 0;
      if (o.active) furthest = Math.max(furthest, o.lat - track.Track.hi(o.s));
    }
    check(furthest > 1 && !o.active, `a spinning car leaves the road (${furthest.toFixed(1)} m past the edge of the shoulder) and then blows up`);

    // police: no bust if the police car was out of control, or oncoming
    o = stage('police', 'north', (c) => { c.s = 203; c.lat = Player.lat; c.vs = 10; });
    physics.spinOut(o);
    Collision.check();
    check(!Player.busted, 'hitting a police car that is spinning out: not busted');
    o = stage('police', 'south', (c) => { c.s = 203; c.lat = Player.lat; c.vs = -25; });
    Collision.check();
    check(!Player.busted && !Player.active, 'a head-on with an oncoming police car: wrecked, but not busted');
    FxQueue.length = 0;

    // critical hits: a small share of hits make the car wobble, and a wobble ends in a spin
    let crits = 0;
    const N = 20000;
    for (let i = 0; i < N; i++) {
      const c = { health: 60, maxHealth: 60, mood: 0, spin: 0, wobble: 0 };
      physics.hurt(c, 1); // a light tap, far too small to spin it by damage alone
      if (c.wobble > 0) crits++;
    }
    o = stage('car', 'north', (c) => { c.s = 300; c.lat = Player.lat; c.vs = 25; c.baseSpeed = 25; });
    o.wobble = CONFIG.critWobbleTime;
    let wobbled = 0, spun = false;
    for (let i = 0; i < 120 * 2; i++) {
      Player.speed = 20;
      Game.update(1 / 120);
      FxQueue.length = 0;
      wobbled = Math.max(wobbled, Math.abs(o.yaw));
      if (o.spin > 0) spun = true;
    }
    check(Math.abs(crits / N - CONFIG.critChance) < 0.01 && wobbled > 0.05 && spun,
      `critical hits: ${(crits / N * 100).toFixed(1)}% of hits; the car wobbles (up to ${(wobbled * 180 / Math.PI).toFixed(0)} degrees) and then spins out`);
  }

  // each level's traffic list sets what turns up and how often
  console.log('traffic lists');
  for (let n = 0; n < levels.LEVELS.length; n++) {
    levels.selectLevel(n);
    const want = levels.LEVEL.traffic, kinds = Object.keys(want);
    const seen = {};
    let count = 0;
    for (let r = 0; r < 60; r++) {
      Game.start();
      for (const c of Traffic.cars) if (c.active && !c.fixed) { seen[c.kind] = (seen[c.kind] || 0) + 1; count++; }
    }
    const total = kinds.reduce((sum, k) => sum + want[k], 0);
    const close = kinds.every(k => Math.abs((seen[k] || 0) / count - want[k] / total) < 0.05);
    const extra = Object.keys(seen).filter(k => !kinds.includes(k));
    check(kinds.length ? close && !extra.length : count === 0, kinds.length
      ? `${levels.LEVEL.name}: ${kinds.map(k => k + ' ' + ((seen[k] || 0) / count * 100).toFixed(0) + '%').join(', ')} (as listed)`
      : `${levels.LEVEL.name}: an empty list, so no traffic`);
  }

  // one-way levels, and rows of cones / signs on the shoulders
  console.log('one-way levels and shoulder rows');
  for (let n = 0; n < levels.LEVELS.length; n++) {
    levels.selectLevel(n);
    const L = levels.LEVEL;
    if (!L.flow && !L.shoulderRows) continue;
    const lanes = new Set();
    let live = 0, wrongWay = 0;
    for (let r = 0; r < 10; r++) {
      Game.evil = false;
      Game.start();
      for (const c of Traffic.cars) {
        if (!c.active) continue;
        live++;
        if (c.bound !== L.flow || (c.dir > 0) !== (L.flow === 'north')) wrongWay++;
        if (track.Track.isMain(c.s)) lanes.add(c.lane);
      }
    }
    const T = track.Track;
    if (L.flow) check(live > 100 && wrongWay === 0 && lanes.size === T.laneCount && T.flow === L.flow,
      `${L.name}: every vehicle is ${L.flow}bound, and they use all ${T.laneCount} lanes`);
    const rows = Collision.obstacles.filter(o => o.kind === 'cone' || o.kind === 'sign');
    const kind = rows[0].kind, cost = CONFIG.obstacleKinds[kind];
    check(rows.length > 20 && rows.every(o => T.onShoulder(o.lat, o.s)),
      `${L.name}: ${rows.length} ${kind}s, every one on a shoulder and none in an exit or merge lane`);
    for (const c of Traffic.cars) c.active = false;
    const o = rows[Math.floor(rows.length / 2)];
    Player.s = o.s - 1; Player.lat = o.lat; Player.speed = 20; Player.launching = false; Player.shield = 0;
    Collision.check();
    FxQueue.length = 0;
    check(o.gone && Math.abs(Player.maxHealth - Player.health - cost.damage) < 1e-9 && (Player.stun > 0) === !cost.light,
      `driving into a ${kind}: it goes, costing ${cost.damage} health${cost.light ? ' and no loss of steering' : ''}`);
  }

  // lane assist: off-centre in a lane the car stays put; near a lane line it eases back, slowly
  console.log('steering');
  {
    const settle = (offset) => {
      Game.evil = false;
      Game.start();
      const centre = track.Track.laneOffset(2, 0);
      Player.lat = centre + offset;
      for (let i = 0; i < 120 * 4; i++) { // four seconds, hands off, on an empty road
        for (const c of Traffic.cars) c.active = false;
        for (const o of Collision.obstacles) o.gone = true;
        Game.update(1 / 120);
        FxQueue.length = 0;
      }
      return Player.lat - centre;
    };
    const kept = settle(0.8), eased = settle(1.6);
    check(Math.abs(kept - 0.8) < 0.01, `0.8 m off the centre of a lane, hands off for 4 s: still ${kept.toFixed(2)} m off`);
    check(eased < 1.6 && eased > 1.0, `1.6 m off (nearly on the line): eased back to ${eased.toFixed(2)} m in 4 s, no snap`);
  }

  // police contact: a bust, except when the police car runs into the back of the player
  console.log('police');
  {
    const meet = (label, place, want) => {
      Game.evil = false;
      Game.start();
      for (const c of Traffic.cars) c.active = false;
      for (const o of Collision.obstacles) o.gone = true;
      const cop = Traffic.cars[0], type = CONFIG.vehicles.police;
      Object.assign(cop, { active: true, kind: 'police', dir: 1, lane: 2, latVel: 0, yaw: 0, yawVel: 0, stun: 0, spin: 0, wobble: 0,
        hw: type.hw, hl: type.hl, height: type.height, mass: type.mass, health: type.health, maxHealth: type.health });
      Player.s = 200; Player.launching = false; Player.lat = track.Track.laneOffset(2, 200);
      place(cop);
      Collision.check();
      FxQueue.length = 0;
      check(Player.busted === want, `${label}: ${want ? 'busted' : 'not busted'}`);
    };
    meet('a police car runs into the back of the player', (cop) => { cop.s = 197; cop.lat = Player.lat; cop.vs = 30; Player.speed = 15; }, false);
    meet('the player runs into the back of a police car', (cop) => { cop.s = 203; cop.lat = Player.lat; cop.vs = 15; Player.speed = 30; }, true);
    meet('the player side-swipes a police car', (cop) => { cop.s = 200; cop.lat = Player.lat + 1.6; cop.vs = 30; Player.speed = 30; }, true);
    meet('the player brakes while a police car behind is no faster', (cop) => { cop.s = 197; cop.lat = Player.lat; cop.vs = 15; Player.speed = 20; }, true);
  }

  // swapping cars takes effect at once, with no reload
  console.log('cars');
  levels.selectLevel(0); // (a level with no vehicle of its own)
  for (const car of cars.CARS) {
    cars.selectCar(car.id);
    Game.evil = false;
    Game.start();
    let top = 0;
    for (let i = 0; i < 120 * 12; i++) { // an empty road, flat out
      for (const c of Traffic.cars) c.active = false;
      for (const o of Collision.obstacles) o.gone = true;
      Game.update(1 / 120);
      FxQueue.length = 0;
      top = Math.max(top, Player.speed);
    }
    const wantTop = car.tank ? 52 : car.maxSpeed;
    check(cars.CAR === car && Player.maxHealth === car.health && Player.hl === car.hl &&
      Math.abs(top - wantTop) < 0.5 && (Player.tank > 0) === !!car.tank,
      `${car.name}: in use straight away (health ${Player.maxHealth}, top speed ${top.toFixed(1)} m/s, tank: ${Player.tank > 0})`);
  }
  cars.selectCar('hatch');
  // the secret bus: not in the garage, but once owned it is driven like any other car
  const { Progress } = await load('/src/delivery/progress.js');
  Progress.buy(cars.SECRET_CARS.bus);
  cars.selectCar('bus');
  Game.start();
  check(!cars.CARS.some(car => car.id === 'bus') && cars.CAR === cars.SECRET_CARS.bus && Player.hl === 5.5 && Player.maxHealth === 220,
    `the secret City Bus: not in the garage, but in use once owned (hitbox ${Player.hl * 2} m long, health ${Player.maxHealth})`);
  cars.selectCar('hatch');
  // a complete savegame: every level open and delivered, every car bought, a full bank
  Progress.reset();
  Progress.complete({ levels: levels.LEVELS.length, best: Object.fromEntries(levels.LEVELS.map(l => [l.id, l.tip])),
    cars: cars.CARS.map(car => car.id), money: CONFIG.completeBank });
  check(Progress.data.unlocked === levels.LEVELS.length && cars.CARS.every(car => Progress.owns(car.id)) &&
    !Progress.owns('bus') && Progress.data.money === CONFIG.completeBank && Progress.data.best.expressway === levels.LEVELS[0].tip,
    `a complete savegame: ${Progress.data.unlocked} levels open, ${Progress.data.cars.length} cars owned, $${Progress.data.money} banked, the bus still secret`);
} catch (error) {
  failures++;
  console.error(error);
} finally {
  await server.close();
}
console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
