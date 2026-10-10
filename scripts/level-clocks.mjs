// Works out a level's clock (its "clock": { good, evil }) from a clean run in the reference car
// (CONFIG.clock): a ghost, flat out, from the start line to the drop, nothing in its way. The clock is that
// run's time times CONFIG.clock.good or .evil, less CONFIG.clock.timePlus s for each time plus on the level.
// A level driven in a car of its own (its "car") is timed in that. Only the levels named are timed.
//   node scripts/level-clocks.mjs mountain-pass tour-de-coast          prints their clean runs and clocks
//   node scripts/level-clocks.mjs mountain-pass tour-de-coast --write  and writes the clocks into their files
import { logicServer } from './delivery-headless.mjs'; // (a Vite server that shares no cache with any other run)
import { readFileSync, writeFileSync } from 'node:fs';

const WRITE = process.argv.includes('--write');
const IDS = process.argv.slice(2).filter(a => !a.startsWith('--'));
if (!IDS.length) { console.log('Name the levels to time: node scripts/level-clocks.mjs <id> ... [--write]'); process.exit(1); }

const element = () => ({ classList: { add() {}, remove() {} }, addEventListener() {}, style: {}, textContent: '' });
globalThis.window = { addEventListener() {} };
const allOpen = encodeURIComponent(JSON.stringify({ unlocked: 99, cars: ['commuter', 'sport', 'floatvan'] })); // (floatvan: CONFIG.clock.amphibious)
globalThis.document = { getElementById: element, querySelectorAll: () => [], body: element(), cookie: 'delivery_racer_progress=' + allOpen };

const server = await logicServer();
try {
  const load = (path) => server.ssrLoadModule(path);
  const levels = await load('/src/delivery/levels.js');
  const { cleanRun } = await load('/src/delivery/cleanrun.js'); // (the run and the sum: the level editor's button uses the same)
  const all = [...levels.LEVELS, ...Object.values(levels.HIDDEN_LEVELS)];
  for (const id of IDS) {
    const level = all.find(l => l.id === id);
    if (!level) { console.log(`${id}: no such level`); continue; }
    if (levels.LEVELS.includes(level)) levels.selectLevel(levels.LEVELS.indexOf(level));
    else levels.selectSpecial(level);
    const run = cleanRun();
    if (!run.delivered) { console.log(`${id}: NOT DELIVERED (${run.outcome})`); continue; }
    const { clock, pluses } = run;
    console.log(`${id}: clean run ${run.time.toFixed(1)} s in the ${run.car}, ${pluses} time plus${pluses === 1 ? '' : 'es'}: ` +
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
