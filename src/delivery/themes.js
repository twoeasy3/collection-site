// ============================================================================
// THEMES - the looks a level can have (its "theme" field): the colours of its sky, ground and road, and the
// scenery beside it (drawn by render/road.js, by `scenery`). Only the data, nothing drawn here: so the game
// and the editor both read the one list. Any theme can go on any level (?theme=snow in the address tries one
// on the level picked): what a theme's scenery makes of something a level may have of its own (a runway,
// zones, landmarks, grandstands) it does without where the level has none.
// channel: { shallow, deep, glint }: the colours of the water of a water stage (a level's "water": see
// render/water.js) in this theme, if not CONFIG.water.colours: a harbour at night, a muddy river, a fjord, a flood.
// target: { offset, height, style, base, arm, beam }: how this theme's TANK RAGE targets stand (see CONFIG.target and
// Targets in pickups.js), where the usual post 5 m beyond the pavement would be hidden: in front of a wall of
// buildings, on top of a parapet or a catch fence, hung out over the shoulder. A theme without one gets the usual.
// ============================================================================
// (on a circuit's trackside: a ring on a stalk on top of the catch fence, 4.7 m up, a beam of light over it)
const FENCE_TOP = { style: 'wall', offset: 0.3, base: 4.7, height: 6.6, beam: true };
export const THEMES = {
  city: { sky: 0x9fc4e8, ground: 0x5d8a4e, road: 0x3a3d42, scenery: 'city' },
  // flooded: the city after the river broke its banks: the city's own scenery standing in brown flood water (the
  // ground is the water's colour), under a low sky, in the rain (rain: true). Made for water stages (a level's
  // "water": see water.js), whose channels are the avenues under water and whose dry stretches the rises between
  flooded: { sky: 0x8a949c, ground: 0x5d7f86, road: 0x34373c, scenery: 'city', rain: true, channel: { shallow: 0x86a3a6, deep: 0x4f7780, glint: 0x6c949b },
    light: { sky: 0xd8dde4, ground: 0x4a5a5e, ambient: 1.1, sun: 0xe8ecf2, sunlight: 0.6 } },
  farm: { sky: 0xc4e6f5, ground: 0x8fb556, road: 0x57514a, scenery: 'farm' },
  // beach: sand, a stormy sky, the sea along the right, palms and beach huts
  beach: { sky: 0x7e8d9e, ground: 0xdccb95, road: 0x45484e, scenery: 'beach' },
  // space: no ground and no road surface, only glowing lane lines among the stars
  // singapore: the garden city: towers and housing blocks, rain trees, Supertrees and Marina Bay Sands
  singapore: { sky: 0xc9dde6, ground: 0x6d9a52, road: 0x3a3d42, scenery: 'singapore',
    target: { style: 'gantry', offset: -1, arm: 2, height: 5.2, beam: true } }, // (hung out over the shoulder, clear of the rain trees)
  // singaporeNight: the same city at night, floodlit as for the Grand Prix (a city that is never
  // dark: a glowing navy sky, and everything well lit): lit windows, glowing Supertrees, light
  // pylons over the road, concrete walls and catch fences, kerbs on the corners
  singaporeNight: { sky: 0x1d2d55, ground: 0x3f6440, road: 0x4b4f57, scenery: 'singapore', night: true, lit: true, headlights: true, target: FENCE_TOP,
    light: { sky: 0xd6dcff, ground: 0x6a6878, ambient: 1.25, sun: 0xfff0d6, sunlight: 0.75 } },
  // coast: a level in zones (its "zones"), each with a look of its own: see the 'zones' scenery,
  // and syncZones, which blends the sky and the ground from one zone's colours to the next
  // (zones: the ones it has on a level with none of its own, end to end in equal shares: see render/road.js)
  coast: { sky: 0x9fc8ee, ground: 0x6f9a52, road: 0x44474d, scenery: 'zones',
    zones: [{ scenery: 'bush', ground: 0x7d8a52, sky: 0xb3d0e2 }, { scenery: 'wollongong', ground: 0x6f9a52, sky: 0x9ccbea, sea: 8 },
      { scenery: 'kiama', ground: 0x7fb35a, sky: 0xa9d4f2, sea: 8 }] },
  // safari: a level in zones on a dirt road: no markings, only the ruts worn into it
  safari: { sky: 0xc6dcea, ground: 0xc2a85a, road: 0xa47a4c, scenery: 'zones', unmarked: true, channel: { shallow: 0xa9a878, deep: 0x5f8274, glint: 0x7c9a86 },
    target: { height: 4.4, beam: true }, // (up over the tall grass)
    zones: [{ scenery: 'savanna', ground: 0xc2a85a, sky: 0xc6dcea }, { scenery: 'kopjes', ground: 0xb59a62, sky: 0xcbd9e2 },
      { scenery: 'plains', ground: 0xb8a35e, sky: 0xd2e0e8 }] },
  // construction: a road being built: bare earth all round, a hazy sky, the road giving way to mud
  construction: { sky: 0xc4d2dc, ground: 0x9a8160, road: 0x4a4c50, scenery: 'construction' },
  // airport: an airport going up in flames: a smoky orange sky, dry grass between concrete aprons, the runway
  airport: { sky: 0xc98e62, ground: 0x8c8f62, road: 0x45484d, scenery: 'airport' },
  // snow: an alpine pass in winter. terrain: true = the land is a mountainside (see buildTerrain)
  snow: { sky: 0xd3dfe9, ground: 0xf0f4f7, road: 0x4f535a, scenery: 'alpine', terrain: true, channel: { shallow: 0x9fc4d0, deep: 0x24566f, glint: 0x3a7391 } },
  // canberra: the bush capital: dry grass, gum trees and concrete, a grassy median
  canberra: { sky: 0xb9d8ee, ground: 0xa3ad66, road: 0x4a4c50, scenery: 'canberra', median: 0x7f9a4f },
  // hood: the same suburb gone to seed (rundown: see the suburb scenery): dead grass and bare dirt, drab
  // houses with boarded-up windows, burnt-out shells, broken fences, dead trees, wrecks and rubbish
  hood: { sky: 0xbcc3c2, ground: 0x9a8d55, road: 0x46474a, scenery: 'suburb', rundown: true },
  // suburb: lawns, pavements, picket fences and houses in a row
  suburb: { sky: 0xa9d6f5, ground: 0x6aa84f, road: 0x484b50, scenery: 'suburb' },
  hell: { sky: 0x2a0704, ground: 0x3a120a, road: 0x1b1414, scenery: 'hell', line: 0xffb36b },
  // battlefield: a dirt track through a war (unmarked: only the ruts worn into it), churned mud under a smoky
  // sky, shell craters, sandbagged trenches, tank traps, barbed wire and shattered trees (and the pillboxes:
  // render/battle.js)
  battlefield: { sky: 0xa89f92, ground: 0x6d6248, road: 0x7d6440, scenery: 'battlefield', unmarked: true },
  // bathurst: Mount Panorama, a racetrack on a mountain in the New South Wales bush: the land climbs
  // and falls with the circuit (terrain: grass where it is gentle, red clay where it is steep), gum
  // trees all over the hill
  bathurst: { sky: 0xa9d2ef, ground: 0x9aa55e, road: 0x45474c, scenery: 'bathurst', target: FENCE_TOP, terrain: { gentle: 0x93a25a, steep: 0x9b6b4a, rough: 0.35, flat: 10, rise: 60 } },
  // panorama: the same mountain as an everyday road through the bush (Panorama Avenue: roadside: no circuit
  // walls, kerbs or stands, white guide posts along the edges and rocks in the grass), in the colours of
  // the Southern Highlands bushland (Sydney to Kiama's bush)
  panorama: { sky: 0xb3d0e2, ground: 0x7d8a52, road: 0x4a4c50, scenery: 'bathurst', roadside: true, terrain: { gentle: 0x7d8a52, steep: 0x8f6e4c, rough: 0.35, flat: 10, rise: 60 } },
  // montreal: Circuit Gilles-Villeneuve, on Île Notre-Dame in the St Lawrence: parkland, a summer sky
  montreal: { sky: 0xa6d2f2, ground: 0x5d9a4a, road: 0x3e4147, scenery: 'montreal', target: FENCE_TOP },
  // sea: open water everywhere, the way through it the same water, unmarked (water: no ruts either),
  // its edges blocked by breakwaters of rock and lines of marker buoys, islands off in the distance
  sea: { sky: 0x9fd2f0, ground: 0x1d7a96, road: 0x1d7a96, scenery: 'sea', unmarked: true, water: true },
  // the real circuits with a look of their own (scenery 'circuit': render/circuits/<circuit>.js draws each)
  // monza: the Autodromo Nazionale in its royal park: all but flat (its few metres of rise and fall are the land's: terrain), among tall trees, the old banking off in the woods
  monza: { sky: 0xa8d0ee, ground: 0x6f9a4e, road: 0x45474c, scenery: 'circuit', circuit: 'monza', target: FENCE_TOP, terrain: { gentle: 0x6f9a4e, steep: 0x5d8343, rough: 0.12, flat: 14, rise: 80 } },
  // spa: Spa-Francorchamps in the Ardennes: the land climbs and falls with the circuit (terrain), pine forest all round
  spa: { sky: 0xb4c9d8, ground: 0x5f8a44, road: 0x4a4c50, scenery: 'circuit', circuit: 'spa', target: FENCE_TOP, terrain: { gentle: 0x5f8a44, steep: 0x4e6e3a, rough: 0.3, flat: 12, rise: 60 } },
  // albert-park: Melbourne's Albert Park: a lap of the lake, parkland and the city's towers beyond
  'albert-park': { sky: 0xb7d6f0, ground: 0x7aa851, road: 0x44474d, scenery: 'circuit', circuit: 'albert-park', target: FENCE_TOP },
  space: { sky: 0x05060d, ground: null, road: null, scenery: 'space', line: 0x7fe8ff, centre: 0xff62d6 },
  // night: the city after dark. The road and the ground are lit surfaces (lit: true), dark but
  // for a faint blue moon and the player's headlights; other cars show their own lamps.
  night: { sky: 0x05070e, ground: 0x34492d, road: 0x45484e, scenery: 'city', lit: true, headlights: true,
    light: { sky: 0x5d72b0, ground: 0x10141c, ambient: 0.3, sun: 0x9fb4ff, sunlight: 0.25 } },
  // hongkong: Victoria Harbour at night: the harbour along the right (sea: m from the road to the water),
  // a wall of lit towers along the left and across the water, neon signs hung out over the road, junks
  // and the Star Ferry crossing the harbour (ferry: true), and double-decker trams up and down the median
  // (trams: true, on a level with a "median")
  hongkong: { sky: 0x0b1024, ground: 0x2a2d33, road: 0x3e4148, scenery: 'hongkong', lit: true, headlights: true, night: true, sea: 14, ferry: true, trams: true,
    target: { offset: 2.2, height: 3.6, beam: true }, // (on the pavement, in front of the towers' faces)
    channel: { shallow: 0x2f5a68, deep: 0x12303f, glint: 0x1f4c5c },
    light: { sky: 0x9fb0ff, ground: 0x2a2436, ambient: 0.75, sun: 0xffe0c0, sunlight: 0.45 } },
  // tokyo: the Shuto Expressway at night, elevated the whole way (elevated: the road stands on piers, a
  // parapet along each edge, the city far below), green overhead signs, the towers of the city all round
  tokyo: { sky: 0x070a16, ground: 0x1d2028, road: 0x3b3e45, scenery: 'tokyo', lit: true, headlights: true, night: true, elevated: 22,
    target: { style: 'wall', offset: 0.2, base: 1.2, height: 4.5, beam: true }, // (on the parapet: beyond it there is only the drop)
    light: { sky: 0x8fa3ff, ground: 0x1a1a24, ambient: 0.7, sun: 0xfff0d6, sunlight: 0.4 } },
  // mumbai: the monsoon: rain (rain: true), a leaden sky, a wet road, colour-washed low buildings crowded up
  // to the road, hoardings, palms, and water lying everywhere
  mumbai: { sky: 0x7d8690, ground: 0x6b6a52, road: 0x2e3136, scenery: 'mumbai', rain: true,
    target: { style: 'gantry', offset: -1.2, arm: 2.2, height: 5, beam: true }, // (a mast on the pavement, the ring hung out over the shoulder: the buildings stand 3.5 m off)
    light: { sky: 0xd8dde4, ground: 0x4a4a40, ambient: 1.1, sun: 0xe8ecf2, sunlight: 0.6 } },
  // christmas: the suburb under snow (festive: lights along the eaves, a lit tree in every garden, wreaths
  // on the doors), snow falling (snow: true), a sleigh among whatever the level's "storm" blows over
  christmas: { sky: 0x1a2340, ground: 0xeef2f6, road: 0x4a4e55, scenery: 'suburb', festive: true, snow: true, lit: true, headlights: true, night: true,
    light: { sky: 0x9fb4ff, ground: 0x3a3f55, ambient: 0.9, sun: 0xdfe6ff, sunlight: 0.55 } },
  // toyroom: the whole level at toy scale (render/themes/toyroom.js): a run of orange plastic track across a blue
  // carpet, alphabet blocks, bricks, crayons, marbles and dominoes beside it, a wooden railway, a cat asleep, the
  // furniture for a skyline; the sky is the wallpaper
  toyroom: { sky: 0xf1e3c8, ground: 0x6f8fb8, road: 0xff7a1a, scenery: 'toyroom', line: 0xffffff, centre: 0x1f6fd0,
    tunnel: { wall: 0xb98a55, tiles: 0xd9b077, roof: 0xa87c4a, face: 0xc49a66, lamp: 0xfff3d0 } },
  // seabed: an underwater tunnel (render/themes/seabed.js): the road in a glass tube along the sea bed, coral, kelp,
  // shoals, a whale, a wreck and a yellow submarine outside it, shafts of light from the surface; the fog is the water
  seabed: { sky: 0x0d5f86, ground: 0x6aa79c, road: 0x39434e, scenery: 'seabed', line: 0xe8f6ff, centre: 0xffd23a,
    light: { sky: 0xc8f0ff, ground: 0x2a6a78, ambient: 1.45, sun: 0xd8f6ff, sunlight: 0.9 },
    tunnel: { wall: 0x5f7482, tiles: 0x8fa6b5, roof: 0x4a5a66, face: 0x7a8f9c, lamp: 0xcff3ff } },
  // moon: a moon base (render/themes/moon.js): grey regolith and craters under a black sky with the stars and the Earth in
  // it, a road of compacted dust between marker lamps, domes, habitat tubes, solar panels, a lander, a rocket on its pad.
  // Hard sunlight and little else (lit); the dark is the horizon. Unlike 'space', it has ground and a road
  moon: { sky: 0x04050a, ground: 0x8b8c92, road: 0x55565c, scenery: 'moon', line: 0xf2f2f2, centre: 0xffa51f, lit: true, headlights: true,
    light: { sky: 0xffffff, ground: 0x24242c, ambient: 0.8, sun: 0xfff6e6, sunlight: 2.1 },
    tunnel: { wall: 0xb8bcc4, tiles: 0xe2e6ec, roof: 0x8a8f98, face: 0xc9cdd4, lamp: 0xfff0c8 } },
  // (batch A: toy room, underwater tunnel, moon base: new themes go above this line)
  // (batch B: film studio, Venice, ice road: new themes go above this line)
  // (batch C: theme park, volcano island, container port: new themes go above this line)
  // wildwest: the old Wild West (render/themes/wildwest.js): a dirt road over red desert, a town of false-front wooden buildings
  // every 800 m with the road for its main street, a railway and its steam train along the left, mesas on the skyline
  wildwest: { sky: 0x7fb8e6, ground: 0xc8754a, road: 0xd6b083, scenery: 'wildwest', unmarked: true,
    target: { offset: 2, height: 4.6, beam: true }, // (at the street's edge, over the hitching rails: the buildings' faces are 6 m off)
    tunnel: { wall: 0x6b4a32, tiles: 0x8f6a44, roof: 0x4a3526, face: 0x97492f, lamp: 0xffc870 } },
  // (batch D: Wild West, favela, rice terraces: new themes go above this line)
};
