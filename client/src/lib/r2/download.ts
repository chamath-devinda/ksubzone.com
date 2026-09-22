import { getR2Config } from './client';

export interface SubtitleRecordLike {
  _id?: string;
  storageProvider?: string;
  storage_provider?: string;
  storageObjectKey?: string;
  storage_object_key?: string;
  fileUrl?: string;
  file_url?: string;
  fileName?: string;
}

/**
 * Resolves the public CDN download URL for a subtitle object stored in Cloudflare R2
 * without proxying through application server egress.
 */
export function resolveR2DownloadUrl(subtitle: SubtitleRecordLike): string {
  if (!subtitle) return '';

  const config = getR2Config();
  const provider = (subtitle.storageProvider || subtitle.storage_provider || '').toLowerCase();
  const objectKey = subtitle.storageObjectKey || subtitle.storage_object_key;

  if (provider === 'r2' && objectKey) {
    const encodedKey = objectKey
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    return `${config.publicBaseUrl}/${encodedKey}`;
  }

  const rawUrl = subtitle.fileUrl || subtitle.file_url || '';
  if (rawUrl && (rawUrl.startsWith('https://files.ksubzone.com') || rawUrl.includes('.r2.cloudflarestorage.com'))) {
    return rawUrl;
  }

  return rawUrl;
}
