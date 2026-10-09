// ---- start screen: bank, level select, the way into the garage -------------------------------------------
// The start screen is only a menu. Picking a level just marks it; the level is built when
// a run starts (Game.start). Nothing here reloads the page.
import { CONFIG } from '../config.js';
import { LEVELS, LEVEL_INDEX, LEVEL, selectLevel, levelLabel, MAIN_LEVELS, setRaceClass, RACE_CLASSES } from '../levels.js';
import { CARS, CAR, SECRET_CARS, useLevelCar, selectCar, earnedFor } from '../cars.js';
import { Progress } from '../progress.js';
import { Game, formatTime, clockFor } from '../game.js';
import { Garage, withStars } from './garage.js';
import { Sound } from './audio.js';
import { Input } from '../input.js';

const money = (amount) => '$' + amount.toFixed(2);

// a card is a button with a title and a few lines of small print
// each level's still for its card, by level id (taken with ?cine: see main.js)
export const LEVEL_SHOTS = Object.fromEntries(Object.entries( // (the postcard album uses them too: render/album.js)
  import.meta.glob('../levelshots/*.jpg', { eager: true, query: '?url', import: 'default' }))
  .map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -4), url]));

// (with an image: the picture across the top of the card, clear of the words, which go below it)
// each car's picture, by car id and side: 'commuter-good', 'commuter-evil' ... (taken with ?cine=car)
const CAR_SHOTS = Object.fromEntries(Object.entries(
  import.meta.glob('../carshots/*.jpg', { eager: true, query: '?url', import: 'default' }))
  .map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -4), url]));

const card = (title, lines, { current = false, disabled = false, onPick, image } = {}) => {
  const button = document.createElement('button');
  button.className = 'card' + (current ? ' current' : '') + (image ? ' shot' : '');
  button.disabled = disabled;
  let words = button;
  if (image) {
    const picture = document.createElement('span');
    picture.className = 'thumb';
    picture.style.backgroundImage = `url("${image}")`;
    words = document.createElement('span');
    words.className = 'words';
    button.append(picture, words);
  }
  const heading = document.createElement('strong');
  heading.replaceChildren(...[].concat(title)); // (words, or nodes: a car's name with its coloured stars)
  words.appendChild(heading);
  for (const text of lines) {
    const line = document.createElement('span');
    line.textContent = text;
    words.appendChild(line);
  }
  if (onPick) button.addEventListener('click', onPick);
  return button;
};

const bank = document.getElementById('bank');
// Good or Evil: picked here (and remembered), played by Start Game
const sideBtn = document.getElementById('sideBtn');
const sideName = document.getElementById('sideName'), sideNote = document.getElementById('sideNote');
Game.evil = !!Progress.data.evil;
const pickSide = (evil) => {
  Game.evil = evil;
  Progress.data.evil = evil;
  Progress.save();
  draw();
};
sideBtn.addEventListener('click', () => pickSide(!Game.evil));
const levelBox = document.getElementById('levels'), groupBox = document.getElementById('levelGroups');
// the levels in groups: the main ones five at a time, and then the special ones five at a time. A button for
// each group; below them, the levels of the group shown (to begin with, the one with the level picked)
const GROUPS = [];
for (let i = 0; i < MAIN_LEVELS.length; i += 5) GROUPS.push([i, Math.min(MAIN_LEVELS.length, i + 5)]);
for (let i = MAIN_LEVELS.length; i < LEVELS.length; i += 5) GROUPS.push([i, Math.min(LEVELS.length, i + 5)]);
const groupOf = (i) => Math.max(0, GROUPS.findIndex(([a, b]) => i >= a && i < b));
let shownGroup = null; // (null: the group with the level picked)
const shopBox = document.getElementById('shop');

const draw = () => {
  bank.textContent = 'Bank ' + money(Progress.data.money);

  const shown = shownGroup ?? groupOf(LEVEL_INDEX), [first, last] = GROUPS[shown];
  groupBox.replaceChildren(...GROUPS.map(([a, b], g) => {
    const button = document.createElement('button');
    button.className = 'level' + (g === shown ? ' current' : '') + (a >= Progress.data.unlocked ? ' locked' : '');
    button.textContent = levelLabel(a) + (b - a > 1 ? '–' + levelLabel(b - 1) : '');
    button.title = a >= Progress.data.unlocked ? 'Not open yet' : '';
    button.addEventListener('click', () => { shownGroup = g; draw(); });
    return button;
  }));
  levelBox.replaceChildren(...LEVELS.slice(first, last).map((level, k) => {
    const i = first + k, open = i < Progress.data.unlocked;
    // (the most time to spare delivering it, on each side)
    const good = Progress.bestTime(level.id, false), evil = Progress.bestTime(level.id, true);
    const spare = (t) => t === undefined ? '-' : formatTime(t);
    const onlyGood = level.battle || level.alwaysGood, prize = earnedFor(level.id);
    return card(levelLabel(i) + '. ' + level.name, open ? [
      'Tip ' + money(level.tip),
      onlyGood ? 'Clock ' + formatTime(clockFor(level, false)) + ' (always Good)' // (the Battlefield: the player is always in the green army)
        : 'Clock ' + formatTime(clockFor(level, false)) + ' Good / ' + formatTime(clockFor(level, true)) + ' Evil',
      onlyGood ? (good === undefined ? 'Not delivered yet' : 'Best to spare ' + spare(good))
        : good === undefined && evil === undefined ? 'Not delivered yet' : 'Best to spare ' + spare(good) + ' Good / ' + spare(evil) + ' Evil',
      // (a special level's 6-star car, and the time to spare that earns it: see cars.js EARNED_CARS)
      ...(prize ? ['6-star car: ' + prize.name + (Progress.earned(prize) ? ' (earned)'
        : ', for ' + formatTime(prize.earned.par.good) + (prize.earned.par.evil === undefined ? '' : ' Good and ' + formatTime(prize.earned.par.evil) + ' Evil') + ' to spare')] : []),
    ] : ['Locked', 'Deliver level ' + levelLabel(i - 1) + ' on time to open it'], {
      current: i === LEVEL_INDEX,
      disabled: !open,
      onPick: () => { selectLevel(i); useLevelCar(level.car); shownGroup = null; draw(); }, // (the groups follow the level picked)
      image: LEVEL_SHOTS[level.id],
    });
  }));
  // (where the levels are a row to swipe along, the one picked is brought to the middle)
  if (levelBox.scrollWidth > levelBox.clientWidth) {
    const picked = levelBox.querySelector('.current');
    if (picked) levelBox.scrollTo({ left: picked.offsetLeft - (levelBox.clientWidth - picked.offsetWidth) / 2, behavior: 'smooth' });
  }

  shopBox.replaceChildren(card(withStars(CAR), [
    'Top speed ' + Math.round(CAR.maxSpeed * 3.6) + ' km/h',
    'Acceleration ' + CAR.accel + '  |  Health ' + CAR.health,
    LEVEL.car ? 'You must use this vehicle on this level. The garage car returns on other levels.' : 'Open the garage to change or buy cars',
  ], { current: true, onPick: () => Garage.open(), image: CAR_SHOTS[CAR.id + (Game.evil && !LEVEL.battle && !LEVEL.alwaysGood ? '-evil' : '-good')] }));
  // the side picked, and what it means
  sideBtn.className = 'side-btn ' + (Game.evil ? 'evil' : 'good');
  sideName.textContent = Game.evil ? 'Evil' : 'Good';
  sideNote.textContent = Game.evil
    ? 'Less time. Flaming packages do real damage, and the police bust you for them.'
    : 'More time. Care packages increase your social standing and gains you benefits.';
};
draw();
// a car picked in the garage shows on its card (unless the level has a vehicle of its own)
window.addEventListener('carchange', () => { useLevelCar(LEVEL.car); draw(); });

// sound on / off: this button, or the M key at any time
const muteBtn = document.getElementById('muteBtn');
const showMute = () => { muteBtn.textContent = 'Sound: ' + (Sound.muted ? 'off' : 'on'); };
const toggleMute = () => { Sound.toggleMute(); showMute(); };
muteBtn.addEventListener('click', toggleMute);
window.addEventListener('keydown', (e) => { if (e.code === 'KeyM' && !e.repeat) toggleMute(); });
showMute();

// auto accelerate on / off: the accelerator is held down by itself, and braking overrides it
const autoGasBtn = document.getElementById('autoGasBtn');
const showAutoGas = () => {
  Input.autoGas = !!Progress.data.autoGas;
  autoGasBtn.textContent = 'Auto accelerate: ' + (Input.autoGas ? 'on' : 'off');
};
autoGasBtn.addEventListener('click', () => {
  Progress.data.autoGas = !Progress.data.autoGas;
  Progress.save();
  showAutoGas();
});
showAutoGas();

// the race class: every race (and the race screensaver) in F1 cars, or in GT road cars
const raceClassBtn = document.getElementById('raceClassBtn');
const showRaceClass = () => {
  const kind = RACE_CLASSES[Progress.data.raceClass] ? Progress.data.raceClass : 'f1';
  setRaceClass(kind);
  useLevelCar(LEVEL.car); // (a race level picked: its car is the class's)
  raceClassBtn.textContent = 'Race cars: ' + RACE_CLASSES[kind];
};
// the race screensaver's circuit: one of the lapped levels, or each of them in turn
const raceTrackBtn = document.getElementById('raceTrackBtn');
const raceTracks = () => [...LEVELS.filter(l => l.laps).map(l => l.id), 'all'];
const showRaceTrack = () => {
  const level = LEVELS.find(l => l.laps && l.id === Progress.data.raceTrack);
  raceTrackBtn.textContent = 'Race track: ' + (level ? level.name : 'All in turn');
};
raceTrackBtn.addEventListener('click', () => {
  const tracks = raceTracks(), at = tracks.indexOf(Progress.data.raceTrack);
  Progress.data.raceTrack = tracks[(at < 0 ? tracks.length - 1 : at + 1) % tracks.length]; // (an unknown one counts as 'all')
  Progress.save();
  showRaceTrack();
});
showRaceTrack();
raceClassBtn.addEventListener('click', () => {
  const kinds = Object.keys(RACE_CLASSES);
  Progress.data.raceClass = kinds[(kinds.indexOf(Progress.data.raceClass) + 1) % kinds.length];
  Progress.save();
  showRaceClass();
  draw();
});
showRaceClass();
draw();

// a complete savegame, written to the progress cookie like any other progress
document.getElementById('completeBtn').addEventListener('click', () => {
  if (!confirm('Open every level, buy every car and fill the bank?')) return;
  Progress.complete({
    levels: LEVELS.length,
    cars: CARS.map(car => car.id),
    money: CONFIG.completeBank,
  });
  draw();
});

// a secret: typing B U S on the start screen puts you in a city bus. It is yours from then
// on (pick another car in the garage to get out of it; Reset progress takes it away).
{
  let typed = '';
  window.addEventListener('keydown', (e) => {
    if (Game.state !== 'start' || Game.inMenu || e.repeat || e.key.length !== 1) return;
    typed = (typed + e.key.toLowerCase()).slice(-3);
    if (typed !== 'bus') return;
    typed = '';
    Progress.buy(SECRET_CARS.bus);
    selectCar('bus');
    Sound.play('mystery');
    window.dispatchEvent(new Event('carchange'));
  });
}

document.getElementById('resetBtn').addEventListener('click', () => {
  if (!confirm('Erase your bank, unlocked levels and cars?')) return;
  Progress.reset();
  selectLevel(0);
  window.dispatchEvent(new Event('carchange')); // (the car in use may have been one that was bought)
  showAutoGas(); // (a reset forgets the choice)
  showRaceClass();
  draw();
});

// the screensaver: the chaos level with no player car, round and round until Exit
document.getElementById('screensaverBtn').addEventListener('click', () => Game.startScreensaver());
// ...and the race screensaver: a race round a circuit, watched
document.getElementById('raceWatchBtn').addEventListener('click', () => Game.startRaceWatch());
// pause and exit, during a run or the screensaver
document.getElementById('pauseBtn').addEventListener('click', () => Game.togglePause());
document.getElementById('exitBtn').addEventListener('click', () => Game.exit());

// results screen buttons
const next = document.getElementById('nextBtn');
document.getElementById('menuBtn').addEventListener('click', () => { Game.toMenu(); draw(); });
next.addEventListener('click', () => Game.nextLevel());
// when a run ends: the bank and the unlocked levels may have changed, and "Next level"
// is only offered if there is one
Game.onFinish.push(() => {
  next.style.display = LEVEL_INDEX + 1 < LEVELS.length ? '' : 'none';
  draw();
});
