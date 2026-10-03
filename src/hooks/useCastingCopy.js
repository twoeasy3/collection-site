import { useCallback, useState } from 'react';
import { sortCars, getNextAvailableId, makeBlankCar } from '../utils/carUtils';
import { CASTING_COPY_FIELDS, isCastingFieldFilled, applyCastingFields } from '../utils/castingCopy';

// "Add same casting": pick which fields of the selected car to carry over,
// then either open a new car pre-filled with them or overwrite another ID.
// State is { sourceCar, fields: { [fieldKey]: boolean } } while the picker
// is open, else null.
export function useCastingCopy({ cars, setCars, selectedCar, setSelectedCar, setIsGalleryEditing, saveSingleCar, showToast, dialog }) {
  const [castingCopyState, setCastingCopyState] = useState(null);

  const handleCreateSameCasting = useCallback(() => {
    if (!selectedCar) return;
    const fields = {};
    // Supername is per-release, so it starts unticked even when filled.
    CASTING_COPY_FIELDS.forEach(({ key }) => { fields[key] = key !== 'Supername' && isCastingFieldFilled(selectedCar, key); });
    setCastingCopyState({ sourceCar: selectedCar, fields });
  }, [selectedCar]);

  const toggleCastingField = useCallback((key) => {
    setCastingCopyState(prev => ({ ...prev, fields: { ...prev.fields, [key]: !prev.fields[key] } }));
  }, []);

  const closeCastingCopy = useCallback(() => setCastingCopyState(null), []);

  const applyCopyToNewCar = () => {
    const { sourceCar, fields } = castingCopyState;
    const newCar = applyCastingFields(
      makeBlankCar({ ID: getNextAvailableId(cars), NameFormat: sourceCar.NameFormat || 0 }),
      sourceCar, fields,
    );
    setSelectedCar(newCar);
    setIsGalleryEditing(true);
    setCastingCopyState(null);
  };

  const applyCopyToId = async () => {
    const { sourceCar, fields } = castingCopyState;
    const targetIdInput = await dialog.prompt({ title: 'Copy to ID', message: `Copy the selected fields from #${sourceCar.ID} onto which ID?`, placeholder: 'Target ID', inputMode: 'numeric', confirmLabel: 'Next' });
    if (!targetIdInput || !targetIdInput.trim()) return;
    const cleanTargetId = String(targetIdInput.trim());
    if (cleanTargetId === String(sourceCar.ID)) return showToast("Can't copy a casting onto itself.", 'error');
    const targetCar = cars.find(c => String(c.ID) === cleanTargetId);
    if (!targetCar) return showToast(`Car with ID #${cleanTargetId} not found.`, 'error');
    const ok = await dialog.confirm({ title: 'Overwrite fields?', message: `#${targetCar.ID}: ${targetCar.Make} ${targetCar.Model}\nwill take the selected fields from\n#${sourceCar.ID}: ${sourceCar.Make} ${sourceCar.Model}`, confirmLabel: 'Overwrite', danger: true });
    if (!ok) return;
    const updatedTarget = applyCastingFields({ ...targetCar }, sourceCar, fields);
    setCars(prevCars => sortCars(prevCars.map(c => String(c.ID) === String(targetCar.ID) ? updatedTarget : c)));
    setSelectedCar(updatedTarget);
    saveSingleCar(updatedTarget);
    setCastingCopyState(null);
  };

  return { castingCopyState, handleCreateSameCasting, toggleCastingField, closeCastingCopy, applyCopyToNewCar, applyCopyToId };
}
