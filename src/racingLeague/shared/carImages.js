// Team/crew "car" images borrow real photos from the car collection's own
// image host — picked from the collection's Apex Open-Wheel, Endurance
// Legends, GT, and Rally categories to match each fictional team's flavor.
const CAR_IMAGE_BASE = 'https://pingmathehippo.com/half_standard_cars';

export const carImageUrl = (carImageId) => `${CAR_IMAGE_BASE}/${carImageId} (1).jpg`;
