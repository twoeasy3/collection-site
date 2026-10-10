// ============================================================================
// LEVEL INFO - what the menu says of a level besides its name: the medal a best time earns, and which
// gimmicks the level has (read off its fields: see the top of levels.js). No drawing here: see
// render/levelcards.js.
// ============================================================================
import { CONFIG } from './config.js';

// The medal for delivering a level with `spare` s on the clock, on a side: 'gold', 'silver', 'bronze' (any
// delivery on time), or null (not delivered). A level's clock is a clean run in the reference car times
// CONFIG.clock's factor for the side, so that run would leave clock x (1 - 1 / factor) to spare; silver and
// gold are shares of that (CONFIG.medals), which a better car than the reference one can beat.
export const medalFor = (level, evil, spare) => {
  if (typeof spare !== 'number') return null;
  const clock = level.clock?.[evil ? 'evil' : 'good'] ?? 0;
  const clean = clock * (1 - 1 / CONFIG.clock[evil ? 'evil' : 'good']);
  return spare >= clean * CONFIG.medals.gold ? 'gold' : spare >= clean * CONFIG.medals.silver ? 'silver' : 'bronze';
};
// the time to spare a medal asks for (s), to say what the next one would take
export const medalNeeds = (level, evil, medal) => {
  const clock = level.clock?.[evil ? 'evil' : 'good'] ?? 0;
  return medal === 'bronze' ? 0 : clock * (1 - 1 / CONFIG.clock[evil ? 'evil' : 'good']) * CONFIG.medals[medal];
};

// every gimmick a level can have: its name on the menu, and how to tell that a level has it. In the order
// they are listed on a card: the ones that make a level what it is first
const some = (list) => Array.isArray(list) ? list.length > 0 : !!list;
const GIMMICKS = [
  ['Amphibious cars only', (l) => l.amphibious],
  ['Water stages', (l) => some(l.water)],
  ['Boats', (l) => some(l.water) && Object.keys(l.traffic || {}).some(kind => CONFIG.vehicles[kind]?.boat)],
  ['Currents', (l) => (l.water || []).some(w => w.current)],
  ['Race', (l) => l.laps],
  ['Rival couriers', (l) => l.rival],
  ['Battle', (l) => l.battle],
  ['Asteroids', (l) => some(l.asteroidFields)],
  ['Hurricane', (l) => some(l.storm)],
  ['Rising tide', (l) => some(l.tide)],
  ['Tunnels', (l) => some(l.tunnels)],
  ['Bullet train', (l) => l.railway],
  ['Gunfire', (l) => some(l.gunfire)],
  ['Hippos', (l) => some(l.hippos)],
  ['Elephants', (l) => some(l.elephants)],
  ['Migration', (l) => some(l.migration)],
  ['Falling wreckage', (l) => (l.wreckage || []).some(w => w.kind !== 'blast' && w.kind !== 'boulders')],
  ['Blasts', (l) => (l.wreckage || []).some(w => w.kind === 'blast')],
  ['Boulders', (l) => (l.wreckage || []).some(w => w.kind === 'boulders')],
  ['Rockfall', (l) => some(l.rockfall)],
  ['Machinery', (l) => some(l.machinery) || some(l.siteWorks)],
  ['Dancing portaloos', (l) => some(l.potties)],
  ['Parade', (l) => some(l.parades)],
  ['Roadblock', (l) => some(l.roadblocks)],
  ['Reversible lane', (l) => some(l.reversible)],
  ['Convoys', (l) => l.convoys],
  ['Falling cargo', (l) => l.traffic?.cargotruck > 0],
  ['Ice-cream stop', (l) => some(l.iceCreamStops)],
  ['Burst water mains', (l) => some(l.waterMains)],
  ['Speed cameras', (l) => some(l.cameras)],
  ['Level crossing', (l) => some(l.crossings)],
  ['Roadworks', (l) => some(l.stopGo)],
  ['Drawbridge', (l) => some(l.drawbridges)],
  ['School crossing', (l) => some(l.schoolCrossings)],
  ['Wide load', (l) => some(l.wideLoads)],
  ['Balloon', (l) => some(l.balloons)],
  ['Marathon', (l) => some(l.marathons)],
  ['Trolleys', (l) => some(l.trolleys)],
  ['Stampede', (l) => some(l.stampedes)],
  ['Crosswind', (l) => some(l.crosswinds)],
  ['Ramp over the jam', (l) => some(l.jamRamps)],
  ['Washboard dirt', (l) => some(l.washboards)],
  ['Crest jumps', (l) => l.segments.some(seg => seg.ease && seg.grade)],
  ['Cyclists', (l) => some(l.pelotons)],
  ['Funerals', (l) => l.processions],
  ['Ambulances', (l) => l.emergencies],
  ['Police pursuit', (l) => l.pursuits],
  ['Fog', (l) => some(l.fog)],
  ['Ice', (l) => some(l.ice)],
  ['Mud', (l) => some(l.mud)],
  ['Potholes', (l) => some(l.potholes)],
  ['Frogs', (l) => some(l.frogs)],
  ['Drop bears', (l) => some(l.dropBears)],
  ['Animals', (l) => some(l.herds)],
  ['Tractors', (l) => some(l.tractors)],
  ['Roaming junk', (l) => some(l.drifters)],
  ['Crossroads', (l) => some(l.junctions)],
  ['Side roads', (l) => some(l.exits)],
  ['Bridges', (l) => some(l.bridges)],
  ['One-way', (l) => l.flow === 'north'],
  ['All oncoming', (l) => l.flow === 'south'],
];
// the names of the gimmicks a level has
export const levelGimmicks = (level) => GIMMICKS.filter(([, has]) => has(level)).map(([name]) => name);
