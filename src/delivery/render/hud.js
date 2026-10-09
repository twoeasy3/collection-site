import { CONFIG } from '../config.js';
import { LEVEL } from '../levels.js';
import { Track } from '../track.js';
import { Player } from '../player.js';
import { Packages } from '../packages.js';
import { Game, formatTime, clockFor } from '../game.js';
import { Message } from '../messages.js';
import { Traffic } from '../traffic.js';
import { SpeedCameras } from '../cameras.js';

// ---- HUD -------------------------------------------------------------------
import { Social } from '../social.js';
const hudTimer = document.getElementById('timer');
const hudProblems = document.getElementById('levelProblems');
const hudCamAlert = document.getElementById('camAlert');
const hudCamLimit = document.getElementById('camLimit');
const hudCamDist = document.getElementById('camDist');
const hudCamStatus = document.getElementById('camStatus');
const hudCamArrow = document.getElementById('camArrow');
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
const hudFlat = document.getElementById('flat'), hudFlatFill = document.getElementById('flatFill');
const hudCopWatch = document.getElementById('copWatch');
const hudCopGlow = document.getElementById('copGlow');
const hudTowing = document.getElementById('towing'), hudTowFill = document.getElementById('towFill'), hudTowLabel = document.getElementById('towLabel');
const hudSocial = document.getElementById('social'), hudSocialFill = document.getElementById('socialFill');
const hudBusts = document.getElementById('busts');
// (racing a rival courier, the player's busts, as on any delivery level)
const rivalLine = () => '   BUSTS ' + Game.busts + ' / ' + CONFIG.maxBusts;
// who is coming up behind, at the foot of the screen (see CONFIG.behind): an arrow pointing back
// towards them (tipped and moved over to the side of the road they are on), and how far back they are
const hudBehind = document.getElementById('behind'), hudBehindArrow = hudBehind.querySelector('.arrow');
const hudBehindLabel = document.getElementById('behindLabel');
const syncBehind = (raced) => {
  const B = CONFIG.behind;
  let shown = null;
  if (LEVEL.grid && Game.state === 'playing' && Player.active && !Game.screensaver && !Game.paused) {
    const me = raced(Game.lap, Player.s);
    let gap = LEVEL.grid.rival ? B.rivalRange : B.raceRange;
    for (const c of Traffic.cars) {
      if (!c.racer || !c.active) continue;
      const g = me - raced(c.laps || 0, c.s); // (how far behind the player it is)
      if (g > 0 && g < gap) { gap = g; shown = c; }
    }
    if (shown) {
      const place = 2 + Traffic.cars.filter(c => c.racer && raced(c.laps || 0, c.s) > me).length; // (its place: the one after the player's)
      const across = (shown.lat - Player.lat) * (Track.mirrored ? -1 : 1); // (m to the right of the player, as seen)
      const turn = Math.atan2(across, Math.max(gap, 4));
      hudBehind.style.transform = `translateX(calc(-50% + ${Math.max(-B.slide, Math.min(B.slide, across * B.slidePerM))}px))`;
      hudBehindArrow.style.transform = `rotate(${-turn}rad)`;
      hudBehindLabel.textContent = (LEVEL.grid.rival ? (shown.rivalName || 'rival').toUpperCase() + '  ' : 'P' + place + '  ') + Math.round(gap) + ' m';
      hudBehind.classList.toggle('close', gap < B.close);
      // (a rival in its own colour)
      const tint = shown.markColor ?? (LEVEL.grid.rival ? 0xff2bd6 : null);
      hudBehind.style.setProperty('--tint', tint === null ? '' : '#' + tint.toString(16).padStart(6, '0'));
    }
  }
  hudBehind.style.display = shown ? 'block' : 'none';
};
// upcoming speed camera proximity warning (see CONFIG.speedCamera)
const syncCamAlert = () => {
  if (!hudCamAlert) return;
  if (Game.state !== 'playing' || !Player.active || Game.screensaver || Game.paused) {
    hudCamAlert.classList.add('hidden');
    return;
  }
  const warnDist = CONFIG.speedCamera?.warn || 180;
  let targetCam = null;
  let minGap = Infinity;
  for (let i = 0; i < SpeedCameras.list.length; i++) {
    const cam = SpeedCameras.list[i];
    if (cam.passed || cam.obstacle?.gone) continue;
    const gap = cam.s - Player.s;
    if (gap > 0 && gap <= warnDist && gap < minGap) {
      minGap = gap;
      targetCam = cam;
    }
  }

  if (!targetCam) {
    hudCamAlert.classList.add('hidden');
    return;
  }

  hudCamAlert.classList.remove('hidden');

  const gap = minGap;
  const distM = Math.max(0, Math.round(gap));
  if (hudCamDist) hudCamDist.textContent = `${distM} m`;

  const limitKmh = Math.round(targetCam.limit * 3.6);
  if (hudCamLimit) hudCamLimit.textContent = limitKmh;

  const playerKmh = Math.round(Player.speed * 3.6);
  const over = playerKmh - limitKmh;

  if (hudCamStatus) {
    if (Player.tank > 0) {
      hudCamStatus.textContent = 'RAM IT!';
      hudCamAlert.className = 'active tank';
    } else if (Player.radar > 0) {
      hudCamStatus.textContent = 'RADAR JAMMED';
      hudCamAlert.className = 'active radar';
    } else if (over > 0) {
      hudCamStatus.textContent = `SLOW DOWN (+${over})`;
      hudCamAlert.className = 'active speeding';
    } else {
      hudCamStatus.textContent = 'SPEED OK';
      hudCamAlert.className = 'active safe';
    }
  }

  const camLat = targetCam.obstacle ? targetCam.obstacle.lat : 0;
  const across = (camLat - Player.lat) * (Track.mirrored ? -1 : 1);
  const turn = Math.atan2(across, Math.max(gap, 4));

  const slide = Math.max(-120, Math.min(120, across * 14));
  hudCamAlert.style.transform = `translateX(calc(-50% + ${slide.toFixed(1)}px))`;

  if (hudCamArrow) hudCamArrow.style.transform = `rotate(${turn.toFixed(3)}rad)`;
};
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
  if (hudCamAlert) hudCamAlert.classList.add('hidden');
});
export const updateHud = () => {
  // the clock counts down; below zero is the tip countdown, with the tip draining away
  const left = Game.state === 'start' ? clockFor(LEVEL, false) : Game.remaining;
  const late = left < 0;
  hudTimer.textContent = formatTime(left);
  hudTimer.style.color = hudTip.style.color = late ? '#ff5a4f' : '';
  hudTip.textContent = (late ? 'TIP COUNTDOWN  $' : 'TIP $') + (Game.state === 'start' ? LEVEL.tip : Game.tip).toFixed(2);
  hudSpeed.firstChild.nodeValue = kmh(Player.speed) + ' ';
  hudProgress.style.width = Game.progress * 100 + '%';
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
  hudFade.style.opacity = Game.screensaver && !Game.raceWatch // (not in the race: a circuit has no seam to hide)
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
  // (round a lapped circuit, the laps count first)
  const raced = (laps, s) => (LEVEL.laps ? laps * Track.length : 0) + Track.along(s);
  hudBusts.textContent = LEVEL.grid
    ? 'POSITION ' + (1 + Traffic.cars.filter(c => c.racer && raced(c.laps || 0, c.s) > raced(Game.lap, Player.s)).length) + ' / ' + (LEVEL.grid.count + 1) +
      (LEVEL.laps ? '   LAP ' + Math.min(LEVEL.laps, Game.lap + 1) + ' / ' + LEVEL.laps : '') +
      (LEVEL.grid.rival ? rivalLine() : '')
    : 'BUSTS ' + Game.busts + ' / ' + CONFIG.maxBusts;
  syncBehind(raced);
  syncCamAlert();
  // a police car near enough to see what the player does (on the shoulder, a bust on the spot; not
  // on a level without the shoulder rule, nor for a tank, which nobody busts)
  const watchable = Game.state === 'playing' && Player.active && !Game.screensaver && LEVEL.shoulderTimer !== false && Player.tank <= 0;
  const watched = watchable && Traffic.policeNear();
  hudCopWatch.style.display = watched ? 'block' : 'none';
  // (and the screen's edges flash red and blue, from a little further out: CONFIG.copGlowMargin)
  hudCopGlow.classList.toggle('on', watchable && Traffic.policeNear(CONFIG.copGlowMargin));
  // in a car's slipstream, and how deep in it (a race)
  // (or, just out of it, the slingshot, and how much of it is left)
  const flung = Player.slingTime > 0 && !(Player.tow > 0);
  const towing = Player.active && !Game.screensaver && (Player.tow > 0 || flung);
  hudTowing.style.display = towing ? 'block' : 'none';
  hudTowing.classList.toggle('sling', flung);
  if (towing) {
    hudTowLabel.textContent = flung ? 'SLINGSHOT!' : 'SLIPSTREAM';
    hudTowFill.style.width = (flung ? Player.slingTime / Player.slingTotal : Player.tow) * 100 + '%';
  }
  // a good player's social standing (none on a level with no packages, nor in the screensaver)
  const social = Game.state === 'playing' && Player.active && !Game.screensaver && Social.on && !LEVEL.noPackages;
  hudSocial.style.display = social ? 'block' : 'none';
  if (social) {
    hudSocialFill.style.width = Social.level * 100 + '%';
    hudSocial.classList.toggle('protected', Social.protected);
  }
  const danger = Player.danger / Social.dangerTime;
  hudDanger.style.display = Player.active && danger < 1 ? 'block' : 'none';
  // a flat tyre: stop, and the bar fills as the tyre is changed
  hudFlat.style.display = Player.active && Player.puncture ? 'block' : 'none';
  hudFlatFill.style.width = Math.min(1, (Player.fixing || 0) / CONFIG.puncture.fixTime) * 100 + '%';
  hudDangerFill.style.width = danger * 100 + '%';
  const health = Math.max(0, Player.health / Player.maxHealth);
  hudHealth.style.width = health * 100 + '%';
  hudHealth.style.background = health > 0.5 ? '#4caf50' : health > 0.25 ? '#ffd23f' : '#ff3b30';
};
