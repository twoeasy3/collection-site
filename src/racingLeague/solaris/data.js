// Fictional racing league dataset, modeled on the current F1 structure:
// 10 constructors x 2 drivers, a global calendar with sprint weekends,
// and a race/sprint points system. Season results are simulated once
// (seeded, deterministic) from team pace + driver skill ratings so the
// standings, calendar results, and points totals all stay consistent.
//
// Tier 2 (Solaris Development Series) shares the same calendar and points
// system as Tier 1, run by a separate roster. The bottom of Tier 1 and the
// top of Tier 2 swap places each season — see PROMOTION_RELEGATION.

import { mulberry32, gaussian } from '../shared/pointsSystem';

export const LEAGUE_NAME = 'Solaris Grand Prix Championship';
export const LEAGUE_SHORT = 'SGP';
export const SEASON_LABEL = 'Season VIII · 2031';
export const FOUNDED_YEAR = 2024;

export const TIER2_LEAGUE_NAME = 'Solaris Development Series';
export const TIER2_LEAGUE_SHORT = 'SDS';

export const RACE_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
export const SPRINT_POINTS = [8, 7, 6, 5, 4, 3, 2, 1];
export const FASTEST_LAP_POINT = 1;

export const PROMOTION_RELEGATION = {
  count: 2,
  note: 'The bottom two constructors in the Tier 1 standings swap places with the top two in Tier 2 ahead of next season.',
};

export const TEAMS = [
  { id: 't1', name: 'Solstice Racing', short: 'SOL', country: 'it', principal: 'Carla Moretti', colorPrimary: '#c9a227', colorSecondary: '#101010', pace: 92, carImageId: 2325 },
  { id: 't2', name: 'Vantage GP', short: 'VAN', country: 'gb', principal: 'Edward Hargrove', colorPrimary: '#0b3d2e', colorSecondary: '#c0c0c0', pace: 90, carImageId: 2483 },
  { id: 't3', name: 'Obsidian Racing', short: 'OBS', country: 'at', principal: 'Nina Falkner', colorPrimary: '#0d0d0d', colorSecondary: '#d7263d', pace: 89, carImageId: 2419 },
  { id: 't4', name: 'Kestrel Motorsport', short: 'KES', country: 'fr', principal: 'Antoine Rey', colorPrimary: '#1e3a8a', colorSecondary: '#f97316', pace: 87, carImageId: 2420 },
  { id: 't5', name: 'Northgate Racing', short: 'NOR', country: 'de', principal: 'Wolfgang Ihle', colorPrimary: '#1f2937', colorSecondary: '#9ca3af', pace: 80, carImageId: 2487 },
  { id: 't6', name: 'Aurora Performance', short: 'AUR', country: 'se', principal: 'Freja Lindholm', colorPrimary: '#0891b2', colorSecondary: '#ffffff', pace: 78, carImageId: 2485 },
  { id: 't7', name: 'Ferrocity Racing', short: 'FER', country: 'jp', principal: 'Ren Takahashi', colorPrimary: '#8b8b93', colorSecondary: '#6d28d9', pace: 75, carImageId: 2482 },
  { id: 't8', name: 'Redline Dynamics', short: 'RED', country: 'us', principal: 'Danny Ostrowski', colorPrimary: '#b91c1c', colorSecondary: '#ffffff', pace: 73, carImageId: 2518 },
  { id: 't9', name: 'Comet Racing', short: 'COM', country: 'nl', principal: 'Bram Visser', colorPrimary: '#c9a800', colorSecondary: '#111111', pace: 70, carImageId: 1242 },
  { id: 't10', name: 'Vertex Engineering', short: 'VTX', country: 'es', principal: 'Iker Mendizabal', colorPrimary: '#ea580c', colorSecondary: '#1d4ed8', pace: 65, carImageId: 2484 },
];

export const DRIVERS = [
  { id: 'd1', name: 'Matteo Rovelli', number: 1, nationality: 'it', teamId: 't1', age: 29, skill: 95, note: 'Defending champion' },
  { id: 'd2', name: 'Elin Kastberg', number: 16, nationality: 'se', teamId: 't1', age: 24, skill: 86, note: 'Rising star' },
  { id: 'd3', name: 'Harrison Cole', number: 4, nationality: 'gb', teamId: 't2', age: 31, skill: 93, note: 'Three-time runner-up' },
  { id: 'd4', name: 'Naomi Ferreira', number: 27, nationality: 'br', teamId: 't2', age: 26, skill: 84, note: 'Sprint specialist' },
  { id: 'd5', name: 'Milo Brandt', number: 3, nationality: 'de', teamId: 't3', age: 27, skill: 90, note: 'Qualifying ace' },
  { id: 'd6', name: 'Ruben Alcázar', number: 55, nationality: 'es', teamId: 't3', age: 25, skill: 85, note: 'Wet-weather specialist' },
  { id: 'd7', name: 'Théo Lambert', number: 10, nationality: 'fr', teamId: 't4', age: 28, skill: 88, note: 'Team leader' },
  { id: 'd8', name: 'Kenji Osato', number: 22, nationality: 'jp', teamId: 't4', age: 23, skill: 82, note: 'Rookie of the year candidate' },
  { id: 'd9', name: 'Felix Ahrens', number: 9, nationality: 'de', teamId: 't5', age: 33, skill: 81, note: 'Veteran' },
  { id: 'd10', name: 'Jonas Wibergh', number: 40, nationality: 'dk', teamId: 't5', age: 21, skill: 77, note: 'Junior programme graduate' },
  { id: 'd11', name: 'Sven Lindqvist', number: 7, nationality: 'se', teamId: 't6', age: 30, skill: 80, note: 'Consistency specialist' },
  { id: 'd12', name: 'Isla Mackenzie', number: 44, nationality: 'au', teamId: 't6', age: 22, skill: 76, note: 'First full season' },
  { id: 'd13', name: 'Haruto Kaneda', number: 18, nationality: 'jp', teamId: 't7', age: 26, skill: 79, note: 'Long-time team man' },
  { id: 'd14', name: 'Diego Villaraz', number: 33, nationality: 'mx', teamId: 't7', age: 24, skill: 74, note: 'Home-race hero' },
  { id: 'd15', name: 'Cole Bannister', number: 6, nationality: 'us', teamId: 't8', age: 29, skill: 76, note: 'Fan favourite' },
  { id: 'd16', name: 'Marcus DeLuca', number: 21, nationality: 'us', teamId: 't8', age: 32, skill: 73, note: 'Steady points scorer' },
  { id: 'd17', name: 'Pieter van Dam', number: 12, nationality: 'nl', teamId: 't9', age: 27, skill: 72, note: 'Local hero' },
  { id: 'd18', name: 'Aleksi Niemi', number: 24, nationality: 'fi', teamId: 't9', age: 25, skill: 70, note: 'Overtaking specialist' },
  { id: 'd19', name: 'Iker Salaverri', number: 77, nationality: 'es', teamId: 't10', age: 34, skill: 68, note: 'Most experienced on the grid' },
  { id: 'd20', name: 'Tomás Ribeiro', number: 88, nationality: 'pt', teamId: 't10', age: 20, skill: 66, note: 'Youngest driver on the grid' },
];

export const TIER2_TEAMS = [
  { id: 'u1', name: 'Ferrolite Racing', short: 'FRL', country: 'nl', principal: 'Sanne Kuiper', colorPrimary: '#334155', colorSecondary: '#38bdf8', pace: 60, carImageId: 2397 },
  { id: 'u2', name: 'Cinder Point Motorsport', short: 'CPM', country: 'us', principal: 'Rosa Delgado', colorPrimary: '#c2410c', colorSecondary: '#111111', pace: 58, carImageId: 1241 },
  { id: 'u3', name: 'Halcyon Junior Team', short: 'HAL', country: 'ch', principal: 'Beat Rüegg', colorPrimary: '#f8fafc', colorSecondary: '#1d4ed8', pace: 55, carImageId: 1244 },
  { id: 'u4', name: 'Ironbark Racing', short: 'IRB', country: 'au', principal: 'Georgia Pratt', colorPrimary: '#14532d', colorSecondary: '#1a1a1a', pace: 53, carImageId: 1245 },
  { id: 'u5', name: 'Palisade Motorsport', short: 'PAL', country: 'ca', principal: 'Thomas Girard', colorPrimary: '#991b1b', colorSecondary: '#ffffff', pace: 50, carImageId: 2640 },
  { id: 'u6', name: 'Sablewood Racing', short: 'SBW', country: 'be', principal: 'Margaux Willems', colorPrimary: '#1e293b', colorSecondary: '#d4af37', pace: 47, carImageId: 1931 },
];

export const TIER2_DRIVERS = [
  { id: 'u1d1', name: 'Bram Willems', number: 51, nationality: 'nl', teamId: 'u1', age: 24, skill: 62, note: 'Karting champion turned single-seater prospect' },
  { id: 'u1d2', name: 'Toby Ashworth', number: 61, nationality: 'gb', teamId: 'u1', age: 21, skill: 58, note: 'Second season in the series' },
  { id: 'u2d1', name: 'Dante Ruiz', number: 45, nationality: 'us', teamId: 'u2', age: 23, skill: 60, note: 'Promotion contender' },
  { id: 'u2d2', name: 'Casey Nolan', number: 68, nationality: 'us', teamId: 'u2', age: 22, skill: 55, note: 'Rookie' },
  { id: 'u3d1', name: 'Lena Zimmermann', number: 29, nationality: 'ch', teamId: 'u3', age: 20, skill: 57, note: 'Tier 1 junior programme graduate' },
  { id: 'u3d2', name: 'Oskar Berg', number: 34, nationality: 'se', teamId: 'u3', age: 19, skill: 53, note: 'Youngest driver in the series' },
  { id: 'u4d1', name: 'Flynn Carmody', number: 81, nationality: 'au', teamId: 'u4', age: 25, skill: 55, note: 'Third season in the series' },
  { id: 'u4d2', name: 'Tama Ngata', number: 87, nationality: 'nz', teamId: 'u4', age: 22, skill: 50, note: 'Rookie' },
  { id: 'u5d1', name: 'Émile Tremblay', number: 39, nationality: 'ca', teamId: 'u5', age: 24, skill: 52, note: 'Consistent points scorer' },
  { id: 'u5d2', name: 'Sadie Whitlock', number: 42, nationality: 'us', teamId: 'u5', age: 21, skill: 48, note: 'Rookie' },
  { id: 'u6d1', name: 'Louka Dupont', number: 73, nationality: 'be', teamId: 'u6', age: 23, skill: 49, note: 'Local favourite' },
  { id: 'u6d2', name: "Finn O'Sullivan", number: 96, nationality: 'ie', teamId: 'u6', age: 20, skill: 45, note: 'Rookie' },
];

export const RACES = [
  { round: 1, name: 'Bahrain Grand Prix', country: 'bh', circuit: 'Ras Sakhir Circuit', laps: 57, sprint: false, date: 'Mar 8' },
  { round: 2, name: 'Saudi Arabian Grand Prix', country: 'sa', circuit: 'Al-Balad Street Circuit', laps: 50, sprint: true, date: 'Mar 22' },
  { round: 3, name: 'Australian Grand Prix', country: 'au', circuit: 'Yarra Park Circuit', laps: 58, sprint: false, date: 'Apr 5' },
  { round: 4, name: 'Japanese Grand Prix', country: 'jp', circuit: 'Kurotaki Circuit', laps: 53, sprint: false, date: 'Apr 19' },
  { round: 5, name: 'Chinese Grand Prix', country: 'cn', circuit: 'Jiangwan Circuit', laps: 56, sprint: true, date: 'May 3' },
  { round: 6, name: 'Miami Grand Prix', country: 'us', circuit: 'Biscayne Bay Circuit', laps: 57, sprint: true, date: 'May 17' },
  { round: 7, name: 'Emilia Grand Prix', country: 'it', circuit: 'Santerno Circuit', laps: 63, sprint: false, date: 'May 31' },
  { round: 8, name: 'Monaco Grand Prix', country: 'mc', circuit: 'Monte Carlo Street Circuit', laps: 78, sprint: false, date: 'Jun 14' },
  { round: 9, name: 'Canadian Grand Prix', country: 'ca', circuit: 'Rivière Circuit', laps: 70, sprint: false, date: 'Jun 28' },
  { round: 10, name: 'Spanish Grand Prix', country: 'es', circuit: 'Costa Brava Circuit', laps: 66, sprint: false, date: 'Jul 12' },
  { round: 11, name: 'Austrian Grand Prix', country: 'at', circuit: 'Steiermark Ring', laps: 71, sprint: true, date: 'Jul 26' },
  { round: 12, name: 'British Grand Prix', country: 'gb', circuit: 'Northamptonshire Circuit', laps: 52, sprint: false, date: 'Aug 9' },
  { round: 13, name: 'Belgian Grand Prix', country: 'be', circuit: 'Ardennes Circuit', laps: 44, sprint: true, date: 'Aug 30' },
  { round: 14, name: 'Dutch Grand Prix', country: 'nl', circuit: 'Dune Coast Circuit', laps: 72, sprint: false, date: 'Sep 13' },
  { round: 15, name: 'Italian Grand Prix', country: 'it', circuit: 'Brianza Speedway', laps: 53, sprint: false, date: 'Sep 27' },
  { round: 16, name: 'Abu Dhabi Grand Prix', country: 'ae', circuit: 'Corniche Circuit', laps: 58, sprint: false, date: 'Nov 22' },
];

function buildIndexes(teams, drivers) {
  const teamById = Object.fromEntries(teams.map(t => [t.id, t]));
  const driverById = Object.fromEntries(drivers.map(d => [d.id, d]));
  const driversByTeam = teams.reduce((acc, t) => {
    acc[t.id] = drivers.filter(d => d.teamId === t.id);
    return acc;
  }, {});
  return { teamById, driverById, driversByTeam };
}

export const { teamById, driverById, driversByTeam } = buildIndexes(TEAMS, DRIVERS);
export const { teamById: tier2TeamById, driverById: tier2DriverById, driversByTeam: tier2DriversByTeam } = buildIndexes(TIER2_TEAMS, TIER2_DRIVERS);

// --- Deterministic season simulation -----------------------------------

function performance(driver, team, rng) {
  return team.pace * 0.55 + driver.skill * 0.45 + gaussian(rng, 7);
}

function runSession(drivers, teamById, rng) {
  return drivers
    .map(d => ({ driverId: d.id, perf: performance(d, teamById[d.teamId], rng) }))
    .sort((a, b) => b.perf - a.perf)
    .map(r => r.driverId);
}

function pickFastestLap(top10, rng) {
  const weights = top10.map((_, i) => 11 - i);
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  for (let i = 0; i < top10.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return top10[i];
  }
  return top10[0];
}

function simulateSeason(teams, drivers, indexes, seed) {
  const { teamById, driverById } = indexes;
  const rng = mulberry32(seed);
  const driverPoints = Object.fromEntries(drivers.map(d => [d.id, 0]));
  const teamPoints = Object.fromEntries(teams.map(t => [t.id, 0]));
  const driverWins = Object.fromEntries(drivers.map(d => [d.id, 0]));
  const teamWins = Object.fromEntries(teams.map(t => [t.id, 0]));

  const races = RACES.map(race => {
    const result = { ...race };

    if (race.sprint) {
      const order = runSession(drivers, teamById, rng);
      result.sprintOrder = order;
      result.sprintPoints = {};
      order.slice(0, SPRINT_POINTS.length).forEach((driverId, i) => {
        const pts = SPRINT_POINTS[i];
        driverPoints[driverId] += pts;
        teamPoints[driverById[driverId].teamId] += pts;
        result.sprintPoints[driverId] = pts;
      });
    }

    const raceOrder = runSession(drivers, teamById, rng);
    const top10 = raceOrder.slice(0, RACE_POINTS.length);
    const fastestLapDriver = pickFastestLap(top10, rng);
    result.raceOrder = raceOrder;
    result.fastestLapDriver = fastestLapDriver;
    result.racePoints = {};
    top10.forEach((driverId, i) => {
      let pts = RACE_POINTS[i];
      if (driverId === fastestLapDriver) pts += FASTEST_LAP_POINT;
      driverPoints[driverId] += pts;
      teamPoints[driverById[driverId].teamId] += pts;
      result.racePoints[driverId] = pts;
    });

    driverWins[raceOrder[0]] += 1;
    teamWins[driverById[raceOrder[0]].teamId] += 1;

    result.driverStandingsAfter = Object.entries(driverPoints)
      .map(([id, points]) => ({ id, points, wins: driverWins[id] }))
      .sort((a, b) => b.points - a.points || b.wins - a.wins);
    result.teamStandingsAfter = Object.entries(teamPoints)
      .map(([id, points]) => ({ id, points, wins: teamWins[id] }))
      .sort((a, b) => b.points - a.points || b.wins - a.wins);

    return result;
  });

  return {
    races,
    finalDriverStandings: races[races.length - 1].driverStandingsAfter,
    finalTeamStandings: races[races.length - 1].teamStandingsAfter,
  };
}

export const SEASON = simulateSeason(TEAMS, DRIVERS, { teamById, driverById }, 424242);
export const TIER2_SEASON = simulateSeason(TIER2_TEAMS, TIER2_DRIVERS, { teamById: tier2TeamById, driverById: tier2DriverById }, 864211);

export const TIERS = {
  tier1: { id: 'tier1', label: 'Tier 1', leagueName: LEAGUE_NAME, leagueShort: LEAGUE_SHORT, teams: TEAMS, drivers: DRIVERS, teamById, driverById, driversByTeam, season: SEASON },
  tier2: { id: 'tier2', label: 'Tier 2', leagueName: TIER2_LEAGUE_NAME, leagueShort: TIER2_LEAGUE_SHORT, teams: TIER2_TEAMS, drivers: TIER2_DRIVERS, teamById: tier2TeamById, driverById: tier2DriverById, driversByTeam: tier2DriversByTeam, season: TIER2_SEASON },
};
