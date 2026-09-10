-- ================================================================
-- KSubZone Cloudflare R2 Subtitle Migration
-- Safe, additive, backward-compatible migration for Supabase PostgreSQL.
-- Does NOT delete, truncate, or overwrite existing records.
-- ================================================================

-- 1. Create performance indexes on storage provider and object key
CREATE INDEX IF NOT EXISTS idx_subtitles_storage_provider
  ON "subtitles" ((data->>'storageProvider'));

CREATE INDEX IF NOT EXISTS idx_subtitles_storage_object_key
  ON "subtitles" ((data->>'storageObjectKey'));

CREATE INDEX IF NOT EXISTS idx_subtitles_storage_provider_object_key
  ON "subtitles" ((data->>'storageProvider'), (data->>'storageObjectKey'));

-- 2. Add validation constraint for storage provider (allowing NULL for legacy Supabase records)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_subtitles_storage_provider'
  ) THEN
    ALTER TABLE "subtitles"
      ADD CONSTRAINT chk_subtitles_storage_provider
      CHECK (
        (data->>'storageProvider') IS NULL OR
        (data->>'storageProvider') IN ('r2', 'supabase', 'local')
      );
  END IF;
END $$;

-- 3. Create or replace a convenient read view mapping JSONB properties to relational columns
-- Notice: legacy records with NULL or missing storageProvider automatically resolve to 'supabase'.
CREATE OR REPLACE VIEW public.vw_subtitles_storage AS
SELECT
  "_id",
  (data->>'mediaId') AS media_id,
  (data->>'mediaType') AS media_type,
  (data->>'language') AS language,
  (data->>'version') AS version,
  COALESCE(NULLIF(data->>'storageProvider', ''), 'supabase') AS storage_provider,
  (data->>'storageBucket') AS storage_bucket,
  (data->>'storageObjectKey') AS storage_object_key,
  (data->>'fileUrl') AS file_url,
  (data->>'originalFilename') AS original_filename,
  (data->>'storedFilename') AS stored_filename,
  (data->>'fileSizeBytes')::bigint AS file_size_bytes,
  (data->>'fileChecksum') AS file_checksum,
  (data->>'mimeType') AS mime_type,
  (data->>'format') AS format,
  COALESCE((data->>'downloads')::integer, 0) AS downloads,
  (data->>'approvalStatus') AS approval_status,
  (data->>'uploadedAt') AS uploaded_at,
  "createdAt" AS created_at,
  "updatedAt" AS updated_at
FROM "subtitles";

-- 4. Re-verify atomic download counter function (idempotent)
CREATE OR REPLACE FUNCTION public.increment_subtitle_download_count(target_id text)
RETURNS integer
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  UPDATE "subtitles"
     SET data = jsonb_set(
       jsonb_set(data, '{downloads}', to_jsonb(coalesce((data->>'downloads')::integer, 0) + 1), true),
       '{lastDownloadedAt}', to_jsonb(to_char(now(), 'YYYY-MM-DD HH24:MI:SS')), true
     ),
     "updatedAt" = to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
   WHERE "_id" = target_id
  RETURNING (data->>'downloads')::integer;
$$;

REVOKE ALL ON FUNCTION public.increment_subtitle_download_count(text) FROM public;
REVOKE ALL ON FUNCTION public.increment_subtitle_download_count(text) FROM anon;
REVOKE ALL ON FUNCTION public.increment_subtitle_download_count(text) FROM authenticated;

-- ================================================================
-- FOR MYSQL / CPANEL COMPATIBILITY (if running MySQL driver):
-- ALTER TABLE subtitles
--   ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(30) DEFAULT 'supabase',
--   ADD COLUMN IF NOT EXISTS storage_bucket VARCHAR(100) NULL,
--   ADD COLUMN IF NOT EXISTS storage_object_key VARCHAR(255) NULL,
--   ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255) NULL,
--   ADD COLUMN IF NOT EXISTS stored_filename VARCHAR(255) NULL,
--   ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT NULL,
--   ADD COLUMN IF NOT EXISTS file_checksum VARCHAR(64) NULL,
--   ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100) NULL,
--   ADD COLUMN IF NOT EXISTS uploaded_at DATETIME NULL;
-- ================================================================
