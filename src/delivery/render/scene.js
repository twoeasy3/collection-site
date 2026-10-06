import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { damp } from '../util.js';
import { Track } from '../track.js';
import { Player } from '../player.js';
import { Game } from '../game.js';

// ============================================================================
// RENDERING
// ============================================================================
const SKY = 0x9fc4e8;
// pixels drawn per screen pixel: up to 2 for a sharp picture, but only 1.5 on a phone or tablet,
// whose GPU has far less memory to spare (short of it, the browser drops WebGL altogether: the
// game freezes until it comes back)
export const PIXEL_RATIO = Math.min(window.devicePixelRatio, window.matchMedia('(pointer: coarse)').matches ? 1.5 : 2);
export const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game'), antialias: true });
renderer.setPixelRatio(PIXEL_RATIO);

export const scene = new THREE.Scene();
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 120, 520);
const skyLight = new THREE.HemisphereLight(0xffffff, 0x556655, 1.6);
scene.add(skyLight);
// the sky and the fog take the colour of the loaded level's theme
export const applySky = (color) => {
  scene.background.set(color);
  scene.fog.color.set(color);
};
// empties a group of meshes built for a level, freeing what they held on the GPU
export const clearGroup = (group) => {
  group.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    for (const material of [].concat(o.material || [])) {
      if (material.map) material.map.dispose();
      material.dispose();
    }
  });
  group.clear();
};
const sun = new THREE.DirectionalLight(0xffffff, 1.4);
sun.position.set(-40, 80, -20);
scene.add(sun);
// the light of the loaded level's theme: daylight, unless the theme says otherwise
// (sky / ground: the colours the sky light comes from above and below; ambient: its strength;
// sun: the sun's colour, sunlight: its strength)
const DAYLIGHT = { sky: 0xffffff, ground: 0x556655, ambient: 1.6, sun: 0xffffff, sunlight: 1.4 };
export const applyLight = (look) => {
  const l = { ...DAYLIGHT, ...look };
  skyLight.color.set(l.sky);
  skyLight.groundColor.set(l.ground);
  skyLight.intensity = l.ambient;
  sun.color.set(l.sun);
  sun.intensity = l.sunlight;
};

export const camera = new THREE.PerspectiveCamera(CONFIG.camFov, 1, 0.5, 700);
let baseFov = CONFIG.camFov;

const resize = () => {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  baseFov = h > w ? CONFIG.camFovPortrait : CONFIG.camFov;
};
window.addEventListener('resize', resize);
resize();

export const tmp = new THREE.Vector3();
export const tmp2 = new THREE.Vector3();

// ---- chase camera ----------------------------------------------------------
let camLat = 0;
// points the camera, placed in the game's own terms, at the target. On a left-hand level the scene
// is drawn mirrored (scale x -1, see road.js), so the camera goes to the mirror image of its place
export const aim = (target) => {
  if (scene.scale.x < 0) {
    camera.position.x = -camera.position.x;
    target.x = -target.x;
  }
  camera.lookAt(target);
};
// a still for the level select (?cine, see main.js): off to the side of the road and above it,
// a little behind the car, looking up the road past it at the traffic ahead
// With studio on (?cine=car), it is the car alone on white: a close three-quarter view from
// ahead and to its left, looking down on it, nose toward the bottom left; an Evil livery from its
// right instead, the mirror image (main.js hides everything else)
export const Cinematic = { on: false, studio: false };
const studioCamera = () => {
  const h = Track.toWorld(Player.s, Player.lat, tmp2);
  const side = Player.evil ? -1 : 1;
  const fx = Math.sin(h), fz = Math.cos(h), lx = Math.cos(h) * side, lz = -Math.sin(h) * side; // ahead, and to its left (or right)
  const k = (Player.hl + Player.hw) / 2.7; // (further back from a bigger vehicle, so each fills the frame alike)
  camera.position.set(tmp2.x + (fx * 4.6 + lx * 3.2) * k, tmp2.y + 3.4 * k, tmp2.z + (fz * 4.6 + lz * 3.2) * k);
  tmp2.y += 0.8;
  aim(tmp2);
  camera.fov = 34;
  camera.updateProjectionMatrix();
};
const cinematicCamera = () => {
  if (Cinematic.studio) { studioCamera(); return; }
  Track.toWorld(Player.s - 22, Track.hi(Player.s - 22) + 9, tmp);
  camera.position.set(tmp.x, tmp.y + 7.5, tmp.z);
  Track.toWorld(Player.s + 45, 0, tmp2);
  tmp2.y += 1.2;
  aim(tmp2);
  camera.fov = 52;
  camera.updateProjectionMatrix();
};

export const updateCamera = (dt, snap) => {
  if (Cinematic.on) { cinematicCamera(); return; }
  camLat += Player.camShift; // the car changed road: lat is measured from a different line now
  Player.camShift = 0;
  camLat = snap ? Player.lat : camLat + (Player.lat - camLat) * damp(CONFIG.camLateralLag, dt);
  const cam = Game.screensaver ? CONFIG.screensaver : CONFIG; // (the screensaver's camera stands further back)
  Track.toWorld(Player.s - cam.camBack, camLat, tmp);
  const shake = CONFIG.hitShake * Game.shake;
  camera.position.set(tmp.x + (Math.random() - 0.5) * shake,
    tmp.y + cam.camHeight + (Math.random() - 0.5) * shake, tmp.z);
  Track.toWorld(Player.s + cam.camLookAhead, camLat, tmp2);
  tmp2.y += 1; // (so the camera looks up a climb and down a descent)
  aim(tmp2);

  const speedT = Math.min(1.3, Player.speed / CONFIG.camFovFullSpeed);
  camera.fov = baseFov + CONFIG.camFovSpeedBoost * speedT * speedT;
  camera.updateProjectionMatrix();
};
