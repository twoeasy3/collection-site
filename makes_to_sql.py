import json

with open('./makes.json', encoding='utf-8') as f:
    makes = json.load(f)

BATCH = 100
with open('./makes_import.sql', 'w', encoding='utf-8') as out:
    for start in range(0, len(makes), BATCH):
        batch = makes[start:start + BATCH]
        out.write('INSERT OR REPLACE INTO makes (name, countries) VALUES\n')
        for i, m in enumerate(batch):
            name = str(m.get('Name', '')).replace("'", "''")
            countries = json.dumps(m.get('Country', []))
            out.write(f"  ('{name}', '{countries}')")
            out.write(',' if i < len(batch) - 1 else '')
            out.write('\n')
        out.write(';\n\n')

print(f"Written {len(makes)} makes to makes_import.sql")
