// ============================================================================
// LEVELS - plain data, one JSON file per level in ./levels// live in its own .json file. Everything is positioned by distance along the road, in metres
// from the start line, plus a lane number; nothing is in world coordinates.
//   segments   the expressway's shape: length (m), curve (radians per metre, + = right; a hairpin
//              is a bend turning pi radians, no tighter than the road is wide) and,
//              optionally, grade (rise per metre: 0.03 is a 3% climb, negative goes downhill).
//              Hills can't yet be combined with exits, and bridges must be on level road.
//   drive      'right' (default) or 'left': the side the traffic keeps to. Everything else in the
//              level is written as if driving on the right (lanes, exits, turns, sides), and a
//              left-hand level is shown as its mirror image: a "right" turn is seen as a left one
//   junctions  { s, turn, forward, turnOff }: a crossroads, its bend (or box) starting at s; turn:
//              'left' | 'right' (the road turns a quarter there: the level's segments must have the
//              bend) or 'straight'. See CONFIG.junction
//   lanes      the expressway's lanes: a number, half each side of the centre line, an odd one
//              over on the right (default CONFIG.laneCount); or { north, south }: how many on the
//              right, going the player's way, and on the left, oncoming
//   median     neutral lanes down the middle of a two-way road, which no traffic uses
//   railway    { every: { min, max } }: a railway down the median (it needs one), with a bullet
//              train coming through, against the player, every min-max s
//   flow       'north' = every vehicle goes the player's way, 'south' = every vehicle comes
//              the other way; either way the traffic uses all the lanes. Left out, the left
//              half of the road is oncoming. A one-way level's exits have no flyovers, and
//              need no straight road around them. Exits can't be combined with 'south'.
//   shoulderRows  { kind, from, to, every, side } a row of obstacles standing on the
//              shoulder, one every `every` metres. kind: 'cone' | 'sign' (or any obstacle
//              kind); side: 'left' | 'right' | 'both' (default). Exit and merge lanes are left clear.
//   shoulderTimer  false = no danger timer: the shoulders can be driven on freely, and
//              police cars don't bust for it either
//   helicopter false = the rescue and police helicopters are not drawn (they still act)
//   narrows    stretches where each side of the expressway drops to `lanesPerSide` lanes
//   bridges    stretches where a bridge's structure stands on both shoulders
//   exits      side roads: an exit lane opens beside the right-hand lane before `exitAt`,
//              where the side road forks off; it comes back as a merge lane at `mergeAt`.
//              The side road's shape is worked out from those two points, so it always
//              joins up; the expressway has to swing away in between, and be straight
//              for 250 m before the exit and after the merge (room for the flyovers).
//   pickups    { type, s, lane }   type: turbo | ghost | wrench | passenger | mystery | radarDetector | siren
//                                       | badGas | heavyMass | timePlus | timeMinus
//   theme      'city' (default), 'farm', 'beach', 'suburb', 'canberra', 'snow', 'singapore', 'singaporeNight', 'coast' (in zones), 'safari' (in zones: a dirt road, unmarked), 'hell' or 'space': the look of the ground, sky and roadside.
//              'snow' is a mountainside: land that climbs and falls with the road and fills in between its switchbacks.
//              In space there is no ground and no road surface, only the lane lines.
//   car        a special vehicle the level is driven in whatever is in the garage ('ufo')
//   traffic    which vehicles turn up as traffic and how often, relative to each other:
//              { "car": 0.44, "van": 0.18, "police": 0.1 }. The kinds are those in
//              CONFIG.vehicles. An empty list ({}) means no traffic at all.
//   trafficCount, oncomingCount  how many vehicles are about at once, each way (defaults in
//              CONFIG; together no more than CONFIG.trafficPool)
//   drivers    { evil, happy, angry }: the share of drivers that are evil, and the chance a
//              driver starts out happy or angry (defaults: CONFIG.evilShare and startMood)
//   trafficSpeed  { min, max } m/s the traffic cruises at (default CONFIG.trafficMin/MaxSpeed)
//   emergencies  { every: { min, max } }: now and then (every min-max s) an ambulance comes
//              through, siren going, either way (see CONFIG.emergency)
//   hesitation false = traffic too fast for the player never hesitates, and none comes up from
//              behind (see CONFIG.hesitation)
//   asteroidFields  { from, to, count, moving, seed }: `count` asteroids of assorted sizes
//              scattered over that stretch, the same every run for a given seed. About half
//              sit at road level; the rest pass just under or over it, unmarked. `moving` is the share that
//              drift across the road or bob up and down through it.
//   obstacles  { s, lane, kind }   things on the road that explode when hit. kind: 'barrier'
//                                  (default), 'railBarrier' (one the bullet train leaves standing),
//                                  'bale', 'cone', 'sign', or the beach's 'umbrella',
//                                  'surfboard', 'cooler' and 'chair' (a lifeguard chair)
//   dropBears  { from, to, count } drop bears up in the trees over that stretch, dropping onto the
//              road as the player comes near (see CONFIG.dropBear)
//   herds      { from, to, count, kind } animals wandering back and forth across that stretch: cows,
//                                  or (kind: 'kangaroo') kangaroos bounding across, with a warning sign before
//   drifters   { from, to, kind, count, pattern } obstacles of that kind moving about the road
//              in a pattern: 'circle', 'zigzag' (along the road, weaving), 'sweep' (across
//              and back) or 'figure8'. They are hit like any obstacle of their kind.
//   storm      { from, to, count, seed } vehicles blown through the air above that stretch,
//              tumbling, looping round when they reach its end. Only a sight: nothing can hit them.
//   tractors   { s, lane }         a tractor: slow traffic that starts from that spot every run
//   parked     { s, side }         a car parked on that shoulder ('left' | 'right'), hazards on, every run
//   zones      { id, from, to, scenery, ground, sky, sea, traffic }: stretches of the level with a look
//              of their own (on a level whose theme is 'zones': see render/road.js) and, if given, a
//              traffic list of their own for the traffic turning up there. The player is welcomed
//              into each (messages.json: zones, by id)
//   ice        { from, to, lane }  an ice patch on that lane (no lane: across the road) (see CONFIG.ice)
//   tide       { from, to, start, end, waves: { every: { min, max }, reach: { min, max } } }: a causeway
//              the sea comes in over, on the player's side of the road only, from the kerb in. It
//              floods `start` lane widths in from the pavement's edge (the shoulder counts as one)
//              at the start of a run, rising to `end` as the clock runs down; every min-max s a
//              wave (warned of) floods a stretch `reach` lanes further for a few seconds, then
//              drains right out, leaving the road bare a while. washUp: { types: { type: share },
//              count: { min, max } }: pickups each wave leaves in the water. On a two-way road
//              with no exits. See tide.js and CONFIG.tide
//   frogs      { from, to }        a stretch of road that a large frog roams all over
//   migration  { from, to, count, kinds: { kind: share }, dir }: a great herd (kinds: 'wildebeest',
//              'zebra') streaming across the road over that stretch, one way (dir: 1 = to the
//              right), and round again: obstacles, blown up when hit (see CONFIG.migration)
//   elephants  { from, to, count }: elephants plodding across the road and back over that stretch:
//              whatever one walks into is destroyed, traffic included (see elephants.js)
//   hippos     { from, to, every: { min, max } }: a river beside the road (on the right) over that
//              stretch, out of which a hippo charges across the road every min-max s, aimed at the
//              player: whatever it touches is destroyed, and it carries on (see hippos.js)
//   id         unique name, used as the level's key in saved progress
//   targets    { s, side }         TANK RAGE targets beside the road; side: 'left' | 'right'
//   time       seconds on the clock (before the Good / Evil scaling in CONFIG.timeScale)
//   clock      { good, evil }: seconds on the clock for each side exactly, in place of the scaled time
//   tip        the money earned for finishing before the clock reaches zero
//              Lane 0 is the far left (oncoming). Add road: 'side' to put an item on a side
//              road (and exit: n for the nth exit's): s from its start, lane 0 oncoming / 1 ours.
// A level is checked as it loads; problems are shown on screen and in the console.
// To add a level: add a .json file to ./levels, import it here and add it to MAIN_LEVELS (or
// SPECIAL_LEVELS). Putting one in among those already there changes the positions saved progress
// counts by: see LEVEL_ORDER in progress.js.
// ============================================================================
import expressway from './levels/expressway.json';
import backRoads from './levels/back-roads.json';
import farm from './levels/farm.json';
import bigBusiness from './levels/big-business.json';
import hurricane from './levels/hurricane.json';
import allHeck from './levels/all-heck.json';
import ufo from './levels/ufo.json';
import chaos from './levels/chaos.json';
import night from './levels/night.json';
import mysteryMeadows from './levels/mystery-meadows.json';
import suburbs from './levels/suburbs.json';
import canberra from './levels/canberra.json';
import monteCarlo from './levels/monte-carlo.json';
import singapore from './levels/singapore.json';
import singaporeNight from './levels/singapore-night.json';
import grandPacific from './levels/grand-pacific.json';
import passageDuGois from './levels/passage-du-gois.json';
import safari from './levels/safari.json';

// the numbered levels, and the special ones (S1, S2...), which always come after them on the
// menu. All of them unlock in this order, each by delivering the one before, and saved progress
// counts unlocked levels by position
export const MAIN_LEVELS = [expressway, backRoads, farm, bigBusiness, hurricane, night, mysteryMeadows, suburbs, canberra, monteCarlo, singapore, singaporeNight, grandPacific, passageDuGois, safari];
export const SPECIAL_LEVELS = [allHeck, ufo];
export const LEVELS = [...MAIN_LEVELS, ...SPECIAL_LEVELS];
// a level's number on the menu, by its position in LEVELS: '1'... for the main levels, 'S1'... for the special ones
export const levelLabel = (index) => index < MAIN_LEVELS.length ? String(index + 1) : 'S' + (index - MAIN_LEVELS.length + 1);
// the screensaver's level: not on the menu, driven round and round with no player car
export const SCREENSAVER_LEVEL = chaos;

// The level picked on the menu. These are live bindings: importers see the new level as soon
// as selectLevel() changes it. Nothing is built from it until a run starts (see Game.load).
export let LEVEL_INDEX = 0;
export let LEVEL = LEVELS[0];
export const selectLevel = (index) => {
  LEVEL_INDEX = Math.max(0, Math.min(LEVELS.length - 1, index));
  LEVEL = LEVELS[LEVEL_INDEX];
};
// a level that isn't on the menu (the screensaver's); selectLevel() puts the menu's back
export const selectSpecial = (level) => {
  LEVEL_INDEX = -1;
  LEVEL = level;
};
