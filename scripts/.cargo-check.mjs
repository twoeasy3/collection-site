// A headless check of the cargo (src/delivery/cargo.js) and the delivery at the kerb (delivery.js): every
// level's item, the Evil states' thresholds, and the ending's sequence, skip and exceptions.
//   node scripts/.cargo-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot();
let failed = 0;
const ok = (what, pass, more = '') => { if (!pass) failed++; console.log((pass ? '  ok    ' : '  FAIL  ') + what + (more ? '  ' + more : '')); };
try {
  const { CARGO, cargoFor, cargoProblems, cargoState, carriesCargo } = await g.load('cargo.js');
  const { Delivery } = await g.load('delivery.js');
  const { CONFIG, Game, Player } = g, C = CONFIG.consignment, E = C.ending;
  const all = [...g.levels.LEVELS, ...Object.values(g.levels.HIDDEN_LEVELS)];

  console.log('what each level carries (good / evil):');
  const seen = { good: new Set(), evil: new Set() };
  let bad = [];
  for (const level of all) {
    bad.push(...cargoProblems(level).map(p => level.id + ': ' + p));
    const good = cargoFor(level, false), evil = cargoFor(level, true);
    if (carriesCargo(level) !== !!good || !!good !== !!evil) bad.push(level.id + ': carries / does not carry, mixed up');
    if (good) { seen.good.add(good.id); seen.evil.add(evil.id); }
    console.log('  ' + level.id.padEnd(18) + (good ? good.id.padEnd(10) + evil.id + (level.cargo ? '   (its own)' : '') : '-'));
  }
  ok('every level\'s "cargo" names items there are', !bad.length, bad.join(' | '));
  ok('all ten items turn up', seen.good.size === CARGO.good.length && seen.evil.size === CARGO.evil.length, [...seen.good, ...seen.evil].join(' '));
  ok('races and the Battlefield carry nothing', all.filter(l => l.laps || l.battle).every(l => !cargoFor(l, false)));

  ok('state: calm with most of the clock left', cargoState(100, 100) === 0 && cargoState(100 * C.agitated + 0.1, 100) === 0);
  ok('state: agitated at the threshold', cargoState(100 * C.agitated, 100) === 1 && cargoState(100 * C.furious + 0.1, 100) === 1);
  ok('state: furious in the last stretch and the tip countdown', cargoState(100 * C.furious, 100) === 2 && cargoState(0, 100) === 2 && cargoState(-5, 100) === 2);

  // a run to the line, from a little short of it
  const toLine = (id, evil, late = false) => {
    g.select(id);
    Game.evil = evil;
    Player.testGhost = true;
    Game.start();
    Player.s = g.track.Track.length - 150;
    if (late) Game.time = Game.allowed + 2; // (into the tip countdown)
    g.drive(1, 0);
    g.run(30, () => Game.state !== 'playing');
  };
  Delivery.staged = false;
  toLine('expressway', false);
  ok('headless (nothing to show it): finished, no delivery sequence', Game.state === 'finished' && Game.outcome === 'delivered' && !Delivery.active);

  Delivery.staged = true;
  toLine('expressway', false);
  const fixed = { time: Game.time, outcome: Game.outcome, s: Player.s };
  ok('staged: finished at once, the sequence going', Game.state === 'finished' && Game.outcome === 'delivered' && Delivery.active && Delivery.cargo.id === 'pizza' && Delivery.state === 0);
  ok('skip refused in the first moment', Delivery.skip() === false && Delivery.active);
  const phases = [];
  const lasted = g.run(20, () => { if (Delivery.phase && phases.at(-1) !== Delivery.phase) phases.push(Delivery.phase); return !Delivery.active; });
  const total = E.park + E.unload + E.moment + E.beat;
  ok('phases in order', phases.join(' ') === 'park unload moment beat', phases.join(' '));
  ok('it lasts what the config says', Math.abs(lasted - total) < 0.1, lasted.toFixed(2) + ' s of ' + total.toFixed(2));
  ok('the run was fixed at the line', Game.time === fixed.time && Game.outcome === fixed.outcome && Game.state === 'finished');
  const T = g.track.Track;
  ok('the car stopped at the kerb, on the road, past the line', Player.speed === 0 && Math.abs(Player.lat - Delivery.to.lat) < 1e-6 && Player.s > fixed.s && Player.s < T.end - 20 &&
    Delivery.spot.lat < T.hi(Player.s) && Delivery.spot.lat > T.laneHi(Player.s), `s +${(Player.s - fixed.s).toFixed(1)} m, lat ${Player.lat.toFixed(2)}, cargo ${Delivery.spot.lat.toFixed(2)}, edge ${T.hi(Player.s).toFixed(2)}`);

  toLine('expressway', true, true);
  ok('Evil and late: still delivered to the kerb, furious', Game.outcome === 'late' && Delivery.active && Delivery.cargo.id === 'parcel' && Delivery.state === 2);
  g.run(E.skipAfter + 0.1);
  ok('skip: straight to the results', Delivery.skip() === true && !Delivery.active && Game.state === 'finished');
  g.run(2);
  ok('...and the car just rolls to a stop', Game.state === 'finished' && Player.speed < 1);

  toLine('expressway', true);
  ok('Evil on time, from near the line: calm (the whole clock left)', Delivery.active && Delivery.state === 0);
  g.Input.emit('confirm');
  ok('Enter in the first moment does not restart the level', Game.state === 'finished' && Delivery.active);
  g.run(E.skipAfter + 0.1);
  g.Input.emit('confirm');
  ok('Enter after it skips, and does not restart', Game.state === 'finished' && !Delivery.active);

  // endings that keep their own
  g.select('expressway'); Game.evil = false; Player.testGhost = true; Game.start(); g.drive(0, 0);
  Game.time = Game.allowed + CONFIG.tipCountdown - 0.5;
  g.run(5, () => Game.state !== 'playing');
  ok('out of time: no delivery', Game.outcome === 'timeout' && !Delivery.active);
  g.select('expressway'); Game.start(); Game.busts = CONFIG.maxBusts - 1; Game.bust();
  ok('busted out: no delivery', Game.outcome === 'busted' && !Delivery.active);
  const none = [];
  for (const level of all) {
    g.select(level.id); Game.evil = false; Game.start();
    if (!Delivery.wanted('delivered')) none.push(level.id);
  }
  console.log('  no ending on: ' + none.join(', '));
  ok('no ending on races, the Battlefield, the UFO and the jetboat', none.length === all.filter(l => l.laps || l.battle || C.noEnding.includes(l.car)).length);
} catch (e) {
  failed++;
  console.log('THREW ' + (e.stack || e));
} finally {
  await g.close();
}
console.log(failed ? failed + ' FAILED' : 'all good');
process.exit(failed ? 1 : 0);
