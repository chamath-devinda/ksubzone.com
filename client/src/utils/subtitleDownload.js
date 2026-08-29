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

async function fetchWithRetry(url, maxAttempts) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (response.ok) return response;

      lastError = await createResponseError(response);
      if (!RETRYABLE_STATUSES.has(response.status)) break;
    } catch (error) {
      lastError = error;
    }

    if (attempt < maxAttempts) {
      await wait(350 * (2 ** (attempt - 1)));
    }
  }

  throw lastError || new Error(DEFAULT_ERROR);
}

function getTrustedRemoteFallback(fileUrl) {
  if (!fileUrl) return null;

  try {
    const parsed = new URL(fileUrl);
    // Current production subtitles are stored in a public Supabase bucket.
    // Restrict the browser fallback to that trusted storage provider.
    if (parsed.protocol === 'https:' && parsed.hostname.endsWith('.supabase.co')) {
      return parsed.toString();
    }
  } catch (_) {
    // Relative/local paths must continue through the backend proxy.
  }

  return null;
}

export async function downloadSubtitle({ downloadUrl, fileUrl, fileName }) {
  let response;

  try {
    response = await fetchWithRetry(downloadUrl, 3);
  } catch (proxyError) {
    const remoteFallback = getTrustedRemoteFallback(fileUrl);
    if (!remoteFallback) throw proxyError;
    response = await fetchWithRetry(remoteFallback, 2);
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
}
