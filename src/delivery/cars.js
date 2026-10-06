// ============================================================================
// CARS - what the garage sells. Add an entry to put another car in it (it has 20 bays).
//   price      in tip money; 0 = owned from the start. Buying a car buys both liveries.
//   color      body colour when playing Good
//   evilColor  body colour when playing Evil
//   fixedLivery true = the car only ever comes in those two colours: traffic of the same kind
//              wears them too (color for a good driver, evilColor for an evil one)
//   maxSpeed   m/s (turbo and TANK RAGE have their own top speeds in CONFIG)
//   accel      m/s^2 while accelerate is held
//   agility    how much faster than normal it moves sideways (default 1)
//   health     how much damage it takes before it is wrecked
//   crossing   how well it takes a railway track: 1 = over it at full speed, 0 = it crawls
//              over (see CONFIG.railCrossing; default CONFIG.railCrossing.usual)
//   hw, hl     hitbox half width / half length (m); height is the body height
//   model      an animated model of its own, by name (see src/render/models.js); without
//              one it is drawn as the standard box car, sized from hw / hl / height
//   tank       true = it is a tank: in TANK RAGE from the start of every level
//   corner     true = parked in the far corner bay of the garage
// ============================================================================
import { Progress } from './progress.js';

export const CARS = [
  // In tiers, cheapest first: each tier a little faster and a little tougher than the one
  // before, and within one the quick, fragile cars and the slow, tough ones trade speed for
  // health. (The ids are the original cars', kept so saved progress still finds them.)
  // ---- tier 1
  { id: 'hatch', name: 'Commuter', price: 0, color: 0xff7a1a, evilColor: 0x151515, fixedLivery: true, model: 'commuter',
    maxSpeed: 24, accel: 10, crossing: 0.6, health: 85, hw: 0.85, hl: 1.85, height: 1.45 },
  { id: 'junker', name: 'Junker', price: 30, color: 0x6b7343, evilColor: 0x8a4a2a, fixedLivery: true, model: 'junker',
    maxSpeed: 22, accel: 8, crossing: 0.7, health: 100, hw: 1.0, hl: 2.5, height: 1.5 },
  { id: 'coupe', name: 'Darkvan', price: 80, color: 0x9be37a, evilColor: 0x161616, fixedLivery: true, model: 'darkvan',
    maxSpeed: 21, accel: 7, crossing: 0.65, health: 150, hw: 1.05, hl: 2.45, height: 2.4 },
  // ---- tier 2
  { id: 'lovebus', name: 'Love Bus', price: 130, color: 0x3fae4a, evilColor: 0xd8262b, fixedLivery: true, model: 'lovebus',
    maxSpeed: 24, accel: 7, crossing: 0.55, health: 165, hw: 1.0, hl: 2.3, height: 2.1 },
  { id: 'wagon', name: 'Family Wagon', price: 160, color: 0x8cc8f0, evilColor: 0xf28cc0, fixedLivery: true, model: 'wagon',
    maxSpeed: 26, accel: 9, crossing: 0.6, health: 140, hw: 1.05, hl: 2.4, height: 1.9 },
  { id: 'sport', name: 'Sportscompact', price: 190, color: 0x39ff14, evilColor: 0x151515, fixedLivery: true, model: 'sport',
    maxSpeed: 31, accel: 13, crossing: 0.35, health: 80, hw: 0.85, hl: 1.9, height: 1.1 },
  { id: 'lowrider', name: 'Lowrider', price: 220, color: 0xb026ff, evilColor: 0x2fd6c6, fixedLivery: true, model: 'lowrider',
    maxSpeed: 27, accel: 9, crossing: 0.15, health: 120, hw: 1.0, hl: 2.5, height: 1.1 },
  // ---- tier 3
  { id: 'hearse', name: 'Hearse', price: 260, color: 0x151515, evilColor: 0xf2f2f2, fixedLivery: true, model: 'hearse',
    maxSpeed: 33, accel: 10, crossing: 0.4, health: 170, hw: 1.0, hl: 2.8, height: 1.65 },
  { id: 'minivan', name: 'Minivan', price: 290, color: 0xd8c8a0, evilColor: 0x3a4a5e, fixedLivery: true, model: 'minivan',
    maxSpeed: 32, accel: 9, crossing: 0.6, health: 200, hw: 1.05, hl: 2.45, height: 2.0 },
  { id: 'pickup', name: 'Pick-Up', price: 320, color: 0xbf5a1c, evilColor: 0x2f5a2a, fixedLivery: true, model: 'pickup',
    maxSpeed: 34, accel: 11, crossing: 0.95, health: 215, hw: 1.05, hl: 2.6, height: 2.1 },
  { id: 'hotrod', name: 'Hot Rod', price: 360, color: 0x6a2bb3, evilColor: 0x4b5320, fixedLivery: true, model: 'hotrod',
    maxSpeed: 38, accel: 15, crossing: 0.4, health: 110, hw: 0.9, hl: 2.1, height: 1.2 },
  // ---- tier 4
  { id: 'taxi', name: 'Taxi', price: 400, color: 0xffc81a, evilColor: 0x6b7a2e, fixedLivery: true, model: 'taxi',
    maxSpeed: 38, accel: 12, crossing: 0.6, health: 210, hw: 1.0, hl: 2.55, height: 1.6 },
  { id: 'suv', name: 'SUV', price: 450, color: 0x1f3f8f, evilColor: 0xf2f2f2, fixedLivery: true, model: 'suv',
    maxSpeed: 37, accel: 11, crossing: 0.9, health: 300, hw: 1.0, hl: 2.25, height: 1.8 },
  { id: 'miata', name: 'Sportscar', price: 500, color: 0xd8262b, evilColor: 0xffd21f, fixedLivery: true, model: 'miata',
    maxSpeed: 42, accel: 15, crossing: 0.25, health: 135, hw: 0.85, hl: 1.95, height: 1.1 },
  // ---- and the tank, in a class of its own
  { id: 'tank', name: 'Tank', price: 5000, color: 0x4b5a2a, evilColor: 0x2a2d33, tank: true, corner: true,
    maxSpeed: 46, accel: 8, crossing: 1, health: 100, hw: 1.25, hl: 2.3, height: 1.9 }, // (TANK RAGE's top speed: CONFIG.tankMaxSpeed)
];

// Vehicles that belong to a level, not to the garage (a level's "car" field).
export const LEVEL_CARS = {
  ufo: { id: 'ufo', name: 'UFO', price: 0, color: 0xc9d2dc, evilColor: 0x4a3a66, ufo: true,
    maxSpeed: 58, accel: 30, crossing: 1, agility: 2.8, health: 100, hw: 1.3, hl: 1.3, height: 1.2 },
  // a Formula 1 car: very fast, quick off the line, nimble, low, and no good over a kerb
  f1: { id: 'f1', name: 'F1 Car', price: 0, color: 0xd8262b, evilColor: 0x151515, model: 'f1',
    maxSpeed: 75, accel: 20, crossing: 0.2, agility: 1.5, health: 160, hw: 0.95, hl: 2.6, height: 1.0 },
};

// Secret vehicles: never parked in the garage or for sale, but once owned they are driven
// like any other car, and the garage can swap back to a normal car. The way into each:
//   bus   type B U S on the start screen (see render/menu.js), or ?autostart&car=bus
//         (kind: 'bus' makes it the traffic bus's tall, boxy shape)
export const SECRET_CARS = {
  bus: { id: 'bus', name: 'City Bus', price: 0, color: 0xf2a33a, evilColor: 0x2e2a33, kind: 'bus',
    maxSpeed: 25, accel: 5, crossing: 0.7, health: 220, hw: 1.3, hl: 5.5, height: 3.1 },
};

// The car in use. It is a live binding: every module that imports CAR sees the new car as
// soon as selectCar() changes it, so swapping cars needs no reload.
const find = () => [...CARS, ...Object.values(SECRET_CARS)]
  .find(car => car.id === Progress.data.car && Progress.owns(car.id)) || CARS[0];
export let CAR = find();

// A level with a vehicle of its own puts the player in that; any other level gives back
// the car picked in the garage. Called when a level is picked and when a run starts.
export const useLevelCar = (id) => {
  CAR = (id && LEVEL_CARS[id]) || find();
};

// switch to a car the player owns (saved to their progress)
export const selectCar = (id) => {
  Progress.useCar(id);
  CAR = find();
};
