import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

export async function POST(request, { params }) {
  const action = params?.action;
  if (action !== 'login' && action !== 'session') {
    return NextResponse.json({ message: 'API route not found' }, { status: 404 });
  }

  let body;
  try {
    body = await request.text();
  } catch (_) {
    return NextResponse.json({ message: 'Invalid login request.' }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${getBackendUrl()}/api/admin/${action}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': request.headers.get('content-type') || 'application/json',
      },
      body,
      cache: 'no-store',
    });

    const responseHeaders = new Headers();
    FORWARDED_RESPONSE_HEADERS.forEach((name) => {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    });

    return new NextResponse(await upstream.arrayBuffer(), {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`[admin-auth-proxy] ${action} failed`, error);
    return NextResponse.json(
      { message: 'Admin authentication service is temporarily unavailable.' },
      { status: 502 },
    );
  }
}
