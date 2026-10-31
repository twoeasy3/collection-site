import { useCallback, useEffect, useState } from 'react';

// Admin controls for the Secret Santa (shown at /secret-santa?admin). Uses the
// same adminApiKey as the rest of the site. Deliberately shows only who has
// joined, never who has whom.

const EXAMPLE = '[\n  { "name": "Alex", "code": "jingle-42" },\n  { "name": "Sam", "code": "tinsel-07" }\n]';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('adminApiKey') || ''}`,
});

async function adminCall(path, { method = 'POST', body } = {}) {
  const res = await fetch(`/api/santa/admin/${path}`, {
    method,
    headers: authHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status}).`);
  return data;
}

function AdminPanel() {
  const [hasKey, setHasKey] = useState(() => !!localStorage.getItem('adminApiKey'));
  const [state, setState] = useState(null);
  const [importText, setImportText] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    try {
      setState(await adminCall('status', { method: 'GET' }));
    } catch (e) {
      setMessage(e.message);
    }
  }, []);

  useEffect(() => { if (hasKey) refresh(); }, [hasKey, refresh]);

  const run = async (fn, okMessage) => {
    setBusy(true);
    setMessage('');
    try {
      const r = await fn();
      setMessage(typeof okMessage === 'function' ? okMessage(r) : okMessage);
      await refresh();
      return true;
    } catch (e) {
      setMessage(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const login = () => {
    const key = window.prompt('Enter admin key');
    if (!key) return;
    localStorage.setItem('adminApiKey', key.trim());
    setHasKey(true);
  };

  const doImport = () => {
    let list;
    try {
      list = JSON.parse(importText);
    } catch {
      setMessage('That isn’t valid JSON.');
      return;
    }
    run(() => adminCall('import', { body: list }), r => `Imported ${r.count} entrant${r.count === 1 ? '' : 's'}.`)
      .then(ok => { if (ok) setImportText(''); });
  };

  const draw = () => {
    const n = state?.entrants.filter(e => e.joined).length ?? 0;
    if (!window.confirm(`Close the pool and draw names for the ${n} people who joined? Nobody else can join after this.`)) return;
    run(() => adminCall('draw'), r => `Drawn. ${r.count} people are in one loop.`);
  };

  const reset = () => {
    if (!window.confirm('Throw away the current draw and reopen the pool? Everyone will get a new person when you draw again. Joins and wishlists are kept.')) return;
    run(() => adminCall('reset'), 'Draw cleared. The pool is open again.');
  };

  const remove = (entrant) => {
    if (!window.confirm(`Remove ${entrant.name} and their code entirely?`)) return;
    run(() => adminCall('remove', { body: { id: entrant.id } }), `Removed ${entrant.name}.`);
  };

  if (!hasKey) {
    return (
      <section className="ss-card ss-admin">
        <h2 className="ss-h2">Admin</h2>
        <button className="ss-btn" onClick={login}>Log in</button>
      </section>
    );
  }

  const drawn = state?.status === 'drawn';
  const joined = state?.entrants.filter(e => e.joined) ?? [];

  return (
    <section className="ss-card ss-admin">
      <div className="ss-admin-head">
        <h2 className="ss-h2">Admin</h2>
        <span className={`ss-pill ${drawn ? 'ss-pill-closed' : 'ss-pill-open'}`}>{drawn ? 'Drawn, pool closed' : 'Pool open'}</span>
      </div>

      {state && (
        <>
          <p className="ss-muted">{joined.length} of {state.entrants.length} joined.</p>
          <ul className="ss-entrants">
            {state.entrants.map(e => (
              <li key={e.id}>
                <span className={e.joined ? 'ss-dot ss-dot-on' : 'ss-dot'} aria-hidden="true" />
                <span className="ss-entrant-name">{e.name}</span>
                <span className="ss-muted">{e.joined ? `joined · ${e.wantCount} wish${e.wantCount === 1 ? '' : 'es'}` : 'not joined'}</span>
                {!drawn && <button className="ss-icon-btn" title={`Remove ${e.name}`} disabled={busy} onClick={() => remove(e)}>×</button>}
              </li>
            ))}
          </ul>

          <div className="ss-actions">
            {!drawn && <button className="ss-btn ss-btn-primary" disabled={busy || joined.length < 3} onClick={draw}>Close pool and draw</button>}
            {drawn && <button className="ss-btn ss-btn-danger" disabled={busy} onClick={reset}>Reset draw</button>}
            <button className="ss-btn" disabled={busy} onClick={refresh}>Refresh</button>
          </div>

          {!drawn && (
            <>
              <h3 className="ss-h3">Import entrants</h3>
              <p className="ss-muted">Paste a JSON list of names and codes. New codes are added and existing ones are renamed; nobody’s wishlist or join status changes. Codes ignore case and surrounding spaces, and only a hash of each one is stored.</p>
              <textarea
                className="ss-input ss-textarea"
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder={EXAMPLE}
                spellCheck={false}
                rows={6}
              />
              <div className="ss-actions">
                <button className="ss-btn" disabled={busy || !importText.trim()} onClick={doImport}>Import</button>
              </div>
            </>
          )}
        </>
      )}

      {message && <p className="ss-note">{message}</p>}
    </section>
  );
}

export default AdminPanel;
