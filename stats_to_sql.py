import json

# public/car_stats.json (written by stats_draft/finalize.py) -> stats_import.sql
# for the vehicle_stats table. Re-runnable: base always takes the new pipeline
# values, but rows edited on the site (edited = 1) keep their stats.

FIELDS = ['cl', 'ar', 'ts', 'ac', 'ha', 'ni', 'st', 'cr', 'hd']

with open('./public/car_stats.json', encoding='utf-8') as f:
    by_key = json.load(f)['byKey']

def sql_str(v):
    return "'" + str(v).replace("'", "''") + "'"

def sql_val(field, v):
    return sql_str(v) if field in ('cl', 'ar') else repr(v)

keep_if_edited = ',\n  '.join(f'{f} = CASE WHEN vehicle_stats.edited = 1 THEN vehicle_stats.{f} ELSE excluded.{f} END' for f in FIELDS)

rows = list(by_key.items())
BATCH = 100
with open('./stats_import.sql', 'w', encoding='utf-8') as out:
    for start in range(0, len(rows), BATCH):
        batch = rows[start:start + BATCH]
        out.write(f"INSERT INTO vehicle_stats (key, {', '.join(FIELDS)}, base) VALUES\n")
        for i, (key, s) in enumerate(batch):
            base = json.dumps({f: s[f] for f in FIELDS}, ensure_ascii=False, separators=(',', ':'))
            vals = ', '.join(sql_val(f, s[f]) for f in FIELDS)
            out.write(f"  ({sql_str(key)}, {vals}, {sql_str(base)})")
            out.write(',' if i < len(batch) - 1 else '')
            out.write('\n')
        out.write(f"ON CONFLICT(key) DO UPDATE SET\n  {keep_if_edited},\n  base = excluded.base,\n  updated_at = datetime('now');\n\n")

print(f"Written {len(rows)} vehicles to stats_import.sql")
