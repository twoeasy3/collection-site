import { useEffect, useState } from 'react';
import './SecretSanta.css';
import AdminPanel from './AdminPanel';

// Private Secret Santa page. Each friend gets a personal code: entering it
// joins the pool and lets them write a wishlist. Once the admin closes the
// pool (the draw), the same code shows who they're buying for.
// Add ?admin to the URL for the admin panel.

const CODE_KEY = 'santaCode';

const readStored = () => {
  try { return localStorage.getItem(CODE_KEY) || ''; } catch { return ''; }
};
const writeStored = (code) => {
  try { code ? localStorage.setItem(CODE_KEY, code) : localStorage.removeItem(CODE_KEY); } catch { /* private mode */ }
};

async function post(path, body) {
  const res = await fetch(`/api/santa/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Something went wrong (${res.status}).`);
  return data;
}

function WantsEditor({ wants, onChange, disabled }) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const w = draft.trim();
    if (!w) return;
    onChange([...wants, w]);
    setDraft('');
  };

  return (
    <div className="ss-wants-editor">
      {wants.length > 0 && (
        <ul className="ss-wants-list">
          {wants.map((w, i) => (
            <li key={i}>
              <input
                className="ss-input"
                value={w}
                disabled={disabled}
                onChange={e => onChange(wants.map((x, j) => (j === i ? e.target.value : x)))}
              />
              <button className="ss-icon-btn" disabled={disabled} title="Remove" onClick={() => onChange(wants.filter((_, j) => j !== i))}>×</button>
            </li>
          ))}
        </ul>
      )}
      <div className="ss-add-row">
        <input
          className="ss-input"
          value={draft}
          disabled={disabled}
          placeholder={wants.length ? 'Add another…' : 'Something you’d like, a size, a link, a hint…'}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          onBlur={add}
        />
        <button className="ss-btn" disabled={disabled || !draft.trim()} onClick={add}>Add</button>
      </div>
    </div>
  );
}

function WantsView({ wants }) {
  if (!wants.length) return <p className="ss-muted">No wishlist yet. Check back later, or go with your gut.</p>;
  return (
    <ul className="ss-wants-readonly">
      {wants.map((w, i) => <li key={i}>{w}</li>)}
    </ul>
  );
}

// Your own wishlist with a save button (shown whenever you're joined).
function MyWishlist({ code, view, setView, title, hint }) {
  const [wants, setWants] = useState(view.wants);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const dirty = JSON.stringify(wants.map(w => w.trim()).filter(Boolean)) !== JSON.stringify(view.wants);

  useEffect(() => { setWants(view.wants); }, [view.wants]);

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      const next = await post('wants', { code, wants });
      setView(next);
      setMessage('Saved.');
    } catch (e) {
      setMessage(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="ss-card">
      <h2 className="ss-h2">{title}</h2>
      <p className="ss-muted">{hint}</p>
      <WantsEditor wants={wants} onChange={w => { setWants(w); setMessage(''); }} disabled={saving} />
      <div className="ss-actions">
        <button className="ss-btn ss-btn-primary" disabled={saving || !dirty} onClick={save}>{saving ? 'Saving…' : 'Save wishlist'}</button>
        {message && <span className="ss-note">{message}</span>}
      </div>
    </section>
  );
}

function JoinCard({ code, view, setView }) {
  const [wants, setWants] = useState(view.wants);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const join = async () => {
    setBusy(true);
    setError('');
    try {
      setView(await post('join', { code, wants }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="ss-card">
      <h2 className="ss-h2">Join the Secret Santa?</h2>
      <p className="ss-muted">Add a few things you’d like. You can change them any time, even after names are drawn.</p>
      <WantsEditor wants={wants} onChange={setWants} disabled={busy} />
      <div className="ss-actions">
        <button className="ss-btn ss-btn-primary" disabled={busy} onClick={join}>{busy ? 'Joining…' : 'I’m in'}</button>
        {error && <span className="ss-error">{error}</span>}
      </div>
    </section>
  );
}

function GifteeCard({ giftee }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <section className="ss-card ss-giftee">
      <h2 className="ss-h2">You’re buying for…</h2>
      {revealed ? (
        <>
          <div className="ss-giftee-name">{giftee.name}</div>
          <h3 className="ss-h3">Their wishlist</h3>
          <WantsView wants={giftee.wants} />
          <button className="ss-link-btn" onClick={() => setRevealed(false)}>Hide</button>
        </>
      ) : (
        <button className="ss-reveal" onClick={() => setRevealed(true)}>
          <span className="ss-reveal-icon" aria-hidden="true">🎁</span>
          Tap to reveal
        </button>
      )}
    </section>
  );
}

function SecretSanta() {
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('theme') || 'dark'; } catch { return 'dark'; } });
  const [code, setCode] = useState(readStored);
  const [codeInput, setCodeInput] = useState('');
  const [view, setView] = useState(null);
  const [loading, setLoading] = useState(!!readStored());
  const [error, setError] = useState('');
  const [leaving, setLeaving] = useState(false);
  const isAdmin = new URLSearchParams(window.location.search).has('admin');

  useEffect(() => { document.title = 'Secret Santa'; }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('theme', theme); } catch { /* private mode */ }
  }, [theme]);

  const lookUp = async (c) => {
    setLoading(true);
    setError('');
    try {
      const v = await post('me', { code: c });
      setCode(c);
      writeStored(c);
      setView(v);
    } catch (e) {
      setError(e.message);
      setCode('');
      writeStored('');
      setView(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const stored = readStored();
    if (stored) lookUp(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = () => {
    writeStored('');
    setCode('');
    setCodeInput('');
    setView(null);
    setError('');
  };

  const leave = async () => {
    if (!window.confirm('Leave the Secret Santa? You can rejoin until names are drawn.')) return;
    setLeaving(true);
    try {
      setView(await post('leave', { code }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLeaving(false);
    }
  };

  let body;
  if (loading) {
    body = <section className="ss-card"><p className="ss-muted">Checking your code…</p></section>;
  } else if (!view) {
    body = (
      <section className="ss-card">
        <h2 className="ss-h2">Enter your code</h2>
        <p className="ss-muted">Use the code you were sent.</p>
        <form className="ss-add-row" onSubmit={e => { e.preventDefault(); if (codeInput.trim()) lookUp(codeInput.trim()); }}>
          <input
            className="ss-input ss-code-input"
            value={codeInput}
            onChange={e => setCodeInput(e.target.value)}
            placeholder="Your code"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
          />
          <button className="ss-btn ss-btn-primary" type="submit" disabled={!codeInput.trim()}>Go</button>
        </form>
        {error && <p className="ss-error">{error}</p>}
      </section>
    );
  } else {
    const { status, joined, giftee } = view;
    body = (
      <>
        <div className="ss-greeting">
          <span>Hi <strong>{view.name}</strong></span>
          <button className="ss-link-btn" onClick={signOut}>Not you?</button>
        </div>

        {status === 'open' && !joined && <JoinCard code={code} view={view} setView={setView} />}

        {status === 'open' && joined && (
          <>
            <section className="ss-card ss-status">
              <h2 className="ss-h2">You’re in ✓</h2>
              <p className="ss-muted">Names haven’t been drawn yet. Come back with the same code once they are to see who you’re buying for.</p>
              <button className="ss-link-btn" disabled={leaving} onClick={leave}>Leave the pool</button>
            </section>
            <MyWishlist code={code} view={view} setView={setView} title="Your wishlist" hint="Your Secret Santa will see this list." />
          </>
        )}

        {status === 'drawn' && joined && giftee && (
          <>
            <GifteeCard giftee={giftee} />
            <MyWishlist code={code} view={view} setView={setView} title="Your own wishlist" hint="Your Secret Santa sees the latest version, so you can still change it." />
          </>
        )}

        {status === 'drawn' && !(joined && giftee) && (
          <section className="ss-card">
            <h2 className="ss-h2">The pool is closed</h2>
            <p className="ss-muted">Names were drawn without you this time. Ask the organiser if this looks wrong.</p>
          </section>
        )}

        {error && <p className="ss-error">{error}</p>}
      </>
    );
  }

  return (
    <div className="ss-page">
      <header className="ss-header">
        <h1 className="ss-title">🎅 Secret Santa</h1>
        <button className="ss-btn" onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))} aria-label="Toggle theme">
          {theme === 'dark' ? '☀' : '●'}
        </button>
      </header>
      <main className="ss-main">
        {body}
        {isAdmin && <AdminPanel />}
      </main>
    </div>
  );
}

export default SecretSanta;
