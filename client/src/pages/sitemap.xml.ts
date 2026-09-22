import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async () => {
  const siteUrl = 'https://www.ksubzone.com';
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${siteUrl}/sitemap-static.xml</loc></sitemap>
  <sitemap><loc>${siteUrl}/sitemap-movies.xml</loc></sitemap>
  <sitemap><loc>${siteUrl}/sitemap-dramas.xml</loc></sitemap>
  <sitemap><loc>${siteUrl}/sitemap-episodes.xml</loc></sitemap>
  <sitemap><loc>${siteUrl}/sitemap-articles.xml</loc></sitemap>
</sitemapindex>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
};
