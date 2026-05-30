import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, startTransition } from 'react';
import categoryOrderData from './category_order.json';
import './App.css';

import { BASE_PATH, FICTIONAL_MAKES, MAKE_COUNTRY, thStyle, tdStyle } from './constants';
import { sortCars, getNextAvailableId, parseArr, toAppCar, toDBRow, getCarDisplayName } from './utils/carUtils';
import { useImagePreloader } from './hooks/useImagePreloader';
import CountryFlags from './components/CountryFlags';
import GalleryEditorForm from './components/GalleryEditorForm';
import CarListRow from './components/CarListRow';
import { getStackKey } from './components/GalleryCards';
import { SidebarContent, SecondarySidebar } from './components/SidebarContent';
import GalleryGrid from './components/GalleryGrid';

function App({ isPublic = false }) {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);

  const [sidebarView, _setSidebarView] = useState('make');
  const [selectedLetter, _setSelectedLetter] = useState(null);
  const [searchMode, setSearchMode] = useState('car');
  const [viewMode, _setViewMode] = useState('gallery');

  const setSidebarView    = useCallback((v) => startTransition(() => _setSidebarView(v)),    []);
  const setSelectedLetter = useCallback((v) => startTransition(() => _setSelectedLetter(v)), []);
  const setViewMode       = useCallback((v) => startTransition(() => _setViewMode(v)),       []);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  const [selectedCar, setSelectedCar] = useState(null);
  const [isGalleryEditing, setIsGalleryEditing] = useState(false);
  const isGalleryEditingRef = useRef(false);
  isGalleryEditingRef.current = isGalleryEditing;

  const [isListEditing, setIsListEditing] = useState(false);
  const [listDrafts, setListDrafts] = useState({});
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkField, setBulkField] = useState('Brand');
  const [bulkValue, setBulkValue] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  const [imageUpdates, setImageUpdates] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [dragTarget, setDragTarget] = useState(null);
  const [sensitivePreview, setSensitivePreview] = useState(null);
  const [heroPopupOpen, setHeroPopupOpen] = useState(false);
  const [backupAvailable, setBackupAvailable] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [toast, setToast] = useState({ message: '', type: 'success', visible: false });

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 700);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mobileFileInputRef = useRef(null);
  const isMobileRef = useRef(isMobile);

  const [missingData, setMissingData] = useState([]);
  const [missingLoading, setMissingLoading] = useState(false);
  const [missingSubTab, setMissingSubTab] = useState('missing');

  const [expandedStacks, setExpandedStacks] = useState(new Set());
  const [stackingEnabled, setStackingEnabled] = useState(true);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme') || 'dark';
    document.documentElement.dataset.theme = saved;
    return saved;
  });

  const [columnCount, setColumnCount] = useState(1);
  const carGridRef = useRef(null);
  const gridPaneRef = useRef(null);
  const carInfoRef = useRef(null);

  const [soundEnabled, setSoundEnabled] = useState(false);
  const bgAudioRef = useRef(null);
  const audioCtxRef = useRef(null);
  const selectBufferRef = useRef(null);

  useEffect(() => {
    if (!bgAudioRef.current) {
      bgAudioRef.current = new Audio('/bg.mp3');
      bgAudioRef.current.loop = true;
      bgAudioRef.current.volume = 0.5;
    }
  }, []);

  useEffect(() => {
    const bg = bgAudioRef.current;
    if (!bg) return;
    if (soundEnabled) {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      if (!bg._mediaSourceNode) {
        bg._mediaSourceNode = ctx.createMediaElementSource(bg);
        bg._mediaSourceNode.connect(ctx.destination);
      }
      bg.play().catch(() => {});
      if (!selectBufferRef.current) {
        fetch('/select.wav')
          .then(r => r.arrayBuffer())
          .then(buf => ctx.decodeAudioData(buf))
          .then(decoded => { selectBufferRef.current = decoded; })
          .catch(() => {});
      }
    } else {
      bg.pause();
      bg.currentTime = 0;
    }
  }, [soundEnabled]);

  const playSelectSound = useCallback(async () => {
    if (!soundEnabled || !selectBufferRef.current || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') await ctx.resume();
    const src = ctx.createBufferSource();
    src.buffer = selectBufferRef.current;
    src.connect(ctx.destination);
    src.start();
  }, [soundEnabled]);

  const groupedAndFilteredCarsRef = useRef([]);

  const selectedIdRef = useRef(null);
  selectedIdRef.current = selectedCar?.ID ?? null;
  const selectedCardElRef = useRef(null);

  // Applies .selected CSS class imperatively so card selection doesn't rebuild gallery nodes.
  useLayoutEffect(() => {
    const container = gridPaneRef.current;
    if (!container) return;
    const id = selectedIdRef.current;

    selectedCardElRef.current?.classList.remove('selected');
    selectedCardElRef.current = null;
    if (id == null) return;

    const cardEl = container.querySelector(`.car-card[data-car-id="${id}"]`);
    if (cardEl) { cardEl.classList.add('selected'); selectedCardElRef.current = cardEl; return; }

    const stackEl = container.querySelector(`[data-stack-car-ids~="${id}"]`);
    if (stackEl) { stackEl.classList.add('selected'); selectedCardElRef.current = stackEl; }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => { setToast(prev => ({ ...prev, visible: false })); }, 3000);
  }, []);

  const toggleStack = useCallback((key) => {
    setExpandedStacks(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!selectedCar) return;
    setHeroPopupOpen(false);
    const t = imageUpdates[selectedCar.ID] ? `?t=${imageUpdates[selectedCar.ID]}` : '';
    new Image().src = `${BASE_PATH}/half_standard_cars/${selectedCar.ID} (1).jpg${t}`;
    if (carInfoRef.current) carInfoRef.current.scrollTop = 0;
  }, [selectedCar?.ID, imageUpdates]);

  useEffect(() => {
    if (!expandedStacks.size) return;
    for (const car of cars) {
      if (expandedStacks.has(getStackKey(car))) {
        const t = imageUpdates[car.ID] ? `?t=${imageUpdates[car.ID]}` : '';
        new Image().src = `${BASE_PATH}/half_standard_cars/${car.ID} (1).jpg${t}`;
      }
    }
  }, [expandedStacks, cars, imageUpdates]);

  useEffect(() => {
    const onResize = () => { const mobile = window.innerWidth < 700; isMobileRef.current = mobile; setIsMobile(mobile); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const uploadFiles = useCallback(async (files) => {
    const valid = files.filter(f => f.name.toLowerCase().includes('(1).jpg') || f.name.toLowerCase().includes('(2).jpg'));
    if (!valid.length) return showToast('Only files ending in (1).jpg or (2).jpg are accepted.', 'error');
    showToast(`Processing ${valid.length} image(s)...`, 'success');
    const formData = new FormData();
    valid.forEach(f => formData.append('files', f));
    try {
      const response = await fetch('http://localhost:5000/api/upload', { method: 'POST', body: formData });
      if (response.ok) {
        const data = await response.json();
        showToast(data.message, 'success');
        const now = Date.now();
        const newUpdates = {};
        valid.forEach(f => { const m = f.name.match(/^(\d+)/); if (m) newUpdates[m[1]] = now; });
        setImageUpdates(prev => ({ ...prev, ...newUpdates }));
      } else { showToast(`Processing failed: ${(await response.json()).error}`, 'error'); }
    } catch { showToast('Server unreachable. Is server.py running?', 'error'); }
  }, [showToast]);

  const uploadFilesBrightness = useCallback(async (files) => {
    const valid = files.filter(f => f.name.toLowerCase().includes('(1).jpg') || f.name.toLowerCase().includes('(2).jpg'));
    if (!valid.length) return showToast('Only files ending in (1).jpg or (2).jpg are accepted.', 'error');
    showToast(`Adjusting brightness for ${valid.length} image(s)...`, 'success');
    const formData = new FormData();
    valid.forEach(f => formData.append('files', f));
    try {
      const response = await fetch('http://localhost:5000/api/upload-brightness', { method: 'POST', body: formData });
      if (response.ok) {
        const data = await response.json();
        showToast(data.message, 'success');
        const now = Date.now();
        const newUpdates = {};
        valid.forEach(f => { const m = f.name.match(/^(\d+)/); if (m) newUpdates[m[1]] = now; });
        setImageUpdates(prev => ({ ...prev, ...newUpdates }));
      } else { showToast(`Processing failed: ${(await response.json()).error}`, 'error'); }
    } catch { showToast('Server unreachable. Is server.py running?', 'error'); }
  }, [showToast]);

  const uploadFilesMonster = useCallback(async (files) => {
    const valid = files.filter(f => f.name.toLowerCase().includes('(1).jpg') || f.name.toLowerCase().includes('(2).jpg'));
    if (!valid.length) return showToast('Only files ending in (1).jpg or (2).jpg are accepted.', 'error');
    showToast(`Processing ${valid.length} image(s) as Monster Truck...`, 'success');
    const formData = new FormData();
    valid.forEach(f => formData.append('files', f));
    try {
      const response = await fetch('http://localhost:5000/api/upload-monster', { method: 'POST', body: formData });
      if (response.ok) {
        const data = await response.json();
        showToast(data.message, 'success');
        const now = Date.now();
        const newUpdates = {};
        valid.forEach(f => { const m = f.name.match(/^(\d+)/); if (m) newUpdates[m[1]] = now; });
        setImageUpdates(prev => ({ ...prev, ...newUpdates }));
      } else { showToast(`Processing failed: ${(await response.json()).error}`, 'error'); }
    } catch { showToast('Server unreachable. Is server.py running?', 'error'); }
  }, [showToast]);

  const fetchSensitivePreview = useCallback(async (file, startPct) => {
    showToast(`Generating ${Math.round(startPct * 100)}%–${Math.round((startPct + 19 * 0.05) * 100)}%...`, 'success');
    const formData = new FormData();
    formData.append('files', file);
    formData.append('start_pct', String(startPct));
    formData.append('count', '20');
    try {
      const response = await fetch('http://localhost:5000/api/upload-sensitive-preview', { method: 'POST', body: formData });
      if (response.ok) {
        const data = await response.json();
        setSensitivePreview({ file, filename: data.filename, variants: data.variants, startPct });
      } else { showToast(`Processing failed: ${(await response.json()).error}`, 'error'); }
    } catch { showToast('Server unreachable. Is server.py running?', 'error'); }
  }, [showToast]);

  const uploadFilesSensitive = useCallback(async (files) => {
    const valid = files.filter(f => f.name.toLowerCase().includes('(1).jpg'));
    if (!valid.length) return showToast('Only (1).jpg files are accepted for sensitive detection.', 'error');
    if (valid.length > 1) return showToast('Drop one image at a time for sensitive detection.', 'error');
    fetchSensitivePreview(valid[0], 0);
  }, [showToast, fetchSensitivePreview]);

  const handleSaveSensitive = useCallback(async (filename, b64) => {
    try {
      const response = await fetch('http://localhost:5000/api/save-sensitive', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, b64 }),
      });
      if (response.ok) {
        showToast((await response.json()).message, 'success');
        const m = filename.match(/^(\d+)/);
        if (m) setImageUpdates(prev => ({ ...prev, [m[1]]: Date.now() }));
      } else { showToast(`Save failed: ${(await response.json()).error}`, 'error'); }
    } catch { showToast('Server unreachable. Is server.py running?', 'error'); }
    setSensitivePreview(null);
  }, [showToast]);

  const fetchMissingData = useCallback(async () => {
    setMissingLoading(true);
    const key = localStorage.getItem('adminApiKey');
    try {
      const response = await fetch('/api/cars/missing-images', {
        headers: key ? { 'Authorization': `Bearer ${key}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        const enriched = data.missing.map(item => {
          const car = cars.find(c => String(c.ID) === String(item.id)) || {};
          return { id: item.id, year: car.Year || '', make: car.Make || '', model: car.Model || '', supername: car.Supername || '', brand: car.Brand || '', series: car.Series || '', missing_side: item.missing_side, missing_hero: item.missing_hero };
        });
        setMissingData(enriched);
      } else { showToast('Failed to fetch missing image data', 'error'); }
    } catch { showToast('API unreachable.', 'error'); }
    finally { setMissingLoading(false); }
  }, [showToast, cars]);

  useEffect(() => { if (viewMode === 'missing') fetchMissingData(); }, [viewMode, fetchMissingData]);
  useEffect(() => { const h = setTimeout(() => setDebouncedSearchTerm(searchInput), 1000); return () => clearTimeout(h); }, [searchInput]);
  useEffect(() => { setCurrentPage(1); }, [debouncedSearchTerm, searchMode, sidebarView, viewMode]);

  useEffect(() => {
    if (viewMode !== 'gallery' || !selectedCar) return;
    const raf = requestAnimationFrame(() => {
      const card = gridPaneRef.current?.querySelector(`[data-car-id="${selectedCar.ID}"]`);
      if (card) { card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return; }
      const selectedKey = getStackKey(selectedCar);
      for (const { visibleGroupCars } of groupedAndFilteredCarsRef.current) {
        for (const car of visibleGroupCars) {
          if (getStackKey(car) === selectedKey) {
            const coverEl = gridPaneRef.current?.querySelector(`[data-car-id="${car.ID}"]`);
            if (coverEl) { coverEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return; }
            break;
          }
        }
      }
      if (gridPaneRef.current) gridPaneRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(raf);
  }, [debouncedSearchTerm, searchMode, sidebarView, viewMode, selectedCar]);

  useEffect(() => {
    if (viewMode !== 'gallery') return;
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
  }, [loading, viewMode]);

  useLayoutEffect(() => {
    if (viewMode !== 'gallery' || !carGridRef.current) return;
    const t = window.getComputedStyle(carGridRef.current).getPropertyValue('grid-template-columns');
    if (t && t !== 'none') { const cols = Math.max(1, t.split(' ').length); setColumnCount(prev => prev === cols ? prev : cols); }
  });

  useEffect(() => {
    setLoading(true);
    fetch(isPublic ? '/api/cars/public' : '/api/cars')
      .then(r => r.json())
      .then(data => {
        const sortedCars = sortCars(data.map(toAppCar));
        if (sortedCars.length > 0) {
          const stillExists = selectedCar ? sortedCars.find(c => c.ID === selectedCar.ID) : null;
          setSelectedCar(stillExists || sortedCars[0]);
        }
        setLoading(false);
        startTransition(() => setCars(sortedCars));
      })
      .catch(() => setLoading(false));
  }, [refreshTrigger]);

  useEffect(() => {
    fetch('/api/makes')
      .then(r => r.json())
      .then(data => data.forEach(m => MAKE_COUNTRY.set(m.name, parseArr(m.countries))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedLetter) return;
    if (isMobile) return;
    const handle = (e) => {
      if (e.target.closest('.sidebar') || e.target.closest('.secondary-sidebar')) return;
      setSelectedLetter(null);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [selectedLetter, isMobile]);

  const handleDragEnter = (e) => { e.preventDefault(); if (e.dataTransfer.types.includes('Files')) setIsDragging(true); };
  const handleOverlayDragLeave = (e) => { e.preventDefault(); if (!e.currentTarget.contains(e.relatedTarget)) { setIsDragging(false); setDragTarget(null); } };
  const handleHalfDragLeave = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragTarget(null); };
  const handleDrop = async (e) => { e.preventDefault(); setIsDragging(false); setDragTarget(null); uploadFiles(Array.from(e.dataTransfer.files)); };
  const handleDropBrightness = async (e) => { e.preventDefault(); setIsDragging(false); setDragTarget(null); uploadFilesBrightness(Array.from(e.dataTransfer.files)); };
  const handleDropMonster = async (e) => { e.preventDefault(); setIsDragging(false); setDragTarget(null); uploadFilesMonster(Array.from(e.dataTransfer.files)); };
  const handleDropSensitive = async (e) => { e.preventDefault(); setIsDragging(false); setDragTarget(null); uploadFilesSensitive(Array.from(e.dataTransfer.files)); };
  const handleMobileFileSelect = (e) => { uploadFiles(Array.from(e.target.files)); e.target.value = ''; };

  const getHeroImage = (id) => `${BASE_PATH}/standard_hero_shots/${id} (2).jpg${imageUpdates[id] ? `?t=${imageUpdates[id]}` : ''}`;
  const fallbackGridImage = `${BASE_PATH}/mystery_side.jpg`;
  const fallbackHeroImage = `${BASE_PATH}/mystery_hero.jpg`;

  const flushListDrafts = () => {
    if (Object.keys(listDrafts).length === 0) return cars;
    const updatedCars = cars.map(car => listDrafts[car.ID] ? { ...car, ...listDrafts[car.ID] } : car);
    const sorted = sortCars(updatedCars);
    setCars(sorted);
    setListDrafts({});
    return sorted;
  };

  const toggleListEditMode = () => { if (isListEditing) flushListDrafts(); setIsListEditing(!isListEditing); };

  const saveToDB = async (explicitData) => {
    let dataToSave = Array.isArray(explicitData) ? explicitData : cars;
    if (!Array.isArray(explicitData) && viewMode === 'list' && isListEditing) {
      dataToSave = flushListDrafts();
      setIsListEditing(false);
      setCars(sortCars(dataToSave));
    }
    const payload = sortCars(dataToSave).map(toDBRow);
    const key = localStorage.getItem('adminApiKey');
    try {
      const response = await fetch('/api/cars/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(key ? { 'Authorization': `Bearer ${key}` } : {}) },
        body: JSON.stringify(payload),
      });
      if (response.ok) { showToast('Changes saved to database!', 'success'); setBackupAvailable(false); }
      else { showToast(`Failed to save: ${(await response.json()).error}`, 'error'); }
    } catch { showToast('API unreachable.', 'error'); }
  };

  const saveSingleCar = useCallback(async (car) => {
    const key = localStorage.getItem('adminApiKey');
    try {
      const response = await fetch(`/api/cars/${car.ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(key ? { 'Authorization': `Bearer ${key}` } : {}) },
        body: JSON.stringify(toDBRow(car)),
      });
      if (response.ok) showToast('Saved!', 'success');
      else showToast(`Failed to save: ${(await response.json()).error}`, 'error');
    } catch { showToast('API unreachable.', 'error'); }
  }, [showToast]);

  const saveListChanges = useCallback(async () => {
    const changedIds = Object.keys(listDrafts);
    if (changedIds.length === 0) return showToast('No unsaved changes', 'success');
    const payload = changedIds
      .map(id => { const base = cars.find(c => String(c.ID) === String(id)); return base ? toDBRow({ ...base, ...listDrafts[id] }) : null; })
      .filter(Boolean);
    const key = localStorage.getItem('adminApiKey');
    try {
      const response = await fetch('/api/cars/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(key ? { 'Authorization': `Bearer ${key}` } : {}) },
        body: JSON.stringify(payload),
      });
      if (response.ok) { flushListDrafts(); showToast(`Saved ${payload.length} car${payload.length === 1 ? '' : 's'} to database!`, 'success'); }
      else showToast(`Failed to save: ${(await response.json()).error}`, 'error');
    } catch { showToast('API unreachable.', 'error'); }
  }, [listDrafts, cars, showToast]);

  const handlePublish = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/publish', { method: 'POST' });
      if (response.ok) showToast((await response.json()).message, 'success');
      else showToast(`Publish failed: ${(await response.json()).error}`, 'error');
    } catch { showToast('Server unreachable. Is server.py running?', 'error'); }
  };

  const undoSave = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/undo', { method: 'POST' });
      if (response.ok) { showToast('Undo successful! Previous version restored.', 'success'); setBackupAvailable(false); setRefreshTrigger(prev => prev + 1); }
      else showToast(`Failed to undo: ${(await response.json()).error}`, 'error');
    } catch { showToast("Server unreachable to undo.", 'error'); }
  };

  const handleCreateNew = ({ make = '', brand = '' } = {}) => {
    const newId = getNextAvailableId(cars);
    const newCar = { ID: newId, Make: make, Model: '', Supername: '', Year: sidebarView === 'decade' && selectedLetter && selectedLetter !== 'Unknown' ? selectedLetter : '', Brand: brand, Series: '', Country: [], Category: [], Description: '', Broken_image: 'FALSE', Cover: false, NameFormat: 0 };
    if (viewMode === 'gallery') {
      setSelectedCar(newCar);
      setIsGalleryEditing(true);
    } else {
      const currentCars = flushListDrafts();
      setCars([newCar, ...currentCars]);
      setIsListEditing(true);
      setCurrentPage(1);
      showToast(`New empty row added at the top! (ID: ${newId})`, 'success');
      document.querySelector('.table-container')?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleFillToId = () => {
    const input = window.prompt('Fill empty cars up to ID:');
    if (input === null) return;
    const targetId = parseInt(input, 10);
    if (isNaN(targetId) || targetId < 1) return showToast('Invalid ID', 'error');
    const existingIds = new Set(cars.map(c => Number(c.ID)));
    const newCars = [];
    for (let id = 1; id <= targetId; id++) {
      if (!existingIds.has(id)) newCars.push({ ID: id, Make: '', Model: 'UNNAMED_CAR', Supername: '', Year: '', Brand: '', Series: '', Country: [], Category: [], Description: '', Broken_image: 'FALSE', Cover: false, NameFormat: 0 });
    }
    if (newCars.length === 0) return showToast('No gaps found up to ID ' + targetId, 'success');
    const updated = sortCars([...cars, ...newCars]);
    setCars(updated);
    saveToDB(updated);
    showToast(`Added ${newCars.length} UNNAMED_CAR entr${newCars.length === 1 ? 'y' : 'ies'} up to ID ${targetId}`, 'success');
  };

  const handleCreateSameCasting = () => {
    if (!selectedCar) return;
    const newId = getNextAvailableId(cars);
    const newCar = { ID: newId, Make: selectedCar.Make || '', Model: selectedCar.Model || '', Supername: '', Year: selectedCar.Year || '', Brand: selectedCar.Brand || '', Series: '', Country: [], Category: Array.isArray(selectedCar.Category) ? [...selectedCar.Category] : [], Description: selectedCar.Description || '', Broken_image: 'FALSE', Cover: false, NameFormat: 0 };
    setSelectedCar(newCar);
    setIsGalleryEditing(true);
  };

  const handleDeleteGallery = async () => {
    if (!selectedCar) return;
    if (window.confirm(`Are you sure you want to completely delete #${selectedCar.ID}: ${selectedCar.Make} ${selectedCar.Model}?`)) {
      const id = selectedCar.ID;
      const updatedCars = cars.filter(c => String(c.ID) !== String(id));
      setCars(updatedCars);
      setSelectedCar(updatedCars.length > 0 ? updatedCars[0] : null);
      setIsGalleryEditing(false);
      const key = localStorage.getItem('adminApiKey');
      const authHeader = key ? { 'Authorization': `Bearer ${key}` } : {};
      await fetch(`/api/cars/${id}`, { method: 'DELETE', headers: authHeader });
      try {
        const res = await fetch('http://localhost:5000/api/exile-images', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id] }) });
        const data = await res.json();
        showToast(`Deleted #${id}${data.moved?.length ? ` — ${data.moved.length} image(s) moved to exile` : ''}`, 'success');
      } catch { showToast(`Deleted #${id}`, 'success'); }
    }
  };

  const applyBulkDelete = async () => {
    if (selectedIds.size === 0) return showToast('Select at least one car to delete', 'error');
    if (window.confirm(`Are you absolutely sure you want to delete ${selectedIds.size} cars? This will free up their IDs.`)) {
      const ids = [...selectedIds];
      const updatedCars = cars.filter(c => !selectedIds.has(c.ID));
      setCars(updatedCars);
      setListDrafts(prev => { const nd = { ...prev }; ids.forEach(id => delete nd[id]); return nd; });
      setSelectedIds(new Set());
      const key = localStorage.getItem('adminApiKey');
      const authHeader = key ? { 'Authorization': `Bearer ${key}` } : {};
      await fetch('/api/cars/bulk-delete', { method: 'POST', headers: { ...authHeader, 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
      try {
        const res = await fetch('http://localhost:5000/api/exile-images', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
        const data = await res.json();
        showToast(`Deleted ${ids.length} cars${data.moved?.length ? ` — ${data.moved.length} image(s) moved to exile` : ''} and saved!`, 'success');
      } catch { showToast(`Deleted ${ids.length} cars and saved!`, 'success'); }
    }
  };

  const handleApplyGalleryEdits = useCallback((finalDraft) => {
    setSelectedCar(finalDraft);
    setCars(prevCars => {
      const exists = prevCars.some(c => c.ID === finalDraft.ID);
      return sortCars(exists ? prevCars.map(c => c.ID === finalDraft.ID ? finalDraft : c) : [...prevCars, finalDraft]);
    });
    setIsGalleryEditing(false);
  }, []);

  const cancelGalleryEdits = useCallback(() => {
    setIsGalleryEditing(false);
    if (selectedCar && !cars.some(c => c.ID === selectedCar.ID)) setSelectedCar(cars.length > 0 ? cars[0] : null);
  }, [selectedCar, cars]);

  const handleSwapIds = () => {
    const targetId = prompt(`Enter the ID you want to swap with #${selectedCar.ID}:`);
    if (!targetId || targetId.trim() === '') return;
    const cleanTargetId = String(targetId.trim());
    if (cleanTargetId === String(selectedCar.ID)) return;
    const targetCar = cars.find(c => String(c.ID) === cleanTargetId);
    if (!targetCar) return showToast(`Car with ID #${cleanTargetId} not found.`, "error");
    if (!window.confirm(`Swap ID #${selectedCar.ID} with ID #${targetCar.ID}?\n\n#${selectedCar.ID}: ${selectedCar.Make} ${selectedCar.Model}\n#${targetCar.ID}: ${targetCar.Make} ${targetCar.Model}`)) return;
    const swappedCars = sortCars(cars.map(c => {
      if (String(c.ID) === String(selectedCar.ID)) return { ...c, ID: targetCar.ID };
      if (String(c.ID) === String(targetCar.ID)) return { ...c, ID: selectedCar.ID };
      return c;
    }));
    setCars(swappedCars);
    setSelectedCar(prev => ({ ...prev, ID: targetCar.ID }));
    saveToDB(swappedCars);
  };

  const handleCellChange = useCallback((id, field, value) => {
    setListDrafts(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: value } }));
  }, []);

  const handleSelectRow = useCallback((id) => {
    setSelectedIds(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s; });
  }, []);

  const applyBulk = () => {
    if (selectedIds.size === 0) return showToast('Select at least one car first', 'error');
    if (!bulkValue.trim() && bulkField !== 'Year') return showToast('Enter a value to apply', 'error');
    let parsed;
    if (bulkField === 'Category') parsed = bulkValue.split(',').map(c => c.trim()).filter(Boolean);
    else if (bulkField === 'Country') parsed = bulkValue.split(',').map(c => c.trim().toUpperCase()).filter(Boolean);
    else parsed = bulkValue.trim();
    setListDrafts(prev => {
      const nd = { ...prev };
      selectedIds.forEach(id => { nd[id] = { ...(nd[id] || {}), [bulkField]: parsed }; });
      return nd;
    });
    showToast(`${bulkField} applied to ${selectedIds.size} car${selectedIds.size === 1 ? '' : 's'}`, 'success');
    setSelectedIds(new Set());
    setBulkValue('');
  };

  const brands = useMemo(() => [...new Set(cars.map(c => c.Brand || 'Unknown'))].sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' })), [cars]);

  const categories = useMemo(() => {
    const cats = [...new Set(cars.flatMap(c => Array.isArray(c.Category) ? c.Category : []).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    if (cars.some(c => !(Array.isArray(c.Category) ? c.Category.length : (c.Category || '').trim()))) cats.push('Uncategorised');
    return cats;
  }, [cars]);

  const categoriesOrdered = useMemo(() => {
    const order = categoryOrderData.categories;
    const orderIndex = new Map(order.map((c, i) => [c, i]));
    const actual = [...new Set(cars.flatMap(c => Array.isArray(c.Category) ? c.Category : []).filter(Boolean))];
    actual.sort((a, b) => {
      const ia = orderIndex.has(a) ? orderIndex.get(a) : Infinity;
      const ib = orderIndex.has(b) ? orderIndex.get(b) : Infinity;
      if (ia !== ib) return ia - ib;
      return a.localeCompare(b, undefined, { sensitivity: 'base' });
    });
    if (cars.some(c => !(Array.isArray(c.Category) ? c.Category.length : (c.Category || '').trim()))) actual.push('Uncategorised');
    return actual;
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
  groupedAndFilteredCarsRef.current = groupedAndFilteredCars;

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

  const visibleCarsForPreload = useMemo(
    () => viewMode === 'gallery' ? galleryGroups.flatMap(g => g.visibleGroupCars) : [],
    [galleryGroups, viewMode]
  );
  useImagePreloader(cars, imageUpdates, visibleCarsForPreload, gridPaneRef, viewMode === 'gallery');

  useEffect(() => {
    if (!debouncedSearchTerm.trim()) return;
    const firstCar = groupedAndFilteredCars[0]?.visibleGroupCars[0];
    if (firstCar) setSelectedCar(firstCar);
  }, [debouncedSearchTerm]);

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

  const totalPages = Math.max(1, Math.ceil(visibleCarsCount / itemsPerPage));
  const pageCarStart = (currentPage - 1) * itemsPerPage;
  const pageCarEnd = currentPage * itemsPerPage;
  const currentListItems = (() => {
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
  })();
  const carsBeforePage = pageCarStart;
  const carsOnPage = currentListItems.filter(i => i.type === 'car').length;

  const handleSidebarClick = useCallback((groupName) => {
    if (isMobileRef.current) {
      setSidebarOpen(false);
      if (sidebarView === 'brand' || sidebarView === 'category') setSelectedLetter(groupName);
    }
    const group = groupedAndFilteredCars.find(g => g.groupName === groupName);
    const firstCar = group?.visibleGroupCars[0];
    if (firstCar) setSelectedCar(firstCar);
    const elId = `header-${groupName}`;
    if (viewMode === 'list') {
      let carsBeforeGroup = 0;
      for (const item of flatListItems) {
        if (item.type === 'header' && item.groupName === groupName) break;
        if (item.type === 'car') carsBeforeGroup++;
      }
      const targetPage = Math.floor(carsBeforeGroup / itemsPerPage) + 1;
      if (currentPage !== targetPage) { setCurrentPage(targetPage); setTimeout(() => document.getElementById(elId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); return; }
    }
    document.getElementById(elId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [viewMode, flatListItems, currentPage, itemsPerPage, groupedAndFilteredCars, sidebarView]);

  const handleSelectAll = () => {
    if (selectedIds.size === visibleCarsCount && visibleCarsCount > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(groupedAndFilteredCars.flatMap(g => g.visibleGroupCars.map(c => c.ID))));
  };

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

  useEffect(() => {
    if (sidebarView === 'make' && selectedLetter && !visibleLetters.includes(selectedLetter)) setSelectedLetter(null);
    if (sidebarView === 'decade' && selectedLetter && !visibleDecades.includes(selectedLetter)) setSelectedLetter(null);
  }, [visibleLetters, visibleDecades, sidebarView, selectedLetter]);

  const showDirectLogos = sidebarView === 'make' && groupedAndFilteredCars.length < 20;
  const showAlphabetDrawer = sidebarView === 'make' && groupedAndFilteredCars.length >= 20;
  const showDecadeDrawer = sidebarView === 'decade';
  const showDrawer = (showAlphabetDrawer && selectedLetter) || (showDecadeDrawer && selectedLetter);

  const handleSelectCar = useCallback((car) => { setSelectedCar(car); playSelectSound(); }, [playSelectSound]);

  // ─── RENDER ────────────────────────────────────────────────────────────────

  if (loading) return <div className="loading">Loading Car Collection...</div>;

  const selectedCarFullName = selectedCar ? getCarDisplayName(selectedCar) : '';

  return (
    <div className="main-layout" onDragEnter={handleDragEnter} style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', position: 'relative', backgroundColor: 'var(--bg)' }}>

      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 98 }} />
      )}

      {isMobile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '48px', backgroundColor: '#fff', borderBottom: '1px solid #ddd', display: 'flex', alignItems: 'center', padding: '0 8px', gap: '6px', zIndex: 50, flexShrink: 0 }}>
          <button onClick={() => setSidebarOpen(true)} style={{ padding: '8px 10px', fontSize: '1.1em', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#333', lineHeight: 1, flexShrink: 0 }}>☰</button>
          <span style={{ fontWeight: 'bold', color: '#333', flex: 1, fontSize: '0.9em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Car Collection</span>
          {!isPublic && backupAvailable && <button onClick={undoSave} style={{ padding: '5px 8px', fontSize: '0.72em', fontWeight: 'bold', backgroundColor: '#ffc107', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', flexShrink: 0 }}>Undo</button>}
          {!isPublic && <button onClick={() => mobileFileInputRef.current?.click()} style={{ padding: '5px 10px', fontSize: '0.75em', fontWeight: 'bold', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', flexShrink: 0 }}>Upload</button>}
          {!isPublic && <button onClick={handleCreateNew} style={{ padding: '5px 10px', fontSize: '0.75em', fontWeight: 'bold', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', flexShrink: 0 }}>+ New</button>}
          <input ref={mobileFileInputRef} type="file" multiple accept=".jpg" style={{ display: 'none' }} onChange={handleMobileFileSelect} />
        </div>
      )}

      {heroPopupOpen && selectedCar && (
        <div onClick={() => setHeroPopupOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.93)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            src={getHeroImage(selectedCar.ID)}
            alt={selectedCarFullName}
            onError={(e) => { e.target.onerror = null; e.target.src = fallbackHeroImage; }}
            style={{ maxWidth: '95vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.8)' }}
          />
        </div>
      )}

      {!isPublic && isDragging && (
        <div onDragLeave={handleOverlayDragLeave} onDragOver={(e) => e.preventDefault()} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: '26%', display: 'flex', borderBottom: '4px dashed rgba(255,255,255,0.5)' }}>
            <div onDragEnter={() => setDragTarget('monster')} onDragLeave={handleHalfDragLeave} onDrop={handleDropMonster} onDragOver={(e) => e.preventDefault()} style={{ flex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '16px', backgroundColor: dragTarget === 'monster' ? 'rgba(140,50,180,0.95)' : 'rgba(110,30,150,0.85)', borderRight: '4px dashed rgba(255,255,255,0.5)', outline: dragTarget === 'monster' ? '6px dashed #fff' : '6px dashed rgba(255,255,255,0.4)', outlineOffset: '-10px', transition: 'background-color 0.15s' }}>
              <h1 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 'bold', pointerEvents: 'none', margin: 0 }}>🚛 Monster Truck</h1>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1rem', pointerEvents: 'none', margin: 0 }}>Wheels offset · body visible · (1) only</p>
            </div>
            <div onDragEnter={() => setDragTarget('sensitive')} onDragLeave={handleHalfDragLeave} onDrop={handleDropSensitive} onDragOver={(e) => e.preventDefault()} style={{ flex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '16px', backgroundColor: dragTarget === 'sensitive' ? 'rgba(180,100,0,0.95)' : 'rgba(210,120,0,0.85)', borderLeft: '4px dashed rgba(255,255,255,0.5)', outline: dragTarget === 'sensitive' ? '6px dashed #fff' : '6px dashed rgba(255,255,255,0.4)', outlineOffset: '-10px', transition: 'background-color 0.15s' }}>
              <h1 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 'bold', pointerEvents: 'none', margin: 0 }}>Sensitive Detection</h1>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1rem', pointerEvents: 'none', margin: 0 }}>White/light vehicles · (1) only</p>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex' }}>
            <div onDragEnter={() => setDragTarget('brightness')} onDragLeave={handleHalfDragLeave} onDrop={handleDropBrightness} onDragOver={(e) => e.preventDefault()} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', backgroundColor: dragTarget === 'brightness' ? 'rgba(25,140,50,0.92)' : 'rgba(33,160,64,0.82)', borderRight: '4px dashed rgba(255,255,255,0.5)', outline: dragTarget === 'brightness' ? '6px dashed #fff' : '6px dashed rgba(255,255,255,0.4)', outlineOffset: '-10px', transition: 'background-color 0.15s' }}>
              <h1 style={{ color: '#fff', fontSize: '2.2rem', fontWeight: 'bold', pointerEvents: 'none', margin: 0 }}>Brightness Only</h1>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1rem', pointerEvents: 'none', margin: 0 }}>No crop or resize</p>
            </div>
            <div onDragEnter={() => setDragTarget('full')} onDragLeave={handleHalfDragLeave} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', backgroundColor: dragTarget === 'full' ? 'rgba(0,100,220,0.92)' : 'rgba(0,123,255,0.82)', borderLeft: '4px dashed rgba(255,255,255,0.5)', outline: dragTarget === 'full' ? '6px dashed #fff' : '6px dashed rgba(255,255,255,0.4)', outlineOffset: '-10px', transition: 'background-color 0.15s' }}>
              <h1 style={{ color: '#fff', fontSize: '2.2rem', fontWeight: 'bold', pointerEvents: 'none', margin: 0 }}>Full Process</h1>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1rem', pointerEvents: 'none', margin: 0 }}>Crop · resize · adjust brightness</p>
            </div>
          </div>
        </div>
      )}

      {toast.visible && (
        <div style={{ position: 'fixed', bottom: isMobile ? '66px' : '30px', left: '50%', transform: 'translateX(-50%)', backgroundColor: toast.type === 'error' ? '#dc3545' : '#28a745', color: 'white', padding: '12px 24px', borderRadius: '8px', zIndex: 9999, fontWeight: 'bold', whiteSpace: 'nowrap' }}>
          {toast.message}
        </div>
      )}

      {sensitivePreview && (() => {
        const { file, filename, variants, startPct } = sensitivePreview;
        const rangeStart = Math.round(startPct * 100);
        const rangeEnd   = Math.round((startPct + 19 * 0.05) * 100);
        return (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.92)', zIndex: 10000, display: 'flex', flexDirection: 'column', alignItems: 'stretch', padding: '16px', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, flexWrap: 'wrap' }}>
              <h2 style={{ color: '#fff', margin: 0, fontSize: '1.1rem', flex: 1 }}>
                Choose a result — click to save &nbsp;
                <span style={{ color: '#aaa', fontWeight: 'normal', fontSize: '0.85rem' }}>{filename}</span>
                <span style={{ color: '#888', fontWeight: 'normal', fontSize: '0.85rem', marginLeft: '12px' }}>{rangeStart}%–{rangeEnd}%</span>
              </h2>
              {startPct > 0 && <button onClick={() => fetchSensitivePreview(file, Math.max(0, startPct - 1.0))} style={{ padding: '7px 18px', backgroundColor: '#555', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>← Back</button>}
              <button onClick={() => fetchSensitivePreview(file, startPct + 1.0)} style={{ padding: '7px 18px', backgroundColor: '#0077cc', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>Next →</button>
              <button onClick={() => setSensitivePreview(null)} style={{ padding: '7px 18px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>Discard</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {variants.map(({ label, preview_b64, save_b64 }) => (
                  <div key={label} onClick={() => handleSaveSensitive(filename, save_b64)} style={{ cursor: 'pointer', backgroundColor: '#1a1a1a', borderRadius: '6px', overflow: 'hidden', border: '2px solid #444', transition: 'border-color 0.15s' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#4af'} onMouseLeave={e => e.currentTarget.style.borderColor = '#444'}>
                    <img src={`data:image/jpeg;base64,${preview_b64}`} alt={label} style={{ width: '100%', display: 'block' }} />
                    <div style={{ padding: '4px 10px', color: '#ccc', fontWeight: 'bold', fontSize: '0.85rem' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Sidebar ── */}
      <div className="sidebar" style={{
        display: 'flex', flexDirection: 'column',
        width: isMobile ? '220px' : '130px', flexShrink: 0, overflow: 'hidden',
        backgroundColor: 'var(--sb-bg)', borderRight: '1px solid var(--sb-border)',
        ...(isMobile ? { position: 'fixed', top: 0, left: 0, bottom: 0, transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)', boxShadow: sidebarOpen ? '4px 0 20px rgba(0,0,0,0.35)' : 'none', zIndex: 100 } : { height: '100%', zIndex: 20 }),
      }}>
        {isMobile && (
          <div style={{ padding: '8px', borderBottom: '1px solid var(--sb-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ display: 'flex', border: '1px solid #bbb', borderRadius: '4px', overflow: 'hidden' }}>
              <button onClick={() => setTheme('dark')} style={{ padding: '4px 8px', fontSize: '0.7em', fontWeight: 'bold', backgroundColor: theme === 'dark' ? '#555' : 'transparent', color: theme === 'dark' ? '#fff' : '#999', border: 'none', cursor: 'pointer' }}>DARK</button>
              <button onClick={() => setTheme('light')} style={{ padding: '4px 8px', fontSize: '0.7em', fontWeight: 'bold', backgroundColor: theme === 'light' ? '#555' : 'transparent', color: theme === 'light' ? '#fff' : '#999', border: 'none', cursor: 'pointer' }}>LIGHT</button>
            </div>
            <button onClick={() => setSidebarOpen(false)} style={{ padding: '4px 12px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85em' }}>✕ Close</button>
          </div>
        )}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--sb-bg)' }}>
          {!isMobile && !isPublic && (
            <div style={{ padding: '8px', borderBottom: '1px solid var(--sb-border)' }}>
              <button onClick={handleCreateNew} style={{ width: '100%', padding: '6px', fontSize: '0.8em', fontWeight: 'bold', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ New Car</button>
              <button onClick={handleFillToId} style={{ width: '100%', padding: '4px', marginTop: '4px', fontSize: '0.7em', fontWeight: 'bold', backgroundColor: '#17a2b8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Fill to ID</button>
              {backupAvailable && <button onClick={undoSave} style={{ width: '100%', padding: '4px', marginTop: '4px', fontSize: '0.7em', fontWeight: 'bold', backgroundColor: '#ffc107', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Undo Save</button>}
              <button onClick={handlePublish} style={{ width: '100%', padding: '4px', marginTop: '4px', fontSize: '0.7em', fontWeight: 'bold', backgroundColor: '#0077cc', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Publish</button>
            </div>
          )}
          {!isMobile && (
            <div style={{ padding: '8px', borderBottom: '1px solid var(--sb-border)', backgroundColor: 'var(--sb-controls-bg)' }}>
              <div style={{ display: 'flex', border: '1px solid #cc2200', borderRadius: '4px', overflow: 'hidden', marginBottom: '4px' }}>
                <button onClick={() => setViewMode('gallery')} style={{ flex: 1, padding: '4px', fontSize: '0.7em', fontWeight: 'bold', backgroundColor: viewMode === 'gallery' ? '#cc2200' : 'transparent', color: viewMode === 'gallery' ? '#fff' : '#cc2200', border: 'none', cursor: 'pointer' }}>GALLERY</button>
                <button onClick={() => setViewMode('list')} style={{ flex: 1, padding: '4px', fontSize: '0.7em', fontWeight: 'bold', backgroundColor: viewMode === 'list' ? '#cc2200' : 'transparent', color: viewMode === 'list' ? '#fff' : '#cc2200', border: 'none', cursor: 'pointer' }}>LIST</button>
              </div>
              {viewMode === 'gallery' && (
                <div style={{ display: 'flex', border: '1px solid #6c757d', borderRadius: '4px', overflow: 'hidden', marginBottom: '4px' }}>
                  <button onClick={() => setStackingEnabled(true)} style={{ flex: 1, padding: '4px', fontSize: '0.7em', fontWeight: 'bold', backgroundColor: stackingEnabled ? '#6c757d' : 'transparent', color: stackingEnabled ? '#fff' : '#6c757d', border: 'none', cursor: 'pointer' }}>STACKED</button>
                  <button onClick={() => setStackingEnabled(false)} style={{ flex: 1, padding: '4px', fontSize: '0.7em', fontWeight: 'bold', backgroundColor: !stackingEnabled ? '#6c757d' : 'transparent', color: !stackingEnabled ? '#fff' : '#6c757d', border: 'none', cursor: 'pointer' }}>FLAT</button>
                </div>
              )}
              {!isPublic && <button onClick={() => setViewMode('missing')} style={{ width: '100%', padding: '4px', fontSize: '0.7em', fontWeight: 'bold', backgroundColor: viewMode === 'missing' ? '#fd7e14' : 'transparent', color: viewMode === 'missing' ? '#fff' : '#fd7e14', border: '1px solid #fd7e14', borderRadius: '4px', cursor: 'pointer' }}>MISSING IMGS</button>}
              <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                <div style={{ display: 'flex', flex: 1, border: '1px solid #bbb', borderRadius: '4px', overflow: 'hidden' }}>
                  <button onClick={() => setTheme('dark')} style={{ flex: 1, padding: '4px', fontSize: '0.7em', fontWeight: 'bold', backgroundColor: theme === 'dark' ? '#555' : 'transparent', color: theme === 'dark' ? '#fff' : '#999', border: 'none', cursor: 'pointer' }}>DARK</button>
                  <button onClick={() => setTheme('light')} style={{ flex: 1, padding: '4px', fontSize: '0.7em', fontWeight: 'bold', backgroundColor: theme === 'light' ? '#555' : 'transparent', color: theme === 'light' ? '#fff' : '#999', border: 'none', cursor: 'pointer' }}>LIGHT</button>
                </div>
                <button onClick={() => setSoundEnabled(s => !s)} title={soundEnabled ? 'Sound ON — click to mute' : 'Sound OFF — click to enable'} style={{ padding: '4px 8px', fontSize: '0.85em', fontWeight: 'bold', backgroundColor: soundEnabled ? '#6f42c1' : 'transparent', color: soundEnabled ? '#fff' : '#888', border: '1px solid #bbb', borderRadius: '4px', cursor: 'pointer', flexShrink: 0 }}>{soundEnabled ? '♪' : '♩'}</button>
              </div>
            </div>
          )}
          <div style={{ padding: '8px', borderBottom: '1px solid var(--sb-border)' }}>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
              <button onClick={() => setSearchMode('car')} style={{ flex: 1, padding: '4px', fontSize: '0.7em', fontWeight: 'bold', backgroundColor: searchMode === 'car' ? '#6c757d' : 'var(--sb-btn-off)', color: searchMode === 'car' ? '#fff' : 'var(--tx-3)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>CAR</button>
              <button onClick={() => setSearchMode('release')} style={{ flex: 1, padding: '4px', fontSize: '0.7em', fontWeight: 'bold', backgroundColor: searchMode === 'release' ? '#6c757d' : 'var(--sb-btn-off)', color: searchMode === 'release' ? '#fff' : 'var(--tx-3)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>RELEASE</button>
            </div>
            <input type="text" placeholder="Search..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} style={{ width: '100%', padding: '6px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid var(--sb-search-border)', fontSize: '0.8em', backgroundColor: 'var(--sb-bg)', color: 'var(--sb-tx)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--sb-border)', gap: '1px', backgroundColor: 'var(--sb-gap)' }}>
            {[['make','MAKES'],['brand','BRANDS'],['decade','DECADES'],['category','CATEGORIES']].map(([view, label]) => (
              <button key={view} onClick={() => { setSidebarView(view); setSelectedLetter(null); }} style={{ flex: 1, padding: '8px 0', fontSize: '0.75em', fontWeight: 'bold', border: 'none', cursor: 'pointer', backgroundColor: sidebarView === view ? 'var(--sb-tab-active-bg)' : 'var(--sb-bg)', color: sidebarView === view ? 'var(--sb-tab-active-tx)' : 'var(--tx-3)' }}>{label}</button>
            ))}
          </div>
        </div>
        <SidebarContent
          groupedAndFilteredCars={groupedAndFilteredCars}
          sidebarView={sidebarView}
          selectedLetter={selectedLetter}
          setSelectedLetter={setSelectedLetter}
          handleSidebarClick={handleSidebarClick}
          visibleLetters={visibleLetters}
          visibleDecades={visibleDecades}
          showDirectLogos={showDirectLogos}
          showAlphabetDrawer={showAlphabetDrawer}
          showDecadeDrawer={showDecadeDrawer}
          isMobile={isMobile}
          showDrawer={showDrawer}
        />
      </div>

      {/* ── Secondary sidebar (desktop only) ── */}
      {!isMobile && (
        <div className="secondary-sidebar" style={{ position: 'absolute', left: '130px', top: 0, bottom: 0, width: showDrawer ? '130px' : '0px', overflow: 'hidden', transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)', backgroundColor: '#f8f9fa', borderRight: showDrawer ? '1px solid #ddd' : 'none', boxShadow: showDrawer ? '5px 0 15px rgba(0,0,0,0.5)' : 'none', display: 'flex', flexDirection: 'column', zIndex: 19 }}>
          <SecondarySidebar
            groupedAndFilteredCars={groupedAndFilteredCars}
            selectedLetter={selectedLetter}
            sidebarView={sidebarView}
            showDrawer={showDrawer}
            handleSidebarClick={handleSidebarClick}
          />
        </div>
      )}

      {/* ── Main content ── */}
      <div className="app-container" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', ...(isMobile ? { paddingTop: '48px', paddingBottom: '56px' } : {}) }}>

        {/* Missing images view */}
        {viewMode === 'missing' && (
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '10px 15px', backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
              <div style={{ display: 'flex', border: '1px solid #fd7e14', borderRadius: '4px', overflow: 'hidden' }}>
                <button onClick={() => setMissingSubTab('missing')} style={{ padding: '5px 12px', fontSize: '0.8em', fontWeight: 'bold', backgroundColor: missingSubTab === 'missing' ? '#fd7e14' : 'transparent', color: missingSubTab === 'missing' ? '#fff' : '#fd7e14', border: 'none', cursor: 'pointer' }}>Missing Files {!missingLoading && `(${missingData.length})`}</button>
                <button onClick={() => setMissingSubTab('broken')} style={{ padding: '5px 12px', fontSize: '0.8em', fontWeight: 'bold', backgroundColor: missingSubTab === 'broken' ? '#fd7e14' : 'transparent', color: missingSubTab === 'broken' ? '#fff' : '#fd7e14', border: 'none', cursor: 'pointer' }}>Broken Images ({brokenCars.length})</button>
              </div>
              {missingSubTab === 'missing' && (
                <button onClick={fetchMissingData} disabled={missingLoading} style={{ padding: '5px 12px', fontSize: '0.8em', backgroundColor: 'var(--bg-card-sel)', color: 'var(--tx-2)', border: '1px solid var(--bd-3)', borderRadius: '4px', fontWeight: 'bold', cursor: missingLoading ? 'not-allowed' : 'pointer', opacity: missingLoading ? 0.6 : 1 }}>
                  {missingLoading ? 'Loading...' : 'Refresh'}
                </button>
              )}
            </div>
            {missingSubTab === 'missing' ? (
              <div style={{ flexGrow: 1, overflow: 'auto', padding: '0 10px', contain: 'content' }}>
                <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '0.85em' }}>
                  <thead><tr>
                    <th style={{ ...thStyle, width: '60px' }}>ID</th>
                    <th style={{ ...thStyle, width: '55px' }}>Year</th>
                    <th style={{ ...thStyle, width: '11%' }}>Make</th>
                    <th style={{ ...thStyle, width: '16%' }}>Model</th>
                    <th style={{ ...thStyle, width: '12%' }}>Supername</th>
                    <th style={{ ...thStyle, width: '11%' }}>Brand</th>
                    <th style={{ ...thStyle, width: '13%' }}>Series</th>
                    <th style={{ ...thStyle, width: '80px', textAlign: 'center' }}>Side (1)</th>
                    <th style={{ ...thStyle, width: '80px', textAlign: 'center' }}>Hero (2)</th>
                  </tr></thead>
                  <tbody>
                    {missingData.map(item => (
                      <tr key={item.id}>
                        <td style={{ ...tdStyle, color: '#888', fontWeight: 'bold' }}>#{item.id}</td>
                        <td style={tdStyle}>{item.year}</td>
                        <td style={tdStyle}>{item.make}</td>
                        <td style={{ ...tdStyle, fontWeight: 'bold', color: 'var(--tx)' }}>{item.model}</td>
                        <td style={tdStyle}>{item.supername}</td>
                        <td style={{ ...tdStyle, color: '#17a2b8' }}>{item.brand}</td>
                        <td style={tdStyle}>{item.series}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>{item.missing_side ? <span style={{ color: '#dc3545', fontWeight: 'bold' }}>Missing</span> : <span style={{ color: '#28a745', fontWeight: 'bold' }}>✓</span>}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>{item.missing_hero ? <span style={{ color: '#dc3545', fontWeight: 'bold' }}>Missing</span> : <span style={{ color: '#28a745', fontWeight: 'bold' }}>✓</span>}</td>
                      </tr>
                    ))}
                    {missingData.length === 0 && !missingLoading && (
                      <tr><td colSpan="9" style={{ ...tdStyle, textAlign: 'center', color: '#28a745', fontWeight: 'bold', padding: '30px' }}>All cars have both image files!</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ flexGrow: 1, overflow: 'auto', padding: '0 10px', contain: 'content' }}>
                <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '0.85em' }}>
                  <thead><tr>
                    <th style={{ ...thStyle, width: '60px' }}>ID</th>
                    <th style={{ ...thStyle, width: '55px' }}>Year</th>
                    <th style={{ ...thStyle, width: '11%' }}>Make</th>
                    <th style={{ ...thStyle, width: '18%' }}>Model</th>
                    <th style={{ ...thStyle, width: '13%' }}>Supername</th>
                    <th style={{ ...thStyle, width: '12%' }}>Brand</th>
                    <th style={thStyle}>Series</th>
                  </tr></thead>
                  <tbody>
                    {brokenCars.map(car => (
                      <tr key={car.ID} onClick={() => { setSelectedCar(car); setViewMode('gallery'); }} style={{ cursor: 'pointer' }}>
                        <td style={{ ...tdStyle, color: '#888', fontWeight: 'bold' }}>#{car.ID}</td>
                        <td style={tdStyle}>{car.Year}</td>
                        <td style={tdStyle}>{car.Make}</td>
                        <td style={{ ...tdStyle, fontWeight: 'bold', color: 'var(--tx)' }}>{car.Model}</td>
                        <td style={tdStyle}>{car.Supername}</td>
                        <td style={{ ...tdStyle, color: '#17a2b8' }}>{car.Brand}</td>
                        <td style={tdStyle}>{car.Series}</td>
                      </tr>
                    ))}
                    {brokenCars.length === 0 && (
                      <tr><td colSpan="7" style={{ ...tdStyle, textAlign: 'center', color: '#28a745', fontWeight: 'bold', padding: '30px' }}>No cars flagged as broken!</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Gallery details panel */}
        <div className="details-pane" style={{ display: viewMode === 'gallery' ? undefined : 'none' }}>
          {selectedCar ? (
            <div className="car-details">
              <div className="hero-image-container" onClick={isMobile ? () => setHeroPopupOpen(true) : undefined}>
                {isMobile ? (
                  <img
                    src={getHeroImage(selectedCar.ID)}
                    alt={selectedCarFullName}
                    onError={(e) => { e.target.onerror = null; e.target.src = fallbackHeroImage; }}
                    className="hero-image"
                  />
                ) : (
                  <img key={getHeroImage(selectedCar.ID)} src={getHeroImage(selectedCar.ID)} alt={selectedCarFullName} onError={(e) => { e.target.onerror = null; e.target.src = fallbackHeroImage; }} className="hero-image" fetchPriority="high" />
                )}
              </div>
              <div className="car-info" key={selectedCar?.ID}>
                {!isGalleryEditing ? (
                  <>
                    <h2 style={{ margin: '0 0 4px 0', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                      {selectedCarFullName}
                      <CountryFlags make={selectedCar.Make} carCountry={selectedCar.Country} style={{ fontSize: '1em' }} />
                    </h2>
                    <div ref={carInfoRef} className="car-info-scroll">
{!isPublic && <p style={{ margin: '2px 0' }}><strong>ID:</strong> {selectedCar.ID}</p>}
                      <p style={{ margin: '2px 0' }}><strong>Brand:</strong> {selectedCar.Brand || 'N/A'}</p>
                      {selectedCar.Series && <p style={{ margin: '2px 0' }}><strong>Series:</strong> {selectedCar.Series}</p>}
                      {Array.isArray(selectedCar.Category) && selectedCar.Category.length > 0 && (
                        <p style={{ margin: '2px 0' }}>
                          <strong>Categor{selectedCar.Category.length === 1 ? 'y' : 'ies'}:</strong>{' '}
                          {selectedCar.Category.map((cat, i) => (
                            <span key={cat}>
                              <span style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => { setSidebarView('category'); handleSidebarClick(cat); }}>{cat}</span>
                              {i < selectedCar.Category.length - 1 ? ', ' : ''}
                            </span>
                          ))}
                        </p>
                      )}
                      {selectedCar.Description && <p style={{ margin: '2px 0' }}><strong>Description:</strong> {selectedCar.Description}</p>}
                      {selectedCar.Cover && <p style={{ margin: '2px 0', color: '#f0a500', fontWeight: 'bold' }}>★ Stack Cover</p>}
                      {selectedCar.Broken_image === 'TRUE' && <p style={{ margin: '2px 0', color: '#ff4d4d', fontWeight: 'bold' }}>⚠️ Flagged as Broken Image</p>}
                      {!isPublic && (
                        <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button onClick={() => setIsGalleryEditing(true)} style={{ padding: '4px 12px', cursor: 'pointer', backgroundColor: '#cc2200', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>Edit Details</button>
                          <button onClick={handleSwapIds} style={{ padding: '4px 12px', cursor: 'pointer', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>Swap ID</button>
                          <button onClick={saveToDB} style={{ padding: '4px 12px', cursor: 'pointer', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>Save All</button>
                          <button onClick={handleCreateSameCasting} style={{ padding: '4px 12px', cursor: 'pointer', backgroundColor: '#e67e22', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>Add same casting</button>
                          <button onClick={handleDeleteGallery} style={{ padding: '4px 12px', cursor: 'pointer', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', marginLeft: 'auto' }}>Delete Car</button>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div ref={carInfoRef} className="car-info-scroll">
                    <GalleryEditorForm
                      initialCar={selectedCar}
                      onApply={handleApplyGalleryEdits}
                      onCancel={cancelGalleryEdits}
                      onSave={(draft) => {
                        const exists = cars.some(c => c.ID === draft.ID);
                        const newCars = exists ? cars.map(c => c.ID === draft.ID ? draft : c) : [...cars, draft];
                        setSelectedCar(draft);
                        setCars(sortCars(newCars));
                        setIsGalleryEditing(false);
                        saveSingleCar(draft);
                      }}
                      showToast={showToast}
                      categories={categories}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ padding: '20px', color: '#888' }}><p>No car selected.</p></div>
          )}
        </div>

        {/* Gallery grid */}
        <div ref={gridPaneRef} className="grid-pane" style={{ overflowY: 'auto', padding: '8px', display: viewMode === 'gallery' ? undefined : 'none' }}>
          <GalleryGrid
            carGridRef={carGridRef}
            groups={galleryGroups}
            isMobile={isMobile}
            sidebarView={sidebarView}
            columnCount={columnCount}
            imageUpdates={imageUpdates}
            handleSelectCar={handleSelectCar}
            showToast={showToast}
            expandedStacks={expandedStacks}
            toggleStack={toggleStack}
            stackingEnabled={stackingEnabled}
            isGalleryEditingRef={isGalleryEditingRef}
            isPublic={isPublic}
            handleCreateNew={handleCreateNew}
            fallbackGridImage={fallbackGridImage}
          />
        </div>

        {/* List view */}
        <div style={{ flexGrow: 1, display: viewMode === 'list' ? 'flex' : 'none', flexDirection: 'column', overflow: 'hidden' }}>
          {!isPublic && (
            <div style={{ padding: '10px 15px', backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <button onClick={toggleListEditMode} style={{ padding: '6px 12px', backgroundColor: isListEditing ? '#dc3545' : '#cc2200', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                  {isListEditing ? 'Close & Apply Edits' : 'Enable Edit Mode'}
                </button>
                <button onClick={saveListChanges} style={{ padding: '6px 12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Save</button>
              </div>
              {isListEditing && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bg-raised)', padding: '4px 8px', borderRadius: '6px' }}>
                  <span style={{ color: 'var(--tx)', fontSize: '0.85em', fontWeight: 'bold' }}>Bulk ({selectedIds.size}):</span>
                  <select value={bulkField} onChange={(e) => { setBulkField(e.target.value); setBulkValue(''); }} style={{ padding: '4px', borderRadius: '3px', border: '1px solid var(--bd-3)', backgroundColor: 'var(--bg-input)', color: 'var(--tx)', fontWeight: 'bold' }}>
                    {['Year','Make','Model','Supername','Brand','Series','Country','Category'].map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <input value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') applyBulk(); }} placeholder={bulkField === 'Category' || bulkField === 'Country' ? 'A, B, ...' : `${bulkField}...`} style={{ padding: '4px', borderRadius: '3px', border: '1px solid var(--bd-3)', backgroundColor: 'var(--bg-input)', color: 'var(--tx)', width: '120px' }} />
                  <button onClick={applyBulk} style={{ padding: '4px 10px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' }}>Apply</button>
                  <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--bd-3)', margin: '0 5px' }}></div>
                  <button onClick={applyBulkDelete} style={{ padding: '4px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' }}>Delete Selected</button>
                </div>
              )}
            </div>
          )}
          <div className="table-container" style={{ flexGrow: 1, overflow: 'auto', padding: '0 10px', contain: 'content' }}>
            <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '0.85em' }}>
              <thead>
                <tr>
                  {!isPublic && <th style={{ ...thStyle, width: '30px', textAlign: 'center' }}>
                    <input type="checkbox" checked={selectedIds.size > 0 && selectedIds.size === visibleCarsCount} ref={input => { if (input) input.indeterminate = selectedIds.size > 0 && selectedIds.size < visibleCarsCount; }} onChange={handleSelectAll} />
                  </th>}
                  <th style={{ ...thStyle, width: '100px' }}>Image</th>
                  {!isPublic && <th style={{ ...thStyle, width: '60px' }}>ID</th>}
                  <th style={{ ...thStyle, width: '55px' }}>Year</th>
                  <th style={{ ...thStyle, width: '11%' }}>Make</th>
                  <th style={{ ...thStyle, width: '18%' }}>Model</th>
                  <th style={{ ...thStyle, width: '13%' }}>Supername</th>
                  <th style={{ ...thStyle, width: '11%' }}>Brand</th>
                  <th style={{ ...thStyle, width: '10%' }}>Series</th>
                  <th style={{ ...thStyle, width: '8%' }}>Country</th>
                  <th style={thStyle}>Category</th>
                  {!isPublic && <th style={{ ...thStyle, width: '50px', textAlign: 'center' }}>Cover</th>}
                </tr>
              </thead>
              <tbody>
                {currentListItems.map((item, index) => {
                  if (item.type === 'header') {
                    return (
                      <tr key={`header-${item.groupName}-${index}`} id={`header-${item.groupName}`}>
                        <td colSpan={isPublic ? 9 : 12} style={{ padding: '12px 8px 4px 8px', fontSize: '1.2em', fontWeight: 'bold', color: '#cc2200', borderBottom: '1px solid var(--bd-2)', backgroundColor: 'var(--bg-surface)' }}>
                          {sidebarView === 'decade' ? `Year: ${item.groupName}` : item.groupName} <span style={{ color: '#666', fontSize: '0.7em' }}>({item.count})</span>
                        </td>
                      </tr>
                    );
                  }
                  const car = item.car;
                  return (
                    <CarListRow
                      key={`${item.groupName}-${car.ID}`}
                      car={car}
                      isSelected={selectedIds.has(car.ID)}
                      isListEditing={isListEditing}
                      draft={listDrafts[car.ID]}
                      imageUpdate={imageUpdates[car.ID]}
                      handleSelectRow={handleSelectRow}
                      handleCellChange={handleCellChange}
                      hideId={isPublic}
                      categories={categories}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', backgroundColor: 'var(--bg)', borderTop: '1px solid var(--bd)', color: 'var(--tx-2)', flexShrink: 0 }}>
            <span style={{ fontSize: '0.85em' }}>Showing {carsBeforePage + 1}–{carsBeforePage + carsOnPage} of {visibleCarsCount} cars</span>
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <button disabled={currentPage === 1} onClick={() => { flushListDrafts(); setCurrentPage(p => p - 1); }} style={{ padding: '4px 10px', backgroundColor: 'var(--pg-btn)', color: 'var(--tx)', border: 'none', borderRadius: '4px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>Prev</button>
              <span style={{ padding: '0 10px', fontSize: '0.85em', fontWeight: 'bold' }}>Page {currentPage} of {totalPages}</span>
              <button disabled={currentPage === totalPages} onClick={() => { flushListDrafts(); setCurrentPage(p => p + 1); }} style={{ padding: '4px 10px', backgroundColor: 'var(--pg-btn)', color: 'var(--tx)', border: 'none', borderRadius: '4px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>Next</button>
            </div>
          </div>
        </div>

      </div>

      {/* Mobile bottom nav */}
      {isMobile && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '56px', backgroundColor: 'var(--bg-surface)', borderTop: '1px solid var(--bd-2)', display: 'flex', zIndex: 50 }}>
          <button onClick={() => setViewMode('gallery')} style={{ flex: 1, padding: '4px', fontSize: '0.75em', fontWeight: 'bold', border: 'none', cursor: 'pointer', backgroundColor: viewMode === 'gallery' ? '#cc2200' : 'transparent', color: viewMode === 'gallery' ? '#fff' : '#888', borderRight: '1px solid #444' }}>Gallery</button>
          <button onClick={() => setViewMode('list')} style={{ flex: 1, padding: '4px', fontSize: '0.75em', fontWeight: 'bold', border: 'none', cursor: 'pointer', backgroundColor: viewMode === 'list' ? '#cc2200' : 'transparent', color: viewMode === 'list' ? '#fff' : '#888', borderRight: '1px solid #444' }}>List</button>
          {!isPublic && <button onClick={() => setViewMode('missing')} style={{ flex: 1, padding: '4px', fontSize: '0.75em', fontWeight: 'bold', border: 'none', cursor: 'pointer', backgroundColor: viewMode === 'missing' ? '#fd7e14' : 'transparent', color: viewMode === 'missing' ? '#fff' : '#fd7e14' }}>Missing</button>}
        </div>
      )}
    </div>
  );
}

export default App;
