// A check of Gimmick Road 2's gimmicks (src/delivery/hazards.js), one at a time, headless: each starts the
// level, sets the car down a little short of the gimmick, and drives at it one way or another.
//   node scripts/.hazards-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot({ cars: ['commuter', 'sport'] });
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const { Hazards } = await g.load('hazards.js');
  const { SpeedCameras } = await g.load('cameras.js');
  const { Site } = await g.load('site.js');
  const { Crossings } = await g.load('crossing.js');
  const P = g.Player, G = g.Game;
  const level = g.select('gimmick-road-2');
  const lane = (n, s) => g.track.Track.laneOffset(n, s);
  // a fresh run, the car at s in lane n doing v, no traffic to get in the way
  const start = (s, n, v, { ghost = false } = {}) => {
    P.testGhost = false;
    G.evil = false;
    g.said.length = 0;
    G.start();
    for (const car of g.Traffic.cars) car.active = false;
    Object.assign(P, { s, lat: lane(n, s), speed: v, launching: false, shield: 0 });
    Hazards.lastS = SpeedCameras.lastS = s;
    P.testGhost = ghost;
    g.drive(1, 0);
  };
  const quiet = () => { for (const car of g.Traffic.cars) car.active = false; };
  const said = (text) => g.said.some(line => line.includes(text));
  // ---- school crossing (s 800)
  start(600, 3, 30);
  console.log('Level problems: ' + (g.track.Track.problems.join(' | ') || 'none'));
  check(!g.track.Track.problems.length, 'the level loads without problems');
  g.run(12, () => { quiet(); return P.s > 900 || P.busted; });
  check(P.busted && P.bustReason === 'school', 'school crossing: driving through its STOP is a bust (' + P.bustReason + ')');
  start(600, 3, 30);
  g.run(30, () => { quiet(); g.drive(Hazards.schools[0].state === 'stop' ? -1 : 1, 0); return P.s > 900 || P.busted; });
  check(!P.busted && P.s > 900, 'school crossing: braking for it, then driving on, is no bust');
  start(600, 3, 0);
  g.Traffic.reset();
  let waited = 0;
  g.drive(-1, 0);
  Hazards.schools[0].state = 'stop'; Hazards.schools[0].t = 0; Hazards.schools[0].started = true;
  g.run(4, () => { Hazards.schools[0].t = 1; });
  waited = g.Traffic.cars.filter(c => c.active && Math.abs(c.s - 800) < 30 && Math.abs(c.vs) < 0.5).length;
  const over = g.Traffic.cars.filter(c => c.active && Math.abs(c.s - 800) < 3 && Math.abs(c.vs) > 2).length;
  console.log('         (traffic stopped within 30 m of it: ' + waited + ', driving over it: ' + over + ')');

  // ---- burst water main (s 300, lane 5)
  start(250, 5, 20);
  let iced = false, dry = false;
  g.run(12, () => { quiet(); P.s = 310; P.speed = 0; const m = Hazards.mains[0]; if (m.on && Track_icy()) iced = true; if (!m.on && !Track_icy()) dry = true; return iced && dry; });
  function Track_icy() { return !!g.track.Track.icy(310, lane(5, 310)); }
  check(iced && dry, 'water main: its lane is icy while it sprays, and not when it stops');
  check(!g.track.Track.icy(310, lane(4, 310)), 'water main: the lane beside it is never icy');

  // ---- trolleys (1050 - 1350)
  start(1000, 3, 5);
  const t0 = Hazards.trolleys.map(o => o.lat);
  g.run(6, () => { quiet(); P.s = 1000; });
  const moved = Hazards.trolleys.filter((o, i) => Math.abs(o.lat - t0[i]) > 0.5).length;
  const onRoad = Hazards.trolleys.every(o => o.lat >= g.track.Track.lo(o.s) && o.lat <= g.track.Track.hi(o.s));
  check(moved >= 6 && onRoad, 'trolleys: ' + moved + ' of ' + t0.length + ' rolled across, all still on the road');

  // ---- marathon (s 1600, lane 5)
  start(1500, 3, 20);
  g.run(5, () => { quiet(); });
  const m = Hazards.marathons[0];
  check(m.on && m.members.every(o => o.s > o.run.s0 + 10), 'marathon: the runners and the pace car set off');
  start(1570, 5, 30);
  const health = P.health;
  g.run(3, () => { quiet(); });
  check(m.members.some(o => o.gone) && P.health < health, 'marathon: running into the runners knocks them down, and costs health');

  // ---- balloon (s 3550)
  start(3250, 3, 30);
  let landed = false;
  g.run(20, () => { quiet(); const b = Hazards.balloons[0]; if (b.state === 'sit') landed = true; g.drive(b.state === 'gone' ? 1 : P.s > 3480 ? -1 : 1, 0); return P.s > 3600; });
  check(landed && Hazards.balloons[0].state === 'gone' && !Hazards.balloons[0].hit, 'balloon: it lands, sits and lifts off; waiting for it costs nothing');
  start(3250, 3, 30);
  const before = P.health;
  g.run(20, () => { quiet(); return P.s > 3600; });
  check(Hazards.balloons[0].hit && P.health < before, 'balloon: driving into its basket costs health (' + Math.round(before - P.health) + ')');

  // ---- wide load (s 3900)
  start(3700, 3, 30);
  g.run(6, () => { quiet(); return Hazards.loads[0].on && Hazards.loads[0].load.s > 3920; });
  check(Hazards.loads[0].on, 'wide load: it sets off as the player comes near');
  for (const watching of [true, false]) {
    start(3700, 3, 20);
    g.run(40, () => {
      quiet();
      const w = Hazards.loads[0];
      if (!w.on) return false;
      const W = g.CONFIG.wideLoad;
      w.t = watching ? 1 : W.watch + 1; // (the escort held watching, or looking away)
      P.lat = g.track.Track.shoulderOffset(1, P.s); // (by on the shoulder)
      P.danger = 99;
      return w.passed || P.busted;
    });
    check(watching ? P.busted && P.bustReason === 'wideLoad' : Hazards.loads[0].passed && !P.busted,
      'wide load: passing it with the escort ' + (watching ? 'watching is a bust' : 'looking away is not'));
  }

  // ---- drawbridge (s 4700)
  start(4400, 3, 40);
  let highest = 0;
  g.run(15, () => { quiet(); highest = Math.max(highest, P.air); return P.s > 4820; });
  check(G.wrecks === 0 && highest > 1 && said('jumped'), 'drawbridge: at speed the car jumps the gap (' + highest.toFixed(1) + ' m up)');
  // (its deck, and the car on it: held open, the car hands off at the speed its board asks for)
  {
    const D = g.CONFIG.drawbridge, c = () => Hazards.bridges[0], need = Math.ceil(Hazards.bridgeJumpSpeed() * 3.6 / 5) * 5 / 3.6;
    const hold = () => { quiet(); Object.assign(c(), { state: 'open', t: D.raise + 1, started: true }); };
    start(4600, 3, need);
    hold();
    const lipY = D.leaf * Math.sin(D.angle), gap = Hazards.bridgeGap(c());
    const up = Hazards.deck(c(), 4700 - D.leaf / 2), down = Hazards.deck(c(), 4700 + D.leaf / 2);
    check(Math.abs(up.slope - Math.tan(D.angle)) < 1e-6 && Math.abs(down.slope + Math.tan(D.angle)) < 1e-6 && Math.abs(up.y - down.y) < 1e-6 && Hazards.deck(c(), 4700) === null &&
      Hazards.deck(c(), 4700 - D.leaf - 1) === undefined && Hazards.surface(4700).y < 0 && Hazards.surface(4600).y === 0,
      'drawbridge: its deck is two leaves at ' + (D.angle * 180 / Math.PI).toFixed(0) + ' degrees, lips ' + lipY.toFixed(1) + ' m up, ' + gap.toFixed(1) + ' m apart');
    let onLeaf = 0, off = 0, flew = false, top = 0, landedPitch = null, wasJump = false;
    g.drive(0, 0);
    g.run(15, () => {
      hold();
      const deck = Hazards.deck(c(), P.s);
      if (!Hazards.jump && deck && deck.slope > 0) { onLeaf++; off = Math.max(off, Math.abs(P.air - deck.y), Math.abs(P.pitch - D.angle)); }
      if (Hazards.jump) { flew = true; top = Math.max(top, P.air); }
      if (wasJump && !Hazards.jump) landedPitch = P.pitch;
      wasJump = !!Hazards.jump;
      return P.s > 4760 || G.wrecks > 0;
    });
    check(onLeaf > 10 && off < 1e-3, 'drawbridge: up the leaf the car is on its surface, pitched to its angle (' + onLeaf + ' steps, off by ' + off.toFixed(4) + ')');
    check(flew && top > lipY && G.wrecks === 0 && P.s > 4760, 'drawbridge: at the speed on its board, ' + Math.round(need * 3.6) + ' km/h, hands off, it crests the lip, flies (' + top.toFixed(1) + ' m up) and is over');
    check(landedPitch !== null && landedPitch <= 0, 'drawbridge: it lands pitched to what it lands on (' + (landedPitch ?? NaN).toFixed(2) + ' rad)');
    start(4640, 3, 10);
    hold();
    g.drive(1, 0);
    let high = 0;
    g.run(10, () => { hold(); if (P.s < 4684) P.speed = Math.min(P.speed, 10); high = Math.max(high, P.air); return G.wrecks > 0; });
    check(G.wrecks === 0 && high > 0.5 && high < lipY - 1 && P.s <= 4700 - D.leaf && P.speed < 2, 'drawbridge: far too slow, it stops short on the leaf (' + high.toFixed(1) + ' m up) and rolls back to its foot');
    for (const car of g.cars.CARS) if (!(car.maxSpeed >= need)) check(false, 'drawbridge: ' + car.id + ' cannot reach the speed that clears it');
    check(g.cars.CARS.every(car => car.tank || car.maxSpeed >= need), 'drawbridge: the top speed of every garage car clears it');
  }
  start(4400, 3, 18);
  g.run(25, () => { quiet(); P.speed = Math.min(P.speed, 18); return P.s > 4760 || G.wrecks > 0; });
  check(G.wrecks === 1 && said('Into the river'), 'drawbridge: too slow, the car drops into the gap and is wrecked');
  start(4400, 3, 30);
  g.run(40, () => { quiet(); const c = Hazards.bridges[0]; g.drive(c.state !== 'idle' && P.s < 4680 ? -1 : 1, 0); return P.s > 4760 || G.wrecks > 0; });
  check(G.wrecks === 0 && P.s > 4760, 'drawbridge: waiting for it to come down, then driving over, is safe');

  // ---- road train jackknife (s 5050, lanes 4 and 5)
  start(4850, 5, 30);
  g.run(12, () => { quiet(); return P.s > 5100 || G.wrecks > 0; });
  check(G.wrecks === 1 && said('jackknifing'), 'jackknife: staying in its lane wrecks the car');
  start(4850, 3, 30);
  g.run(12, () => { quiet(); return P.s > 5100 || G.wrecks > 0; });
  check(G.wrecks === 0, 'jackknife: the lane left open is safe');

  // ---- the side road: a camera, potholes, a level crossing and a stampede on it
  start(5300, 5, 30, { ghost: false });
  let onSide = false, crossingWent = false, seen = 0;
  const x = g.track.Track.exits[0];
  g.run(60, () => {
    quiet();
    if (P.s > 5330 && P.s < 5420 && g.track.Track.isMain(P.s)) P.lat = g.track.Track.hi(P.s) - 1.2; // (out into the exit lane)
    if (!g.track.Track.isMain(P.s)) { onSide = true; P.lat = lane(1, P.s); P.health = P.maxHealth; P.danger = 99; }
    if (Crossings.list[0].state !== 'idle') crossingWent = true;
    seen = Math.max(seen, Hazards.stampedes[0].animals.filter(o => o.gone).length);
    return onSide && g.track.Track.isMain(P.s);
  });
  check(onSide, 'side road: the car took the exit');
  check(G.fines > 0 || said('SPEED CAMERA'), 'side road: its speed camera caught the car ($' + G.fines + ')');
  check(Site.holes.length === 3 && Site.holes.every(h => !g.track.Track.isMain(h.s)), 'side road: its potholes are on it');
  check(crossingWent, 'side road: its level crossing went off as the car came up to it');
  check(said('STAMPEDE') && seen > 0, 'side road: the stampede charged (' + seen + ' of 8 run into or gone by)');
  console.log(failures ? failures + ' FAILED' : 'all checks passed');
} catch (e) {
  failures++;
  console.log('THREW ' + (e.stack || e));
} finally {
  await g.close();
}
process.exit(failures ? 1 : 0);
