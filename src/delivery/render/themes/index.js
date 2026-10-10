// ---- THEMES WITH A FILE OF THEIR OWN: a theme's scenery (its `scenery` in ../../themes.js) drawn here, one file
// each, not in render/road.js. road.js calls the one named with what it has for standing things beside a road:
//   { theme, add, flat, instances, sideStrip, buildStrip, offRoads, standsClear, clearOfRoads, beside, inJunction,
//     exits, cube, tube, cone, levelGroup, elevatedRoad }
// (instances: one draw call per kind of thing, and nothing left standing on another road; sideStrip: a strip
// beside the road that stops short of any other; offRoads / standsClear / clearOfRoads: the tests themselves,
// for whatever is placed by hand. See road.js.) To add a theme: its file here, its name below.
import { toyroom } from './toyroom.js';

export const THEME_SCENERY = { toyroom };
