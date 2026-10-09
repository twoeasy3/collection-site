// ---- THE CARGO: what the player is delivering ---------------------------------------------------
// Every delivery level carries one thing for a Good player and another for an Evil one, the same every
// run: a level's "cargo": { good, evil } (see levels.js), or else one picked by the level's place on the
// menu, so all ten turn up across the game. It is only a sight: nothing in play goes by it. It is shown
// in a corner of the HUD and set down at the kerb when the level is delivered (delivery.js); the models
// are render/cargoModels.js, by the ids here.
// An Evil item has three states, which follow the clock: calm with plenty of it left, agitated as it
// runs down, furious in the last stretch and all through the tip countdown (CONFIG.consignment).
import { CONFIG } from './config.js';
import { LEVELS } from './levels.js';

export const CARGO = {
  good: [
    { id: 'pizza', name: 'Tower of pizzas' },
    { id: 'cake', name: 'Wedding cake' },
    { id: 'goldfish', name: 'Goldfish' },
    { id: 'cactus', name: 'Gift-wrapped cactus' },
    { id: 'clock', name: 'Grandfather clock' },
  ],
  evil: [
    { id: 'parcel', name: 'Ticking parcel', states: ['Ticking', 'Fuse lit', 'About to blow'] },
    { id: 'porcupine', name: 'Porcupine', states: ['Sniffing about', 'Balled up', 'Rabid'] },
    { id: 'bees', name: 'Crate of bees', states: ['Humming', 'Rattling', 'Swarming'] },
    { id: 'doll', name: 'Cursed doll', states: ['Asleep', 'Awake', 'Possessed'] },
    { id: 'tentacle', name: 'Specimen jar', states: ['Coiled up', 'Lid lifting', 'Loose'] },
  ],
};
export const CARGO_STATES = ['calm', 'agitated', 'furious'];
const find = (side, id) => CARGO[side].find(c => c.id === id);

// whether a level has a delivery to make at all: not a race, the Battlefield, or a level without packages
export const carriesCargo = (level) => !!level && !level.laps && !level.battle && !level.noPackages;
// what a level carries for a side: { id, name, states? }, or null on a level with nothing to deliver.
// Its own "cargo" if it names one; if not, by its place among the levels (a level off the menu: by its id)
export const cargoFor = (level, evil) => {
  if (!carriesCargo(level)) return null;
  const side = evil ? 'evil' : 'good', list = CARGO[side];
  const named = find(side, level.cargo?.[side]);
  if (named) return named;
  let n = LEVELS.indexOf(level);
  if (n < 0) n = [...String(level.id || '')].reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return list[(n + (evil ? 2 + Math.floor(n / list.length) : 0)) % list.length]; // (the two sides drift out of step, so the pairs vary down the menu)
};
// a level's "cargo" checked: the problems with it, as text (scripts/.cargo-check.mjs goes through every level's)
export const cargoProblems = (level) => {
  const problems = [];
  for (const side of ['good', 'evil']) {
    const id = level.cargo?.[side];
    if (id !== undefined && !find(side, id)) problems.push('cargo: no ' + side + ' item "' + id + '" (' + CARGO[side].map(c => c.id).join(', ') + ')');
  }
  return problems;
};
// an Evil item's state (0 calm, 1 agitated, 2 furious) with `remaining` s of an `allowed` s clock left
export const cargoState = (remaining, allowed) => {
  const share = allowed > 0 ? remaining / allowed : 0;
  return share <= CONFIG.consignment.furious ? 2 : share <= CONFIG.consignment.agitated ? 1 : 0;
};
