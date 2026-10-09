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
| `delivery/*.html` | The game's page and six others (power-ups, gimmicks, cargo, good and evil, police, level editor) |
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

- **35 levels on the menu:** 26 main levels and 9 special ones (S1 to S9), listed in the README.
  Three more are hidden (`testbed`, `grand-prix`, `gimmick-road`) and one is the screensaver's.
- **32 garage cars:** 17 gold-star cars in five tiers, 14 Blue Star cars (a second season, open
  once level 20 is delivered), and the Tank.
- **Vehicles that belong to levels:** UFO, F1 car, GT car, LMP prototype, jetboat and the
  Battlefield's 8x8. One secret car, the City Bus.
- **Models with no car yet:** the amphibious cars in `render/models.js` (`toybota`, `nissank`,
  `herald`, `dampervan`, `transporter`) are built but no entry in `cars.js`, `config.js` or any
  level uses them.
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
- **The cargo is only a sight** (added 2026-10-10). Every delivery level carries one thing for Good and
  one for Evil (`cargo.js`; a level's `cargo`, or by its place on the menu). It turns in a round window
  on the right of the HUD, drawn by the game's own renderer into that patch of the canvas
  (`render/cargo.js`: a scissor, no extra WebGL context); an Evil item's state follows the share of the
  clock left. Its tuning is `CONFIG.consignment` (`CONFIG.cargo` is the shedding truck's load).
- **A delivered level ends at the kerb** (`delivery.js`). `Game.finish` fixes the run exactly as
  before and the state is `finished` at once; only the results screen waits (about 5 s, skipped by any
  key, tap or click) while the car, driven by `Delivery.update` in place of `Player.update`, pulls in
  and the cargo is set down. It happens only when rendering has set `Delivery.staged`, so every
  headless script goes straight to the results. Not after a bust, a wreck-out or running out of time;
  not on races, the Battlefield, or in the UFO and the jetboat (`CONFIG.consignment.noEnding`).
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
- **Balance**: clocks now come from `level-clocks.mjs`, but tips, traffic mixes and pickup
  placement on most levels were not play-tested.
- **The cargo and the delivery at the kerb** (2026-10-10): seen only in headless-browser stills
  (the corner at 1100x650 and 520x900; the ending on Farm Lanes, Expressway, Night Drive, Singapore,
  Tokyo and All Heck). Not seen moving, not heard (the tick as an Evil item changes state, the thump
  as it lands), not tried on a real phone, and the kerb camera was not looked at on every level: a
  finish inside a tunnel, on a bridge, or with something standing on the shoulder may sit badly.
- **Performance on phones**: the heavy levels (Asteroid Run's asteroids, All Heck's cones, the
  long JSON of Oh Mine!).

Known limits:

- Bridges must be on level road. (Hills and exits can be combined, flyovers and all: a side
  road follows the land, no steeper than `CONFIG.ramps.steepest` away from the expressway.)
- A one-way level's exits cannot have flyovers. On a `"flow": "south"` level only the player
  takes an exit.
- Not everything a level places can go on a side road (`road: 'side'`): the top of `levels.js`
  lists what can and what cannot, and the level reports the ones that cannot.
- Only the city theme and an elevated road (Tokyo) dress a side road's own roadside (poles and
  blocks; parapets and piers). Other themes keep their scenery off a side road but put none along it.
- Level crossings and stop / go roadworks must be on straight road.
- Traffic drives straight through most obstacles by design; only the player hits them.
- `cars.js` still says the garage has 20 bays. The lot now scrolls and holds all 32 cars.
- `cameras.js` points to `render/cameras.js`, which does not exist; the cameras are drawn as
  obstacles and by `render/roadside.js`.

## Likely next steps

- The ideas in `CHECKLIST.md`.
- Give the amphibious models cars or a level to be used in.
- Add a link to `/delivery/` from the site, once the owner says where.
- Decide whether to bring ESLint over for `src/delivery`.
