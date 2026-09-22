import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getR2Client, getR2Config } from './client';

export interface R2UploadParams {
  body: Buffer | Uint8Array | Blob | string;
  objectKey: string;
  contentType?: string;
  filename?: string;
  size?: number;
  sha256?: string;
}

export interface R2UploadResult {
  provider: 'r2';
  bucket: string;
  objectKey: string;
  url: string;
  sizeBytes: number;
  checksum: string | null;
  mimeType: string;
  originalFilename: string | null;
}

export async function uploadToR2(params: R2UploadParams): Promise<R2UploadResult> {
  const config = getR2Config();
  const s3 = getR2Client();
  const safeFilename = (params.filename || 'subtitle.srt').replace(/[^a-zA-Z0-9._-]/g, '_');
  const contentType = params.contentType || 'application/x-subrip; charset=utf-8';

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: params.objectKey,
    Body: params.body as any,
    ContentType: contentType,
    ContentDisposition: `attachment; filename="${safeFilename}"`,
    CacheControl: 'public, max-age=31536000, immutable',
    Metadata: {
      ...(params.sha256 ? { 'sha256-checksum': params.sha256 } : {}),
      'original-filename': encodeURIComponent(params.filename || ''),
    },
  });

  await s3.send(command);

  const cleanKey = params.objectKey
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return {
    provider: 'r2',
    bucket: config.bucketName,
    objectKey: params.objectKey,
    url: `${config.publicBaseUrl}/${cleanKey}`,
    sizeBytes: params.size || (Buffer.isBuffer(params.body) ? params.body.length : 0),
    checksum: params.sha256 || null,
    mimeType: contentType,
    originalFilename: params.filename || null,
  };
}
