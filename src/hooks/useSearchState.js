import { useEffect, useState } from 'react';

// Search box + car/release mode, debounced and mirrored into the URL query
// string (?q=...&mode=release) so a search survives reload / can be shared.
export function useSearchState() {
  const [searchMode, setSearchMode] = useState(() => (new URLSearchParams(window.location.search).get('mode') === 'release' ? 'release' : 'car'));
  const [searchInput, setSearchInput] = useState(() => new URLSearchParams(window.location.search).get('q') || '');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(() => new URLSearchParams(window.location.search).get('q') || '');

  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearchTerm(searchInput), 1000);
    return () => clearTimeout(h);
  }, [searchInput]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (debouncedSearchTerm) params.set('q', debouncedSearchTerm); else params.delete('q');
    if (searchMode !== 'car') params.set('mode', searchMode); else params.delete('mode');
    const qs = params.toString();
    const newUrl = window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash;
    window.history.replaceState(null, '', newUrl);
  }, [debouncedSearchTerm, searchMode]);

  return { searchMode, setSearchMode, searchInput, setSearchInput, debouncedSearchTerm };
}
