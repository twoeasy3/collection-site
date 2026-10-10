// ============================================================================
// THE ROAD'S OTHER CHARACTERS - road users with something of their own going on, that the player can use,
// help, hinder or keep clear of: each a timed or placed event with a level field of its own, and each in a
// file of its own (a police pursuit: pursuit.js; ...). This is only the list of them, so that the game
// (Game.start, Game.update) has one thing to reset and one to step, whatever is added here.
// ============================================================================
import { Pursuit } from './pursuit.js';

const ALL = [Pursuit];

export const Characters = {
  reset() { for (const c of ALL) c.reset(); },
  update(dt) { for (const c of ALL) c.update(dt); },
};
