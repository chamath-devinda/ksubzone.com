import { fetchBackendJson } from '@/lib/server/backend';
import { permalinkSlug } from '@/utils/slug';
import { SITE_URL } from '@/utils/seo';

// Dynamic route handler with edge caching: never blocks static build generation.
// Edge CDNs cache the response for 1 hour.
export const dynamic = 'force-dynamic';
export const revalidate = 3600;

const xmlEscape = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const validIsoDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const categorySlug = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const renderUrl = ({ url, lastModified, changeFrequency, priority }) => {
  const lastmod = validIsoDate(lastModified);
  return [
    '  <url>',
    `    <loc>${xmlEscape(url)}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
    changeFrequency ? `    <changefreq>${changeFrequency}</changefreq>` : null,
    Number.isFinite(priority) ? `    <priority>${priority.toFixed(1)}</priority>` : null,
    '  </url>',
  ].filter(Boolean).join('\n');
};

function deduplicateEntries(entries) {
  const byUrl = new Map();
  for (const entry of entries) {
    if (!entry?.url) continue;
    const existing = byUrl.get(entry.url);
    const existingDate = validIsoDate(existing?.lastModified);
    const nextDate = validIsoDate(entry.lastModified);
    if (!existing || (nextDate && (!existingDate || nextDate > existingDate))) {
      byUrl.set(entry.url, entry);
    }
  }
  return [...byUrl.values()];
}

/**
 * Build the full sitemap XML from the backend catalog.
 * Throws on total failure so Next.js can serve a cached response instead.
 */
async function buildSitemapXml() {
  const [catalog, articleData, genres] = await Promise.all([
    fetchBackendJson('/api/media/sitemap-catalog', {
      revalidate: 3600,
      tags: ['sitemap', 'dramas', 'movies', 'episodes'],
    }),
    fetchBackendJson('/api/articles?status=Published&limit=500', {
      revalidate: 3600,
      tags: ['sitemap', 'articles'],
    }),
    fetchBackendJson('/api/media/genres', {
      revalidate: 3600,
      tags: ['sitemap', 'genres'],
    }),
  ]);

  // Update SITE_LAST_MODIFIED only when the shared/static page content changes.
  // The fallback is this SEO architecture release, not the request time.
  const staticLastModified = validIsoDate(
    process.env.SITE_LAST_MODIFIED || '2026-09-15T00:00:00.000Z',
  );

  const entries = [
    { url: `${SITE_URL}/`, lastModified: staticLastModified, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/dramas`, lastModified: staticLastModified, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/movies`, lastModified: staticLastModified, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/genres`, lastModified: staticLastModified, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/articles`, lastModified: staticLastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/sitemap`, lastModified: staticLastModified, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${SITE_URL}/about`, lastModified: staticLastModified, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/contact`, lastModified: staticLastModified, changeFrequency: 'monthly', priority: 0.4 },
  ];

  for (const drama of catalog?.dramas || []) {
    const slug = permalinkSlug(drama);
    if (!slug) continue;
    entries.push({
      url: `${SITE_URL}/drama/${slug}`,
      lastModified: drama.contentUpdatedAt || drama.updatedAt || drama.createdAt,
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  }

  for (const movie of catalog?.movies || []) {
    const slug = permalinkSlug(movie);
    if (!slug) continue;
    entries.push({
      url: `${SITE_URL}/movie/${slug}`,
      lastModified: movie.contentUpdatedAt || movie.updatedAt || movie.createdAt,
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  }

  for (const episode of catalog?.episodes || []) {
    if (!String(episode?.path || '').startsWith('/drama/')) continue;
    entries.push({
      url: `${SITE_URL}${episode.path}`,
      lastModified: episode.updatedAt,
      changeFrequency: 'monthly',
      priority: 0.6,
    });
  }

  const categories = new Map();
  for (const article of articleData?.articles || []) {
    if (!article?.slug) continue;
    const modified = article.updatedAt || article.publishedAt || article.createdAt;
    entries.push({
      url: `${SITE_URL}/articles/${article.slug}`,
      lastModified: modified,
      changeFrequency: 'weekly',
      priority: 0.7,
    });

    const slug = categorySlug(article.category);
    const previousDate = categories.get(slug);
    const nextDate = validIsoDate(modified);
    if (slug && (!previousDate || (nextDate && nextDate > previousDate))) {
      categories.set(slug, nextDate);
    }
  }

  for (const [slug, lastModified] of categories) {
    entries.push({
      url: `${SITE_URL}/articles/category/${slug}`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.6,
    });
  }

  const genreBySlug = new Map();
  for (const genre of genres || []) {
    if (!genre?.slug) continue;
    const current = genreBySlug.get(genre.slug);
    if (!current || Number(genre.totalCount || 0) > Number(current.totalCount || 0)) {
      genreBySlug.set(genre.slug, genre);
    }
  }
  for (const genre of genreBySlug.values()) {
    if (Number(genre.dramaCount || 0) > 0) {
      entries.push({
        url: `${SITE_URL}/drama/genre/${genre.slug}`,
        lastModified: genre.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }
    if (Number(genre.movieCount || 0) > 0) {
      entries.push({
        url: `${SITE_URL}/movie/genre/${genre.slug}`,
        lastModified: genre.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }
  }

  const urls = deduplicateEntries(entries).map(renderUrl).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export async function GET() {
  try {
    const xml = await buildSitemapXml();

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        // Browsers / proxies: serve stale for up to 1 day while revalidating.
        // CDN (Cloudflare / Vercel Edge): cache for 1 hour, revalidate in background.
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    // When the backend is down, throw so Next.js ISR serves the last cached
    // response. If there is no cached response yet (cold start), return a
    // minimal sitemap with static pages only — never a 503.
    console.error('Sitemap backend fetch failed, falling back to static entries:', error);

    const staticLastModified = validIsoDate(
      process.env.SITE_LAST_MODIFIED || '2026-09-15T00:00:00.000Z',
    );
    const fallbackEntries = [
      { url: `${SITE_URL}/`, lastModified: staticLastModified, changeFrequency: 'daily', priority: 1 },
      { url: `${SITE_URL}/dramas`, lastModified: staticLastModified, changeFrequency: 'daily', priority: 0.9 },
      { url: `${SITE_URL}/movies`, lastModified: staticLastModified, changeFrequency: 'daily', priority: 0.9 },
      { url: `${SITE_URL}/genres`, lastModified: staticLastModified, changeFrequency: 'weekly', priority: 0.7 },
      { url: `${SITE_URL}/articles`, lastModified: staticLastModified, changeFrequency: 'daily', priority: 0.7 },
      { url: `${SITE_URL}/sitemap`, lastModified: staticLastModified, changeFrequency: 'weekly', priority: 0.5 },
      { url: `${SITE_URL}/about`, lastModified: staticLastModified, changeFrequency: 'monthly', priority: 0.4 },
      { url: `${SITE_URL}/contact`, lastModified: staticLastModified, changeFrequency: 'monthly', priority: 0.4 },
    ];
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${fallbackEntries.map(renderUrl).join('\n')}\n</urlset>\n`;

    return new Response(fallbackXml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        // Short cache so Next.js re-attempts the full build soon.
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
        'X-Content-Type-Options': 'nosniff',
        'X-Sitemap-Fallback': 'true',
      },
    });
  }
}
