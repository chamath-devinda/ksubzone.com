import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSRT, decodeSubtitle } from '../client/src/utils/srt.mjs';

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
