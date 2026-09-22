import { S3Client } from '@aws-sdk/client-s3';

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicBaseUrl: string;
  endpoint: string;
  isConfigured: boolean;
}

export function getR2Config(): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID || '';
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || '';
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
  const bucketName = process.env.R2_BUCKET_NAME || 'ksubzone-subtitles';
  const publicBaseUrl = (process.env.R2_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL || 'https://files.ksubzone.com').replace(/\/+$/, '');
  const endpoint = process.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicBaseUrl,
    endpoint,
    isConfigured: Boolean(accessKeyId && secretAccessKey && (endpoint || accountId)),
  };
}

let cachedS3Client: S3Client | null = null;

export function getR2Client(): S3Client {
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
