// ---- start screen: bank, level select, the way into the garage -------------------------------------------
// The start screen is only a menu. Picking a level just marks it; the level is built when
// a run starts (Game.start). Nothing here reloads the page.
import { CONFIG } from '../config.js';
import { LEVELS, LEVEL_INDEX, LEVEL, selectLevel, levelLabel } from '../levels.js';
import { CARS, CAR, SECRET_CARS, useLevelCar, selectCar, stars } from '../cars.js';
import { Progress } from '../progress.js';
import { Game, formatTime, clockFor } from '../game.js';
import { Garage } from './garage.js';
import { Sound } from './audio.js';
import { Input } from '../input.js';

const money = (amount) => '$' + amount.toFixed(2);

// a card is a button with a title and a few lines of small print
// each level's still for its card, by level id (taken with ?cine: see main.js)
const LEVEL_SHOTS = Object.fromEntries(Object.entries(
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
  heading.textContent = title;
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
const levelBox = document.getElementById('levels');
const shopBox = document.getElementById('shop');

const draw = () => {
  bank.textContent = 'Bank ' + money(Progress.data.money);

  levelBox.replaceChildren(...LEVELS.map((level, i) => {
    const open = i < Progress.data.unlocked;
    // (the most time to spare delivering it, on each side)
    const good = Progress.bestTime(level.id, false), evil = Progress.bestTime(level.id, true);
    const spare = (t) => t === undefined ? '-' : formatTime(t);
    return card(levelLabel(i) + '. ' + level.name, open ? [
      'Tip ' + money(level.tip),
      'Clock ' + formatTime(clockFor(level, false)) + ' Good / ' + formatTime(clockFor(level, true)) + ' Evil',
      good === undefined && evil === undefined ? 'Not delivered yet' : 'Best to spare ' + spare(good) + ' Good / ' + spare(evil) + ' Evil',
    ] : ['Locked', 'Deliver level ' + levelLabel(i - 1) + ' on time to open it'], {
      current: i === LEVEL_INDEX,
      disabled: !open,
      onPick: () => { selectLevel(i); useLevelCar(level.car); draw(); },
      image: LEVEL_SHOTS[level.id],
    });
  }));
  // (where the levels are a row to swipe along, the one picked is brought to the middle)
  if (levelBox.scrollWidth > levelBox.clientWidth) {
    const picked = levelBox.querySelector('.current');
    if (picked) levelBox.scrollTo({ left: picked.offsetLeft - (levelBox.clientWidth - picked.offsetWidth) / 2, behavior: 'smooth' });
  }

  shopBox.replaceChildren(card(CAR.name + (CAR.tier ? ' ' + stars(CAR) : ''), [
    'Top speed ' + Math.round(CAR.maxSpeed * 3.6) + ' km/h',
    'Acceleration ' + CAR.accel + '  |  Health ' + CAR.health,
    LEVEL.car ? 'This level is flown in it. The garage car returns on other levels.' : 'Open the garage to change or buy cars',
  ], { current: true, onPick: () => Garage.open(), image: CAR_SHOTS[CAR.id + (Game.evil ? '-evil' : '-good')] }));
  // the side picked, and what it means
  sideBtn.className = 'side-btn ' + (Game.evil ? 'evil' : 'good');
  sideName.textContent = Game.evil ? 'Evil' : 'Good';
  sideNote.textContent = Game.evil
    ? 'Less time. Flaming packages do real damage, and the police bust you for them.'
    : 'More time. Care packages cheer good cars up and barely hurt.';
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
