import { CONFIG } from './config.js';
import { LEVEL } from './levels.js';

// ============================================================================
// TRACK - path sampled by distance along track (s) and lateral offset (lat)
// heading h: forward = (sin h, cos h) in (x, z); +lat is the driver's right
// ============================================================================
const createTrack = () => {
  const STEP = 2;            // sample spacing, metres
  const LEAD_IN = 100;       // straight road before the start line
  const LEAD_OUT = 200;      // and after the finish
  const length = LEVEL.segments.reduce((sum, seg) => sum + seg.length, 0);
  const narrows = LEVEL.narrows || [], bridges = LEVEL.bridges || [];
  const X = CONFIG.ramps, LW = CONFIG.laneWidth, SH = CONFIG.shoulder, FLY = X.flyoverLength;
  // a level can set its own lane count (an even number); half go each way
  const LANES = LEVEL.lanes || CONFIG.laneCount;
  const SIDE = LANES / 2; // lanes each way on the expressway
  // which way the traffic goes: 'both' (the left half of the road is oncoming), or every
  // vehicle 'north' (the player's way) or 'south' (against the player), using all the lanes
  const FLOW = LEVEL.flow === 'north' || LEVEL.flow === 'south' ? LEVEL.flow : 'both';
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
  //   exit n       side road from 10000 + n * 30000, flyover A from 20000 + ..., flyover B from 30000 + ...
  // Track.transfer() moves a vehicle from one road to the next where they join.
  const MAIN = 0, SIDE_ROAD = 1, FLY_A = 2, FLY_B = 3;
  const FIRST = 8000, BLOCK = 30000;
  const isMain = (s) => s < FIRST;
  const kindOf = (s) => {
    if (s < FIRST) return MAIN;
    const local = (s - FIRST) % BLOCK;
    return local < 10000 ? SIDE_ROAD : local < 20000 ? FLY_A : FLY_B;
  };
  const exitOf = (s) => exits[Math.floor((s - FIRST) / BLOCK)];

  // ---- expressway path: integrate the segment list once ----------------------------
  const curveAt = (s) => {
    if (s < 0) return 0;
    for (const seg of LEVEL.segments) {
      if (s < seg.length) return seg.curve;
      s -= seg.length;
    }
    return 0;
  };
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
  const gradeAt = (s) => {
    if (s < 0) return 0;
    for (const seg of LEVEL.segments) {
      if (s < seg.length) return seg.grade || 0;
      s -= seg.length;
    }
    return 0;
  };
  const rawGrades = mainXs.map((_, i) => gradeAt(-LEAD_IN + i * STEP));
  const hasGrades = rawGrades.some(g => g !== 0);
  // (hills and side roads can't be combined yet: the ramps and flyovers assume level ground)
  const hilly = hasGrades && !(LEVEL.exits || []).length;
  const mainGrades = rawGrades.map((_, i) => {
    if (!hilly) return 0;
    let sum = 0;
    const EASE = Math.round(CONFIG.gradeEase / STEP); // samples each way
    for (let k = i - EASE; k <= i + EASE; k++) sum += rawGrades[Math.max(0, Math.min(rawGrades.length - 1, k))];
    return sum / (2 * EASE + 1);
  });
  const mainYs = [0];
  for (let i = 1; i < mainXs.length; i++) mainYs.push(mainYs[i - 1] + mainGrades[i - 1] * STEP);
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
  const RSLOT = SIDE * LW + LW / 2; // lat on the expressway of that extra lane's centre line
  const LSLOT = SIDE * LW + SH / 2; // lat of the left shoulder's centre line, where the flyovers land
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
      side0: 10000 + i * BLOCK, flyA0: 20000 + i * BLOCK, flyB0: 30000 + i * BLOCK,
      sideEnd: 10000 + i * BLOCK + side.length, length: side.length, path: side.path, xs: side.xs, zs: side.zs,
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
    if (kind === MAIN) return mainWorld(s, lat, out);
    const x = exitOf(s);
    return kind === SIDE_ROAD ? sideWorld(x, s, lat, out) : flyWorld(x, kind === FLY_B, s, lat, out);
  };

  // ---- cross-sections ------------------------------------------------------------------
  // 0 outside the zone, 1 inside, easing over `taper` metres at each end
  const zone = (s, z) => smooth((s - z.from) / CONFIG.taper) *
    (1 - smooth((s - (z.to - CONFIG.taper)) / CONFIG.taper));
  // expressway: lanes each direction has; where it narrows the outer lanes merge inward
  const lanesPerSide = (s) => {
    let cut = 0;
    for (const z of narrows) cut = Math.max(cut, (SIDE - z.lanesPerSide) * zone(s, z));
    return SIDE - cut;
  };
  const edge = (s) => lanesPerSide(s) * LW; // expressway: outer lane line
  const onBridge = (s) => {
    for (const b of bridges) if (s >= b.from && s <= b.to) return true;
    return false;
  };
  const mainOuter = (s) => edge(s) + (onBridge(s) ? Math.min(SH, CONFIG.bridgeWallInset) : SH);
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
    return kind === MAIN ? -edge(s) : kind === SIDE_ROAD ? -sideOpen(s) * LW : -LW / 2;
  };
  const laneHi = (s) => {
    const kind = kindOf(s);
    return kind === MAIN ? edge(s) + extra(s) : kind === SIDE_ROAD ? LW : LW / 2;
  };
  const lo = (s) => {
    const kind = kindOf(s);
    if (kind === MAIN) return -mainOuter(s);
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

  // ---- lanes ------------------------------------------------------------------------------
  // expressway: 0 .. laneCount-1 left to right, left half oncoming. -1 is the left shoulder,
  // used as a lane only by oncoming traffic heading for or coming off a flyover; laneCount is
  // the exit / merge lane on the right, used only by traffic taking a side road or coming off one.
  // side road: 0 = oncoming, 1 = ours. flyovers: 0.
  const laneOf = (side, k) => side < 0 ? SIDE - 1 - k : SIDE + k; // k = 0 is the innermost lane
  const openCount = (s) => Math.max(1, Math.round(lanesPerSide(s)));

  const laneOffset = (lane, s) => {
    const kind = kindOf(s);
    if (kind === SIDE_ROAD) return lane === 0 ? -LW / 2 : LW / 2;
    if (kind !== MAIN) return 0;
    if (lane < 0) return -(edge(s) + SH / 2);
    // (where the exit / merge lane is only partly open, its centre is that much closer in, so
    // a car heading for it moves out as it opens, and one still in it as it closes is eased
    // back into the lane beside it)
    if (lane >= LANES) return edge(s) + extra(s) - LW / 2;
    const side = lane < SIDE ? -1 : 1;
    const k = side < 0 ? SIDE - 1 - lane : lane - SIDE;
    return side * (Math.min(k, lanesPerSide(s) - 1) + 0.5) * LW;
  };

  // the lane itself, or the lane it has merged into where the expressway is narrower
  const openLane = (lane, s) => {
    if (!isMain(s) || lane < 0 || lane >= LANES) return lane;
    const side = lane < SIDE ? -1 : 1;
    const k = side < 0 ? SIDE - 1 - lane : lane - SIDE;
    return laneOf(side, Math.min(k, openCount(s) - 1));
  };

  const nearestLane = (lat, s) => {
    const kind = kindOf(s);
    if (kind === SIDE_ROAD) return lat < 0 && sideOpen(s) > 0.5 ? 0 : 1;
    if (kind !== MAIN) return 0;
    // in the exit / merge lane, where there is (most of) one
    if (lat > 0 && extra(s) > LW / 2 && lat > edge(s) + (extra(s) - LW) / 2) return LANES;
    const k = Math.round(Math.abs(lat) / LW - 0.5);
    return laneOf(lat < 0 ? -1 : 1, Math.max(0, Math.min(openCount(s) - 1, k)));
  };

  // [first, last] lane a vehicle travelling in direction dir normally uses
  const laneRange = (dir, s) => {
    const kind = kindOf(s);
    if (kind === SIDE_ROAD) return dir < 0 ? [0, 0] : [1, 1];
    if (kind !== MAIN) return [0, 0];
    if (ONE_WAY) return [0, LANES - 1];
    return dir < 0 ? [0, SIDE - 1] : [SIDE, LANES - 1];
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
  const transfer = (v) => {
    const kind = kindOf(v.s);
    let lane = null;
    if (kind === MAIN) {
      for (const x of exits) {
        if (v.dir > 0 && v.s >= x.exitAt && v.s < x.exitAt + 6 && v.lat > edge(v.s)) {
          v.s = x.side0 + (v.s - x.exitAt);
          v.lat -= RSLOT - LW / 2;
          lane = 1;
          break;
        }
        if (v.dir < 0 && v.s <= x.flyoverAt && v.s > x.flyoverAt - 6 && v.lat < -edge(v.s)) {
          v.s = x.flyB0 + FLY + (v.s - x.flyoverAt);
          v.lat += LSLOT;
          lane = 0;
          break;
        }
      }
    } else {
      const x = exitOf(v.s);
      if (kind === SIDE_ROAD && v.dir > 0 && v.s >= x.sideEnd) {
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
  const inBounds = (s) => !isMain(s) || (s > -LEAD_IN + 10 && s < length + LEAD_OUT - 10);

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

  // ---- checking the level data ---------------------------------------------------------------
  const problems = [];
  {
    const reach = FLY - X.ramp;
    const curved = (a, b) => { for (let s = a; s < b; s += STEP) if (curveAt(s) !== 0) return true; return false; };
    const overlaps = (a, b, c, d) => a < d && c < b;
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
    length, start: -LEAD_IN, end: length + LEAD_OUT, problems,
    laneCount: LANES, lanesEachWay: SIDE, shoulder: SH, flow: FLOW,
    toWorld, grade, hilly, transfer, along, progress, finished, inBounds, spawnAt, place, isMain,
    laneOffset, openLane, nearestLane, laneRange, assistOffset,
    lanesPerSide, edge, extraLane, onBridge, lo, hi, laneLo, laneHi, shoulderOffset, onShoulder, rampLaneZone, sideOpen,
    flyPillar, sideDistance, mainDistance, exits,
  };
};

// The loaded level's roads: null until a level is loaded (see Game.load). A live binding,
// so every module that imports Track sees the newly built one.
export let Track = null;
export const buildTrack = () => { Track = createTrack(); };
