// All network calls in one place: the Cloudflare Worker API (same-origin
// /api/*, admin writes need the Bearer key from localStorage) and the local
// Flask image helper (server.py on :5000, dev machine only).

const LOCAL_SERVER = 'http://localhost:5000';
export const LOCAL_SERVER_UNREACHABLE = 'Server unreachable. Is server.py running?';
export const API_UNREACHABLE = 'API unreachable.';

export const authHeaders = () => {
  const key = localStorage.getItem('adminApiKey');
  return key ? { Authorization: `Bearer ${key}` } : {};
};
const jsonAuthHeaders = () => ({ 'Content-Type': 'application/json', ...authHeaders() });

// ── Worker API ──
export const fetchCars = (isPublic) => fetch(isPublic ? '/api/cars/public' : '/api/cars').then(r => r.json());
export const fetchMakes = () => fetch('/api/makes').then(r => r.json());
export const fetchMissingImages = () => fetch('/api/cars/missing-images', { headers: authHeaders() });
export const putCar = (row) => fetch(`/api/cars/${row.id}`, { method: 'PUT', headers: jsonAuthHeaders(), body: JSON.stringify(row) });
export const putCarsBulk = (rows) => fetch('/api/cars/bulk', { method: 'PUT', headers: jsonAuthHeaders(), body: JSON.stringify(rows) });
export const deleteCar = (id) => fetch(`/api/cars/${id}`, { method: 'DELETE', headers: authHeaders() });
export const deleteCarsBulk = (ids) => fetch('/api/cars/bulk-delete', { method: 'POST', headers: jsonAuthHeaders(), body: JSON.stringify({ ids }) });

// ── Local Flask helper ──
export const localPost = (path, init = {}) => fetch(`${LOCAL_SERVER}${path}`, { method: 'POST', ...init });
export const localPostJson = (path, body) => localPost(path, { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
export const exileImages = (ids) => localPostJson('/api/exile-images', { ids });
export const publishSite = () => localPost('/api/publish');
export const undoLastSave = () => localPost('/api/undo');
