import { useMemo, useState } from 'react';
import { RACE_POINTS, SPRINT_POINTS, FASTEST_LAP_POINT } from '../data';

const pointsAt = (table, pos) => (pos >= 1 && pos <= table.length ? table[pos - 1] : 0);

function PointsTab() {
  const [session, setSession] = useState('race');
  const [posA, setPosA] = useState(1);
  const [posB, setPosB] = useState(2);
  const [flA, setFlA] = useState(false);

  const table = session === 'race' ? RACE_POINTS : SPRINT_POINTS;
  const positions = useMemo(() => Array.from({ length: 20 }, (_, i) => i + 1), []);

  const basePtsA = pointsAt(table, posA);
  const bonusA = session === 'race' && flA && posA <= table.length ? FASTEST_LAP_POINT : 0;
  const ptsA = basePtsA + bonusA;
  const ptsB = pointsAt(table, posB);
  const swing = ptsA - ptsB;

  return (
    <div>
      <p className="rl-lede">
        Points are awarded to the top ten finishers of every Grand Prix, and the top eight of
        every sprint. A bonus point goes to whichever driver sets the race's fastest lap,
        provided they finish in the top ten.
      </p>

      <div className="rl-points-grid">
        <div>
          <div className="rl-leader-kicker">Grand Prix — top 10</div>
          <table className="rl-points-table">
            <thead><tr>{RACE_POINTS.map((_, i) => <th key={i}>P{i + 1}</th>)}</tr></thead>
            <tbody><tr>{RACE_POINTS.map((p, i) => <td key={i}>{p}</td>)}</tr></tbody>
          </table>
          <p className="rl-lede" style={{ fontSize: 12.5, marginTop: 8 }}>+{FASTEST_LAP_POINT} bonus point for fastest lap, top 10 finishers only.</p>
        </div>
        <div>
          <div className="rl-leader-kicker">Sprint — top 8</div>
          <table className="rl-points-table">
            <thead><tr>{SPRINT_POINTS.map((_, i) => <th key={i}>P{i + 1}</th>)}</tr></thead>
            <tbody><tr>{SPRINT_POINTS.map((p, i) => <td key={i}>{p}</td>)}</tr></tbody>
          </table>
          <p className="rl-lede" style={{ fontSize: 12.5, marginTop: 8 }}>No fastest lap bonus in the sprint.</p>
        </div>
      </div>

      <div className="rl-section-title">Points calculator</div>
      <div className="rl-calc-card">
        <p className="rl-lede" style={{ marginBottom: 0 }}>Compare what two finishing positions are worth.</p>
        <div className="rl-calc-row">
          <div className="rl-calc-field">
            <label>Session</label>
            <select value={session} onChange={e => setSession(e.target.value)}>
              <option value="race">Grand Prix</option>
              <option value="sprint">Sprint</option>
            </select>
          </div>
          <div className="rl-calc-field">
            <label>Driver A finishes</label>
            <select value={posA} onChange={e => setPosA(Number(e.target.value))}>
              {positions.map(p => <option key={p} value={p}>P{p}</option>)}
            </select>
          </div>
          {session === 'race' && (
            <div className="rl-calc-field">
              <label>Driver A fastest lap?</label>
              <select value={flA ? 'yes' : 'no'} onChange={e => setFlA(e.target.value === 'yes')}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
          )}
          <div className="rl-calc-field">
            <label>Driver B finishes</label>
            <select value={posB} onChange={e => setPosB(Number(e.target.value))}>
              {positions.map(p => <option key={p} value={p}>P{p}</option>)}
            </select>
          </div>
        </div>

        <div className="rl-calc-result">
          <div className="rl-calc-result-item">
            <div className="rl-calc-result-value">{ptsA}</div>
            <div className="rl-calc-result-label">Driver A points{bonusA ? ` (incl. +${bonusA} FL)` : ''}</div>
          </div>
          <div className="rl-calc-result-item">
            <div className="rl-calc-result-value">{ptsB}</div>
            <div className="rl-calc-result-label">Driver B points</div>
          </div>
          <div className="rl-calc-result-item">
            <div className="rl-calc-result-value" style={{ color: swing === 0 ? 'var(--tx)' : swing > 0 ? '#0ca30c' : '#e34948' }}>
              {swing > 0 ? `+${swing}` : swing}
            </div>
            <div className="rl-calc-result-label">Points swing (A vs B)</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PointsTab;
