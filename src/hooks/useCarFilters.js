import { useCallback, useMemo } from 'react';
import categoryOrderData from '../category_order.json';
import { FICTIONAL_MAKES } from '../constants';

// All derived views over the car list: group names per sidebar tab, the
// grouped+filtered structure the gallery/list/sidebar share, the mobile
// drill-down subset, flattened list items, and sidebar drawer metadata.
// Pure derivation — owns no state.
export function useCarFilters({ cars, sidebarView, selectedLetter, debouncedSearchTerm, searchMode, isPublic, isMobile }) {
  const brands = useMemo(() => [...new Set(cars.map(c => c.Brand || 'Unknown'))].sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' })), [cars]);

  const categoriesOrdered = useMemo(() => {
    const hasUncategorised = cars.some(c => !(Array.isArray(c.Category) ? c.Category.length : (c.Category || '').trim()));
    return hasUncategorised ? [...categoryOrderData.categories, 'Uncategorised'] : categoryOrderData.categories;
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

  const groupedAndFilteredCars = useMemo(() => {
    const groups = sidebarView === 'brand' ? brands : sidebarView === 'decade' ? yearsSorted : sidebarView === 'category' ? categoriesOrdered : makes;
    const seenIds = sidebarView !== 'category' ? new Set() : null;
    return groups.map(groupName => {
      const groupCars = cars.filter(c => {
        if (sidebarView === 'brand') return (c.Brand || 'Unknown') === groupName;
        if (sidebarView === 'decade') return (c.Year || 'Unknown') === groupName;
        if (sidebarView === 'category') { const cats = Array.isArray(c.Category) ? c.Category : []; return groupName === 'Uncategorised' ? cats.length === 0 : cats.includes(groupName); }
        return (c.Make || 'Unknown') === groupName;
      });
      const visibleGroupCars = groupCars.filter(c => {
        if (seenIds && seenIds.has(c.ID)) return false;
        const passes = isMatch(c, debouncedSearchTerm, searchMode) &&
          (!isPublic || (c.Broken_image !== 'TRUE' && !publicMissingIds.has(String(c.ID))));
        if (passes && seenIds) seenIds.add(c.ID);
        return passes;
      });
      return { groupName, visibleGroupCars };
    }).filter(g => g.visibleGroupCars.length > 0);
  }, [cars, brands, makes, yearsSorted, categoriesOrdered, sidebarView, isMatch, debouncedSearchTerm, searchMode, isPublic, publicMissingIds]);

  // Mobile drills into one letter/decade/group at a time instead of showing everything.
  const galleryGroups = useMemo(() => {
    if (!isMobile) return groupedAndFilteredCars;
    if (debouncedSearchTerm.trim()) return groupedAndFilteredCars;
    if (!selectedLetter) return [];
    if (sidebarView === 'make') return groupedAndFilteredCars.filter(({ groupName }) => {
      if (selectedLetter === 'Fictional') return FICTIONAL_MAKES.has(groupName);
      return !FICTIONAL_MAKES.has(groupName) && groupName.charAt(0).toUpperCase() === selectedLetter;
    });
    if (sidebarView === 'decade') return groupedAndFilteredCars.filter(({ groupName }) => {
      if (selectedLetter === 'Unknown') return groupName === 'Unknown' || groupName.toUpperCase() === 'N/A';
      const parsed = parseInt(groupName, 10);
      if (isNaN(parsed)) return false;
      const floor = parseInt(selectedLetter, 10);
      return parsed >= floor && parsed < floor + 10;
    });
    return groupedAndFilteredCars.filter(({ groupName }) => groupName === selectedLetter);
  }, [isMobile, sidebarView, selectedLetter, groupedAndFilteredCars, debouncedSearchTerm]);

  const brokenCars = useMemo(() => cars.filter(c => c.Broken_image === 'TRUE'), [cars]);
  const visibleCarsCount = useMemo(() => groupedAndFilteredCars.reduce((acc, curr) => acc + curr.visibleGroupCars.length, 0), [groupedAndFilteredCars]);

  const flatListItems = useMemo(() => {
    const items = [];
    groupedAndFilteredCars.forEach(group => {
      items.push({ type: 'header', groupName: group.groupName, count: group.visibleGroupCars.length });
      group.visibleGroupCars.forEach(car => { items.push({ type: 'car', car, groupName: group.groupName }); });
    });
    return items;
  }, [groupedAndFilteredCars]);

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
    brands, categoriesOrdered, makes, yearsSorted,
    groupedAndFilteredCars, galleryGroups, flatListItems,
    brokenCars, visibleCarsCount,
    visibleLetters, visibleDecades,
    showDirectLogos, showAlphabetDrawer, showDecadeDrawer, showDrawer,
  };
}
