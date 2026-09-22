import type { APIRoute } from 'astro';
import { fetchBackendJson } from '@/lib/server/backend';

export const prerender = false;

export const GET: APIRoute = async () => {
  const siteUrl = 'https://www.ksubzone.com';
  let movies: any[] = [];
  try {
    const data = await fetchBackendJson('/api/media/movies?status=Published&limit=1000', {
      revalidate: 3600,
      fallback: { movies: [] },
    });
    movies = data?.movies || [];
  } catch (err) {
    console.error('[sitemap-movies] Fetch error:', err);
  }

  const urlsXml = movies.map((m: any) => {
    const slug = m.slug || m._id;
    const lastmod = m.updatedAt ? new Date(m.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    return `  <url>
    <loc>${siteUrl}/movie/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
};
