// ---- little scenes for cards: a model turning on its stand, drawn into a patch of one shared canvas ------
// The reference pages (gimmickspage.js, poweruppage.js) and the menu's "what's on this road" card
// (render/levelcard3d.js) all show a card's model the same way: a scene of its own per card, and ONE renderer
// for all of them, its canvas laid over the cards and drawn into patch by patch (each card's .view element),
// left clear everywhere else. No game state here, and nothing of a level is built.
import * as THREE from 'three';
import { PICKUP_MODELS, makeTargetModel } from './pickupModels.js';

const lit = () => {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(3, 6, 5);
  scene.add(sun);
  return scene;
};

// A model on a turntable, framed whatever its size: { model, tick?(t, dt), spin = true, lift? } (what a gimmick
// card's build() returns; lift: how far down it is looked on, rad; close: how much nearer than a full frame the
// camera stands, for a small patch). The camera is put back far enough for the
// whole of it over the whole of its animation: it is played through a few seconds and measured all the way,
// so nothing that hops, drops or tumbles goes out of the picture.
export const standView = ({ model, tick, spin = true, lift = 0.42 }, close = 1) => {
  const scene = lit();
  const turn = new THREE.Group(); // (the turntable: the model turns on it, and animates on its own)
  turn.add(model);
  scene.add(turn);
  const bounds = new THREE.Box3().setFromObject(model);
  if (tick) {
    for (let t = 0; t < 8; t += 0.1) { tick(t, 0.1); model.updateMatrixWorld(true); bounds.union(new THREE.Box3().setFromObject(model)); }
  }
  const size = bounds.getSize(new THREE.Vector3()), mid = bounds.getCenter(new THREE.Vector3());
  turn.position.set(-mid.x, -bounds.min.y, -mid.z);
  const camera = new THREE.PerspectiveCamera(32, 1.6, 0.1, 400);
  const radius = bounds.getBoundingSphere(new THREE.Sphere()).radius, far = radius / Math.sin(THREE.MathUtils.degToRad(16)) * 0.92 / close;
  camera.position.set(0, size.y * 0.5 + far * Math.sin(lift), far * Math.cos(lift));
  camera.lookAt(0, size.y * 0.5, 0);
  const phase = Math.random() * 6;
  return { scene, camera, step(t, dt) {
    if (spin) turn.rotation.y += dt * 0.5;
    tick?.(t + phase, dt);
  } };
};

// A pickup turning and bobbing over its pad (its type, the pad's colour, the look for the side picked); 'target'
// is the TANK RAGE target, whose ring turns and glow pulses
export const pickupView = (type, color, evil = false) => {
  const scene = lit();
  const target = type === 'target';
  const model = target ? makeTargetModel() : PICKUP_MODELS[type]();
  model.userData.livery?.(evil);
  model.scale.setScalar(target ? 0.42 : 1.15);
  scene.add(model);
  const pad = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.02, 2.4), new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.4, depthWrite: false }));
  pad.position.y = -1.25;
  scene.add(pad);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 1.4, 6.2);
  camera.lookAt(0, -0.25, 0);
  const phase = Math.random() * 6;
  return { scene, camera, step(t, dt) {
    if (target) { // the ring turns, the glow pulses
      model.userData.ring.rotation.y += dt * 3;
      model.userData.glow.scale.setScalar(1 + Math.sin(t * 5.5 + phase) * 0.15);
      model.position.y = 0.15;
    } else {
      model.rotation.y += dt * 1.6;
      model.position.y = Math.sin(t * 2 + phase) * 0.12;
    }
    model.userData.animate?.(t + phase); // (a model that moves: the big splash's flames)
    const { red, blue } = model.userData; // (the siren's light bar flashes)
    if (red && blue) { const on = Math.floor(t * 6) % 2 === 0; red.visible = on; blue.visible = !on; }
  } };
};

// The one renderer, on a canvas (see-through wherever no view is drawn)
export const viewRenderer = (canvas) => {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  return renderer;
};
// A frame: every view ({ el, scene, camera, step }) whose element shows within the canvas is moved on and drawn
// into the patch of the canvas its element covers (the canvas is sized to its own box on the page first)
const size = new THREE.Vector2();
export const drawViews = (renderer, views, t, dt) => {
  const box = renderer.domElement.getBoundingClientRect();
  const w = Math.round(box.width), h = Math.round(box.height);
  renderer.getSize(size);
  if (size.x !== w || size.y !== h) renderer.setSize(w, h, false);
  renderer.setScissorTest(false);
  renderer.clear();
  renderer.setScissorTest(true);
  for (const v of views) {
    const r = v.el.getBoundingClientRect();
    if (r.bottom < box.top || r.top > box.bottom || r.right < box.left || r.left > box.right || r.width === 0) continue; // (out of sight: neither drawn nor moved)
    // (the patch, cut down to what of it is on the canvas)
    const left = Math.max(r.left, box.left), right = Math.min(r.right, box.right), top = Math.max(r.top, box.top), bottom = Math.min(r.bottom, box.bottom);
    renderer.setViewport(r.left - box.left, box.bottom - r.bottom, r.width, r.height);
    renderer.setScissor(left - box.left, box.bottom - bottom, right - left, bottom - top);
    v.camera.aspect = r.width / r.height;
    v.camera.updateProjectionMatrix();
    v.step(t, dt);
    renderer.render(v.scene, v.camera);
  }
};
