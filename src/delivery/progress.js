// ============================================================================
// PROGRESS - what the player has earned and unlocked, kept in a cookie so it is still
// there next time. Everything that reads or writes saved progress goes through here, so
// the storage can be swapped (e.g. for Capacitor Preferences) without touching the game.
// ============================================================================
import { LEVELS, isRace } from './levels.js';
const COOKIE = 'delivery_racer_progress';
const ONE_YEAR = 60 * 60 * 24 * 365;
// Saved progress counts unlocked levels by position (see LEVELS), so it remembers which order of
// levels it was saved with. Each new order put a level in among the others: a save from before
// that had opened that position or beyond opens one more. Order 2 put Suburbia in at position 8,
// ahead of All Heck and Asteroid Run (now S1 and S2); order 3, Canberra at 9; order 4, Monte Carlo
// at 10; order 5, Singapore at 11; order 6, Singapore II at 12; order 7, Sydney to Kiama at 13;
// order 8, Passage du Gois at 14; order 9, Safari at 15; order 10, Airport at 16; order 11,
// Construction Site at 17; order 12, The Hood at 18; order 13, Panorama Avenue at 19; order 14,
// Speed Trap Alley at 20; order 15, Mountain Pass at 21; order 16, Outback Express at 22; order 17,
// Tour de Coast at 23; orders 18 to 20, Ring Road, Market Town and Quarry Run at 24 to 26; orders 21 to
// 25, Hong Kong Harbour, Tokyo Expressway, Mumbai Monsoon, Stelvio Pass and Christmas Eve at 27 to 31.
// Order 26 put the five amphibious levels in at 41 to 45: after every delivery level there was, ahead only of the
// circuits, which are races and always open. A save from before that counted past 40 had delivered the last
// special level, and so has the first amphibious level open and no more: it is held at 41 ({ cap }).
const INSERTED_AT = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, { cap: 41 }]; // (for orders 2, 3, ...)
const LEVEL_ORDER = INSERTED_AT.length + 1;

// races (the lapped levels, on the menu's Races tab) are always open, and never hold up the delivery levels: the
// count of open levels is always carried on past any race at its edge
const pastRaces = (unlocked) => { while (unlocked < LEVELS.length && isRace(LEVELS[unlocked - 1])) unlocked++; return unlocked; };
const fresh = () => ({
  money: 0,        // tips banked
  unlocked: 1,     // how many levels are open, counting from the first
  bestTime: { good: {}, evil: {} }, // most time to spare delivering each level (s, by level id), for each side
  cars: ['commuter'], // ids of the cars owned
  car: 'commuter', // id of the car in use
  muted: false,    // sound switched off
  touch: null,     // on-screen controls: true / false once chosen on the menu; null = on for touch screens
  autoGas: false,  // auto accelerate: the accelerator held down by itself, unless braking
  raceClass: 'f1', // the cars every race is run in: 'f1', 'gt' (GT road cars) or 'lmp' (Le Mans prototypes)
  raceTrack: 'marina-bay', // the race screensaver's circuit: a lapped level's id, or 'all' (each in turn)
  tankPieces: 0,   // TANK RAGE pieces found so far (0-4), carried from one level to the next
  evil: false,     // the side picked on the menu
  stats: {},       // milestone counters, by name (packagesLanded, copsOutrun, kmDriven...: see milestones.js), across every run
  levelOrder: LEVEL_ORDER, // the order of levels `unlocked` counts by
});

// The save is kept twice with every save: in local storage (BACKUP: the main store, read first), and in the
// cookie, which brings it back should local storage go or not be there at all. A browser drops a cookie over
// 4096 bytes without a word, which is why local storage is the one trusted: a full save's cookie was 4013
// bytes with 40 levels (scripts/.save-check.mjs measures it), and is about 3,000 now that times are rounded
const BACKUP = 'delivery_racer_progress_backup';
const savedCopies = () => {
  const copies = [];
  try {
    const backup = localStorage.getItem(BACKUP);
    if (backup) copies.push(JSON.parse(backup));
  } catch { /* (no storage, or a broken copy: the cookie, if there is one) */ }
  try {
    const match = document.cookie.match(new RegExp('(?:^|; )' + COOKIE + '=([^;]*)'));
    if (match) copies.push(JSON.parse(decodeURIComponent(match[1])));
  } catch { /* (an unreadable cookie) */ }
  // (local storage's, if it has one that can be read; the cookie's only if not)
  return copies.filter(c => c && typeof c === 'object' && !Array.isArray(c));
};
const read = () => {
  try {
    // (each copy in turn: one that reads as JSON but cannot be restored does not hide a good one behind it)
    for (const saved of savedCopies()) { try { return restore(saved); } catch { /* (the next copy) */ } }
    return fresh();
  } catch {
    return fresh(); // an unreadable cookie counts as no progress
  }
};
// a save as it was written (by any older version of the game), brought up to date
const restore = (saved) => {
  {
    const data = { ...fresh(), ...saved };
    data.bestTime = { good: {}, evil: {}, ...saved.bestTime }; // (a save from before best times has none)
    data.stats = { ...(saved.stats || {}) }; // (nor counters)
    // (the Commuter and the Darkvan were saved as 'hatch' and 'coupe')
    const RENAMED = { hatch: 'commuter', coupe: 'darkvan' };
    data.cars = [...new Set(data.cars.map(id => RENAMED[id] || id))];
    data.car = RENAMED[data.car] || data.car;
    delete data.best; // (best tips, no longer kept)
    for (let order = saved.levelOrder || 1; order < LEVEL_ORDER; order++) {
      const at = INSERTED_AT[order - 1];
      if (typeof at === 'object') data.unlocked = Math.min(data.unlocked, at.cap);
      else if (data.unlocked >= at) data.unlocked++;
    }
    data.levelOrder = LEVEL_ORDER;
    data.unlocked = pastRaces(data.unlocked);
    return data;
  }
};
// The save as text. Best times are kept to 0.1 s (all the menu shows) and the bank to the cent: a run leaves
// both with fifteen decimal places, which is what took the cookie to its cap
const SAVE_STEP = { time: 0.1, money: 0.01 };
const rounded = (value, step) => Math.round(value / step) / Math.round(1 / step);
const saveText = (data) => JSON.stringify({
  ...data,
  money: rounded(data.money, SAVE_STEP.money),
  bestTime: Object.fromEntries(Object.entries(data.bestTime).map(([side, times]) =>
    [side, Object.fromEntries(Object.entries(times).map(([id, t]) => [id, rounded(t, SAVE_STEP.time)]))])),
});
// A save code: the save as one line of text to copy out of one browser and into another (the menu's Export
// save and Import save: see render/savecode.js). CODE_MARK says what it is and which version of the code
const CODE_MARK = 'DR1.';
// a save out of a code is not trusted: only what a save can hold is kept, each thing checked for what it is
// (it is built from nothing, key by key: whatever else the code holds is dropped, not saved for ever)
const CODE_LONGEST = 20000; // characters: a full save's code is about 4,000
const tidy = (saved) => {
  const number = (v, least) => typeof v === 'number' && isFinite(v) ? Math.max(least, v) : undefined;
  const word = (v) => typeof v === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(v);
  const clean = {};
  clean.money = number(saved.money, 0) ?? 0;
  clean.unlocked = Math.floor(number(saved.unlocked, 1) ?? 1);
  clean.levelOrder = Math.floor(number(saved.levelOrder, 1) ?? 1);
  clean.tankPieces = Math.floor(number(saved.tankPieces, 0) ?? 0);
  clean.cars = [...new Set(['commuter', ...(Array.isArray(saved.cars) ? saved.cars : []).filter(word)])].slice(0, 200);
  clean.car = word(saved.car) ? saved.car : 'commuter';
  clean.bestTime = {};
  for (const side of ['good', 'evil']) { // (a time for a level there is, and no other)
    const times = saved.bestTime && typeof saved.bestTime === 'object' ? saved.bestTime[side] : null;
    clean.bestTime[side] = Object.fromEntries(Object.entries(times && typeof times === 'object' ? times : {})
      .filter(([id, t]) => typeof t === 'number' && isFinite(t) && LEVELS.some(level => level.id === id)));
  }
  for (const key of ['muted', 'autoGas', 'evil']) if (typeof saved[key] === 'boolean') clean[key] = saved[key];
  if (typeof saved.touch === 'boolean') clean.touch = saved.touch;
  for (const key of ['raceClass', 'raceTrack']) if (word(saved[key])) clean[key] = saved[key];
  // (the counters: numbers by name, and no more of them than there could be)
  clean.stats = Object.fromEntries(Object.entries(saved.stats && typeof saved.stats === 'object' && !Array.isArray(saved.stats) ? saved.stats : {})
    .filter(([key, n]) => word(key) && typeof n === 'number' && isFinite(n) && n >= 0).slice(0, 100));
  return clean;
};

const COUNT_SAVE_EVERY = 5000; // ms between saves of the milestone counters during a run (see Progress.count)
export const Progress = {
  data: read(),

  // the save as it is written (see saveText)
  saved() { return saveText(this.data); },
  // the save as a code, to take to another browser
  exportCode() {
    return CODE_MARK + btoa(String.fromCharCode(...new TextEncoder().encode(this.saved())));
  },
  // ...and a code brought in, in place of the progress here. False: not a save code (nothing is changed)
  importCode(code) {
    try {
      const text = String(code).replace(/\s+/g, '');
      if (!text.startsWith(CODE_MARK) || text.length > CODE_LONGEST) return false;
      const bytes = Uint8Array.from(atob(text.slice(CODE_MARK.length)), c => c.charCodeAt(0));
      const saved = JSON.parse(new TextDecoder().decode(bytes));
      if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return false;
      if (typeof saved.unlocked !== 'number' || !Array.isArray(saved.cars)) return false; // (some other JSON)
      this.data = restore(tidy(saved));
      this.save();
      return true;
    } catch {
      return false; // (not base64, or not JSON)
    }
  },
  save() {
    this.countDirty = false;
    const text = this.saved();
    document.cookie = COOKIE + '=' + encodeURIComponent(text) + '; max-age=' + ONE_YEAR + '; path=/; SameSite=Lax';
    try { localStorage.setItem(BACKUP, text); } catch { /* (no storage: the cookie alone) */ }
  },
  // a level delivered on time: bank the tip, remember the best time to spare (for the side it was
  // played on), open the next level. True: that was a new best
  levelDone(index, id, tip, spare, evil) {
    this.data.money += tip;
    const side = this.data.bestTime[evil ? 'evil' : 'good'];
    const record = !(side[id] >= spare);
    if (record) side[id] = spare;
    if (!isRace(LEVELS[index])) this.data.unlocked = Math.max(this.data.unlocked, pastRaces(index + 2)); // (a race won opens nothing)
    this.save();
    return record;
  },
  // the best time to spare on a level, for a side (undefined: not delivered on that side yet)
  bestTime(id, evil) { return this.data.bestTime[evil ? 'evil' : 'good'][id]; },
  // a milestone counter (see milestones.js) bumped by n (kept to two decimal places: the save is a cookie).
  // Saved lazily: at most once every COUNT_SAVE_EVERY ms, and flush() writes what is pending (at the end
  // of a run). onCount, if set, hears of every bump: (key, before, after)
  onCount: null,
  countSaved: 0,   // ms when the counters were last saved
  countDirty: false,
  count(key, n = 1) {
    const before = this.data.stats[key] || 0, after = Math.round((before + n) * 100) / 100;
    this.data.stats[key] = after;
    if (this.onCount) this.onCount(key, before, after);
    const now = Date.now();
    if (now - this.countSaved >= COUNT_SAVE_EVERY) { this.countSaved = now; this.save(); } else this.countDirty = true;
  },
  flush() { if (this.countDirty) this.save(); },
  // (an earned car, a 6-star one, is owned once its level's par is beaten: see earned())
  owns(carId) {
    return this.data.cars.includes(carId) || this.earnedCars.some(car => car.id === carId && this.earned(car));
  },
  // the cars that are earned, not bought (set by cars.js: { id, earned: { level, par: { good, evil? } } })
  earnedCars: [],
  // true: the car's level has been delivered with at least its par's seconds to spare, on every side the par names
  earned(car) {
    const { level, par } = car.earned, best = this.data.bestTime;
    return (best.good[level] ?? -Infinity) >= par.good && (par.evil === undefined || (best.evil[level] ?? -Infinity) >= par.evil);
  },
  // returns false if the player can't afford it
  buy(car) {
    if (this.owns(car.id)) return true;
    if (this.data.money < car.price) return false;
    this.data.money -= car.price;
    this.data.cars.push(car.id);
    this.save();
    return true;
  },
  // a finished game, all at once: every level open and delivered for its full tip, every
  // car in the garage bought, and a full bank (the "Unlock everything" button on the menu)
  // (best times are only ever earned)
  complete({ levels, cars, money }) {
    this.data.unlocked = Math.max(this.data.unlocked, levels);
    for (const id of cars) if (!this.data.cars.includes(id)) this.data.cars.push(id);
    this.data.money = Math.max(this.data.money, money);
    this.save();
  },
  useCar(carId) {
    if (!this.owns(carId)) return;
    this.data.car = carId;
    this.save();
  },
  reset() {
    this.data = fresh();
    this.save(); // (the backup too: a reset is meant)
  },
};

// (a save already there gets its backup at once, and a cookie lost but backed up is written back)
if (Progress.data.unlocked > 1 || Progress.data.money > 0 || Progress.data.cars.length > 1) Progress.save();
