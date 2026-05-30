import { useEffect, useRef } from 'react';
import { BASE_PATH } from '../constants';

// Two-phase strategy:
// Phase 1 – background idle queue at low concurrency (full list, survives filter changes).
// Phase 2 – viewport IntersectionObserver for immediate priority loading.
// Both phases share preloadedRef so no URL is fetched twice.
export const useImagePreloader = (cars, imageUpdates, visibleCars, gridPaneRef, galleryActive) => {
  const preloadedRef = useRef(new Set());

  useEffect(() => {
    if (!cars.length) return;
    if (window.innerWidth < 700) return;

    let i = 0;
    let activeCount = 0;
    const CONCURRENCY = 2;
    let cancelled = false;

    const allUrls = cars.map(car => {
      const t = imageUpdates[car.ID] ? `?t=${imageUpdates[car.ID]}` : '';
      return `${BASE_PATH}/half_standard_cars/${car.ID} (1).jpg${t}`;
    });

    const next = () => {
      if (cancelled) return;
      while (activeCount < CONCURRENCY && i < allUrls.length) {
        const url = allUrls[i++];
        if (preloadedRef.current.has(url)) continue;
        preloadedRef.current.add(url);
        activeCount++;
        const img = new Image();
        img.onload = img.onerror = () => { activeCount--; next(); };
        img.src = url;
      }
    };

    const timerId = typeof requestIdleCallback !== 'undefined'
      ? requestIdleCallback(next, { timeout: 10000 })
      : setTimeout(next, 1000);

    return () => {
      cancelled = true;
      if (typeof requestIdleCallback !== 'undefined') cancelIdleCallback(timerId);
      else clearTimeout(timerId);
    };
  }, [cars, imageUpdates]);

  useEffect(() => {
    if (!galleryActive || !visibleCars.length) return;
    if (window.innerWidth < 700) return;

    const container = gridPaneRef?.current;
    if (!container) return;

    const carById = new Map(visibleCars.map(c => [c.ID, c]));

    const preloadCard = (id) => {
      const car = carById.get(id);
      if (!car) return;
      const t = imageUpdates[id] ? `?t=${imageUpdates[id]}` : '';
      const url = `${BASE_PATH}/half_standard_cars/${id} (1).jpg${t}`;
      if (preloadedRef.current.has(url)) return;
      preloadedRef.current.add(url);
      new Image().src = url;
    };

    const pendingMaps = [];

    const makeDebouncedObserver = (rootMargin, delay) => {
      const pending = new Map();
      pendingMaps.push(pending);
      return new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            const id = e.target.dataset.carId;
            if (!id) continue;
            if (e.isIntersecting) {
              if (pending.has(id)) continue;
              pending.set(id, setTimeout(() => { pending.delete(id); preloadCard(id); }, delay));
            } else {
              const t = pending.get(id);
              if (t !== undefined) { clearTimeout(t); pending.delete(id); }
            }
          }
        },
        { root: container, rootMargin }
      );
    };

    const isMobileDevice = window.innerWidth < 700;
    const viewportObserver = makeDebouncedObserver('0px 0px', 100);
    const bufferObserver   = makeDebouncedObserver(isMobileDevice ? '200px 0px' : '600px 0px', 400);

    const elements = container.querySelectorAll('[data-car-id]');
    elements.forEach(el => { viewportObserver.observe(el); bufferObserver.observe(el); });

    return () => {
      viewportObserver.disconnect();
      bufferObserver.disconnect();
      for (const pending of pendingMaps) {
        for (const t of pending.values()) clearTimeout(t);
      }
    };
  }, [visibleCars, imageUpdates, galleryActive]);
};
