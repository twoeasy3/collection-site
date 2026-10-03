import { useEffect, useRef, useState } from 'react';

const btn = (bg, extra = {}) => ({ padding: '7px 16px', backgroundColor: bg, color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', ...extra });
const fieldStyle = { width: '100%', boxSizing: 'border-box', padding: '8px', fontSize: '1em', backgroundColor: 'var(--bg-input)', color: 'var(--tx)', border: '1px solid var(--bd-2)', borderRadius: '4px', marginBottom: '14px' };

// Modal for useDialog. Mount with a key per dialog id so the input state
// starts fresh each time. Enter submits (except in a textarea), Escape and
// the backdrop cancel.
function DialogModal({ dialog, onClose }) {
  const isPrompt = dialog.kind === 'prompt';
  const [value, setValue] = useState(dialog.defaultValue ?? '');
  const fieldRef = useRef(null);
  const confirmRef = useRef(null);

  const cancel = () => onClose(isPrompt ? null : false);
  const submit = () => onClose(isPrompt ? value : true);

  useEffect(() => {
    const el = isPrompt ? fieldRef.current : confirmRef.current;
    el?.focus();
    if (isPrompt && el?.select && !dialog.multiline) el.select();
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); cancel(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const onFieldKeyDown = (e) => {
    if (e.key === 'Enter' && !dialog.multiline) { e.preventDefault(); submit(); }
    if (e.key === 'Enter' && dialog.multiline && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submit(); }
  };

  return (
    <div onClick={cancel} role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'var(--bg-raised)', borderRadius: '8px', padding: '20px', width: '100%', maxWidth: '440px', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
        {dialog.title && <h3 style={{ margin: '0 0 8px', color: 'var(--tx)' }}>{dialog.title}</h3>}
        {dialog.message && <p style={{ margin: '0 0 14px', color: 'var(--tx-2)', fontSize: '0.9em', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{dialog.message}</p>}
        {isPrompt && (dialog.multiline ? (
          <textarea ref={fieldRef} value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={onFieldKeyDown} placeholder={dialog.placeholder} rows={4} spellCheck="false" style={{ ...fieldStyle, resize: 'vertical' }} />
        ) : (
          <input ref={fieldRef} type={dialog.password ? 'password' : 'text'} value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={onFieldKeyDown} placeholder={dialog.placeholder} inputMode={dialog.inputMode} spellCheck="false" autoComplete="off" autoCapitalize="off" autoCorrect="off" style={fieldStyle} />
        ))}
        {dialog.table && (
          <table style={{ borderCollapse: 'collapse', marginBottom: '14px', fontSize: '0.9em' }}>
            <tbody>
              {dialog.table.map(([k, v]) => (
                <tr key={k}>
                  <td style={{ padding: '3px 14px 3px 0', whiteSpace: 'nowrap' }}><kbd style={{ padding: '1px 6px', borderRadius: '4px', border: '1px solid var(--bd-3)', backgroundColor: 'var(--bg-input)', color: 'var(--tx)', fontFamily: 'inherit', fontWeight: 'bold' }}>{k}</kbd></td>
                  <td style={{ padding: '3px 0', color: 'var(--tx-2)' }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          {!dialog.hideCancel && <button onClick={cancel} style={btn('transparent', { color: 'var(--tx-3)', border: '1px solid var(--bd-2)' })}>{dialog.cancelLabel || 'Cancel'}</button>}
          <button ref={confirmRef} onClick={submit} style={btn(dialog.danger ? '#dc3545' : 'var(--accent)')}>{dialog.confirmLabel || 'OK'}</button>
        </div>
      </div>
    </div>
  );
}

export default DialogModal;
