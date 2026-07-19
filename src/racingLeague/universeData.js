// Registry for the fictional motorsport universe. Each entry here is a
// separate championship with its own format, data, and tab set — Solaris GP
// is just one of them. Add a new league by adding a folder (data.js + tabs/
// + a shell wrapper) and registering it here.

export const GOVERNING_BODY = {
  name: 'The Apex Federation',
  short: 'TAF',
  founded: 2016,
  blurb: "The Apex Federation sanctions every championship in this universe — setting the technical rules, the calendar windows, and the points frameworks each league adapts to its own format.",
};

export const LEAGUES = [
  {
    id: 'solaris',
    name: 'Solaris Grand Prix Championship',
    short: 'SGP',
    discipline: 'Open-wheel Grand Prix racing',
    tagline: "Ten constructors, twenty drivers, one championship — built on today's F1 structure.",
    accent: ['#f97316', '#eda100'],
    founded: 2024,
  },
  {
    id: 'horizon',
    name: 'Horizon Endurance Championship',
    short: 'HEC',
    discipline: 'Multi-class endurance racing',
    tagline: 'Two classes, three-driver squads, and races that run through the night.',
    accent: ['#0891b2', '#22d3ee'],
    founded: 2021,
  },
  {
    id: 'ridgeline',
    name: 'Ridgeline Rally Championship',
    short: 'RRC',
    discipline: 'Stage rally',
    tagline: 'Gravel, tarmac, and snow — one crew, one stopwatch, one road.',
    accent: ['#7c3aed', '#c084fc'],
    founded: 2018,
  },
];

export const leagueById = Object.fromEntries(LEAGUES.map(l => [l.id, l]));

// Cross-league events pull qualified drivers out of the leagues above —
// see shared/qualification.js. Kept as a separate registry since they're
// not standalone championships with their own grid.
export const CROSS_LEAGUE_EVENTS = [
  {
    id: 'championsLeague',
    name: 'Apex Champions League',
    short: 'ACL',
    discipline: 'Cross-league knockout exhibition',
    tagline: 'The best of all three leagues, in identical cars, single elimination.',
    accent: ['#eab308', '#a16207'],
    founded: 2028,
  },
  {
    id: 'worldCup',
    name: 'Apex World Cup',
    short: 'AWC',
    discipline: 'Cross-league nations cup',
    tagline: 'Drivers set aside their teams and race for their flag.',
    accent: ['#059669', '#34d399'],
    founded: 2029,
  },
];

export const crossLeagueById = Object.fromEntries(CROSS_LEAGUE_EVENTS.map(e => [e.id, e]));
