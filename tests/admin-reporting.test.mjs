import { test } from 'node:test';
import assert from 'node:assert/strict';
import { csvText, selectTraffic } from '../client/src/features/admin/reporting.mjs';

test('CSV preserves quotes, Sinhala and protects spreadsheet formula cells', () => {
  const csv = csvText([['සිංහල', 'a"b', '=HYPERLINK("bad")', 0]]);
  assert.equal(csv, '\uFEFF"සිංහල","a""b","\'=HYPERLINK(""bad"")","0"');
});

test('traffic windows use calendar dates, exclude future data and sort sparse records', () => {
  const logs = [{ date: '2026-09-17', views: 50 }, { date: '2026-09-16', views: 9 }, { date: '2026-09-01', views: 20 }, { date: '2026-09-10', views: 2 }];
  assert.deepEqual(selectTraffic(logs, 7, new Date('2026-09-16T12:00:00Z')).map(row => row.views), [2, 9]);
  assert.equal(selectTraffic(logs, 30, new Date('2026-09-16T12:00:00Z')).length, 3);
  assert.deepEqual(selectTraffic(null, 7), []);
});
