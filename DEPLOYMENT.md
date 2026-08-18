# KSubZone deployment

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
BACKEND_URL=https://www.ksubzone.com
REVALIDATION_TOKEN=<a-long-random-secret>
```

`https://www.ksubzone.com` above is the current shared-hosting backend. Replace it
with the actual backend origin if it is different. Do not add
`NEXT_PUBLIC_BACKEND_URL` in Vercel: leaving it unset makes browser requests use
same-origin `/api` and lets the Next.js rewrite proxy them safely to the backend.

After the first deployment, Vercel's connected Git integration automatically
creates a production deployment for each push to `main`. Other branches receive
preview deployments.

## Shared-hosting PHP backend

Keep the backend `.env` on the server only. Add:

```text
NODE_ENV=production
NEXT_JS_URL=https://ksubzone-com.vercel.app
REVALIDATION_TOKEN=<the-exact-same-random-secret-used-in-vercel>
```

Replace `NEXT_JS_URL` with the real production URL shown after the first Vercel
deployment. If more direct browser origins must access PHP, add them as a
comma-separated list:

```text
CORS_ALLOWED_ORIGINS=https://ksubzone-com.vercel.app,https://www.ksubzone.com
```

The Vercel proxy means preview deployments do not need to be listed in CORS.

## Custom domain layout

One hostname cannot point to both Vercel and shared hosting. Before assigning
`www.ksubzone.com` to Vercel, move the PHP backend to a shared-hosting subdomain,
for example `api.ksubzone.com`, and then change Vercel's `BACKEND_URL` to:

```text
https://api.ksubzone.com
```

Set the backend `NEXT_JS_URL` to the final frontend origin, such as
`https://www.ksubzone.com`, then redeploy the frontend once.
