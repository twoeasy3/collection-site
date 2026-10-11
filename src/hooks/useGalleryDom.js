import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getStackKey } from '../components/GalleryCards';

// Imperative DOM concerns for the gallery grid, kept out of App so card
// selection and layout measurement never force a gallery re-render.

// Number of CSS grid columns the gallery currently lays out (GalleryGrid
// uses it to place group headers / stack rows). Measured via ResizeObserver
// plus a per-render layout check so a column change is never missed.
export function useColumnCount(carGridRef, { active, loading }) {
  const [columnCount, setColumnCount] = useState(1);

  useEffect(() => {
    if (!active) return;
    const gridEl = carGridRef.current;
    if (!gridEl) return;
    const calc = () => {
      const t = window.getComputedStyle(gridEl).getPropertyValue('grid-template-columns');
      if (t && t !== 'none') setColumnCount(Math.max(1, t.split(' ').length));
    };
    const obs = new ResizeObserver(() => requestAnimationFrame(calc));
    obs.observe(gridEl);
    requestAnimationFrame(calc);
    return () => obs.disconnect();
  }, [loading, active]);

  useLayoutEffect(() => {
    if (!active || !carGridRef.current) return;
    const t = window.getComputedStyle(carGridRef.current).getPropertyValue('grid-template-columns');
    if (t && t !== 'none') { const cols = Math.max(1, t.split(' ').length); setColumnCount(prev => prev === cols ? prev : cols); }
  });

  return columnCount;
}

// Applies the .selected CSS class imperatively so card selection doesn't
// rebuild gallery nodes. A car spanning multiple categories renders one
// .car-card per category, all sharing data-car-id -- prefer the instance
// actually clicked (data-group) so the highlight doesn't land on a different
// category's copy of the same car.
export function useSelectedCardHighlight(gridPaneRef, selectedId, selectedGroup) {
  const selectedCardElRef = useRef(null);

  useLayoutEffect(() => {
    const container = gridPaneRef.current;
    if (!container) return;

    selectedCardElRef.current?.classList.remove('selected');
    selectedCardElRef.current = null;
    if (selectedId == null) return;

    const cardEl = (selectedGroup && container.querySelector(`.car-card[data-car-id="${selectedId}"][data-group="${selectedGroup}"]`))
      || container.querySelector(`.car-card[data-car-id="${selectedId}"]`);
    if (cardEl) { cardEl.classList.add('selected'); selectedCardElRef.current = cardEl; return; }

    const stackEl = container.querySelector(`[data-stack-car-ids~="${selectedId}"]`);
    if (stackEl) { stackEl.classList.add('selected'); selectedCardElRef.current = stackEl; }
  });
}

// Scrolls the selected car's card (or the collapsed stack containing it)
// into view. `scrollKey` bundles the filter inputs whose change should
// re-trigger the scroll even when the selection itself didn't move.
export function useAutoScrollToSelection({ enabled, gridPaneRef, selectedCar, selectedCarGroup, groupsRef, scrollKey, ignoreBrand }) {
  useEffect(() => {
    if (!enabled || !selectedCar) return;
    const raf = requestAnimationFrame(() => {
      const pane = gridPaneRef.current;
      // Scope to the group actually clicked (selectedCarGroup) first, or every
      // lookup here just grabs whichever instance is first in DOM order.
      const card = (selectedCarGroup && pane?.querySelector(`[data-car-id="${selectedCar.ID}"][data-group="${selectedCarGroup}"]`))
        || pane?.querySelector(`[data-car-id="${selectedCar.ID}"]`);
      if (card) { card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return; }

      const selectedKey = getStackKey(selectedCar, ignoreBrand);
      const orderedGroups = selectedCarGroup
        ? [...groupsRef.current].sort((a, b) => (a.groupName === selectedCarGroup ? -1 : b.groupName === selectedCarGroup ? 1 : 0))
        : groupsRef.current;
      for (const { groupName, visibleGroupCars } of orderedGroups) {
        for (const car of visibleGroupCars) {
          if (getStackKey(car, ignoreBrand) === selectedKey) {
            const coverEl = pane?.querySelector(`[data-car-id="${car.ID}"][data-group="${groupName}"]`)
              || pane?.querySelector(`[data-car-id="${car.ID}"]`);
            if (coverEl) { coverEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return; }
            break;
          }
        }
      }
      if (pane) pane.scrollTo({ top: 0, behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(raf);
  }, [enabled, scrollKey, selectedCar, selectedCarGroup]);
}
