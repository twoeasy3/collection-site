import { useState } from 'react';
import { TIERS, PROMOTION_RELEGATION } from '../data';
import BarChart from '../../shared/BarChart';
import TierSwitch from '../../shared/TierSwitch';
import { carImageUrl } from '../../shared/carImages';

function StandingsTab() {
  const [tierId, setTierId] = useState('tier1');
  const tier = TIERS[tierId];
  const { crewById, season } = tier;
  const standings = season.finalStandings;
  const leaderPoints = standings[0]?.points ?? 0;
  const zoneCount = PROMOTION_RELEGATION.count;

  const chartItems = standings.map(row => ({
    id: row.id,
    label: crewById[row.id].team,
    value: row.points,
  }));

  return (
    <div>
      <p className="rl-lede">{tier.leagueName} standings after Rally {season.rallies.length} of {season.rallies.length} — the season finale.</p>

      <TierSwitch tiers={TIERS} tier={tierId} onChange={setTierId} />

      <BarChart title="Drivers' & Co-Drivers' Championship points" items={chartItems} />

      <p className="rl-lede" style={{ fontSize: 12.5, marginTop: -10 }}>
        {tierId === 'tier1'
          ? `Bottom ${zoneCount}, shaded below, are in the relegation zone.`
          : `Top ${zoneCount}, shaded below, are in the promotion zone.`}
      </p>

      <table className="rl-standings-table">
        <thead>
          <tr>
            <th className="rl-num">Pos</th>
            <th>Crew</th>
            <th>Team</th>
            <th className="rl-num">Wins</th>
            <th className="rl-num">Power stages</th>
            <th className="rl-num">Points</th>
            <th className="rl-num">Gap</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row, i) => {
            const crew = crewById[row.id];
            const inRelegationZone = tierId === 'tier1' && i >= standings.length - zoneCount;
            const inPromotionZone = tierId === 'tier2' && i < zoneCount;
            return (
              <tr key={row.id} className={inRelegationZone ? 'rl-zone-row rl-zone-down' : inPromotionZone ? 'rl-zone-row rl-zone-up' : ''}>
                <td className="rl-num rl-pos-cell">{i + 1}</td>
                <td>
                  <img className="rl-thumb" src={carImageUrl(crew.carImageId)} alt="" />
                  <span className={`fi fi-${crew.driverNat}`} style={{ marginRight: 6 }} />
                  {crew.driver} / {crew.coDriver}
                  {inRelegationZone && <span className="rl-zone-tag rl-zone-tag-down">Relegation</span>}
                  {inPromotionZone && <span className="rl-zone-tag rl-zone-tag-up">Promotion</span>}
                </td>
                <td style={{ fontSize: 12.5, color: 'var(--tx-3)' }}>{crew.team}</td>
                <td className="rl-num">{row.wins}</td>
                <td className="rl-num">{row.powerStageWins}</td>
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
