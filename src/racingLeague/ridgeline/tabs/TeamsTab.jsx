import { useState } from 'react';
import { TIERS } from '../data';
import TierSwitch from '../../shared/TierSwitch';
import { carImageUrl } from '../../shared/carImages';

function TeamsTab() {
  const [tierId, setTierId] = useState('tier1');
  const [selectedId, setSelectedId] = useState(null);
  const tier = TIERS[tierId];
  const { crews, crewById, season } = tier;

  const rankFor = (id) => season.finalStandings.findIndex(x => x.id === id) + 1;
  const pointsFor = (id) => season.finalStandings.find(x => x.id === id)?.points ?? 0;
  const selected = selectedId ? crewById[selectedId] : null;

  return (
    <div>
      <p className="rl-lede">
        {tier.leagueName} runs {crews.length} crews, each a driver and co-driver pair. Every
        crew has a surface they're built for — click one to see its championship standing.
      </p>

      <TierSwitch tiers={TIERS} tier={tierId} onChange={(id) => { setTierId(id); setSelectedId(null); }} />

      <div className="rl-team-grid">
        {crews.map(crew => (
          <button
            key={crew.id}
            className="rl-team-card"
            style={{ cursor: 'pointer', border: '1px solid var(--bd)', textAlign: 'left', font: 'inherit', display: 'block', width: '100%' }}
            onClick={() => setSelectedId(crew.id === selectedId ? null : crew.id)}
          >
            <img className="rl-team-card-image" src={carImageUrl(crew.carImageId)} alt={crew.team} loading="lazy" />
            <div className="rl-team-card-bar" style={{ background: `linear-gradient(90deg, ${crew.colorPrimary}, ${crew.colorSecondary})` }} />
            <div className="rl-team-card-body">
              <div className="rl-team-card-head">
                <div>
                  <div className="rl-team-name">{crew.team}</div>
                  <div className="rl-team-principal">
                    <span className={`fi fi-${crew.country}`} style={{ marginRight: 6 }} />
                    Built for {crew.strongSurface}
                  </div>
                </div>
              </div>

              <div className="rl-meter-label"><span>Crew pace</span><span>{crew.pace}/100</span></div>
              <div className="rl-meter">
                <div className="rl-meter-fill" style={{ width: `${crew.pace}%`, background: crew.colorPrimary }} />
              </div>

              <div className="rl-driver-row" style={{ cursor: 'default' }}>
                <span className={`fi fi-${crew.driverNat}`} />
                <span className="rl-driver-name">{crew.driver} <span style={{ color: 'var(--tx-3)', fontSize: 11 }}>driver</span></span>
              </div>
              <div className="rl-driver-row" style={{ cursor: 'default', borderTop: '1px solid var(--bd)' }}>
                <span className={`fi fi-${crew.coDriverNat}`} />
                <span className="rl-driver-name">{crew.coDriver} <span style={{ color: 'var(--tx-3)', fontSize: 11 }}>co-driver</span></span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="rl-detail-panel">
          <img className="rl-thumb" style={{ width: 64, height: 44 }} src={carImageUrl(selected.carImageId)} alt={selected.team} />
          <span className="rl-swatch" style={{ background: selected.colorPrimary }} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="rl-leader-kicker">{selected.team}</div>
            <div className="rl-leader-name">{selected.driver} / {selected.coDriver}</div>
            <div className="rl-leader-sub">Built for {selected.strongSurface} — a +6 pace edge on that surface</div>
          </div>
          <div>
            <div className="rl-leader-kicker">Championship position</div>
            <div className="rl-leader-name">P{rankFor(selected.id)}</div>
            <div className="rl-leader-sub">{pointsFor(selected.id)} points</div>
          </div>
          <button className="rl-detail-close" onClick={() => setSelectedId(null)} aria-label="Close">×</button>
        </div>
      )}
    </div>
  );
}

export default TeamsTab;
