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
    { id: 'pancakes', name: 'Stack of pancakes' },
    { id: 'ramen', name: 'Bowl of ramen' },
    { id: 'cactus', name: 'Gift-wrapped cactus' },
    { id: 'clock', name: 'Grandfather clock' },
    { id: 'goldfish', name: 'Goldfish' },
    { id: 'bouquet', name: 'Bouquet in a vase' },
    { id: 'present', name: 'Birthday present' },
    { id: 'teaset', name: 'Tiered tea set' },
    { id: 'canary', name: 'Canary in a cage' },
    { id: 'bonsai', name: 'Potted bonsai' },
    { id: 'lavalamp', name: 'Lava lamp' },
    { id: 'surfboard', name: 'Surfboard with a ribbon' },
    { id: 'sushi', name: 'Sushi boat' },
    { id: 'cake', name: 'Wedding cake' },
    { id: 'globe', name: 'Globe on a stand' },
    { id: 'toolbox', name: 'Open tool box' },
    { id: 'record', name: 'Record player' },
    { id: 'balloons', name: 'Bunch of balloons' },
    { id: 'coffee', name: 'Tray of coffees' },
    { id: 'telescope', name: 'Telescope on a tripod' },
    { id: 'trophy', name: 'Trophy' },
    { id: 'puppy', name: 'Puppy in a basket' },
    { id: 'sundae', name: 'Ice-cream sundae' },
    { id: 'snowglobe', name: 'Snow globe' },
  ],
  evil: [
    { id: 'parcel', name: 'Ticking parcel', states: ['Ticking', 'Fuse lit', 'About to blow'] },
    { id: 'porcupine', name: 'Porcupine', states: ['Sniffing about', 'Balled up', 'Rabid'] },
    { id: 'bees', name: 'Crate of bees', states: ['Humming', 'Rattling', 'Swarming'] },
    { id: 'doll', name: 'Cursed doll', states: ['Asleep', 'Awake', 'Possessed'] },
    { id: 'tentacle', name: 'Specimen jar', states: ['Coiled up', 'Lid lifting', 'Loose'] },
    { id: 'egg', name: 'Egg in a nest', states: ['Rocking', 'Cracked', 'Hatched'] },
    { id: 'cooker', name: 'Pressure cooker', states: ['Simmering', 'Whistling', 'Red hot'] },
    { id: 'flytrap', name: 'Venus flytrap', states: ['Jaws shut', 'Drooling', 'Snapping'] },
    { id: 'barrel', name: 'Barrel of toxic waste', states: ['Sealed', 'Leaking', 'Boiling over'] },
    { id: 'mirror', name: 'Haunted mirror', states: ['Ordinary', 'A face in it', 'Reaching out'] },
    { id: 'skunk', name: 'Skunk in a carrier', states: ['Asleep', 'Tail up', 'Spraying'] },
    { id: 'cannonball', name: 'Cannonball', states: ['Unlit', 'Fuse lit', 'Rolling about'] },
    { id: 'mimic', name: 'Mimic chest', states: ['Shut', 'Showing teeth', 'On the run'] },
    { id: 'fireworks', name: 'Bundle of fireworks', states: ['Tied up', 'One fizzing', 'Going off'] },
    { id: 'alien', name: 'Baby alien', states: ['Curled up', 'Awake', 'Breaking out'] },
    { id: 'teddy', name: 'Possessed teddy bear', states: ['Sitting', 'Head backwards', 'Risen'] },
    { id: 'bats', name: 'Cage of bats', states: ['Asleep', 'Waking', 'Frenzy'] },
    { id: 'ice', name: 'Block of ice', states: ['Frozen solid', 'Dripping', 'Thawed out'] },
    { id: 'snakes', name: 'Sack of snakes', states: ['Tied up', 'Heads out', 'Spilling out'] },
    { id: 'genie', name: 'Genie in a bottle', states: ['Corked', 'Cork wobbling', 'Coming out'] },
    { id: 'reactor', name: 'Reactor core', states: ['Steady', 'Spinning up', 'Critical'] },
    { id: 'goose', name: 'Angry goose', states: ['Quiet', 'Hissing', 'Out of the crate'] },
    { id: 'jack', name: 'Jack-in-the-box', states: ['Winding itself', 'Lid twitching', 'Sprung'] },
    { id: 'cloud', name: 'Thundercloud in a jar', states: ['Grey cloud', 'Rumbling', 'Lightning'] },
    { id: 'piranhas', name: 'Piranha tank', states: ['Idling', 'Circling', 'Leaping out'] },
  ],
};
export const CARGO_STATES = ['calm', 'agitated', 'furious'];
const find = (side, id) => CARGO[side].find(c => c.id === id);

// whether a level has a delivery to make at all: not a race, the Battlefield, or a level without packages
export const carriesCargo = (level) => !!level && !level.laps && !level.battle && !level.noPackages;
// what a level carries for a side: { id, name, states? }, or null on a level with nothing to deliver.
// Its own "cargo" if it names one. The levels on the menu that name none are dealt the items that no level
// names, in the list's order, down the menu, and after those the whole list, round and round: so every item turns up
// somewhere, however many levels there are and whatever they name (a rotation by a level's place on the menu
// stopped reaching them all once enough levels named their own). A level off the menu: by its id
const dealt = { good: null, evil: null };
const deal = (side) => {
  const list = CARGO[side], carrying = LEVELS.filter(carriesCargo);
  const taken = new Set(carrying.map(level => level.cargo?.[side]).filter(id => find(side, id)));
  const free = list.filter(item => !taken.has(item.id)), shift = side === 'evil' ? 2 : 0;
  const map = new Map();
  // (the Evil side starts two along, so a level's pair is not the same place in both lists)
  carrying.filter(level => !find(side, level.cargo?.[side])).forEach((level, i) => map.set(level, i < free.length ? free[(i + shift) % free.length] : list[(i - free.length + shift) % list.length]));
  return map;
};
export const cargoFor = (level, evil) => {
  if (!carriesCargo(level)) return null;
  const side = evil ? 'evil' : 'good', list = CARGO[side];
  const named = find(side, level.cargo?.[side]);
  if (named) return named;
  dealt[side] = dealt[side] || deal(side);
  if (dealt[side].has(level)) return dealt[side].get(level);
  const n = [...String(level.id || '')].reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return list[(n + (evil ? 2 + Math.floor(n / list.length) : 0)) % list.length];
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
