import { CONFIG } from '../config.js';
import { LEVEL } from '../levels.js';
import { Track } from '../track.js';
import { Player } from '../player.js';
import { Packages } from '../packages.js';
import { Game, formatTime } from '../game.js';

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
const throwBtn = document.getElementById('throwBtn');
const hudBanner = document.getElementById('banner');
const hudTurbo = document.getElementById('turbo');
const hudDanger = document.getElementById('danger');
const hudBusts = document.getElementById('busts');
const hudDangerFill = document.getElementById('dangerFill');
const hudFade = document.getElementById('fade');
const runButtons = document.getElementById('runButtons');
const pauseBtn = document.getElementById('pauseBtn');
const BANNERS = {
  paused: 'PAUSED<small>Resume, or press P</small>',
  wreck: 'WRECKED<small>new car on the way</small>',
  'police:shoulder': 'BUSTED<small>too long on the shoulder</small>',
  'police:seen': 'BUSTED<small>the police saw you on the shoulder</small>',
  'police:assault': 'BUSTED<small>the police saw you attack a vehicle</small>',
  'police:bump': 'BUSTED<small>you hit a police car</small>',
};
let bannerKind = '';
const kmh = (ms) => Math.round(ms * 3.6);
// (the HUD is not updated on the menu, so a run's buttons and fade are cleared as it ends)
Game.onFinish.push(() => {
  runButtons.style.display = 'none';
  hudFade.style.opacity = 0;
});
export const updateHud = () => {
  // the clock counts down; below zero is the tip countdown, with the tip draining away
  const left = Game.state === 'start' ? LEVEL.time * CONFIG.timeScale.good : Game.remaining;
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
    if (Player.tank > 0) effects += 'TANK RAGE';
  }
  hudTurbo.textContent = effects;
  throwBtn.style.opacity = Packages.ready ? 1 : 0.4;
  const throwLabel = Player.tank > 0 ? 'FIRE' : 'THROW';
  if (throwBtn.textContent !== throwLabel) throwBtn.textContent = throwLabel;
  let banner = Game.paused ? 'paused' : Game.policeApproach >= 0 ? 'police' : Game.respawn >= 0 ? Game.respawnKind : '';
  if (banner === 'police') banner += ':' + Player.bustReason;
  // pause and exit: shown during a run and the screensaver
  runButtons.style.display = Game.state === 'playing' ? 'flex' : 'none';
  const pauseLabel = Game.paused ? 'Resume' : 'Pause';
  if (pauseBtn.textContent !== pauseLabel) pauseBtn.textContent = pauseLabel;
  // the screensaver fades to black and back where one lap joins the next
  hudFade.style.opacity = Game.screensaver
    ? 1 - Math.min(1, Math.min(Math.abs(Player.s), Math.abs(Track.length - Player.s)) / CONFIG.screensaver.fadeDistance) : 0;
  hudBanner.style.display = banner ? 'block' : 'none';
  if (banner && bannerKind !== banner) {
    bannerKind = banner;
    hudBanner.innerHTML = BANNERS[bannerKind];
  }
  hudBusts.textContent = 'BUSTS ' + Game.busts + ' / ' + CONFIG.maxBusts;
  const danger = Player.danger / CONFIG.dangerTime;
  hudDanger.style.display = Player.active && danger < 1 ? 'block' : 'none';
  hudDangerFill.style.width = danger * 100 + '%';
  const health = Math.max(0, Player.health / Player.maxHealth);
  hudHealth.style.width = health * 100 + '%';
  hudHealth.style.background = health > 0.5 ? '#4caf50' : health > 0.25 ? '#ffd23f' : '#ff3b30';
};
