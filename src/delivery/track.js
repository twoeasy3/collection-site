import { CONFIG } from './config.js';
import { LEVEL } from './levels.js';

// ============================================================================
// TRACK - path sampled by distance along track (s) and lateral offset (lat)
// heading h: forward = (sin h, cos h) in (x, z); +lat is the driver's right
// ============================================================================
const createTrack = () => {
  const STEP = 2;            // sample spacing, metres
  // A lapped level ("laps") is a closed loop: its road comes back round to where it started, facing
  // the same way, so it has no straights past either end, and s goes round (see toWorld)
  const LOOP = !!LEVEL.laps;
  const LEAD_IN = LOOP ? 0 : 100;   // straight road before the start line
  const LEAD_OUT = LOOP ? 0 : 200;  // and after the finish
  const length = LEVEL.segments.reduce((sum, seg) => sum + seg.length, 0);
  const narrows = LEVEL.narrows || [], bridges = LEVEL.bridges || [];
  const X = CONFIG.ramps, LW = CONFIG.laneWidth, SH = LEVEL.shoulder ?? CONFIG.shoulder, FLY = X.flyoverLength; // (a level can have narrower ones)
  // The expressway's lanes: a level's "lanes" is a number (half each side of the centre line, an
  // odd one over going on the right) or { north, south }: how many on the right, the player's
  // way, and how many on the left, oncoming. A two-way level can also have a "median": that many
  // neutral lanes down the middle, which no traffic uses. The centre line (lat 0) runs down the
  // middle of the median, or between the two sides where there is none.
  // Which side the traffic keeps to: the game is laid out for driving on the right, and a level
  // with "drive": "left" is the same game seen in a mirror (see render/road.js): Track works on
  // as if on the right, and "mirrored" tells the drawing (and the steering) to swap sides
  const MIRRORED = LEVEL.drive === 'left';
  const SPEC = LEVEL.lanes ?? CONFIG.laneCount;
  const LEFT = typeof SPEC === 'object' ? SPEC.south ?? 0 : Math.floor(SPEC / 2);
  const RIGHT = typeof SPEC === 'object' ? SPEC.north ?? 0 : Math.ceil(SPEC / 2);
  const MID = LEVEL.median || 0;
  const LANES = LEFT + MID + RIGHT;
  const HM = MID * LW / 2; // half the median's width: each side's lanes start this far out
  // which way the traffic goes: 'both' (the left half of the road is oncoming), or every
  // vehicle 'north' (the player's way) or 'south' (against the player), using all the lanes
  // ('mixed': traffic both ways, every lane open to either: the Battlefield. Its lanes are laid out as a
  // one-way road's, no oncoming half)
  const FLOW = ['north', 'south', 'mixed'].includes(LEVEL.flow) ? LEVEL.flow : 'both';
  const ONE_WAY = FLOW !== 'both';
  const smooth = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };

  // a path sampled every `step` metres starting at s0. The returned function writes the world
  // position of (s, lat) into `out` and returns the heading; past either end it runs on straight.
  // ys (optional) gives the road's height at each sample.
  const makePath = (xs, zs, hs, s0, step, ys) => (s, lat, out) => {
    const f = (s - s0) / step;
    const i = Math.max(0, Math.min(xs.length - 2, Math.floor(f)));
    const t = f - i;
    const h = hs[i] + (hs[i + 1] - hs[i]) * Math.max(0, Math.min(1, t));
    out.x = xs[i] + (xs[i + 1] - xs[i]) * t - Math.cos(h) * lat;
    out.z = zs[i] + (zs[i + 1] - zs[i]) * t + Math.sin(h) * lat;
    out.y = ys ? ys[i] + (ys[i + 1] - ys[i]) * Math.max(0, Math.min(1, t)) : 0; // level past the ends
    return h;
  };

  // ---- the roads ----------------------------------------------------------------
  // The expressway, plus for every exit in the level a side road and two flyovers. Each road
  // owns its own stretch of the s number line, so "which road" never has to be stored
  // separately, and cars on different roads are automatically far apart in s and never interact:
  //   expressway   -100 .. length + 200
  //   exit n       side road from FIRST + 2000 + n * 30000, flyover A from FIRST + 12000 + ..., flyover B
  //                from FIRST + 22000 + ..., where FIRST is 8000, or for a very long level, past its end
  // Track.transfer() moves a vehicle from one road to the next where they join.
  const MAIN = 0, SIDE_ROAD = 1, FLY_A = 2, FLY_B = 3;
  const FIRST = Math.max(8000, Math.ceil((length + LEAD_OUT + 500) / 1000) * 1000), BLOCK = 30000;
  const isMain = (s) => s < FIRST;
  const kindOf = (s) => {
    if (s < FIRST) return MAIN;
    const local = (s - FIRST) % BLOCK;
    return local < 10000 ? SIDE_ROAD : local < 20000 ? FLY_A : FLY_B;
  };
  const exitOf = (s) => exits[Math.floor((s - FIRST) / BLOCK)];

  // ---- expressway path: integrate the segment list once ----------------------------
  // (looked up by the metre, every segment being a whole number of metres long: a circuit can have
  // hundreds of them, and the bend at s is wanted many times a frame)
  const CURVES = new Float64Array(length), GRADES = new Float64Array(length);
  {
    let at = 0;
    for (const seg of LEVEL.segments) {
      for (let i = 0; i < seg.length; i++) { CURVES[at + i] = seg.curve; GRADES[at + i] = seg.grade || 0; }
      at += seg.length;
    }
  }
  const curveAt = (s) => s < 0 || s >= length ? 0 : CURVES[Math.floor(s)];
  const mainXs = [], mainZs = [], mainHs = [];
  {
    let x = 0, z = -LEAD_IN, h = 0;
    for (let s = -LEAD_IN; s <= length + LEAD_OUT; s += STEP) {
      mainXs.push(x); mainZs.push(z); mainHs.push(h);
      // +curve = right turn, and right is -x when heading +z, so heading decreases
      h -= curveAt(s + STEP / 2) * STEP;
      x += Math.sin(h) * STEP;
      z += Math.cos(h) * STEP;
    }
  }
  // ---- heights: a segment may have a grade (rise per metre travelled; 0.03 is a 3% climb).
  // The gradient is eased over CONFIG.gradeEase metres each way so one slope blends into the next, then summed
  // into a height for every sample. The lowest point of the road is at height 0.
  const gradeAt = (s) => s < 0 || s >= length ? 0 : GRADES[Math.floor(s)];
  const rawGrades = mainXs.map((_, i) => gradeAt(-LEAD_IN + i * STEP));
  const hasGrades = rawGrades.some(g => g !== 0);
  // (hills and side roads can't be combined yet: the ramps and flyovers assume level ground)
  const hilly = hasGrades && !(LEVEL.exits || []).length;
  const mainGrades = rawGrades.map((_, i) => {
    if (!hilly) return 0;
    let sum = 0;
    const EASE = Math.round(CONFIG.gradeEase / STEP); // samples each way
    const N = rawGrades.length; // (round a loop, the blend carries on over the line, so the road meets itself there)
    for (let k = i - EASE; k <= i + EASE; k++) sum += rawGrades[LOOP ? ((k % N) + N) % N : Math.max(0, Math.min(N - 1, k))];
    return sum / (2 * EASE + 1);
  });
  const mainYs = [0];
  for (let i = 1; i < mainXs.length; i++) mainYs.push(mainYs[i - 1] + mainGrades[i - 1] * STEP);
  if (LOOP) { // (round a loop, whatever is left over is spread along the lap, so the road ends at the height it began)
    const over = mainYs[mainYs.length - 1] - mainYs[0], last = mainYs.length - 1;
    for (let i = 0; i <= last; i++) mainYs[i] -= over * i / last;
  }
  const lowest = Math.min(...mainYs);
  for (let i = 0; i < mainYs.length; i++) mainYs[i] -= lowest;
  // the road's slope at s: rise per metre in the direction of increasing s
  const grade = (s) => {
    if (!hilly || !isMain(s)) return 0;
    return mainGrades[Math.max(0, Math.min(mainGrades.length - 1, Math.floor((s + LEAD_IN) / STEP)))];
  };
  const mainWorld = makePath(mainXs, mainZs, mainHs, -LEAD_IN, STEP, hilly ? mainYs : null);

  // ---- side roads --------------------------------------------------------------------
  // An extra lane outside the expressway's right-hand lane is the exit lane before an exit
  // and the merge lane after a merge (see extraLane below), and the side road's own lane
  // carries on from one to the other. Its shape is a smooth curve leaving the exit point in
  // the expressway's direction there and arriving at the merge point in the expressway's
  // direction there, so it joins up whatever the expressway does in between (and is a
  // straight line when the two points line up).
  const RSLOT = HM + RIGHT * LW + LW / 2; // lat on the expressway of that extra lane's centre line
  const LSLOT = HM + LEFT * LW + SH / 2;   // lat of the left shoulder's centre line, where the flyovers land
  const nearAngle = (h, ref) => {
    while (h - ref > Math.PI) h -= 2 * Math.PI;
    while (h - ref < -Math.PI) h += 2 * Math.PI;
    return h;
  };
  const buildSide = (pG, hG, pE, hE) => {
    const m = Math.hypot(pE.x - pG.x, pE.z - pG.z); // tangent length: the straight-line distance
    const t0x = Math.sin(hG) * m, t0z = Math.cos(hG) * m, t1x = Math.sin(hE) * m, t1z = Math.cos(hE) * m;
    const fine = [], cum = [0], N = 2000;
    for (let i = 0; i <= N; i++) {
      const u = i / N, u2 = u * u, u3 = u2 * u;
      const a = 2 * u3 - 3 * u2 + 1, b = u3 - 2 * u2 + u, c = -2 * u3 + 3 * u2, d = u3 - u2;
      fine.push([a * pG.x + b * t0x + c * pE.x + d * t1x, a * pG.z + b * t0z + c * pE.z + d * t1z]);
      if (i) cum.push(cum[i - 1] + Math.hypot(fine[i][0] - fine[i - 1][0], fine[i][1] - fine[i - 1][1]));
    }
    // resample at even spacing along its length
    const total = cum[N], n = Math.round(total / STEP), step = total / n;
    const xs = [], zs = [], hs = [];
    for (let k = 0, j = 0; k <= n; k++) {
      const target = Math.min(total, k * step);
      while (j < N - 1 && cum[j + 1] < target) j++;
      const t = (target - cum[j]) / (cum[j + 1] - cum[j] || 1);
      xs.push(fine[j][0] + (fine[j + 1][0] - fine[j][0]) * t);
      zs.push(fine[j][1] + (fine[j + 1][1] - fine[j][1]) * t);
    }
    for (let k = 0; k <= n; k++) {
      const a = Math.max(0, k - 1), b = Math.min(n, k + 1);
      hs.push(nearAngle(Math.atan2(xs[b] - xs[a], zs[b] - zs[a]), k ? hs[k - 1] : hG));
    }
    return { path: makePath(xs, zs, hs, 0, step), length: total, xs, zs };
  };

  const exits = (LEVEL.exits || []).map((e, i) => {
    const pG = {}, pE = {};
    const hG = mainWorld(e.exitAt, RSLOT, pG), hE = mainWorld(e.mergeAt, RSLOT, pE);
    const side = buildSide(pG, hG, pE, hE);
    return {
      exitAt: e.exitAt, mergeAt: e.mergeAt, span: e.mergeAt - e.exitAt,
      side0: FIRST + 2000 + i * BLOCK, flyA0: FIRST + 12000 + i * BLOCK, flyB0: FIRST + 22000 + i * BLOCK,
      sideEnd: FIRST + 2000 + i * BLOCK + side.length, length: side.length, path: side.path, xs: side.xs, zs: side.zs,
      landingAt: e.exitAt - (FLY - X.ramp),  // where flyover A lands on the expressway's left shoulder
      flyoverAt: e.mergeAt + (FLY - X.ramp), // where flyover B leaves it
    };
  });

  // side-road lat 0 is the line between its two lanes; its own lane (lat +LW/2) is the curve
  const sideWorld = (x, s, lat, out) => x.path(s - x.side0, lat - LW / 2, out);

  // ---- flyovers ---------------------------------------------------------------------
  // t = 0 at the expressway end, 1 at the side-road end. A flyover leaves the side road's
  // oncoming lane, climbs, crosses over the expressway, comes down beyond its far edge and
  // slips onto the left shoulder. Nothing crosses anything else at ground level. It is laid
  // out against the side road's line run on straight past its end, which is why the
  // expressway has to be straight there.
  const DIP = SH / 2 + 2.5; // how far outside the expressway's pavement it touches down
  const flyLat = (t) => -LSLOT - DIP * smooth(t / 0.2) + (LSLOT + RSLOT - LW + DIP) * smooth((t - 0.25) / 0.75);
  const flyY = (t) => X.flyoverHeight * smooth((t - 0.2) / 0.15) * (1 - smooth((t - 0.8) / 0.2));
  const flyT = (x, s, b) => b ? 1 - (s - x.flyB0) / FLY : (s - x.flyA0) / FLY;
  const flyWorld = (x, b, s, lat, out) => { // b: flyover B, which is A mirrored end to end, at the merge
    const t = flyT(x, s, b), tc = Math.max(0, Math.min(1, t));
    const a = FLY * t - (FLY - X.ramp); // metres into the side road from its near end
    const slope = (flyLat(tc + 0.005) - flyLat(tc - 0.005)) / (0.01 * FLY) * (b ? -1 : 1);
    const h = x.path(b ? x.length - a : a, flyLat(tc) - RSLOT, out) - Math.atan(slope);
    out.x -= Math.cos(h) * lat;
    out.z += Math.sin(h) * lat;
    out.y = flyY(tc);
    return h;
  };
  // where a support pillar can stand: under a raised part that isn't over the expressway
  const flyPillar = (s) => {
    const t = flyT(exitOf(s), s, kindOf(s) === FLY_B);
    return flyY(t) > 1.5 && (flyLat(t) < -(LSLOT + SH / 2 + 1) || t > (60 + FLY - X.ramp) / FLY);
  };

  // writes world position into `out` (y = height above the ground), returns heading
  const toWorld = (s, lat, out) => {
    const kind = kindOf(s);
    if (kind === MAIN) return mainWorld(LOOP ? ((s % length) + length) % length : s, lat, out); // (round a loop)
    const x = exitOf(s);
    return kind === SIDE_ROAD ? sideWorld(x, s, lat, out) : flyWorld(x, kind === FLY_B, s, lat, out);
  };

  // ---- cross-sections ------------------------------------------------------------------
  // 0 outside the zone, 1 inside, easing over `taper` metres at each end
  const zone = (s, z) => smooth((s - z.from) / CONFIG.taper) *
    (1 - smooth((s - (z.to - CONFIG.taper)) / CONFIG.taper));
  // expressway: the lanes on a side (-1 left, 1 right) at s; where it narrows to `lanesPerSide`,
  // that side's outer lanes merge inward (a median never narrows)
  const lanesOn = (side, s) => {
    const n = side < 0 ? LEFT : RIGHT;
    let cut = 0;
    for (const z of narrows) cut = Math.max(cut, Math.max(0, n - z.lanesPerSide) * zone(s, z));
    return n - cut;
  };
  const edge = (s, side = 1) => HM + lanesOn(side, s) * LW; // expressway: a side's outer lane line, from the centre
  const onBridge = (s) => {
    for (const b of bridges) if (s >= b.from && s <= b.to) return true;
    return false;
  };
  // a side's shoulder at s: SH, but wider where the level has run-off ("runoff": { from, to, side, width }),
  // eased in and out over runoffEase m at each end
  const runoffs = LEVEL.runoff || [];
  const shoulderOn = (side, s) => {
    let w = SH;
    for (const r of runoffs) {
      if ((r.side === 'left' ? -1 : 1) !== side) continue;
      const E = CONFIG.runoffEase, k = smooth((s - r.from) / E) * (1 - smooth((s - (r.to - E)) / E));
      if (k > 0) w = Math.max(w, SH + r.width * k);
    }
    return w;
  };
  const mainOuter = (s, side = 1) => edge(s, side) + (onBridge(s) ? Math.min(SH, CONFIG.bridgeWallInset) : shoulderOn(side, s));
  // The exit / merge lane: an extra lane outside the expressway's right-hand lane, with the
  // shoulder beyond it. Before an exit it opens over `gore` metres at the start of the lane
  // zone and runs to the exit, where the side road's lane carries straight on from it and the
  // expressway's own pavement eases back under the departing side road. At a merge it is the
  // other way round: the side road's lane arrives as the extra lane, which then tapers away
  // over the lane zone. 0 .. 1 of a lane's width.
  const extraLane = (s) => {
    if (!isMain(s)) return 0;
    let w = 0;
    for (const x of exits) {
      w = Math.max(w,
        smooth((s - (x.exitAt - X.laneZone)) / X.gore) * (1 - smooth((s - x.exitAt) / X.gore)),
        smooth((s - (x.mergeAt - X.gore)) / X.gore) * (1 - smooth((s - x.mergeAt) / X.laneZone)));
    }
    return w;
  };
  const extra = (s) => extraLane(s) * LW;
  // side road: 0 on the single-lane ramps at each end, 1 where its oncoming lane exists too
  const sideOpen = (s) => {
    const x = exitOf(s), u = s - x.side0;
    return smooth((u - (X.ramp - 50)) / 45) * (1 - smooth((u - (x.length - X.ramp)) / 45));
  };

  // the lanes span [laneLo, laneHi]; the pavement, shoulders included, spans [lo, hi]
  const laneLo = (s) => {
    const kind = kindOf(s);
    return kind === MAIN ? -edge(s, -1) : kind === SIDE_ROAD ? -sideOpen(s) * LW : -LW / 2;
  };
  const laneHi = (s) => {
    const kind = kindOf(s);
    return kind === MAIN ? edge(s) + extra(s) : kind === SIDE_ROAD ? LW : LW / 2;
  };
  const lo = (s) => {
    const kind = kindOf(s);
    if (kind === MAIN) return -mainOuter(s, -1);
    if (kind !== SIDE_ROAD) return -LW / 2;
    const w = sideOpen(s);
    return -w * LW - 0.3 - w * (X.leftShoulder - 0.3);
  };
  const hi = (s) => {
    const kind = kindOf(s);
    return kind === MAIN ? mainOuter(s) + extra(s) : kind === SIDE_ROAD ? LW + SH : LW / 2;
  };
  // the middle of a shoulder (side -1 = left, +1 = right): where things stand on it
  const shoulderOffset = (side, s) => side < 0 ? (laneLo(s) + lo(s)) / 2 : (laneHi(s) + hi(s)) / 2;

  // the stretches of expressway with an exit or merge lane on the right
  const rampLaneZone = (s) => {
    if (!isMain(s)) return false;
    for (const x of exits) {
      if ((s >= x.exitAt - X.laneZone && s < x.exitAt + X.gore) ||
          (s >= x.mergeAt - X.gore && s <= x.mergeAt + X.laneZone)) return true;
    }
    return false;
  };
  const onShoulder = (lat, s) => lat > laneHi(s) || lat < laneLo(s);
  // the level's ice patch at (s, lat), if any: on the expressway, over one lane or (with no lane) all of them
  const ice = LEVEL.ice || [];
  const icy = (s, lat) => {
    if (!isMain(s)) return null;
    for (const p of ice) {
      if (s < p.from || s > p.to) continue;
      if (p.lane === undefined ? lat >= laneLo(s) && lat <= laneHi(s) : Math.abs(lat - laneOffset(p.lane, s)) <= LW / 2) return p;
    }
    return null;
  };
  // is s in the mud? (a level's "mud": stretches of the main road where it gives way to mud)
  const mud = LEVEL.mud || [];
  const muddy = (s) => isMain(s) && mud.some(m => s >= m.from && s <= m.to);
  // how thick a fog bank is at s (a level's "fog"): 0 (none) .. 1, thickening over its edges (see CONFIG.fog)
  const fogBanks = LEVEL.fog || [];
  const foggy = (s) => {
    let most = 0;
    for (const f of fogBanks) {
      const E = CONFIG.fog.edge, u = Math.min(s - f.from + E, f.to + E - s) / E;
      if (u > 0) most = Math.max(most, Math.min(1, u));
    }
    return most;
  };
  // is a car (lat, half width hw) over the railway's track at s? (a level with a "railway")
  const onRails = (s, lat, hw) => !!LEVEL.railway && isMain(s) && Math.abs(lat) - hw < CONFIG.railCrossing.width / 2;
  // the level's zone at s, if any (a level's "zones": see levels.js)
  const zones = LEVEL.zones || [];
  const zoneAt = (s) => isMain(s) ? zones.find(z => s >= z.from && s < z.to) || null : null;
  // how sharply the road bends at s: radians per metre, + = to the right
  const bend = (s) => {
    if (isMain(s)) return curveAt(s);
    const p = {};
    let d = toWorld(s - 1, 0, p) - toWorld(s + 1, 0, p);
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return d / 2;
  };

  // ---- lanes ------------------------------------------------------------------------------
  // expressway: 0 .. laneCount-1 left to right: the left side's lanes (oncoming on a two-way
  // road), the median's, then the right side's. -1 is the left shoulder, used as a lane only by
  // oncoming traffic heading for or coming off a flyover; laneCount is the exit / merge lane on
  // the right, used only by traffic taking a side road or coming off one.
  // side road: 0 = oncoming, 1 = ours. flyovers: 0.
  const laneOf = (side, k) => side < 0 ? LEFT - 1 - k : LEFT + MID + k; // k = 0 is a side's innermost lane
  const inMedian = (lane) => lane >= LEFT && lane < LEFT + MID;
  // a side's lanes still open at s (at least one, on a side that has any)
  const openCount = (side, s) => Math.min(side < 0 ? LEFT : RIGHT, Math.max(1, Math.round(lanesOn(side, s))));

  const laneOffset = (lane, s) => {
    const kind = kindOf(s);
    if (kind === SIDE_ROAD) return lane === 0 ? -LW / 2 : LW / 2;
    if (kind !== MAIN) return 0;
    if (lane === 'left' || lane === 'right') return shoulderOffset(lane === 'left' ? -1 : 1, s); // (an item on a shoulder)
    if (lane < 0) return -(edge(s, -1) + SH / 2);
    // (where the exit / merge lane is only partly open, its centre is that much closer in, so
    // a car heading for it moves out as it opens, and one still in it as it closes is eased
    // back into the lane beside it)
    if (lane >= LANES) return edge(s) + extra(s) - LW / 2;
    if (inMedian(lane)) return (lane - LEFT + 0.5) * LW - HM;
    const side = lane < LEFT ? -1 : 1;
    const k = side < 0 ? LEFT - 1 - lane : lane - LEFT - MID;
    return side * (HM + (Math.min(k, lanesOn(side, s) - 1) + 0.5) * LW);
  };

  // the lane itself, or the lane it has merged into where the expressway is narrower
  const openLane = (lane, s) => {
    if (!isMain(s) || lane < 0 || lane >= LANES || inMedian(lane)) return lane;
    const side = lane < LEFT ? -1 : 1;
    const k = side < 0 ? LEFT - 1 - lane : lane - LEFT - MID;
    return laneOf(side, Math.min(k, openCount(side, s) - 1));
  };

  const nearestLane = (lat, s) => {
    const kind = kindOf(s);
    if (kind === SIDE_ROAD) return lat < 0 && sideOpen(s) > 0.5 ? 0 : 1;
    if (kind !== MAIN) return 0;
    // in the exit / merge lane, where there is (most of) one
    if (lat > 0 && extra(s) > LW / 2 && lat > edge(s) + (extra(s) - LW) / 2) return LANES;
    if (Math.abs(lat) < HM) return LEFT + Math.max(0, Math.min(MID - 1, Math.floor((lat + HM) / LW)));
    const side = (lat < 0 && LEFT > 0) || RIGHT === 0 ? -1 : 1;
    const k = Math.round((Math.abs(lat) - HM) / LW - 0.5);
    return laneOf(side, Math.max(0, Math.min(openCount(side, s) - 1, k)));
  };

  // [first, last] lane a vehicle travelling in direction dir normally uses
  const laneRange = (dir, s) => {
    const kind = kindOf(s);
    if (kind === SIDE_ROAD) return dir < 0 ? [0, 0] : [1, 1];
    if (kind !== MAIN) return [0, 0];
    if (ONE_WAY) return [0, LANES - 1];
    return dir < 0 ? [0, LEFT - 1] : [LEFT + MID, LANES - 1]; // (never the median)
  };

  // where the player's lane assist pulls to: a lane centre, or the middle of a wide shoulder
  const assistOffset = (lat, s) => {
    if (lat > laneHi(s) && hi(s) - laneHi(s) >= LW * 0.8) return (laneHi(s) + hi(s)) / 2;
    if (lat < laneLo(s) && laneLo(s) - lo(s) >= LW * 0.8) return (laneLo(s) + lo(s)) / 2;
    return laneOffset(nearestLane(lat, s), s);
  };

  // ---- joining the roads up ---------------------------------------------------------------
  // Moves a vehicle that has reached a junction onto the next road. Own-direction vehicles
  // (the player included) take an exit by being in the exit lane as they pass the fork.
  // The player can also drive the flyovers the wrong way, against the oncoming traffic they
  // are built for: up flyover A from the expressway's left shoulder where it lands, over and
  // down into the side road's oncoming lane; and, still in that lane at the far end, up
  // flyover B and back over onto the left shoulder where it leaves.
  const transfer = (v) => {
    const kind = kindOf(v.s);
    let lane = null;
    const wrongWay = v.isPlayer && v.dir > 0 && !ONE_WAY; // (a one-way level's exits have no flyovers)
    if (kind === MAIN) {
      for (const x of exits) {
        if (wrongWay && v.s >= x.landingAt && v.s < x.landingAt + 6 && v.lat < -edge(v.s, -1)) {
          v.s = x.flyA0 + (v.s - x.landingAt);
          v.lat += LSLOT;
          break;
        }
        if (v.dir > 0 && v.s >= x.exitAt && v.s < x.exitAt + 6 && v.lat > edge(v.s)) {
          v.s = x.side0 + (v.s - x.exitAt);
          v.lat -= RSLOT - LW / 2;
          lane = 1;
          break;
        }
        if (v.dir < 0 && v.s <= x.flyoverAt && v.s > x.flyoverAt - 6 && v.lat < -edge(v.s, -1)) {
          v.s = x.flyB0 + FLY + (v.s - x.flyoverAt);
          v.lat += LSLOT;
          lane = 0;
          break;
        }
      }
    } else {
      const x = exitOf(v.s);
      if (wrongWay && kind === FLY_A && v.s >= x.flyA0 + FLY) {
        v.s = x.side0 + X.ramp + (v.s - x.flyA0 - FLY);
        v.lat -= LW / 2;
      } else if (wrongWay && kind === SIDE_ROAD && v.s >= x.sideEnd - X.ramp && v.s < x.sideEnd - X.ramp + 6 && v.lat < 0) {
        v.s = x.flyB0 + (v.s - (x.sideEnd - X.ramp));
        v.lat += LW / 2;
      } else if (wrongWay && kind === FLY_B && v.s >= x.flyB0 + FLY) {
        v.s = x.flyoverAt + (v.s - x.flyB0 - FLY);
        v.lat -= LSLOT;
      } else if (kind === SIDE_ROAD && v.dir > 0 && v.s >= x.sideEnd) {
        v.s = x.mergeAt + (v.s - x.sideEnd);
        v.lat += RSLOT - LW / 2;
        lane = LANES; // arrives in the merge lane
      } else if (kind === SIDE_ROAD && v.dir < 0 && v.s <= x.side0 + X.ramp) {
        v.s = x.flyA0 + FLY + (v.s - x.side0 - X.ramp);
        v.lat += LW / 2;
        lane = 0;
      } else if (kind === FLY_A && v.s <= x.flyA0) {
        v.s = x.landingAt + (v.s - x.flyA0);
        v.lat -= LSLOT;
        lane = -1;
      } else if (kind === FLY_B && v.s <= x.flyB0) {
        v.s = x.sideEnd - X.ramp + (v.s - x.flyB0);
        v.lat -= LW / 2;
        lane = 0;
      }
    }
    if (lane !== null && v.lane !== undefined) v.lane = lane;
  };

  // how far along the whole course a point is, measured on the expressway. A side road is a
  // different length, so its metres are scaled; used for progress and spawn / despawn distances.
  const along = (s) => {
    const kind = kindOf(s);
    if (kind === MAIN) return s;
    const x = exitOf(s);
    if (kind === SIDE_ROAD) return x.exitAt + (s - x.side0) * x.span / x.length;
    return kind === FLY_A ? x.landingAt + (s - x.flyA0) : x.mergeAt - X.ramp + (s - x.flyB0);
  };
  const progress = (s) => Math.max(0, Math.min(1, along(s) / length));
  const finished = (s) => isMain(s) && s >= length;
  const inBounds = (s) => !isMain(s) || LOOP || (s > -LEAD_IN + 10 && s < length + LEAD_OUT - 10);

  // a point `distance` ahead of the player for new traffic (NaN if there is no road there).
  // Between an exit and its merge that is the player's road; before the exit, either.
  const spawnAt = (playerS, distance, dir) => {
    const from = along(playerS), c = from + distance;
    if (c > length + LEAD_OUT - 20) return NaN;
    let x = null;
    for (const e of exits) if (c > e.exitAt && c < e.mergeAt) x = e;
    if (!x) return c;
    const playerOnIt = !isMain(playerS) && exitOf(playerS) === x;
    if (!playerOnIt && !(from <= x.exitAt && Math.random() < X.trafficShare)) return c;
    const s = x.side0 + (c - x.exitAt) * x.length / x.span;
    // the side road's oncoming lane only exists between the flyovers
    if (dir < 0 && (s < x.side0 + X.ramp + 10 || s > x.sideEnd - X.ramp - 10)) return NaN;
    return s;
  };

  // s for an item in the level data: { s, road: 'side', exit: n } counts from the start of
  // the nth exit's side road (n defaults to 0)
  const place = (item) => item.road === 'side' && exits[item.exit || 0]
    ? exits[item.exit || 0].side0 + item.s : item.s;

  // distances from a world point to the nearest side road / the expressway, for placing scenery
  const nearest = (xs, zs, x, z, best) => {
    for (let i = 0; i < xs.length; i += 4) best = Math.min(best, Math.hypot(x - xs[i], z - zs[i]));
    return best;
  };
  const sideDistance = (x, z) => exits.reduce((best, e) => nearest(e.xs, e.zs, x, z, best), Infinity);
  const mainDistance = (x, z) => nearest(mainXs, mainZs, x, z, Infinity);

  // the road position { s, lat } of a world point (x, z), found on the road that `near` is on,
  // within `reach` metres of it: the s whose cross-section the point lies in, and how far across
  const fromWorld = (x, z, near, reach = 80) => {
    const road = (s) => isMain(s) ? -1 : Math.floor((s - FIRST) / BLOCK) * 4 + kindOf(s);
    const c = {};
    let s = near, best = Infinity;
    for (let at = near - reach; at <= near + reach; at += STEP) { // the nearest centre-line point...
      if (road(at) !== road(near)) continue;
      toWorld(at, 0, c);
      const d = Math.hypot(x - c.x, z - c.z);
      if (d < best) { best = d; s = at; }
    }
    let h = 0;
    for (let i = 0; i < 3; i++) { // ...then slid along until the point is square to it
      h = toWorld(s, 0, c);
      s += (x - c.x) * Math.sin(h) + (z - c.z) * Math.cos(h);
    }
    h = toWorld(s, 0, c);
    return { s, lat: -(x - c.x) * Math.cos(h) + (z - c.z) * Math.sin(h) };
  };

  // ---- junctions (a level's "junctions": see CONFIG.junction) --------------------------------
  // At each, the road turns a quarter right or left (its bend starting at s), or goes straight on,
  // through a square box as wide as the road, shoulders and all. The two arms it doesn't take are
  // roads of their own, as wide, running out from the box until they would come near the road
  // again (or for ARM metres). All in world space (x, z), on level ground:
  //   s, end     the stretch of expressway through it: the bend, or the box (straight on)
  //   way        1 = a right turn, -1 = left, 0 = straight on; radius: the bend's
  //   centre     the middle of the box; half: half its width
  //   f0, r0     the road's direction coming in, and its right; out: its direction going on
  //   arms       [{ dir, length }]: the arms it doesn't take, length from the centre. A turn's are
  //              straight on, then the side opposite the way it goes; straight on, right then left
  const ARM = 220;
  const junctions = (LEVEL.junctions || []).map((j) => {
    const at = {}, p = {}, h0 = mainWorld(j.s, 0, at);
    const f0 = { x: Math.sin(h0), z: Math.cos(h0) }, r0 = { x: -Math.cos(h0), z: Math.sin(h0) };
    const neg = (v) => ({ x: -v.x, z: -v.z });
    const half = HM + Math.max(LEFT, RIGHT) * LW + SH;
    const way = j.turn === 'right' ? 1 : j.turn === 'left' ? -1 : 0;
    let end = j.s + 2 * half, turned = 0;
    if (way) { // (the bend: as far as the road takes to turn a quarter)
      for (end = j.s; end < j.s + 80 && Math.abs(turned) < Math.PI / 2 - 0.005;) {
        end += 0.5;
        turned = h0 - mainWorld(end, 0, p);
        while (turned > Math.PI) turned -= 2 * Math.PI;
        while (turned < -Math.PI) turned += 2 * Math.PI;
      }
    }
    const radius = way ? (end - j.s) / (Math.PI / 2) : 0, reach = way ? radius : half;
    const centre = { x: at.x + f0.x * reach, y: at.y, z: at.z + f0.z * reach };
    const out = way > 0 ? r0 : way < 0 ? neg(r0) : f0;
    const arms = (way ? [f0, neg(out)] : [r0, neg(r0)]).map((dir) => {
      let length = half;
      while (length < ARM) {
        const t = length + 5;
        if (t > half + 20 && mainDistance(centre.x + dir.x * t, centre.z + dir.z * t) < half + 2) break;
        length = t;
      }
      return { dir, length };
    });
    return { s: j.s, end, turn: j.turn, way, turned, radius, half, centre, f0, r0, out, arms,
      forward: j.forward ?? CONFIG.junction.forward, turnOff: j.turnOff ?? CONFIG.junction.turnOff,
      busy: false }; // (set every step by Traffic: a car is leaving across the box)
  });

  // ---- checking the level data ---------------------------------------------------------------
  const problems = [];
  {
    const reach = FLY - X.ramp;
    const curved = (a, b) => { for (let s = a; s < b; s += STEP) if (curveAt(s) !== 0) return true; return false; };
    const overlaps = (a, b, c, d) => a < d && c < b;
    if (![LEFT, RIGHT, MID].every(n => Number.isInteger(n) && n >= 0) || LEFT + RIGHT < 1) {
      problems.push('lanes: whole numbers, and at least one lane');
    }
    if (!ONE_WAY && (LEFT < 1 || RIGHT < 1)) problems.push('lanes: a two-way road needs at least one lane each way');
    if (ONE_WAY && MID) problems.push('median: only a two-way road can have one');
    if (LEVEL.railway && !MID) problems.push('railway: it needs a median to run down');
    if (LEVEL.drive !== undefined && LEVEL.drive !== 'left' && LEVEL.drive !== 'right') problems.push('drive: left or right');
    // a bend tighter than the road is wide folds its inside edge over itself, and a road that comes
    // back past itself (a hairpin's legs, say) must leave room between the two
    const halfWidth = HM + Math.max(LEFT, RIGHT) * LW + SH;
    LEVEL.segments.forEach((seg, i) => {
      if (seg.curve && 1 / Math.abs(seg.curve) < halfWidth + 3) {
        problems.push('segment ' + (i + 1) + ': a bend of radius ' + (1 / Math.abs(seg.curve)).toFixed(0) +
          ' m is too tight for this road; it needs at least ' + Math.ceil(halfWidth + 3) + ' m');
      }
    });
    {
      const at = [], p = {};
      for (let s = -LEAD_IN; s <= length + LEAD_OUT; s += 8) { mainWorld(s, 0, p); at.push([s, p.x, p.z]); }
      let clash = null;
      for (let i = 0; i < at.length && !clash; i++) {
        for (let j = i + 1; j < at.length; j++) {
          if (at[j][0] - at[i][0] < 3 * halfWidth) continue;
          if (LOOP && length - (at[j][0] - at[i][0]) < 3 * halfWidth) continue; // (round a loop, the end meets the start)
          const d = Math.hypot(at[i][1] - at[j][1], at[i][2] - at[j][2]);
          if (d < 2 * halfWidth + 2) { clash = [at[i][0], at[j][0], d]; break; }
        }
      }
      if (clash) problems.push('the road runs into itself: at ' + clash[0] + ' m and ' + clash[1] + ' m it is only ' + clash[2].toFixed(0) + ' m apart');
    }
    for (const J of junctions) {
      const name = 'junction at ' + J.s;
      if (J.turn !== 'left' && J.turn !== 'right' && J.turn !== 'straight') problems.push(name + ': turn is left, right or straight');
      else if (J.way && Math.abs(J.turned - J.way * Math.PI / 2) > 0.02) problems.push(name + ': the road must turn a quarter ' + J.turn + ' within 80 m of it');
      else if (!J.way && [J.s, J.s + J.half, J.end].some(s => curveAt(s))) problems.push(name + ': the road must run straight through it');
      if (J.arms.some(arm => arm.length < J.half + 100)) problems.push(name + ': an arm runs into the road within 100 m');
      if (J.s < 60 || J.end > length - 20) problems.push(name + ': too near the start or the finish');
    }
    for (const p of ice) {
      if (!(p.from < p.to) || p.from < 0 || p.to > length) problems.push('ice at ' + p.from + '-' + p.to + ': from before to, on the road');
      else if (p.lane !== undefined && !(Number.isInteger(p.lane) && p.lane >= 0 && p.lane < LANES)) problems.push('ice at ' + p.from + ': no lane ' + p.lane);
    }
    for (const z of [...(LEVEL.migration || []), ...(LEVEL.elephants || [])]) {
      if (!(z.from < z.to) || z.from < 0 || z.to > length) problems.push((z.kinds ? 'migration' : 'elephants') + ' at ' + z.from + '-' + z.to + ': from before to, on the road');
    }
    if (LOOP) {
      const a = {}, b = {};
      const ha = mainWorld(0, 0, a), hb = mainWorld(length, 0, b);
      const turned = Math.abs(((hb - ha) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
      if (Math.hypot(a.x - b.x, a.z - b.z) > 1 || turned > 0.01) problems.push('laps: the road must come back round to where it starts, facing the same way (it ends ' + Math.hypot(a.x - b.x, a.z - b.z).toFixed(1) + ' m off)');
    }
    for (const r of runoffs) {
      if (!(r.from < r.to) || r.from < 0 || r.to > length || !(r.width > 0) || (r.side !== 'left' && r.side !== 'right')) problems.push('runoff at ' + r.from + ': from before to, on the road, a width, side left or right');
    }
    for (const m of mud) {
      if (!(m.from < m.to) || m.from < 0 || m.to > length) problems.push('mud at ' + m.from + '-' + m.to + ': from before to, on the road');
    }
    for (const row of LEVEL.potties || []) {
      const name = 'portaloos at ' + row.s;
      if (!['hop', 'wave', 'slide', 'shuffle', 'stomp', 'spin'].includes(row.pattern)) problems.push(name + ': no dance called "' + row.pattern + '"');
      if (!(row.lanes && row.lanes.length && row.lanes.every(l => l >= 0 && l < LANES))) problems.push(name + ': lanes on the road');
    }
    for (const m of LEVEL.machinery || []) {
      const at = m.s ?? m.from;
      if (!(at >= 0 && at <= length) || (m.to !== undefined && !(m.to > m.from && m.to <= length))) problems.push('machinery at ' + at + ': beyond the road');
    }
    for (const w of LEVEL.siteWorks || []) {
      const at = w.s ?? w.from;
      if (!['trench', 'excavator', 'workers', 'pipes'].includes(w.kind)) problems.push('site works at ' + at + ': no kind called "' + w.kind + '"');
      else if (!(at >= 0 && at <= length) || (w.to !== undefined && !(w.to > w.from && w.to <= length))) problems.push('site works at ' + at + ': beyond the road');
    }
    // the hidden gimmicks level's (see levels.js)
    const straight = (from, to) => { for (let s = from; s <= to; s += 5) if (curveAt(s)) return false; return true; };
    for (const c of LEVEL.cameras || []) {
      if (!(c.s >= 0 && c.s <= length)) problems.push('camera at ' + c.s + ': beyond the road');
      else if (!['left', 'right', 'centre'].includes(c.side)) problems.push('camera at ' + c.s + ': side is left, right or centre');
    }
    for (const c of LEVEL.crossings || []) {
      const R = CONFIG.crossing.stopLine + 10;
      if (!(c.s - R >= 0 && c.s + R <= length)) problems.push('level crossing at ' + c.s + ': beyond the road');
      else if (!straight(c.s - R, c.s + R)) problems.push('level crossing at ' + c.s + ': the road must run straight through it');
    }
    for (const z of LEVEL.stopGo || []) {
      const R = CONFIG.stopGo.stopLine + 10;
      if (!(z.from < z.to) || z.from - R < 0 || z.to + R > length) problems.push('stop / go at ' + z.from + ': from before to, on the road');
      else if (ONE_WAY || LEFT !== 1 || RIGHT !== 1 || MID) problems.push('stop / go at ' + z.from + ': only on a two-way road of one lane each way');
      else if (!straight(z.from - R, z.to + R)) problems.push('stop / go at ' + z.from + ': the road must run straight through it');
    }
    for (const z of [...(LEVEL.fog || []), ...(LEVEL.rockfall || [])]) {
      if (!(z.from < z.to) || z.from < 0 || z.to > length) problems.push((z.count ? 'rockfall' : 'fog') + ' at ' + z.from + '-' + z.to + ': from before to, on the road');
      else if (z.count && z.side !== 'left' && z.side !== 'right') problems.push('rockfall at ' + z.from + ': side is left or right');
    }
    for (const z of LEVEL.landmines || []) {
      if (!(z.from < z.to) || z.from < 0 || z.to > length || !(z.count > 0)) problems.push('landmines at ' + z.from + '-' + z.to + ': from before to, on the road, with a count');
    }
    for (const h of LEVEL.potholes || []) {
      if (!(h.s >= 0 && h.s <= length) || !(Number.isInteger(h.lane) && h.lane >= 0 && h.lane < LANES)) problems.push('pothole at ' + h.s + ': in a lane on the road');
    }
    for (const p of LEVEL.pelotons || []) {
      if (!(p.s >= 0 && p.s <= length) || !(p.count > 0)) problems.push('peloton at ' + p.s + ': on the road, with a count');
      else if (FLOW === 'south') problems.push('peloton at ' + p.s + ': it rides the player\'s way');
    }
    for (const e of LEVEL.wreckage || []) {
      const name = 'wreckage at ' + e.at;
      if (!CONFIG.wreckage.kinds[e.kind]) problems.push(name + ': there is no kind of wreckage called "' + e.kind + '"');
      else if (e.at < 0 || e.at > length) problems.push(name + ': beyond the road');
      else if (!(e.lanes && e.lanes[0] <= e.lanes[1] && e.lanes[0] >= 0 && e.lanes[1] < LANES)) problems.push(name + ': lanes [first, last] on the road');
      else if (e.lanes[1] - e.lanes[0] + 1 >= openCount(1, e.at) + (ONE_WAY ? openCount(-1, e.at) : 0)) problems.push(name + ': it must leave a lane open');
    }
    for (const r of LEVEL.hippos || []) {
      if (!(r.from < r.to) || r.from < 0 || r.to > length) problems.push('hippos at ' + r.from + '-' + r.to + ': from before to, on the road');
      else if (!(r.every && r.every.min > 0 && r.every.max >= r.every.min)) problems.push('hippos at ' + r.from + ': every { min, max } s');
    }
    if (LEVEL.tide) {
      const t = LEVEL.tide, w = t.waves || {};
      if (!(t.from < t.to) || t.from < 0 || t.to > length) problems.push('tide: from before to, on the road');
      if (!(t.start >= 0 && t.end >= t.start)) problems.push('tide: start and end are lanes flooded, end no lower than start');
      if (!(w.every && w.every.min > 0 && w.every.max >= w.every.min && w.reach && w.reach.max >= w.reach.min)) problems.push('tide: waves need every { min, max } and reach { min, max }');
      if (t.washUp && !(t.washUp.types && t.washUp.count && t.washUp.count.max >= t.washUp.count.min)) problems.push('tide: washUp needs types { type: share } and count { min, max }');
      if (!RIGHT || ONE_WAY || (LEVEL.exits || []).length) problems.push('tide: only on a two-way road with lanes going the player\'s way, and no exits');
    }
    zones.forEach((z, i) => {
      const name = 'zone ' + (z.id || i + 1);
      if (!(z.from < z.to) || (i && z.from < zones[i - 1].to)) problems.push(name + ': from before to, and after the zone before');
      for (const kind of Object.keys(z.traffic || {})) {
        if (!CONFIG.vehicles[kind]) problems.push(name + ': there is no vehicle called "' + kind + '"');
      }
    });
    for (const car of LEVEL.parked || []) {
      if (car.s < 0 || car.s > length) problems.push('parked car at ' + car.s + ': beyond the road');
      else if (car.side !== 'left' && car.side !== 'right') problems.push('parked car at ' + car.s + ': side is left or right');
      else if (onBridge(car.s)) problems.push('parked car at ' + car.s + ': no shoulder to park on, on a bridge');
    }
    exits.forEach((x, i) => {
      const name = 'exit ' + i;
      if (x.mergeAt <= x.exitAt + 2 * X.ramp + 100) problems.push(name + ': merge is too close to the exit');
      if (!ONE_WAY && curved(x.landingAt, x.exitAt)) problems.push(name + ': expressway must be straight for ' + reach + ' m before it');
      if (!ONE_WAY && curved(x.mergeAt, x.flyoverAt)) problems.push(name + ': expressway must be straight for ' + reach + ' m after the merge');
      if ((ONE_WAY ? x.exitAt - X.laneZone : x.landingAt) < 0) problems.push(name + ': too close to the start line');
      if ((ONE_WAY ? x.mergeAt : x.flyoverAt) + X.laneZone > length + LEAD_OUT - 10) problems.push(name + ': merge is too close to the finish');
      const p = {};
      x.path(x.length / 2, 0, p);
      if (mainDistance(p.x, p.z) < 30) problems.push(name + ': side road runs into the expressway (it must swing away between exit and merge)');
      for (const [what, list] of [['bridge', bridges], ['narrowing', narrows]]) {
        for (const z of list) {
          if (overlaps(z.from, z.to, x.landingAt - 20, x.exitAt + 20) ||
              overlaps(z.from, z.to, x.mergeAt - 20, x.flyoverAt + X.laneZone)) {
            problems.push(name + ': a ' + what + ' at ' + z.from + '-' + z.to + ' overlaps its ramps');
          }
        }
      }
    });
    if (FLOW === 'south' && exits.length) problems.push('exits need northbound traffic: a "flow": "south" level cannot have them');
    if (hasGrades && !hilly) problems.push('hills (segment grades) and exits cannot be combined yet: the grades are ignored');
    for (const b of bridges) {
      let sloped = false;
      for (let s = b.from; s <= b.to; s += STEP) if (Math.abs(grade(s)) > 0.002) sloped = true;
      if (sloped) problems.push('bridge at ' + b.from + '-' + b.to + ': bridges must be on level road');
    }
    const spots = [];
    for (const [what, list] of [['pickup', LEVEL.pickups || []], ['obstacle', LEVEL.obstacles || []]]) {
      for (const item of list) {
        const name = what + ' at ' + item.s + (item.road === 'side' ? ' (side road)' : '');
        if (item.road === 'side') {
          const x = exits[item.exit || 0];
          if (!x) { problems.push(name + ': no such exit'); continue; }
          if (item.s < 0 || item.s > x.length) problems.push(name + ': beyond the side road (' + Math.round(x.length) + ' m long)');
          else if (item.lane !== 0 && item.lane !== 1) problems.push(name + ': side road lanes are 0 and 1');
          else if (item.lane === 0 && (item.s < X.ramp || item.s > x.length - X.ramp)) problems.push(name + ': no oncoming lane on the ramps');
        } else if (item.s < 0 || item.s > length) {
          problems.push(name + ': beyond the expressway');
        } else if (item.lane < 0 || item.lane >= LANES) {
          problems.push(name + ': no lane ' + item.lane);
        } else if (openLane(item.lane, item.s) !== item.lane) {
          problems.push(name + ': lane ' + item.lane + ' is merged away there');
        }
        const s = place(item), lat = laneOffset(item.lane, s);
        if (spots.some(o => Math.abs(o.s - s) < 8 && Math.abs(o.lat - lat) < 2)) problems.push(name + ': on top of another item');
        spots.push({ s, lat });
      }
    }
    for (const kind of Object.keys(LEVEL.traffic || {})) {
      if (!CONFIG.vehicles[kind]) problems.push('traffic: there is no vehicle called "' + kind + '"');
    }
    const counts = (LEVEL.trafficCount !== undefined ? LEVEL.trafficCount : CONFIG.trafficCount) +
      (LEVEL.oncomingCount !== undefined ? LEVEL.oncomingCount : CONFIG.oncomingCount);
    if (counts > CONFIG.trafficPool) problems.push('traffic: trafficCount + oncomingCount is ' + counts + ', more than the pool of ' + CONFIG.trafficPool);
    for (const t of LEVEL.targets || []) {
      const s = place(t), name = 'target at ' + t.s + (t.road === 'side' ? ' (side road)' : '');
      if (t.road === 'side' ? (!exits[t.exit || 0] || t.s < 0 || t.s > exits[t.exit || 0].length) : (t.s < 0 || t.s > length)) {
        problems.push(name + ': beyond the road');
      } else if (onBridge(s)) {
        problems.push(name + ': inside a bridge\'s structure');
      }
    }
    for (const text of problems) console.warn('Level "' + LEVEL.name + '": ' + text);
  }

  return {
    length, start: -LEAD_IN, end: length + LEAD_OUT, loop: LOOP, problems,
    laneCount: LANES, leftLanes: LEFT, rightLanes: RIGHT, medianLanes: MID, medianHalf: HM, shoulder: SH, flow: FLOW, mirrored: MIRRORED,
    toWorld, fromWorld, grade, hilly, transfer, along, progress, finished, inBounds, spawnAt, place, isMain,
    laneOffset, openLane, nearestLane, laneRange, assistOffset,
    lanesOn, edge, extraLane, onBridge, icy, muddy, foggy, bend, onRails, junctions, zoneAt, lo, hi, laneLo, laneHi, shoulderOffset, onShoulder, rampLaneZone, sideOpen,
    flyPillar, sideDistance, mainDistance, exits,
  };
};

// The loaded level's roads: null until a level is loaded (see Game.load). A live binding,
// so every module that imports Track sees the newly built one.
export let Track = null;
export const buildTrack = () => { Track = createTrack(); };
