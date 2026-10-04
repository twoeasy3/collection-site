// ---- sound: draft effects, synthesised on the spot (no audio files) ----------------------
// Game logic asks for a sound by pushing { type: 'sound', name, volume } onto FxQueue;
// effects.js passes those here, and plays 'explode' / 'burst' / 'gift' for its own visual
// effects. Sound.engine() is fed the player's speed every frame.
// Browsers only allow sound after the player has clicked or pressed a key, so nothing is
// set up until then. M mutes; the choice is saved with the player's progress.
import { CONFIG } from '../config.js';
import { Progress } from '../progress.js';

let ctx = null, master = null, noiseBuffer = null;
let nextBeep = 0; // when the shoulder's danger meter next beeps
let engine = null; // { osc, lfo, lfoGain, filter, gain }
let siren = null;  // { gain }: a police siren that runs all the time, silent until Sound.siren(true)
const lastPlayed = {};

const setup = () => {
  if (ctx) return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  ctx = new AudioCtx();
  master = ctx.createGain();
  master.gain.value = Progress.data.muted ? 0 : 0.5;
  master.connect(ctx.destination);

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

// ---- the sounds: (volume 0..1) => void ---------------------------------------------------------
const SOUNDS = {
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

export const Sound = {
  play(name, volume = 1) {
    if (!ctx || ctx.state !== 'running' || !SOUNDS[name] || volume <= 0.02) return;
    // the same sound many times in an instant (a pile-up) would just be a loud click
    if (ctx.currentTime - (lastPlayed[name] || -1) < 0.05) return;
    lastPlayed[name] = ctx.currentTime;
    SOUNDS[name](Math.min(1, volume));
  },
  // speed in m/s, or a negative number for silence. kind: 'car' | 'tank' | 'ufo'
  engine(speed, kind = 'car') {
    if (!engine) return;
    const now = ctx.currentTime, on = speed >= 0;
    const ufo = kind === 'ufo', tank = kind === 'tank';
    engine.osc.type = ufo ? 'sine' : 'sawtooth';
    engine.osc.frequency.setTargetAtTime(ufo ? 170 + speed * 2.2 : (tank ? 34 : 48) + speed * (tank ? 1.6 : 2.6), now, 0.08);
    engine.filter.frequency.setTargetAtTime(ufo ? 2000 : 300 + speed * 22, now, 0.1);
    engine.lfoGain.gain.setTargetAtTime(ufo ? 14 : 0, now, 0.1);
    engine.gain.gain.setTargetAtTime(on ? (ufo ? 0.12 : 0.07 + Math.min(0.07, speed * 0.0015)) : 0, now, 0.12);
  },
  // on while a police car is close enough to bust the player
  siren(on) {
    if (siren) siren.gain.gain.setTargetAtTime(on ? 0.05 : 0, ctx.currentTime, 0.15);
  },
  // the shoulder's danger meter, fed every frame: beeps while the player is on the shoulder,
  // faster and higher the nearer the meter is to a bust. level: 0 = the full allowance is
  // left, 1 = about to be busted; a negative number = not on the shoulder (silent).
  danger(level) {
    if (!ctx || ctx.state !== 'running') return;
    if (level < 0) { nextBeep = 0; return; } // (the first beep comes as soon as the shoulder is touched)
    const now = ctx.currentTime;
    if (now < nextBeep) return;
    const pitch = CONFIG.dangerBeepPitch * (1 + level * 0.8);
    tone(pitch, pitch, 0.05, 0.22, 'square');
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
