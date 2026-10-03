import { useCallback, useEffect, useState } from 'react';

// localStorage-backed display preferences: theme, stacked/flat gallery,
// auto-scroll to the selected card, and the local/remote image source.
export function useUiPrefs() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme') || 'dark';
    document.documentElement.dataset.theme = saved;
    return saved;
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const [stackingEnabled, setStackingEnabled] = useState(() => localStorage.getItem('stackingEnabled') !== 'false');
  useEffect(() => { localStorage.setItem('stackingEnabled', String(stackingEnabled)); }, [stackingEnabled]);

  // 'name' = the standard make/model/year order; 'rating' = best rated first
  // within each group (needs the stats file to be present).
  const [sortMode, setSortMode] = useState(() => (localStorage.getItem('sortMode') === 'rating' ? 'rating' : 'name'));
  useEffect(() => { localStorage.setItem('sortMode', sortMode); }, [sortMode]);

  const [autoScroll, setAutoScroll] = useState(() => localStorage.getItem('autoScroll') !== 'false');
  const toggleAutoScroll = useCallback(() => {
    setAutoScroll(prev => { const next = !prev; localStorage.setItem('autoScroll', String(next)); return next; });
  }, []);

  // BASE_PATH is computed once at module load from this flag, so switching
  // requires a reload.
  const useRemoteImages = localStorage.getItem('useRemoteImages') === 'true';
  const toggleImageSource = useCallback(() => {
    localStorage.setItem('useRemoteImages', String(!useRemoteImages));
    window.location.reload();
  }, [useRemoteImages]);

  return { theme, setTheme, stackingEnabled, setStackingEnabled, sortMode, setSortMode, autoScroll, toggleAutoScroll, useRemoteImages, toggleImageSource };
}
