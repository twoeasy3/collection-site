import { useCallback, useEffect, useState } from 'react';
import { fetchMissingImages, API_UNREACHABLE } from '../utils/api';

// Data for the admin "Missing Imgs" view: which cars lack side/hero files in
// R2, enriched with the car's own fields for display. Fetched on entering
// the view and on demand via fetchMissingData.
export function useMissingImages({ cars, viewMode, showToast }) {
  const [missingData, setMissingData] = useState([]);
  const [missingLoading, setMissingLoading] = useState(false);
  const [missingSubTab, setMissingSubTab] = useState('missing');

  const fetchMissingData = useCallback(async () => {
    setMissingLoading(true);
    try {
      const response = await fetchMissingImages();
      if (response.ok) {
        const data = await response.json();
        const enriched = data.missing.map(item => {
          const car = cars.find(c => String(c.ID) === String(item.id)) || {};
          return { id: item.id, year: car.Year || '', make: car.Make || '', model: car.Model || '', supername: car.Supername || '', brand: car.Brand || '', series: car.Series || '', missing_side: item.missing_side, missing_hero: item.missing_hero };
        });
        setMissingData(enriched);
      } else { showToast('Failed to fetch missing image data', 'error'); }
    } catch { showToast(API_UNREACHABLE, 'error'); }
    finally { setMissingLoading(false); }
  }, [showToast, cars]);

  useEffect(() => { if (viewMode === 'missing') fetchMissingData(); }, [viewMode, fetchMissingData]);

  return { missingData, missingLoading, missingSubTab, setMissingSubTab, fetchMissingData };
}
