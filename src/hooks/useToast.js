import { useCallback, useState } from 'react';

// Transient bottom-center status message; auto-hides after 3s.
export function useToast() {
  const [toast, setToast] = useState({ message: '', type: 'success', visible: false });
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => { setToast(prev => ({ ...prev, visible: false })); }, 3000);
  }, []);
  return { toast, showToast };
}
