import { useCallback, useMemo, useState } from 'react';

// Pages the flattened list-view items (group headers interleaved with cars)
// by car count, re-emitting the group header at the top of each page slice.
export function useListPagination(flatListItems, visibleCarsCount, itemsPerPage) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(visibleCarsCount / itemsPerPage));
  const pageCarStart = (currentPage - 1) * itemsPerPage;
  const pageCarEnd = currentPage * itemsPerPage;

  const currentListItems = useMemo(() => {
    const items = [];
    let carCount = 0, lastHeader = null, headerAdded = false;
    for (const item of flatListItems) {
      if (carCount >= pageCarEnd) break;
      if (item.type === 'header') { lastHeader = item; headerAdded = false; }
      else {
        if (carCount >= pageCarStart) {
          if (!headerAdded && lastHeader) { items.push(lastHeader); headerAdded = true; }
          items.push(item);
        }
        carCount++;
      }
    }
    return items;
  }, [flatListItems, pageCarStart, pageCarEnd]);

  const carsOnPage = useMemo(() => currentListItems.filter(i => i.type === 'car').length, [currentListItems]);

  // Which page a group's header lands on (for sidebar jump-to-group).
  const pageForGroup = useCallback((groupName) => {
    let carsBeforeGroup = 0;
    for (const item of flatListItems) {
      if (item.type === 'header' && item.groupName === groupName) break;
      if (item.type === 'car') carsBeforeGroup++;
    }
    return Math.floor(carsBeforeGroup / itemsPerPage) + 1;
  }, [flatListItems, itemsPerPage]);

  return { currentPage, setCurrentPage, totalPages, currentListItems, carsBeforePage: pageCarStart, carsOnPage, pageForGroup };
}
