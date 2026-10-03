import { useEffect } from 'react';

export const KEYBOARD_SHORTCUTS = [
  ['← →', 'Previous / next car'],
  ['↑ ↓', 'Up / down one row'],
  ['Home / End', 'First / last car'],
  ['Space', 'Expand or collapse the selected stack'],
  ['Enter', 'Open the hero image full screen'],
  ['E', 'Edit the selected car (admin)'],
  ['/', 'Focus the search box'],
  ['Esc', 'Close popup, cancel edit, blur search, close drawer'],
  ['?', 'Show this list'],
];

const isTextField = (el) => !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);

// Global keyboard handling for the gallery. The caller keeps `ctxRef.current`
// up to date each render with the state and actions listed below, so the
// listener is bound once and never goes stale:
//   viewMode, isGalleryEditing, modalOpen, heroPopupOpen, canEdit, gridPaneRef,
//   navigable: [{ car, groupName, stackKey, stackSize }], selectedId, selectedGroup,
//   select(car, groupName), scrollToCar(car, groupName), toggleStack(scopedKey), openHero(), closeHero(),
//   edit(), cancelEdit(), focusSearch(), clearLetter(), hasLetter, showHelp()
export function useKeyboardNav(ctxRef) {
  useEffect(() => {
    const onKey = (e) => {
      const ctx = ctxRef.current;
      if (!ctx || e.altKey || e.ctrlKey || e.metaKey) return;

      if (isTextField(e.target)) {
        if (e.key === 'Escape') e.target.blur();
        return;
      }
      if (ctx.modalOpen) return; // dialogs own their keys

      if (e.key === '/') { e.preventDefault(); ctx.focusSearch(); return; }
      if (e.key === '?') { e.preventDefault(); ctx.showHelp(); return; }
      if (e.key === 'Escape') {
        if (ctx.heroPopupOpen) ctx.closeHero();
        else if (ctx.isGalleryEditing) ctx.cancelEdit();
        else if (ctx.hasLetter) ctx.clearLetter();
        return;
      }
      if (ctx.viewMode !== 'gallery' || ctx.isGalleryEditing) return;

      const { navigable, selectedId, selectedGroup } = ctx;
      let index = navigable.findIndex(n => String(n.car.ID) === String(selectedId) && n.groupName === selectedGroup);
      if (index < 0) index = navigable.findIndex(n => String(n.car.ID) === String(selectedId));
      const go = (target) => {
        ctx.select(target.car, target.groupName);
        ctx.scrollToCar?.(target.car, target.groupName);
      };
      const step = (delta) => {
        if (!navigable.length) return;
        const next = index < 0 ? 0 : Math.max(0, Math.min(navigable.length - 1, index + delta));
        go(navigable[next]);
      };
      // Up/down use the rendered layout, not list arithmetic: group headers
      // and row spacers occupy grid cells, so "one row down" is whichever card
      // sits nearest below the current one on screen.
      const moveRow = (dir) => {
        const pane = ctx.gridPaneRef?.current;
        const cur = pane && ((selectedGroup && pane.querySelector(`[data-car-id="${selectedId}"][data-group="${selectedGroup}"]`))
          || pane.querySelector(`[data-car-id="${selectedId}"]`));
        if (!cur) { step(dir); return; }
        const r = cur.getBoundingClientRect();
        const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
        const rows = [];
        for (const el of pane.querySelectorAll('[data-car-id][data-group]')) {
          if (el === cur) continue;
          const b = el.getBoundingClientRect();
          if (!b.width || !b.height) continue;
          const by = (b.top + b.bottom) / 2;
          if (dir > 0 ? by <= r.bottom : by >= r.top) continue;
          rows.push({ el, by, dx: Math.abs((b.left + b.right) / 2 - cx), dy: Math.abs(by - cy) });
        }
        if (!rows.length) return;
        const nearestY = Math.min(...rows.map(c => c.dy));
        const band = rows.filter(c => c.dy - nearestY < r.height * 0.6);
        const pick = band.reduce((a, b) => (b.dx < a.dx ? b : a));
        const id = pick.el.dataset.carId, group = pick.el.dataset.group;
        const target = navigable.find(n => String(n.car.ID) === id && n.groupName === group) || navigable.find(n => String(n.car.ID) === id);
        if (target) go(target);
      };

      switch (e.key) {
        case 'ArrowRight': e.preventDefault(); step(1); return;
        case 'ArrowLeft': e.preventDefault(); step(-1); return;
        case 'ArrowDown': e.preventDefault(); moveRow(1); return;
        case 'ArrowUp': e.preventDefault(); moveRow(-1); return;
        case 'Home': e.preventDefault(); step(-navigable.length); return;
        case 'End': e.preventDefault(); step(navigable.length); return;
        case ' ': {
          const cur = index >= 0 ? navigable[index] : null;
          if (cur && cur.stackSize > 1) { e.preventDefault(); ctx.toggleStack(`${cur.groupName}::${cur.stackKey}`); }
          return;
        }
        case 'Enter': if (selectedId != null) { e.preventDefault(); ctx.openHero(); } return;
        case 'e': case 'E': if (ctx.canEdit && selectedId != null) { e.preventDefault(); ctx.edit(); } return;
        default: return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ctxRef]);
}
