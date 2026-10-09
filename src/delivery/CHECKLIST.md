# Delivery Racer: ideas checklist

Working list, from the owner's ideas of 2026-10-09. `[x]` done, `[~]` partly done (see the note),
`[ ]` not started. Each done item says what was and was not verified.

## New gimmicks

- [ ] 12. Drawbridge or swing bridge: bells, booms and a gap you either jump or wait at
- [ ] 13. Wide load with escort: blocks two lanes; overtaking it in view of the escort is a bust
- [ ] 14. School crossing: a lollipop person stops traffic; running it is a bust
- [ ] 15. Escaped shopping trolleys: rolling across the road with the camber
- [ ] 16. Burst water main: a slippery patch only while it is spraying
- [ ] 17. Hot-air balloon landing: blocks the road, then takes off again
- [ ] 18. Road-train jackknife: a scripted trailer swing across the lanes
- [ ] 19. Marathon: runners and a water station in one lane, plus a pace car
- [ ] 20. Average-speed cameras: timed between two gantries
- [ ] 21. Toll plazas: pay to pass, or ram the barrier and risk a bust
- [ ] 22. Animal stampede on side roads: herds and kangaroos out of the side roads
- [ ] 23. Side-road gimmicks: potholes, crossings and cameras on side roads

## Vehicles

- [ ] 26. More traffic types: ice cream van, bin lorry, learner driver, boy racer, caravan towers
- [ ] 27. Car traits: Mini through narrow gaps, Tow Truck clears a wreck, Rally Car ignores mud, 6x6 ignores rockfall
- [ ] 28. Liveries: unlockable paint jobs per car, earned for Evil and Good clears

## Modes and systems

- [ ] 29. Daily challenge: a seeded random level with one gimmick mix per day and a leaderboard
- [ ] 30. Time trial with ghost replay
- [ ] 31. Endless mode: a procedurally chained road, getting harder
- [ ] 32. Career objectives per level, with stars
- [ ] 33. Photo mode: pause and use the cinematic camera
- [ ] 34. Weather system: rain, dusk and night as level modifiers

## Garage and menus

- [ ] 35. Sort and filter the garage
- [ ] 36. Car comparison card
- [ ] 37. Locked cars shown as silhouettes, plus a season sign
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
- [ ] 48. Unify the screenshot scripts into `scripts/shots.mjs`

## Technical

- [ ] 49. Speed up the full smoke test: levels in parallel workers
- [ ] 50. Lint and format setup, plus a CI workflow running the quick suite on PRs
- [ ] 51. Performance: instance more scenery, lower the draw distance on phones
- [ ] 52. Save data: export and import a save code
