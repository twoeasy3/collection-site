# Delivery Racer: live checklist, 10-Oct (2026-10-10)

Kept by the orchestrator; updated whenever an agent commits or the owner adds something.
`[x]` committed, `[~]` in progress, `[ ]` not started, `[-]` removed or dropped. A hash is the commit;
the branch is in brackets where it is not yet on `main`. Detail is in `SCRATCHPAD-10-Oct.md`.

**Nothing below has been seen by a person in a browser, and the smoke test has not been run.**
Nothing is pushed.

Last updated: after `37eb71c` (main), `856ab1e` (delivery-circuits), `45369f1` (worktree-delivery-batch).

## Agent 1: port from the discarded city-levels work (`main`)

- [x] Eight new mystery effects: earthquake, rewind, giant, swap sides, magnet, blackout, traffic freeze, souped up. `e05ed11`
- [x] Super cars (livery, body kit), lent by "souped up" or `?car=super-<id>`. `e05ed11`
- [x] Six-star tier: a car earned on each special level. `37eb71c`
- [~] Visible damage (dents)
- [ ] A horn per car
- [ ] Postcards album
- [ ] Milestones wall
- [-] `gimmick-road-3` and the rest of the duplicate work: discarded on the owner's word

## Agent 2: real circuits (`delivery-circuits`, not yet merged)

- [x] `main` merged into the branch. `a401d13`
- [x] Headless check that all 47 levels build and every race starts; smoke test's labels know `R1..` (test not run). `b256615`
- [x] `scripts/circuit-from-osm.mjs`: OSM loop, SRTM grades, run-off measured per side. `a21b6fc`
- [x] Monza: 5800 m (real 5793), 105 run-off stretches. `a21b6fc`
- [x] Spa-Francorchamps: 7004 m (real 7004), 102 m of climb, run-off from mapped barriers. `e75d82d`
- [x] Albert Park: 5312 m (real 5278). No run-off is mapped there, so none is drawn. `b111bd7`
- [x] Clocks for Monza and Spa. `e75d82d`
- [x] Landmarks: Monza's old banking and park, Spa's forest, stream and hotel, Albert Park's lake and skyline. `856ab1e`
- [~] Wrapping up: Albert Park's clock, handover notes
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
- [ ] Merge `delivery-circuits` into `main`
- [ ] Drop the stash

## Queue: starts as agents finish (three at a time)

1. Side roads cleanup
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
- [ ] 29. Daily challenge with a leaderboard (needs a server)
- [ ] 31. Endless mode
- [ ] 49. Smoke test in parallel workers
- [ ] 50. Lint, format and CI
- [ ] 51. Performance on phones
- [ ] Level clocks and menu pictures for Hong Kong, Tokyo, Mumbai, Stelvio, Christmas
- [ ] More circuits: Baku, Brands Hatch, Caesars Palace, Monaco, Donington, Sepang, Suzuka
- [ ] A link to `/delivery/` from the site (owner to say where)
- [ ] Level editor knows the new level fields
- [ ] Gimmick Road 2's gimmicks used in real levels
