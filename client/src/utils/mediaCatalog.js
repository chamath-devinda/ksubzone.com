import { cleanMediaTitle } from './seo';

const CATALOG_FIELDS = [
  '_id',
  'title',
  'originalTitle',
  'slug',
  'poster',
  'banner',
  'backdrop',
  'backdrops',
  'releaseDate',
  'contentUpdatedAt',
  'createdAt',
  'status',
  'country',
  'language',
  'imdbRating',
  'tmdbRating',
  'viewCount',
  'runtime',
  'keywords',
  'genres',
  'genre',
  'isNew',
  'isHistorical',
  'isTrending',
  'subtitleCount',
  'subtitleSummary',
  'mediaType',
  '_mediaType'
];

export function compactCatalogItem(item, includeSynopsis = false) {
  if (!item || typeof item !== 'object') return {};

  const compact = {};
  CATALOG_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(item, field)) {
      compact[field] = item[field];
    }
  });

  if (compact.title) compact.title = cleanMediaTitle(compact.title);

  if (Array.isArray(compact.keywords)) compact.keywords = compact.keywords.slice(0, 8);
  if (Array.isArray(compact.genres)) compact.genres = compact.genres.slice(0, 8);
  if (Array.isArray(compact.backdrops)) compact.backdrops = compact.backdrops.slice(0, 1);

  if (includeSynopsis) {
    ['synopsisRewrite', 'description'].forEach((field) => {
      if (item[field]) compact[field] = String(item[field]).slice(0, 700);
    });
  }

  return compact;
}

export function compactCatalogItems(items, includeSynopsis = false) {
  return Array.isArray(items)
    ? items.map((item) => compactCatalogItem(item, includeSynopsis))
    : [];
}

export function compactHomeCatalog(catalog = {}) {
  return {
    latestMovies: compactCatalogItems(catalog.latestMovies, true),
    latestDramas: compactCatalogItems(catalog.latestDramas, true),
    historicalMovies: compactCatalogItems(catalog.historicalMovies),
    historicalDramas: compactCatalogItems(catalog.historicalDramas),
    trendingMovies: compactCatalogItems(catalog.trendingMovies),
    trendingDramas: compactCatalogItems(catalog.trendingDramas),
    popularMovies: compactCatalogItems(catalog.popularMovies),
    popularDramas: compactCatalogItems(catalog.popularDramas),
    upcomingMovies: compactCatalogItems(catalog.upcomingMovies),
    upcomingDramas: compactCatalogItems(catalog.upcomingDramas)
  };
}
