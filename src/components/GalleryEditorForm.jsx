import React, { useState, useEffect } from 'react';
import { NAME_FORMATS, AI_FIELD_TO_APP_FIELD, AI_FIELD_EMPTY_VALUE, omitKey } from '../utils/carUtils';

const GalleryEditorForm = React.memo(({ initialCar, onApply, onCancel, onSave, showToast, categories }) => {
  const [draft, setDraft] = useState(initialCar);

  useEffect(() => { setDraft(initialCar); }, [initialCar]);

  const handleChange = (field, value) => {
    setDraft(prev => ({ ...prev, [field]: value }));
  };

  const handleApproveAiField = (field) => {
    setDraft(prev => ({ ...prev, AiSuggested: omitKey(prev.AiSuggested, field) }));
  };

  const handleRejectAiField = (field) => {
    setDraft(prev => ({ ...prev, [AI_FIELD_TO_APP_FIELD[field]]: AI_FIELD_EMPTY_VALUE[field], AiSuggested: omitKey(prev.AiSuggested, field) }));
  };

  const handleDone = () => {
    if (!draft.Model || draft.Model.trim() === '') {
      showToast("A Model name is required to save an entry.", "error");
      return;
    }
    onApply(draft);
  };

  const handleSaveClick = () => {
    if (!draft.Model || draft.Model.trim() === '') {
      showToast("A Model name is required to save an entry.", "error");
      return;
    }
    onSave(draft);
  };

  const inp = { flex: 1, minWidth: 0, backgroundColor: 'var(--bg-input)', color: 'var(--tx)', border: '1px solid var(--bd-2)', borderRadius: '3px', padding: '4px', fontWeight: 'bold', fontSize: '1.2em' };
  const inpSm = { width: '70px', textAlign: 'center', backgroundColor: 'var(--bg-input)', color: 'var(--tx)', border: '1px solid var(--bd-2)', borderRadius: '3px', padding: '4px', fontWeight: 'bold', fontSize: '1.2em' };
  const inpLbl = { backgroundColor: 'var(--bg-input)', color: 'var(--tx)', border: '1px solid var(--bd-2)', borderRadius: '3px', padding: '4px' };

  return (
    <>
      <div style={{ display: 'flex', gap: '5px', marginBottom: '4px' }}>
        <input style={inp} value={draft?.Supername || ''} onChange={(e) => handleChange('Supername', e.target.value)} placeholder="Supername" spellCheck="false" autoComplete="off" />
        <input style={inpSm} value={draft?.Year || ''} onChange={(e) => handleChange('Year', e.target.value)} placeholder="Year" spellCheck="false" autoComplete="off" />
        <input style={{ ...inp, flex: 1.5 }} value={draft?.Make || ''} onChange={(e) => handleChange('Make', e.target.value)} placeholder="Make" spellCheck="false" autoComplete="off" />
        <input style={{ ...inp, flex: 3 }} value={draft?.Model || ''} onChange={(e) => handleChange('Model', e.target.value)} placeholder="Model" spellCheck="false" autoComplete="off" />
      </div>
      {draft?.AiSuggested && Object.keys(draft.AiSuggested).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '2px 0 8px 0', padding: '6px 8px', backgroundColor: 'var(--bg-raised)', border: '1px solid var(--ai-badge-bg)', borderRadius: '4px' }}>
          {Object.entries(draft.AiSuggested).map(([field, confidence]) => (
            <div key={field} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8em', backgroundColor: 'var(--bg-card-sel)', padding: '2px 4px 2px 8px', borderRadius: '3px' }}>
              <span style={{ fontWeight: 'bold', color: 'var(--ai-badge-bg)' }}>AI</span>
              <span style={{ color: 'var(--tx-2)' }}>{field} ({Math.round(confidence * 100)}%)</span>
              <button onClick={() => handleApproveAiField(field)} title="Approve suggestion" style={{ padding: '1px 6px', fontSize: '0.95em', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' }}>✓</button>
              <button onClick={() => handleRejectAiField(field)} title="Reject suggestion (clears the field)" style={{ padding: '1px 6px', fontSize: '0.95em', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' }}>✗</button>
            </div>
          ))}
        </div>
      )}
      <p style={{ margin: '2px 0' }}><strong>ID:</strong> {draft?.ID}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '2px 0' }}>
        <strong>Brand:</strong>
        <input style={{ ...inpLbl, flex: 1, minWidth: 0 }} value={draft?.Brand || ''} onChange={(e) => handleChange('Brand', e.target.value)} spellCheck="false" autoComplete="off" />
        <div style={{ display: 'flex', gap: '4px' }}>
          {[{ label: 'HW', value: 'Hot Wheels' }, { label: 'MB', value: 'Matchbox' }, { label: 'TM', value: 'Tomica' }, { label: 'MJ', value: 'Majorette' }].map(s => (
            <button key={s.label} onClick={() => handleChange('Brand', s.value)} style={{ padding: '2px 6px', fontSize: '0.75em', backgroundColor: 'var(--bg-card-sel)', color: 'var(--tx-2)', border: '1px solid var(--bd-3)', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' }} title={`Set to ${s.value}`}>{s.label}</button>
          ))}
        </div>
      </div>
      <div style={{ margin: '2px 0', display: 'flex', alignItems: 'center' }}>
        <strong style={{ width: '80px' }}>Series:</strong>
        <input style={{ ...inpLbl, flex: 1 }} value={draft?.Series || ''} onChange={(e) => handleChange('Series', e.target.value)} spellCheck="false" autoComplete="off" />
      </div>
      <div style={{ margin: '2px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
          <strong style={{ width: '80px' }}>Country:</strong>
          <input
            style={{ ...inpLbl, flex: 1 }}
            value={(Array.isArray(draft?.Country) ? draft.Country.filter(c => c !== '~') : []).join(', ')}
            onChange={(e) => {
              const codes = e.target.value.split(',').map(c => c.trim().toUpperCase()).filter(Boolean);
              const override = Array.isArray(draft?.Country) && draft.Country[0] === '~';
              handleChange('Country', override ? ['~', ...codes] : codes);
            }}
            placeholder="e.g. US, JP (leave blank to inherit from make)"
            spellCheck="false" autoComplete="off"
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', fontSize: '0.8em', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={Array.isArray(draft?.Country) && draft.Country[0] === '~'}
              onChange={(e) => {
                const codes = Array.isArray(draft?.Country) ? draft.Country.filter(c => c !== '~') : [];
                handleChange('Country', e.target.checked ? ['~', ...codes] : codes);
              }}
            />
            Override make
          </label>
        </div>
      </div>
      <div style={{ margin: '2px 0' }}>
        <strong style={{ display: 'block', marginBottom: '4px' }}>Category:</strong>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '4px', border: '1px solid var(--bd-2)', borderRadius: '3px', backgroundColor: 'var(--bg-input)', maxHeight: '100px', overflowY: 'auto' }}>
          {(categories || []).filter(c => c !== 'Uncategorised').map(cat => {
            const selected = Array.isArray(draft?.Category) && draft.Category.includes(cat);
            return (
              <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '2px 6px', borderRadius: '3px', backgroundColor: selected ? 'var(--accent)' : 'var(--bg-raised)', color: selected ? '#fff' : 'var(--tx-2)', cursor: 'pointer', fontSize: '0.8em', border: '1px solid var(--bd-2)', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  style={{ display: 'none' }}
                  checked={selected}
                  onChange={(e) => {
                    const current = Array.isArray(draft?.Category) ? draft.Category : [];
                    handleChange('Category', e.target.checked ? [...current, cat] : current.filter(c => c !== cat));
                  }}
                />
                {cat}
              </label>
            );
          })}
        </div>
      </div>
      <div style={{ margin: '4px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <strong style={{ flexShrink: 0 }}>Name format:</strong>
        {NAME_FORMATS.map(({ value, label, pattern }) => (
          <button key={value} onClick={() => handleChange('NameFormat', value)} title={pattern} style={{ padding: '2px 8px', fontSize: '0.75em', backgroundColor: (draft?.NameFormat || 0) === value ? 'var(--accent)' : 'var(--bg-card-sel)', color: (draft?.NameFormat || 0) === value ? '#fff' : 'var(--tx-2)', border: '1px solid var(--bd-3)', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' }}>{label}</button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', margin: '4px 0' }}>
        <strong style={{ marginBottom: '2px' }}>Description:</strong>
        <textarea style={{ width: '100%', minHeight: '40px', resize: 'vertical', backgroundColor: 'var(--bg-input)', color: 'var(--tx)', border: '1px solid var(--bd-2)', borderRadius: '3px', padding: '4px' }} value={draft?.Description || ''} onChange={(e) => handleChange('Description', e.target.value)} spellCheck="false" autoComplete="off" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: '#ff4d4d', fontWeight: 'bold', margin: 0 }}>
            <input type="checkbox" checked={draft?.Broken_image === 'TRUE'} onChange={(e) => handleChange('Broken_image', e.target.checked ? 'TRUE' : 'FALSE')} style={{ marginRight: '5px', transform: 'scale(1.2)' }} />
            Flag Broken Image
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: '#f0a500', fontWeight: 'bold', margin: 0 }}>
            <input type="checkbox" checked={!!draft?.Cover} onChange={(e) => handleChange('Cover', e.target.checked)} style={{ marginRight: '5px', transform: 'scale(1.2)' }} />
            Stack Cover
          </label>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onCancel} style={{ padding: '4px 12px', cursor: 'pointer', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>Cancel</button>
          <button onClick={handleDone} style={{ padding: '4px 12px', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>Done</button>
          <button onClick={handleSaveClick} style={{ padding: '4px 12px', cursor: 'pointer', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>Save</button>
        </div>
      </div>
    </>
  );
});

export default GalleryEditorForm;
