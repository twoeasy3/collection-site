import { LEAGUE_NAME, TIER2_LEAGUE_NAME, TIER2_LEAGUE_SHORT, FOUNDED_YEAR, TEAMS, DRIVERS, RACES, SEASON, TIER2_TEAMS, TIER2_SEASON, PROMOTION_RELEGATION, teamById, driverById, tier2TeamById } from '../data';

function OverviewTab({ onNavigate }) {
  const sprintCount = RACES.filter(r => r.sprint).length;
  const driverLeader = SEASON.finalDriverStandings[0];
  const teamLeader = SEASON.finalTeamStandings[0];
  const leaderDriver = driverById[driverLeader.id];
  const leaderTeam = teamById[teamLeader.id];
  const leaderDriverTeam = teamById[leaderDriver.teamId];

  const tier2Leader = TIER2_SEASON.finalTeamStandings[0];
  const tier2LeaderTeam = tier2TeamById[tier2Leader.id];

  return (
    <div>
      <p className="rl-lede">
        {LEAGUE_NAME} is a fictional single-seater championship built on today's Formula 1
        structure: ten constructors fielding two cars each, a global calendar mixing
        traditional Grands Prix with sprint weekends, and a graduated points system that
        rewards the top ten finishers. Explore the tabs above to meet the grid, follow the
        calendar, and see how the standings are calculated.
      </p>

      <div className="rl-stat-row">
        <div className="rl-stat-tile">
          <div className="rl-stat-value">{TEAMS.length}</div>
          <div className="rl-stat-label">Constructors</div>
        </div>
        <div className="rl-stat-tile">
          <div className="rl-stat-value">{DRIVERS.length}</div>
          <div className="rl-stat-label">Drivers</div>
        </div>
        <div className="rl-stat-tile">
          <div className="rl-stat-value">{RACES.length}</div>
          <div className="rl-stat-label">Rounds</div>
        </div>
        <div className="rl-stat-tile">
          <div className="rl-stat-value">{sprintCount}</div>
          <div className="rl-stat-label">Sprint weekends</div>
        </div>
        <div className="rl-stat-tile">
          <div className="rl-stat-value">{FOUNDED_YEAR}</div>
          <div className="rl-stat-label">Founded</div>
        </div>
      </div>

      <div className="rl-section-title">Championship leaders</div>
      <div className="rl-leader-row">
        <button className="rl-leader-card" onClick={() => onNavigate('standings')} style={{ cursor: 'pointer', border: '1px solid var(--bd)', textAlign: 'left', font: 'inherit' }}>
          <span className="rl-swatch" style={{ background: leaderDriverTeam.colorPrimary }} />
          <div>
            <div className="rl-leader-kicker">Drivers' Championship</div>
            <div className="rl-leader-name">{leaderDriver.name}</div>
            <div className="rl-leader-sub">{leaderDriverTeam.name} · {driverLeader.points} pts · {driverLeader.wins} win{driverLeader.wins === 1 ? '' : 's'}</div>
          </div>
        </button>
        <button className="rl-leader-card" onClick={() => onNavigate('standings')} style={{ cursor: 'pointer', border: '1px solid var(--bd)', textAlign: 'left', font: 'inherit' }}>
          <span className="rl-swatch" style={{ background: leaderTeam.colorPrimary }} />
          <div>
            <div className="rl-leader-kicker">Constructors' Championship</div>
            <div className="rl-leader-name">{leaderTeam.name}</div>
            <div className="rl-leader-sub">{teamLeader.points} pts · {teamLeader.wins} win{teamLeader.wins === 1 ? '' : 's'}</div>
          </div>
        </button>
      </div>

      <div className="rl-section-title">Two tiers, one ladder</div>
      <div className="rl-leader-row">
        <button className="rl-leader-card" onClick={() => onNavigate('standings')} style={{ cursor: 'pointer', border: '1px solid var(--bd)', textAlign: 'left', font: 'inherit' }}>
          <span className="rl-swatch" style={{ background: tier2LeaderTeam.colorPrimary }} />
          <div>
            <div className="rl-leader-kicker">{TIER2_LEAGUE_SHORT} leader — {TIER2_LEAGUE_NAME}</div>
            <div className="rl-leader-name">{tier2LeaderTeam.name}</div>
            <div className="rl-leader-sub">{TIER2_TEAMS.length} constructors · {tier2Leader.points} pts</div>
          </div>
        </button>
        <div className="rl-leader-card" style={{ display: 'block' }}>
          <div className="rl-leader-kicker">Promotion & relegation</div>
          <div className="rl-leader-sub">{PROMOTION_RELEGATION.note}</div>
        </div>
      </div>

      <div className="rl-section-title">How the season works</div>
      <div className="rl-leader-row">
        <div className="rl-leader-card" style={{ display: 'block' }}>
          <div className="rl-leader-kicker">Race weekend</div>
          <div className="rl-leader-sub">Free practice and qualifying set the grid; the Grand Prix pays points to the top ten finishers, plus a bonus point for the fastest lap if set inside the top ten.</div>
        </div>
        <div className="rl-leader-card" style={{ display: 'block' }}>
          <div className="rl-leader-kicker">Sprint weekend</div>
          <div className="rl-leader-sub">{sprintCount} rounds add a short sprint race the day before the Grand Prix, paying a smaller points scale to the top eight — see the Points System tab.</div>
        </div>
        <div className="rl-leader-card" style={{ display: 'block' }}>
          <div className="rl-leader-kicker">Two championships</div>
          <div className="rl-leader-sub">Drivers accumulate points individually; a team's constructors points are the combined total of both its drivers across the season.</div>
        </div>
      </div>
    </div>
  );
}

export default OverviewTab;
