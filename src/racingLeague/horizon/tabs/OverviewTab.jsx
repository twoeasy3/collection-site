import { LEAGUE_NAME, TIER2_LEAGUE_NAME, TIER2_LEAGUE_SHORT, FOUNDED_YEAR, TEAMS, DRIVERS, RACES, CLASSES, SEASON, TIER2_TEAMS, PROMOTION_RELEGATION, teamById } from '../data';

function OverviewTab({ onNavigate }) {
  return (
    <div>
      <p className="rl-lede">
        {LEAGUE_NAME} pits factory-backed endurance teams against each other across two
        classes — Prototype and GT — over races that range from a four-hour sprint to a
        full twenty-four hours through the night. Each car carries a three-driver squad,
        and every driver in a scoring car earns the car's full points.
      </p>

      <div className="rl-stat-row">
        <div className="rl-stat-tile"><div className="rl-stat-value">{TEAMS.length}</div><div className="rl-stat-label">Teams</div></div>
        <div className="rl-stat-tile"><div className="rl-stat-value">{DRIVERS.length}</div><div className="rl-stat-label">Drivers</div></div>
        <div className="rl-stat-tile"><div className="rl-stat-value">{RACES.length}</div><div className="rl-stat-label">Rounds</div></div>
        <div className="rl-stat-tile"><div className="rl-stat-value">{CLASSES.length}</div><div className="rl-stat-label">Classes</div></div>
        <div className="rl-stat-tile"><div className="rl-stat-value">24h</div><div className="rl-stat-label">Longest round</div></div>
        <div className="rl-stat-tile"><div className="rl-stat-value">{FOUNDED_YEAR}</div><div className="rl-stat-label">Founded</div></div>
      </div>

      <div className="rl-section-title">Class leaders</div>
      <div className="rl-leader-row">
        {CLASSES.map(cls => {
          const leader = SEASON.finalStandings[cls][0];
          const team = teamById[leader.id];
          return (
            <button key={cls} className="rl-leader-card" onClick={() => onNavigate('standings')} style={{ cursor: 'pointer', border: '1px solid var(--bd)', textAlign: 'left', font: 'inherit' }}>
              <span className="rl-swatch" style={{ background: team.colorPrimary }} />
              <div>
                <div className="rl-leader-kicker">{cls} class</div>
                <div className="rl-leader-name">{team.name}</div>
                <div className="rl-leader-sub">Car #{team.car} · {leader.points} pts · {leader.wins} class win{leader.wins === 1 ? '' : 's'}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="rl-section-title">Two tiers, one ladder</div>
      <div className="rl-leader-row">
        <div className="rl-leader-card" style={{ display: 'block' }}>
          <div className="rl-leader-kicker">{TIER2_LEAGUE_SHORT} — {TIER2_LEAGUE_NAME}</div>
          <div className="rl-leader-sub">{TIER2_TEAMS.length} teams racing the same calendar one step below {LEAGUE_NAME} — see the Standings tab to switch tiers.</div>
        </div>
        <div className="rl-leader-card" style={{ display: 'block' }}>
          <div className="rl-leader-kicker">Promotion & relegation</div>
          <div className="rl-leader-sub">{PROMOTION_RELEGATION.note}</div>
        </div>
      </div>

      <div className="rl-section-title">How the season works</div>
      <div className="rl-leader-row">
        <div className="rl-leader-card" style={{ display: 'block' }}>
          <div className="rl-leader-kicker">Two classes, one track</div>
          <div className="rl-leader-sub">Prototype and GT cars race together on circuit, but score points against their own class only.</div>
        </div>
        <div className="rl-leader-card" style={{ display: 'block' }}>
          <div className="rl-leader-kicker">Three drivers, one car</div>
          <div className="rl-leader-sub">Squads rotate through races lasting up to 24 hours. Every driver in a car earns the same points as their teammates that round.</div>
        </div>
        <div className="rl-leader-card" style={{ display: 'block' }}>
          <div className="rl-leader-kicker">Endurance, not sprint</div>
          <div className="rl-leader-sub">No sprint weekends here — reliability across hours of racing matters as much as outright pace. See the Format tab for the points scale.</div>
        </div>
      </div>
    </div>
  );
}

export default OverviewTab;
