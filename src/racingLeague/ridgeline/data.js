// Ridgeline Rally Championship — stage rally. Each entry is a driver +
// co-driver crew (not a multi-car team), scored on overall rally position
// plus a Power Stage bonus for the final, separately-timed stage.
//
// Tier 2 (Ridgeline Challenger Series) runs the same calendar with a
// smaller, less experienced grid. The bottom crews in Tier 1 swap with the
// top crews in Tier 2 each season — see PROMOTION_RELEGATION.

import { STANDARD_POINTS, POWER_STAGE_POINTS, mulberry32, gaussian } from '../shared/pointsSystem';

export const LEAGUE_NAME = 'Ridgeline Rally Championship';
export const LEAGUE_SHORT = 'RRC';
export const SEASON_LABEL = 'Season VI · 2031';
export const FOUNDED_YEAR = 2018;

export const TIER2_LEAGUE_NAME = 'Ridgeline Challenger Series';
export const TIER2_LEAGUE_SHORT = 'RCS';

export const RALLY_POINTS = STANDARD_POINTS.slice(0, 8);
export { POWER_STAGE_POINTS };

export const PROMOTION_RELEGATION = {
  count: 2,
  note: 'The bottom two crews in the Tier 1 standings swap places with the top two in Tier 2 ahead of next season.',
};

export const CREWS = [
  { id: 'r1', team: 'Basslake Motorsport', country: 'fi', driver: 'Aino Koskinen', driverNat: 'fi', coDriver: 'Petra Salonen', coDriverNat: 'fi', colorPrimary: '#0b3c8a', colorSecondary: '#ffffff', pace: 92, strongSurface: 'Gravel', carImageId: 1155 },
  { id: 'r2', team: 'Vantera Rally Team', country: 'es', driver: 'Diego Larraz', driverNat: 'es', coDriver: 'Marc Oliveras', coDriverNat: 'es', colorPrimary: '#b91c1c', colorSecondary: '#111111', pace: 89, strongSurface: 'Tarmac', carImageId: 2659 },
  { id: 'r3', team: 'Nordlicht Racing', country: 'no', driver: 'Henrik Solberg', driverNat: 'no', coDriver: 'Ida Bakke', coDriverNat: 'no', colorPrimary: '#e5e7eb', colorSecondary: '#0891b2', pace: 86, strongSurface: 'Snow', carImageId: 40 },
  { id: 'r4', team: 'Terracota Motorsport', country: 'pt', driver: 'Rui Cabral', driverNat: 'pt', coDriver: 'Joana Melo', coDriverNat: 'pt', colorPrimary: '#c2542d', colorSecondary: '#f5e6d3', pace: 82, strongSurface: 'Tarmac', carImageId: 1157 },
  { id: 'r5', team: 'Highveld Racing', country: 'za', driver: 'Kagiso Nkosi', driverNat: 'za', coDriver: 'Werner Botha', coDriverNat: 'za', colorPrimary: '#b8860b', colorSecondary: '#14532d', pace: 78, strongSurface: 'Gravel', carImageId: 1148 },
  { id: 'r6', team: 'Falconhurst Rally Team', country: 'ie', driver: 'Cian Whelan', driverNat: 'ie', coDriver: 'Roisin Fahey', coDriverNat: 'ie', colorPrimary: '#0f9960', colorSecondary: '#ffffff', pace: 74, strongSurface: 'Tarmac', carImageId: 1301 },
  { id: 'r7', team: 'Stonefield Motorsport', country: 'nz', driver: 'Reuben Clarke', driverNat: 'nz', coDriver: 'Isla Grant', coDriverNat: 'nz', colorPrimary: '#1f2937', colorSecondary: '#9ca3af', pace: 70, strongSurface: 'Gravel', carImageId: 622 },
  { id: 'r8', team: 'Altiplano Racing', country: 'ar', driver: 'Nicolás Ferraro', driverNat: 'ar', coDriver: 'Valentina Suárez', coDriverNat: 'ar', colorPrimary: '#75aadb', colorSecondary: '#ffffff', pace: 66, strongSurface: 'Gravel', carImageId: 1052 },
];

export const TIER2_CREWS = [
  { id: 'c1', team: 'Windrow Motorsport', country: 'pl', driver: 'Marek Woźniak', driverNat: 'pl', coDriver: 'Ania Kowalska', coDriverNat: 'pl', colorPrimary: '#dc2626', colorSecondary: '#ffffff', pace: 58, strongSurface: 'Gravel', carImageId: 755 },
  { id: 'c2', team: 'Redstone Rally Team', country: 'us', driver: 'Colton Reyes', driverNat: 'us', coDriver: 'Briana Voss', coDriverNat: 'us', colorPrimary: '#9a3412', colorSecondary: '#1a1a1a', pace: 54, strongSurface: 'Tarmac', carImageId: 306 },
  { id: 'c3', team: 'Glacier Point Racing', country: 'ca', driver: 'Étienne Roy', driverNat: 'ca', coDriver: 'Maëlle Fortin', coDriverNat: 'ca', colorPrimary: '#0e7490', colorSecondary: '#e5e7eb', pace: 50, strongSurface: 'Snow', carImageId: 2663 },
  { id: 'c4', team: 'Amber Trail Motorsport', country: 'in', driver: 'Arjun Malhotra', driverNat: 'in', coDriver: 'Simran Kaur', coDriverNat: 'in', colorPrimary: '#b45309', colorSecondary: '#fef3c7', pace: 46, strongSurface: 'Gravel', carImageId: 1090 },
  { id: 'c5', team: 'Lowland Rally Team', country: 'ke', driver: 'Brian Kiptoo', driverNat: 'ke', coDriver: 'Faith Chebet', coDriverNat: 'ke', colorPrimary: '#166534', colorSecondary: '#ffffff', pace: 42, strongSurface: 'Gravel', carImageId: 926 },
  { id: 'c6', team: 'Northbridge Motorsport', country: 'au', driver: 'Lachlan Doyle', driverNat: 'au', coDriver: 'Ruby Fenn', coDriverNat: 'au', colorPrimary: '#1e293b', colorSecondary: '#94a3b8', pace: 38, strongSurface: 'Tarmac', carImageId: 2370 },
];

export const RALLIES = [
  { round: 1, name: 'Arctic Circle Rally', country: 'fi', surface: 'Snow', stages: 20, date: 'Jan 18' },
  { round: 2, name: 'Rally Sierra Nevada', country: 'es', surface: 'Tarmac', stages: 18, date: 'Feb 22' },
  { round: 3, name: 'Highland Gravel Rally', country: 'gb', surface: 'Gravel', stages: 16, date: 'Apr 3' },
  { round: 4, name: 'Rally do Minho', country: 'pt', surface: 'Tarmac', stages: 17, date: 'May 8' },
  { round: 5, name: 'Savanna Rally', country: 'za', surface: 'Gravel', stages: 19, date: 'Jun 19' },
  { round: 6, name: 'Emerald Isle Rally', country: 'ie', surface: 'Tarmac', stages: 15, date: 'Jul 24' },
  { round: 7, name: 'Southern Alps Rally', country: 'nz', surface: 'Gravel', stages: 18, date: 'Sep 11' },
  { round: 8, name: 'Patagonia Rally', country: 'ar', surface: 'Gravel', stages: 21, date: 'Nov 6' },
];

export const SURFACE_COLOR = { Gravel: '#c2542d', Tarmac: '#6b7280', Snow: '#38bdf8' };

export const crewById = Object.fromEntries(CREWS.map(c => [c.id, c]));
export const tier2CrewById = Object.fromEntries(TIER2_CREWS.map(c => [c.id, c]));

// --- Deterministic season simulation -----------------------------------

function surfaceBonus(crew, surface) {
  return crew.strongSurface === surface ? 6 : 0;
}

function runStage(crews, rally, rng, weight) {
  return crews
    .map(c => ({ crewId: c.id, perf: c.pace * weight + surfaceBonus(c, rally.surface) + gaussian(rng, weight === 0.8 ? 8 : 10) }))
    .sort((a, b) => b.perf - a.perf)
    .map(r => r.crewId);
}

function simulateSeason(crews, seed) {
  const rng = mulberry32(seed);
  const crewPoints = Object.fromEntries(crews.map(c => [c.id, 0]));
  const crewWins = Object.fromEntries(crews.map(c => [c.id, 0]));
  const powerStageWins = Object.fromEntries(crews.map(c => [c.id, 0]));

  const rallies = RALLIES.map(rally => {
    const result = { ...rally, overallPoints: {}, powerStagePoints: {} };

    const overallOrder = runStage(crews, rally, rng, 0.8);
    result.overallOrder = overallOrder;
    overallOrder.slice(0, RALLY_POINTS.length).forEach((crewId, i) => {
      const pts = RALLY_POINTS[i];
      crewPoints[crewId] += pts;
      result.overallPoints[crewId] = pts;
    });
    crewWins[overallOrder[0]] += 1;

    const powerStageOrder = runStage(crews, rally, rng, 0.6);
    result.powerStageOrder = powerStageOrder;
    powerStageOrder.slice(0, POWER_STAGE_POINTS.length).forEach((crewId, i) => {
      const pts = POWER_STAGE_POINTS[i];
      crewPoints[crewId] += pts;
      result.powerStagePoints[crewId] = pts;
    });
    powerStageWins[powerStageOrder[0]] += 1;

    result.standingsAfter = crews
      .map(c => ({ id: c.id, points: crewPoints[c.id], wins: crewWins[c.id], powerStageWins: powerStageWins[c.id] }))
      .sort((a, b) => b.points - a.points || b.wins - a.wins);

    return result;
  });

  return { rallies, finalStandings: rallies[rallies.length - 1].standingsAfter };
}

export const SEASON = simulateSeason(CREWS, 135791);
export const TIER2_SEASON = simulateSeason(TIER2_CREWS, 975318);

export const TIERS = {
  tier1: { id: 'tier1', label: 'Tier 1', leagueName: LEAGUE_NAME, leagueShort: LEAGUE_SHORT, crews: CREWS, crewById, season: SEASON },
  tier2: { id: 'tier2', label: 'Tier 2', leagueName: TIER2_LEAGUE_NAME, leagueShort: TIER2_LEAGUE_SHORT, crews: TIER2_CREWS, crewById: tier2CrewById, season: TIER2_SEASON },
};
