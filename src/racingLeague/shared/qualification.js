// Pulls individual "representative" drivers out of each league's previous
// (i.e. current, since we only simulate one season) Tier 1 final standings,
// normalized to a common shape so cross-league events — the Champions
// League and the World Cup — can seed a mixed-discipline field from them.

import * as solaris from '../solaris/data';
import * as horizon from '../horizon/data';
import * as ridgeline from '../ridgeline/data';

function solarisQualifiers(count) {
  return solaris.SEASON.finalDriverStandings.slice(0, count).map((row, i) => {
    const driver = solaris.driverById[row.id];
    const team = solaris.teamById[driver.teamId];
    return {
      id: `solaris-${driver.id}`,
      name: driver.name,
      nationality: driver.nationality,
      sourceLeague: solaris.LEAGUE_NAME,
      sourceShort: solaris.LEAGUE_SHORT,
      teamName: team.name,
      teamColor: team.colorPrimary,
      carImageId: team.carImageId,
      rating: driver.skill,
      leaguePoints: row.points,
      leagueRank: i + 1,
    };
  });
}

function horizonQualifiers(count) {
  return Object.entries(horizon.SEASON.finalDriverPoints)
    .map(([id, points]) => ({ id, points }))
    .sort((a, b) => b.points - a.points)
    .slice(0, count)
    .map((row, i) => {
      const driver = horizon.driverById[row.id];
      const team = horizon.teamById[driver.teamId];
      return {
        id: `horizon-${driver.id}`,
        name: driver.name,
        nationality: driver.nationality,
        sourceLeague: horizon.LEAGUE_NAME,
        sourceShort: horizon.LEAGUE_SHORT,
        teamName: team.name,
        teamColor: team.colorPrimary,
        carImageId: team.carImageId,
        rating: driver.skill,
        leaguePoints: row.points,
        leagueRank: i + 1,
      };
    });
}

function ridgelineQualifiers(count) {
  return ridgeline.SEASON.finalStandings.slice(0, count).map((row, i) => {
    const crew = ridgeline.crewById[row.id];
    return {
      id: `ridgeline-${crew.id}`,
      name: crew.driver,
      nationality: crew.driverNat,
      sourceLeague: ridgeline.LEAGUE_NAME,
      sourceShort: ridgeline.LEAGUE_SHORT,
      teamName: crew.team,
      teamColor: crew.colorPrimary,
      carImageId: crew.carImageId,
      rating: crew.pace,
      leaguePoints: row.points,
      leagueRank: i + 1,
    };
  });
}

// counts: number (same for every league) or { solaris, horizon, ridgeline }
export function getQualifiers(counts) {
  const c = typeof counts === 'number' ? { solaris: counts, horizon: counts, ridgeline: counts } : counts;
  return [
    ...solarisQualifiers(c.solaris),
    ...horizonQualifiers(c.horizon),
    ...ridgelineQualifiers(c.ridgeline),
  ];
}
