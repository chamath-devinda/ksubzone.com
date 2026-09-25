const MEDIA_REFRESH_KEY = 'ksubzone:media-refresh';

const normalizePayload = (payload = {}) => ({
  mediaId: payload.mediaId ? String(payload.mediaId) : '',
  mediaType: payload.mediaType ? String(payload.mediaType).toLowerCase() : '',
  action: payload.action || 'updated',
  timestamp: Date.now(),
});

/**
 * Notify open public tabs that an admin changed subtitles. The storage event
 * handles other tabs while the custom event handles listeners in this tab.
 */
export function publishMediaRefresh(payload) {
  if (typeof window === 'undefined') return;

  const detail = normalizePayload(payload);
  window.dispatchEvent(new CustomEvent(MEDIA_REFRESH_KEY, { detail }));

  try {
    window.localStorage.setItem(MEDIA_REFRESH_KEY, JSON.stringify(detail));
  } catch (_) {
    // Storage may be blocked in private mode. The custom event still works.
  }
}

export function subscribeToMediaRefresh(listener) {
  if (typeof window === 'undefined' || typeof listener !== 'function') {
    return () => {};
  }

  const handleCustomEvent = (event) => listener(event.detail || {});
  const handleStorageEvent = (event) => {
    if (event.key !== MEDIA_REFRESH_KEY || !event.newValue) return;
    try {
      listener(JSON.parse(event.newValue));
    } catch (_) {
      // Ignore malformed values written by older clients.
    }
  };

  window.addEventListener(MEDIA_REFRESH_KEY, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener(MEDIA_REFRESH_KEY, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}
