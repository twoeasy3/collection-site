// ---- the garage's lot, sorted and filtered ---------------------------------------------------------
// Two buttons on the garage's bar: Sort (the order the cars are parked in, column by column) and Show (which
// of them are parked at all). Each press moves on to the next choice and the lot is built again
// (render/garage.js: buildLot asks arrange() for its cars). Neither choice is saved: the garage opens as
// it always has, every car in order of its stars.
import '../menus.css';
import { Progress } from '../progress.js';
import { blueStarsOpen } from '../cars.js';

// (by: how two cars compare; none: as the garage has them, by stars and then price)
const SORTS = [
  { id: 'stars', name: 'Stars' },
  { id: 'price', name: 'Price', by: (a, b) => a.price - b.price },
  { id: 'speed', name: 'Top speed', by: (a, b) => b.maxSpeed - a.maxSpeed },
  { id: 'accel', name: 'Acceleration', by: (a, b) => b.accel - a.accel },
  { id: 'health', name: 'Health', by: (a, b) => b.health - a.health },
];
// (when: whether the choice is offered at all)
const SHOWS = [
  { id: 'all', name: 'All', has: () => true },
  { id: 'owned', name: 'Owned', has: (car) => Progress.owns(car.id) },
  { id: 'sale', name: 'For sale', has: (car) => !Progress.owns(car.id) },
  { id: 'afford', name: 'Can afford', has: (car) => !Progress.owns(car.id) && Progress.data.money >= car.price },
  { id: 'amphibious', name: 'Amphibious', has: (car) => !!car.amphibious },
  { id: 'gold', name: 'Gold stars', has: (car) => !!car.tier && !car.blue && !car.amphibious, when: blueStarsOpen },
  { id: 'blue', name: 'Blue stars', has: (car) => !!car.blue, when: blueStarsOpen },
];

export const GarageView = {
  sort: SORTS[0],
  show: SHOWS[0],
  // true: parked as the garage always has them (so in each column the biggest goes at the back)
  get usual() { return this.sort === SORTS[0]; },
};
// ?sort=price and ?show=owned in the address (with ?garage) start it that way, for a check
{
  const params = new URLSearchParams(location.search);
  GarageView.sort = SORTS.find(s => s.id === params.get('sort')) || GarageView.sort;
  GarageView.show = SHOWS.find(s => s.id === params.get('show')) || GarageView.show;
}
// the cars to park, in order, out of the garage's own list (already in order of stars and price)
export const arrange = (cars) => {
  const shown = cars.filter(GarageView.show.has);
  return GarageView.sort.by ? shown.sort(GarageView.sort.by) : shown; // (a stable sort: ties stay in star order)
};

// the two buttons, put on the bar ahead of its Livery button; onChange: the lot is to be built again
export const mountGarageView = (onChange) => {
  const bar = document.querySelector('#garageUi .bar'), before = document.getElementById('liveryBtn');
  const button = (list, key, label) => {
    const b = document.createElement('button');
    b.className = 'view-btn';
    const say = () => { b.textContent = label + ': ' + GarageView[key].name; };
    b.addEventListener('click', () => {
      const offered = list.filter(choice => !choice.when || choice.when());
      GarageView[key] = offered[(offered.indexOf(GarageView[key]) + 1) % offered.length];
      say();
      onChange();
    });
    say();
    bar.insertBefore(b, before);
    return b;
  };
  button(SORTS, 'sort', 'Sort');
  button(SHOWS, 'show', 'Show');
};
