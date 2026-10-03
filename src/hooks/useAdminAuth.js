import { useCallback, useState } from 'react';

// Admin write access = the API key stored in localStorage (sent as a Bearer
// token on every save). No key => saves 401. This lets the key be entered on
// a device without DevTools (e.g. a phone).
export function useAdminAuth(showToast, dialog) {
  const [hasAdminKey, setHasAdminKey] = useState(() => !!localStorage.getItem('adminApiKey'));

  const handleAdminLogin = useCallback(async () => {
    const key = await dialog.prompt({ title: 'Admin login', message: 'Enter the admin API key.', placeholder: 'API key', password: true, confirmLabel: 'Log in' });
    if (!key || !key.trim()) return;
    localStorage.setItem('adminApiKey', key.trim());
    setHasAdminKey(true);
    showToast('Logged in', 'success');
  }, [showToast, dialog]);

  const handleAdminLogout = useCallback(() => {
    localStorage.removeItem('adminApiKey');
    setHasAdminKey(false);
    showToast('Logged out', 'success');
  }, [showToast]);

  return { hasAdminKey, handleAdminLogin, handleAdminLogout };
}
