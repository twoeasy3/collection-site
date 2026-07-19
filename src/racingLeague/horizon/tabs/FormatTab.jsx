import { useState } from 'react';
import { RACE_POINTS } from '../data';

const pointsAt = (pos) => (pos >= 1 && pos <= RACE_POINTS.length ? RACE_POINTS[pos - 1] : 0);

function FormatTab() {
  const [posA, setPosA] = useState(1);
  const [posB, setPosB] = useState(2);
  const positions = Array.from({ length: RACE_POINTS.length }, (_, i) => i + 1);

  const ptsA = pointsAt(posA);
  const ptsB = pointsAt(posB);
  const swing = ptsA - ptsB;

  return (
    <div>
      <p className="rl-lede">
        Prototype and GT cars race together on track but are scored separately, each against
        the same Apex Federation points scale used across the top ten class finishers. With
        four cars per class, only the first four positions typically pay — but the full scale
        applies if the grid grows.
      </p>

      <div className="rl-leader-kicker" style={{ marginBottom: 6 }}>Points per class, by finishing position</div>
      <table className="rl-points-table" style={{ maxWidth: 640 }}>
        <thead><tr>{RACE_POINTS.map((_, i) => <th key={i}>P{i + 1}</th>)}</tr></thead>
        <tbody><tr>{RACE_POINTS.map((p, i) => <td key={i}>{p}</td>)}</tr></tbody>
      </table>
      <p className="rl-lede" style={{ fontSize: 12.5, marginTop: 8, maxWidth: 640 }}>
        All three drivers listed on a scoring car earn the same points that round — there is
        no split between "lead" and "reserve" drivers.
      </p>

      <div className="rl-section-title">Points calculator</div>
      <div className="rl-calc-card">
        <p className="rl-lede" style={{ marginBottom: 0 }}>Compare what two class-finishing positions are worth.</p>
        <div className="rl-calc-row">
          <div className="rl-calc-field">
            <label>Car A finishes</label>
            <select value={posA} onChange={e => setPosA(Number(e.target.value))}>
              {positions.map(p => <option key={p} value={p}>P{p}</option>)}
            </select>
          </div>
          <div className="rl-calc-field">
            <label>Car B finishes</label>
            <select value={posB} onChange={e => setPosB(Number(e.target.value))}>
              {positions.map(p => <option key={p} value={p}>P{p}</option>)}
            </select>
          </div>
        </div>
        <div className="rl-calc-result">
          <div className="rl-calc-result-item">
            <div className="rl-calc-result-value">{ptsA}</div>
            <div className="rl-calc-result-label">Car A points (× 3 drivers)</div>
          </div>
          <div className="rl-calc-result-item">
            <div className="rl-calc-result-value">{ptsB}</div>
            <div className="rl-calc-result-label">Car B points (× 3 drivers)</div>
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

export default FormatTab;
