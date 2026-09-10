# KSubZone bandwidth audit and implementation notes

Audit date: 2026-09-10

## Architecture found

- Next.js 14.2.3 frontend in `client/`.
- PHP API in `server-php/`, using a unified MongoDB/SQLite/MySQL/PostgreSQL adapter.
- Production configuration supports PostgreSQL/Supabase through `DATABASE_URL`; the browser does not create a Supabase client.
- Public pages use server `fetch` plus TanStack Query hydration. Authenticated/admin mutations use the browser API client.
- A file/Redis cache already exists in `server-php/utils/Cache.php`.

## Main findings

1. `/api/media/home` loaded up to 200 drama rows so PHP could sort “latest” again. This was the largest avoidable database read and serialized-payload risk.
2. Public catalog `limit` values were trusted from query strings, so sitemap/search callers could request hundreds or thousands of rows.
3. The homepage had already removed the normal SSR duplicate catalog fetch, but interactive sort/country changes still correctly fetch a new page.
4. Public API responses had basic `Cache-Control`, but no explicit `CDN-Cache-Control` or `Vercel-CDN-Cache-Control` headers.
5. Subtitle downloads still proxy remote Supabase files through PHP when no local copy exists, so existing Supabase objects remain the main Storage-egress risk until migrated.

## Changes made

- Homepage query budgets are now bounded: latest 10, trending 10, upcoming 6, historical 6, and the catalog endpoint is capped at 24 per page.
- Drama/movie APIs return `pageSize` and enforce `page >= 1` and `1 <= limit <= 24` before querying.
- SSR catalog pages request 12 cards, matching the client page size.
- Public API responses now emit CDN cache headers in addition to browser cache headers.
- New subtitle uploads can use R2 Standard when `SUBTITLE_STORAGE_PROVIDER=r2` and all server-only R2 variables are configured; otherwise existing Supabase/local fallback behavior remains.
- Subtitle metadata records now retain provider, bucket, object key, size, checksum, MIME type, and upload time when available.
- Exact duplicate subtitle content for the same media/language is rejected before storage/database writes.
- Added an additive migration with JSONB indexes and a restricted atomic-counter helper.

## Measurement status

Live production payload sizes and request counts require access to the deployed API/hosting response headers and are not fabricated here. Run the following against a production-like deployment after the changes:

```powershell
curl.exe -sS -D - -o NUL https://www.ksubzone.com/
curl.exe -sS -D - -o NUL "https://www.ksubzone.com/api/media/home"
curl.exe -sS -D - -o NUL "https://www.ksubzone.com/api/media/dramas?page=1&limit=12"
```

Use the response `Content-Length`, `Cache-Control`, `CDN-Cache-Control`, and `Vercel-CDN-Cache-Control` values. The PHP cache is server-side and the Next SSR requests use 30-minute tags/revalidation for public home/catalog content.

## Required server variables for R2

`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_BASE_URL`, `R2_ENDPOINT`, and `SUBTITLE_STORAGE_PROVIDER=r2`. Never prefix secrets with `NEXT_PUBLIC_`.

R2 must have a public custom-domain/base URL for direct downloads and an S3-compatible API token scoped to the subtitle bucket. Existing Supabase URLs are never rewritten or deleted.

## Manual approval gates

1. Review and apply `database/migrations/20260910_bandwidth_safety.sql` to the production database.
2. Configure R2 Standard and its public custom domain.
3. Set the server-only environment variables and deploy.
4. Test one non-production subtitle upload/download.
5. Migrate existing files only in small, dry-run-first batches after the Supabase quota resets.
