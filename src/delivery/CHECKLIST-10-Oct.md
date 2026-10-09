# Delivery Racer: live checklist, 10-Oct (2026-10-10)

Kept by the orchestrator; updated whenever an agent commits or the owner adds something.
`[x]` committed, `[~]` in progress, `[ ]` not started, `[-]` removed or dropped. A hash is the commit;
the branch is in brackets where it is not yet on `main`. Detail is in `SCRATCHPAD-10-Oct.md`.

**Nothing below has been seen by a person in a browser, and the smoke test has not been run.**
Nothing is pushed.

Last updated: after `e9ebe12` (main), `bb4a64b` (delivery-circuits, finished), `45369f1` (worktree-delivery-batch).

## Agent 1: port from the discarded city-levels work (`main`)

- [x] Eight new mystery effects: earthquake, rewind, giant, swap sides, magnet, blackout, traffic freeze, souped up. `e05ed11`
- [x] Super cars (livery, body kit), lent by "souped up" or `?car=super-<id>`. `e05ed11`
- [x] Six-star tier: a car earned on each special level. `37eb71c`
- [x] Visible damage: dents on the player's car and scorched paint. `fda617c`
- [x] A horn for each car. `e9ebe12`
- [~] Postcards album
- [ ] Milestones wall
- [-] `gimmick-road-3` and the rest of the duplicate work: discarded on the owner's word

## Agent 2: real circuits (`delivery-circuits`, finished, not yet merged)

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

## Agent 3: menus, save data, removals (`worktree-delivery-batch`, not yet merged)

- [x] 52. Save data: cookie measured (4013 of 4096 bytes, now 2931), local storage first, export / import a save code. `5e53e1a`
- [x] 38. Level select: medals, best times, gimmick chips. `5e53e1a`
- [x] 35. Sort and filter the garage. `865d59f`
- [x] 36. Car comparison card. `865d59f`
- [x] Toll plazas and average-speed cameras removed (owner's request). `62c2bdb`
- [x] Gimmicks page: eight "City streets" cards. `45369f1`
- [~] 30. Full 1:1 replay for delivery and race levels: investigation and write-up

## Orchestrator

- [x] Scratchpads read, worktrees compared with `main`, the lists gathered. `9c0befb`
- [x] Uncommitted city-levels work stashed (`0201824`), to be dropped once agent 1's port lands
- [x] Stale Vite server on port 5199 stopped
- [ ] Merge `worktree-delivery-batch` into `main`
- [~] Merge `delivery-circuits` into `main`: tried once, held back by agent 1's uncommitted album work in the same files; next try when it commits
- [ ] Drop the stash

## Queue: starts as agents finish (three at a time)

1. Side roads cleanup: **started**, agent 4, branch `delivery-side-roads` (in the circuits worktree)
   - [ ] Fully-featured roads: lift the limits (hills with flyovers, `flow: south`, one-way flyovers, gimmicks on side roads)
   - [ ] Decor beside the main road prunes correctly
   - [ ] Fork and merge markings redrawn like real ones
   - [ ] Polygons flickering on side roads on hills
   - [ ] All of it checked in every theme
2. Amphibious cars and levels
   - [ ] Five amphibious cars, one per star level 1 to 5
   - [ ] Amphibious section in the garage
   - [ ] Water stages: road to water and back; ordinary traffic stops at the edge, amphibious traffic drives through
   - [ ] Boat traffic on the water
   - [ ] Five gimmicked levels in different themes, amphibious cars only
3. The cargo
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
