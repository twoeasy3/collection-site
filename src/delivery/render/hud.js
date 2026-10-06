import { CONFIG } from '../config.js';
import { LEVEL } from '../levels.js';
import { Track } from '../track.js';
import { Player } from '../player.js';
import { Packages } from '../packages.js';
import { Game, formatTime, clockFor } from '../game.js';
import { Message } from '../messages.js';
import { Traffic } from '../traffic.js';

// ---- HUD -------------------------------------------------------------------
const hudTimer = document.getElementById('timer');
const hudProblems = document.getElementById('levelProblems');
Game.onLoad.push(() => {
  hudProblems.textContent = Track.problems.length ? 'Level data problems: ' + Track.problems.join(' | ') : '';
});
const hudTip = document.getElementById('tip');
const hudSpeed = document.getElementById('speed');
const hudProgress = document.getElementById('progressFill');
const hudHealth = document.getElementById('healthFill');
const throwBtns = [...document.querySelectorAll('.throw')]; // (one each side)
const hudBanner = document.getElementById('banner');
const hudTurbo = document.getElementById('turbo');
const hudDanger = document.getElementById('danger');
const hudCopWatch = document.getElementById('copWatch');
const hudBusts = document.getElementById('busts');
const hudDangerFill = document.getElementById('dangerFill');
const hudFade = document.getElementById('fade');
const runButtons = document.getElementById('runButtons');
const pauseBtn = document.getElementById('pauseBtn');
const hudMessages = [...document.querySelectorAll('#messages .line')]; // top, bottom
const shownIds = [0, 0];
const kmh = (ms) => Math.round(ms * 3.6);
// (the HUD is not updated on the menu, so a run's buttons and fade are cleared as it ends)
Game.onFinish.push(() => {
  runButtons.style.display = 'none';
  hudFade.style.opacity = 0;
});
export const updateHud = () => {
  // the clock counts down; below zero is the tip countdown, with the tip draining away
  const left = Game.state === 'start' ? clockFor(LEVEL, false) : Game.remaining;
  const late = left < 0;
  hudTimer.textContent = formatTime(left);
  hudTimer.style.color = hudTip.style.color = late ? '#ff5a4f' : '';
  hudTip.textContent = (late ? 'TIP COUNTDOWN  $' : 'TIP $') + (Game.state === 'start' ? LEVEL.tip : Game.tip).toFixed(2);
  hudSpeed.firstChild.nodeValue = kmh(Player.speed) + ' ';
  hudProgress.style.width = Track.progress(Player.s) * 100 + '%';
  let effects = '';
  if (Player.active) {
    if (Player.turbo > 0) effects += 'TURBO ' + Player.turbo.toFixed(1) + '  ';
    if (Player.ghost > 0) effects += 'GHOST ' + Player.ghost.toFixed(1) + '  ';
    if (Player.passenger > 0) effects += 'PASSENGER ' + Player.passenger.toFixed(1) + '  ';
    if (Player.radar > 0) effects += 'RADAR ' + Player.radar.toFixed(1) + '  ';
    if (Player.siren > 0) effects += 'SIREN ' + Player.siren.toFixed(1) + '  ';
    if (Player.badGas > 0) effects += 'BAD GAS ' + Player.badGas.toFixed(1) + '  ';
    if (Player.heavy > 0) effects += 'HEAVY ' + Player.heavy.toFixed(1) + '  ';
    if (Player.mystery) effects += 'MYSTERY ' + Player.mysteryTime.toFixed(1) + '  ';
    if (Player.tank > 0) effects += 'TANK RAGE';
  }
  hudTurbo.textContent = effects;
  const throwOpacity = Packages.ready ? 1 : 0.4;
  const throwLabel = Player.tank > 0 ? 'FIRE' : 'THROW';
  for (const button of throwBtns) {
    button.style.display = LEVEL.noPackages ? 'none' : '';
    button.style.opacity = throwOpacity;
    if (button.textContent !== throwLabel) button.textContent = throwLabel;
  }
  // pause and exit: shown during a run and the screensaver
  runButtons.style.display = Game.state === 'playing' ? 'flex' : 'none';
  const pauseLabel = Game.paused ? 'Resume' : 'Pause';
  if (pauseBtn.textContent !== pauseLabel) pauseBtn.textContent = pauseLabel;
  // the screensaver fades to black and back where one lap joins the next
  hudFade.style.opacity = Game.screensaver
    ? 1 - Math.min(1, Math.min(Math.abs(Player.s), Math.abs(Track.length - Player.s)) / CONFIG.screensaver.fadeDistance) : 0;
  hudBanner.style.display = Game.paused ? 'block' : 'none'; // (the only banner: paused)
  // the two message lines (see messages.js): each up for its own time, fading away at the end
  const now = performance.now();
  Message.lines.forEach((line, i) => {
    const el = hudMessages[i];
    if (line.id !== shownIds[i]) {
      shownIds[i] = line.id;
      el.textContent = line.text;
      el.className = 'line ' + line.kind;
    }
    const age = (now - line.at) / 1000;
    el.style.opacity = Game.paused || Game.state !== 'playing' || !line.text ? 0
      : Math.min(1, Math.max(0, (line.time - age) / CONFIG.messageFade));
  });
  // (in a race, the player's place in it: one more than the racers ahead)
  hudBusts.textContent = LEVEL.grid
    ? 'POSITION ' + (1 + Traffic.cars.filter(c => c.active && c.racer && Track.along(c.s) > Track.along(Player.s)).length) + ' / ' + (LEVEL.grid.count + 1)
    : 'BUSTS ' + Game.busts + ' / ' + CONFIG.maxBusts;
  // a police car near enough to see what the player does (on the shoulder, a bust on the spot; not
  // on a level without the shoulder rule, nor for a tank, which nobody busts)
  const watched = Game.state === 'playing' && Player.active && !Game.screensaver && LEVEL.shoulderTimer !== false && Player.tank <= 0 && Traffic.policeNear();
  hudCopWatch.style.display = watched ? 'block' : 'none';
  const danger = Player.danger / CONFIG.dangerTime;
  hudDanger.style.display = Player.active && danger < 1 ? 'block' : 'none';
  hudDangerFill.style.width = danger * 100 + '%';
  const health = Math.max(0, Player.health / Player.maxHealth);
  hudHealth.style.width = health * 100 + '%';
  hudHealth.style.background = health > 0.5 ? '#4caf50' : health > 0.25 ? '#ffd23f' : '#ff3b30';
};
