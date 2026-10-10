// A headless check of the levels' descriptions (a level's "description": see the top of src/delivery/levels.js), in
// seconds: every level on the menu has one for each side it is played on (only "good" on a level that is always
// Good), each a sentence or two of no more than MOST characters, and the two not the same.
//   node scripts/.descriptions-check.mjs [--list]      (--list: every level's, with their lengths)
import { boot } from './delivery-headless.mjs';

const MOST = 160, LEAST = 40;
const g = await boot();
let failed = 0;
const fail = (text) => { failed++; console.log('FAIL ' + text); };
try {
  const { LEVELS, levelLabel } = g.levels;
  LEVELS.forEach((level, i) => {
    const d = level.description, oneSided = !!(level.battle || level.alwaysGood);
    if (!d) return fail(level.id + ': no description');
    for (const side of oneSided ? ['good'] : ['good', 'evil']) {
      const text = d[side];
      if (typeof text !== 'string' || !text.trim()) { fail(level.id + ': no ' + side + ' description'); continue; }
      if (text.length > MOST) fail(level.id + ': its ' + side + ' description is ' + text.length + ' characters (' + MOST + ' at most)');
      if (text.length < LEAST) fail(level.id + ': its ' + side + ' description is only ' + text.length + ' characters');
      if (text !== text.trim() || /\s{2,}/.test(text)) fail(level.id + ': stray spaces in its ' + side + ' description');
      if (!/[.!?]$/.test(text)) fail(level.id + ': its ' + side + ' description does not end a sentence');
      if (process.argv.includes('--list')) console.log(levelLabel(i).padEnd(4) + side.padEnd(5) + String(text.length).padStart(4) + '  ' + text);
    }
    if (oneSided && d.evil) fail(level.id + ': always Good, but it has an evil description');
    if (!oneSided && d.good === d.evil) fail(level.id + ': the two descriptions are the same');
    for (const key of Object.keys(d)) if (key !== 'good' && key !== 'evil') fail(level.id + ': description.' + key + '?');
  });
  console.log(failed ? failed + ' FAILED' : LEVELS.length + ' levels, every description there and within ' + MOST + ' characters');
} finally {
  await g.close();
}
process.exit(failed ? 1 : 0);
