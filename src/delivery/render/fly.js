// ---- FLY: a free camera to look round a level (?fly: the level editor's 3D view) ----------------------
// The level is loaded and frozen where it starts; the camera flies about it: W A S D (or the arrows)
// to fly, drag to look round, E / Space up and Q / C down, Shift to go faster, the wheel to set the
// speed. The road nearest the camera counts as where the player is, so whatever is only drawn near
// the player (obstacles, the scenery of a zone) is drawn round the camera instead.
import * as THREE from 'three';
import { Track } from '../track.js';
import { Player } from '../player.js';
import { Game } from '../game.js';
import { camera, scene } from './scene.js';

export const Fly = { on: false };
const keys = new Set(), at = new THREE.Vector3(), step = new THREE.Vector3();
let yaw = 0, pitch = -0.3, speed = 40, look = null;

export const startFly = () => {
  Fly.on = true;
  document.body.classList.add('cinematic'); // (no HUD, no buttons)
  // behind the start line and up, looking along the road
  const h = Track.toWorld(0, 0, at), sx = scene.scale.x;
  const fx = sx * Math.sin(h), fz = Math.cos(h);
  yaw = Math.atan2(-fx, -fz);
  camera.position.set(at.x * sx - fx * 30, at.y + 18, at.z - fz * 30);
  window.addEventListener('keydown', (e) => { keys.add(e.code); if (e.code === 'Space') e.preventDefault(); });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());
  window.addEventListener('pointerdown', (e) => { look = [e.clientX, e.clientY]; });
  window.addEventListener('pointerup', () => { look = null; });
  window.addEventListener('pointermove', (e) => {
    if (!look) return;
    yaw -= (e.clientX - look[0]) * 0.004;
    pitch = Math.max(-1.5, Math.min(1.5, pitch - (e.clientY - look[1]) * 0.004));
    look = [e.clientX, e.clientY];
  });
  window.addEventListener('wheel', (e) => { speed = Math.max(5, Math.min(400, speed * Math.exp(-e.deltaY * 0.001))); }, { passive: true });
};

export const flyCamera = (dt) => {
  Game.paused = true; // (the level holds still while it is looked round)
  const go = (codes) => codes.some(c => keys.has(c)) ? 1 : 0;
  const forward = go(['KeyW', 'ArrowUp']) - go(['KeyS', 'ArrowDown']);
  const right = go(['KeyD', 'ArrowRight']) - go(['KeyA', 'ArrowLeft']);
  const up = go(['KeyE', 'Space']) - go(['KeyQ', 'KeyC']);
  const v = speed * (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 3 : 1) * dt;
  step.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(forward * v);
  camera.position.add(step);
  camera.position.x += Math.cos(yaw) * right * v;
  camera.position.z -= Math.sin(yaw) * right * v;
  camera.position.y = Math.max(0.5, camera.position.y + up * v);
  camera.rotation.set(pitch, yaw, 0, 'YXZ');
  camera.fov = 60;
  camera.updateProjectionMatrix();
  // the road nearest the camera stands in for where the player is (in the scene's own terms)
  const near = Track.fromWorld(camera.position.x * scene.scale.x, camera.position.z, Player.s, 150);
  if (near && Number.isFinite(near.s)) Player.s = Math.max(Track.start, Math.min(Track.end, near.s));
};
