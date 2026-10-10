// ---- THE POLICE PURSUIT, DRAWN (see ../pursuit.js): its two cars are traffic, drawn with the rest (their models:
// ./pursuitModels.js); this adds what is the pursuit's own: the interceptor's lights going or not, the police
// helicopter over the getaway car with its searchlight, and the bags of cash on the road.
import { CONFIG } from '../config.js';
import { LEVEL } from '../levels.js';
import { Track } from '../track.js';
import { Traffic } from '../traffic.js';
import { Pursuit } from '../pursuit.js';
import { scene, tmp } from './scene.js';
import { trafficMeshes } from './cars.js';
import { makeCashBag, makePursuitHeli } from './pursuitModels.js';

const H = CONFIG.pursuit.heli;
const heli = makePursuitHeli(H.height, H.beam);
heli.visible = false;
scene.add(heli);
let leaving = 0, over = null; // s since it turned away; and the getaway car it was last over

const bagMeshes = [0, 1, 2].map(() => { const bag = makeCashBag(); bag.visible = false; scene.add(bag); return bag; });

export const syncPursuit = (dt, now) => {
  const t = now / 1000, st = Pursuit.state;
  // the interceptor's lights: going for as long as its siren is, and still going where it has stopped by
  // the getaway car or a wreck (not once the chase is given up)
  Traffic.cars.forEach((car, i) => {
    if (car.active && car.kind === 'interceptor') trafficMeshes[i].userData.models.interceptor?.userData.lights(car.sirenOn);
  });
  // the helicopter: over the getaway car while the chase is on, its light on it; then it climbs away
  const g = st && st.phase === 'chase' && st.robber.active ? st.robber : null;
  if (g && LEVEL.helicopter !== false) {
    const heading = Track.toWorld(g.s, g.lat, tmp);
    if (!heli.visible || over !== g) heli.position.set(tmp.x, tmp.y + H.height + 8, tmp.z); // (it comes down over it)
    heli.visible = true;
    over = g;
    leaving = 0;
    heli.position.x = tmp.x;
    heli.position.z = tmp.z;
    heli.position.y += (tmp.y + H.height + 1 + Math.sin(t * 1.3) * 0.4 - heli.position.y) * Math.min(1, dt * 2.5);
    heli.rotation.y = heading;
    heli.userData.cone.visible = heli.userData.pool.visible = true;
  } else if (heli.visible) {
    leaving += dt;
    heli.userData.cone.visible = heli.userData.pool.visible = false;
    heli.position.y += dt * (3 + leaving * 8);
    heli.translateZ(dt * leaving * 20);
    if (leaving > 3.5) heli.visible = false;
  }
  if (heli.visible) {
    heli.userData.rotor.rotation.y += dt * 40;
    heli.userData.animate(t);
  }
  // bags of cash
  bagMeshes.forEach((mesh, k) => {
    const bag = Pursuit.bags[k];
    mesh.visible = !!bag && !bag.taken;
    if (!mesh.visible) return;
    Track.toWorld(bag.s, bag.lat, tmp);
    mesh.position.copy(tmp);
    mesh.rotation.y = t * 1.5;
    mesh.userData.animate(t);
  });
};
