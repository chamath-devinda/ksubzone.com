export const SITE_URL = 'https://www.ksubzone.com';

// A number of legacy titles contain SEO copy in the stored display name
// (including older "Subtitiles" misspellings). Keep the slug untouched, but
// remove that copy everywhere a human-readable title is rendered.
const subtitleSuffixPattern = /\s*(?:\(\d{4}\)\s*)?(?:Sinhala(?:\s+and\s+English)?\s+Subtit\p{L}*|සිංහල\s+උපසිරැසි)[\s\S]*$/iu;

export function normalizeSiteUrl(value = SITE_URL) {
  try {
    const candidate = /^https?:\/\//i.test(String(value || ''))
      ? String(value).trim()
      : `https://${String(value || '').trim()}`;
    const parsed = new URL(candidate);

    if (/^(?:www\.)?ksubzone\.com$/i.test(parsed.hostname)) {
      return `${SITE_URL}/`;
    }

    return `${parsed.protocol}//${parsed.host}/`;
  } catch {
    return `${SITE_URL}/`;
  }
}

export function normalizeBrandName(value = 'KSubZone') {
  const name = String(value || '').trim();
  return !name || /^ksubzone$/i.test(name) ? 'KSubZone' : name;
}

export function normalizeBrandText(value = '') {
  return String(value || '').replace(/ksubzone/gi, 'KSubZone');
}

export function cleanMediaTitle(value = '') {
  const original = String(value || '').replace(/\s+/g, ' ').trim();
  if (!original) return '';

  const cleaned = original
    .replace(subtitleSuffixPattern, '')
    .replace(/\s*\(\d{4}\)\s*$/u, '')
    .replace(/\s*\|\s*$/u, '')
    .trim();

  return cleaned || original;
}

export function buildAggregateRating(media = {}) {
  const ratingValue = Number(media.imdbRating || media.tmdbRating || 0);
  const ratingCount = Number(media.ratingCount || media.voteCount || 0);

  // Google requires an honest rating count. Never manufacture one from page
  // views or comments; omit the rich-result field until the source provides it.
  if (!(ratingValue > 0) || !(ratingCount > 0)) return null;

  return {
    '@type': 'AggregateRating',
    ratingValue: Math.min(10, ratingValue),
    bestRating: 10,
    worstRating: 0,
    ratingCount: Math.floor(ratingCount),
  };
}

export function getMediaReleaseYear(media = {}) {
  const value = media.releaseDate || media.firstAirDate || media.createdAt;
  if (!value) return '';

  const directMatch = String(value).match(/\b(19|20)\d{2}\b/);
  if (directMatch) return directMatch[0];

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : String(parsed.getFullYear());
}

export function buildMediaMetaTitle(media = {}) {
  const rawTitle = String(media.title || '').trim();
  const title = cleanMediaTitle(rawTitle) || 'Korean Entertainment';
  const year = getMediaReleaseYear(media);
  const yearStr = year ? ` (${year})` : '';

  // Requirement: Include drama/movie name + year + 'Sinhala Subtitles' and Sinhala keyword
  return `${title}${yearStr} Sinhala Subtitles | ${title} සිංහල උපසිරැසි - KSubZone`;
}

export function buildMediaMetaDescription(media = {}) {
  const rawTitle = String(media.title || '').trim();
  const title = cleanMediaTitle(rawTitle) || 'Korean Drama';
  const year = getMediaReleaseYear(media);
  const yearStr = year ? ` (${year})` : '';
  const typeLabel = media.seasons || media.mediaType === 'drama' || media.type === 'drama' ? 'Korean drama' : 'Korean movie';

  return `Download synchronized Sinhala & English subtitles for ${title}${yearStr} ${typeLabel} in SRT, VTT, and ASS formats. ${title} සිංහල උපසිරැසි (Sinhala sub download) with episode guide, synopsis, and cast info on KSubZone.`;
}

export function generateMediaKeywords(media = {}) {
  const rawTitle = String(media.title || '').trim();
  const title = cleanMediaTitle(rawTitle);
  const year = getMediaReleaseYear(media);
  const rawKeywords = Array.isArray(media.seoKeywords)
    ? media.seoKeywords
    : (media.seoKeywords ? [media.seoKeywords] : []);

  if (!title) return rawKeywords;

  const targetKeywords = [
    `${title} Sinhala Subtitles`,
    `${title} සිංහල උපසිරැසි`,
    `${title} SRT download`,
    `${title} Sinhala sub download`,
    `${title} English subtitles`,
    year ? `${title} ${year} Sinhala Subtitles` : null,
    `${title} Sinhala and English subtitle downloads`,
    `${title} KDrama Sinhala sub`,
    'ksubzone',
    'korean drama sinhala subtitles'
  ].filter(Boolean);

  // Merge unique
  const combined = Array.from(new Set([...targetKeywords, ...rawKeywords]));
  return combined;
}

export function cleanMediaText(value = '', rawTitle = '', cleanTitle = cleanMediaTitle(rawTitle)) {
  let text = String(value || '');
  if (!text || !rawTitle) return normalizeBrandText(text);

  text = text.split(rawTitle).join(cleanTitle);
  if (cleanTitle && cleanTitle !== rawTitle) {
    const escapedTitle = cleanTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pollutedTitlePattern = new RegExp(
      `${escapedTitle}(?:\\s*\\(\\d{4}\\))?\\s+(?:Sinhala\\s+and\\s+English|Sinhala\\s+Subtit(?:iles|les)|සිංහල\\s+උපසිරැසි)`,
      'giu'
    );
    text = text.replace(pollutedTitlePattern, cleanTitle);
  }

  return normalizeBrandText(text);
}

export function serializeJsonLd(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function buildBreadcrumbSchema(items = []) {
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
