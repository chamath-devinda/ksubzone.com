import { NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/server/backend';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_SEARCH_PARAMS = [
  'search',
  'genre',
  'year',
  'country',
  'language',
  'rating',
  'status',
  'sort',
  'trending',
  'isHistorical',
  'page',
  'limit'
];

function boundedInteger(value, fallback, max) {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(parsed, max)) : fallback;
}

export async function GET(request) {
  const incoming = new URL(request.url);
  const type = incoming.searchParams.get('type');
  if (!['movies', 'dramas'].includes(type)) {
    return NextResponse.json({ message: 'Choose movies or dramas to search.' }, { status: 400 });
  }

  const params = new URLSearchParams();
  ALLOWED_SEARCH_PARAMS.forEach((key) => {
    const value = incoming.searchParams.get(key)?.trim();
    if (value) params.set(key, value.slice(0, key === 'search' ? 160 : 100));
  });
  params.set('page', String(boundedInteger(incoming.searchParams.get('page'), 1, 500)));
  params.set('limit', String(boundedInteger(incoming.searchParams.get('limit'), 12, 50)));

  try {
    const upstream = await fetch(
      `${getBackendUrl()}/api/media/${type}?${params.toString()}`,
      {
        headers: {
          Accept: 'application/json',
          'X-KSubZone-Render': 'server'
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000)
      }
    );
    const payload = await upstream.json().catch(() => null);

    if (!payload || typeof payload !== 'object') {
      return NextResponse.json(
        { message: 'Search service returned an invalid response.' },
        { status: 502 }
      );
    }

    return NextResponse.json(payload, {
      status: upstream.status,
      headers: { 'Cache-Control': 'private, no-store, max-age=0' }
    });
  } catch (error) {
    console.error(`[search-proxy] ${type} search failed`, error);
    return NextResponse.json(
      { message: 'Search service is temporarily unavailable.' },
      { status: 502, headers: { 'Cache-Control': 'private, no-store, max-age=0' } }
    );
  }
}
