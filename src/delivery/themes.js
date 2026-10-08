// ============================================================================
// THEMES - the looks a level can have (its "theme" field): the colours of its sky, ground and road, and the
// scenery beside it (drawn by render/road.js, by `scenery`). Only the data, nothing drawn here: so the game
// and the editor both read the one list. Any theme can go on any level (?theme=snow in the address tries one
// on the level picked): what a theme's scenery makes of something a level may have of its own (a runway,
// zones, landmarks, grandstands) it does without where the level has none.
// ============================================================================
export const THEMES = {
  city: { sky: 0x9fc4e8, ground: 0x5d8a4e, road: 0x3a3d42, scenery: 'city' },
  farm: { sky: 0xc4e6f5, ground: 0x8fb556, road: 0x57514a, scenery: 'farm' },
  // beach: sand, a stormy sky, the sea along the right, palms and beach huts
  beach: { sky: 0x7e8d9e, ground: 0xdccb95, road: 0x45484e, scenery: 'beach' },
  // space: no ground and no road surface, only glowing lane lines among the stars
  // singapore: the garden city: towers and housing blocks, rain trees, Supertrees and Marina Bay Sands
  singapore: { sky: 0xc9dde6, ground: 0x6d9a52, road: 0x3a3d42, scenery: 'singapore' },
  // singaporeNight: the same city at night, floodlit as for the Grand Prix (a city that is never
  // dark: a glowing navy sky, and everything well lit): lit windows, glowing Supertrees, light
  // pylons over the road, concrete walls and catch fences, kerbs on the corners
  singaporeNight: { sky: 0x1d2d55, ground: 0x3f6440, road: 0x4b4f57, scenery: 'singapore', night: true, lit: true, headlights: true,
    light: { sky: 0xd6dcff, ground: 0x6a6878, ambient: 1.25, sun: 0xfff0d6, sunlight: 0.75 } },
  // coast: a level in zones (its "zones"), each with a look of its own: see the 'zones' scenery,
  // and syncZones, which blends the sky and the ground from one zone's colours to the next
  // (zones: the ones it has on a level with none of its own, end to end in equal shares: see render/road.js)
  coast: { sky: 0x9fc8ee, ground: 0x6f9a52, road: 0x44474d, scenery: 'zones',
    zones: [{ scenery: 'bush', ground: 0x7d8a52, sky: 0xb3d0e2 }, { scenery: 'wollongong', ground: 0x6f9a52, sky: 0x9ccbea, sea: 8 },
      { scenery: 'kiama', ground: 0x7fb35a, sky: 0xa9d4f2, sea: 8 }] },
  // safari: a level in zones on a dirt road: no markings, only the ruts worn into it
  safari: { sky: 0xc6dcea, ground: 0xc2a85a, road: 0xa47a4c, scenery: 'zones', unmarked: true,
    zones: [{ scenery: 'savanna', ground: 0xc2a85a, sky: 0xc6dcea }, { scenery: 'kopjes', ground: 0xb59a62, sky: 0xcbd9e2 },
      { scenery: 'plains', ground: 0xb8a35e, sky: 0xd2e0e8 }] },
  // construction: a road being built: bare earth all round, a hazy sky, the road giving way to mud
  construction: { sky: 0xc4d2dc, ground: 0x9a8160, road: 0x4a4c50, scenery: 'construction' },
  // airport: an airport going up in flames: a smoky orange sky, dry grass between concrete aprons, the runway
  airport: { sky: 0xc98e62, ground: 0x8c8f62, road: 0x45484d, scenery: 'airport' },
  // snow: an alpine pass in winter. terrain: true = the land is a mountainside (see buildTerrain)
  snow: { sky: 0xd3dfe9, ground: 0xf0f4f7, road: 0x4f535a, scenery: 'alpine', terrain: true },
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
  bathurst: { sky: 0xa9d2ef, ground: 0x9aa55e, road: 0x45474c, scenery: 'bathurst', terrain: { gentle: 0x93a25a, steep: 0x9b6b4a, rough: 0.35, flat: 10, rise: 60 } },
  // panorama: the same mountain as an everyday road through the bush (Panorama Avenue: roadside: no circuit
  // walls, kerbs or stands, white guide posts along the edges and rocks in the grass), in the colours of
  // the Southern Highlands bushland (Sydney to Kiama's bush)
  panorama: { sky: 0xb3d0e2, ground: 0x7d8a52, road: 0x4a4c50, scenery: 'bathurst', roadside: true, terrain: { gentle: 0x7d8a52, steep: 0x8f6e4c, rough: 0.35, flat: 10, rise: 60 } },
  // montreal: Circuit Gilles-Villeneuve, on Île Notre-Dame in the St Lawrence: parkland, a summer sky
  montreal: { sky: 0xa6d2f2, ground: 0x5d9a4a, road: 0x3e4147, scenery: 'montreal' },
  // sea: open water everywhere, the way through it the same water, unmarked (water: no ruts either),
  // its edges blocked by breakwaters of rock and lines of marker buoys, islands off in the distance
  sea: { sky: 0x9fd2f0, ground: 0x1d7a96, road: 0x1d7a96, scenery: 'sea', unmarked: true, water: true },
  space: { sky: 0x05060d, ground: null, road: null, scenery: 'space', line: 0x7fe8ff, centre: 0xff62d6 },
  // night: the city after dark. The road and the ground are lit surfaces (lit: true), dark but
  // for a faint blue moon and the player's headlights; other cars show their own lamps.
  night: { sky: 0x05070e, ground: 0x34492d, road: 0x45484e, scenery: 'city', lit: true, headlights: true,
    light: { sky: 0x5d72b0, ground: 0x10141c, ambient: 0.3, sun: 0x9fb4ff, sunlight: 0.25 } },
};
