import { useState } from 'react';
import { TIERS } from '../data';
import TierSwitch from '../../shared/TierSwitch';
import { carImageUrl } from '../../shared/carImages';

function TeamsTab() {
  const [tierId, setTierId] = useState('tier1');
  const [selectedDriverId, setSelectedDriverId] = useState(null);
  const tier = TIERS[tierId];
  const { teams, driversByTeam, teamById, driverById, season } = tier;

  const pointsFor = (driverId) => season.finalDriverStandings.find(d => d.id === driverId)?.points ?? 0;
  const rankFor = (id) => season.finalDriverStandings.findIndex(x => x.id === id) + 1;

  const selected = selectedDriverId ? driverById[selectedDriverId] : null;
  const selectedTeam = selected ? teamById[selected.teamId] : null;

  return (
    <div>
      <p className="rl-lede">
        {tier.leagueName} fields {teams.length} constructors, two cars each; the pace rating
        reflects the car's competitiveness this season. Click any driver for their current
        standing.
      </p>

      <TierSwitch tiers={TIERS} tier={tierId} onChange={(id) => { setTierId(id); setSelectedDriverId(null); }} />

      <div className="rl-team-grid">
        {teams.map(team => (
          <div className="rl-team-card" key={team.id}>
            <img className="rl-team-card-image" src={carImageUrl(team.carImageId)} alt={team.name} loading="lazy" />
            <div className="rl-team-card-bar" style={{ background: `linear-gradient(90deg, ${team.colorPrimary}, ${team.colorSecondary})` }} />
            <div className="rl-team-card-body">
              <div className="rl-team-card-head">
                <div>
                  <div className="rl-team-name">{team.name}</div>
                  <div className="rl-team-principal">
                    <span className={`fi fi-${team.country}`} style={{ marginRight: 6 }} />
                    {team.principal}
                  </div>
                </div>
              </div>

              <div className="rl-meter-label">
                <span>Car pace</span>
                <span>{team.pace}/100</span>
              </div>
              <div className="rl-meter">
                <div className="rl-meter-fill" style={{ width: `${team.pace}%`, background: team.colorPrimary }} />
              </div>

              {driversByTeam[team.id].map(driver => (
                <button
                  key={driver.id}
                  className="rl-driver-row"
                  onClick={() => setSelectedDriverId(driver.id === selectedDriverId ? null : driver.id)}
                >
                  <span className="rl-driver-num">#{driver.number}</span>
                  <span className={`fi fi-${driver.nationality}`} />
                  <span className="rl-driver-name">{driver.name}</span>
                  <span className="rl-driver-pts">{pointsFor(driver.id)} pts</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="rl-detail-panel">
          <img className="rl-thumb" style={{ width: 64, height: 44 }} src={carImageUrl(selectedTeam.carImageId)} alt={selectedTeam.name} />
          <span className="rl-swatch" style={{ background: selectedTeam.colorPrimary }} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="rl-leader-kicker">#{selected.number} · {selectedTeam.name}</div>
            <div className="rl-leader-name">{selected.name}</div>
            <div className="rl-leader-sub">{selected.note} · Age {selected.age}</div>
          </div>
          <div>
            <div className="rl-leader-kicker">Championship position</div>
            <div className="rl-leader-name">P{rankFor(selected.id)}</div>
            <div className="rl-leader-sub">{pointsFor(selected.id)} points</div>
          </div>
          <div style={{ minWidth: 140 }}>
            <div className="rl-meter-label"><span>Skill rating</span><span>{selected.skill}/100</span></div>
            <div className="rl-meter">
              <div className="rl-meter-fill" style={{ width: `${selected.skill}%`, background: selectedTeam.colorPrimary }} />
            </div>
          </div>
          <button className="rl-detail-close" onClick={() => setSelectedDriverId(null)} aria-label="Close">×</button>
        </div>
      )}
    </div>
  );
}

export default TeamsTab;
