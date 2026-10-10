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
  // ...and holds only what a save holds: anything else in the code is dropped, each thing kept is of its kind
  Progress.importCode('DR1.' + btoa(JSON.stringify({ unlocked: 3, cars: ['sport', '<img src=x>'], car: { id: 1 }, junk: 'x'.repeat(500), __proto__x: 1, stats: 'letters', muted: 'yes', touch: 1, raceClass: ['f1'],
    bestTime: { good: { [LEVELS[0].id]: 20, 'no-such-level': 30 }, evil: 'x' } })));
  const kept = JSON.parse(Progress.saved());
  check(kept.junk === undefined && kept.__proto__x === undefined, 'a code\'s unknown fields are dropped (' + Object.keys(kept).length + ' fields saved)');
  check(Object.keys(kept).sort().join() === Object.keys(JSON.parse((Progress.reset(), Progress.saved()))).sort().join(), '...leaving exactly a fresh save\'s fields');
  Progress.importCode('DR1.' + btoa(JSON.stringify({ unlocked: 3, cars: ['sport', '<img src=x>'], car: { id: 1 }, stats: 'letters', muted: 'yes', touch: 1, raceClass: ['f1'], bestTime: { good: { [LEVELS[0].id]: 20, 'no-such-level': 30 }, evil: 'x' } })));
  const d = Progress.data;
  check(d.car === 'commuter' && d.cars.join() === 'commuter,sport', 'its car and cars are plain ids: ' + d.car + ' / ' + d.cars.join());
  check(JSON.stringify(d.stats) === '{}' && d.muted === false && d.touch === null && d.raceClass === 'f1', 'counters, switches and the race class of the wrong kind fall back to a fresh save\'s');
  check(JSON.stringify(d.bestTime) === JSON.stringify({ good: { [LEVELS[0].id]: 20 }, evil: {} }), 'best times only for levels there are');
  check(Progress.importCode('DR1.' + btoa(JSON.stringify({ unlocked: 2, cars: [], junk: 'x'.repeat(30000) }))) === false, 'a code far longer than a save is refused');
}
// a visit from the address bar's test switches (main.js sets Progress.noSave) lends cars and opens levels in
// Progress.data: nothing of it is written, whatever is counted, delivered or bought on the way
{
  Progress.reset();
  Progress.save();
  const stored = () => document.cookie.split(';')[0];
  const before = stored();
  Progress.noSave = true;
  Progress.data.cars.push('tank'); // (as ?car=tank does)
  Progress.data.car = 'tank';
  Progress.data.unlocked = LEVELS.length; // (as ?pick does)
  Progress.countSaved = 0;
  Progress.count('packagesLanded'); // (the first count of a run saves at once)
  Progress.levelDone(0, LEVELS[0].id, 500, 12, false);
  Progress.useCar('tank');
  Progress.flush();
  check(stored() === before, 'a test visit (noSave): a count, a delivery and a car change write nothing');
  check(Progress.owns('tank') && Progress.data.unlocked === LEVELS.length, '...while the visit itself has the lent car and the open levels');
  const main = (await import('node:fs')).readFileSync(new URL('../src/delivery/main.js', import.meta.url), 'utf8');
  const list = (main.match(/\[([^\]]*)\]\.some\(key => params\.get\(key\) !== null\)\) Progress\.noSave = true/) || [])[1] || '';
  for (const key of ['autostart', 'hidden', 'test', 'edited', 'pick', 'car', 'ghost']) check(list.includes("'" + key + "'"), 'main.js: ?' + key + ' makes the visit one that saves nothing');
  Progress.reset();
  check(Progress.noSave === false && !Progress.owns('tank'), 'a reset ends it');
}
console.log(failures ? failures + ' FAILED' : 'all checks passed');
await g.close();
process.exit(failures ? 1 : 0);
