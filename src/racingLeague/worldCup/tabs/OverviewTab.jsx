import { EVENT_NAME, QUALIFICATION_NOTE, QUALIFIERS, SQUADS, ROUNDS_META, RESULT } from '../data';
import { carImageUrl } from '../../shared/carImages';

function OverviewTab({ onNavigate }) {
  const nationsLeader = RESULT.nationsStandings[0];
  const goldenLeader = RESULT.goldenDriverStandings[0];

  return (
    <div>
      <p className="rl-lede">
        {EVENT_NAME} sets nation against nation. Every qualified driver races for their home
        country, not their home team — a country with representatives in more than one league
        fields a stronger squad. Four rounds, each flavored after a different league's format,
        decide the Nations Cup and an individual Golden Driver champion.
      </p>

      <div className="rl-stat-row">
        <div className="rl-stat-tile"><div className="rl-stat-value">{QUALIFIERS.length}</div><div className="rl-stat-label">Qualified drivers</div></div>
        <div className="rl-stat-tile"><div className="rl-stat-value">{Object.keys(SQUADS).length}</div><div className="rl-stat-label">Nations</div></div>
        <div className="rl-stat-tile"><div className="rl-stat-value">{ROUNDS_META.length}</div><div className="rl-stat-label">Rounds</div></div>
      </div>

      <div className="rl-section-title">Current leaders</div>
      <div className="rl-leader-row">
        <button className="rl-leader-card" onClick={() => onNavigate('standings')} style={{ cursor: 'pointer', border: '1px solid var(--bd)', textAlign: 'left', font: 'inherit' }}>
          <span className={`fi fi-${nationsLeader.country}`} style={{ fontSize: '1.4em' }} />
          <div>
            <div className="rl-leader-kicker">Nations Cup leader</div>
            <div className="rl-leader-name">{nationsLeader.squad.length > 1 ? `${nationsLeader.squad.length}-driver squad` : nationsLeader.squad[0].name}</div>
            <div className="rl-leader-sub">{nationsLeader.points} pts</div>
          </div>
        </button>
        <button className="rl-leader-card" onClick={() => onNavigate('standings')} style={{ cursor: 'pointer', border: '1px solid var(--bd)', textAlign: 'left', font: 'inherit' }}>
          <img className="rl-thumb" style={{ width: 64, height: 44 }} src={carImageUrl(goldenLeader.carImageId)} alt={goldenLeader.name} />
          <div>
            <div className="rl-leader-kicker">Golden Driver leader</div>
            <div className="rl-leader-name">{goldenLeader.name}</div>
            <div className="rl-leader-sub">{goldenLeader.sourceShort} · {goldenLeader.points} pts</div>
          </div>
        </button>
      </div>

      <div className="rl-section-title">How it works</div>
      <div className="rl-leader-row">
        <div className="rl-leader-card" style={{ display: 'block' }}>
          <div className="rl-leader-kicker">Qualification</div>
          <div className="rl-leader-sub">{QUALIFICATION_NOTE}</div>
        </div>
        <div className="rl-leader-card" style={{ display: 'block' }}>
          <div className="rl-leader-kicker">Four rounds</div>
          <div className="rl-leader-sub">{ROUNDS_META.map(r => r.name).join(' → ')} — see the Schedule tab for each round's result.</div>
        </div>
        <div className="rl-leader-card" style={{ display: 'block' }}>
          <div className="rl-leader-kicker">Two titles</div>
          <div className="rl-leader-sub">Individual points earned each round add up for the Golden Driver title; a nation's total is the combined points of every driver racing under its flag.</div>
        </div>
      </div>
    </div>
  );
}

export default OverviewTab;
