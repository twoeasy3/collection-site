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

// Card rating 0-99 replaces fixed tiers: the label is just a band of the number.
export const ratingBand = (r) => (r >= 80 ? 'Main Event' : r >= 65 ? 'Upper Card' : r >= 40 ? 'Mid Card' : r >= 20 ? 'Lower Card' : 'Enhancement');
export const ratingColor = (r) => (r >= 80 ? '#d4a62a' : r >= 65 ? '#3fae6a' : r >= 40 ? '#4a90d9' : r >= 20 ? '#8a8f98' : '#6b6f76');
export const byRating = (a, b) => (b.card_rating ?? 50) - (a.card_rating ?? 50) || a.name.localeCompare(b.name);

export const ALIGNMENTS = [['face', 'Face'], ['heel', 'Heel'], ['tweener', 'Tweener']];
export const SEGMENT_KINDS = [
  ['promo', 'Promo'], ['interview', 'Interview'], ['backstage', 'Backstage angle'], ['contract_signing', 'Contract signing'],
  ['brawl', 'Brawl / attack'], ['celebration', 'Celebration'], ['video', 'Video package'], ['announcement', 'Announcement'], ['other', 'Other'],
];
export const SEGMENT_KIND_LABEL = Object.fromEntries(SEGMENT_KINDS);
// Backstage and brawl segments are "angles"; the rest are "promos". (Both are non-fights.)
export const segmentTypeOf = (kind) => (kind === 'backstage' || kind === 'brawl' ? 'angle' : 'promo');
export const FINISH_TYPES = [['pinfall', 'Pinfall'], ['submission', 'Submission'], ['dq', 'Disqualification'], ['countout', 'Count-out'], ['no_contest', 'No contest'], ['other', 'Other']];
