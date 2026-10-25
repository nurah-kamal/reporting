import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { openDatabase, runAll } from '../scripts/db.js';
import { makeRequests, toCsv } from '../scripts/make-sample.js';
import { daysBetween, workingDaysBetween } from '../src/index.js';

const db = openDatabase();
const results = runAll(db);

test('The committed sample is exactly what the generator makes', () => {
  const committed = readFileSync(new URL('../data/sample/requests.csv', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(committed, toCsv(makeRequests()));
});

test('SQL and the library agree on every request', () => {
  const rows = db.prepare('SELECT opened_on, closed_on, working_days, calendar_days FROM request_times').all();
  assert.ok(rows.length > 5000);
  for (const r of rows) {
    assert.equal(r.working_days, workingDaysBetween(r.opened_on, r.closed_on), `${r.opened_on} to ${r.closed_on}`);
    assert.equal(r.calendar_days, daysBetween(r.opened_on, r.closed_on));
  }
});

test('Every question runs and returns rows', () => {
  assert.ok(Object.keys(results).length >= 6);
  for (const [key, q] of Object.entries(results)) {
    assert.ok(q.rows.length > 0, key);
    assert.ok(q.question.length > 20, `${key} needs a question comment`);
  }
});

test('The headline numbers add up', () => {
  const h = results.headline.rows[0];
  assert.equal(h.late_by_calendar - h.wrongly_late, h.late_by_working_days - h.missed_late);
});

// The planted patterns from docs/DATA.md. If these fail, the analysis no longer
// finds what was put into the data.
test('Holiday windows inflate the calendar measure only', () => {
  const [none, one] = results.holiday_exposure.rows;
  assert.ok(one.late_calendar_pct > none.late_calendar_pct * 2);
  assert.ok(one.late_calendar_pct - one.late_working_pct > 10);
});

test('The refund sign-off from July 2025 shows up, and only for refunds', () => {
  const q = results.category_by_quarter.rows;
  const late = (quarter, category) => q.find((r) => r.quarter === quarter && r.category === category).late_working_pct;
  assert.ok(late('2025-Q3', 'Refund') > 2 * late('2025-Q2', 'Refund'));
  for (const c of ['Account change', 'Billing query', 'Document request', 'Complaint']) {
    assert.ok(late('2025-Q3', c) < 1.6 * late('2025-Q2', c) + 5, c);
  }
});
