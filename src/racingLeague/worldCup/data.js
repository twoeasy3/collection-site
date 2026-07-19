// Apex World Cup — a nations-cup exhibition sanctioned by The Apex
// Federation. The top 5 drivers from each league's Tier 1 final standings
// qualify and are grouped into national squads by nationality; squads score
// as a team across four mixed-format rounds, one flavored after each
// league's format plus a Grand Final.

import { STANDARD_POINTS, mulberry32, gaussian } from '../shared/pointsSystem';
import { getQualifiers } from '../shared/qualification';

export const EVENT_NAME = 'Apex World Cup';
export const EVENT_SHORT = 'AWC';
export const SEASON_LABEL = 'Edition III · 2031';
export const QUALIFICATION_NOTE = 'The top 5 drivers from each league’s Tier 1 final standings qualify and race for their home nation, grouped by nationality.';

export const QUALIFIER_COUNTS = { solaris: 5, horizon: 5, ridgeline: 5 };
export const QUALIFIERS = getQualifiers(QUALIFIER_COUNTS);

export const ROUNDS_META = [
  { id: 'sprint', name: 'Sprint Trial', inspiredBy: 'Solaris GP' },
  { id: 'endurance', name: 'Endurance Trial', inspiredBy: 'Horizon Endurance' },
  { id: 'rally', name: 'Rally Trial', inspiredBy: 'Ridgeline Rally' },
  { id: 'final', name: 'Grand Final', inspiredBy: 'All three leagues' },
];

export const SQUADS = QUALIFIERS.reduce((acc, q) => {
  (acc[q.nationality] ||= []).push(q);
  return acc;
}, {});

function runRound(rng) {
  return QUALIFIERS
    .map(q => ({ id: q.id, perf: q.rating + gaussian(rng, 8) }))
    .sort((a, b) => b.perf - a.perf)
    .map(r => r.id);
}

function simulateWorldCup(seed) {
  const rng = mulberry32(seed);
  const driverPoints = Object.fromEntries(QUALIFIERS.map(q => [q.id, 0]));
  const countryPoints = Object.fromEntries(Object.keys(SQUADS).map(c => [c, 0]));

  const rounds = ROUNDS_META.map(meta => {
    const order = runRound(rng);
    const pointsAwarded = {};
    order.slice(0, STANDARD_POINTS.length).forEach((id, i) => {
      const pts = STANDARD_POINTS[i];
      driverPoints[id] += pts;
      pointsAwarded[id] = pts;
      const nat = QUALIFIERS.find(q => q.id === id).nationality;
      countryPoints[nat] += pts;
    });
    return { ...meta, order, pointsAwarded };
  });

  const goldenDriverStandings = QUALIFIERS
    .map(q => ({ ...q, points: driverPoints[q.id] }))
    .sort((a, b) => b.points - a.points);

  const nationsStandings = Object.entries(countryPoints)
    .map(([country, points]) => ({ country, points, squad: SQUADS[country] }))
    .sort((a, b) => b.points - a.points);

  return { rounds, goldenDriverStandings, nationsStandings };
}

export const RESULT = simulateWorldCup(271828);
