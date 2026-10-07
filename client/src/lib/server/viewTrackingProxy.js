import { getBackendUrl } from './backend.js';

const BOT_AGENT = /bot|crawler|spider|slurp|curl|wget|python|postman|insomnia|headless|pingdom|statuscake|go-http-client|java\/|libwww|okhttp|httpclient|httrack|teoma|alexa|scoutjet|nutch/i;

function json(body, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

/** Only public counters use this proxy; content and ad requests are unchanged. */
export async function proxyViewTracking(request, path) {
  if (request.method !== 'POST') return json({ message: 'Method not allowed' }, 405);
  if (!/^\/api\/(?:analytics\/visit|media\/(?:dramas|movies)\/[^/]+\/view)$/.test(path)) {
    return json({ message: 'Unknown counter' }, 404);
  }
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return json({ message: 'Invalid origin' }, 403);
  }
  const userAgent = request.headers.get('user-agent') || '';
  if (!userAgent || BOT_AGENT.test(userAgent) || request.headers.has('x-ksubzone-render')) {
    return json({ counted: false });
  }
  const visitorId = request.headers.get('x-ksubzone-visitor-id') || '';
  if (!/^v1_[a-f0-9]{32}$/i.test(visitorId)) {
    return json({ message: 'Missing visitor identifier' }, 400);
  }

  const headers = new Headers({
    Accept: 'application/json',
    // The shared host rejects browser User-Agents on forwarded requests.
    // Bot filtering happens above, before selecting the server transport UA.
    'User-Agent': 'KSubZone-Frontend',
    'X-KSubZone-Visitor-Id': visitorId,
  });
  const clientIp = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (clientIp && /^[a-f\d.:]{3,45}$/i.test(clientIp)) headers.set('X-Forwarded-For', clientIp);

  try {
    const upstream = await fetch(`${getBackendUrl()}${path}`, {
      method: 'POST', headers, cache: 'no-store', signal: AbortSignal.timeout(8_000),
    });
    if (!(upstream.headers.get('content-type') || '').includes('application/json')) {
      return json({ message: 'View tracking temporarily unavailable' }, 502);
    }
    const responseHeaders = new Headers({ 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' });
    if (upstream.headers.has('retry-after')) responseHeaders.set('Retry-After', upstream.headers.get('retry-after'));
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return json({ message: 'View tracking temporarily unavailable' }, 502);
  }
}
