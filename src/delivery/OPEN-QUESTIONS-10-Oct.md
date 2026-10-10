# Delivery Racer: questions waiting on the owner (10-Oct, 2026-10-10)

Kept by the orchestrator. Each question says what it is about, what happens if it is left alone, and what
the orchestrator would pick. Answer in any order; an answered one is moved to `CHECKLIST-10-Oct.md` and
struck from here. Nothing below blocks the agents now at work unless it says so.

## Levels

1. **Quarry Run's finale.** The last rock blast (at 4290 m) comes down across both lanes; the way round is
   the right shoulder or the merge side. Is that too much? Pictures sent (the crag before, the blast after).
   Left alone: it stays. Pick: keep it; it is the level's finale and there are two ways round.
2. **Cattle Drive's one-lane bridge.** On the new Wild West level the bridge at 1280 m narrows the player's
   side to one lane for 190 m; with tractors and processions about, the only way past is the oncoming lane
   (a 20 sits there). Is that too close to an imposed crawl? A picture is to come. Left alone: it stays.
   Dropping the narrowing is a one-line change.
3. **The cargo truck's load.** With tyres gone it sheds crates and bales half and half (it was half crates,
   a quarter bales, a quarter tyres). The tyre was the light one, so shed cargo hurts a little more on
   average. Lean it back toward crates (two crates to one bale)? Left alone: half and half.
4. **Brakes on ice and burst mains.** You asked for weaker brakes and weaker lane changes. The brakes were
   already at 35% (20 m dry against 57 m on ice from 30 to 10 m/s), so only the lane change was changed
   (0.47 s dry, 1.02 s on ice; it was 0.67 s). Weaker brakes still? One number each in `config.js`.
5. **Moving things on the batch E levels.** Toy Box Derby and Seaquake keep their drifting crates (to become
   each theme's own obstacle), and the four older second levels keep their cows, frogs, portaloos, moving
   asteroids and runners, as written before your rule. Left alone: they stay. Say if any should go.

5a. **Stunt Double's parade.** On the new backlot level the parade fills all four lanes of a one-way road; the
   shoulders (with cash on them at 2230 and 2320) are the only way past. Does that count as an imposed stop?
   Picture sent. Left alone: it stays.
5b. **The washboard's look.** It draws as brown wooden planks on every theme, the sea-bed tube and the Moon
   included. Give it a look per theme (buckled plates, rippled dust)? Left alone: planks everywhere.
5c. **The volcano's rock** is too dark for its black road; the obstacles agent is giving that theme a lava
   boulder with glowing cracks in its place. Say if the plain rock should stay.

5h. **Mountain Pass's clock.** Re-laid, its clean run is 112 s where the old road's was 142 s: not because of
   the road (5.4 s quicker) but because the old layout's ice cost a driver who does not steer 25 s and the
   new one's costs nothing. Written now: 195 / 155 (your 205 / 160 less the road's difference). The tool's
   own figure would be 165 / 125, 40 s tighter, on a level with more ice and rockfall than before. Which?
5i. **Suburbia's clock** reads 35 / 25 s for a 3200 m level (the tool says 100 / 65). It looks like a
   mistake in the level file. Set it to the tool's figure?

## Cars

5d. **The Blue 4 cars' first figures** (not play-tested; inside the rule "under tier 5's gold best"):
    Stainless Gullwing 42.5 m/s, accel 12, health 330, $920; Rear-Engine Coupe 44.5, 15.5, 175, $960; Snake
    Roadster 45, 17, 140, $1000; Polygon Truck 44, 14, 290, mass 2.3, agility 0.9, $1060. Change any?
    (The Gullwing has more health than the truck, following "the sturdy one".)
5e. **The Double Decker's height** as an idea car is its real 4.38 m (the City Bus is 3.1 m): a crosswind
    gust drifts it twice as far as the tallest garage car and a low bridge costs it about 90 of its 330
    health. Keep the real height, or cap it?
5f. **The smallest idea cars** (Bubble Car, Three-Wheeler) have hitboxes smaller than the Mini's. Keep?
5g. **The Monster Truck** is drawn and measured at 0.87 of its real size (2.7 m wide, not 3.1 m) to fit a
    lane; the lot says so. Fine?

## Menu, HUD and pictures

6. **Large level pictures on a phone.** The menu takes the large picture whenever the stage draws it more
   than 15% wider than the small one, counting pixel density, so a dense phone gets the large one too
   (250 to 400 KB each, one at a time). Always the small one on a phone? Pick: leave as it is.
7. **The milestone sound at the finish.** Milestones say nothing during a run now. One crossed at the moment
   a run ends (levels delivered, km driven) still plays its sound over the results jingle. Remove it too?
8. **The sea bed tube and the drawbridge, after their fixes.** The tube's glass is very faint, so it reads
   from its frame: heavier or closer ribs? The raised drawbridge's lip (the jump's edge) is visible but not
   bold: make it bolder? Left alone: both stay as in the pictures sent.
9. **To try by hand, on the live site** (not a question; no still can cover these): (a) on a real phone, the
   menu and then a run, since the menu now holds one more WebGL context for good; (b) a level with police
   or an ambulance in traffic (their light-bar code was moved); (c) open and close "What's on this road" a
   few times, then start a run; (d) scroll the Gimmicks page on a phone to see the models no longer trail.

## The level progression rework (parked; these are what it needs before it is built)

10. **Which level goes in which tier.** Ten tiers of five is fifty places; there are 43 numbered levels, with
    more second levels being written. Which go where, and what fills the gaps? Or shall an agent propose a
    table for you to approve?
11. ~~Blue 4's cars.~~ ANSWERED ("Approved"): Rear-Engine Coupe, Snake Roadster, Stainless Gullwing, Polygon
    Truck. Being built as real Blue 4 garage cars on `delivery-idea-cars`.
12. **What opens an amphibious level.** Recorded: A1 to A5 are tied one each to star levels 1 to 5 and each
    needs that star's amphibious car, so all five must be bought. Does A3, say, open as soon as the 3-star
    amphibious car is owned, or only once the gold 3 tier has been reached as well?
13. **Tips against the next tier's car.** The player must buy a car of each tier. Must a tier's tips be made
    to cover the next tier's cheapest car (the rebalance), or may a player have to replay for money?
14. **Assumptions written down for you to overrule:** the races stay on their own tab outside the tiers;
    cars with no tier (the Tank, the bus, earned cars, amphibious cars, the idea cars) cannot start a level
    whose ribbon half is not yet earned; "beating" a level means delivered on time; beating gold 5's last
    level replaces "after level 20" for opening the Blue season; medals are kept beside ribbons; half-ribbons
    count only within their own tier.

## The code audit (`AUDIT-10-Oct.md`)

15. **What to start, and does any of it jump the queue.** Not assigned: the performance findings (draw calls
    the largest; scenery never freed the cheapest; what loads before the first run), the code-quality
    findings, the bloat plan (about 1,600 lines, 500 KB of late-loadable source, 16 MB unused in the repo),
    and three open correctness ones (C7 drop bears and the migration placed by dice at load; C8 milestone
    counters counting on no-save runs; C9 spray and wakes emitted per frame, twice for boats). Pick: scenery
    never freed and the draw calls first.

## Housekeeping

16. **The `delivery-batch` worktree and the old stash.** From yesterday: that worktree has a stash applied on
    top of it by accident (its branch is merged, nothing is lost) and the stash itself still exists (old
    duplicate work you said to discard). Clean the worktree and drop the stash? Nobody has touched either.

## Carried over from before the break (see `SCRATCHPAD-10-Oct.md`)

17. **A repo of its own for the game.** Investigated, nothing changed: a second Worker for the game, the
    site's Worker forwarding `/delivery/*` to it. Go ahead, or leave it?
18. **Clocks.** `level-clocks.mjs --all` puts 40 of 65 written clocks more than 5 s from its own figure
    (Suburbia is written 35 / 25 against 100 / 65). Re-time them all, or leave it for the rebalance?
19. **Gimmicks deferred or doubted.** The climbing lane and the hairpin cut need engine work. The tram lane
    is close to what the railway median already does, and the fork with a choice is what a side road with a
    reason to take it already is: still wanted as gimmicks of their own?
20. **A link to the game from the site.** Nothing on the site links to `/delivery/`. Where should one go?
21. **More cargo.** Twenty more ideas (C41 to C60, the "malicious deliveries") are drafted in the checklist
    and not built. Build them?
