// AI field completion: asks Claude (vision) to guess the empty fields of one car
// from its hero photo, then aligns the guess with the collection's own data.
// Ported from the old local-only scripts/deduce_fields.py.
//
//   POST /api/cars/:id/ai-suggest   (admin Bearer key required)
//
// Every field written is recorded with a confidence in cars.ai_suggested so it
// shows up in Maintenance -> AI Suggestions for approve/reject. Fields that
// already have a value are never touched.
//
// Anthropic key (an *API* key from console.anthropic.com): normally sent by the
// admin's browser in the X-Anthropic-Key header (stored in localStorage like the
// admin key). Falls back to a Worker secret (`wrangler secret put ANTHROPIC_API_KEY`)
// if no header is sent. The key is never stored or logged server-side.
// Optional var: AI_MODEL (defaults to DEFAULT_MODEL below).

import categoryOrder from './category_order.json';

const DEFAULT_MODEL = 'claude-sonnet-5-5';
const MODEL_NAME_SIMILARITY_THRESHOLD = 0.85;
const YEAR_CLUSTER_MAX_SPREAD = 2;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // Anthropic's per-image limit
const CATEGORIES = categoryOrder.categories;

const DESCRIPTION_GUIDANCE = `Write 1-4 lines about the real vehicle -- not the toy. Lead with substance: the story behind why this specific variant/edition exists (an anniversary, a homage, a limited-run count and the reasoning behind that number, a motorsport connection), what distinguishes this trim/spec from the standard model, or a notable heritage/performance detail. Prefer concrete specifics -- a number, a name, an event, a year -- over generic praise. Where it reads naturally, avoid opening by restating the car's own name (it's already shown elsewhere on the page), though referencing it isn't wrong if that's the clearest way in. Do not invent specifics -- if you don't have confident real knowledge of this exact vehicle's story, write something shorter and more general instead of fabricating unit counts, event names, or dates.

Example (concise, lore-first): "An homage to the founder and to celebrate the 125th anniversary of ABT. Only 64 units are available, which represents the age at which Johann Abt passed away."

Example (fuller, names the car): "The Alfa 156 GTA 3.2 V6 24V is the high-spec road version of the Alfa 156. The model was constructed to celebrate Alfa Romeo's rally successes with the 156 GTA on the Turismo circuit. The design evokes the styling of the 156 with a more sporty look and its huge engine power gives it the high maximum speed and overall excellence you would expect from the Alfa Romeo tradition."`;

const parseJson = (val, fallback) => {
  try {
    const parsed = val ? JSON.parse(val) : fallback;
    return Array.isArray(fallback) === Array.isArray(parsed) && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
};

// Ratcliff/Obershelp ratio, same measure as Python's difflib.SequenceMatcher.ratio().
function matchingChars(a, b) {
  if (!a.length || !b.length) return 0;
  let best = 0, ai = 0, bi = 0;
  let prev = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    const cur = new Array(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        cur[j] = prev[j - 1] + 1;
        if (cur[j] > best) { best = cur[j]; ai = i; bi = j; }
      }
    }
    prev = cur;
  }
  if (!best) return 0;
  return best
    + matchingChars(a.slice(0, ai - best), b.slice(0, bi - best))
    + matchingChars(a.slice(ai), b.slice(bi));
}
function similar(a, b) {
  const x = (a || '').trim().toLowerCase();
  const y = (b || '').trim().toLowerCase();
  if (!x.length && !y.length) return 1;
  return (2 * matchingChars(x, y)) / (x.length + y.length);
}

const median = (nums) => {
  const s = [...nums].sort((p, q) => p - q);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

function findYearCrossReference(car, others) {
  const years = [];
  for (const o of others) {
    if (String(o.id) === String(car.id)) continue;
    if ((o.brand || '') !== (car.brand || '') || (o.make || '') !== (car.make || '')) continue;
    const y = (o.year || '').trim();
    if (!y) continue;
    if ('year' in parseJson(o.ai_suggested, {})) continue; // never bootstrap off another unconfirmed guess
    if (similar(o.model, car.model) >= MODEL_NAME_SIMILARITY_THRESHOLD) {
      const n = parseInt(y, 10);
      if (!Number.isNaN(n)) years.push(n);
    }
  }
  if (!years.length || Math.max(...years) - Math.min(...years) > YEAR_CLUSTER_MAX_SPREAD) return null;
  return Math.round(median(years));
}

function findStackDescription(car, others, year) {
  if (!year) return null;
  for (const o of others) {
    if (String(o.id) === String(car.id)) continue;
    if (String(o.year || '').trim() !== String(year).trim()) continue;
    if ((o.brand || '') !== (car.brand || '') || (o.make || '') !== (car.make || '') || (o.model || '') !== (car.model || '')) continue;
    const d = (o.description || '').trim();
    if (d) return d;
  }
  return null;
}

function determineNeedFields(car) {
  const need = [];
  if (!(car.year || '').trim()) need.push('year');
  if (!(car.series || '').trim()) need.push('series');
  if (!parseJson(car.category, []).length) need.push('category');
  if (!(car.description || '').trim()) need.push('description');
  if (!parseJson(car.country, []).length) need.push('country');
  return need;
}

const textField = (desc) => ({
  type: 'object',
  properties: { value: { type: 'string', description: desc }, confidence: { type: 'number' } },
  required: ['value', 'confidence'],
});
const listField = (desc, items = { type: 'string' }) => ({
  type: 'object',
  properties: { value: { type: 'array', items, description: desc }, confidence: { type: 'number' } },
  required: ['value', 'confidence'],
});

function buildTool(need) {
  const properties = {};
  const required = [];
  if (need.includes('year')) { properties.year = textField('Four-digit real-world vehicle model year'); required.push('year'); }
  if (need.includes('series')) { properties.series = textField('Short series/line name'); required.push('series'); }
  if (need.includes('category')) { properties.category = listField('Categories from the provided list'); required.push('category'); }
  if (need.includes('description')) { properties.description = textField('1-4 line description of the real vehicle'); required.push('description'); }
  // Deliberately not required: omitting country is the expected answer most of the time.
  if (need.includes('country')) properties.country = listField('Additive e.g. ["GB"], or override e.g. ["~", "AU"]');
  return {
    name: 'report_fields',
    description: 'Report suggested values for the requested empty car fields.',
    input_schema: { type: 'object', properties, required },
  };
}

function buildPrompt(car, need, baseCountries) {
  const lines = [
    "You are looking at a diecast/toy model car's hero photo. Vocabulary used by this project:",
    '- Make = the REAL-WORLD vehicle manufacturer (e.g. Dodge, Toyota) -- NOT the toy company.',
    '- Brand = the TOY manufacturer (Hot Wheels, Matchbox, Tomica, Majorette, etc).',
    '',
    'Known fields for this car:',
  ];
  for (const [label, key] of [['Make', 'make'], ['Model', 'model'], ['Supername', 'supername'], ['Brand', 'brand'], ['Series', 'series'], ['Year', 'year']]) {
    if (car[key]) lines.push(`- ${label}: ${car[key]}`);
  }
  if ((car.ai_rejected || '').trim()) {
    lines.push('', `A previous AI suggestion for this car was rejected by the owner with this note -- take it into account and don't repeat the mistake: "${car.ai_rejected.trim()}"`);
  }
  lines.push('', 'Respond ONLY by calling the report_fields tool (no other text). Fill in ONLY the following fields:');
  if (need.includes('year')) {
    lines.push(
      "- year: the REAL vehicle's model year (not a toy release year), inferred from body-style/design-era cues. " +
      'If Brand+Make+Model+Supername together let you recognize this as a specific, known toy casting ' +
      '(e.g. "Hot Wheels 2025 Ford Mustang Dark Horse" names an exact real model-year/trim), treat that as strong ' +
      'corroborating evidence and push confidence toward the high end.'
    );
  }
  if (need.includes('series')) lines.push("- series: a short text value for this car's series/line.");
  if (need.includes('category')) {
    lines.push(
      '- category: choose every category that genuinely applies from this exact list (use these exact strings, ' +
      `choose ONLY from this list): ${CATEGORIES.join(', ')}. ` +
      'Categorize the way Forza Horizon/Forza Motorsport does -- a car commonly belongs to more than one class at ' +
      'once when it genuinely fits. Select every category that genuinely applies rather than forcing a single ' +
      "best-fit pick, but don't pad the set with a weak/loose match just to have more than one."
    );
  }
  if (need.includes('description')) lines.push(`- description: ${DESCRIPTION_GUIDANCE}`);
  if (need.includes('country')) {
    lines.push(
      `- country: this car's Make (${car.make}) already resolves to ${JSON.stringify(baseCountries)} by default. ` +
      'ONLY include a country suggestion if there is a specific, known reason THIS exact vehicle deviates from that default -- ' +
      'e.g. it was built/designed by a different national arm (respond additively, e.g. ["GB"]) or is a distinct national ' +
      'variant that fully replaces the default (respond as an override, e.g. ["~", "AU"]). If there is no strong specific ' +
      'reason, omit `country` from your tool call entirely -- staying silent is the expected, correct answer most of the time.'
    );
  }
  return lines.join('\n');
}

function toBase64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function callClaude(apiKey, model, imageB64, prompt, tool) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      max_tokens: 1024,
      tools: [tool],
      // Forced tool_choice ({type:'tool'}) is rejected by newer models, so leave it on auto
      // and instruct the model in the prompt to answer via the tool.
      tool_choice: { type: 'auto' },
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageB64 } },
          { type: 'text', text: prompt },
        ],
      }],
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    const err = new Error(`Anthropic API ${res.status}: ${detail.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const block = (data.content || []).find(b => b.type === 'tool_use' && b.name === tool.name);
  if (!block) {
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join(' ').slice(0, 200);
    throw new Error(`Claude did not call ${tool.name}${text ? `: ${text}` : ''}`);
  }
  return block.input;
}

const conf = (info, fallback = 0.5) => {
  const n = Number(info?.confidence);
  return Math.round((Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : fallback) * 100) / 100;
};

// Applies a model result to `car`, returning the columns to write.
function applyResult(car, others, need, result) {
  const aiSuggested = parseJson(car.ai_suggested, {});
  const out = {
    year: car.year || '', series: car.series || '', category: car.category || '[]',
    description: car.description || '', country: car.country || '[]',
  };

  if (need.includes('year') && String(result.year?.value ?? '').trim()) {
    let year = String(result.year.value).trim();
    let c = conf(result.year);
    const xref = findYearCrossReference(car, others);
    if (xref !== null) {
      const v = parseInt(year, 10);
      if (!Number.isNaN(v) && Math.abs(v - xref) <= 1) c = Math.max(c, 0.95);
      else { year = String(xref); c = 0.97; }
    }
    out.year = year;
    aiSuggested.year = c;
  }
  const resolvedYear = out.year;

  if (need.includes('series') && String(result.series?.value ?? '').trim()) {
    out.series = String(result.series.value).trim();
    aiSuggested.series = conf(result.series);
  }

  if (need.includes('category') && Array.isArray(result.category?.value)) {
    const cats = result.category.value.filter(c => CATEGORIES.includes(c));
    if (cats.length) { out.category = JSON.stringify(cats); aiSuggested.category = conf(result.category); }
  }

  if (need.includes('description')) {
    const stack = findStackDescription(car, others, resolvedYear);
    if (stack) {
      out.description = stack;
      aiSuggested.description = 0.9;
    } else if (String(result.description?.value ?? '').trim()) {
      let text = String(result.description.value).trimEnd();
      if (!text.endsWith('†')) text += ' †'; // † marks AI-written text
      out.description = text;
      aiSuggested.description = conf(result.description);
    }
  }

  if (need.includes('country') && Array.isArray(result.country?.value) && result.country.value.length) {
    out.country = JSON.stringify(result.country.value);
    aiSuggested.country = conf(result.country);
  }

  return { ...out, ai_suggested: JSON.stringify(aiSuggested) };
}

async function suggestForCar(env, id, apiKey) {
  if (!apiKey) {
    return { status: 400, body: { error: 'No Anthropic API key. Set one with the "Set API key" button in Maintenance -> AI Suggestions.' } };
  }
  const car = await env.DB.prepare('SELECT * FROM cars WHERE id = ?').bind(id).first();
  if (!car) return { status: 404, body: { error: 'Car not found' } };

  const need = determineNeedFields(car);
  if (!need.length) return { status: 200, body: { skipped: 'nothing to fill', car } };

  const hero = await env.IMAGES.get(`standard_hero_shots/${id} (2).jpg`);
  if (!hero) return { status: 200, body: { skipped: 'no hero image', car } };
  if (hero.size > MAX_IMAGE_BYTES) return { status: 200, body: { skipped: 'hero image over 5MB', car } };

  const [{ results: others }, makeRow] = await Promise.all([
    env.DB.prepare('SELECT id, year, make, model, brand, description, ai_suggested FROM cars WHERE make = ? AND brand = ?').bind(car.make || '', car.brand || '').all(),
    env.DB.prepare('SELECT countries FROM makes WHERE name = ?').bind(car.make || '').first(),
  ]);
  const baseCountries = parseJson(makeRow?.countries, []);

  const result = await callClaude(apiKey, env.AI_MODEL, toBase64(await hero.arrayBuffer()), buildPrompt(car, need, baseCountries), buildTool(need));
  const fields = applyResult(car, others, need, result);

  // Targeted UPDATE (not INSERT OR REPLACE) so nothing else on the row is touched.
  // ai_rejected is cleared: the note has now been shown to the model.
  await env.DB.prepare(
    "UPDATE cars SET year=?, series=?, category=?, description=?, country=?, ai_suggested=?, ai_rejected='' WHERE id=?"
  ).bind(fields.year, fields.series, fields.category, fields.description, fields.country, fields.ai_suggested, id).run();

  const updated = await env.DB.prepare('SELECT * FROM cars WHERE id = ?').bind(id).first();
  return { status: 200, body: { ok: true, filled: need, car: updated } };
}

export async function handleAiAPI(request, env, url, { json, isAuthorized }) {
  const m = url.pathname.match(/^\/api\/cars\/(\d+)\/ai-suggest$/);
  if (!m || request.method !== 'POST') return null;
  if (!isAuthorized(request, env)) return json({ error: 'Unauthorized' }, 401);
  try {
    const apiKey = (request.headers.get('X-Anthropic-Key') || env.ANTHROPIC_API_KEY || '').trim();
    const { status, body } = await suggestForCar(env, parseInt(m[1], 10), apiKey);
    return json(body, status);
  } catch (e) {
    // 401/429/529 from Anthropic pass through so the client can stop a batch run.
    const status = [401, 429, 529].includes(e.status) ? e.status : 502;
    return json({ error: e.message || String(e) }, status);
  }
}
