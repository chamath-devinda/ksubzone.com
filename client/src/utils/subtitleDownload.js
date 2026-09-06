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

export async function downloadSubtitle({ downloadUrl, fileUrl, fileName }) {
  // Always route through the PHP backend proxy (cPanel server).
  // The backend handles:
  //   - Supabase-hosted files → 302 redirect to Supabase CDN URL
  //   - Local/cPanel-hosted files → streams bytes directly
  // Previously the client fetched Supabase/uploads URLs directly through
  // Vercel's edge, which exceeded Vercel's egress quota and blocked downloads.
  // Routing via PHP avoids any Vercel bandwidth consumption.
  const response = await fetchWithRetry(downloadUrl, 3, 20000);

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
