// Secret Santa API, mounted by src/worker.js under /api/santa/*.
//
// Entrants are identified only by the personal code the admin sends them. The
// table stores a SHA-256 of the code, never the code. After the draw, each
// giver's giftee id is stored AES-GCM-encrypted in `pairing` (with the giver's
// row id as associated data, so ciphertexts can't be swapped between rows).
// This is obfuscation, not security: it stops anyone browsing the D1 table
// (the admin included) from seeing who has whom by accident. Set a
// SANTA_SECRET worker secret to use your own key. Set it before the draw, or
// leave it unset; changing it afterwards makes existing pairings unreadable
// (reset and redraw fixes that).

const MAX_WANTS = 30;
const MAX_WANT_LEN = 300;
const MAX_NAME_LEN = 60;

const enc = new TextEncoder();
const dec = new TextDecoder();

const normalizeCode = (code) => String(code ?? '').trim().toLowerCase();

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

const hashCode = (code) => sha256Hex(`santa-code:${normalizeCode(code)}`);

async function pairingKey(env) {
  const secret = env.SANTA_SECRET || 'santa-obfuscation-v1';
  const raw = await crypto.subtle.digest('SHA-256', enc.encode(`santa-pairing:${secret}`));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

const toB64 = (bytes) => btoa(String.fromCharCode(...bytes));
const fromB64 = (s) => Uint8Array.from(atob(s), c => c.charCodeAt(0));

async function encryptPairing(key, giverId, gifteeId) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: enc.encode(String(giverId)) },
    key,
    enc.encode(String(gifteeId)),
  ));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return toB64(out);
}

async function decryptPairing(key, giverId, blob) {
  const bytes = fromB64(blob);
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: bytes.slice(0, 12), additionalData: enc.encode(String(giverId)) },
    key,
    bytes.slice(12),
  );
  return parseInt(dec.decode(pt), 10);
}

function parseWants(raw) {
  try {
    const v = JSON.parse(raw || '[]');
    return Array.isArray(v) ? v.filter(w => typeof w === 'string') : [];
  } catch {
    return [];
  }
}

function cleanWants(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map(w => String(w ?? '').trim().slice(0, MAX_WANT_LEN))
    .filter(Boolean)
    .slice(0, MAX_WANTS);
}

// Fisher-Yates with crypto randomness.
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const r = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [a[i], a[r]] = [a[r], a[i]];
  }
  return a;
}

async function isDrawn(env) {
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM santa_entrants WHERE pairing IS NOT NULL').first();
  return (row?.n ?? 0) > 0;
}

async function findByCode(env, code) {
  if (!normalizeCode(code)) return null;
  return env.DB.prepare('SELECT * FROM santa_entrants WHERE code_hash = ?').bind(await hashCode(code)).first();
}

// Everything the page needs for one entrant, giftee included once drawn.
async function viewFor(env, me) {
  const drawn = await isDrawn(env);
  const view = {
    name: me.name,
    joined: !!me.joined,
    wants: parseWants(me.wants),
    avoid: parseWants(me.avoid),
    status: drawn ? 'drawn' : 'open',
  };
  if (drawn && me.pairing) {
    const gifteeId = await decryptPairing(await pairingKey(env), me.id, me.pairing);
    const giftee = await env.DB.prepare('SELECT name, wants, avoid FROM santa_entrants WHERE id = ?').bind(gifteeId).first();
    if (giftee) view.giftee = { name: giftee.name, wants: parseWants(giftee.wants), avoid: parseWants(giftee.avoid) };
  }
  return view;
}

async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

// Returns a Response for /api/santa/* routes, or null if the path isn't ours.
export async function handleSantaAPI(request, env, url, { json, isAuthorized }) {
  const path = url.pathname;
  if (!path.startsWith('/api/santa/')) return null;
  if (request.method !== 'POST' && request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  // ---------- Entrant routes (authenticated by code, sent in the body) ----------

  if (path === '/api/santa/me' && request.method === 'POST') {
    const { code } = await readBody(request);
    const me = await findByCode(env, code);
    if (!me) return json({ error: "That code doesn't match anyone." }, 404);
    return json(await viewFor(env, me));
  }

  if (path === '/api/santa/join' && request.method === 'POST') {
    const { code, wants, avoid } = await readBody(request);
    const me = await findByCode(env, code);
    if (!me) return json({ error: "That code doesn't match anyone." }, 404);
    if (await isDrawn(env)) return json({ error: 'The pool is already closed.' }, 409);
    const w = JSON.stringify(cleanWants(wants));
    const a = JSON.stringify(cleanWants(avoid));
    await env.DB.prepare("UPDATE santa_entrants SET joined = 1, wants = ?, avoid = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(w, a, me.id).run();
    return json(await viewFor(env, { ...me, joined: 1, wants: w, avoid: a }));
  }

  if (path === '/api/santa/leave' && request.method === 'POST') {
    const { code } = await readBody(request);
    const me = await findByCode(env, code);
    if (!me) return json({ error: "That code doesn't match anyone." }, 404);
    if (await isDrawn(env)) return json({ error: "The draw has happened, so you can't leave now." }, 409);
    await env.DB.prepare("UPDATE santa_entrants SET joined = 0, updated_at = datetime('now') WHERE id = ?").bind(me.id).run();
    return json(await viewFor(env, { ...me, joined: 0 }));
  }

  // Editing your wishlist and don't-buy list is allowed before and after the draw (your Santa
  // sees the latest version).
  if (path === '/api/santa/wants' && request.method === 'POST') {
    const { code, wants, avoid } = await readBody(request);
    const me = await findByCode(env, code);
    if (!me) return json({ error: "That code doesn't match anyone." }, 404);
    if (!me.joined) return json({ error: "You haven't joined." }, 409);
    const w = JSON.stringify(cleanWants(wants));
    const a = JSON.stringify(cleanWants(avoid));
    await env.DB.prepare("UPDATE santa_entrants SET wants = ?, avoid = ?, updated_at = datetime('now') WHERE id = ?").bind(w, a, me.id).run();
    return json(await viewFor(env, { ...me, wants: w, avoid: a }));
  }

  // ---------- Admin routes (Bearer API_KEY). Never return pairings. ----------

  if (path.startsWith('/api/santa/admin/')) {
    if (!isAuthorized(request, env)) return json({ error: 'Unauthorized' }, 401);

    if (path === '/api/santa/admin/status' && request.method === 'GET') {
      const { results } = await env.DB.prepare('SELECT id, name, joined, wants FROM santa_entrants ORDER BY name COLLATE NOCASE').all();
      return json({
        status: (await isDrawn(env)) ? 'drawn' : 'open',
        entrants: results.map(r => ({ id: r.id, name: r.name, joined: !!r.joined, wantCount: parseWants(r.wants).length })),
      });
    }

    // Body: [{ name, code }, ...]. Adds new codes and renames existing ones;
    // never touches joined/wants. Only before the draw.
    if (path === '/api/santa/admin/import' && request.method === 'POST') {
      if (await isDrawn(env)) return json({ error: 'Reset the draw before importing.' }, 409);
      const list = await readBody(request);
      if (!Array.isArray(list)) return json({ error: 'Expected a JSON array of { name, code }.' }, 400);
      const rows = [];
      const seen = new Set();
      for (const item of list) {
        const name = String(item?.name ?? '').trim().slice(0, MAX_NAME_LEN);
        const code = normalizeCode(item?.code);
        if (!name || !code) return json({ error: `Every entry needs a name and a code (problem near "${name || code || '?'}").` }, 400);
        if (seen.has(code)) return json({ error: `Duplicate code for "${name}".` }, 400);
        seen.add(code);
        rows.push({ name, hash: await hashCode(code) });
      }
      if (rows.length) {
        await env.DB.batch(rows.map(r => env.DB.prepare(
          "INSERT INTO santa_entrants (name, code_hash) VALUES (?, ?) ON CONFLICT(code_hash) DO UPDATE SET name = excluded.name, updated_at = datetime('now')"
        ).bind(r.name, r.hash)));
      }
      return json({ ok: true, count: rows.length });
    }

    if (path === '/api/santa/admin/remove' && request.method === 'POST') {
      if (await isDrawn(env)) return json({ error: 'Reset the draw before removing anyone.' }, 409);
      const { id } = await readBody(request);
      await env.DB.prepare('DELETE FROM santa_entrants WHERE id = ?').bind(parseInt(id, 10)).run();
      return json({ ok: true });
    }

    // Close the pool: everyone joined goes into one shuffled loop, each giving
    // to the next and the last giving to the first. A single cycle, so no
    // closed-off pairs or sub-groups.
    if (path === '/api/santa/admin/draw' && request.method === 'POST') {
      if (await isDrawn(env)) return json({ error: 'Already drawn.' }, 409);
      const { results } = await env.DB.prepare('SELECT id FROM santa_entrants WHERE joined = 1').all();
      if (results.length < 3) return json({ error: `Need at least 3 people to draw (${results.length} joined).` }, 400);
      const order = shuffle(results.map(r => r.id));
      const key = await pairingKey(env);
      const stmts = [];
      for (let i = 0; i < order.length; i++) {
        const giver = order[i];
        const giftee = order[(i + 1) % order.length];
        stmts.push(env.DB.prepare('UPDATE santa_entrants SET pairing = ? WHERE id = ?')
          .bind(await encryptPairing(key, giver, giftee), giver));
      }
      await env.DB.batch(stmts);
      return json({ ok: true, count: order.length });
    }

    // Reopen the pool, discarding the draw. Joins and wishlists are kept.
    if (path === '/api/santa/admin/reset' && request.method === 'POST') {
      await env.DB.prepare('UPDATE santa_entrants SET pairing = NULL').run();
      return json({ ok: true });
    }
  }

  return json({ error: 'Not found' }, 404);
}
