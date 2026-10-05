// ============================================================================
// MESSAGES - the short lines that pop up during a run: a powerup picked up, a bust, a driver
// reacting to a package. The wording is all in messages.json: each entry is a list, and one
// of them is picked at random each time; an empty list (or "") shows nothing.
// One message shows at a time: a new one replaces whatever is up (see render/hud.js), except
// that while a bust is showing, a driver's reaction or a wreck can't push it aside.
// ============================================================================
import MESSAGES from './messages.json';
import { CONFIG } from './config.js';

const UNDER_BUSTS = ['reactions', 'wrecks'];

export const Message = {
  text: '',
  id: 0, // goes up with every new message, so the HUD knows to show it afresh
  group: '', at: 0, // the showing message's group, and when it went up (ms)
  // the path to it in messages.json, e.g. say('powerups', 'turbo') or say('powerups', 'mystery', 'toad')
  say(group, ...keys) {
    let entry = MESSAGES[group];
    for (const key of keys) entry = entry && entry[key];
    const options = [].concat(entry || []).filter(o => typeof o === 'string' && o);
    if (!options.length) return;
    const now = performance.now();
    if (this.group === 'busts' && UNDER_BUSTS.includes(group) && now - this.at < CONFIG.messageTime * 1000) return;
    this.text = options[Math.floor(Math.random() * options.length)];
    this.group = group;
    this.at = now;
    this.id++;
  },
  clear() {
    this.text = '';
    this.group = '';
    this.id++;
  },
};
