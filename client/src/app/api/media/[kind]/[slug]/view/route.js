import { proxyViewTracking } from '@/lib/server/viewTrackingProxy';

export const dynamic = 'force-dynamic';

export function POST(request, { params }) {
  if (!['dramas', 'movies'].includes(params.kind)) {
    return Response.json({ message: 'Unknown media type' }, { status: 404 });
  }
  return proxyViewTracking(request, `/api/media/${params.kind}/${encodeURIComponent(params.slug)}/view`);
}
