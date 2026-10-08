import { CONFIG } from './config.js';
import { LEVEL, LEVEL_INDEX, LEVELS, SCREENSAVER_LEVEL, selectLevel, selectSpecial } from './levels.js';
import { Progress } from './progress.js';
import { useLevelCar, returnCar } from './cars.js';
import { Input } from './input.js';
import { clamp } from './util.js';
import { Track, buildTrack } from './track.js';
import { FxQueue, sfx } from './physics.js';
import { Message } from './messages.js';
import { UfoStrike } from './ufostrike.js';
import { BulletTrain } from './bullettrain.js';
import { Tide } from './tide.js';
import { SpeedCameras } from './cameras.js';
import { Crossings } from './crossing.js';
import { StopGo } from './stopgo.js';
import { Hippos } from './hippos.js';
import { Elephants } from './elephants.js';
import { Wreckage } from './wreckage.js';
import { Machinery } from './machinery.js';
import { Gunfire } from './gunfire.js';
import { RaceWatch } from './racewatch.js';
import { Site } from './site.js';
import { Social } from './social.js';
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
  raceWatch: false,   // ...the second screensaver: a race, watched (see racewatch.js)
  raceCount: 0,       // races watched since it started (all round Marina Bay)
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

  // how far through the run the player is, 0 .. 1 (on a lapped level, all its laps)
  get progress() { return LEVEL.laps ? (this.lap + Track.progress(Player.s)) / LEVEL.laps : Track.progress(Player.s); },
  // seconds left on the clock; below zero is the tip countdown
  get remaining() { return this.allowed - this.time; },
  // the level's tip: whole until the clock hits zero, then draining to nothing over the tip countdown
  // (and every rival that delivers first takes its share: with one, all of it)
  get tip() { return LEVEL.tip * (LEVEL.grid?.rival ? 1 - (this.rivalsIn || 0) / LEVEL.grid.count : 1) * clamp(1 + this.remaining / CONFIG.tipCountdown, 0, 1); },

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
    returnCar(); // (a car lent by Car Swap goes back)
    if (this.screensaver) { // the menu's own level is picked again
      this.screensaver = false;
      this.raceWatch = false;
      document.body.classList.remove('racewatch');
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
  // the race screensaver: a race on a circuit, no player car, watched (and the next, once it is over)
  startRaceWatch() {
    if (!this.screensaver) { this.menuLevel = LEVEL_INDEX; this.raceCount = 0; }
    // (on the circuit picked on the menu, or on each of them in turn: see Progress.data.raceTrack)
    const circuits = LEVELS.filter(l => l.laps);
    selectSpecial(circuits.find(l => l.id === Progress.data.raceTrack) || circuits[this.raceCount % circuits.length]);
    this.raceCount++;
    this.start();
    this.screensaver = true;
    this.raceWatch = true;
    Player.active = false; // (out of play: it only follows the watched car about, see RaceWatch)
    Player.ghost = 1;
    document.body.classList.add('screensaver', 'racewatch');
    RaceWatch.begin();
  },
  // from the results screen: on to the next level, on the same side
  nextLevel() {
    if (LEVEL_INDEX < 0 || LEVEL_INDEX + 1 >= LEVELS.length) { this.toMenu(); return; } // (a hidden level has no next)
    selectLevel(LEVEL_INDEX + 1);
    this.start();
  },
  start() {
    // a rival courier (?rival: an experiment): on a delivery level (not a circuit), a race of one
    // other car, the player's own kind, from the start line to the drop. 'evil', 'good', or
    // 'opposite' (the other side to the player's)
    const rivalSide = LEVEL.rival || this.rival;
    if (rivalSide && !LEVEL.laps && (!LEVEL.grid || LEVEL.grid.rival)) {
      const evil = rivalSide === 'evil' || (rivalSide === 'opposite' && !this.evil);
      const rivals = (LEVEL.rivals || [{}]).slice(0, CONFIG.rival.most);
      LEVEL.grid = { count: rivals.length, rival: true, rivals, evil, from: 6, gap: 9, pace: CONFIG.rival.pace };
    } else if (!rivalSide && LEVEL.grid?.rival) delete LEVEL.grid;
    this.rivalsIn = 0;          // rivals over the line before the player
    this.rivalAhead = new Map(); // for each, whether it was ahead of the player when last looked
    if (this.loaded !== LEVEL) this.load(); // the level is only built when a run on it starts
    useLevelCar(LEVEL.car); // a UFO on the space level, otherwise the garage's car
    Player.evil = this.evil && !LEVEL.battle; // (on the Battlefield the player is in the green army, the good one, whatever the side on the menu)
    Social.reset(); // (before the player: its shoulder allowance goes by it)
    Player.reset();
    Wreckage.reset(); // (before the traffic is dealt out: none goes where wreckage lies)
    Traffic.reset();
    Packages.reset();
    Pickups.reset();
    Targets.reset();
    Collision.resetObstacles();
    FxQueue.length = 0;
    this.time = 0;
    this.allowed = clockFor(LEVEL, this.evil); // (Good gets longer)
    this.outcome = '';
    this.shake = 0;
    this.respawn = -1;
    this.policeApproach = -1;
    this.wrecks = 0;
    this.busts = 0;
    this.cash = 0;    // $ of cash pickups collected this run (banked with the tip on delivery)
    this.fines = 0;   // $ of speeding fines this run (taken off what it banks: see SpeedCameras)
    this.over = false;
    this.paused = false;
    this.screensaver = false;
    this.raceWatch = false;
    this.tankPieces = Progress.data.tankPieces || 0; // (the run's own, until it is settled)
    this.zone = null; // the level zone the player is in (see update)
    this.inFog = false; // in a fog bank (see update)
    this.lap = 0;     // laps done, on a lapped level ("laps")
    Message.clear();
    UfoStrike.reset();
    BulletTrain.reset();
    Tide.reset();
    Hippos.reset();
    Elephants.reset();
    Machinery.reset();
    Gunfire.reset();
    Site.reset();
    SpeedCameras.reset();
    Crossings.reset();
    StopGo.reset();
    if (LEVEL.battle) Message.say('events', 'battle');
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
    if (this.screensaver || LEVEL_INDEX < 0) return; // (nor on a hidden level: see HIDDEN_LEVELS)
    if (this.tankPieces >= CONFIG.tankPieces) Progress.data.tankPieces = 0;
    else if (kept) Progress.data.tankPieces = this.tankPieces;
    else return;
    Progress.save();
  },
  finish(outcome) {
    this.state = 'finished';
    returnCar(); // (a car lent by Car Swap goes back: the results are the player's own car's)
    this.settleTank(outcome === 'delivered' || outcome === 'late');
    this.outcome = outcome;
    sfx(outcome === 'delivered' ? 'win' : 'fail');
    const tip = '$' + this.tip.toFixed(2);
    // delivered on time: the tip goes in the bank, the time to spare may be a best, and the next level opens
    // (a hidden level, off the menu, banks nothing and records nothing: see HIDDEN_LEVELS)
    const record = outcome === 'delivered' && LEVEL_INDEX >= 0 && Progress.levelDone(LEVEL_INDEX, LEVEL.id, Math.max(0, this.tip + this.cash - this.fines), this.remaining, this.evil);
    resultTitle.textContent = {
      delivered: !LEVEL.grid?.rival ? 'Delivered!'
        : !this.rivalsIn ? (LEVEL.grid.count > 1 ? 'Delivered first - you beat them all!' : 'Delivered - you beat your rival!')
        : LEVEL.grid.count > 1 ? 'Delivered - ' + ['1st', '2nd', '3rd', '4th'][this.rivalsIn] + ' of ' + (LEVEL.grid.count + 1)
        : 'Delivered - but your rival got there first',
      late: 'Too late - level failed',
      timeout: 'Out of time - level failed',
      busted: 'Busted! Game over',
    }[outcome];
    resultTime.textContent = outcome === 'delivered' ? 'Tip ' + tip + (this.cash ? ' + $' + this.cash + ' cash' : '') + (this.fines ? ' - $' + this.fines + ' fines' : '')
      : outcome === 'late' ? 'Tip ' + tip + ' of $' + LEVEL.tip
      : Math.floor(this.progress * 100) + '% of the way';
    resultNote.textContent = (outcome === 'delivered' ? formatTime(this.remaining) + ' to spare' +
      (LEVEL_INDEX < 0 ? ' (test run: nothing saved)' : record ? ' (new best)' : ' (best ' + formatTime(Progress.bestTime(LEVEL.id, this.evil)) + ')') + '  |  ' : '') +
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
    if (this.raceWatch) { // the race screensaver: only the race
      this.time += dt;
      Traffic.update(dt);
      RaceWatch.update(dt);
      Collision.updateObstacles(dt);
      Collision.check();
      FxQueue.length = Math.min(FxQueue.length, 40); // (no more than the frame can play)
      return;
    }
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
    // (on a left-hand level, shown mirrored, steering left on screen is steering right in the game's own terms)
    const steer = playing ? Input.steer * (Track.mirrored ? -1 : 1) : 0;
    if (Player.active) Player.update(dt, playing ? Input.throttle : 0, steer, !playing);
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
    // coming into a zone of the level: its welcome (messages.json: zones)
    if (playing && Player.active) {
      const zone = Track.zoneAt(Player.s);
      if (zone && zone !== this.zone) Message.say('zones', zone.id);
      if (zone) this.zone = zone;
      // driving into a fog bank (a level's "fog"): said as it starts to close in
      const fog = Track.foggy(Player.s) > 0;
      if (fog && !this.inFog) Message.say('events', 'fog');
      this.inFog = fog;
    }
    if (playing) Crossings.update(dt);
    StopGo.update(dt);
    Traffic.update(dt);
    if (playing) SpeedCameras.update(dt);
    UfoStrike.update(dt);
    BulletTrain.update(dt);
    if (playing) Tide.update(dt);
    if (playing) Hippos.update(dt);
    if (playing) Elephants.update(dt);
    if (playing) Wreckage.update(dt);
    if (playing) Machinery.update(dt);
    if (playing) Gunfire.update(dt);
    if (playing) Site.update(dt);
    if (playing) Social.update(dt);
    Packages.update(dt);
    Pickups.update();
    Collision.updateObstacles(dt);
    Collision.check();

    if (this.state === 'playing') {
      // a lapped level: over the line, a lap done, and round again (the pickups back out), until the last
      if (LEVEL.laps && Player.active && Track.finished(Player.s) && this.lap < LEVEL.laps - 1) {
        this.lap++;
        Player.s -= Track.length;
        Pickups.reset();
        Message.say('events', this.lap === LEVEL.laps - 1 ? 'finalLap' : 'lap');
      }
      // rival couriers: who is ahead, said as it changes, and who got there first
      if (LEVEL.grid?.rival) {
        for (const rival of Traffic.cars.filter(c => c.racer)) {
          if (rival.done && !rival.counted) {
            rival.counted = true;
            this.rivalsIn++;
            sayRival(LEVEL.grid.count === 1 ? 'rivalIn' : this.rivalsIn === LEVEL.grid.count ? 'rivalInAll' : 'rivalInMany', rival);
          } else if (rival.active && !rival.done) {
            const ahead = rival.s > Player.s, was = this.rivalAhead.get(rival);
            if (was !== undefined && ahead !== was) sayRival(ahead ? 'rivalPassed' : 'rivalBeaten', rival);
            this.rivalAhead.set(rival, ahead);
          }
        }
      }
      if (Player.active && Track.finished(Player.s)) this.finish(this.remaining >= 0 ? 'delivered' : 'late');
      else if (this.remaining <= -CONFIG.tipCountdown) this.finish('timeout'); // tip countdown ran out
    }
  },
};

// a message about a rival courier, by its name ("your rival" if it has none)
export const sayRival = (key, rival, ...more) => {
  const line = Message.say('events', key, ...more);
  if (line) line.text = line.text.replace(/\$\{name\}/g, rival.rivalName || 'your rival').replace(/^./, (c) => c.toUpperCase());
  return line;
};
// seconds on the clock for a level, for a side: its own "clock" if it has one, or else its time scaled
export const clockFor = (level, evil) => {
  const side = evil ? 'evil' : 'good';
  return level.clock ? level.clock[side] : level.time * CONFIG.timeScale[side];
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
