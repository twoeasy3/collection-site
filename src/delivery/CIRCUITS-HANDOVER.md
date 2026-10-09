# Real circuits: handover (stopped mid-way on 2026-10-09)

Work stopped by the owner when tokens ran short. Branch `delivery-circuits` (worktree
`.claude/worktrees/delivery-circuits`, branched from `delivery-ideas` at 18ab667). Nothing here is
verified in a browser; the last edits were never even syntax-checked.

## The request (trimmed by the owner to three circuits)

Build real circuits from GPS / OpenStreetMap data the way Marina Bay (`levels/marina-bay.json`) and
Mount Panorama (`levels/bathurst.json`, with SRTM elevation) were: **Monza, Spa-Francorchamps,
Albert Park** (the original list also had Baku, Brands Hatch, Caesars Palace, Monaco, Donington,
Sepang, Suzuka). Priorities, in the owner's words: capture the track correctly, add landmarks and
elevation, and above all **reproduce the run-off areas accurately** using the shoulder widths (earlier
agents' run-off was not accurate). Also: **move all race stuff to a separate tab** on the start screen.
Keep any useful scripts. Delegate the circuits to agents working at the same time; commit often so
nothing is lost.

## How run-off works in this engine (the key finding)

- A level's `shoulder` (m) is the driveable asphalt outside the outer lane on each side. The circuit's
  concrete wall and catch fence are drawn at the shoulder's outer edge (`render/road.js`,
  `circuitTrackside`: `beside(side, s, 0.3)`, i.e. `Track.hi(s)` / `Track.lo(s)` + 0.3).
- `runoff: [{ from, to, side, width }]` widens that side's shoulder by `width` m over s = from..to,
  eased over `CONFIG.runoffEase` (25 m) at each end (`track.js`, `shoulderOn`). So **runoff width is
  literally the distance from the track edge to the wall**: derive it from OSM barrier lines
  (`barrier=wall|fence|guard_rail|tyres`) and gravel / asphalt run-off polygons (`natural=sand`,
  `surface=gravel`, `area:highway=raceway`), per side, per 4 m sample, then merge into stretches.
  Marina Bay's six identical 140 m x 12 m stretches are the lazy pattern to avoid.
- Half road width = lanes/2 x 3.5 + shoulder; a bend needs radius >= that + 3 m (`track.js` checks).
  Circuits use `lanes: 2, shoulder: 2.5, flow: north`.
- Geometry: the road starts at the origin heading +z, `h -= curve * step`, +curve = right turn, right
  = -x. A lapped level (`laps`) must close within 1 m and 0.01 rad. Segment lengths are whole metres;
  Marina Bay uses 4 m segments with `curve` to 7 decimals; Bathurst adds `grade` (rise per metre).
- Data sources that work from this machine: the OSM API map call
  `https://api.openstreetmap.org/api/0.6/map.json?bbox=minlon,minlat,maxlon,maxlat` (Monza's bbox
  9.278,45.612,9.300,45.625 returned 2.2 MB fine; send a User-Agent) and SRTM elevation from
  `https://api.opentopodata.org/v1/srtm30m?locations=lat,lon|...` (100 per request, 1 per second).
  Overpass mirrors were timing out / 406 / 500 all afternoon: do not depend on them.

## What is in this branch

Scaffolding so three agents could each build a circuit without touching the same files:

- `levels/monza.json`, `levels/spa.json`, `levels/albert-park.json`: **stub** circuits (a 2.8 km
  two-straight oval) with the race fields copied from Marina Bay. To be overwritten by the tool.
- `render/circuits/index.js`: a registry `CIRCUITS[id]` of per-circuit scenery drawers, with the
  `ctx` bag documented at the top; `render/circuits/{monza,spa,albert-park}.js` are empty stubs.
- `render/road.js`: a `theme.scenery === 'circuit'` branch (just before `space`) that draws the
  trackside, grandstands/pits, then calls `CIRCUITS[theme.circuit](ctx)`.
- `themes.js`: themes `monza`, `spa` (with terrain, like bathurst) and `albert-park`, scenery `circuit`.
- `levels.js`: imports the three, `CIRCUIT_LEVELS` appended last in `LEVELS` (so saved progress, which
  counts by position, is undisturbed), `isRace`, `RACE_LEVELS`, `DELIVERY_LEVELS`, `nextOnTab`, and
  `levelLabel` numbering races `R1..` and delivery specials `S1..` by their own tab.
- The race tab for the start screen **is applied** (it went in just before the stop; `node --check`
  passes on every edited file, but it has never been opened in a browser). It changed: `progress.js` (races always open, delivering
  skips past races when opening the next level, `pastRaces`), `game.js` (`nextLevel` uses `nextOnTab`),
  `delivery/index.html` (tab buttons `#tabDelivery` / `#tabRaces`, the four race controls moved into
  `#raceMenu`), `style.css` (`#startScreen:not(.races) #raceMenu { display: none }`), and
  `render/menu.js` (a `TABS` table of `{ list, groups }`, `isOpen(level)`, cards drawn from the tab's
  list). Note `progress.js`, `game.js`, `index.html`, `style.css` have CRLF line endings.
- A background agent was started to write `scripts/circuit-from-osm.mjs` (OSM bbox -> stitched loop ->
  4 m segments closed exactly -> SRTM grades -> run-off from barriers/polygons with a diagnostic SVG in
  `scripts/circuits/out/` -> landmarks -> level JSON -> headless verification) with configs in
  `scripts/circuits/<id>.json` and a README, tested on Monza. It was stopped; whatever it had written
  under `scripts/` is committed as-is and is unverified and probably incomplete.

## Next steps

1. Load the game once: the circuit scenery branch, the stub circuits and the level lists were only
   syntax-checked, never run.
2. Finish or rewrite `scripts/circuit-from-osm.mjs` per the spec above, prove it on Monza, then run
   one agent per circuit (each in its own worktree with a junction to `node_modules`; never delete a
   worktree dir holding that junction without `rmdir` on the link first), each writing only its level
   JSON, its `render/circuits/<id>.js`, `scripts/circuits/<id>.json` and `levelshots/<id>.jpg`
   (`node scripts/shots.mjs shots --levels=<id>`), committing after each milestone.
3. Open the game and check the Deliveries / Races tabs by eye (locked groups, R1.. labels, Next level
   after a race), then `node scripts/level-clocks.mjs
   monza spa albert-park --write`.
4. Do not run the smoke test unless asked. `scripts/delivery-smoke.mjs` line ~739 asserts the special
   levels' labels are `S1..`; it will need updating for the `R` labels.
