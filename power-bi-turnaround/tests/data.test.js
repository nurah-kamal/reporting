import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { expectedFigures, makeCalendar, makeCategories, makeChannels } from '../scripts/make-data.js';
import { makeRequests, toCsv } from '../scripts/requests.js';
import { addDays } from '../src/dates.js';
import { workingDaysBetween } from '../src/index.js';

const read = (file) => readFileSync(new URL(`../data/${file}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const requests = makeRequests();
const calendar = makeCalendar();

test('The committed data is exactly what the scripts make', () => {
  assert.equal(read('requests.csv'), toCsv(requests));
  assert.equal(read('calendar.csv'), toCsv(calendar));
  assert.equal(read('category.csv'), toCsv(makeCategories()));
  assert.equal(read('channel.csv'), toCsv(makeChannels()));
  assert.deepEqual(JSON.parse(read('expected.json')), expectedFigures(requests, calendar));
});

test('The calendar is whole years with no gaps, and covers every request', () => {
  assert.equal(calendar[0].date, '2023-01-01');
  assert.equal(calendar.at(-1).date, '2025-12-31');
  for (let i = 1; i < calendar.length; i++) assert.equal(calendar[i].date, addDays(calendar[i - 1].date, 1));
  const days = new Set(calendar.map((c) => c.date));
  for (const r of requests) {
    assert.ok(days.has(r.opened_on), r.request_id);
    if (r.closed_on) assert.ok(days.has(r.closed_on), r.request_id);
  }
});

test('No text in the CSVs contains a comma', () => {
  for (const row of [...calendar, ...makeCategories(), ...makeChannels()]) {
    for (const v of Object.values(row)) assert.ok(!String(v).includes(','), String(v));
  }
});

test('Subtracting the working-day index agrees with the library', () => {
  const index = new Map(calendar.map((c) => [c.date, c.working_day_index]));
  for (const r of requests.filter((x) => x.closed_on)) {
    assert.equal(index.get(r.closed_on) - index.get(r.opened_on), workingDaysBetween(r.opened_on, r.closed_on), r.request_id);
  }
});

// Published by sa-turnaround's SQL (README and docs/DATA.md). The Power BI
// measures are checked against these same numbers.
test('The figures match sa-turnaround', () => {
  const e = expectedFigures(requests, calendar);
  assert.equal(e.closed_requests, 5706);
  assert.equal(e.late_by_calendar, 1183);
  assert.equal(e.wrongly_late, 283);
  assert.equal(e.missed_late, 160);
  assert.equal(e.refund_late_working_pct_by_quarter['2025-Q2'], 16.1);
  assert.ok(e.refund_late_working_pct_by_quarter['2025-Q3'] > 50);
  assert.ok(e.refund_late_working_pct_by_quarter['2025-Q4'] > 50);
});
