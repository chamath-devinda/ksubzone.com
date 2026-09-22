import { uploadToR2, type R2UploadResult } from './upload';

export interface ReplaceSubtitleFileOptions {
  body: Buffer | Uint8Array | Blob | string;
  filename: string;
  existingSubtitleId: string;
  mediaSlug?: string;
  language?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  sha256?: string;
  size?: number;
}

export function generateSubtitleObjectKey(params: {
  mediaSlug: string;
  language: string;
  seasonNumber?: number;
  episodeNumber?: number;
  format: string;
  uniqueSuffix?: string;
}): string {
  const cleanSlug = (params.mediaSlug || 'media').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const lang = (params.language || 'si').toLowerCase().startsWith('sin') ? 'si' : 'en';
  const format = (params.format || 'srt').toLowerCase().replace(/^\./, '');
  const timestamp = Date.now();
  const suffix = params.uniqueSuffix || Math.random().toString(36).substring(2, 7);

  if (params.episodeNumber !== undefined && params.episodeNumber !== null) {
    const sNum = String(params.seasonNumber || 1).padStart(2, '0');
    const eNum = String(params.episodeNumber).padStart(2, '0');
    return `dramas/${cleanSlug}/s${sNum}e${eNum}-${lang}-${timestamp}-${suffix}.${format}`;
  }

  return `movies/${cleanSlug}/${cleanSlug}-${lang}-${timestamp}-${suffix}.${format}`;
}

export async function replaceSubtitleFileInR2(options: ReplaceSubtitleFileOptions): Promise<R2UploadResult> {
  const ext = (options.filename.split('.').pop() || 'srt').toLowerCase();
  const format = ['srt', 'vtt', 'ass'].includes(ext) ? ext : 'srt';

  const objectKey = generateSubtitleObjectKey({
    mediaSlug: options.mediaSlug || 'subtitle',
    language: options.language || 'Sinhala',
    seasonNumber: options.seasonNumber,
    episodeNumber: options.episodeNumber,
    format,
  });

  return await uploadToR2({
    body: options.body,
    objectKey,
    filename: options.filename,
    contentType: format === 'vtt' ? 'text/vtt; charset=utf-8' : 'application/x-subrip; charset=utf-8',
    size: options.size,
    sha256: options.sha256,
  });
}
