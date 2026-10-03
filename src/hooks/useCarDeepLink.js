import { useEffect } from 'react';

// ?car=<id> in the URL: read once at startup so the initial selection can
// honour it, and mirror the current selection back so the address bar is
// always a shareable link to what's on screen.

export const readInitialCarId = () => new URLSearchParams(window.location.search).get('car');

// `enabled` should stay false until the car list has loaded, otherwise the
// null initial selection would wipe the incoming parameter before use.
export function useCarDeepLink(selectedCarId, enabled) {
  useEffect(() => {
    if (!enabled) return;
    const params = new URLSearchParams(window.location.search);
    const current = params.get('car');
    const wanted = selectedCarId != null ? String(selectedCarId) : null;
    if (current === wanted) return;
    if (wanted) params.set('car', wanted); else params.delete('car');
    const qs = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash);
  }, [selectedCarId, enabled]);
}
