if (typeof window !== 'undefined') {
  throw new Error('[backend.js] Security violation: Backend fetcher cannot be executed in the browser.');
}

const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_ATTEMPTS = 3;

export class BackendRequestError extends Error {
  constructor(message, { status = 0, path = '', cause } = {}) {
    super(message, { cause });
    this.name = 'BackendRequestError';
    this.status = status;
    this.path = path;
  }
}

export function getBackendUrl() {
  return (
    process.env.BACKEND_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://api.ksubzone.com'
      : 'http://127.0.0.1:5000')
  ).replace(/\/+$/, '');
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

/**
 * Fetch public backend JSON without letting a short origin outage become a
 * crawler-facing soft 404. The first request uses Next's persistent data cache;
 * retries go directly to the origin so a transient cached failure is not reused.
 */
export async function fetchBackendJson(
  path,
  {
    revalidate = 60,
    tags = [],
    attempts = 2,
    timeoutMs = 8_000,
    notFoundStatuses = [404],
    fallback = undefined,
  } = {},
) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${getBackendUrl()}${normalizedPath}`;
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'X-KSubZone-Render': 'server',
        },
        ...(attempt === 1
          ? { next: { revalidate, tags } }
          : { cache: 'no-store' }),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (notFoundStatuses.includes(response.status)) return null;

      if (!response.ok) {
        throw new BackendRequestError(
          `Backend returned HTTP ${response.status} for ${normalizedPath}`,
          { status: response.status, path: normalizedPath },
        );
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.toLowerCase().includes('application/json')) {
        throw new BackendRequestError(
          `Backend returned non-JSON content for ${normalizedPath}`,
          { status: response.status, path: normalizedPath },
        );
      }

      return await response.json();
    } catch (error) {
      lastError = error instanceof BackendRequestError
        ? error
        : new BackendRequestError(`Backend request failed for ${normalizedPath}`, {
            path: normalizedPath,
            cause: error,
          });

      if (attempt < attempts) {
        await wait(150 * 2 ** (attempt - 1));
      }
    }
  }

  if (fallback !== undefined) {
    console.warn(`[backend] ${normalizedPath} failed after ${attempts} attempts, using fallback value.`);
    return fallback;
  }

  throw lastError;
}
