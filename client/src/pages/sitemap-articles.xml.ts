import type { APIRoute } from 'astro';
import { fetchBackendJson } from '@/lib/server/backend';

export const prerender = false;

export const GET: APIRoute = async () => {
  const siteUrl = 'https://www.ksubzone.com';
  let articles: any[] = [];
  try {
    const data = await fetchBackendJson('/api/articles?status=Published&limit=1000', {
      revalidate: 3600,
      fallback: { articles: [] },
    });
    articles = data?.articles || [];
  } catch (err) {
    console.error('[sitemap-articles] Fetch error:', err);
  }

  const urlsXml = articles.map((a: any) => {
    const slug = a.slug || a._id;
    const lastmod = a.updatedAt ? new Date(a.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    return `  <url>
    <loc>${siteUrl}/article/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
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
