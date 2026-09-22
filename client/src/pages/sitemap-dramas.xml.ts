import type { APIRoute } from 'astro';
import { fetchBackendJson } from '@/lib/server/backend';

export const prerender = false;

export const GET: APIRoute = async () => {
  const siteUrl = 'https://www.ksubzone.com';
  let dramas: any[] = [];
  try {
    const data = await fetchBackendJson('/api/media/dramas?status=Published&limit=1000', {
      revalidate: 3600,
      fallback: { dramas: [] },
    });
    dramas = data?.dramas || [];
  } catch (err) {
    console.error('[sitemap-dramas] Fetch error:', err);
  }

  const urlsXml = dramas.map((d: any) => {
    const slug = d.slug || d._id;
    const lastmod = d.updatedAt ? new Date(d.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    return `  <url>
    <loc>${siteUrl}/drama/${slug}</loc>
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
