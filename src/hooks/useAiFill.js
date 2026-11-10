import { useCallback, useRef, useState } from 'react';
import { toAppCar, isUnnamedCar } from '../utils/carUtils';
import { aiSuggestCar, getAnthropicKey, setAnthropicKey } from '../utils/api';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// One car, with retries on 5xx (Cloudflare/D1 hiccups, Anthropic 502). Returns
// { res, body, text } where `text` is the raw response so non-JSON errors
// (e.g. Cloudflare's own error pages) can be shown instead of a bare status.
async function callWithRetry(id) {
  const delays = [2000, 5000];
  for (let attempt = 0; ; attempt++) {
    const res = await aiSuggestCar(id);
    const text = await res.text().catch(() => '');
    let body = {};
    try { body = JSON.parse(text); } catch { /* not JSON */ }
    if (res.status < 500 || attempt >= delays.length) return { res, body, text };
    await sleep(delays[attempt]);
  }
}

// Runs Claude's field guesses over cars with an empty Year, one at a time
// (each call sees the previous results, so same-casting cross-references
// improve as the run goes). Results are merged into local state field by
// field and land in the AI Suggestions tab for review.
export function useAiFill({ cars, setCars, setSelectedCar, showToast, dialog }) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(null); // { done, total, filled, skipped, failed, current }
  const [hasKey, setHasKey] = useState(() => !!getAnthropicKey());
  const stopRef = useRef(false);

  const candidates = cars.filter(c => !(c.Year || '').trim() && !isUnnamedCar(c));

  const mergeAiResult = useCallback((row) => {
    const fresh = toAppCar(row);
    const merge = (c) => (c.ID === fresh.ID
      ? { ...c, Year: fresh.Year, Series: fresh.Series, Category: fresh.Category, Description: fresh.Description, Country: fresh.Country, AiSuggested: fresh.AiSuggested, AiRejected: fresh.AiRejected }
      : c);
    setCars(prev => prev.map(merge));
    setSelectedCar(prev => (prev ? merge(prev) : prev));
  }, [setCars, setSelectedCar]);

  const handleSetKey = useCallback(async () => {
    const key = await dialog.prompt({ title: 'Anthropic API key', message: 'Paste an Anthropic API key (console.anthropic.com). Stored only in this browser and sent only to your own Worker. Leave empty to remove it.', placeholder: 'sk-ant-...', password: true, confirmLabel: 'Save' });
    if (key === null) return;
    setAnthropicKey(key.trim());
    setHasKey(!!key.trim());
    showToast(key.trim() ? 'API key saved' : 'API key removed', 'success');
  }, [dialog, showToast]);

  const run = useCallback(async (ids) => {
    if (!getAnthropicKey()) { showToast('Set your Anthropic API key first.', 'error'); return; }
    stopRef.current = false;
    setRunning(true);
    const p = { done: 0, total: ids.length, filled: 0, skipped: 0, failed: 0, streak: 0, current: '', error: '' };
    setProgress({ ...p });
    for (const id of ids) {
      if (stopRef.current) break;
      p.current = `#${id}`;
      setProgress({ ...p });
      try {
        const { res, body, text } = await callWithRetry(id);
        if (!res.ok) {
          p.failed++;
          p.streak++;
          const snippet = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
          p.error = `${res.status}: ${body.error || snippet || 'no response body'}`;
          // Auth / rate-limit / overload / missing key: every remaining car would fail too.
          if ([400, 401, 429, 529].includes(res.status)) { p.done++; break; }
          if (p.streak >= 3) { p.error += ' (stopped after 3 failures in a row)'; p.done++; break; }
        } else if (body.skipped) {
          p.streak = 0;
          p.skipped++;
        } else {
          p.streak = 0;
          p.filled++;
          mergeAiResult(body.car);
        }
      } catch {
        p.failed++;
        p.error = 'API unreachable.';
        p.done++;
        break;
      }
      p.done++;
      setProgress({ ...p });
      await sleep(300); // be gentle on the Worker/D1 between cars
    }
    setProgress({ ...p, current: '' });
    setRunning(false);
    showToast(`AI fill: ${p.filled} filled, ${p.skipped} skipped, ${p.failed} failed`, p.failed ? 'error' : 'success');
  }, [mergeAiResult, showToast]);

  const stop = useCallback(() => { stopRef.current = true; }, []);

  return { candidates, running, progress, hasKey, handleSetKey, run, stop };
}
