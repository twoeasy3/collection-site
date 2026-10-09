// ---- garage: the car shop, a 3D parking lot with a garage behind it ---------------------
// Every car in CARS is parked in a bay (the Blue Star ones once they are open: see garageCars; the amphibious ones
// from the start, in a section of their own at the end of the tiers: see buildLot). Tap any car, owned or not, to see its stats; the button under them
// uses it, or buys it (hovering shows the price). The Good / Evil toggle swaps every car to its
// other livery: buying a car buys both.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { CARS, CAR, SECRET_CARS, EARNED_CARS, selectCar, stars, starColour, STAR_COLOURS, blueStarsOpen, garageCars } from '../cars.js';
import { Progress } from '../progress.js';
import { Game } from '../game.js';
import { renderer } from './scene.js';
import { makeCarMesh, shapeCarMesh, makeTankMesh } from './cars.js';
import { MODELS } from './models.js';
import { makeUfo } from './carExtras.js';
import { GarageView, arrange, mountGarageView } from './garageview.js';
import { showComparison } from './compare.js';

// The lot: three rows of bays, a long covered garage along the back, the cars parked strictly column by
// column in order of their stars and price, cheapest first (one with no stars, the Tank, last), and in
// each column the smallest at the front and the biggest at the back, under the roof. It runs off to the right as far as the cars do, and is scrolled
// side to side (a drag or swipe, the wheel, the arrow keys): the camera frames the three rows to the
// screen's height, so on a phone held upright each car is big, and a few columns show at a time
const ROWS = 3, BAY_W = 3.9, BAY_D = 6.6;
const ROW_Z = [7.6, 0.6, -6.4];      // centre lines of the rows, front to back (the back row under the roof)
// a car's name and its stars, in their colour (gold or blue), as nodes to put in a line of text
export const withStars = (car) => {
  if (!car.tier) return [car.name];
  const span = document.createElement('span');
  span.textContent = stars(car);
  span.style.color = starColour(car);
  return [car.name + ' ', span];
};
const bulk = (car) => car.hw * car.hl * car.height; // how big a car is, to park the bigger ones further back
// (and the amphibious cars after every tier, a section of their own: see buildLot)
const rank = (car) => car.amphibious ? 50 + car.tier : (car.tier || 99) + (car.blue ? 0.5 : 0); // (a tier's Blue Star cars park after its gold ones)
// (the lot is built for the cars on show: it grows when the Blue Star cars arrive. See buildLot)
let order = [], COLS = 0, LOT_W = 0, parked = [], built = null;
const onShow = () => garageCars().length; // (what the lot was built for: it only ever grows)
const colX = (col) => col * BAY_W;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2b3342);
scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3f4a, 1.5));
const lamp = new THREE.DirectionalLight(0xfff1d6, 1.3);
lamp.position.set(12, 30, 18);
scene.add(lamp);
const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 300);

const lot = new THREE.Group(); // everything built for the cars on show (the lot, the building, the cars)
scene.add(lot);
const box = (material, w, h, d, x, y, z) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  lot.add(mesh);
  return mesh;
};
const lambert = (color) => new THREE.MeshLambertMaterial({ color });
// a canvas texture with text on it
const label = (text, w, h, size, colour = '#ffd23f', ground = '#20242c') => {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = colour;
  ctx.font = 'bold ' + size + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2 + size * 0.06, w * 0.92);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
};

// ---- the lot and the building, and the cars parked in it: built afresh when the cars on show change ----
const buildLot = () => {
  built = onShow();
  lot.clear();
  // (sorted and filtered by the bar's Sort and Show buttons: see render/garageview.js)
  const sorted = arrange(garageCars().sort((a, b) => rank(a) - rank(b) || a.price - b.price));
  order = [];
  // (parked as usual, the amphibious cars are a section: columns of their own, the bays left over in the column
  // before them and in their last one standing empty (null in `order`), on a slipway under a sign of their own.
  // Sorted some other way they park among the rest; Show: Amphibious parks them alone)
  const sections = [];
  for (const car of sorted) {
    const last = sections[sections.length - 1];
    if (!last || (GarageView.usual && !!last[0].amphibious !== !!car.amphibious)) sections.push([car]);
    else last.push(car);
  }
  const slipways = []; // [first column, columns] of each amphibious section
  const slipX = (from, cols) => colX(from) + (cols - 1) * BAY_W / 2, slipW = (cols) => Math.max(9, cols * BAY_W - 0.6); // (its middle, and its sign's width)
  sections.forEach((cars, k) => {
    const from = order.length / ROWS;
    for (let i = 0; i < cars.length; i += ROWS) order.push(...cars.slice(i, i + ROWS).sort((a, b) => GarageView.usual ? bulk(a) - bulk(b) : 0)); // (in each column, the biggest at the back; sorted some other way, strictly in that order)
    if (k < sections.length - 1) while (order.length % ROWS) order.push(null);
    if (GarageView.usual && cars[0].amphibious) slipways.push([from, Math.ceil(cars.length / ROWS)]);
  });
  COLS = Math.ceil(order.length / ROWS);
  LOT_W = COLS * BAY_W;
  const mid = (LOT_W - BAY_W) / 2, left = -BAY_W / 2, right = LOT_W - BAY_W / 2;
  box(lambert(0x5b6068), LOT_W + 80, 0.2, 60, mid, -0.1, 2);                    // tarmac
  box(lambert(0x747a84), LOT_W + 3, 0.04, BAY_D + 1.5, mid, 0.02, ROW_Z[2]);    // garage floor
  const paint = new THREE.MeshBasicMaterial({ color: 0xe8e8e8 });
  for (const z of ROW_Z) {
    for (let i = 0; i <= COLS; i++) box(paint, 0.14, 0.02, BAY_D, left + i * BAY_W, 0.05, z); // lines between the bays
    box(paint, LOT_W, 0.02, 0.14, mid, 0.05, z - BAY_D / 2);                                  // and behind them
  }
  // the garage: a back wall, end walls, a roof on pillars over the back row, signs along its front
  const wall = lambert(0x596170), roof = lambert(0x3f4654), trim = lambert(0xffd23f);
  const backZ = ROW_Z[2] - BAY_D / 2 - 0.6, frontZ = ROW_Z[2] + BAY_D / 2 + 0.6, H = 5.2;
  box(wall, LOT_W + 4, H, 0.5, mid, H / 2, backZ);
  for (const x of [left - 1.8, right + 1.8]) box(wall, 0.5, H, frontZ - backZ, x, H / 2, (frontZ + backZ) / 2);
  box(roof, LOT_W + 5, 0.5, frontZ - backZ + 1.6, mid, H + 0.25, (frontZ + backZ) / 2);
  for (let i = 0; i <= COLS; i += 2) box(wall, 0.4, H, 0.4, left + i * BAY_W, H / 2, frontZ);
  box(trim, LOT_W + 5, 0.5, 0.3, mid, H + 0.25, frontZ + 0.8);
  const garageSign = label('GARAGE', 512, 96, 64);
  for (let x = mid - Math.floor(COLS / 8) * 8 * BAY_W / 2; x <= right; x += 8 * BAY_W) { // (one every eight bays)
    if (slipways.some(([from, cols]) => Math.abs(x - slipX(from, cols)) < 6.5 + slipW(cols) / 2)) continue; // (the Amphibious section's own sign is there)
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(12, 2.25), new THREE.MeshBasicMaterial({ map: garageSign }));
    sign.position.set(x, H + 1.9, frontZ + 0.8);
    lot.add(sign);
  }
  // the Amphibious section: its bays a slipway's wet blue, a sign for it on the roof over them
  for (const [from, cols] of slipways) {
    const x = slipX(from, cols);
    box(lambert(0x2f7f9a), cols * BAY_W - 0.14, 0.03, ROW_Z[0] - ROW_Z[2] + BAY_D - 0.14, x, 0.035, (ROW_Z[0] + ROW_Z[2]) / 2);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(slipW(cols), 2.25),
      new THREE.MeshBasicMaterial({ map: label('AMPHIBIOUS', 512, 96, 60, STAR_COLOURS.amphibious, '#12323a') }));
    sign.position.set(x, H + 1.9, frontZ + 0.8);
    lot.add(sign);
  }
  parked = order.map(parkCar).filter(Boolean);
};

// ---- a car, parked in its bay: column by column --------------------------------------------------
const parkCar = (car, i) => {
  if (!car) return null; // (a bay left empty: see buildLot)
  const mesh = car.tank ? makeTankMesh(car.color) : car.ufo ? makeUfo() : car.model ? MODELS[car.model](car) : makeCarMesh(car.color); // (ufo: the earned Saucer)
  if (!car.tank && !car.ufo && !car.model) shapeCarMesh(mesh, car);
  mesh.position.set(colX(Math.floor(i / ROWS)), car.ufo ? 1 : 0, ROW_Z[i % ROWS]); // (a saucer hovers)
  mesh.userData.car = car;
  lot.add(mesh); // (moves it out of the game's scene, where makeCarMesh put it)
  // a "for sale" marker floating over cars that aren't owned yet
  const tag = new THREE.Mesh(new THREE.OctahedronGeometry(0.45), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
  tag.position.y = car.height + 1.5;
  mesh.add(tag);
  mesh.userData.tag = tag;
  // its stars, painted on the tarmac at the front of its bay
  if (car.tier) {
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.8), new THREE.MeshBasicMaterial({ map: label(stars(car), 256, 84, 60, starColour(car), '#3f444c') }));
    plate.rotation.x = -Math.PI / 2;
    plate.position.set(mesh.position.x, 0.06, mesh.position.z + BAY_D / 2 - 0.55);
    lot.add(plate);
  }
  return mesh;
};
// a glowing ring under the car in use, and a white one under the car being looked at (tapped: its stats shown,
// to use or buy it from the button below them)
const ringOf = (color) => {
  const r = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.12, 8, 40), new THREE.MeshBasicMaterial({ color }));
  r.rotation.x = Math.PI / 2;
  r.position.y = 0.12;
  scene.add(r);
  return r;
};
const ring = ringOf(0xffd23f), lookRing = ringOf(0xffffff);
let looking = null; // the car whose stats are shown (null: the one in use)

// ---- interface ---------------------------------------------------------------------------------
const ui = document.getElementById('garageUi');
const tip = document.getElementById('garageTip');
const info = document.getElementById('garageInfo');
const bank = document.getElementById('garageBank');
const liveryBtn = document.getElementById('liveryBtn');
const action = document.getElementById('garageAction');
const startScreen = document.getElementById('startScreen');
const money = (amount) => '$' + amount.toFixed(2);
const stats = (car) => 'Top speed ' + Math.round(car.maxSpeed * 3.6) + ' km/h  |  Acceleration ' +
  car.accel + '  |  Health ' + car.health + '  |  Crossing ' + Math.round((car.crossing ?? CONFIG.railCrossing.usual) * 100) + '%' +
    (car.perk ? '  |  ' + car.perk : ''); // (a perk of its own: see CARS' trait)

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
  // (a secret vehicle in use has no bay, so no ring)
  const inUse = [...CARS, ...EARNED_CARS].find(car => car.id === Progress.data.car) || SECRET_CARS[Progress.data.car] || CARS[0];
  bank.textContent = 'Bank ' + money(Progress.data.money);
  liveryBtn.textContent = 'Livery: ' + (Garage.evil ? 'Evil' : 'Good');
  const shown = looking || inUse, owned = Progress.owns(shown.id);
  info.replaceChildren(...withStars(shown), '  -  ' + stats(shown));
  showComparison(inUse, shown); // (the car in use against the one looked at: see render/compare.js)
  // the button under the stats: what can be done with the car shown
  action.textContent = shown === inUse ? 'In use' : owned ? 'Use this car' : Progress.data.money >= shown.price ? 'Buy for ' + money(shown.price) : 'Need ' + money(shown.price);
  action.disabled = shown === inUse || (!owned && Progress.data.money < shown.price);
  ring.visible = parked.some(mesh => mesh.userData.car === inUse);
  lookRing.visible = !!looking && looking !== inUse;
  for (const mesh of parked) {
    const car = mesh.userData.car;
    mesh.userData.body.material.color.setHex(Garage.evil ? car.evilColor : car.color);
    mesh.userData.livery?.(Garage.evil);
    mesh.userData.tag.visible = !Progress.owns(car.id);
    if (car === inUse) ring.position.set(mesh.position.x, 0.12, mesh.position.z);
    if (car === looking) lookRing.position.set(mesh.position.x, 0.12, mesh.position.z);
  }
};

// a car tapped: its stats shown, with the button to use it, or to buy it (locked or not, any car can be looked at)
const pick = (mesh) => {
  looking = mesh.userData.car;
  refresh();
};
action.addEventListener('click', () => {
  const car = looking;
  if (!car || car.id === Progress.data.car) return;
  if (!Progress.owns(car.id)) {
    if (Progress.data.money < car.price) return;
    if (!confirm('Buy the ' + car.name + ' for ' + money(car.price) + '? You get both liveries.')) return;
    Progress.buy(car);
  }
  selectCar(car.id);
  refresh();
});

// ---- scrolling side to side ---------------------------------------------------------------------
// The camera's x: dragged (a mouse or a finger), flung on a little by the speed of a swipe, and nudged by
// the wheel and the arrow keys; never past the first column or the last
let scrollX = 0, fling = 0, drag = null, dragged = false; // drag: { x (the pointer's last x), moved (px in all), t }
const view = { width: 1 }; // m of lot across the screen at the cars (see render)
// (the view's edges kept to the lot, a little over; a lot narrower than the screen sits in the middle of it)
const clampScroll = (x) => {
  const lo = -BAY_W / 2 - 1 + view.width / 2, hi = LOT_W - BAY_W / 2 + 1 - view.width / 2;
  return lo > hi ? (LOT_W - BAY_W) / 2 : Math.max(lo, Math.min(hi, x));
};
const scrollTo = (car) => { const i = order.indexOf(car); if (i >= 0) scrollX = clampScroll(colX(Math.floor(i / ROWS))); };
const perPixel = () => view.width / Math.max(1, renderer.domElement.clientWidth);
renderer.domElement.addEventListener('pointerdown', (event) => {
  if (!Garage.isOpen) return;
  drag = { x: event.clientX, moved: 0, t: performance.now() };
  fling = 0;
});
renderer.domElement.addEventListener('pointermove', (event) => {
  if (!Garage.isOpen) return;
  if (drag) {
    const dx = event.clientX - drag.x, now = performance.now();
    drag.moved += Math.abs(dx);
    scrollX = clampScroll(scrollX - dx * perPixel());
    fling = -dx * perPixel() / Math.max(0.008, (now - drag.t) / 1000); // (m/s, for the fling as it lets go)
    drag.x = event.clientX;
    drag.t = now;
  }
  hovered = drag && drag.moved > 8 ? null : carAt(event);
  renderer.domElement.style.cursor = hovered ? 'pointer' : drag && drag.moved > 8 ? 'grabbing' : '';
});
const letGo = () => {
  if (drag && performance.now() - drag.t > 80) fling = 0; // (held still before letting go: no fling)
  dragged = !!drag && drag.moved > 8;
  drag = null;
};
renderer.domElement.addEventListener('pointerup', letGo);
renderer.domElement.addEventListener('pointercancel', letGo);
renderer.domElement.addEventListener('wheel', (event) => {
  if (!Garage.isOpen) return;
  scrollX = clampScroll(scrollX + (Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY) * perPixel());
  fling = 0;
}, { passive: true });
window.addEventListener('keydown', (event) => {
  if (!Garage.isOpen || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
  scrollX = clampScroll(scrollX + (event.key === 'ArrowRight' ? 1 : -1) * BAY_W);
  fling = 0;
});
renderer.domElement.addEventListener('click', (event) => {
  if (!Garage.isOpen) return;
  if (dragged) { dragged = false; return; } // (the end of a drag is no click)
  const mesh = carAt(event);
  if (mesh) pick(mesh); // (on touch there is no hover: the purchase prompt states the price)
});

liveryBtn.addEventListener('click', () => { Garage.evil = !Garage.evil; refresh(); });
// the bar's Sort and Show buttons: the lot built again, from its first column (a car looked at that is no longer
// parked is let go)
mountGarageView(() => {
  buildLot();
  if (!order.includes(looking)) looking = null;
  scrollX = clampScroll(0);
  fling = 0;
  hovered = null;
  refresh();
});
document.getElementById('garageBackBtn').addEventListener('click', () => Garage.close());

const anchor = new THREE.Vector3();
let carAtOpen = CAR; // the car in use when the garage was opened
export const Garage = {
  isOpen: false,
  evil: false, // which livery is on show

  open() {
    if (built !== onShow()) buildLot(); // (first time in, or the Blue Star cars have just arrived, or a 6-star car has been earned)
    this.isOpen = true;
    carAtOpen = CAR;
    Game.inMenu = true; // Enter must not start a run from here
    ui.classList.remove('hidden');
    startScreen.classList.add('hidden');
    document.body.classList.add('in-garage');
    looking = null; // (the car in use's stats shown)
    scrollTo(order.find(car => car.id === Progress.data.car) || order[0]); // (the car in use in view)
    fling = 0;
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
  // for testing: look at the car with this id, as if it had been tapped (its stats, and the comparison card)
  look(carId) {
    const mesh = parked.find(m => m.userData.car.id === carId);
    if (mesh) { pick(mesh); scrollTo(mesh.userData.car); }
  },
  // for testing: show the tooltip of the car with this id as if the pointer were on it
  hover(carId) {
    hovered = parked.find(mesh => mesh.userData.car.id === carId) || null;
  },
  render(now) {
    const canvas = renderer.domElement;
    const aspect = canvas.clientWidth / canvas.clientHeight;
    // (the three rows framed to the screen's height, whatever its shape: a wider screen just shows more columns)
    const back = 1;
    const dt = Math.min(0.05, (now - (Garage.last || now)) / 1000);
    Garage.last = now;
    if (!drag && Math.abs(fling) > 0.05) { scrollX = clampScroll(scrollX + fling * dt); fling *= Math.pow(0.04, dt); }
    scrollX = clampScroll(scrollX); // (and kept in, should the screen change shape)
    camera.aspect = aspect;
    camera.position.set(scrollX, 20 * back, 27 * back);
    camera.lookAt(scrollX, 0, 0.5);
    camera.updateProjectionMatrix();
    // (measured across the front of the front row, the nearest the camera and so the narrowest: the end cars
    // there must fit, or the lot scrolls)
    const front = new THREE.Vector3(scrollX, 0, ROW_Z[0] + BAY_D / 2).sub(camera.position);
    const depth = front.dot(camera.getWorldDirection(new THREE.Vector3()));
    view.width = 2 * depth * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect;

    for (const mesh of parked) {
      mesh.userData.tag.rotation.y = now / 500;
      if (mesh.userData.animate) mesh.userData.animate(now / 1000); // animated models keep moving while parked
      mesh.position.y = mesh === hovered ? 0.25 : 0; // the hovered car lifts a little
    }

    if (hovered) {
      const car = hovered.userData.car, owned = Progress.owns(car.id);
      tip.replaceChildren(...withStars(car), '  -  ' + (
        car.id === Progress.data.car ? 'in use'
          : owned ? 'owned, click for its stats'
            : money(car.price) + ', click for its stats'));
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
