import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async () => {
  const siteUrl = 'https://www.ksubzone.com';
  const pages = [
    { url: '/', priority: '1.0', changefreq: 'daily' },
    { url: '/movies', priority: '0.9', changefreq: 'daily' },
    { url: '/dramas', priority: '0.9', changefreq: 'daily' },
    { url: '/articles', priority: '0.8', changefreq: 'weekly' },
    { url: '/genres', priority: '0.7', changefreq: 'weekly' },
    { url: '/about', priority: '0.5', changefreq: 'monthly' },
    { url: '/contact', priority: '0.5', changefreq: 'monthly' },
  ];

  const today = new Date().toISOString().split('T')[0];
  const urlsXml = pages.map((p) => `  <url>
    <loc>${siteUrl}${p.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
