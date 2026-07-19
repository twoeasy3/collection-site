import { QUALIFICATION_NOTE, QUALIFIER_COUNTS, SEEDED } from '../data';
import { carImageUrl } from '../../shared/carImages';

function QualificationTab() {
  return (
    <div>
      <p className="rl-lede">{QUALIFICATION_NOTE}</p>

      <div className="rl-stat-row">
        <div className="rl-stat-tile"><div className="rl-stat-value">{QUALIFIER_COUNTS.solaris}</div><div className="rl-stat-label">From Solaris GP</div></div>
        <div className="rl-stat-tile"><div className="rl-stat-value">{QUALIFIER_COUNTS.horizon}</div><div className="rl-stat-label">From Horizon Endurance</div></div>
        <div className="rl-stat-tile"><div className="rl-stat-value">{QUALIFIER_COUNTS.ridgeline}</div><div className="rl-stat-label">From Ridgeline Rally</div></div>
      </div>

      <table className="rl-standings-table">
        <thead>
          <tr>
            <th className="rl-num">Seed</th>
            <th>Driver</th>
            <th>League</th>
            <th>Home team</th>
            <th className="rl-num">League rank</th>
            <th className="rl-num">Rating</th>
          </tr>
        </thead>
        <tbody>
          {SEEDED.map(q => (
            <tr key={q.id}>
              <td className="rl-num rl-pos-cell">{q.seed}</td>
              <td>
                <img className="rl-thumb" src={carImageUrl(q.carImageId)} alt="" />
                <span className={`fi fi-${q.nationality}`} style={{ marginRight: 6 }} />
                {q.name}
              </td>
              <td>{q.sourceShort}</td>
              <td>{q.teamName}</td>
              <td className="rl-num">P{q.leagueRank}</td>
              <td className="rl-num">{q.rating}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default QualificationTab;
