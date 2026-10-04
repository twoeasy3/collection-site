// ---- start screen: bank, level select, the way into the garage -------------------------------------------
// The start screen is only a menu. Picking a level just marks it; the level is built when
// a run starts (Game.start). Nothing here reloads the page.
import { CONFIG } from '../config.js';
import { LEVELS, LEVEL_INDEX, LEVEL, selectLevel } from '../levels.js';
import { CAR, useLevelCar } from '../cars.js';
import { Progress } from '../progress.js';
import { Game, formatTime } from '../game.js';
import { Garage } from './garage.js';
import { Sound } from './audio.js';

const money = (amount) => '$' + amount.toFixed(2);

// a card is a button with a title and a few lines of small print
const card = (title, lines, { current = false, disabled = false, onPick } = {}) => {
  const button = document.createElement('button');
  button.className = 'card' + (current ? ' current' : '');
  button.disabled = disabled;
  const heading = document.createElement('strong');
  heading.textContent = title;
  button.appendChild(heading);
  for (const text of lines) {
    const line = document.createElement('span');
    line.textContent = text;
    button.appendChild(line);
  }
  if (onPick) button.addEventListener('click', onPick);
  return button;
};

const bank = document.getElementById('bank');
const levelBox = document.getElementById('levels');
const shopBox = document.getElementById('shop');

const draw = () => {
  bank.textContent = 'Bank ' + money(Progress.data.money);

  levelBox.replaceChildren(...LEVELS.map((level, i) => {
    const open = i < Progress.data.unlocked;
    const best = Progress.data.best[level.id];
    return card((i + 1) + '. ' + level.name, open ? [
      'Tip ' + money(level.tip),
      'Clock ' + formatTime(level.time * CONFIG.timeScale.good) + ' Good / ' +
        formatTime(level.time * CONFIG.timeScale.evil) + ' Evil',
      best === undefined ? 'Not delivered yet' : 'Best tip ' + money(best),
    ] : ['Locked', 'Deliver level ' + i + ' on time to open it'], {
      current: i === LEVEL_INDEX,
      disabled: !open,
      onPick: () => { selectLevel(i); useLevelCar(level.car); draw(); },
    });
  }));

  shopBox.replaceChildren(card(CAR.name, [
    'Top speed ' + Math.round(CAR.maxSpeed * 3.6) + ' km/h',
    'Acceleration ' + CAR.accel + '  |  Health ' + CAR.health,
    LEVEL.car ? 'This level is flown in it. The garage car returns on other levels.' : 'Open the garage to change or buy cars',
  ], { current: true, onPick: () => Garage.open() }));
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

document.getElementById('resetBtn').addEventListener('click', () => {
  if (!confirm('Erase your bank, unlocked levels and cars?')) return;
  Progress.reset();
  selectLevel(0);
  window.dispatchEvent(new Event('carchange')); // (the car in use may have been one that was bought)
  draw();
});

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
