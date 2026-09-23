import { proxyAdminAuth } from '@/lib/server/adminAuthProxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  return proxyAdminAuth(request, 'session');
}
