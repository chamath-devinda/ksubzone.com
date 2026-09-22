import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getR2Client, getR2Config } from './client';

/**
 * Safely removes an object from Cloudflare R2 (e.g. for rollback on failed transactions).
 */
export async function deleteFromR2(objectKey: string): Promise<void> {
  if (!objectKey) return;
  const config = getR2Config();
  const s3 = getR2Client();

  const command = new DeleteObjectCommand({
    Bucket: config.bucketName,
    Key: objectKey,
  });

  await s3.send(command);
}
