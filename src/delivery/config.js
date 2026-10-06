// ============================================================================
// CONFIG
// ============================================================================
export const CONFIG = {
  // road
  laneCount: 4,            // lanes on the expressway, half each way (a level can set its own with "lanes",
                           // and have a "median": see levels.js)
  laneWidth: 3.5,          // metres
  shoulder: 3.5,           // driveable shoulder outside the outer lanes, no traffic there

  // road features: sizes shared by every level (where they are is in LEVELS)
  taper: 90,               // length of each narrowing / widening
  gradeEase: 60,           // m each way over which one slope is blended into the next (crests and dips)
  bridgeWallInset: 0.4,    // gap between the outer lane line and a bridge's structure
  ramps: {                 // exits, merges and their flyovers
    laneZone: 180,         // m of exit lane before an exit / merge lane after a merge: an extra lane
                           // outside the expressway's right-hand lane, with the shoulder beyond it
    gore: 50,              // m over which that lane opens at the start of the exit zone, and over which
                           // the expressway's pavement blends with the side road's at each fork
    ramp: 110,             // m at each end of a side road that is a single-lane ramp
    leftShoulder: 1,       // m; a side road's right shoulder is the normal driveable width
    flyoverLength: 360,
    flyoverHeight: 7,
    trafficShare: 0.45,    // share of traffic that takes a side road
  },

  // shoulder policing
  dangerTime: 3,           // s of shoulder driving allowed before the police step in
  dangerCooldown: 0.75,    // s of allowance regained per second back in the lanes
  dangerBeepSlow: 0.45,    // s between the meter's beeps on first touching the shoulder...
  dangerBeepFast: 0.06,    // ...and just before the bust (the beeps speed up in between)
  dangerBeepPitch: 330,    // Hz of the beep (only until the Danger Timer WAV has loaded)
  policeApproachTime: 2.5, // s a busted car keeps driving, slowing, before it is grabbed
  policeCrawlSpeed: 8,     // m/s it is slowed to in that time
  policeHoldTime: 4,       // s from being grabbed to being dropped back in a lane

  // speed (m/s): hold accelerate / brake to change it, release and it holds
  minSpeed: 7,

  // turbocharger pickups: fixed spots on the track that raise the top speed for a while
  turboBoost: 16,          // m/s added to the car's own top speed (the same for every car)
  turboAccel: 22,          // m/s^2, the turbo pulls up to its top speed on its own
  turboTime: 10,           // s
  ghostTime: 10,           // s the car is see-through and passes through cars and barriers
                           // (the bridge structure and package splashes still get you)
  wrenchRepair: 0.25,      // share of full health restored
  passengerTime: 12,       // s of shoulder driving without running the police meter down
  // the siren: traffic ahead in the player's lane pulls over to its right: a lane over, or onto
  // the shoulder (the only time traffic uses one), never into the oncoming lanes
  sirenPickup: { time: 15, range: 80, pulledOverPace: 0.5, // s; m ahead; share of its speed a car keeps on the shoulder
    arrestTime: 4 },       // s a police helicopter takes to carry off a car that hurt the player under a siren
  radarTime: 15,           // s of a radar detector: no bust can start (the shoulder meter still runs,
                           // and if it is full when the detector stops, that is a bust)
  // bad gas: a can of cheap fuel that leaves the car crawling
  badGas: { time: 10, topSpeed: 0.5, accel: 0.25 }, // s; shares of the car's own top speed and acceleration
  // a 1000 lb weight in the boot: slower, duller and harder to steer, but it wins every shove.
  // Its mass is the player's in collisions (a car is 1, a bus 4): the damage of a crash is split
  // by mass, and the player is knocked about (stunned) that much less
  heavyMass: { time: 12, mass: 5, topSpeed: 0.75, accel: 0.4, agility: 0.55,
    pushShare: 0.04 },     // share of any push the player takes, even running into the back of something
  timePickup: 10,          // s a stopwatch puts on the clock (time plus) or takes off it (time minus);
                           // in the tip countdown it moves that too. Instant: the powerup running carries on
  powerUpWarning: 4,       // s before a turbo, ghost, passenger or mystery runs out that its warning sound
                           // starts, and the sign of it on the car starts to blink
                           // (only one of those runs at a time: a new one replaces it)
  // the mystery pickup: one of these effects at random (see Player.startMystery); the wording
  // is in messages.json, under powerups.mystery
  mystery: {
    effects: ['rickety', 'toad', 'angel', 'jerk', 'invincible', 'noBrakes', 'insuranceUp', 'insuranceDown', 'ufo', 'bulletTrain'],
    time: 12,              // s the lasting ones last (insuranceUp / insuranceDown, ufo and bulletTrain are over at once)
    rickety: 1.5,          // damage the car takes while rickety, against the usual
    toadSpeed: 20 / 3.6,   // m/s every toad goes along at in TOAD RAGE
    toad: { hw: 1.2, hl: 1.4, height: 1.8, mass: 1 }, // a toad's hitbox
  },
  // UFO AIR STRIKE (a mystery): the saucer's visit, and the burn that follows it
  // Emergency vehicles (a level's "emergencies"): now and then an ambulance comes through with its
  // siren going, either way. One going the player's way sets off behind the player, with a
  // message; one coming the other way just appears up the road. Traffic ahead of it in its lane
  // gives way as it does to the player's siren (a few evil drivers won't). It never runs into
  // anything: it closes up behind whatever is in its way, which then has `giveWay` s to get fully
  // out of its lane, or is arrested (the player is busted). It is traffic like any other (it can
  // be hit, and hit back), except that packages pass over it.
  emergency: {
    speed: 95,             // m/s (342 km/h): second only to the bullet train
    behind: 220,           // m behind the player one going the player's way sets off
    range: 220,            // m ahead of it that traffic in its lane gives way
    reach: 35,             // m: something in its lane this close ahead...
    giveWay: 3,            // ...has this long to get fully out of it
    followGap: 6,          // m it closes up to behind something in its way
    brake: 30,             // m/s^2 it slows at for something in its way
    defiance: 0.05,        // chance an evil driver refuses to give way to it
  },
  // Ice (a level's "ice": patches on the road). On it the player's car slews round as it arrives
  // (only the look of it: yaw never changes where a car goes), brakes and steers with less grip,
  // and in a bend it understeers: it slides to the outside, the more so the faster, heavier and
  // less agile it is. A traffic car hitting it may spin out (and blow up), the likelier the faster.
  ice: {
    brakeGrip: 0.35,       // share of its braking (or braking by itself for a car ahead) that works on ice
    steerGrip: 0.3,        // share of its steering's grip
    grip: 6,               // m/s^2 of cornering the tyres still hold on ice; beyond it...
    understeer: 0.4,       // ...this share of the rest pushes the car to the outside of the bend
    weightRef: 2.28,       // hw x hl x height of a car that weighs 1 (the Commuter); a car's weight goes
                           // with the square root of its own, times its mass (the 1000 lb weight)
    yawKick: 2.5,          // rad/s it slews round as it hits the ice, at speed
    spinPerSpeed: 0.02,    // chance, per m/s of its speed, that a traffic car hitting the ice spins out
  },
  // The tide (a level's "tide": see tide.js): the sea coming in over the player's side of the road.
  // In the water a car is slowed by how badly it wades: `crossing` times what a railway track costs
  // it (see railCrossing, and a car's "crossing" in cars.js), and steers with less grip; in deep
  // water it is damaged as well, the more so the worse it wades. Good drivers move out of the
  // water's way; evil ones plough on through, and a wave that catches a car in deep water stalls it.
  tide: {
    ramp: 3.5,             // m past the water's edge to full depth
    wet: 0.08,             // depth (0 = dry .. 1 = full) up to which the road is only wet
    deep: 0.5,             // depth from which it is deep water
    crossing: 2,           // times the railway track's slowing that the water costs a car
    slowest: 0.12,         // share of its top speed even a car that wades worst of all keeps
    damage: 30,            // health a second deep water costs a car, x (1 - its crossing)
    steerGrip: 0.6,        // share of its steering's grip a car keeps in the water
    trafficPace: 0.45,     // share of its speed a traffic car keeps in deep water
    warning: 3,            // s from a wave being warned of to its coming in over the road...
    rise: 0.8,             // ...s it takes to rush in...
    hold: 1.6,             // ...it stays...
    fall: 3,               // ...it takes to drain away, and the sea with it, right out off the road...
    low: 3,                // ...the road stays bare...
    back: 3,               // ...and the tide takes to come back in
    stretch: 240,          // m of road a wave floods, centred where the player will be when it comes in
    shove: 6,              // m/s^2 a wave rushing in pushes a car in the water towards the centre line
    overtime: 1.3,         // the tide rises on past the level's `end` into the tip countdown, up to this share of the clock
    oncomingShield: 4,     // extra s of shield for a car the helicopter can only set down on the oncoming side
    washedEach: 3,         // washed-up pickups there can be of each type at once (see Tide.washUp)
  },
  // Junctions (a level's "junctions"): crossroads where the road turns right or left, or goes
  // straight on. There is only ever the one route: the arms it doesn't take are barred to the
  // player by glowing arrows, but traffic leaves the road down them, through the arrows, and is
  // gone. At a turn, some of the traffic going the player's way carries straight on (unless an
  // oncoming car is in the box); at a junction straight on, some of that in the outside lane turns
  // off down the arm on its side. Nothing comes out of an arm, and while a car is leaving across a
  // box, traffic on the road waits at its edge.
  junction: {
    forward: 0.35,         // share of the traffic going the player's way that carries straight on at a turn
    turnOff: 0.3,          // share of that in the outside lane that turns off at a junction straight on
    stopping: 8,           // m/s^2 traffic slows at, giving way
  },
  // A railway track (a level's "railway", down its median) slows a car crossing it, by the car's
  // "crossing" (see cars.js): while any of it is over the track, its top speed there is its own
  // x (slowest + (1 - slowest) x crossing), and it is slowed to that at `bite`; the worse it
  // crosses, the more it rattles
  railCrossing: {
    width: 3.2,            // m of track bed (the ballast), centred on the centre line
    slowest: 0.3,          // share of its top speed a car that crosses worst of all (0) keeps
    bite: 25,              // m/s^2 it is slowed at, down to that
    usual: 0.6,            // a car's crossing if it doesn't say
  },
  // hippos (a level's "hippos": see hippos.js), charging out of the river across the road
  hippo: {
    out: 14,               // m beyond the road's edge it surfaces, in the river...
    bank: 5,               // ...which starts this far out (a muddy bank between it and the road)
    surface: 1,            // s it takes to come up and get going
    speed: 12,             // m/s it charges at
    hl: 0.95,              // m, half its width (along the road)
    hw: 2.1,               // m, half its length (it charges across the road)
    height: 1.7,           // m, its height (how far under the water it starts)
    lead: { min: -6, max: 22 }, // m off where the player will be when it reaches the player's lane
    beyond: 25,            // m into the grass on the far side it is gone
    most: 6,               // hippos there can be at once
  },
  // elephants (a level's "elephants": see elephants.js), plodding across the road and back
  elephant: {
    speed: 1.6,            // m/s it walks at
    hl: 1.4,               // m, half its width (along the road)
    hw: 2.9,               // m, half its length (it walks across the road)
    beyond: 12,            // m out into the grass it walks before turning back...
    rest: { min: 2, max: 6 }, // ...after standing there this many s
  },
  // the migration (a level's "migration"): a great herd streaming across the road, at these m/s
  // each, out to `beyond` m either side and round again; galloping, bobbing up to `hop` m, `hops` times a second
  migration: { speed: { min: 4, max: 7 }, beyond: 35, hop: 0.2, hops: 2.5 },
  // wreckage (a level's "wreckage" and "tower": see wreckage.js), the scripted destruction
  wreckage: {
    trigger: 110,          // m short of it the player is when it is set off (a level's can say otherwise)
    flight: 1.6,           // s it takes to fly in and land
    blast: 3,              // m beyond it, along the road, that its landing (or an airliner sliding) also wrecks
    lookout: 140,          // m ahead traffic sees its lane blocked, and pulls over
    approach: 420,         // m out an airliner comes in from, beyond where it touches down...
    approachHeight: 55,    // ...this high...
    approachTime: 3,       // ...taking this long to touch down...
    slideTime: 4,          // ...then sliding (its "slide" m) for this long, to rest
    blastWarn: 1.4,        // s a building's red box flashes before it blows (set off that many s ahead of the player)...
    blastNear: 25,         // ...or when the player is this many m short of it, if nearer...
    blastTime: 0.45,       // ...and s the fire takes to sweep across the road, wrecking what is in the box...
    blastBalls: 7,         // ...in this many fireballs, out from the building's front
    blastBuilding: 10,     // m from the road's edge to the front of a building that blows (a level's can say otherwise)
    towerFall: 2.6,        // s the control tower takes to come down...
    towerScale: 1.6,       // ...a tower this many times the usual size (some 85 m tall)
    kinds: {               // m each kind covers along the road (it covers its lanes across)
      tanker: { depth: 3.5 }, containers: { depth: 5 }, hangar: { depth: 5 }, plane: { depth: 7 }, airliner: { depth: 34 }, blast: { depth: 18 },
    },
  },
  // the bullet train (a mystery: see bullettrain.js), far faster than anything else in the game
  bulletTrain: {
    speed: 150,            // m/s (540 km/h)
    warning: 3,            // s from appearing up the road to reaching where the player was
    cars: 8,               // carriages...
    carLength: 25,         // ...each this long (m)
    hw: 1.6,               // m, half its width
    height: 3.6,           // m
    dangerMercy: 0.5,      // while it is about, the shoulder's danger meter runs down at this share of its usual rate,
    mercyAfter: 3,         // and nobody is busted for being on the shoulder, until this many s after it has gone
  },
  ufoStrike: {
    arrive: 1.5,           // s to fly in...
    hover: 4,              // ...over the player's car...
    leave: 2,              // ...and away again
    height: 14,            // m above the car it hovers (clear of the chase camera's view of the car)...
    ahead: 8,              // ...and this far ahead of it, so it sits near the top of the screen
    burnRate: 7,           // health a second every vehicle loses from the moment the saucer starts to leave...
    burnGrowth: 0.5,       // ...growing by e^(this x seconds): smoking within a second or so, gone 2.5-5 s later
  },

  // stationary barriers: they explode when the player touches them, traffic drives through
  // frogs: large moving obstacles that hop all over the road within their stretch of it;
  // hitting one is the same as hitting a barrier
  frogHopTime: 0.7,        // s in the air per hop
  frogHopMax: 14,          // m along the road a single hop can cover (sideways it can cross the whole road)
  frogHopHeight: 2.5,      // m
  frogRestMin: 0.3,        // s it sits between hops, random between min and max
  frogRestMax: 1.2,
  frogHearing: 120,        // m from a frog within which its croaking is heard
  // what hitting each kind costs: health, and the share of the player's speed left afterwards
  obstacleKinds: {
    barrier: { damage: 30, speedKept: 0.6 },
    // (trainProof: the bullet train goes straight through it, and leaves it standing)
    railBarrier: { damage: 30, speedKept: 0.6, trainProof: true },
    bale: { damage: 20, speedKept: 0.75 },
    frog: { damage: 30, speedKept: 0.6 },
    cow: { damage: 30, speedKept: 0.6 },
    kangaroo: { damage: 25, speedKept: 0.7 },
    dropBear: { damage: 20, speedKept: 0.75 },
    wildebeest: { damage: 25, speedKept: 0.7 },
    zebra: { damage: 25, speedKept: 0.7 },
    asteroid: { damage: 14, maxDamage: 70, speedKept: 0.7 }, // damage is per metre of radius, up to maxDamage
    // (light: true = a small thing: it doesn't knock the steering, and barely shakes the camera)
    cone: { damage: 3, speedKept: 0.94, light: true },
    sign: { damage: 12, speedKept: 0.8 },
    // the beach's junk (Hurricane)
    umbrella: { damage: 15, speedKept: 0.85 },
    surfboard: { damage: 18, speedKept: 0.8 },
    cooler: { damage: 6, speedKept: 0.92, light: true },
    chair: { damage: 30, speedKept: 0.6 },
    wreck: { damage: 35, speedKept: 0.5 },
  },
  // drifters: obstacles moving about the road in patterns (a level's "drifters")
  drifters: {
    across: 0.85,          // share of the road's half-width a pattern reaches out to from the centre
    circleRadius: 25,      // m along the road a circle spans either side of its centre
    circleRate: 0.9,       // radians/s round the circle
    zigzagSpeed: 12,       // m/s along the road (looping round the stretch), weaving as it goes
    zigzagRate: 1.4,       // radians/s of weave
    sweepRate: 1.1,        // radians/s across the road and back
    eightLength: 30,       // m along the road a figure of eight spans either side of its centre
    eightRate: 0.7,        // radians/s round the eight
    wobble: 0.3,           // how much of each pattern is an unrelated, slower wobble (0 = clean, predictable sine waves)
    wreckSpin: 2.5,        // radians/s a drifting wreck spins on the spot (each has its own share of this, either way)
  },
  cowSpeed: 2.2,           // m/s a cow ambles across the road
  kangarooSpeed: 6,        // m/s a kangaroo bounds across it (a herd of kind 'kangaroo'), hopping...
  kangarooHop: 0.9,        // ...this high...
  kangarooHops: 2.2,       // ...this many times a second (and it rests at each side like a cow)
  // drop bears (a level's "dropBears"): up in the trees over the road until the player comes within
  // `near` m (a different distance for each), then down they drop, and there they stay
  dropBear: { height: 24, near: { min: 50, max: 110 } },
  cowRestMin: 0.5,         // s it stands at each side before turning back, random between min and max
  cowRestMax: 2.5,
  tractorSpeed: 7,         // m/s a tractor trundles along at (it is traffic: see vehicles)

  startSpeed: 20,          // a fresh car pulls away to this on its own
  brake: 20,               // m/s^2 while brake is held
  autoBrake: 28,           // m/s^2, automatic braking behind a slower car (off the accelerator only)
  autoBrakeGap: 5,         // m, gap it tries to keep
  autoBrakeTime: 0.7,      // s of closing speed added to that gap
  brakeScreech: 8,         // m/s of closing speed from which that braking squeals the tyres

  // steering: free lateral movement, with a soft pull to the nearest lane centre
  steerSpeed: 9,           // m/s sideways at full steer
  steerResponse: 10,       // 1/s, how quickly sideways speed builds / dies
  edgeBrake: 6,            // 1/s, how firmly sideways speed is cut near the road's sides
  laneAssist: 0.4,         // 1/s: a faint pull back toward the lane when not steering, 0 = none
  laneAssistFree: 1.0,     // m either side of a lane's centre with no pull at all: drive off-centre freely
  // A car points the way it is actually travelling: the angle between its sideways speed and
  // its forward speed. So the faster it goes, the less the same swerve turns its nose.
  yawGain: 1.3,            // that angle is exaggerated by this much, so swerves read on screen (1 = true to life)
  yawMinSpeed: 18,         // m/s: below this the angle is worked out as if the car were doing this speed
  maxYawDeg: 25,           // clamped to 45 regardless
  yawSmoothing: 12,        // 1/s

  // traffic: the right-hand half of the lanes travels with the player, the left half comes at you
  trafficPool: 80,         // vehicles there are meshes for; a level's counts can't add up to more
  trafficCount: 16,        // same-direction cars alive at once (density; a level can set "trafficCount")
  oncomingCount: 12,       // oncoming cars alive at once (a level can set "oncomingCount")
  trafficMinSpeed: 9,      // m/s (a level can set its own with "trafficSpeed": { "min", "max" })
  trafficMaxSpeed: 18,
  spawnMin: 480,           // spawn window ahead of the player, metres (inside the fog)
  spawnMax: 640,
  despawnBehind: 80,
  trafficLaneChangeRate: 2.5, // 1/s
  laneChangeChance: 0.3,   // per decision (every 1-3 s) for a random lane change
  signalTime: 1.5,         // s a calm (happy or neutral), good driver signals before changing lane;
                           // evil and angry drivers just go
  // Hesitation: a car going the player's way that turns up ahead cruising faster than `above`
  // would only run away from the player, so it hesitates instead: it dawdles, drifts about in
  // its lane and keeps touching its brakes. (A fixed speed: it doesn't depend on the player's car.)
  // While a hesitant car is ahead, some of the traffic going the player's way comes up from
  // behind instead, near full speed, to pass the player. A level can turn it off: "hesitation": false
  hesitation: {
    above: 22,                        // m/s
    pace: { min: 11, max: 17 },       // m/s a hesitant car dawdles at
    tapEvery: { min: 1.2, max: 3.5 }, // s between touches of the brakes...
    tapTime: 0.5,                     // ...each lasting this long...
    tapPace: 0.45,                    // ...slowing it to this share of its pace
    wander: 0.35,                     // m it drifts about in its lane
    behindChance: 0.5,                // chance a new car going the player's way comes from behind
    behind: { min: 45, max: 75 },     // m behind the player it turns up (inside despawnBehind)
    behindPace: { min: 0.9, max: 1 }, // share of full speed it drives at: a garage car's own
                                      // top speed, anything else the level's top traffic speed
  },
  // horns: a driver honks on turning angry, and while held up behind the player
  hornRange: 70,           // m from the player within which drivers bother
  hornWait: 5,             // s before the same driver honks again
  passByRange: 5,          // m to the side within which an oncoming car passing the player...
  passByChance: 0.3,       // ...may honk as it goes by
  laneChangeGap: 10,       // m of clear road a car wants before changing lane (smaller = more careless)
  // rivalries: a car that another car has hit, or that is simply angry, picks a nearby car to
  // bully: it chases it, crowds it sideways and won't brake for it
  rivalryChance: 0.35,    // chance that a collision between two traffic cars starts one, each way
  rivalryPickChance: 0.12, // chance per decision that an angry car picks on its nearest neighbour
  rivalryRange: 45,        // m
  rivalryTime: 5,          // s before it loses interest
  // traffic vehicle types (which of them a level has, and how often, is in the level's
  // "traffic" list). hw / hl = hitbox half width / half length (m);
  // speed scales the car's cruising speed. special: true = a special vehicle, never evil.
  vehicles: {
    car:     { hw: 0.95, hl: 2.1, height: 1.4, mass: 1,   health: 60,  speed: 1 },
    compact: { hw: 0.85, hl: 1.7, height: 1.3, mass: 0.8, health: 45,  speed: 1.05 },
    van:     { hw: 1.1,  hl: 2.7, height: 2.3, mass: 1.8, health: 90,  speed: 0.95 },
    bus:     { hw: 1.3,  hl: 5.5, height: 3.1, mass: 4,   health: 180, speed: 0.8, special: true },
    tractor: { hw: 1.2,  hl: 2.0, height: 2.4, mass: 2.5, health: 150, speed: 1, special: true },
    police:  { hw: 0.95, hl: 2.1, height: 1.4, mass: 1.2, health: 80,  speed: 1.1, special: true },
    // an 18-wheeler: a prime mover and a long trailer. kerb: it keeps to the lane by the kerb
    // (rejoining it after a narrowing), never changing lanes of its own or picking a fight;
    // cruise: m/s it runs at, fast, whatever the level's pace, and it never hesitates
    // noSpin: it never spins out (not from damage, nor on ice): a critical hit makes it wobble, then blow up
    semi:    { hw: 1.25, hl: 8.2, height: 4.0, mass: 6, health: 320, speed: 1, model: 'semi', kerb: true, cruise: { min: 26, max: 31 }, noSpin: true },
    // (only ever an emergency vehicle: see CONFIG.emergency; never in a level's traffic list)
    ambulance: { hw: 1.1, hl: 2.9, height: 2.6, mass: 2, health: 150, speed: 1, special: true },
    // the garage's cars as traffic (each id is the garage car's, in src/cars.js). They have no
    // speed: they cruise near that car's own top speed (garagePace, below). model: which of the
    // models in render/models.js it is drawn as
    junker:  { hw: 1.0,  hl: 2.5, height: 1.5, mass: 1.3, health: 70,  model: 'junker' },
    sport:   { hw: 0.85, hl: 1.9, height: 1.1, mass: 0.8, health: 45,  model: 'sport' },
    wagon:   { hw: 1.05, hl: 2.4, height: 1.9, mass: 1.6, health: 90,  model: 'wagon' },
    lovebus: { hw: 1.0,  hl: 2.3, height: 2.1, mass: 1.5, health: 100, model: 'lovebus' },
    lowrider: { hw: 1.0, hl: 2.5, height: 1.1, mass: 1.3, health: 85,  model: 'lowrider' },
    taxi:    { hw: 1.0,  hl: 2.55, height: 1.6, mass: 1.4, health: 90,  model: 'taxi' },
    suv:     { hw: 1.0,  hl: 2.25, height: 1.8, mass: 1.6, health: 110, model: 'suv' },
    hotrod:  { hw: 0.9,  hl: 2.1, height: 1.2, mass: 1,   health: 55,  model: 'hotrod' },
    minivan: { hw: 1.05, hl: 2.45, height: 2.0, mass: 1.7, health: 110, model: 'minivan' },
    hearse:  { hw: 1.0,  hl: 2.8, height: 1.65, mass: 1.6, health: 100, model: 'hearse' },
    pickup:  { hw: 1.05, hl: 2.6, height: 2.1, mass: 1.8, health: 120, model: 'pickup' },
    miata:   { hw: 0.85, hl: 1.95, height: 1.1, mass: 0.8, health: 50, model: 'miata' },
  },
  garagePace: { min: 0.75, max: 0.95 }, // share of its own top speed a garage car cruises at in traffic
  sirenRange: 160,         // m from a police car within which its siren is heard (louder the nearer)
  lowriderHearing: 90,     // m from a lowrider in traffic within which its music is heard (the same way)
  policeSightRange: 45,    // m along the road within which a police car witnesses what you do
  maxBusts: 3,             // the run ends on this many busts
  evilShare: 0.35,         // share of traffic that is evil; the rest are good. A car never switches.
  startMood: {             // chance of each starting emotion (the remainder start neutral)
    good: { happy: 0.45, angry: 0.15 },
    evil: { happy: 0.1, angry: 0.6 },
  },                       // (a level can override both: "drivers": { "evil", "happy", "angry" })

  // the screensaver: no player car, just a point gliding along the road that the camera follows
  screensaver: {
    speed: 20,             // m/s it glides at (slower than most traffic, so the traffic passes by)
    swayCentre: 0,         // lat it holds: 0 is the centre line of the road, between the two directions
    sway: 0,               // m it sways either side of that (0 = dead straight)
    swayPeriod: 18,        // s for one sway there and back
    camBack: 18,           // the camera stands further back and higher than the chase camera
    camHeight: 14,
    camLookAhead: 16,
    fadeDistance: 25,      // m either side of the join between laps over which the picture fades to black
    soundRange: 110,       // m within which traffic crashes are heard (in a run only the player's are)
  },

  // evil cars lob packages at the road where another vehicle (or the player) will be; the splash does the damage
  enemyThrowRange: 60,     // m from the player within which they bother
  enemyThrowMin: 2,        // s between throws, random between min and max
  enemyThrowMax: 5,
  enemyThrowScatter: 3,    // m, how far from its victim (the player, or another vehicle) a package may land
  enemyThrowCarRange: 45,  // m: the furthest away another vehicle can be for an evil car to throw at it
  splashRadius: 4,         // m
  splashDamage: 6,
  attitudeRange: 50,       // metres behind a car at which it reacts to the player

  // collision physics
  maxStep: 1 / 120,        // s, simulation sub-step so fast head-ons can't tunnel
  broadPhaseDistance: 12,  // only test pairs within this distance along the track
  policeTurnIn: 0.5,       // m/s sideways towards the player a police car must be moving, and faster
                           // than the player towards it, for a touch to be its doing: no bust
  playerPushShare: 0.1,    // share of any push the player takes when it hits traffic (the traffic takes
                           // the rest): small, so the player barely loses speed. 0.5 would be an even match
  playerRearEndShare: 0.6, // ...except when the player runs into the back of a traffic vehicle: the one
                           // case the traffic wins. The player takes this share of the push instead
  pushStep: 0.15,          // m per simulation step that overlapping cars are slid apart along the road
  bounce: 0.25,            // restitution, 0 = dead stop, 1 = full bounce
  scrape: 0.15,            // share of the speed difference traded in a side impact
  spinKick: 0.5,           // rad/s of spin per m/s of off-centre impact
  stunTime: 1.2,           // s a knocked car is out of control (no lane keeping)
  stunDrag: 0.5,           // 1/s speed loss while stunned
  stunGrip: 2.5,           // 1/s sideways speed loss while stunned
  minImpact: 1.0,          // m/s, gentler contact pushes but does no damage
  hardCrash: 14,           // m/s of impact from which a crash sounds like a bad one

  // damage
  damagePerSpeed: 1.5,     // health lost per m/s of impact (split by mass)
  // spin-outs: a traffic car that takes damage may lose control, arc away and blow up.
  // chance per hit = spinPerDamage x (share of full health this hit took)
  //                  x (1 + spinRamp x (share of health now gone) squared)
  critChance: 0.05,        // chance that a hit on a traffic vehicle is a critical one: it wobbles, then spins out
  critWobbleTime: 1.1,     // s of wobbling before it goes
  spinPerDamage: 0.16,
  spinRamp: 12,            // how much likelier a nearly wrecked car is to spin than a fresh one
  packageSpinScale: 0.23,  // packages: scaled so about 1 car in 8 pelted to destruction spins out
  spinTime: 2,             // s of spinning before it explodes
  spinTurnMin: 0.25,       // rad/s its direction of travel swings round, random between min and max
  spinTurnMax: 0.8,
  spinDrag: 0.15,          // 1/s speed loss while spinning
  smokeStart: 0.75,        // health fraction below which a car starts smoking
  smokeRate: 35,           // particles per second at zero health
  shakeTime: 0.4,          // s
  hitShake: 0.5,           // camera shake, metres
  respawnTime: 4.5,        // s for the helicopter to deliver a new car (the time penalty)
  respawnShield: 2.5,      // s the new car can't be hit while it gets going

  // mood: -1 (furious) .. +1 (cheerful); angry below -1/3, happy above +1/3, neutral between.
  // Mood is an emotion and is separate from whether a car is good or evil.
  moodPerDamage: 0.02,     // mood lost per point of damage taken
  moodHoldUp: 0.15,        // mood lost per second stuck behind the player
  emoteEvery: 6,           // s, roughly, between mood faces popping up over a car
  emoteTime: 2,            // s a mood face stays up

  // packages
  throwRange: 70,          // m, max distance to a target
  throwBlind: 30,          // m ahead of the car a package lands on the road when nothing is in range
  throwSpeed: 100,         // m/s, sets the flight time...
  throwFlightMin: 0.175,   // ...within these limits (s)
  throwFlightMax: 0.75,
  throwArc: 3,             // m, peak height of the arc
  throwCooldown: 0.6,      // s
  packageDamage: 4,        // a care package barely scratches what it hits
  evilPackageDamage: 35,   // an Evil player's flaming package: real damage, and it makes enemies
  completeBank: 10000,     // $ in the bank after "Unlock everything" on the menu
  // the clock: a level allows its `time` seconds, scaled by the side the player picked
  timeScale: { good: 1.2, evil: 0.85 },
  tipCountdown: 10,        // s past zero over which the level's tip drains away to nothing
  packageMoodBoost: 0.5,   // mood gained by a good car that gets one (evil cars go straight to furious)

  // TANK RAGE: pieced together from five targets: a package landed on a green target beside
  // the road finds the next piece of the tank, and the fifth starts TANK RAGE. The pieces
  // carry over from level to level (see Game.settleTank)
  tankPieces: 5,
  tankParts: ['rearBody', 'turretHull', 'gunTurret', 'gunBarrel'], // the first four, in order (messages.json: tankParts)
  targetOffset: 5,         // m beyond the pavement the targets stand, out of the car's reach
  tankRamSlow: 0.15,       // share of its speed the tank loses per unit of mass it rams (a car is 1)
  tankMaxSpeed: 46,        // m/s: a tank is faster than any car in the garage
  tankHeadOnDamage: 0.2,   // share of full health a head-on costs the tank; nothing else hurts it
  cannonRange: 26,         // m ahead of the tank the shell lands
  cannonCooldown: 0.64,    // s
  cannonDirectRadius: 4.5, // m: anything this close to the blast is destroyed outright
  cannonSplashRadius: 11,  // m
  cannonSplashDamage: 63,
  cannonCrit: 3,           // times likelier than usual that a car the splash catches takes a critical hit
  cannonBlastScale: 1.4,   // size of the shell's explosion (fire and debris) against a big wreck's
  cannonSmoke: 0.3,        // and of its smoke: kept light, as the tank drives straight into it

  // chase camera
  camBack: 14,
  camHeight: 11,           // m above the road
  camLookAhead: 10,        // m ahead of the car that the camera aims at: shorter = tilted further down
  camLateralLag: 3.5,      // 1/s, lower = more lag on lane changes
  camFov: 75,
  camFovPortrait: 88,
  camFovSpeedBoost: 10,    // extra degrees at max speed
  camFovFullSpeed: 45,     // m/s that counts as max speed for that


  // messages (the wording is in messages.json)
  messageTime: 2,          // s a message stays up (plus messageExtra for its kind)...
  messageFade: 0.4,        // ...the last of which it spends fading away
  messageExtra: { reaction: 0, pickup: 2, rage: 2, bust: 5 }, // s longer, by kind (see messages.js)

  // night levels (theme "night"): the player's headlights, two spotlights riding on the car
  headlights: {
    color: 0xfff1d0,
    intensity: 36,         // each
    range: 85,             // m, where the light runs out altogether
    decay: 0.7,            // how fast it fades with distance (0 = not at all, 2 = true to life)
    angle: 0.55,           // rad, half the width of the beam
    penumbra: 0.6,         // share of the beam's edge that is soft
    height: 2.2,           // m above the road they shine from (a little higher than real lamps, so
                           // the light reaches on down the road instead of only skimming it)
    aim: 40,               // m ahead of the car the beams are centred on
    spread: 0.7,           // m either side of the car's centre line
  },
  // ...and every traffic vehicle's: not real lights (too many), a glow laid on the road ahead of it
  trafficBeam: {
    color: 0xffe6b0,
    length: 15,            // m ahead of the vehicle's nose
    width: 6,              // m across at its widest
    strength: 0.5,         // how bright, 0..1
  },

  // scenery
  poleSpacing: 25,
  buildingSpacing: 30,
  dashLength: 3,
  dashSpacing: 9,
};
