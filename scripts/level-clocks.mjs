// Works out each delivery level's clock (its "clock": { good, evil }) from a clean run in the reference
// car (CONFIG.clock): a ghost, flat out, from the start line to the drop, nothing in its way. The clock is
// that run's time times CONFIG.clock.good or .evil. A level driven in a car of its own (its "car") is timed
// in that. Races (laps), hidden levels and levels whose clocks are set by hand (in KEEP) are left as they are.
//   node scripts/level-clocks.mjs          prints each level's clean run and clock
//   node scripts/level-clocks.mjs --write  and writes the clocks into the level files
import { createServer } from 'vite';
import { readFileSync, writeFileSync } from 'node:fs';

const KEEP = ['suburbs', 'rival-run', 'showdown']; // (clocks tuned by hand: Suburbia runs on time pickups, the rival stages on the rival)
const WRITE = process.argv.includes('--write');

const element = () => ({ classList: { add() {}, remove() {} }, addEventListener() {}, style: {}, textContent: '' });
globalThis.window = { addEventListener() {} };
const allOpen = encodeURIComponent(JSON.stringify({ unlocked: 99, cars: ['commuter', 'sport'] }));
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
  const C = CONFIG.clock, round = (t) => Math.max(C.round, Math.round(t / C.round) * C.round);
  const hidden = Object.values(levels.HIDDEN_LEVELS);
  // the clock into the level's file, in place of its "time" (or its old clock)
  const save = (level, clock, note) => {
    if (note) console.log(`${level.id.padEnd(20)} ${note}: ${JSON.stringify(clock)}`);
    if (!WRITE) return;
    const path = new URL(`../src/delivery/levels/${level.id}.json`, import.meta.url);
    const text = readFileSync(path, 'utf8'), line = `"clock": { "good": ${clock.good}, "evil": ${clock.evil} }`;
    const next = /"clock": \{[^}]*\}/.test(text) ? text.replace(/"clock": \{[^}]*\}/, line) : text.replace(/"time": [\d.]+/, line);
    writeFileSync(path, next.replace(/\n\s*"time": [\d.]+,/, ''));
  };
  for (const level of [...levels.LEVELS, ...hidden]) {
    if (KEEP.includes(level.id)) { console.log(`${level.id.padEnd(20)} kept: ${JSON.stringify(level.clock)}`); continue; }
    // (a race is against the grid: its clock is only a backstop, kept as it was)
    // (nor is a hidden level's: they are for trying things out, not against the clock)
    if (level.laps || hidden.includes(level)) {
      save(level, level.clock || { good: Math.round(level.time * 1.2), evil: Math.round(level.time * 0.85) }, level.laps ? 'race, kept' : 'hidden, kept');
      continue;
    }
    if (hidden.includes(level)) levels.selectSpecial(level);
    else levels.selectLevel(levels.LEVELS.indexOf(level));
    cars.selectCar(C.car);
    Game.evil = false;
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
    if (Game.outcome !== 'delivered') { console.log(`${level.id.padEnd(20)} NOT DELIVERED (${Game.outcome || 'still driving'})`); continue; }
    const clock = { good: round(t * C.good), evil: round(t * C.evil) };
    console.log(`${level.id.padEnd(20)} clean run ${t.toFixed(1)} s in the ${level.car || C.car}: good ${clock.good} s, evil ${clock.evil} s` +
      `  (was ${JSON.stringify(level.clock || { good: Math.round(level.time * 1.2), evil: Math.round(level.time * 0.85) })})`);
    save(level, clock);
  }
} finally {
  await server.close();
}
process.exit(0);
