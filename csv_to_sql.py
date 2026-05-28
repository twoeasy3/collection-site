import csv

csv_path = './data/collection.csv'
out_path = './import.sql'
BATCH = 100

def esc(val):
    return str(val or '').strip().replace("'", "''")

with open(csv_path, encoding='utf-8-sig') as f:
    rows = [r for r in csv.DictReader(f) if str(r.get('ID', '')).strip().isdigit()]

with open(out_path, 'w', encoding='utf-8') as out:
    for start in range(0, len(rows), BATCH):
        batch = rows[start:start + BATCH]
        out.write('INSERT OR REPLACE INTO cars '
                  '(id, year, make, model, supername, brand, series, country, category, description, broken_image) '
                  'VALUES\n')
        for i, row in enumerate(batch):
            broken = 1 if str(row.get('Broken_image', '')).strip().upper() == 'TRUE' else 0
            line = (f"  ({int(row['ID'])}, '{esc(row.get('Year'))}', '{esc(row.get('Make'))}', "
                    f"'{esc(row.get('Model'))}', '{esc(row.get('Supername'))}', '{esc(row.get('Brand'))}', "
                    f"'{esc(row.get('Series'))}', '{esc(row.get('Country'))}', '{esc(row.get('Category'))}', "
                    f"'{esc(row.get('Description'))}', {broken})")
            out.write(line + (',' if i < len(batch) - 1 else '') + '\n')
        out.write(';\n\n')

print(f"Written {len(rows)} rows in batches of {BATCH} to {out_path}")
