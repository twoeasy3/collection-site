import { CONFIG } from './config.js';
import { LEVEL, LEVEL_INDEX, LEVELS, SCREENSAVER_LEVEL, selectLevel, selectSpecial } from './levels.js';
import { Progress } from './progress.js';
import { useLevelCar } from './cars.js';
import { Input } from './input.js';
import { clamp } from './util.js';
import { Track, buildTrack } from './track.js';
import { FxQueue, sfx } from './physics.js';
import { Message } from './messages.js';
import { UfoStrike } from './ufostrike.js';
import { Player } from './player.js';
import { Traffic } from './traffic.js';
import { Collision } from './collision.js';
import { Packages } from './packages.js';
import { Pickups, Targets } from './pickups.js';

// ============================================================================
// GAME STATE
// ============================================================================
export const Game = {
  state: 'start', // start | playing | finished
  evil: false,    // the side picked on the start screen
  inMenu: false,  // a menu other than the start screen is open (the garage)
  paused: false,  // a run (or the screensaver) is frozen: nothing moves until it is resumed
  screensaver: false, // the screensaver is running: no player car, the road goes round and round
  menuLevel: 0,   // the level the menu had picked when the screensaver started, to put back
  outcome: '',    // delivered | late | timeout | busted
  time: 0,        // s since the start
  allowed: 0,     // s on the clock for this run
  shake: 0,    // 1 -> 0, drives the camera shake
  respawn: -1, // s until the helicopter has delivered a new car, -1 = not waiting
  policeApproach: -1, // s until a busted, still-moving car is grabbed, -1 = not busted
  respawnKind: 'wreck', // wreck (new car delivered) | police (same car, held then dropped)
  grabLat: 0,  // where the car was when the helicopter was called
  wrecks: 0,
  busts: 0,
  over: false, // busted out: the police helicopter keeps the car
  loaded: null, // the level whose roads and contents are currently built
  onLoad: [],   // called after a level is loaded (rendering builds its scenery here)
  onFinish: [], // called when a run ends (the menu refreshes its cards)

  // seconds left on the clock; below zero is the tip countdown
  get remaining() { return this.allowed - this.time; },
  // the level's tip: whole until the clock hits zero, then draining to nothing over the tip countdown
  get tip() { return LEVEL.tip * clamp(1 + this.remaining / CONFIG.tipCountdown, 0, 1); },

  // Builds everything that depends on the level: roads, obstacles, pickups, targets, and
  // (through the onLoad hooks, which the rendering modules register) the scenery.
  load() {
    buildTrack();
    Collision.loadLevel();
    Pickups.load();
    Targets.load();
    this.loaded = LEVEL;
    for (const hook of this.onLoad) hook();
  },
  // back to the start screen, which is only a menu: nothing of the level is shown behind it
  toMenu() {
    this.state = 'start';
    this.paused = false;
    if (this.screensaver) { // the menu's own level is picked again
      this.screensaver = false;
      selectLevel(this.menuLevel);
      useLevelCar(LEVEL.car);
    }
    document.body.classList.remove('screensaver');
    resultScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
  },
  // the Exit button during a run or the screensaver: straight back to the menu
  exit() {
    if (this.state === 'playing') this.settleTank(false); // (quitting a run loses its pieces)
    this.toMenu();
    for (const hook of this.onFinish) hook();
  },
  togglePause() {
    if (this.state !== 'playing') return;
    this.paused = !this.paused;
  },
  // the screensaver: its own level, no player car (the camera follows a ghost dolly), no
  // clock and no finish: at the end of the road everything goes round again
  startScreensaver() {
    this.menuLevel = LEVEL_INDEX;
    selectSpecial(SCREENSAVER_LEVEL);
    this.start();
    this.screensaver = true;
    Player.ghost = 1;
    document.body.classList.add('screensaver');
  },
  // from the results screen: on to the next level, on the same side
  nextLevel() {
    if (LEVEL_INDEX + 1 >= LEVELS.length) { this.toMenu(); return; }
    selectLevel(LEVEL_INDEX + 1);
    this.start();
  },
  start() {
    if (this.loaded !== LEVEL) this.load(); // the level is only built when a run on it starts
    useLevelCar(LEVEL.car); // a UFO on the space level, otherwise the garage's car
    Player.evil = this.evil;
    Player.reset();
    Traffic.reset();
    Packages.reset();
    Pickups.reset();
    Targets.reset();
    Collision.resetObstacles();
    FxQueue.length = 0;
    this.time = 0;
    this.allowed = LEVEL.time * CONFIG.timeScale[this.evil ? 'evil' : 'good']; // Good gets longer
    this.outcome = '';
    this.shake = 0;
    this.respawn = -1;
    this.policeApproach = -1;
    this.wrecks = 0;
    this.busts = 0;
    this.over = false;
    this.paused = false;
    this.screensaver = false;
    this.tankPieces = Progress.data.tankPieces || 0; // (the run's own, until it is settled)
    Message.clear();
    UfoStrike.reset();
    this.state = 'playing';
    startScreen.classList.add('hidden');
    resultScreen.classList.add('hidden');
  },
  // Only 'delivered' (over the line with time on the clock) is a pass. Crossing the line
  // during the tip countdown ('late') still fails the level, with whatever tip was left.
  // TANK RAGE pieces at the end of a run: getting to the end keeps the ones found on the way
  // (a delivery, or a late one in the tip countdown), anything else (out of time, busted, a
  // quit) loses them; and a full set, once used, is gone either way
  settleTank(kept) {
    if (this.screensaver) return;
    if (this.tankPieces >= CONFIG.tankPieces) Progress.data.tankPieces = 0;
    else if (kept) Progress.data.tankPieces = this.tankPieces;
    else return;
    Progress.save();
  },
  finish(outcome) {
    this.state = 'finished';
    this.settleTank(outcome === 'delivered' || outcome === 'late');
    this.outcome = outcome;
    sfx(outcome === 'delivered' ? 'win' : 'fail');
    const tip = '$' + this.tip.toFixed(2);
    // delivered on time: the tip goes in the bank and the next level opens
    if (outcome === 'delivered') Progress.levelDone(LEVEL_INDEX, LEVEL.id, this.tip);
    resultTitle.textContent = {
      delivered: 'Delivered!',
      late: 'Too late - level failed',
      timeout: 'Out of time - level failed',
      busted: 'Busted! Game over',
    }[outcome];
    resultTime.textContent = outcome === 'delivered' ? 'Tip ' + tip
      : outcome === 'late' ? 'Tip ' + tip + ' of $' + LEVEL.tip
      : Math.floor(Track.progress(Player.s) * 100) + '% of the way';
    resultNote.textContent = (outcome === 'delivered' ? formatTime(this.remaining) + ' to spare  |  ' : '') +
      (this.evil ? 'Evil' : 'Good') + '  |  Wrecked: ' + this.wrecks + '  |  Busted: ' + this.busts +
      '  |  Bank $' + Progress.data.money.toFixed(2);
    resultScreen.classList[outcome === 'delivered' ? 'remove' : 'add']('failed');
    resultScreen.classList.remove('hidden');
    for (const hook of this.onFinish) hook();
  },
  // the clock keeps running while the helicopter brings a new car: that's the penalty
  updateRespawn(dt) {
    if (this.over) { // game over: the helicopter lifts the car and keeps it
      this.respawn = Math.max(CONFIG.policeHoldTime * 0.5, this.respawn - dt);
      return;
    }
    if (this.respawn < 0) {
      this.respawn = CONFIG.respawnTime;
      this.respawnKind = 'wreck';
      this.wrecks++;
      this.grabLat = Player.lat;
      Player.prepareDrop();
      return;
    }
    this.respawn -= dt;
    if (this.respawn <= 0) {
      this.respawn = -1;
      sfx('drop');
      Player.respawn(this.respawnKind === 'police'); // the police hand back the same damaged car
    }
  },
  // the police helicopter lifts the car, holds it, and drops it back in a lane.
  // The clock keeps running.
  bust() {
    Player.active = false;
    this.respawn = CONFIG.policeHoldTime;
    this.respawnKind = 'police';
    this.busts++;
    this.grabLat = Player.lat;
    if (this.busts >= CONFIG.maxBusts) {
      this.over = true;
      this.finish('busted');
      return;
    }
    Player.prepareDrop();
  },
  update(dt) {
    this.shake = Math.max(0, this.shake - dt / CONFIG.shakeTime);
    if (this.state === 'start' || this.paused) return;
    if (this.screensaver) {
      this.time += dt;
      Player.dolly(dt, this.time);
      if (Player.s >= Track.length) { // round again: the road's s starts from 0
        Player.s -= Track.length;
        Traffic.lap(Track.length);
        Packages.lap(Track.length);
        Collision.resetObstacles();
      }
      Traffic.update(dt);
      Packages.update(dt);
      Collision.updateObstacles(dt);
      Collision.check();
      return;
    }

    const playing = this.state === 'playing';
    if (playing) {
      // in the tip countdown, a tick as each second goes
      if (this.remaining < 0 && Math.floor(-this.remaining) !== Math.floor(-(this.remaining - dt))) sfx('tick');
      this.time += dt;
    }
    // after the finish the car rolls to a stop past the line
    if (Player.active) Player.update(dt, playing ? Input.throttle : 0, playing ? Input.steer : 0, !playing);
    else if (playing || this.over) this.updateRespawn(dt);
    // a police car that sees you on the shoulder busts you on the spot
    if (playing && Player.active && !Player.busted && Player.shield <= 0 &&
        Player.onShoulder && Traffic.policeNear()) Player.bust('seen');
    if (playing && Player.active && Player.busted) {
      // too long on the shoulder: the car is slowed while the police helicopter comes
      // down on it, then it is grabbed
      if (this.policeApproach < 0) sfx('siren');
      this.policeApproach = this.policeApproach < 0 ? CONFIG.policeApproachTime : this.policeApproach - dt;
      if (this.policeApproach <= 0) {
        this.policeApproach = -1;
        this.bust();
      }
    } else {
      this.policeApproach = -1;
    }
    Traffic.update(dt);
    UfoStrike.update(dt);
    Packages.update(dt);
    Pickups.update();
    Collision.updateObstacles(dt);
    Collision.check();

    if (this.state === 'playing') {
      if (Player.active && Track.finished(Player.s)) this.finish(this.remaining >= 0 ? 'delivered' : 'late');
      else if (this.remaining <= -CONFIG.tipCountdown) this.finish('timeout'); // tip countdown ran out
    }
  },
};

export const formatTime = (t) => {
  const a = Math.abs(t), m = Math.floor(a / 60), s = a - m * 60;
  return `${t < 0 ? '-' : ''}${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`;
};

const playing = () => Game.state === 'playing';
Input.on('throw', () => playing() && !Game.paused && !Game.screensaver && Packages.throwOne());
Input.on('confirm', () => !playing() && !Game.inMenu && Game.start());
Input.on('pause', () => Game.togglePause());

const startScreen = document.getElementById('startScreen');
const resultScreen = document.getElementById('resultScreen');
const resultTitle = document.getElementById('resultTitle');
const resultNote = document.getElementById('resultNote');
const resultTime = document.getElementById('resultTime');
// Start Game (and Enter, and Restart) play on the side picked on the menu (Game.evil: see menu.js)
document.getElementById('startBtn').addEventListener('click', () => Input.emit('confirm'));
document.getElementById('restartBtn').addEventListener('click', () => Input.emit('confirm'));
for (const button of document.querySelectorAll('.throw')) button.addEventListener('pointerdown', () => Input.emit('throw'));
