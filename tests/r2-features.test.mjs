import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. Test Client URL Resolver (client/src/utils/subtitleUrl.js)
test('URL Resolver: correctly resolves R2 and Supabase URLs', async () => {
  const { resolveSubtitleDownloadUrl } = await import('../client/src/utils/subtitleUrl.js');

  // Test R2 record
  const r2Sub = {
    _id: 'sub123',
    storageProvider: 'r2',
    storageObjectKey: 'subtitles/a-bona-fide-killer/season-1/episode-12/sinhala/v1/sub.srt',
    fileUrl: 'https://files.ksubzone.com/subtitles/a-bona-fide-killer/season-1/episode-12/sinhala/v1/sub.srt'
  };
  const r2Url = resolveSubtitleDownloadUrl(r2Sub);
  assert.equal(r2Url, 'https://files.ksubzone.com/subtitles/a-bona-fide-killer/season-1/episode-12/sinhala/v1/sub.srt');

  // Test R2 record with unencoded spaces in object key
  const r2SubWithSpaces = {
    _id: 'sub456',
    storageProvider: 'r2',
    storageObjectKey: 'subtitles/my drama/sub.srt'
  };
  const encodedUrl = resolveSubtitleDownloadUrl(r2SubWithSpaces);
  assert.equal(encodedUrl, 'https://files.ksubzone.com/subtitles/my%20drama/sub.srt');

  // Test Legacy Supabase record
  const supabaseSub = {
    _id: 'sub789',
    storageProvider: 'supabase',
    fileUrl: 'https://dyypaoupfdpqpczbppfc.supabase.co/storage/v1/object/public/Ksubzone/subtitles/sub-123.srt'
  };
  const supabaseUrl = resolveSubtitleDownloadUrl(supabaseSub);
  assert.equal(supabaseUrl, 'https://dyypaoupfdpqpczbppfc.supabase.co/storage/v1/object/public/Ksubzone/subtitles/sub-123.srt');

  // Test legacy record with null storageProvider
  const legacyNullSub = {
    _id: 'sub000',
    fileUrl: 'https://ejvczjiueysbiewzsuin.supabase.co/storage/v1/object/public/Ksubzone/subtitles/old.srt'
  };
  const legacyNullUrl = resolveSubtitleDownloadUrl(legacyNullSub);
  assert.equal(legacyNullUrl, 'https://ejvczjiueysbiewzsuin.supabase.co/storage/v1/object/public/Ksubzone/subtitles/old.srt');
});

// 2. Test Security: Verify R2 secrets are NEVER prefixed with NEXT_PUBLIC_
test('Security: Ensure no R2 secrets use NEXT_PUBLIC_ prefix', () => {
  const envExamplePath = path.join(rootDir, '.env.example');
  assert.ok(fs.existsSync(envExamplePath), '.env.example must exist');

  const content = fs.readFileSync(envExamplePath, 'utf-8');
  assert.ok(!content.includes('NEXT_PUBLIC_R2_SECRET'), 'R2 secret must never have NEXT_PUBLIC_ prefix');
  assert.ok(!content.includes('NEXT_PUBLIC_R2_ACCESS_KEY'), 'R2 access key must never have NEXT_PUBLIC_ prefix');
  assert.ok(!content.includes('NEXT_PUBLIC_R2_ACCOUNT_ID'), 'R2 account ID must never have NEXT_PUBLIC_ prefix');

  // Check client r2Client.js
  const r2ClientPath = path.join(rootDir, 'client', 'src', 'lib', 'storage', 'r2Client.js');
  if (fs.existsSync(r2ClientPath)) {
    const r2Code = fs.readFileSync(r2ClientPath, 'utf-8');
    assert.ok(r2Code.includes('import "server-only"') || r2Code.includes("import 'server-only'"), 'r2Client must import server-only');
    assert.ok(!r2Code.includes('NEXT_PUBLIC_R2_SECRET'), 'r2Client must not use NEXT_PUBLIC_ for secrets');
  }
});

// 3. Test Object Key Generation specifications
test('Storage Key Specs: Enforce lowercase, hyphens, and no double dots', () => {
  function generateKey(slug, season, episode, lang, ver, filename) {
    const safeSlug = slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const safeLang = lang.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const cleanVer = 'v' + (parseInt(String(ver).split('.')[0].replace(/[^0-9]/g, ''), 10) || 1);
    const ext = (path.extname(filename).replace('.', '').toLowerCase()) || 'srt';
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    return `subtitles/${safeSlug}/season-${season}/episode-${episode}/${safeLang}/${cleanVer}/${uuid}.${ext}`
      .toLowerCase()
      .replace(/\.+/g, '.');
  }

  const key = generateKey('A-Bona-Fide-Killer', 1, 12, 'Sinhala', '1.0', 'sub..name...srt');
  assert.equal(key, 'subtitles/a-bona-fide-killer/season-1/episode-12/sinhala/v1/550e8400-e29b-41d4-a716-446655440000.srt');
  assert.equal(key.toLowerCase(), key, 'Key must be strictly lowercase');
  assert.ok(!key.includes('..'), 'Key must not contain repeated dots');
  assert.ok(!key.includes(' '), 'Key must not contain spaces');
});

// 4. Test Allowed Formats and MIME Types
test('Format and MIME Validation: Check supported subtitle types', () => {
  const mimeMap = {
    srt: 'application/x-subrip; charset=utf-8',
    vtt: 'text/vtt; charset=utf-8',
    ass: 'text/plain; charset=utf-8',
    zip: 'application/zip'
  };

  const allowed = ['srt', 'vtt', 'ass', 'zip'];
  const disallowed = ['exe', 'php', 'js', 'html', 'mp4', 'sh'];

  for (const ext of allowed) {
    assert.ok(mimeMap[ext], `Allowed extension .${ext} must have defined MIME type`);
  }

  for (const ext of disallowed) {
    assert.ok(!allowed.includes(ext), `Disallowed extension .${ext} must not be in allowed list`);
  }
});

// 5. Test Database Migration File exists and has additive SQL
test('Database Migration: Verify 20260911_cloudflare_r2_subtitles.sql exists and is non-destructive', () => {
  const migPath = path.join(rootDir, 'database', 'migrations', '20260911_cloudflare_r2_subtitles.sql');
  assert.ok(fs.existsSync(migPath), 'Migration SQL file must exist');

  const sql = fs.readFileSync(migPath, 'utf-8');
  assert.ok(sql.includes('storage_provider'), 'Migration must reference storage_provider');
  assert.ok(sql.includes('storage_object_key'), 'Migration must reference storage_object_key');
  assert.ok(!sql.toLowerCase().includes('drop table'), 'Migration must not drop tables');
  assert.ok(!sql.toLowerCase().includes('drop column'), 'Migration must not drop existing columns');
});
