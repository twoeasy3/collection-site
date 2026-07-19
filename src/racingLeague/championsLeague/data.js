// Apex Champions League — an 8-driver knockout, sanctioned by The Apex
// Federation, that pulls its field from the top finishers across all three
// leagues' Tier 1 standings. Every duel is driven in an identical spec car
// on a neutral circuit, so the bracket is decided on raw driving rating
// rather than any one league's car.

import { mulberry32, gaussian } from '../shared/pointsSystem';
import { getQualifiers } from '../shared/qualification';

export const EVENT_NAME = 'Apex Champions League';
export const EVENT_SHORT = 'ACL';
export const SEASON_LABEL = 'Edition IV · 2031';
export const QUALIFICATION_NOTE = 'The top 3 drivers from Solaris GP, the top 3 from Horizon Endurance, and the top 2 from Ridgeline Rally — all drawn from this season’s Tier 1 final standings — qualify for the bracket.';

export const QUALIFIER_COUNTS = { solaris: 3, horizon: 3, ridgeline: 2 };

export const QUALIFIERS = getQualifiers(QUALIFIER_COUNTS);

export const SEEDED = [...QUALIFIERS].sort((a, b) => b.rating - a.rating).map((q, i) => ({ ...q, seed: i + 1 }));

function marginLabel(margin) {
  if (margin < 2) return 'Photo finish';
  if (margin < 5) return 'Close duel';
  if (margin < 10) return 'Clear win';
  return 'Dominant win';
}

function simulateDuel(a, b, rng) {
  const perfA = a.rating + gaussian(rng, 6);
  const perfB = b.rating + gaussian(rng, 6);
  const winner = perfA >= perfB ? a : b;
  const margin = Math.abs(perfA - perfB);
  return { a, b, perfA, perfB, winner, margin, marginLabel: marginLabel(margin) };
}

function simulateBracket(seeded, seed) {
  const rng = mulberry32(seed);
  const bySeed = (n) => seeded.find(q => q.seed === n);

  const qf = [
    simulateDuel(bySeed(1), bySeed(8), rng),
    simulateDuel(bySeed(4), bySeed(5), rng),
    simulateDuel(bySeed(3), bySeed(6), rng),
    simulateDuel(bySeed(2), bySeed(7), rng),
  ];

  const sf = [
    simulateDuel(qf[0].winner, qf[1].winner, rng),
    simulateDuel(qf[2].winner, qf[3].winner, rng),
  ];

  const final = simulateDuel(sf[0].winner, sf[1].winner, rng);

  return { rounds: [qf, sf, [final]], champion: final.winner };
}

export const BRACKET = simulateBracket(SEEDED, 314159);
export const CHAMPION = BRACKET.champion;
