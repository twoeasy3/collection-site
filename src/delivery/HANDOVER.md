# Delivery Racer: handover

Written on 2026-10-04 for whoever picks up the game in this repo. It covers what was just
done, how the game is put together, how the owner likes changes made, and what is not yet
verified. `README.md` beside this file has the file map and the "adding content" recipes;
read that too.

## What just happened

Delivery Racer is a gray-box 3D lane-based delivery racing game (three.js, no framework).
It was developed in a separate, non-git folder (`C:\Users\tooea\Documents\!!!!!roadwageSandboxx`)
and has just been copied into this repo as a second page of the site.

| In this repo | What it is |
|---|---|
| `delivery/index.html` | The game's page (HUD, menus, on-screen controls markup) |
| `src/delivery/` | All game code, levels and CSS |
| `scripts/delivery-smoke.mjs` | Headless test of the game logic |
| `package.json` | Added `three` 0.160.0 and the `test:delivery` script |
| `vite.config.js` | Added `environments.client.build.rollupOptions.input` with two pages |

State of the repo when this was written:

- **Nothing is committed or deployed.** The files above are untracked or modified.
- **The owner had unrelated uncommitted work** in `schema.sql`, `src/App.jsx`,
  `src/components/GalleryCards.jsx`, `src/components/GalleryGrid.jsx`,
  `src/hooks/useGalleryDom.js`, plus untracked `stats_import.sql` and `stats_to_sql.py`.
  That is theirs; do not fold it into a game commit.
- **The sandbox folder still exists** as a second copy. This repo is now the one to edit.
- **Nothing on the site links to `/delivery/` yet.**

## Running and checking it

```
npm run dev            # Vite + the Flask server; the game is at http://localhost:5173/delivery/
npx vite               # Vite alone is enough for the game (it uses no /api)
npm run test:delivery  # headless logic test over every level; ends "all checks passed"
npm run build          # writes dist/client/delivery/index.html alongside the site
```

Verified here: the build, the test, and the game running on the Vite dev server at
`/delivery/`. **Not verified:** the production route through the Worker (`wrangler dev` or
a deploy). The Worker passes non-`/api/` requests to the assets binding, so it should serve
`dist/client/delivery/index.html`, but nobody has loaded it that way.

Things that bit during the port:

- The two-page `input` must be set on the **client environment only**. Setting it at the top
  level `build.rollupOptions` breaks the build, because the Cloudflare plugin's Worker
  environment inherits it.
- `vite.config.js` has CRLF line endings; multi-line string matching against it fails.
- On the owner's machine, `npm` / `npx` only work from PowerShell, not from Git Bash.
- ESLint was used in the sandbox (flat config, `no-undef` / `no-unused-vars`) and was **not**
  brought over. This repo has no lint step for the game.

Address-bar shortcuts for testing (all on `/delivery/`):

- `?autostart` or `?autostart=evil` skips the menu; `&level=4` picks a level, locked or not;
  `&at=1650` starts that many metres along; `&ff=5` runs five seconds before the first frame.
- `&car=lowrider` drives that car without owning it (nothing is saved).
- `?garage` or `?garage=evil` opens the garage; `&hover=tank` shows that car's tooltip.
- `&touch` shows the on-screen controls on a desktop.

Screenshots were taken with headless Edge against a running server, for example:
`msedge --headless=new --enable-unsafe-swiftshader --use-angle=swiftshader --window-size=1100,650 --virtual-time-budget=7000 --screenshot=out.png "http://localhost:5173/delivery/?autostart&level=4&ff=4"`.
Edge will not go narrower than about 500 px, so use 520x900 for a portrait shot.

## How the game is built

- **Logic and rendering are separate.** `src/delivery/*.js` is game logic and never imports
  from `src/delivery/render/`. That is why the test can run without a browser. Logic talks to
  rendering through `FxQueue` (visual effects and sounds) and the `Game.onLoad` /
  `Game.onFinish` hook arrays; car swaps raise a `carchange` window event.
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
- **Tuning lives in `config.js`.** Car stats are in `cars.js`.
- **Vehicles carry a `bound` tag**, `north` (the player's way) or `south`. Any contact
  between opposite bounds is a head-on that wrecks both. A level's `flow` can make all
  traffic one way; the pool's directions are dealt out when a run starts.
- **Collisions only push cars along the road**, never sideways, and the player takes a
  small share of any push (`playerPushShare`).
- **Models** for the garage cars are in `render/models.js`; each returns a group facing +z
  with `userData.body` (the mesh whose material is the paint) and `userData.animate(t)`.
  Traffic kinds with a `model` in `CONFIG.vehicles` reuse them.
- **Saved progress** is one cookie, `delivery_racer_progress`, with `path=/`, so it is shared
  across the whole site's origin. Level unlocks are counted by position in `LEVELS`, so
  reordering levels changes what a returning player has open.
- **Sound** is synthesised with WebAudio; there are no audio files.

Current content: six levels in this order (Expressway, Back Roads, Farm Lanes, Big Business,
All Heck, Asteroid Run), eight garage cars (Delivery Hatch, Junker, Courier Coupe, Low Rider,
Family Wagon, Sport Compact, Love Bus, Tank) and a level-only UFO.

## How the owner likes changes made

These are standing preferences from the sessions that built the game:

- **Start small.** When a request is large, do the barebones version first and build up.
- **Tuning values go in config**, not inline.
- **Level content sits at fixed positions**, the same every run (pickups, obstacles, tractors,
  seeded asteroid fields).
- **No page reloads** for changing car or level.
- **The start screen is strictly a menu.**
- **Screenshot new visual features** and send the images.
- **Report plainly what was and was not verified.**
- Requests arrive as short feature lists; implement each item, run the test and build, then
  report.

## What is not verified

Nobody has checked these by eye, ear or hand:

- **Audio**: every sound effect, the engine note and the siren.
- **Animations**: the Low Rider's hop, the Junker's shudder, the Love Bus's sway, spin-outs,
  flying tyres, helicopters on slopes, and the speed-dependent yaw added last.
- **Touch**: the on-screen buttons were only checked as a layout in screenshots, never
  pressed on a real device.
- **Menu click-through** from start screen to garage to a run.
- **Balance of levels 4 and 5**: clocks, tips, traffic mixes and pickup placement are first
  guesses and were not play-tested. All Heck (everything oncoming, eight lanes) may be too
  hard.
- **Performance on phones**: Asteroid Run has about 570 asteroids and All Heck 772 cones
  (cones are hidden beyond 620 m, asteroids are too).
- **The new cars as traffic**: only the Love Bus was seen up close.

Known limits:

- Hills (segment `grade`) cannot be combined with exits; the grades are ignored and the
  level reports a problem.
- Exits cannot be combined with `"flow": "south"`.
- Traffic drives straight through obstacles by design; only the player hits them.
- The built game bundle is about 575 kB, mostly three.js.

## Likely next steps

- Load `/delivery/` through `wrangler dev` to confirm the production route, then commit the
  game as its own commit and deploy.
- Add a link to `/delivery/` from the site (the owner has not said where).
- Decide whether to bring ESLint over for `src/delivery`.
