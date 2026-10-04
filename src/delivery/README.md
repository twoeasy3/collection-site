# Delivery Racer

Gray-box prototype of a lane-based 3D delivery racer, built with three.js and Vite.

## Running it

The game is a second page of this site, served at `/delivery/` (the page is
`delivery/index.html` at the top of the repo; the code is here in `src/delivery/`).

```
npm run dev            # then open http://localhost:5173/delivery/
npm run build          # builds it along with the rest of the site
npm run test:delivery  # headless check of the game logic on every level
```

Testing shortcuts in the address: `?autostart` (or `?autostart=evil`) skips the start screen;
with it, `&level=3` picks a level whether or not it is unlocked, `&at=1650` starts that many
metres along, and `&ff=5` runs five seconds first. `?garage` opens the garage.

The start screen is only a menu: a level is built when a run on it starts (`Game.load`), and
nothing reloads the page.

## Where things are

Game logic lives in `src/delivery/*.js` and never imports from `src/delivery/render/`, so it runs without a
browser (that is what `npm test` does). Everything positions itself in track space:
distance along a road (`s`) plus a sideways offset (`lat`).

| File | What it holds |
|---|---|
| `src/delivery/config.js` | Every tuning value: how things behave |
| `src/delivery/levels.js`, `src/delivery/levels/*.json` | One JSON file per level: where things are |
| `src/delivery/cars.js` | The cars the garage sells |
| `src/delivery/progress.js` | Saved progress (bank, unlocked levels, cars), kept in a cookie |
| `src/delivery/input.js` | Keys and touch turned into named actions and axes |
| `src/delivery/track.js` | Builds the level's roads, lanes, ramps and flyovers; checks the level data |
| `src/delivery/physics.js` | Helpers shared by all vehicles: damage, spin-outs, road limits |
| `src/delivery/player.js` | The player's car |
| `src/delivery/traffic.js` | Traffic: spawning, lane keeping, moods, rivalries |
| `src/delivery/collision.js` | Hitboxes, crashes, barriers and frogs |
| `src/delivery/packages.js` | Thrown packages and the tank's cannon |
| `src/delivery/pickups.js` | Pickups and TANK RAGE targets |
| `src/delivery/game.js` | Game state, countdown clock, tip, results |
| `src/delivery/render/*.js` | three.js scene, road and vehicle meshes, effects, helicopter, HUD, menu |
| `src/delivery/main.js` | Entry point and frame loop |

## Adding content

- **A level:** copy a file in `src/delivery/levels/`, give it a new `id`, import it in
  `src/delivery/levels.js` and add it to `LEVELS`. The format is described at the top of
  `src/delivery/levels.js`. Problems with the data are shown in the HUD when the level loads.
  A level can be one-way (`"flow": "north"` or `"south"`) and can line its shoulders with
  cones or signs (`"shoulderRows"`).
- **A traffic vehicle:** add it to `vehicles` in `src/delivery/config.js` (give it a `model` to draw it
  as one of the models in `src/delivery/render/models.js`), then list it in a level's `traffic`.
- **On-screen controls** (`src/delivery/render/touch.js`) come on by themselves on a phone or tablet;
  the menu has a switch, and `?touch` in the address shows them on a desktop.
  `theme` picks the look (`city` or `farm`; themes are in `src/delivery/render/road.js`).
- **An obstacle kind:** give it a size and behaviour in `src/delivery/collision.js`, a cost in
  `obstacleKinds` in `src/delivery/config.js`, and a model in `src/delivery/render/items.js`.
- **A car:** add an entry to `CARS` in `src/delivery/cars.js`. A car that should stay out of
  the garage goes in `SECRET_CARS` there instead, with its own way in (the City Bus: type
  B U S on the start screen, or `?autostart&car=bus`).
- **Savegames:** "Unlock everything" on the start screen writes a complete game to the
  progress cookie; "Reset progress" wipes it.
- **The screensaver** ("Screensaver" on the start screen) runs `src/delivery/levels/chaos.json`,
  which is not on the menu: eight lanes, two-way, dense angry traffic and tractors in every
  lane, with no player car. A ghost dolly glides along for the camera to follow, and at the
  end of the road everything goes round again. `/delivery/?screensaver` opens it directly;
  the "Screensaver link" on the start screen goes there, for bookmarking. Its tuning is `CONFIG.screensaver`, and the
  level's own knobs (`trafficCount`, `oncomingCount`, `drivers`, `trafficSpeed`) are
  described at the top of `src/delivery/levels.js`.
- **Pause and Exit level** buttons sit at the bottom of the screen during a run and the
  screensaver; P also pauses.
