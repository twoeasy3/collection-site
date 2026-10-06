// ---- sound: the WAVs in ../sounds, with synthesised stand-ins ----------------------------------
// Game logic asks for a sound by pushing { type: 'sound', name, volume, s } onto FxQueue (see
// sfx() / sfxAt() in physics.js); effects.js passes those here, quieter the further away `s` is,
// and plays 'explode' / 'explodeBig' / 'burst' / 'gift' for its own visual effects. Each name
// plays a WAV from SAMPLES, and a name with no file there ('' or left out) is silent. Until a
// file has loaded, a name that has a synthesised version in SYNTH plays that instead.
// Loops fed every frame from main.js: the engine (its WAV picked by the car, pitched by speed),
// the police siren, the helicopter and the frog.
// Browsers only allow sound after the player has clicked or pressed a key, so nothing is
// set up (or loaded) until then. M mutes; the choice is saved with the player's progress.
import { CONFIG } from '../config.js';
import { Progress } from '../progress.js';

let ctx = null, master = null, noiseBuffer = null;
let nextBeep = 0; // when the shoulder's danger meter next beeps
let engine = null; // { osc, lfo, lfoGain, filter, gain }: the synthesised engine
let siren = null;  // { gain }: a synthesised police siren, silent until Sound.siren(true)
let radarOn = false; // (a police car near enough to bust the player, last frame)
const lastPlayed = {};

// every WAV in ../sounds, by file name without the extension: { 'Cash': url, ... }
const URLS = Object.fromEntries(Object.entries(
  import.meta.glob('../sounds/*.wav', { eager: true, query: '?url', import: 'default' }))
  .map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -4), url]));
// big files, fetched only once something asks for them
const LAZY = new Set(['Lowrider', 'Lowrider 2']);
const buffers = {}, loading = {};
const load = (file) => {
  if (!ctx || loading[file] || !URLS[file]) return;
  loading[file] = fetch(URLS[file]).then(r => r.arrayBuffer()).then(data => ctx.decodeAudioData(data))
    .then(buffer => { buffers[file] = buffer; })
    .catch(() => {}); // (a file that won't load leaves its synthesised stand-in playing)
};

// ---- which WAV each sound plays ----------------------------------------------------------------
// a file name; [names] = one of them at random; { seq: [names] } = each in turn; '' = silent
const SAMPLES = {
  throw: 'Package Throw',
  gift: '',                 // a gift lands
  burst: 'Explosion Small',             // an evil package lands
  explode: ['Crash 1', 'Head On Collision'],  // an obstacle, or a light vehicle wrecked
  explodeBig: ['Crash 1', 'Head On Collision'], // a heavy vehicle wrecked
  crash: ['Short Crash with Glass', 'Collide1'],
  crashHard: ['Crash 1', 'Short Crash Side Swipe', 'Collide1'],       // an impact of CONFIG.hardCrash or more
  sideswipe: 'Short Crash Side Swipe',
  headOn: 'Head On Collision',
  heavy: ['Crash 1', 'Head On Collision'],    // TANK RAGE flattening something
  cannon: 'Tank Fire',
  tank: 'Tank Rage',
  tankPiece: 'Tank Rage Build', // a piece of the tank found (the fifth: tank)
  radarDetector: 'Radar',       // the radar detector picked up
  turbo: 'Supercharge',         // pickups, by type
  ghost: 'Ghost',
  wrench: 'Wrench',
  passenger: 'Inflatableguy',
  badGas: 'Bad Gas',
  heavyMass: 'Heavy',
  timePlus: 'Time Plus',
  timeMinus: 'Time Minus',
  siren: { seq: ['Police Siren', 'Police Siren', 'Police Siren'] }, // busted
  radar: '',               // a police car comes into sight
  tick: '',           // each second of the tip countdown
  win: '',
  fail: '',                     // the level failed
  drop: 'Collide1',              // the helicopter sets a car down
  screech: 'Tire Screech 1',      // a car near the player spins out
  brake: 'Tire Screech',      // the player's car brakes hard for a car ahead
  horn: 'Compact Car Horn 1',   // horns, by vehicle kind (see Traffic)
  hornSmall: ['Compact Car Horn 3','Big Rig Horn 1',,'Fire Truck Horn','Compact Car Horn 1'],
  hornBig: ['Compact Car Horn 3','Big Rig Horn 1',,'Fire Truck Horn','Compact Car Horn 1'],
  hornBus: ['Compact Car Horn 3','Big Rig Horn 1',,'Fire Truck Horn','Compact Car Horn 1'],
  passBy: ['Compact Car Horn 3','Big Rig Horn 1',,'Fire Truck Horn','Compact Car Horn 1', 'Horn Doppler Pass By'], // an oncoming car honks as it goes by
  mystery: 'Mystery',           // the secret bus
  trainHorn: { seq: ['Big Rig Horn 1', 'Big Rig Horn 1'] }, // the bullet train sets off up the road...
  trainPass: 'Horn Doppler Pass By', // ...and goes by the player
};
// the engine WAV for each car by id ('tank' is also any car in TANK RAGE), and its playback
// rate at a standstill and at the car's top speed; fixed = always at its own pitch. With more
// than one file, each run picks one. Every engine WAV is evened out to ENGINE_LOUDNESS at full
// speed however loud it was recorded; volume (default 1) makes one car louder or quieter than that.
const ENGINE_LOUDNESS = 0.2; // average level (root mean square) at full speed; a crash is about 0.14
const ENGINE_IDLE = 0.6;     // share of that at a standstill
const ENGINES = {
  hatch: { files: ['Engine Rev 1'], idle: 0.7, top: 1.5 },
  junker: { files: ['Engine Rev 1'], idle: 0.6, top: 1.2 },
  coupe: { files: ['Truck Engine'], idle: 0.7, top: 1.25 }, // (the Darkvan)
  lowrider: { files: ['Lowrider', 'Lowrider 2'], fixed: true },
  wagon: { files: ['Truck Engine'], idle: 0.8, top: 1.4 },
  sport: { files: ['Engine Sports Car 5'], idle: 0.7, top: 1.6 },
  lovebus: { files: ['Truck Engine'], idle: 0.7, top: 1.3 },
  bus: { files: ['Truck Engine'], idle: 0.6, top: 1.1 },
  tank: { files: ['Tank Engine'], idle: 0.7, top: 1.3 },
  ufo: { files: ['UFO'], idle: 0.8, top: 1.4 },
};
const pick = (list) => list[Math.floor(Math.random() * list.length)];
// how loud a loaded WAV is on average (root mean square of its first channel), worked out once
const rms = {};
const loudness = (file) => {
  if (rms[file] === undefined) {
    const data = buffers[file].getChannelData(0);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
    rms[file] = Math.sqrt(sum / data.length) || 1;
  }
  return rms[file];
};

const setup = () => {
  if (ctx) return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  ctx = new AudioCtx();
  master = ctx.createGain();
  master.gain.value = Progress.data.muted ? 0 : 0.5;
  master.connect(ctx.destination);
  for (const file in URLS) if (!LAZY.has(file)) load(file);

  // a second of white noise, reused by every hiss, whoosh and bang
  noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const samples = noiseBuffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;

  // the engine: one oscillator that runs all the time, silent until Sound.engine() opens it up
  const osc = ctx.createOscillator(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
  const lfo = ctx.createOscillator(), lfoGain = ctx.createGain(); // a wobble, for the UFO
  osc.type = 'sawtooth';
  filter.type = 'lowpass';
  filter.frequency.value = 500;
  gain.gain.value = 0;
  lfo.frequency.value = 9;
  lfoGain.gain.value = 0;
  lfo.connect(lfoGain).connect(osc.frequency);
  osc.connect(filter).connect(gain).connect(master);
  osc.start();
  lfo.start();
  engine = { osc, lfo, lfoGain, filter, gain };

  // the siren: a tone flipped between two pitches twice a second
  const wail = ctx.createOscillator(), flip = ctx.createOscillator();
  const depth = ctx.createGain(), level = ctx.createGain();
  wail.type = 'square';
  wail.frequency.value = 720;
  flip.type = 'square';
  flip.frequency.value = 2;
  depth.gain.value = 100; // 620 Hz <-> 820 Hz
  level.gain.value = 0;
  flip.connect(depth).connect(wail.frequency);
  wail.connect(level).connect(master);
  wail.start();
  flip.start();
  siren = { gain: level };
};
const unlock = () => {
  setup();
  if (ctx && ctx.state === 'suspended') ctx.resume();
};
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);

// ---- building blocks ---------------------------------------------------------------------------
// a note that slides from `from` Hz to `to` Hz and fades out
const tone = (from, to, seconds, volume, type = 'sine', delay = 0) => {
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + seconds);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + seconds);
  osc.connect(gain).connect(master);
  osc.start(t);
  osc.stop(t + seconds + 0.02);
};
// a burst of filtered noise whose filter slides from `from` Hz to `to` Hz
const noise = (from, to, seconds, volume, kind = 'lowpass', delay = 0) => {
  const t = ctx.currentTime + delay;
  const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
  source.buffer = noiseBuffer;
  source.loop = true;
  filter.type = kind;
  filter.frequency.setValueAtTime(from, t);
  filter.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + seconds);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + seconds);
  source.connect(filter).connect(gain).connect(master);
  source.start(t, Math.random());
  source.stop(t + seconds + 0.02);
};
// a loaded WAV, once; returns how long it plays for
const sample = (file, volume, delay = 0, rate = 1) => {
  const source = ctx.createBufferSource(), gain = ctx.createGain();
  source.buffer = buffers[file];
  source.playbackRate.value = rate;
  gain.gain.value = volume;
  source.connect(gain).connect(master);
  source.start(ctx.currentTime + delay);
  return buffers[file].duration / rate;
};
// a WAV that loops for as long as it is wanted: set() it every frame with a volume (0 = silent)
// and a playback rate. Returns false while the file has yet to load.
const loop = () => ({
  file: null, source: null, gain: null,
  set(file, volume, rate = 1) {
    if (!ctx) return false;
    const now = ctx.currentTime;
    if (!this.gain) {
      this.gain = ctx.createGain();
      this.gain.gain.value = 0;
      this.gain.connect(master);
    }
    if (file !== this.file) {
      if (volume > 0) load(file);
      if (!buffers[file]) {
        this.gain.gain.setTargetAtTime(0, now, 0.05);
        return false;
      }
      if (this.source) this.source.stop();
      this.source = ctx.createBufferSource();
      this.source.buffer = buffers[file];
      this.source.loop = true;
      this.source.playbackRate.value = rate;
      this.source.connect(this.gain);
      this.source.start();
      this.file = file;
    }
    this.source.playbackRate.setTargetAtTime(rate, now, 0.08);
    this.gain.gain.setTargetAtTime(volume, now, 0.12);
    return true;
  },
  // cut off now; the next set() starts the file from the beginning
  stop() {
    if (this.source) this.source.stop();
    this.source = null;
    this.file = null;
  },
});
const engineLoop = loop(), sirenLoop = loop(), heliLoop = loop(), frogLoop = loop(), warnLoop = loop(), ufoLoop = loop(), lowriderLoop = loop();
let engineCar = null, engineFile = null; // the car the engine loop was picked for, and its WAV

// ---- the synthesised stand-ins: (volume 0..1) => void --------------------------------------------
const SYNTH = {
  throw: (v) => noise(600, 2400, 0.16, 0.35 * v, 'bandpass'),                       // a whoosh
  gift: (v) => { tone(880, 880, 0.09, 0.2 * v); tone(1320, 1320, 0.16, 0.2 * v, 'sine', 0.08); }, // a two-note chime
  burst: (v) => { noise(1800, 200, 0.25, 0.4 * v); tone(160, 60, 0.2, 0.3 * v); },   // a small fiery pop
  explode: (v) => { noise(1400, 60, 0.7, 0.7 * v); tone(110, 28, 0.6, 0.6 * v); },   // a boom
  crash: (v) => { noise(900, 300, 0.14, 0.6 * v, 'bandpass'); tone(130, 70, 0.12, 0.4 * v, 'square'); }, // a metal thud
  cannon: (v) => { tone(90, 30, 0.35, 0.8 * v); noise(2500, 300, 0.2, 0.5 * v); },
  pickup: (v) => [660, 880, 1100].forEach((f, i) => tone(f, f, 0.1, 0.2 * v, 'triangle', i * 0.06)),
  turbo: (v) => { tone(220, 1100, 0.45, 0.25 * v, 'sawtooth'); noise(400, 3000, 0.45, 0.2 * v, 'bandpass'); },
  tank: (v) => [55, 82.5, 110].forEach((f) => tone(f, f * 0.98, 1.1, 0.3 * v, 'sawtooth')), // a low power chord
  siren: (v) => { for (let i = 0; i < 4; i++) tone(i % 2 ? 620 : 820, i % 2 ? 620 : 820, 0.22, 0.16 * v, 'square', i * 0.22); },
  tick: (v) => tone(1000, 1000, 0.06, 0.25 * v, 'square'),
  win: (v) => [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.28, 0.22 * v, 'triangle', i * 0.12)),
  fail: (v) => [392, 330, 262, 196].forEach((f, i) => tone(f, f * 0.97, 0.32, 0.22 * v, 'sawtooth', i * 0.16)),
};
Object.assign(SYNTH, {
  explodeBig: SYNTH.explode, crashHard: SYNTH.crash, sideswipe: SYNTH.crash, headOn: SYNTH.crash, heavy: SYNTH.crash,
  ghost: SYNTH.pickup, wrench: SYNTH.pickup, passenger: SYNTH.pickup, badGas: SYNTH.pickup, heavyMass: SYNTH.pickup,
  timePlus: SYNTH.pickup, timeMinus: SYNTH.pickup,
  // the bullet train: a long two-note horn, and a rushing roar as it goes by
  trainHorn: (v) => [311, 370].forEach((f) => tone(f, f * 0.97, 1.4, 0.18 * v, 'sawtooth')),
  trainPass: (v) => { noise(300, 2600, 0.9, 0.6 * v, 'bandpass'); tone(370, 250, 0.9, 0.2 * v, 'sawtooth'); },
});

export const Sound = {
  play(name, volume = 1) {
    if (!ctx || ctx.state !== 'running' || volume <= 0.02) return;
    // the same sound many times in an instant (a pile-up) would just be a loud click
    if (ctx.currentTime - (lastPlayed[name] || -1) < 0.05) return;
    const entry = SAMPLES[name], v = Math.min(1, volume);
    if (!entry) return; // no file for it ('' or left out): silent
    const files = typeof entry === 'string' ? [entry] : Array.isArray(entry) ? [pick(entry)] : entry.seq;
    if (files.every(f => buffers[f])) {
      let at = 0;
      for (const f of files) at += sample(f, v, at);
    } else if (SYNTH[name]) {
      SYNTH[name](v);
    } else {
      return;
    }
    lastPlayed[name] = ctx.currentTime;
  },
  // speed in m/s, or a negative number for silence. car: the car's id in ENGINES ('tank' while
  // in TANK RAGE); top: its top speed, which sets how high the engine is pitched
  engine(speed, car = 'hatch', top = 30) {
    if (!engine) return;
    const now = ctx.currentTime, on = speed >= 0;
    const e = ENGINES[car] || ENGINES.hatch;
    if (on && car !== engineCar) { // a new car, or one that has just gone into TANK RAGE
      engineCar = car;
      engineFile = pick(e.files);
    }
    if (!on) engineCar = null; // (so the next run picks again)
    const pace = Math.min(1.5, Math.max(0, speed) / top);
    const rate = e.fixed ? 1 : e.idle + (e.top - e.idle) * pace;
    const even = buffers[engineFile] ? Math.min(4, ENGINE_LOUDNESS / loudness(engineFile)) : 1;
    const volume = !on ? 0 : even * (e.volume || 1) * (e.fixed ? 1 : ENGINE_IDLE + (1 - ENGINE_IDLE) * Math.min(1, pace));
    if (engineFile && engineLoop.set(engineFile, volume, rate)) {
      engine.gain.gain.setTargetAtTime(0, now, 0.05);
      return;
    }
    // (until its WAV has loaded, the synthesised engine)
    const ufo = car === 'ufo', tank = car === 'tank';
    engine.osc.type = ufo ? 'sine' : 'sawtooth';
    engine.osc.frequency.setTargetAtTime(ufo ? 170 + speed * 2.2 : (tank ? 34 : 48) + speed * (tank ? 1.6 : 2.6), now, 0.08);
    engine.filter.frequency.setTargetAtTime(ufo ? 2000 : 300 + speed * 22, now, 0.1);
    engine.lfoGain.gain.setTargetAtTime(ufo ? 14 : 0, now, 0.1);
    engine.gain.gain.setTargetAtTime(on ? (ufo ? 0.12 : 0.07 + Math.min(0.07, speed * 0.0015)) : 0, now, 0.12);
  },
  // the police siren, louder the nearer the nearest police car: level 0 (silent) .. 1 (right
  // beside it). near: one is close enough to bust the player, which pings the radar as it starts
  siren(level, near = false) {
    if (!siren) return;
    if (near && !radarOn) this.play('radar', 0.7);
    radarOn = near;
    if (sirenLoop.set('Police Siren', 0.35 * level)) siren.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
    else siren.gain.gain.setTargetAtTime(0.05 * level, ctx.currentTime, 0.15);
  },
  // on while a helicopter is coming for the car, carrying it, or setting it down
  helicopter(on) {
    heliLoop.set('Helicopter', on ? 0.45 : 0);
  },
  // on for the last CONFIG.powerUpWarning seconds of a powerup, until it runs out
  powerWarning(on) {
    if (on) warnLoop.set('PowerUp TimeOut 2', 0.5);
    else warnLoop.stop();
  },
  // on while a UFO AIR STRIKE's saucer is about (flying in, hovering, flying off)
  // the lowriders in traffic play their music too, louder the nearer the nearest one:
  // level 0 (silent) .. 1 (right beside it)
  lowriders(level) {
    lowriderLoop.set('Lowrider', 0.5 * level);
  },
  ufoStrike(on) {
    ufoLoop.set('UFO', on ? 0.5 : 0, 1.6); // (1.6x its own speed, and pitch)
  },
  // the frog's croaking, 0 (silent) .. 1 (right beside it)
  frog(volume) {
    frogLoop.set('Frog', volume * 0.8);
  },
  // the shoulder's danger meter, fed every frame: beeps while the player is on the shoulder,
  // faster the nearer the meter is to a bust. level: 0 = the full allowance is
  // left, 1 = about to be busted; a negative number = not on the shoulder (silent).
  danger(level) {
    if (!ctx || ctx.state !== 'running') return;
    if (level < 0) { nextBeep = 0; return; } // (the first beep comes as soon as the shoulder is touched)
    const now = ctx.currentTime;
    if (now < nextBeep) return;
    if (buffers['Danger Timer']) sample('Danger Timer', 0.6);
    else tone(CONFIG.dangerBeepPitch, CONFIG.dangerBeepPitch, 0.05, 0.22, 'square');
    nextBeep = now + CONFIG.dangerBeepSlow + (CONFIG.dangerBeepFast - CONFIG.dangerBeepSlow) * level;
  },
  get muted() { return !!Progress.data.muted; },
  toggleMute() {
    Progress.data.muted = !Progress.data.muted;
    Progress.save();
    if (master) master.gain.value = Progress.data.muted ? 0 : 0.5;
    return Progress.data.muted;
  },
};
