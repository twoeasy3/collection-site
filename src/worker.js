const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function isAuthorized(request, env) {
  if (!env.API_KEY) return false;
  const sent = (request.headers.get('Authorization') || '').trim();
  return sent === `Bearer ${env.API_KEY.trim()}`;
}

async function handleAPI(request, env, url) {
  // All makes with their countries (public)
  if (url.pathname === '/api/makes' && request.method === 'GET') {
    const { results } = await env.DB.prepare('SELECT name, countries FROM makes ORDER BY name').all();
    return json(results);
  }

  // Cars in D1 with no corresponding image in R2
  if (url.pathname === '/api/cars/missing-images' && request.method === 'GET') {
    if (!isAuthorized(request, env)) return json({ error: 'Unauthorized' }, 401);

    const listIds = async (prefix, pattern) => {
      const ids = new Set();
      let cursor;
      do {
        const listed = await env.IMAGES.list({ prefix, limit: 1000, cursor });
        for (const obj of listed.objects) {
          const m = obj.key.match(pattern);
          if (m) ids.add(m[1]);
        }
        cursor = listed.truncated ? listed.cursor : undefined;
      } while (cursor);
      return ids;
    };

    const [sideIds, heroIds] = await Promise.all([
      listIds('half_standard_cars/', /\/(\d+) \(1\)\.jpg$/i),
      listIds('standard_hero_shots/', /\/(\d+) \(2\)\.jpg$/i),
    ]);

    const { results } = await env.DB.prepare('SELECT id FROM cars').all();
    const missing = results
      .filter(r => !sideIds.has(String(r.id)) || !heroIds.has(String(r.id)))
      .map(r => ({
        id: r.id,
        missing_side: !sideIds.has(String(r.id)),
        missing_hero: !heroIds.has(String(r.id)),
      }));

    return json({ missing, dbTotal: results.length });
  }

  // Public display: non-broken cars only
  if (url.pathname === '/api/cars/public' && request.method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT * FROM cars WHERE broken_image = 0'
    ).all();
    return json(results);
  }

  // Admin: all cars
  if (url.pathname === '/api/cars' && request.method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM cars').all();
    return json(results);
  }

  // Bulk upsert — replaces all cars (save)
  if (url.pathname === '/api/cars/bulk' && request.method === 'PUT') {
    if (!isAuthorized(request, env)) return json({ error: 'Unauthorized' }, 401);
    const cars = await request.json();
    const CHUNK = 100;
    for (let i = 0; i < cars.length; i += CHUNK) {
      const stmts = cars.slice(i, i + CHUNK).map(c =>
        env.DB.prepare(
          'INSERT OR REPLACE INTO cars (id,year,make,model,supername,brand,series,country,category,description,broken_image) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
        ).bind(c.id, c.year, c.make, c.model, c.supername, c.brand, c.series, c.country, c.category, c.description, c.broken_image)
      );
      await env.DB.batch(stmts);
    }
    return json({ ok: true });
  }

  // Bulk delete
  if (url.pathname === '/api/cars/bulk-delete' && request.method === 'POST') {
    if (!isAuthorized(request, env)) return json({ error: 'Unauthorized' }, 401);
    const { ids } = await request.json();
    const stmts = ids.map(id => env.DB.prepare('DELETE FROM cars WHERE id = ?').bind(parseInt(id)));
    await env.DB.batch(stmts);
    return json({ ok: true });
  }

  // Delete one car
  const delMatch = url.pathname.match(/^\/api\/cars\/(\d+)$/);
  if (delMatch && request.method === 'DELETE') {
    if (!isAuthorized(request, env)) return json({ error: 'Unauthorized' }, 401);
    await env.DB.prepare('DELETE FROM cars WHERE id = ?').bind(parseInt(delMatch[1])).run();
    return json({ ok: true });
  }

  return json({ error: 'Not found' }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    if (url.pathname.startsWith('/api/')) {
      return handleAPI(request, env, url);
    }

    return env.ASSETS.fetch(request);
  },
};
