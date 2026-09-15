import { SITE_URL } from '@/utils/seo';

export const dynamic = 'force-static';

export function GET() {
  const body = [
    // ── Googlebot ─────────────────────────────────────────────────────────────
    // Explicitly grant access to all crawlable content and JS/CSS assets that
    // Googlebot needs to render pages correctly. Blocking these causes
    // "Googlebot cannot access CSS and JS files" warnings in GSC.
    'User-agent: Googlebot',
    'Allow: /',
    'Allow: /_next/static/',
    'Allow: /_next/image',
    'Allow: /drama/',
    'Allow: /movie/',
    'Allow: /dramas',
    'Allow: /movies',
    'Allow: /genres',
    'Allow: /articles/',
    'Allow: /sitemap',
    'Allow: /about',
    'Allow: /contact',
    'Allow: /media-fallback/',
    'Disallow: /management',
    'Disallow: /management/',
    'Disallow: /profile',
    'Disallow: /profile/',
    'Disallow: /auth',
    'Disallow: /api/',
    '',
    // ── All other bots ────────────────────────────────────────────────────────
    'User-agent: *',
    'Allow: /',
    'Allow: /_next/static/',
    'Allow: /_next/image',
    'Allow: /media-fallback/',
    'Disallow: /management',
    'Disallow: /management/',
    'Disallow: /profile',
    'Disallow: /profile/',
    'Disallow: /auth',
    'Disallow: /api/',
    '',
    // ── Sitemap declaration ───────────────────────────────────────────────────
    // Must be the exact canonical URL (www, https, no trailing slash on sitemap).
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    '',
  ].join('\n');

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
