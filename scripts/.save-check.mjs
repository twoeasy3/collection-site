// A check of saved progress (src/delivery/progress.js): how big a full save's cookie is (the cap is 4096 bytes:
// every level delivered on both sides, every car owned), and that a save code comes back as it went out.
//   node scripts/.save-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot();
const { Progress } = await g.load('progress.js');
const { LEVELS } = g.levels, { CARS, SECRET_CARS } = g.cars;
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const cookieSize = (data) => ('delivery_racer_progress=' + encodeURIComponent(JSON.stringify(data))).length;

// a full save: every level, both sides, with times as a run leaves them (unrounded)
Progress.reset();
Progress.complete({ levels: LEVELS.length, cars: [...CARS.map(c => c.id), ...Object.keys(SECRET_CARS)], money: g.CONFIG.completeBank });
let n = 0;
for (const level of LEVELS) for (const side of ['good', 'evil']) Progress.data.bestTime[side][level.id] = 10 + (++n * 7.123456789012345) % 90;
Progress.data.money = 12345.678901234567;
console.log(`${LEVELS.length} levels, ${Progress.data.cars.length} cars`);
console.log('cookie, times as a run leaves them: ' + cookieSize(Progress.data) + ' bytes');
if (Progress.saved) {
  const size = ('delivery_racer_progress=' + encodeURIComponent(Progress.saved())).length;
  console.log('cookie, as saved now: ' + size + ' bytes');
  check(size <= 4096, 'a full save fits a cookie (4096 bytes)');
  Progress.save();
  const written = document.cookie.split(';')[0];
  check(written.length === size, 'what save() writes is that size (' + written.length + ')');
  check(JSON.parse(decodeURIComponent(written.split('=')[1])).bestTime.good[LEVELS[0].id] === Math.round(Progress.data.bestTime.good[LEVELS[0].id] * 10) / 10, 'best times saved to 0.1 s');
  // a save code, out and back
  const code = Progress.exportCode(), before = Progress.saved();
  console.log('save code: ' + code.length + ' characters');
  Progress.reset();
  check(Progress.data.unlocked === 1, 'reset');
  check(Progress.importCode('  ' + code + '\n') === true, 'the code is taken (spaces round it and all)');
  check(Progress.saved() === before, 'and the save is as it was');
  for (const bad of ['', 'hello', 'DR1.!!!!', 'DR1.' + btoa('[1,2]'), 'DR1.' + btoa('{"unlocked":"x"}')]) {
    const kept = Progress.saved();
    check(Progress.importCode(bad) === false && Progress.saved() === kept, 'refused, nothing changed: ' + JSON.stringify(bad.slice(0, 24)));
  }
  // a code with junk in it is tidied, not trusted
  Progress.importCode('DR1.' + btoa(JSON.stringify({ unlocked: 5, money: -3, cars: ['sport', 7, 'nosuchcar'], car: 'sport', bestTime: { good: { expressway: 'x', farm: 12.34 } } })));
  check(Progress.data.unlocked === 5 && Progress.data.money === 0, 'a tidied code: levels open ' + Progress.data.unlocked + ', bank ' + Progress.data.money);
  check(Progress.data.cars.includes('commuter') && Progress.data.cars.includes('sport') && !Progress.data.cars.includes(7), 'its cars: ' + Progress.data.cars.join(','));
  check(Progress.data.bestTime.good.expressway === undefined && Progress.data.bestTime.good.farm === 12.34 && !!Progress.data.bestTime.evil, 'its best times: ' + JSON.stringify(Progress.data.bestTime));
}
console.log(failures ? failures + ' FAILED' : 'all checks passed');
await g.close();
process.exit(failures ? 1 : 0);
