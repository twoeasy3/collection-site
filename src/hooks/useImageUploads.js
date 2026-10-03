import { useCallback, useState } from 'react';
import { localPost, localPostJson, LOCAL_SERVER_UNREACHABLE } from '../utils/api';

// Image upload/processing flows against the local Flask helper (server.py),
// plus the cache-busting timestamps (imageUpdates) that fresh uploads produce
// and the sensitive-detection preview state.
export function useImageUploads(showToast) {
  const [imageUpdates, setImageUpdates] = useState({});
  const [sensitivePreview, setSensitivePreview] = useState(null);

  // The three bulk processors differ only in endpoint + progress message.
  const postImages = useCallback(async (endpoint, files, processingMsg) => {
    const valid = files.filter(f => f.name.toLowerCase().includes('(1).jpg') || f.name.toLowerCase().includes('(2).jpg'));
    if (!valid.length) return showToast('Only files ending in (1).jpg or (2).jpg are accepted.', 'error');
    showToast(processingMsg(valid.length), 'success');
    const formData = new FormData();
    valid.forEach(f => formData.append('files', f));
    try {
      const response = await localPost(`/api/${endpoint}`, { body: formData });
      if (response.ok) {
        const data = await response.json();
        showToast(data.message, 'success');
        const now = Date.now();
        const newUpdates = {};
        valid.forEach(f => { const m = f.name.match(/^(\d+)/); if (m) newUpdates[m[1]] = now; });
        setImageUpdates(prev => ({ ...prev, ...newUpdates }));
      } else { showToast(`Processing failed: ${(await response.json()).error}`, 'error'); }
    } catch { showToast(LOCAL_SERVER_UNREACHABLE, 'error'); }
  }, [showToast]);

  const uploadFiles = useCallback((files) => postImages('upload', files, n => `Processing ${n} image(s)...`), [postImages]);
  const uploadFilesBrightness = useCallback((files) => postImages('upload-brightness', files, n => `Adjusting brightness for ${n} image(s)...`), [postImages]);
  const uploadFilesMonster = useCallback((files) => postImages('upload-monster', files, n => `Processing ${n} image(s) as Monster Truck...`), [postImages]);

  const fetchSensitivePreview = useCallback(async (file, startPct) => {
    showToast(`Generating ${Math.round(startPct * 100)}%–${Math.round((startPct + 19 * 0.05) * 100)}%...`, 'success');
    const formData = new FormData();
    formData.append('files', file);
    formData.append('start_pct', String(startPct));
    formData.append('count', '20');
    try {
      const response = await localPost('/api/upload-sensitive-preview', { body: formData });
      if (response.ok) {
        const data = await response.json();
        setSensitivePreview({ file, filename: data.filename, variants: data.variants, startPct });
      } else { showToast(`Processing failed: ${(await response.json()).error}`, 'error'); }
    } catch { showToast(LOCAL_SERVER_UNREACHABLE, 'error'); }
  }, [showToast]);

  const uploadFilesSensitive = useCallback((files) => {
    const valid = files.filter(f => f.name.toLowerCase().includes('(1).jpg'));
    if (!valid.length) return showToast('Only (1).jpg files are accepted for sensitive detection.', 'error');
    if (valid.length > 1) return showToast('Drop one image at a time for sensitive detection.', 'error');
    fetchSensitivePreview(valid[0], 0);
  }, [showToast, fetchSensitivePreview]);

  const handleSaveSensitive = useCallback(async (filename, b64) => {
    try {
      const response = await localPostJson('/api/save-sensitive', { filename, b64 });
      if (response.ok) {
        showToast((await response.json()).message, 'success');
        const m = filename.match(/^(\d+)/);
        if (m) setImageUpdates(prev => ({ ...prev, [m[1]]: Date.now() }));
      } else { showToast(`Save failed: ${(await response.json()).error}`, 'error'); }
    } catch { showToast(LOCAL_SERVER_UNREACHABLE, 'error'); }
    setSensitivePreview(null);
  }, [showToast]);

  return {
    imageUpdates,
    uploadFiles, uploadFilesBrightness, uploadFilesMonster, uploadFilesSensitive,
    fetchSensitivePreview, handleSaveSensitive,
    sensitivePreview, setSensitivePreview,
  };
}
