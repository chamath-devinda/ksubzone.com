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
  'trendingSelectedAt',
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

export function mergeCatalogItems(...collections) {
  const merged = new Map();

  collections.forEach((items) => {
    if (!Array.isArray(items)) return;

    items.forEach((item, index) => {
      if (!item || typeof item !== 'object') return;

      const identity = item._id
        ? `id:${String(item._id)}`
        : item.slug
          ? `slug:${String(item.slug)}`
          : `fallback:${String(item.title || '')}:${String(item.releaseDate || '')}:${index}`;
      const current = merged.get(identity);
      merged.set(identity, current ? { ...current, ...item } : item);
    });
  });

  return Array.from(merged.values());
}

export function getCuratedTrendingItems(catalog = {}) {
  const timestamp = (value) => {
    const parsed = Date.parse(value || '');
    return Number.isFinite(parsed) ? parsed : 0;
  };

  return [
    ...(catalog.selectedTrendingDramas || []).map((item) => ({ ...item, mediaType: 'drama' })),
    ...(catalog.selectedTrendingMovies || []).map((item) => ({ ...item, mediaType: 'movie' }))
  ]
    .filter((item) => item.status === 'Published' || item.status === 'Upcoming')
    .sort((a, b) => {
      const aSelected = Boolean(a.trendingSelectedAt);
      const bSelected = Boolean(b.trendingSelectedAt);
      if (aSelected !== bSelected) return Number(bSelected) - Number(aSelected);
      const aTime = timestamp(a.trendingSelectedAt || a.contentUpdatedAt || a.createdAt);
      const bTime = timestamp(b.trendingSelectedAt || b.contentUpdatedAt || b.createdAt);
      return bTime - aTime || (Number(b.viewCount) || 0) - (Number(a.viewCount) || 0);
    })
    .slice(0, 10);
}

function catalogText(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => typeof item === 'string' ? item : item?.name || '')
      .join(' ');
  }
  return typeof value === 'string' ? value : '';
}

export function isHistoricalMovie(item) {
  if (item?.status !== 'Published') return false;
  if (item.isHistorical === true) return true;

  const metadata = [item.title, item.originalTitle, item.keywords, item.genres, item.genre]
    .map(catalogText)
    .join(' ');
  return /\b(?:historical|sageuk|joseon|goryeo|dynasty|period[\s-]+drama|costume[\s-]+drama|coup[\s-]+d['’]?etat)\b/i.test(metadata);
}

export function compactHomeCatalog(catalog = {}) {
  return {
    latestMovies: compactCatalogItems(catalog.latestMovies, true),
    latestDramas: compactCatalogItems(catalog.latestDramas, true),
    historicalMovies: compactCatalogItems(catalog.historicalMovies),
    historicalDramas: compactCatalogItems(catalog.historicalDramas),
    trendingMovies: compactCatalogItems(catalog.trendingMovies),
    trendingDramas: compactCatalogItems(catalog.trendingDramas),
    selectedTrendingMovies: compactCatalogItems(catalog.selectedTrendingMovies),
    selectedTrendingDramas: compactCatalogItems(catalog.selectedTrendingDramas),
    popularMovies: compactCatalogItems(catalog.popularMovies),
    popularDramas: compactCatalogItems(catalog.popularDramas),
    upcomingMovies: compactCatalogItems(catalog.upcomingMovies),
    upcomingDramas: compactCatalogItems(catalog.upcomingDramas)
  };
}
