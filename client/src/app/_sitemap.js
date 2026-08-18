import { permalinkSlug } from '@/utils/slug';

export default async function sitemap() {
  const baseUrl = 'https://www.ksubzone.com';
  const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:5000';

  const defaultUrls = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/movies`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/dramas`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/genres`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/search`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/articles`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/auth`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];

  let movieUrls = [];
  let dramaUrls = [];
  let articleUrls = [];
  let genreUrls = [];

  try {
    const moviesRes = await fetch(`${backendUrl}/api/media/movies?limit=500`, { next: { revalidate: 3600 } });
    if (moviesRes.ok) {
      const data = await moviesRes.json();
      movieUrls = (data.movies || []).map((m) => ({
        url: `${baseUrl}/movie/${permalinkSlug(m)}`,
        lastModified: new Date(m.updatedAt || m.createdAt || Date.now()),
        changeFrequency: 'weekly',
        priority: 0.7,
      }));
    }
  } catch (e) {
    console.error('Sitemap movies fetch failed:', e);
  }

  try {
    const dramasRes = await fetch(`${backendUrl}/api/media/dramas?limit=500`, { next: { revalidate: 3600 } });
    if (dramasRes.ok) {
      const data = await dramasRes.json();
      dramaUrls = (data.dramas || []).map((d) => ({
        url: `${baseUrl}/drama/${permalinkSlug(d)}`,
        lastModified: new Date(d.updatedAt || d.createdAt || Date.now()),
        changeFrequency: 'weekly',
        priority: 0.7,
      }));
    }
  } catch (e) {
    console.error('Sitemap dramas fetch failed:', e);
  }

  try {
    const articlesRes = await fetch(`${backendUrl}/api/articles?limit=500`, { next: { revalidate: 3600 } });
    if (articlesRes.ok) {
      const data = await articlesRes.json();
      articleUrls = (data.articles || []).map((a) => ({
        url: `${baseUrl}/articles/${a.slug}`,
        lastModified: new Date(a.publishedAt || a.updatedAt || Date.now()),
        changeFrequency: 'weekly',
        priority: 0.6,
      }));
    }
  } catch (e) {
    console.error('Sitemap articles fetch failed:', e);
  }

  try {
    const genresRes = await fetch(`${backendUrl}/api/media/genres`, { next: { revalidate: 3600 } });
    if (genresRes.ok) {
      const genres = await genresRes.json();
      (genres || []).forEach((g) => {
        if (g.slug) {
          genreUrls.push({
            url: `${baseUrl}/movie/genre/${g.slug}`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.5,
          });
          genreUrls.push({
            url: `${baseUrl}/drama/genre/${g.slug}`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.5,
          });
        }
      });
    }
  } catch (e) {
    console.error('Sitemap genres fetch failed:', e);
  }

  return [...defaultUrls, ...movieUrls, ...dramaUrls, ...articleUrls, ...genreUrls];
}
