import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSRT, decodeSubtitle } from '../client/src/utils/srt.mjs';
import fs from 'node:fs';

test('SRT preserves Sinhala text, timestamps and multiline content', () => {
  const text = '1\r\n00:00:01,000 --> 00:00:02,500\r\nආයුබෝවන්\r\nලෝකය';
  assert.deepEqual(parseSRT(text), [{ id: 1, start: '00:00:01,000', end: '00:00:02,500', text: 'ආයුබෝවන්\nලෝකය' }]);
});
test('SRT never silently drops malformed blocks', () => {
  assert.throws(() => parseSRT('1\n00:00:01,000 --> 00:00:02,000\nValid\n\n2\nbad timestamp\nLost text'), /block 2/);
  assert.throws(() => parseSRT('1\n00:00:03,000 --> 00:00:02,000\nWrong order'), /malformed/);
  assert.throws(() => parseSRT(''), /empty/);
});
test('UTF-8 and BOM UTF-16 preserve Sinhala; invalid bytes fail explicitly', () => {
  assert.equal(decodeSubtitle(new TextEncoder().encode('සිංහල').buffer), 'සිංහල');
  const utf16 = Buffer.concat([Buffer.from([255,254]), Buffer.from('සිංහල', 'utf16le')]);
  assert.equal(decodeSubtitle(utf16), 'සිංහල');
  assert.throws(() => decodeSubtitle(new Uint8Array([0xff, 0xff])), /encoding/);
});

test('admin login has a ModSecurity-safe 403 fallback route', () => {
  const context = fs.readFileSync(new URL('../client/src/features/auth/context/AuthContext.jsx', import.meta.url), 'utf8');
  const controller = fs.readFileSync(new URL('../server-php/controllers/AuthController.php', import.meta.url), 'utf8');
  const router = fs.readFileSync(new URL('../server-php/index.php', import.meta.url), 'utf8');

  assert.match(context, /isProxyOrWaf403/);
  assert.match(context, /https:\/\/api\.ksubzone\.com\/api\/admin\/login/);
  assert.match(context, /\/api\/admin\/session/);
  assert.match(context, /base64url-reverse/);
  assert.match(controller, /base64url-reverse/);
  assert.match(router, /'\/api\/admin\/session'/);
});

test('premium admin redesign keeps real-data and inline-operation contracts', () => {
  const dashboard = fs.readFileSync(new URL('../client/src/features/admin/pages/AdminDashboard.jsx', import.meta.url), 'utf8');
  const notifications = fs.readFileSync(new URL('../client/src/features/admin/components/AdminNotifications.jsx', import.meta.url), 'utf8');
  const seo = fs.readFileSync(new URL('../client/src/features/admin/pages/SeoManager.jsx', import.meta.url), 'utf8');
  const router = fs.readFileSync(new URL('../server-php/index.php', import.meta.url), 'utf8');
  const dramaController = fs.readFileSync(new URL('../server-php/controllers/DramaController.php', import.meta.url), 'utf8');
  const subtitleController = fs.readFileSync(new URL('../server-php/controllers/SubtitleController.php', import.meta.url), 'utf8');

  assert.match(dashboard, /workspace-intro-grid/);
  assert.match(dashboard, /downloadCsv/);
  assert.match(dashboard, /episodes\/\$\{episode\._id\}\/release/);
  assert.match(notifications, /api\/admin\/notifications/);
  assert.match(seo, /JSON\.stringify/);
  assert.match(router, /api\/admin\/notifications/);
  assert.match(router, /episodes\/\(\[\^\/\]\+\)\/release/);
  assert.match(dramaController, /releaseStatus.*Released/);
  assert.match(subtitleController, /Resolve uploader references in batches/);
});
