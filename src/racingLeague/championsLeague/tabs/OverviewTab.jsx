import { EVENT_NAME, QUALIFICATION_NOTE, QUALIFIERS, CHAMPION } from '../data';
import { carImageUrl } from '../../shared/carImages';

function OverviewTab({ onNavigate }) {
  return (
    <div>
      <p className="rl-lede">
        {EVENT_NAME} is The Apex Federation's season-ending exhibition: the eight best drivers
        across all three championships, drawn straight from this season's final standings,
        driving identical spec cars in a single-elimination knockout. No home advantage, no car
        advantage — just a straight duel every round.
      </p>

      <div className="rl-stat-row">
        <div className="rl-stat-tile"><div className="rl-stat-value">{QUALIFIERS.length}</div><div className="rl-stat-label">Qualified drivers</div></div>
        <div className="rl-stat-tile"><div className="rl-stat-value">3</div><div className="rl-stat-label">Rounds</div></div>
        <div className="rl-stat-tile"><div className="rl-stat-value">3</div><div className="rl-stat-label">Leagues represented</div></div>
      </div>

      <div className="rl-section-title">Reigning champion</div>
      <div className="rl-leader-row">
        <button className="rl-leader-card" onClick={() => onNavigate('bracket')} style={{ cursor: 'pointer', border: '1px solid var(--bd)', textAlign: 'left', font: 'inherit' }}>
          <img className="rl-thumb" style={{ width: 64, height: 44 }} src={carImageUrl(CHAMPION.carImageId)} alt={CHAMPION.name} />
          <div>
            <div className="rl-leader-kicker">Champion</div>
            <div className="rl-leader-name">{CHAMPION.name}</div>
            <div className="rl-leader-sub">{CHAMPION.sourceLeague} · {CHAMPION.teamName} · seed #{CHAMPION.seed} · rating {CHAMPION.rating}</div>
          </div>
        </button>
      </div>

      <div className="rl-section-title">How qualification works</div>
      <div className="rl-leader-row">
        <div className="rl-leader-card" style={{ display: 'block' }}>
          <div className="rl-leader-kicker">Field of eight</div>
          <div className="rl-leader-sub">{QUALIFICATION_NOTE}</div>
        </div>
        <div className="rl-leader-card" style={{ display: 'block' }}>
          <div className="rl-leader-kicker">Seeding</div>
          <div className="rl-leader-sub">Seeds are set by each driver's rating on a common 0–100 scale, so a Ridgeline crew's pace and a Solaris driver's skill line up on the same bracket.</div>
        </div>
        <div className="rl-leader-card" style={{ display: 'block' }}>
          <div className="rl-leader-kicker">One duel, one winner</div>
          <div className="rl-leader-sub">Quarterfinals, semifinals, and a final — every round is a single head-to-head, no rematches. See the Bracket tab for the results.</div>
        </div>
      </div>
    </div>
  );
}

export default OverviewTab;
