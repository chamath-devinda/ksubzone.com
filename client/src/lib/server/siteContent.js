import 'server-only';

import { unstable_cache } from 'next/cache';
import { fetchBackendJson } from './backend';

// Site settings are optional during a deployment build. Cache the result of
// this bounded request so a slow origin cannot stall once for every static
// route that shares the root layout.
export const getServerSiteContent = unstable_cache(
  async () => fetchBackendJson('/api/site-content', {
    revalidate: 1800,
    tags: ['site-content'],
    attempts: 1,
    timeoutMs: 2_000,
    fallback: null,
  }),
  ['server-site-content'],
  { revalidate: 1800, tags: ['site-content'] },
);
