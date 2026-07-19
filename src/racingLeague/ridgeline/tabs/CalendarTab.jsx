import { Fragment, useState } from 'react';
import { TIERS, SURFACE_COLOR } from '../data';

function ResultTable({ order, pointsMap, count, crewById }) {
  return (
    <table className="rl-result-table">
      <thead>
        <tr>
          <th>Pos</th>
          <th>Crew</th>
          <th>Team</th>
          <th>Points</th>
        </tr>
      </thead>
      <tbody>
        {order.slice(0, count).map((crewId, i) => {
          const crew = crewById[crewId];
          return (
            <tr key={crewId}>
              <td>{i + 1}</td>
              <td>
                <span className={`fi fi-${crew.driverNat}`} style={{ marginRight: 6 }} />
                {crew.driver} / {crew.coDriver}
              </td>
              <td>{crew.team}</td>
              <td>{pointsMap[crewId] ?? 0}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function CalendarTab() {
  const [activeRound, setActiveRound] = useState(null);
  const tier1Rallies = TIERS.tier1.season.rallies;
  const tier2Rallies = TIERS.tier2.season.rallies;

  return (
    <div>
      <p className="rl-lede">
        {tier1Rallies.length} rallies across three surfaces. {TIERS.tier2.leagueShort} runs
        the same events on a shorter running order. Click a round to see the overall result
        and the Power Stage.
      </p>

      <div className="rl-calendar">
        {tier1Rallies.map((rally, i) => {
          const tier2Rally = tier2Rallies[i];
          const isActive = activeRound === rally.round;
          return (
            <Fragment key={rally.round}>
              <button className={`rl-race-row${isActive ? ' active' : ''}`} onClick={() => setActiveRound(isActive ? null : rally.round)}>
                <div className="rl-race-row-head">
                  <div className="rl-race-round">RD {rally.round}</div>
                  <span className={`fi fi-${rally.country}`} />
                  <div className="rl-race-name">{rally.name}</div>
                  <div className="rl-race-circuit">{rally.stages} stages</div>
                  <span className="rl-sprint-badge" style={{ color: SURFACE_COLOR[rally.surface], borderColor: SURFACE_COLOR[rally.surface] }}>{rally.surface.toUpperCase()}</span>
                  <div className="rl-race-date">{rally.date}</div>
                </div>
              </button>
              {isActive && (
                <div className="rl-race-detail">
                  <div className="rl-leader-kicker" style={{ marginTop: 8 }}>{TIERS.tier1.leagueShort} overall result (top 8)</div>
                  <ResultTable order={rally.overallOrder} pointsMap={rally.overallPoints} count={8} crewById={TIERS.tier1.crewById} />
                  <div className="rl-leader-kicker" style={{ marginTop: 12 }}>{TIERS.tier1.leagueShort} Power Stage (top 5)</div>
                  <ResultTable order={rally.powerStageOrder} pointsMap={rally.powerStagePoints} count={5} crewById={TIERS.tier1.crewById} />

                  <div className="rl-leader-kicker" style={{ marginTop: 16 }}>{TIERS.tier2.leagueShort} overall result (top 6)</div>
                  <ResultTable order={tier2Rally.overallOrder} pointsMap={tier2Rally.overallPoints} count={6} crewById={TIERS.tier2.crewById} />
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
