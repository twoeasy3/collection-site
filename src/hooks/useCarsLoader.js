import { useCallback, useEffect, useRef, useState, startTransition } from 'react';
import { MAKE_COUNTRY } from '../constants';
import { sortCars, toAppCar, parseArr } from '../utils/carUtils';
import { fetchCars, fetchMakes } from '../utils/api';

// Loads the car list (and the make -> country table) from the Worker API.
// `onLoaded(sortedCars)` fires before the cars state commits so the caller
// can fix up its selection; `refresh()` re-fetches (used after Undo).
export function useCarsLoader({ isPublic, onLoaded }) {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  useEffect(() => {
    setLoading(true);
    fetchCars(isPublic)
      .then(data => {
        const sortedCars = sortCars(data.map(toAppCar));
        onLoadedRef.current?.(sortedCars);
        setLoading(false);
        startTransition(() => setCars(sortedCars));
      })
      .catch(() => setLoading(false));
  }, [refreshTrigger]);

  useEffect(() => {
    fetchMakes()
      .then(data => data.forEach(m => MAKE_COUNTRY.set(m.name, parseArr(m.countries))))
      .catch(() => {});
  }, []);

  const refresh = useCallback(() => setRefreshTrigger(prev => prev + 1), []);

  return { cars, setCars, loading, refresh };
}
