import { Fragment, useState } from 'react';
import { TIERS, CLASSES } from '../data';

function ClassResultTable({ order, pointsMap, teamById }) {
  return (
    <table className="rl-result-table">
      <thead>
        <tr>
          <th>Pos</th>
          <th>Car</th>
          <th>Team</th>
          <th>Points</th>
        </tr>
      </thead>
      <tbody>
        {order.map((teamId, i) => {
          const team = teamById[teamId];
          return (
            <tr key={teamId}>
              <td>{i + 1}</td>
              <td>
                <span className={`fi fi-${team.country}`} style={{ marginRight: 6 }} />
                #{team.car}
              </td>
              <td>{team.name}</td>
              <td>{pointsMap[teamId] ?? 0}</td>
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
        {tier1Races.length} rounds across five continents, from a four-hour club-style
        sprint to the season-defining Sarthe Valley 24 Hours. {TIERS.tier2.leagueShort} races
        alongside on the same calendar. Click a round for the class results.
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
                  <div className="rl-race-circuit">{race.circuit}</div>
                  <span className="rl-sprint-badge">{race.hours}H</span>
                  <div className="rl-race-date">{race.date}</div>
                </div>
              </button>
              {isActive && (
                <div className="rl-race-detail">
                  <div className="rl-leader-kicker" style={{ marginTop: 8 }}>{TIERS.tier1.leagueShort}</div>
                  {CLASSES.map(cls => (
                    <div key={cls}>
                      <div className="rl-leader-kicker" style={{ marginTop: 10, opacity: 0.8 }}>{cls} class result</div>
                      <ClassResultTable order={race.classOrders[cls]} pointsMap={race.classPoints[cls]} teamById={TIERS.tier1.teamById} />
                    </div>
                  ))}

                  <div className="rl-leader-kicker" style={{ marginTop: 16 }}>{TIERS.tier2.leagueShort}</div>
                  {CLASSES.map(cls => (
                    <div key={cls}>
                      <div className="rl-leader-kicker" style={{ marginTop: 10, opacity: 0.8 }}>{cls} class result</div>
                      <ClassResultTable order={tier2Race.classOrders[cls]} pointsMap={tier2Race.classPoints[cls]} teamById={TIERS.tier2.teamById} />
                    </div>
                  ))}
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
