# Delivery Racer: work dropped on the evening of 10-Oct, for another session to resume

Written by the orchestrator when the owner halved the number of agents ("Halve the number of agents please.
Don't assign new tasks to the ones that finish now"). Each item below was briefed and then cancelled or
parked before it was finished. Nothing here is urgent and none of it is live. What was asked for all day and
what landed is in `CHECKLIST-10-Oct.md`; questions waiting on the owner are in `OPEN-QUESTIONS-10-Oct.md`;
the morning's handover (architecture pointers, the earlier agents' notes and traps) is `SCRATCHPAD-10-Oct.md`.

## Read this first: the rules that bind all of it

- **The owner's standing rules:** never run the smoke test (`scripts/delivery-smoke.mjs`) unless asked;
  pushing `main` deploys the live site, so push only on the owner's word; the orchestrator's window only
  edits the checklist, merges, messages agents and starts or ends agents; an unlabelled request waits for a
  free agent, one the owner labels (high priority, jump the queue) starts at once; agents commit each whole
  piece as soon as it works ("WIP" in the message if stopped mid-piece), on their own branch, own files by
  name, no push; nothing unseen is merged into `main`: a branch is looked at in stills by its agent first.
- **Where to work:** never in the main checkout. Each branch below names its worktree under
  `.claude/worktrees/`. Every worktree's `node_modules` is a junction to the main checkout's: never delete
  it (remove the link with `rmdir` before deleting a worktree folder, never recursively). `git merge main`
  into a branch before resuming it: `main` moved a great deal on 10-Oct.
- **Level rules (the owner's):** 27 to 37 cash pickups with 8 to 15 rows of two or more side by side;
  pickups may go on the shoulders, so some rows reach onto one with the bigger cash out there, never a
  pickup the player must take; every hazard a gamble with a fast line that pays and a slow one that works;
  nothing that makes the car stop without a choice, nothing without counterplay; no new moving things on
  the road that explode when hit; no tyres as obstacles (the kind is gone); one jam ramp a level at most;
  content at fixed positions; segment lengths whole numbers. For the older levels 20 to 30: "update them to
  this standard without changing the list of gimmicks in the level" (`scripts/.gimmick-kinds-b.mjs <id>
  --diff=main` must say the kinds are the same).
- **Plain obstacles are dressing, not gimmicks.** Place generic kinds (crate, cone, barrier, bale); the
  theme's mapping at the foot of `themes.js` (`OBSTACLES`, `DRIFTING`, `themedKind`) draws each as a thing
  of its place. Build no obstacle models inside a level's work. Every obstacle must read at a glance
  against its road from the chase camera.
- **The standard a level is held to** is written out twice in `SCRATCHPAD-10-Oct.md` ("Levels 20 to 25"
  has ten points, "Levels 26 to 30" six). Models to read: `levels/quarry-run.json`, `levels/noon.json`,
  `levels/outback-express.json` (all reworked or written to it and seen in pictures). Scenery ADDED to an
  old theme goes in `render/themes/extras.js` (`makeKit`, `offRoads`, `setsOf(theme)`; `construction` and
  `bathurst` are the examples), not in `render/road.js`; a level asks for a set through its `zones`.
- **Order for a level rework, a commit each:** before-stills every 300 m FIRST (the screenshot script
  serves the source live, so a "before" taken after a theme file is edited is not one); the level file,
  loading and probed to the finish (`node scripts/delivery-probe.mjs <id> --secs=500`); scenery;
  after-stills along the whole length, looked at, fixes; the clock printed before and after with `node
  scripts/level-clocks.mjs <id>` (never `--write`) and the written clock changed by hand only by the road's
  own difference; cargo pair, descriptions (160 characters each), four targets; the menu picture; every
  check script one at a time; `.replay-check.mjs <id>`.
- **Screenshots:** `node scripts/shots.mjs <out-dir> "name=?level=<n>&ghost&at=<s>&ff=1" --size=880x520`
  (its header has the how-to). An address starting with `?` is a run; a menu page is `index.html?...`;
  `--levels=<ids> --write` writes `levelshots/<id>.jpg` (600x267) and `levelshots/large/<id>.jpg`
  (1920x854); `--scale=2` for a phone's density. One run at a time per agent, six pictures a run; two runs
  at most go at once on the machine. The first picture of a run takes 15 s to two minutes and can come out
  captured mid-resize (re-shoot it); a picture that took over 30 s has run past its moment. A run may say
  it could not remove its folder yet (EPERM): the next run sweeps it. The script's `CINE` table holds each
  level's menu camera; give a new address to whoever owns the script that day, or change one entry in a
  commit of its own.
- **Checks:** about 30 scripts, `scripts/.*-check.mjs` and `scripts/delivery-levels-check.mjs`, each run by
  itself with `node` (`npm` / `npx` work only from PowerShell). `.ideas-check.mjs` takes four minutes
  (`--quick`); `.replay-check.mjs` with no arguments plays three levels. The gimmicks check on `main` is
  unseeded until `delivery-gapfill` is merged: three of its lines fail at random (a bus at the low bridge, a
  semi in the crosswind, a van at the shade).
- **Level words:** names and descriptions are moving to a JSON of their own (`delivery-level-text`, in
  progress when this was written), with the level's own file as the fallback. A level rewritten on a
  branch keeps its words in its file until it lands; then they move.

## 1. Level 27, Hong Kong: PARKED, half done

- **Where:** branch `delivery-rework-b`, worktree `.claude/worktrees/delivery-themes-c`, tip `97d52c9` (a
  clean merge of `main` over the WIP commit `1b3a207`). Tree clean.
- **Done:** `levels/hong-kong.json` re-laid: 3.7 km in 14 segments (was 9), longest straight 400 m, an
  S-bend; tunnels at 1800 to 2160 and 2960 to 3140; four cameras; four stretches of fresh tar, one inside
  the tide (2260 to 2860); seven cone, barrier and sign chicanes each leaving the other lane free; taxi
  convoys; 51 pickups, cash 36 (5 / 10 / 20: 2 / 23 / 11) in 16 rows, four reaching the shoulder, four
  `cash20` in the tram median (lane 2 is the tram median: nothing drives there); traffic of 10 kinds;
  cargo canary / genie; four targets; clock 225 / 165 (the tool's figure went from 155 / 120 to 180 / 135,
  so the written 200 / 150 moved by that). Kinds unchanged (a bin lorry in the traffic counted as a new
  kind and came out). Probed to the finish in 141.4 s. Levels, schema, descriptions, targets,
  shoulder-items and cargo checks passed; the rest were not run.
- **Its generator:** `...\43873e55-5ad9-41fd-b1fd-d25a87717463\scratchpad\visfix\hong-kong-gen.py`
  (re-running it rewrites the level file; the scratch folder may be gone in a later session).
- **Pictures** (`...\scratchpad\shots-rework\hong-kong\`): twelve before-pictures (`before\s40.png` to
  `s3340.png`, true befores, NOT yet looked at); after-pictures `s300`, `s2380`, `s2880`, `s3520`, `m400`,
  `m1260` looked at (road, rows, tar lane, tide, second tunnel's mouth, finish row all right); `s980`,
  `s1660`, `m3230` taken and not looked at.
- **Not done:** the scenery (nothing written: no `sets` on the theme, nothing in `extras.js`, no `zones`
  on the level); the mirrored FRESH TAR board (on this `drive: left` level its lettering is mirrored: fix
  it in the board's code so every left-drive level is right, and check Tokyo's); the menu picture; the
  full checks; the commit that drops "WIP".
- **The scenery as planned:** sets `neon` / `peak` / `shelter` / `scaffold`: shop fronts and vertical neon
  signs on the city side, the Peak and its tram behind the towers, a typhoon shelter of moored junks along
  the tide's stretch, bamboo scaffolding, a clock tower at each ferry pier. **Where each fits** (worked out
  from `render/road.js` and `render/movers.js`): towers begin 6 m off the city side and the pavement ends
  at 3.2 m, so shop fronts and hanging signs fit between them with no building removed; ferry piers stand
  at s 500, 1700 and 2900, where the clock towers go, on the promenade; junks along the tide (2260 to
  2860) on the sea side, beyond 14 m; the Peak about 330 m off the city side.

## 2. Level 30, Stelvio: CANCELLED before it began (check the branch)

- **Where:** it was to be branch `delivery-rework-g` from `main`, in worktree
  `.claude/worktrees/delivery-circuits`. If that branch exists, its agent began it: read its last commit.
- **The brief:** a LIGHT touch. Kinds: crosswinds, fog, ice, rockfall, police only in stretches. Take cash
  from 20 in 8 rows to 27 or more in 8 to 15 rows (a shoulder 20 only where a hairpin has shoulder to drive
  on), a second fog bank and a second crosswind on the way down, rocks on the steep ground between the
  hairpin legs, and something to see on the valley floor (a village, a river, the road's lower legs seen
  from above). Noted on 9-Oct as still wrong: "the face between Stelvio's legs is a ramp on a coarse grid;
  no valley view". Hairpin segments must be whole numbers (`length: 56, curve: 0.0560999`). Mountain Pass,
  Monte Carlo and Fjord Crossing share the alpine theme: shoot one place on each so nothing lands on their
  roads; Mountain Pass, re-laid on 10-Oct (`a29522e`), is the model. Cargo: snow globe and the ice block
  were suggested and both exist. Its written clock is 300 / 230 against the tool's 200 / 145: leave it
  unless the road's own time changes. The script's `CINE` has `stelvio: '&at=250'`.

## 3. Level 23, Tour de Coast: CANCELLED before it began (check the branch)

- **Where:** it was to be branch `delivery-rework-d` from `main`, in worktree
  `.claude/worktrees/delivery-cargo-good`. If the branch exists, read its last commit.
- **The brief:** to the full standard. Kinds: dropBears, narrows, pelotons, tide. The owner set its clock
  to 210 / 160: change it by hand only by the difference a re-lay makes. Before-pictures from the morning
  existed only in part and are gone. The script's `CINE` has `'tour-de-coast': '&at=1600'` (the cliff road).

## 4. "Night Shift", a second level on the container port: CANCELLED before it began

- **Where:** it was to go on branch `delivery-themes-f2`, worktree `.claude/worktrees/delivery-menu`, after
  that branch's fog-colour piece. Read the branch's last commit for a WIP.
- **The brief:** theme `portNight` (in `themes.js` already: night, lit, headlights; never looked at): the
  terminal at night, wet, in fog between the stacks. About 3.6 km, sharper with quarter bends, `drive:
  'left'` or a `median`. Kinds new against Dock Run (`levels/docks.json`): spray, one jam ramp (a car
  transporter), cushions, a low bridge (a gantry's height bar) with a side road round, fresh tar, narrows,
  emergencies, shoulder rows; shared: machinery, fog, wreckage as containers. NO drifters. Cargo coffee /
  reactor (check they are still free). The port theme probably needs its floodlights and crane lamps made
  to glow at night. The port keeps crates and drums as its plain obstacles. Its `INSERTED_AT` entry in
  `progress.js` goes after the last one there (After Hours 49, Eruption Day 50, Cattle Drive 51 on
  10-Oct; Spring Thaw and the fallout level may land before it).
- **Two more second levels were never started** (ideas in `SCRATCHPAD-10-Oct.md`, "Agent 30"): the favela
  descent on `favelaRain`, and "Monsoon" on `riceMonsoon`.

## 5. Docs that describe the old screenshot script: CANCELLED

`src/delivery/README.md` about lines 208 to 210 still say `--levels` saves a PNG to be scaled by hand;
`HANDOVER.md`'s paragraph "Screenshots are taken by ..." and its "Things that bit" lines still describe the
old leak and Edge's 500 px limit. To be brought up to date with the script as it is (`5929c09`, `a175592`,
`199e090`, `aed731b`, `57c1d54`): one browser a run over the DevTools protocol, its own folder, two runs at
a time, `--size` exact, `--scale`, `--levels --write` writing both sizes, the `CINE` table.

## 6. Menu pictures: five weak ones, and the large ones barely looked at: CANCELLED

- Weaker than the rest, each wanting a better place or camera in `CINE` (`&at`, `&cineside`, `&cineup`,
  `&cineout`, `&cineback`): `marina-bay` (a stand's wall over the right third), `montreal` (a large tree
  on the left), `monza` (a tree upper left), `singapore-night` (a tree mid-frame where the old picture had
  a bridge), `battlefield` (an explosion over the left of the frame).
- Only a handful of the 65 large pictures were looked at full size. Look at ten across themes (a night
  one, a snowy one, a busy city one): sharp, no banding in skies at JPEG quality 80, no HUD or debug text.
- Levels whose menu picture is missing or stale: `stunts` and `outback-express` were given `CINE` entries
  to the script's agent late on 10-Oct (confirm both pictures exist in both sizes); `glow` (After Hours)
  had only the small one; `hong-kong` when it is finished.

## Also waiting, not dropped by the halving (see the checklist for each)

- **`delivery-stats`** (`0161d71`, worktree `.claude/worktrees/delivery-city-levels`): the Delivery and
  Nerve car stats, built and HELD for the owner (question 5c2 in `OPEN-QUESTIONS-10-Oct.md`): packages
  only ever wreck traffic, whose health does not rise by tier, so Delivery rising by tier does the opposite
  of what was asked. Do not merge without the owner's answer.
- **Levels 28 Tokyo and 29 Mumbai** to the standard: never started; the plans are in
  `SCRATCHPAD-10-Oct.md` ("Levels 26 to 30").
- **Nine levels' words** (`hong-kong`, `tour-de-coast`, `ring-road`, `market-town`, `stelvio`, `toys`,
  `leaks`, `moon`, `morro`) stay in their level files until their branches land; then move them into the
  level-text JSON.
- **The washboard's look** (brown planks on every theme), **the audit's performance and bloat findings**,
  **the level progression rework**: all with the owner.
- **Old Edge leftovers in `%LOCALAPPDATA%\Temp`** from before the screenshot fix (about 710 `scoped_dir*`
  folders, 181 `msedge_*`, 24 files of 74 MB): the owner's leave covered only the `delivery-shots-*`
  folders. Ask before deleting anything on the machine.
- **The `delivery-batch` worktree** (a stash applied on top by accident) and the stash itself: untouched,
  the owner's to decide.
