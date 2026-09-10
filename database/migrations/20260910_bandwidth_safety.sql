-- KSubZone bandwidth-safety migration (review and apply manually).
-- This migration is additive and does not delete or rewrite existing records.
-- The application stores subtitle metadata in the JSONB `data` column.

create index if not exists idx_subtitles_storage_provider
  on "subtitles" ((data->>'storageProvider'));
create index if not exists idx_subtitles_file_checksum
  on "subtitles" ((data->>'fileChecksum'));
create index if not exists idx_subtitles_media_language_checksum
  on "subtitles" ((data->>'mediaId'), (data->>'language'), (data->>'fileChecksum'));
create index if not exists idx_movies_public_activity
  on "movies" ((data->>'status'), (data->>'contentUpdatedAt'), (data->>'createdAt'));
create index if not exists idx_dramas_public_activity
  on "dramas" ((data->>'status'), (data->>'contentUpdatedAt'), (data->>'createdAt'));

-- Atomic counter helper. Execution is restricted to the backend database role;
-- the public API does not expose this function through a browser Supabase client.
create or replace function public.increment_subtitle_download_count(target_id text)
returns integer
language sql
security invoker
set search_path = public
as $$
  update "subtitles"
     set data = jsonb_set(
       jsonb_set(data, '{downloads}', to_jsonb(coalesce((data->>'downloads')::integer, 0) + 1), true),
       '{lastDownloadedAt}', to_jsonb(to_char(now(), 'YYYY-MM-DD HH24:MI:SS')), true
     ),
     "updatedAt" = to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
   where "_id" = target_id
  returning (data->>'downloads')::integer;
$$;

revoke all on function public.increment_subtitle_download_count(text) from public;
revoke all on function public.increment_subtitle_download_count(text) from anon;
revoke all on function public.increment_subtitle_download_count(text) from authenticated;
