// ============================================================================
// CARS - what the garage sells. Add an entry to put another car in it (it has 20 bays).
//   price      in tip money; 0 = owned from the start. Buying a car buys both liveries.
//   color      body colour when playing Good
//   evilColor  body colour when playing Evil
//   maxSpeed   m/s (turbo and TANK RAGE have their own top speeds in CONFIG)
//   accel      m/s^2 while accelerate is held
//   agility    how much faster than normal it moves sideways (default 1)
//   health     how much damage it takes before it is wrecked
//   hw, hl     hitbox half width / half length (m); height is the body height
//   model      an animated model of its own, by name (see src/render/models.js); without
//              one it is drawn as the standard box car, sized from hw / hl / height
//   tank       true = it is a tank: in TANK RAGE from the start of every level
//   corner     true = parked in the far corner bay of the garage
// ============================================================================
import { Progress } from './progress.js';

export const CARS = [
  { id: 'hatch', name: 'Delivery Hatch', price: 0, color: 0xe23b3b, evilColor: 0x4a1c1c, model: 'hatch',
    maxSpeed: 45, accel: 9, health: 100, hw: 0.95, hl: 2.1, height: 1.4 },
  { id: 'junker', name: 'Junker', price: 30, color: 0x9a5a34, evilColor: 0x33211a, model: 'junker',
    maxSpeed: 40, accel: 7, health: 90, hw: 1.0, hl: 2.5, height: 1.5 },
  { id: 'coupe', name: 'Courier Coupe', price: 80, color: 0x2f7de1, evilColor: 0x1b1f4d, model: 'coupe',
    maxSpeed: 50, accel: 11, health: 80, hw: 0.9, hl: 2.25, height: 1.2 },
  { id: 'lowrider', name: 'Low Rider', price: 150, color: 0x9b3fd1, evilColor: 0x2c1140, model: 'lowrider',
    maxSpeed: 43, accel: 8, health: 120, hw: 1.0, hl: 2.5, height: 1.1 },
  { id: 'wagon', name: 'Family Wagon', price: 180, color: 0x2f7a57, evilColor: 0x152a20, model: 'wagon',
    maxSpeed: 44, accel: 8, health: 150, hw: 1.05, hl: 2.4, height: 1.9 },
  { id: 'sport', name: 'Sport Compact', price: 220, color: 0xf6c21c, evilColor: 0x3a300a, model: 'sport',
    maxSpeed: 54, accel: 13, health: 70, hw: 0.85, hl: 1.9, height: 1.1 },
  { id: 'lovebus', name: 'Love Bus', price: 260, color: 0x58bcd6, evilColor: 0x4a2a5c, model: 'lovebus',
    maxSpeed: 40, accel: 7, health: 180, hw: 1.0, hl: 2.3, height: 2.1 },
  { id: 'tank', name: 'Tank', price: 5000, color: 0x4b5a2a, evilColor: 0x2a2d33, tank: true, corner: true,
    maxSpeed: 45, accel: 8, health: 100, hw: 1.25, hl: 2.3, height: 1.9 },
];

// Vehicles that belong to a level, not to the garage (a level's "car" field).
export const LEVEL_CARS = {
  ufo: { id: 'ufo', name: 'UFO', price: 0, color: 0xc9d2dc, evilColor: 0x4a3a66, ufo: true,
    maxSpeed: 90, accel: 30, agility: 2.8, health: 100, hw: 1.3, hl: 1.3, height: 1.2 },
};

// Secret vehicles: never parked in the garage or for sale, but once owned they are driven
// like any other car, and the garage can swap back to a normal car. The way into each:
//   bus   type B U S on the start screen (see render/menu.js), or ?autostart&car=bus
//         (kind: 'bus' makes it the traffic bus's tall, boxy shape)
export const SECRET_CARS = {
  bus: { id: 'bus', name: 'City Bus', price: 0, color: 0xf2a33a, evilColor: 0x2e2a33, kind: 'bus',
    maxSpeed: 38, accel: 5, health: 220, hw: 1.3, hl: 5.5, height: 3.1 },
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
