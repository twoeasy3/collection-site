import { useCallback, useMemo, useRef, useState } from 'react';

// Promise-based replacement for window.prompt / window.confirm, rendered as a
// React modal (see DialogModal) so it never blocks the tab.
//
//   const ok   = await dialog.confirm({ title, message, confirmLabel, danger });
//   const text = await dialog.prompt({ title, message, defaultValue, placeholder, multiline, password });
//
// confirm resolves true/false; prompt resolves the string or null on cancel,
// mirroring the native APIs so call sites read the same way.
let nextDialogId = 1;

export function useDialog() {
  const [active, setActive] = useState(null);
  const pendingRef = useRef(null); // { resolve, kind }

  const settlePending = useCallback((result) => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (!pending) return;
    pending.resolve(result === undefined ? (pending.kind === 'prompt' ? null : false) : result);
  }, []);

  const open = useCallback((kind, opts) => new Promise(resolve => {
    settlePending(); // a dialog opened over another cancels the first
    pendingRef.current = { resolve, kind };
    const config = typeof opts === 'string' ? { message: opts } : (opts || {});
    setActive({ id: nextDialogId++, kind, ...config });
  }), [settlePending]);

  const close = useCallback((result) => {
    setActive(null);
    settlePending(result);
  }, [settlePending]);

  const confirm = useCallback((opts) => open('confirm', opts), [open]);
  const prompt = useCallback((opts) => open('prompt', opts), [open]);

  return useMemo(() => ({ active, close, confirm, prompt }), [active, close, confirm, prompt]);
}
