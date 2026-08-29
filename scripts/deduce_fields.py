"""
AI-assisted field completion for cars with an empty Year.

Candidate set = every car in the collection with an empty `year`. For each
candidate, a vision call fills in year/series/category/description/country
for whichever of those are empty, then the collection's own data is used to
align (correct the value and/or boost the confidence of) the year guess and
to reuse an existing description from an identical "stack" mate instead of
generating a new one. Every field the script writes is tracked, with a
confidence score, in the `ai_suggested` DB column for human review — nothing
here overwrites a field that already has a value.

Two ways to supply the vision step:

1. Live, via the Anthropic API (needs `pip install anthropic` and ANTHROPIC_API_KEY):
    export ANTHROPIC_API_KEY=...
    export ADMIN_API_KEY=...        # same key the admin UI uses; not needed for --dry-run
    export API_BASE=...             # optional, defaults to production
    python scripts/deduce_fields.py --dry-run --limit 5
    python scripts/deduce_fields.py --only 101,204
    python scripts/deduce_fields.py

2. Batched, with a human/agent supplying the vision judgments manually (no anthropic
   package or ANTHROPIC_API_KEY needed):
    python scripts/deduce_fields.py --emit-batch batch.json --limit 10
    # ... fill in the "vision_result" key of each entry in batch.json ...
    python scripts/deduce_fields.py --apply-batch batch.json --dry-run
    python scripts/deduce_fields.py --apply-batch batch.json

   Each `vision_result` must match the shape the Anthropic tool call would have
   produced: {"year": {"value": "1969", "confidence": 0.9}, "series": {...}, ...},
   omitting any field the batch entry didn't ask for (see "need_fields") and
   omitting "country" whenever there's no specific reason to suggest one.
"""

import argparse
import base64
import difflib
import json
import os
import statistics
import sys
import time

import requests

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
HERO_DIR = os.path.join(REPO_ROOT, 'standard_hero_shots')
CATEGORY_ORDER_PATH = os.path.join(REPO_ROOT, 'src', 'category_order.json')

API_BASE = os.environ.get('API_BASE', 'https://collection-site.twoeasythree.workers.dev')
ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY')
ADMIN_API_KEY = os.environ.get('ADMIN_API_KEY')

MODEL = 'claude-sonnet-5'
MODEL_NAME_SIMILARITY_THRESHOLD = 0.85
YEAR_CLUSTER_MAX_SPREAD = 2
REQUEST_DELAY_SECONDS = 0.5

DESCRIPTION_GUIDANCE = """Write 1-4 lines about the real vehicle -- not the toy. Lead with substance: the story behind why this specific variant/edition exists (an anniversary, a homage, a limited-run count and the reasoning behind that number, a motorsport connection), what distinguishes this trim/spec from the standard model, or a notable heritage/performance detail. Prefer concrete specifics -- a number, a name, an event, a year -- over generic praise. Where it reads naturally, avoid opening by restating the car's own name (it's already shown elsewhere on the page), though referencing it isn't wrong if that's the clearest way in. Do not invent specifics -- if you don't have confident real knowledge of this exact vehicle's story, write something shorter and more general instead of fabricating unit counts, event names, or dates.

Example (concise, lore-first): "An homage to the founder and to celebrate the 125th anniversary of ABT. Only 64 units are available, which represents the age at which Johann Abt passed away."

Example (fuller, names the car): "The Alfa 156 GTA 3.2 V6 24V is the high-spec road version of the Alfa 156. The model was constructed to celebrate Alfa Romeo's rally successes with the 156 GTA on the Turismo circuit. The design evokes the styling of the 156 with a more sporty look and its huge engine power gives it the high maximum speed and overall excellence you would expect from the Alfa Romeo tradition."."""


def parse_json_field(val, default):
    try:
        parsed = json.loads(val) if val else default
        return parsed if isinstance(parsed, type(default)) else default
    except (ValueError, TypeError):
        return default


def similar(a, b):
    return difflib.SequenceMatcher(None, (a or '').strip().lower(), (b or '').strip().lower()).ratio()


def hero_image_path(car_id):
    return os.path.join(HERO_DIR, f'{car_id} (2).jpg')


def load_categories():
    with open(CATEGORY_ORDER_PATH, encoding='utf-8') as f:
        return json.load(f)['categories']


def fetch_cars():
    r = requests.get(f'{API_BASE}/api/cars', timeout=30)
    r.raise_for_status()
    return r.json()


def fetch_make_countries():
    r = requests.get(f'{API_BASE}/api/makes', timeout=30)
    r.raise_for_status()
    out = {}
    for row in r.json():
        out[row['name']] = parse_json_field(row.get('countries'), [])
    return out


def put_car(car_row):
    headers = {'Content-Type': 'application/json', 'Authorization': f'Bearer {ADMIN_API_KEY}'}
    r = requests.put(f"{API_BASE}/api/cars/{car_row['id']}", headers=headers, data=json.dumps(car_row), timeout=30)
    r.raise_for_status()


def build_tool_schema(need_fields):
    props = {}
    required = []
    text_field = lambda desc: {'type': 'object', 'properties': {'value': {'type': 'string', 'description': desc}, 'confidence': {'type': 'number'}}, 'required': ['value', 'confidence']}

    if 'year' in need_fields:
        props['year'] = text_field('Four-digit real-world vehicle model year')
        required.append('year')
    if 'series' in need_fields:
        props['series'] = text_field('Short series/line name')
        required.append('series')
    if 'category' in need_fields:
        props['category'] = {
            'type': 'object',
            'properties': {'value': {'type': 'array', 'items': {'type': 'string'}}, 'confidence': {'type': 'number'}},
            'required': ['value', 'confidence'],
        }
        required.append('category')
    if 'description' in need_fields:
        props['description'] = text_field('1-4 line description of the real vehicle')
        required.append('description')
    if 'country' in need_fields:
        # Intentionally NOT added to `required` -- omitting this key entirely is the expected answer most of the time.
        props['country'] = {
            'type': 'object',
            'properties': {
                'value': {'type': 'array', 'items': {'type': 'string'}, 'description': 'Additive e.g. ["GB"], or override e.g. ["~", "AU"]'},
                'confidence': {'type': 'number'},
            },
            'required': ['value', 'confidence'],
        }

    return {
        'name': 'report_fields',
        'description': 'Report suggested values for the requested empty car fields.',
        'input_schema': {'type': 'object', 'properties': props, 'required': required},
    }


def build_prompt(car, need_fields, base_countries, categories):
    lines = [
        "You are looking at a diecast/toy model car's hero photo. Vocabulary used by this project:",
        "- Make = the REAL-WORLD vehicle manufacturer (e.g. Dodge, Toyota) -- NOT the toy company.",
        "- Brand = the TOY manufacturer (Hot Wheels, Matchbox, Tomica, Majorette, etc).",
        "",
        "Known fields for this car:",
    ]
    for label, key in [('Make', 'make'), ('Model', 'model'), ('Supername', 'supername'), ('Brand', 'brand'), ('Series', 'series')]:
        val = car.get(key)
        if val:
            lines.append(f"- {label}: {val}")

    lines.append("")
    lines.append("Fill in ONLY the following fields, via the report_fields tool:")

    if 'year' in need_fields:
        lines.append(
            "- year: the REAL vehicle's model year (not a toy release year), inferred from body-style/design-era cues. "
            "If Brand+Make+Model+Supername together let you recognize this as a specific, known toy casting "
            '(e.g. "Hot Wheels 2025 Ford Mustang Dark Horse" names an exact real model-year/trim), treat that as strong '
            "corroborating evidence and push confidence toward the high end."
        )
    if 'series' in need_fields:
        lines.append("- series: a short text value for this car's series/line.")
    if 'category' in need_fields:
        lines.append(
            "- category: choose every category that genuinely applies from this exact list (use these exact strings, "
            "choose ONLY from this list): " + ", ".join(categories) + ". "
            "Categorize the way Forza Horizon/Forza Motorsport does -- a car commonly belongs to more than one class at "
            "once when it genuinely fits (e.g. a retro-styled modern hypercar could sit in both a modern-performance "
            "bucket and a retro/concept-styled one). Select every category that genuinely applies rather than forcing a "
            "single best-fit pick -- most cars will land in more than one -- but don't pad the set with a weak/loose "
            "match just to have more than one."
        )
    if 'description' in need_fields:
        lines.append("- description: " + DESCRIPTION_GUIDANCE)
    if 'country' in need_fields:
        lines.append(
            f"- country: this car's Make ({car.get('make')}) already resolves to {base_countries or '(no base countries on file)'} "
            "by default. ONLY include a country suggestion if there is a specific, known reason THIS exact vehicle deviates from "
            'that default -- e.g. it was built/designed by a different national arm (respond additively, e.g. ["GB"]) or is a '
            'distinct national variant that fully replaces the default (respond as an override, e.g. ["~", "AU"]). If there\'s no '
            "strong specific reason, omit `country` from your tool call entirely -- staying silent is the expected, correct answer "
            "most of the time."
        )

    return "\n".join(lines)


def call_vision(client, car, need_fields, base_countries, categories):
    """Live Anthropic API path. Not used by --emit-batch/--apply-batch, which take
    vision judgments from a file instead -- so `anthropic` doesn't need to be
    installed for that path."""
    with open(hero_image_path(car['id']), 'rb') as f:
        img_b64 = base64.b64encode(f.read()).decode('ascii')

    schema = build_tool_schema(need_fields)
    prompt = build_prompt(car, need_fields, base_countries, categories)

    resp = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        tools=[schema],
        tool_choice={'type': 'tool', 'name': 'report_fields'},
        messages=[{
            'role': 'user',
            'content': [
                {'type': 'image', 'source': {'type': 'base64', 'media_type': 'image/jpeg', 'data': img_b64}},
                {'type': 'text', 'text': prompt},
            ],
        }],
    )
    for block in resp.content:
        if block.type == 'tool_use' and block.name == 'report_fields':
            return block.input
    return {}


def find_year_cross_reference(car, all_cars):
    """Same Brand+Make, extremely similar Model, existing non-pending Year. Returns a
    clustered year (tight agreement) or None if there's no match / matches disagree."""
    candidates = []
    for other in all_cars:
        if str(other['id']) == str(car['id']):
            continue
        if (other.get('brand') or '') != (car.get('brand') or ''):
            continue
        if (other.get('make') or '') != (car.get('make') or ''):
            continue
        other_year = (other.get('year') or '').strip()
        if not other_year:
            continue
        if 'year' in parse_json_field(other.get('ai_suggested'), {}):
            continue  # never bootstrap off another unconfirmed guess
        if similar(other.get('model'), car.get('model')) >= MODEL_NAME_SIMILARITY_THRESHOLD:
            try:
                candidates.append(int(other_year))
            except ValueError:
                continue
    if not candidates or max(candidates) - min(candidates) > YEAR_CLUSTER_MAX_SPREAD:
        return None
    return round(statistics.median(candidates))


def find_stack_description(car, all_cars, resolved_year):
    """Exact Year+Brand+Make+Model match with a filled Description -- reuse it verbatim."""
    if not resolved_year:
        return None
    for other in all_cars:
        if str(other['id']) == str(car['id']):
            continue
        if str(other.get('year') or '').strip() != str(resolved_year).strip():
            continue
        if (other.get('brand') or '') != (car.get('brand') or ''):
            continue
        if (other.get('make') or '') != (car.get('make') or ''):
            continue
        if (other.get('model') or '') != (car.get('model') or ''):
            continue
        desc = (other.get('description') or '').strip()
        if desc:
            return desc
    return None


def determine_need_fields(car):
    need_fields = ['year']
    if not (car.get('series') or '').strip():
        need_fields.append('series')
    if not parse_json_field(car.get('category'), []):
        need_fields.append('category')
    if not (car.get('description') or '').strip():
        need_fields.append('description')
    if not parse_json_field(car.get('country'), []):
        need_fields.append('country')
    return need_fields


def process_car(car, all_cars, need_fields, result, categories):
    """Applies a vision result (however it was obtained) to `car`: aligns the year
    against same-casting cross-references, prefers an existing stack mate's
    description over a freshly generated one, and returns the updated DB row."""
    ai_suggested = parse_json_field(car.get('ai_suggested'), {})
    updated = dict(car)

    # --- year: vision first, then align against the collection's own data ---
    year_info = result.get('year')
    if year_info and str(year_info.get('value', '')).strip():
        year_value = str(year_info['value']).strip()
        year_conf = float(year_info.get('confidence', 0.5))
        xref_year = find_year_cross_reference(car, all_cars)
        if xref_year is not None:
            try:
                vision_year_int = int(year_value)
            except ValueError:
                vision_year_int = None
            if vision_year_int is not None and abs(vision_year_int - xref_year) <= 1:
                year_conf = max(year_conf, 0.95)
            else:
                year_value = str(xref_year)
                year_conf = 0.97
        updated['year'] = year_value
        ai_suggested['year'] = round(year_conf, 2)

    resolved_year = updated.get('year') or car.get('year') or ''

    # --- series ---
    if 'series' in need_fields and result.get('series'):
        updated['series'] = result['series']['value']
        ai_suggested['series'] = round(float(result['series'].get('confidence', 0.5)), 2)

    # --- category ---
    if 'category' in need_fields and result.get('category'):
        cats = [c for c in result['category'].get('value', []) if c in categories]
        if cats:
            updated['category'] = json.dumps(cats)
            ai_suggested['category'] = round(float(result['category'].get('confidence', 0.5)), 2)

    # --- description: vision generates one, but an existing stack mate's text wins ---
    if 'description' in need_fields:
        stack_desc = find_stack_description(car, all_cars, resolved_year)
        if stack_desc:
            updated['description'] = stack_desc
            ai_suggested['description'] = 0.9
        elif result.get('description'):
            text = result['description']['value'].rstrip()
            if not text.endswith('†'):
                text = f"{text} †"
            updated['description'] = text
            ai_suggested['description'] = round(float(result['description'].get('confidence', 0.5)), 2)

    # --- country: only ever written when the model actually returned a suggestion ---
    if 'country' in need_fields and result.get('country'):
        country_val = result['country'].get('value')
        if country_val:
            updated['country'] = json.dumps(country_val)
            ai_suggested['country'] = round(float(result['country'].get('confidence', 0.5)), 2)

    updated['ai_suggested'] = json.dumps(ai_suggested)
    return updated


def select_candidates(all_cars, only, limit):
    only_ids = set(only.split(',')) if only else None
    candidates = [c for c in all_cars if not (c.get('year') or '').strip()]
    if only_ids:
        candidates = [c for c in candidates if str(c['id']) in only_ids]
    if limit:
        candidates = candidates[:limit]
    return candidates


def report_result(car, updated, dry_run):
    flags = json.loads(updated['ai_suggested'])
    print(f"#{car['id']} {car.get('make')} {car.get('model')}: " + ", ".join(f"{k}={v}" for k, v in flags.items()))
    if dry_run:
        print(f"  year={updated.get('year')!r} series={updated.get('series')!r} category={updated.get('category')!r}")
        print(f"  description={updated.get('description')!r}")
        print(f"  country={updated.get('country')!r}")


def run_live(args):
    import anthropic  # only needed for this path -- --emit-batch/--apply-batch don't require it installed

    if not ANTHROPIC_API_KEY:
        sys.exit('ANTHROPIC_API_KEY is not set')
    if not args.dry_run and not ADMIN_API_KEY:
        sys.exit('ADMIN_API_KEY is not set (required unless --dry-run)')

    categories = load_categories()
    all_cars = fetch_cars()
    make_countries = fetch_make_countries()
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    id_to_index = {str(c['id']): i for i, c in enumerate(all_cars)}

    candidates = select_candidates(all_cars, args.only, args.limit)
    print(f"{len(candidates)} candidate car(s) with empty Year.")
    processed, skipped = 0, 0

    for car in candidates:
        if not os.path.exists(hero_image_path(car['id'])):
            print(f"#{car['id']}: skip (no hero image)")
            skipped += 1
            continue

        need_fields = determine_need_fields(car)
        base_countries = make_countries.get(car.get('make') or '', [])
        try:
            result = call_vision(client, car, need_fields, base_countries, categories)
            updated = process_car(car, all_cars, need_fields, result, categories)
        except Exception as e:
            print(f"#{car['id']}: ERROR {e}")
            continue

        # Keep in-memory data current so later candidates in this run can cross-reference it.
        idx = id_to_index.get(str(car['id']))
        if idx is not None:
            all_cars[idx] = updated

        report_result(car, updated, args.dry_run)
        if not args.dry_run:
            put_car(updated)
            time.sleep(REQUEST_DELAY_SECONDS)
        processed += 1

    print(f"Done. {processed} updated, {skipped} skipped (missing image).")


def run_emit_batch(args):
    """No Anthropic call here -- just prepares candidates for a human/agent to look
    at the hero image and fill in `vision_result` directly in the output file."""
    categories = load_categories()
    all_cars = fetch_cars()
    make_countries = fetch_make_countries()
    candidates = select_candidates(all_cars, args.only, args.limit)

    batch = []
    skipped = 0
    for car in candidates:
        if not os.path.exists(hero_image_path(car['id'])):
            skipped += 1
            continue
        need_fields = determine_need_fields(car)
        entry = {
            'id': car['id'],
            'hero_image': hero_image_path(car['id']),
            'make': car.get('make') or '',
            'model': car.get('model') or '',
            'supername': car.get('supername') or '',
            'brand': car.get('brand') or '',
            'series': car.get('series') or '',
            'need_fields': need_fields,
            'vision_result': None,
        }
        if 'country' in need_fields:
            entry['base_countries'] = make_countries.get(car.get('make') or '', [])
        batch.append(entry)

    with open(args.emit_batch, 'w', encoding='utf-8') as f:
        json.dump(batch, f, indent=2, ensure_ascii=False)

    print(f"Wrote {len(batch)} candidate(s) to {args.emit_batch} ({skipped} skipped, no hero image).")
    print("For each entry, look at hero_image and fill in vision_result to match the shape:")
    print('  {"year": {"value": "...", "confidence": 0.0-1.0}, "series": {...},')
    print('   "category": {"value": [...], "confidence": ...}, "description": {...},')
    print('   "country": {"value": [...], "confidence": ...}}')
    print("...only for the keys listed in that entry's need_fields; omit \"country\" entirely")
    print("unless there's a specific reason (see base_countries). Category values must come")
    print(f"from {CATEGORY_ORDER_PATH}.")
    print(f"Then run: python {os.path.basename(__file__)} --apply-batch {args.emit_batch} --dry-run")


def run_apply_batch(args):
    if not args.dry_run and not ADMIN_API_KEY:
        sys.exit('ADMIN_API_KEY is not set (required unless --dry-run)')

    with open(args.apply_batch, encoding='utf-8') as f:
        batch = json.load(f)

    categories = load_categories()
    all_cars = fetch_cars()
    id_to_index = {str(c['id']): i for i, c in enumerate(all_cars)}

    processed, pending = 0, 0
    for entry in batch:
        car_id = str(entry['id'])
        idx = id_to_index.get(car_id)
        if idx is None:
            print(f"#{car_id}: skip (no longer in the database)")
            continue
        car = all_cars[idx]
        if (car.get('year') or '').strip():
            print(f"#{car_id}: skip (already has a Year -- resolved since the batch was emitted)")
            continue
        result = entry.get('vision_result')
        if not result:
            print(f"#{car_id}: skip (vision_result not filled in yet)")
            pending += 1
            continue

        try:
            need_fields = entry.get('need_fields') or determine_need_fields(car)
            updated = process_car(car, all_cars, need_fields, result, categories)
        except Exception as e:
            print(f"#{car_id}: ERROR {e}")
            continue

        all_cars[idx] = updated
        report_result(car, updated, args.dry_run)
        if not args.dry_run:
            put_car(updated)
            time.sleep(REQUEST_DELAY_SECONDS)
        processed += 1

    print(f"Done. {processed} updated, {pending} still pending a vision_result.")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--dry-run', action='store_true', help="Print deductions without writing to the database.")
    parser.add_argument('--limit', type=int, default=None, help="Process at most N candidate cars.")
    parser.add_argument('--only', type=str, default=None, help="Comma-separated car IDs to restrict to.")
    parser.add_argument('--emit-batch', type=str, default=None, help="Write candidates to this JSON file for manual/agent vision review, instead of calling the Anthropic API.")
    parser.add_argument('--apply-batch', type=str, default=None, help="Read a batch file (with vision_result filled in) and apply it, instead of calling the Anthropic API.")
    args = parser.parse_args()

    if args.emit_batch and args.apply_batch:
        sys.exit('Use --emit-batch or --apply-batch, not both.')

    if args.emit_batch:
        run_emit_batch(args)
    elif args.apply_batch:
        run_apply_batch(args)
    else:
        run_live(args)


if __name__ == '__main__':
    main()
