const VISITOR_ID_STORAGE_KEY = 'ksubzone-visitor-id';
let memoryVisitorId = '';

function createVisitorId() {
  if (window.crypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return `v1_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
  }

  return `v1_${`${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`.slice(0, 32).padEnd(32, '0')}`;
}

/**
 * Return a first-party, random browser identifier for deduplicated public
 * analytics. It contains no account or personal data.
 */
export function getVisitorId() {
  if (typeof window === 'undefined') return '';

  try {
    const existing = window.localStorage.getItem(VISITOR_ID_STORAGE_KEY);
    if (/^v1_[a-f0-9]{32}$/i.test(existing || '')) return existing;

    memoryVisitorId = memoryVisitorId || createVisitorId();
    window.localStorage.setItem(VISITOR_ID_STORAGE_KEY, memoryVisitorId);
    return memoryVisitorId;
  } catch {
    // Keep a consistent identity for this page when storage is unavailable.
    // Otherwise all visitors can collapse into the server proxy's IP.
    memoryVisitorId = memoryVisitorId || createVisitorId();
    return memoryVisitorId;
  }
}
