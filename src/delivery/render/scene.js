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
export const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game'), antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

export const scene = new THREE.Scene();
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 120, 520);
scene.add(new THREE.HemisphereLight(0xffffff, 0x556655, 1.6));
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
export const updateCamera = (dt, snap) => {
  camLat += Player.camShift; // the car changed road: lat is measured from a different line now
  Player.camShift = 0;
  camLat = snap ? Player.lat : camLat + (Player.lat - camLat) * damp(CONFIG.camLateralLag, dt);
  Track.toWorld(Player.s - CONFIG.camBack, camLat, tmp);
  const shake = CONFIG.hitShake * Game.shake;
  camera.position.set(tmp.x + (Math.random() - 0.5) * shake,
    tmp.y + CONFIG.camHeight + (Math.random() - 0.5) * shake, tmp.z);
  Track.toWorld(Player.s + CONFIG.camLookAhead, camLat, tmp2);
  tmp2.y += 1; // (so the camera looks up a climb and down a descent)
  camera.lookAt(tmp2);

  const speedT = Math.min(1.3, Player.speed / CONFIG.turboMaxSpeed);
  camera.fov = baseFov + CONFIG.camFovSpeedBoost * speedT * speedT;
  camera.updateProjectionMatrix();
};
