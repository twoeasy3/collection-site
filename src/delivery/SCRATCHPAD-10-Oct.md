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
- 4. Run-off smoothing: in progress.
- 5. Sand traps: not started.
