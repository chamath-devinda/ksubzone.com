import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSRT, decodeSubtitle } from '../client/src/utils/srt.mjs';
import {
  mergeAiTranslationResponse,
  shouldSplitAiChunk,
  SubtitleStructureError
} from '../client/src/utils/subtitleTranslation.mjs';
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

test('structured AI translations preserve browser-owned subtitle structure', () => {
  const chunk = [
    { id: 17, start: '00:01:00,000', end: '00:01:02,000', text: '<i>Hello.</i>' },
    { id: 18, start: '00:01:03,000', end: '00:01:05,000', text: 'www.ksubzone.com' }
  ];
  const result = mergeAiTranslationResponse({
    chunk,
    responseData: { translatedCues: ['<i>හෙලෝ.</i>', 'මේක වෙනස් කරන්න'] },
    polishingSinhala: false,
    parseSRT
  });

  assert.deepEqual(result, [
    { id: 17, start: '00:01:00,000', end: '00:01:02,000', text: '<i>හෙලෝ.</i>' },
    { id: 18, start: '00:01:03,000', end: '00:01:05,000', text: 'www.ksubzone.com' }
  ]);
});

test('incomplete or structurally changed AI batches are marked for safe splitting', () => {
  const chunk = [{ id: 1, start: '00:00:01,000', end: '00:00:02,000', text: '<b>Hello</b>' }];
  assert.throws(() => mergeAiTranslationResponse({
    chunk,
    responseData: { translatedCues: [] },
    polishingSinhala: false,
    parseSRT
  }), SubtitleStructureError);

  let formattingError;
  try {
    mergeAiTranslationResponse({
      chunk,
      responseData: { translatedCues: ['හෙලෝ'] },
      polishingSinhala: false,
      parseSRT
    });
  } catch (error) {
    formattingError = error;
  }
  assert.equal(shouldSplitAiChunk(formattingError), true);
  assert.equal(shouldSplitAiChunk({ response: { data: { code: 'AI_RESPONSE_INCOMPLETE' } } }), true);
});

test('admin login has a ModSecurity-safe 403 fallback route', () => {
  const context = fs.readFileSync(new URL('../client/src/features/auth/context/AuthContext.jsx', import.meta.url), 'utf8');
  const loginProxy = fs.readFileSync(new URL('../client/src/app/api/admin/login/route.js', import.meta.url), 'utf8');
  const sessionProxy = fs.readFileSync(new URL('../client/src/app/api/admin/session/route.js', import.meta.url), 'utf8');
  const proxyHelper = fs.readFileSync(new URL('../client/src/lib/server/adminAuthProxy.js', import.meta.url), 'utf8');
  const managementLayout = fs.readFileSync(new URL('../client/src/app/management/layout.jsx', import.meta.url), 'utf8');
  const controller = fs.readFileSync(new URL('../server-php/controllers/AuthController.php', import.meta.url), 'utf8');
  const router = fs.readFileSync(new URL('../server-php/index.php', import.meta.url), 'utf8');

  assert.match(context, /isProxyOrWaf403/);
  assert.match(context, /isRetryableAdminLoginTransportError/);
  assert.match(loginProxy, /proxyAdminAuth\(request, 'login'\)/);
  assert.match(sessionProxy, /proxyAdminAuth\(request, 'session'\)/);
  assert.match(proxyHelper, /Admin authentication service is temporarily unavailable/);
  assert.match(managementLayout, /SharedAdminShell/);
  assert.match(managementLayout, /LEGACY_SHELL_PATHS/);
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
  const dramaManager = fs.readFileSync(new URL('../client/src/features/admin/pages/DramaManager.jsx', import.meta.url), 'utf8');
  const subtitleController = fs.readFileSync(new URL('../server-php/controllers/SubtitleController.php', import.meta.url), 'utf8');

  assert.match(dashboard, /workspace-intro-grid/);
  assert.match(dashboard, /downloadCsv/);
  assert.match(dashboard, /episodes\/\$\{episode\._id\}\/release/);
  assert.match(notifications, /api\/admin\/notifications/);
  assert.match(seo, /JSON\.stringify/);
  assert.match(router, /api\/admin\/notifications/);
  assert.match(router, /episodes\/\(\[\^\/\]\+\)\/release/);
  assert.match(dramaController, /releaseStatus.*Released/);
  assert.match(dramaController, /subtitledEpisodeCount/);
  assert.match(dramaManager, /subtitledEpisodeCount/);
  assert.match(subtitleController, /Resolve uploader references in batches/);
});
