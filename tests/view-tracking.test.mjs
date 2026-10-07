import test from 'node:test';
import assert from 'node:assert/strict';
import { proxyViewTracking } from '../client/src/lib/server/viewTrackingProxy.js';
import { getVisitorId } from '../client/src/utils/visitorId.js';

const visitor = 'v1_0123456789abcdef0123456789abcdef';
const path = '/api/media/dramas/example/view';
const request = (headers = {}) => new Request(`https://www.ksubzone.com${path}`, {
  method: 'POST',
  headers: { 'User-Agent': 'Mozilla/5.0', 'X-KSubZone-Visitor-Id': visitor, ...headers },
});

test('browser tracking uses server transport while preserving daily browser identity', async (t) => {
  let received;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    received = { url, options };
    return Response.json({ viewCount: 42, counted: true });
  });
  const response = await proxyViewTracking(request({ Cookie: 'private-session', Authorization: 'private-token' }), path);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { viewCount: 42, counted: true });
  assert.ok(received.url.endsWith(path));
  assert.equal(received.options.method, 'POST');
  assert.equal(received.options.cache, 'no-store');
  assert.equal(received.options.headers.get('user-agent'), 'KSubZone-Frontend');
  assert.equal(received.options.headers.get('x-ksubzone-visitor-id'), visitor);
  assert.equal(received.options.headers.get('authorization'), null);
  assert.equal(received.options.headers.get('cookie'), null);
  assert.match(response.headers.get('cache-control'), /no-store/);
});

test('a repeated visitor returns the database count without fabricating an increment', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ viewCount: 42, counted: false }));
  assert.deepEqual(await (await proxyViewTracking(request(), path)).json(), { viewCount: 42, counted: false });
});

test('bots and server renders never reach the write endpoint', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', () => { throw new Error('Must not fetch'); });
  for (const headers of [{ 'User-Agent': 'Googlebot' }, { 'User-Agent': 'curl/8.0' }, { 'X-KSubZone-Render': 'server' }, { 'User-Agent': '' }]) {
    assert.deepEqual(await (await proxyViewTracking(request(headers), path)).json(), { counted: false });
  }
  assert.equal(fetch.mock.callCount(), 0);
});

test('cross-origin calls, missing identity and non-counter paths cannot write', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', () => { throw new Error('Must not fetch'); });
  assert.equal((await proxyViewTracking(request({ Origin: 'https://other.example' }), path)).status, 403);
  assert.equal((await proxyViewTracking(request({ 'X-KSubZone-Visitor-Id': '' }), path)).status, 400);
  assert.equal((await proxyViewTracking(request(), '/api/admin/users')).status, 404);
  assert.equal(fetch.mock.callCount(), 0);
});

test('site traffic uses the same uncached transport and preserves upstream failures', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ message: 'Rate limited' }, { status: 429, headers: { 'Retry-After': '60' } }));
  const response = await proxyViewTracking(request(), '/api/analytics/visit');
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('retry-after'), '60');
});

test('hosting HTML rejection becomes a retryable JSON failure', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('<html>Forbidden</html>', { status: 403, headers: { 'Content-Type': 'text/html' } }));
  const response = await proxyViewTracking(request(), path);
  assert.equal(response.status, 502);
  assert.equal((await response.json()).viewCount, undefined);
});

test('storage-disabled visitors retain the same nonce for all page requests', () => {
  assert.equal(getVisitorId(), '');
  globalThis.window = {
    crypto: globalThis.crypto,
    localStorage: { getItem() { throw new Error('Storage disabled'); } },
  };
  try {
    const first = getVisitorId();
    assert.match(first, /^v1_[a-f0-9]{32}$/);
    assert.equal(getVisitorId(), first);
  } finally {
    delete globalThis.window;
  }
});
