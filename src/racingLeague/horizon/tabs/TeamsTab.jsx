import { useState } from 'react';
import { CLASSES, TIERS, driverCategory } from '../data';
import TierSwitch from '../../shared/TierSwitch';
import { carImageUrl } from '../../shared/carImages';

function TeamsTab() {
  const [tierId, setTierId] = useState('tier1');
  const [selectedDriverId, setSelectedDriverId] = useState(null);
  const tier = TIERS[tierId];
  const { teamsByClass, driversByTeam, teamById, driverById, season } = tier;

  const selected = selectedDriverId ? driverById[selectedDriverId] : null;
  const selectedTeam = selected ? teamById[selected.teamId] : null;

  return (
    <div>
      <p className="rl-lede">
        {tier.leagueName} fields {tier.teams.length} teams split across two classes, one car
        each, a three-driver squad behind every entry. Click a driver for their rating
        category and role in the car.
      </p>

      <TierSwitch tiers={TIERS} tier={tierId} onChange={(id) => { setTierId(id); setSelectedDriverId(null); }} />

      {CLASSES.map(cls => (
        <div key={cls}>
          <div className="rl-section-title">{cls} class</div>
          <div className="rl-team-grid">
            {teamsByClass[cls].map(team => (
              <div className="rl-team-card" key={team.id}>
                <img className="rl-team-card-image" src={carImageUrl(team.carImageId)} alt={team.name} loading="lazy" />
                <div className="rl-team-card-bar" style={{ background: `linear-gradient(90deg, ${team.colorPrimary}, ${team.colorSecondary})` }} />
                <div className="rl-team-card-body">
                  <div className="rl-team-card-head">
                    <div>
                      <div className="rl-team-name">#{team.car} · {team.name}</div>
                      <div className="rl-team-principal">
                        <span className={`fi fi-${team.country}`} style={{ marginRight: 6 }} />
                        {team.principal}
                      </div>
                    </div>
                  </div>

                  <div className="rl-meter-label"><span>Car pace</span><span>{team.pace}/100</span></div>
                  <div className="rl-meter">
                    <div className="rl-meter-fill" style={{ width: `${team.pace}%`, background: team.colorPrimary }} />
                  </div>

                  {driversByTeam[team.id].map(driver => (
                    <button key={driver.id} className="rl-driver-row" onClick={() => setSelectedDriverId(driver.id === selectedDriverId ? null : driver.id)}>
                      <span className={`fi fi-${driver.nationality}`} />
                      <span className="rl-driver-name">{driver.name}</span>
                      <span className="rl-driver-pts">{driverCategory(driver.skill)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {selected && (
        <div className="rl-detail-panel">
          <img className="rl-thumb" style={{ width: 64, height: 44 }} src={carImageUrl(selectedTeam.carImageId)} alt={selectedTeam.name} />
          <span className="rl-swatch" style={{ background: selectedTeam.colorPrimary }} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="rl-leader-kicker">Car #{selectedTeam.car} · {selectedTeam.name}</div>
            <div className="rl-leader-name">{selected.name}</div>
            <div className="rl-leader-sub">Age {selected.age} · {driverCategory(selected.skill)} rated</div>
          </div>
          <div>
            <div className="rl-leader-kicker">Season points</div>
            <div className="rl-leader-name">{season.finalDriverPoints[selected.id]}</div>
            <div className="rl-leader-sub">Shared equally with car #{selectedTeam.car} teammates</div>
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
