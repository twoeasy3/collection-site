import { useEffect, useState } from 'react';
import '../shared/League.css';
import { GOVERNING_BODY } from '../universeData';

// Reusable chrome (header, tabs, footer) for every league in the universe.
// meta: { name, short, seasonLabel, tagline, accent: [c1, c2], footerNote }
// tabs: [{ id, label, Component }]
function LeagueShell({ meta, tabs, onBack }) {
  const [tab, setTab] = useState(tabs[0]?.id);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.title = `${meta.name} — ${GOVERNING_BODY.short} Universe`;
  }, [meta.name]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const Active = tabs.find(t => t.id === tab)?.Component ?? tabs[0].Component;
  const style = { '--rl-c1': meta.accent[0], '--rl-c2': meta.accent[1] };

  return (
    <div className="rl-page" style={style}>
      <header className="rl-header">
        <div className="rl-header-top">
          <button className="rl-back-link" onClick={onBack} style={{ background: 'none', border: 'none', font: 'inherit', cursor: 'pointer', padding: 0 }}>
            ← All leagues
          </button>
          <button className="rl-theme-toggle" onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}>
            {theme === 'dark' ? '☀ Light' : '● Dark'}
          </button>
        </div>
        <div className="rl-brand">
          <span className="rl-brand-mark">{meta.short}</span>
        </div>
        <h1 className="rl-title">{meta.name}</h1>
        <p className="rl-subtitle">{meta.seasonLabel} · {meta.tagline}</p>
        <p className="rl-governed-by">Sanctioned by <strong>{GOVERNING_BODY.name}</strong> ({GOVERNING_BODY.short})</p>
      </header>

      <nav className="rl-tabs">
        {tabs.map(t => (
          <button key={t.id} className={`rl-tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      <div className="rl-body">
        <Active onNavigate={setTab} />
        <div className="rl-footer">{meta.footerNote}</div>
      </div>
    </div>
  );
}

export default LeagueShell;
