import { fetchBackendJson } from './backend';

let cachedSiteContent = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 1800 * 1000; // 30 minutes

export async function getServerSiteContent() {
  const now = Date.now();
  if (cachedSiteContent && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedSiteContent;
  }

  try {
    const data = await fetchBackendJson('/api/site-content', {
      attempts: 2,
      timeoutMs: 3000,
      fallback: null,
    });
    if (data) {
      cachedSiteContent = data;
      lastFetchTime = now;
    }
    return data || cachedSiteContent;
  } catch (err) {
    console.warn('[siteContent] Failed to fetch live site-content, returning cached or null');
    return cachedSiteContent;
  }
}
