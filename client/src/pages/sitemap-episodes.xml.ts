import type { APIRoute } from 'astro';
import { fetchBackendJson } from '@/lib/server/backend';

export const prerender = false;

export const GET: APIRoute = async () => {
  const siteUrl = 'https://www.ksubzone.com';
  let dramas: any[] = [];
  try {
    const data = await fetchBackendJson('/api/media/dramas?status=Published&limit=200', {
      revalidate: 3600,
      fallback: { dramas: [] },
    });
    dramas = data?.dramas || [];
  } catch (err) {
    console.error('[sitemap-episodes] Fetch error:', err);
  }

  const episodeUrls: string[] = [];
  const today = new Date().toISOString().split('T')[0];

  for (const drama of dramas) {
    const slug = drama.slug || drama._id;
    if (!slug) continue;

    try {
      const detail = await fetchBackendJson(`/api/media/dramas/${encodeURIComponent(slug)}?trackView=0`, {
        revalidate: 3600,
        fallback: null,
      });

      if (detail && Array.isArray(detail.seasons) && Array.isArray(detail.episodes)) {
        for (const ep of detail.episodes) {
          const season = detail.seasons.find((s: any) => String(s._id) === String(ep.seasonId));
          const seasonNumber = season?.seasonNumber || ep.seasonNumber || 1;
          const episodeNumber = ep.episodeNumber || 1;
          episodeUrls.push(`  <url>
    <loc>${siteUrl}/drama/${slug}/season-${seasonNumber}/episode-${episodeNumber}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
        }
      }
    } catch (_) {}
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${episodeUrls.join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
};
