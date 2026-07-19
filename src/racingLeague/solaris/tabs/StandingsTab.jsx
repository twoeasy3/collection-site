import { useState } from 'react';
import { TIERS, PROMOTION_RELEGATION } from '../data';
import BarChart from '../../shared/BarChart';
import TierSwitch from '../../shared/TierSwitch';
import { carImageUrl } from '../../shared/carImages';

function StandingsTab() {
  const [tierId, setTierId] = useState('tier1');
  const [view, setView] = useState('drivers');
  const isDrivers = view === 'drivers';
  const tier = TIERS[tierId];
  const { teamById, driverById, season } = tier;

  const standings = isDrivers ? season.finalDriverStandings : season.finalTeamStandings;
  const leaderPoints = standings[0]?.points ?? 0;
  const zoneCount = PROMOTION_RELEGATION.count;

  const chartItems = standings.slice(0, 8).map(row => ({
    id: row.id,
    label: isDrivers ? driverById[row.id].name : teamById[row.id].name,
    value: row.points,
  }));

  return (
    <div>
      <p className="rl-lede">
        {tier.leagueName} standings after Round {season.races.length} of {season.races.length} — the final round of the season.
      </p>

      <TierSwitch tiers={TIERS} tier={tierId} onChange={setTierId} />

      <div className="rl-toggle-row">
        <button className={`rl-toggle-btn${isDrivers ? ' active' : ''}`} onClick={() => setView('drivers')}>Drivers</button>
        <button className={`rl-toggle-btn${!isDrivers ? ' active' : ''}`} onClick={() => setView('constructors')}>Constructors</button>
      </div>

      <BarChart title={isDrivers ? "Top 8 — Drivers' Championship points" : "Top 8 — Constructors' Championship points"} items={chartItems} />

      {!isDrivers && (
        <p className="rl-lede" style={{ fontSize: 12.5, marginTop: -10 }}>
          {tierId === 'tier1'
            ? `Bottom ${zoneCount}, shaded below, are in the relegation zone.`
            : `Top ${zoneCount}, shaded below, are in the promotion zone.`}
        </p>
      )}

      <table className="rl-standings-table">
        <thead>
          <tr>
            <th className="rl-num">Pos</th>
            <th>{isDrivers ? 'Driver' : 'Constructor'}</th>
            {isDrivers && <th>Team</th>}
            <th className="rl-num">Wins</th>
            <th className="rl-num">Points</th>
            <th className="rl-num">Gap</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row, i) => {
            const driver = isDrivers ? driverById[row.id] : null;
            const team = isDrivers ? teamById[driver.teamId] : teamById[row.id];
            const inRelegationZone = !isDrivers && tierId === 'tier1' && i >= standings.length - zoneCount;
            const inPromotionZone = !isDrivers && tierId === 'tier2' && i < zoneCount;
            return (
              <tr key={row.id} className={inRelegationZone ? 'rl-zone-row rl-zone-down' : inPromotionZone ? 'rl-zone-row rl-zone-up' : ''}>
                <td className="rl-num rl-pos-cell">{i + 1}</td>
                <td>
                  <img className="rl-thumb" src={carImageUrl(team.carImageId)} alt="" />
                  {isDrivers && <span className={`fi fi-${driver.nationality}`} style={{ marginRight: 6 }} />}
                  {isDrivers ? driver.name : team.name}
                  {inRelegationZone && <span className="rl-zone-tag rl-zone-tag-down">Relegation</span>}
                  {inPromotionZone && <span className="rl-zone-tag rl-zone-tag-up">Promotion</span>}
                </td>
                {isDrivers && <td>{team.short}</td>}
                <td className="rl-num">{row.wins}</td>
                <td className="rl-num">{row.points}</td>
                <td className="rl-num">{i === 0 ? '—' : `-${leaderPoints - row.points}`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default StandingsTab;
