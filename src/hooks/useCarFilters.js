import { useCallback, useMemo } from 'react';
import categoryOrderData from '../category_order.json';
import { FICTIONAL_MAKES, getCountryName } from '../constants';
import { resolveCountries, makeCountriesFor } from '../components/CountryFlags';
import { isUnnamedCar } from '../utils/carUtils';
import { CLASS_ORDER } from '../utils/carStats';

// Class view groups: fastest class first, unrated (and undrafted) last.
export const CLASS_GROUPS = ['X', 'S', 'A', 'B', 'C', 'D', 'E', 'U'];

// All derived views over the car list: group names per sidebar tab, the
// grouped+filtered structure the gallery/list/sidebar share, the AI-pending
// re-ordering, the mobile drill-down subset, flattened list items, and
// sidebar drawer metadata. Pure derivation -- owns no state.
export function useCarFilters({ cars, sidebarView, selectedLetter, debouncedSearchTerm, searchMode, isPublic, isMobile, prioritizeAiPending, getStats = null, classFilter = null }) {
  const brands = useMemo(() => [...new Set(cars.map(c => c.Brand || 'Unknown'))].sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' })), [cars]);

  const categories = categoryOrderData.categories;

  const categoriesOrdered = useMemo(() => {
    const hasUncategorised = cars.some(c => !(Array.isArray(c.Category) ? c.Category.length : (c.Category || '').trim()));
    return hasUncategorised ? [...categoryOrderData.categories, 'Uncategorised'] : categoryOrderData.categories;
  }, [cars]);

  // A car's real countries come from resolveCountries (its own Country field
  // combined with/overriding its make's default countries) -- grouping on the
  // raw Country field alone would miss every car that just inherits from its make.
  const countriesOrdered = useMemo(() => {
    const codes = new Set();
    cars.forEach(c => {
      resolveCountries(c.Country, makeCountriesFor(c.Make)).forEach(code => { if (code && code !== '~') codes.add(code); });
    });
    return [...codes].sort((a, b) => getCountryName(a).localeCompare(getCountryName(b)));
  }, [cars]);

  const makes = useMemo(() => {
    const uniqueMakes = [...new Set(cars.map(c => c.Make || 'Unknown'))];
    return uniqueMakes.sort((a, b) => {
      const aF = FICTIONAL_MAKES.has(a), bF = FICTIONAL_MAKES.has(b);
      if (aF && !bF) return 1;
      if (!aF && bF) return -1;
      return String(a).localeCompare(String(b), undefined, { sensitivity: 'base' });
    });
  }, [cars]);

  const yearsSorted = useMemo(() => {
    const uniqueYears = [...new Set(cars.map(c => c.Year || 'Unknown'))];
    return uniqueYears.sort((a, b) => {
      if (a === 'Unknown' || a.toUpperCase() === 'N/A') return 1;
      if (b === 'Unknown' || b.toUpperCase() === 'N/A') return -1;
      return parseInt(a, 10) - parseInt(b, 10);
    });
  }, [cars]);

  const isMatch = useCallback((car, searchTerm, mode) => {
    if (!searchTerm.trim()) return true;
    const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);
    const combinedText = mode === 'car'
      ? `${car.Make || ''} ${car.Model || ''} ${car.Year || ''} ${car.Supername || ''}`.toLowerCase()
      : `${car.Brand || ''} ${car.Series || ''}`.toLowerCase();
    return searchWords.every(word => combinedText.includes(word));
  }, []);

  const publicMissingIds = useMemo(() => new Set(), []);

  // Rating sort: every other grouping is dropped and cars are bucketed by
  // performance class, best rating first within each class. Undrafted cars
  // join U. classFilter narrows the gallery to one class; classCounts always
  // reflects the unfiltered totals so the sidebar can list every class.
  const classView = useMemo(() => {
    if (sidebarView !== 'class') return null;
    const buckets = Object.fromEntries(CLASS_GROUPS.map(c => [c, []]));
    const counts = Object.fromEntries(CLASS_GROUPS.map(c => [c, 0]));
    cars.forEach(c => {
      if (!isMatch(c, debouncedSearchTerm, searchMode)) return;
      if (isPublic && (c.Broken_image === 'TRUE' || isUnnamedCar(c) || publicMissingIds.has(String(c.ID)))) return;
      const s = getStats ? getStats(c) : null;
      const cl = s && CLASS_ORDER.includes(s.cl) ? s.cl : 'U';
      counts[cl]++;
      if (classFilter && cl !== classFilter) return;
      buckets[cl].push([c, s && cl !== 'U' ? s.r : -1]);
    });
    const groups = CLASS_GROUPS
      .map(cl => ({ groupName: cl, visibleGroupCars: buckets[cl].sort((a, b) => b[1] - a[1]).map(([c]) => c) }))
      .filter(g => g.visibleGroupCars.length > 0);
    return { groups, counts };
  }, [cars, sidebarView, isMatch, debouncedSearchTerm, searchMode, isPublic, publicMissingIds, getStats, classFilter]);

  const groupedAndFilteredCars = useMemo(() => {
    if (classView) return classView.groups;
    const groups = sidebarView === 'brand' ? brands : sidebarView === 'decade' ? yearsSorted : sidebarView === 'category' ? categoriesOrdered : sidebarView === 'country' ? countriesOrdered : makes;
    // Category and country are the two views where a car can legitimately belong
    // to more than one group (multiple categories, multiple resolved countries) --
    // every other view dedupes a car to its first matching group only.
    const seenIds = (sidebarView !== 'category' && sidebarView !== 'country') ? new Set() : null;
    return groups.map(groupName => {
      const groupCars = cars.filter(c => {
        if (sidebarView === 'brand') return (c.Brand || 'Unknown') === groupName;
        if (sidebarView === 'decade') return (c.Year || 'Unknown') === groupName;
        if (sidebarView === 'category') { const cats = Array.isArray(c.Category) ? c.Category : []; return groupName === 'Uncategorised' ? cats.length === 0 : cats.includes(groupName); }
        if (sidebarView === 'country') return resolveCountries(c.Country, makeCountriesFor(c.Make)).includes(groupName);
        return (c.Make || 'Unknown') === groupName;
      });
      const visibleGroupCars = groupCars.filter(c => {
        if (seenIds && seenIds.has(c.ID)) return false;
        // Public display hides broken and placeholder rows client-side too, as a
        // guard for anything the Worker's /api/cars/public filter lets through.
        const passes = isMatch(c, debouncedSearchTerm, searchMode) &&
          (!isPublic || (c.Broken_image !== 'TRUE' && !isUnnamedCar(c) && !publicMissingIds.has(String(c.ID))));
        if (passes && seenIds) seenIds.add(c.ID);
        return passes;
      });
      return { groupName, visibleGroupCars };
    }).filter(g => g.visibleGroupCars.length > 0);
  }, [cars, brands, makes, yearsSorted, categoriesOrdered, countriesOrdered, sidebarView, isMatch, debouncedSearchTerm, searchMode, isPublic, publicMissingIds, classView]);

  // When prioritizeAiPending is on, pull every AI-pending car out of its normal
  // group into one flat block at the very front -- not just reordered within
  // each category/brand/make/decade group.
  const prioritizedGroups = useMemo(() => {
    if (!prioritizeAiPending) return groupedAndFilteredCars;
    const seenPendingIds = new Set();
    const pending = [];
    const rest = groupedAndFilteredCars
      .map(({ groupName, visibleGroupCars }) => ({
        groupName,
        visibleGroupCars: visibleGroupCars.filter(c => {
          const isPending = c.AiSuggested && Object.keys(c.AiSuggested).length > 0;
          if (!isPending) return true;
          if (!seenPendingIds.has(c.ID)) { seenPendingIds.add(c.ID); pending.push(c); }
          return false;
        }),
      }))
      .filter(g => g.visibleGroupCars.length > 0);
    return pending.length > 0 ? [{ groupName: 'AI Suggestions Pending', visibleGroupCars: pending }, ...rest] : groupedAndFilteredCars;
  }, [groupedAndFilteredCars, prioritizeAiPending]);

  // Mobile drills into one letter/decade/group at a time instead of showing everything.
  const galleryGroups = useMemo(() => {
    if (!isMobile) return prioritizedGroups;
    if (debouncedSearchTerm.trim()) return prioritizedGroups;
    if (sidebarView === 'class') return prioritizedGroups;
    if (!selectedLetter) return [];
    if (sidebarView === 'make') return prioritizedGroups.filter(({ groupName }) => {
      if (selectedLetter === 'Fictional') return FICTIONAL_MAKES.has(groupName);
      return !FICTIONAL_MAKES.has(groupName) && groupName.charAt(0).toUpperCase() === selectedLetter;
    });
    if (sidebarView === 'decade') return prioritizedGroups.filter(({ groupName }) => {
      if (selectedLetter === 'Unknown') return groupName === 'Unknown' || groupName.toUpperCase() === 'N/A';
      const parsed = parseInt(groupName, 10);
      if (isNaN(parsed)) return false;
      const floor = parseInt(selectedLetter, 10);
      return parsed >= floor && parsed < floor + 10;
    });
    return prioritizedGroups.filter(({ groupName }) => groupName === selectedLetter);
  }, [isMobile, sidebarView, selectedLetter, prioritizedGroups, debouncedSearchTerm]);

  const brokenCars = useMemo(() => cars.filter(c => c.Broken_image === 'TRUE'), [cars]);
  const pendingAiSuggestions = useMemo(() =>
    cars.flatMap(c => Object.entries(c.AiSuggested || {}).map(([field, confidence]) => ({ car: c, field, confidence }))),
    [cars]
  );
  const visibleCarsCount = useMemo(() => groupedAndFilteredCars.reduce((acc, curr) => acc + curr.visibleGroupCars.length, 0), [groupedAndFilteredCars]);

  const flatListItems = useMemo(() => {
    const items = [];
    prioritizedGroups.forEach(group => {
      items.push({ type: 'header', groupName: group.groupName, count: group.visibleGroupCars.length });
      group.visibleGroupCars.forEach(car => { items.push({ type: 'car', car, groupName: group.groupName }); });
    });
    return items;
  }, [prioritizedGroups]);

  const visibleLetters = useMemo(() => {
    if (sidebarView !== 'make') return [];
    const letters = new Set();
    let hasFictional = false;
    groupedAndFilteredCars.forEach(({ groupName }) => {
      if (groupName) {
        if (FICTIONAL_MAKES.has(groupName)) hasFictional = true;
        else letters.add(groupName.charAt(0).toUpperCase());
      }
    });
    const sorted = [...letters].sort();
    if (hasFictional) sorted.push('Fictional');
    return sorted;
  }, [groupedAndFilteredCars, sidebarView]);

  const visibleDecades = useMemo(() => {
    if (sidebarView !== 'decade') return [];
    const decades = new Set();
    groupedAndFilteredCars.forEach(({ groupName }) => {
      const parsed = parseInt(groupName, 10);
      if (!isNaN(parsed) && parsed >= 1000 && parsed <= 9999) decades.add(`${Math.floor(parsed / 10) * 10}s`);
      else decades.add('Unknown');
    });
    return [...decades].sort((a, b) => {
      if (a === 'Unknown') return 1;
      if (b === 'Unknown') return -1;
      return parseInt(a, 10) - parseInt(b, 10);
    });
  }, [groupedAndFilteredCars, sidebarView]);

  const showDirectLogos = sidebarView === 'make' && groupedAndFilteredCars.length < 20;
  const showAlphabetDrawer = sidebarView === 'make' && groupedAndFilteredCars.length >= 20;
  const showDecadeDrawer = sidebarView === 'decade';
  const showDrawer = (showAlphabetDrawer && selectedLetter) || (showDecadeDrawer && selectedLetter);

  return {
    categories, classCounts: classView ? classView.counts : null,
    groupedAndFilteredCars, prioritizedGroups, galleryGroups, flatListItems,
    brokenCars, pendingAiSuggestions, visibleCarsCount,
    visibleLetters, visibleDecades,
    showDirectLogos, showAlphabetDrawer, showDecadeDrawer, showDrawer,
  };
}
