// Fields offered in the "Add same casting" copy picker -- deliberately excludes
// per-instance/housekeeping fields (ID, Broken_image, Cover, ImageVersion,
// AiSuggested/AiRejected, NameFormat) since those describe a specific unit's own
// image/status rather than the casting itself.
export const CASTING_COPY_FIELDS = [
  { key: 'Make', label: 'Make' },
  { key: 'Model', label: 'Model' },
  { key: 'Supername', label: 'Supername' },
  { key: 'Year', label: 'Year' },
  { key: 'Brand', label: 'Brand' },
  { key: 'Series', label: 'Series' },
  { key: 'Country', label: 'Country' },
  { key: 'Category', label: 'Category' },
  { key: 'Description', label: 'Description' },
];

export const isCastingFieldFilled = (car, key) => {
  const v = car[key];
  return Array.isArray(v) ? v.length > 0 : !!String(v || '').trim();
};

export const formatCastingFieldValue = (car, key) => {
  const v = car[key];
  return Array.isArray(v) ? v.join(', ') : String(v || '');
};

// Copies the ticked fields from sourceCar onto target (arrays cloned).
export const applyCastingFields = (target, sourceCar, fields) => {
  CASTING_COPY_FIELDS.forEach(({ key }) => {
    if (!fields[key]) return;
    const v = sourceCar[key];
    target[key] = Array.isArray(v) ? [...v] : (v || '');
  });
  return target;
};
