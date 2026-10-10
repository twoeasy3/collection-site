// A check of the level tiers (src/delivery/tiers.js, tiers.json): the file is sound; what opens and when (levels 1
// and 2 with the tier, 3 on two half-ribbons, 4 on four, 5 on level 4, the next tier on level 5, Blue 1 after the
// five-star tier's level 5, an amphibious level on half a ribbon on every stage of its blue tier); the car rule
// (exactly that tier's cars on a half not earned, any car once it is, null car with none owned, the player's own
// pick kept apart); a save from before keeps what it had open; and the switch off gives the old rule.
//   node scripts/.tiers-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot();
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const { Progress } = await g.load('progress.js');
const { Tiers } = await g.load('tiers.js');
const cars = g.cars;
const L = (id) => g.levels.LEVELS.find(l => l.id === id);
const T = Tiers.tiers; // [[level]]
const A = g.levels.AMPHIBIOUS_LEVELS;
g.CONFIG.progression.tiers = true;
const fresh = () => { Progress.reset(); Progress.noSave = true; Progress.data.tierBase = 1; };
const beat = (level, evil = false) => { Progress.data.bestTime[evil ? 'evil' : 'good'][level.id] = 5; };
const beatTier = (n) => T[n - 1].forEach(level => beat(level));
const side = (evil) => { Tiers.sideIsEvil = () => evil; };

check(Tiers.problems().length === 0, 'tiers.json is sound: ' + (Tiers.problems().join('; ') || 'every level in one tier or outside'));
check(T.length === 10 && T.every(t => t.length === 5), 'ten tiers of five');
// ---- inside a tier
fresh();
const [a, b, c, d, e] = T[0];
check(Tiers.isOpen(a) && Tiers.isOpen(b), 'tier 1: levels 1 and 2 open with the tier');
check(!Tiers.isOpen(c) && !Tiers.isOpen(d) && !Tiers.isOpen(e), 'tier 1: levels 3, 4, 5 closed');
check(!Tiers.isOpen(T[1][0]), 'tier 2 closed');
beat(a);
check(Tiers.halves(a) === 1 && !Tiers.isOpen(c), 'one half-ribbon does not open level 3');
beat(a, true);
check(Tiers.halves(a) === 2 && Tiers.isOpen(c), 'a whole ribbon (both halves of one level) opens level 3');
check(!Tiers.isOpen(d), 'level 4 still closed on two halves');
fresh(); beat(a); beat(b);
check(Tiers.isOpen(c), 'level 3 opens on two halves from two levels (any two halves)');
check(!Tiers.isOpen(d), 'level 4 needs four halves');
beat(a, true); beat(b, true);
check(Tiers.isOpen(d) && !Tiers.isOpen(e), 'four halves open level 4, not level 5');
beat(d);
check(Tiers.isOpen(e), 'level 5 opens on level 4 beaten (either half)');
check(!Tiers.isOpen(T[1][0]), 'tier 2 still closed before level 5 is beaten');
beat(e);
check(Tiers.isOpen(T[1][0]) && Tiers.isOpen(T[1][1]) && !Tiers.isOpen(T[1][2]), 'beating level 5 opens the next tier: its first two levels');
// ---- Blue 1
fresh();
for (let n = 1; n <= 4; n++) beatTier(n);
check(Tiers.tierOpen(5) && !Tiers.tierOpen(6), 'five stars open after tier 4, Blue 1 not yet');
T[4].slice(0, 4).forEach(level => beat(level));
check(!Tiers.tierOpen(6), 'Blue 1 is closed with level 5 of the five-star tier undelivered');
beat(T[4][4]);
check(Tiers.tierOpen(6) && Tiers.isOpen(T[5][0]), 'Blue 1 opens after beating level 5 of 5 star');
check(cars.blueStarsOpen() === true, 'the Blue Star cars come into the garage with Blue 1');
fresh();
check(cars.blueStarsOpen() === false, 'and not before');
// ---- amphibious
fresh();
check(!Tiers.isOpen(A[0]), 'A1 closed at the start');
T[5].slice(0, 4).forEach(level => beat(level));
check(!Tiers.isOpen(A[0]), 'A1 closed with a stage of Blue 1 undelivered');
beat(T[5][4]);
check(Tiers.isOpen(A[0]) && !Tiers.isOpen(A[1]), 'A1 opens on half a ribbon on every stage of Blue 1 (A2 needs Blue 2)');
// ---- outside
fresh();
const chain = Tiers.outside.filter(l => !g.levels.isRace(l) && !A.includes(l));
check(chain.every(l => !Tiers.isOpen(l)), 'the outside levels are closed at the start');
for (let n = 1; n <= 10; n++) beatTier(n);
check(Tiers.isOpen(chain[0]) && !Tiers.isOpen(chain[1]), 'the first outside level opens when tier 10 is cleared, the next after it');
check(g.levels.RACE_LEVELS.every(l => Tiers.isOpen(l)), 'races always open');
// ---- the car rule
fresh();
g.select(a.id); side(false);
check(Tiers.restriction(a, false) === 1, 'level 1, Good half not earned: only 1-star gold cars');
beat(a);
check(Tiers.restriction(a, false) === null && Tiers.restriction(a, true) === 1, 'Good half earned frees Good only: Evil still wants a gold 1 car');
check(Tiers.restriction(T[5][0], false) === 6, 'a Blue 1 level wants a Blue Star 1 car (tier 6)');
check(Tiers.restriction(L('all-heck'), false) === null && Tiers.restriction(A[0], false) === null, 'a level outside the tiers or amphibious: no car rule');
const one = g.levels.LEVELS.find(l => (l.battle || l.alwaysGood) && Tiers.place(l));
if (one) { beat(one); check(Tiers.restriction(one, true) === null, 'a level with no side to choose gives the whole ribbon'); }
else console.log('  (no level with one side sits in a tier: that case is not exercised)');
check(cars.carTier(cars.CARS.find(x => x.id === 'commuter')) === 1 && cars.carTier(cars.CARS.find(x => x.id === 'postvan')) === 6, 'car tiers: Commuter 1, Post Van (blue 1) 6');
check(cars.carTier(cars.CARS.find(x => x.amphibious)) === null && cars.carTier(cars.EARNED_CARS[0]) === null, 'amphibious and earned (magenta) cars are in no tier');
// ---- the null car, and the remembered pick
fresh();
const second = T[1][0];
beat(a); beat(a, true); // (tier 2 open)
g.select(second.id); side(false);
Progress.data.car = 'commuter';
cars.useLevelCar(null, false);
check(cars.CAR.id === 'null-car' && cars.CAR.tierNeeded === 2, 'no gold 2 car owned: the null car (a silhouette) is in use');
check(g.Game.canStart === false, 'and the level cannot be started');
check(Progress.data.car === 'commuter', "the player's pick is untouched");
Progress.data.cars.push('lovebus', 'wagon');
cars.useLevelCar(null, false);
check(cars.CAR.id === 'lovebus' || cars.CAR.id === 'wagon', 'owning gold 2 cars puts the player in one: ' + cars.CAR.id);
check(g.Game.canStart === true, 'and the level can be started');
cars.selectCar('wagon');
check(cars.CAR.id === 'wagon' && Progress.data.car === 'commuter' && Progress.data.tierCars['2'] === 'wagon', 'a car picked for the restricted level is kept apart from the pick (the Commuter)');
g.select(a.id); beat(a);
cars.useLevelCar(null, false);
check(cars.CAR.id === 'commuter', 'on a level that allows it the pick comes back: ' + cars.CAR.id);
// ---- an old save
fresh();
Progress.data.tierBase = null;
Progress.data.unlocked = 12;
Progress.data.bestTime.good = Object.fromEntries(g.levels.LEVELS.slice(0, 11).map(l => [l.id, 5]));
check(Tiers.isOpen(g.levels.LEVELS[11]) && Tiers.isOpen(g.levels.LEVELS[0]) && Tiers.legacy() === 12, 'a save with 12 levels open keeps all 12 open under the tiers');
check(Progress.data.tierBase === 12, 'and the count is kept in the save (tierBase)');
check(Tiers.halves(g.levels.LEVELS[0]) === 1, 'its best times are its ribbons (a Good half each)');
// a hand-made save from long ago (order 30, 25 levels open, a best time on each side of the first) read back
{
  const old = { money: 321.5, unlocked: 25, levelOrder: 30, cars: ['hatch', 'lovebus'], car: 'lovebus', bestTime: { good: { expressway: 12, 'back-roads': 8 }, evil: { expressway: 6 } } };
  localStorage.setItem('delivery_racer_progress_backup', JSON.stringify(old));
  Progress.reload();
  const d = Progress.data;
  check(d.money === 321.5 && d.cars.includes('commuter') && d.car === 'lovebus' && d.tierBase === null, 'an old save loads whole, with no tier fields yet');
  check(d.levelOrder > 30 && d.unlocked >= 25, 'its open count is migrated to the current order as ever (' + d.unlocked + ')');
  check(Tiers.legacy() === d.unlocked && Tiers.isOpen(g.levels.LEVELS[d.unlocked - 1]), 'the tiers keep all ' + d.unlocked + ' of its levels open');
  check(Tiers.halves(L('expressway')) === 2 && Tiers.halves(L('back-roads')) === 1, 'its best times are its ribbons');
  localStorage.removeItem('delivery_racer_progress_backup');
  Progress.noSave = true;
}
// ---- the switch
g.CONFIG.progression.tiers = false;
check(!Tiers.on() && Tiers.restriction(a, false) === null, 'the switch off: no tier rule');
g.select(second.id);
cars.useLevelCar(null, false);
check(g.Game.canStart === true && cars.CAR.id === 'commuter', 'the switch off: the old rule, any car');
console.log(failures ? failures + ' FAILED' : 'all checks passed');
await g.close();
process.exit(failures ? 1 : 0);
