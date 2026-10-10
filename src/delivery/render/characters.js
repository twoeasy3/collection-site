// ---- THE ROAD'S OTHER CHARACTERS, DRAWN (see ../characters.js): one call from the frame loop for all of them,
// after the traffic is placed. And their address-bar shortcuts, for a picture or a look:
//   &pursuit=3        a police pursuit set off 3 s into the run, on any level that can have one
//   &pursuitend=caught | crashed | away    ...ending that way, as soon as it is a little way up the road
//   &pursuitbehind=60 ...starting that far behind the player (not CONFIG.pursuit.behind)
//   &pursuitsettle=40 ...and ending that far ahead of the player (not CONFIG.pursuit.forceSettle)
import { Pursuit } from '../pursuit.js';
import { syncPursuit } from './pursuit.js';

const params = new URLSearchParams(location.search);
if (params.get('pursuit') !== null) {
  Pursuit.force = { at: Number(params.get('pursuit')) || 0.1, end: params.get('pursuitend') || null,
    behind: params.get('pursuitbehind') ? Number(params.get('pursuitbehind')) : undefined,
    settle: params.get('pursuitsettle') ? Number(params.get('pursuitsettle')) : undefined, anywhere: true };
}

export const syncCharacters = (dt, now) => {
  syncPursuit(dt, now);
};
