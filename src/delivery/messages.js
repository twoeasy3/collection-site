// ============================================================================
// MESSAGES - the short lines that pop up during a run: a powerup picked up, a bust, a driver
// reacting to a package. The wording is all in messages.json: each entry is a list, and one
// of them is picked at random each time; an empty list (or "") shows nothing.
// Two lines show at once (see render/hud.js), each for CONFIG.messageTime. A new message goes
// on the top line if it is free, then the bottom one; with both taken it always shows anyway,
// in place of the less important of the two (or, of two as important, the older). Only one
// driver's reaction is ever up: a new one takes the place of one already showing.
// ============================================================================
import MESSAGES from './messages.json';
import { CONFIG } from './config.js';

// each message has a kind, which sets its colour (see style.css, #messages) and how important
// it is, least first: reaction (white), pickup (yellow), rage (red: TANK RAGE, its pieces, a
// car destroyed), bust (blue)
const RANK = { reaction: 0, pickup: 1, rage: 2, bust: 3 };
const kindOf = (group, key) => group === 'reactions' ? 'reaction' : group === 'busts' ? 'bust'
  : group === 'wrecks' || group === 'tankParts' || key === 'tankRage' ? 'rage' : 'pickup';

const empty = () => ({ text: '', kind: '', at: 0, time: 0, id: 0 });
let nextId = 1;

export const Message = {
  lines: [empty(), empty()], // top, bottom: { text, kind, at (ms), time (s it stays up), id (new for every message) }
  // a line of text from messages.json, by its path (one of the entry's at random; '' if none)
  pick(group, ...keys) {
    let entry = MESSAGES[group];
    for (const key of keys) entry = entry && entry[key];
    const options = [].concat(entry || []).filter(o => typeof o === 'string' && o);
    return options.length ? options[Math.floor(Math.random() * options.length)] : '';
  },
  // shows a message, by its path in messages.json, e.g. say('powerups', 'turbo') or
  // say('powerups', 'mystery', 'toad'). Returns the line it is on (its text can still be added to)
  say(group, ...keys) {
    const text = this.pick(group, ...keys);
    if (!text) return null;
    const now = performance.now(), [top, bottom] = this.lines;
    const free = (line) => !line.text || now - line.at >= line.time * 1000;
    const outranks = (a, b) => RANK[a.kind] > RANK[b.kind] || (RANK[a.kind] === RANK[b.kind] && a.at > b.at);
    const kind = kindOf(group, keys[0]);
    const reaction = kind === 'reaction' ? this.lines.findIndex(line => !free(line) && line.kind === 'reaction') : -1;
    const slot = reaction >= 0 ? reaction : free(top) ? 0 : free(bottom) ? 1 : outranks(top, bottom) ? 1 : 0;
    this.lines[slot] = { text, kind, at: now, time: CONFIG.messageTime + (CONFIG.messageExtra[kind] || 0), id: nextId++ };
    return this.lines[slot];
  },
  clear() {
    this.lines = [empty(), empty()];
  },
};
