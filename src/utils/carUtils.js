export const sortCars = (carArray) => {
  return [...carArray].sort((a, b) => {
    const makeA = String(a.Make || '');
    const makeB = String(b.Make || '');
    const makeComparison = makeA.localeCompare(makeB, undefined, { sensitivity: 'base' });
    if (makeComparison !== 0) return makeComparison;

    const modelA = String(a.Model || '');
    const modelB = String(b.Model || '');
    const modelComparison = modelA.localeCompare(modelB, undefined, { sensitivity: 'base' });
    if (modelComparison !== 0) return modelComparison;

    const yearA = parseInt(a.Year, 10) || 0;
    const yearB = parseInt(b.Year, 10) || 0;
    const yearComparison = yearA - yearB;
    if (yearComparison !== 0) return yearComparison;

    const brandA = String(a.Brand || '');
    const brandB = String(b.Brand || '');
    const brandComparison = brandA.localeCompare(brandB, undefined, { sensitivity: 'base' });
    if (brandComparison !== 0) return brandComparison;

    return (b.Cover ? 1 : 0) - (a.Cover ? 1 : 0);
  });
};

export const getNextAvailableId = (currentCars) => {
  const usedIds = new Set(currentCars.map(c => parseInt(c.ID, 10)).filter(id => !isNaN(id)));
  let nextId = 1;
  while (usedIds.has(nextId)) nextId++;
  return nextId.toString();
};

export const NAME_FORMATS = [
  { value: 0, label: 'Default',    pattern: 'Supername · Year · Make · Model' },
  { value: 1, label: 'Year First', pattern: 'Year · Supername · Make · Model' },
  { value: 2, label: 'No Make',    pattern: 'Supername · Year · Model' },
];

export const getCarDisplayName = (car) => {
  const y = car.Year && car.Year.toUpperCase() !== 'N/A' ? car.Year : null;
  switch (car.NameFormat || 0) {
    case 1:  return [y, car.Supername, car.Make, car.Model].filter(Boolean).join(' ');
    case 2:  return [car.Supername, y, car.Model].filter(Boolean).join(' ');
    default: return [car.Supername, y, car.Make, car.Model].filter(Boolean).join(' ');
  }
};

export const parseArr = (val) => {
  try { const p = JSON.parse(val || '[]'); return Array.isArray(p) ? p : []; } catch { return []; }
};

export const parseObj = (val) => {
  try { const p = JSON.parse(val || '{}'); return (p && typeof p === 'object' && !Array.isArray(p)) ? p : {}; } catch { return {}; }
};

export const toAppCar = (row) => ({
  ID: String(row.id),
  Year: row.year || '',
  Make: row.make || '',
  Model: row.model || '',
  Supername: row.supername || '',
  Brand: row.brand || '',
  Series: row.series || '',
  Country: parseArr(row.country),
  Category: parseArr(row.category),
  Description: row.description || '',
  Broken_image: row.broken_image ? 'TRUE' : 'FALSE',
  Cover: !!(row.Cover ?? row.cover),
  NameFormat: row.name_format || 0,
  AiSuggested: parseObj(row.ai_suggested),
  AiRejected: row.ai_rejected || '',
});

export const AI_FIELD_TO_APP_FIELD = { year: 'Year', series: 'Series', category: 'Category', description: 'Description', country: 'Country' };
export const AI_FIELD_EMPTY_VALUE = { year: '', series: '', description: '', category: [], country: [] };
export const omitKey = (obj, key) => { const { [key]: _omitted, ...rest } = obj || {}; return rest; };

export const toDBRow = (car) => ({
  id: parseInt(car.ID),
  year: car.Year || '',
  make: car.Make || '',
  model: car.Model || '',
  supername: car.Supername || '',
  brand: car.Brand || '',
  series: car.Series || '',
  country: JSON.stringify(Array.isArray(car.Country) ? car.Country : []),
  category: JSON.stringify(Array.isArray(car.Category) ? car.Category : []),
  description: car.Description || '',
  broken_image: car.Broken_image === 'TRUE' ? 1 : 0,
  cover: car.Cover ? 1 : 0,
  name_format: car.NameFormat || 0,
  ai_suggested: JSON.stringify(car.AiSuggested || {}),
  ai_rejected: car.AiRejected || '',
});
