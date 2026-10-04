import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Track } from '../track.js';
import { Collision } from '../collision.js';
import { scene, camera, tmp } from './scene.js';

// ---- mood faces: emoji spheres that pop up over cars now and then ---------------
const makeFace = (fill, kind) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, 256, 128);
  const cx = 64; // u = 0.25 is the side of the sphere that faces local +z
  ctx.fillStyle = ctx.strokeStyle = '#1c1c1c';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(cx + side * 15, 52, 6, 0, Math.PI * 2);
    ctx.fill();
    if (kind === 'evil') { // brows slanting down toward the nose
      ctx.beginPath();
      ctx.moveTo(cx + side * 27, 32);
      ctx.lineTo(cx + side * 7, 44);
      ctx.stroke();
    }
  }
  ctx.beginPath();
  if (kind === 'smile') ctx.arc(cx, 66, 20, Math.PI * 0.15, Math.PI * 0.85);
  else if (kind === 'evil') ctx.arc(cx, 98, 18, Math.PI * 1.2, Math.PI * 1.8);
  else { ctx.moveTo(cx - 15, 82); ctx.lineTo(cx + 15, 82); }
  ctx.stroke();
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map });
};
const MOOD_FACES = {
  happy: makeFace('#4caf50', 'smile'),
  neutral: makeFace('#ffd23f', 'flat'),
  angry: makeFace('#e53935', 'evil'),
};
const emoteGeo = new THREE.SphereGeometry(0.5, 20, 14);
const emotes = Collision.bodies.map(() => {
  const mesh = new THREE.Mesh(emoteGeo, MOOD_FACES.neutral);
  mesh.visible = false;
  scene.add(mesh);
  return { mesh, wait: Math.random() * CONFIG.emoteEvery, show: 0, last: null };
});
export const syncEmotes = (dt, now) => {
  for (let i = 0; i < emotes.length; i++) {
    const v = Collision.bodies[i], e = emotes[i];
    if (!v.active || v.isPlayer) { e.mesh.visible = false; e.show = 0; e.last = null; continue; }
    if (e.last !== null && e.last !== v.emotion) e.show = CONFIG.emoteTime; // mood swing: show it now
    e.last = v.emotion;
    if (v.showMood) { e.show = CONFIG.emoteTime; v.showMood = false; } // hit by a package
    if (e.show > 0) {
      e.show -= dt;
    } else if ((e.wait -= dt) <= 0) {
      e.wait = CONFIG.emoteEvery * (0.6 + Math.random() * 0.8);
      e.show = CONFIG.emoteTime;
    }
    e.mesh.visible = e.show > 0;
    if (!e.mesh.visible) continue;
    Track.toWorld(v.s, v.lat, tmp);
    const pop = Math.min(1, e.show * 6, (CONFIG.emoteTime - e.show) * 6); // pop in and out
    e.mesh.material = MOOD_FACES[v.emotion];
    e.mesh.scale.setScalar(Math.max(0.01, pop));
    e.mesh.position.set(tmp.x, tmp.y + v.height + 1.0 + Math.sin(now / 250 + i) * 0.1, tmp.z);
    e.mesh.lookAt(camera.position);
  }
};
