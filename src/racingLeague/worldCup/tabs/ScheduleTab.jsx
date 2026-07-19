import { useState } from 'react';
import { Fragment } from 'react';
import { RESULT, QUALIFIERS } from '../data';

const qualifierById = Object.fromEntries(QUALIFIERS.map(q => [q.id, q]));

function ScheduleTab() {
  const [activeRound, setActiveRound] = useState(null);

  return (
    <div>
      <p className="rl-lede">Click a round to see how each driver placed and how many points they scored for their nation.</p>

      <div className="rl-calendar">
        {RESULT.rounds.map((round, i) => {
          const isActive = activeRound === round.id;
          return (
            <Fragment key={round.id}>
              <button className={`rl-race-row${isActive ? ' active' : ''}`} onClick={() => setActiveRound(isActive ? null : round.id)}>
                <div className="rl-race-row-head">
                  <div className="rl-race-round">RD {i + 1}</div>
                  <div className="rl-race-name">{round.name}</div>
                  <div className="rl-race-circuit">Inspired by {round.inspiredBy}</div>
                </div>
              </button>
              {isActive && (
                <div className="rl-race-detail">
                  <table className="rl-result-table">
                    <thead>
                      <tr>
                        <th>Pos</th>
                        <th>Driver</th>
                        <th>Nation</th>
                        <th>League</th>
                        <th>Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {round.order.slice(0, 10).map((id, pos) => {
                        const driver = qualifierById[id];
                        return (
                          <tr key={id}>
                            <td>{pos + 1}</td>
                            <td>{driver.name}</td>
                            <td><span className={`fi fi-${driver.nationality}`} /></td>
                            <td>{driver.sourceShort}</td>
                            <td>{round.pointsAwarded[id] ?? 0}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default ScheduleTab;
