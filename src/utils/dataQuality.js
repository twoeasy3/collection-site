import { resolveCountries, makeCountriesFor } from '../components/CountryFlags';
import { isUnnamedCar } from './carUtils';

const blank = (v) => !String(v ?? '').trim();

// Fields the data quality view audits. `missing(car)` returns true when the
// field needs attention. Country counts the make's default countries, so a
// car only shows as missing when neither it nor its make has one.
export const QUALITY_FIELDS = [
  { key: 'Year', label: 'Year', missing: c => blank(c.Year) },
  { key: 'Make', label: 'Make', missing: c => blank(c.Make) },
  { key: 'Model', label: 'Model', missing: c => blank(c.Model) || isUnnamedCar(c) },
  { key: 'Brand', label: 'Brand', missing: c => blank(c.Brand) },
  { key: 'Series', label: 'Series', missing: c => blank(c.Series) },
  { key: 'Country', label: 'Country', missing: c => resolveCountries(c.Country, makeCountriesFor(c.Make)).filter(x => x && x !== '~').length === 0 },
  { key: 'Category', label: 'Category', missing: c => !(Array.isArray(c.Category) && c.Category.length > 0) },
  { key: 'Description', label: 'Description', missing: c => blank(c.Description) },
];

// Returns { rows, counts }: rows = cars with at least one gap, each carrying
// the Set of missing field keys; counts = per-field totals over all cars.
export function auditCars(cars, { includePlaceholders = false } = {}) {
  const counts = Object.fromEntries(QUALITY_FIELDS.map(f => [f.key, 0]));
  const rows = [];
  for (const car of cars) {
    if (!includePlaceholders && isUnnamedCar(car)) continue;
    const missing = new Set();
    for (const f of QUALITY_FIELDS) {
      if (f.missing(car)) { missing.add(f.key); counts[f.key]++; }
    }
    if (missing.size) rows.push({ car, missing });
  }
  return { rows, counts };
}
