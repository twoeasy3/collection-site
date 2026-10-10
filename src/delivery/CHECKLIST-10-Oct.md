# Delivery Racer: live checklist, 10-Oct (2026-10-10)

Kept by the orchestrator; updated whenever an agent commits or the owner adds something.
`[x]` committed, `[~]` in progress, `[ ]` not started, `[-]` removed or dropped. A hash is the commit;
the branch is in brackets where it is not yet on `main`. Detail is in `SCRATCHPAD-10-Oct.md`.

**Nothing below has been seen by a person in a browser, and the smoke test has not been run.**
**Pushed on the owner's word on 10-Oct: `main` up to `8a0bd79` is on the remote and deploying** (the production build of that commit passed; the smoke test was not run). Later commits are local until pushed.

**Pushed again on the owner's word ("Push the new menu please"): `main` at `b132c15` is on the remote and deploying.** The production build passed; 23 of 25 headless checks pass; the smoke test was not run. Known when pushed: the police pursuit misbehaves (below).

Last updated: after `b132c15` (main, pushed). 60 levels on the menu. Running: agent 19 (the pursuit regression, then road gimmicks from H17), 24 (the UFO check, the save cookie's cap, the editor's leftovers). Everything else is merged.

**Two checks fail on `main` right now:**
- `.pursuit-check.mjs` (3 failures: the chase no longer gets past and away, and the player is hit). It passed before the road gimmicks were merged; agent 19 is finding which of its gimmicks did it. **This is live.**
- `.ufo-check.mjs` dies with a Node error before any check runs, as it has all day. Agent 24 has it.

**Merged in the last round:**
- Theme levels D (agent 26): **41 High Noon** (the Wild West: false-front towns, a railway, mesas), **42 Favela Heights** (a hillside of stacked houses, hairpins, a cable car), **43 Emerald Steps** (rice terraces, palms, gates). 35 to 37 cash pickups, 13 to 15 rows each. Seen as their menu pictures. Not played.
- Known problems, second lot (`172d923`): the Gimmicks page's console error (the bullet train's card); HANDOVER and README up to date; a menu picture for every level (seven had none); cargo dealt so that all 50 items turn up (33 levels changed cargo; none that names its own).
- The save cookie was 3882 of 4096 bytes with 60 levels. **Fixed, merged as `d58ce08`, NOT yet pushed:** local storage holds the whole save with no cap; the cookie keeps only money, levels open, cars, the car in use, tank pieces and switches (956 bytes now; 100 levels and 80 cars checked). An old cookie holding everything is still read. Consequence: if a browser's local storage is lost, best times (so medals and earned 6-star cars) and milestone counters go with it; what is open, the bank and the cars come back from the cookie. Headless only: not tried in a browser.
- The UFO check runs again (`3a7b1da`): the check was at fault, not the game.

**Merged since the last update:**
- Known problems, first ten commits (`4b7421e`): audit C4 (the editor never writes a level's values into the page as HTML: the script injection is closed), C6 (a pasted save code keeps only a save's fields), C2 (a visit with an address switch, plain `?autostart` included, never writes the save), C5 (a bad edited level is refused with a reason; one that makes the track builder loop for ever still hangs), C3 (a traffic slot is wiped when dealt out), pickups and obstacles allowed on the main road's shoulders (the check was wrong, the docs right), duplicate config keys removed. **Replay: 53 of 53 levels replay exactly from a seed (it was 31 of 53).** Behaviour changes from the duplicate keys: traffic honks less (70 m, 5 s apart, as first written), and the ice-cream van is its own model with its tune again (a later duplicate had made it a pink delivery van and silenced it).
- Road gimmicks, second lot (`29e78ba`): H9 ruts (Farm, Outback Express), H16 fresh tarmac (Hong Kong, Tokyo); the drawbridge's river takes the theme's colour (lava on Cinder Island, lagoon green on Venice, a blue ribbon on the toy carpet); rocks and asteroids put out as plain obstacles or drifters were built with no size (an error in the browser on Cinder Island): fixed.

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

1. Side roads cleanup: **finished**, agent 4, merged into `main` as `a22cab5` (no conflicts; levels, hazards and save checks pass)
   - [x] Polygons flickering on side roads on hills: the side road sat up to 4 cm (18 cm at worst) below the expressway's ground; now exactly level with it, slope capped at 6%. `3a2fefe`. Checked by numbers and stills, not by watching it move
   - [x] Fork and merge markings: lane-drop dashes, a nose where the solid lines meet, chevrons in the wedge, edge lines carried onto the side road. Side roads now part from the expressway by 14 m. `249424f`
   - [x] Decor beside the main road prunes by real distance to every other road, in every theme. `7ae100d`
   - [x] More allowed: hills with flyovers, exits on an all-oncoming level, pickups and obstacles in any side-road lane, six more gimmick kinds, a full left shoulder. `c01a8ee`
   - [~] Every theme: shot in 25 of 28, about a third of the pictures opened. Not looked at: singaporeNight, canberra, suburb, battlefield, bathurst, panorama, montreal, sea, night, hongkong, christmas, monza
   - [ ] Still not allowed: flyovers on a one-way level; 17 gimmick kinds on a side road (ice, mud, fog, roadblocks, tunnels and others: now reported when the level loads)
   - [ ] Scenery along a side road's own roadside in themes other than the city
2. Amphibious cars and levels: **finished**, agent 5, merged into `main` as `2f30028` (no conflicts into main; levels, water, save, mysteries, earned and bundle checks pass; the save cookie is 3382 of 4096 bytes)
   - [x] Five amphibious cars, one per star level: Sailing Herald, Float Van, Toybota, Dampervan, Nissank. `43e77e2`
   - [x] Amphibious section in the garage, open from the start, with a Show: Amphibious filter. `43e77e2`
   - [x] Water stages (`water: [{ from, to, current? }]`): driven into at speed, 74% top speed afloat; traffic that cannot float queues on the shoulder, leaving every lane open; amphibious traffic drives through. `e459b4c`
   - [x] Boat traffic: dinghy, barge, ferry, pedal boat; their wakes push the car sideways. `e459b4c`
   - [x] Amphibious-only levels: refused without an amphibious car (the garage opens at the cheapest). `0ea67a1`
   - [x] Five levels, A1 to A5: Slipway Beach, Harbour Lights, High Water (a new `flooded` theme), Hippo Ford, Fjord Crossing. `75f5769`, `3bf3f0e`
   - [x] Gimmicks cards, menu pictures, README and HANDOVER. `3e9af79`
   - [x] Super liveries for the five (they were missing and failed the mysteries check after the merge). `d0c4ec1`
   - [ ] Never played by hand: afloat handling, wakes and currents, prices, clocks
   - [ ] The slipway is faked (water 0.32 m over a flat road); boats tie up at the far bank and do not turn back
   - [ ] For the owner to overrule: section open from the start, A1-A5 numbering, prices, sea-green stars, 74% afloat
3. Gimmick fixes and circuit run-off: **finished**, agent 6, on `main` (levels, hazards and gravel checks pass)
$1. Seen in a still: the car on the raised leaf. A "JUMP 70+" board stands before it; every garage car clears it at top speed. A car that rolls back waits at the foot until the leaves come down (the cost of a miss: owner may overrule)
$1. Seen in a still: the load over on the shoulder with its arrows lit. On an unlucky phase neither side is open on arrival at one fixed speed
   - [x] Burst water mains: irregular, soft-edged pools and a fountain. `39ac540`. Not yet seen by the orchestrator
$1. Largest step between neighbouring widths: Monza 47.5 m to 0, Spa 27.5 m to 0. The stretch count went up (105 to 230, 95 to 190), each now a taper. Seen in a still of Spa
   - [x] Gravel traps (`gravel: [{ from, to, side, inner?, outer? }]`): heavy drag, 35% steering, a car that stops is beached for 1.6 s; from 144 km/h one second in gravel leaves 43 km/h. On Monza and Spa from the map's sand and gravel; none on Albert Park (none mapped). `70ef5dc`. Seen in a still of Spa; a car in the gravel never seen, the sound never heard
   - [x] Found on the way: a negative first frame after `?ff` threw the camera off the road in screenshots; fixed in `main.js`. `39ac540`
4. The cargo: **finished**, agent 7, merged into `main` as `558f5c4` (no conflicts into main; levels, cargo, save and bundle checks pass)
   - [x] Five normal things: tower of pizzas, wedding cake, goldfish, gift-wrapped cactus, grandfather clock. `9b2aebb`
   - [x] Five odd things for Evil, animated, three states each: ticking parcel, porcupine, crate of bees, cursed doll, specimen jar. `9b2aebb`
   - [x] Shown in a corner of the screen; Evil's state follows the time left (agitated at 50% of the clock, furious at 20%). `cd3b18d`
   - [x] New ending: the car pulls in at the kerb, the camera pans round, the cargo is set down, then the results (4.9 s, skippable; results fixed at the line). `8255e1f`, `cd3b18d`
   - [x] A Cargo page showing all ten, linked from the menu and the Gimmicks page. `9b2aebb`, `9d018de`
   - [ ] Never seen moving or heard; not on a real phone; the kerb camera looked at on six levels only
   - [ ] For the owner to overrule: a late delivery also gets the ending; the thresholds; the length; the HUD behind the results reads "GHOST"
   - [ ] `.replay-check` fails on Expressway (runs part at 7 s); the agent says it fails the same without its work
   - [ ] `.hazards-check` sometimes throws when run straight after other checks, and passes by itself

## Round 2: running and queued (three at a time)

The owner's standing instruction (10-Oct): assign the unassigned lists, and give any new task to
whichever agent is free, without asking first.

5. Level editor, full control: **finished**, agent 8, merged into `main` as `5fe99da` (no conflicts). A schema of 99 level fields (`levelSchema.js`); the editor builds every form, place-button and its map from it; all level files load and save through it unchanged. Not started: E1.4 (the game validating with the schema), E6.2 (clock button). Partly: E2.6, E3.5, E5.3, E6.1. Nothing clicked by hand. The item ticks are in the editor section below
6. Police pursuit: **redone and merged** into `main` as `65478c1` (agent 12; `f2404a4`, `cab1580`, `dcaa98c`, `b64201e`). Now 152 lines of logic where it was 402. The owner's verdict on the first version: "It is supposed to just be a simple traffic event." So: a getaway car and the interceptor (a model of its own) come through from behind like an ambulance does and drive on; no endings, rewards or gambles. The bank robber wanting a lift (P2, the orchestrator's idea, never asked for) is removed. The other road characters (P3 to P13) are NOT being built. First version, stopped at 09:21: `881f429`, `ee6dde8`, `bcd6b25`
7. Road gimmicks: **stopped at 09:21**, agent 10, on `main`. Unfinished ramp-over-the-jam work is sitting uncommitted in the main checkout (17 files). Nobody is on it. Done so far: G16 crosswinds (`1d48924`: on Grand Pacific, Hurricane, Tokyo) and H1 crest jumps (`9d7711b`: on Rival Run, Mystery Meadows), both on the hidden Gimmick Road 3. It re-timed two clocks by a lot; told to put them back. A hidden Gimmick Road 3, then G16 crosswind, H1 crest jumps, H2 ramp over the jam, H8 washboard, H4 low bridge, H5 ford, then the rest of the kept G and H lists; each also put on two or three real levels
8. New themes: **stopped at 09:21**, agent 11, branch `delivery-themes` (in the city-levels worktree). The toy room's look is committed (`14e3c56`); its gimmick is uncommitted in that worktree. Nobody is on it. In the owner's order (most unlike the game first): T14 toy room, T15 underwater tunnel, T18 moon base, T13 film studio backlot, T1 Venice, T4 ice road, then on down the ranking; a level for each
9. Queued after that, as slots free: menu pictures and clocks (the three circuits, the five themed levels, Super and 6-star cars); 28 liveries; 31 endless mode; the replay system's next step (`REPLAY-NOTES.md`); 51 performance on phones; 49 and 50 (test speed, lint and CI)

- [x] Super cars screenshotted: all 35, Good and Evil (70 pictures, two contact sheets, sent to the owner). Every one has its livery, stripe and kit. To look at closer: the Super of the Super Lowrider (caught mid-hop, parts apart), the Dampervan (too big for the frame), the Tow Truck's wing beside its crane
- [x] Super cars: the stripe stops at every screen and window; the kit rides the body's animation; an underglow under every Super car; vans and off-roaders get a wing, a bull bar, a snorkel and roof lamps. `136c0d5`, `35e0ac3`
- [x] Menu pictures of the 35 Super cars, Good and Evil, in `carshots/` as `super-<id>-good.jpg` / `-evil.jpg`. `8d7ab8f`. Nothing shows them yet
- [x] A car picked in the garage takes the side whose livery is showing; the garage opens in the livery of the side being played. `8a0bd79`. Seen in one screenshot ("Drive it as Evil"); not clicked

## Round 3: clearing the list (owner, 10-Oct: "Delegate agents to properly clear the list")

Three agents at a time; the next item starts as each one finishes.

- [x] **Stelvio and Market Town**: agent 14, merged into `main` as `f9303ee` (`2050f4e`, `1d787fa`, `c513726`, `ff83536`); levels, schema, bundle, hazards and HUD checks pass. Seen: Stelvio's hairpin and Market Town's crossroads, before and after, sent to the owner
  - [x] Boulders: a rock's waiting place and fall were measured from the road's plane, not the land, so it hung in the sky. Now each waits on the land and lands a little sunk, on every level
  - [x] Markings: a crossroads' arms were not counted as roads, so houses and lawns lay over the cross road and hid its lines. Arms are roads now, for every theme; the suburb gets pavements, lots and trees along side roads and cross roads
  - [x] Stelvio: stone walls and red and white bands round the hairpins, snow poles, a summit hut and sign, a crosswind over the top, 20 cash pickups in 8 rows
  - [x] Market Town: a calmer side road, market umbrellas, a burst main, 25 cash pickups in 10 rows
  - [ ] Still wrong: the face between Stelvio's legs is a ramp on a coarse grid; no valley view; Market Town's railway is a flat band; the cross road has no houses; a pickup on a shoulder of the main road fails the level check (so rows are two across at most on a two-lane road)
- [x] Police pursuit redone as a plain traffic event: a getaway car and its interceptor come through from behind and drive on; nothing gained or lost by the player. Merged, `65478c1`; levels, schema, pursuit and hazards checks pass. Seen as two small stills and its Gimmicks card. For the owner: the pair now pass at 130% of the player's top speed; the getaway car is no longer an "evil" car; the helicopter was removed
- [x] Car ideas lot: all 30 models, the table and the garage's "Car ideas" tab, on `main` (`18125cb`, `9ce0665`, `657beea`, `303bdb7`). Contact sheet sent to the owner. Weakest: Split-Window Coupe, Midnight Coupe, Two-Stroke Saloon. Nothing clicked by hand
- [x] Twenty more Good cargo items (C1 to C20): agent 15, merged into `main` (`cc34343`, `533d5a2`); cargo, bundle and levels checks pass; seen on the Cargo page's contact sheet, sent to the owner. Weakest: sushi boat, tea set, globe. Nothing seen moving
- [x] Twenty more Evil cargo items (C21 to C40), three states each: agent 16, merged into `main` as `6fc32e2` (`c8ba744`, `269134e`; two small conflicts with the Good branch, both sides kept); cargo, bundle and levels checks pass; 50 items in all now. Seen on two contact sheets, sent to the owner. Weakest: the teddy bear's middle state, the cannonball's first two states, the reactor's last, the skunk asleep. Nothing seen moving
- [ ] Cargo picked by hand for more levels (the pairs suggested under "More cargo"): not done; every level gets one by its place on the menu
- [x] Menu UI rework (M1 to M3): agent 18, merged into `main` as `59ffd04` (`1eb9ece`, `f6fa1bc`, `0c54493`, `6ffb4fd`); bundle, levels, schema, descriptions, road-card and HUD checks pass. One screen with no scrolling: a level stage, a strip, the car and side beside it, one START; a description of every level for each side (in each level's JSON); "What's on this road" opens a card of the level's gimmicks, pickups and traffic with their 3D models. The orchestrator added the themed-level group and descriptions for T1 to T3 at the merge (`087fb40`). Seen at desktop size after the merge and in the agent's phone still; sent to the owner. Nothing clicked, tapped or heard. Eight levels still have no menu picture
- [x] In-game UI improvements (U1 to U5): agent 17, merged into `main` as `1d94f0e` (`8cb5d78`, `5eb974f`); levels, bundle and HUD checks pass. A ring with the distance to go and a shoulder dial in the meters' corner; messages along the top edge in landscape and at the foot in portrait; `CONFIG.messageTimes`; eleven sticky messages (puncture, beached, bad gas, heavy, butterfingers, and six bad mystery effects); the mystery's name in the status. Seen at desktop and phone size, sent to the owner. Weak spots: wrapped messages and sticky rows push the camera warning toward the horizon on desktop; in portrait a long message reaches the car. Nothing seen moving
- [~] Road gimmicks: agent 19, branch `delivery-gimmicks`. **Merged so far** (f6e0648): H2 the ramp over the jam (Night Drive, Speed Trap Alley), H8 washboard dirt (Safari, Outback Express), H4 the low bridge (Ring Road, Quarry Run), H5 the ford (Back Roads, Quarry Run), H19 speed cushions (Suburbs, The Hood, Christmas Eve), H10 black ice in the shade (Mountain Pass, Fjord Crossing); all on the hidden Gimmick Road 3; no clock changed. Carrying on from H9 ruts, plus the drawbridge's river colour and an asteroid-drifter error
- [~] New levels on new themes, built from the gimmicks the game has now (owner, 10-Oct: "Let's get some agents going making new levels with the new themes and the gimmicks we have right now"). No new gimmick per theme. Three agents, three themes each, a level on each:
  - [x] A (agent 20), merged into `main` as `6e327af`; levels, schema, bundle, save and targets checks pass. A group of their own on the menu (T1...), saved progress undisturbed. **T1 Toy Room**, **T2 Twenty Thousand Leaks** (a new sea-bed theme: the road in a glass tube), **T3 Tranquility Base** (a new moon theme). 22 to 28 cash pickups and 8 to 11 side-by-side rows each. Seen in one still each, sent to the owner. Not played. The stopped agent's toy gimmicks and low gravity were cut and kept on `delivery-themes-toys-wip`
  - [~] D (agent 26, `delivery-themes-d`): T16 old Wild West, T9 favela hillside, T17 rice terraces
  - [x] B (agent 21), merged into `main`: **Quiet on Set** (a film studio backlot: five sets in turn), **Acqua Alta** (Venice: the road a quay on the lagoon), **Northern Lights** (an ice road at night under an aurora). 29, 35 and 37 cash pickups; 9, 13 and 11 rows. Seen in one still each. Not played
    - [x] T13 film studio backlot: theme `backlot` (`29d651b`), level `backlot` "Quiet on Set" (`65e69cf`): 4150 m in five sets (the lot, a Western town, a soundstage tunnel with a spaceship corridor, a New York street of flats, painted skies), 29 cash pickups, nine rows side by side. Verified: the levels, schema, bundle and save checks; a ghost driven to the finish; each row takes only the pickup in the car's lane (a headless check); 30 stills along the level looked at. Not verified: nothing played by hand, nothing seen moving (the wind machines' fans, the gimmicks in action), no sound
    - [x] T1 Venice: theme `venice` (`4efb9c8`), level `venice` "Acqua Alta" (`bf2c77d`): 4500 m of quay, an ordinary road level (the water is beside the road; acqua alta is the tide the game has, no new gimmick): three humped bridges that are crest jumps, a drawbridge, a carnival parade, a sotoportego (tunnel), fog, the tide, a balloon, a reversible lane; 35 cash pickups, thirteen rows of two. Verified as the backlot was (checks, ghost to the finish, rows, 24 stills). Not verified: nothing played by hand; the boats are scenery and do not move; the drawbridge's own river is the gimmick's blue, not the lagoon's green
    - [x] T4 ice road: theme `iceroad` (`4b41285`), level `iceroad` "Northern Lights" (`45b99b9`): 4600 m across a frozen lake at night under the aurora, an ordinary road level (no breaking ice: the ice patches, crosswinds, fog and burst mains the game has): eight ice patches, two crosswinds, a pressure ridge that is a crest jump, a side road, sliding crates, a whiteout, a wide load, truck convoys; 37 cash pickups, eleven rows side by side (two of them on the side road). Verified as the others (checks, ghost to the finish, 21 stills; the rows on the expressway by a headless check, the two on the side road only by the level check). Not verified: nothing played by hand; the aurora's drift not seen moving
  - [x] C (agent 22), merged into `main`: **Thrill Park** (a theme park with a rollercoaster over the road), **Cinder Island** (a volcano island with rivers of lava), **Dock Run** (a container port). 31, 29 and 27 cash pickups; 11, 9 and 8 rows. Seen in one still each. Not played. Known flaw: the drawbridge draws a blue river on any theme (given to agent 19)
  - [x] **"The themed levels are just normal levels"** (owner): no T group; they are numbered levels 32 to 40, ahead of the specials; saved progress counts them in. `9335812`, `3f75184`, `88e87aa`. All checks pass; the save cookie is 3760 of 4096 bytes with 57 levels
- **Standing rule for level content (owner, 10-Oct):** "add more Cash bonus pickups on the level from now, and have parts of the level where two or more pickups are side by side." Given to the theme agents, the Stelvio and Market Town agent and the gimmicks agent. Older levels have between none and four cash pickups
- [x] Tank Rage: agent 23, merged into `main` as `d1e6e9d` (`0c72eb6`, `a735f67`, `422f268`); targets (257), tank, water and save checks pass. **Markers:** a theme or a single target can set `target: { offset, height, style, base, arm, beam }`; set for Mumbai (the post stood inside a building), Hong Kong (half in a tower wall), Tokyo, Singapore day and night, Safari and the circuit themes. **Amphibious tank:** a model of its own; a rage on an amphibious level is in it, on land and water; no garage bay. Seen in stills, sent to the owner. For the owner: no garage bay; 46 m/s ashore and 72% afloat; a beam of light only on the configured themes
- [x] Audit (owner: "Audit only", then "Include a plan to cut down on the bloat"): `AUDIT-10-Oct.md`, `11ef1b5`: 32 findings and a ten-stage plan. C4 (script injection in the editor, live), C2, C3, C5, C6 given to agent 24. **C1 needs the owner**: which of the two burst-water-main systems is the game's. Performance findings and the bloat plan are not assigned
- **The level progression rework waits:** the owner will do "a full rebalance later"
- [ ] Next 3: clocks for the five themed levels; Gimmick Road 2's gimmicks into real levels (menu pictures moved to the known-problems agent)
- [~] Known problems: agent 24, branch `delivery-fixes`. Done: the flaky checks (every worktree shared one Vite cache and each run deleted it: `69b8ae1` on `main`); audit C4 (the editor no longer writes level values into the page as HTML), C6 (a pasted save code keeps only a save's fields), C2 (address-bar switches never write the save), C5 (a bad edited level is refused with a reason): committed, not merged yet. To do: C3 with the replay failures, pickups on shoulders, the Gimmicks page's console errors, duplicate keys, stale notes and HANDOVER, the editor's leftovers, the missing menu pictures
- [ ] Next 5: 28 liveries, 31 endless mode, replay in the browser
- [ ] Next 6: 51 phone performance, 49 parallel smoke test, 50 lint and CI
- [ ] Next 7: more circuits (Baku, Brands Hatch, Caesars Palace, Monaco, Donington, Sepang, Suzuka); Albert Park's traps from another source
- Not in the queue unless the owner says: road characters P3 to P13 (the owner wanted the pursuit kept simple); anything needing a person (listening, playing by hand, a real phone)

- [ ] Next 0b: the level progression rework (the owner's spec is in the section "Level progression rework" at the end; nine things in it need the owner's answer before it is built)

## Not assigned

- [ ] 28. Liveries earned for Evil and Good clears
- [ ] 31. Endless mode
- [ ] 49. Smoke test in parallel workers
- [ ] 50. Lint, format and CI
- [ ] 51. Performance on phones
- [ ] Level clocks and menu pictures for Hong Kong, Tokyo, Mumbai, Stelvio, Christmas
- [ ] More circuits: Baku, Brands Hatch, Caesars Palace, Monaco, Donington, Sepang, Suzuka
- [ ] Level editor: full control over every feature and gimmick (itemised below; built on `delivery-editor`: all but E1.4 and E6.2 done or partly done)
- [ ] Gimmick Road 2's gimmicks used in real levels

## Level editor: full control over every feature and gimmick (Agent 8, branch `delivery-editor`)

Asked for by the owner on 10-Oct; investigated by reading `editor.js` (757 lines),
`delivery/editor.html` and the field list at the top of `levels.js`. Built on 10-Oct (see each item):
verified with `.schema-check.mjs`, `.bundle-check.mjs` and headless screenshots, with scripted clicks and
drags from the address bar. **Nothing was clicked by hand.**

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

- [x] E1.1 **Done (delivery-editor). `levelSchema.js`: 99 fields, 164 settings; `node scripts/.schema-check.mjs` passes on all 53 levels.** A schema file (`levelSchema.js`, logic side, no rendering): for every field its shape
      (flag, number, choice, stretch `from..to`, point `s`, timed `every {min,max}`, list of
      these, world-placed `x,z`), each setting's type, range, default and choices, which road it
      may be on, and a line of help. About 90 fields; the comments at the top of `levels.js` are
      the source.
- [x] E1.2 **Done (delivery-editor). Seen in screenshots; nothing clicked by hand.** The editor builds its forms, place-buttons, map drawing and default entries from the
      schema, in place of `FEATURE_TEMPLATES`, `EDITED` and the hand-written panels.
- [x] E1.3 **Done (delivery-editor). Obstacles, vehicles, wreckage, themes, cars and cargo from the game's tables; pickup types, herd, drifter, dance, machinery, site, landmark and zone kinds had no table, so the schema is now it (pickups cross-checked with `render/pickupModels.js`).** Lists the editor hard-codes come from the game instead: obstacle kinds from
      `CONFIG.obstacleKinds`, traffic kinds from `CONFIG.vehicles`, herd, drifter, machinery,
      landmark and wreckage kinds from their own tables.
- [ ] E1.4 **NOT DONE: the game does not check levels with the schema (`Game.start` rewrites a rival level's `grid` with keys of its own, and fields arriving from other branches would be reported until their entry is added); `.schema-check.mjs` does it headlessly instead. The README recipe has the step.** The same schema checks a level when the game loads it, so the editor and
      `Track.problems` cannot disagree, and a new gimmick is added to the editor by adding its
      schema entry (add this step to the README's "adding content" recipe).
- [x] E1.5 **Done (delivery-editor). The JSON tab holds the whole level; every selected thing has an "As JSON" box.** The raw JSON box stays, as an "advanced" fallback for anything the schema lacks.

### E2. Level-wide settings that have no control today

- [x] E2.1 **Done (delivery-editor). `laps` is under Race and rivals.** Road: `drive` (left / right), `lanes` as `{ north, south }` and odd counts, `median`,
      `shoulder`, `shoulderTimer`, `speedLimit`, `laps`.
- [x] E2.2 **Done (delivery-editor).** Traffic: the mix as a table with sliders in place of typed text; `trafficCount`,
      `oncomingCount`, `trafficSpeed`, `drivers` (evil, happy, angry), `hesitation`.
- [x] E2.3 **Done (delivery-editor).** Timed events, each a switch with a min and max: `emergencies`, `processions`,
      `convoys` (size, kind), `railway`.
- [x] E2.4 **Done (delivery-editor).** Mode switches: `alwaysGood`, `noPackages`, `understeer`, `wallDamage`, `nudge`,
      `helicopter`, `battle`, `pillboxes`.
- [x] E2.5 **Done (delivery-editor).** Race and rivals: `grid` (count, kind, gap, pace, from), `rival`, `rivals` (name, car,
      colours, marker).
- [ ] E2.6 **PARTLY (delivery-editor): `rain`, `snow`, `festive`, `elevated` are properties of a theme, not level fields: the theme picker says what each theme brings; no switches.** Weather and look, where a theme allows it: `rain`, `snow`, `festive`, `elevated`.

### E3. The road itself

- [x] E3.1 **Done (delivery-editor). On the Road tab each segment's end is a handle: dragged along the road it changes the length, across it the bend (one handle for both); the rise and fall is a strip along the bottom of the map on a road with a slope. Seen through a scripted drag (a blank level's third segment bent 53 degrees) and on Stelvio; not dragged by hand.** Segments: draw and drag the road on the map (handles for a bend's length and angle),
      beside the table; show the gradient profile as a strip under the map.
- [x] E3.2 **Done (delivery-editor). Fork and merge placed by a click and dragged as a band; out, bends, own segments, lanes (a number or along the way), oncoming, oncomingFrom and flyovers in the form. Dragging not tried by hand.** Side roads (`exits`): place the fork and merge by clicking, drag them, and edit `out`,
      the side road's own `segments`, `lanes`, widenings and `flyovers` in a form. Today only
      "oncoming from here" has a tool.
- [x] E3.3 **Done (delivery-editor). From the schema (place, drag, form). The quarter bend still has to be made in the segments table.** Crossroads (`junctions`): place, with `turn`, `forward`, `turnOff`.
- [x] E3.4 **Done (delivery-editor). Also `water`, `gravel`, `tide`; `runoff` with its taper (`end`).** Stretch kinds that change the road, with forms: `narrows`, `splits`, `bridges`,
      `tunnels`, `runoff`, `stands`, `runway`, `reversible`, `quietZones`, `trafficZones`, `zones`
      (scenery, ground, sky, sea).
- [ ] E3.5 **PARTLY (delivery-editor): the Road tab says how far a road is from closing and by what angle; no "close it" button. Run-off and stands per side are in their forms.** Circuits: closing a lapped road (show the gap and heading error, offer to close it),
      and run-off and stands per side.

### E4. Gimmicks: a place-button and a form for each (most have neither)

- [x] E4.1 **Done (delivery-editor).** Stretch gimmicks: `fog`, `gunfire`, `asteroidFields`, `storm`, `migration`,
      `elephants`, `landmines`, `trolleys`, `stampedes`, `rockfall`, `quarries`, `tide` (with its
      waves), plus full forms for the ten that only have a button.
- [x] E4.2 **Done (delivery-editor).** Point gimmicks: `cameras`, `crossings`, `stopGo`, `potholes`, `potties`, `machinery`,
      `siteWorks`, `waterMains`, `parades`, `roadblocks`, `iceCreamStops`, `schoolCrossings`,
      `balloons`, `drawbridges`, `wideLoads`, `marathons`, `pelotons`, `wreckage`, `tower`,
      `shoulderRows`, `parkedPlanes`.
- [x] E4.3 **Done (delivery-editor). Seen: Gimmick Road 2's side-road camera, potholes, crossing and stampede drawn; a stampede placed on Expressway's side road by a scripted click.** Gimmicks on a side road (`{ road: 'side', exit: n }`): the editor leaves these off the
      map entirely today. Draw them, place them and drag them along the side road.
- [x] E4.4 **Done (delivery-editor). Lanes offered are those of the road at that spot (closed ones marked; a side road's own); ranges for wide loads, balloons, wreckage.** Lane pickers that know the road at that spot (a narrowed stretch, an exit lane, a side
      road's own lanes), and lane ranges (`lanes: [first, last]`) for wide loads, balloons and
      wreckage.
- [x] E4.5 **Done (delivery-editor). A hollow arrowhead where the player sets it off, joined to the thing when selected.** Triggers: for anything with `trigger` or `flipAt`, show on the map where the player
      sets it off as well as where it happens.
- [x] E4.6 **Done (delivery-editor). Rings in the world, a tick to turn them by; circuit `paths` drawn. Which way `rot` turns a model was not checked against the 3D view.** World-placed things (`landmarks`: `x, z, r, rot`): place and turn them on the map
      beside the road, not along it.
- [x] E4.7 **Done (delivery-editor). Each form lists its rules with a tick or a cross; where a thing cannot go is tinted red on the road while it is being placed; a button whose level-wide rule fails is marked.** Rules shown while editing, not after: straight road only (crossings, stop / go,
      drawbridges), level road only (bridges), two-way only (stop / go, reversible), what cannot be
      combined with exits. The side roads cleanup in the queue will change some of these.

### E5. Keeping a level whole while it is edited

- [x] E5.1 **Done (delivery-editor). "Move what comes after" (on by default), also when a segment is removed. Seen on Expressway: first segment 600 to 1200 m.** Changing a segment's length moves or stretches everything after it (today "a change to
      the road can leave them out of place").
- [x] E5.2 **Done (delivery-editor). Buttons, Ctrl+Z, Ctrl+Y. Seen through a scripted drag and undo; not by hand.** Undo and redo.
- [ ] E5.3 **PARTLY (delivery-editor): Duplicate (Ctrl+D), copy and paste (Ctrl+C / V) of one thing; no selecting several.** Copy, paste and duplicate; select and move several things at once.
- [x] E5.4 **Done (delivery-editor). Each problem under the map is a button to its cause (the game's problems are traced by their wording: a new wording falls back to the list).** Problems listed under the map link to the thing that causes them.
- [x] E5.5 **Done (delivery-editor). Autosave to local storage (not when the address names a level); Load .json by button or drop. Neither tried by hand.** Autosave of the level being edited, and Load a `.json` file (today only the built-in
      levels can be opened, and only Download saves).

### E6. Seeing and proving it

- [ ] E6.1 **PARTLY (delivery-editor): "Play from here" (a tool, and a button on each thing) opens `?edited&at=`; the 3D view is still updated by its button.** The 3D view updates as you edit, and "Play from here" starts a run at the spot under
      the cursor (`?at=`).
- [ ] E6.2 **NOT DONE: not started.** A "Work out the clock" button, doing what `scripts/level-clocks.mjs` does, in the page.
- [x] E6.3 **Done (delivery-editor).** Filters on the map (show only one kind, hide scenery bands) and a list of everything in
      the level to pick from.
- [x] E6.4 **Done (delivery-editor). `scripts/.schema-check.mjs`.** A headless check that the schema covers every field used by every level in `levels/`,
      and that each level passes through the editor's load and save unchanged.

### E7. To come from today's queue (add their fields once they exist)

- [x] E7.1 **Done (delivery-editor). `water` (place, drag, form, rules), `amphibious`; boats are kinds in the traffic mix.** Water stages, boat traffic and "amphibious only" for the amphibious levels.
- [x] E7.2 **Done (delivery-editor).** The cargo a level carries, for each side.
- [x] E7.3 **Done (delivery-editor). The side-road list of today's `levels.js` (`road: 'both'` on 22 fields).** Whatever the side roads cleanup adds or lifts.

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

Build the theme first, then the level. Make sure the theme is reusable

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
- [x] T7. **Built (agent 22, `delivery-themes-c`): theme `volcano`, level `cinder` "Cinder Island" from the gimmicks the game has (the lava bombs and the lost lanes below were not built). Verified: levels, schema, bundle, save, descriptions and targets checks; a ghost driven to the end; each pickup of a row taken only from its own lane; screenshots along the whole level and of a target. Not verified: nothing played by hand, nothing seen moving (the scenery that moves was seen only in stills), nothing heard.** **Volcano island**: black sand, palms, steam vents, a lava field across the old road.
      Gimmick: lava bombs landing on the road and cooling into obstacles; lava flows that close a
      lane for good partway through the run. Reuses: quarry blasts and boulders, hell's palette.
- [ ] T8. **Autumn countryside**: orange and red forest, stone walls, covered bridges, a village
      with a harvest fair. Gimmick: wet leaves in the bends (slick only off the racing line),
      a hay-cart convoy, a low sun straight ahead on one stretch. Reuses: farm, ice, convoys.
- [x] T9. **Favela hillside** (done as theme `favela` and level "Favela Heights", `levels/morro.json`, with the game's existing
      gimmicks: a parade for the carnival, burst mains, an ice-cream van, trolleys, a fun run, cyclists, a balloon, a tunnel and a
      crest on the ridge. NO bouncing balls or filtering motorbike taxis of its own. Verified: the checks, a ghost probe to the
      end, screenshots along it. Not played by hand): a steep switchback road between stacked houses in every colour,
      stairs, cable cars overhead, a football pitch on a roof. Gimmick: balls bouncing down the
      stairs onto the road, motorbike taxis that filter between lanes. Reuses: Stelvio's
      hairpins, drifters, the rickshaw's agility.
- [ ] T10. **Night market**: a street closed down to two lanes by stalls, lanterns, steam,
      neon signs in the rain. Gimmick: the stalls creep outward as the evening goes on, and
      pedestrians cross anywhere. Reuses: narrows, parades, the lit themes, school crossing's
      walkers.
- [x] T11. **Built (agent 22, `delivery-themes-c`): theme `port`, level `docks` "Dock Run" from the gimmicks the game has (the cranes lowering boxes into lanes below were not built: the cranes are scenery). Verified: levels, schema, bundle, save, descriptions and targets checks; a ghost driven to the end; each pickup of a row taken only from its own lane; screenshots along the whole level and of a target. Not verified: nothing played by hand, nothing seen moving (the scenery that moves was seen only in stills), nothing heard.** **Container port**: stacks of containers for walls, gantry cranes, straddle carriers,
      rail lines in the road. Gimmick: cranes lower containers into lanes on a rhythm; straddle
      carriers drive over you if you are low enough. Reuses: machinery, level crossings, falling
      cargo, potties' patterns.
- [x] T12. **Built (agent 22, `delivery-themes-c`): theme `themepark`, level `park` "Thrill Park" from the gimmicks the game has (the coaster sharing the road and the bumper cars below were not built: the coaster is scenery). Verified: levels, schema, bundle, save, descriptions and targets checks; a ghost driven to the end; each pickup of a row taken only from its own lane; screenshots along the whole level and of a target. Not verified: nothing played by hand, nothing seen moving (the scenery that moves was seen only in stills), nothing heard.** **Theme park**: the road runs through the park: a rollercoaster looping over it,
      a Ferris wheel, a log flume that crosses as a water stretch, a parade route. Gimmick: the
      coaster's train shares the road for a stretch; bumper cars as traffic. Reuses: parades,
      bullet train, balloons.
- [ ] T13. **Film studio backlot**: one street that is a Western town, then a spaceship set, then
      a painted sky on a flat, with cameras on cranes and a director's chair. Gimmick: stunt
      cars that crash on cue (scripted wreckage) and a "cut!" that freezes traffic. Reuses:
      zones (a look per stretch), wreckage, the traffic-freeze mystery.
- [x] T14. **Toy room** (done as level T1 "Toy Room", `levels/toys.json`, with the game's existing gimmicks, not the
      three below: those are unfinished on branch `delivery-themes-toys-wip`. Verified: the level's checks, a ghost
      probe to the end, screenshots along it. Not played by hand): the whole level at toy scale: a road of plastic track across a carpet,
      building blocks, a train set, a sleeping cat. Gimmick: marbles rolling down the track, the
      cat's paw as a hazard, a ramp-and-loop jump. Reuses: drifters, drawbridge jump, the models
      are already toy-like.
- [x] T15. **Underwater tunnel** (done as theme `seabed` and level T2 "Twenty Thousand Leaks", `levels/leaks.json`, with
      the game's existing gimmicks: burst mains for the leaks, two tunnels for the dark stretches. No pump, no gimmick
      of its own. Verified: the checks, a ghost probe to the end, screenshots along it. Not played by hand): a glass tube on the sea bed: whales and shoals outside, a
      leaking stretch, an air-lock at each end. Gimmick: leaks that flood a lane until a pump
      catches up; a section with the lights out. Reuses: tunnels, water mains, blackout.
- [x] T16. **Old Wild West** (done as theme `wildwest` and level "High Noon", `levels/noon.json`, with the game's existing
      gimmicks: stampedes for the cattle drive, a level crossing, a mine tunnel, three crests, pursuits for the posse. NO train
      robbery or duel of its own. Verified: the checks, a ghost probe to the end, screenshots along it. Not played by hand): a dirt main street, saloon, water tower, a steam railway beside the
      road, cactus. Gimmick: a train robbery (riders alongside the train, across the road), a
      cattle drive, a duel at noon that stops the traffic. Reuses: railway, stampedes, gunfire,
      the safari's unmarked dirt road.
- [x] T17. **Rice terraces** (done as theme `rice` and level "Emerald Steps", `levels/rice.json`, with the game's existing
      gimmicks: a ford with its side road for the bridge, burst mains and mud for the spill, herds for the buffalo, tractors,
      speed cushions, cyclists, fog in the valley, a crest and a crosswind on the ridge. NO flooding terraces or ducks of its
      own. Verified: the checks, a ghost probe to the end, screenshots along it. Not played by hand): a narrow road stepping down green terraces, water buffalo, a
      temple gate over the road, kites. Gimmick: the terraces flood in turn, spilling across the
      road as moving slick patches; ducks crossing in a line. Reuses: terrain, water mains'
      slicks, herds.
- [x] T18. **Moon base** (done as theme `moon` and level T3 "Tranquility Base", `levels/moon.json`, with the game's
      existing gimmicks: four crests to fly, potholes for craterlets, rockfall and a boulder strike for meteors. NO low
      gravity: the physics are the game's own (the stopped agent's start on it is on `delivery-themes-toys-wip`).
      Verified: the checks, a ghost probe to the end, screenshots along it. Not played by hand): grey regolith, domes, a low black sky with the Earth in it, a road of
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

- [x] G16. **Crosswind**: a steady push sideways on an exposed stretch (a viaduct, a dam), with
      gusts announced by a windsock. Tall cars are pushed more; passing a truck gives shelter,
      then a shove as you clear it.
      _Built (`1d48924`, `gambles.js`, field `crosswinds`):_ on Gimmick Road 3 (300-900), Grand Pacific's
      sea cliff bridge, Hurricane, Tokyo. Verified by `scripts/.gimmicks3-check.mjs wind` (push by
      height, taps hold the lane, shelter beside a bus and the shove on clearing it, traffic drifts in
      lane, the low car's safe line) and in stills on Gimmick Road 3 (socks, the card). Not verified:
      played by hand; the lean on screen; the three real levels on screen.
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

- [x] H1. **Crest jumps**: a street of steep crests, San Francisco style. Take one fast and the
      car flies: no steering in the air, and it lands on whatever is over the top. _Gamble:_ lift
      and see, or fly blind and gain seconds. _Builds on:_ the drawbridge's jump, hills.
      _Built (`9d7711b`, `gambles.js`, a segment's `ease`: no object placed):_ on Gimmick Road 3 (tops at
      1190 and 1490), Rival Run (4400), Mystery Meadows (2740, the cows over the top). Verified by
      `.gimmicks3-check.mjs crest` (flies in a clear lane unhurt, lands in the barrier in the wrong one,
      no steering in the air, the safe line under the board's speed, faster by 2.4 s, a hard landing
      costs, no other level has a crest by accident) and in stills (the hidden far side, the car in the
      air, the card). Not verified: played by hand; the two real crests on screen; sound.
- [x] H2. **Ramp over the jam**: a car transporter with its ramps down, or a roadworks ramp, sits
      in one lane at the back of a queue. Hit it fast enough and the car clears the queue; too
      slow and it lands in it. _Gamble:_ the jump or the slow way round. _Builds on:_ drawbridge
      jump, rubbernecking queues, convoys.
      _Built (`gambles.js`, field `jamRamps: { s, lane, queue?, lanes? }`):_ on Gimmick Road 3 (2400,
      lane 4, 115 km/h), Night (2250, a queue of 2: 85 km/h, a turbo before it) and Speed Trap Alley
      (2860, a queue of 3: 100 km/h, just past the camera at 2750). The queue is real stopped traffic
      (small vehicles, the same every run); cash beyond it. The way round is the oncoming side or the
      shoulder. Verified by `.gimmicks3-check.mjs ramp` (over at the board's speed, into the queue
      8 m/s under it, round by the oncoming lane unhurt, kept out of the trailer from beside, traffic
      moves over, never stood still on the ramp, both real levels load with their whole queue) and
      in stills (the board, the foot, in the air, the card, Night). Not verified: played by hand;
      Speed Trap Alley on screen; whether the cash beyond is picked up on landing.
- [ ] H3. **Tram lane**: the median's rails are an empty lane, and a tram is coming along them
      somewhere. Fast and clear, slippery in the rain, and the tram does not swerve. _Gamble:_
      how long to stay on the rails. _Builds on:_ the railway median, Hong Kong's trams, ice.
- [ ] H4. **Low bridge**: a height limit ahead, signed, with the tall-vehicle route going the
      long way round. A low car goes straight under; a van or the bus must take the detour, or
      lose its roof rack, lights and some health trying. _Gamble:_ made in the garage, and again
      at the sign. _Builds on:_ side roads, tunnels, car heights already in `cars.js`.
      _Built (`gambles.js`, field `lowBridges: { s, clearance? }`, as a height bar over the player's
      side, 2 m unless said):_ it must stand between an exit and its merge (the level reports one
      that does not). A car that fits goes under; a taller one that goes at it loses 30 health and
      25 more per metre too tall, and 60% of its speed, and is through; the player is told on the
      way in what the car measures. Tall traffic takes the exit. On Gimmick Road 3 (4400; its first
      side road pushed out to 150 m so the way round costs 4 s), Ring Road (1100) and Quarry Run
      (1510), cash under each. Clocks not re-timed. Verified by `.gimmicks3-check.mjs bridge` (a low
      car untouched, a 2.65 m truck takes the knock and is never stopped, the same truck round by
      the exit unhurt and 4 s slower, the oncoming side not barred, a bus takes the exit, both real
      levels have an exit round theirs) and in stills (the board, the bar, the card, Ring Road).
      Not verified: played by hand. Known gap: a tall traffic vehicle that
      cannot get over to the exit lane is taken off the road if it is 140 m or more from the
      player, and otherwise drives through the bar. It is a bar, not a bridge: say if a real
      bridge over the whole road is wanted.
- [ ] H5. **Ford**: the road dips through a river, with the bridge a little further round. Depth
      posts show how deep it is today (it varies down the level). A car that wades well goes
      through; one that does not is slowed to a crawl or stalls. _Gamble:_ read the posts and
      know the car. _Builds on:_ the tide's wading (`crossing` in `cars.js`), side roads.
      _Built (`gambles.js`, field `fords: { from, to, depth? }`, each ford its own fixed depth: it
      does not change during a run):_ between an exit and its merge (the side road is the bridge;
      the level reports a ford with none). A car wades 0.25 m (crossing 0) to 1 m (crossing 1):
      within that it is slowed (to 47 km/h at its limit), beyond it it crawls at 16 km/h and loses
      10 health a second per metre too deep; never stopped. The player is told the depth and what
      the car wades before the exit. On Gimmick Road 3 (5650-5720, 0.6 m; its second side road
      out to 150 m), Back Roads (1790-1850, 0.45 m) and Quarry Run (4060-4105, 0.7 m), cash in each.
      (The low bridge moved from Back Roads to Quarry Run, 1510, so Back Roads has one of the two.)
      Clocks not re-timed. Verified by `.gimmicks3-check.mjs ford` (a truck through unhurt and 3 s
      quicker than the bridge, a lowrider crawling 13 s and 31 health, the same car over the bridge
      dry and 9 s quicker, a ghost untouched, traffic wading slowly, both real levels) and in stills
      (the board, the bank, in it, Back Roads, Quarry Run). Not verified: played by hand; the road
      does not dip (the water lies on it); the card on screen.
- [ ] H6. **Flooded underpass**: the same, in town in the rain: the main road dips under a
      railway and fills, and the slip road goes up and over. The water rises through the run.
      _Gamble:_ early on it is passable by anything; later only by some. _Builds on:_ tunnels,
      Mumbai's rain, burst water mains.
- [ ] H7. **Hairpin cut**: a rough track straight down the hill between two legs of a hairpin.
      It saves the whole bend, shakes the car, costs health, and rejoins across the traffic.
      _Gamble:_ seconds against damage and a blind rejoin. _Builds on:_ Stelvio's hairpins, mud,
      side roads.
- [x] H8. **Washboard dirt**: a corrugated dirt road. Slowly, it shakes the grip away; above a
      certain speed the car skims the tops and it goes smooth. _Gamble:_ commit to the speed
      before the bend, or crawl. _Builds on:_ potholes, mud, the safari's dirt road.
      _Built (`gambles.js`, field `washboards: { from, to, skim? }`):_ smooth at 32 km/h or less and
      at 72 km/h or more; between, 88% of the steering goes, the car wanders and runs wide in bends
      (worst half way). On Gimmick Road 3 (2950-3450, three barriers to steer round), Safari
      (2520-2980) and Outback Express (3960-4380), cash on the lines that need steering. Clocks not
      re-timed (skimming costs no time). Verified by `.gimmicks3-check.mjs washboard` (skimming
      round the barriers unhurt, the same steering at 52 km/h hits one, crawling unhurt and 41 s
      slower, braking on it drops into the rough, every garage car can reach the speed, both real
      levels load) and in stills (the boards, on it, the card, Safari). Not verified: played by
      hand; how it feels behind slow traffic; Outback Express on screen; sound.
- [ ] H9. **Ruts**: tractors have left deep ruts in the mud. In a rut the car runs straight and
      fast; changing lane means climbing out, with a jolt and a wobble. _Gamble:_ pick the rut
      early and live with it. _Builds on:_ mud, tractors.
      _Built (`gambles.js`, field `ruts: { from, to }`):_ deep mud with a rut down each lane. In a
      rut the car runs at its own pace and is held to it; 0.45 s of steering against it gets it
      out with a jolt (8 health, a fifth of its speed, a lurch) into the mud between, slow by how
      badly the car crosses rough ground, until it drops into the next rut for nothing. On
      Gimmick Road 3 (4830-5030: lane 4's rut has the big cash and then a barrier), Farm
      (2810-2970, a bale down lane 3's) and Outback Express (2560-2860). Clocks not re-timed.
      Verified by `.gimmicks3-check.mjs ruts` (the right rut held at full speed for nothing, a tap
      of steering does not get out, the wrong rut kept runs into its barrier, out after the cash
      with one jolt and past it, the Lowrider slower than the Lifted Truck in the mud, a ghost not
      held, both real levels) and in stills (Gimmick Road 3, Farm, the card). Not verified: played
      by hand; Outback Express on screen. Changing rut costs little time (0.2 s) as tuned: the
      cost is the health.
- [ ] H10. **Black ice in the shade**: ice lies only where a building, a cutting or the trees
      shade the road, so it can be read from the shadows before reaching it. _Gamble:_ brake
      before the shadow, or stay in the sunny lane with the traffic. _Builds on:_ ice, the
      scenery already casting the shade.
      _Built (`gambles.js`, field `shade: { from, to, side, lanes? }`):_ a row of tall trees of its
      own on that side (not the theme's scenery) shades the nearest lane or lanes, and the shadow
      is ice (the game's own, through `Track.slicks`) with 90% more of the steering gone; nothing
      is drawn but the shadow. Traffic moves into the sun before it. On Gimmick Road 3 (6250-6450,
      a barrier in the shade at 6410, the bigger cash in the shade), Mountain Pass (2370-2450, the
      braking for the hairpin) and Fjord (1340-1470, the shaded lane the way past the barriers).
      Not on Christmas: it is a night level, with no sun to be out of. Clocks not re-timed.
      Verified by `.gimmicks3-check.mjs shade` (the sunny lane never ice, out of the shade early
      unhurt, a move 25 m before the barrier hits on the ice and clears with the ice taken away,
      slowly it clears, a van moves into the sun, both real levels) and in stills (Gimmick Road 3,
      Mountain Pass, Fjord). Not verified: played by hand; the card on screen. Weak point: the
      game's ice costs nothing in a straight line, so a shade needs a bend, a hazard or a braking
      point in it to be a gamble at all.
- [ ] H11. **Truck spray**: in rain every lorry drags a cloud of spray: nothing can be seen
      behind one. _Gamble:_ hang back and see, or overtake blind. _Builds on:_ rain, fog.
      _Built (`gambles.js`, field `spray: { from, to }`, a wet stretch, not the whole level's
      rain):_ every moving vehicle 2.2 m tall or more drags a cloud up to 45 m long over its lane
      and most of the next each side. In it a veil comes over the picture (`Gambles.veil`, a sheet
      over the canvas with a hole round the car), up to 92% at the lorry's tail. Nothing is done to
      the car. On Gimmick Road 3 (2520-2880, with a tractor at 2640 to throw one up every run),
      Mumbai (1380-1950, over its potholes and water mains) and Hurricane (3110-3490). Clocks not
      re-timed. Verified by `.gimmicks3-check.mjs spray` (76% gone 8 m behind a lorry, clear 10 m
      beyond the cloud, less half way back, gone in the next lane and clear in the one beyond, a
      car throws none, none on the dry road, clear alongside, the car untouched, both real levels)
      and in stills (in the cloud behind the tractor and beside it, the card). Not verified:
      played by hand; a lorry's full cloud on screen (the tractor's is short: it is slow); Mumbai
      and Hurricane with a lorry in view. The cloud is a plain translucent box.
- [ ] H12. **Low sun**: one stretch runs straight into the sun and the screen washes out,
      except in the shadow of a lorry, a bridge or a row of trees. _Gamble:_ tuck in behind
      something slow to see, or run in the glare. _Builds on:_ fog, tunnels' light change.
      _Built (`gambles.js`, field `lowSun: { from, to }`):_ in the open 88% of the picture washes
      out (the same veil as the spray's, in the sun's colour); in shadow it is clear: up to 9 m
      behind a vehicle for each metre of its height (2.2 m or taller, in the car's own line),
      under a bridge, in a tunnel, or under a shade's trees. A sun is drawn low ahead. On Gimmick
      Road 3 (6470-6690, a barrier at 6640 behind the cash), Grand Pacific (7020-7560) and Outback
      Express (820-1180). Clocks not re-timed. Verified by `.gimmicks3-check.mjs sun` (88% gone in
      the open, clear 10 m behind a lorry, glare again beyond its shadow and in the next lane, a
      car shades nothing, the car untouched, both real levels) and in stills (the glare, the sun
      and its board on Outback Express). Not verified: played by hand; a lorry's shadow on
      screen (no shadow is drawn on the road: the picture just clears); Grand Pacific on screen.
- [ ] H13. **Dust trail**: on dirt every car throws a plume that drifts with the wind.
      Following in it is blind; driving a lane upwind of it is clear. _Gamble:_ the clear lane
      may be the oncoming one. _Builds on:_ fog, crosswind (G16), the safari.
- [ ] H14. **Rockfall gallery**: the road forks into a covered gallery, narrow with no
      shoulder and a queue in it, and the open road under the loose face. _Gamble:_ slow and
      safe, or fast under the rocks. _Builds on:_ rockfall, tunnels, the fork (G4).
- [ ] H15. **Thin ice shortcut**: the road goes round the lake; tyre tracks go straight across
      it. Light cars cross; heavy ones crack it, and a crack that catches the car is a cold
      swim. Amphibious cars do not care. _Gamble:_ the car's weight against the distance saved.
      _Builds on:_ ice, `mass` in `cars.js`, the water stages being built, theme T4.
- [ ] H16. **Fresh tarmac**: a coned-off lane of new tar beside the roadworks queue. It is
      empty and it is sticky: the longer the car stays on it the slower it gets, and the tyres
      stay slow for a while after. _Gamble:_ short hops along it. _Builds on:_ stop / go
      roadworks, mud, narrows.
      _Built (`gambles.js`, field `tarmac: { from, to, lane }`):_ traffic keeps out of the tar lane
      and crawls past at 29 km/h. On the tar the tyres fill in 4 s and the top speed falls with
      them, by 90% when full (slower than the queue); they clean in 3 s, off it only. On Gimmick
      Road 3 (1750-2050, lane 5), Hong Kong (2620-2920) and Tokyo (860-1140), cash on the tar.
      Clocks not re-timed (measure them if the queue proves slow in play: it is new traffic
      slowing). Verified by `.gimmicks3-check.mjs tarmac` (the queue 42 s, short hops 14 s
      quicker, on it all the way 41 s slower than the queue and never stopped, the tyres' timing,
      a van moves out and crawls past, both real levels) and in stills (Gimmick Road 3, the card,
      Hong Kong). Not verified: played by hand; nothing on screen shows how full the tyres are
      (no HUD was added: the HUD is another branch's); Tokyo on screen; the tar is black on a
      night road in Hong Kong, read by its cones.
- [ ] H17. **Climbing lane**: a hill with a short extra lane for overtaking the lorries, and a
      sign counting down to where it ends. _Gamble:_ one more lorry before the lane runs out.
      _Builds on:_ narrows, convoys, hills.
- [ ] H18. **Single track with passing places**: one lane for both ways, with a marked bay
      every so often. Meeting someone between bays, somebody goes onto the verge. _Gamble:_ duck
      into this bay or run for the next. _Builds on:_ narrows, quiet zones, the shoulder timer.
- [ ] H19. **Speed cushions**: a suburban street of humps with gaps between them. Straddle a
      gap on exactly the right line and the car does not feel it; clip one at speed and it
      jumps and takes a knock. _Gamble:_ precision at speed against slowing. _Builds on:_
      potholes, the jump.
      _Built (`gambles.js`, field `cushions: { from, to, every? }`):_ a row every 45 m, a cushion in
      the middle of each lane and a gap on each lane line. Within 0.45 m of a lane line (less for a
      wide car) the car goes between two at any speed; over one at 30 km/h or less it is a bump;
      faster it is thrown up (no steering until down) and knocked, 3 health and more the faster.
      Traffic takes them slowly. On Gimmick Road 3 (3520-3700), Suburbs (1460-1600), The Hood
      (1460-1595) and Christmas (1480-1615), cash between the rows. Clocks not re-timed. Verified
      by `.gimmicks3-check.mjs cushions` (the lane line at 108 km/h untouched, the middle of the
      lane at that speed thrown at all five rows and 42 health, braking for each row unhurt and
      11 s slower, 0.7 m off the line is not the gap, a wide car has less room, the three real
      levels) and in stills (the rows, the card, Suburbs). Not verified: played by hand; how it
      is among the slowed traffic; The Hood and Christmas on screen.
- [ ] H20. **Blast window**: the quarry's siren goes and the road under the face is about to
      be showered; the haul road round the back is longer and rough. _Gamble:_ sprint under
      before it goes, or take the haul road. _Builds on:_ quarry blasts, side roads.

The orchestrator's pick of these: H1 crest jumps and H2 the ramp (the jump is already in the
engine and is the most fun thing the drawbridge does), H4 low bridge and H5 ford (they make the
choice of car matter on the road, which little does today), H8 washboard (it rewards going
faster, which nothing else does).

### Third batch (10-Oct): other characters on the road

Not obstacles: road users with something of their own going on, that the player can use, help,
hinder or keep clear of. Each is a random or timed event, as ambulances, funeral processions and
convoys already are (a level's `every: { min, max }`), so any level can have them.

- [x] P1. **Police pursuit** (the owner's idea), built in its simple form: a traffic event, as an ambulance is.
      Now and then (`pursuits: { every: { min, max } }`) a getaway car comes up from behind flat out, weaving
      through the traffic, and after it an interceptor that is **a model of its own, seen only in this event**,
      its siren heard before it is seen; traffic pulls aside as for an ambulance, and the two drive on through
      and away. Nothing in it for the player and nothing against: hitting either is a collision like any other.
      - *Built (10-Oct, `delivery-pursuit`):* `pursuit.js`, `render/pursuitModels.js`, `CONFIG.pursuit`, a Gimmicks
        card, a `levelSchema.js` entry; on Big Business, Night Drive, Speed Trap Alley, Ring Road, Tokyo and Gimmick
        Road 2; never on a race or the Battlefield. *Verified:* `node scripts/.pursuit-check.mjs`; stills of the chase
        going by. *Not verified:* never played by hand, the siren never heard.
      - *Taken out at the owner's word (10-Oct):* the first build's three endings (caught, crashed, away), the Good
        and Evil gambles with their rewards, bag of cash and bust, and the helicopter.
- [-] P2. **Bank robber wants a lift**: dropped at the owner's word (10-Oct). Built once on `delivery-pursuit`
      and reverted: the pursuit is a simple traffic event, and nobody on the road wants a lift from it.
- [ ] P3. **Street racers**: two tuned cars line up beside the player at speed, flash their
      lights, and go: a race through the traffic to a marked point a kilometre on. *Gamble:*
      take it up (cash for winning, and the police take an interest in all three) or let them
      go. They race each other whether or not the player joins. *Builds on:* the boy racer,
      rivals.
- [ ] P4. **Cash van**: an armoured van with a back door not properly shut, shedding banknotes
      into its lane (cash pickups) and a guard car beside it that leans on anything that gets
      close. *Gamble:* sit in its wake collecting, slowly, with the guard car to deal with, or
      get on with the delivery. *Builds on:* cash pickups, falling cargo, convoys.
- [ ] P5. **Snowplough and gritter**: on snow and ice levels a plough works along one lane. The
      lane behind it is clear and gritted: full grip. The lane beside it gets the snow it
      throws: blind and slippery. *Gamble:* follow it in comfort at its speed, or go through the
      plume to get past. *Builds on:* ice, snow, fog.
- [ ] P6. **Leaking tanker**: a tanker dribbling its load (oil, milk, molasses) leaves a slick
      trail down its lane for a long way behind it, and the trail tells the player it is ahead
      before it is seen. *Gamble:* the trail's lane is the empty one. *Builds on:* burst water
      mains' slicks, falling cargo.
- [ ] P7. **Mobile mechanic**: a breakdown truck with its crane out. Hold station close behind
      it for a few seconds and its mechanic leans out and mends the car on the move. *Gamble:*
      seconds spent at its speed, nose to its tail, against health. *Builds on:* the wrench
      pickup, the wide load's escort distance.
- [ ] P8. **Stowaway on a transporter**: a car transporter with an empty top deck and its ramp
      down. Drive up onto it and ride: past a speed camera, a roadblock or a police stretch
      unseen, at the lorry's speed. Drive off the front when ready. *Gamble:* slow and hidden
      against fast and seen. *Builds on:* the ramp (H2), police sight, cameras, roadblocks.
- [ ] P9. **The sleepy lorry**: at night one lorry is drifting across the lanes and back on a
      slow rhythm, its driver nodding. The horn wakes him and he holds his lane for a while.
      *Gamble:* time the pass on the drift, or spend a moment on the horn first. *Builds on:* the
      player's horn (which does little today), the caravan's sway, the night themes.
- [ ] P10. **Unmarked police car**: one ordinary-looking car in the traffic is police, with a
      tell (twin aerials, plain steel wheels, a driver in a cap). Passing it over the limit, or
      doing anything Evil in its sight, starts a chase. *Gamble:* the player who spots the tell
      slows for that one car and no other. *Builds on:* police, cameras' limit, the radar
      detector (which could ping it).
- [ ] P11. **Motorbike couriers**: bikes filtering between the lanes from behind, faster than
      the traffic. Changing lane across one knocks it off (standing lost, a knock). They are
      also the only thing moving in a jam, and they show where the gaps are. *Gamble:* fewer
      lane changes, or look first. *Builds on:* the rickshaw's agility, pelotons.
- [ ] P12. **Wedding convoy**: a line of cars in ribbons, horns going, throwing confetti that
      hangs in the air and hides the road just behind them. Cutting through the convoy costs
      standing; a care package thrown to the lead car earns a good deal of it. *Gamble:* the
      long way round a slow, wide convoy or straight through its confetti. *Builds on:* funeral
      processions, convoys, care packages.
- [ ] P13. **Combine harvester**: on a farm road at harvest a combine fills the road and half
      the shoulders, throwing chaff out of the back. Its driver pulls onto the field at each
      gateway to let the queue by, if there is a queue: with no one behind the player, he does
      not. *Gamble:* through the stubble field beside it (rough, slow, unpoliced) or wait for a
      gateway. *Builds on:* tractors, wide load, mud.

The orchestrator's view (before P1 was cut down to a simple traffic event and P2 dropped, at the
owner's word): P1 was the best of these by some way. P7 and P8
are the freshest: other road users as something to use, not to avoid. P9 gives the horn a job.

## Car ideas lot: 30 models (assigned, agent 13)

Asked for by the owner on 10-Oct: "a list of 30 generic name/car models, and a real life vehicle to
base it off. Then have an agent make them. Add a tab in the garage for the parking lot of car
ideas." The names are generic on purpose (no maker's or model's name); none repeats a car the game
already has. They are ideas on show, not cars for sale: kept out of the garage's own list, so
saved progress and the balance of the tiers are untouched.

| # | Id | Name in the game | Based on | What makes it recognisable |
|---|---|---|---|---|
| 1 | `bubble` | Bubble Car | BMW Isetta | Egg shape, the whole front is the door, narrow rear track |
| 2 | `threewheeler` | Three-Wheeler | Reliant Robin | One front wheel, wedge nose, tall cabin |
| 3 | `tinsnail` | Tin Snail | Citroën 2CV | Arched roofline, roll-back canvas roof, separate round headlamps, skinny wheels |
| 4 | `bug` | People's Bug | Volkswagen Beetle (Type 1) | Dome roof, separate rounded wings, sloping tail with engine vents |
| 5 | `twostroke` | Two-Stroke Saloon | Trabant 601 | Small boxy two-door, little tail fins, pale pastel paint |
| 6 | `brickestate` | Brick Estate | Volvo 240 estate | Square everything, long flat roof, big bumpers |
| 7 | `woody` | Woody Wagon | 1949 Ford "Woody" wagon | Wood-panelled sides, split windscreen, surfboard on the roof |
| 8 | `stately` | Stately Saloon | Rolls-Royce Silver Shadow | Tall upright chrome grille with a mascot, long bonnet, two-tone paint |
| 9 | `limo` | Stretch Limo | Lincoln Town Car stretch limousine | Very long, many side windows, boomerang aerial |
| 10 | `milkfloat` | Milk Float | Smith's / Wales & Edwards electric milk float | Open sides stacked with crates, flat cab, tiny wheels, slow |
| 11 | `pony` | Pony Car | 1965 Ford Mustang fastback | Long bonnet, short deck, fastback roof, triple tail lamps |
| 12 | `splitwindow` | Split-Window Coupe | 1963 Chevrolet Corvette Sting Ray | Pointed nose, pop-up lamps, split rear window, side pipes |
| 13 | `snake` | Snake Roadster | AC Cobra 427 | Open two-seater, fat rear arches, oval mouth, roll hoop, twin stripes |
| 14 | `rearengine` | Rear-Engine Coupe | Porsche 911 (classic) | Round lamps on raised wings, sloping teardrop tail, whale-tail spoiler |
| 15 | `wedge` | Wedge Supercar | Lamborghini Countach | Flat wedge, scissor doors, huge rear wing, wide rear tyres |
| 16 | `gullwing` | Stainless Gullwing | DeLorean DMC-12 | Bare brushed-metal body, gullwing doors, louvred rear window |
| 17 | `centreseat` | Centre-Seat Hypercar | McLaren F1 | Low cab-forward bubble, central driving seat, roof air scoop |
| 18 | `pandacoupe` | Panda Coupe | Toyota Sprinter Trueno AE86 | Two-tone white over black, pop-up lamps, boxy hatch |
| 19 | `midnight` | Midnight Coupe | Nissan Skyline GT-R (R34) | Square shoulders, four round tail lamps, tall rear wing |
| 20 | `rallywedge` | Rally Wedge | Lancia Stratos | Very short, wraparound visor windscreen, roof spoiler, bank of spot lamps |
| 21 | `safari` | Safari Wagon | Land Rover Defender 110 | Flat aluminium panels, roof rack and ladder, spare wheel on the bonnet, snorkel |
| 22 | `widetruck` | Wide Truck | AM General Hummer H1 | Extremely wide and low for a truck, slot grille, flat windscreen |
| 23 | `polytruck` | Polygon Truck | Tesla Cybertruck | One peaked triangle of flat steel, light bar front and back |
| 24 | `monster` | Monster Truck | Bigfoot (Ford F-250) | Pickup body on enormous tyres, visible suspension, flags |
| 25 | `corrugated` | Corrugated Van | Citroën H Van | Ribbed sides, snout of a bonnet, tall square body |
| 26 | `foodtruck` | Food Truck | Grumman Olson step van | Serving hatch with an awning, menu board, roof vent |
| 27 | `motorhome` | Motorhome | Winnebago Brave (1970s) | Slab-sided box with a coloured stripe, big windscreen, roof air-conditioner |
| 28 | `schoolbus` | School Bus | Blue Bird conventional school bus | Yellow, bonnet out front, black stripes, stop sign arm, roof lamps |
| 29 | `doubledecker` | Double Decker | AEC Routemaster | Two decks, open rear platform, half-cab beside the engine |
| 30 | `fireengine` | Fire Engine | American LaFrance pumper | Red, ladder on top, hose reels and pump panel, light bar |

- [x] The 30 models, in a state-free file of their own: `render/ideaModels.js` (`IDEA_MODELS`), in the
      conventions of `render/models.js` (it has helpers of its own: those of `models.js` are not exported).
      Eleven move: the three-wheeler rocks, the tin snail sways, the two-stroke smokes, the milk float's crates
      rattle, the split-window's and the panda's lamps pop up, the wedge's and the gullwing's doors open, the
      monster truck rocks with its flags flying, the food truck's vent spins, the school bus's stop arm swings
      out and its lamps flash, the fire engine's lights flash. Checked: `node --check`, `.bundle-check.mjs`.
- [x] A table of the 30 (name, what it is based on, size, colours for Good and Evil, a line about it):
      `ideas.js` (`IDEA_CARS`), no rendering imports. Sizes are the real vehicle's (the monster truck is 3.1 m
      wide, the school bus 10.8 m long). None is in `CARS` or `CONFIG.vehicles`; no check script counts them.
- [x] A "Car ideas" tab in the garage: a second lot where they are parked, to look at, with the Livery button
      working: `render/ideaslot.js`, with small edits in `render/garage.js`, `main.js` (one line),
      `delivery/index.html` (the "Garage" title is now two tab buttons) and `menus.css`. Three rows of ten
      bays (the ten longest in a deeper back row), each idea's name painted in front of its bay, a hoarding
      and CAR IDEAS signs behind; hover or tap for name, "Based on", size and note; Sort, Show, the bank and
      the comparison card are hidden on this tab; the button reads "An idea, not a car yet" and is disabled.
      The garage always opens on its own lot. `?garage&tab=ideas&look=<id>` / `&hover=<id>`. Seen in stills
      (desktop, Evil livery, a 520 px wide phone shape, and the garage's own lot unchanged). NOT verified:
      nothing clicked, dragged or tapped by hand: the tab buttons, scrolling and the pointer's hover are
      untested beyond their address-bar equivalents.
- [x] A picture of each, looked at and corrected until it reads as what it is based on: every model looked
      at from three sides (`&studio=<ids>&views=3`), then again singly; corrected after looking: the bubble
      car (rebuilt as an egg with a flat door), the bug (wings, lamps, windscreen), the two-stroke (rear
      pillars), the pony car (nose), the split-window (nose and tail drawn to blades), the motorhome (its W
      was an M). Weakest: the Split-Window Coupe (reads as a sixties sports coupe, not unmistakably a Sting
      Ray), the Midnight Coupe (a boxy coupe with a wing until its tail lamps are seen) and the Two-Stroke
      Saloon (a generic little saloon). Evil liveries seen once each, not tuned.

## More cargo: 40 ideas (draft, not assigned)

Drafted by the orchestrator on 10-Oct at the owner's request. None is built. The game has ten now
(Good: tower of pizzas, wedding cake, goldfish, gift-wrapped cactus, grandfather clock; Evil:
ticking parcel, porcupine, crate of bees, cursed doll, specimen jar). The same pattern is kept:
a Good item has some charm and one small idle animation; an Evil item has three states that read
at thumbnail size, calm at the start, agitated at half the clock, furious for the last fifth.
"Fits" is a level or theme it would suit.

### Good: 20 ordinary things, none of them a plain box

| # | Item | Idle animation | Fits |
|---|---|---|---|
| C1 | Tray of coffees | Four cups in a holder; steam curls, one lid rattles | City, Rush hour |
| C2 | Bunch of balloons | Tied to a weight, bobbing and tugging at their strings | Suburbs, Christmas |
| C3 | Birthday present with a huge bow | The bow's tails flutter; something inside makes it hop now and then | Suburbs |
| C4 | Bouquet in a vase | Flowers nod; a petal falls and a new one grows back | Farm, Market Town |
| C5 | Stack of pancakes | Wobbles; syrup drips slowly down the side | Back Roads |
| C6 | Ice-cream sundae | The cherry slides, stops, slides back up; melting drips | Beach, Hurricane |
| C7 | Sushi boat | The little wooden boat rocks; a piece slides and returns | Tokyo, Hong Kong |
| C8 | Tiered tea set | Cups chatter on their saucers; the pot's lid lifts with a puff | Canberra, Market Town |
| C9 | Record player | The record turns, the arm bobs, notes float off | The Hood, Night Drive |
| C10 | Lava lamp | Blobs rise and sink | Night levels |
| C11 | Snow globe | A tiny village inside; the snow swirls and settles | Stelvio, Christmas, Mountain Pass |
| C12 | Potted bonsai | Leaves shiver; a tiny bird hops along a branch | Tokyo, Singapore |
| C13 | Puppy in a basket | Ears flop, tail wags, head tilts | Suburbs, Farm |
| C14 | Canary in a cage | Hops between perches; the cage swings | Oh Mine! (the mine), Hong Kong |
| C15 | Bowl of ramen | Steam rises; the chopsticks lift a noodle and drop it | Tokyo, Night levels |
| C16 | Globe on a stand | Spins slowly, tilts, spins back | Airport, Canberra |
| C17 | Trophy | Gleams; a star of light travels round the rim | Big Business, the circuits' menus |
| C18 | Surfboard with a ribbon | Leans and rocks like a see-saw on its fin | Grand Pacific, Beach |
| C19 | Tool box, open | Spanners rattle in their trays; the lid creaks | Construction, Quarry Run |
| C20 | Telescope on a tripod | Swings round to look at things; the lens glints | Asteroid Run, Mountain Pass |

**Built (Agent 15, branch `delivery-cargo-good`):** all twenty, in `render/cargoModelsGood2.js`, on the cargo page and in the default rotation (no level JSON edited).

- [x] C1 to C20 built: ids `coffee`, `balloons`, `present`, `bouquet`, `pancakes`, `sundae`, `sushi`, `teaset`, `record`, `lavalamp`, `snowglobe`, `bonsai`, `puppy`, `canary`, `ramen`, `globe`, `trophy`, `surfboard`, `toolbox`, `telescope`.
- Looked at: every one as a still on the cargo page (scratchpad `shots-cargo-good/sheet.png`, and `p1` to `p4`, `q1`); pancakes, record player and puppy in the HUD corner; record player and telescope at the kerb. Stills only: none has been seen moving.
- Departures from the table: C18 the surfboard stands on its tail in a heap of sand and rocks from side to side (lying on its fin it was a sliver at thumbnail size); C14 the cage rocks on its base, it does not hang.
- `CARGO.good` was reordered so every item turns up under the default rotation (places 6 and 15 fall on levels that name their own, so goldfish and wedding cake, which levels name, sit there).

### Evil: 20 things nobody should be driving about with

| # | Item | Calm | Agitated (half the clock left) | Furious (a fifth left) | Fits |
|---|---|---|---|---|---|
| C21 | Egg in a nest | A large speckled egg, rocking a little | Cracked, an eye at the crack | Hatched: a furious little dragon (or goose) flapping in the shell | Farm, Safari |
| C22 | Pressure cooker | Hissing gently | Lid rattling, valve whistling, steam jets | Red hot, lid bouncing, about to go | City, Mumbai |
| C23 | Venus flytrap | Jaws shut, swaying | Jaws open, tracking things, drooling | Snapping in every direction, straining out of its pot | Mystery Meadows, Safari |
| C24 | Barrel of toxic waste | Sealed, a soft green glow | Lid bulging, ooze down the side | Lid off, bubbling over, a tentacle of slime | Construction, Oh Mine! |
| C25 | Haunted mirror | An ordinary mirror | A face in it that is not yours | Hands coming out of the glass | Night Drive, All Heck |
| C26 | Skunk in a carrier | Asleep | Awake, tail up through the bars | Stamping, a green cloud | Back Roads, Farm |
| C27 | Cannonball with a fuse | A black ball, fuse unlit | Fuse lit, short sparks | Fuse nearly gone, rolling about by itself | Battlefield, Passage du Gois |
| C28 | Mimic chest | A treasure chest | Lid lifts on a row of teeth, a tongue | Running in circles on stubby legs, snapping | All Heck, Mystery Meadows |
| C29 | Beehive piñata of fireworks | A bundle of rockets, tied | One fizzing | Rockets going off in turn, the bundle spinning | Christmas, Hong Kong |
| C30 | Baby alien in an incubator | Curled up, a slow pulse of light | Awake, hands on the glass, the light quickening | Glass cracked, antennae out, the whole thing levitating | Asteroid Run, Airport |
| C31 | Possessed teddy bear | Sitting, button eyes | Head turned all the way round | Standing, eyes red, holding its own stuffing | Suburbs, Night Drive |
| C32 | Cage of bats | Hanging asleep | A few awake, eyes glowing | All of them battering the bars | Night levels, tunnels |
| C33 | Ice block with something in it | A frosty block, a shape inside | Dripping, the shape has moved | Shattered open: a thawed, cross yeti cub (or caveman's arm) | Stelvio, Mountain Pass |
| C34 | Sack of snakes | A tied sack, shifting | Heads poking through holes | The neck come undone, snakes spilling | Safari, Mumbai |
| C35 | Bottle with a genie | A corked bottle, smoke inside | Cork wobbling, a face in the smoke | Cork out, an arm and a scowl coming out | Mumbai, Hong Kong |
| C36 | Unstable reactor core | A canister, steady blue rings | Rings spinning fast, turning yellow, alarms | White hot, arcs of lightning, humming upward | Big Business, Construction |
| C37 | Angry goose in a crate | A crate with a beak hole, quiet | Head out, hissing | Out of the crate entirely, wings wide | Farm, Canberra |
| C38 | Jack-in-the-box | Closed, the handle turning by itself | Lid twitching, the tune speeding up | Sprung: a leering clown lunging on its spring | Christmas, Suburbs |
| C39 | Thundercloud in a jar | A small grey cloud | Dark, rumbling, flickers of light | Lightning cracking the glass, rain inside | Hurricane, Mumbai |
| C40 | Piranha tank | Fish idling | Circling fast, the water churning | Leaping out, snapping, water everywhere | Passage du Gois, the amphibious levels |

- [x] **C21 to C40 built** (agent 16, branch `delivery-cargo-evil`): all twenty, in
  `render/cargoModelsEvil2.js`, listed in `CARGO.evil` (ids egg, cooker, flytrap, barrel, mirror,
  skunk, cannonball, mimic, fireworks, alien, teddy, bats, ice, snakes, genie, reactor, goose, jack,
  cloud, piranhas). The egg hatches a dragon; the ice holds a yeti cub. No level names one yet: the
  rotation by menu position hands them out. Looked at: every one in all three states as stills of the
  cargo page (two moments each), and the mirror, genie and thundercloud in the HUD corner. Nothing
  was seen moving.

### Notes for whoever builds them

- **Pairs that suit a level** (one Good, one Evil, as each level carries): snow globe and ice block
  (Stelvio); canary and toxic barrel (Oh Mine!); sushi boat and fireworks (Hong Kong); telescope
  and baby alien (Asteroid Run); puppy and skunk (Farm); ramen and cage of bats (Night Drive);
  surfboard and piranha tank (the amphibious levels); tool box and reactor core (Construction).
- **Cheapest to build first** (shapes the game mostly has): pressure cooker, cannonball, toxic
  barrel, jack-in-the-box, lava lamp, snow globe, trophy, tray of coffees.
- **Hardest to make read small:** haunted mirror (a flat thing seen at an angle), genie (smoke),
  thundercloud (soft shapes): each needs a strong colour change between states to carry it.
- **Close to ones the game has** (keep apart if both are used): possessed teddy bear and the
  cursed doll; cage of bats and the crate of bees; pressure cooker and the ticking parcel.
- With 50 items, a level's cargo could be picked from two or three that suit it instead of one,
  the same every run by level and side, so replays of a level are not always the same parcel.

## In-game UI improvements (owner, 10-Oct; queued as "Next 0")

The owner's five, in their words, each with what it comes to. None is started.

- [ ] U1. "The level meter takes up too much of the screen, rework it to different style in the
      same corner as the other meters." The progress bar across the top centre goes; the distance
      through the level becomes a compact meter in the top-left block with the clock, tip, busts
      and social standing, in a style of its own (not another long bar). Pause and Exit level,
      which sit under it now, need a new place that is out of the way.
- [ ] U2. "Have a odometer for the danger/shoulder meter instead, have it sit at 0 danger when not
      active." The shoulder's danger timer becomes a dial (a small gauge with a needle, as a car's
      instrument is): always there, resting at 0 while the car is on the road, climbing while it
      is on the shoulder, falling back when it leaves. No element that appears and disappears.
- [ ] U3. "The messages are right in the way of the horizon in both desktop and mobile." Event and
      status messages move off the horizon line, where the road ahead is read: to a strip clear
      of it (low on the screen above the controls, or the top edge), on desktop and on a phone,
      checked against the on-screen buttons, the cargo window and the tank corner.
- [ ] U4. "Some critical messages should stay indefinitely like punctures. I'll let you have the
      judgement call but extract all message times to a config." Every message's time on screen
      comes out of the code into one table in `config.js` (by kind of message). Messages about a
      condition that is still true stay until it ends: a puncture, no brakes, a stalled engine, a
      wanted level, a mystery effect running, being on fire, the wrong way down a road. Which
      ones are "critical" is the builder's call, written down in the table for the owner to edit.
- [ ] U5. "The mystery effect should be written as the pick up status, so the player can remember
      what it was." While a mystery effect runs, the pickup's status line names the effect
      (Earthquake, Giant, Traffic freeze...) with its time left, as a turbo or ghost shows its
      own name, not just "Mystery".

Files this will touch: `render/hud.js`, `delivery/index.html`, `style.css`, `render/touch.js`
(the phone layout), `messages.js` and `messages.json` (the times), `config.js`, `player.js` or
`mysteries.js` (the effect's name for the status). To be checked in screenshots at 1100x650 and
520x900, in a level with every meter showing at once.

## Level progression rework (owner's spec, 10-Oct; queued, not started)

### The spec, in the owner's words

> Divide levels into groups of 5.
> Each star tier gets 5 levels.
> 1/2/3/4/5 then blue 1/blue 2/ etc
> Each level will have a ribbon for beating it. The left half of the ribbon is Good and the Right half is evil.
> When playing a level without that half of the ribbon earned, the player is only allowed to use cars from EXACTLY that tier. No tiers lower or higher, no tiers from another coloured stars. When beating the level on evil this way, the player can replay it in any (evil) car.
> The progression will be as follows:
> When a tier is unlocked, the first two levels are unlocked
> Level 3 requires 1 ribbon (any two halves)
> Level 4 requires 2 ribbons (any 4 halves)
> Level 5 requires level 4 to be beaten (any half)
> Beating Level 5 unlocks the next tier
> For levels with no good/evil option, it awards a full ribbon

### As a checklist

- [ ] R1. Levels in tiers of five: gold 1, 2, 3, 4, 5, then blue 1, 2, 3, 4, 5. Ten tiers, fifty places. The menu's groups become the tiers, each headed by its stars.
- [ ] R2. A ribbon on every level: the left half earned by beating it as Good, the right half as Evil. A level with no choice of side (the Battlefield, an "always Good" level) gives the whole ribbon at once. Shown on the level's card, and counted per tier.
- [ ] R3. The car rule: on a level whose half-ribbon for the side being played is not yet earned, only a car of exactly that tier may be driven: same number of stars, same colour of stars. Once that half is earned, the level can be replayed on that side in any car.
- [ ] R4. Unlocking inside a tier: levels 1 and 2 open with the tier; level 3 needs two half-ribbons in the tier; level 4 needs four; level 5 needs level 4 beaten on either side.
- [ ] R5. Beating level 5 on either side opens the next tier (its first two levels).
- [ ] R6. Saved progress carried over: a best time already saved on a side becomes that half of the ribbon; tiers and levels open accordingly, so nobody loses what they had.
- [ ] R7. The menu and garage say why: a locked level says what it needs ("2 more half-ribbons in this tier"); a level that restricts the car says which tier, and the garage marks the cars that qualify.
- [ ] R8. Checks: the unlock rules, the car rule on both sides, old saves, and that no player can be left with no way forward.

### What the spec does not settle (to be answered before it is built)

**Answered by the owner (10-Oct): "Leave the Special and Amphibious levels outside of the progression system."** So the tiers are made of the 31 main levels only; specials and amphibious levels keep their own groups and have no ribbon rule or car rule. That settles most of 1 and 2 below. Still open: the races (assumed outside too, on their own tab); 31 levels make six tiers of five and one over, against ten tiers (gold 1 to 5, blue 1 to 5): which levels go in which tier, and what fills the blue tiers; 3 (owning a car of the tier); 4 (Blue 4 has no cars).

1. **Which level goes in which place.** The game has 31 main levels, 9 specials, 5 amphibious
   levels and 6 races: 51 against 50 places. Do the races keep their own tab outside the tiers
   (leaving 45 for 50 places, so five short)? Where do the specials and the amphibious levels go?
2. **Levels that bring their own vehicle** (Asteroid Run's UFO, Oh Mine!'s jetboat, the
   Battlefield's 8x8, the races' F1 / GT / LMP) and the **amphibious-only levels** cannot obey
   "exactly that tier's cars". Are they outside the tiers, or exempt from the car rule?
3. **Having a car of the tier.** The player must own one to play at all. Gold 1 has the free
   Commuter; every other tier's cheapest car costs money (gold 2: $130, blue 1: $270, blue 5:
   $1,200). If the tips from a tier do not cover the next tier's cheapest car, the player is stuck.
   Is the cheapest car of a new tier lent or given, or must the tips be made to cover it?
4. **Blue 4 looks empty.** Reading `cars.js` finds Blue Star cars at 1, 2, 3 and 5 stars and none
   at 4 (to be confirmed by the builder). A tier with no cars cannot be played under the car rule.
5. **Cars with no tier, or their own:** the Tank, the City Bus, the 6-star earned cars, the
   amphibious cars (sea-green stars, 1 to 5), Super cars lent by a mystery. Assumed: none of them
   may start an unribboned level; a mystery may still lend one mid-run.
6. **"Beating" a level:** assumed to mean delivered on time, as "Deliver it on time to open the
   next" means today; a late delivery earns nothing.
7. **The Blue Star season** opens today after level 20. Under this spec it opens by beating gold
   5's fifth level: assumed to replace the old rule.
8. **Medals** (bronze, silver, gold by time to spare, added today) are kept beside the ribbons:
   assumed.
9. **The half-ribbons that count** towards levels 3 and 4: assumed to be those earned in that
   tier only, not across the game.

## Menu UI (owner, 10-Oct; agent 18, branch `delivery-menu`)

The owner's words: "Rework the UI to be more game like than a webpage. Have a place for a level
description, unique for both Good and Evil. The gimmicks list should be moved to a button where
clicking it gives you a card showing the 3d models (gimmicks page) of all the gimmicks in the level,
pick ups and traffic."

- [ ] M1. The start screen reworked to feel like a game's menu, not a web page: a composed screen
      (a level-select stage with the picked level shown large, the car and side as part of the
      scene, proper game buttons with states and sound, movement between screens), in place of a
      scrolling page of cards and rows of grey buttons. Works with mouse, keyboard and touch, on
      desktop and on a phone. It stays strictly a menu, with no page reloads.
- [ ] M2. A level description on the menu, written twice for every level: one for Good, one for
      Evil, each in that side's voice, shown for the side picked.
- [ ] M3. The gimmick chips leave the level card; a button opens a card for the level showing the
      3D models (the ones the Gimmicks page draws) of everything in it: its gimmicks, its
      pickups and its traffic, each named, with a line on what it does.
- To keep in mind while building: the level progression rework (the section above) will put
  levels in tiers of five with a two-halved ribbon on each and a car rule per tier; the new menu
  should have a place for those, though the rules themselves are a separate job.
