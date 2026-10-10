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
- Not started: H17, H7, H11, H12, H13, G4, H3, H20, H14, H18, H6, H15, G10, G11, G25, G24, G26, G22, G18, G3.

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
- Audit C4 (editor innerHTML), C2 (address-bar loans saved), C5 (bad `?edited` level), C6 (save code whitelist): written, being checked and committed.
- Then: C3 with replay (baseline over all 53 levels running), shoulders pickups, Gimmicks page console errors, duplicate keys, stale notes, editor leftovers, menu pictures.

## Agent 26: theme levels D: Wild West, favela, rice terraces (.claude/worktrees/delivery-city-levels, delivery-themes-d)
- Markers for batch D below batch C's (f773f0d, faa20fe); cache fix cherry-picked (b359c19); main merged in (b9039f5).
- Wild West DONE (017cb47, descriptions in the next commit): theme `wildwest` (render/themes/wildwest.js + wildwestModels.js), level `noon` "High Noon", 4.8 km, 37 cash pickups, 15 side-by-side rows, clock 205/155, levelshots/noon.jpg. Checks pass (levels, schema, bundle, save, targets, cargo, descriptions), ghost probe delivered. Shots: scratchpad/shots-themes/wildwest. Not played by hand.
- Favela DONE (7025f1c): theme `favela` (render/themes/favela.js + favelaModels.js, terrain), level `morro` "Favela Heights", 4.9 km, 8 hairpins, 35 cash pickups, 13 side-by-side rows, clock 220/165, levelshots/morro.jpg, descriptions in. All checks pass, ghost probe delivered. Shots: scratchpad/shots-themes/favela. Not played by hand.
- Told by the coordinator: no INSERTED_AT entries on this branch (the orchestrator adds them at the merge).
- Rice terraces: not started.
