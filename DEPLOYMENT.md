# KSubZone deployment

## Subtitle storage recovery (2026-09-06)

The live health endpoint reported PostgreSQL working. The affected Episode 1
download returned HTTP 503 because its local subtitle could not be resolved.
The corresponding Supabase backup returned HTTP 402 with `exceed_egress_quota`.
Changing database credentials will not restore that file.

- Deploy the frontend changes and `controllers/SubtitleController.php` to the
  PHP backend. Browser API requests now use the same-origin Next.js rewrite.
- Restore `subtitles-1785677440-2909.srt` from a backup to the backend's
  `uploads/subtitles/` directory, or replace the subtitle through management.
  Alternatively, restore Supabase service through the owner's billing/quota
  controls; the updated backend can then recover the backup automatically.
- Preserve the backend `uploads/` directory across deployments. Remote source
  URLs are now retained when files are cached, so lost caches can be rebuilt.
- Verify the authenticated management drama list and Episode 1 download after
  deployment. The authenticated list returned all 54 dramas through both the
  direct API and frontend proxy during recovery verification.

The frontend production build alone does not deploy these changes or remove
the external storage restriction.

## Vercel frontend

Import `chamath-devinda/ksubzone.com` and use these values:

- Production branch: `main`
- Root Directory: `client`
- Framework Preset: `Next.js`
- Build Command: `npm run build` (the detected default)
- Output Directory: `.next` (the detected default)
- Install Command: `npm install` (the detected default)

Add these Vercel environment variables to both **Production** and **Preview**:

```text
BACKEND_URL=https://api.ksubzone.com
REVALIDATION_TOKEN=<a-long-random-secret>
```

`https://api.ksubzone.com` is the shared-hosting PHP origin; `www.ksubzone.com`
is reserved for the Vercel frontend. Do not add
`NEXT_PUBLIC_BACKEND_URL` in Vercel: leaving it unset makes browser requests use
same-origin `/api` and lets the Next.js rewrite proxy them safely to the backend.

After the first deployment, Vercel's connected Git integration automatically
creates a production deployment for each push to `main`. Other branches receive
preview deployments.

## Shared-hosting PHP backend

The `api.ksubzone.com` document root must be `public_html/api`. Extract the
backend archive so that `index.php`, `.htaccess`, `config/`, `controllers/`, and
the other backend folders are directly inside `public_html/api`.

Keep the backend `.env` on the server only. Add:

```text
NODE_ENV=production
NEXT_JS_URL=https://ksubzone-com.vercel.app
REVALIDATION_TOKEN=<the-exact-same-random-secret-used-in-vercel>
SUPABASE_URL=<your-supabase-project-url>
SUPABASE_KEY=<your-supabase-service-role-key>
SUPABASE_BUCKET=Ksubzone
```

The bucket name is case-sensitive. Keep `SUPABASE_BUCKET=Ksubzone` exactly as
shown; a lowercase value points at a different bucket and forces subtitle
uploads to fall back to the shared-hosting `uploads/` directory.

Replace `NEXT_JS_URL` with the real production URL shown after the first Vercel
deployment. If more direct browser origins must access PHP, add them as a
comma-separated list:

```text
CORS_ALLOWED_ORIGINS=https://ksubzone-com.vercel.app,https://www.ksubzone.com
```

The Vercel proxy means preview deployments do not need to be listed in CORS.

Bulk TMDB imports use the PHP CLI when the host allows background processes.
If cPanel installs the CLI at a nonstandard location, set its absolute path:

```text
PHP_CLI_BINARY=/opt/cpanel/ea-php83/root/usr/bin/php
```

When CLI/process execution is unavailable, the API safely falls back to a
small synchronous batch and leaves unprocessed titles selected for retry.

Before deploying the frontend, confirm that this URL returns JSON rather than a
hosting placeholder or HTML maintenance page:

```text
https://api.ksubzone.com/api/health
```

## Custom domain layout

One hostname cannot point to both Vercel and shared hosting. Keep the PHP
backend on `api.ksubzone.com` and use this Vercel value:

```text
https://api.ksubzone.com
```

Set the backend `NEXT_JS_URL` to the final frontend origin, such as
`https://www.ksubzone.com`, then redeploy the frontend once.
