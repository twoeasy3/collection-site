import React from 'react';
import { BASE_PATH, tdStyle } from '../constants';
import FastInput from './FastInput';
import HoverPreview from './HoverPreview';

const CarListRow = React.memo(({ car, isSelected, isListEditing, draft, imageUpdate, handleSelectRow, handleCellChange, hideId, categories }) => {
  const getVal = (field) => draft?.[field] !== undefined ? draft[field] : (car[field] || '');
  const imgVersion = imageUpdate || car.ImageVersion;
  const imgUrl = `${BASE_PATH}/half_standard_cars/${car.ID} (1).jpg${imgVersion ? `?t=${imgVersion}` : ''}`;
  const fallbackUrl = `${BASE_PATH}/mystery_side.jpg`;
  const inp = { width: '100%', padding: '4px', boxSizing: 'border-box', backgroundColor: 'var(--bg-input)', color: 'var(--tx)', border: '1px solid var(--bd-2)', borderRadius: '3px' };

  return (
    <tr style={{ backgroundColor: isSelected ? 'var(--row-sel)' : 'transparent' }}>
      {!hideId && <td style={{ ...tdStyle, textAlign: 'center' }}>
        <input type="checkbox" checked={isSelected} onChange={() => handleSelectRow(car.ID)} />
      </td>}
      <td style={tdStyle}>
        <HoverPreview imgUrl={imgUrl} fallbackUrl={fallbackUrl} altText={car.Model} />
      </td>
      {!hideId && <td style={{ ...tdStyle, color: '#888', fontWeight: 'bold' }}>#{car.ID}</td>}
      <td style={tdStyle}>{isListEditing ? <FastInput style={inp} value={getVal('Year')} onChange={(val) => handleCellChange(car.ID, 'Year', val)} /> : car.Year}</td>
      <td style={tdStyle}>{isListEditing ? <FastInput style={inp} value={getVal('Make')} onChange={(val) => handleCellChange(car.ID, 'Make', val)} /> : car.Make}</td>
      <td style={{ ...tdStyle, fontWeight: 'bold', color: 'var(--tx)' }}>{isListEditing ? <FastInput style={inp} value={getVal('Model')} onChange={(val) => handleCellChange(car.ID, 'Model', val)} /> : car.Model}</td>
      <td style={tdStyle}>{isListEditing ? <FastInput style={inp} value={getVal('Supername')} onChange={(val) => handleCellChange(car.ID, 'Supername', val)} /> : car.Supername}</td>
      <td style={{ ...tdStyle, color: '#17a2b8' }}>{isListEditing ? <FastInput style={inp} value={getVal('Brand')} onChange={(val) => handleCellChange(car.ID, 'Brand', val)} /> : car.Brand}</td>
      <td style={tdStyle}>{isListEditing ? <FastInput style={inp} value={getVal('Series')} onChange={(val) => handleCellChange(car.ID, 'Series', val)} /> : car.Series}</td>
      <td style={tdStyle}>{isListEditing
        ? <FastInput
            style={inp}
            value={Array.isArray(getVal('Country')) ? getVal('Country').join(', ') : (getVal('Country') || '')}
            onChange={(val) => handleCellChange(car.ID, 'Country', val.split(',').map(c => c.trim().toUpperCase()).filter(Boolean))}
            placeholder="JP, US or ~, JP"
          />
        : (Array.isArray(car.Country) ? car.Country.join(', ') : car.Country)}</td>
      <td style={tdStyle}>
        {isListEditing
          ? <FastInput
              style={inp}
              value={Array.isArray(getVal('Category')) ? getVal('Category').join(', ') : (getVal('Category') || '')}
              onChange={(val) => handleCellChange(car.ID, 'Category', val.split(',').map(c => c.trim()).filter(Boolean))}
              placeholder="Category1, Category2"
            />
          : (Array.isArray(car.Category) ? car.Category.join(', ') : car.Category)}
      </td>
      {!hideId && <td style={{ ...tdStyle, textAlign: 'center' }}>
        {isListEditing
          ? <input type="checkbox" checked={!!getVal('Cover')} onChange={(e) => handleCellChange(car.ID, 'Cover', e.target.checked)} style={{ cursor: 'pointer', accentColor: '#f0a500' }} />
          : <input type="checkbox" checked={!!getVal('Cover')} readOnly style={{ pointerEvents: 'none', accentColor: '#f0a500' }} />}
      </td>}
    </tr>
  );
});

export default CarListRow;
