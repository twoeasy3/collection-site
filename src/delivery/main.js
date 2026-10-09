// Entry point: loads the game logic, then the rendering, and runs the frame loop.
// Game logic (src/*.js) never imports rendering (src/render/*.js), so it can run headless.
import './style.css';
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { Track } from './track.js';
import { LEVEL, selectLevel, selectSpecial, HIDDEN_LEVELS, setRaceClass } from './levels.js';
import { THEMES } from './themes.js';
import { Progress } from './progress.js';
import { Player } from './player.js';
import { Traffic } from './traffic.js';
import { Game } from './game.js';
import { Collision } from './collision.js';
import { renderer, scene, camera, tmp, updateCamera, Cinematic } from './render/scene.js';
import { syncZones } from './render/road.js';
import { carMesh, syncTraffic } from './render/cars.js';
import { emitVehicleSmoke, updateEffects } from './render/effects.js';
import { syncPackages } from './render/packages.js';
import { syncEmotes } from './render/emotes.js';
import { syncPickups, syncTargets, syncToads } from './render/items.js';
import { syncHelicopter, syncArrests } from './render/helicopter.js';
import { syncHeadlights, syncTrafficBeams } from './render/headlights.js';
import { syncUfoStrike } from './render/ufostrike.js';
import { syncBulletTrain } from './render/bullettrain.js';
import { syncJunctions } from './render/junctions.js';
import { syncTide } from './render/tide.js';
import { syncHippos } from './render/hippos.js';
import { syncElephants } from './render/elephants.js';
import { syncWreckage } from './render/wreckage.js';
import { syncMachinery } from './render/machinery.js';
import { syncGunfire } from './render/gunfire.js';
import { syncSite } from './render/site.js';
import { syncRoadside } from './render/roadside.js';
import { syncHazards } from './render/hazards.js';
import { syncBattle } from './render/battle.js';
import { raceCamera, raceAudio, syncRaceWatch, auditCameras } from './render/racewatch.js';
import { Fly, startFly, flyCamera } from './render/fly.js';
import { syncTankCorner } from './render/tankcorner.js';
import { UfoStrike } from './ufostrike.js';
import { syncStorm } from './render/storm.js';
import { updateHud } from './render/hud.js';
import './render/menu.js';
import './render/touch.js';
import { Garage } from './render/garage.js';
import { Sound } from './render/audio.js';
import { Social } from './social.js';
import { CAR } from './cars.js';

// ?autostart (or ?autostart=evil) in the address skips the start screen: handy when testing.
// ?test (or ?hidden=testbed) starts the hidden test track straight away (?test&evil: as Evil).
// ?edited plays the level as the level editor (editor.html) left it, as a hidden level (nothing saved).
// With any of those, ?fly freezes the level and gives a free camera to fly round it (render/fly.js).
// With it, ?level=3 picks the level (locked or not), ?at=1650 starts that many metres along
// the expressway and ?ff=5 runs the game for that many seconds before the first frame is drawn.
const params = new URLSearchParams(location.search);
// ?garage (or ?garage=evil) opens the garage; with it, ?hover=darkvan shows that car's tooltip.
if (params.get('garage') !== null) {
  Garage.evil = params.get('garage') === 'evil';
  Garage.open();
  if (params.get('hover')) Garage.hover(params.get('hover'));
}
// ?screensaver starts the screensaver straight away (with ?ff=5 as above); ?racewatch the race one
const autostart = params.get('autostart');
const hidden = params.get('hidden') || (params.get('test') !== null ? 'testbed' : params.get('edited') !== null ? 'edited' : null); // (a hidden level: see levels.js)
if (params.get('rival') !== null) Game.rival = params.get('rival') || 'opposite'; // ?rival[=evil|good]: a rival courier on every delivery level
if (params.get('gt') !== null) setRaceClass('gt'); // ?gt: every race in GT road cars, whatever the menu says
if (params.get('lmp') !== null) setRaceClass('lmp'); // (?lmp: in Le Mans prototypes)
if (params.get('ghost') !== null) Player.testGhost = true; // ?ghost: the car is a ghost for the whole run (nothing wrecks it: for screenshots and tests)
if (params.get('mystery')) Player.nextMystery = params.get('mystery'); // ?mystery=toad: every mystery pickup is that one
if (params.get('racewatch') !== null) {
  Game.startRaceWatch();
  if (params.get('camcheck') !== null) { // (a check of every trackside camera)
    const t0 = performance.now(), r = auditCameras();
    console.log('camcheck ' + JSON.stringify(r) + ' ms ' + Math.round(performance.now() - t0));
  }
  for (let t = 0; t < Number(params.get('ff') || 0); t += CONFIG.maxStep) Game.update(CONFIG.maxStep);
} else if (params.get('screensaver') !== null) {
  Game.startScreensaver();
  for (let t = 0; t < Number(params.get('ff') || 0); t += CONFIG.maxStep) Game.update(CONFIG.maxStep);
} else if (autostart !== null || hidden) {
  Game.evil = autostart === 'evil' || params.get('evil') !== null;
  if (hidden === 'edited') {
    let edited = null;
    try { edited = JSON.parse(localStorage.getItem('delivery_editor_level')); } catch { /* (no level handed over) */ }
    selectSpecial(edited || HIDDEN_LEVELS.testbed);
  } else if (hidden) selectSpecial(HIDDEN_LEVELS[hidden] || HIDDEN_LEVELS.testbed);
  else selectLevel((Number(params.get('level')) || 1) - 1);
  // ?theme=snow: the level in that theme, whatever its own (a copy of it: nothing of the run is saved)
  if (params.get('theme') && THEMES[params.get('theme')]) selectSpecial({ ...LEVEL, theme: params.get('theme') });
  if (params.get('car')) { // ?car=lowrider: drive that car for this visit, owned or not (nothing is saved)
    Progress.data.cars.push(params.get('car'));
    Progress.data.car = params.get('car');
  }
  Game.start();
  if (params.get('at')) Player.s = Number(params.get('at'));
  if (params.get('fly') !== null) startFly();
  // ?cine: a still for the level select. The traffic is dealt out afresh around the car, ?ff lets
  // it settle, then everything stops: no HUD, and the camera off to one side (render/scene.js)
  const cine = params.get('cine') !== null;
  if (cine) Traffic.reset();
  for (let t = 0; t < Number(params.get('ff') || 0); t += CONFIG.maxStep) Game.update(CONFIG.maxStep);
  if (cine) {
    Cinematic.on = true;
    Cinematic.studio = params.get('cine') === 'car'; // (?cine=car: the car alone, on white)
    Game.paused = true;
    document.body.classList.add('cinematic');
    if (Cinematic.studio) {
      for (const car of Traffic.cars) car.active = false;
      scene.background.set(0xffffff);
      scene.fog.near = 5000;
      scene.fog.far = 6000;
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ color: 0xffffff }));
      floor.rotation.x = -Math.PI / 2;
      Track.toWorld(Player.s, Player.lat, tmp);
      floor.position.set(tmp.x, tmp.y - 0.01, tmp.z);
      floor.userData.studio = true;
      scene.add(floor);
    }
  }
}

// every looping sound off: in the garage and on the menu
const silence = () => {
  Sound.engine(-1);
  Sound.pack(0);
  Sound.siren(0);
  Sound.helicopter(false);
  Sound.frog(0);
  Sound.powerWarning(false);
  Sound.ufoStrike(false);
  Sound.lowriders(0);
};

let last = performance.now();
let prevState = Game.state;
const frame = (now) => {
  const dt = Math.min(0.05, (now - last) / 1000) || 0.001;
  last = now;

  if (Garage.isOpen) {
    Garage.render(now); // the garage has a scene of its own
    silence();
  } else if (Game.state !== 'start') { // (on the start screen there is no level: it is only a menu)
    // game logic, in small fixed-size steps so fast head-ons can't tunnel (frozen while paused)
    const steps = Game.paused ? 0 : Math.ceil(dt / CONFIG.maxStep);
    for (let i = 0; i < steps; i++) Game.update(dt / steps);

    // then bring the scene up to date with it
    const heading = Track.toWorld(Player.s, Player.lat, tmp);
    carMesh.position.copy(tmp);
    carMesh.position.y += Player.air; // (jumping a drawbridge)
    carMesh.rotation.y = heading - Player.yaw; // swerving right turns the nose toward +lat
    carMesh.rotation.x = -Math.atan(Track.grade(Player.s)); // nose up on a climb
    syncHelicopter(dt, now); // (decides whether the car is shown: blinking under a shield, dangling from the helicopter)
    // The screensaver has no player car: the mesh, and everything attached to it (the garage
    // models, the tank, the UFO, the passenger), is hidden. This comes after the helicopter,
    // which otherwise shows it again.
    if (Game.screensaver || Fly.on) carMesh.visible = false;
    syncHeadlights();
    syncTraffic();
    syncToads(now);
    syncArrests(dt, now);
    syncTrafficBeams();
    syncUfoStrike(dt);
    syncBulletTrain();
    syncJunctions(now);
    syncTide(now);
    syncHippos();
    syncElephants(now);
    syncWreckage(now);
    syncMachinery(now);
    syncGunfire();
    syncSite();
    syncRoadside(dt);
    syncHazards(now);
    syncBattle(dt);
    syncZones(dt);
    syncStorm(dt);
    emitVehicleSmoke(dt);
    syncPackages(dt);
    syncPickups(dt);
    syncTargets(dt);
    updateEffects(dt);

    if (Fly.on) flyCamera(dt); // (flying round a level: see render/fly.js)
    else if (Game.raceWatch) raceCamera(dt); // (the race screensaver's cameras)
    else updateCamera(dt, prevState !== 'playing' && Game.state === 'playing');
    syncRaceWatch(now);
    syncEmotes(dt, now);
    updateHud();
    // the engine note follows the speed; silent once the run is over or the car is gone
    // (and in the screensaver, where there is no car, or while paused)
    const live = Game.state === 'playing' && Player.active && !Game.paused && !Game.screensaver;
    // (in the race screensaver: the watched car, and the rest of the field, as the camera hears them)
    const heard = Game.raceWatch && Game.state === 'playing' && !Game.paused ? raceAudio(dt) : null;
    if (heard) Sound.engine(heard.speed, CAR.id, CAR.maxSpeed, heard.gain, heard.pitch);
    else Sound.engine(live ? Player.speed : -1, Player.tank > 0 ? 'tank' : CAR.id,
      Player.tank > 0 ? CONFIG.tankMaxSpeed : CAR.maxSpeed);
    Sound.pack(heard ? heard.pack : 0);
    // the siren, louder the nearer the nearest police car or ambulance (the screensaver's too), and a radar
    // ping as one comes near enough to bust you (nobody busts a tank)
    let copFar = Infinity;
    for (const c of Traffic.cars) {
      if (!c.active || (c.kind !== 'police' && c.kind !== 'ambulance') || c.toad || c.junction) continue;
      copFar = Math.min(copFar, Math.hypot(Track.along(c.s) - Track.along(Player.s), c.lat - Player.lat));
    }
    const siren = Game.state === 'playing' && !Game.paused ? Math.max(0, 1 - copFar / CONFIG.sirenRange) : 0;
    // (the player's own siren, a pickup, at full blast)
    Sound.siren(live && Player.siren > 0 ? 1 : siren * siren, live && Player.tank <= 0 && Traffic.policeNear());
    // the lowriders' music, the same way: from the nearest one in traffic
    let lowriderFar = Infinity;
    for (const c of Traffic.cars) {
      if (!c.active || c.kind !== 'lowrider' || c.toad || c.junction) continue;
      lowriderFar = Math.min(lowriderFar, Math.hypot(Track.along(c.s) - Track.along(Player.s), c.lat - Player.lat));
    }
    const lowrider = Game.state === 'playing' && !Game.paused ? Math.max(0, 1 - lowriderFar / CONFIG.lowriderHearing) : 0;
    Sound.lowriders(lowrider * lowrider);
    // beeps while on the shoulder with the danger meter running down, faster the nearer the bust
    Sound.danger(live && Player.onShoulder ? 1 - Player.danger / Social.dangerTime : -1);
    // a powerup about to run out
    Sound.powerWarning(live && Player.powerLeft > 0 && Player.powerLeft <= CONFIG.powerUpWarning);
    // the UFO AIR STRIKE's saucer, for as long as it is about
    Sound.ufoStrike(!!UfoStrike.phase && !Game.paused && Game.state === 'playing');
    // the helicopter while it comes for the car (wrecked or busted), and keeps it at game over
    Sound.helicopter(!Game.paused && !Game.screensaver &&
      ((Game.state === 'playing' && (!Player.active || Player.busted || Traffic.cars.some(c => c.active && c.arrest >= 0))) || Game.over));
    // a frog croaks louder the nearer it is (and so does a toad, in TOAD RAGE)
    let frogFar = Infinity;
    for (const o of Collision.obstacles) {
      if (o.kind === 'frog' && !o.gone) frogFar = Math.min(frogFar, Math.abs(Track.along(o.s) - Track.along(Player.s)));
    }
    for (const c of Traffic.cars) {
      if (c.active && c.toad) frogFar = Math.min(frogFar, Math.hypot(Track.along(c.s) - Track.along(Player.s), c.lat - Player.lat));
    }
    Sound.frog(Game.paused || Game.state !== 'playing' ? 0 : Math.max(0, 1 - frogFar / CONFIG.frogHearing));
    renderer.render(scene, camera);
  }
  if (Game.state === 'start') silence(); // (back on the menu)
  syncTankCorner(dt); // (it hides itself when there is no run)
  // the studio (?cine=car): nothing but the car, its floor and the lights
  if (Cinematic.studio) for (const o of scene.children) o.visible = o === carMesh || o.isLight || !!o.userData.studio;
  prevState = Game.state;
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
