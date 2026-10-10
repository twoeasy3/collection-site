// A check of the police pursuit (src/delivery/pursuit.js), headless: it fires, each ending is reachable, each
// gamble pays or costs as designed, and a run with pursuits in it still finishes.
//   node scripts/.pursuit-check.mjs [--seed=n]
import { boot } from './delivery-headless.mjs';

// (seeded, as the smoke test is: a failure repeats)
const seedArg = process.argv.find(a => a.startsWith('--seed='));
let seed = seedArg ? Number(seedArg.slice(7)) : 12345;
const reseed = (n) => { seed = n >>> 0; };
Math.random = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const seed0 = seed;

const g = await boot({ cars: ['commuter', 'sport'] });
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const { Pursuit } = await g.load('pursuit.js');
  const { Social } = await g.load('social.js');
  const P = g.Player, G = g.Game, T = () => g.track.Track, C = g.CONFIG.pursuit;
  const lane = (n, s) => T().laneOffset(n, s);
  const said = (text) => g.said.some(line => line.includes(text));
  const quiet = () => { for (const car of g.Traffic.cars) if (!car.driver) car.active = false; };
  // a fresh run on a level, the car at s doing v; a pursuit set off `at` s in (null: left to the level's clock)
  const start = (level, { s = 1500, v = 22, evil = false, at = 0.1, end = null, n = 1 } = {}) => {
    reseed(seed0 + n * 7919);
    g.select(level);
    P.testGhost = false;
    G.evil = evil;
    g.said.length = 0;
    Pursuit.force = at === null ? null : { at, end };
    G.start();
    const [first] = T().laneRange(1, s);
    Object.assign(P, { s, lat: lane(first, s), speed: v, launching: false, shield: 0 });
    g.drive(1, 0);
  };
  const steerTo = (lat) => Math.max(-1, Math.min(1, (lat - P.lat) * 0.8)) * (T().mirrored ? -1 : 1);
  // an ordinary careful driver: full throttle, braking for whatever is close ahead in its lane (and holding `lat`)
  const careful = (lat = null) => {
    const close = g.Traffic.cars.some(c => c.active && !c.junction && c.s - P.s > 0 && c.s - P.s < 12 + P.speed * 1.2 && Math.abs(c.lat - P.lat) < c.hw + P.hw + 0.4 && c.vs < P.speed);
    g.drive(close ? -1 : 1, lat === null ? 0 : steerTo(lat));
  };
  // hits on the player by a pursuit's car, counted over a run (call each step)
  let hits = 0, lastHitAt = -1;
  const countHits = () => { if (P.hitBy && P.hitBy.role && P.hitAt !== lastHitAt) { lastHitAt = P.hitAt; hits++; } };

  // ---- the level field
  console.log('The level field');
  const all = [...g.levels.LEVELS, ...Object.values(g.levels.HIDDEN_LEVELS)], have = all.filter(l => l.pursuits);
  check(have.length >= 5, 'levels with pursuits: ' + have.map(l => l.id).join(', '));
  for (const l of have) {
    g.select(l); G.evil = false; Pursuit.force = null; G.start();
    check(!T().problems.length && Number.isFinite(Pursuit.next), l.id + ': loads without problems, and one is due in ' + Pursuit.next.toFixed(0) + ' s' + (T().problems.length ? ' (' + T().problems.join(' | ') + ')' : ''));
  }
  for (const id of ['marina-bay', 'battlefield', 'all-heck']) {
    const l = { ...all.find(x => x.id === id), pursuits: { every: { min: 5, max: 6 } } };
    g.select(l); G.start();
    check(T().problems.some(p => p.startsWith('pursuits')) && Pursuit.next === Infinity, id + ' given pursuits: reported, and none is ever due');
  }
  g.select({ ...all.find(x => x.id === 'night'), pursuits: { every: { min: 0 } } }); G.start();
  check(T().problems.some(p => p.startsWith('pursuits: every')), 'pursuits without every { min, max }: reported');

  // ---- it fires, from behind, heard first, and passes
  console.log('It fires');
  start('night', { at: null, s: 400 });
  let fired = -1;
  g.run(70, (t) => { if (Pursuit.on && fired < 0) fired = t; return fired >= 0; });
  check(fired > 0, 'night, left to the level\'s clock: one set off after ' + fired.toFixed(1) + ' s (every ' + JSON.stringify(g.levels.LEVEL.pursuits.every) + ')');
  start('night', { v: 20 });
  g.run(0.5);
  let st = Pursuit.state;
  check(!!st && st.robber.kind === 'getaway' && st.cop.kind === 'interceptor' && st.cop.sirenOn, 'forced: a getaway car and an interceptor with its siren on');
  check(st && Math.abs(P.s - st.robber.s - C.behind) < 25 && st.robber.s - st.cop.s > C.gap * 0.5, 'they start ' + (P.s - st.robber.s).toFixed(0) + ' m behind the player, the interceptor ' + (st.robber.s - st.cop.s).toFixed(0) + ' m behind the getaway car');
  check(C.heard > C.behind + C.gap && said('POLICE PURSUIT'), 'the siren is heard from ' + C.heard + ' m: before they are in view, and it is announced');
  let passed = -1, pulled = 0, wrongSide = false, shoulder = false;
  g.drive(0, 0);
  g.run(40, (t) => {
    P.speed = 20; // (the player keeps to its lane at a steady pace)
    const s2 = Pursuit.state;
    if (!s2 || s2.phase !== 'chase') return true;
    if (passed < 0 && s2.robber.s > P.s + 10) passed = t;
    pulled = Math.max(pulled, g.Traffic.cars.filter(c => c.active && c.pulledOver && c.pulledFor === s2.cop).length);
    const [first] = T().laneRange(1, s2.robber.s);
    if (s2.robber.lat < lane(first, s2.robber.s) - 2) wrongSide = true;
    if (T().onShoulder(s2.robber.lat, s2.robber.s)) shoulder = true;
    return false;
  });
  check(passed > 0, 'the getaway car is past the player ' + passed.toFixed(1) + ' s later');
  check(pulled > 0, 'traffic pulls aside for the interceptor (' + pulled + ' at once at most)');
  console.log('         (this run: on the oncoming side ' + wrongSide + ', on the shoulder ' + shoulder + ')');

  // ---- the three endings, each forced up the road, and what is left of each
  console.log('The endings');
  for (const kind of ['caught', 'crashed', 'away']) {
    start('night', { end: kind, v: 20 });
    g.drive(0, 0);
    let ended = false, parked = false, wreck = false, cleared = false, lights = null;
    g.run(90, () => {
      P.speed = 18;
      quiet(); // (nothing else on the road: only the ending itself is looked at here)
      const s2 = Pursuit.state;
      if (s2 && s2.phase === kind) {
        ended = true;
        if (kind === 'caught' && s2.robber.active && s2.cop.active && s2.robber.vs < 0.1 && s2.cop.vs < 0.1 && T().onShoulder(s2.robber.lat, s2.robber.s) && T().onShoulder(s2.cop.lat, s2.cop.s)) { parked = true; lights = s2.cop.sirenOn; }
        if (kind === 'crashed' && s2.robber.active && s2.robber.vs < 0.1 && s2.robber.health < s2.robber.maxHealth * 0.3 && T().onShoulder(s2.robber.lat, s2.robber.s)) wreck = true;
      }
      if (ended && !s2) { cleared = true; return true; }
      return false;
    });
    check(ended && Pursuit.last?.kind === kind, kind + ': it ends that way');
    if (kind === 'caught') check(parked && lights, 'caught: both stopped on the shoulder, the interceptor\'s lights still going');
    if (kind === 'crashed') check(wreck, 'crashed: the getaway car a wreck off the road');
    check(cleared && !g.Traffic.cars.some(c => c.active && c.driver), kind + ': and it is all cleared away once the player is past (or it is out of sight)');
    check(said({ caught: 'Got him', crashed: 'has crashed', away: 'clean away' }[kind]), kind + ': announced');
  }
  // (a wreck is something to look at: the traffic slows by a caught pair)
  let slowed = 0;
  for (let n = 1; n <= 4 && !slowed; n++) {
    start('night', { end: 'caught', v: 20, n });
    g.drive(0, 0);
    g.run(60, () => {
      P.speed = 18;
      const s2 = Pursuit.state;
      if (s2?.phase === 'caught' && s2.robber.active && s2.robber.vs < 0.1) {
        slowed = Math.max(slowed, g.Traffic.cars.filter(c => c.active && !c.driver && c.dir > 0 && s2.robber.s - c.s > 0 && s2.robber.s - c.s < 60 && Math.abs(c.vs) < c.baseSpeed * 0.5).length);
      }
      return !s2 && !!Pursuit.last;
    });
  }
  check(slowed > 0, 'caught: the traffic coming up to them slows to look (' + slowed + ' at once)');

  // ---- left alone, over many runs: every ending turns up by itself
  console.log('Left alone');
  const tally = { caught: 0, crashed: 0, away: 0, none: 0 }, how = { organic: 0, drawn: 0 };
  for (let n = 1; n <= 24; n++) {
    start(['night', 'big-business', 'ring-road', 'speed-trap-alley', 'tokyo', 'gimmick-road-2'][n % 6], { v: 20, n, s: 1200 });
    g.drive(0, 0);
    let far = 0;
    g.run(70, () => { P.speed = 18; const s2 = Pursuit.state; if (s2?.phase === 'chase') far = s2.robber.s - P.s; return !!Pursuit.last; });
    tally[Pursuit.last?.kind || 'none']++;
    if (Pursuit.last) how[far < C.settle - 5 ? 'organic' : 'drawn']++;
  }
  console.log('         (24 pursuits past a player keeping to its lane: ' + JSON.stringify(tally) + '; ' + JSON.stringify(how) + ')');
  check(tally.caught > 0 && tally.crashed > 0 && tally.away > 0 && !tally.none, 'caught, crashed and away all turn up, and every one ends');

  // ---- Good: in the getaway car's way
  console.log('Good: in the getaway car\'s way');
  let helped = 0, hit = 0, tries = 0, example = null, told = false;
  for (let n = 1; n <= 12; n++) {
    start('night', { v: 20, n });
    G.busts = 1;
    const standing = Social.level, cash = G.cash;
    hits = 0;
    g.run(60, () => {
      countHits();
      const s2 = Pursuit.state;
      if (!s2 || s2.phase !== 'chase') return !!Pursuit.last;
      const r = s2.robber, back = P.s - r.s;
      // (the player gets in front of it, lifts off as it comes up and brakes with it close behind; once it is by, nothing more to do)
      if (back > 0 && back < 120) g.drive(back < 18 ? -1 : back < 60 ? 0 : 1, steerTo(r.lat)); else careful();
      return false;
    });
    tries++;
    if (hits) hit++;
    if (said('boxed him in')) told = true;
    if (Pursuit.last?.helped) {
      helped++;
      example = example || { standing: Social.level - standing, cash: G.cash - cash, busts: G.busts };
    }
  }
  console.log('         (' + tries + ' tries: boxed in and caught ' + helped + ', the player hit ' + hit + ')');
  check(helped > 0, 'holding it up gets it caught, to the player\'s credit');
  check(example && example.cash === C.reward.cash && example.busts === 0 && example.standing > 0.1, 'and that pays: ' + JSON.stringify(example) + ' (standing, $, busts left of 1)');
  check(hit > 0, 'and it is a gamble: the player was hit by one of the two in ' + hit + ' of ' + tries);
  check(told, 'announced');

  // ---- Evil: in the interceptor's way, and in its channel
  console.log('Evil: in the interceptor\'s way');
  let bag = 0, got = 0, busted = 0, away = 0, warned = 0;
  for (let n = 1; n <= 12; n++) {
    start('night', { v: 20, evil: true, n });
    const cash = G.cash;
    let backOff = false;
    g.run(60, () => {
      const s2 = Pursuit.state;
      if (Pursuit.bags.length) { g.drive(1, steerTo(Pursuit.bags[0].lat)); return false; }
      if (!s2 || s2.phase !== 'chase') return !!Pursuit.last && !Pursuit.bags.length;
      const c = s2.cop, back = P.s - c.s;
      // (odd runs: the player backs off at the warning; even runs: it stays in the way to the end)
      if (n % 2 && s2.heat > C.heat.warn) backOff = true;
      if (backOff) { g.drive(1, steerTo(lane(T().laneRange(1, P.s)[1], P.s))); return false; }
      if (back > 0 && back < 120) g.drive(back < 40 ? -1 : 0, steerTo(c.lat)); else g.drive(back < 0 ? 0 : 1, 0);
      return P.busted;
    });
    if (said('threw you a bag')) bag++;
    if (G.cash - cash >= C.bag.cash) got++;
    if (P.busted && P.bustReason === 'pursuit') busted++;
    if (Pursuit.last?.kind === 'away') away++;
    if (said('clocked you')) warned++;
    g.said.length = 0;
  }
  console.log('         (12 tries: a bag thrown ' + bag + ', picked up ' + got + ', busted ' + busted + ', the getaway away ' + away + ', warned ' + warned + ')');
  check(bag > 0 && got > 0, 'hindering the interceptor gets a bag of cash thrown, and it can be picked up ($' + C.bag.cash + ')');
  check(warned > 0 && busted > 0, 'the interceptor warns, and staying in its way is a bust for obstructing a pursuit');
  check(busted < 12, 'backing off at the warning is no bust (' + (12 - busted) + ' of 12 not busted)');
  // riding the channel
  start('night', { v: 20, evil: true, n: 3 });
  let rode = 0, heat = 0;
  g.run(60, () => {
    const s2 = Pursuit.state;
    quiet();
    if (!s2 || s2.phase !== 'chase') return !!Pursuit.last;
    const c = s2.cop, back = c.s - P.s;
    if (back > 0) { // (tucked in behind it, at its speed)
      P.speed = Math.max(0, c.vs + (back - 14) * 0.8);
      P.lat = c.lat;
      P.s = Math.max(P.s, c.s - 30);
    }
    rode = s2.rode; heat = Math.max(heat, s2.heat);
    return P.busted;
  });
  check(rode > 2 && heat > 0.2, 'riding the channel behind the interceptor counts (' + rode.toFixed(1) + ' s of it), and has its interest (heat up to ' + heat.toFixed(2) + ')');
  check(heat >= C.heat.warn && (said('clocked you') || P.busted), 'and it warns the player off, or busts it (' + (P.busted ? 'busted: ' + P.bustReason : 'warned') + ')');
  // a Good player in the interceptor's way is no offence
  start('night', { v: 20, n: 2 });
  g.run(40, () => {
    const s2 = Pursuit.state;
    if (!s2 || s2.phase !== 'chase') return !!Pursuit.last;
    const c = s2.cop, back = P.s - c.s;
    if (back > 0 && back < 120) g.drive(back < 40 ? -1 : 0, steerTo(c.lat)); else g.drive(1, 0);
    return false;
  });
  check(!P.busted && G.busts === 0, 'a Good player in the interceptor\'s way is not busted for it');

  // ---- or keep out of it: nothing lost
  console.log('Keeping out of it');
  start('night', { v: 20, n: 5 });
  let untouched = 0;
  for (let n = 1; n <= 12; n++) {
    start('night', { v: 20, n });
    hits = 0;
    const kerb = T().laneRange(1, P.s)[1];
    g.run(50, () => { countHits(); careful(lane(kerb, P.s)); return !Pursuit.state && !!Pursuit.last; });
    if (!hits && G.busts === 0 && G.cash === 0 && !P.busted) untouched++;
  }
  check(untouched >= 10, 'a careful player who moves over to the kerb lane: no bust, no cash, and not touched by either car in ' + untouched + ' of 12 runs');

  // ---- a run with pursuits in it still finishes
  console.log('A run still finishes');
  for (const id of ['night', 'gimmick-road-2']) {
    start(id, { s: 0, v: 0, at: 6 });
    P.testGhost = true;
    g.drive(1, 0);
    let seen = 0, wasOn = false;
    g.run(600, () => { if (Pursuit.on && !wasOn) seen++; wasOn = Pursuit.on; return G.state !== 'playing'; });
    check(G.state === 'finished' && seen > 0, id + ': driven to the end (' + G.outcome + '), ' + seen + ' pursuit(s) on the way');
  }
  Pursuit.force = null;
} catch (e) {
  failures++;
  console.log('  FAIL  ' + (e.stack || e));
} finally {
  await g.close();
}
console.log(failures ? failures + ' FAILED' : 'all checks passed');
process.exit(failures ? 1 : 0);
