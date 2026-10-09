// A quick headless drive of the levels named: flat out as a ghost down the starting lane, reporting the
// level's problems, where the run got to, and what was said on the way. Seconds, not minutes: for trying
// a change to one level (the full check of every level is scripts/delivery-smoke.mjs).
//   node scripts/delivery-probe.mjs quarry-run gimmick-road [--secs=120] [--solid] [--evil] [--car=sport]
import { boot } from './delivery-headless.mjs';

const arg = (name, fallback) => { const a = process.argv.find(x => x.startsWith('--' + name + '=')); return a ? a.slice(name.length + 3) : fallback; };
const flag = (name) => process.argv.includes('--' + name);
const IDS = process.argv.slice(2).filter(a => !a.startsWith('--'));
if (!IDS.length) { console.log('Name the levels: node scripts/delivery-probe.mjs <id> ... [--secs=120] [--solid] [--evil] [--car=id]'); process.exit(1); }

const g = await boot({ cars: ['commuter', 'sport', arg('car', 'commuter')] });
let failed = false;
try {
  for (const id of IDS) {
    try {
      const level = g.select(id);
      g.cars.selectCar(arg('car', 'commuter'));
      g.Game.evil = flag('evil');
      g.Player.testGhost = !flag('solid'); // (--solid: an ordinary car, which can be wrecked and busted)
      g.said.length = 0;
      g.Game.start();
      g.drive(1, 0);
      const t = g.run(Number(arg('secs', 120)), () => g.Game.state !== 'playing');
      const problems = g.track.Track.problems || [];
      console.log(`${id}: ${g.Game.outcome || 'still driving'} after ${t.toFixed(1)} s, ${Math.round(g.Game.progress * 100)}% of the way` +
        `, wrecks ${g.Game.wrecks}, busts ${g.Game.busts}` + (level.clock ? `, clock ${JSON.stringify(level.clock)}` : ''));
      if (problems.length) { failed = true; console.log('  PROBLEMS: ' + problems.join(' | ')); }
      if (g.said.length) console.log('  said: ' + g.said.join(' | '));
    } catch (e) {
      failed = true;
      console.log(`${id}: THREW ${e.stack || e}`);
    }
  }
} finally {
  await g.close();
}
process.exit(failed ? 1 : 0);
