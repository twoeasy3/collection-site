import { useState } from 'react';
import { RALLY_POINTS, POWER_STAGE_POINTS } from '../data';

const pointsAt = (table, pos) => (pos >= 1 && pos <= table.length ? table[pos - 1] : 0);

function FormatTab() {
  const [posA, setPosA] = useState(1);
  const [posB, setPosB] = useState(2);
  const [psA, setPsA] = useState(0);
  const positions = Array.from({ length: RALLY_POINTS.length }, (_, i) => i + 1);
  const psPositions = [0, ...Array.from({ length: POWER_STAGE_POINTS.length }, (_, i) => i + 1)];

  const ptsA = pointsAt(RALLY_POINTS, posA) + pointsAt(POWER_STAGE_POINTS, psA);
  const ptsB = pointsAt(RALLY_POINTS, posB);
  const swing = ptsA - ptsB;

  return (
    <div>
      <p className="rl-lede">
        A rally is won on cumulative time across every stage, not any single stage. The top
        eight overall finishers score points; the closing Power Stage is timed separately and
        pays a small bonus to its own top five — regardless of where they finished overall.
      </p>

      <div className="rl-points-grid">
        <div>
          <div className="rl-leader-kicker">Overall result — top 8</div>
          <table className="rl-points-table">
            <thead><tr>{RALLY_POINTS.map((_, i) => <th key={i}>P{i + 1}</th>)}</tr></thead>
            <tbody><tr>{RALLY_POINTS.map((p, i) => <td key={i}>{p}</td>)}</tr></tbody>
          </table>
        </div>
        <div>
          <div className="rl-leader-kicker">Power Stage — top 5</div>
          <table className="rl-points-table">
            <thead><tr>{POWER_STAGE_POINTS.map((_, i) => <th key={i}>P{i + 1}</th>)}</tr></thead>
            <tbody><tr>{POWER_STAGE_POINTS.map((p, i) => <td key={i}>{p}</td>)}</tr></tbody>
          </table>
        </div>
      </div>

      <div className="rl-section-title">Points calculator</div>
      <div className="rl-calc-card">
        <p className="rl-lede" style={{ marginBottom: 0 }}>Compare what two crews' rallies are worth.</p>
        <div className="rl-calc-row">
          <div className="rl-calc-field">
            <label>Crew A finishes overall</label>
            <select value={posA} onChange={e => setPosA(Number(e.target.value))}>
              {positions.map(p => <option key={p} value={p}>P{p}</option>)}
            </select>
          </div>
          <div className="rl-calc-field">
            <label>Crew A's Power Stage</label>
            <select value={psA} onChange={e => setPsA(Number(e.target.value))}>
              {psPositions.map(p => <option key={p} value={p}>{p === 0 ? 'Not top 5' : `P${p}`}</option>)}
            </select>
          </div>
          <div className="rl-calc-field">
            <label>Crew B finishes overall</label>
            <select value={posB} onChange={e => setPosB(Number(e.target.value))}>
              {positions.map(p => <option key={p} value={p}>P{p}</option>)}
            </select>
          </div>
        </div>

        <div className="rl-calc-result">
          <div className="rl-calc-result-item">
            <div className="rl-calc-result-value">{ptsA}</div>
            <div className="rl-calc-result-label">Crew A points{psA ? ` (incl. +${pointsAt(POWER_STAGE_POINTS, psA)} Power Stage)` : ''}</div>
          </div>
          <div className="rl-calc-result-item">
            <div className="rl-calc-result-value">{ptsB}</div>
            <div className="rl-calc-result-label">Crew B points</div>
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
