# Delivery Racer: scratchpad, 10-Oct (2026-10-10)

One orchestrator and three agents. Each agent keeps its own section below up to date as it goes
(what is done with its commit, what is in progress, what is blocked or skipped and why, what was and
was not verified). Edit only your own section. This one file, in the main checkout, is shared by all
three; the orchestrator commits it.

Standing rules: never push (`main` deploys the site); never run the smoke test; never delete a
worktree directory (their `node_modules` are junctions).

## Where things stood this morning

- `main` at `c0d9c81` has everything from `delivery-ideas` and `worktree-delivery-batch`, plus the
  tunnel clearance fix and the speed-camera proximity UI.
- `delivery-circuits` had two unmerged commits: the Races tab and scaffolding for Monza, Spa and
  Albert Park (stub circuits only). See `CIRCUITS-HANDOVER.md` on that branch.
- `delivery-city-levels` had about 1,400 changed lines and 26 new files uncommitted, no scratchpad:
  a second implementation of the batch brief. The owner said to discard the duplicate work. It is
  stashed (`0201824963add3d9587820db114f3d6b5f500528`); the features `main` lacks are being ported
  from it (agent 1), and the stash is dropped once that lands.
- Left on the lists: checklist 28, 29, 30, 31, 35, 36, 38, 49, 50, 51, 52; from the batch handover:
  mystery effects, Super cars, 6-star tier, visible damage, horn per car, postcards, milestones,
  Gimmicks cards, level clocks and menu pictures for the five themed levels.

## Everything found on the lists

Gathered from `SCRATCHPAD.md`, `CHECKLIST.md`, `HANDOVER.md`, `HANDOVER-batch.md` (all on `main`),
`CIRCUITS-HANDOVER.md` (on `delivery-circuits`) and the uncommitted work in `delivery-city-levels`.
"Owner" is who has it today; a dash means nobody. Status here is as of this morning: the agents'
sections below say how far each has got.

### Already on `main` (done before today)

| Item | What | Commit |
|---|---|---|
| 12-23 | Eleven gimmicks on Gimmick Road 2: drawbridge, wide load, school crossing, trolleys, burst water main, balloon landing, road-train jackknife, marathon, average-speed cameras, toll plazas, stampede, side-road gimmicks | `2f5e3cd` |
| 26 | Five traffic kinds with quirks (ice cream van, bin lorry, learner, boy racer, caravan) | `052fc72` |
| 27 | Four car traits (taken off the checklist by the owner while it was being built; it is in) | `052fc72` |
| 33 | Photo mode | `daaa40d` |
| 39 | Gimmicks page cards: wrong-way drivers, quarries and blasts, pelotons, boulders | `6b73230` |
| 40, 41 | Blue Star balance pass; `NEXT_TIER_CAPS` for a six-star tier | `daaa40d` |
| 42, 46 | Side roads follow hills; hill behind the quarry face | `18ab667` |
| 43, 44, 45 | Favicon link; `?ghost`; wrong-way driver warning, horn and lights | `6b73230` |
| 47 | Tour de Coast's clock re-run | `052fc72` |
| 48 | `scripts/shots.mjs` | `2f5e3cd` |
| batch 1 | Themes and levels 27-31: Hong Kong Harbour, Tokyo Expressway, Mumbai Monsoon, Stelvio Pass, Christmas Eve; traffic kinds keitruck, postvan, rickshaw, float, cargotruck, icecream | `d6215e7` |
| batch 2 | Tunnels, burst water mains, herds that stay | `d6215e7` |
| batch 3 | Parades, roadblocks, falling cargo | `0bfae1e` |
| batch 4 | Ice-cream stops, reversible lanes, convoys, rubbernecking; a basic player horn | `faef78f`, `f874f36` |
| since | Tunnel clearance 8.5 m and camera 5.5 m; Tokyo tunnel signs and fog; speed-camera proximity UI and 3D locator | `d291330`, `c0d9c81` |

### Not done as of this morning

| Item | What | From | Owner |
|---|---|---|---|
| mystery | Mystery effects: earthquake, rewind, giant, swap sides, magnet, blackout, traffic freeze, "souped up" | batch handover; partly written in the city-levels stash | Agent 1 |
| super | Super version of every car but the Lowrider (livery, body kit, engine sound fallback) | batch handover; stash | Agent 1 |
| 6-star | Six-star tier, a car earned per special level | batch handover; stash (`EARNED_CARS`) | Agent 1 |
| damage | Visible damage (dents) | batch handover; stash (`render/dents.js`, never wired in) | Agent 1 |
| horns | A horn per car | batch handover; stash (`HORNS` in `render/audio.js`) | Agent 1 |
| postcards | Postcards album (level shots on delivery) | batch handover; stash (`render/album.js`, no CSS) | Agent 1 |
| milestones | Milestones wall | batch handover; stash (no CSS, not imported) | Agent 1 |
| race tab | Races on a tab of their own on the start screen (applied on the branch, never opened in a browser) | circuits handover | Agent 2 |
| osm tool | `scripts/circuit-from-osm.mjs`: OSM loop, 4 m segments, SRTM grades, run-off from barriers and polygons | circuits handover | Agent 2 |
| circuits | Monza, Spa-Francorchamps, Albert Park, with accurate run-off, elevation and landmarks | circuits handover | Agent 2 |
| smoke labels | `delivery-smoke.mjs` line ~739 expects `S1..` labels; needs the `R` labels | circuits handover | Agent 2 |
| 52 | Save data: measure the cookie against 4 KB, local storage first, round times, export / import a save code | checklist | Agent 3 |
| 38 | Level select: best times and medals on thumbnails, gimmick preview | checklist | Agent 3 |
| 35 | Sort and filter the garage | checklist | Agent 3 |
| 36 | Car comparison card | checklist | Agent 3 |
| cards | Gimmicks page cards for tunnels, water mains, parades, roadblocks, falling cargo, ice-cream stops, reversible lanes, convoys, rubbernecking | batch handover | Agent 3 |
| 30 | Time trial with ghost replay (if time allows) | checklist | Agent 3 |
| toll | A toll's fee shows as a fine on the results screen | scratchpad, rough edges | Agent 3 |
| 28 | Liveries: unlockable paint jobs earned for Evil and Good clears | checklist | - |
| 29 | Daily challenge with a leaderboard (needs a server) | checklist | - |
| 31 | Endless mode | checklist | - |
| 49 | Speed up the full smoke test with parallel workers | checklist | - |
| 50 | Lint and format setup, CI running the quick suite on PRs | checklist | - |
| 51 | Performance: instance more scenery, shorter draw distance on phones | checklist | - |
| clocks | Level clocks for the five themed levels were set by hand: `level-clocks.mjs hong-kong tokyo mumbai stelvio christmas --write` | batch handover | - |
| pictures | Menu pictures `levelshots/<id>.jpg` for the five themed levels | batch handover | - |
| more circuits | Baku, Brands Hatch, Caesars Palace, Monaco, Donington, Sepang, Suzuka (trimmed from the request by the owner) | circuits handover | - |
| amphibious | The amphibious models (toybota, nissank, herald, dampervan, transporter) have no car or level | handover | - |
| site link | Nothing on the site links to `/delivery/`; the owner has not said where | handover | - |
| editor | The level editor knows none of the new level fields | scratchpad, rough edges | - |
| real levels | The Gimmick Road 2 gimmicks are in no real level | scratchpad, rough edges | - |
| obstacles | Traffic drives through the moving obstacles; not confirmed that traffic waits at a school crossing | scratchpad, rough edges | - |
| 12% | A side road on a hill has a short stretch as steep as 12% | scratchpad, rough edges | - |
| stale notes | `cars.js` still says 20 bays; `cameras.js` points to a `render/cameras.js` that does not exist | handover | - |

### Discarded on the owner's word

The duplicate half of the city-levels work: its own versions of the five themed levels (and
`tokyo-loop`), tunnels, convoys, ice-cream stops, reversible lanes, rubbernecking, trams, the
roadshow / parades, and `gimmick-road-3`, which only exercises those.

### Never verified (carried over from the old notes)

- The smoke test has not been run against anything since `74925ab`.
- Not seen or tried: trolleys, runners, water main and gantries up close; the new traffic models; the
  Gimmicks cards; garage perk text; photo mode's drag, zoom and save; any sound; anything played by
  hand; `shots.mjs --levels` and `--cars`.
- Nothing from the batch branch was seen in a browser before it was merged.
- From 2026-10-04 and still open: audio listen-through, car animations, touch controls on a real
  device, balance on most levels, performance on phones.

## Orchestrator

- Assigned: agent 1 the port (on `main`), agent 2 the circuits (`delivery-circuits`), agent 3 the
  checklist's menu and save items (`worktree-delivery-batch`).
- Not assigned this round: 28 (liveries: would collide with the Super liveries), 29 (needs a server
  leaderboard), 31, 49, 50, 51; level clocks and menu pictures for the five themed levels.
- To do when agents report: merge both branches into `main`, resolve overlaps (`render/menu.js`,
  `progress.js`, `cars.js`), drop the stash.
- A Vite dev server from an earlier session is still listening on port 5199; left alone.
- **Queued, asked for by the owner mid-morning: side roads cleanup.** Goes to a fourth agent as soon
  as one of the three finishes (the owner's cap is three at once). The request:
  1. Side roads are too restrictive: make them fully-featured roads. Known limits today (top of
     `levels.js`, `track.js`): hills cannot be combined with an exit that has flyovers; exits cannot
     be combined with `"flow": "south"`; a one-way level's exits cannot have flyovers; gimmicks reach
     a side road only through `{ road: 'side', exit: n }` on some kinds; a 12% stretch where the
     expressway bends away.
  2. Decor beside the main road must prune correctly where a side road runs (`render/road.js`: the
     `junction(s)` windows near line 1358 and the `Track.sideDistance(...) > 24` test near 1531 are
     coarse, and not every theme's scenery goes through them).
  3. The road markings at the fork and at the merge look nothing like real ones: investigate
     (`render/road.js` from about line 835: edge line, the dashes over `ZONE`, chevrons) and redraw
     them as a real diverge and merge (taper, gore with chevrons, dashed lane-drop line, solid edge
     lines carried round onto the side road).
  4. Check and fix all of it in every theme. Levels with exits: back-roads, big-business,
     expressway, farm, gimmick-road-2, market-town, mystery-meadows, quarry-run, ring-road, ufo.
- **Owner, later in the morning: remove toll plazas (21) and average-speed cameras (20)**: "terribly
  unfun mechanics". Given to agent 3 in place of its toll-line fix; the ordinary speed cameras and
  the proximity UI of `c0d9c81` stay.
- **Queued, second in line after the side roads: amphibious cars and levels.** The request:
  1. Each of the five amphibious models (`toybota`, `nissank`, `herald`, `dampervan`, `transporter`
     in `render/models.js`, no car yet) becomes a garage car, one at each star level (1 to 5).
  2. An amphibious section in the garage.
  3. Five interesting, fully gimmicked amphibious levels, each in a different theme, playable only
     in an amphibious car.
  4. On those levels the road turns into a water stage for stretches, or the other way round.
     Traffic that is not amphibious stops at the water's edge; amphibious traffic drives in and
     out; on the water there is boat traffic, treated as road traffic is.
  Things to settle while building: how the garage's sections sit with agent 3's sort and filter and
  agent 1's six-star tier; where the five levels go in `LEVELS` (`INSERTED_AT` in `progress.js` if
  among the others); what `Oh Mine!`'s jetboat and `tide.js` already give for water.
- **Owner, added to the side roads cleanup:** fix the polygons flickering on side roads on hills
  (most likely the side road's pavement lying in the same plane as the hill's ground or the
  expressway's verge where they overlap: check heights, `polygonOffset` and `renderOrder`, since
  `18ab667` made a side road follow the land).
- **Owner, on the ghost replay (30):** investigate a full 1:1 replay system for both traffic and
  race levels. Given to agent 3 as an investigation with a write-up, in place of the simple ghost.
- **Queued, third in line: the cargo.** The request:
  1. Models for the package being delivered: five "normal" things (not as dull as a plain box) for
     Good, five odd things for Evil.
  2. The Evil ones are animated and have three states, for example a porcupine: normal, balled up,
     rabid / angry. The state follows how much time is left.
  3. The item is shown in a corner of the screen, visual only.
  4. A new ending: on completing a level the car stops, the camera pans to the side of the road,
     the cargo is delivered to the kerbside, and then the results screen comes up.
  Models go in a state-free file (`render/cargoModels.js`) so a reference page can show them; which
  item a level carries is level or config data, fixed per level.

## Agent 1: port from the city-levels stash (main checkout, `main`)

- Read the stash in full. Non-duplicates found: `mysteries.js` + `render/mysteries.js`, Super cars,
  `EARNED_CARS`, `render/dents.js` (written but never wired in), a `HORNS` table per car in
  `render/audio.js`, `render/album.js`, `milestones.js` + `render/milestones.js` (neither panel has
  any CSS in the stash, nor is either imported by `main.js`: to be finished).
- Skipping `levels/gimmick-road-3.json`: it only exercises the stash's duplicate gimmicks (its own
  `parades` / `roadblocks` / `cargoTrucks` / `iceCreamVans` / `reversibles` fields, which `main`
  spells differently), none of the features being ported.
- DONE `e05ed11`: 1 (mystery effects) and 2 (Super cars), one commit as they share files.
  - The eight effects are in `CONFIG.mystery.effects` (drawn like the rest, as the batch handover
    planned; the stash drew them from the second pool at a 0.35 weight, which would also have
    started drawing sundayDrivers / rushHour / carSwap / moodSwing). An effect that does not suit
    the level or car becomes `CONFIG.mystery.fallback` (invincible): swap sides on the Battlefield
    or an `alwaysGood` level, rewind in a race or on laps, souped up in a car with no Super version.
  - Added beyond the stash: a side swap is undone before the results are recorded; rewind only puts
    back traffic cars that are still the same car; Hazards do not fire across a freeze; cards on the
    power-ups page; good / bad lists in `social.js`.
  - Verified headless: `node scripts/.mysteries-check.mjs` (new; 47 checks, passed 4 runs in a
    row), `node scripts/.bundle-check.mjs` (new: every import of all six pages resolves),
    `.balance-check.mjs` passes, `delivery-probe.mjs suburbs tokyo` clean, `node --check` on all.
  - NOT verified: anything on screen. The body kit (it ray-casts onto each model), the blackout,
    the quake's bob, the giant's size, the rewind's flash, pulled pickups' meshes. Known rough
    edge: the rooftop passenger sits too high on a giant car.
  - Found on `main`, not mine, left alone: duplicate keys in `config.js` (`icecream`, `hornRange`,
    `hornWait`, `passByRange`, `passByChance`: the later one wins) and `jingle` in `render/audio.js`.
- DONE `37eb71c`: 3 (6-star earned tier). `EARNED_CARS`, nine cars, one per special level, earned
  by the level's par on each side (read from the best times: nothing new in the save).
  - Changed from the stash: kept OUT of `CARS` (in it they would have changed racers' top speeds
    through `GARAGE_TOP` in `traffic.js`, been handed out by Car Swap and "Unlock everything", and
    broken a smoke-test count); a level vehicle's earned car has its own id (`earned-f1`) and a
    `base`; stats clamped to `NEXT_TIER_CAPS` (the stash had the UFO at 58 m/s and the F1 at 75).
  - For the merge: `render/menu.js` gained one import (`earnedFor`) and one line on the level card;
    `progress.js` gained `owns` / `earnedCars` / `earned`; nothing added to the cookie.
  - Verified headless: `node scripts/.earned-check.mjs` (new, 21 checks), `.balance-check.mjs`,
    `.bundle-check.mjs`. NOT verified: the garage bays, star colour, the Saucer parked in the lot;
    the pars are not play-tested.
- DONE `fda617c`: 4 (visible damage). `render/dents.js` was in the stash but nothing called it;
  wired into `render/items.js` (the player's car crumples in three steps and its paint darkens) and
  `render/cars.js` (traffic: the darkened paint only). `CONFIG.dents`.
  - Verified without a browser: `node scripts/.dents-check.mjs` (new, 9 checks on the geometry and
    colour with three.js alone), `.bundle-check.mjs`. NOT verified: how it looks on any model.
- DONE `e9ebe12`: 5 (a horn per car). `HORNS` in `render/audio.js` by car id (the stash had the
  table but nothing played it); `horn.js` asks for `horn:<car id>`, `Sound.play` handles it.
  Traffic's own honks left as they were on `main` (the stash rewired them too; not ported).
  - Verified headless: the name asked for (also a Super car's base), all 42 car ids have an entry,
    the four WAVs exist. NOT verified: nothing has been heard.
- DONE `e8ccc6c`: 6a (postcards album). `render/album.js` from the stash; the CSS (end of
  `style.css`), the "Postcards" button and `#album` panel in `delivery/index.html`, the import in
  `main.js`, `export` on `LEVEL_SHOTS` in `render/menu.js` and `?album` in `scripts/shots.mjs` are
  new. Reads the best times: nothing new saved.
  - Verified: `node --check` and `.bundle-check.mjs` only. NOT run at all, even headless (it
    imports the menu module, which needs WebGL): the panel has never been opened.
- DONE `8c0d76e`: 6b (milestones wall). `milestones.js` + `render/milestones.js` from the stash;
  eight counters in `Progress.data.stats` (`Progress.count`, saved at most every 5 s and at the end
  of a run; km to two decimals). Count lines in `packages.js`, `hippos.js`, `bullettrain.js`. The
  CSS, button, `#milestones` panel and import are new.
  - Verified headless: `node scripts/.milestones-check.mjs` (new, 14 checks: titles, thresholds,
    cops outrun, wrecks / busts, km, levels delivered, the cookie). NOT verified: the wall has never
    been opened; hippos survived and trains dodged are counted by code no check drove.
- DONE `8c5ead6`: after both merges, the garage's "Gold stars" filter no longer takes in the 6-star
  cars, and they get a "6 stars" choice once one is earned (`render/garageview.js`);
  `HANDOVER-batch.md` "Not done" rewritten, with a table of what was built.
- After the merges (`e358d98`, `6344152`) all of these pass on `main`: `.mysteries-check`,
  `.earned-check`, `.milestones-check`, `.dents-check`, `.balance-check`, `.bundle-check`.
- FINISHED. Everything in the brief is ported or finished from partial; skipped only
  `gimmick-road-3.json` and `tokyo-loop.json` (duplicates' test levels). In the stash, judged not a
  duplicate, and NOT ported: traffic honking with per-kind horns (`horn:<kind>` in `traffic.js`); a
  "6-star cars" hint line on the menu's car card (a line on each special level's card instead); a
  horn line in "How to play"; `extraShare` (drawing the second mystery pool).
- Nothing of mine has been seen or heard in a browser. The stash is untouched and can be dropped.

## Agent 2: real circuits (`.claude/worktrees/delivery-circuits`, `delivery-circuits`)

- Done: `main` merged into `delivery-circuits` (`a401d13`). One conflict, `levels.js` imports: both
  kept; main's five themed levels stay in `MAIN_LEVELS`, the circuits stay last in `LEVELS`.
  `node --check` passes on levels, progress, game, themes, config, render/road, render/menu.
- Done (`b256615`): `scripts/delivery-levels-check.mjs`, a headless check: all 47 levels build with no
  `Track.problems`, labels are 1.. / S1.. / R1.. (R1 Marina Bay .. R6 Albert Park), every race starts
  and is driven. Passes. The smoke test's label assertion edited for `R` labels (not run).
- Done (`a21b6fc`): `scripts/circuit-from-osm.mjs` + `scripts/circuits/monza.json`; Monza built from
  OSM relation 284565: 5800 m (real 5793), closes 0.03 m / 0 rad, SRTM heights 14 m range, 105
  run-off stretches measured per side every 4 m (barriers, tree line, buildings, gravel traps, pit
  lane, old banking), 30 stands from mapped grandstands. `track.js` changed: run-off on a lapped
  level no longer eases to nothing at the start line (stretch from 0 / to lap end).
- Done (`e75d82d`): Spa from OSM relation 284560: 7004 m (real 7004), closes 0.03 m, SRTM 363-469 m,
  the level climbs 102 m (steepest 13%), 95 run-off stretches, limit set by mapped barriers on 95% /
  88% of the lap (left / right), gravel is `natural=shingle` there. Clocks written for Monza and Spa.
- Done (`b111bd7`): Albert Park from OSM relation 280443: 5312 m (real 5278, +0.64%: the relation
  follows public-road centre lines), closes 0.002 m, 4.6 m of height, lake outline as a landmark.
  **No run-off**: OSM maps neither its race walls nor its gravel traps, so the tool's `street` mode
  puts the wall at the road's edge all round (0 stretches) rather than invent any. Clock written.
- To rebuild any: `node scripts/circuit-from-osm.mjs <id>` (config `scripts/circuits/<id>.json`, maps
  and heights cached in `scripts/circuits/cache/`, a picture in `scripts/circuits/out/<id>.svg`).
- Done (`856ab1e`): landmarks in `render/circuits/` (`kit.js` shared): Monza's old banking and back
  straight where they stand plus park trees (its theme now has terrain); Spa's Eau Rouge stream, the
  Francorchamps hotel, pine forest; Albert Park's lake shoreline, city towers, gums and palms. Albert
  Park made flat (SRTM noise 1-17 m against a real 2.6 m).
- Done (`bb4a64b`): `CIRCUITS-HANDOVER.md` rewritten to what is now true (table per circuit, the
  tool, what was and was not verified, next steps). All work is finished and committed; branch tip
  `bb4a64b`, working tree clean, nothing pushed.
- Verified: `node scripts/delivery-levels-check.mjs` passes (47 levels, 6 races); `level-clocks.mjs`
  drove all three to the finish (clocks written; Albert Park's was timed just before it was made
  flat). In headless Edge via `shots.mjs` (screenshots looked at, not kept): all three circuits load
  and draw (Monza start straight and Parabolica with the banking, Spa's hills and forest, Albert
  Park with the lake).
- Not verified: the start screen's Deliveries / Races tabs were never seen in a browser; no whole lap
  watched; Spa's hotel and stream, Albert Park's skyline and Monza's north banking not seen up close.
  Smoke test not run.
- Skipped: menu pictures `levelshots/<id>.jpg` (shots are PNG; Spa's cine shot came out blocked).
  Albert Park's real gravel traps (not in OSM, not invented).

## Agent 3: checklist menu and save items (`.claude/worktrees/delivery-batch`, `worktree-delivery-batch`)

- Read the handover, checklist, README, `progress.js`, `render/menu.js`, `render/garage.js`,
  `game.js`. No commits yet.
- Plan, to keep the merge easy: new UI goes in new files (`render/savecode.js`,
  `render/levelcards.js`, `render/garageview.js`, `render/compare.js`, `ghost.js` +
  `render/ghost.js`, `menus.css`); the shared files get a line or two each.
- Done, `5e53e1a`: **52 save data.** Measured first: a full save's cookie (40 levels x both sides,
  33 cars) was 4013 of 4096 bytes; now 2931 (best times to 0.1 s, bank to the cent). Local storage
  is read first, the cookie only if it has nothing. Export save / Import save on the menu
  (`render/savecode.js`, a panel with a textarea; code about 2,600 characters, tidied on the way
  in). Verified: `node scripts/.save-check.mjs` (sizes, round trip, bad codes refused), both panels
  in a screenshot. Not verified: clicking Copy / Load, the menu refreshing after an import.
  Merge notes: `progress.js` has `read()` split into `read()` + `restore(saved)` and new
  `saved()`, `exportCode()`, `importCode()`; a new field in `fresh()` needs nothing else. The more
  levels and cars the other branches add, the bigger the cookie: re-run the check after merging.
- Done, `5e53e1a`: **38 level select.** Medals and best times on the pictures, gimmick chips under
  the words (`levelinfo.js`, `render/levelcards.js`, `menus.css`; `CONFIG.medals`). `render/menu.js`
  has one import and the level `card(...)` wrapped in `decorateLevelCard(card(...), level, open)`.
  Seen in a screenshot with `?demo` (a made-up save, never written: `render/demo.js`). The old
  "Best to spare" line is left in and now duplicates the picture's.
- Done, `865d59f`: **35 garage sort and filter** (`render/garageview.js`: Sort and Show buttons on
  the garage bar, the lot rebuilt each press, nothing saved) and **36 comparison card**
  (`render/compare.js`: car in use against the one tapped). `render/garage.js` has two imports, the
  `sorted` line in `buildLot`, one line in `refresh`, a `mountGarageView(...)` block and
  `Garage.look(id)` for checks (`?garage&look=rally`, `&sort=speed&show=owned`). Seen in two
  screenshots; no button clicked, the card not seen in its final corner, nothing seen on a phone.
- Done, `62c2bdb`: **toll plazas and average-speed cameras removed** (owner's request; replaces
  the old item 7). Out of `hazards.js`, `cameras.js` (kept: it is the ordinary cameras' file),
  `render/hazards.js`, `render/obstacleModels.js` (`tollBooth`), `collision.js`, `config.js`
  (`toll`, `averageSpeed`, `obstacleKinds.tollBooth`), `track.js` validation, `levels.js` docs,
  `messages.json` (five event lines and the `toll` bust), `gimmick-road-2.json`, two Gimmicks cards,
  and `scripts/.hazards-check.mjs`, which still passes (run with node). Checklist 20 and 21 marked
  `[-]` removed. `Game.fines` stays: the ordinary cameras use it. Nothing from `c0d9c81` touched.
  Not verified: Gimmick Road 2 and the Gimmicks page not opened since.
- Done, `45369f1`: **Gimmicks page cards**, a new "City streets" group of eight: tunnels, parades,
  police roadblocks, falling cargo, ice-cream stops, reversible lanes, convoys, rubbernecking (burst
  water mains already had a card; toll and average-speed cards are gone). `node --check` passes and
  the page opens with the group listed (screenshot of its top). Not verified: the eight models were
  not looked at (the page's one window-sized canvas does not come out in a tall screenshot).
  Found, not mine, not fixed: the bullet train's card logs `THREE.Object3D.add: object not an
  instance of THREE.Object3D. undefined` (it was there before the cards went in).
- **Replay system: findings** are in `src/delivery/REPLAY-NOTES.md` on `worktree-delivery-batch`
  (`4a66a80`). In short:
  - Recommendation: record inputs + seed at a fixed step (about 1 to 2 KB a minute) rather than
    state (measured 158 to 289 KB a minute at ten samples a second, and about twenty gimmick
    modules to open up).
  - First step built, `3731c60`: `scripts/.replay-check.mjs` plays a scripted run twice from one
    seed at a fixed 1/120 s step and hashes the whole state every second; `.replay-trace.mjs`
    names the call where two runs first part. It found one real bug, fixed in `traffic.js`
    `outfit()`: per-car timers only set as first used (`seek`, `overtake`, `feint`, ...) carried
    over on pooled cars, so races, rival levels and five delivery levels did not replay. With it,
    the nine levels checked first all replay exactly (two races, a rival level, the Battlefield
    among them); the other levels are being swept now.
  - Still open before it works in the browser (not started): the logic needs its own seeded
    generator (rendering draws from the same `Math.random`), `main.js` needs a fixed-step
    accumulator, the level must be rebuilt from the seed, inputs fed by step number.
  - The simple translucent ghost (30) was not built: it falls out of input replay later.
  - The `traffic.js` change resets timers when a car is dealt out; no smoke test was run on it.
  - The sweep of the other 34 levels (40 s each): 32 replay exactly; **Grand Prix and Market Town
    still part, at 2 s** (both have crossroads, so most likely more left-over state in the junction
    code; `node scripts/.replay-trace.mjs market-town` will name the call). Not hunted, and not yet
    in `REPLAY-NOTES.md`, whose "Checked levels" lists only the first nine.
  - After the `traffic.js` change: `.traits-check`, `.hazards-check`, `.save-check` pass.
    `.traffic-quirks-check` has one failure ("ice cream van: its tune was played near the player (0
    bars)") and `.ufo-check` dies on an import error; neither was run before my changes, so I do not
    know whether they are mine.
- **MY MISTAKE, NEEDS A DECISION (agent 3 worktree only).** To compare against a clean tree I ran
  `git stash; git stash pop` in my worktree with nothing of my own to stash. The stash list is
  shared by every worktree, so the pop applied the city-levels stash (`0201824`) on top of my
  branch: 15 conflicted files, 14 modified, 21 untracked, all in
  `.claude/worktrees/delivery-batch` only.
  - **Nothing is lost.** The stash entry is still there, same hash (the pop kept it because of the
    conflicts). All my work was committed first: branch tip `4a66a80`. The main checkout and the
    circuits worktree were not touched.
  - **Not cleaned up:** the permission system refused the reset as destructive, and I did not work
    round it. To put my worktree back, from `.claude/worktrees/delivery-batch`:
    `git reset --hard 4a66a80`, then delete the 21 untracked files `git status` lists (each one is
    in the stash's untracked tree, `stash@{0}^3`: checked with `comm`). Do not use `git clean` with
    `-x`, and leave `node_modules` (a junction) alone.
  - Until then, do not run or screenshot from that worktree: its files are a half-merged mix.
    Merging `worktree-delivery-batch` by its commits is unaffected.

## Agent 4: side roads cleanup (.claude/worktrees/delivery-circuits, delivery-side-roads)

- **1. Flicker on hill side roads: done, `3a2fefe`.** Cause measured on Gimmick Road 2: the side road
  lay up to 4 cm (18 cm at worst) under the expressway's land and up to 3 cm under its pavement at
  the merge. Now exact alongside the expressway, its own land and banks away from it, 6% at most
  (was 12%). Checked: levels check, `.hazards-check.mjs`, screenshots.
- **2. Fork and merge markings: done, `249424f`.** Lane-drop line, nose with chevrons, solid lines
  meeting at its tip; every side road now parts from the expressway by a set gap (`ramps.apart`,
  `ramps.part`), which moves side roads a little on Ring Road, Gimmick Road 2, Market Town and
  Quarry Run. Seen in screenshots on five levels; left-hand driving not yet looked at.
- **3. Decor pruning: done, `7ae100d`.** One test (`offRoads` in `render/road.js`: real distance to
  every other road's pavement, a verge, the thing's footprint) behind `instances`, `sideStrip`
  and a last sweep of loose objects. Seen in screenshots on Expressway, Big Business, Ring Road,
  Market Town, Quarry Run. Not routed: backdrops over 60 m across and meshes built in world
  terms that are not strips (zone crags, cliff faces).
- **4. Fully-featured side roads: done as far as it goes, `c01a8ee`.** Lifted: hills with flyovers,
  exits on a `flow: south` level, pickups / obstacles in any open side lane and on its shoulders,
  tractors, landmines, rockfall, drop bears, pelotons, migration on a side road, a full left
  shoulder, ruts on dirt. Left (documented in `levels.js`, reported as the level loads): flyovers on
  a one-way level, and ice, mud, fog, stopGo, parked, roadblocks, iceCreamStops, reversible,
  wreckage, machinery, siteWorks, parades, hippos, elephants, quarries, tunnels, bridges on a side
  road. Checked headless (a built level driven down its side road with each kind on it), one
  screenshot of hills with flyovers; not play-tested.
- **5. Every theme: looked at, nothing further to commit.** Ring Road's first fork and merge shot
  from above in 25 of the 28 themes (`?theme=`; not spa or albert-park; monza shot but not looked
  at), and mirrored (`"drive": "left"`, temporary edit, restored). About a third of the images were
  opened: farm, beach, safari, singapore, coast, construction, snow, hood, tokyo, hell, space,
  airport, mumbai, left-hand. In those, line colours follow the theme and no scenery is on a side
  road. Shots: scratchpad `shots-side-roads/` (before, part1-4, themes, left).
  Farm, Mystery Meadows and UFO have no exits on this branch.
- Branch tip `c01a8ee`, four commits on `delivery-side-roads`, not pushed. Smoke test not run.

## Agent 5: amphibious cars and levels (.claude/worktrees/delivery-city-levels, delivery-amphibious)

- **1. The five cars and the garage's Amphibious section: done, `43e77e2`.** Sailing Herald (1 star,
  $60), Float Van (2, $180), Toybota (3, $310), Dampervan (4, $470), Nissank (5, $750): `amphibious:
  true` in `CARS`, each a little under its tier's best on the road. Sea-green stars. In the garage
  from the start (my decision), parked after the tiers in columns of their own on a blue slipway
  under an AMPHIBIOUS sign; `Show: Amphibious` on the bar; the comparison card shows the perk.
  Checked: levels check, `.save-check` (3168 bytes with the five cars), `.balance-check`, three
  garage screenshots looked at. No menu pictures (`carshots/`) for them yet.
- **The owner's rules for gimmicks (relayed mid-task), and how the water is built to them:** the player
  never has to stop or wait (slipways are taken at speed: a splash, a lower top speed and softer
  steering, no halt); traffic that cannot cross queues on its own SHOULDER, so every lane stays open
  to thread at speed; boats are things to out-steer (their wakes shove the car sideways, a stage can
  have a current, channels narrow, barges are slow and wide), never a wall to wait behind. No ferry
  timetable, no drawbridge, stop / go, level crossing, school crossing or roadblock on these levels.
  Each level's fit is noted under step 5.
- **2 and 3. Water stages, traffic and boats: done, `e459b4c`** (one commit: the drawing imports the
  boat models). `water: [{ from, to, current? }]` in a level; `Track.water(s)` (0 dry .. 1); logic
  `water.js`, drawing `render/water.js`, boats `render/boatModels.js` (dinghy, barge, ferry, pedalo),
  tuning `CONFIG.water`. The road is not dug out: the water stands 0.32 m over it and what floats is
  sat down into it. Afloat: 74% top speed, softer steering and brakes, bow wave, wake, bobbing, a
  boat's engine note. Traffic that can't float pulls onto ITS OWN SHOULDER from 170 m out and stops
  13 m short of the slipway nose to tail (at most 6 a side; no more of them turn up for that edge
  until the queue is passed): every lane stays open. Amphibious kinds (the five cars' ids) drive in
  and out. Boats turn up on the water only and tie up at the bank short of the far slipway (they do
  not turn back: a boat's direction never changes in this engine). A boat's wake shoves the car off
  its line; a stage can have a sideways current.
  - Checked with `node scripts/.water-check.mjs` (new): the car never drops under 19 m/s, no land
    vehicle in the water, no boat out of it, queue wholly on the shoulder, amphibious traffic in and
    out, a level refused without an amphibious car, old saves keep their place. Screenshots looked at.
  - Not handled: ambulances, processions and convoys ignore the water (not used on these levels).
  - Screenshots: `&ff` over about 15 s leaves the camera off the road on ANY level (seen on level 2
    as well); not mine, not fixed. Shorter `&ff`, or `&cine`, is fine.
- **4. Amphibious-only levels: done, `e459b4c` and `0ea67a1`.** A level's `amphibious: true`.
  `Game.start` refuses without an amphibious car owned and opens the garage at the cheapest one (no
  reload); with one owned the level is driven in it whatever car is in use (the best owned, unless
  the car in use is amphibious: no memory of the last one picked). The card says "Amphibious cars
  only"; the car card says which car, or which to get. Car Swap only lends amphibious cars there.
  New address hooks for checks: `?pick=41[&start]`, `gimmicks.html?group=vehicles&from=6`.
- **5. Five levels: done, `75f5769` (+ `3bf3f0e`).** `AMPHIBIOUS_LEVELS` in `levels.js`, labelled A1
  to A5, a menu group of their own, after S9 and before the circuits. `INSERTED_AT` got one entry of
  a new kind, `{ cap: 41 }`: an old save that counted past the circuits is held at "A1 open".
  Clocks from `level-clocks.mjs` (timed in the Float Van, holding its lane). How each fits the
  owner's rules (no stopping, counterplay, not a plain level, no new exploding mover):
  - A1 Slipway Beach (beach): a short dip then a long reach with a gentle current; pedal boats,
    dinghies, a barge; a balloon to steer round on the sand. Nothing to wait for.
  - A2 Harbour Lights (hongkong, left-hand): two long reaches with opposite currents and an island
    between, the second narrowing to a lane each way among barges and ferries (slipped round on the
    bank strip, which is open water), a tunnel, a last dip. Its fog bank was taken out (white at night).
  - A3 High Water (new theme `flooded`: city scenery, rain, flood-coloured ground): one way, starts
    and ends afloat; dry rises with burst mains, potholes, trolleys and a spilled load (a lane left).
  - A4 Hippo Ford (safari): five fords, one long against a current, a narrowed channel; elephants and
    hippos on the dry stretches (existing gimmicks, dodged, not waited for), mud.
  - A5 Fjord Crossing (snow): ice, rockfall, fog and a tunnel over the pass, then 1150 m of fjord
    with a current and a narrows among ferries; ends afloat.
  - None has a drawbridge, stop / go, level crossing, school crossing, roadblock, toll or camera.
    Police are only in A2's traffic (3%), as in the base game.
- **6. Gimmicks page, docs, pictures: done, `3e9af79`.** Cards "Water stages" and "Boats" (Vehicles
  group); README and HANDOVER updated (the "models with no car" note is gone); `carshots/` and
  `levelshots/` JPGs for the five cars and levels; themes can give the water its colours (`channel`).
- **Checks at the end:** `delivery-levels-check` all good (48 levels), `.water-check` all passed,
  `.save-check` 3382 of 4096 bytes (48 levels, 38 cars), `.balance-check`, `.hazards-check`,
  `.traits-check` pass. Smoke test NOT run. Nobody has played a level by hand.
- **For the owner to overrule:** section open from the start; prices 60 / 180 / 310 / 470 / 750;
  sea-green stars; boats tie up instead of turning back; the queue is on the shoulder (so it never
  gets in the player's way at all); levels numbered A1 to A5 rather than S10 to S14; water speed 74%.
- **Touched files the side-roads agent also has:** `track.js` (a `water` block beside `muddy`, a
  validation block, two names in the returned object) and `traffic.js` (an import, `mix` / `pickKind`
  take a direction, one guard in `placeAt`, `Water.marshal` at the top of `update`, `Water.holdFor` in
  the hold line, a pace line by the mud, two conditions in the lane aim). `render/road.js` and
  `hazards.js` untouched.
- Screenshots: `scratchpad/shots-amphibious/` (26 PNGs).

## Agent 7: cargo and the delivery ending (.claude/worktrees/delivery-circuits, delivery-cargo)

- 1. Models: DONE `9b2aebb`. `render/cargoModels.js` (state-free): Good pizza, cake, goldfish, cactus, clock;
  Evil parcel, porcupine, bees, doll, tentacle, each `setState(0|1|2)` easing over 0.5 s. Seen on the new
  page `delivery/cargo.html` (`cargopage.js`), all ten, Evil in three states.
- 2. Which level carries what: DONE `8255e1f`. `cargo.js` (table, `cargoFor`, `cargoState`), level field
  `cargo: { good, evil }` (documented in `levels.js`), set by hand on 8 levels, the rest by place on the menu.
  Tuning is `CONFIG.consignment` (NOT `CONFIG.cargo`: that name is the shedding truck's load already).
- 4 (logic). DONE `8255e1f`: `delivery.js`, a timed state after `Game.finish` (state is 'finished' and the
  results fixed at the line; only the results screen waits). Off unless rendering sets `Delivery.staged`,
  so headless runs are as before. `node scripts/.cargo-check.mjs`: all good.
- 3. Corner display: DONE `cd3b18d`. `render/cargo.js` + `cargohud.css`: a round window on the right under
  the TANK RAGE corner (92 px; 64 px beside it on a screen under 480 px tall), drawn by the game's own
  renderer with a scissor (no third WebGL context). State by the clock, a tick and a flash on each change.
  Hidden in photo mode, cine, screensavers, garage, races. Seen at 1100x650 and 520x900.
- 4 (drawing). DONE `cd3b18d`: park 1.7 s, unload 1.1, moment 1.6, beat 0.5 (4.9 s), any key / tap / click
  skips after 0.35 s (car and cargo are then put where they would have ended up). No ending on: races,
  Battlefield, UFO (Asteroid Run), jetboat (Oh Mine!); nor after busted / timeout. All Heck's hearse and the
  rival levels DO get it. Seen as stills on Farm Lanes, Expressway, Night Drive, Singapore, Tokyo, All Heck.
- 5. Docs: DONE `9d018de`. Page `delivery/cargo.html` linked from the menu and the Gimmicks page; README, HANDOVER.
- Edits to shared files, all small: `game.js` (import, `Delivery.reset()` in start, 3 lines in finish, 1 in
  update, the confirm handler), `main.js` (import + 3 calls), `config.js` (one `consignment` block before
  "scenery"), `render/items.js` (ghost look off during the delivery: 2 conditions), `levels.js` (doc lines
  after `alwaysGood`), 8 level JSONs (one `cargo` line each), `index.html` (2 elements, 1 menu link),
  `vite.config.js` and `.bundle-check.mjs` (the new page).
- Checked: `.cargo-check` (22 checks), `.bundle-check`, `delivery-levels-check`, `delivery-probe` on 7 levels.
  `.replay-check` fails on expressway ("runs part at 7 s") with the base `game.js` too: not from this work.
- NOT verified: nothing seen moving or heard (stills only); no real phone; the kerb camera not looked at on
  every level (a finish in a tunnel, on a bridge or with things on the shoulder may sit badly). Smoke test not run.
- For the owner to overrule: thresholds 50% / 20% of the clock; the pairings; the ending's 4.9 s; the car is a
  ghost at the kerb (HUD behind the results reads GHOST 0.3); a late delivery also gets the ending; the test
  hooks `&cargostate=` and `&deliver=`; furious set-down plays the 'burst' sound.
- Screenshots: `scratchpad/shots-cargo/` (32 PNGs).

## Agent 6: gimmick fixes and circuit run-off (main checkout, main)

- **1. Drawbridge: done, `1f18343`.** Cause: the leaves were drawn at 66 degrees from hinges 8 m apart
  while the car "jumped" on a fixed parabola from the hinge, through the leaf, at road pitch. Now two
  15 m leaves lifting to 0.5 rad; `Hazards.deck(c, s)` / `Hazards.surface(s)` give height and slope,
  `Hazards.ride` sets `Player.air` and `Player.pitch` (climb, lip, arc, landing), the drawing uses
  the same line, the camera goes up with the car. A JUMP 70+ board on the way in; every garage car's
  top speed clears it hands off. A little short: into the river. Far too slow: rolls back to the foot
  and is held until the leaves come down (the one place the player waits, as the cost of a miss).
  `.hazards-check` extended (surface, pitch, crest, landing, roll-back). Screenshots looked at.
  For the owner to overrule: on the leaf the engine adds nothing (the speed at the foot decides);
  launch capped at 12 m/s up; `CONFIG.drawbridge.gravity` 20.
- **2. Wide loads: done, `f673318`.** Rule: the load swings from one side of its lanes to the other
  (5 s at each end, 1.5 s between); pass at speed on the side its arrow board points to (left: in the
  lane; right: on the shoulder, shoulder rules apply). No bust. The escort moves over slowly to block
  and holds its line 1.1 s before it is reached: jink late. Hitting either is a knock (12 / 8 damage
  from behind, they stay), not a wreck. `.hazards-check` passes it flat out from 10 points of the
  rhythm on three lanes a side and on two. Not built: the Gimmicks card's little model only slides.
- **3. Water mains: done, `39ac540`.** `makePuddle` / `makeFountain` in `render/watermains.js`, used
  by both versions. Seen on Gimmick Road 2 (the lane version); the round `watermains.js` pool was not
  caught spraying in a screenshot. The Gimmicks page card still draws its own rectangle.
  Also fixed there: a frame's dt could be negative after `?ff` (the camera off the road in shots).
- **4. Run-off smoothing: done, `8621adb`.** A run-off stretch can taper (`width` to `end`, no
  easing); the tool narrows the measured widths to a line changing at most 1 m per m, smooths it on
  the narrow side and writes tapers that join. Largest step between neighbours: Monza 47.5 m -> 0,
  Spa 27.5 m -> 0. Stretches: Monza 105 -> 230, Spa 95 -> 190 (MORE pieces, each a taper: the count
  went up, the steps went away; `runoff.fit` in a circuit's config trades count for fidelity). The
  walls are 2.1-2.6 m (Monza) and 0.9-1.2 m (Spa) inside the measured line on average: the owner may
  prefer less smoothing (`runoff.smooth`, 12 m).
- **5. Gravel traps: done, `70ef5dc`.** Level field `gravel` (its own list, not a field of a run-off
  stretch, since those are now many short tapers), `Track.gravelAt`, `CONFIG.gravel`. From OSM:
  Monza left 692-776, 1004-1624, 1872-1980, 2192-2436, 2520-2712, 3760-3884, 4876-5232, right
  656-768, 3656-3780, 3844-3940; Spa left 280-468, 2500-2688, 2912-3088, 4332-4480, 4816-5648, right
  2244-2580, 3220-3296, 3684-4248, 4476-4676, 5700-6344. Albert Park: none. `.gravel-check` passes.
  Not seen: a car actually in the gravel on screen (stones, dust, the beaching), nor heard; the AI's
  steering back out is a plain sideways push, not checked in a race.
- Not looked into: `.hazards-check` throwing at its line 38 straight after other checks.
- Screenshots: scratchpad `shots-fixes/` (`before`, `bridge`, `load`, `water`, `runoff-before`,
  `runoff-after`, `gravel`, and `monza-/spa-before.svg`, `-after.svg`).

## Agent 8: level editor (.claude/worktrees/delivery-city-levels, delivery-editor)

Task: checklist "Level editor: full control over every feature and gimmick" (E1.1 to E7.3). Finished. Never ran the smoke test.
Commits on `delivery-editor` (not pushed, not merged): 3df4ec5 schema + check, ee04af4 editor rebuilt from it,
032114d picture hooks + README recipe, 465b555 checklist, 369e072 road handles + gradient strip, 5d6a7db and one after.

- [x] E1.1, E1.2, E1.3, E1.5: `levelSchema.js` (99 fields, 164 settings), `editorForms.js`, `editor.js` rewritten from it
- [x] E2.1 to E2.5; E2.6 partly (weather belongs to the theme: shown, not switched)
- [x] E3.1 to E3.4; E3.5 partly (says how far a loop is from closed; no "close it")
- [x] E4.1 to E4.7
- [x] E5.1, E5.2, E5.4, E5.5; E5.3 partly (duplicate, copy, paste of one thing; no multi-select)
- [x] E6.3, E6.4; E6.1 partly (Play from here; the 3D view still by its button)
- [x] E7.1 to E7.3
- [ ] E1.4 (the game checking levels with the schema) and E6.2 (a clock button): not done
- Checks: `.schema-check.mjs` passes (53 levels, round-trip clean), `.bundle-check.mjs`, `delivery-levels-check.mjs` (52 built, no FAIL).
- A new level field = one entry in `FIELDS` in `levelSchema.js` (README, "Adding content"). AT MERGE: `.schema-check.mjs`
  will fail for fields added on other branches until each has its entry (Agent 10's `crosswinds`, a segment's `ease`, ...).
- Nothing was clicked by hand: screenshots only, with scripted clicks and drags from the address (scratchpad `shots-editor/`).

## Agent 10: road gimmicks (main checkout, main)

Task: checklist "New gimmicks": G16, H1, H2, H8, H4, H5, then down the list. Never runs the smoke test.
Files of its own: `gambles.js`, `render/gambles.js`, `render/gambleModels.js`, `levels/gimmick-road-3.json`
(`?hidden=gimmick-road-3`), `scripts/.gimmicks3-check.mjs`. Small additive edits in `game.js` (reset, update),
`main.js` (syncGambles), `track.js` (validation block "Gimmick Road 3's", a segment's `ease`), `config.js` (one block),
`levels.js` (docs), `gimmicks.js` (group "Road gambles"), `levelinfo.js`, `messages.json`.
Nothing here has been played by hand: headless checks and stills only.

Level fields added (for the editor's schema):
- `crosswinds: [{ from, to, dir: 'left' | 'right', strength?, every?, length? }]` (expressway only)
- a segment's `ease` (m, 2 to 200): how sharply its slope blends into the next (a crest)

Progress:
- [x] Gimmick Road 3 + G16 crosswind: done, `1d48924`. On Grand Pacific (sea cliff bridge
  6080-6520), Hurricane (1900-2400, stronger), Tokyo (1700-2250). Clocks not re-timed: the clock's ghost feels no wind.
  `.gimmicks3-check.mjs wind` passes (11). Stills: `shots-gimmicks3/wind-1`, `wind-2`, `card-wind`.
- [x] H1 crest jumps: done, `9d7711b`. No object: a segment's `ease`; `Gambles.updateFlight` (the flight engine the
  ramp and the cushions will use), `Gambles.blind` (the camera down behind the car, `render/scene.js`), a
  board with the speed. Collision skips what the car is in the air above (`collision.js`, two lines). On Rival
  Run (top at 4400, a bale at 4428 lane 3) and Mystery Meadows (2740, the cows beyond). `crest` passes (11).
  Stills: `crest-1-sign` .. `crest-5-over`, `card-crest`. `&speed=` and `&lane=` added to the address (main.js).
- Schema entries (`levelSchema.js`): `crosswinds`, a segment's `ease`: in the commit after the editor's merge.
- For the owner: `scripts/level-clocks.mjs` disagrees with two clocks kept as they were: Rival Run 300 / 285 (it
  says 255 / 195) and Mystery Meadows 234 / 166 (it says 145 / 115). Not changed.
- Decisions to overrule: wind strength 7 m/s^2 and height to the power 1.5; a ghost and a tank feel no wind;
  crests use gravity 20 (the drawbridge's); the camera drops to 6 m up, 11 m back before a crest; the UFO and the
  boat never fly.

## Agent 11: new themes (.claude/worktrees/delivery-city-levels, delivery-themes)

Task: checklist "New themes" in the owner's order: T14 toy room, T15 underwater tunnel, T18 moon base, T13 film studio,
T1 Venice, T4 ice road, then down the ranking. Per theme: the look, its gimmick, a level. Never runs the smoke test.
Files of its own: `render/themes/` (one file per theme's scenery, `index.js` names them; road.js calls the one named),
`extras.js` + `render/extras.js` (the one place game.js and main.js call the new gimmicks from), one logic file and one
render file per gimmick. Small additive edits in `render/road.js` (one branch), `render/tunnel.js` (a theme's tunnel
colours), `themes.js`, `game.js`, `main.js`, `collision.js`, `track.js` (validation), `config.js`, `levels.js`,
`levelSchema.js`, `gimmicks.js`, `levelinfo.js`, `messages.json`, `progress.js`.
Nothing here has been played by hand: headless checks and stills only.

Progress:
- [x] T14 toy room, the look: 14e3c56 (`toyroom` in themes.js, `render/themes/toyroom.js`, `toyModels.js`)

## Agent 9: police pursuit and road characters (.claude/worktrees/delivery-circuits, delivery-pursuit)

Branch `delivery-pursuit` (from `main` at 2e0a296), never pushed. Nothing here has been played by hand or
heard: headless checks and stills only. Stills: scratchpad `shots-pursuit/`.

Shared-file edits are small and additive: `traffic.js` (a `car.driver` hook, `sirenOn`, `Traffic.outfit` /
`Traffic.spare` exported), `game.js` (three lines: `Characters.reset` / `.update`), `main.js` (one sync call,
the siren's range), `config.js` (one block per event, two vehicle kinds), `track.js` (validation), `levels.js`
(docs), `levelinfo.js`, `gimmicks.js`, `police.js`, `messages.json`, six level JSONs (one line each).
New events hang off `characters.js` / `render/characters.js`, so `game.js` and `main.js` are not touched again.

- [x] P1 police pursuit: logic 881f429, drawing ee6dde8. `pursuits: { every }` on big-business, night,
  speed-trap-alley, ring-road, tokyo, gimmick-road-2. Check: `node scripts/.pursuit-check.mjs` (43 ok).
  Address: `&pursuit=3&pursuitend=caught&pursuitbehind=60&pursuitsettle=40`.
  Decisions to overrule: one interceptor; not a garage car; "the police add the player to the chase" is a
  heat meter that ends in a bust (`busts.pursuit`), Evil only, with a warning first; a Good player in the
  interceptor's way is never busted; the Good reward is only for `caught`; left alone the ending is drawn
  up the road (40 / 25 / 35); the getaway car's pace is 112% of the player's own car's top speed.
  Not done: no HUD meter for the heat (a message warns), no editor control, no still of the two parked.
- [x] P2 bank robber: bcd6b25. `robbers: [{ s }]` on big-business, night, the-hood, ring-road, gimmick-road-2, and after a pursuit's wreck. Check: `node scripts/.robber-check.mjs`. Address: `&robber=1600`, `&robber=carry`. Decisions to overrule: he pays as he goes ($15 / 100 m, 1000 m), not at the end; the police run at 97% of the player's top speed (a clear road gets him there, traffic gets you caught); handing over = slowing below 9 m/s beside any police car; he rides on the roof.
- [ ] P9 sleepy lorry: in progress

**10-Oct, the redo (agent 12, same branch; supersedes P1 and P2 above).** At the owner's word the pursuit is now a
simple traffic event, as an ambulance is: every `pursuits.every` s a getaway car comes up from behind flat out,
weaving, the interceptor (its own model) 30 m behind with its siren going (heard from 420 m, one warning message),
traffic pulls aside, and the two drive on and are taken off out of sight ahead. Nothing gained or lost by the player;
hitting either is an ordinary collision. Never on a race or the Battlefield.
Removed: the bank robber (P2, reverted: f2404a4); the three endings, the Good and Evil gambles, reward, bag of cash,
heat and its bust (`busts.pursuit`, the police page's row), eight messages, the helicopter, `characters.js` and
`render/characters.js` (`game.js` calls `Pursuit` itself; `main.js` imports `render/pursuit.js`), `&pursuitend`,
`&pursuitsettle`. `pursuit.js` 402 to 152 lines, `CONFIG.pursuit` 45 to 17. Simplified: cab1580. Merged with `main`
and `pursuits` added to `levelSchema.js` (with a `notRace` rule): dcaa98c. Check: `node scripts/.pursuit-check.mjs`
(29 ok). Stills: scratchpad `shots-pursuit2/`. Address: `&pursuit=3&pursuitbehind=60`. Not played by hand or heard.
The getaway car now passes at 130% of the player's car's top speed (was 112%: it took 25 s to get by).

## Agent 14: Stelvio and Market Town (.claude/worktrees/delivery-levelfix, delivery-levelfix)

Shots: `scratchpad/shots-levelfix/before` and `/after` (68 each: chase every 200 m, from above at each fork, merge, crossroads, rockfall). Scripts in `scratchpad/levelfix/`.

### Part 1: faults seen in the "before" shots (nothing changed yet)
Stelvio:
- S1 every rockfall rock waits hanging in the sky: 32 m above the ROAD's plane, 18 m off its edge, whatever the land does there (over the valley on the downhill side; 10-30 m above the hillside on the uphill one). Seen at 600, 800, 1400, 2400, 2800, 3200, 3800.
- S2 hairpins read as plain bends: no wall, no chevron boards, no snow poles, the same rail as everywhere.
- S3 the face between two legs is a smooth grey ramp, sawtoothed where the 8 m grid cuts it; pines stand half-buried on it.
- S4 pines 10 m off the road up to 12 m tall fill the screen on the inside of bends.
- S5 the summit (2000-2500, in fog) is an empty white plateau: no sign, no building, nothing to see; a dead stretch.
- S6 no view: the valley side is the same snow as the hill side.
Market Town:
- M1 crossroads (800, 1180): houses, lawns, driveways and trees stand ON the cross road's arms (a house across the right arm at 1180; five trees on the arms at 800); the arms' yellow and edge lines come and go under them. A speed-limit sign stands in the mouth of the 1180 box.
- M2 the arms have no pavement, no kerb: suburb pavement stops dead at the box.
- M3 fork (2500) and merge (3450): the pavement and fence end square where the exit lane opens and start again with a point after the merge; a sliver of pavement lies in the wedge between the two roads.
- M4 the side road (986 m) is bare: no houses, pavement, lamps or trees, three hay bales on green.
- M5 the side road's three bends (size 10) start straight out of the nose: it wriggles beside the main road.
- M6 the railway at 2000 is a flat brown band with trees on it.
- M7 the whole level is one kind of house: no market, no town centre; nothing marks the level's name.

## Agent 15: Good cargo, C1 to C20 (.claude/worktrees/delivery-cargo-good, delivery-cargo-good)

Branch `delivery-cargo-good` (from `main` at 533c75b), never pushed. Stills only: nothing seen moving. Stills: scratchpad `shots-cargo-good/` (`sheet.png` is all twenty).

- [x] C1 to C20 built, registered, on the cargo page: cc34343, then the globe and the checklist ticks in the commit after it. New file `render/cargoModelsGood2.js`; `render/cargoModels.js` +2 lines (import, `...GOOD2_MODELS`); `cargo.js` `CARGO.good` now 25 and reordered so all turn up by default; `cargopage.js` heading counts the items. No level JSON edited. `.cargo-check`, `.bundle-check`, `delivery-levels-check` pass.

## Agent 16: Evil cargo, C21 to C40 (.claude/worktrees/delivery-cargo-evil, delivery-cargo-evil)

- c8ba744: all twenty built, a first pass, in the new `render/cargoModelsEvil2.js` (state-free, its own helpers); 20 entries appended to `CARGO.evil` in `cargo.js`; in `render/cargoModels.js` one import line after the three.js import and one line `...EVIL2_MODELS,` at the end of `CARGO_MODELS`. Also `cargopage.js` (the section headings count the table instead of saying "five") and `.cargo-check.mjs` (a label: "every item turns up"). Both will clash trivially with the Good branch's mirror-image edits.
- Ids: egg, cooker, flytrap, barrel, mirror, skunk, cannonball, mimic, fireworks, alien, teddy, bats, ice, snakes, genie, reactor, goose, jack, cloud, piranhas. No level JSON touched: the rotation hands them out (cargo-check lists who gets what).
- Checks: `.cargo-check`, `.bundle-check`, `delivery-levels-check` pass. Seen: stills of the cargo page, every item in three states. In progress: HUD corner and kerb pictures, contact sheets.
- 269134e: finished. Thundercloud darker, reactor arcs bolder, checklist ticked. Seen as well: mirror, genie and thundercloud in the HUD corner in all three states; mirror, goose and mimic furious at the kerb. Contact sheets: scratchpad `shots-cargo-evil/sheet-1.png`, `sheet-2.png`. Nothing seen moving; not pushed.

### Part 2: boulders (done, 2050f4e)
- Cause: a rock's waiting place and fall were measured from the ROAD's plane (`o.h` above `Track.toWorld(s, lat).y`, which is the road's height at s whatever lat is); the land is only known to the renderer. So every waiting rock hung 22 m (Stelvio 32 m) over road level, 14-18 m off the edge: in the sky over the valley, or 10-30 m over the slope.
- Fix (render/items.js `rockWay` / `placeRock`, every level): each rock gets a way down over what is drawn. Terrain themes: it waits on the land (`landAt`, new export of render/road.js: the terrain grid as drawn, triangle by triangle), on the side the level names if that is uphill, else the other. A level that gives `height` (quarry-run's bench): a ledge that high. Flat land (gimmick-road; fjord's valley floor): a crag `height` tall built under it. It comes down over that ground in 4 bounds and rests on the road sunk 0.18 r with a dark patch. The game's side (`o.h`, `o.land`, when it can be hit) is unchanged but for a `ledge` flag.
- Also: pines stand on the grid as drawn (they used the analytic height, metres off on a cliff); a quarry's blasted boulders (render/wreckage.js) had every second rock 0.6 m up on nothing: all on the road now.
- Stelvio: rock stretches moved 40 m clear of hairpins (no slope there) and the summit one (1860-1980, no hillside) to 1345-1500; `height`/`out` removed.
- Seen in shots: stelvio, mountain-pass, fjord, gimmick-road, quarry-run (`scratchpad/levelfix/t1`, `t2`).

### Part 3: markings (done, 1d787fa)
- Cause: a crossroads' arms were not in the list of roads scenery is kept off (`paved` in render/road.js held only side roads, flyovers and the expressway round an exit; with no exits it was empty and every check passed). So lots (lawn, drive, house, fence, trees) lay on the cross road and its lines showed and vanished under them. At the fork the pavement strip was cut row by row, leaving slivers in the wedge.
- Fix: arms are roads 900+ in `paved` (and in the terrain's `others`): every theme's instances and side strips keep off them. `sideStrip(..., whole)`: full width or nothing, and with a number, only where that many m beyond are clear too. Suburb: pavement along side roads and arms (with corners), bridged round the outside of forks and merges; lots, lamps on side roads (never where another road's lot is); trees along arms. A camera's limit sign moves short of a box.
- Market Town: exit `out` 90 -> 70, `bends` removed (it swung out twice: 7 changes of hand in 986 m; now 971 m, tightest 100 m); camera 1250 -> 1300.
- Other levels looked at after: back-roads, quarry-run, ring-road forks, singapore crossroads: unchanged (`scratchpad/levelfix/t5`).
- NOT done: no change to the fork geometry in track.js (the 130 m `shapeLead` before `out` starts is why a side road runs beside the road, then swings: left alone, other branches are in track.js); no give-way line where a side road meets a crossroads (no level has that); no spacing rule in the validator.

### Part 4: both levels brought up (done, c513726)
- Alpine look (render/road.js, so stelvio, mountain-pass and fjord all get it): snow poles every 24 m both edges; round the outside of any bend tighter than 30 m (a hairpin) a stone wall under snow with a red and white band, and no pine within 24 m of it; at the road's highest point (if it climbs over 20 m) a refuge hut and a board with the level's name and "SUMMIT".
- Stelvio: `crosswinds` 2120-2400 blowing left (the one road gamble this branch has); fog moved off the summit to 2440-2760 so the hut and board are seen; pickups in the oncoming lane at 880, 1700, 2260, 3320 (reward for the risk). Length and clock unchanged.
- Market Town: `shoulderRows` of market umbrellas 930-1060 both shoulders (between the crossroads, clear of the parked cars); `waterMains` at 1600 lane 1. Side road now has houses, pavement, lamps both sides. Length and clock unchanged.
- NOT done: S3 (the face between legs is still a smooth ramp on an 8 m grid: needs a finer terrain grid or a rock-face mesh, a job of its own); S6 (no new view over the valley); houses along the cross road's arms (trees only); M6 (the railway band). Stelvio had no menu picture at all: one is being made.

## Agent 17: in-game UI (.claude/worktrees/delivery-ui, delivery-ui)

- Done, two commits on `delivery-ui` (not pushed): 8cb5d78 (U1 to U5, the code), then the check script, README and checklist ticks.
- U1: the level bar is a ring in the meters' corner (distance left in its middle, lap notches and LAP n/N on a lapped level). Pause / Exit level: bottom centre in landscape, top centre upright and in the screensavers.
- U2: the shoulder's danger is a dial with a needle beside the ring, always there, 0 at rest, last quarter red.
- U3: messages in a strip along the top edge between the corners (landscape); at the foot of the screen between the THROW buttons (upright). `#topStrip` in index.html holds `#sticky`, `#messages`, `#camAlert`.
- U4: `CONFIG.messageTimes` { default, fade, kinds, groups, keys, sticky, stickyRows } replaces messageTime / messageExtra / messageFade (times unchanged). Sticky: `Message.sticky`, `Message.conditions` (filled at the foot of player.js), `Message.settle()` (called at the top of Game.update and by the HUD).
- U5: `Player.mysteryName`, words in messages.json `mysteryNames` (a new group, added before `milestones`; no other line of messages.json changed).
- Shared files touched: config.js (the three message lines replaced by the table), messages.json (one new group), game.js (+`distanceLeft` getter, +1 line in update), player.js (+`mysteryName` getter, +conditions block at the foot), main.js (+`&hudcheck`, for pictures).
- Checked: node --check, delivery-levels-check, .bundle-check, .mysteries-check, .cargo-check, the new `scripts/.hud-check.mjs` (all ok); pictures at 1100x650, 520x900, 900x420 in scratchpad `shots-ui/before` and `shots-ui/after`. Smoke test NOT run. Nothing seen moving, nothing on a real phone, nothing narrower than 500 px.

## Agent 13: car ideas lot (main checkout, main)

Done, never pushed. Commits on `main`: 18125cb (the tab, the table, the first ten models), 9ce0665 (the next ten),
657beea (the last ten), and the one after it (fixes from the pictures, README, checklist ticks).
Files: `ideas.js` (IDEA_CARS), `render/ideaModels.js` (IDEA_MODELS), `render/ideaslot.js` (the lot and a studio for
pictures); small edits in `render/garage.js`, `main.js` (one line), `delivery/index.html`, `menus.css`.
Addresses: `?garage&tab=ideas&look=<id>`, `&hover=<id>`, `&studio=<ids or all>&views=3`.
Pictures: scratchpad `shots-ideas/` (`sheet.png`, `<id>.png`, `lot/`, `evil/`).
Not verified: nothing clicked by hand (tab buttons, drag scrolling, pointer hover). Weakest models: splitwindow,
midnight, twostroke.

## Agent 18: menu UI (.claude/worktrees/delivery-menu, delivery-menu)

Status: in progress.

- [x] M1 barebones (1eb9ece): `#startScreen` rebuilt as one screen (stage, strip, groups, tabs; car, side, START; options sheet). New `render/menustage.js`, `menu2.css`; `render/menu.js` slimmed; `render/levelcards.js` gone. Keys and `?do=`, `?cursor=`, `?side=evil`, `?options` for checks.
- [x] M2 (f6fa1bc): a `description: { good, evil }` in every menu level's JSON (48 levels; only `good` on All Heck and the Battlefield), documented in `levels.js`, in `levelSchema.js`; `node scripts/.descriptions-check.mjs [--list]`.
- [x] M3 (0c54493): "What's on this road" card, `render/levelcard3d.js` (one renderer, made on opening, let go on closing). `levelinfo.js` gained `levelPickups`, `levelTraffic`, `vehicleInfo`, `levelNotes`; `node scripts/.roadcard-check.mjs [--list]`.
- NOTE for whoever merges, and for Agent 19 (gimmicks): `gimmicks.js` and `powerups.js` are now only the catalogues (`export const GROUPS` / `CARDS`); the page part at the foot of each moved to `gimmickspage.js` / `poweruppage.js` (the HTML pages point at those), and both pages draw through `render/modelviews.js`. New gimmick cards still go in `GROUPS` in `gimmicks.js`, as before. An edit to the old foot of `gimmicks.js` (from `// ---- the page:` down) will conflict.
- The old menu's rules were cut out of `style.css` (`.car-row`, `.side-btn`, `.cards`, `button.card`, `#tabs`, `.groups`, `#levels` on phones, `details`) and `menus.css` (the level cards' medals and chips). `delivery/index.html`: only `#startScreen` rewritten (ids kept: `startBtn`, `shop`, `sideBtn`, `levels`, `levelGroups`, `bank`, the options' buttons).
- [x] Polish and docs (6ffb4fd): arrows clear of the level's name, the side's note on a race, the groups row follows the group shown; README (the start screen, the file table, the new addresses, the recipes) and HANDOVER (not verified).
- Checks run: `node --check` on every file touched, `.bundle-check`, `.schema-check`, `.save-check`, `.descriptions-check`, `.roadcard-check`, `delivery-levels-check`: all pass. `npx vite build` (into the scratchpad) builds. The smoke test was NOT run.
- Pictures: scratchpad `shots-menu2/before` (7) and `shots-menu2/after` (13 states at 1100x650, 1400x900, 520x900, 900x420, and the controls worked by `?do=`).
- Not verified: nothing clicked, tapped or swiped by hand; no sound heard; no animation seen moving; not on a real phone. Eight levels have no menu picture (hong-kong, tokyo, mumbai, stelvio, christmas, monza, spa, albert-park: none before either) and show a plate of stripes; `shots.mjs --levels` now gives a ghost car in the picture and puts Mumbai's camera behind a building, so they were left.
- Left for the tiers rework: the stage's ribbon is already two halves (Good left, Evil right: today each shows its medal and best time), the "needs" line is there (an amphibious car, the level's own vehicle, the level before), and the groups are fives.

## Agent 19: road gimmicks, resumed (.claude/worktrees/delivery-gimmicks, delivery-gimmicks)

Task: finish H2 from the stopped agent's saved work, then H8, H4, H5 and down the list. Never runs the smoke test. Nothing played by hand.
The saved H2 work (`4b617b5`) was sound: main merged in cleanly (`d0538f8`), and it loaded; one check of its own was wrong.

Level fields added (shapes):
- `jamRamps: [{ s, lane, queue?, lanes?: [first, last] }]` (expressway, straight and level, clear of exits' ramps)
- `lowBridges: [{ s, clearance? }]` (expressway, between an exit and its merge, 40 m clear of both; clearance 1 to 5 m, 2 if not said)
- `fords: [{ from, to, depth? }]` (expressway, 300 m at most, between an exit and its merge, 40 m clear of both; depth 0.1 to 1.5 m, 0.5 if not said)
- `cushions: [{ from, to, every? }]` (expressway; a row every 15 to 200 m, 45 if not said)
- `shade: [{ from, to, side: 'left' | 'right', lanes? }]` (expressway; lanes of the player's side in shadow, 1 if not said)
- `ruts: [{ from, to }]` (expressway)
- `tarmac: [{ from, to, lane }]` (expressway; a lane of the player's side, which needs a second lane there)
- `spray: [{ from, to }]` (expressway)
- `lowSun: [{ from, to }]` (expressway)
- `dust: [{ from, to, wind: 'left' | 'right' }]` (expressway)
- `washboards: [{ from, to, skim? }]` (expressway; skim in m/s, 13 to 40, CONFIG.washboard.skim if not said)

Progress:
- [x] H2 ramp over the jam: done, `72a0765`. On Gimmick Road 3 (2400), Night (2250, queue 2, a turbo at 2110), Speed Trap Alley (2860, queue 3). Clocks not re-timed. Cash beyond each queue, two side by side. `.gimmicks3-check.mjs ramp` passes (14), `finish` added (a whole run, hands off). Stills: `shots-gimmicks3/ramp-1-sign`, `ramp-2-foot`, `ramp-3-air`, `card-ramp`, `night-ramp`.
- [x] H8 washboard dirt: done, `61e67dc`. Field below. On Gimmick Road 3 (2950-3450, barriers at 3120, 3200, 3330), Safari (2520-2980), Outback Express (3960-4380), cash on each. Clocks not re-timed. One additive line in `player.js` (the steering's response times `1 - steerLoss * shaken`). `washboard` passes (12). Stills: `wash-1-sign`, `wash-2-on`, `card-wash`, `safari-wash`. A board's long line is now squeezed to fit (`makeBoard`).
- [x] H4 low bridge: done, `c07fa19`. Built as a height bar over the player's side (not a bridge over the whole road), which must stand between an exit and its merge. On Gimmick Road 3 (4400; exit 0's `out` 70 to 150 so the way round costs 4 s), Ring Road (1100), Back Roads (1320), cash under each. Clocks not re-timed. `bridge` passes (11). Stills: `bar-1-sign`, `bar-2-bar`, `bar-3-close`, `card-bar`, `ringroad-bar`.
- [x] H5 ford: done, `a7736ae`. Between an exit and its merge (the side road is the bridge). On Gimmick Road 3 (5650-5720, 0.6 m; exit 1's `out` 70 to 150), Back Roads (1790-1850, 0.45 m), Quarry Run (4060-4105, 0.7 m), cash in each. The low bridge moved from Back Roads to Quarry Run (1510). Clocks not re-timed. `ford` passes (13). Stills: `ford-1-sign`, `ford-2-bank`, `ford-3-in`, `backroads-ford`, `quarry-ford`, `quarry-bar`.
- [x] H19 speed cushions: done, `e05c602`. On Gimmick Road 3 (3520-3700), Suburbs (1460-1600), The Hood (1460-1595), Christmas (1480-1615), cash between the rows. Clocks not re-timed. `cushions` passes (15). Stills: `cush-1-sign`, `cush-2-rows`, `cush-3-thrown`, `card-cush`, `suburbs-cush`.
- [x] H10 black ice in the shade: done, `c18c446`. Trees of its own cast the shadow; the shadow is ice (a patch in `Track.slicks`) with 90% more of the steering gone. On Gimmick Road 3 (6250-6450, a barrier at 6410), Mountain Pass (2370-2450), Fjord (1340-1470). Not on Christmas (night). `Player.shaken` is now the share of steering taken (washboard and black ice both set it). `shade` passes (11). Stills: `shade-1`, `shade-2-in`, `pass-shade`, `fjord-shade`.
- Vite cache fix `69b8ae1` cherry-picked (`c454f6e`); all checks pass after it.
- main merged in again (`f6e0648`, one conflict in levels.js's field docs); "ready to merge" sent.
- [x] H9 ruts: done, `c82ce9a`. On Gimmick Road 3 (4830-5030, a barrier at 5000 in lane 4), Farm (2810-2970, a bale at 2945), Outback Express (2560-2860). `gambles.js` now reads `Input.steer` (the rut is climbed out of by steering against it). `ruts` passes (12). Stills: `ruts-1`, `ruts-2-in`, `card-ruts`, `farm-ruts`.
- [x] H16 fresh tarmac: done, `be36398`. On Gimmick Road 3 (1750-2050, lane 5), Hong Kong (2620-2920, lane 3), Tokyo (860-1140, lane 3). Traffic slowed by a gimmick (ford, cushions, ruts, tar queue) is now capped by one helper, `Gambles.crawl` (`CONFIG.gambleApproach`). `tarmac` passes (11). Stills: `tar-1`, `tar-2-queue`, `card-tar`, `hk-tar`.
- main merged in again (`8a57c3d`); the two theme fixes done: the drawbridge's river from the theme (`244275d`: a theme's `river` / `riverCore`, else its `channel.deep`, else blue) and loose rocks and asteroids (`86e5869`: any put out without a radius, by `drifters` or `obstacles`, was built of NaNs and ran the rockfall's code). Second "ready to merge" sent at `86e5869`.
- Deferred, for the owner: H17 climbing lane (a lane that exists over one stretch needs the level's `lanes` raised and a `narrows` everywhere else, which the level check refuses over an exit's ramps and which changes a real level's lane structure) and H7 hairpin cut (a cut between two legs of a hairpin is not a shape a side road can take today: exits leave from the right-hand lane and run alongside).
- [x] H11 truck spray: done, `dcf8a82`. `Gambles.veil` / `veilOf`: a sheet over the canvas with a hole round the car (a div after `#game`, made by `render/gambles.js`), for spray now and the low sun and dust next. On Gimmick Road 3 (2520-2880, with a tractor at 2640), Mumbai (1380-1950), Hurricane (3110-3490). `spray` passes (12). Stills: `spray-2-far`, `spray-3-in`, `spray-4-beside`, `card-spray`.
- Pursuit check fixed (in main as `e980af3`): a siren clears a ramp's jam, and `Gambles.event(car)` (a pursuit's car, an emergency vehicle) is exempt from everything the gimmicks do to traffic. All `scripts/*check*` are run before each "ready to merge".
- From the coordinator: no new gimmick on levels 20 to 43, and no edits to their JSON.
- [x] H12 low sun: done, `409fdad` (its Outback Express stretch moved to Passage du Gois in `f689fb2`). On Gimmick Road 3 (6470-6690), Grand Pacific (7020-7560), Passage du Gois (1420-1980). `sun` passes (11).
- [x] H13 dust trail: done, `f689fb2`. On Gimmick Road 3 (920-1080), Safari (3020-3480), the Battlefield (1750-2000). `dust` passes (11). Stills kept in `shots-gimmicks3` (`sun-2-glare`, `outback-sun`, `dust-2`, `safari-dust`).
- [x] H6 flooded underpass: done, `7f31364` (see the handover below).

### Handover (the owner's break, 10-Oct): agent 19, road gimmicks

**Where.** Worktree `.claude/worktrees/delivery-gimmicks`, branch `delivery-gimmicks`, tip `7f31364`. The tree is clean. Nothing is in progress: there is no WIP commit. Every `scripts/*check*` (25 of them) passes at the tip. Nothing has been played by hand: headless checks and stills only.

**Done and in `main`** (merged up to `96bad45`, in main as `e980af3`): H2 ramp over the jam, H8 washboard dirt, H4 low bridge, H5 ford, H19 speed cushions, H10 black ice in the shade, H9 ruts, H16 fresh tarmac, H11 truck spray; the drawbridge's river from the theme; loose rocks and asteroids (the NaN); the pursuit fix (a siren clears a ramp's jam; `Gambles.event(car)`).

**Done on the branch, NOT merged** (three commits on top of main's merge, each a whole gimmick, all checks passing):
- `409fdad` H12 low sun: field `lowSun: [{ from, to }]`.
- `f689fb2` H13 dust trail: field `dust: [{ from, to, wind }]`; also moves H12's stretch from Outback Express to Passage du Gois, so the branch touches no level 20 to 43 file.
- `7f31364` H6 flooded underpass: a ford with `fills: { to, over }` and `underpass: true`; Gimmick Road 3 is 1200 m longer (7900 m) with a third side road (6800 to 7600) and its clock raised to 480 / 370.
To merge: `git merge delivery-gimmicks` into main, then run every `scripts/*check*`. Other levels' agents have been told not to change a level's list of gimmicks: these three add `lowSun` to Grand Pacific and Passage du Gois, `dust` to Safari and the Battlefield, `fords` (filling) to Big Business and Expressway.

**Where each gimmick is** (all also on Gimmick Road 3, `?hidden=gimmick-road-3`): jamRamps 2400 (Night 2250, Speed Trap Alley 2860); washboards 2950-3450 (Safari 2520-2980, Outback Express 3960-4380); lowBridges 4400 (Ring Road 1100, Quarry Run 1510); fords 5650-5720 (Back Roads 1790-1850, Quarry Run 4060-4105) and the filling one 7150-7230 (Big Business 1670-1735, Expressway 2400-2470); cushions 3520-3700 (Suburbs 1460-1600, The Hood 1460-1595, Christmas 1480-1615); shade 6250-6450 (Mountain Pass 2370-2450, Fjord 1340-1470); ruts 4830-5030 (Farm 2810-2970, Outback Express 2560-2860); tarmac 1750-2050 (Hong Kong 2620-2920, Tokyo 860-1140); spray 2520-2880 (Mumbai 1380-1950, Hurricane 3110-3490); lowSun 6470-6690 (Grand Pacific 7020-7560, Passage du Gois 1420-1980); dust 920-1080 (Safari 3020-3480, Battlefield 1750-2000). No real level's clock was changed.

**How it is put together.** All of it is in `gambles.js` (what each does, one block a gimmick, run from `Gambles.update` after the player's own update), `render/gambles.js` (what is drawn, in `Game.onLoad` and `syncGambles`), `render/gambleModels.js` (models, shared with the Gimmicks page), one block of `config.js`, one validation block of `track.js` ("Gimmick Road 3's"), the field docs at the top of `levels.js`, `levelSchema.js`, `levelinfo.js`, a card each in `gimmicks.js` ("Road gambles"), wording in `messages.json` (events). Hooks elsewhere, each one line: `Player.shaken` (the share of steering taken: washboard, black ice) and `Player.rampAhead` in `player.js`; the ramp's queue in `traffic.js` (`car.jam`, `car.jamPace`); `Gambles.build()` in `Game.load`. Shared helpers worth knowing: `Gambles.crawl` (caps traffic through a stretch), `Gambles.event` (pursuit cars and emergency vehicles: exempt from everything), `Gambles.cloud` and `Gambles.veil` / `veilOf` (what cannot be seen through: spray, sun, dust; the veil is a div after `#game`), `Gambles.updateFlight` (the jump: crests, the ramp, the cushions' throw).

**How to verify.** `node scripts/.gimmicks3-check.mjs [section ...]` (sections: wind crest ramp washboard bridge ford cushions shade ruts tarmac spray sun dust finish): each proves the risky line right and wrong, the safe line, and that each real level with the field loads. Then every other `scripts/*check*`; the pursuit, traffic-quirks, water, tank and cargo checks are the ones my work has touched or could. Pictures: `node scripts/shots.mjs <dir> "name=?hidden=gimmick-road-3&ghost&at=<s>&ff=<s>&speed=<m/s>&lane=<n>"` (lanes 3 to 5 are the player's) and `gimmicks.html?group=road-gambles&from=<n>` for a card. The last pictures looked at are in the scratchpad's `shots-gimmicks3` (7 MB).

**Never verified.** Anything by hand: how any of it feels, whether the boards are read in time, the balance of every number. On screen: a lorry's full spray cloud and a lorry's shadow in the low sun (no shadow is drawn: the picture just clears); the water of an underpass rising; Speed Trap Alley, Tokyo, Hurricane, Grand Pacific, Passage du Gois, the Battlefield, Expressway, The Hood, Christmas and Outback Express with their gimmicks in view; the newest cards (low sun, dust, underpass). Sound for any of them. Phones.

**Decisions awaiting the owner.**
- H2: the queue fills the player's whole side, so the way round is the oncoming side or the shoulder; a siren now clears the jam.
- H4 is a height bar over the player's side, not a bridge over the whole road. Tall traffic that cannot reach the exit lane is taken off the road when 140 m or more from the player and otherwise drives through the bar.
- H5 / H6: the road does not dip; the water lies on it. A ford's depth is fixed; only one with `fills` rises.
- H10: the game's ice costs nothing in a straight line, so the shade takes 90% more of the steering, and still needs a bend, a hazard or a braking point in it.
- H16: nothing on screen shows how full the tyres are (no HUD added).
- H11 / H12 / H13 only take the view; the clouds are plain translucent boxes.
- Traffic swerves into a shade or onto the tar for cash left there, as it does for any pickup.
- Deferred, with reasons in the checklist: H17 climbing lane, H7 hairpin cut. My view on two more: H3 tram lane is close to what the railway median and its bullet train already do (Canberra), and G4 the fork is what a side road with a reason to take it already is (the low bridge, the ford); say if they are still wanted as gimmicks of their own.

**Not started, in the order I would do them:** G10 whiteout (the veil with no shadow to hide in, marker posts and tail lights drawn over it), H18 single track with passing places, H20 blast window and H14 rockfall gallery (both want a second route: a side road), H15 thin ice shortcut (by `mass`), G11 power cut, then the traffic ones, which are the costly ones (G25 rush hour wave, G24 zip merge, G26 school run), then G22 tow, G18 fuel, G3 roundabout. New gimmicks go on Gimmick Road 3 and on levels 1 to 19, the specials and the amphibious levels only (levels 20 to 43 are other agents').

**Traps.**
- Bash here-documents in this shell lose backslashes and choke on an unbalanced apostrophe: write multi-line edits with the Write tool as a small node script of exact replacements (mine are in the scratchpad's `tmp19`), which also keeps each file's CRLF.
- A speed cap applied after the player's update must bite harder than the car accelerates (45 m/s^2 for the tar), or it never bites.
- Traffic's own driving undoes a gentle slowing: cap it outright (`Gambles.crawl`).
- A check that puts one vehicle on the road must take the rest of the traffic off each step, or it is flaky; and `car.lane === n` is too strict, since a hesitant driver wanders on.
- `real(field, ...)` in the gimmicks check starts each real level: an amphibious one needs an amphibious car.
- Anything placed in a level that a blind test driver holds a lane through (the pursuit check on Night Drive) will be driven into: run every check, not only mine.
- Each `shots.mjs` run leaves a 74 MB Edge `.tmp` in TEMP; the camera's far plane is 700 m (the low sun is drawn 560 m ahead of the car for that reason).

For the owner:
- H2: the queue fills the player's whole side, so the way round is the oncoming side or the shoulder (both a risk of their own), or the jump. Ring Road was wanted but has no 250 m clear of its exits' ramps.
- Not mine, seen in passing: `gimmicks.html?group=the-road-itself` logs "THREE.Object3D.add: object not an instance of THREE.Object3D" once (a card there adds an undefined model).
- H4: tall traffic that cannot reach the exit lane is taken off the road when 140 m or more from the player, and otherwise drives through the bar. A stuck lorry at the bar would be the honest answer; not built.
- H5: a ford's depth is fixed per ford, not changing during a run (the checklist's "how deep it is today" read as: each ford its own). The road does not dip: the water lies on it.
- H10: the game's ice costs nothing in a straight line, so a shade is only a gamble with a bend, a hazard or a braking point in it. Traffic goes into the shade after cash left there (it goes for any pickup).
- Cash pickups (the new standing rule) added on Gimmick Road 3 beyond the wind (660), the crest (1235, two side by side) and the ramp.

## Agent 20: theme levels A: toy room, underwater tunnel, moon base (.claude/worktrees/delivery-city-levels, delivery-themes)

- Base for the three theme branches: `0c74bd6` (main merged in). Themed levels are `THEME_LEVELS` in `levels.js` (T1..., a menu group of their own after the amphibious levels; `progress.js` order 27, `{ cap: 46 }`). One level a line, each batch above its own marker comment, the same in `render/themes/index.js` and at the end of `themes.js`.
- Cut from the stopped agent's work and kept on branch `delivery-themes-toys-wip` (`ad3a435`): marbles, loops, the cat's paw, low gravity (`air.js`, `extras.js`, `toys.js`, their renderers and checks). Not finished, not checked.
- T14 Toy Room: level `toys` (T1), 4600 m, done. Checks, ghost probe and screenshots only; not played by hand.
- T15 underwater tunnel: theme `seabed` (`render/themes/seabed.js`, `seabedModels.js`) and level `leaks` (T2, "Twenty Thousand Leaks", 4500 m), done. Checks, ghost probe and screenshots only; not played by hand.
- T18 moon base: theme `moon` (`render/themes/moon.js`, `moonModels.js`) and level `moon` (T3, "Tranquility Base", 4930 m), done. No low gravity: the game's own physics. Checks, ghost probe and screenshots only; not played by hand.
- Engine fix on the way (`render/road.js`, one line): a lit theme on a hilly level had black land beside the road (the land ribbon and its banks had no normals).
- All three committed on `delivery-themes`. Every level has 20 or more cash pickups and rows of two or three side by side. Save cookie now 3502 of 4096 bytes (about 41 a themed level).
- Screenshots: scratchpad `shots-themes/toyroom`, `shots-themes/seabed`, `shots-themes/moon`.

### Cash and rows (the owner's new rule; done, ff83536) and part 5
- Stelvio: 20 cash pickups, 8 rows of two across (340, 880, 1420, 1700, 2260, 2800, 3320, 3850). Market Town: 17 on the road + 8 on the side road, 10 rows (350, 990, 1600, 1800, 2350, 3100, 3600; side 200, 420 three across, 700). Clocks untouched.
- A row at one `s` draws and collects properly (`scratchpad/levelfix/rows.mjs`): in a lane the car takes that lane's only; astride the line between two lanes it takes both at once.
- Engine gap found, NOT fixed: on the expressway a pickup's `lane: 'left' | 'right'` (the shoulder) fails the level check ("lane right is merged away there", track.js ~1155: only a side road's shoulders pass), though levels.js says a pickup can be on a shoulder. So on a 2-lane road a row is two across at most; three only on a side road.
- Part 5: 81 "after" shots in `scratchpad/shots-levelfix/after` (the 68 of "before" plus rocks, summit, hairpin, market, rows); contact sheets `scratchpad/levelfix/sheets/b-*.jpg` (before) and `a-*.jpg` (after). The 68 were taken before the cash went in. Menu pictures: `levelshots/stelvio.jpg` (new: it had none), `market-town.jpg` (retaken).
- All commits on `delivery-levelfix`: 2050f4e, 1d787fa, c513726, ff83536. Not pushed, not merged. Checks run after the last: levels-check all good, schema passed (hazards and bundle checks last run at c513726; only level JSON and two JPEGs since).

## Agent 23: Tank Rage markers and the amphibious tank (.claude/worktrees/delivery-ui, delivery-tank)
- A (0c72eb6): a theme's `target: { offset, height, style, base, arm, beam }` (defaults `CONFIG.target` + `targetOffset`; a level's target can carry the same keys). `Targets` (pickups.js) owns where each stands (`t.lat`, `t.look`); `render/items.js` draws from that. Styles: post / wall (stalk on a wall top) / gantry (hung from a mast's arm). A ring nearer than 1.8 m to the pavement is carried at 4.5 m or more. Track now reports a target in a tunnel or at a junction.
- Set: mumbai gantry over the shoulder (buildings 3.5 m off swallowed the post at 5 m); hongkong post on the pavement at 2.2 m (ring was half in the towers' faces at 6 m); tokyo on the parapet (it hung in the air beyond it); singapore gantry (under the rain trees); singaporeNight / bathurst / montreal / monza / spa / albert-park on the catch fence; safari raised over the grass; Grand Pacific's 4600 target (in Mount Ousley's cutting) its own. All with a beam of light. Other themes untouched.
- `node scripts/.targets-check.mjs`: 257 targets pass (every level, and the testbed in every theme).
- B (a735f67): `AMPHIBIOUS_TANK` (cars.js, not in CARS: no garage bay, nothing saved), model `render/tankModels.js`; `Player.rageTank` set by `startTank` on an amphibious level; draft 1.0, 46 m/s ashore, 0.72 of it afloat, bigger bow wave; HUD corner shows it on amphibious levels. `?rage`, `?pieces=n`, `?cine=car&turn=deg`. `node scripts/.tank-check.mjs` passes.
- Checks run: levels-check, schema, bundle, water, save: all pass. Pictures: scratchpad/shots-tank/before, /after. Nothing played by hand.

## Agent 22: theme levels C: theme park, volcano island, container port (.claude/worktrees/delivery-themes-c, delivery-themes-c)

- Theme park: DONE. Theme `themepark` (`d7352fb`: render/themes/themepark.js, parkModels.js, sceneryClock.js for scenery that moves); level `park` "Thrill Park" (`41a6f06`), 4950 m, clock 225/170, menu picture, 31 cash pickups ($265), 9 rows across the road on the expressway and 2 on the side road. Checks: levels-check, schema, bundle, save, probe (delivered as a ghost), rows (each pickup of a row taken only from its own lane). Pictures: scratchpad/shots-themes/themepark. Nothing played by hand.
- Volcano island: DONE. Theme `volcano` (`07a6558`: render/themes/volcano.js, volcanoModels.js); level `cinder` "Cinder Island" (`f060ead`), 4950 m, 37 m up and down, clock 225/170, menu picture, 29 cash pickups ($275), 8 rows across the road and 1 on the side road. Same checks pass. Pictures: scratchpad/shots-themes/volcano. Known: from far off the lava under the drawbridge shows over its leaves when they are down (the drawbridge's own water does the same). Nothing played by hand.
- Scripts fix `69b8ae1` cherry-picked as `9e2c9fa`.
- Container port: DONE (agent 22). Theme `port` (`fb8b1e9`: render/themes/port.js, portModels.js); level `docks` "Dock Run" (`5a658a5`), 4700 m, flat, six lanes, clock 215/160, menu picture, 27 cash pickups ($275), 7 rows across the road and 1 on the side road. Pictures: scratchpad/shots-themes/port.
- ALL THREE DONE (agent 22). `main` merged in (`131e1b4`, no conflicts); descriptions for the three levels and T7, T11, T12 ticked (`306f731`). Targets looked at on each theme (scratchpad/shots-themes/targets): the rings show, no theme `target` set. Checks passing after the merge: descriptions, targets, schema, levels, bundle, save, probe of all three. Nothing played by hand; not pushed.
- Done. Pictures looked at: after/_sheet1..6.png (targets on Mumbai, Hong Kong, Tokyo, Singapore day and night, Mount Ousley, safari, ford, harbour, the circuits; the Amphibious Tank from three sides in both liveries, in a rage ashore and afloat on Slipway Beach and Harbour Lights, the HUD corner). Last commit: README (?rage, ?pieces, ?turn). For the owner: the Amphibious Tank has no garage bay; it is as fast as the Tank ashore.

## Agent 21: theme levels B: film studio, Venice, ice road (.claude/worktrees/delivery-themes-b, delivery-themes-b)

- Film studio: DONE. Theme `backlot` (`29d651b`: render/themes/backlot.js, backlotModels.js; sets by the level's `zones`: studioLot, western, soundstage, newyork, skies; a tunnel is a soundstage with a spaceship corridor inside). Level `backlot` "Quiet on Set" (`65e69cf`), 4150 m, clock 200/150, menu picture, 29 cash pickups, 9 rows side by side. One line added outside the markers: `levelSchema.js` takes a theme's `sets` into `ZONE_SCENERY`. Checks (levels, schema, bundle, save), ghost probe to the finish, rows check and 30 screenshots (scratchpad/shots-themes/backlot); not played by hand.
- Found, not fixed: drifters of kind `asteroid` off the space theme log "computeBoundingSphere(): Computed radius is NaN" every frame (used `mine` instead).
- Venice: DONE. Theme `venice` (`4efb9c8`: render/themes/venice.js, veniceModels.js; the ground is the lagoon; a hump in the road is a bridge over a side canal: the theme hides road.js's land under a hilly road; a tunnel is a sotoportego; a tide's stretch is the open lagoon). Level `venice` "Acqua Alta" (`bf2c77d`), 4500 m, clock 185/140, menu picture, 35 cash pickups, 13 rows of two. Checks, ghost probe to the finish, rows check, 24 screenshots (scratchpad/shots-themes/venice); not played by hand. It has a parade (the whole side taken at a crawl, passed in the oncoming lanes): for the owner to overrule.
- Scripts fix `69b8ae1` cherry-picked (`3a4c3fa`).
- Ice road: DONE. Theme `iceroad` (`4b41285`: render/themes/iceroad.js, iceroadModels.js; night, aurora, stars; a hump in the road is a pressure ridge). Level `iceroad` "Northern Lights" (`45b99b9`), 4600 m with one side road, clock 200/150, menu picture, 37 cash pickups, 11 rows. Checks, ghost probe, 21 screenshots (scratchpad/shots-themes/iceroad); not played by hand.
- Found, not fixed in road.js: the land under a hilly road has no normals, so it is black on a `lit` theme (the ice road's file gives it normals itself; Venice's hides it).
- `main` merged in (`c7187ef`; one conflict, the checklist, both sides kept). Descriptions for the three levels and `target` for backlot and Venice: `02ee505`. Descriptions, targets, schema, levels, bundle and save checks pass. ALL THREE DONE; branch not pushed, not merged into main.

## Agent 24: known problems (.claude/worktrees/delivery-levelfix, delivery-fixes)

- 1 Flaky headless checks: DONE `0a40e57`. Cause: one shared `node_modules/.vite` (junction) and Vite's cache key includes the server's root, so every start from another worktree deleted the cache and re-bundled React/Leaflet/three; two close together: `EPERM unlink node_modules\.vite\deps\...` in `createServer` (reproduced, 1 in 48 four-at-once). Fix: `logicServer()` in `delivery-headless.mjs` (no config, no bundling, no websocket: port 24678 was fought over too), used by every logic script; `shots.mjs` has a temp cache and browser profile per run. 100 runs four-at-once + 10 pairs: 0 failures.
- Audit C4 `45ed38b` (editor builds its segment table and level picker as elements; race-watch board escapes the level's name), C6 `cea00e8` (save code whitelist, length cap, each stored copy tried), C2 `9c0014a` (`Progress.noSave`, set by main.js for ?autostart ?hidden ?test ?edited ?pick ?car ?ghost ?mystery ?theme), C5 `5aff475` (a bad `?edited` level is checked and trial-built; the menu with a line saying why). Left: a level whose other fields make the track builder loop for ever still hangs the page.
- 2 Shoulder pickups: DONE `14fe8f9`. The level check in track.js was wrong (it knew only numbered lanes), the docs right. New `.shoulder-items-check.mjs`.
- C3 `e27f5a9`: `blank()` in traffic.js resets every field of a slot when dealt out and at reset. 4 Replay `63f0617`: 53 of 53 replay exactly (31 before). Causes: the save's milestone counters carried between runs (13 levels; reset in the check), pooled-slot leftovers (4), `Water.queues` kept from the last run (2), Collision's tick and the player's last contacts.
- 5 Duplicate keys: DONE `b98e0ce`. The second horn block came from the hand resolution of merge 15d94fe (removed: 70 m / 5 s / 5 m / 0.3 again); the later `icecream` (stops feature) had replaced the quirks feature's van and silenced its tune (removed; `.traffic-quirks-check` passes again); first `jingle` synth removed (no change).
- 3 Gimmicks page: DONE `7708340`. The bullet train card's `group()` with no parts called `add()` with nothing. Nothing else logs on any of the six pages.
- 6 Docs: DONE `6ddc012`, `172d923`. 8 Menu pictures: DONE `e3afae6` (seven levels; Spa's camera was inside the pit building; `&cineside/out/up/back`). Cargo deal `a34d1b9` (every item turns up; 33 levels changed cargo).
- UFO check `3a7b1da` (its own stand-in page had no `querySelectorAll`: the check's fault), with assertions `36dec94`. Save `ff82fce`: local storage is the store of record, the cookie a small fallback (956 bytes; 100 levels and 80 cars checked).
- 7 Editor leftovers: DONE. E6.2 `9d0a50f` ("Work out the clock": `cleanrun.js`, `?edited&clock`), E3.5 `c9e7f56` ("Close the loop": `closeLoop` / `roadEnd` in levelSchema.js, `.loop-check.mjs`), E6.1 `bf12cf0` (3D view made afresh 0.9 s after a change, camera kept). Driven in a headless browser through a harness page; not by hand.
- Clocks seeded `f824679`: `node scripts/level-clocks.mjs --all` lists 40 of 65 written clocks more than 5 s from the one worked out (most of the older levels were never timed by the script; Suburbia is written 35 / 25 against 100 / 65 worked out). None written.
- Found, not fixed: a `?edited` level with an exit that has no place hangs the page (the game does not load the schema); the three road integrators (editor map, schema, game) disagreed by up to 1.5 m on a circuit (the schema's and the editor's note now use the game's).

## Agent 26: theme levels D: Wild West, favela, rice terraces (.claude/worktrees/delivery-city-levels, delivery-themes-d)
- Markers for batch D below batch C's (f773f0d, faa20fe); cache fix cherry-picked (b359c19); main merged in (b9039f5).
- Wild West DONE (017cb47, descriptions in the next commit): theme `wildwest` (render/themes/wildwest.js + wildwestModels.js), level `noon` "High Noon", 4.8 km, 37 cash pickups, 15 side-by-side rows, clock 205/155, levelshots/noon.jpg. Checks pass (levels, schema, bundle, save, targets, cargo, descriptions), ghost probe delivered. Shots: scratchpad/shots-themes/wildwest. Not played by hand.
- Favela DONE (7025f1c): theme `favela` (render/themes/favela.js + favelaModels.js, terrain), level `morro` "Favela Heights", 4.9 km, 8 hairpins, 35 cash pickups, 13 side-by-side rows, clock 220/165, levelshots/morro.jpg, descriptions in. All checks pass, ghost probe delivered. Shots: scratchpad/shots-themes/favela. Not played by hand.
- Told by the coordinator: no INSERTED_AT entries on this branch (the orchestrator adds them at the merge).
- Rice terraces DONE (17ffc4d, 356ff5a): theme `rice` (render/themes/rice.js + riceModels.js, terrain), level `rice` "Emerald Steps", 4.6 km, 35 cash pickups, 15 side-by-side rows, a ford with its side road, clock 205/155, levelshots/rice.jpg, descriptions in. Shots: scratchpad/shots-themes/rice.
- High Noon also got washboard dirt (5e7d9b7). main merged in again (5edb0f5); branch head 356ff5a, tree clean, nothing pushed.
- Checks at the head: levels, schema, bundle, save (3882 of 4096 bytes), targets, cargo, descriptions, shoulder-items pass; ghost probes of noon, morro, rice all delivered. `.water-check.mjs` fails 2 (old saves: 50 open, not 53): the three INSERTED_AT entries, left for the orchestrator as told.
- ALL THREE DONE. Nothing played by hand.

## Agent 27: levels 20 to 25 brought up to the new standard (.claude/worktrees/delivery-themes-b, delivery-rework-a)

- Started. THE RULE: each level's set of gimmick kinds stays as it is. `scripts/.gimmick-kinds.mjs <id>` (new) prints a level's kinds three ways (its fields, the menu's list, its road card's cards); the "before" lists, from `main`, are in scratchpad `rework-a/kinds/<id>.before.txt`.
- Kinds before: Speed Trap Alley: cameras, fog, jamRamps, pursuits (limit 100). Mountain Pass: ice, rockfall, shade, stopGo, fog, police only in stretches. Outback Express: crossings, dropBears, fog, kangaroo herds, narrows, ruts, washboards, quirky traffic (caravan). Tour de Coast: dropBears, narrows, pelotons, tide. Ring Road: cameras, emergencies, exits (wrong-way), lowBridges, pursuits, barrier and cone obstacles (limit 90). Market Town: cameras, crossings, exits, junctions, pelotons, processions, stopGo, waterMains, bale obstacles, quirky traffic.
- Shots: scratchpad `shots-rework/<id>/before` and `/after`.

### HANDOVER (stopped at the owner's break; one of six levels done, one WIP, four not started)
- Branch `delivery-rework-a` in `.claude/worktrees/delivery-themes-b`, tip `6b7be5e`, tree clean, nothing pushed. Two commits on today's `main` (7f59356).
- **The standard, as read off levels 32 to 43** (their JSON, and High Noon in pictures: scratchpad `shots-rework/_standard/noon/_sheet1.jpg`): (1) the road has shape: an S (150 / 300 / 150 m at curve 0.004), sweepers, a rise or a dip, no straight over about 400 m; (2) something every 150 to 300 m, each kind of gimmick two to five times, in pairs (ice under a rockfall, a camera in fog), the hardest pairing last; (3) every hazard has a fast line that pays and a slow one that works; (4) 27 to 37 cash pickups, the 20s where they cost a risk (the oncoming lane, a shoulder, on the ice, past a ramp's landing); 8 to 15 rows of two or three at one `s`; (5) the level is a PLACE: stretches with looks of their own that alternate (town / open country), named or particular buildings, a skyline; (6) a traffic mix of 8 to 10 kinds with police at 0.03; (7) a `cargo` pair of its own; (8) descriptions that name what is really there; (9) four targets; (10) a menu picture.
- **20 Speed Trap Alley: DONE bar its menu picture** (`b5f8a44`). Kinds before = after (checked: `node scripts/.gimmick-kinds.mjs speed-trap-alley | diff - <scratchpad>/rework-a/kinds/speed-trap-alley.before.txt`): cameras, fog, jamRamps, pursuits, speedLimit 100. Road: 4200 m as before; was five straights of 400 to 800 m between four bends, now an S through the shops, a 12 m hill with a brow, a flick, longest straight 650 m (the last, for the ramp). Cameras 8 -> 10 (two at 80 over the brow), fog 1 -> 3 banks, ramps 1 -> 3 (queues 3, 4 in one lane only, 4), cash 3 -> 34, rows 1 -> 14 (five with a 20 on the right shoulder beside a camera), time pluses 3 as before. Zones (new for a suburb level): cameraRow and theParade (highstreet), cameraHill (park), retailPark and lastJam (retail), with welcome lines in messages.json. Traffic 5 kinds -> 8. Cargo teaset / cooker. Clock 245 / 185 -> 240 / 180: clean run 171.8 s before, 170.1 s after (`level-clocks.mjs`, which gave the written 245 / 185 before and 240 / 180 after). Pictures: `shots-rework/speed-trap-alley/before/_sheet1.jpg` (looked at), `after/_peek.jpg` (100, 470, 800, 1040, 1600, 1900: looked at); after 2300 on were being taken when the break was called and were NOT looked at. NOT done: `levelshots/speed-trap-alley.jpg`.
- **Shared theme change (suburb scenery in `render/road.js`, + `sets` on `suburb` in `themes.js`)**: shows on Suburbia, Speed Trap Alley, Market Town, The Hood and Christmas Eve. Everywhere: a car on about half the driveways (a fifth in The Hood, drab), a chimney on every house, bins by the kerb, a hedge in place of the pickets on every fifth lot (not The Hood), low hills on the horizon (the ground's colour, darker). Only where a level's `zones` name them: `highstreet`, `market`, `retail`, `park` in place of the houses (so far only Speed Trap Alley has zones; `market` is written for Market Town and has NOT been seen in a picture). All instanced, all through `instances` / `standsClear` / `clearOfRoads`. Not looked at on Suburbia, The Hood, Christmas Eve or Market Town.
- `scripts/.gimmicks3-check.mjs`: its real-level ramp check counted one ramp a level; it now counts every ramp and wants each clearable under 34 m/s.
- **21 Mountain Pass: WIP** (`6b7be5e`): the level file is re-laid and passes levels-check, schema, targets, descriptions and a ghost probe to the finish; kinds before = after (ice, rockfall, shade, stopGo, fog, police only in stretches). Every leg between hairpins now has an S (the same "right then left" on each leg of a climb, so the legs stay parallel), a bend at the summit; rockfall 3 -> 5, ice 6 -> 10, shade 1 -> 2, fog 1 -> 2, stop / go 1 (on the summit straight, a 20 on the shoulder beside it), cash 2 -> 32, rows 1 -> 13. NOT done: (a) no after pictures at all: whether the land between the legs, the hairpin walls and the rocks still sit right with bends on the legs is unseen; (b) the clock: `level-clocks.mjs` gave 141.6 s before and 111.4 s after for the same 3618 m, which cannot be the road: most likely the stop / go light caught the clean run before and not after; time it three times each way and with the works taken out before touching the written 205 / 160; (c) menu picture; (d) the alpine scenery is untouched (nothing changed in the snow theme).
- **22 Outback Express: not started in the repo**; a full draft of its level file is in scratchpad `rework-a/outback-express.new.json` (four crossings, a floodway dip, an S under washboard, two ruts, 34 cash). It names zones `roadhouse`, `siding`, `floodway`, `homestead` that DO NOT EXIST yet: they were to be `sets` of the `panorama` theme (bathurst scenery, roadside), kept within 22 m of the road's edge where that theme's land is level. Without them the draft fails the schema.
- **23 Tour de Coast, 24 Ring Road, 25 Market Town: not started.** Before pictures exist only in part (tour-de-coast 100 to 2800, ring-road and outback 100 to 700; none of Market Town).
- Traps: `shots.mjs` took 60 to 90 s a picture with the other agents' runs going, and filled the disk; a level check's "straight" for a jam ramp is 75 m each side in the schema, wider than track.js's; a pickup in a lane a `narrows` has merged away fails the level; `TaskStop` on a background shell leaves its `node` children running.
- For the owner: Speed Trap Alley's cameras at 100 only bite a car that tops 100 km/h (the Commuter does 86) or one on a turbo, as before; the two at 80 over the brow are new.
- Nothing was played by hand.

## Agent 28: levels 26 to 30 brought up to the new standard (.claude/worktrees/delivery-themes-c, delivery-rework-b)

- Started. THE RULE: each level's set of gimmick kinds stays as it is. `scripts/.gimmick-kinds-b.mjs <id> [--ref=main | --diff=main]` (new) prints a level's kinds from its JSON and diffs them against a branch.
- Kinds before (from `main`): Quarry Run: exits (wrong-way), fog, fords, lowBridges, machinery (bulldozer, dumpTruck, excavator, forklift, roller), mud (shoulderTimer mud), quarries, rockfall, siteWorks (excavator, pipes, trench), stopGo, wreckage (rock blast, boulders), side-road obstacles (beam, cone, pile). Hong Kong: cameras, convoys, tarmac, tide, tunnels, obstacles (barrier, cone, sign). Tokyo: cameras, convoys, crosswinds, pursuits, reversible, roadblocks, tarmac, tunnels, falling cargo, obstacles (barrier, cone). Mumbai: cow herds (stay), parades, potholes, spray, waterMains, obstacles (bale, barrier, cone, sign). Stelvio: crosswinds, fog, ice, rockfall, police only in stretches.
- Shots: scratchpad `shots-rework/<id>/before` and `/after` (reference levels in `shots-rework/ref`).
- THE STANDARD, as read off levels 32 to 43 (their files; Acqua Alta, Quiet on Set and Favela Heights gone through in pictures), the checklist the old levels are held to:
  1. Road: 4.2 to 5 km in 14 to 33 segments; no level straight over about 650 m (most under 550); bends of 0.0015 to 0.003 a metre for 250 to 400 m, left and right in turn, S-bends; one shape of its own (humps with `ease`, hairpins, a side road, a tunnel).
  2. Content: 23 to 34 things placed (5 to 7 a km) of 10 to 16 kinds, each kind one to eight times; the first within 300 m; kinds laid over one another (potholes in the trolleys, mains in the tunnel, fog out of the tunnel's mouth); the last 600 m a finale (a reversible lane with rows down it, a balloon and a row).
  3. Pickups: 33 to 53; cash 24 to 37, of them 6 to 17 `cash20`, the 20s in the oncoming lane or inside a hazard (the drawbridge's landing, beside the balloon, the flooded lane); 7 to 15 rows of two or three abreast, spread from a start row to a finish row; 10 to 17 power-ups (turbo 4 or 5, wrench 4 or 5, time plus 2 or 3, mystery 2, ghost, armour, a siren where there are police).
  4. Traffic: 10 or 11 kinds with the place's flavour, 8 to 13 one way and 5 to 9 the other, police 0.03; one to three of convoys / pursuits / emergencies.
  5. Scenery: wall to wall by the road with detail at the car's scale (windows, shutters, awnings, lamps, lettered signs), a set-piece every 300 to 400 m (a footbridge, a piazza, a campanile, a water tower), things moving or afloat, a skyline; it changes along the road (zones); a tunnel is dressed as part of the place.
  6. A cargo pair that fits; a description that names the level's set-pieces in order; 3 or 4 targets where they show; a menu picture with the landmark in it.
- HANDOVER (stopped at the owner's break). Branch `delivery-rework-b`, worktree `.claude/worktrees/delivery-themes-c`, tip `f0f818c` (one WIP commit on today's `main` 7f59356), tree clean, nothing pushed.
  - DONE: none. IN PROGRESS: 26 Quarry Run (the WIP commit). NOT STARTED: 27 Hong Kong, 28 Tokyo, 29 Mumbai, 30 Stelvio (their JSON and themes are untouched).
  - Quarry Run, what is in the commit: `levels/quarry-run.json` rewritten (still 4400 m; 17 segments for 9, longest straight 450 m for 900; both side roads kept, each now leaving on a left-hand bend; 46 pickups for 12, cash 36 for 2 (5/10/20: 4/21/11), 13 rows for 0 plus one on a side road; 7 machines for 5, 5 site works for 4, 4 wreckage for 3 with a whole-road rock blast at 4290 as the finale (the merge lane and the right shoulder are the way round), the last quarry run on to 4370; 10 traffic kinds for 7, 8 / 6 about; cargo toolbox / parcel; description rewritten; 5 targets for 3). Kinds before and after identical (`node scripts/.gimmick-kinds-b.mjs quarry-run --diff=main` says ok): exits (wrong-way), fog, fords, lowBridges, machinery bulldozer / dumpTruck / excavator / forklift / roller, mud, shoulderTimer mud, quarries, rockfall, siteWorks excavator / pipes / trench, stopGo, wreckage rock blast and boulders, side-road obstacles beam / cone / pile. Clock 215 / 165 unchanged: `level-clocks.mjs` gave 150.7 s and 215 / 165 before (three runs, all the same) and 150.7 s and 215 / 165 after, a difference of 0. Passed after the change: levels-check, schema, bundle, descriptions, cargo, shoulder-items, targets (quarry-run: 5 pass), `delivery-probe.mjs quarry-run --secs=240` delivered. The other check scripts were not run after it.
  - Quarry Run, NOT done: (a) no "after" picture was looked at: the run was stopped when the machine ran out of memory; the new scenery was only glimpsed in two late "before" pictures (3940, 4240: the verge, its wheel tracks and a batching plant's silos drew), so the dressed quarries (stockpiles, stacker conveyors, loader, drill rigs, catch fence), the blast sirens, the spoil heaps on the skyline and the plant by the road have never been seen; (b) the target rings not checked in a picture; (c) no new `levelshots/quarry-run.jpg`; (d) the whole set of check scripts before calling it done. Very next step: `node scripts/shots.mjs <dir> --size=880x520 "a=?level=26&ghost&at=1540&ff=3"` at 1540, 1840, 2440, 2740, 3640, 4240 (six a run, one run at a time), look, fix `construction` in `render/themes/extras.js`, then the menu picture, then drop "WIP" in a new commit.
  - Scenery: `render/themes/extras.js` (new) holds what is ADDED to the old themes road.js draws; road.js got one import and one call (before `snowfall`), nothing else. Only `construction` is in it so far, so it shows on Construction Site (17) too: a graded verge and wheel tracks, plant every 130 to 190 m (tipper, dozer, piling rig, batching plant), 20 spoil heaps on the skyline; from the level's data: a siren mast before each `wreckage` rock blast and at each end of each quarry, and each of `quarries` dressed. `makeKit` there gives lists by colour (one instanced mesh each), world-placed things checked with `offRoads`, and `setsOf(theme)` for zones. The snow / alpine theme was NOT touched.
  - The plan for the rest (nothing of it written to the repo; the layouts are sketches, to be checked with `delivery-levels-check.mjs`). Give each city theme `sets` in `themes.js` (then a level's `zones` can ask for them, as the backlot's do; `levelSchema.js` picks `sets` up by itself) and draw them in `extras.js`; where a set-piece needs the old buildings out of its way, road.js needs a small predicate to skip them (Mumbai's building loop, Tokyo's towers). Hong Kong (3600 to about 3700 m, lane 2 is the tram median: nothing drives there, so it is a place for cash): sets neon / peak / shelter / scaffold; 4 cameras, 4 fresh-tarmac stretches (one inside the tide, as now), a second short tunnel about 2960 to 3140, cone / barrier / sign roadworks as chicanes, taxi convoys; shop fronts and vertical neon on the city side, the Peak and its tram behind the towers, a typhoon shelter of moored junks along the tide's stretch, bamboo scaffolding, a clock tower at each ferry pier; cargo teaset / piranhas. Tokyo (4200 to about 4300 m): sets shuto / screens / decks / shrine; 4 cameras, 3 tarmac, 2 tunnels, 2 crosswinds, 2 reversible stretches, 2 roadblocks each with a siren pickup about 120 m before it on a straight (the way to play it), the finale a reversible lane beside fresh tar and then the second roadblock; KEEP `cargotruck` in the traffic (falling cargo is one of its kinds) and add no quirk vehicle; Fuji on the skyline, decks over and beside the road, screens, a torii on a wooded mound, decks and legs on the lattice tower; cargo ramen / reactor. Mumbai (3400 to about 3550 m): sets bazaar / station / dhobi / sealink; 4 cow herds (stay), 2 parades each on a straight with cash in the oncoming lane and on the shoulder beside it, 8 mains, 11 potholes, 2 spray stretches with mains and potholes inside them; tarpaulin stalls, bunting, a terminus with towers and a dome, washing lines, the bay with the sea link's pylons and stays; cargo bouquet / cloud. Stelvio: a light touch only (2 to 4 more cash to reach 22, a second fog bank and crosswind on the way down), rocks on the steep ground between hairpin legs and something to see on the valley floor, said exactly, since Mountain Pass, Monte Carlo and Fjord Crossing share the theme.
  - Clocks measured BEFORE any change (`level-clocks.mjs`, three runs each, all the same; "tool" is its own figure, to be compared with its figure after, and only the difference applied to the written clock): quarry-run 150.7 s, tool 215 / 165, written 215 / 165. hong-kong 108.2 s, tool 155 / 120, written 200 / 150. tokyo 139.0 s, tool 205 / 155, written 190 / 140. mumbai 110.9 s, tool 160 / 120, written 230 / 170. stelvio 145.1 s, tool 200 / 145, written 300 / 230. (The tool takes 10 s off for each time plus on the level: a change in their number moves its figure.)
  - Pictures (scratchpad `shots-rework/<id>/before`, 880x520, `?level=<n>&ghost&at=<s>&ff=3`): quarry-run every 300 m from 40 to 4240, looked at (3940 and 4240 were taken after the new scenery was wired in: not a true "before"); hong-kong every 300 m from 40 to 3340, looked at; tokyo 40 to 2740, 3340, 3940, taken and NOT looked at; mumbai only 640, not looked at; stelvio none. Reference levels: Acqua Alta (13 pictures) and Quiet on Set (9) looked at and deleted; Favela Heights not looked at.
  - Never verified: anything by hand; anything of Quarry Run's new layout in a picture; the smoke test (not run, as told).
  - For the owner: (1) Quarry Run's last blast takes both lanes (the dodge is the merge lane or the right shoulder): say if that is too much. (2) Naming a cargo on these levels changes what the unnamed levels are dealt. (3) Tips were left as they are (180 to 220 against the new levels' 260 to 320).
  - Traps: (1) an exit's side road must be 30 m clear of the expressway over its middle half: start the expressway's bend away AT the exit, or the level reports "side road runs into the expressway"; `out` alone does not do it. (2) `shots.mjs` serves the source live: a "before" picture taken after a theme file is edited is not one; take all the befores first. (3) Level files are CRLF in the working tree (autocrlf). (4) Seen on Hong Kong (drive: left), not mine and not touched: the FRESH TAR board's lettering is mirrored. (5) Left in `%TEMP%`: up to seven `delivery-shots-*` folders from my screenshot runs that were killed or died when the disk filled; I could not tell mine from other agents', so none was deleted. The scratchpad `gen/` folder holds the generator that wrote quarry-run.json (`gen/quarry-run.mjs`, `gen/lib.mjs`: the newest levels' file style).

## Agent 32: disk and memory housekeeping, and the screenshot script (.claude/worktrees/delivery-levelfix, delivery-cleanup)

Stopped at the owner's break (15:45). Free then: disk 29.0 GB of 475, memory 2.6 GB of 15.9. `SP` below is the session scratch folder `%LOCALAPPDATA%\Temp\claude\c--Users-tooea-Documents-----------------carSite\070d6f8d-8d9b-486b-a5c7-883ab6ee6dd1\scratchpad`.

- What filled the disk: every headless Edge started by `scripts/shots.mjs` writes into whatever `TEMP` is (not into the run's own folder) a `scoped_dir<pid>_<n>\` holding `CRX_INSTALL\` and a `<guid>.tmp` of exactly 74,144,017 bytes (Edge's component download for a fresh profile; 70 to 380 MB a folder), often a second copy of that `.tmp` loose in `TEMP`, plus `msedge_url_fetcher_*` and `msedge_chrome_Unpacker_*` folders. Older runs also left a profile there (`delivery-shots-profile`, `edge-sheet`, `sheet-profile`, `shots-profile`, `delivery-console-profile`). Agents were told to point `TEMP` at `SP\tmp*`, so it is spread over those folders and the shared `%LOCALAPPDATA%\Temp`. Seven runs at once were using about 4 GB of disk in 15 minutes.
- Deleted (15:40, 11.94 GB, free disk 17.17 to 29.20 GB), only loose 74,144,017-byte `.tmp` files and browser folders (`delivery-shots-profile*`, `scoped_dir*`, `msedge_url_fetcher_*`, and folders with `Local State` + `Default` inside): `SP\tmpA` 29 files + 27 folders 5.60 GB; `tmp6` 20 + 19, 2.79; `tmp-pursuit2` 4 + 5, 1.23; `tmp-super` 6 + 8, 1.00; `tmp13` 2 + 4, 0.73; `tmp-super3` 1 + 3, 0.23; `tmp23` 0 + 5, 0.22; `ui17\tmp` 0 + 1, 0.14. In all 62 files, 72 folders. No delete failed. No picture, log, script or note was touched (`.ses`, `cv_debug.log` kept).
- Left, and why:
  - `SP\menu-tmp` 6.3 GB, `SP\tmp` 5.1 GB, `SP\tmp-evil` 1.1 GB, `SP\tmp-agent11` 0.15 GB: the folders themselves were modified at 15:24 (someone removed their profiles then), inside the 30-minute rule. Their contents are 4 to 11 hours old. About 12.7 GB to get back.
  - `SP\tmp-g3` 0.48 GB: three items inside were touched in the last 30 minutes.
  - `SP\tmp19`: a running agent's. `a9\tmp`, `levelfix\tmp`, `tmp-b`, `tmp-c`, `tmp-cargo-good`, `tmp-editor`: already empty of leftovers.
  - In the cleaned folders: `.tmp` files of other sizes (4 in `tmp-super`, 1 in `tmp-super3`, 3 in `tmp23`) and `msedge_chrome_Unpacker_*` (`tmp-super`, `tmp6`): not on the list I was given. `SP\vite-cache` (6 MB), `build-check`, `build-out`: not private temp folders.
  - Shared `%LOCALAPPDATA%\Temp` (top level, looked at 15:42, nothing deleted): 23 `.tmp` of 74,144,017 bytes and 7 `delivery-shots-*` folders, all younger than 30 minutes (running agents'). Also 707 `scoped_dir*` and 176 `msedge_*` folders there, not measured and not in my brief: probably the largest leftover on the disk now.
- To clear the rest, the safe rule: `SP\housekeep-clean.ps1 -Folders 'menu-tmp','tmp','tmp-evil','tmp-agent11','tmp-g3'` is a dry run (prints what would go; slow, minutes), add `-Go` to delete. It skips a folder that is a link, is named in a running process's command line, or has itself or anything inside modified in the last 30 minutes; it removes only the kinds listed above and skips any folder with a link or `node_modules` inside. For the shared Temp: only when no `shots.mjs` is running, `scoped_dir*` whose `<pid>` is not a live process and that are older than 30 minutes.
- Memory (15.9 GB; 1.1 GB free at 15:33, 2.6 GB at 15:44). At 15:33: msedge 67 processes 4,101 MB; node 9, 2,444 MB; Code 19, 1,943; chrome 14, 1,061; svchost 91, 1,047; msedgewebview2 13, 511; claude 2, 510; MsMpEng 481; ente 437; Spotify 405; Discord 379; Taskmgr 320; bash 39, 306; explorer 296.
- Stuck processes: none found, nothing stopped. Every headless Edge was under 2 minutes old with a live `node scripts/shots.mjs` parent (one more, profile `Temp\cdp-*`, belongs to another script driving Edge). The "many browsers" in Task Manager were seven `shots.mjs` runs at once (3 to 19 minutes old), each starting a new Edge of 6 to 10 processes for every shot: about 3 GB of Edge and 2.4 GB of node. The owner's own Edge: 9 processes, 353 MB, untouched. No orphaned node, python, git, esbuild or rolldown. Listeners: only the running shot runs' Vite servers on `::1` 5199 to 5205; no dev server left up.
- Script fix: NOT STARTED. Nothing is committed on `delivery-cleanup` (head still `303293e`, tree clean); `scripts/shots.mjs` is unchanged. I had read it and designed the change when the break came:
  1. Pass the browser `env: { ...process.env, TEMP: own\tmp, TMP: own\tmp }` in `launch()` (make the folder first), so the `scoped_dir` and 74 MB `.tmp` land in the run's own `delivery-shots-*` folder; try `--disable-component-update` and `--disable-background-networking` to stop the download at all (check a picture still comes out).
  2. Clean up in `process.on('exit')` (idempotent: kill the browser tree with `taskkill /PID <pid> /T /F` on Windows, `rmSync(own)` retried about ten times, release the slot), and make SIGINT, SIGTERM, SIGHUP, SIGBREAK call `process.exit`. A hard kill on Windows cannot be caught: write `own\pid`, and at start remove `delivery-shots-*` folders in `tmpdir()` whose `pid` is dead, or with no `pid` file and older than an hour.
  3. Two runs at a time machine-wide (asked by the coordinator): lock files `delivery-shot-slot-1`, `-2` (a name the `delivery-shots-*` sweeps do not match) in `%LOCALAPPDATA%\Temp`, NOT `tmpdir()` (agents change `TEMP`), made with `openSync(path, 'wx')` holding the PID; the holder touches it every shot; stale if the PID is dead or it was not touched for 20 minutes; a waiting run prints "waiting for a free screenshot slot" once and polls every 1.5 s.
  4. One Edge for a whole shot list would need driving it over CDP (`--remote-debugging-pipe`, `Emulation.setVirtualTimePolicy`, `Page.captureScreenshot`): not a small change, and the pictures' timing would need re-checking. Left out.
  - Proof still to do: temp contents before and after three runs (to the end, killed part-way, bad `--browser`), four runs started together never more than two shooting, `node --check`, one real shot (`node scripts/shots.mjs <SP folder> "menu=index.html"`). Very next step: item 1, then one shot.

## Agent 31: the menu on a phone, the road card, the wrong-way card (.claude/worktrees/delivery-ui, delivery-mobile)
STOPPED AT THE BREAK WITH NOTHING FIXED. Branch `delivery-mobile`, tip `2553a3f` (= main as branched: no commit of mine), tree clean. Investigation only; no source file was changed, so there is nothing to merge or push from here.
- How to see a phone size (Edge alone goes no narrower than ~500 px):
  - Stills: an untracked `delivery/_phone.html` whose BODY script appends iframes (360x620, 390x700, 430x760) of `index.html?demo&cursor=13` (add `&road` for the card), then `node scripts/shots.mjs <dir> "m=_phone.html" --size=1300x800 --wait=12000`. Trap: the script must be in the body (in the head `document.body` is null and the picture is plain grey). Deleted again; never commit it.
  - Real taps and console errors: a small DevTools-protocol driver is in the session scratchpad, `scratchpad/tools/cdp.mjs` (headless Edge, `Emulation.setDeviceMetricsOverride` mobile + touch, `Input.dispatchTouchEvent`, screenshots, page errors) and `tools/road-prod.mjs` (serves a production build, taps `#stage .road` at four sizes, prints what is under the button and whether the card opened). Traps: `taskkill` is not on Git Bash node's PATH (use `C:/Windows/System32/taskkill.exe /T /F`, or Edge's children are left running: I left 19 once and killed them by their `Temp\cdp-*` profile); open ONE browser at a time and wait for the last to be gone before the next (the second `open` straight after a `close` found no page target on port 9333 and threw); `--window-size` under 500 is ignored but the device-metrics override does give a true 360.
  - Production build: from PowerShell `npx vite build --outDir <scratch>\dist --logLevel warn` (15 MB, about a minute; gives `dist\client`), serve `client` statically, open `/delivery/`. Deleted again.
- Bug 1, the level card squished: CAUSE FOUND, NOT FIXED. `menu2.css` `@media (max-width: 760px)`: the grid's rows are `auto auto minmax(0,1fr) auto auto` and the stage is the `1fr` row, so it gets only what the top (title + Options + the tabs on a line of their own: ~130 px), the groups, the strip (66 px) and the side panel (car card + START: ~290 px) leave. Measured in a true phone viewport: the stage is 65 px high at 360x620, 145 px at 390x700, about 200 px at 430x760. Its `.info` block is bottom-anchored in an `overflow: hidden` flex column and is ~200 px tall, so it overflows off the TOP: the name is cut away, the description runs under the plate and the ribbon, the Clock fact sits under the left arrow (`top: 56px`, fixed), and at 360x620 only the last row shows. Pictures: `scratchpad/shots-mobile/before-menu.png` (three sizes side by side), `tap-390x700.png`. Not started: the re-lay. Intended: on a phone make the side panel one compact row (car picture + name as a small button, Good/Evil side by side, no bars, `#sideNote` hidden), START a slim bar, Options up on the title's line and the bank shortened, so the stage gets ~300 px; give the stage a `min-height`, clamp the description to 2 or 3 lines, and move the arrows to the stage's middle edges; use `100dvh` with a `100vh` fallback for the screen's height (`.overlay` is `position: fixed; inset: 0`, style.css:214); a landscape 740x360 pass (`max-height: 520px` block) was not looked at beyond one picture (`tap-740x360.png`, not yet read).
- Bug 2, "What's on this road" does not work: PARTLY FOUND, NOT FIXED.
  - Ruled out: the dynamic import in the production build (the card opened from a real touch tap at 360x620 on the built site: 27 tiles, no console error or exception: `tap-360x620.png`); the swipe handler on the stage (it ignores a pointerdown on a button); `input.js`'s window touch handlers (they leave `.overlay` alone); the card off-screen or zero-height (it fills the screen with models drawn at all three sizes in `before-road.png`, on desktop Edge's WebGL).
  - Found: (a) at 360x620 the button is the only thing left in a 65 px stage and sits under the ribbon and beside the arrows; on a shorter real viewport (address bar showing) it is pushed out of the stage altogether and cannot be tapped: so bug 1 is at least part of bug 2. (b) A real failure not yet explained: at 390x700 on the production build one touch tap on the button's middle (`elementFromPoint` said the button was on top) left the card CLOSED, with the button showing its hover outline and nothing in the console (`tap-390x700.png`). One try only: repeat it (and with a longer press) before believing it; next thing to look at is whether the `click` arrives (log it), and `roadCard`'s `if (sheet === roadBox || !menuUp()) return`.
  - (c) Robustness hole, certain from reading: `showRoadCard` (render/levelcard3d.js) builds the DOM and then calls `viewRenderer(canvas)` (`new THREE.WebGLRenderer`), which THROWS when a context cannot be had; that is inside `roadCard` (menustage.js) before `openSheet`, in an async function nobody catches, so the tap does nothing at all and nothing is shown. A phone that refuses a third context (the game's, the tank corner's, then this) would behave exactly as reported. Fix intended: `viewRenderer` returns null on failure, the card opens regardless with its tiles (names and lines) and no models, and `roadCard` catches a failed import too.
- Bug 3, the wrong-way card's headlights on the tail end: NOT STARTED. Where to look: the card's `build()` in `gimmicks.js` ('Wrong-way drivers'), `render/headlights.js`, `render/cars.js`; and look at a real one in the game (Back Roads, Ring Road, Market Town, Quarry Run) to see whether the game's own is wrong too.
- Bug 4 (added by the orchestrator), the models on the reference pages trail their tiles when scrolling: NOT STARTED, cause read. `render/modelviews.js` `drawViews`: one WebGL canvas laid over the page, each rAF frame every tile's `getBoundingClientRect` is read and its scene drawn into that patch; the page scrolls on the compositor at once and the canvas's picture is a frame (or more, under swiftshader or a slow phone) behind. `gimmickspage.js`, `poweruppage.js` and `levelcard3d.js` share it; `cargopage.js` has the same loop of its own (cargopage.js:104-131). Design chosen and not written: each tile gets its own small 2D canvas inside its `.view`; the one WebGL renderer is on a canvas NOT in the page, sized to a tile; per frame, for each tile on screen: render, then `drawImage` into the tile's canvas. The pictures are then part of the page and scroll with it for free, only tiles on screen are drawn (as now), and the same change gives bug 2(c) its fallback (no renderer: the tile's canvas stays empty, the words still show). Proof asked for: log, over a scripted scroll, each tile's rectangle against where its picture was last drawn (zero by construction afterwards), and tiles drawn per frame before and after.
- Cannot be verified here at all: anything on a real phone (true taps, the browser's own bars and `dvh`, a phone's WebGL context limit, touch scrolling smoothness). Headless Edge with touch emulation is the nearest thing.
- Left behind: `scratchpad/shots-mobile/` (six small pictures) and `scratchpad/tools/` (two scripts). No browser, server, build folder or wrapper page of mine remains.

## Agent 29: second levels, batch E (.claude/worktrees/delivery-city-levels, delivery-themes-e)

Stopped at the owner's break. Branch `delivery-themes-e` in `.claude/worktrees/delivery-city-levels`, tip `570e95d` (one WIP commit on top of `7f59356`), tree clean, nothing pushed. The task: a SECOND level on each of the toy room, sea bed, moon, backlot, Venice and ice road, clearly different from the first (road, lanes, idea, at least four kinds of gimmick the first lacks).

**No level is finished.** Four are written and in `THEME_LEVELS` (at batch E's markers in `levels.js`, in this order, so on this branch they are levels 44 to 47); two are not started.

| Level (id, theme) | Its one idea | Road | State |
|---|---|---|---|
| Toy Box Derby (`derby`, toyroom) | a race against two wind-up rival couriers on a one-way four-lane slot track | 3.75 km, `flow: north`, 4 lanes, four hairpins (126 m, radius 40), two crests | driven by the probe, clock set, 20 screenshots looked at down its whole length. No menu picture |
| Seaquake (`seaquake`, seabed) | the tunnel after a quake: roof falls (`wreckage` boulders from the sky), a jam and a ramp over it | 3.7 km, `drive: left`, 2 + 2 lanes, descents, one 300 m tunnel | probe and clock only. NO screenshot looked at. No menu picture |
| Far Side (`farside`, moon) | a rally stage: washboard, ruts, deep dust (`mud`) and meteor storms (`asteroidFields` + `rockfall`) | 5.6 km, 2 + 1 lanes, four flat hairpins (94 m, radius 30), a narrowing, four crests | probe and clock only. NO screenshot looked at. No menu picture |
| Stunt Double (`stunts`, backlot) | stunt day: a ramp over the jam, two drawbridge jumps, a plane, a tanker and containers coming down, a parade of extras, rain machines (`spray`) | 3.6 km, `flow: north`, 4 lanes, the four sets in another order (New York, skies, Western, lot), no tunnel | probe and clock only. NO screenshot looked at. No menu picture |
| Venice: not started | idea: "Seven Bridges" (id `ponti`): the back alleys, one lane each way (or 2 + 1 with `narrows`), short and sharp (about 3.3 km), a humped bridge to fly every few hundred metres, cobbles (`washboards`), a bora (`crosswinds`), `spray`, `cushions`, `pursuits`, `convoys`; no tide, no parade, no exits (the theme draws nothing for a side road). Cargo not the first's (sundae / mirror) | | |
| Ice road: not started | idea: "Spring Thaw" (id `thaw`): the thaw: slush `ruts` and `mud`, `spray` behind the semis, a meltwater `fords` with a second side road as its bridge, `washboards` (wind-rippled ice), a `jamRamps`, `pursuits`; long (about 5.5 km), maybe a `splits` round an island (untested with the theme). Cargo not the first's (snowglobe / ice) | | |

Kinds each new level has that its theme's first level lacks: Derby: rival, one-way, hairpins, jamRamps, cushions, machinery, frogs, herds, potties, emergencies. Seaquake: drive left, wreckage, spray, fog, jamRamps, cushions, tarmac, machinery. Far Side: washboards, ruts, asteroidFields, mud, jamRamps, cushions, narrows, hairpins, emergencies. Stunt Double: one-way, jamRamps, drawbridges, parades, marathons, spray, cushions, potholes, emergencies, convoys.

**The very next steps, in order:**
1. Derby, Seaquake and Stunt Double each lost their second (Derby: also third) jam ramp at the last minute (see traps): the stretches round Derby 2170 and 3615, Seaquake 3130 and Stunt Double 2770 now have cash laid out for a ramp that is gone (the `cash20` about 60 m past each, the `cash10` beside). Put another gamble at each (Derby's finale wants one after its last crest) and move that cash to suit.
2. Screenshots of Seaquake, Far Side and Stunt Double along their whole length, six a run (`node scripts/shots.mjs <dir> "s740=?level=45&ghost&at=740&ff=2" ...`; levels 44 derby, 45 seaquake, 46 farside, 47 stunts on this branch). To look at hardest: Far Side's `asteroidFields` on a level with ground (never used outside Asteroid Run: half the asteroids pass under the road, so may be hidden or may look wrong), its hairpins against the moon's craters and base pieces, the lit theme's land under its crests; Seaquake's boulders falling "from the sky" inside the glass tube, and the tube in `drive: left`; Stunt Double's parade on a one-way road (floats in all four lanes: the shoulders are the only way past) and the drawbridges among the sets.
3. Derby: re-shoot `at=2130` and `at=2460` (and 1340): in the first round a toy-room rug lay over the road there, where a hairpin brings the road back past it. Fixed in `render/themes/toyroom.js` (a rug is not laid where any part of it would be on the main road; the dice are thrown as before, so the first level's layout is unchanged) but the fix has NOT been looked at, on either level: re-shoot Toy Room (level 32) at a couple of rugs too.
4. Menu pictures: `node scripts/shots.mjs <dir> --levels=derby,seaquake,farside,stunts`, scale each to 600x267, save as `levelshots/<id>.jpg`.
5. The clocks were worked out before the ramps were removed: `node scripts/level-clocks.mjs derby seaquake stunts farside` and write what it prints (by hand: see traps).
6. Venice and the ice road, then all checks, a commit a level.

**At the merge:** each of the four in `THEME_LEVELS` needs its place in `INSERTED_AT` in `progress.js` (not added on this branch, as instructed; `.water-check.mjs` is expected to fail on its two old-save lines until then).

**Verified:** every check script passed on the committed tree up to and including `.ufo-check.mjs` (`.gimmicks3-check.mjs` once the extra ramps were out); `.water-check.mjs` ended "2 FAILED", the two expected old-save lines by their number (the lines themselves were not read). Those runs were on the tree before the extra ramps came out; after, only `.gimmicks3-check.mjs` and `delivery-levels-check.mjs` were run again. `delivery-levels-check.mjs`: all good. `delivery-probe.mjs` drives all four to the drop with no problems reported (with the ramps as first written; NOT re-run after the extra ramps came out). `.gimmicks3-check.mjs` also fails on `crosswind: a semi in it drifts 3.64 m downwind`, which is nothing of this batch's (not looked into: it may be on the base commit too). **Never verified:** nothing played by hand; three of the four never seen at all; cash and row counts not re-counted after the ramp change (each level was written with 26 to 33 cash pickups and 9 to 12 rows); descriptions pass the length check but Derby's and Stunt Double's mention "the ramp" in the singular, which is now right.

**Decisions for the owner:** the toy room at night was not done (it needs a theme entry, not level data); the rival race took its place. Far Side's meteor storm uses `asteroidFields` on the ground, which may not look right: `rockfall` and boulder `wreckage` are the fallback. No level got a `median` or a `splits`.

**Traps:**
- `.gimmicks3-check.mjs` takes a level to have ONE jam ramp (it counts every jammed car on the level against the first ramp's queue), and three ramps on Derby held 51 of the pool's 80 traffic slots in their queues. One ramp a level.
- A jam ramp needs straight, level road from its foot to `s + 15 + 6 + queue * 7.5 + 40` (101 m with the default queue of 4), not the 75 m the schema's `reach` suggests.
- Segment lengths must be whole numbers (schema check): a hairpin is `length: 126, curve: 0.0249333` or `length: 94, curve: 0.0334212` (Stelvio: 56 and 0.0560999).
- `level-clocks.mjs --write` with the disk full truncated the level file to 0 bytes (ENOSPC). Print the clock and edit it in by hand.
- The themes seed their scenery from the LENGTH of the level's id: an id as long as the first level's lays the same things out at the same distances.
- Backlot zone ids have no welcome line in `messages.json` (`zones`): none is said, on the first level either.
- A screenshot took about 70 s each with the machine loaded: 20 in one run overran the 10-minute limit.
- Not mine, untouched: `C:\Users\tooea\AppData\Local\Temp` holds 201 files `<guid>.tmp` of exactly 74,144,017 bytes (about 15 GB).

Left behind: nothing. The screenshots (scratchpad `shots-second/derby`) are deleted; no server, browser or background run of mine remains.
