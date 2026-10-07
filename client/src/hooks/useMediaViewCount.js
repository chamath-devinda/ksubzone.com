'use client';

import { useQuery } from '@tanstack/react-query';
import { getVisitorId } from '@/utils/visitorId';

export function useMediaViewCount(path, enabled, cachedCount) {
  const { data: liveCount } = useQuery({
    queryKey: ['mediaViewCount', path],
    enabled,
    queryFn: async () => {
      const response = await fetch(`${path}/view`, {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'X-KSubZone-Visitor-Id': getVisitorId() },
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`View tracking returned ${response.status}`);
      const result = await response.json();
      if (!Number.isFinite(result.viewCount)) throw new Error('Missing view count');
      return result.viewCount;
    },
    staleTime: 60_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 1,
  });
  // A slower cached detail response must never overwrite the counter result.
  return Math.max(Number(cachedCount) || 0, liveCount || 0);
}
