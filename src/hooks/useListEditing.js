import { useCallback, useState } from 'react';
import { sortCars, toDBRow } from '../utils/carUtils';
import { putCarsBulk, deleteCarsBulk, exileImages, API_UNREACHABLE } from '../utils/api';

// List-view editing: per-row drafts (applied to `cars` on flush), row
// selection, the bulk field-apply toolbar, bulk delete, and saving drafts.
export function useListEditing({ cars, setCars, showToast, dialog, groupedAndFilteredCars, visibleCarsCount }) {
  const [isListEditing, setIsListEditing] = useState(false);
  const [listDrafts, setListDrafts] = useState({});
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkField, setBulkField] = useState('Brand');
  const [bulkValue, setBulkValue] = useState('');

  // Merges drafts into cars, re-sorts, clears drafts; returns the new list.
  const flushListDrafts = useCallback(() => {
    if (Object.keys(listDrafts).length === 0) return cars;
    const updatedCars = cars.map(car => listDrafts[car.ID] ? { ...car, ...listDrafts[car.ID] } : car);
    const sorted = sortCars(updatedCars);
    setCars(sorted);
    setListDrafts({});
    return sorted;
  }, [cars, listDrafts, setCars]);

  const toggleListEditMode = useCallback(() => {
    if (isListEditing) flushListDrafts();
    setIsListEditing(!isListEditing);
  }, [isListEditing, flushListDrafts]);

  const handleCellChange = useCallback((id, field, value) => {
    setListDrafts(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: value } }));
  }, []);

  const handleSelectRow = useCallback((id) => {
    setSelectedIds(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s; });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === visibleCarsCount && visibleCarsCount > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(groupedAndFilteredCars.flatMap(g => g.visibleGroupCars.map(c => c.ID))));
  }, [selectedIds, visibleCarsCount, groupedAndFilteredCars]);

  const applyBulk = useCallback(() => {
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
  }, [selectedIds, bulkField, bulkValue, showToast]);

  const saveListChanges = useCallback(async () => {
    const changedIds = Object.keys(listDrafts);
    if (changedIds.length === 0) return showToast('No unsaved changes', 'success');
    const payload = changedIds
      .map(id => { const base = cars.find(c => String(c.ID) === String(id)); return base ? toDBRow({ ...base, ...listDrafts[id] }) : null; })
      .filter(Boolean);
    try {
      const response = await putCarsBulk(payload);
      if (response.ok) { flushListDrafts(); showToast(`Saved ${payload.length} car${payload.length === 1 ? '' : 's'} to database!`, 'success'); }
      else showToast(`Failed to save: ${(await response.json()).error}`, 'error');
    } catch { showToast(API_UNREACHABLE, 'error'); }
  }, [listDrafts, cars, showToast, flushListDrafts]);

  const applyBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return showToast('Select at least one car to delete', 'error');
    const ok = await dialog.confirm({ title: `Delete ${selectedIds.size} cars?`, message: 'This removes them from the database and moves their images to exile. Their IDs become free.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    const ids = [...selectedIds];
    setCars(cars.filter(c => !selectedIds.has(c.ID)));
    setListDrafts(prev => { const nd = { ...prev }; ids.forEach(id => delete nd[id]); return nd; });
    setSelectedIds(new Set());
    await deleteCarsBulk(ids);
    try {
      const data = await (await exileImages(ids)).json();
      showToast(`Deleted ${ids.length} cars${data.moved?.length ? ` — ${data.moved.length} image(s) moved to exile` : ''} and saved!`, 'success');
    } catch { showToast(`Deleted ${ids.length} cars and saved!`, 'success'); }
  }, [selectedIds, cars, setCars, showToast, dialog]);

  return {
    isListEditing, setIsListEditing, listDrafts, selectedIds,
    bulkField, setBulkField, bulkValue, setBulkValue,
    flushListDrafts, toggleListEditMode,
    handleCellChange, handleSelectRow, handleSelectAll,
    applyBulk, applyBulkDelete, saveListChanges,
  };
}
