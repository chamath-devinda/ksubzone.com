import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async () => {
  const robots = [
    'User-agent: *',
    'Allow: /',
    '',
    'Disallow: /management',
    'Disallow: /management/',
    'Disallow: /api',
    'Disallow: /api/',
    'Disallow: /auth',
    'Disallow: /auth/',
    'Disallow: /profile',
    'Disallow: /profile/',
    '',
    'Sitemap: https://www.ksubzone.com/sitemap.xml',
  ].join('\n');

  return new Response(robots, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
