import { Fragment, useState } from 'react';
import { TIERS } from '../data';

function ResultTable({ order, pointsMap, fastestLapDriver, count, driverById, teamById }) {
  return (
    <table className="rl-result-table">
      <thead>
        <tr>
          <th>Pos</th>
          <th>Driver</th>
          <th>Team</th>
          <th>Points</th>
        </tr>
      </thead>
      <tbody>
        {order.slice(0, count).map((driverId, i) => {
          const driver = driverById[driverId];
          const team = teamById[driver.teamId];
          return (
            <tr key={driverId}>
              <td>{i + 1}</td>
              <td>
                <span className={`fi fi-${driver.nationality}`} style={{ marginRight: 6 }} />
                {driver.name}
                {driverId === fastestLapDriver && <span className="rl-fl-star" title="Fastest lap">● FL</span>}
              </td>
              <td>{team.short}</td>
              <td>{pointsMap[driverId] ?? 0}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function CalendarTab() {
  const [activeRound, setActiveRound] = useState(null);
  const tier1Races = TIERS.tier1.season.races;
  const tier2Races = TIERS.tier2.season.races;

  return (
    <div>
      <p className="rl-lede">
        {tier1Races.length} rounds spanning five continents. {tier1Races.filter(r => r.sprint).length} sprint
        weekends add a short Saturday race ahead of Sunday's Grand Prix. Every round also
        carries a {TIERS.tier2.leagueShort} support race. Click a round to see how it played out.
      </p>

      <div className="rl-calendar">
        {tier1Races.map((race, i) => {
          const tier2Race = tier2Races[i];
          const isActive = activeRound === race.round;
          return (
            <Fragment key={race.round}>
              <button className={`rl-race-row${isActive ? ' active' : ''}`} onClick={() => setActiveRound(isActive ? null : race.round)}>
                <div className="rl-race-row-head">
                  <div className="rl-race-round">RD {race.round}</div>
                  <span className={`fi fi-${race.country}`} />
                  <div className="rl-race-name">{race.name}</div>
                  <div className="rl-race-circuit">{race.circuit} · {race.laps} laps</div>
                  {race.sprint && <span className="rl-sprint-badge">SPRINT</span>}
                  <div className="rl-race-date">{race.date}</div>
                </div>
              </button>
              {isActive && (
                <div className="rl-race-detail">
                  {race.sprint && (
                    <>
                      <div className="rl-leader-kicker" style={{ marginTop: 8 }}>Sprint result (top 8)</div>
                      <ResultTable order={race.sprintOrder} pointsMap={race.sprintPoints} fastestLapDriver={null} count={8} driverById={TIERS.tier1.driverById} teamById={TIERS.tier1.teamById} />
                    </>
                  )}
                  <div className="rl-leader-kicker" style={{ marginTop: 12 }}>{TIERS.tier1.leagueShort} Grand Prix result (top 10)</div>
                  <ResultTable order={race.raceOrder} pointsMap={race.racePoints} fastestLapDriver={race.fastestLapDriver} count={10} driverById={TIERS.tier1.driverById} teamById={TIERS.tier1.teamById} />

                  <div className="rl-leader-kicker" style={{ marginTop: 12 }}>{TIERS.tier2.leagueShort} support race result (top 10)</div>
                  <ResultTable order={tier2Race.raceOrder} pointsMap={tier2Race.racePoints} fastestLapDriver={tier2Race.fastestLapDriver} count={10} driverById={TIERS.tier2.driverById} teamById={TIERS.tier2.teamById} />
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default CalendarTab;
