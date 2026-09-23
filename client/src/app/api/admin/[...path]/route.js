import { proxyAdminRequest } from '@/lib/server/adminAuthProxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Keep every authenticated admin request on the frontend origin. This avoids
// CDN rewrite/header loss after refresh while the static login/session routes
// remain the dedicated credential-safe entry points.
const forward = (request, { params }) => proxyAdminRequest(request, params.path);

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
export const OPTIONS = forward;
