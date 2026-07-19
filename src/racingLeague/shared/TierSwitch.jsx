// Reused wherever a league's Teams/Standings tab needs to switch between
// its Tier 1 and Tier 2 rosters — the two tiers share this page's chrome
// but simulate independently.
function TierSwitch({ tiers, tier, onChange }) {
  return (
    <div className="rl-toggle-row">
      {Object.values(tiers).map(t => (
        <button key={t.id} className={`rl-toggle-btn${tier === t.id ? ' active' : ''}`} onClick={() => onChange(t.id)}>
          {t.leagueShort} · {t.label}
        </button>
      ))}
    </div>
  );
}

export default TierSwitch;
