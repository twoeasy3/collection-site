// ============================================================================
// PROGRESS - what the player has earned and unlocked, kept in a cookie so it is still
// there next time. Everything that reads or writes saved progress goes through here, so
// the storage can be swapped (e.g. for Capacitor Preferences) without touching the game.
// ============================================================================
const COOKIE = 'delivery_racer_progress';
const ONE_YEAR = 60 * 60 * 24 * 365;

const fresh = () => ({
  money: 0,        // tips banked
  unlocked: 1,     // how many levels are open, counting from the first
  best: {},        // best tip per level id
  cars: ['hatch'], // ids of the cars owned
  car: 'hatch',    // id of the car in use
  muted: false,    // sound switched off
  touch: null,     // on-screen controls: true / false once chosen on the menu; null = on for touch screens
});

const read = () => {
  try {
    const match = document.cookie.match(new RegExp('(?:^|; )' + COOKIE + '=([^;]*)'));
    return match ? { ...fresh(), ...JSON.parse(decodeURIComponent(match[1])) } : fresh();
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
