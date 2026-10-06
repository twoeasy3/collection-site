// ============================================================================
// THE POWER-UPS PAGE (delivery/powerups.html): every pickup's own model, spinning over its pad,
// with what it does. The numbers come from the game's CONFIG and the wording it shows from
// messages.json, so the page stays true when either changes.
// One renderer draws every card: a canvas over the whole window, drawn into patch by patch
// (each card's .view), and left clear everywhere else.
// ============================================================================
import * as THREE from 'three';
import './powerups.css';
import { CONFIG } from './config.js';
import MESSAGES from './messages.json';
import { PICKUP_COLOR, PICKUP_MODELS, makeTargetModel } from './render/pickupModels.js';

const kmh = (ms) => Math.round(ms * 3.6) + ' km/h';
const says = (...path) => { let e = MESSAGES; for (const k of path) e = e && e[k]; return [].concat(e || [])[0] || ''; };
const hex = (color) => '#' + color.toString(16).padStart(6, '0');

// ---- what each one does -------------------------------------------------------------------------
const M = CONFIG.mystery, S = CONFIG.sirenPickup;
const CARDS = [
  { type: 'turbo', name: 'Turbo', time: CONFIG.turboTime, says: says('powerups', 'turbo'), rules: [
    `Your car pulls itself up to <strong>${kmh(CONFIG.turboBoost)}</strong> over its own top speed, even with your foot off.`,
    'Braking still works; when it runs out you ease back down to your normal top speed.',
  ] },
  { type: 'ghost', name: 'Ghost', time: CONFIG.ghostTime, says: says('powerups', 'ghost'), rules: [
    'Your car turns see-through: you pass straight through <strong>traffic and barriers</strong>.',
    'The structure of a bridge and the splash of a package still get you.',
    'You only turn solid again once you are clear of every car.',
  ] },
  { type: 'wrench', name: 'Wrench', says: says('powerups', 'wrench'), rules: [
    `Repairs <strong>${Math.round(CONFIG.wrenchRepair * 100)}%</strong> of your car's health, on the spot.`,
    'Like the stopwatches, it <strong>doesn\'t</strong> replace the power-up you have running.',
  ] },
  { type: 'passenger', name: 'Inflatable Passenger', time: CONFIG.passengerTime, says: says('powerups', 'passenger'), rules: [
    'Makes the <strong>shoulder legal</strong>: the police meter refills instead of running down, and nobody busts you for being there.',
  ] },
  { type: 'radarDetector', name: 'Radar Detector', time: CONFIG.radarTime, says: says('powerups', 'radarDetector'), rules: [
    'The police <strong>can\'t bust you</strong>, for anything: the shoulder, hitting a cop, or an attack in front of one.',
    'The shoulder meter <strong>still runs</strong>. If it is full when the detector stops, that is a bust.',
    'Swapping it for another power-up with the meter full is a bust too, unless it is for a passenger.',
  ] },
  { type: 'siren', name: 'Siren', time: S.time, says: says('powerups', 'siren'), rules: [
    `Cars up to <strong>${S.range} m</strong> ahead in your lane get out of the way: a lane over to their right, or onto the shoulder (the only time traffic uses one). Never into oncoming traffic.`,
    'Cars on the shoulder slow down until the siren stops.',
    '<strong>Any car that damages you</strong> while it sounds is carried off by a police helicopter.',
  ] },
  { type: 'badGas', name: 'Bad Gas', time: CONFIG.badGas.time, says: says('powerups', 'badGas'), rules: [
    `A tank of cheap fuel: your top speed drops to <strong>${Math.round(CONFIG.badGas.topSpeed * 100)}%</strong> and your acceleration to <strong>${Math.round(CONFIG.badGas.accel * 100)}%</strong>.`,
    'Like any power-up, picking up another one ends it.',
  ] },
  { type: 'heavyMass', name: '1000 lb Weight', time: CONFIG.heavyMass.time, says: says('powerups', 'heavyMass'), rules: [
    `Your car gets heavier than a bus: top speed <strong>${Math.round(CONFIG.heavyMass.topSpeed * 100)}%</strong>, acceleration <strong>${Math.round(CONFIG.heavyMass.accel * 100)}%</strong>, steering <strong>${Math.round(CONFIG.heavyMass.agility * 100)}%</strong>.`,
    'But you win every collision: traffic takes nearly all of the push and most of the damage, and you are barely knocked about, even running into the back of something.',
  ] },
  { type: 'timePlus', name: 'Time Plus', says: says('powerups', 'timePlus'), rules: [
    `Puts <strong>${CONFIG.timePickup} s</strong> back on the clock. In the tip countdown, it winds that back too, and the tip with it.`,
    'Instant: it <strong>doesn\'t</strong> replace the power-up you have running.',
  ] },
  { type: 'timeMinus', name: 'Time Minus', says: says('powerups', 'timeMinus'), rules: [
    `Takes <strong>${CONFIG.timePickup} s</strong> off the clock, and can tip you into the tip countdown, or further along it.`,
    'Instant: it <strong>doesn\'t</strong> replace the power-up you have running.',
  ] },
  { type: 'mystery', name: 'Mystery', time: M.time, says: '', wide: true, rules: [
    `One of these, at random. The lasting ones run for <strong>${M.time} s</strong>; the insurance news and the air strike are over at once.`,
    'Driving a tank? It is always the air strike.',
  ], effects: [
    ['rickety', `Your car takes <strong>${M.rickety}&times;</strong> the damage.`],
    ['toad', `Every car on the road turns into a toad: ${kmh(M.toadSpeed)}, straight on, 1 health. Touching one bursts it, and costs you like a frog in the road. They all turn back at the end.`],
    ['angel', 'Every driver adores you, and their moods stay that way afterwards.'],
    ['jerk', 'Every driver hates you: cars going your way come after you, and evil ones throw at you.'],
    ['invincible', 'No damage, and you win head-ons. Driving into the end of a bridge still gets you.'],
    ['noBrakes', 'No brakes, and no braking by itself for the car in front either.'],
    ['insuranceUp', 'Just the news.'],
    ['insuranceDown', 'Just the news.'],
    ['ufo', 'A flying saucer hovers over you, then flies off, and every car on the road burns up within a few seconds.'],
    ['bulletTrain', `A bullet train turns up the road in your lane and comes straight down it at ${kmh(CONFIG.bulletTrain.speed)}: you have about ${CONFIG.bulletTrain.warning} s to get out of its way. It destroys everything it touches, you included, and steering into its side is just as deadly.`],
  ] },
  { type: 'target', name: 'TANK RAGE Target', says: says('powerups', 'tankRage'), saysColor: '#ff3b30', color: 0x39ff6a, wide: true, rules: [
    `Land a package on a green target beside the road to find the next piece of the tank. The <strong>${CONFIG.tankPieces}th</strong> piece starts TANK RAGE.`,
    'Pieces carry over from level to level once you reach the finish (even late, in the tip countdown). Fail or quit and that run\'s pieces are lost.',
    `In TANK RAGE you are a tank for the rest of the level: <strong>${kmh(CONFIG.tankMaxSpeed)}</strong>, faster than any car; whatever you touch is wrecked; you fire a cannon instead of throwing; and nobody busts a tank.`,
    'Once used, the tank\'s pieces are gone: you start collecting again from nothing.',
  ] },
];

// ---- the cards ----------------------------------------------------------------------------------
document.getElementById('rules').innerHTML = `
  <h2>How power-ups work</h2>
  <ul>
    <li><strong>One at a time.</strong> Picking one up replaces the one running (the wrench and the stopwatches excepted).</li>
    <li>The time left shows under your speed, and the power-up's sign rides on or over your car.</li>
    <li>In the last <strong>${CONFIG.powerUpWarning} s</strong> a warning sound loops and the sign blinks.</li>
    <li>Each one announces itself in yellow as you pick it up; TANK RAGE in red.</li>
  </ul>`;
const cardBox = document.getElementById('cards');
const views = [];
for (const card of CARDS) {
  const color = card.color ?? PICKUP_COLOR[card.type];
  const el = document.createElement('article');
  el.className = 'card' + (card.wide ? ' wide' : '');
  el.style.setProperty('--glow', hex(color) + '55');
  el.style.setProperty('--swatch', hex(color));
  if (card.saysColor) el.style.setProperty('--says', card.saysColor);
  el.innerHTML = `
    <div class="view"></div>
    <div class="body">
      <h2>${card.name}${card.time ? `<span class="time">${card.time} s</span>` : ''}</h2>
      ${card.says ? `<p class="says">${card.says}</p>` : ''}
      <ul>${card.rules.map(r => `<li>${r}</li>`).join('')}</ul>
      ${card.effects ? `<ul class="effects">${card.effects.map(([key, text]) =>
        `<li><strong>${says('powerups', 'mystery', key) || key}</strong><br>${text}</li>`).join('')}</ul>` : ''}
    </div>`;
  cardBox.append(el);
  views.push(makeView(el.querySelector('.view'), card, color));
}

// ---- a little scene per card: the model turning and bobbing over its pad ------------------------
function makeView(el, card, color) {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(3, 6, 5);
  scene.add(sun);
  const target = card.type === 'target';
  const model = target ? makeTargetModel() : PICKUP_MODELS[card.type]();
  model.scale.setScalar(target ? 0.42 : 1.15);
  scene.add(model);
  const pad = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.02, 2.4), new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.4, depthWrite: false }));
  pad.position.y = -1.25;
  scene.add(pad);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 1.4, 6.2);
  camera.lookAt(0, -0.25, 0);
  return { el, scene, camera, model, target, phase: Math.random() * 6 };
}

// ---- drawing ------------------------------------------------------------------------------------
const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
let last = performance.now();
const frame = (now) => {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const w = window.innerWidth, h = window.innerHeight;
  const size = renderer.getSize(new THREE.Vector2());
  if (size.x !== w || size.y !== h) renderer.setSize(w, h, false);
  renderer.setScissorTest(false);
  renderer.clear();
  renderer.setScissorTest(true);
  const t = now / 1000;
  for (const v of views) {
    const r = v.el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > h || r.width === 0) continue; // (off screen)
    const bottom = h - r.bottom;
    renderer.setViewport(r.left, bottom, r.width, r.height);
    renderer.setScissor(r.left, bottom, r.width, r.height);
    v.camera.aspect = r.width / r.height;
    v.camera.updateProjectionMatrix();
    if (v.target) { // the ring turns, the glow pulses
      v.model.userData.ring.rotation.y += dt * 3;
      v.model.userData.glow.scale.setScalar(1 + Math.sin(t * 5.5 + v.phase) * 0.15);
      v.model.position.y = 0.15;
    } else {
      v.model.rotation.y += dt * 1.6;
      v.model.position.y = Math.sin(t * 2 + v.phase) * 0.12;
    }
    const { red, blue } = v.model.userData; // (the siren's light bar flashes)
    if (red && blue) { const on = Math.floor(t * 6) % 2 === 0; red.visible = on; blue.visible = !on; }
    renderer.render(v.scene, v.camera);
  }
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
