import { MAKE_COUNTRY } from '../constants';
import 'flag-icons/css/flag-icons.min.css';

// carCountry: [] → inherit make | ["US"] → additive | ["~","US"] → override
export const resolveCountries = (carCountry, makeCountries) => {
  const data = Array.isArray(carCountry) ? carCountry : [];
  if (!data.length) return Array.isArray(makeCountries) ? makeCountries : [];
  if (data[0] === '~') return data.slice(1);
  return [...new Set([...(Array.isArray(makeCountries) ? makeCountries : []), ...data])];
};

const CountryFlags = ({ make, carCountry, style }) => {
  const resolved = resolveCountries(carCountry, MAKE_COUNTRY.get(make) || []).filter(c => c && c !== '~');
  if (!resolved.length) return null;
  return resolved.map(code => (
    <span key={code} className={`fi fi-${code.toLowerCase()}`} style={{ marginLeft: '4px', verticalAlign: 'middle', fontSize: '0.75em', ...style }} />
  ));
};

export default CountryFlags;
