import { fetchBackendJson } from './backend';

/**
 * Fetch site settings through Next's tagged cache rather than a process-wide
 * variable. The old 30-minute module cache survived an admin save on warm
 * server instances, so public pages could keep rendering obsolete settings.
 */
export async function getServerSiteContent() {
  try {
    return await fetchBackendJson('/api/site-content', {
      revalidate: 30,
      tags: ['site-content'],
      attempts: 2,
      timeoutMs: 3000,
      fallback: null,
    });
  } catch (err) {
    console.warn('[siteContent] Failed to fetch live site content.');
    return null;
  }
}
