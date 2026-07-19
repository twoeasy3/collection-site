import { useState } from 'react';
import { TIERS, CLASSES, PROMOTION_RELEGATION } from '../data';
import BarChart from '../../shared/BarChart';
import TierSwitch from '../../shared/TierSwitch';
import { carImageUrl } from '../../shared/carImages';

function StandingsTab() {
  const [tierId, setTierId] = useState('tier1');
  const [cls, setCls] = useState(CLASSES[0]);
  const tier = TIERS[tierId];
  const { teamById, driversByTeam, season } = tier;
  const standings = season.finalStandings[cls];
  const leaderPoints = standings[0]?.points ?? 0;
  const zoneCount = PROMOTION_RELEGATION.countPerClass;

  const chartItems = standings.map(row => ({
    id: row.id,
    label: teamById[row.id].name,
    value: row.points,
  }));

  return (
    <div>
      <p className="rl-lede">{tier.leagueName} standings after Round {season.races.length} of {season.races.length}, by class.</p>

      <TierSwitch tiers={TIERS} tier={tierId} onChange={setTierId} />

      <div className="rl-toggle-row">
        {CLASSES.map(c => (
          <button key={c} className={`rl-toggle-btn${cls === c ? ' active' : ''}`} onClick={() => setCls(c)}>{c}</button>
        ))}
      </div>

      <BarChart title={`${cls} class — Team points`} items={chartItems} />

      <p className="rl-lede" style={{ fontSize: 12.5, marginTop: -10 }}>
        {tierId === 'tier1'
          ? `Last place, shaded below, is in the relegation zone.`
          : `First place, shaded below, is in the promotion zone.`}
      </p>

      <table className="rl-standings-table">
        <thead>
          <tr>
            <th className="rl-num">Pos</th>
            <th>Team</th>
            <th>Squad</th>
            <th className="rl-num">Wins</th>
            <th className="rl-num">Points</th>
            <th className="rl-num">Gap</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row, i) => {
            const team = teamById[row.id];
            const squad = driversByTeam[row.id].map(d => d.name.split(' ').pop()).join(' / ');
            const inRelegationZone = tierId === 'tier1' && i >= standings.length - zoneCount;
            const inPromotionZone = tierId === 'tier2' && i < zoneCount;
            return (
              <tr key={row.id} className={inRelegationZone ? 'rl-zone-row rl-zone-down' : inPromotionZone ? 'rl-zone-row rl-zone-up' : ''}>
                <td className="rl-num rl-pos-cell">{i + 1}</td>
                <td>
                  <img className="rl-thumb" src={carImageUrl(team.carImageId)} alt="" />
                  <span className={`fi fi-${team.country}`} style={{ marginRight: 6 }} />
                  #{team.car} {team.name}
                  {inRelegationZone && <span className="rl-zone-tag rl-zone-tag-down">Relegation</span>}
                  {inPromotionZone && <span className="rl-zone-tag rl-zone-tag-up">Promotion</span>}
                </td>
                <td style={{ fontSize: 12.5, color: 'var(--tx-3)' }}>{squad}</td>
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
