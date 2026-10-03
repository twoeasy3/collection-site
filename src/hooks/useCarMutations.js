import { useCallback, useState } from 'react';
import { sortCars, getNextAvailableId, toDBRow, makeBlankCar, UNNAMED_CAR_MODEL, AI_FIELD_TO_APP_FIELD, AI_FIELD_EMPTY_VALUE, omitKey } from '../utils/carUtils';
import { putCar, putCarsBulk, deleteCar, exileImages, publishSite, undoLastSave, API_UNREACHABLE, LOCAL_SERVER_UNREACHABLE } from '../utils/api';

// Create / save / delete / swap operations on cars, shared by the gallery
// detail pane, the mobile edit overlay and the sidebar admin buttons.
export function useCarMutations({
  cars, setCars, selectedCar, setSelectedCar, setIsGalleryEditing,
  viewMode, sidebarView, selectedLetter, showToast, dialog, refreshCars, listEditing, setCurrentPage,
}) {
  const { isListEditing, setIsListEditing, flushListDrafts } = listEditing;
  const [backupAvailable, setBackupAvailable] = useState(false);

  // Bulk-writes either an explicit array or the whole in-memory list. Called
  // straight from onClick too (event arg), hence the Array.isArray guard.
  const saveToDB = async (explicitData) => {
    let dataToSave = Array.isArray(explicitData) ? explicitData : cars;
    if (!Array.isArray(explicitData) && viewMode === 'list' && isListEditing) {
      dataToSave = flushListDrafts();
      setIsListEditing(false);
      setCars(sortCars(dataToSave));
    }
    const payload = sortCars(dataToSave).map(toDBRow);
    try {
      const response = await putCarsBulk(payload);
      if (response.ok) { showToast('Changes saved to database!', 'success'); setBackupAvailable(false); }
      else { showToast(`Failed to save: ${(await response.json()).error}`, 'error'); }
    } catch { showToast(API_UNREACHABLE, 'error'); }
  };

  const saveSingleCar = useCallback(async (car) => {
    try {
      const response = await putCar(toDBRow(car));
      if (response.ok) showToast('Saved!', 'success');
      else showToast(`Failed to save: ${(await response.json()).error}`, 'error');
    } catch { showToast(API_UNREACHABLE, 'error'); }
  }, [showToast]);

  const handleRejectAiSuggestion = useCallback(async (car, field) => {
    const appField = AI_FIELD_TO_APP_FIELD[field];
    const note = await dialog.prompt({ title: `Reject AI ${field}`, message: 'Note for why this is being rejected (helps the next AI pass avoid the same mistake).', defaultValue: car.AiRejected || '', multiline: true, confirmLabel: 'Reject', danger: true });
    if (note === null) return;
    saveSingleCar({ ...car, [appField]: AI_FIELD_EMPTY_VALUE[field], AiSuggested: omitKey(car.AiSuggested, field), AiRejected: note });
  }, [saveSingleCar, dialog]);

  const handleApproveAiSuggestion = useCallback((car, field) => {
    saveSingleCar({ ...car, AiSuggested: omitKey(car.AiSuggested, field) });
  }, [saveSingleCar]);

  const handlePublish = async () => {
    try {
      const response = await publishSite();
      if (response.ok) showToast((await response.json()).message, 'success');
      else showToast(`Publish failed: ${(await response.json()).error}`, 'error');
    } catch { showToast(LOCAL_SERVER_UNREACHABLE, 'error'); }
  };

  const undoSave = async () => {
    try {
      const response = await undoLastSave();
      if (response.ok) { showToast('Undo successful! Previous version restored.', 'success'); setBackupAvailable(false); refreshCars(); }
      else showToast(`Failed to undo: ${(await response.json()).error}`, 'error');
    } catch { showToast('Server unreachable to undo.', 'error'); }
  };

  // Gallery: opens the editor on an unsaved draft. List: inserts an empty
  // row at the top in edit mode.
  const handleCreateNew = ({ make = '', brand = '' } = {}) => {
    const newId = getNextAvailableId(cars);
    const newCar = makeBlankCar({
      ID: newId, Make: make, Brand: brand,
      Year: sidebarView === 'decade' && selectedLetter && selectedLetter !== 'Unknown' ? selectedLetter : '',
    });
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

  const makeUnnamedCar = (id) => makeBlankCar({ ID: id, Model: UNNAMED_CAR_MODEL });

  const handleFillToId = async () => {
    const input = await dialog.prompt({ title: 'Fill to ID', message: 'Create UNNAMED_CAR placeholders for every free ID up to this number.\nOr type "x" followed by a count (e.g. "x5") to add that many new cars in the lowest free IDs instead.', placeholder: 'e.g. 1200 or x5', confirmLabel: 'Fill' });
    if (input === null) return;
    const trimmed = input.trim();
    const existingIds = new Set(cars.map(c => Number(c.ID)));
    const newCars = [];

    const countMatch = trimmed.match(/^x\s*(\d+)$/i);
    if (countMatch) {
      const count = parseInt(countMatch[1], 10);
      if (isNaN(count) || count < 1) return showToast('Invalid count', 'error');
      let id = 1;
      while (newCars.length < count) {
        if (!existingIds.has(id)) { newCars.push(makeUnnamedCar(id)); existingIds.add(id); }
        id++;
      }
      setCars(sortCars([...cars, ...newCars]));
      saveToDB(newCars);
      showToast(`Added ${newCars.length} UNNAMED_CAR entr${newCars.length === 1 ? 'y' : 'ies'}`, 'success');
      return;
    }

    const targetId = parseInt(trimmed, 10);
    if (isNaN(targetId) || targetId < 1) return showToast('Invalid ID', 'error');
    for (let id = 1; id <= targetId; id++) {
      if (!existingIds.has(id)) newCars.push(makeUnnamedCar(id));
    }
    if (newCars.length === 0) return showToast('No gaps found up to ID ' + targetId, 'success');
    setCars(sortCars([...cars, ...newCars]));
    saveToDB(newCars);
    showToast(`Added ${newCars.length} UNNAMED_CAR entr${newCars.length === 1 ? 'y' : 'ies'} up to ID ${targetId}`, 'success');
  };

  const handleDeleteGallery = async () => {
    if (!selectedCar) return;
    const ok = await dialog.confirm({ title: `Delete #${selectedCar.ID}?`, message: `${selectedCar.Make} ${selectedCar.Model} will be removed from the database and its images moved to exile.`, confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    const id = selectedCar.ID;
    const updatedCars = cars.filter(c => String(c.ID) !== String(id));
    setCars(updatedCars);
    setSelectedCar(updatedCars.length > 0 ? updatedCars[0] : null);
    setIsGalleryEditing(false);
    await deleteCar(id);
    try {
      const data = await (await exileImages([id])).json();
      showToast(`Deleted #${id}${data.moved?.length ? ` — ${data.moved.length} image(s) moved to exile` : ''}`, 'success');
    } catch { showToast(`Deleted #${id}`, 'success'); }
  };

  // Upserts the draft into the in-memory list (no network).
  const handleApplyGalleryEdits = useCallback((finalDraft) => {
    setSelectedCar(finalDraft);
    setCars(prevCars => {
      const exists = prevCars.some(c => c.ID === finalDraft.ID);
      return sortCars(exists ? prevCars.map(c => c.ID === finalDraft.ID ? finalDraft : c) : [...prevCars, finalDraft]);
    });
    setIsGalleryEditing(false);
  }, [setCars, setSelectedCar, setIsGalleryEditing]);

  // Upserts and persists the single car.
  const handleSaveGalleryDraft = (draft) => {
    const exists = cars.some(c => c.ID === draft.ID);
    const newCars = exists ? cars.map(c => c.ID === draft.ID ? draft : c) : [...cars, draft];
    setSelectedCar(draft);
    setCars(sortCars(newCars));
    setIsGalleryEditing(false);
    saveSingleCar(draft);
  };

  // Cancelling on a never-saved new car falls back to the first real one.
  const cancelGalleryEdits = useCallback(() => {
    setIsGalleryEditing(false);
    if (selectedCar && !cars.some(c => c.ID === selectedCar.ID)) setSelectedCar(cars.length > 0 ? cars[0] : null);
  }, [selectedCar, cars, setSelectedCar, setIsGalleryEditing]);

  const handleSwapIds = async () => {
    const targetId = await dialog.prompt({ title: 'Swap ID', message: `Enter the ID to swap with #${selectedCar.ID}.`, placeholder: 'Target ID', inputMode: 'numeric', confirmLabel: 'Next' });
    if (!targetId || targetId.trim() === '') return;
    const cleanTargetId = String(targetId.trim());
    if (cleanTargetId === String(selectedCar.ID)) return;
    const targetCar = cars.find(c => String(c.ID) === cleanTargetId);
    if (!targetCar) return showToast(`Car with ID #${cleanTargetId} not found.`, 'error');
    const ok = await dialog.confirm({ title: `Swap #${selectedCar.ID} and #${targetCar.ID}?`, message: `#${selectedCar.ID}: ${selectedCar.Make} ${selectedCar.Model}\n#${targetCar.ID}: ${targetCar.Make} ${targetCar.Model}`, confirmLabel: 'Swap' });
    if (!ok) return;
    const swappedCars = sortCars(cars.map(c => {
      if (String(c.ID) === String(selectedCar.ID)) return { ...c, ID: targetCar.ID };
      if (String(c.ID) === String(targetCar.ID)) return { ...c, ID: selectedCar.ID };
      return c;
    }));
    setCars(swappedCars);
    setSelectedCar(prev => ({ ...prev, ID: targetCar.ID }));
    const swappedA = swappedCars.find(c => String(c.ID) === String(targetCar.ID));
    const swappedB = swappedCars.find(c => String(c.ID) === String(selectedCar.ID));
    Promise.all([saveSingleCar(swappedA), saveSingleCar(swappedB)]);
  };

  return {
    backupAvailable,
    saveToDB, saveSingleCar, handleSaveGalleryDraft, handleApplyGalleryEdits, cancelGalleryEdits,
    handleApproveAiSuggestion, handleRejectAiSuggestion,
    handlePublish, undoSave,
    handleCreateNew, handleFillToId, handleDeleteGallery, handleSwapIds,
  };
}
