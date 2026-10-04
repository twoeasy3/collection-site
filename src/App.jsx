import React, { useState, useEffect, useRef, useMemo, useCallback, startTransition } from 'react';
import './App.css';
import 'flag-icons/css/flag-icons.min.css';

import { getSideImage, preloadImage, FALLBACK_GRID_IMAGE, FALLBACK_HERO_IMAGE, getHeroImage } from './utils/images';
import { getCarDisplayName } from './utils/carUtils';
import { getStackKey } from './components/GalleryCards';

import { useToast } from './hooks/useToast';
import { useDialog } from './hooks/useDialog';
import { useIsMobile } from './hooks/useIsMobile';
import { useUiPrefs } from './hooks/useUiPrefs';
import { useAppSounds } from './hooks/useAppSounds';
import { useAdminAuth } from './hooks/useAdminAuth';
import { useSearchState } from './hooks/useSearchState';
import { useCarsLoader } from './hooks/useCarsLoader';
import { useImageUploads } from './hooks/useImageUploads';
import { useImagePreloader } from './hooks/useImagePreloader';
import { useCarStats } from './hooks/useCarStats';
import { useCarFilters } from './hooks/useCarFilters';
import { useListEditing } from './hooks/useListEditing';
import { useListPagination } from './hooks/useListPagination';
import { useCarMutations } from './hooks/useCarMutations';
import { useCastingCopy } from './hooks/useCastingCopy';
import { useMissingImages } from './hooks/useMissingImages';
import { useColumnCount, useSelectedCardHighlight, useAutoScrollToSelection } from './hooks/useGalleryDom';
import { useCarDeepLink, readInitialCarId } from './hooks/useCarDeepLink';
import { useKeyboardNav, KEYBOARD_SHORTCUTS } from './hooks/useKeyboardNav';

import AppSidebar, { DesktopSecondarySidebar } from './components/AppSidebar';
import CarDetailsPane from './components/CarDetailsPane';
import CarListView from './components/CarListView';
import GalleryGrid from './components/GalleryGrid';
import GalleryEditorForm from './components/GalleryEditorForm';
import MaintenanceView from './components/MaintenanceView';
import CastingCopyModal from './components/CastingCopyModal';
import DragDropOverlay from './components/DragDropOverlay';
import SensitivePreviewOverlay from './components/SensitivePreviewOverlay';
import HeroPopup from './components/HeroPopup';
import MobileTopBar from './components/MobileTopBar';
import MobileEditOverlay from './components/MobileEditOverlay';
import MobileBottomNav from './components/MobileBottomNav';
import Toast from './components/Toast';
import DialogModal from './components/DialogModal';

const ITEMS_PER_PAGE = 100;

function App({ isPublic = false }) {
  // ─── Cross-cutting state ───────────────────────────────────────────────────
  const { toast, showToast } = useToast();
  const dialog = useDialog();
  const { isMobile, isMobileRef } = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const prefs = useUiPrefs();
  const { theme, setTheme, stackingEnabled, setStackingEnabled, sortMode, setSortMode, autoScroll, toggleAutoScroll, useRemoteImages, toggleImageSource } = prefs;
  const { soundEnabled, setSoundEnabled, playSelectSound } = useAppSounds();
  const { hasAdminKey, handleAdminLogin, handleAdminLogout } = useAdminAuth(showToast, dialog);
  const { searchMode, setSearchMode, searchInput, setSearchInput, debouncedSearchTerm } = useSearchState();

  // Navigation state. Setters are wrapped in startTransition so the heavy
  // gallery re-render doesn't block the click feedback.
  const [sidebarView, _setSidebarView] = useState('make');
  const [selectedLetter, _setSelectedLetter] = useState(null);
  // Rating sort narrows the class view to one class (null = all classes).
  const [classFilter, _setClassFilter] = useState(null);
  const setClassFilter = useCallback((v) => startTransition(() => _setClassFilter(v)), []);
  const [viewMode, _setViewMode] = useState('gallery');
  const setSidebarView    = useCallback((v) => startTransition(() => _setSidebarView(v)),    []);
  const setSelectedLetter = useCallback((v) => startTransition(() => _setSelectedLetter(v)), []);
  const setViewMode       = useCallback((v) => startTransition(() => _setViewMode(v)),       []);

  // Selection. selectedCarGroup records which group's rendering of the car was
  // clicked -- a car spanning multiple categories renders once per category,
  // all sharing data-car-id, so scroll/highlight need it to target the right
  // DOM instance.
  const [selectedCar, setSelectedCar] = useState(null);
  const [selectedCarGroup, setSelectedCarGroup] = useState(null);
  const [isGalleryEditing, setIsGalleryEditing] = useState(false);
  const isGalleryEditingRef = useRef(false);
  isGalleryEditingRef.current = isGalleryEditing;
  const [heroPopupOpen, setHeroPopupOpen] = useState(false);
  const [prioritizeAiPending, setPrioritizeAiPending] = useState(false);
  const [expandedStacks, setExpandedStacks] = useState(new Set());
  const [isDragging, setIsDragging] = useState(false);

  const carGridRef = useRef(null);
  const gridPaneRef = useRef(null);
  const carInfoRef = useRef(null);
  const searchInputRef = useRef(null);

  // ─── Data ──────────────────────────────────────────────────────────────────
  const selectedCarRef = useRef(null);
  selectedCarRef.current = selectedCar;
  // ?car=<id> from the URL wins for the very first selection only.
  const initialCarIdRef = useRef(readInitialCarId());
  const { cars, setCars, loading, refresh: refreshCars } = useCarsLoader({
    isPublic,
    onLoaded: (sortedCars) => {
      if (sortedCars.length === 0) return;
      const wantedId = initialCarIdRef.current;
      initialCarIdRef.current = null;
      const current = selectedCarRef.current;
      const linked = wantedId ? sortedCars.find(c => String(c.ID) === wantedId) : null;
      const stillExists = current ? sortedCars.find(c => c.ID === current.ID) : null;
      setSelectedCar(linked || stillExists || sortedCars[0]);
    },
  });
  useCarDeepLink(selectedCar?.ID ?? null, !loading);

  const uploads = useImageUploads(showToast);
  const { imageUpdates, sensitivePreview, setSensitivePreview } = uploads;
  const { getStats, statsAvailable, editStats, resetStats, classPercentile, classQuantile, classProfile, classSizes } = useCarStats();

  // Rating sort replaces the chosen grouping with a by-class view; the tab
  // choice is kept so A-Z returns to it.
  const groupView = sortMode === 'rating' && statsAvailable ? 'class' : sidebarView;

  const filters = useCarFilters({ cars, sidebarView: groupView, selectedLetter, debouncedSearchTerm, searchMode, isPublic, isMobile, prioritizeAiPending, getStats, classFilter });
  const { categories, groupedAndFilteredCars, galleryGroups, flatListItems, brokenCars, pendingAiSuggestions, visibleCarsCount, visibleLetters, visibleDecades, showDrawer, classCounts } = filters;
  const groupedAndFilteredCarsRef = useRef([]);
  groupedAndFilteredCarsRef.current = groupedAndFilteredCars;

  const listEditing = useListEditing({ cars, setCars, showToast, dialog, groupedAndFilteredCars, visibleCarsCount });
  const pagination = useListPagination(flatListItems, visibleCarsCount, ITEMS_PER_PAGE);
  const { currentPage, setCurrentPage, pageForGroup } = pagination;

  const mutations = useCarMutations({
    cars, setCars, selectedCar, setSelectedCar, setIsGalleryEditing,
    viewMode, sidebarView: groupView, selectedLetter, showToast, dialog, refreshCars, listEditing, setCurrentPage,
  });
  const { saveSingleCar, saveToDB, handleCreateNew, handleSwapIds, handleDeleteGallery, cancelGalleryEdits, undoSave, backupAvailable } = mutations;

  const castingCopy = useCastingCopy({ cars, setCars, selectedCar, setSelectedCar, setIsGalleryEditing, saveSingleCar, showToast, dialog });
  const missing = useMissingImages({ cars, viewMode, showToast });

  // ─── Gallery DOM effects ───────────────────────────────────────────────────
  const columnCount = useColumnCount(carGridRef, { active: viewMode === 'gallery', loading });
  useSelectedCardHighlight(gridPaneRef, selectedCar?.ID ?? null, selectedCarGroup);
  useAutoScrollToSelection({
    enabled: autoScroll && viewMode === 'gallery',
    gridPaneRef, selectedCar, selectedCarGroup, groupsRef: groupedAndFilteredCarsRef, ignoreBrand: groupView === 'class',
    scrollKey: `${debouncedSearchTerm}|${searchMode}|${groupView}|${classFilter}`,
  });

  const visibleCarsForPreload = useMemo(
    () => viewMode === 'gallery' ? galleryGroups.flatMap(g => g.visibleGroupCars) : [],
    [galleryGroups, viewMode]
  );
  useImagePreloader(cars, imageUpdates, visibleCarsForPreload, gridPaneRef, viewMode === 'gallery');

  // ─── Effects ───────────────────────────────────────────────────────────────
  // New selection: close the lightbox, warm the side image, reset detail scroll.
  useEffect(() => {
    if (!selectedCar) return;
    setHeroPopupOpen(false);
    preloadImage(getSideImage(selectedCar, imageUpdates));
    if (carInfoRef.current) carInfoRef.current.scrollTop = 0;
  }, [selectedCar?.ID, imageUpdates]);

  // Warm every card of an expanded stack. expandedStacks entries are
  // "groupName::stackKey" (see GalleryGrid) so that a stack expanded under one
  // category doesn't also appear expanded under another category the same
  // cars belong to -- strip the group prefix to match here.
  useEffect(() => {
    if (!expandedStacks.size) return;
    const expandedBareKeys = new Set([...expandedStacks].map(k => k.slice(k.indexOf('::') + 2)));
    for (const car of cars) {
      if (expandedBareKeys.has(getStackKey(car, groupView === 'class'))) preloadImage(getSideImage(car, imageUpdates));
    }
  }, [expandedStacks, cars, imageUpdates, groupView]);

  useEffect(() => { setCurrentPage(1); }, [debouncedSearchTerm, searchMode, groupView, classFilter, viewMode]);

  // A fresh search jumps the selection to the first hit.
  useEffect(() => {
    if (!debouncedSearchTerm.trim()) return;
    const firstCar = groupedAndFilteredCars[0]?.visibleGroupCars[0];
    if (firstCar) setSelectedCar(firstCar);
  }, [debouncedSearchTerm]);

  // Desktop: clicking anywhere outside the sidebars closes the letter drawer.
  useEffect(() => {
    if (!selectedLetter || isMobile) return;
    const handle = (e) => {
      if (e.target.closest('.sidebar') || e.target.closest('.secondary-sidebar')) return;
      setSelectedLetter(null);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [selectedLetter, isMobile]);

  // Drop a drawer selection that the current filter no longer offers.
  useEffect(() => {
    if (sidebarView === 'make' && selectedLetter && !visibleLetters.includes(selectedLetter)) setSelectedLetter(null);
    if (sidebarView === 'decade' && selectedLetter && !visibleDecades.includes(selectedLetter)) setSelectedLetter(null);
  }, [visibleLetters, visibleDecades, sidebarView, selectedLetter]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const toggleStack = useCallback((key) => {
    setExpandedStacks(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const handleSelectCar = useCallback((car, groupName) => {
    setSelectedCar(car);
    setSelectedCarGroup(groupName ?? null);
    playSelectSound();
  }, [playSelectSound]);

  const handleSidebarClick = useCallback((groupName) => {
    if (isMobileRef.current) {
      setSidebarOpen(false);
      if (sidebarView === 'brand' || sidebarView === 'category' || sidebarView === 'country') setSelectedLetter(groupName);
    }
    if (groupView === 'class') setClassFilter(prev => (prev === groupName ? null : groupName));
    const group = groupedAndFilteredCars.find(g => g.groupName === groupName);
    const firstCar = group?.visibleGroupCars[0];
    if (firstCar) { setSelectedCar(firstCar); setSelectedCarGroup(groupName); }
    const elId = `header-${groupName}`;
    const scrollToHeader = () => document.getElementById(elId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (viewMode === 'list') {
      const targetPage = pageForGroup(groupName);
      if (currentPage !== targetPage) {
        setCurrentPage(targetPage);
        if (autoScroll) setTimeout(scrollToHeader, 100);
        return;
      }
    }
    if (autoScroll) scrollToHeader();
  }, [viewMode, pageForGroup, currentPage, groupedAndFilteredCars, sidebarView, groupView, autoScroll]);

  const handleDragEnter = (e) => { e.preventDefault(); if (e.dataTransfer.types.includes('Files')) setIsDragging(true); };

  const openCarInGallery = (car, edit = false) => {
    setSelectedCar(car);
    setViewMode('gallery');
    if (edit) setIsGalleryEditing(true);
  };

  // ─── Keyboard navigation ───────────────────────────────────────────────────
  // Cards in the order the gallery renders them: a collapsed stack counts as
  // one entry (its cover), an expanded one contributes every variant.
  const navigableCars = useMemo(() => {
    const out = [];
    const ignoreBrand = groupView === 'class';
    for (const { groupName, visibleGroupCars } of galleryGroups) {
      if (!stackingEnabled) {
        visibleGroupCars.forEach(car => out.push({ car, groupName, stackKey: getStackKey(car, ignoreBrand), stackSize: 1 }));
        continue;
      }
      const stacks = new Map();
      const order = [];
      for (const car of visibleGroupCars) {
        const key = getStackKey(car, ignoreBrand);
        if (!stacks.has(key)) { stacks.set(key, []); order.push(key); }
        stacks.get(key).push(car);
      }
      for (const key of order) {
        const stackCars = stacks.get(key);
        const visible = stackCars.length === 1 || expandedStacks.has(`${groupName}::${key}`) ? stackCars : [stackCars[0]];
        visible.forEach(car => out.push({ car, groupName, stackKey: key, stackSize: stackCars.length }));
      }
    }
    return out;
  }, [galleryGroups, stackingEnabled, expandedStacks, groupView]);

  const keyboardCtxRef = useRef(null);
  keyboardCtxRef.current = {
    viewMode, isGalleryEditing, heroPopupOpen, gridPaneRef,
    modalOpen: !!(dialog.active || castingCopy.castingCopyState || sensitivePreview || isDragging),
    canEdit: !isPublic && hasAdminKey,
    navigable: navigableCars, selectedId: selectedCar?.ID ?? null, selectedGroup: selectedCarGroup,
    hasLetter: !!selectedLetter,
    select: handleSelectCar,
    // Keyboard moves always bring the card into view, independent of the
    // auto-scroll preference (which governs click/sidebar selection).
    scrollToCar: (car, groupName) => requestAnimationFrame(() => {
      const pane = gridPaneRef.current;
      const el = pane?.querySelector(`[data-car-id="${car.ID}"][data-group="${groupName}"]`) || pane?.querySelector(`[data-car-id="${car.ID}"]`);
      el?.scrollIntoView({ block: 'nearest' });
    }),
    toggleStack,
    openHero: () => setHeroPopupOpen(true),
    closeHero: () => setHeroPopupOpen(false),
    edit: () => setIsGalleryEditing(true),
    cancelEdit: cancelGalleryEdits,
    clearLetter: () => setSelectedLetter(null),
    focusSearch: () => { searchInputRef.current?.focus(); searchInputRef.current?.select(); },
    showHelp: () => dialog.confirm({ title: 'Keyboard shortcuts', table: KEYBOARD_SHORTCUTS, confirmLabel: 'Close', hideCancel: true }),
  };
  useKeyboardNav(keyboardCtxRef);

  // ─── Render ────────────────────────────────────────────────────────────────
  if (loading) return <div className="loading">Loading Car Collection...</div>;

  // The gallery editor form, reused inline (desktop) and inside the full-screen
  // mobile overlay so the two never drift apart.
  const galleryEditorEl = selectedCar ? (
    <GalleryEditorForm
      initialCar={selectedCar}
      onApply={mutations.handleApplyGalleryEdits}
      onCancel={cancelGalleryEdits}
      onSave={mutations.handleSaveGalleryDraft}
      showToast={showToast}
      categories={categories}
      dialog={dialog}
    />
  ) : null;

  const grouping = {
    sidebarView, groupView, setSidebarView, selectedLetter, setSelectedLetter, handleSidebarClick,
    classFilter, setClassFilter, classCounts,
    groupedAndFilteredCars, visibleLetters, visibleDecades,
    showDirectLogos: filters.showDirectLogos, showAlphabetDrawer: filters.showAlphabetDrawer, showDecadeDrawer: filters.showDecadeDrawer, showDrawer,
  };

  return (
    <div className="main-layout" onDragEnter={handleDragEnter} style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', position: 'relative', backgroundColor: 'var(--bg)' }}>

      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 98 }} />
      )}

      {isMobile && (
        <MobileTopBar
          isPublic={isPublic} hasAdminKey={hasAdminKey} backupAvailable={backupAvailable}
          onOpenSidebar={() => setSidebarOpen(true)}
          onLogin={handleAdminLogin} onLogout={handleAdminLogout}
          onUndo={undoSave} onCreateNew={handleCreateNew} onFiles={uploads.uploadFiles}
        />
      )}

      {heroPopupOpen && selectedCar && (
        <HeroPopup src={getHeroImage(selectedCar, imageUpdates)} alt={getCarDisplayName(selectedCar)} fallbackSrc={FALLBACK_HERO_IMAGE} onClose={() => setHeroPopupOpen(false)} />
      )}

      {isMobile && !isPublic && isGalleryEditing && selectedCar && (
        <MobileEditOverlay
          selectedCar={selectedCar} onClose={cancelGalleryEdits}
          onSwapIds={handleSwapIds} onCreateSameCasting={castingCopy.handleCreateSameCasting}
          onSaveAll={saveToDB} onDelete={handleDeleteGallery}
        >
          {galleryEditorEl}
        </MobileEditOverlay>
      )}

      {!isPublic && isDragging && (
        <DragDropOverlay
          onClose={() => setIsDragging(false)}
          onDropFull={uploads.uploadFiles}
          onDropBrightness={uploads.uploadFilesBrightness}
          onDropMonster={uploads.uploadFilesMonster}
          onDropSensitive={uploads.uploadFilesSensitive}
        />
      )}

      <Toast toast={toast} isMobile={isMobile} />

      {dialog.active && <DialogModal key={dialog.active.id} dialog={dialog.active} onClose={dialog.close} />}

      {sensitivePreview && (
        <SensitivePreviewOverlay
          preview={sensitivePreview}
          onNavigate={uploads.fetchSensitivePreview}
          onSave={uploads.handleSaveSensitive}
          onDiscard={() => setSensitivePreview(null)}
        />
      )}

      {castingCopy.castingCopyState && (
        <CastingCopyModal
          state={castingCopy.castingCopyState}
          onToggleField={castingCopy.toggleCastingField}
          onClose={castingCopy.closeCastingCopy}
          onCopyToId={castingCopy.applyCopyToId}
          onCopyToNewCar={castingCopy.applyCopyToNewCar}
        />
      )}

      <AppSidebar
        isMobile={isMobile} isPublic={isPublic} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}
        auth={{ hasAdminKey, onLogin: handleAdminLogin, onLogout: handleAdminLogout }}
        admin={{ onCreateNew: handleCreateNew, onFillToId: mutations.handleFillToId, backupAvailable, onUndo: undoSave, onPublish: mutations.handlePublish }}
        view={{ viewMode, setViewMode, stackingEnabled, setStackingEnabled, sortMode, setSortMode, statsAvailable, theme, setTheme, soundEnabled, setSoundEnabled, autoScroll, toggleAutoScroll, useRemoteImages, toggleImageSource }}
        search={{ searchMode, setSearchMode, searchInput, setSearchInput, searchInputRef, pendingAiCount: pendingAiSuggestions.length, prioritizeAiPending, setPrioritizeAiPending }}
        grouping={grouping}
      />

      {!isMobile && <DesktopSecondarySidebar grouping={grouping} />}

      {/* ── Main content ── */}
      <div className="app-container" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', ...(isMobile ? { paddingTop: '48px', paddingBottom: '56px' } : {}) }}>

        {viewMode === 'missing' && (
          <MaintenanceView
            cars={cars}
            onEditCar={(car) => openCarInGallery(car, true)}
            missingData={missing.missingData} missingLoading={missing.missingLoading}
            missingSubTab={missing.missingSubTab} setMissingSubTab={missing.setMissingSubTab} onRefresh={missing.fetchMissingData}
            brokenCars={brokenCars} onSelectBrokenCar={(car) => openCarInGallery(car)}
            pendingAiSuggestions={pendingAiSuggestions}
            onEditSuggestionCar={(car) => openCarInGallery(car, true)}
            onApproveSuggestion={mutations.handleApproveAiSuggestion}
            onRejectSuggestion={mutations.handleRejectAiSuggestion}
          />
        )}

        <CarDetailsPane
          visible={viewMode === 'gallery'}
          selectedCar={selectedCar} isMobile={isMobile} isPublic={isPublic} hasAdminKey={hasAdminKey}
          isGalleryEditing={isGalleryEditing} imageUpdates={imageUpdates} carInfoRef={carInfoRef}
          onOpenHeroPopup={() => setHeroPopupOpen(true)}
          onCategoryClick={(cat) => { setSortMode('name'); setSidebarView('category'); handleSidebarClick(cat); }}
          onLogin={handleAdminLogin}
          onEdit={() => setIsGalleryEditing(true)}
          onSwapIds={handleSwapIds} onSaveAll={saveToDB}
          onCreateSameCasting={castingCopy.handleCreateSameCasting} onDelete={handleDeleteGallery}
          editor={galleryEditorEl}
          stats={selectedCar ? getStats(selectedCar) : null} statsAvailable={statsAvailable}
          onEditStats={editStats} onResetStats={resetStats}
          classPercentile={classPercentile} classQuantile={classQuantile} classProfile={classProfile} classSizes={classSizes}
        />

        <div ref={gridPaneRef} className="grid-pane" style={{ overflowY: 'auto', padding: '8px', display: viewMode === 'gallery' ? undefined : 'none' }}>
          <GalleryGrid
            carGridRef={carGridRef}
            groups={galleryGroups}
            isMobile={isMobile}
            sidebarView={groupView}
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
            fallbackGridImage={FALLBACK_GRID_IMAGE}
            getStats={getStats}
          />
        </div>

        <CarListView
          visible={viewMode === 'list'}
          isPublic={isPublic} sidebarView={groupView} categories={categories}
          imageUpdates={imageUpdates} visibleCarsCount={visibleCarsCount}
          listEditing={listEditing} pagination={pagination}
        />

      </div>

      {isMobile && <MobileBottomNav viewMode={viewMode} setViewMode={setViewMode} isPublic={isPublic} />}
    </div>
  );
}

export default App;
