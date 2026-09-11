import { resolveSubtitleDownloadUrl, isR2Subtitle, getSafeSubtitleFilename } from './subtitleUrl';

const DEFAULT_ERROR = 'මෙම උපසිරැසි ගොනුව දැන් බාගත කළ නොහැක. කරුණාකර නැවත උත්සාහ කරන්න.';
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

const wait = (milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds));

// In-memory cache to prevent crawler/double-click duplicate tracking
const recentTrackings = new Map();

async function trackDownloadSafely(subId) {
  if (!subId) return;
  const now = Date.now();
  const lastTracked = recentTrackings.get(subId);
  if (lastTracked && now - lastTracked < 10000) {
    return; // Ignore duplicate click within 10s
  }
  recentTrackings.set(subId, now);

  try {
    const apiBase = (typeof process !== 'undefined' && (process.env?.NEXT_PUBLIC_API_URL || process.env?.NEXT_PUBLIC_BACKEND_URL)) ||
      (typeof window !== 'undefined' && (window.location.hostname === 'ksubzone.com' || window.location.hostname === 'www.ksubzone.com' || window.location.hostname.endsWith('.vercel.app')) ? 'https://api.ksubzone.com' : '');
    fetch(`${apiBase}/api/subtitles/${subId}/track-download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true
    }).catch(() => {});
  } catch (_) {}
}

async function createResponseError(response) {
  let message = '';
  try {
    const data = await response.clone().json();
    message = data?.message || data?.error || '';
  } catch (_) {
    // HTML / proxy errors
  }

  if (response.status === 402 || (message && (
    message.includes('exceed_egress_quota') ||
    message.includes('restricted due to the following violations') ||
    message.includes('spend caps') ||
    message.includes('SUBTITLE_STORAGE_RESTRICTED') ||
    message.includes('Subtitle backup storage is restricted')
  ))) {
    message = 'උපසිරැසි සේවාදායකයේ තාවකාලික සීමාවක් පවතී. කරුණාකර සුළු මොහොතකින් නැවත උත්සාහ කරන්න.';
  }

  const error = new Error(message || `${DEFAULT_ERROR} (HTTP ${response.status})`);
  error.status = response.status;
  return error;
}

async function fetchWithRetry(url, maxAttempts, timeoutMs = 15000, extraHeaders = undefined) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        cache: 'no-store',
        signal: controller.signal,
        ...(extraHeaders ? { headers: extraHeaders } : {})
      });
      if (response.ok) return response;

      lastError = await createResponseError(response);
      if (!RETRYABLE_STATUSES.has(response.status)) break;
    } catch (error) {
      lastError = error?.name === 'AbortError'
        ? new Error(`${DEFAULT_ERROR} (request timeout)`)
        : new Error(DEFAULT_ERROR);
    } finally {
      window.clearTimeout(timeoutId);
    }

    if (attempt < maxAttempts) {
      await wait(350 * (2 ** (attempt - 1)));
    }
  }

  throw lastError || new Error(DEFAULT_ERROR);
}

/**
 * Downloads a subtitle file directly from Cloudflare R2 if available,
 * or through the backward-compatible proxy endpoint for legacy Supabase files.
 */
export async function downloadSubtitle({ subtitle, subId, downloadUrl, fileUrl, fileName }) {
  const targetId = subId || subtitle?._id || subtitle?.id;
  const safeName = getSafeSubtitleFilename(subtitle, fileName);

  // Trigger lightweight background tracking without proxying file bytes
  if (targetId) {
    trackDownloadSafely(targetId);
  }

  // Check if we can download directly from Cloudflare R2
  const directR2Url = isR2Subtitle(subtitle) ? resolveSubtitleDownloadUrl(subtitle) : (
    (fileUrl && (fileUrl.startsWith('https://files.ksubzone.com') || fileUrl.includes('.r2.cloudflarestorage.com')))
      ? fileUrl
      : null
  );

  const apiBase = (typeof process !== 'undefined' && (process.env?.NEXT_PUBLIC_API_URL || process.env?.NEXT_PUBLIC_BACKEND_URL)) ||
    (typeof window !== 'undefined' && (window.location.hostname === 'ksubzone.com' || window.location.hostname === 'www.ksubzone.com' || window.location.hostname.endsWith('.vercel.app')) ? 'https://api.ksubzone.com' : '');

  let targetUrl = directR2Url || downloadUrl || (targetId ? `${apiBase}/api/subtitles/${targetId}/download` : fileUrl);

  try {
    const response = await fetchWithRetry(targetUrl, 3, 20000);
    const blob = await response.blob();
    if (!blob.size) throw new Error(DEFAULT_ERROR);

    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = safeName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
  } catch (err) {
    // If direct R2 fetch fails due to any reason, fall back to backend proxy endpoint
    if (directR2Url && targetId) {
      // A Cloudflare edge can return 403 for a browser fetch while the PHP
      // origin can still retrieve the public object. Ask the backend to proxy
      // the bytes instead of redirecting back to the same edge URL.
      const fallbackUrl = `${apiBase}/api/subtitles/${targetId}/download`;
      const fallbackResponse = await fetchWithRetry(fallbackUrl, 2, 20000, {
        'X-Subtitle-Proxy': '1'
      });
      const blob = await fallbackResponse.blob();
      if (!blob.size) throw new Error(DEFAULT_ERROR);

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = safeName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
      return;
    }
    throw err;
  }
}
