# Delivery Racer: handover

Updated on 2026-10-09 for whoever picks up the game in this repo. It covers where the game
stands, how it is put together, how the owner likes changes made, and what is not verified.
`README.md` beside this file has the file map, the address-bar shortcuts and the "adding content"
recipes; read that too. `CHECKLIST.md` is the working list of ideas not yet built.

## Where it stands

Delivery Racer is a 3D lane-based delivery racing game (three.js, no framework). It was written
in a separate sandbox folder and copied into this repo on 2026-10-04 as a second page of the
site. This repo is the only copy to edit.

| In this repo | What it is |
|---|---|
| `delivery/*.html` | The game's page and five others (power-ups, gimmicks, good and evil, police, level editor) |
| `src/delivery/` | All game code, levels, CSS, sounds and menu pictures |
| `scripts/delivery-smoke.mjs` | Headless test of the game logic |
| `scripts/level-clocks.mjs` | Works out a level's clock from a clean run |
| `vite.config.js` | `environments.client.build.rollupOptions.input` lists every page |

- **It is committed and live.** Pushing to `main` deploys the site, the game with it, through
  Cloudflare's Git integration. There is no staging step.
- **Nothing on the site links to `/delivery/`.** The owner has not said where a link should go.
- **About 30,000 lines** of code and level data, most of it written between 2026-10-04 and
  2026-10-09.

Content now:

- **48 levels on the menu:** 31 main levels, 9 special ones (S1 to S9), 5 amphibious ones (A1 to A5)
  and 3 circuits, listed in the README (its list of main levels stops at 26).
  Three more are hidden (`testbed`, `grand-prix`, `gimmick-road`) and one is the screensaver's.
- **37 garage cars:** 17 gold-star cars in five tiers, 14 Blue Star cars (a second season, open
  once level 20 is delivered), 5 amphibious cars, and the Tank.
- **Vehicles that belong to levels:** UFO, F1 car, GT car, LMP prototype, jetboat and the
  Battlefield's 8x8. One secret car, the City Bus.
- **Amphibious cars and levels (added 2026-10-10):** five garage cars, one at each star level (Sailing
  Herald, Float Van, Toybota, Dampervan, Nissank: the models `herald`, `transporter`, `toybota`,
  `dampervan`, `nissank`), in a section of the garage of their own, open from the start; and five
  amphibious levels, A1 to A5, with water stages and boat traffic, started only in one of those cars.
  The same five are traffic kinds, and there are four boats (dinghy, barge, ferry, pedal boat).
- **Modes beyond delivery:** circuit races with laps and a grid (F1, GT or LMP), rival couriers,
  the Battlefield, two screensavers.

## Running and checking it

```
npm run dev                  # Vite + the Flask server; the game is at http://localhost:5173/delivery/
npx vite                     # Vite alone is enough for the game (it uses no /api)
npm run test:delivery        # headless logic test over every level; ends "all checks passed"
npm run test:delivery:quick  # skips driving every level to the finish on both sides
npm run build                # writes dist/client/delivery/ alongside the site
```

About the test:

- **Do not run it unless the owner asks**, not even before a commit. A syntax check is enough
  otherwise.
- The full run takes about 18 to 20 minutes and the quick one about 8 (measured 2026-10-08).
  Run it in the background and log to a file.
- From the Bash tool `npm run test:delivery` fails ("'node' is not recognized"). Run
  `node scripts/delivery-smoke.mjs` directly, with `--quick` if wanted.
- It seeds `Math.random`, afresh for every section and check, so a failure repeats. `--seed=n`
  gives another run of the dice.
- It loads the game's source live through Vite. Do not edit `src/delivery` while it is going.

Things that bit:

- The pages' `input` must be set on the **client environment only**. Setting it at the top
  level `build.rollupOptions` breaks the build, because the Cloudflare plugin's Worker
  environment inherits it.
- `vite.config.js` has CRLF line endings; multi-line string matching against it fails.
- On the owner's machine, `npm` / `npx` only work from PowerShell, not from Git Bash.
- There is no lint step for the game. ESLint was used in the sandbox and was not brought over.

Screenshots were taken with headless Edge against a running server, for example:
`msedge --headless=new --enable-unsafe-swiftshader --use-angle=swiftshader --window-size=1100,650 --virtual-time-budget=7000 --screenshot=out.png "http://localhost:5173/delivery/?autostart&level=4&ff=4"`.
Edge will not go narrower than about 500 px, so use 520x900 for a portrait shot. `&cine` gives
the still used for a level's menu picture and `&cine=car` the one for a car's.

## How the game is built

- **Logic and rendering are separate.** `src/delivery/*.js` is game logic and never imports
  from `src/delivery/render/`. That is why the test can run without a browser. Logic talks to
  rendering through `FxQueue` (visual effects and sounds) and the `Game.onLoad` /
  `Game.onFinish` hook arrays; car swaps raise a `carchange` window event.
- **A gimmick is a pair of files.** `hippos.js` moves the hippos and does the damage;
  `render/hippos.js` draws them, from a `sync...` call in the frame loop in `main.js`. The
  level field that switches it on is documented at the top of `levels.js`, and its tuning is in
  `config.js`.
- **Models with no game state are kept apart** (`render/*Models.js`, `render/carExtras.js`), so
  the reference pages can show them without loading the game.
- **Everything is in track space.** A position is `(s, lat)`: metres along a road and metres
  sideways. `Track.toWorld(s, lat, out)` turns that into world coordinates and returns the
  heading.
- **Several roads share the `s` number line.** The main road is `-100 .. length + 200`; each
  exit's side road and flyovers live in their own high ranges (from 10000 up).
  `Track.transfer(v)` moves a vehicle between roads at a junction and `Track.along(s)` gives
  a common course distance.
- **Live bindings.** `CAR`, `LEVEL`, `LEVEL_INDEX` and `Track` are `export let`. Importers see
  the new value after `selectCar` / `selectLevel` / `buildTrack`; never cache them at module
  load.
- **Levels are JSON** in `src/delivery/levels/`, documented at the top of `levels.js`, and
  validated when loaded (problems show in the HUD and fail the test). A level is only built
  when a run starts (`Game.load`); the start screen is purely a menu.
- **A level is written as if driving on the right.** `"drive": "left"` shows it as its mirror
  image.
- **Themes are data** in `themes.js`, read by the game and the editor alike; `render/road.js`
  draws their scenery. Any theme can go on any level.
- **Tuning lives in `config.js`.** Car stats are in `cars.js`.
- **Vehicles carry a `bound` tag**, `north` (the player's way) or `south`. Any contact
  between opposite bounds is a head-on that wrecks both. A level's `flow` can make all
  traffic one way, or `mixed`.
- **Collisions only push cars along the road**, never sideways, and the player takes a
  small share of any push (`playerPushShare`). A race level's `nudge` is the exception.
- **Vehicle models** are in `render/models.js`; each returns a group facing +z with
  `userData.body` (the mesh whose material is the paint) and `userData.animate(t)`. Traffic
  kinds with a `model` in `CONFIG.vehicles` reuse them.
- **Saved progress** is one cookie, `delivery_racer_progress`, with `path=/`, so it is shared
  across the whole site's origin, and a copy in local storage that brings it back if the cookie
  goes. Level unlocks are counted by position in `LEVELS`. `INSERTED_AT` in `progress.js`
  records every position a level has been put in at, so an older save opens the right levels:
  add to it whenever a level goes in among the others.
- **Sound** is WAV files in `sounds/`, loaded by `render/audio.js`, with synthesised WebAudio
  stand-ins until a file has loaded and for the few sounds that have no file.
- **A water stage does not dig the road out.** A level's `water` stretch keeps the road's geometry:
  `render/water.js` lays a sheet of water 0.32 m over it from bank to bank, with a slipway's concrete
  at each end, and sits whatever floats down into it by its draft. The logic (`water.js`) only ever
  asks `Track.water(s)`, 0 on dry road to 1 in the channel. The player is never stopped by water;
  traffic that cannot float queues on its own shoulder, so the lanes stay open; boats tie up at the
  bank at the end of their reach (a vehicle's direction never changes in this engine, so they do not
  turn back).
- **Level clocks are worked out, not guessed.** `scripts/level-clocks.mjs` times a clean run in
  the reference car and writes `clock: { good, evil }` into the level file.
- **The level editor** (`editor.js`) hands its level to the game through local storage
  (`delivery_editor_level`), played with `?edited`, and uses `?fly` as its 3D view.

## How the owner likes changes made

- **Start small.** When a request is large, do the barebones version first and build up.
- **Timebox.** Land a working version and report within about 20 to 30 minutes rather than
  chasing a metric for an hour.
- **A sentence describing how things are now, among requests, is usually the reason** for a
  request, not a new feature to build.
- **Tuning values go in config**, not inline.
- **Level content sits at fixed positions**, the same every run (pickups, obstacles, tractors,
  seeded asteroid fields).
- **No page reloads** for changing car or level.
- **The start screen is strictly a menu.**
- **Screenshot new visual features** and send the images.
- **Report plainly what was and was not verified.**
- **Do not run the smoke test unless asked** (see above).
- Requests arrive as short feature lists; implement each item, then report.

## What is not verified

This list was last gone through on 2026-10-04, when the game had six levels. Nothing here records
what has been checked by eye, ear or hand since, so treat everything added after that date as
unverified unless the owner says otherwise. From the original list:

- **Audio**: the WAVs replaced the synthesised sounds after this was written; nobody has
  recorded a listen-through.
- **Animations**: the Lowrider's hop, the Junker's shudder, the Love Bus's sway, spin-outs,
  flying tyres, helicopters on slopes, speed-dependent yaw.
- **Touch**: the on-screen buttons and the phone garage on a real device.
- **The amphibious levels (2026-10-10)**: driven only by scripts (`.water-check.mjs`, the clocks)
  and looked at in screenshots. Nobody has played one: how the car feels afloat, whether a wake's
  shove and the currents are too much or too little, prices, tips and clocks are all untested by hand.
  The boat's engine note afloat has not been heard.
- **Balance**: clocks now come from `level-clocks.mjs`, but tips, traffic mixes and pickup
  placement on most levels were not play-tested.
- **Performance on phones**: the heavy levels (Asteroid Run's asteroids, All Heck's cones, the
  long JSON of Oh Mine!).

Known limits:

- Hills (segment `grade`) cannot be combined with exits; the grades are ignored and the
  level reports a problem. Bridges must be on level road.
- Exits cannot be combined with `"flow": "south"`, and a one-way level's exits cannot have
  flyovers.
- Level crossings and stop / go roadworks must be on straight road.
- Water stages must be on level road, clear of exits, junctions, splits and tunnels, and only on an
  amphibious level. Ambulances, funeral processions and convoys know nothing of the water: do not put
  them on a level that has it. A level's obstacles, potholes and ice patches under a water stage are
  hidden by the water but still there: keep them on the dry stretches.
- On an amphibious level the player drives the best amphibious car owned unless the car in use is
  amphibious: there is no memory of which amphibious car was picked last.
- `scripts/shots.mjs` with `&ff` over about 15 s leaves the camera off the road, on any level.
- Traffic drives straight through most obstacles by design; only the player hits them.
- `cars.js` still says the garage has 20 bays. The lot now scrolls and holds all 32 cars.
- `cameras.js` points to `render/cameras.js`, which does not exist; the cameras are drawn as
  obstacles and by `render/roadside.js`.

## Likely next steps

- The ideas in `CHECKLIST.md`.
- Add a link to `/delivery/` from the site, once the owner says where.
- Decide whether to bring ESLint over for `src/delivery`.
