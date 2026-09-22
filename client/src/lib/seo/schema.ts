import { SITE_URL, cleanMediaTitle, cleanMediaText, getMediaReleaseYear } from './metadata';

export function serializeJsonLd(value: any): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function buildAggregateRating(media: any = {}) {
  const ratingValue = Number(media.imdbRating || media.tmdbRating || 0);
  const ratingCount = Number(media.ratingCount || media.voteCount || 0);

  if (!(ratingValue > 0) || !(ratingCount > 0)) return null;

  return {
    '@type': 'AggregateRating',
    ratingValue: Math.min(10, ratingValue),
    bestRating: 10,
    worstRating: 0,
    ratingCount: Math.floor(ratingCount),
  };
}

export function buildBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url.startsWith('/') ? '' : '/'}${item.url}`,
    })),
  };
}

export function buildMovieSchema(movie: any, canonicalUrl: string) {
  if (!movie) return null;
  const cleanTitle = cleanMediaTitle(movie.title);
  const aggregateRating = buildAggregateRating(movie);
  const year = getMediaReleaseYear(movie);

  return {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name: `${cleanTitle} Sinhala Subtitles`,
    alternateName: [cleanTitle, `${cleanTitle} සිංහල උපසිරැසි`],
    url: canonicalUrl,
    image: movie.poster ? [movie.poster] : undefined,
    description: cleanMediaText(movie.synopsis || movie.overview || movie.metaDescription || '', movie.title, cleanTitle),
    datePublished: movie.releaseDate || (year ? `${year}-01-01` : undefined),
    inLanguage: ['ko', 'en', 'si'],
    subtitleLanguage: ['Sinhala', 'English'],
    genre: movie.genres || [],
    ...(aggregateRating ? { aggregateRating } : {}),
    ...(movie.director ? { director: { '@type': 'Person', name: movie.director } } : {}),
    ...(Array.isArray(movie.cast) && movie.cast.length > 0
      ? {
          actor: movie.cast.slice(0, 10).map((actor: any) => ({
            '@type': 'Person',
            name: typeof actor === 'string' ? actor : (actor.name || ''),
          })),
        }
      : {}),
  };
}

export function buildDramaSchema(drama: any, canonicalUrl: string) {
  if (!drama) return null;
  const cleanTitle = cleanMediaTitle(drama.title);
  const aggregateRating = buildAggregateRating(drama);
  const year = getMediaReleaseYear(drama);

  return {
    '@context': 'https://schema.org',
    '@type': 'TVSeries',
    name: `${cleanTitle} Sinhala Subtitles`,
    alternateName: [cleanTitle, `${cleanTitle} සිංහල උපසිරැසි`],
    url: canonicalUrl,
    image: drama.poster ? [drama.poster] : undefined,
    description: cleanMediaText(drama.synopsis || drama.overview || drama.metaDescription || '', drama.title, cleanTitle),
    startDate: drama.firstAirDate || (year ? `${year}-01-01` : undefined),
    numberOfSeasons: drama.totalSeasons || (Array.isArray(drama.seasons) ? drama.seasons.length : 1),
    inLanguage: ['ko', 'en', 'si'],
    subtitleLanguage: ['Sinhala', 'English'],
    genre: drama.genres || [],
    ...(aggregateRating ? { aggregateRating } : {}),
    ...(Array.isArray(drama.cast) && drama.cast.length > 0
      ? {
          actor: drama.cast.slice(0, 10).map((actor: any) => ({
            '@type': 'Person',
            name: typeof actor === 'string' ? actor : (actor.name || ''),
          })),
        }
      : {}),
  };
}

export function buildEpisodeSchema(drama: any, episode: any, seasonNumber: number, episodeNumber: number, canonicalUrl: string) {
  if (!drama || !episode) return null;
  const cleanTitle = cleanMediaTitle(drama.title);

  return {
    '@context': 'https://schema.org',
    '@type': 'TVEpisode',
    name: `${cleanTitle} S${String(seasonNumber).padStart(2, '0')}E${String(episodeNumber).padStart(2, '0')}${episode.episodeTitle ? ` "${episode.episodeTitle}"` : ''} Sinhala Subtitles`,
    episodeNumber,
    url: canonicalUrl,
    image: episode.stillPath || drama.poster ? [episode.stillPath || drama.poster] : undefined,
    description: episode.episodeDescription || `Download Sinhala and English subtitles for ${cleanTitle} Season ${seasonNumber} Episode ${episodeNumber}.`,
    partOfSeries: {
      '@type': 'TVSeries',
      name: cleanTitle,
      url: `${SITE_URL}/drama/${drama.slug}`,
    },
    partOfSeason: {
      '@type': 'TVSeason',
      seasonNumber,
    },
  };
}

export function buildArticleSchema(article: any, canonicalUrl: string) {
  if (!article) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.metaDescription || article.excerpt || '',
    image: article.coverImage ? [article.coverImage] : undefined,
    datePublished: article.createdAt,
    dateModified: article.updatedAt || article.createdAt,
    author: {
      '@type': 'Person',
      name: article.authorName || 'KSubZone Editorial Team',
    },
    publisher: {
      '@type': 'Organization',
      name: 'KSubZone',
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/main-logo.webp`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
  };
}
