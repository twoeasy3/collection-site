// ============================================================================
// IDEA_CARS - thirty car ideas, on show in the garage's "Car ideas" lot (render/ideaslot.js) and nowhere
// else. They are ideas to look at and judge, NOT cars yet: none is in CARS (cars.js) or CONFIG.vehicles,
// none is for sale, owned, saved, driven, in traffic or in a level. Each has a generic name and the real
// vehicle it is drawn from (see "Car ideas lot" in CHECKLIST-10-Oct.md).
//   name       its name in the game (no maker's or model's name)
//   basedOn    the real vehicle it is based on
//   model      its model, by name (see render/ideaModels.js: IDEA_MODELS)
//   hw, hl     half width / half length (m), and height: the real vehicle's, at the game's scale
//   color      its paint as a Good car's; evilColor: as an Evil one's
//   note       one line about it, for the lot's tip
// To make one a real car: give it an entry in CARS (its stats, tier and price), and move its builder from
// IDEA_MODELS to MODELS.
// ============================================================================
export const IDEA_CARS = [
  { id: 'bubble', name: 'Bubble Car', basedOn: 'BMW Isetta', model: 'bubble', color: 0x8fc9dd, evilColor: 0x8a1f2b,
    hw: 0.69, hl: 1.15, height: 1.34, note: 'The whole front is the door. The smallest thing on the road.' },
  { id: 'threewheeler', name: 'Three-Wheeler', basedOn: 'Reliant Robin', model: 'threewheeler', color: 0xe0902a, evilColor: 0x3d4a2a,
    hw: 0.71, hl: 1.67, height: 1.37, note: 'One wheel at the front. It leans in a corner, and sometimes keeps going.' },
  { id: 'tinsnail', name: 'Tin Snail', basedOn: 'Citroën 2CV', model: 'tinsnail', color: 0x7f9fb4, evilColor: 0x5e1220,
    hw: 0.74, hl: 1.92, height: 1.6, note: 'Soft springs, a roll-back roof and no hurry at all.' },
  { id: 'bug', name: "People's Bug", basedOn: 'Volkswagen Beetle (Type 1)', model: 'bug', color: 0x9fd0a8, evilColor: 0x1d1d22,
    hw: 0.77, hl: 2.04, height: 1.5, note: 'A dome on four round wings, with the engine in the tail.' },
  { id: 'twostroke', name: 'Two-Stroke Saloon', basedOn: 'Trabant 601', model: 'twostroke', color: 0xb5cfe0, evilColor: 0x6f7a55,
    hw: 0.75, hl: 1.78, height: 1.44, note: 'A little pastel box that leaves a blue haze behind it.' },
  { id: 'brickestate', name: 'Brick Estate', basedOn: 'Volvo 240 estate', model: 'brickestate', color: 0xc9b47c, evilColor: 0x232a3a,
    hw: 0.86, hl: 2.4, height: 1.46, note: 'Square everything. It would carry a wardrobe and shrug off a wall.' },
  { id: 'woody', name: 'Woody Wagon', basedOn: '1949 Ford "Woody" wagon', model: 'woody', color: 0x7a2432, evilColor: 0x1f3a2e,
    hw: 0.91, hl: 2.6, height: 1.68, note: 'Timber down its sides and a surfboard on the roof.' },
  { id: 'stately', name: 'Stately Saloon', basedOn: 'Rolls-Royce Silver Shadow', model: 'stately', color: 0x24365e, evilColor: 0x4a1622,
    hw: 0.9, hl: 2.58, height: 1.52, note: 'A temple of a grille with a mascot on top, and two shades of paint.' },
  { id: 'limo', name: 'Stretch Limo', basedOn: 'Lincoln Town Car stretch limousine', model: 'limo', color: 0xf0f0ec, evilColor: 0x141418,
    hw: 0.99, hl: 4.2, height: 1.48, note: 'As long as two cars, with a window for every guest.' },
  { id: 'milkfloat', name: 'Milk Float', basedOn: "Smith's / Wales & Edwards electric milk float", model: 'milkfloat', color: 0x2f67b1, evilColor: 0x7d1d1d,
    hw: 0.8, hl: 1.85, height: 2.05, note: 'Electric, open-sided and stacked with crates. Slow, and it rattles.' },
  { id: 'pony', name: 'Pony Car', basedOn: '1965 Ford Mustang fastback', model: 'pony', color: 0x3f74b8, evilColor: 0x1f3d2a,
    hw: 0.87, hl: 2.3, height: 1.3, note: 'A long bonnet, a short deck and a fastback roof.' },
  { id: 'splitwindow', name: 'Split-Window Coupe', basedOn: '1963 Chevrolet Corvette Sting Ray', model: 'splitwindow', color: 0xb9c2cc, evilColor: 0x7a1218,
    hw: 0.88, hl: 2.22, height: 1.26, note: 'A pointed nose, lamps that pop up, and a spine through its rear window.' },
  { id: 'snake', name: 'Snake Roadster', basedOn: 'AC Cobra 427', model: 'snake', color: 0x1d3f96, evilColor: 0x17171b,
    hw: 0.87, hl: 1.98, height: 1.2, note: 'Too much engine, an oval mouth and no roof.' },
  { id: 'rearengine', name: 'Rear-Engine Coupe', basedOn: 'Porsche 911 (classic)', model: 'rearengine', color: 0xd8dadf, evilColor: 0x1b1b20,
    hw: 0.86, hl: 2.15, height: 1.32, note: 'A teardrop with its engine behind the back wheels and a whale tail on top.' },
  { id: 'wedge', name: 'Wedge Supercar', basedOn: 'Lamborghini Countach', model: 'wedge', color: 0xd21f1f, evilColor: 0x131316,
    hw: 1.0, hl: 2.07, height: 1.07, note: 'The poster on the bedroom wall: a flat wedge, doors that go up and a huge wing.' },
  { id: 'gullwing', name: 'Stainless Gullwing', basedOn: 'DeLorean DMC-12', model: 'gullwing', color: 0xb7bcc2, evilColor: 0x4b4e55,
    hw: 0.93, hl: 2.13, height: 1.14, note: 'Bare brushed steel, and doors that open like wings.' },
  { id: 'centreseat', name: 'Centre-Seat Hypercar', basedOn: 'McLaren F1', model: 'centreseat', color: 0xf07c1c, evilColor: 0x2c2140,
    hw: 0.91, hl: 2.14, height: 1.14, note: 'The driver sits in the middle, a passenger behind each shoulder.' },
  { id: 'pandacoupe', name: 'Panda Coupe', basedOn: 'Toyota Sprinter Trueno AE86', model: 'pandacoupe', color: 0xf2f2ee, evilColor: 0xb81f24,
    hw: 0.82, hl: 2.1, height: 1.33, note: 'White over black, lamps that pop up, and a cup of water on the dashboard.' },
  { id: 'midnight', name: 'Midnight Coupe', basedOn: 'Nissan Skyline GT-R (R34)', model: 'midnight', color: 0x1f4fb4, evilColor: 0x3a1f5c,
    hw: 0.9, hl: 2.3, height: 1.36, note: 'Square shoulders, four round tail lamps and a wing as tall as its roof.' },
  { id: 'rallywedge', name: 'Rally Wedge', basedOn: 'Lancia Stratos', model: 'rallywedge', color: 0xf2f2ee, evilColor: 0xc1121f,
    hw: 0.88, hl: 1.86, height: 1.11, note: 'Shorter than it is sensible, with a visor for a windscreen and four spot lamps.' },
  { id: 'safari', name: 'Safari Wagon', basedOn: 'Land Rover Defender 110', model: 'safari', color: 0x47633f, evilColor: 0x2b2b2e,
    hw: 0.9, hl: 2.3, height: 2.05, note: 'Flat panels, a rack and a ladder, the spare on the bonnet and a snorkel.' },
  { id: 'widetruck', name: 'Wide Truck', basedOn: 'AM General Hummer H1', model: 'widetruck', color: 0xc8b07a, evilColor: 0x1a1a1d,
    hw: 1.1, hl: 2.35, height: 1.9, note: 'Wider than a lane likes, and lower than it looks.' },
  { id: 'polytruck', name: 'Polygon Truck', basedOn: 'Tesla Cybertruck', model: 'polytruck', color: 0xb4b8bd, evilColor: 0x26282c,
    hw: 1.02, hl: 2.84, height: 1.8, note: 'One peaked triangle of flat steel, with a bar of light at each end.' },
  { id: 'monster', name: 'Monster Truck', basedOn: 'Bigfoot (Ford F-250)', model: 'monster', color: 0x1f58c2, evilColor: 0x1c1c20,
    hw: 1.55, hl: 2.75, height: 3.2, note: 'A pickup on tyres taller than a car. It parks on top of things.' },
  { id: 'corrugated', name: 'Corrugated Van', basedOn: 'Citroën H Van', model: 'corrugated', color: 0x9aa5ab, evilColor: 0x6a1a1a,
    hw: 1.0, hl: 2.14, height: 2.34, note: 'A ribbed tin shed with a snout.' },
  { id: 'foodtruck', name: 'Food Truck', basedOn: 'Grumman Olson step van', model: 'foodtruck', color: 0x2fb5a8, evilColor: 0x2a2630,
    hw: 1.15, hl: 3.3, height: 2.9, note: 'A serving hatch under an awning, a menu board and a vent on the roof.' },
  { id: 'motorhome', name: 'Motorhome', basedOn: 'Winnebago Brave (1970s)', model: 'motorhome', color: 0xf0ead8, evilColor: 0x54402f,
    hw: 1.2, hl: 3.2, height: 2.9, note: 'A slab-sided box with a stripe down it and the kitchen sink inside.' },
  { id: 'schoolbus', name: 'School Bus', basedOn: 'Blue Bird conventional school bus', model: 'schoolbus', color: 0xf2b410, evilColor: 0x5a5e63,
    hw: 1.22, hl: 5.4, height: 3.05, note: 'Yellow, with its bonnet out in front and a stop sign that swings out.' },
  { id: 'doubledecker', name: 'Double Decker', basedOn: 'AEC Routemaster', model: 'doubledecker', color: 0xc8102e, evilColor: 0x1c1c24,
    hw: 1.22, hl: 4.2, height: 4.38, note: 'Two decks, a half cab beside the engine and an open platform to hop on at the back.' },
  { id: 'fireengine', name: 'Fire Engine', basedOn: 'American LaFrance pumper', model: 'fireengine', color: 0xc8161d, evilColor: 0x25252b,
    hw: 1.25, hl: 4.5, height: 2.9, note: 'Red, with a ladder on top, hose reels, a pump panel and its lights going.' },
];
export const IDEA_CAR = Object.fromEntries(IDEA_CARS.map(car => [car.id, car]));
