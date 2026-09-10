import 'server-only';
import { S3Client } from '@aws-sdk/client-s3';

/**
 * Validates required R2 server environment variables.
 * Throws a clear error if R2 is configured as the active provider but missing credentials.
 */
export function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID || '';
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || '';
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
  const bucketName = process.env.R2_BUCKET_NAME || 'ksubzone-subtitles';
  const publicBaseUrl = (process.env.R2_PUBLIC_BASE_URL || 'https://files.ksubzone.com').replace(/\/+$/, '');
  const endpoint = process.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');
  const provider = (process.env.SUBTITLE_STORAGE_PROVIDER || 'r2').toLowerCase();

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicBaseUrl,
    endpoint,
    provider,
    isConfigured: Boolean(accessKeyId && secretAccessKey && (endpoint || accountId)),
  };
}

let cachedS3Client = null;

/**
 * Returns a singleton S3Client configured for Cloudflare R2.
 */
export function getR2Client() {
  if (cachedS3Client) {
    return cachedS3Client;
  }

  const config = getR2Config();
  if (!config.isConfigured) {
    throw new Error(
      'Cloudflare R2 is not fully configured. Please ensure R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_ACCOUNT_ID (or R2_ENDPOINT) are set in your server environment.'
    );
  }

  cachedS3Client = new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return cachedS3Client;
}

export const r2Client = {
  get client() {
    return getR2Client();
  },
};
