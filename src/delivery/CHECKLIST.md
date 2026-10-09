# Delivery Racer: ideas checklist

Working list, from the owner's ideas of 2026-10-09. `[x]` done, `[~]` partly done (see the note),
`[ ]` not started. Each done item says what was and was not verified.

## New gimmicks

- [x] 12. Drawbridge: bells, booms and a gap you either jump or wait at. Logic checked headless (`scripts/.hazards-check.mjs`); seen in a screenshot on Gimmick Road 2 (`?hidden=gimmick-road-2`); not played by hand, and in no real level yet. No swing bridge.
- [x] 13. Wide load with escort: blocks two lanes; passing it while the escort watches is a bust. Logic checked headless (`scripts/.hazards-check.mjs`); seen in a screenshot on Gimmick Road 2 (`?hidden=gimmick-road-2`); not played by hand, and in no real level yet. Traffic drives through it (as through every obstacle).
- [x] 14. School crossing: a lollipop person stops traffic; running it is a bust. Logic checked headless (`scripts/.hazards-check.mjs`); seen in a screenshot on Gimmick Road 2 (`?hidden=gimmick-road-2`); not played by hand, and in no real level yet. That traffic waits at it was not confirmed.
- [x] 15. Escaped shopping trolleys: rolling across the road with the camber. Logic checked headless (`scripts/.hazards-check.mjs`) on Gimmick Road 2 (`?hidden=gimmick-road-2`); its drawing was not looked at closely; not played by hand, and in no real level yet.
- [x] 16. Burst water main: a slippery patch only while it is spraying. Logic checked headless (`scripts/.hazards-check.mjs`) on Gimmick Road 2 (`?hidden=gimmick-road-2`); its drawing was not looked at closely; not played by hand, and in no real level yet.
- [x] 17. Hot-air balloon landing: blocks the road, then takes off again. Logic checked headless (`scripts/.hazards-check.mjs`); seen in a screenshot on Gimmick Road 2 (`?hidden=gimmick-road-2`); not played by hand, and in no real level yet.
- [x] 18. Road-train jackknife: a scripted trailer swing across the lanes (wreckage of kind `roadtrain`). Logic checked headless (`scripts/.hazards-check.mjs`); seen in a screenshot on Gimmick Road 2 (`?hidden=gimmick-road-2`); not played by hand, and in no real level yet.
- [x] 19. Marathon: runners and a water station in one lane, plus a pace car. Logic checked headless (`scripts/.hazards-check.mjs`) on Gimmick Road 2 (`?hidden=gimmick-road-2`); its drawing was not looked at closely; not played by hand, and in no real level yet.
- [x] 20. Average-speed cameras: timed between two gantries. Logic checked headless (`scripts/.hazards-check.mjs`) on Gimmick Road 2 (`?hidden=gimmick-road-2`); its drawing was not looked at closely; not played by hand, and in no real level yet.
- [x] 21. Toll plazas: pay to pass, or ram the barrier and risk a bust. Logic checked headless (`scripts/.hazards-check.mjs`); seen in a screenshot on Gimmick Road 2 (`?hidden=gimmick-road-2`); not played by hand, and in no real level yet.
- [x] 22. Animal stampede on side roads: cows or kangaroos charging down a side road at the player (`stampedes`). Logic checked headless (`scripts/.hazards-check.mjs`) on Gimmick Road 2 (`?hidden=gimmick-road-2`); its drawing was not looked at closely; not played by hand, and in no real level yet. Read as a stampede on the side road, not animals spilling out of it onto the expressway.
- [x] 23. Side-road gimmicks: potholes, crossings and cameras on side roads (`road: 'side'`), and all of the new ones. Logic checked headless (`scripts/.hazards-check.mjs`) on Gimmick Road 2 (`?hidden=gimmick-road-2`); its drawing was not looked at closely; not played by hand, and in no real level yet.

## Vehicles

- [ ] 26. More traffic types: ice cream van, bin lorry, learner driver, boy racer, caravan towers
- [ ] 28. Liveries: unlockable paint jobs per car, earned for Evil and Good clears

## Modes and systems

- [ ] 29. Daily challenge: a seeded random level with one gimmick mix per day and a leaderboard
- [ ] 30. Time trial with ghost replay
- [ ] 31. Endless mode: a procedurally chained road, getting harder
- [ ] 33. Photo mode: pause and use the cinematic camera

## Garage and menus

- [ ] 35. Sort and filter the garage
- [ ] 36. Car comparison card
- [ ] 38. Level select: best times and medals on the thumbnails, and a gimmick preview
- [x] 39. Gimmicks page: wrong-way drivers, quarries and blasts, two-way pelotons, boulders. Three new cards, and the peloton card now shows a bunch each way. Syntax-checked only: the page was not opened.

## Fixes and balance

- [ ] 40. Blue Star balance pass: cap stats strictly below the next gold tier
- [ ] 41. Classic GT vs a future 6-star tier: decide on top-speed headroom
- [ ] 42. Hills with side roads
- [x] 43. The 404 on every level (most likely a missing favicon). Every game page now links `/car-icon.svg` as its icon. Not confirmed in a browser that this was the 404.
- [x] 44. Thumbnail shooting: a `?ghost` test parameter. The car is a ghost all run and cannot be busted. Checked headless (`scripts/delivery-probe.mjs` uses it).
- [x] 45. Wrong-way drivers: a horn, flashing lights and a warning. Warning and horn checked headless on Quarry Run and Ring Road; the flashing headlights and hazards were not seen.
- [ ] 46. Grade under the quarry rock face
- [ ] 47. Re-run the level clocks (Quarry Run, Tour de Coast)
- [x] 48. Unify the screenshot scripts into `scripts/shots.mjs`: named shots, `--levels` and `--cars`. Named shots used and working; `--levels` and `--cars` were not run.

## Technical

- [ ] 49. Speed up the full smoke test: levels in parallel workers
- [ ] 50. Lint and format setup, plus a CI workflow running the quick suite on PRs
- [ ] 51. Performance: instance more scenery, lower the draw distance on phones
- [ ] 52. Save data: export and import a save code. Also to check: the progress cookie may be near the 4 KB cap with every level and car saved (not measured); consider making local storage the main store

## Added on 2026-10-09 (second list)

- [ ] 53. An amphibious level: road, water, road, using the five amphibious models; normal cars take the long way round
- [ ] 54. A sound board page and a model viewer page, in the style of the power-ups page
- [ ] 55. Cargo that matters: fragile (loses tip with every knock), hot (loses tip with time), heavy (dulls acceleration)
- [ ] 56. Mailboxes: a package into a roadside box for bonus cash as Good; flatten it as Evil
- [ ] 57. Pass and play: two players take turns on the same seeded run and compare
- [ ] 58. Rival season table: a standing for the rival couriers across levels
- [ ] 59. Results breakdown: where the time went (crashes, busts, stuck behind a tractor); for races and the screensaver too
- [ ] 60. Hazard strip: a thin bar showing what is coming up in the next kilometre
- [ ] 61. A taught first level: throwing, the shoulder timer and the sides
- [ ] 62. Shareable editor levels: the level packed into the link
