import { useCallback, useEffect, useMemo, useState } from 'react';
import './Wrestling.css';
import Toast from '../components/Toast';
import DialogModal from '../components/DialogModal';
import { useToast } from '../hooks/useToast';
import { useDialog } from '../hooks/useDialog';
import { getAnthropicKey, setAnthropicKey } from '../utils/api';
import { wr } from './wrApi';
import RosterTab from './tabs/RosterTab';
import BookingTab from './tabs/BookingTab';
import TitlesTab from './tabs/TitlesTab';
import StorylinesTab from './tabs/StorylinesTab';
import LogTab from './tabs/LogTab';
import TournamentsTab from './tabs/TournamentsTab';
import SetupTab from './tabs/SetupTab';

// Plushie Wrestling booking league. Admin-only: the whole page is gated on the
// same admin API key the main site uses (localStorage `adminApiKey`), and every
// /api/wr/* route re-checks it server-side. Claude booking reuses the same
// Anthropic key (localStorage `anthropicApiKey`) as the car AI fill.

const TABS = [
  ['roster', 'Roster'], ['booking', 'Booking'], ['titles', 'Titles'],
  ['storylines', 'Feuds & Teams'], ['tournaments', 'Tournaments'], ['log', 'Match Log'], ['setup', 'Setup'],
];
const readKey = () => { try { return localStorage.getItem('adminApiKey') || ''; } catch { return ''; } };

export default function Wrestling() {
  const { toast, showToast } = useToast();
  const dialog = useDialog();
  const [hasKey, setHasKey] = useState(!!readKey());
  const [state, setState] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [tab, setTab] = useState(() => { try { return localStorage.getItem('wrTab') || 'roster'; } catch { return 'roster'; } });
  const [hasAiKey, setHasAiKey] = useState(!!getAnthropicKey());
  const [logFilter, setLogFilter] = useState({});

  const reload = useCallback(async () => {
    try { setState(await wr('GET', '/state')); setLoadError(null); }
    catch (e) { setLoadError(e); }
  }, []);

  useEffect(() => { if (hasKey) reload(); }, [hasKey, reload]);
  useEffect(() => { try { localStorage.setItem('wrTab', tab); } catch { /* private mode */ } }, [tab]);

  const login = async () => {
    const key = await dialog.prompt({ title: 'Admin login', message: 'Enter the admin API key (the same one the car admin uses).', placeholder: 'API key', password: true, confirmLabel: 'Log in' });
    if (!key || !key.trim()) return;
    try { localStorage.setItem('adminApiKey', key.trim()); } catch { /* private mode */ }
    setHasKey(true);
    setLoadError(null);
    reload();
  };
  const logout = () => { try { localStorage.removeItem('adminApiKey'); } catch { /* ignore */ } setHasKey(false); setState(null); };

  const setAiKey = async () => {
    const key = await dialog.prompt({ title: 'Anthropic API key', message: 'Same key as the car AI fill. Stored only in this browser and sent only to your own Worker. Leave empty to remove it.', placeholder: 'sk-ant-...', password: true, confirmLabel: 'Save' });
    if (key === null) return;
    setAnthropicKey(key.trim());
    setHasAiKey(!!key.trim());
    showToast(key.trim() ? 'API key saved' : 'API key removed', 'success');
  };

  // Shared lookups for every tab.
  const L = useMemo(() => {
    if (!state) return null;
    const by = (arr) => Object.fromEntries(arr.map(x => [x.id, x]));
    return {
      ...state,
      wMap: by(state.wrestlers), bMap: by(state.brands), tMap: by(state.titles), sMap: by(state.shows),
      stMap: by(state.stipulations), fMap: by(state.feuds), teamMap: by(state.teams),
      brandColor: (id) => state.brands.find(b => b.id === id)?.color || '#777',
      brandName: (id) => state.brands.find(b => b.id === id)?.name || 'Free agents',
    };
  }, [state]);

  const ctx = { L, reload, showToast, dialog, hasAiKey, setAiKey, goLog: (f) => { setLogFilter(f); setTab('log'); } };
  const locked = !hasKey || loadError?.status === 401;

  return (
    <div className="wr-app">
      <header className="wr-header">
        <div className="wr-brand">🧸 <b>Plushie Wrestling</b><span>booking office</span></div>
        {!locked && (
          <nav className="wr-tabs">
            {TABS.map(([id, label]) => <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>)}
          </nav>
        )}
        <div className="wr-header-r">
          <a href="/admin" className="wr-link">← Cars admin</a>
          {!locked && <button className="wr-link" onClick={logout}>Log out</button>}
        </div>
      </header>

      <main className="wr-main">
        {locked && (
          <div className="wr-locked">
            <h2>Admin only</h2>
            <p>{loadError?.status === 401 ? 'That admin key was not accepted.' : 'This page is private. Log in with the admin API key.'}</p>
            <button className="wr-btn primary" onClick={login}>Enter admin key</button>
          </div>
        )}
        {!locked && loadError && <div className="wr-banner err">Couldn’t load the league: {loadError.message} <button className="wr-btn" onClick={reload}>Retry</button></div>}
        {!locked && !state && !loadError && <div className="wr-empty">Loading…</div>}
        {!locked && L && (
          <>
            {tab === 'roster' && <RosterTab {...ctx} />}
            {tab === 'booking' && <BookingTab {...ctx} />}
            {tab === 'titles' && <TitlesTab {...ctx} />}
            {tab === 'storylines' && <StorylinesTab {...ctx} />}
            {tab === 'tournaments' && <TournamentsTab {...ctx} />}
            {tab === 'log' && <LogTab {...ctx} filter={logFilter} setFilter={setLogFilter} />}
            {tab === 'setup' && <SetupTab {...ctx} />}
          </>
        )}
      </main>

      <Toast toast={toast} isMobile={false} />
      {dialog.active && <DialogModal key={dialog.active.id} dialog={dialog.active} onClose={dialog.close} />}
    </div>
  );
}
