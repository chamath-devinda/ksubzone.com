import { NextResponse } from 'next/server';

const getBackendUrl = () => (
  process.env.BACKEND_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://api.ksubzone.com' : 'http://127.0.0.1:5000')
).replace(/\/+$/, '');

const FORWARDED_RESPONSE_HEADERS = [
  'cache-control',
  'content-disposition',
  'content-type',
  'retry-after',
  'set-cookie',
  'vary',
];

function upstreamRequestHeaders(request) {
  const headers = new Headers({
    Accept: request.headers.get('accept') || 'application/json',
  });

  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);

  // Vercel/CDN rewrites do not guarantee that credential headers survive the
  // upstream hop. Forward both supported session forms explicitly so a page
  // refresh validates the same administrator session that signed in.
  const authorization = request.headers.get('authorization');
  if (authorization) headers.set('Authorization', authorization);

  const cookie = request.headers.get('cookie');
  if (cookie) headers.set('Cookie', cookie);

  return headers;
}

function upstreamResponse(upstream) {
  const responseHeaders = new Headers();
  FORWARDED_RESPONSE_HEADERS.forEach((name) => {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function proxyAdminAuth(request, action) {
  let body;
  try {
    body = await request.text();
  } catch (_) {
    return NextResponse.json({ message: 'Invalid login request.' }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${getBackendUrl()}/api/admin/${action}`, {
      method: 'POST',
      headers: upstreamRequestHeaders(request),
      body,
      cache: 'no-store',
    });
    return upstreamResponse(upstream);
  } catch (error) {
    console.error(`[admin-auth-proxy] ${action} failed`, error);
    return NextResponse.json(
      { message: 'Admin authentication service is temporarily unavailable.' },
      { status: 502 },
    );
  }
}

export async function proxyAdminRequest(request, pathSegments = []) {
  const safePath = pathSegments.map((segment) => encodeURIComponent(segment)).join('/');
  const query = new URL(request.url).search;
  const method = request.method.toUpperCase();
  const hasBody = !['GET', 'HEAD'].includes(method);

  try {
    const upstream = await fetch(`${getBackendUrl()}/api/admin/${safePath}${query}`, {
      method,
      headers: upstreamRequestHeaders(request),
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: 'no-store',
      redirect: 'manual',
    });

    return upstreamResponse(upstream);
  } catch (error) {
    console.error(`[admin-api-proxy] ${method} /${safePath} failed`, error);
    return NextResponse.json(
      { message: 'Admin service is temporarily unavailable.' },
      { status: 502 },
    );
  }
}
