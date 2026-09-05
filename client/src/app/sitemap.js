import { permalinkSlug } from '@/utils/slug';

export default async function sitemap() {
  const baseUrl = 'https://www.ksubzone.com';
  const backendUrl = process.env.BACKEND_URL || (
    process.env.NODE_ENV === 'production'
      ? 'https://api.ksubzone.com'
      : 'http://127.0.0.1:5000'
  );

  // Core static & navigation routes
  const defaultUrls = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/dramas`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.95 },
    { url: `${baseUrl}/movies`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.95 },
    { url: `${baseUrl}/genres`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/articles`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.85 },
    { url: `${baseUrl}/sitemap`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
  ];

  let dramaUrls = [];
  let movieUrls = [];
  let articleUrls = [];
  let genreUrls = [];
  let categoryUrls = [];

  // 1. Fetch TV Dramas (up to 1000 items)
  try {
    const dramasRes = await fetch(`${backendUrl}/api/media/dramas?limit=1000`, { 
      next: { revalidate: 3600 } 
    });
    if (dramasRes.ok) {
      const data = await dramasRes.json();
      dramaUrls = (data.dramas || []).map((d) => ({
        url: `${baseUrl}/drama/${permalinkSlug(d)}`,
        lastModified: new Date(d.contentUpdatedAt || d.updatedAt || d.createdAt || Date.now()),
        changeFrequency: 'daily',
        priority: 0.85,
      }));
    }
  } catch (e) {
    console.error('Sitemap dramas fetch failed:', e);
  }

  // 2. Fetch Movies (up to 1000 items)
  try {
    const moviesRes = await fetch(`${backendUrl}/api/media/movies?limit=1000`, { 
      next: { revalidate: 3600 } 
    });
    if (moviesRes.ok) {
      const data = await moviesRes.json();
      movieUrls = (data.movies || []).map((m) => ({
        url: `${baseUrl}/movie/${permalinkSlug(m)}`,
        lastModified: new Date(m.contentUpdatedAt || m.updatedAt || m.createdAt || Date.now()),
        changeFrequency: 'weekly',
        priority: 0.85,
      }));
    }
  } catch (e) {
    console.error('Sitemap movies fetch failed:', e);
  }

  // 3. Fetch Articles & Guides
  try {
    const articlesRes = await fetch(`${backendUrl}/api/articles?limit=500`, { 
      next: { revalidate: 3600 } 
    });
    if (articlesRes.ok) {
      const data = await articlesRes.json();
      articleUrls = (data.articles || []).map((a) => ({
        url: `${baseUrl}/articles/${a.slug}`,
        lastModified: new Date(a.publishedAt || a.updatedAt || Date.now()),
        changeFrequency: 'weekly',
        priority: 0.7,
      }));
      const categories = new Map();
      (data.articles || []).forEach((article) => {
        const name = String(article.category || '').trim();
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        if (slug) categories.set(slug, article.updatedAt || article.publishedAt || new Date());
      });
      categoryUrls = Array.from(categories, ([slug, lastModified]) => ({
        url: `${baseUrl}/articles/category/${slug}`,
        lastModified: new Date(lastModified),
        changeFrequency: 'weekly',
        priority: 0.65,
      }));
    }
  } catch (e) {
    console.error('Sitemap articles fetch failed:', e);
  }

  // 4. Fetch Genres
  try {
    const genresRes = await fetch(`${backendUrl}/api/media/genres`, { 
      next: { revalidate: 3600 } 
    });
    if (genresRes.ok) {
      const genres = await genresRes.json();
      const seenGenres = new Set();
      (genres || []).forEach((g) => {
        if (g.slug) {
          if (seenGenres.has(g.slug)) return;
          seenGenres.add(g.slug);
          genreUrls.push({
            url: `${baseUrl}/drama/genre/${g.slug}`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.65,
          });
          genreUrls.push({
            url: `${baseUrl}/movie/genre/${g.slug}`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.65,
          });
        }
      });
    }
  } catch (e) {
    console.error('Sitemap genres fetch failed:', e);
  }

  return [...defaultUrls, ...dramaUrls, ...movieUrls, ...articleUrls, ...genreUrls, ...categoryUrls];
}
