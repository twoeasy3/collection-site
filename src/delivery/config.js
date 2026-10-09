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
  runoffEase: 25,          // m a stretch of run-off (a level's "runoff") eases in and out over
  gradeEase: 60,           // m each way over which one slope is blended into the next (crests and dips)
  bridgeWallInset: 0.4,    // gap between the outer lane line and a bridge's structure
  ramps: {                 // exits, merges and their flyovers (an exit's "flyovers": true)
    laneZone: 180,         // m of exit lane before an exit / merge lane after a merge: an extra lane
                           // outside the expressway's right-hand lane, with the shoulder beyond it
    gore: 50,              // m over which that lane opens at the start of the exit zone, and over which
                           // the expressway's pavement blends with the side road's at each fork
    ramp: 110,             // m at each end of a side road that is a single-lane ramp
    laneTaper: 60,         // m over which a side road widens or narrows by its exit's "lanes"
    shapeLead: 130,        // m at each end of a side road an exit's own shape ("out", "bends") leaves alone...
    shapeEase: 120,        // ...and m beyond that it eases in over
    tightest: 35,          // m: the tightest a side road's bend may be (its radius)
    leftShoulder: 1,       // m; a side road's right shoulder is the normal driveable width
    flyoverLength: 360,
    flyoverHeight: 7,
    trafficShare: 0.45,    // share of traffic that takes a side road
    sideOncoming: 4,       // on a one-way level, the cars coming the other way along a side road that has oncoming traffic
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

  // speed (m/s): hold accelerate / brake to change it, release and it holds. minSpeed: the slowest it rolls
  // along by itself; held, the brake brings it to a stop, but not on a lapped circuit (see Player.updateSpeed)
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
  armour: { time: 12, damage: 0.5 },       // s; the share of any damage the car takes while armoured
  // Big Splash: for `time` s the player's packages catch every car within `radius` m of where they hit
  // or land, and hit harder: a flaming one does fireDamage; a gift giftDamage, or, to an evil driver,
  // 1 damage giftDamage times over, one every peltEvery s (each a chance of a critical hit)
  bigSplash: { time: 12, radius: 8, fireDamage: 45, giftDamage: 7, peltEvery: 0.05,
    gun: { damage: 2, splash: 1.6, scale: 1.4 } }, // (and a gun's shell, the Battlefield 8x8's: times the damage, the splash's reach, the blast's size)
  butterfingers: { time: 10 },             // s the player can't throw
  cashPickup: { cash5: 5, cash10: 10, cash20: 20 }, // $ a cash pickup is worth: banked with the tip on delivery
  timePickup: 10,          // s a stopwatch puts on the clock (time plus) or takes off it (time minus);
                           // in the tip countdown it moves that too. Instant: the powerup running carries on
  powerUpWarning: 4,       // s before a turbo, ghost, passenger or mystery runs out that its warning sound
                           // starts, and the sign of it on the car starts to blink
                           // (only one of those runs at a time: a new one replaces it)
  // the mystery pickup: one of these effects at random (see Player.startMystery); the wording
  // is in messages.json, under powerups.mystery
  mystery: {
    effects: ['rickety', 'toad', 'angel', 'jerk', 'invincible', 'noBrakes', 'insuranceUp', 'insuranceDown', 'ufo', 'bulletTrain'],
    // a second pool, not drawn for now: only ?mystery= in the address picks one of these
    //   sundayDrivers  every driver potters along at sundayPace of its speed (not an ambulance, nor a racer)
    //   rushHour       rushHour times the traffic, each way, as far as the pool allows; the extra cars
    //                  turn up at once, and once it is over, each one that goes isn't replaced
    //   carSwap        the player is put in another of the garage's cars at random, and given its own back after
    //   moodSwing      every driver that can be evil swaps sides: good turns evil, evil turns good, and back after
    extraEffects: ['sundayDrivers', 'rushHour', 'carSwap', 'moodSwing'],
    sundayPace: 0.5,
    rushHour: 2,
    time: 12,              // s the lasting ones last (insuranceUp / insuranceDown, ufo and bulletTrain are over at once)
    rickety: 1.5,          // damage the car takes while rickety, against the usual
    toadSpeed: 20 / 3.6,   // m/s every toad goes along at in TOAD RAGE
    toad: { hw: 1.2, hl: 1.4, height: 1.8, mass: 1 }, // a toad's hitbox
    // noBrakes: the car no longer slows for a bend by itself. Taken too fast (past cornering.grip),
    // it understeers wide as on ice (ice.understeer, ice.steerGrip), scrubbing off `scrub` m/s^2 for
    // every m/s^2 of the slide. Holding brake lifts off: it coasts down at `coast` m/s^2. Steering
    // scrubs a little too, up to `steerScrub` m/s^2 at full sideways speed: something to feel
    // before a bend, never a way to stop (far less than lifting off)
    noBrakes: { coast: 3, scrub: 0.3, steerScrub: 0.5 },
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
  // Cornering: in a bend, every car (the player's too) has a lower top speed, the sharper the bend,
  // the heavier the car and the less agile: sqrt(grip x agility / (weight x curvature)). A gentle
  // bend is taken flat out, a hairpin at a crawl. (weight: as on ice, see CONFIG.ice.weightRef)
  cornering: { grip: 22 },   // m/s^2 of cornering a car of weight 1 and agility 1 holds
  // A race (a level's "grid", "understeer", "wallDamage", "nudge": see levels.js). Its understeer is
  // `understeer` times as hard as on ice, and sliding wide scrubs off speed: `scrub` m/s^2 for every
  // m/s^2 of the slide. The cars of the grid take the bends as fast as their nerve
  // allows (the ice's grip x aiGrip: well past the point of sliding wide), slowing late, for the
  // sharpest bend within aiLookout m; their tyres hold aiTyres times the grip before they slide, and
  // they pull away aiPickup times as hard as ordinary traffic; and a car going into a wall at more than wallFrom m/s
  // sideways takes wallDamage health per m/s of it, as it hits
  // A racer wrecked is set back down where it was wrecked respawnTime s later, untouchable for respawnShield s.
  // The slipstream: a car (a racer, or the player) right behind another, within towReach m and
  // overlapping it, has its top speed raised by up to `draft` of it, the more the closer it is; so
  // it can outdrag the car it follows. A racer on a straight with a car up to seekReach m ahead in
  // the lane beside moves over into its tow (every seekEvery s at most), then pulls out to pass.
  // the arrow at the foot of the screen for whoever is behind the player in a race (within raceRange m),
  // or a rival courier (within rivalRange m): slid slidePerM px to the side for every m across, up to
  // slide px; orange when it is within close m
  behind: { raceRange: 150, rivalRange: 400, slidePerM: 14, slide: 140, close: 15 },
  // the marker over a rival courier (see render/emotes.js): its tip `above` m over the car's roof (the mood
  // face pops up from 0.5 to 1.6 m over it), growing in proportion beyond growFrom m from the camera
  rivalMark: { above: 2.1, growFrom: 35 },
  // a level's gang war (see gunfire.js): in its turf, gangShare of the houses are the gang's (marked out:
  // see render/road.js). Each fires across the road from its windows, only within `arc` radians of straight
  // out, at whatever is in that arc within range m (picked at random; only houses within range + seen m
  // of the player fire): `shots` shots, shotGap s apart, at speed
  // m/s, off true by up to spread m; then it waits `every` s. Each hit does `damage`, and punctures a tyre
  // with a chance of `puncture`. A muzzle flash shows for flashTime s
  gunfire: { gangShare: 0.35, arc: 0.52, seen: 80, every: { min: 3, max: 6 }, shots: { min: 4, max: 8 }, shotGap: 0.09, speed: 110,
    spread: 1.4, range: 60, damage: 2, puncture: 0.06, flashTime: 0.06 },
  // a drive-by car (traffic kind 'driveby'): every `every` s, within range m of the player, it picks a target
  // (the player, or a car near it), pulls up alongside it (within alongside m), fires `shots` shots shotGap s
  // apart, then makes its getaway for good at fleePace times its pace, pushing through traffic as a rival courier does
  // (see CONFIG.rival), until it is gone from the road; it gives up the chase after giveUp s
  driveBy: { every: { min: 3, max: 7 }, range: 120, alongside: 2.5, shots: 9, shotGap: 0.11, fleePace: 1.6, giveUp: 14 },
  // a punctured tyre (the player's: see Player.punctureTyre): topSpeed and accel are shares of the car's
  // own; the car pulls to that side at up to pull m/s; stopped for fixTime s in all, the tyre is changed; and for
  // grace s afterwards (as while punctured) the shoulder meter doesn't run down
  // (and braking with a flat, the car brakes brake times as hard, right down to a stop, and stays stopped)
  puncture: { topSpeed: 0.5, accel: 0.5, pull: 1.6, fixTime: 4, grace: 6, brake: 2 },
  // a rival courier (a level's "rival", or ?rival: see Game.start): its pace, a share of the player's car's
  // top speed; its health; and s before an evil one's first throw at
  // the player (then as any evil car's: enemyThrowMin..Max)
  // Behind the player, it is faster, from catchUp.from m behind up to catchUp.pace times its pace at
  // catchUp.full m. It looks lookAhead m (and lookTime s at its speed) ahead for obstacles, steering
  // round any within obstacleRoom m of its line (and round a pickup that would do it harm); one that would do
  // it good, it moves over for, within pickupReach m (and lookTime s at its speed). A pickup it gets that is
  // heard of within heard m is said
  // (up to `most` of them: see a level's "rivals"; each one ahead at the drop takes its share of the tip.
  // No package is ever aimed at one, nor lands on one: it is beaten by driving, not bombing)
  rival: { most: 3, pace: { min: 0.96, max: 1.0 }, health: 4000, firstThrow: 6, catchUp: { from: 15, full: 150, pace: 1.15 },
    lookAhead: 20, lookTime: 2.2, obstacleRoom: 0.5, pickupReach: 40, heard: 150,
    // It is no stickler for the rules: boxed in, it overtakes up the shoulder (as long as it is wide
    // enough for it, by shoulderRoom m) or out in the oncoming lane, with only oncomingEdge m/s more
    // pace than what holds it up (an ordinary racer wants race.oncoming.edge)
    // (but with a police car within policeRange m, it keeps to its own lanes: it can't be busted, but it plays it safe)
    shoulderRoom: 0.3, oncomingEdge: 1.5, policeRange: 55,
    // and in traffic it takes a gap laneGap m clear either side (traffic wants laneChangeGap), counts only
    // what is within passRoom m past the car it is passing in that lane, and shakes off a knock recovery times as quickly
    laneGap: 6, passRoom: 12, recovery: 3,
    // the slipstream on a rival stage (for the rivals and the player alike): within reach m of the car ahead,
    // and share as strong as a race's (see CONFIG.race: draft, and the slingshot that comes of it)
    tow: { reach: 45, share: 0.4 },
    // Against ordinary traffic it has the better of every knock: it takes `share` of any push, damage and
    // stun (an even match is 0.5), its hits do `damage` times as much to the other, and side by side it
    // shoves the other car aside at `shove` m/s a step; a head-on wrecks the other car, costing it headOn
    // health and all but headOnSpeed of its speed. Stuck behind a car with no way by for `after` s, it
    // rams it, closing at `closing` m/s, and an evil one throws at it every throwEvery s
    ram: { share: 0.15, damage: 4, shove: 0.25, headOn: 600, headOnSpeed: 0.35, after: 0.3, closing: 6, throwEvery: 1.5 } },
  race: { respawnTime: 4.5, respawnShield: 1.5, understeer: 6, scrub: 0.3, aiTyres: 1.6, aiGrip: 2.2, aiPickup: 2.4, aiLookout: 35, wallFrom: 1.5, wallDamage: 5,
    towReach: 130, draft: 0.2, seekReach: 160, seekEvery: 1.5,
    // Racecraft: each driver's nerve in the bends is its own, from nerve.min to nerve.max times the
    // field's (so some are quicker through them, and catch the one ahead). A racer that pulls out to
    // pass is on the attack for attackTime s (or, still alongside it, up to passMax s): the tow it pulled out of carries it on (its slingshot,
    // fading as it goes), and it brakes later, with attackNerve times its nerve
    nerve: { min: 0.92, max: 1.06 }, attackTime: 3, attackNerve: 1.12,
    // Passing into a corner: a racer on the attack brakes later (looking diveLookout as far ahead
    // for the bend), and a racer with one alongside on the attack as a bend comes gives it the
    // corner, easing to cede of its pace (an evil one, evilCede: it gives up as little as it can)
    diveLookout: 0.55, cede: 0.9, evilCede: 0.97, passMax: 8,
    // Overtaking on the wrong side of a two-way road (with no lane of its own to pass in): only with
    // `edge` m/s more pace than the car holding it up; past the whole queue (cars within queueGap m of
    // the next) and margin m more; with nothing coming that could reach it in that time, and spare m
    // to spare. It pulls back in at the first gap (room for it and cutIn m behind it), at once with
    // anything coming within panic s, and after longest s regardless
    oncoming: { edge: 4, queueGap: 22, margin: 14, spare: 60, cutIn: 4, panic: 2.2, longest: 12 },
    // Going by the player, a racer picks a side and keeps to it; shut out, it switches to the other,
    // if that is open (a dummy), at most every feintEvery s; and on the attack it moves across
    // passSharp times as sharply
    feintEvery: 0.8, passSharp: 1.6,
    // The slingshot: a car (a racer, or the player) pulling out of a tow at least slingFrom deep is
    // flung on: a kick of slingKick of its top speed (by how deep in the tow it was) on top of the
    // tow's own, both fading away: over slingPerGain s for every m/s the tow had it going above its
    // own top speed as it pulled out (at most slingMax s), so a long, deep tow flings it on furthest
    slingFrom: 0.25, slingKick: 0, slingPerGain: 0.25, slingMax: 4,
    // An evil racer's feud (a good one races clean): with a rival ahead of it or alongside, it
    // chases it down and rams it, as anywhere; but it never drops back for one behind it, it only
    // blocks it, moving across into its lane (at most every blockEvery s) without lifting off
    blockEvery: 0.8,
    blocking: { min: 3, headway: 0.3, window: 20 }, // (on a circuit, racing close: the room it needs to block, as CONFIG.blocking)
    // ...and a rival ahead is rammed with a nudge, not at full tilt: it closes right up, nudge m/s
    // faster than its rival, and shoves. An evil racer that is angry races in a fury: fury.pace
    // times its top speed, fury.nerve times its nerve in the bends
    nudge: 1.5, fury: { pace: 1.05, nerve: 1.08 },
    // An evil racer left behind by the car in front of it (more than chase.from m back) chases it
    // down hard: up to chase.pace times its top speed and chase.nerve times its nerve in the bends,
    // all of it by chase.full m back. And it bullies good racers, who race clean: alongside one, it
    // leans bully.squeeze m into it, and the good one (with an evil one alongside, within
    // bully.room m) lifts to bully.lift of its speed to keep out of trouble, and with an evil one
    // within bully.behind m of its gearbox, moves over to let it by (every bully.yieldEvery s at
    // most). A good racer bullied loses bully.mood a second; the evil one gains it
    chase: { from: 40, full: 120, pace: 1.06, nerve: 1.1 },
    bully: { room: 1.2, lift: 0.9, behind: 4, squeeze: 0.7, yieldEvery: 1, mood: 0.025 },
    // A racer's mood: in the front half, with clear road behind it, it cheers up as the race goes
    // on, up to leadMood a second for the leader; but with a car within pressure m behind it, it
    // frets instead, up to pressureMood a second for the leader (and much less a few places back,
    // where it falls away as the square of how far up front it is). It gains passMood for every car
    // it gets past, and loses passedMood for every car that gets past it; up to frontSwing times
    // that for the leader (a place up front matters more), and so much more at the very front
    // (so the knocks of the race don't leave the whole field furious, nor the front of it serene).
    // A racer wrecked within killWindow s of another hitting it is that one's doing; an evil
    // racer that does it gains killMood
    leadMood: 0.03, pressure: 15, pressureMood: 0.05, passMood: 0.15, passedMood: 0.1, frontSwing: 3,
    killWindow: 3, killMood: 0.5 },
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
    clearBehind: 16,       // a car only carries straight on at a turn with nothing going its way beside it on the outside of
    clearAhead: 30,        // the bend, from this many m behind it to this many ahead, where one slowing for the bend still is (it would cut across it: see Traffic)
    crossing: 2,           // s it takes to get across, more or less: what is closing on it in that time counts as beside it
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
  // the dancing portaloos (a level's "potties": see Collision): rows of them moving together, in step
  potties: {
    hop: 3.6,              // m up they jump (above a car's roof, it passes underneath)
    period: 1.8,           // s a step of their dance takes, unless the row says otherwise
    slide: 3.5,            // m to each side they slide
  },
  // mud (a level's "mud": stretches where the road gives way to mud): a car in it is slowed as on a
  // railway track (see railCrossing: by how well it crosses), and steers with less grip
  mud: { steerGrip: 0.7, trafficPace: 0.6 },
  // construction machinery (a level's "machinery": see machinery.js), trundling across the road and back
  machinery: {
    speed: 2.6,            // m/s it trundles at
    hl: 1.8,               // m, half its width (along the road)
    hw: 3.6,               // m, half its length (it crosses the road)
    beyond: 9,             // m off the road it goes before turning back...
    rest: { min: 1, max: 3 }, // ...after waiting there this many s
    damage: 30,            // health the player's car loses running into one (and blowing it up)...
    speedKept: 0.6,        // ...and the share of its speed it keeps
    rollerSpeed: 1.5,      // m/s a road roller crawls along its shoulder
    pokeOut: 7,            // m off the road a forklift backs off to
    sizes: { roller: { hl: 2.4, hw: 1.15 }, forklift: { hl: 1.4, hw: 1.0 } }, // (the rest: hl / hw above)
  },
  // the work on a construction site's shoulders (a level's "siteWorks": see site.js)
  site: {
    trenchIn: 0.6,         // m out onto the shoulder the car's middle must be to drop a wheel in a trench
    plateEvery: 9,         // m from one steel plate across a trench to the next...
    plateLength: 4,        // ...each this long
    trenchDamage: 8,       // health a wheel in a gap costs...
    trenchKept: 0.7,       // ...and the share of its speed the car keeps
    trenchPuncture: 0.15,  // ...and the chance it gives the car a flat tyre (on that side)
    // potholes (a level's "potholes": { s, lane, r }): a wheel dropping into one is the same jolt
    potholeR: 0.9,         // m, a pothole's radius (a level can give each its own: r)
    potholeDamage: 6,      // health it costs...
    potholeKept: 0.8,      // ...the share of its speed the car keeps...
    potholePuncture: 0.25, // ...and the chance of a flat tyre (on the side of the car it hit)
    digOut: 4,             // m off the road an excavator stands...
    reach: 9.5,            // ...its bucket this far from it...
    swingPeriod: 5,        // ...swinging out and back in this many s
    bucket: 1.2,           // m, half the bucket's size
    bucketDamage: 30,      // health its bucket costs the player (blowing the excavator up)...
    bucketKept: 0.6,       // ...and the share of speed kept
    walkSpeed: 1.2,        // m/s a worker pushes a barrow at...
    diveNear: 28,          // ...diving clear with the player this near behind...
    diveWide: 4,           // ...and this near across
    stackOut: 3,           // m off the road a pipe stack stands...
    pipeNear: { min: 35, max: 110 }, // ...a pipe rolling off with the player this far short of it...
    pipeEvery: { min: 5, max: 9 },   // ...no more often than every min-max s...
    pipeSpeed: 5.5,        // ...rolling at this m/s
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
    blastAim: 4,           // ...so that, keeping on, the player's nose is this many m short of the box as it blows...
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
    // the construction site's
    potty: { damage: 20, speedKept: 0.7 },
    sewage: { damage: 10, speedKept: 0.55 },
    pile: { damage: 15, speedKept: 0.6 },
    beam: { damage: 35, speedKept: 0.5 },
    barrow: { damage: 10, speedKept: 0.85, light: true },
    pipe: { damage: 25, speedKept: 0.55 },
    zebra: { damage: 25, speedKept: 0.7 },
    asteroid: { damage: 14, maxDamage: 70, speedKept: 0.7 }, // damage is per metre of radius, up to maxDamage
    // (light: true = a small thing: it doesn't knock the steering, and barely shakes the camera)
    cone: { damage: 3, speedKept: 0.94, light: true },
    mine: { damage: 30, speedKept: 0.55 }, // a sea mine (Oh Mine!)
    sign: { damage: 12, speedKept: 0.8 },
    limitSign: { damage: 8, speedKept: 0.85 }, // (a speed camera's limit sign: see CONFIG.speedCamera)
    // the beach's junk (Hurricane)
    umbrella: { damage: 15, speedKept: 0.85 },
    surfboard: { damage: 18, speedKept: 0.8 },
    cooler: { damage: 6, speedKept: 0.92, light: true },
    chair: { damage: 30, speedKept: 0.6 },
    wreck: { damage: 35, speedKept: 0.5 },
    // the hidden gimmicks level's
    camera: { damage: 8, speedKept: 0.85, light: true }, // a speed camera on its pole
    rock: { damage: 25, speedKept: 0.6 },
    cyclist: { damage: 12, speedKept: 0.85, light: true },
    landmine: { damage: 0, speedKept: 1 }, // (no ordinary knock: it destroys whatever touches it outright, see Collision)
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
    // 'dart': no pattern at all. It sits a while (dartRest s, at random), shivers for dartShiver s
    // (the only warning), then darts off to anywhere within its reach of its home, at dartSpeed
    // m/s (at random; dartMin m at least), and sits again. Differently every run. An obstacle with "drift": "dart"
    // reaches dartAlong m up or down the road and dartAcross m across it; a drifter, its whole stretch across
    dartRest: { min: 0.3, max: 1.6 }, dartShiver: 0.35, dartSpeed: { min: 4, max: 14 }, dartAlong: 8, dartAcross: 4, dartReach: 22, dartMin: 2,
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
  // crit / spin: its own odds of a critical hit / of spinning out, as a multiple of the usual (default 1; 0 = never)
  vehicles: {
    // (a vintage delivery van, in the one livery: livery is its paint, whatever the driver)
    van:     { hw: 1.1,  hl: 2.7, height: 2.3, mass: 1.8, health: 90,  speed: 0.95, model: 'deliveryvan', livery: 0x1e5b3f },
    bus:     { hw: 1.3,  hl: 5.5, height: 3.1, mass: 4,   health: 180, speed: 0.8, special: true, model: 'citybus' },
    tractor: { hw: 1.2,  hl: 2.0, height: 2.4, mass: 2.5, health: 150, speed: 1, special: true },
    police:  { hw: 0.95, hl: 2.1, height: 1.4, mass: 1.2, health: 80,  speed: 1.1, special: true, model: 'police' },
    // an 18-wheeler: a prime mover and a long trailer. kerb: it keeps to the lane by the kerb
    // (rejoining it after a narrowing), never changing lanes of its own or picking a fight;
    // cruise: m/s it runs at, fast, whatever the level's pace, and it never hesitates
    // noSpin: it never spins out (not from damage, nor on ice): a critical hit makes it wobble, then blow up
    semi:    { hw: 1.25, hl: 8.2, height: 4.0, mass: 6, health: 320, speed: 1, model: 'semi', kerb: true, cruise: { min: 26, max: 31 }, noSpin: true },
    // a Formula 1 car (a level's "grid": see Traffic), its speed set by the race
    f1:      { hw: 0.95, hl: 2.6, height: 1.0, mass: 0.8, health: 220, model: 'f1', agility: 1.5 },
    // a GT road car, raced (as f1)
    gt:      { hw: 1.0, hl: 2.3, height: 1.25, mass: 1.3, health: 300, model: 'gt', agility: 1.2 },
    // a Le Mans prototype (as f1, and as nimble): built for endurance, the toughest of the three, and it never spins out or takes a critical hit
    lmp:     { hw: 1.0, hl: 2.35, height: 1.05, mass: 1.0, health: 380, model: 'lmp', agility: 1.5, crit: 0, spin: 0 },
    // (only ever an emergency vehicle: see CONFIG.emergency; never in a level's traffic list)
    ambulance: { hw: 1.1, hl: 2.9, height: 2.6, mass: 2, health: 150, speed: 1, special: true, model: 'ambulance' },
    // the garage's cars as traffic (each id is the garage car's, in src/cars.js). They have no
    // speed: they cruise near that car's own top speed (garagePace, below). model: which of the
    // models in render/models.js it is drawn as
    // (the everyday traffic: these two run at the level's own pace, as the cars they replaced did)
    commuter: { hw: 0.85, hl: 1.85, height: 1.45, mass: 0.8, health: 45, model: 'commuter', speed: 1.05 },
    darkvan: { hw: 1.05, hl: 2.45, height: 2.4, mass: 1.5, health: 60,  model: 'darkvan', speed: 1 },
    junker:  { hw: 1.0,  hl: 2.5, height: 1.95, mass: 1.3, health: 70,  model: 'junker' },
    sport:   { hw: 0.85, hl: 1.9, height: 1.1, mass: 0.8, health: 45,  model: 'sport' },
    wagon:   { hw: 1.05, hl: 2.4, height: 1.9, mass: 1.6, health: 90,  model: 'wagon' },
    lovebus: { hw: 1.0,  hl: 2.3, height: 2.1, mass: 1.5, health: 100, model: 'lovebus' },
    lowrider: { hw: 1.0, hl: 2.5, height: 1.1, mass: 1.3, health: 85,  model: 'lowrider' },
    taxi:    { hw: 1.0,  hl: 2.55, height: 1.6, mass: 1.4, health: 90,  model: 'taxi' },
    suv:     { hw: 1.0,  hl: 2.25, height: 1.8, mass: 1.6, health: 110, model: 'suv' },
    hotrod:  { hw: 0.9,  hl: 2.1, height: 1.2, mass: 1,   health: 55,  model: 'hotrod' },
    minivan: { hw: 1.05, hl: 2.45, height: 2.0, mass: 1.7, health: 110, model: 'minivan' },
    hearse:  { hw: 1.0,  hl: 2.8, height: 1.65, mass: 1.6, health: 100, model: 'hearse' },
    // the Battlefield's armies (a level's "battle": see CONFIG.battle). rank: who wins a head-on (see Collision)
    jeep:    { hw: 0.95, hl: 2.0, height: 1.8, mass: 1.2, health: 60,  speed: 1.1, model: 'jeep', rank: 1 },
    apc:     { hw: 1.35, hl: 3.4, height: 2.5, mass: 4,   health: 160, speed: 0.9, model: 'apc', rank: 2, noSpin: true },
    tank:    { hw: 1.6,  hl: 3.3, height: 2.4, mass: 6,   health: 260, speed: 0.75, model: 'armytank', rank: 3, noSpin: true, crit: 0 }, // (no critical hits: only its health, or a mine, finishes it)
    pickup:  { hw: 1.05, hl: 2.6, height: 2.1, mass: 1.8, health: 120, model: 'pickup' },
    miata:   { hw: 0.85, hl: 1.95, height: 1.1, mass: 0.8, health: 50, model: 'miata' },
    // boats, the traffic of a level on the water (boat: it leaves a wake, has no tyres to puncture, shows no
    // brake lights or indicators, and never spins out or takes a critical hit): a cruiser as the player's jetboat, and a fishing trawler, big and slow
    boat:    { hw: 1.0, hl: 2.7, height: 1.6, mass: 1.2, health: 90, model: 'jetboat', speed: 1, boat: true, noWheels: true, crit: 0, spin: 0 },
    trawler: { hw: 1.5, hl: 4.6, height: 3.2, mass: 3.5, health: 200, model: 'trawler', speed: 0.6, boat: true, noWheels: true, crit: 0, spin: 0 },
    // a drive-by car (The Hood): only ever evil (evilOnly), out for trouble: see CONFIG.driveBy
    driveby: { hw: 1.0, hl: 2.65, height: 1.45, mass: 1.5, health: 120, model: 'driveby', speed: 1.1, evilOnly: true },
  },
  garagePace: { min: 0.75, max: 0.95 }, // share of its own top speed a garage car cruises at in traffic
  sirenRange: 160,         // m from a police car within which its siren is heard (louder the nearer)
  lowriderHearing: 90,     // m from a lowrider in traffic within which its music is heard (the same way)
  policeSightRange: 45,    // m along the road within which a police car witnesses what you do
  copGlowMargin: 12,       // m further out than that the screen's edges start flashing red and blue: a warning
  // A good player's social standing (see social.js), in points out of 100: gift points for each gift
  // that lands on a good driver (copGift on a police car), decay lost a second. With it, from none to
  // full: the police see policeSight.empty to policeSight.full times as far; the share of evil
  // drivers falls towards evilFloor; new drivers start up to moodLift happier (evil ones too); the
  // shoulder allowance grows by up to `danger` of itself; good powerups (and good mysteries) last up
  // to powerUpShift s longer, bad ones that much shorter; the good mysteries are up to `luck` more
  // likely again. From regen.from up, the car mends regen.min to regen.max of its health a second;
  // from protectFrom up, a car that assaults the player with a police car about is arrested.
  // A bust costs bust points of it, always; and above cautionFrom, the police let the player off
  // with a caution instead of the bust (for the shoulder: with grace s to get back in a lane).
  social: {
    gift: 4, copGift: 10, decay: 1, bust: 75, cautionFrom: 0.75, grace: 4,
    policeSight: { empty: 1.15, full: 0.85 }, evilFloor: 0.15, moodLift: 0.5, danger: 1, powerUpShift: 2.5, luck: 1,
    regen: { from: 0.5, min: 0.01, max: 0.03 }, protectFrom: 0.85,
  },
  maxBusts: 3,             // the run ends on this many busts
  evilShare: 0.35,         // share of traffic that is evil; the rest are good. A car never switches.
  startMood: {             // chance of each starting emotion (the remainder start neutral)
    good: { happy: 0.45, angry: 0.15 },
    evil: { happy: 0.1, angry: 0.6 },
  },                       // (a level can override both: "drivers": { "evil", "happy", "angry" }, or each side's: "goodMood" / "evilMood": { "happy", "angry" })

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
  grudgeTime: 7,           // s a driver the player has upset holds its grudge (throwing at the player), from the last upset
  // a car moving over in front of another to block it (an angry or smug driver in the player's way, a hunter,
  // a racer): only with this much room ahead of it, the more the faster the one blocked is going. The gap
  // must be at least `min` m and `headway` s at the target's speed, and no more than `window` m beyond that
  blocking: { min: 15, headway: 1.5, window: 40 },
  // How a traffic driver treats the player: by its side, its mood, and the player's side.
  //   good driver, good player: happy, friendly (moves aside, and eases off, letIn of its pace, to
  //     let the player in from the lane beside); angry, sulky (tailgates, within tailgate m, honks,
  //     holds its lane and won't let the player in)
  //   good driver, evil player: happy, wary (out of the player's lane, ahead or behind); neutral,
  //     distant (holds back, to distantPace, within distance m behind); angry, vigilante (blocks
  //     the player's lane ahead, tailgates, won't let the player in). A good driver never rams.
  //   evil driver, good player: happy, smug (gets in the player's lane ahead, dawdles at dawdle of
  //     its pace, brake-checks the player within brakeCheckRange m behind it every brakeCheckEvery
  //     s); angry, road rage (blocks, rams, feuds, throws rageThrowRate times as often: at the
  //     player if it holds a grudge, otherwise at whoever is nearest)
  //   evil driver, evil player: happy, a wingman (moves aside, and throws only at the cars about
  //     the player); angry, a turf war: it hunts the player (see hunt: a hunter holds a grudge, so
  //     it throws at the player), turfThrowRate times as often. No evil driver ever throws at the police.
  // An evil player who wrecks a car cheers the evil drivers within wreckCheer.range m by wreckCheer.mood.
  attitude: {
    letIn: 0.85, tailgate: 2.5, distance: 25, distantPace: 0.85, dawdle: 0.8,
    brakeCheckRange: 15, brakeCheckEvery: { min: 2.5, max: 5 }, rageThrowRate: 1.2, turfThrowRate: 1.8,
    // the turf war: the driver doesn't drop away: it keeps coming, catchUp m/s faster than the
    // player, for `time` s (or until it is lost lost m behind). Two or more hunting the player at
    // once box it in: the nearest ahead blocks its lane at blockPace of its speed and brake-checks
    // it, the nearest behind tailgates and rams, and the rest come up alongside and lean on it.
    hunt: { time: 25, catchUp: 6, lost: 250, blockPace: 0.92 },
    wreckCheer: { range: 60, mood: 0.4 },
  },

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
  throwBehind: 2,          // a car behind the player counts as this many times as far off as it is (one ahead is preferred)
  throwBlind: 30,          // m ahead of the car a package lands on the road when nothing is in range
  throwSpeed: 100,         // m/s, sets the flight time...
  throwFlightMin: 0.175,   // ...within these limits (s)
  throwFlightMax: 0.75,
  throwArc: 3,             // m, peak height of the arc
  throwCooldown: 0.6,      // s
  packageDamage: 4,        // a care package barely scratches what it hits
  evilPackageDamage: 25,   // an Evil player's flaming package: real damage, and it makes enemies
  completeBank: 10000,     // $ in the bank after "Unlock everything" on the menu
  // the clock: each level has its own, for each side ("clock": { good, evil }), worked out by
  // scripts/level-clocks.mjs from a clean run (a ghost, flat out) in the reference car: that run's time
  // times good or evil, to the nearest `round` s, less `timePlus` s for each time plus on the level (the time
  // it gives back)
  clock: { car: 'sport', good: 1.5, evil: 1.15, round: 5, timePlus: 5 },
  tipCountdown: 10,        // s past zero over which the level's tip drains away to nothing
  packageMoodBoost: 0.5,   // mood gained by a good car that gets one
  giftOffence: 15,         // s an evil car that gets one is offended: furious, but it drives no differently
                           // (no road rage), and all its throws are at the player; and after that...
  giftSpite: 0.35,         // ...it is only put out: this share of its throws come the player's way

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
  // broken tracks: a traffic tank's puncture, only ever from a shell's blast or a package's splash. Chance
  // a direct hit, or the splash, breaks a track; then it grinds to a halt (m/s²) and goes nowhere again
  brokenTracks: { direct: 0.35, splash: 0.15, stopping: 18 },

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

  // ---- the hidden gimmicks level's new things (see levels.js) ----
  // speed cameras (a level's "cameras": cameras.js): passing one faster than its limit is caught
  // on camera. The first time in a run is a fine (off what the run banks), every one after it a
  // bust. Running one over (it is an obstacle) is no offence. A radar detector warns of them: it
  // keeps the car from being caught at all
  speedCamera: {
    limit: 100,            // km/h, unless the camera has its own
    warn: 180,             // m short of a camera the player is warned of it (radar detector or not)
    signAhead: 70,         // m short of a camera its speed limit sign stands, on the shoulder on its side
    fine: 20,              // $ the first offence costs
    flash: 0.35,           // s the flash lasts
  },
  // a funeral procession (a level's "processions": see Traffic.startProcession): a hearse and its
  // cars, nose to tail, slow, in one lane; no lane changes, no throwing. Crash into any of them and
  // the whole procession is angry with you
  procession: {
    cars: 3,               // cars following the hearse
    kinds: ['commuter', 'wagon', 'minivan', 'suv'], // what they are (all in black)
    paint: 0x151515,
    speed: 11,             // m/s
    gap: 4,                // m nose to tail
  },
  // a level crossing (a level's "crossings": crossing.js): as the player comes near (or every so often
  // after), its lights flash and its booms come down across the lanes coming up to it, and a short
  // fast train shoots across the road. Traffic waits at the booms; whatever is on the line is wrecked
  crossing: {
    trigger: 230,          // m short of it the player sets it off (a crossing can give its own)
    warn: 2.6,             // s of flashing lights before the train reaches the road...
    lower: 1.2,            // ...the booms coming down over the first this many
    raise: 1.0,            // s they take to go back up once the train is clear
    every: { min: 14, max: 24 }, // s between trains after that, while the player hasn't gone by
    speed: 70,             // m/s the train goes at...
    cars: 2,               // ...carriages...
    carLength: 18,         // ...each this long...
    hw: 1.6,               // ...and half this wide
    reach: 70,             // m either side of the road the line runs out to (the train comes from that far)
    stopLine: 6,           // m short of the line traffic stops at (the booms stand there)
    boomDamage: 10,        // health a lowered boom costs the player driving through it...
    boomKept: 0.8,         // ...and the share of its speed kept
  },
  // stop / go roadworks (a level's "stopGo": stopgo.js): the oncoming side dug up, so both ways take
  // turns through the one lane left, a worker at each end turning a STOP / GO sign. Evil drivers
  // may run the STOP
  stopGo: {
    go: 9,                 // s each way gets the GO...
    clear: 5,              // ...with this long between, for the last through to clear (a works can set its own: "go", "clear")
    runChance: 0.35,       // chance an evil driver runs the STOP
    stopLine: 4,           // m short of the works traffic waits at
    coneEvery: 5,          // m between the cones down the middle
  },
  // split carriageways (a level's "splits": see track.js): the oncoming side of the road parts from the
  // player's, runs on by itself, and comes back
  split: {
    apart: 70,             // m the two ways are apart, unless the split says ("apart")
    ease: 320,             // m over which they part, and come back together
  },
  // a fog bank (a level's "fog": { from, to }): the fog closes right in, easing in and out over its edges
  fog: {
    near: 4,               // m the fog starts at, at its thickest (the usual: 120)...
    far: 70,               // ...and where it is solid (the usual: 520)
    edge: 60,              // m it thickens over, at each end
    policeSight: 0.4,      // share of their usual sight the police have in it
    color: 0xc4c9ce,
  },
  // rockfall (a level's "rockfall": { from, to, count, side }): rocks tumbling down from that side
  // onto the road as the player comes near. Obstacles: only the player can hit them
  rockfall: {
    height: 22,            // m up the hillside a rock starts...
    out: 14,               // ...this far off the road's edge
    near: { min: 60, max: 130 }, // m short of it the player sets one off
    size: { min: 0.6, max: 1.4 }, // m, a rock's radius
  },
  // THE BATTLEFIELD (a level's "battle": see levels.js). Two armies drive at each other down every lane
  // of the road: the player's (good, green), all of it going the player's way, and the enemy's (evil, red),
  // all coming the other way. Each goes after the other's vehicles: the guns (an 8x8's, a tank's) turn and
  // fire on the nearest enemy in range, a jeep lobs packages at one, and each steers for a head-on with an
  // enemy it beats (rank in CONFIG.vehicles: a tank beats an 8x8, an 8x8 a jeep, the player's 8x8 too),
  // which that one tries to dodge (dodge of the time; one it can't beat, and won't wreck by meeting, it always
  // steers clear of). A head-on won costs the winner `win` of its full health; anything else, a jeep against
  // a tank or two of a kind, wrecks both, as usual. Pillboxes beside the road fire bursts (as The Hood's gang
  // houses: CONFIG.gunfire) at the other army, the player included if they are red
  battle: {
    // each army's colours, a shade for each kind so they tell apart at a glance: jeeps light, 8x8s mid, tanks dark
    colors: { good: { jeep: 0x86c95e, apc: 0x3f7a2e, tank: 0x1f4418 }, evil: { jeep: 0xec7a5c, apc: 0xa8281f, tank: 0x5a120e } },
    win: 0.5,              // share of its full health a head-on win costs
    dodge: 0.5,            // chance a vehicle a hunter is after tries to get out of its way
    hunt: 90,              // m ahead a hunter looks for one to run into...
    look: 55,              // ...and a vehicle looks out for one coming at it
    tank: { hunt: 35, laneWait: { min: 7, max: 11 } }, // a tank lumbers: it hunts only this close, and waits this
                           // long (s) between lane changes of its own (hunting, dodging); none on a whim
    goodArmy: { pace: { min: 24, max: 34 }, tankPace: 0.85, overtake: { min: 2, max: 6 } },
                           // the green army advances with the player: its pace (m/s; a tank's this share of it). All of it
                           // comes up from behind the player (as CONFIG.hesitation.behind), this much (m/s) faster than the
                           // player, so as to come by
    evilBehind: 20,        // m behind the player a red vehicle goes up, on its own: past the player it is spent, and
                           // would only thin out the green army coming up from behind
    evilPace: 0.6,         // the red army goes at this share of its usual pace (as CONFIG.vehicles' speed): slower
                           // coming at the player, so there is longer to shoot at it
    goodFire: { reach: 90, behind: 30, rate: 0.6 }, // the green army's override: it fires on any red within reach
                           // (m ahead, or behind), its turret snapping straight to it, rate times as long between shots
    reach: 70,             // m a gun reaches (the player's 8x8's: CAR.cannon)
    near: 12,              // m: no closer than this does a gun fire
    guns: {                // each kind's gun: s between shots, and what its shell does (as CONFIG.cannon*)
      apc: { every: { min: 2.2, max: 3.6 }, direct: 2.8, splash: 7, damage: 45, scale: 0.8 },
      tank: { every: { min: 3, max: 4.5 }, direct: 4.5, splash: 11, damage: 63, scale: 1.4 },
    },
    turn: 2.5,             // rad/s a turret turns
    shellSpeed: 110,       // m/s an army gun's shell flies
    throwEvery: { min: 1.6, max: 3 }, // s between a jeep's packages (at an enemy within CONFIG.enemyThrowCarRange)
    shellOnPlayer: { direct: 50, splash: 20 }, // health an enemy shell costs the player: a direct hit, or near it
    pillboxEvery: 130,     // m between pillboxes, on each side
    mineFlash: { period: 0.9, on: 0.35 }, // s a landmine's light takes to flash round, and the share of it lit
    mineRise: { ahead: 120, time: 0.4 }, // a landmine lies buried (harmless, unseen) until the player is this many m
                           // from it, then pops up out of the dirt over this many s
    pillboxOut: 10,        // m off the road's edge...
    pillboxScale: 1.8,     // ...each this much bigger than its model (a bunker the size of a small house)
    // airstrikes: only a sight (render/battle.js). Every `every` s a pair of jets comes over from behind the
    // player, low (height m) and fast (speed m/s), down one side of the road, dropping a stick of bombs that
    // walk across the fields there: never nearer the road than `out` m beyond its edge, nor further than out + spread
    airstrike: { every: { min: 8, max: 16 }, height: 32, speed: 95, bombs: { min: 5, max: 8 }, out: 14, spread: 45, from: 160, to: 520 },
  },
  // a cyclist peloton (a level's "pelotons": { s, count, speed, trigger }): cyclists riding two abreast
  // along the kerb of the player's side, setting off as the player comes within trigger m. Obstacles:
  // only the player can hit them, and knocking one off with a police car watching is a bust
  peloton: {
    speed: 9,              // m/s
    trigger: 300,
    spacing: 2.6,          // m between rows
    wobble: 0.18,          // m they weave
    // a good driver gives them room: it eases out past them, room m clear, if nothing is in the way
    // (looking lookout m ahead for them); otherwise it waits behind them. Done once passRoom m past them
    room: 0.5, lookout: 45, passRoom: 4,
  },

  // scenery
  poleSpacing: 25,
  buildingSpacing: 30,
  dashLength: 3,
  dashSpacing: 9,
};
