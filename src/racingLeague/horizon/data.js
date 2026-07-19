// Horizon Endurance Championship — multi-class endurance racing.
// Two classes (Prototype, GT), one car per team, a three-driver squad per
// car. All three drivers of a finishing car are credited the car's full
// points, mirroring how real-world endurance championships score drivers.
//
// Tier 2 (Horizon Challenge Series) runs the same calendar and the same two
// classes with a smaller grid. The last-place team in each Tier 1 class
// swaps with the class-leading Tier 2 team each season.

import { STANDARD_POINTS, mulberry32, gaussian } from '../shared/pointsSystem';

export const LEAGUE_NAME = 'Horizon Endurance Championship';
export const LEAGUE_SHORT = 'HEC';
export const SEASON_LABEL = 'Season XI · 2031';
export const FOUNDED_YEAR = 2021;

export const TIER2_LEAGUE_NAME = 'Horizon Challenge Series';
export const TIER2_LEAGUE_SHORT = 'HCS';

export const CLASSES = ['Prototype', 'GT'];
export const RACE_POINTS = STANDARD_POINTS;

const driverCategory = (skill) => (skill >= 88 ? 'Platinum' : skill >= 78 ? 'Gold' : skill >= 68 ? 'Silver' : 'Bronze');
export { driverCategory };

export const PROMOTION_RELEGATION = {
  countPerClass: 1,
  note: 'The last-place team in each Tier 1 class swaps places with the class-leading Tier 2 team ahead of next season.',
};

export const TEAMS = [
  { id: 'h1', name: 'Castellan Motorsport', short: 'CAS', country: 'it', principal: 'Elena Castellan', colorPrimary: '#7a0c1e', colorSecondary: '#d4af37', class: 'Prototype', car: 7, pace: 91, carImageId: 225 },
  { id: 'h2', name: 'Nordkap Racing', short: 'NOR', country: 'no', principal: 'Sigrid Aas', colorPrimary: '#8ecae6', colorSecondary: '#03045e', class: 'Prototype', car: 8, pace: 88, carImageId: 1319 },
  { id: 'h3', name: 'Meridian Dynamics', short: 'MER', country: 'gb', principal: 'Oscar Fenwick', colorPrimary: '#111111', colorSecondary: '#a3e635', class: 'Prototype', car: 63, pace: 85, carImageId: 1624 },
  { id: 'h4', name: 'Tanager Prototypes', short: 'TAN', country: 'jp', principal: 'Sora Ikeda', colorPrimary: '#eef2f3', colorSecondary: '#b91c1c', class: 'Prototype', car: 92, pace: 80, carImageId: 941 },
  { id: 'h5', name: 'Whitlock Racing', short: 'WHI', country: 'us', principal: 'Grant Whitlock Sr.', colorPrimary: '#14532d', colorSecondary: '#eab308', class: 'GT', car: 23, pace: 76, carImageId: 143 },
  { id: 'h6', name: 'Basalt Motorsport', short: 'BAS', country: 'is', principal: 'Birgir Thorvaldsen', colorPrimary: '#1c1c1c', colorSecondary: '#f97316', class: 'GT', car: 44, pace: 74, carImageId: 712 },
  { id: 'h7', name: 'Sabre Racing', short: 'SAB', country: 'fr', principal: 'Camille Aubert', colorPrimary: '#1e3a8a', colorSecondary: '#ffffff', class: 'GT', car: 71, pace: 71, carImageId: 596 },
  { id: 'h8', name: 'Coral Coast Racing', short: 'CCR', country: 'au', principal: 'Nathan Boyce', colorPrimary: '#0d9488', colorSecondary: '#ffffff', class: 'GT', car: 86, pace: 68, carImageId: 2452 },
];

export const DRIVERS = [
  { id: 'hd1', name: 'Alessio Ferrante', nationality: 'it', teamId: 'h1', age: 33, skill: 90 },
  { id: 'hd2', name: 'Bastian Kroll', nationality: 'de', teamId: 'h1', age: 29, skill: 87 },
  { id: 'hd3', name: 'Owen Pryce', nationality: 'gb', teamId: 'h1', age: 24, skill: 82 },

  { id: 'hd4', name: 'Sofie Haugen', nationality: 'no', teamId: 'h2', age: 30, skill: 88 },
  { id: 'hd5', name: 'Lukas Voss', nationality: 'de', teamId: 'h2', age: 27, skill: 84 },
  { id: 'hd6', name: 'Mateus Bianchi', nationality: 'br', teamId: 'h2', age: 23, skill: 79 },

  { id: 'hd7', name: 'Archie Lowell', nationality: 'gb', teamId: 'h3', age: 31, skill: 85 },
  { id: 'hd8', name: 'Priya Chandran', nationality: 'in', teamId: 'h3', age: 26, skill: 81 },
  { id: 'hd9', name: 'Youssef Amrani', nationality: 'ma', teamId: 'h3', age: 22, skill: 76 },

  { id: 'hd10', name: 'Rin Tachibana', nationality: 'jp', teamId: 'h4', age: 28, skill: 80 },
  { id: 'hd11', name: 'Noel Ferreira', nationality: 'pt', teamId: 'h4', age: 25, skill: 75 },
  { id: 'hd12', name: 'Callum Reyes', nationality: 'ph', teamId: 'h4', age: 21, skill: 70 },

  { id: 'hd13', name: 'Grant Whitlock', nationality: 'us', teamId: 'h5', age: 34, skill: 77 },
  { id: 'hd14', name: 'Dani Osei', nationality: 'gh', teamId: 'h5', age: 27, skill: 72 },
  { id: 'hd15', name: 'Marco Tallis', nationality: 'ca', teamId: 'h5', age: 20, skill: 66 },

  { id: 'hd16', name: 'Birta Jónsdóttir', nationality: 'is', teamId: 'h6', age: 29, skill: 74 },
  { id: 'hd17', name: 'Emil Sund', nationality: 'se', teamId: 'h6', age: 25, skill: 70 },
  { id: 'hd18', name: 'Karel Novotny', nationality: 'cz', teamId: 'h6', age: 32, skill: 65 },

  { id: 'hd19', name: 'Élodie Marchand', nationality: 'fr', teamId: 'h7', age: 28, skill: 72 },
  { id: 'hd20', name: 'Hugo Bonnet', nationality: 'fr', teamId: 'h7', age: 24, skill: 68 },
  { id: 'hd21', name: 'Rosalind Kerr', nationality: 'gb', teamId: 'h7', age: 35, skill: 63 },

  { id: 'hd22', name: 'Jack Redmond', nationality: 'au', teamId: 'h8', age: 26, skill: 69 },
  { id: 'hd23', name: 'Mia Sutherland', nationality: 'nz', teamId: 'h8', age: 23, skill: 64 },
  { id: 'hd24', name: 'Levi Amosa', nationality: 'ws', teamId: 'h8', age: 30, skill: 60 },
];

export const TIER2_TEAMS = [
  { id: 'g1', name: 'Brightwater Racing', short: 'BRW', country: 'ca', principal: 'Holly Anand', colorPrimary: '#0369a1', colorSecondary: '#e2e8f0', class: 'Prototype', car: 15, pace: 62, carImageId: 1623 },
  { id: 'g2', name: 'Solmar Motorsport', short: 'SOL', country: 'mx', principal: 'Iván Ochoa', colorPrimary: '#b45309', colorSecondary: '#111111', class: 'Prototype', car: 19, pace: 58, carImageId: 2654 },
  { id: 'g3', name: 'Ashgrove Racing', short: 'ASH', country: 'gb', principal: 'Fiona Pearce', colorPrimary: '#3f6212', colorSecondary: '#fef9c3', class: 'GT', car: 27, pace: 55, carImageId: 30 },
  { id: 'g4', name: 'Talon Bay Motorsport', short: 'TBM', country: 'nz', principal: 'Miriama Ropata', colorPrimary: '#155e75', colorSecondary: '#ffffff', class: 'GT', car: 31, pace: 50, carImageId: 7 },
];

export const TIER2_DRIVERS = [
  { id: 'g1d1', name: 'Connor Hale', nationality: 'ca', teamId: 'g1', age: 26, skill: 63 },
  { id: 'g1d2', name: 'Tobias Reinholt', nationality: 'de', teamId: 'g1', age: 24, skill: 60 },
  { id: 'g1d3', name: 'Yuki Sasaki', nationality: 'jp', teamId: 'g1', age: 21, skill: 56 },

  { id: 'g2d1', name: 'Paloma Vidal', nationality: 'mx', teamId: 'g2', age: 27, skill: 59 },
  { id: 'g2d2', name: 'Iker Doval', nationality: 'es', teamId: 'g2', age: 25, skill: 55 },
  { id: 'g2d3', name: 'Grace Muthoni', nationality: 'ke', teamId: 'g2', age: 22, skill: 50 },

  { id: 'g3d1', name: 'Freddie Combe', nationality: 'gb', teamId: 'g3', age: 29, skill: 56 },
  { id: 'g3d2', name: 'Nadia Farouk', nationality: 'eg', teamId: 'g3', age: 24, skill: 52 },
  { id: 'g3d3', name: 'Jesper Lund', nationality: 'dk', teamId: 'g3', age: 20, skill: 47 },

  { id: 'g4d1', name: 'Kane Hita', nationality: 'nz', teamId: 'g4', age: 28, skill: 51 },
  { id: 'g4d2', name: 'Ana Beatriz Souza', nationality: 'br', teamId: 'g4', age: 23, skill: 46 },
  { id: 'g4d3', name: 'Ola Eriksen', nationality: 'no', teamId: 'g4', age: 19, skill: 42 },
];

export const RACES = [
  { round: 1, name: 'Cortez 4 Hours', country: 'us', circuit: 'Cortez Raceway', hours: 4, date: 'Jan 25' },
  { round: 2, name: 'Serra Alta 6 Hours', country: 'pt', circuit: 'Serra Alta Circuit', hours: 6, date: 'Mar 15' },
  { round: 3, name: 'Lago Maggiore 6 Hours', country: 'it', circuit: 'Lago Maggiore Circuit', hours: 6, date: 'Apr 20' },
  { round: 4, name: 'Ardennes 6 Hours', country: 'be', circuit: 'Ardennes Circuit', hours: 6, date: 'May 10' },
  { round: 5, name: 'Sarthe Valley 24 Hours', country: 'fr', circuit: 'Sarthe Valley Circuit', hours: 24, date: 'Jun 14' },
  { round: 6, name: 'Kurotaki 6 Hours', country: 'jp', circuit: 'Kurotaki Circuit', hours: 6, date: 'Aug 2' },
  { round: 7, name: 'Serra Negra 6 Hours', country: 'br', circuit: 'Serra Negra Circuit', hours: 6, date: 'Sep 6' },
  { round: 8, name: 'Ras Sakhir 8 Hours', country: 'bh', circuit: 'Ras Sakhir Circuit', hours: 8, date: 'Nov 8' },
];

function buildIndexes(teams, drivers) {
  const teamById = Object.fromEntries(teams.map(t => [t.id, t]));
  const driverById = Object.fromEntries(drivers.map(d => [d.id, d]));
  const driversByTeam = teams.reduce((acc, t) => {
    acc[t.id] = drivers.filter(d => d.teamId === t.id);
    return acc;
  }, {});
  const teamsByClass = CLASSES.reduce((acc, c) => {
    acc[c] = teams.filter(t => t.class === c);
    return acc;
  }, {});
  return { teamById, driverById, driversByTeam, teamsByClass };
}

export const { teamById, driverById, driversByTeam, teamsByClass } = buildIndexes(TEAMS, DRIVERS);
export const { teamById: tier2TeamById, driverById: tier2DriverById, driversByTeam: tier2DriversByTeam, teamsByClass: tier2TeamsByClass } = buildIndexes(TIER2_TEAMS, TIER2_DRIVERS);

// --- Deterministic season simulation -----------------------------------

function avgSkill(teamId, driversByTeam) {
  const drivers = driversByTeam[teamId];
  return drivers.reduce((sum, d) => sum + d.skill, 0) / drivers.length;
}

function runClassOrder(teams, driversByTeam, rng) {
  return teams
    .map(t => ({ teamId: t.id, perf: t.pace * 0.7 + avgSkill(t.id, driversByTeam) * 0.3 + gaussian(rng, 6) }))
    .sort((a, b) => b.perf - a.perf)
    .map(r => r.teamId);
}

function simulateSeason(teams, drivers, indexes, seed) {
  const { driversByTeam, teamsByClass } = indexes;
  const rng = mulberry32(seed);
  const teamPoints = Object.fromEntries(teams.map(t => [t.id, 0]));
  const teamWins = Object.fromEntries(teams.map(t => [t.id, 0]));
  const driverPoints = Object.fromEntries(drivers.map(d => [d.id, 0]));

  const races = RACES.map(race => {
    const result = { ...race, classOrders: {}, classPoints: {} };

    CLASSES.forEach(cls => {
      const order = runClassOrder(teamsByClass[cls], driversByTeam, rng);
      result.classOrders[cls] = order;
      result.classPoints[cls] = {};
      order.slice(0, RACE_POINTS.length).forEach((teamId, i) => {
        const pts = RACE_POINTS[i];
        teamPoints[teamId] += pts;
        result.classPoints[cls][teamId] = pts;
        driversByTeam[teamId].forEach(d => { driverPoints[d.id] += pts; });
      });
      teamWins[order[0]] += 1;
    });

    result.standingsAfter = {};
    CLASSES.forEach(cls => {
      result.standingsAfter[cls] = teamsByClass[cls]
        .map(t => ({ id: t.id, points: teamPoints[t.id], wins: teamWins[t.id] }))
        .sort((a, b) => b.points - a.points || b.wins - a.wins);
    });

    return result;
  });

  const finalStandings = races[races.length - 1].standingsAfter;
  return { races, finalStandings, finalDriverPoints: driverPoints };
}

export const SEASON = simulateSeason(TEAMS, DRIVERS, { driversByTeam, teamsByClass }, 97531);
export const TIER2_SEASON = simulateSeason(TIER2_TEAMS, TIER2_DRIVERS, { driversByTeam: tier2DriversByTeam, teamsByClass: tier2TeamsByClass }, 246810);

export const TIERS = {
  tier1: { id: 'tier1', label: 'Tier 1', leagueName: LEAGUE_NAME, leagueShort: LEAGUE_SHORT, teams: TEAMS, drivers: DRIVERS, teamById, driverById, driversByTeam, teamsByClass, season: SEASON },
  tier2: { id: 'tier2', label: 'Tier 2', leagueName: TIER2_LEAGUE_NAME, leagueShort: TIER2_LEAGUE_SHORT, teams: TIER2_TEAMS, drivers: TIER2_DRIVERS, teamById: tier2TeamById, driverById: tier2DriverById, driversByTeam: tier2DriversByTeam, teamsByClass: tier2TeamsByClass, season: TIER2_SEASON },
};
