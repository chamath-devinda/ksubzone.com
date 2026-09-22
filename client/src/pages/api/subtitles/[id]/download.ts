import type { APIRoute } from 'astro';
import { getBackendUrl } from '@/lib/server/backend';

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ message: 'Subtitle ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(request.url);
    const backendUrl = `${getBackendUrl()}/api/subtitles/${encodeURIComponent(id)}/download${url.search}`;
    const response = await fetch(backendUrl, {
      headers: {
        Accept: '*/*',
        'X-Forwarded-For': request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '',
        'User-Agent': request.headers.get('user-agent') || 'KSubZone-Proxy',
      },
    });

    if (!response.ok) {
      return new Response(response.body, {
        status: response.status,
        headers: {
          'Content-Type': response.headers.get('content-type') || 'application/json',
        },
      });
    }

    const headers = new Headers();
    const copyHeaders = ['content-type', 'content-disposition', 'content-length', 'cache-control'];
    for (const h of copyHeaders) {
      const val = response.headers.get(h);
      if (val) headers.set(h, val);
    }

    return new Response(response.body, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    console.error('[api:subtitles:download] Error:', err);
    return new Response(JSON.stringify({ message: 'Failed to process subtitle download' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
