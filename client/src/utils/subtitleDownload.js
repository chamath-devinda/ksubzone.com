const DEFAULT_ERROR = 'මෙම උපසිරැසි ගොනුව දැන් බාගත කළ නොහැක. කරුණාකර නැවත උත්සාහ කරන්න.';
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

const wait = (milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds));

async function createResponseError(response) {
  let message = '';
  try {
    const data = await response.clone().json();
    message = data?.message || data?.error || '';
  } catch (_) {
    // CDN and shared-hosting errors are frequently returned as HTML.
  }

  const error = new Error(message || `${DEFAULT_ERROR} (HTTP ${response.status})`);
  error.status = response.status;
  return error;
}

async function fetchWithRetry(url, maxAttempts, timeoutMs = 15000) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
      if (response.ok) return response;

      lastError = await createResponseError(response);
      if (!RETRYABLE_STATUSES.has(response.status)) break;
    } catch (error) {
      lastError = error?.name === 'AbortError'
        ? new Error(`${DEFAULT_ERROR} (request timeout)`)
        : error;
    } finally {
      window.clearTimeout(timeoutId);
    }

    if (attempt < maxAttempts) {
      await wait(350 * (2 ** (attempt - 1)));
    }
  }

  throw lastError || new Error(DEFAULT_ERROR);
}

function getTrustedDirectFileUrl(fileUrl, downloadUrl) {
  if (!fileUrl) return null;

  try {
    const parsed = new URL(fileUrl);
    // Allow public Supabase storage while rejecting arbitrary remote hosts.
    if (parsed.protocol === 'https:' && parsed.hostname.endsWith('.supabase.co')) {
      return parsed.toString();
    }
  } catch (_) {
    // Relative upload paths are handled below.
  }

  // Files stored under the API's public uploads directory can be fetched
  // without a database lookup. Resolve them against the download endpoint so
  // this works with both the direct API host and same-origin rewrites.
  const normalizedPath = String(fileUrl).replace(/^\/+/, '');
  if (/^uploads\/subtitles\/[^?#]+/i.test(normalizedPath)) {
    try {
      return new URL(`/${normalizedPath}`, downloadUrl).toString();
    } catch (_) {
      return null;
    }
  }

  return null;
}

export async function downloadSubtitle({ downloadUrl, fileUrl, fileName }) {
  let response;
  let usedDirectStorage = false;
  const remoteFileUrl = getTrustedDirectFileUrl(fileUrl, downloadUrl);

  // Fetch public storage directly. This avoids a database lookup and prevents
  // the shared PHP controller from proxying the same file bytes.
  if (remoteFileUrl) {
    try {
      response = await fetchWithRetry(remoteFileUrl, 1, 8000);
      usedDirectStorage = true;
    } catch (_) {
      // Older/local storage configurations still work through the backend.
    }
  }

  if (!response) {
    response = await fetchWithRetry(downloadUrl, 2, 15000);
  }

  const blob = await response.blob();
  if (!blob.size) throw new Error(DEFAULT_ERROR);

  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName || 'subtitle.srt';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);

  if (usedDirectStorage) {
    // Analytics must never delay the actual file. The POST route shares the
    // same path as the proxy download route and only updates the counter.
    try {
      const trackingUrl = new URL(downloadUrl, window.location.href);
      trackingUrl.search = '';
      void fetch(trackingUrl.toString(), {
        method: 'POST',
        credentials: 'include',
        keepalive: true,
        headers: { Accept: 'application/json' }
      }).catch(() => {});
    } catch (_) {
      // A failed count update is non-critical.
    }
  }
}
