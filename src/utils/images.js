import { BASE_PATH } from '../constants';

export const FALLBACK_GRID_IMAGE = `${BASE_PATH}/mystery_side.jpg`;
export const FALLBACK_HERO_IMAGE = `${BASE_PATH}/mystery_hero.jpg`;

// Cache-busting suffix: a fresh upload this session (imageUpdates) wins over
// the version stored on the car row.
const versionSuffix = (car, imageUpdates) => {
  const v = imageUpdates?.[car.ID] || car.ImageVersion;
  return v ? `?t=${v}` : '';
};

export const getSideImage = (car, imageUpdates) => `${BASE_PATH}/half_standard_cars/${car.ID} (1).jpg${versionSuffix(car, imageUpdates)}`;
export const getHeroImage = (car, imageUpdates) => `${BASE_PATH}/standard_hero_shots/${car.ID} (2).jpg${versionSuffix(car, imageUpdates)}`;

export const preloadImage = (src) => { new Image().src = src; };
