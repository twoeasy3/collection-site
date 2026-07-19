import { useState } from 'react';
import { RESULT } from '../data';
import BarChart from '../../shared/BarChart';
import { carImageUrl } from '../../shared/carImages';

function StandingsTab() {
  const [view, setView] = useState('nations');
  const isNations = view === 'nations';

  const nationsItems = RESULT.nationsStandings.slice(0, 8).map(row => ({
    id: row.country,
    label: row.country.toUpperCase(),
    value: row.points,
  }));
  const driverItems = RESULT.goldenDriverStandings.slice(0, 8).map(row => ({
    id: row.id,
    label: row.name,
    value: row.points,
  }));

  return (
    <div>
      <p className="rl-lede">Final standings after all four rounds.</p>

      <div className="rl-toggle-row">
        <button className={`rl-toggle-btn${isNations ? ' active' : ''}`} onClick={() => setView('nations')}>Nations Cup</button>
        <button className={`rl-toggle-btn${!isNations ? ' active' : ''}`} onClick={() => setView('drivers')}>Golden Driver</button>
      </div>

      <BarChart title={isNations ? 'Top 8 — Nations Cup points' : 'Top 8 — Golden Driver points'} items={isNations ? nationsItems : driverItems} />

      {isNations ? (
        <table className="rl-standings-table">
          <thead>
            <tr>
              <th className="rl-num">Pos</th>
              <th>Nation</th>
              <th>Squad</th>
              <th className="rl-num">Points</th>
            </tr>
          </thead>
          <tbody>
            {RESULT.nationsStandings.map((row, i) => (
              <tr key={row.country}>
                <td className="rl-num rl-pos-cell">{i + 1}</td>
                <td><span className={`fi fi-${row.country}`} style={{ marginRight: 6 }} />{row.country.toUpperCase()}</td>
                <td style={{ fontSize: 12.5, color: 'var(--tx-3)' }}>{row.squad.map(d => d.name).join(' / ')}</td>
                <td className="rl-num">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table className="rl-standings-table">
          <thead>
            <tr>
              <th className="rl-num">Pos</th>
              <th>Driver</th>
              <th>League</th>
              <th className="rl-num">Points</th>
            </tr>
          </thead>
          <tbody>
            {RESULT.goldenDriverStandings.map((row, i) => (
              <tr key={row.id}>
                <td className="rl-num rl-pos-cell">{i + 1}</td>
                <td>
                  <img className="rl-thumb" src={carImageUrl(row.carImageId)} alt="" />
                  <span className={`fi fi-${row.nationality}`} style={{ marginRight: 6 }} />
                  {row.name}
                </td>
                <td>{row.sourceShort}</td>
                <td className="rl-num">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default StandingsTab;
