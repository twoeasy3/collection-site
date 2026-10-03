import { useCallback, useEffect, useMemo, useState } from 'react';
import { statsKeyFor, computeRating } from '../utils/carStats';

const PCT_FIELDS = ['ts', 'ac', 'ha', 'ni', 'st', 'cr', 'r'];
// Stats where 0 means "not applicable" and must not enter the distribution.
const SKIP_ZERO = new Set(['cr']);

// Number of entries in a sorted array strictly below `value` (binary search).
const countBelow = (arr, value) => {
  let lo = 0, hi = arr.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid] < value) lo = mid + 1; else hi = mid; }
  return lo;
};

// Loads public/car_stats.json once. The file is optional: when it is missing
// or malformed, `statsByKey` stays null and every stats feature stays hidden.
//
// Edits made in the Stats tab are held in `overrides` (keyed like the file)
// for the session only. They are never written anywhere.
export function useCarStats() {
  const [statsByKey, setStatsByKey] = useState(null);
  const [overrides, setOverrides] = useState({});

  useEffect(() => {
    let cancelled = false;
    fetch('/car_stats.json', { cache: 'no-cache' })
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (!cancelled) setStatsByKey(data && data.byKey && typeof data.byKey === 'object' ? data.byKey : null); })
      .catch(() => { if (!cancelled) setStatsByKey(null); });
    return () => { cancelled = true; };
  }, []);

  // Base stats merged with any session edit. Rating = formula + the "hidden"
  // offset (`hd`, signed, default 0). Only overridden keys get new objects,
  // so card comparators can rely on identity for everything else.
  const merged = useMemo(() => {
    if (!statsByKey) return null;
    if (!Object.keys(overrides).length) return statsByKey;
    const out = { ...statsByKey };
    for (const [key, o] of Object.entries(overrides)) {
      const base = statsByKey[key];
      if (!base) continue;
      const s = { ...base, ...o };
      out[key] = { ...s, r: computeRating(s) + (Number(s.hd) || 0), edited: true };
    }
    return out;
  }, [statsByKey, overrides]);

  const getStats = useCallback((car) => (merged ? merged[statsKeyFor(car)] || null : null), [merged]);

  // Per-class sorted values for each stat and the rating, over the merged
  // set, so percentiles reflect session edits (including class changes).
  const classDistributions = useMemo(() => {
    if (!merged) return null;
    const dist = {};
    for (const s of Object.values(merged)) {
      const d = dist[s.cl] || (dist[s.cl] = Object.fromEntries(PCT_FIELDS.map(f => [f, []])));
      for (const f of PCT_FIELDS) {
        const v = Number(s[f]) || 0;
        if (SKIP_ZERO.has(f) && v === 0) continue;
        d[f].push(v);
      }
    }
    for (const d of Object.values(dist)) for (const f of PCT_FIELDS) d[f].sort((a, b) => a - b);
    return dist;
  }, [merged]);

  // Percent of vehicles in `cl` that `value` beats for `field` ('r' for
  // rating). Null when the class has fewer than two vehicles.
  const classPercentile = useCallback((cl, field, value) => {
    if (SKIP_ZERO.has(field) && !(Number(value) > 0)) return null;
    const arr = classDistributions?.[cl]?.[field];
    if (!arr || arr.length < 2) return null;
    return Math.round((countBelow(arr, Number(value) || 0) / arr.length) * 1000) / 10;
  }, [classDistributions]);

  // Value of `field` at `pct` percent through the class (0 = weakest car,
  // 100 = strongest). Linear between neighbours; null when the class is empty.
  const classQuantile = useCallback((cl, field, pct) => {
    const arr = classDistributions?.[cl]?.[field];
    if (!arr || !arr.length) return null;
    const pos = (Math.max(0, Math.min(100, pct)) / 100) * (arr.length - 1);
    const i = Math.floor(pos), f = pos - i;
    return i + 1 < arr.length ? arr[i] + (arr[i + 1] - arr[i]) * f : arr[i];
  }, [classDistributions]);

  // Typical stat line for a class: the median of each stat over the class.
  // Null when the class has no vehicles.
  const classProfile = useCallback((cl) => {
    const d = classDistributions?.[cl];
    if (!d || !d.r.length) return null;
    const median = (arr) => (arr.length ? arr[arr.length >> 1] : 0);
    return { ts: median(d.ts), ac: median(d.ac), ha: median(d.ha), ni: median(d.ni), st: median(d.st) };
  }, [classDistributions]);

  const classSizes = useMemo(() => (classDistributions ? Object.fromEntries(Object.entries(classDistributions).map(([cl, d]) => [cl, d.r.length])) : {}), [classDistributions]);

  // Set one or more stat fields for a car (session-only).
  const editStats = useCallback((car, patch) => {
    const key = statsKeyFor(car);
    setOverrides(prev => ({ ...prev, [key]: { ...(prev[key] || {}), ...patch } }));
  }, []);

  // Drop the session edit for a car, restoring the file values.
  const resetStats = useCallback((car) => {
    const key = statsKeyFor(car);
    setOverrides(prev => { if (!(key in prev)) return prev; const next = { ...prev }; delete next[key]; return next; });
  }, []);

  return { statsByKey, getStats, editStats, resetStats, classPercentile, classQuantile, classProfile, classSizes, statsAvailable: statsByKey !== null };
}
