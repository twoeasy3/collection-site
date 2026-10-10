// A check of the bank robber who wants a lift (src/delivery/robber.js), headless: he is there, picked up by driving
// over where he stands, pays by the 100 m, sets the police on the car, and each way out of it ends as designed.
//   node scripts/.robber-check.mjs [--seed=n]
import { boot } from './delivery-headless.mjs';

const seedArg = process.argv.find(a => a.startsWith('--seed='));
let seed = seedArg ? Number(seedArg.slice(7)) : 4242;
const seed0 = seed;
Math.random = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

const g = await boot({ cars: ['commuter', 'sport'] });
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const { Robber } = await g.load('robber.js');
  const { Pursuit } = await g.load('pursuit.js');
  const { Social } = await g.load('social.js');
  const P = g.Player, G = g.Game, T = () => g.track.Track, C = g.CONFIG.robber;
  const said = (text) => g.said.some(line => line.includes(text));
  const steerTo = (lat) => Math.max(-1, Math.min(1, (lat - P.lat) * 0.8)) * (T().mirrored ? -1 : 1);
  const start = (level, { s = 0, evil = false, n = 1, force = null, pursuit = null } = {}) => {
    seed = (seed0 + n * 7919) >>> 0;
    g.select(level);
    P.testGhost = false;
    G.evil = evil;
    g.said.length = 0;
    Robber.force = force;
    Pursuit.force = pursuit;
    G.start();
    const [first] = T().laneRange(1, s);
    Object.assign(P, { s, lat: T().laneOffset(first, s), speed: 20, launching: false, shield: 0 });
    g.drive(1, 0);
  };
  // drives onto the shoulder to where the first robber stands, and over him
  const pickUp = () => g.run(40, () => {
    const spot = Robber.spots.find(x => !x.taken);
    P.danger = 99; // (no bust for the shoulder on the way: not what is being looked at; nor a police car there to see it)
    for (const car of g.Traffic.cars) if (car.kind === 'police') car.active = false;
    if (spot) g.drive(1, steerTo(spot.s - P.s < 140 ? spot.lat : P.lat));
    return !!Robber.carrying;
  });
  const quiet = () => { for (const car of g.Traffic.cars) if (!car.driver && car.kind !== 'police') car.active = false; };

  console.log('The level field');
  const all = [...g.levels.LEVELS, ...Object.values(g.levels.HIDDEN_LEVELS)], have = all.filter(l => l.robbers?.length);
  check(have.length >= 4, 'levels with a robber: ' + have.map(l => l.id).join(', '));
  for (const l of have) {
    start(l.id);
    check(!T().problems.length && Robber.spots.length === l.robbers.length && Robber.spots.every(x => T().onShoulder(x.lat, x.s)), l.id + ': loads without problems, and he stands on the shoulder at ' + Robber.spots.map(x => Math.round(x.s)).join(', '));
  }
  g.select({ ...all.find(x => x.id === 'night'), robbers: [{ s: 99999 }] }); G.start();
  check(T().problems.some(p => p.startsWith('robber')), 'one beyond the road: reported');

  console.log('Leaving him there');
  start('night', { s: 1000 });
  g.run(25, () => { g.drive(1, 0); return P.s > 1500; });
  check(said('thumbing a lift') && !Robber.carrying && G.cash === 0 && !Robber.chasers.length, 'announced on the way up to him; driven by in the lanes, nothing happens');

  console.log('Carrying him');
  start('night', { s: 1100 });
  pickUp();
  check(!!Robber.carrying && said('He\'s in'), 'driving over where he stands picks him up');
  // (run for it, with nothing else on the road but the police: the fare comes in by the 100 m)
  let most = 0, sirens = 0;
  const s0 = P.s;
  P.testGhost = true; // (nothing can catch a ghost: the fare and the chase are what is looked at)
  g.run(80, () => { quiet(); P.danger = 99; g.drive(1, steerTo(T().laneOffset(T().laneRange(1, P.s)[0], P.s))); most = Math.max(most, Robber.chasers.length); sirens = Math.max(sirens, Robber.chasers.filter(c => c.sirenOn).length); return !Robber.carrying; });
  check(Robber.last?.how === 'done' && Robber.last.paid === C.rate * C.ride / 100 && G.cash === Robber.last.paid, 'carried ' + Math.round(P.s - s0) + ' m, he gets out and has paid $' + G.cash + ' ($' + C.rate + ' per 100 m of ' + C.ride + ' m)');
  check(most > 0 && sirens > 0 && said('police are after'), 'and the police came after the car meanwhile (' + most + ' at once, sirens on), announced');
  check(!Robber.chasers.length && !g.Traffic.cars.some(c => c.active && c.sirenOn), 'once he is out they stand down');

  console.log('Caught');
  let busted = 0, lost = 0, away = 0;
  for (let n = 1; n <= 10; n++) {
    start('night', { s: 1100, n });
    pickUp();
    let top = 0;
    g.run(90, () => { P.danger = 99; top = Math.max(top, G.cash); g.drive(n % 2 ? (P.speed > 15 ? -1 : 0.3) : 1, steerTo(T().laneOffset(T().laneRange(1, P.s)[0], P.s))); return !Robber.carrying || G.state !== 'playing'; });
    if (Robber.last?.how === 'busted') { busted++; if (G.cash === 0 && top > 0) lost++; if (!(P.busted && P.bustReason === 'robber') && !said('Carrying a wanted man')) failures++; }
    if (Robber.last?.how === 'done') away++;
  }
  console.log('         (10 lifts, half of them at 55 km/h or less, half flat out through the traffic: caught and busted ' + busted + ', of which with money to lose ' + lost + '; got him there ' + away + ')');
  check(busted > 0 && away > 0, 'the police can catch the car (a bust for carrying a wanted man), and the car can get him there');
  check(lost > 0 || busted === 0, 'a bust takes what he has paid');

  console.log('Handing him over');
  for (const evil of [false, true]) {
    start('night', { s: 1100, evil, n: 3 });
    pickUp();
    const standing = Social.level;
    g.run(60, () => { P.danger = 99; const far = P.s > 1500; g.drive(far ? -1 : 1, steerTo(T().laneOffset(T().laneRange(1, P.s)[1], P.s))); return !Robber.carrying; });
    const paid = Robber.last?.paid;
    if (!Robber.last) console.log('         (still aboard: ' + JSON.stringify({ chasers: Robber.chasers.map(c => [Math.round(c.s - P.s), +c.lat.toFixed(1), +c.vs.toFixed(1)]), P: [P.active, P.busted, P.bustReason, +P.speed.toFixed(1), +P.lat.toFixed(1)], said: g.said }) + ')');
    check(Robber.last?.how === 'handed' && !P.busted && G.busts === 0 && G.cash === paid, (evil ? 'Evil' : 'Good') + ': slowing right down with the police there hands him over: no bust, and the $' + paid + ' he had paid is kept');
    if (!evil) check(Social.level > standing + 0.15, 'Good: and standing is gained (' + standing.toFixed(2) + ' to ' + Social.level.toFixed(2) + ')');
    else check(Social.level === 0, 'Evil: no standing to gain');
  }

  console.log('After a pursuit that ends in a wreck');
  start('night', { s: 1500, pursuit: { at: 0.1, end: 'crashed' } });
  const before = Robber.spots.length;
  g.drive(0, 0);
  g.run(60, () => { P.speed = 18; return Robber.spots.length > before; });
  const extra = Robber.spots[Robber.spots.length - 1];
  check(Robber.spots.length === before + 1 && extra.s > P.s + 100, 'the getaway car wrecked: a robber is thumbing a lift ' + Math.round(extra.s - P.s) + ' m up the road');
  for (const end of ['caught', 'away']) {
    start('night', { s: 1500, pursuit: { at: 0.1, end } });
    g.drive(0, 0);
    g.run(40, () => { P.speed = 18; return !!Pursuit.last; });
    check(Robber.spots.length === before, end + ': no robber');
  }
  Pursuit.force = null;

  console.log('A run still finishes');
  start('night', { s: 0, force: { carry: true } });
  P.testGhost = true;
  g.run(400, () => G.state !== 'playing');
  check(G.state === 'finished', 'night, begun with him aboard and driven to the end: ' + G.outcome + ', $' + G.cash + ' cash');
  Robber.force = null;
} catch (e) {
  failures++;
  console.log('  FAIL  ' + (e.stack || e));
} finally {
  await g.close();
}
console.log(failures ? failures + ' FAILED' : 'all checks passed');
process.exit(failures ? 1 : 0);
