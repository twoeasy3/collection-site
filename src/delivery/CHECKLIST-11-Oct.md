# Delivery Racer: checklist for 11-Oct (2026-10-11)

Only tasks delegated or yet to delegate. Wording is copied as received from the handover files
(`HANDOVER-orchestrator-10-Oct.md`, `SCRATCHPAD-10-Oct-dropped.md`, `OPEN-QUESTIONS-10-Oct.md`) and from
`CHECKLIST-10-Oct.md` (the owner's requests Q1 to Q55). The full record stays in `CHECKLIST-10-Oct.md`.

Standing rules, from the owner: only edit the checklist, merge, message agents and start/end agents; a
request starts at once only if labelled (high priority, jump the queue); pushing `main` deploys, push only
on the owner's word; never run the smoke test; nothing unseen goes into `main`; five agents or fewer;
agents work in their own worktree and never push; the owner's uncommitted edits (`delivery/index.html`,
`src/delivery/levelText.json`, `src/delivery/cars.js`) are not to be committed, stashed or overwritten by
the orchestrator (on 11-Oct the owner said: "Just make the edits on the uncomitted files").

## Owner's direction, 11-Oct (goes in every level and theme brief)

- "Good levels to follow are from level 32 onwards, with the exception of gimmick cramming." (Models for a
  level brief: levels 32 onwards, never their gimmick count.)
- "I would like each theme to not have to resort to using the same haybales, beach obstacles." (Each theme
  gets its own plain obstacles through the theme mapping at the foot of `themes.js`: no theme falls back on
  the shared hay bale or beach obstacles.)
- Answers to `OPEN-QUESTIONS-10-Oct.md`: questions 1 and 2 fine (stay); 3 fine (half crates, half bales),
  with the new task F1 below; 4 fine (as built). "More answers soon."

## F. New from the owner, 11-Oct (yet to delegate; not labelled to jump the queue)

- [ ] **F1. Cargo truck: an alternative state with an open door.** "Let's include a alternative state for this
      truck model though, one with an open door so players can distinguish which truck drops items." (The
      cargo truck that sheds crates and bales; traffic model in `render/trafficModels.js`. Small model task,
      Fable if the look is new, seen in stills from the chase camera.)
- [ ] **F2. Themes without the shared obstacles.** "I would like each theme to not have to resort to using the
      same haybales, beach obstacles." To do: an audit of which themes fall back on the shared hay bale and
      beach kinds in the `OBSTACLES` / `DRIFTING` / `themedKind` mapping, and each gets its own, themed and
      readable at a glance (no tyres, no generic crates). Fable for the new models.

## G. More answers from the owner, 11-Oct (yet to delegate; not labelled to jump the queue)

- [ ] **G1. Question 5: thematic, larger obstacles.** "5) Levels should get thematic obstacles, and generally
      larger ones that are more visible please." (Goes with F2: each theme's own plain obstacles, bigger and
      readable at a glance from the chase camera; a rule for every level brief.)
- [ ] **G2. Question 5a, Stunt Double's parade.** "5a) Too extreme. Bad placement." (The parade fills all four
      lanes of a one-way road, shoulders the only way past. To do: rework its size and placement so it does
      not take the whole road; the level's agent looks at it in stills.)
- [ ] **G3. Question 5b, the washboard.** "5b) Yes, thematic washboard. Let's have washboards reduce speed and
      cause the steering effect on all speeds please." (A look per theme: buckled plates, rippled dust, etc.,
      via the theme's `soft` colours hook of `c19807d`; and the effect: washboards slow the car and shake the
      steering at every speed, not only fast ones. Goes with Q1: "The washboard gimmick does very little.")
- [ ] **G4. Question 5c, the volcano's rock.** "5c) Will need an image to compare." (An agent makes a
      before/after still pair, the plain rock against the lava boulder with glowing cracks, to send to the
      owner.)
- Question 5h (Mountain Pass's clock): "Eh I don't know. We will do a full sweep later." Left as it is (195 /
  155); the full clock sweep (question 18) comes later.

- Question 5i (Suburbia's clock): "5i) There is a lot of time pluses in this level, and also this is the ideal
  difficulty of the game at the end. But we are not rebalancing yet." Left as written (35 / 25); no change
  until the rebalance.
- Question 5j (stop / go roadworks): "5j) Players can go onto the shoulders with no penalty on this gimmick.
  It's fine." Stays as built.
- [ ] **G5. Question 5k, Tranquility Base's crest: signs before crests.** "5k) Signs before crests please."
      (A warning sign placed before a crest, here and wherever a crest hides a hazard beyond it; the bigger
      marker for the barrier just past the top. Rule for level briefs.)
- [ ] **G6. Question 5k, a Moon gimmick: more airtime on crests.** "Could we look into a special gimmick where
      Moon levels get more airtime on crests? UFOs too." (A LOOKING-INTO first: an agent proposes how, e.g.
      lower gravity on Moon levels making crest jumps longer, and the same for UFOs, with what it costs the
      level rules; nothing built before the owner picks. Note the existing landing damage on Tranquility
      Base's crest.)
- [ ] **Question 5l (fog colours by theme): "5l) No. Green frogs are fine."** Read as not-fine for the first
      guesses (night dark blue-grey, volcano red-brown, sea bed blue silt), with the frog level's green kept.
      Which shades to change is asked in `OPEN-QUESTIONS-10-Oct.md`.

- Question 5c2 (Delivery stat): "5c2) With the rebalance, the traffic should consist of cars in the tier of
  the level. But we have not gotten there yet as the progression update is still pending." So
  `delivery-stats` stays HELD until the rebalance; traffic by the level's tier goes into the progression
  rework's spec (with Q45, R1 to R8).
- Question 5c3 (Nerve as built): "5c3) It's fine. We will test." Stays as built.
- Question 5d (Blue 4 cars' first figures): "5d) They are fine". Stay.
- Question 5e (Double Decker's height): "5e) Low bridges are getting an update". Real height stays for now;
  settled with Q15 (low bridges, slalom on both sides, massive damage).
- Question 5f (smallest idea cars): "5f) Keep". Stay.
- [x] **G7 CANCELLED by the owner, 11-Oct: "The audit vehicle widths is pointless. All vehicles are fine."**
      No width audit, no new check. (The rule stands as the owner's statement; nothing to build.)
      Original entry: **Question 5g, the Monster Truck, and a rule: no car exceeds a lane.** "5g) Yes. No car should
      exceed a lane, ever" (Yes to the Monster Truck drawn and measured at 0.87 of real size, and a rule for
      every vehicle: garage cars, idea cars, earned cars, level vehicles, traffic. To do: an agent measures
      every vehicle's width, mirrors and any overhang against the lane width, lists any that exceed it, and
      fixes them (scale or body), with a check that fails a vehicle wider than a lane.)

- [ ] **G8. Question 6, large level pictures on a phone.** "6.) Small images on phone". (The menu uses the
      small picture on a phone, whatever its pixel density; the large one only where the stage is a wide
      screen. Today the large one is taken whenever the stage draws it more than 15% wider than the small one,
      counting pixel density: `6eff165`, menu code.)
- [ ] **G9. Question 7, the milestone sound at the finish.** "7.) Remove it". (A milestone crossed at the
      moment a run ends no longer plays its sound over the results jingle.)

## H. Level progression rework: the owner's answers, 11-Oct (the rework itself is still parked; to go into its spec, R1 to R8)

- Question 9 (try by hand on the live site): "9.) Works fine". Nothing to do.
- **H1. Question 10, which level goes in which tier.** "10.) Put them in their current order as-is. 1-5, 6-10
  in each tier etc". (Levels in the order they are on the menu now; tier 1 is levels 1 to 5, tier 2 levels
  6 to 10, and so on. Levels beyond the fifty places and the special levels: see H4.)
- [ ] **H2. Question 13, tip money against the cost of cars.** "13) Add to the checklist that we will need to
      do some calculations on tip money to afford the cars based on a rushed playthrough (minimum stages
      played to rush up the tiers)". (An agent computes, for the tier table of H1, the least number of levels
      a player must play to afford each tier's cars, taking the best tips a rushed run earns; reported as a
      table. Part of the rebalance.)
- **H3. Question 14, what opens Blue 1.** "14) Blue 1 is unlocked after beating level 5 of 5 star." (Beating
  the last level of the five-star tier opens Blue 1; the other assumptions of question 14 stand.)
- [ ] **H4. Question 14, easy rearranging of tiers.** "Add to the checklist too that I want to be able to
      easily rearrange levels amongst tiers. It's possible I want some of the special levels into the
      tiers". (The tier table is one data file the owner can edit, a level named once by id, with a tool or
      page to move a level between tiers; special levels may be placed in a tier. Goes into the spec of the
      progression rework.)
- Question 12 (what opens an amphibious level) is still open.

## I. The owner's answers to questions 15 to 21, 11-Oct

- Question 15 (the code audit): "15.) This will be good for later". Deferred; the audit's performance and
  bloat work waits.
- [ ] **I1. Question 16, the `delivery-batch` worktree and the old stash.** "16.) Drop this". (Read as yes:
      clean the worktree and drop the stash. An agent looks at both first, removes the node_modules link
      with `rmdir` before anything else, never recursively over a junction, and reports what was removed.)
- [ ] **I2. Question 17, a repo of its own for the game: DEFERRED, with an investigation.** "17.) Defer this,
      investigate if it is feasible to drop all delivery game commits from the origin on this repo
      (basically time travelling back to before)". (An agent investigates only, changing nothing: whether
      the origin's history can be rewound to before the first Delivery Racer commit, what it would take, what
      it would break (the live site deploys from `main`; open worktrees and branches; force-push), and
      what it would cost to keep the game's history in a repo of its own. A report; no push, no rewrite.)
- Question 18 (clocks): "18) Leave for the great rebalance". Waits for the rebalance.
- Question 19 (deferred gimmicks): "19) These gimmicks dont pass the smell test to me. I only want the tram
  fix, it is in the checklist already. Drop these." The climbing lane, the hairpin cut, the tram lane and the
  fork with a choice are DROPPED. Only the tram fix stays (Q6).
- Question 20 (a link to the game from the site): "20) No need." Nothing to do.
- [ ] **I3. Question 21, more cargo: BUMPED UP.** "21) Yes please. Bump this up". (Build the twenty more cargo
      ideas, C41 to C60, the "malicious deliveries" drafted in `CHECKLIST-10-Oct.md`. First in the queue.
      Fable: new models.)

- [ ] **I4. A cargo from the owner, added to I3:** "A crate of lawyers with just an arm sticking out on all 4
      sides with a suitcase, waving around. The agitated version flails around the most, with paperwork flying
      everywhere". (Sent to the cargo agent.)

- [ ] **I5. Q22 BUMPED UP by the owner, 11-Oct (started at once).** "Bump up: Q22. \"Show the cargo being
      delivered on the menu screen per level and the level cargo should be set in the same way as the level
      name and description.\" (Into `levelText.json` or a file like it, with the level's own file as the
      fallback.) (of course have a failsafe if the defined cargo does not exist)". Touches `levelText.json`:
      the merge waits for the owner's commit of their edits to it.

- [ ] **I6. With Q22: capitalise cargo names.** "Small change while you are at it: The cargo names are not
      captialised properly". (Sent to the Q22 agent; a commit of its own.)

## Merged / ready, 11-Oct (status note)

- Merged into `main`, not pushed: Ring Road (`82c8719`), G8+G9 (`66c7062`), Q54+Q55 (`e051119`), the cargo
  truck's open door F1 (`66efef0`).
- Ready, HELD for the owner's commit of `levelText.json` / `cars.js`: Spring Thaw (`delivery-themes-e2`),
  fallout "Hot Zone" (`delivery-fallout`, all four pieces, many checks passed on the branch), Tow Truck
  shelve (`delivery-tow`, touches `cars.js`). Spring Thaw and Hot Zone both claim level place 52 in
  `INSERTED_AT` (`progress.js`): the second to merge renumbers.

## A. Delegated on 11-Oct (running)

- [ ] **A1. Level 24, Ring Road: make `delivery-rework-e` mergeable and verify.** (Handover: "`delivery-rework-e`
      (Ring Road, level 24): finished and fit; its merge conflicts in three files with additions beside
      additions. An agent merges `main` into it, keeps both sides, runs the checks; then merge.") Sonnet 5.5,
      High; worktree `.claude/worktrees/delivery-gimmicks`. Also asked: menu picture from `'ring-road':
      '&at=4330&ff=1'`, four stills looked at, words into `levelText.json` if the check requires.
- [ ] **A2. "A sensible first task for an agent: every check on `main`'s tip."** (Handover: "Not checked on
      `main` itself: the six merges after `6409bb9` (the mains follow-up, the gap fills and the seeded
      gimmicks check, the obstacles tidy-up, the level-text file, fog by theme, Market Town).") Sonnet 5.5,
      Medium; scratch worktree, edits nothing; also the lint count.
- [ ] **A3. Nuclear fallout: theme, level and gimmicks. The owner's HIGH PRIORITY.** Branch
      `delivery-fallout`, worktree `.claude/worktrees/delivery-levelfix`. Fable. The owner's words: "New theme,
      level and gimmick. Nuclear fallout level, near a powerplant/industrial area. Green skies. Gimmick 1 is
      radiation areas, driving into radiated areas causes health to tick down slowly. A unique radiation
      meter ticks up, and at full the player is permanently infected and the health ticks down regardless.
      Gimmick 2 is infected cars. Traffic cars can spawn infected, or have a chance to get infected while
      driving in radiation. An infected car will have a radius where they have the same radiation gimmick.
      Infected cars don't tick down other infected cars. Contact with an infected car will infect you. The
      shield will prevent radiation damage, and will prevent the player from getting infected."
      Piece 1 (logic, check) done (`ae29ceb`). Left: piece 2 how it is seen (`render/radiation.js`,
      `syncRadiation` in `main.js`, HUD gauge, sounds `geiger` and `infected`, two cards in `gimmicks.js`,
      `?rad=` / `?radcar=` switch, stills); piece 3 theme `fallout`; piece 4 the level.
- [ ] **A4. "Spring Thaw", the ice road's second level: finish and verify.** Branch `delivery-themes-e2`,
      worktree `.claude/worktrees/delivery-city-levels`. Sonnet 5.5, High. ("Next step: `node
      scripts/delivery-probe.mjs thaw --secs=500`; shoot the unseen stretches; `--levels=thaw --write`; every
      check; then it can merge.")

## B. Unmerged branches, yet to delegate (the handover's order)

- [ ] **B1. `delivery-rework-d` (Tour de Coast, level 23): "the level done, the scenery part done, a
      lighthouse leans."** To do: "the headland lighthouse leans visibly (still `c1080`): fix; the causeway
      boats are tiny and some lie on the sand near the zone's start; the cliffs zone got nothing new; the
      start arch's banner and the harbour light were not clearly seen; the menu picture (the script's `CINE`
      has `'tour-de-coast': '&at=1600'`, the cliff road); the full set of checks and the replay check; a look
      as Evil." Worktree `.claude/worktrees/delivery-cargo-good`.
- [ ] **B2. `delivery-rework-b` (Hong Kong, level 27): "the level file re-laid; no scenery."** "Not done: the
      scenery (nothing written: no `sets` on the theme, nothing in `extras.js`, no `zones` on the level); the
      mirrored FRESH TAR board (on this `drive: left` level its lettering is mirrored: fix it in the board's
      code so every left-drive level is right, and check Tokyo's); the menu picture; the full checks; the
      commit that drops "WIP"." Worktree `.claude/worktrees/delivery-themes-c`.
- [ ] **B3. `delivery-stats` (the Delivery and Nerve car stats): "built and HELD for the owner's answer to
      question 5c2. Do not merge without it."** Waiting on the owner.

## C. Queued by the owner after the stand-down (not labelled to jump the queue)

- [ ] **C1. Shelve the Tow Truck's gimmick.** The owner: "That is a useless feature. Let's just shelve the tow
      truck gimmick for now." To do: take the trait and perk off the Tow Truck (it stays a car, wrecked by
      wreckage like any other), keeping the code path dormant or removing it cleanly, with the garage's perk
      text, `.traits-check.mjs` and the Gimmicks page brought into line. The other three traits stay.
- [ ] **C2. Rubbernecking becomes an obstacle-based gimmick.** The owner: "Let's change rubbernecking to an
      obstacle-based gimmick. Randomly on the shoulder we put two cars (in damaged model condition) and on
      fire. Rubbernecking happens at this zone. This should only happen on roads with more than 1 lane per
      direction." To settle in the brief: "randomly" against the standing rule that level content sits at
      fixed positions (suggest: a seed from the level); whether the two cars are solid obstacles to anyone
      using that shoulder; the gamble it gives; a card on the Gimmicks page and the road card; a check; stills.

## D. The owner's list of 10-Oct, about 9 pm ("Add to the list"). None started

The owner's words, as in `CHECKLIST-10-Oct.md`. Q52 and Q53 are done and left out.

**Gimmicks: how they play**
- [ ] Q1. "The washboard gimmick does very little. It's not an interesting obstacle."
- [ ] Q2. "The truck spray gimmick looks ugly and does even less. What exactly was it meant to do?" (Answered in
      chat: H11: every tall vehicle on a wet stretch drags a cloud nothing can be seen through, so the choice
      is to hang back and see or overtake blind; it does nothing to the car and the cloud is a plain
      translucent box. To rework or drop: the owner's call.)
- [ ] Q3. "Seaquake has scripted wreckage from the sky, but it is supposed to be indoor."
- [ ] Q4. "There should be a difference between ice and water - ice only affects you while on it, water
      continues to affect for a set distance after". (Wet tyres after a burst main; mains water already has
      its own numbers in `CONFIG.waterMain`.)
- [ ] Q5. "Supercharger should increase the car's top speed around bends proportionally".
- [ ] Q6. "The tram on the Hong Kong level does nothing. It should work like Canberra's, incoming only,
      guranteed destruction except for vehicles that survive a head-on collision (Tank)".
- [ ] Q7. "Drop bears should take into account player speed. Most 4 or 5 star cars outrun it".
- [ ] Q8. "Kangaroos are too hard to see on the road. Make them larger and brighter."
- [ ] Q9. "The blasting gimmick on the airport is mechanically a wreckage, but a Blast in Quarry Run. Move all
      blasts into the blasting gimmick."
- [ ] Q10. "The puncture gimmick is not updated for new ways to get a puncture."
- [ ] Q11. "Assaulting the police in pursuit should be a bust, but everything else they will let you go as
      they are busy,"
- [ ] Q12. "The wrong way driver gimmick warns a player sometimes for a car that doesn't actually affect the
      player at all. This is a complex fix. A lane that becomes oncoming in a side road should not spawn a
      traffic vehicle such that the player will meet one before the oncoming lane starts. This wrong way
      driver gimmick should be used to send a random driver the wrong way like the Bullet train gimmick."
- [ ] Q13. "A convoy and a Funeral Procession are too similar. Make it such that crashing a funeral
      procession triggers the Jerk mechanic for 10s."
- [ ] Q14. "Crosswinds should be in thematic levels. It has no place in the movie set or a fevela. It also is
      not really relevant most of the time, it needs tuning."
- [ ] Q15. "Low bridges are very cheap to ignore. It should deal massive damage, and be placed on both sides
      (not at the same level, so players can slalom around them). If a tall traffic car spawns in its path it
      should just go through with no penalty."
- [ ] Q16. "The learner driver's L should be a flipped writing element, and it is far too slow. It should
      also wobble in its lane."
- [ ] Q17. "\"Side Road Gimmicks\" is not really a gimmick on its own".

**Damage and balance**
- [ ] Q18. "Speed plays too big of a role in damage dealt in a crash. There should be a cap because fast
      fragile cars are oneshotting low star cars in a rear-end."
- [ ] Q19. "Rebalance all the obstacles that explode on contact. They should take health away roughly equal to
      how big they are. The construction equipment do not cause nearly enough damage."

**Levels**
- [ ] Q20. "Some amphibious stages don't make sense as the water is just inbetween land. They should either be
      obviously a canal, a river or it should transition into the sea or a river."
- [ ] Q21. "The level agents are very found of recent gimmicks. Burst water mains and potholes and tunnels
      appear almost every level. It should be thematic." (A rule for every level brief from now on, and an
      audit of the levels written or reworked on 10-Oct.)
- [ ] Q22. "Show the cargo being delivered on the menu screen per level and the level cargo should be set in
      the same way as the level name and description." (Into `levelText.json` or a file like it, with the
      level's own file as the fallback.)
- [ ] Q23. "When writing a level or taking a screenshot, note the coordinates where the screenshot was taken.
      It will help with re-taking the shots." (A rule for every brief; the menu pictures' places are already
      in the script's `CINE` table.)

**Signs, models and the reference pages**
- [ ] Q24. "The newer signs do not reverse for flipped levels". (Lettered boards mirrored on `drive: left`
      levels; one was already seen on Hong Kong's FRESH TAR board.)
- [ ] Q25. "The lanes closing model on the gimmick page is not accurate to what it actually looks like".
- [ ] Q26. "The reversible lanes model in the gimmick page is showing a reversing car."
- [ ] Q27. "The low bridge animation's bus crab walks away."
- [ ] Q28. "All models in the gimmick page should be spinning".
- [ ] Q29. "The tyres from explosions should gain some upwards velocity and bounce".
- [ ] Q30. "The Stainless Gullwing's doors should only animate in the garage".

**Cars and how they look**
- [ ] Q31. "The non-normal star cars (blue stars, amphibious etc) have very boring and dark Evil palettes.
      Darker in general, but not every car needs to be black."
- [ ] Q32. "Think of how we can indicate in-game subtly whether a car is good or evil". (Ideas wanted first,
      for the owner to choose from; nothing to be built before that.)

**Menu and garage**
- [ ] Q33. "Use the Plop Up sound for each click on the menu".
- [ ] Q34. "Migrate buying the cars from a .alert() to a ingame menu."
- [ ] Q35. "Change the sort and show toggles to a list rather than a cycle, and hide if the list returns 0
      cars."
- [ ] Q36. "In the garage, Livery: Good should just be Good/Evil, and \"Use this car as Good\" should be
      \"Switch\" and \"Use\". Switch is current behaviour, Use sets the car and goes to the menu."
- [ ] Q37. "The stat lines still block the cars in the mobile view." (After the comparison strip of
      `9af18d1`: the garage's stats text, now three lines on a phone with Delivery and Nerve pending.)

**Added later the same evening**
- [ ] Q38. "The UFO should have a floating animation and be off the ground".
- [ ] Q39. "The six-star cars with a in-game super variant should use the super variant's model." (Of the nine
      earned cars, the ones built on a garage model: Hell Rod on the Hot Rod, Courier Special on the Sleeper,
      Showdown Muscle on the Muscle; the other six are level vehicles: to be confirmed by the builder which
      of them has a Super livery and kit.)
- [ ] Q40. First: "A car with no super variant should have a clamped 0% chance to get the super upgrade
      mystery effect". **Revised by the owner:** it should go: "We were gonna upgrade your car, but your car
      has no super variant!" So the effect CAN still be drawn by a car with no Super variant; when it is,
      nothing is upgraded and that line is said, in those words. The fallback of today (such a car is made
      invincible) goes. The line lives in `messages.json` with the other mystery lines.
- [ ] Q41. "A variant of the level file, all car names and strings should be compiled in one file. Then, all
      of then needs a short description for the \"What's on this road\" level card". (As `levelText.json`
      did for level names and descriptions: one words file for every car's name and the game's other
      strings, each thing's own table as the fallback; then every entry gets a short line for its tile on
      the road card. The owner's rule for all such files: the words file takes priority. To confirm with the
      owner: one file for everything, or one a kind.)
- [ ] Q42. "Rendering the volcano theme without a floor makes near objects look floating and the skybox
      erupting volcano overlap the mountains appear through fog banks". (Volcano theme, Cinder Island and
      Eruption Day: no ground drawn beside the road; the erupting mountain drawn over the nearer mountains;
      it shows through a fog bank. The erupting look is `229dd8d`, `render/themes/volcano.js`.)
- [ ] Q43. "UFO air strike effect takes too long to happen, maybe it should start ticking damage before the
      UFO leaves".
- [ ] Q44. "Remove the slowdown for breaking the barrier on a level crossing. It makes it almost impossible to
      get hit by the bullet train. Increase it by one segment too". (Read as: breaking a crossing's boom no
      longer slows the car; and the bullet train gets one more carriage. To confirm with the owner if "it"
      means something else.)
- [ ] Q45. **For the level progression rework, when it comes in (not before; add to its spec).** The owner:
      "A player who clicks on an incomplete level of a new tier, and has no cars of that tier should select a
      null_car, silhouetted car and not be able to start the level. Clicking into a garage with a car
      restriction should automatically filter out the garage to just cars that can be selected. Keep the
      player's previous pick, so when they choose a different level the car is re-selected".
- [ ] Q46. "Level 51 has a bridge that narrows. It has jagged steps." (Cattle Drive, `levels/cattle.json`:
      the one-lane bridge at 1280 to 1420 with its `narrows`; the narrowing is drawn in steps where it
      should taper.)
- [ ] Q47. "Allow level crossings to define a train model. The level crossing in the Wild West should not use
      the bullet train." (A `train` setting on a crossing or on the theme; a steam train for High Noon and
      Cattle Drive.)
- [ ] Q48. **A STANDING RULE for every level brief:** "The agents that build levels really need to know that
      they should not aim to cram every gimmick into every level." (With Q21: gimmicks suit the theme.)
- [ ] Q49. **A STANDING RULE, and levels to fix:** "The rockfall gimmick keeps getting added to places where
      they float in mid air. There needs to be some standing memory about this". (Rockfall only where a rock
      face or slope stands above the road on that side, and looked at in a still; an audit of every level
      with `rockfall` or boulder `wreckage` for rocks that hang in the air.)
- [ ] Q50. **An audit of every vehicle model**, the owner's three parts:
  - [ ] Q50a. "Define proper headlights, brake light and turn signals to all vvehicles."
  - [ ] Q50b. "Audit all models to not have gaps in their models. For example, the hearse's rear window is not
        connected to its chassis, the Tow Truck's rear bumper is floating."
  - [ ] Q50c. "Audit all damaged models to make sure they don't look silly. The Polygon Truck's damage model
        phases though its windscreen, and keeps its lights hanging."
- [ ] Q51. "Audit and add more idle animations to vehicles where it makes sense". (Goes with Q50, the same
      pass over every model. Q30 limits one of them: the Gullwing's doors only in the garage.)
- [x] Q52, Q53: done on `main` (`0aff68e`), see `CHECKLIST-10-Oct.md`.
- [ ] Q54. "The cone of fire on the Egg in a nest cargo is reversed". (Evil cargo `egg`, its furious state:
      the hatched dragon's flame; `render/cargoModelsEvil2.js`. The cone points the wrong way, wide end at
      the mouth.)
- [ ] Q55. "In the Spa level, the runoffs are really wide. At some points, the car pulls to the middle of the
      runoff (it is a road shoulder) when the proper lanes carry on straight. This should not happen, but
      turning off steering within a shoulder/runoff in races is also not feasible." (Look at the lane assist
      with hands off and how it picks a lane where the run-off is far wider than a lane. The pull should
      only ever be toward a real lane, or not act at all outside the lanes. Monza has the same wide run-off;
      Albert Park has none.)

## E. Not started (from the handover)

- [ ] "Stelvio (30), Tokyo (28), Mumbai (29), Night Shift and two more second levels, five weak menu
      pictures, moving nine levels' words into `levelText.json` as their branches land, the audit's
      performance and bloat work, the level progression rework (parked by the owner; three of its questions
      answered today)."
  - Stelvio: "a LIGHT touch. Kinds: crosswinds, fog, ice, rockfall, police only in stretches. Take cash from
    20 in 8 rows to 27 or more in 8 to 15 rows ... a second fog bank and a second crosswind on the way down,
    rocks on the steep ground between the hairpin legs, and something to see on the valley floor." Branch
    `delivery-rework-g` from `main`, worktree `.claude/worktrees/delivery-circuits`.
  - Night Shift: "theme `portNight` ... the terminal at night, wet, in fog between the stacks. About 3.6 km".
    Branch `delivery-themes-f2`, worktree `.claude/worktrees/delivery-menu`. Two more second levels: the
    favela descent on `favelaRain`, and "Monsoon" on `riceMonsoon`.
  - Five weak menu pictures: `marina-bay`, `montreal`, `monza`, `singapore-night`, `battlefield`; and look at
    ten large pictures across themes (a night one, a snowy one, a busy city one).
  - Nine levels' words to move into the level-text JSON when their branches land: `hong-kong`,
    `tour-de-coast`, `ring-road`, `market-town`, `stelvio`, `toys`, `leaks`, `moon`, `morro`.
- [ ] "**Levels 28 Tokyo and 29 Mumbai** to the standard: never started; the plans are in
      `SCRATCHPAD-10-Oct.md` ("Levels 26 to 30")."
