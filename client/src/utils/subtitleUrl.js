/**
 * Shared resolver for subtitle download URLs.
 * Directs R2 files to files.ksubzone.com without proxying through Vercel or PHP.
 * Supports legacy Supabase links without breaking existing URLs.
 */

const R2_PUBLIC_BASE = (
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_R2_PUBLIC_BASE_URL) ||
  'https://files.ksubzone.com'
).replace(/\/+$/, '');

/**
 * Checks if a subtitle is stored on Cloudflare R2
 * @param {Object} subtitle
 * @returns {boolean}
 */
export function isR2Subtitle(subtitle) {
  if (!subtitle) return false;
  const provider = (subtitle.storageProvider || subtitle.storage_provider || '').toLowerCase();
  if (provider === 'r2') return true;
  const url = subtitle.fileUrl || subtitle.file_url || '';
  return url.startsWith('https://files.ksubzone.com') || url.includes('.r2.cloudflarestorage.com');
}

/**
 * Resolves the direct download URL for a subtitle object.
 * @param {Object} subtitle Subtitle record
 * @returns {string} Public URL
 */
export function resolveSubtitleDownloadUrl(subtitle) {
  if (!subtitle) return '';

  const provider = (subtitle.storageProvider || subtitle.storage_provider || '').toLowerCase();
  const objectKey = subtitle.storageObjectKey || subtitle.storage_object_key;

  // 1. If stored on R2 with object key, construct direct custom domain URL
  if (provider === 'r2' && objectKey) {
    const encodedKey = objectKey
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    return `${R2_PUBLIC_BASE}/${encodedKey}`;
  }

  // 2. If fileUrl already points to R2 public domain
  const rawUrl = subtitle.fileUrl || subtitle.file_url || '';
  if (rawUrl && (rawUrl.startsWith('https://files.ksubzone.com') || rawUrl.includes('.r2.cloudflarestorage.com'))) {
    return rawUrl;
  }

  // 3. Fallback to existing Supabase URL or local URL
  if (rawUrl) {
    return rawUrl;
  }

  // 4. Default to same-origin download route if only ID is known
  const subId = subtitle._id || subtitle.id;
  return subId ? `/api/subtitles/${subId}/download` : '';
}

/**
 * Computes a sanitized, safe filename for subtitle downloads.
 * @param {Object} subtitle
 * @param {string} [customName]
 * @returns {string}
 */
export function getSafeSubtitleFilename(subtitle, customName) {
  const format = (subtitle?.format || 'srt').toLowerCase();
  if (customName) {
    const clean = customName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return clean.endsWith(`.${format}`) ? clean : `${clean}.${format}`;
  }

  if (subtitle?.originalFilename) {
    return subtitle.originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  const id = subtitle?._id || subtitle?.id || 'subtitle';
  return `subtitle-${id}.${format}`;
}
