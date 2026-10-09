// Works out a level's clock (its "clock": { good, evil }) from a clean run in the reference car
// (CONFIG.clock): a ghost, flat out, from the start line to the drop, nothing in its way. The clock is that
// run's time times CONFIG.clock.good or .evil, less CONFIG.clock.timePlus s for each time plus on the level.
// A level driven in a car of its own (its "car") is timed in that. Only the levels named are timed.
//   node scripts/level-clocks.mjs mountain-pass tour-de-coast          prints their clean runs and clocks
//   node scripts/level-clocks.mjs mountain-pass tour-de-coast --write  and writes the clocks into their files
import { createServer } from 'vite';
import { readFileSync, writeFileSync } from 'node:fs';

const WRITE = process.argv.includes('--write');
const IDS = process.argv.slice(2).filter(a => !a.startsWith('--'));
if (!IDS.length) { console.log('Name the levels to time: node scripts/level-clocks.mjs <id> ... [--write]'); process.exit(1); }

const element = () => ({ classList: { add() {}, remove() {} }, addEventListener() {}, style: {}, textContent: '' });
globalThis.window = { addEventListener() {} };
const allOpen = encodeURIComponent(JSON.stringify({ unlocked: 99, cars: ['commuter', 'sport', 'floatvan'] })); // (floatvan: CONFIG.clock.amphibious)
globalThis.document = { getElementById: element, querySelectorAll: () => [], body: element(), cookie: 'delivery_racer_progress=' + allOpen };

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const load = (path) => server.ssrLoadModule(path);
  const levels = await load('/src/delivery/levels.js');
  const { Game } = await load('/src/delivery/game.js');
  const { Player } = await load('/src/delivery/player.js');
  const { Input } = await load('/src/delivery/input.js');
  const { FxQueue } = await load('/src/delivery/physics.js');
  const cars = await load('/src/delivery/cars.js');
  const { CONFIG } = await load('/src/delivery/config.js');
  Object.defineProperty(Input, 'throttle', { get: () => 1, configurable: true });
  // (on a level with water stages the run holds its lane, as a driver does against a current: left to drift it
  // lands on the shoulder and is busted, which is no clean run)
  const track = await load('/src/delivery/track.js');
  let holdLane = false;
  Object.defineProperty(Input, 'steer', { configurable: true, get: () => {
    if (!holdLane) return 0;
    const T = track.Track, [first] = T.laneRange(1, Player.s);
    return Math.max(-1, Math.min(1, (T.laneOffset(first, Player.s) - Player.lat) * 0.6)) * (T.mirrored ? -1 : 1);
  } });
  const C = CONFIG.clock, round = (t) => Math.max(C.round, Math.round(t / C.round) * C.round);
  const all = [...levels.LEVELS, ...Object.values(levels.HIDDEN_LEVELS)];
  for (const id of IDS) {
    const level = all.find(l => l.id === id);
    if (!level) { console.log(`${id}: no such level`); continue; }
    if (levels.LEVELS.includes(level)) levels.selectLevel(levels.LEVELS.indexOf(level));
    else levels.selectSpecial(level);
    cars.selectCar(level.amphibious ? C.amphibious : C.car); // (an amphibious level is timed in the amphibious reference car)
    Game.evil = false;
    holdLane = !!level.water;
    Game.start();
    let t = 0;
    while (Game.state === 'playing' && t < 900) {
      Object.assign(Player, { ghost: 99, health: Player.maxHealth });
      Game.busts = 0;
      Game.time = 0; // (the clock held: the run is timed here)
      Game.update(1 / 60);
      FxQueue.length = 0;
      t += 1 / 60;
    }
    if (Game.outcome !== 'delivered') { console.log(`${id}: NOT DELIVERED (${Game.outcome || 'still driving'})`); continue; }
    const pluses = (level.pickups || []).filter(p => p.type === 'timePlus').length, back = pluses * C.timePlus;
    const clock = { good: round(t * C.good) - back, evil: round(t * C.evil) - back };
    console.log(`${id}: clean run ${t.toFixed(1)} s in the ${level.car || (level.amphibious ? C.amphibious : C.car)}, ${pluses} time plus${pluses === 1 ? '' : 'es'}: ` +
      `good ${clock.good} s, evil ${clock.evil} s (was ${JSON.stringify(level.clock)})`);
    if (!WRITE) continue;
    const path = new URL(`../src/delivery/levels/${id}.json`, import.meta.url);
    const text = readFileSync(path, 'utf8'), line = `"clock": { "good": ${clock.good}, "evil": ${clock.evil} }`;
    writeFileSync(path, /"clock": \{[^}]*\}/.test(text) ? text.replace(/"clock": \{[^}]*\}/, line) : text.replace(/"time": [\d.]+/, line));
  }
} finally {
  await server.close();
}
process.exit(0);
