// ============================================================================
// CONFIG
// ============================================================================
export const CONFIG = {
  // road
  laneCount: 4,            // lanes on the expressway, half each way (a level can set its own with "lanes")
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
  turboMaxSpeed: 45,
  turboAccel: 22,          // m/s^2, the turbo pulls up to its top speed on its own
  turboTime: 6,            // s
  ghostTime: 6,            // s the car is see-through and passes through cars and barriers
                           // (the bridge structure and package splashes still get you)
  wrenchRepair: 0.25,      // share of full health restored
  passengerTime: 12,       // s of shoulder driving without running the police meter down
  powerUpWarning: 3,       // s before a turbo, ghost, passenger or mystery runs out that its warning sound starts
                           // (only one of those runs at a time: a new one replaces it)
  // the mystery pickup: one of these effects at random (see Player.startMystery); the wording
  // is in messages.json, under powerups.mystery
  mystery: {
    effects: ['rickety', 'toad', 'angel', 'jerk', 'invincible', 'noBrakes', 'insuranceUp', 'insuranceDown', 'ufo'],
    time: 12,              // s the lasting ones last (insuranceUp / insuranceDown and ufo are over at once)
    rickety: 1.5,          // damage the car takes while rickety, against the usual
    toadSpeed: 20 / 3.6,   // m/s every toad goes along at in TOAD RAGE
    toad: { hw: 1.2, hl: 1.4, height: 1.8, mass: 1 }, // a toad's hitbox
  },
  // UFO AIR STRIKE (a mystery): the saucer's visit, and the burn that follows it
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
    bale: { damage: 20, speedKept: 0.75 },
    frog: { damage: 30, speedKept: 0.6 },
    cow: { damage: 30, speedKept: 0.6 },
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
    // the garage's cars as traffic. model: which of the models in render/models.js it is drawn as
    junker:  { hw: 1.0,  hl: 2.5, height: 1.5, mass: 1.3, health: 70,  speed: 0.85, model: 'junker' },
    sport:   { hw: 0.85, hl: 1.9, height: 1.1, mass: 0.8, health: 45,  speed: 1.25, model: 'sport' },
    wagon:   { hw: 1.05, hl: 2.4, height: 1.9, mass: 1.6, health: 90,  speed: 1,    model: 'wagon' },
    lovebus: { hw: 1.0,  hl: 2.3, height: 2.1, mass: 1.5, health: 100, speed: 0.8,  model: 'lovebus' },
  },
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

  // TANK RAGE: started by landing a package on a green target beside the road
  targetOffset: 5,         // m beyond the pavement the targets stand, out of the car's reach
  tankRamSlow: 0.15,       // share of its speed the tank loses per unit of mass it rams (a car is 1)
  tankMaxSpeed: 34,        // m/s, a little above the car's top speed
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


  // messages (the wording is in messages.json)
  messageTime: 2,          // s a message stays up...
  messageFade: 0.4,        // ...the last of which it spends fading away

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
