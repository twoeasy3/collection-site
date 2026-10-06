// ============================================================================
// PROGRESS - what the player has earned and unlocked, kept in a cookie so it is still
// there next time. Everything that reads or writes saved progress goes through here, so
// the storage can be swapped (e.g. for Capacitor Preferences) without touching the game.
// ============================================================================
const COOKIE = 'delivery_racer_progress';
const ONE_YEAR = 60 * 60 * 24 * 365;
// Saved progress counts unlocked levels by position (see LEVELS), so it remembers which order of
// levels it was saved with. Each new order put a level in among the others: a save from before
// that had opened that position or beyond opens one more. Order 2 put Suburbia in at position 8,
// ahead of All Heck and Asteroid Run (now S1 and S2); order 3, Canberra at 9; order 4, Monte Carlo
// at 10; order 5, Singapore at 11; order 6, Singapore II at 12; order 7, Sydney to Kiama at 13;
// order 8, Passage du Gois at 14.
const INSERTED_AT = [8, 9, 10, 11, 12, 13, 14]; // (for orders 2, 3, ...)
const LEVEL_ORDER = INSERTED_AT.length + 1;

const fresh = () => ({
  money: 0,        // tips banked
  unlocked: 1,     // how many levels are open, counting from the first
  best: {},        // best tip per level id
  cars: ['hatch'], // ids of the cars owned
  car: 'hatch',    // id of the car in use
  muted: false,    // sound switched off
  touch: null,     // on-screen controls: true / false once chosen on the menu; null = on for touch screens
  autoGas: false,  // auto accelerate: the accelerator held down by itself, unless braking
  tankPieces: 0,   // TANK RAGE pieces found so far (0-4), carried from one level to the next
  evil: false,     // the side picked on the menu
  levelOrder: LEVEL_ORDER, // the order of levels `unlocked` counts by
});

const read = () => {
  try {
    const match = document.cookie.match(new RegExp('(?:^|; )' + COOKIE + '=([^;]*)'));
    if (!match) return fresh();
    const saved = JSON.parse(decodeURIComponent(match[1]));
    const data = { ...fresh(), ...saved };
    for (let order = saved.levelOrder || 1; order < LEVEL_ORDER; order++) {
      if (data.unlocked >= INSERTED_AT[order - 1]) data.unlocked++;
    }
    data.levelOrder = LEVEL_ORDER;
    return data;
  } catch {
    return fresh(); // an unreadable cookie counts as no progress
  }
};

export const Progress = {
  data: read(),

  save() {
    document.cookie = COOKIE + '=' + encodeURIComponent(JSON.stringify(this.data)) +
      '; max-age=' + ONE_YEAR + '; path=/; SameSite=Lax';
  },
  // a level delivered on time: bank the tip, remember the best, open the next level
  levelDone(index, id, tip) {
    this.data.money += tip;
    this.data.best[id] = Math.max(this.data.best[id] || 0, tip);
    this.data.unlocked = Math.max(this.data.unlocked, index + 2);
    this.save();
  },
  owns(carId) {
    return this.data.cars.includes(carId);
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
  complete({ levels, best, cars, money }) {
    this.data.unlocked = Math.max(this.data.unlocked, levels);
    for (const id in best) this.data.best[id] = Math.max(this.data.best[id] || 0, best[id]);
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
    this.save();
  },
};
