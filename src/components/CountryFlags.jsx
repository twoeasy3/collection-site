import { MAKE_COUNTRY, FICTIONAL_MAKES } from '../constants';
import 'flag-icons/css/flag-icons.min.css';

// carCountry: [] → inherit make | ["US"] → additive | ["~","US"] → override
export const resolveCountries = (carCountry, makeCountries) => {
  const data = Array.isArray(carCountry) ? carCountry : [];
  if (!data.length) return Array.isArray(makeCountries) ? makeCountries : [];
  if (data[0] === '~') return data.slice(1);
  return [...new Set([...(Array.isArray(makeCountries) ? makeCountries : []), ...data])];
};

// A fictional make's makes.json entry (if any) usually records where the toy
// itself is manufactured (e.g. Hot Wheels -> CN), not where the in-universe
// vehicle is "from" -- that shouldn't be inherited as the car's country.
export const makeCountriesFor = (make) => FICTIONAL_MAKES.has(make) ? [] : (MAKE_COUNTRY.get(make) || []);

const CountryFlags = ({ make, carCountry, style }) => {
  const resolved = resolveCountries(carCountry, makeCountriesFor(make)).filter(c => c && c !== '~');
  if (!resolved.length) return null;
  return resolved.map(code => (
    <span key={code} className={`fi fi-${code.toLowerCase()}`} style={{ marginLeft: '4px', verticalAlign: 'middle', fontSize: '0.75em', ...style }} />
  ));
};

export default CountryFlags;
