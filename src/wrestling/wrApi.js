import { authHeaders, getAnthropicKey } from '../utils/api';

// Client for the admin-only wrestling API. Same admin key and same Anthropic key
// as the main site (both live in localStorage); the Anthropic key is only sent
// on the AI booking call.
export async function wr(method, path, body, { ai = false } = {}) {
  const res = await fetch(`/api/wr${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(ai ? { 'X-Anthropic-Key': getAnthropicKey() } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = {};
  try { data = JSON.parse(text); } catch { /* non-JSON (e.g. Cloudflare error page) */ }
  if (!res.ok) {
    const snippet = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140);
    const err = new Error(data.error || `HTTP ${res.status}${snippet ? `: ${snippet}` : ''}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const aiBook = (date, showId, notes) => wr('POST', '/ai-book', { date, show_id: showId, notes }, { ai: true });

export const todayISO = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
export const addDaysISO = (iso, n) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
export const weekdayOf = (iso) => new Date(`${iso}T12:00:00`).getDay();
export const daysSince = (iso, onISO = todayISO()) => (iso ? Math.round((new Date(`${onISO}T12:00:00`) - new Date(`${iso}T12:00:00`)) / 86400000) : 0);
export const prettyDate = (iso) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '');
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const TIERS = [
  ['main_event', 'Main Event'], ['upper_card', 'Upper Card'], ['mid_card', 'Mid Card'], ['lower_card', 'Lower Card'], ['enhancement', 'Enhancement'],
];
export const TIER_LABEL = Object.fromEntries(TIERS);
export const TIER_RANK = Object.fromEntries(TIERS.map(([k], i) => [k, i]));
export const FINISH_TYPES = [['pinfall', 'Pinfall'], ['submission', 'Submission'], ['dq', 'Disqualification'], ['countout', 'Count-out'], ['no_contest', 'No contest'], ['other', 'Other']];
