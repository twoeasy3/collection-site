// ============================================================================
// LEVELS - plain data, one JSON file per level in ./levels// live in its own .json file. Everything is positioned by distance along the road, in metres
// from the start line, plus a lane number; nothing is in world coordinates.
//   segments   the expressway's shape: length (m), curve (radians per metre, + = right) and,
//              optionally, grade (rise per metre: 0.03 is a 3% climb, negative goes downhill).
//              Hills can't yet be combined with exits, and bridges must be on level road.
//   lanes      how many lanes the expressway has, an even number (default CONFIG.laneCount)
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
//   narrows    stretches where the expressway drops to `lanesPerSide` lanes each way
//   bridges    stretches where a bridge's structure stands on both shoulders
//   exits      side roads: an exit lane opens beside the right-hand lane before `exitAt`,
//              where the side road forks off; it comes back as a merge lane at `mergeAt`.
//              The side road's shape is worked out from those two points, so it always
//              joins up; the expressway has to swing away in between, and be straight
//              for 250 m before the exit and after the merge (room for the flyovers).
//   pickups    { type, s, lane }   type: turbo | ghost | wrench | passenger
//   theme      'city' (default), 'farm', 'hell' or 'space': the look of the ground, sky and roadside.
//              In space there is no ground and no road surface, only the lane lines.
//   car        a special vehicle the level is driven in whatever is in the garage ('ufo')
//   traffic    which vehicles turn up as traffic and how often, relative to each other:
//              { "car": 0.44, "van": 0.18, "police": 0.1 }. The kinds are those in
//              CONFIG.vehicles. An empty list ({}) means no traffic at all.
//   asteroidFields  { from, to, count, moving, seed }: `count` asteroids of assorted sizes
//              scattered over that stretch, the same every run for a given seed. About half
//              sit at road level; the rest pass just under or over it, unmarked. `moving` is the share that
//              drift across the road or bob up and down through it.
//   obstacles  { s, lane, kind }   things on the road that explode when hit. kind: 'barrier'
//                                  (default), 'bale', 'cone' or 'sign'
//   herds      { from, to, count } animals (cows) wandering back and forth across that stretch
//   tractors   { s, lane }         a tractor: slow traffic that starts from that spot every run
//   frogs      { from, to }        a stretch of road that a large frog roams all over
//   id         unique name, used as the level's key in saved progress
//   targets    { s, side }         TANK RAGE targets beside the road; side: 'left' | 'right'
//   time       seconds on the clock (before the Good / Evil scaling in CONFIG.timeScale)
//   tip        the money earned for finishing before the clock reaches zero
//              Lane 0 is the far left (oncoming). Add road: 'side' to put an item on a side
//              road (and exit: n for the nth exit's): s from its start, lane 0 oncoming / 1 ours.
// A level is checked as it loads; problems are shown on screen and in the console.
// To add a level: add a .json file to ./levels, import it here and add it to LEVELS.
// ============================================================================
import expressway from './levels/expressway.json';
import backRoads from './levels/back-roads.json';
import farm from './levels/farm.json';
import bigBusiness from './levels/big-business.json';
import allHeck from './levels/all-heck.json';
import ufo from './levels/ufo.json';

export const LEVELS = [expressway, backRoads, farm, bigBusiness, allHeck, ufo];

// The level picked on the menu. These are live bindings: importers see the new level as soon
// as selectLevel() changes it. Nothing is built from it until a run starts (see Game.load).
export let LEVEL_INDEX = 0;
export let LEVEL = LEVELS[0];
export const selectLevel = (index) => {
  LEVEL_INDEX = Math.max(0, Math.min(LEVELS.length - 1, index));
  LEVEL = LEVELS[LEVEL_INDEX];
};
