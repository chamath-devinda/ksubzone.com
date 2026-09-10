import 'server-only';
import { PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getR2Client, getR2Config } from './r2Client.js';

export class R2SubtitleStorageProvider {
  constructor() {
    this.config = getR2Config();
  }

  /**
   * Upload a subtitle file buffer or stream to Cloudflare R2
   * @param {Object} params
   * @param {Buffer|Uint8Array} params.body
   * @param {string} params.objectKey
   * @param {string} params.contentType
   * @param {string} [params.filename]
   * @param {number} [params.size]
   * @param {string} [params.sha256]
   */
  async upload({ body, objectKey, contentType, filename, size, sha256 }) {
    const s3 = getR2Client();
    const safeFilename = (filename || 'subtitle.srt').replace(/[^a-zA-Z0-9._-]/g, '_');

    const command = new PutObjectCommand({
      Bucket: this.config.bucketName,
      Key: objectKey,
      Body: body,
      ContentType: contentType || 'application/x-subrip; charset=utf-8',
      ContentDisposition: `attachment; filename="${safeFilename}"`,
      CacheControl: 'public, max-age=31536000, immutable',
      Metadata: {
        ...(sha256 ? { 'sha256-checksum': sha256 } : {}),
        'original-filename': encodeURIComponent(filename || ''),
      },
    });

    await s3.send(command);

    return {
      provider: 'r2',
      bucket: this.config.bucketName,
      objectKey,
      url: this.getPublicUrl(objectKey),
      sizeBytes: size || (Buffer.isBuffer(body) ? body.length : 0),
      checksum: sha256 || null,
      mimeType: contentType,
      originalFilename: filename || null,
    };
  }

  /**
   * Check if an object exists in R2 and verify its properties
   * @param {string} objectKey
   * @returns {Promise<boolean>}
   */
  async exists(objectKey) {
    const s3 = getR2Client();
    try {
      const command = new HeadObjectCommand({
        Bucket: this.config.bucketName,
        Key: objectKey,
      });
      const res = await s3.send(command);
      return Boolean(res.ContentLength !== undefined);
    } catch (err) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw err;
    }
  }

  /**
   * Safely delete a newly uploaded R2 object (used for transaction rollback)
   * @param {string} objectKey
   */
  async delete(objectKey) {
    if (!objectKey) return;
    const s3 = getR2Client();
    const command = new DeleteObjectCommand({
      Bucket: this.config.bucketName,
      Key: objectKey,
    });
    await s3.send(command);
  }

  /**
   * Resolves the direct public URL from custom domain
   * @param {string} objectKey
   * @returns {string}
   */
  getPublicUrl(objectKey) {
    const cleanKey = objectKey
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    return `${this.config.publicBaseUrl}/${cleanKey}`;
  }
}
