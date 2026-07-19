// Single-series horizontal bar chart (magnitude comparison, not identity),
// so one hue for every bar is correct — see dataviz skill: color follows the
// job, and points totals here are a magnitude, not a per-team category.
function BarChart({ title, items }) {
  const max = Math.max(1, ...items.map(i => i.value));
  const leader = items[0]?.value ?? 0;

  return (
    <div className="rl-chart">
      <div className="rl-chart-title">{title}</div>
      <div>
        {items.map(item => {
          const pct = Math.max(2, (item.value / max) * 100);
          const gap = leader - item.value;
          const tip = gap === 0 ? `${item.label}: ${item.value} pts — leader` : `${item.label}: ${item.value} pts (-${gap} to leader)`;
          return (
            <div className="rl-bar-row" key={item.id} data-tip={tip}>
              <div className="rl-bar-label">{item.label}</div>
              <div className="rl-bar-track">
                <div className="rl-bar-fill" style={{ width: `${pct}%` }}>
                  <span className="rl-bar-value">{item.value}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default BarChart;
