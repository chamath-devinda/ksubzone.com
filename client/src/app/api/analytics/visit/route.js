import { proxyViewTracking } from '@/lib/server/viewTrackingProxy';

export const dynamic = 'force-dynamic';

export function POST(request) {
  return proxyViewTracking(request, '/api/analytics/visit');
}
