# Delivery Racer: live checklist, 10-Oct (2026-10-10)

Kept by the orchestrator; updated whenever an agent commits or the owner adds something.
`[x]` committed, `[~]` in progress, `[ ]` not started, `[-]` removed or dropped. A hash is the commit;
the branch is in brackets where it is not yet on `main`. Detail is in `SCRATCHPAD-10-Oct.md`.

**Nothing below has been seen by a person in a browser, and the smoke test has not been run.**
Nothing is pushed.

Last updated: after `6fc7b94` (main). Agents 1, 2 and 3 are finished and merged; agents 4, 5 and 6 are running.

## Agent 1: port from the discarded city-levels work (`main`, finished)

- [x] Eight new mystery effects: earthquake, rewind, giant, swap sides, magnet, blackout, traffic freeze, souped up. `e05ed11`
- [x] Super cars (livery, body kit), lent by "souped up" or `?car=super-<id>`. `e05ed11`
- [x] Six-star tier: a car earned on each special level. `37eb71c`
- [x] Visible damage: dents on the player's car and scorched paint. `fda617c`
- [x] A horn for each car. `e9ebe12`
- [x] Postcards album. `e8ccc6c`
- [x] Milestones wall. `8c0d76e`
- [x] Garage filter put right after the merges (earned cars out of "Gold stars", a "6 stars" choice once one is earned); `HANDOVER-batch.md` brought up to date. `8c5ead6`
- [ ] Never run, even headless: the album and the milestones wall (they need WebGL). Try `?album&unlock` and `?milestones&unlock`
- [ ] Never seen: the Super body kit on each model, dents, blackout, the giant, the garage with 6-star cars; no horn heard
- [-] `gimmick-road-3` and the rest of the duplicate work: discarded on the owner's word

## Agent 2: real circuits (`delivery-circuits`, finished, merged into `main` as `e358d98`)

- [x] `main` merged into the branch. `a401d13`
- [x] Headless check that all 47 levels build and every race starts; smoke test's labels know `R1..` (test not run). `b256615`
- [x] `scripts/circuit-from-osm.mjs`: OSM loop, SRTM grades, run-off measured per side. `a21b6fc`
- [x] Monza: 5800 m (real 5793), 105 run-off stretches. `a21b6fc`
- [x] Spa-Francorchamps: 7004 m (real 7004), 102 m of climb, run-off from mapped barriers. `e75d82d`
- [x] Albert Park: 5312 m (real 5278). No run-off is mapped there, so none is drawn. `b111bd7`
- [x] Clocks for Monza and Spa. `e75d82d`
- [x] Landmarks: Monza's old banking and park, Spa's forest, stream and hotel, Albert Park's lake and skyline. `856ab1e`
- [x] Clock for Albert Park (335 / 260 s, timed before it was made flat and not re-timed); handover rewritten. `bb4a64b`
- [x] Seen in headless screenshots by the agent (not kept): all three circuits load and draw
- [ ] Albert Park's gravel traps and walls: not in OpenStreetMap, need another source
- [ ] Menu pictures for the three circuits (Spa's cine shot came out blocked)
- [ ] A whole lap of any circuit watched
- [ ] Races tab opened and checked by eye (needs a browser)

## Agent 3: menus, save data, removals (`worktree-delivery-batch`, finished, merged into `main` as `6344152`)

- [x] 52. Save data: cookie measured (4013 of 4096 bytes, now 2931), local storage first, export / import a save code. `5e53e1a`
- [x] 38. Level select: medals, best times, gimmick chips. `5e53e1a`
- [x] 35. Sort and filter the garage. `865d59f`
- [x] 36. Car comparison card. `865d59f`
- [x] Toll plazas and average-speed cameras removed (owner's request). `62c2bdb`
- [x] Gimmicks page: eight "City streets" cards. `45369f1`
- [x] 30. Full 1:1 replay: investigated, written up in `REPLAY-NOTES.md`. Recommends recording inputs and a seed at a fixed step (1 to 2 KB a minute). `4a66a80`
- [x] First step built: `scripts/.replay-check.mjs`; 41 of 43 levels replay exactly from a seed. A `traffic.js` timer bug that broke it is fixed. `3731c60`
- [ ] Grand Prix and Market Town still part after 2 s (both have crossroads): not hunted
- [ ] Replay in the browser: a seeded generator for logic alone, a fixed step in `main.js`, recording and playing inputs: not started
- [ ] **That worktree is left in a mess** (see the Orchestrator section)

## Orchestrator

- [x] Scratchpads read, worktrees compared with `main`, the lists gathered. `9c0befb`
- [x] Uncommitted city-levels work stashed (`0201824`), to be dropped once agent 1's port lands
- [x] Stale Vite server on port 5199 stopped
- [x] Merge `worktree-delivery-batch` into `main`. `6344152` (four conflicts, both sides kept; the levels, save, hazards, milestones and mysteries checks all pass on the result; the save cookie is 3086 of 4096 bytes)
- [x] Tide: a wave's crest no longer jumps the last metres as it breaks (it was drawn 4 m out to sea, then at the water's edge). `8c515fd`. Not seen in a browser
- [x] "No way to reach the circuits": checked in a screenshot of `main`: the Races tab on the start screen lists R1 to R6, Monza, Spa and Albert Park among them. `?tab=races` opens the menu there. `6fc7b94`. Monza, Spa and Albert Park have no menu pictures yet
- [ ] **Owner to decide:** the worktree `.claude/worktrees/delivery-batch` has the stash applied on top of it by accident (agent 3 ran `git stash pop`): 15 conflicted files, 21 untracked. Nothing is lost (its branch is merged; the stash is intact). Cleaning it needs `git reset --hard 4a66a80` there and deleting the 21 untracked files; the agent was refused that and so the orchestrator has not done it either
- [x] Merge `delivery-circuits` into `main`. `e358d98` (one conflict, the level card in `render/menu.js`, both sides kept; `delivery-levels-check.mjs` passes on the result: 47 levels build, six races start)
- [ ] Drop the stash (the port has landed; held until the worktree above is cleaned)

## Running and queued (three at a time)

1. Side roads cleanup: **started**, agent 4, branch `delivery-side-roads` (in the circuits worktree)
   - [ ] Fully-featured roads: lift the limits (hills with flyovers, `flow: south`, one-way flyovers, gimmicks on side roads)
   - [ ] Decor beside the main road prunes correctly
   - [ ] Fork and merge markings redrawn like real ones
   - [ ] Polygons flickering on side roads on hills
   - [ ] All of it checked in every theme
2. Amphibious cars and levels: **started**, agent 5, branch `delivery-amphibious` (in the city-levels worktree)
   - [ ] Five amphibious cars, one per star level 1 to 5
   - [ ] Amphibious section in the garage
   - [ ] Water stages: road to water and back; ordinary traffic stops at the edge, amphibious traffic drives through
   - [ ] Boat traffic on the water
   - [ ] Five gimmicked levels in different themes, amphibious cars only
3. Gimmick fixes and circuit run-off: **started**, agent 6, on `main`
   - [ ] Drawbridge: not wonky, and the car climbs the raised leaf at its angle and crests it
   - [ ] Wide loads are passable
   - [ ] Burst water mains: water that does not look square
   - [ ] Run-off edges on Monza and Spa smoothed (the measured widths are noisy)
   - [ ] Sand traps as part of a shoulder, slowing cars far more
4. The cargo: **queued**, next free slot
   - [ ] Five normal things to deliver
   - [ ] Five odd things for Evil, animated, three states each
   - [ ] Shown in a corner of the screen; Evil's state follows the time left
   - [ ] New ending: car stops, camera pans to the kerb, cargo handed over, then results

## Not assigned

- [ ] 28. Liveries earned for Evil and Good clears
- [ ] 31. Endless mode
- [ ] 49. Smoke test in parallel workers
- [ ] 50. Lint, format and CI
- [ ] 51. Performance on phones
- [ ] Level clocks and menu pictures for Hong Kong, Tokyo, Mumbai, Stelvio, Christmas
- [ ] More circuits: Baku, Brands Hatch, Caesars Palace, Monaco, Donington, Sepang, Suzuka
- [ ] Level editor: full control over every feature and gimmick (itemised below)
- [ ] Gimmick Road 2's gimmicks used in real levels

## Level editor: full control over every feature and gimmick (not assigned)

Asked for by the owner on 10-Oct; investigated by reading `editor.js` (757 lines),
`delivery/editor.html` and the field list at the top of `levels.js`. Nothing built yet.

**How it is today.** A level has about 90 documented fields. The editor has real controls for 13
(`id`, `name`, `clock`, `tip`, `lanes` as one number, `theme`, `car`, `flow`, `traffic` as typed
text, `segments`, `pickups`, `obstacles`, `targets`). Everything else is typed as raw JSON into the
"Special features" box. Anything in that box with `from`/`to`, `s` or `at` is drawn as a band or a
marker and can be dragged, but its other settings are again raw JSON. Only 12 kinds have a button
that places one (`splits`, `mud`, `ice`, `bridges`, `narrows`, `frogs`, `herds`, `drifters`,
`dropBears`, `hippos`, `tractors`, `parked`). The obstacle list is a hand-written 13 kinds. The
editor knows nothing of what a field's values may be: the only checking is `Track.problems` after
the fact.

### E1. The foundation: one description of every level field

- [ ] E1.1 A schema file (`levelSchema.js`, logic side, no rendering): for every field its shape
      (flag, number, choice, stretch `from..to`, point `s`, timed `every {min,max}`, list of
      these, world-placed `x,z`), each setting's type, range, default and choices, which road it
      may be on, and a line of help. About 90 fields; the comments at the top of `levels.js` are
      the source.
- [ ] E1.2 The editor builds its forms, place-buttons, map drawing and default entries from the
      schema, in place of `FEATURE_TEMPLATES`, `EDITED` and the hand-written panels.
- [ ] E1.3 Lists the editor hard-codes come from the game instead: obstacle kinds from
      `CONFIG.obstacleKinds`, traffic kinds from `CONFIG.vehicles`, herd, drifter, machinery,
      landmark and wreckage kinds from their own tables.
- [ ] E1.4 The same schema checks a level when the game loads it, so the editor and
      `Track.problems` cannot disagree, and a new gimmick is added to the editor by adding its
      schema entry (add this step to the README's "adding content" recipe).
- [ ] E1.5 The raw JSON box stays, as an "advanced" fallback for anything the schema lacks.

### E2. Level-wide settings that have no control today

- [ ] E2.1 Road: `drive` (left / right), `lanes` as `{ north, south }` and odd counts, `median`,
      `shoulder`, `shoulderTimer`, `speedLimit`, `laps`.
- [ ] E2.2 Traffic: the mix as a table with sliders in place of typed text; `trafficCount`,
      `oncomingCount`, `trafficSpeed`, `drivers` (evil, happy, angry), `hesitation`.
- [ ] E2.3 Timed events, each a switch with a min and max: `emergencies`, `processions`,
      `convoys` (size, kind), `railway`.
- [ ] E2.4 Mode switches: `alwaysGood`, `noPackages`, `understeer`, `wallDamage`, `nudge`,
      `helicopter`, `battle`, `pillboxes`.
- [ ] E2.5 Race and rivals: `grid` (count, kind, gap, pace, from), `rival`, `rivals` (name, car,
      colours, marker).
- [ ] E2.6 Weather and look, where a theme allows it: `rain`, `snow`, `festive`, `elevated`.

### E3. The road itself

- [ ] E3.1 Segments: draw and drag the road on the map (handles for a bend's length and angle),
      beside the table; show the gradient profile as a strip under the map.
- [ ] E3.2 Side roads (`exits`): place the fork and merge by clicking, drag them, and edit `out`,
      the side road's own `segments`, `lanes`, widenings and `flyovers` in a form. Today only
      "oncoming from here" has a tool.
- [ ] E3.3 Crossroads (`junctions`): place, with `turn`, `forward`, `turnOff`.
- [ ] E3.4 Stretch kinds that change the road, with forms: `narrows`, `splits`, `bridges`,
      `tunnels`, `runoff`, `stands`, `runway`, `reversible`, `quietZones`, `trafficZones`, `zones`
      (scenery, ground, sky, sea).
- [ ] E3.5 Circuits: closing a lapped road (show the gap and heading error, offer to close it),
      and run-off and stands per side.

### E4. Gimmicks: a place-button and a form for each (most have neither)

- [ ] E4.1 Stretch gimmicks: `fog`, `gunfire`, `asteroidFields`, `storm`, `migration`,
      `elephants`, `landmines`, `trolleys`, `stampedes`, `rockfall`, `quarries`, `tide` (with its
      waves), plus full forms for the ten that only have a button.
- [ ] E4.2 Point gimmicks: `cameras`, `crossings`, `stopGo`, `potholes`, `potties`, `machinery`,
      `siteWorks`, `waterMains`, `parades`, `roadblocks`, `iceCreamStops`, `schoolCrossings`,
      `balloons`, `drawbridges`, `wideLoads`, `marathons`, `pelotons`, `wreckage`, `tower`,
      `shoulderRows`, `parkedPlanes`.
- [ ] E4.3 Gimmicks on a side road (`{ road: 'side', exit: n }`): the editor leaves these off the
      map entirely today. Draw them, place them and drag them along the side road.
- [ ] E4.4 Lane pickers that know the road at that spot (a narrowed stretch, an exit lane, a side
      road's own lanes), and lane ranges (`lanes: [first, last]`) for wide loads, balloons and
      wreckage.
- [ ] E4.5 Triggers: for anything with `trigger` or `flipAt`, show on the map where the player
      sets it off as well as where it happens.
- [ ] E4.6 World-placed things (`landmarks`: `x, z, r, rot`): place and turn them on the map
      beside the road, not along it.
- [ ] E4.7 Rules shown while editing, not after: straight road only (crossings, stop / go,
      drawbridges), level road only (bridges), two-way only (stop / go, reversible), what cannot be
      combined with exits. The side roads cleanup in the queue will change some of these.

### E5. Keeping a level whole while it is edited

- [ ] E5.1 Changing a segment's length moves or stretches everything after it (today "a change to
      the road can leave them out of place").
- [ ] E5.2 Undo and redo.
- [ ] E5.3 Copy, paste and duplicate; select and move several things at once.
- [ ] E5.4 Problems listed under the map link to the thing that causes them.
- [ ] E5.5 Autosave of the level being edited, and Load a `.json` file (today only the built-in
      levels can be opened, and only Download saves).

### E6. Seeing and proving it

- [ ] E6.1 The 3D view updates as you edit, and "Play from here" starts a run at the spot under
      the cursor (`?at=`).
- [ ] E6.2 A "Work out the clock" button, doing what `scripts/level-clocks.mjs` does, in the page.
- [ ] E6.3 Filters on the map (show only one kind, hide scenery bands) and a list of everything in
      the level to pick from.
- [ ] E6.4 A headless check that the schema covers every field used by every level in `levels/`,
      and that each level passes through the editor's load and save unchanged.

### E7. To come from today's queue (add their fields once they exist)

- [ ] E7.1 Water stages, boat traffic and "amphibious only" for the amphibious levels.
- [ ] E7.2 The cargo a level carries, for each side.
- [ ] E7.3 Whatever the side roads cleanup adds or lifts.

Order that makes sense: E1 first (everything else is built on it), then E4.1 to E4.3 and E2 (they
fall out of the schema almost for free), then E3.2 and E5.1, then the rest. Removed today, so not
listed: tolls and average-speed cameras.

## New themes (ideas, not assigned)

Thought up by the orchestrator on 10-Oct at the owner's request; none is built. The game has 25
themes already: city and night city, suburb, hood, farm, beach, coast, safari, snow (alpine),
construction, airport, Singapore by day and night, Canberra, Hong Kong, Tokyo, Mumbai, Christmas,
Bathurst and Panorama, Montreal, hell, battlefield, sea and space, plus Monza, Spa and Albert Park.
Each idea below is a look the game does not have, with the gimmick that would make it more than
new scenery. "Reuses" is what is already in the engine. A star marks the five that would suit the
amphibious levels in the queue.

Pick the most unique theme from what is already in the game first

**Order to build in, by the owner's rule above** (furthest from anything the game has, first;
orchestrator's ranking):

1. T14 Toy room: nothing in the game changes scale or leaves the outdoors.
2. T15 Underwater tunnel: no theme is under water or looks out through glass.
3. T18 Moon base: the only one that changes the physics (low gravity).
4. T13 Film studio backlot: several fake worlds in one street.
5. T1 Venice: the first theme where the road itself is water. Amphibious.
6. T4 Ice road: a road with no land under it, that breaks. Amphibious.
7. T12 Theme park: rides sharing the road.
8. T7 Volcano island: the level loses lanes for good as it goes.
9. T11 Container port: walls and hazards that are machines.
10. T3 Fjord. Amphibious. (Near snow and coast in look; the ferry slip is what is new.)
11. T2 Mangrove delta. Amphibious. (Near safari's river and Mumbai's rain.)
12. T16 Old Wild West. (Near safari's dirt road and the railway.)
13. T9 Favela hillside. (Near Stelvio's hairpins and the hood.)
14. T17 Rice terraces. (Near farm and the terrain themes.)
15. T6 Desert canyon. (Near safari and Bathurst's rock.)
16. T5 Flooded city. Amphibious. (The city theme, wet.)
17. T10 Night market. (Near Hong Kong and Tokyo.)
18. T8 Autumn countryside. (The farm theme in other colours.)

- [ ] T1. **Venice** ★: the road is a quay between palazzi, humped bridges, striped mooring poles,
      and the canal itself for the water stretches. Gimmick: acqua alta, the square floods on a
      timer and the quay becomes water. Boat traffic: gondolas (slow), vaporetti (the bus), water
      taxis. Reuses: `tide.js`, bridges, the sea's water.
- [ ] T2. **Mangrove delta** ★: a causeway on stilts through mangroves, stilt houses, a floating
      market where the road ends and the river begins. Gimmick: market boats drift across the
      channel as herds do; crocodiles in place of hippos. Boat traffic: longtails, rice barges.
      Reuses: `hippos.js`, herds, rain.
- [ ] T3. **Fjord** ★: a road cut into a cliff over dark water, waterfalls, red boathouses, then
      the ferry slip where the road simply goes into the fjord and comes out the other side.
      Gimmick: the ferry crossing as a moving platform, or swim it; icebergs calving. Reuses:
      terrain, tunnels, rockfall, snow.
- [ ] T4. **Ice road** ★: a ploughed road across a frozen lake, snowbanks for kerbs, fishing huts,
      pressure ridges. Gimmick: the ice has a weight limit; cracks spread behind heavy vehicles,
      and thin stretches are open water that only an amphibious car crosses. Aurora at night.
      Reuses: ice, snow, the truck kinds' `mass`.
- [ ] T5. **Flooded city** ★: the city theme after the river broke its banks: water to the door
      handles in the dips, cars abandoned, sandbags, people on roofs. Gimmick: the water level
      rises through the run, so the dry stretches shrink. Boat traffic: rescue boats, a floating
      bus. Reuses: city scenery, water mains, the Mumbai rain.
- [ ] T6. **Desert canyon**: red rock walls, mesas, a dry riverbed for a shoulder, tumbleweed.
      Gimmick: a dust storm that closes visibility like fog but blows cars sideways; a flash flood
      down the wash. Reuses: fog, storm, terrain, rockfall.
- [ ] T7. **Volcano island**: black sand, palms, steam vents, a lava field across the old road.
      Gimmick: lava bombs landing on the road and cooling into obstacles; lava flows that close a
      lane for good partway through the run. Reuses: quarry blasts and boulders, hell's palette.
- [ ] T8. **Autumn countryside**: orange and red forest, stone walls, covered bridges, a village
      with a harvest fair. Gimmick: wet leaves in the bends (slick only off the racing line),
      a hay-cart convoy, a low sun straight ahead on one stretch. Reuses: farm, ice, convoys.
- [ ] T9. **Favela hillside**: a steep switchback road between stacked houses in every colour,
      stairs, cable cars overhead, a football pitch on a roof. Gimmick: balls bouncing down the
      stairs onto the road, motorbike taxis that filter between lanes. Reuses: Stelvio's
      hairpins, drifters, the rickshaw's agility.
- [ ] T10. **Night market**: a street closed down to two lanes by stalls, lanterns, steam,
      neon signs in the rain. Gimmick: the stalls creep outward as the evening goes on, and
      pedestrians cross anywhere. Reuses: narrows, parades, the lit themes, school crossing's
      walkers.
- [ ] T11. **Container port**: stacks of containers for walls, gantry cranes, straddle carriers,
      rail lines in the road. Gimmick: cranes lower containers into lanes on a rhythm; straddle
      carriers drive over you if you are low enough. Reuses: machinery, level crossings, falling
      cargo, potties' patterns.
- [ ] T12. **Theme park**: the road runs through the park: a rollercoaster looping over it,
      a Ferris wheel, a log flume that crosses as a water stretch, a parade route. Gimmick: the
      coaster's train shares the road for a stretch; bumper cars as traffic. Reuses: parades,
      bullet train, balloons.
- [ ] T13. **Film studio backlot**: one street that is a Western town, then a spaceship set, then
      a painted sky on a flat, with cameras on cranes and a director's chair. Gimmick: stunt
      cars that crash on cue (scripted wreckage) and a "cut!" that freezes traffic. Reuses:
      zones (a look per stretch), wreckage, the traffic-freeze mystery.
- [ ] T14. **Toy room**: the whole level at toy scale: a road of plastic track across a carpet,
      building blocks, a train set, a sleeping cat. Gimmick: marbles rolling down the track, the
      cat's paw as a hazard, a ramp-and-loop jump. Reuses: drifters, drawbridge jump, the models
      are already toy-like.
- [ ] T15. **Underwater tunnel**: a glass tube on the sea bed: whales and shoals outside, a
      leaking stretch, an air-lock at each end. Gimmick: leaks that flood a lane until a pump
      catches up; a section with the lights out. Reuses: tunnels, water mains, blackout.
- [ ] T16. **Old Wild West**: a dirt main street, saloon, water tower, a steam railway beside the
      road, cactus. Gimmick: a train robbery (riders alongside the train, across the road), a
      cattle drive, a duel at noon that stops the traffic. Reuses: railway, stampedes, gunfire,
      the safari's unmarked dirt road.
- [ ] T17. **Rice terraces**: a narrow road stepping down green terraces, water buffalo, a
      temple gate over the road, kites. Gimmick: the terraces flood in turn, spilling across the
      road as moving slick patches; ducks crossing in a line. Reuses: terrain, water mains'
      slicks, herds.
- [ ] T18. **Moon base**: grey regolith, domes, a low black sky with the Earth in it, a road of
      compacted dust. Gimmick: low gravity: every bump is a long jump and braking takes twice as
      far. Different from the space theme, which has no ground. Reuses: space's sky, potholes,
      the jump physics.

The five starred ones go with the amphibious levels in the queue; taken in the order above that is
Venice, ice road, fjord, mangrove delta, flooded city. T8 and T10 are the cheapest to build, being
mostly new colours on existing scenery, which is also why they are last.

## New gimmicks (ideas, not assigned)

Thought up by the orchestrator on 10-Oct at the owner's request, with the owner's rule: **not another
moving thing on the road that explodes when hit.** Each one below changes a rule of the game for a
stretch: what the road is, what the player can see or know, how the car answers, what the traffic
does, or what the run is for. None is built.

**The owner's rules for a gimmick** (10-Oct, after cutting this list from 36 to 11). Not wanted:

1. Having to stop the car, or wait.
2. No counterplay: do as told or get busted.
3. Variants of delivering fast, or to several places: they play exactly as a regular level does.
4. Another moving thing on the road that explodes when hit.

What decides it is counterplay, in the owner's words: "Roundabout and Fuel has counterplay - you can
risk it or not. Red lights, missing the ferry etc has zero counterplay." So stopping is not the
fault in itself: a stop the player can choose to risk skipping (dive into the gap on the roundabout,
run past the pump and hope the tank lasts) is a decision; a stop the game simply imposes (a red
light, a ferry that has gone) is not. Every gimmick should give the player a gamble to take or
leave.

### The road itself changes

- [ ] G3. **Roundabout**: the road goes round an island; traffic already on it has the way. Pick
      a gap or wait. The exit taken can be the short way or the long way round.
- [ ] G4. **Fork with a choice**: the road splits into two real routes that rejoin: a short one
      full of traffic and a long clear one, or a dirt cut-through. Signed ahead.

### What the player can see or know

- [ ] G10. **Whiteout or sandstorm with marker posts**: nothing visible but a line of reflector
      posts and the tail-lights ahead. Follow a truck through or go by the posts.
- [ ] G11. **Power cut**: the street lights, traffic lights and signs go dark over a district;
      junctions become free-for-alls and only headlights show the road.

### How the car answers

- [ ] G16. **Crosswind**: a steady push sideways on an exposed stretch (a viaduct, a dam), with
      gusts announced by a windsock. Tall cars are pushed more; passing a truck gives shelter,
      then a shove as you clear it.
- [ ] G18. **Fuel**: a long level where the tank will not make it. Petrol stations are on the
      shoulder: pull in and stop (time lost) or run dry and coast.
- [ ] G20. **Fragile cargo**: on this level the package breaks with bumps, kerbs and hard
      braking, not only with crashes. A meter in the corner; the tip scales with what is left.
      Goes with the cargo models in the queue.
- [ ] G22. **Tow**: the car starts the level towing something (a caravan, a boat on a trailer,
      a broken-down friend). It swings wide in bends and takes two lanes to change lane.

### What the traffic does

- [ ] G24. **Zip merge**: two queues merge into one. Take turns and it flows; push in and the
      drivers behind get angry, close the gap, and the social standing drops.
- [ ] G25. **Rush hour wave**: stop-start traffic with waves of braking moving backwards through
      it. Reading the wave and arriving as it opens is faster than racing to the back of it.
- [ ] G26. **School run**: every car on a stretch is trying to stop at the same kerb. They
      double-park, pull out without looking and reverse.

### Second batch (10-Oct, after the owner's cut): each built on a gimmick the game already has

Written to the counterplay rule: every one is a gamble the player can take or leave, and each
says what the gamble is. All are things that happen on real roads, as the eleven kept ones are.

- [ ] H1. **Crest jumps**: a street of steep crests, San Francisco style. Take one fast and the
      car flies: no steering in the air, and it lands on whatever is over the top. *Gamble:* lift
      and see, or fly blind and gain seconds. *Builds on:* the drawbridge's jump, hills.
- [ ] H2. **Ramp over the jam**: a car transporter with its ramps down, or a roadworks ramp, sits
      in one lane at the back of a queue. Hit it fast enough and the car clears the queue; too
      slow and it lands in it. *Gamble:* the jump or the slow way round. *Builds on:* drawbridge
      jump, rubbernecking queues, convoys.
- [ ] H3. **Tram lane**: the median's rails are an empty lane, and a tram is coming along them
      somewhere. Fast and clear, slippery in the rain, and the tram does not swerve. *Gamble:*
      how long to stay on the rails. *Builds on:* the railway median, Hong Kong's trams, ice.
- [ ] H4. **Low bridge**: a height limit ahead, signed, with the tall-vehicle route going the
      long way round. A low car goes straight under; a van or the bus must take the detour, or
      lose its roof rack, lights and some health trying. *Gamble:* made in the garage, and again
      at the sign. *Builds on:* side roads, tunnels, car heights already in `cars.js`.
- [ ] H5. **Ford**: the road dips through a river, with the bridge a little further round. Depth
      posts show how deep it is today (it varies down the level). A car that wades well goes
      through; one that does not is slowed to a crawl or stalls. *Gamble:* read the posts and
      know the car. *Builds on:* the tide's wading (`crossing` in `cars.js`), side roads.
- [ ] H6. **Flooded underpass**: the same, in town in the rain: the main road dips under a
      railway and fills, and the slip road goes up and over. The water rises through the run.
      *Gamble:* early on it is passable by anything; later only by some. *Builds on:* tunnels,
      Mumbai's rain, burst water mains.
- [ ] H7. **Hairpin cut**: a rough track straight down the hill between two legs of a hairpin.
      It saves the whole bend, shakes the car, costs health, and rejoins across the traffic.
      *Gamble:* seconds against damage and a blind rejoin. *Builds on:* Stelvio's hairpins, mud,
      side roads.
- [ ] H8. **Washboard dirt**: a corrugated dirt road. Slowly, it shakes the grip away; above a
      certain speed the car skims the tops and it goes smooth. *Gamble:* commit to the speed
      before the bend, or crawl. *Builds on:* potholes, mud, the safari's dirt road.
- [ ] H9. **Ruts**: tractors have left deep ruts in the mud. In a rut the car runs straight and
      fast; changing lane means climbing out, with a jolt and a wobble. *Gamble:* pick the rut
      early and live with it. *Builds on:* mud, tractors.
- [ ] H10. **Black ice in the shade**: ice lies only where a building, a cutting or the trees
      shade the road, so it can be read from the shadows before reaching it. *Gamble:* brake
      before the shadow, or stay in the sunny lane with the traffic. *Builds on:* ice, the
      scenery already casting the shade.
- [ ] H11. **Truck spray**: in rain every lorry drags a cloud of spray: nothing can be seen
      behind one. *Gamble:* hang back and see, or overtake blind. *Builds on:* rain, fog.
- [ ] H12. **Low sun**: one stretch runs straight into the sun and the screen washes out,
      except in the shadow of a lorry, a bridge or a row of trees. *Gamble:* tuck in behind
      something slow to see, or run in the glare. *Builds on:* fog, tunnels' light change.
- [ ] H13. **Dust trail**: on dirt every car throws a plume that drifts with the wind.
      Following in it is blind; driving a lane upwind of it is clear. *Gamble:* the clear lane
      may be the oncoming one. *Builds on:* fog, crosswind (G16), the safari.
- [ ] H14. **Rockfall gallery**: the road forks into a covered gallery, narrow with no
      shoulder and a queue in it, and the open road under the loose face. *Gamble:* slow and
      safe, or fast under the rocks. *Builds on:* rockfall, tunnels, the fork (G4).
- [ ] H15. **Thin ice shortcut**: the road goes round the lake; tyre tracks go straight across
      it. Light cars cross; heavy ones crack it, and a crack that catches the car is a cold
      swim. Amphibious cars do not care. *Gamble:* the car's weight against the distance saved.
      *Builds on:* ice, `mass` in `cars.js`, the water stages being built, theme T4.
- [ ] H16. **Fresh tarmac**: a coned-off lane of new tar beside the roadworks queue. It is
      empty and it is sticky: the longer the car stays on it the slower it gets, and the tyres
      stay slow for a while after. *Gamble:* short hops along it. *Builds on:* stop / go
      roadworks, mud, narrows.
- [ ] H17. **Climbing lane**: a hill with a short extra lane for overtaking the lorries, and a
      sign counting down to where it ends. *Gamble:* one more lorry before the lane runs out.
      *Builds on:* narrows, convoys, hills.
- [ ] H18. **Single track with passing places**: one lane for both ways, with a marked bay
      every so often. Meeting someone between bays, somebody goes onto the verge. *Gamble:* duck
      into this bay or run for the next. *Builds on:* narrows, quiet zones, the shoulder timer.
- [ ] H19. **Speed cushions**: a suburban street of humps with gaps between them. Straddle a
      gap on exactly the right line and the car does not feel it; clip one at speed and it
      jumps and takes a knock. *Gamble:* precision at speed against slowing. *Builds on:*
      potholes, the jump.
- [ ] H20. **Blast window**: the quarry's siren goes and the road under the face is about to
      be showered; the haul road round the back is longer and rough. *Gamble:* sprint under
      before it goes, or take the haul road. *Builds on:* quarry blasts, side roads.

The orchestrator's pick of these: H1 crest jumps and H2 the ramp (the jump is already in the
engine and is the most fun thing the drawbridge does), H4 low bridge and H5 ford (they make the
choice of car matter on the road, which little does today), H8 washboard (it rewards going
faster, which nothing else does).
