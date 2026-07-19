// visit_dates should always be an array of date strings. Guards against
// ever spreading a raw value that isn't actually an array (e.g. `[...str]`
// silently spreads a string into its individual characters).
export function asVisitDates(v) {
  return Array.isArray(v) ? v : [];
}
