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

// Tolerant parse for coffee_stops.visit_dates: handles a clean JSON array,
// a stray double-encoded value ("\"[]\"" -> the string "[]"), or garbage —
// always returns an array of date strings, never a bare string a caller
// could accidentally spread into individual characters.
function parseVisitDates(raw) {
  if (!raw) return [];
  try {
    let v = JSON.parse(raw);
    if (typeof v === 'string') v = JSON.parse(v);
    return Array.isArray(v) ? v.filter(d => typeof d === 'string') : [];
  } catch {
    return [];
  }
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

  // Public display: non-broken cars that have a side image in R2
  if (url.pathname === '/api/cars/public' && request.method === 'GET') {
    const listSideIds = async () => {
      const ids = new Set();
      let cursor;
      do {
        const listed = await env.IMAGES.list({ prefix: 'half_standard_cars/', limit: 1000, cursor });
        for (const obj of listed.objects) {
          const m = obj.key.match(/\/(\d+) \(1\)\.jpg$/i);
          if (m) ids.add(m[1]);
        }
        cursor = listed.truncated ? listed.cursor : undefined;
      } while (cursor);
      return ids;
    };

    const [{ results }, sideIds] = await Promise.all([
      env.DB.prepare('SELECT * FROM cars WHERE broken_image = 0').all(),
      listSideIds(),
    ]);

    return json(results.filter(r => sideIds.has(String(r.id))));
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
          'INSERT OR REPLACE INTO cars (id,year,make,model,supername,brand,series,country,category,description,broken_image,cover,name_format) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
        ).bind(c.id, c.year, c.make, c.model, c.supername, c.brand, c.series, c.country, c.category, c.description, c.broken_image, c.cover ?? 0, c.name_format ?? 0)
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

  // Upsert single car
  const carMatch = url.pathname.match(/^\/api\/cars\/(\d+)$/);
  if (carMatch && request.method === 'PUT') {
    if (!isAuthorized(request, env)) return json({ error: 'Unauthorized' }, 401);
    const c = await request.json();
    await env.DB.prepare(
      'INSERT OR REPLACE INTO cars (id,year,make,model,supername,brand,series,country,category,description,broken_image,cover,name_format) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
    ).bind(c.id, c.year, c.make, c.model, c.supername, c.brand, c.series, c.country, c.category, c.description, c.broken_image, c.cover ?? 0, c.name_format ?? 0).run();
    return json({ ok: true });
  }

  // Delete one car
  if (carMatch && request.method === 'DELETE') {
    if (!isAuthorized(request, env)) return json({ error: 'Unauthorized' }, 401);
    await env.DB.prepare('DELETE FROM cars WHERE id = ?').bind(parseInt(carMatch[1])).run();
    return json({ ok: true });
  }

  // Coffee stops: list (public)
  if (url.pathname === '/api/coffee-stops' && request.method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM coffee_stops ORDER BY id DESC').all();
    const withVisits = results.map(r => ({ ...r, visit_dates: parseVisitDates(r.visit_dates) }));
    return json(withVisits);
  }

  // Coffee stops: create
  if (url.pathname === '/api/coffee-stops' && request.method === 'POST') {
    if (!isAuthorized(request, env)) return json({ error: 'Unauthorized' }, 401);
    const s = await request.json();
    const { meta } = await env.DB.prepare(
      'INSERT INTO coffee_stops (name,lat,lng,rating,genre,price,notes,location,image_url,visit_dates) VALUES (?,?,?,?,?,?,?,?,?,?)'
    ).bind(s.name, s.lat, s.lng, s.rating ?? 0, s.genre ?? 5, s.price ?? 5, s.notes ?? '', s.location ?? '', s.image_url ?? '', JSON.stringify(Array.isArray(s.visit_dates) ? s.visit_dates : [])).run();
    return json({ ok: true, id: meta.last_row_id });
  }

  const coffeeMatch = url.pathname.match(/^\/api\/coffee-stops\/(\d+)$/);

  // Coffee stops: update
  if (coffeeMatch && request.method === 'PUT') {
    if (!isAuthorized(request, env)) return json({ error: 'Unauthorized' }, 401);
    const s = await request.json();
    await env.DB.prepare(
      'UPDATE coffee_stops SET name=?, lat=?, lng=?, rating=?, genre=?, price=?, notes=?, location=?, image_url=?, visit_dates=? WHERE id=?'
    ).bind(s.name, s.lat, s.lng, s.rating ?? 0, s.genre ?? 5, s.price ?? 5, s.notes ?? '', s.location ?? '', s.image_url ?? '', JSON.stringify(Array.isArray(s.visit_dates) ? s.visit_dates : []), parseInt(coffeeMatch[1])).run();
    return json({ ok: true });
  }

  // Coffee stops: delete
  if (coffeeMatch && request.method === 'DELETE') {
    if (!isAuthorized(request, env)) return json({ error: 'Unauthorized' }, 401);
    await env.DB.prepare('DELETE FROM coffee_stops WHERE id = ?').bind(parseInt(coffeeMatch[1])).run();
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
