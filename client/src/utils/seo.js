export const SITE_URL = 'https://www.ksubzone.com';

const subtitleSuffixPattern = /\s*(?:\(\d{4}\)\s*)?(?:Sinhala\s+Subtit(?:iles|les)|සිංහල\s+උපසිරැසි)[\s\S]*$/iu;

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
    .replace(/\s*\|\s*$/u, '')
    .trim();

  return cleaned || original;
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
  const configuredTitle = normalizeBrandText(media.metaTitle || '').trim();
  const configuredLooksClean = configuredTitle
    && title === rawTitle
    && !/Subtitiles|සිංහල\s+උපසිරැසි.*(?:Sinhala|English)/iu.test(configuredTitle);

  if (configuredLooksClean) return configuredTitle;

  const year = getMediaReleaseYear(media);
  return `${title}${year ? ` (${year})` : ''} Sinhala & English Subtitles | KSubZone`;
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
