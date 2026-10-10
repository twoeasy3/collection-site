# Delivery Racer

A lane-based 3D delivery racer, built with three.js and Vite. Drive a parcel to the drop before
the clock runs out, as Good or as Evil, through traffic that has moods and holds grudges. It has
48 levels on the menu, 37 cars in the garage (five of them amphibious), circuit races, two screensavers and a level editor.

`HANDOVER.md` beside this file covers how the game is put together, how the owner likes changes
made, and what is not verified. `CHECKLIST.md` is the working list of ideas.

## Running it

The game is a second page of this site, served at `/delivery/`. Its pages are in `delivery/` at
the top of the repo; the code is here in `src/delivery/`.

```
npm run dev                  # then open http://localhost:5173/delivery/
npx vite                     # Vite alone is enough for the game (it uses no /api)
npm run build                # builds it along with the rest of the site
npm run test:delivery        # headless check of the game logic on every level (about 18 min)
npm run test:delivery:quick  # the same, without driving every level to the finish (about 8 min)
```

The test is seeded, so a run is repeatable (`--seed=n` for another run of the dice). It loads the
game's source live through Vite: don't edit `src/delivery` while it is going.

Controls: arrows or W A S D to steer, accelerate and brake, Space to throw a package, P to pause,
Enter to confirm. On a phone or tablet the on-screen controls come on by themselves.

## The pages

| Page | What it is |
|---|---|
| `delivery/index.html` | The game: start screen, garage, HUD |
| `delivery/powerups.html` | Every pickup, its model and what it does |
| `delivery/gimmicks.html` | Everything the levels throw at the player, and where |
| `delivery/cargo.html` | What is being delivered: the ten items, the Evil ones in their three states, and which levels carry what |
| `delivery/sides.html` | Good and Evil: what the side changes, how drivers take you |
| `delivery/police.html` | What gets the player busted and what it costs |
| `delivery/editor.html` | The level editor |

The five reference pages read their numbers from `config.js` and their wording from
`messages.json`, so they stay true as those change. A new page needs an entry in the client
`input` in `vite.config.js`.

## Address-bar shortcuts

All on `/delivery/`. Nothing below saves progress unless it says so.

| In the address | What it does |
|---|---|
| `?autostart`, `?autostart=evil` | Skips the start screen and starts a run |
| `&level=3` | Picks that level (by its position on the menu), locked or not |
| `&at=1650` | Starts that many metres along |
| `&ff=5` | Runs the game five seconds before the first frame |
| `&speed=31`, `&lane=4` | Starts doing that many m/s (hands off, it holds), and in that lane: for pictures |
| `&car=lowrider` | Drives that car, owned or not |
| `&theme=snow` | The level in that theme, whatever its own |
| `&rival`, `&rival=evil`, `&rival=good` | A rival courier on any delivery level |
| `&mystery=toad` | Every mystery pickup is that one |
| `&gt`, `&lmp` | Every race in GT cars or Le Mans prototypes |
| `&fly` | Freezes the level and gives a free camera (`render/fly.js`) |
| `&cine`, `&cine=car` | A still for the menu: the level, or the car alone on white |
| `?hidden=gimmick-road` | A hidden level, by id (see below); `&evil` plays it as Evil |
| `?test` | The hidden test track (`?hidden=testbed`) |
| `?edited` | The level as the editor left it |
| `?garage`, `?garage=evil` | Opens the garage; `&hover=tank` shows that car's stats |
| `?screensaver` | The traffic screensaver |
| `?racewatch` | The race screensaver; `&camcheck` logs a check of its cameras |
| `&touch` | Shows the on-screen controls on a desktop |
| `&cargostate=2` | An Evil run's cargo in that state (0 calm, 1 agitated, 2 furious) whatever the clock says |
| `&deliver=3.5` | Stops the delivery at the kerb that many seconds in, for a picture (with `&at=` just short of the finish and `&ff=14`) |
| `?pick=41` | The menu with that level picked, every level open for the visit (a look at its card); `&start` presses Start Game too |

An amphibious level started from the address with no amphibious car owned is driven in the Float Van for
that visit (or `&car=toybota`). On `gimmicks.html`, `?group=vehicles` shows that group alone, and
`&from=6` only its cards from the sixth on.

## Where things are

Game logic lives in `src/delivery/*.js` and never imports from `src/delivery/render/`, so it runs
without a browser (that is what the test does). Everything positions itself in track space:
distance along a road (`s`) plus a sideways offset (`lat`).

The core:

| File | What it holds |
|---|---|
| `config.js` | Every tuning value: how things behave. Traffic vehicles are `CONFIG.vehicles` |
| `levels.js`, `levels/*.json` | One JSON file per level: where things are. The format is documented at the top of `levels.js` |
| `themes.js` | The looks a level can have: colours and scenery, as data |
| `cars.js` | The garage's cars, the levels' own vehicles, the secret ones |
| `progress.js` | Saved progress: a cookie, with a copy in local storage |
| `messages.js`, `messages.json` | The lines that pop up during a run |
| `input.js` | Keys and touch turned into named actions and axes |
| `track.js` | Builds the level's roads, lanes, ramps, flyovers and junctions; checks the level data |
| `physics.js` | Helpers shared by all vehicles: damage, spin-outs, road limits, the effects queue |
| `player.js` | The player's car |
| `traffic.js` | Traffic: spawning, lane keeping, moods, grudges, police, races |
| `collision.js` | Hitboxes, crashes, obstacles and animals |
| `packages.js` | Thrown packages and cannon shells |
| `pickups.js` | Pickups and TANK RAGE targets |
| `social.js` | A good player's standing with the public |
| `game.js` | Game state, countdown clock, tip, results |
| `cargo.js` | What each level's player is delivering, for each side (a level's `cargo`), and an Evil item's state by the clock |
| `delivery.js` | The ending of a delivered level: the car pulls in and the cargo is set down at the kerb, then the results |
| `main.js` | Entry point, address-bar shortcuts and the frame loop |

One file per gimmick, each the logic for a level field of the same name:

| File | What it holds |
|---|---|
| `cameras.js` | Speed cameras: fines and busts |
| `crossing.js` | Level crossings: lights, booms, the train |
| `stopgo.js` | Stop / go roadworks |
| `tide.js` | The sea coming in over a causeway |
| `water.js` | Water stages: the road as a channel to float across, the queue at its edge, boats |
| `hippos.js`, `elephants.js` | Animals that destroy whatever they touch |
| `machinery.js`, `site.js` | A construction site's machines and shoulder works |
| `wreckage.js` | Scripted destruction: tankers, airliners, quarry blasts |
| `gunfire.js` | Gang houses, drive-bys, and the Battlefield's pillboxes |
| `bullettrain.js`, `ufostrike.js` | Two of the mystery pickup's effects |
| `racewatch.js` | The race screensaver: the race and its timing |

Rendering and the rest:

| File | What it holds |
|---|---|
| `render/scene.js` | Renderer, camera, lights |
| `render/road.js` | Road, ground, sky and every theme's scenery |
| `render/models.js` | The animated vehicle models |
| `render/cars.js`, `render/items.js` | Vehicle and obstacle meshes kept in step with the logic |
| `render/*Models.js`, `render/carExtras.js` | Models with no game state, shared with the reference pages (`boatModels.js`: the water stages' boats) |
| `render/<gimmick>.js` | Draws the gimmick of the same name |
| `render/audio.js` | Sound: the WAVs in `sounds/`, with synthesised stand-ins |
| `render/cargoModels.js`, `render/cargo.js` | The cargo's models; and the cargo drawn, in its corner of the HUD and at the kerb |
| `render/hud.js`, `render/menu.js`, `render/garage.js`, `render/touch.js` | HUD, start screen, garage, on-screen controls |
| `editor.js`, `powerups.js`, `gimmicks.js`, `sides.js`, `police.js`, `cargopage.js` | The other pages' scripts |
| `sounds/`, `levelshots/`, `carshots/` | WAVs, and the menu's pictures of levels and cars |
| `scripts/delivery-smoke.mjs` | The headless test |
| `scripts/level-clocks.mjs` | Works out a level's clock from a clean run |

## The levels

Levels unlock in menu order, each by delivering the one before.

- **Main levels (1 to 26):** Expressway, Back Roads, Farm Lanes, Big Business, Hurricane, Night
  Drive, Mystery Meadows, Suburbia, Canberra, Monte Carlo, Singapore, Singapore II, Sydney to
  Kiama, Passage du Gois, Safari, Airport Apocalypse, Construction Site, The Hood, Panorama
  Avenue, Speed Trap Alley, Mountain Pass, Outback Express, Tour de Coast, Ring Road, Market
  Town, Quarry Run.
- **Special levels (S1 to S9):** All Heck, Asteroid Run, Marina Bay, Oh Mine!, Montreal, Mount
  Panorama, Rival Run, Showdown, Battlefield. These include the circuit races and the levels
  driven in a vehicle of their own (UFO, race car, jetboat, 8x8).
- **Amphibious levels (A1 to A5):** Slipway Beach, Harbour Lights, High Water, Hippo Ford, Fjord Crossing.
  Each has water stages (its `water`) and is only started in an amphibious car (its `amphibious`). They
  are `AMPHIBIOUS_LEVELS` in `levels.js`, after the special levels and before the circuits, and open
  in order like the rest, the first by delivering S9.
- **Hidden levels** (`?hidden=<id>`): `testbed`, `grand-prix`, `gimmick-road`. A run on one banks
  nothing.
- **The screensaver's level** is `chaos.json` (Pile-Up Parade), which is not on the menu.

## Adding content

- **A level:** copy a file in `levels/`, give it a new `id`, import it in `levels.js` and add it
  to `MAIN_LEVELS` or `SPECIAL_LEVELS`. Problems with the data are shown in the HUD when the
  level loads. Then:
  - Saved progress counts unlocked levels by position. A level put in among those already there
    needs its position added to `INSERTED_AT` in `progress.js`, so returning players keep what
    they had open.
  - `node scripts/level-clocks.mjs <id> --write` works out its clock and writes it into the file (an
    amphibious level is timed in `CONFIG.clock.amphibious`, the Float Van, holding its lane).
  - An amphibious level goes at the end of `AMPHIBIOUS_LEVELS`, which needs no entry in `INSERTED_AT`
    (the circuits after it are races, always open). `node scripts/.water-check.mjs` drives every
    amphibious level and checks the water's rules on it. Keep ids short: the save is a cookie
    (`node scripts/.save-check.mjs`: 3382 of 4096 bytes with 48 levels and 38 cars).
  - Its picture on the menu is `levelshots/<id>.jpg`, taken with `?cine`.
- **A theme:** add it to `themes.js`; its scenery is drawn in `render/road.js`.
- **A traffic vehicle:** add it to `vehicles` in `config.js` (give it a `model` to draw it as one
  of the models in `render/models.js`), then list it in a level's `traffic`. On a level with water
  stages, `amphibious: true` lets it drive into the water and out; `boat: true` keeps it on the water;
  anything else queues on its shoulder at the water's edge.
- **A water stage:** `"water": [{ "from": 700, "to": 1050, "current": 1.5 }]` in an amphibious level
  (below 0 or beyond the finish to start or end afloat). Its tuning is `CONFIG.water`; a theme can
  give the water its colours (`channel` in `themes.js`).
- **An obstacle kind:** give it a size and behaviour in `collision.js`, a cost in `obstacleKinds`
  in `config.js`, and a model in `render/obstacleModels.js`.
- **A gimmick:** a level field documented in `levels.js`, its logic in a file of its own here,
  its tuning in `config.js`, and its drawing in `render/`, called from the frame loop in
  `main.js`. Add it to `gimmicks.js` so it shows on the gimmicks page.
- **A car:** add an entry to `CARS` in `cars.js`, with a `tier` (its stars) and a `model` from
  `render/models.js`. `blue: true` makes it a Blue Star car, which the garage shows once level
  `CONFIG.blueStarsAfter` is delivered. `amphibious: true` makes it an amphibious car: it floats on a
  water stage, has sea-green stars, and parks in the garage's Amphibious section (there from the start). Its pictures are `carshots/<id>-good.jpg` and
  `carshots/<id>-evil.jpg`, taken with `?cine=car`. A vehicle that belongs to a level goes in
  `LEVEL_CARS`; one that should stay out of the garage goes in `SECRET_CARS`, with its own way
  in (the City Bus: type B U S on the start screen, or `?autostart&car=bus`).
- **A thing to deliver:** a model in `render/cargoModels.js` (a group about a metre tall with
  `userData.animate(t)`; an Evil one built with `stated`, which gives it `setState(0 | 1 | 2)`), its id
  and name in `CARGO` in `cargo.js`, and a level's `"cargo": { "good": id, "evil": id }` to carry it.
  `node scripts/.cargo-check.mjs` lists what every level carries and checks the ending.
- **A sound:** drop a WAV in `sounds/` and name it in `SAMPLES` in `render/audio.js`. Game logic
  asks for it with `sfx()` or `sfxAt()` from `physics.js`.
- **A message:** add its wording to `messages.json`.

## The start screen

It is only a menu: a level is built when a run on it starts (`Game.load`), and nothing reloads
the page. Besides the levels and the garage it has:

- **Good / Evil:** the side to play on.
- **Sound, auto accelerate, on-screen controls:** switches, saved with progress.
- **Race cars and race track:** the class every race is run in (F1, GT, LMP) and the race
  screensaver's circuit.
- **Unlock everything** writes a complete game to saved progress; **Reset progress** wipes it.
- **Screensaver** runs `chaos.json` with no player car: a ghost dolly glides along for the
  camera to follow, and at the end of the road everything goes round again. Its tuning is
  `CONFIG.screensaver`. **Race screensaver** shows a circuit race as on TV, with a leaderboard.
  Each has a link beside it, for bookmarking.

**Pause** and **Exit level** buttons sit at the bottom of the screen during a run and the
screensavers.
