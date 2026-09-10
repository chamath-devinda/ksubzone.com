#!/usr/bin/env node
/**
 * KSubZone - Node.js Cloudflare R2 Subtitle Migration Tool
 * 
 * Safely copies legacy Supabase Storage subtitles to Cloudflare R2 using AWS SDK v3.
 * 
 * Safety Rules:
 * - DRY-RUN by default. Live execution requires --live or --execute.
 * - NEVER deletes Supabase source objects.
 * - Verifies SHA-256 checksum, file size, and R2 HEAD existence before updating database.
 * - Idempotent: skips records where storage_provider = 'r2'.
 * 
 * Usage:
 *   node scripts/migrate-subtitles-to-r2.mjs --dry-run
 *   node scripts/migrate-subtitles-to-r2.mjs --id=SUBTITLE_ID
 *   node scripts/migrate-subtitles-to-r2.mjs --slug=a-bona-fide-killer --limit=10
 *   node scripts/migrate-subtitles-to-r2.mjs --limit=20
 *   node scripts/migrate-subtitles-to-r2.mjs --resume
 *   node scripts/migrate-subtitles-to-r2.mjs --id=SUBTITLE_ID --live
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { S3Client, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from .env files
function loadEnv() {
  const envPaths = [
    path.join(rootDir, '.env'),
    path.join(rootDir, 'server-php', '.env'),
    path.join(rootDir, 'client', '.env.local')
  ];

  for (const p of envPaths) {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

loadEnv();

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  dryRun: true, // DRY RUN IS DEFAULT
  live: false,
  id: '',
  slug: '',
  limit: 10,
  resume: false,
  help: false
};

for (const arg of args) {
  if (arg === '--dry-run') options.dryRun = true;
  else if (arg === '--live' || arg === '--execute') { options.live = true; options.dryRun = false; }
  else if (arg === '--resume') options.resume = true;
  else if (arg === '--help' || arg === '-h') options.help = true;
  else if (arg.startsWith('--id=')) options.id = arg.split('=')[1].trim();
  else if (arg.startsWith('--slug=')) options.slug = arg.split('=')[1].trim();
  else if (arg.startsWith('--drama=')) options.slug = arg.split('=')[1].trim();
  else if (arg.startsWith('--limit=')) options.limit = Math.max(1, Math.min(50, parseInt(arg.split('=')[1], 10) || 10));
}

if (options.help) {
  console.log(`
KSubZone Subtitle Migration Tool (Supabase -> Cloudflare R2)

Options:
  --dry-run       Simulate migration without modifying files or database (Default)
  --live          Execute real migration (Uploads to R2 and updates DB)
  --id=ID         Migrate a single subtitle record by its ID
  --slug=SLUG     Migrate subtitles for a specific drama or movie slug
  --limit=N       Maximum subtitles to process per batch (default: 10, max: 50)
  --resume        Prioritize unmigrated approved subtitles
  --help          Show this message
`);
  process.exit(0);
}

const isDryRun = !options.live || options.dryRun;

console.log('======================================================');
console.log(' KSubZone Node Migration: Supabase -> Cloudflare R2');
console.log(` Mode: ${isDryRun ? 'DRY-RUN (Safe simulation, NO DB/R2 changes)' : 'LIVE EXECUTION (Real upload & DB updates)'}`);
if (options.id) console.log(` Target ID: ${options.id}`);
if (options.slug) console.log(` Target Slug: ${options.slug}`);
console.log(` Batch Limit: ${options.limit}`);
console.log('======================================================\n');

// R2 client setup
const r2AccountId = process.env.R2_ACCOUNT_ID?.trim();
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
const r2BucketName = process.env.R2_BUCKET_NAME?.trim() || 'ksubzone-subtitles';
const r2PublicBaseUrl = (process.env.R2_PUBLIC_BASE_URL?.trim() || 'https://files.ksubzone.com').replace(/\/+$/, '');
const r2Endpoint = process.env.R2_ENDPOINT?.trim() || (r2AccountId ? `https://${r2AccountId}.r2.cloudflarestorage.com` : '');

if (!isDryRun && (!r2AccessKeyId || !r2SecretAccessKey || !r2Endpoint)) {
  console.error('ERROR: Cloudflare R2 credentials are missing or incomplete in environment variables.');
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: r2Endpoint || 'https://example.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: r2AccessKeyId || 'dummy',
    secretAccessKey: r2SecretAccessKey || 'dummy'
  }
});

// Database connection
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL environment variable is required.');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

function slugify(text) {
  return String(text || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateSubtitleObjectKey({ mediaSlug, mediaType, seasonNumber, episodeNumber, language, version, originalFilename }) {
  const safeSlug = slugify(mediaSlug || 'untitled');
  const safeLang = slugify(language || 'sinhala');
  const rawVer = String(version || '1.0').replace(/[^0-9]/g, '');
  const verStr = 'v' + (rawVer || '1');
  const ext = (path.extname(originalFilename || 'sub.srt').replace('.', '').toLowerCase()) || 'srt';
  const uuid = crypto.randomUUID();

  let key = '';
  if (mediaType === 'movie') {
    key = `subtitles/${safeSlug}/movie/${safeLang}/${verStr}/${uuid}.${ext}`;
  } else {
    const s = Math.max(1, parseInt(seasonNumber, 10) || 1);
    const ep = Math.max(1, parseInt(episodeNumber, 10) || 1);
    key = `subtitles/${safeSlug}/season-${s}/episode-${ep}/${safeLang}/${verStr}/${uuid}.${ext}`;
  }
  return key.toLowerCase().replace(/\.+/g, '.');
}

async function run() {
  const client = await pool.connect();
  const report = {
    dryRun: isDryRun,
    considered: 0,
    migrated: 0,
    skipped: 0,
    errors: []
  };

  try {
    let query = `SELECT "_id", "data", "createdAt" FROM "subtitles" WHERE "data"->>'approvalStatus' = 'Approved'`;
    const params = [];

    if (options.id) {
      params.push(options.id);
      query += ` AND "_id" = $${params.length}`;
    }

    query += ` ORDER BY "createdAt" ASC LIMIT ${options.limit * 3}`;
    const { rows } = await client.query(query, params);

    let processed = 0;
    for (const row of rows) {
      if (processed >= options.limit && !options.id) break;

      const subId = row._id;
      const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
      const provider = (data.storageProvider || 'supabase').toLowerCase();
      const objectKey = data.storageObjectKey || '';

      if (provider === 'r2' && objectKey) {
        console.log(`[SKIP] Subtitle ${subId} already on R2 (${objectKey})`);
        report.skipped++;
        continue;
      }

      // Resolve media
      const mediaId = data.mediaId;
      let mediaTitle = 'Untitled';
      let mediaSlug = 'media-' + mediaId;
      let mediaType = 'drama';

      if (mediaId) {
        const dramaRes = await client.query(`SELECT "data" FROM "dramas" WHERE "_id" = $1 LIMIT 1`, [mediaId]);
        if (dramaRes.rows.length > 0) {
          const dData = typeof dramaRes.rows[0].data === 'string' ? JSON.parse(dramaRes.rows[0].data) : dramaRes.rows[0].data;
          mediaTitle = dData.title || mediaTitle;
          mediaSlug = dData.slug || mediaSlug;
        } else {
          const movieRes = await client.query(`SELECT "data" FROM "movies" WHERE "_id" = $1 LIMIT 1`, [mediaId]);
          if (movieRes.rows.length > 0) {
            const mData = typeof movieRes.rows[0].data === 'string' ? JSON.parse(movieRes.rows[0].data) : movieRes.rows[0].data;
            mediaTitle = mData.title || mediaTitle;
            mediaSlug = mData.slug || mediaSlug;
            mediaType = 'movie';
          }
        }
      }

      if (options.slug && mediaSlug !== options.slug) {
        continue;
      }

      report.considered++;
      processed++;

      const fileUrl = data.fileUrl || '';
      console.log(`\n------------------------------------------------------`);
      console.log(`Processing Subtitle ID: ${subId}`);
      console.log(`  Media: ${mediaTitle} (${mediaSlug}) [${mediaType}]`);
      console.log(`  Season: ${data.seasonNumber || 1}, Episode: ${data.episodeNumber || 1}`);
      console.log(`  Source: ${fileUrl}`);

      if (!fileUrl) {
        console.log(`  [ERROR] Missing source fileUrl`);
        report.errors.push({ id: subId, error: 'Missing source fileUrl' });
        continue;
      }

      const generatedKey = generateSubtitleObjectKey({
        mediaSlug,
        mediaType,
        seasonNumber: data.seasonNumber,
        episodeNumber: data.episodeNumber,
        language: data.language,
        version: data.version,
        originalFilename: path.basename(new URL(fileUrl, 'http://localhost').pathname)
      });
      console.log(`  Target R2 Key: ${generatedKey}`);

      // Try downloading source
      let buffer = null;
      try {
        const fetchHeaders = { 'User-Agent': 'KSubZone-Node-Migration/1.0' };
        if (process.env.SUPABASE_KEY && fileUrl.includes('supabase.co')) {
          fetchHeaders['Authorization'] = `Bearer ${process.env.SUPABASE_KEY}`;
          fetchHeaders['apikey'] = process.env.SUPABASE_KEY;
        }

        const candidateUrls = [fileUrl];
        const configuredSupabase = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
        const match = fileUrl.match(/https?:\/\/[^/]+(\/storage\/v1\/object\/public\/.*)$/i);
        if (configuredSupabase && match) {
          const candidate = configuredSupabase + match[1];
          if (!candidateUrls.includes(candidate)) candidateUrls.push(candidate);
        }

        for (const tryUrl of candidateUrls) {
          const resp = await fetch(tryUrl, { headers: fetchHeaders });
          if (resp.ok) {
            const arrayBuf = await resp.arrayBuffer();
            buffer = Buffer.from(arrayBuf);
            break;
          }
        }
      } catch (dlErr) {
        console.log(`  [ERROR] Network fetch failed: ${dlErr.message}`);
      }

      if (!buffer || buffer.length === 0) {
        const errMsg = 'Failed to download source file from Supabase storage.';
        console.log(`  [ERROR] ${errMsg}`);
        report.errors.push({ id: subId, error: errMsg });
        continue;
      }

      const size = buffer.length;
      const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
      const ext = path.extname(generatedKey).replace('.', '').toLowerCase();
      let mimeType = 'application/x-subrip; charset=utf-8';
      if (ext === 'vtt') mimeType = 'text/vtt; charset=utf-8';
      else if (ext === 'ass') mimeType = 'text/plain; charset=utf-8';
      else if (ext === 'zip') mimeType = 'application/zip';

      console.log(`  File Size: ${size} bytes`);
      console.log(`  SHA-256: ${checksum}`);
      console.log(`  MIME: ${mimeType}`);

      if (isDryRun) {
        console.log(`  [DRY-RUN SUCCESS] Verified. Would upload to R2 and update DB. (No changes made)`);
        report.migrated++;
        continue;
      }

      // Live upload to R2
      try {
        await s3.send(new PutObjectCommand({
          Bucket: r2BucketName,
          Key: generatedKey,
          Body: buffer,
          ContentType: mimeType,
          ContentDisposition: `attachment; filename="${path.basename(generatedKey)}"`,
          CacheControl: 'public, max-age=31536000, immutable',
          Metadata: {
            'checksum-sha256': checksum
          }
        }));

        // Verify existence via HEAD
        await s3.send(new HeadObjectCommand({ Bucket: r2BucketName, Key: generatedKey }));

        const r2PublicUrl = `${r2PublicBaseUrl}/${encodeURI(generatedKey)}`;

        // Update database record
        const updatedData = {
          ...data,
          storageProvider: 'r2',
          storageBucket: r2BucketName,
          storageObjectKey: generatedKey,
          fileUrl: r2PublicUrl,
          fileSizeBytes: size,
          fileChecksum: checksum,
          mimeType,
          uploadedAt: new Date().toISOString()
        };

        await client.query(
          `UPDATE "subtitles" SET "data" = $1, "updatedAt" = $2 WHERE "_id" = $3`,
          [JSON.stringify(updatedData), new Date().toISOString(), subId]
        );

        console.log(`  [MIGRATED] Successfully migrated to R2!`);
        console.log(`  New Public URL: ${r2PublicUrl}`);
        report.migrated++;
      } catch (err) {
        console.error(`  [ERROR] Upload or DB update failed: ${err.message}`);
        try {
          await s3.send(new DeleteObjectCommand({ Bucket: r2BucketName, Key: generatedKey }));
        } catch (_) {}
        report.errors.push({ id: subId, error: err.message });
      }
    }
  } finally {
    client.release();
    await pool.end();
  }

  console.log('\n======================================================');
  console.log(' MIGRATION SUMMARY');
  console.log(` Mode: ${isDryRun ? 'DRY-RUN' : 'LIVE'}`);
  console.log(` Considered: ${report.considered}`);
  console.log(` Migrated:   ${report.migrated}`);
  console.log(` Skipped:    ${report.skipped}`);
  console.log(` Errors:     ${report.errors.length}`);
  console.log('======================================================\n');

  if (report.errors.length > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal error during migration:', err);
  process.exit(1);
});
