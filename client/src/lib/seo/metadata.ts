export const SITE_URL = 'https://www.ksubzone.com';

const subtitleSuffixPattern = /\s*(?:\(\d{4}\)\s*)?(?:Sinhala(?:\s+and\s+English)?\s+Subtit\p{L}*|සිංහල\s+උපසිරැසි)[\s\S]*$/iu;

export function normalizeSiteUrl(value = SITE_URL): string {
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

export function normalizeBrandName(value = 'KSubZone'): string {
  const name = String(value || '').trim();
  return !name || /^ksubzone$/i.test(name) ? 'KSubZone' : name;
}

export function normalizeBrandText(value = ''): string {
  return String(value || '').replace(/ksubzone/gi, 'KSubZone');
}

export function cleanMediaTitle(value = ''): string {
  const original = String(value || '').replace(/\s+/g, ' ').trim();
  if (!original) return '';

  const cleaned = original
    .replace(subtitleSuffixPattern, '')
    .replace(/\s*\(\d{4}\)\s*$/u, '')
    .replace(/\s*\|\s*$/u, '')
    .trim();

  return cleaned || original;
}

export function getMediaReleaseYear(media: any = {}): string {
  const value = media.releaseDate || media.firstAirDate || media.createdAt;
  if (!value) return '';

  const directMatch = String(value).match(/\b(19|20)\d{2}\b/);
  if (directMatch) return directMatch[0];

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : String(parsed.getFullYear());
}

export function clampDescription(text = '', maxLength = 155): string {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean || clean.length <= maxLength) return clean;
  const truncated = clean.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  const safe = lastSpace > 60 ? truncated.slice(0, lastSpace) : truncated;
  return `${safe.replace(/[.,;:!?]+$/, '')}...`;
}

export function buildMediaMetaTitle(media: any = {}): string {
  const rawTitle = String(media.title || '').trim();
  const title = cleanMediaTitle(rawTitle) || 'Korean Entertainment';
  const year = getMediaReleaseYear(media);
  const yearStr = year ? ` (${year})` : '';

  const fullCandidate = `${title}${yearStr} Sinhala Subtitles | සිංහල උපසිරැසි - KSubZone`;
  if (fullCandidate.length <= 60) {
    return fullCandidate;
  }

  const standardCandidate = `${title}${yearStr} Sinhala Subtitles | KSubZone`;
  if (standardCandidate.length <= 65) {
    return standardCandidate;
  }

  const compactCandidate = `${title} Sinhala Subtitles | KSubZone`;
  if (compactCandidate.length <= 65) {
    return compactCandidate;
  }

  return `${title.slice(0, 38).trim()}... Sinhala Subtitles | KSubZone`;
}

export function buildMediaMetaDescription(media: any = {}): string {
  const rawTitle = String(media.title || '').trim();
  const title = cleanMediaTitle(rawTitle) || 'Korean Drama';
  const year = getMediaReleaseYear(media);
  const yearStr = year ? ` (${year})` : '';
  const typeLabel = media.seasons || media.mediaType === 'drama' || media.type === 'drama' ? 'Korean drama' : 'Korean movie';

  return `Download synchronized Sinhala & English subtitles for ${title}${yearStr} ${typeLabel} in SRT format. ${title} සිංහල උපසිරැසි download on KSubZone.`;
}

export function generateMediaKeywords(media: any = {}): string[] {
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
  ].filter(Boolean) as string[];

  return Array.from(new Set([...targetKeywords, ...rawKeywords]));
}

export function cleanMediaText(value = '', rawTitle = '', cleanTitle = cleanMediaTitle(rawTitle)): string {
  let text = String(value || '');
  if (!text) return '';
  if (!rawTitle) return normalizeBrandText(text);

  const safeCleanTitle = cleanTitle || rawTitle;
  text = text.split(rawTitle).join(safeCleanTitle);
  if (safeCleanTitle && safeCleanTitle !== rawTitle) {
    const escapedTitle = safeCleanTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pollutedTitlePattern = new RegExp(
      `${escapedTitle}(?:\\s*\\(\\d{4}\\))?\\s+(?:Sinhala\\s+and\\s+English|Sinhala\\s+Subtit(?:iles|les)|සිංහල\\s+උපසිරැසි)`,
      'giu'
    );
    text = text.replace(pollutedTitlePattern, safeCleanTitle);
  }

  return normalizeBrandText(text);
}
