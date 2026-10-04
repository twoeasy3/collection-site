// Entry point: loads the game logic, then the rendering, and runs the frame loop.
// Game logic (src/*.js) never imports rendering (src/render/*.js), so it can run headless.
import './style.css';
import { CONFIG } from './config.js';
import { Track } from './track.js';
import { selectLevel } from './levels.js';
import { Progress } from './progress.js';
import { Player } from './player.js';
import { Traffic } from './traffic.js';
import { Game } from './game.js';
import { renderer, scene, camera, tmp, updateCamera } from './render/scene.js';
import './render/road.js';
import { carMesh, syncTraffic } from './render/cars.js';
import { emitVehicleSmoke, updateEffects } from './render/effects.js';
import { syncPackages } from './render/packages.js';
import { syncEmotes } from './render/emotes.js';
import { syncPickups, syncTargets } from './render/items.js';
import { syncHelicopter } from './render/helicopter.js';
import { syncStorm } from './render/storm.js';
import { updateHud } from './render/hud.js';
import './render/menu.js';
import './render/touch.js';
import { Garage } from './render/garage.js';
import { Sound } from './render/audio.js';
import { CAR } from './cars.js';

// ?autostart (or ?autostart=evil) in the address skips the start screen: handy when testing.
// With it, ?level=3 picks the level (locked or not), ?at=1650 starts that many metres along
// the expressway and ?ff=5 runs the game for that many seconds before the first frame is drawn.
const params = new URLSearchParams(location.search);
// ?garage (or ?garage=evil) opens the garage; with it, ?hover=coupe shows that car's tooltip.
if (params.get('garage') !== null) {
  Garage.evil = params.get('garage') === 'evil';
  Garage.open();
  if (params.get('hover')) Garage.hover(params.get('hover'));
}
// ?screensaver starts the screensaver straight away (with ?ff=5 as above)
const autostart = params.get('autostart');
if (params.get('screensaver') !== null) {
  Game.startScreensaver();
  for (let t = 0; t < Number(params.get('ff') || 0); t += CONFIG.maxStep) Game.update(CONFIG.maxStep);
} else if (autostart !== null) {
  Game.evil = autostart === 'evil';
  selectLevel((Number(params.get('level')) || 1) - 1);
  if (params.get('car')) { // ?car=lowrider: drive that car for this visit, owned or not (nothing is saved)
    Progress.data.cars.push(params.get('car'));
    Progress.data.car = params.get('car');
  }
  Game.start();
  if (params.get('at')) Player.s = Number(params.get('at'));
  for (let t = 0; t < Number(params.get('ff') || 0); t += CONFIG.maxStep) Game.update(CONFIG.maxStep);
}

let last = performance.now();
let prevState = Game.state;
const frame = (now) => {
  const dt = Math.min(0.05, (now - last) / 1000) || 0.001;
  last = now;

  if (Garage.isOpen) {
    Garage.render(now); // the garage has a scene of its own
    Sound.engine(-1);
    Sound.siren(false);
  } else if (Game.state !== 'start') { // (on the start screen there is no level: it is only a menu)
    // game logic, in small fixed-size steps so fast head-ons can't tunnel (frozen while paused)
    const steps = Game.paused ? 0 : Math.ceil(dt / CONFIG.maxStep);
    for (let i = 0; i < steps; i++) Game.update(dt / steps);

    // then bring the scene up to date with it
    const heading = Track.toWorld(Player.s, Player.lat, tmp);
    carMesh.position.copy(tmp);
    carMesh.rotation.y = heading - Player.yaw; // swerving right turns the nose toward +lat
    carMesh.rotation.x = -Math.atan(Track.grade(Player.s)); // nose up on a climb
    syncHelicopter(dt, now); // (decides whether the car is shown: blinking under a shield, dangling from the helicopter)
    // The screensaver has no player car: the mesh, and everything attached to it (the garage
    // models, the tank, the UFO, the passenger), is hidden. This comes after the helicopter,
    // which otherwise shows it again.
    if (Game.screensaver) carMesh.visible = false;
    syncTraffic();
    syncStorm(dt);
    emitVehicleSmoke(dt);
    syncPackages(dt);
    syncPickups(dt);
    syncTargets(dt);
    updateEffects(dt);

    updateCamera(dt, prevState !== 'playing' && Game.state === 'playing');
    syncEmotes(dt, now);
    updateHud();
    // the engine note follows the speed; silent once the run is over or the car is gone
    // (and in the screensaver, where there is no car, or while paused)
    const live = Game.state === 'playing' && Player.active && !Game.paused && !Game.screensaver;
    Sound.engine(live ? Player.speed : -1, CAR.ufo ? 'ufo' : Player.tank > 0 ? 'tank' : 'car');
    // a siren while a police car is near enough to bust you (nobody busts a tank)
    Sound.siren(live && Player.tank <= 0 && Traffic.policeNear());
    // beeps while on the shoulder with the danger meter running down, faster the nearer the bust
    Sound.danger(live && Player.onShoulder ? 1 - Player.danger / CONFIG.dangerTime : -1);
    renderer.render(scene, camera);
  }
  if (Game.state === 'start') { // (back on the menu)
    Sound.engine(-1);
    Sound.siren(false);
  }
  prevState = Game.state;
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
