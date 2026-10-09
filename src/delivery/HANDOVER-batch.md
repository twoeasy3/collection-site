# Delivery Racer: handover for the `worktree-delivery-batch` branch

Written on 2026-10-09 when the agent working this branch was stopped mid-task. The branch lives in the
worktree `.claude/worktrees/delivery-batch` (its `node_modules` is a junction to the main checkout's:
`rmdir` the link, never delete it recursively). Another agent was working on `main` at the same time, so
expect a merge. Nothing here has been seen in a browser: every check was headless (the game logic loaded
through Vite, as `scripts/delivery-smoke.mjs` does). The smoke test was not run.

## The brief

A long list from the owner: five themed levels (themes first, so they are reusable), a dozen gimmicks,
seven new mystery effects plus "souped-up" super cars, visible damage, a horn per car, a 6-star tier,
postcards and a milestones wall. Commit every two items. Barebones versions first.

## Done (four commits on this branch)

1. **Themes and levels** (`themes.js`, `render/road.js`, `render/movers.js`, `render/storm.js`):
   `hongkong` (harbour with the Star Ferry, junks and trams in the median), `tokyo` (elevated road on
   piers: `elevated: m` works for any theme), `mumbai` (rain: `rain: true` works for any theme), `christmas`
   (suburb scenery with `festive: true`; `snow: true` works for any theme; a sleigh among the storm's
   flyers). Levels 27-31: Hong Kong Harbour, Tokyo Expressway, Mumbai Monsoon, Stelvio Pass (snow theme,
   hairpins, rockfall), Christmas Eve. `progress.js` INSERTED_AT extended so old saves open the right levels.
   New traffic kinds: `keitruck`, `postvan`, `rickshaw` (new model), `float`, `cargotruck`, `icecream`.
2. **Tunnels** (`tunnels: [{from,to}]`): `Track.tunnel(s)`, `render/tunnel.js`, headlights on inside,
   fog closes in, engine echo via a delay bus (`Sound.echo`).
   **Burst water mains** (`waterMains`): `watermains.js` + `render/watermains.js`; slick patches through
   `Track.slicks`, which `Track.icy` consults. **Herds** with `stay: true` never leave the road.
3. **Parades** (`parades`), **roadblocks** (`roadblocks`), **falling cargo** (traffic kind `cargotruck`,
   obstacle pool in `collision.js`, `Traffic.shed`). All in `traffic.js` `placeFixed` / `update`.
4. **Ice-cream stops** (`iceCreamStops`), **reversible lanes** (`reversible`, signs in
   `render/reversible.js`), **convoys** (`convoys`), **rubbernecking** everywhere (`Traffic.noteWreck`
   from `collision.js`; evil drivers take the shoulder and are arrested if police see).

Level fields are all documented at the top of `levels.js`; tuning in `config.js` (`tunnel`, `waterMain`,
`parade`, `roadblock`, `cargo`, `iceCream`, `reversible`, `convoy`, `rubberneck`). Gimmick Road (hidden)
also got a parade, cargo trucks, water mains and a tunnel.

## Not done

- Mystery pool: earthquake, rewind, giant, swap sides, magnet, blackout, traffic freeze, "souped up".
  Plan sketched: add to `CONFIG.mystery.effects`, handle in `Player.startMystery/endMystery`; `freeze` =
  skip traffic movement and `Collision.updateObstacles`; `giant` = a `Player.crush` getter replacing the
  `tank > 0` checks in `collision.js` (lines ~52, 86, 713); `magnet` in `Pickups.update` (meshes need
  repositioning in `render/items.js` `syncPickups`, which only moves washed-up ones); `blackout` as a
  render module toggling `applyLight`/`setHeadlights`. Add new effects to `GOOD_MYSTERIES`/`BAD_MYSTERIES`
  in `social.js`, wording in `messages.json` under `powerups.mystery`, and cards in `powerups.js`.
- Super versions of every car (except the Lowrider, which has the Super Lowrider): a `superOf(car)` in
  `cars.js`, a render kit (spoiler, scoop, pipes) in `render/items.js`, `ENGINES` lookup in
  `render/audio.js` falling back to the base id.
- 6-star tier earned per special level, visible damage, horn per car (`HORNS` in `traffic.js`,
  `KEYS` in `input.js`), postcards (level shots on delivery), milestones wall.
- Gimmicks page (`gimmicks.js`) has no cards for any of the new gimmicks.
- Level clocks for the five new levels were set by hand; `node scripts/level-clocks.mjs hong-kong tokyo
  mumbai stelvio christmas --write` should redo them.
- Pictures for the menu: `levelshots/<id>.jpg` for the five levels (`?cine`).

## Verified headless

Every level builds with no problems reported. Water mains cycle their slicks; the tunnel depth ramps;
floats and band step off; the roadblock stands; loads come off the truck; the ice-cream van waits 14 s and
goes; the reversed lane flips and oncoming cars come down it; a convoy holds together. A scratch script did
this (not committed): load levels through Vite's `ssrLoadModule`, `Game.start()`, set `Player.s`, run
`Game.update` for N seconds, print `Track.problems` and traffic tags.
