// ---- garage: the car shop, a 3D parking lot with a garage behind it ---------------------
// Every car in CARS is parked in a bay. Click an owned car to use it; click one that is for
// sale to buy it (hovering shows the price). The Good / Evil toggle swaps every car to its
// other livery: buying a car buys both.
import * as THREE from 'three';
import { CARS, CAR, selectCar } from '../cars.js';
import { Progress } from '../progress.js';
import { Game } from '../game.js';
import { renderer } from './scene.js';
import { makeCarMesh, shapeCarMesh, makeTankMesh } from './cars.js';
import { MODELS } from './models.js';

const PER_ROW = 10, ROWS = 2;        // 20 bays: an open row in front, a covered row behind
const BAY_W = 3.7, BAY_D = 6.6;
const FRONT_Z = 5, BACK_Z = -10.5;   // centre lines of the two rows

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2b3342);
scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3f4a, 1.5));
const lamp = new THREE.DirectionalLight(0xfff1d6, 1.3);
lamp.position.set(12, 30, 18);
scene.add(lamp);
const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 300);

const box = (material, w, h, d, x, y, z) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  scene.add(mesh);
  return mesh;
};
const lambert = (color) => new THREE.MeshLambertMaterial({ color });

// ---- the lot and the building ---------------------------------------------------------------
{
  const width = PER_ROW * BAY_W;
  box(lambert(0x5b6068), 90, 0.2, 70, 0, -0.1, 0);                      // tarmac
  box(lambert(0x747a84), width + 3, 0.04, BAY_D + 1.5, 0, 0.02, BACK_Z); // garage floor
  const paint = new THREE.MeshBasicMaterial({ color: 0xe8e8e8 });
  for (const z of [FRONT_Z, BACK_Z]) {
    for (let i = 0; i <= PER_ROW; i++) { // lines between the bays
      box(paint, 0.14, 0.02, BAY_D, (i - PER_ROW / 2) * BAY_W, 0.05, z);
    }
  }
  box(paint, width, 0.02, 0.14, 0, 0.05, FRONT_Z - BAY_D / 2); // the front row's back line

  // the garage: back wall, side walls, a roof on pillars, a sign
  const wall = lambert(0x596170), roof = lambert(0x3f4654), trim = lambert(0xffd23f);
  const backZ = BACK_Z - BAY_D / 2 - 0.6, frontZ = BACK_Z + BAY_D / 2 + 0.6, H = 5.2;
  box(wall, width + 4, H, 0.5, 0, H / 2, backZ);
  for (const side of [-1, 1]) box(wall, 0.5, H, frontZ - backZ, side * (width / 2 + 1.8), H / 2, (frontZ + backZ) / 2);
  box(roof, width + 5, 0.5, frontZ - backZ + 1.6, 0, H + 0.25, (frontZ + backZ) / 2);
  for (let i = 0; i <= PER_ROW; i += 2) box(wall, 0.4, H, 0.4, (i - PER_ROW / 2) * BAY_W, H / 2, frontZ);
  box(trim, width + 5, 0.5, 0.3, 0, H + 0.25, frontZ + 0.8);

  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#20242c';
  ctx.fillRect(0, 0, 512, 96);
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 64px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GARAGE', 256, 70);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(12, 2.25), new THREE.MeshBasicMaterial({ map }));
  sign.position.set(0, H + 1.9, frontZ + 0.8);
  scene.add(sign);
}

// ---- the cars, parked from the middle of the front row outward ------------------------------
const bayOrder = [];
for (let row = 0; row < ROWS; row++) {
  for (let k = 0; k < PER_ROW; k++) { // 4, 5, 3, 6, ... : middle bays first
    const col = PER_ROW / 2 - 1 + (k % 2 ? (k + 1) / 2 : -k / 2);
    bayOrder.push({ x: (col - (PER_ROW - 1) / 2) * BAY_W, z: row ? BACK_Z : FRONT_Z });
  }
}
const corner = bayOrder.pop(); // the last bay filled is the far corner of the covered row
let nextBay = 0;
const parked = CARS.slice(0, PER_ROW * ROWS).map((car) => {
  const mesh = car.tank ? makeTankMesh(car.color) : car.model ? MODELS[car.model](car) : makeCarMesh(car.color);
  if (!car.tank && !car.model) shapeCarMesh(mesh, car);
  const bay = car.corner ? corner : bayOrder[nextBay++];
  mesh.position.set(bay.x, 0, bay.z);
  mesh.userData.car = car;
  scene.add(mesh); // (moves it out of the game's scene, where makeCarMesh put it)
  // a "for sale" marker floating over cars that aren't owned yet
  const tag = new THREE.Mesh(new THREE.OctahedronGeometry(0.45), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
  tag.position.y = car.height + 1.5;
  mesh.add(tag);
  mesh.userData.tag = tag;
  return mesh;
});
// a glowing ring under the car in use
const ring = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.12, 8, 40), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
ring.rotation.x = Math.PI / 2;
ring.position.y = 0.12;
scene.add(ring);

// ---- interface ---------------------------------------------------------------------------------
const ui = document.getElementById('garageUi');
const tip = document.getElementById('garageTip');
const info = document.getElementById('garageInfo');
const bank = document.getElementById('garageBank');
const liveryBtn = document.getElementById('liveryBtn');
const startScreen = document.getElementById('startScreen');
const money = (amount) => '$' + amount.toFixed(2);
const stats = (car) => 'Top speed ' + Math.round(car.maxSpeed * 3.6) + ' km/h  |  Acceleration ' +
  car.accel + '  |  Health ' + car.health;

let hovered = null; // the parked car mesh under the pointer
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const carAt = (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(parked, true)[0];
  let object = hit && hit.object;
  while (object && !object.userData.car) object = object.parent;
  return object || null;
};

const refresh = () => {
  const inUse = CARS.find(car => car.id === Progress.data.car) || CARS[0];
  bank.textContent = 'Bank ' + money(Progress.data.money);
  liveryBtn.textContent = 'Livery: ' + (Garage.evil ? 'Evil' : 'Good');
  info.textContent = inUse.name + '  -  ' + stats(inUse);
  for (const mesh of parked) {
    const car = mesh.userData.car;
    mesh.userData.body.material.color.setHex(Garage.evil ? car.evilColor : car.color);
    mesh.userData.tag.visible = !Progress.owns(car.id);
    if (car === inUse) ring.position.set(mesh.position.x, 0.12, mesh.position.z);
  }
};

const pick = (mesh) => {
  const car = mesh.userData.car;
  if (!Progress.owns(car.id)) {
    if (Progress.data.money < car.price) return; // the tooltip already says so
    if (!confirm('Buy the ' + car.name + ' for ' + money(car.price) + '? You get both liveries.')) return;
    Progress.buy(car);
  }
  selectCar(car.id);
  refresh();
};

renderer.domElement.addEventListener('pointermove', (event) => {
  if (!Garage.isOpen) return;
  hovered = carAt(event);
  renderer.domElement.style.cursor = hovered ? 'pointer' : '';
});
renderer.domElement.addEventListener('click', (event) => {
  if (!Garage.isOpen) return;
  const mesh = carAt(event);
  if (mesh) pick(mesh); // (on touch there is no hover: the purchase prompt states the price)
});
liveryBtn.addEventListener('click', () => { Garage.evil = !Garage.evil; refresh(); });
document.getElementById('garageBackBtn').addEventListener('click', () => Garage.close());

const anchor = new THREE.Vector3();
let carAtOpen = CAR; // the car in use when the garage was opened
export const Garage = {
  isOpen: false,
  evil: false, // which livery is on show

  open() {
    this.isOpen = true;
    carAtOpen = CAR;
    Game.inMenu = true; // Enter must not start a run from here
    ui.classList.remove('hidden');
    startScreen.classList.add('hidden');
    document.body.classList.add('in-garage');
    refresh();
  },
  close() {
    // a different car: tell the rest of the game (the player gets into it when a run starts)
    if (CAR !== carAtOpen) window.dispatchEvent(new Event('carchange'));
    this.isOpen = false;
    Game.inMenu = false;
    hovered = null;
    ui.classList.add('hidden');
    tip.style.display = 'none';
    startScreen.classList.remove('hidden');
    document.body.classList.remove('in-garage');
    renderer.domElement.style.cursor = '';
  },
  // for testing: show the tooltip of the car with this id as if the pointer were on it
  hover(carId) {
    hovered = parked.find(mesh => mesh.userData.car.id === carId) || null;
  },
  render(now) {
    const canvas = renderer.domElement;
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const back = Math.max(1, 2.05 / aspect); // stand further back on a narrow screen, so all 20 bays fit
    camera.aspect = aspect;
    camera.position.set(0, 17 * back, 25 * back);
    camera.lookAt(0, 0, -3);
    camera.updateProjectionMatrix();

    for (const mesh of parked) {
      mesh.userData.tag.rotation.y = now / 500;
      if (mesh.userData.animate) mesh.userData.animate(now / 1000); // animated models keep moving while parked
      mesh.position.y = mesh === hovered ? 0.25 : 0; // the hovered car lifts a little
    }

    if (hovered) {
      const car = hovered.userData.car, owned = Progress.owns(car.id);
      tip.textContent = car.name + '  -  ' + (
        car.id === Progress.data.car ? 'in use'
          : owned ? 'owned, click to use'
            : money(car.price) + (Progress.data.money < car.price ? ' (not enough in the bank)' : ', click to buy'));
      anchor.set(hovered.position.x, car.height + 2.6, hovered.position.z).project(camera);
      tip.style.left = (anchor.x + 1) / 2 * canvas.clientWidth + 'px';
      tip.style.top = (1 - anchor.y) / 2 * canvas.clientHeight + 'px';
      tip.style.display = 'block';
    } else {
      tip.style.display = 'none';
    }
    renderer.render(scene, camera);
  },
};
