import { LEAGUE_NAME, TIER2_LEAGUE_NAME, TIER2_LEAGUE_SHORT, FOUNDED_YEAR, CREWS, RALLIES, SEASON, TIER2_CREWS, PROMOTION_RELEGATION, crewById } from '../data';

function OverviewTab({ onNavigate }) {
  const surfaceCounts = RALLIES.reduce((acc, r) => { acc[r.surface] = (acc[r.surface] || 0) + 1; return acc; }, {});
  const leader = SEASON.finalStandings[0];
  const leaderCrew = crewById[leader.id];

  return (
    <div>
      <p className="rl-lede">
        {LEAGUE_NAME} sends eight factory crews across gravel, tarmac, and snow — one driver,
        one co-driver, one road, no room for a second attempt. Points come from overall rally
        position and a bonus for winning the closing Power Stage.
      </p>

      <div className="rl-stat-row">
        <div className="rl-stat-tile"><div className="rl-stat-value">{CREWS.length}</div><div className="rl-stat-label">Crews</div></div>
        <div className="rl-stat-tile"><div className="rl-stat-value">{RALLIES.length}</div><div className="rl-stat-label">Rallies</div></div>
        <div className="rl-stat-tile"><div className="rl-stat-value">{RALLIES.reduce((s, r) => s + r.stages, 0)}</div><div className="rl-stat-label">Stages this season</div></div>
        <div className="rl-stat-tile"><div className="rl-stat-value">{Object.keys(surfaceCounts).length}</div><div className="rl-stat-label">Surface types</div></div>
        <div className="rl-stat-tile"><div className="rl-stat-value">{FOUNDED_YEAR}</div><div className="rl-stat-label">Founded</div></div>
      </div>

      <div className="rl-section-title">Championship leader</div>
      <div className="rl-leader-row">
        <button className="rl-leader-card" onClick={() => onNavigate('standings')} style={{ cursor: 'pointer', border: '1px solid var(--bd)', textAlign: 'left', font: 'inherit' }}>
          <span className="rl-swatch" style={{ background: leaderCrew.colorPrimary }} />
          <div>
            <div className="rl-leader-kicker">Drivers' & Co-Drivers' Championship</div>
            <div className="rl-leader-name">{leaderCrew.driver} / {leaderCrew.coDriver}</div>
            <div className="rl-leader-sub">{leaderCrew.team} · {leader.points} pts · {leader.wins} rally win{leader.wins === 1 ? '' : 's'}</div>
          </div>
        </button>
      </div>

      <div className="rl-section-title">Two tiers, one ladder</div>
      <div className="rl-leader-row">
        <div className="rl-leader-card" style={{ display: 'block' }}>
          <div className="rl-leader-kicker">{TIER2_LEAGUE_SHORT} — {TIER2_LEAGUE_NAME}</div>
          <div className="rl-leader-sub">{TIER2_CREWS.length} crews racing the same rallies one step below {LEAGUE_NAME} — see the Standings tab to switch tiers.</div>
        </div>
        <div className="rl-leader-card" style={{ display: 'block' }}>
          <div className="rl-leader-kicker">Promotion & relegation</div>
          <div className="rl-leader-sub">{PROMOTION_RELEGATION.note}</div>
        </div>
      </div>

      <div className="rl-section-title">How the season works</div>
      <div className="rl-leader-row">
        <div className="rl-leader-card" style={{ display: 'block' }}>
          <div className="rl-leader-kicker">Three surfaces</div>
          <div className="rl-leader-sub">{Object.entries(surfaceCounts).map(([s, n]) => `${s} (${n})`).join(' · ')} — crews have a surface they're built for, and it shows in the results.</div>
        </div>
        <div className="rl-leader-card" style={{ display: 'block' }}>
          <div className="rl-leader-kicker">Overall result</div>
          <div className="rl-leader-sub">Cumulative time across every stage decides the rally; the top eight crews score points.</div>
        </div>
        <div className="rl-leader-card" style={{ display: 'block' }}>
          <div className="rl-leader-kicker">Power Stage</div>
          <div className="rl-leader-sub">The rally's final stage is timed separately, with its own small points bonus for the top five — see the Format tab.</div>
        </div>
      </div>
    </div>
  );
}

export default OverviewTab;
