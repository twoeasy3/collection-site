// Plushie image library, stored in R2 under plushies/.
//   GET    /plushies/<file>        public (img tags can't send the admin key); falls back to public/plushies/
//   GET    /api/wr/images          admin: list
//   PUT    /api/wr/images/<file>   admin: raw image body -> R2 (replaces a same-named file)
//   DELETE /api/wr/images/<file>   admin
const PREFIX = 'plushies/';
const MAX_BYTES = 8 * 1024 * 1024;
const TYPES = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' };

const extOf = (n) => (n.split('.').pop() || '').toLowerCase();
// Safe filename: lowercase slug + original extension; no paths.
export const cleanName = (raw) => {
  const base = decodeURIComponent(String(raw || '')).split(/[\\/]/).pop();
  const ext = extOf(base);
  const stem = base.replace(/\.[^.]*$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return stem && TYPES[ext] ? `${stem}.${ext}` : null;
};

export async function handlePlushieImages(request, env, url, { json, isAuthorized }) {
  const p = url.pathname;
  if (p.startsWith('/plushies/') && request.method === 'GET') {
    const name = cleanName(p.slice('/plushies/'.length));
    const obj = name ? await env.IMAGES.get(PREFIX + name) : null;
    if (!obj) return null; // fall through to static public/plushies/
    const etag = obj.httpEtag;
    if (request.headers.get('If-None-Match') === etag) return new Response(null, { status: 304, headers: { ETag: etag } });
    return new Response(obj.body, { headers: { 'Content-Type': TYPES[extOf(name)], ETag: etag, 'Cache-Control': 'no-cache' } });
  }
  if (p !== '/api/wr/images' && !p.startsWith('/api/wr/images/')) return null;
  if (!isAuthorized(request, env)) return json({ error: 'Unauthorized' }, 401);

  if (p === '/api/wr/images' && request.method === 'GET') {
    const out = [];
    let cursor;
    do {
      const l = await env.IMAGES.list({ prefix: PREFIX, limit: 1000, cursor });
      for (const o of l.objects) out.push({ name: o.key.slice(PREFIX.length), size: o.size, uploaded: o.uploaded, v: o.etag });
      cursor = l.truncated ? l.cursor : undefined;
    } while (cursor);
    return json(out.sort((a, b) => a.name.localeCompare(b.name)));
  }
  const name = cleanName(p.slice('/api/wr/images/'.length));
  if (!name) return json({ error: 'Use a .png, .jpg, .webp or .gif file name' }, 400);
  if (request.method === 'PUT') {
    const buf = await request.arrayBuffer();
    if (!buf.byteLength) return json({ error: 'Empty file' }, 400);
    if (buf.byteLength > MAX_BYTES) return json({ error: 'Image over 8 MB' }, 413);
    await env.IMAGES.put(PREFIX + name, buf, { httpMetadata: { contentType: TYPES[extOf(name)] } });
    return json({ ok: true, name });
  }
  if (request.method === 'DELETE') { await env.IMAGES.delete(PREFIX + name); return json({ ok: true }); }
  return json({ error: 'Method not allowed' }, 405);
}
