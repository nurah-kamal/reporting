import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkReport } from '../src/index.js';

// Small hand-made tables, one cause at a time.
const source = {
  headers: ['ref', 'day', 'paid_on', 'team', 'status', 'amount'],
  rows: [
    ['A1', '2026-01-03', '2026-01-04', 'North', 'Open', '10'],
    ['A2', '2026-01-15', '2026-02-05', 'North', 'Closed', '20'],
    ['A3', '2026-01-31', '2026-02-01', 'South', 'Open', '30'],
    ['A4', '2026-02-02', '2026-02-02', 'South', 'Void', '40'],
    ['A5', '2026-02-10', '2026-02-11', 'North', 'Open', '50'],
    ['A6', '2026-02-20', '2026-02-21', '', 'Open', '60'],
    ['A7', '2026-02-27', '2026-02-27', 'South', 'Closed', '70'],
  ],
};

const byMonth = (measures = [{ report: 'Rows', agg: 'count' }]) => ({
  keys: [{ report: 'Month', source: 'day', as: 'month' }],
  id: 'ref',
  date: null,
  filters: [{ column: 'status', not: 'Void' }],
  measures,
});

const report = (rows, headers = ['Month', 'Rows']) => ({ headers, rows });
const only = (result, row) => result.figures.find((f) => f.row === row);

test('figures that agree pass, including the total', () => {
  const r = checkReport(report([['Jan 2026', '3'], ['Feb 2026', '3'], ['Total', '6']]), source, byMonth());
  assert.equal(r.mismatched, 0);
  assert.equal(r.matched, 3);
});

test('a figure that agrees once rounded passes', () => {
  const r = checkReport(report([['Jan 2026', '33.3%']], ['Month', 'Closed']), source,
    byMonth([{ report: 'Closed', agg: 'share', column: 'status', value: 'Closed' }]));
  assert.equal(r.figures[0].status, 'match');
});

test('rounding: a figure cut off instead of rounded', () => {
  const r = checkReport(report([['Jan 2026', '66.6%']], ['Month', 'Open']), source,
    byMonth([{ report: 'Open', agg: 'share', column: 'status', value: 'Open' }]));
  assert.equal(r.figures[0].reason.code, 'rounding');
  assert.match(r.figures[0].reason.detail, /rounds to 66\.7%/);
});

test('duplicates: a repeated reference counted twice', () => {
  const dup = { ...source, rows: [...source.rows, ['A2', '2026-01-15', '2026-01-16', 'North', 'Closed', '20']] };
  const r = checkReport(report([['Jan 2026', '4'], ['Feb 2026', '3']]), dup, byMonth());
  assert.equal(only(r, 'Jan 2026').reason.code, 'duplicates');
  assert.equal(only(r, 'Jan 2026').recalculated, 3);
  assert.equal(only(r, 'Feb 2026').status, 'match');
});

test('filter: rows the rule leaves out were kept in', () => {
  const r = checkReport(report([['Feb 2026', '4']]), source, byMonth());
  assert.equal(r.figures[0].reason.code, 'filter');
  assert.match(r.figures[0].reason.detail, /status is Void/);
});

test('filter: rows of one category were left out', () => {
  const recipe = { keys: [{ report: 'Team', source: 'team', as: 'value' }], id: 'ref', filters: [{ column: 'status', not: 'Void' }], measures: [{ report: 'Amount', agg: 'sum', column: 'amount' }] };
  const r = checkReport(report([['North', '60']], ['Team', 'Amount']), source, recipe);
  assert.equal(r.figures[0].reason.code, 'filter');
  assert.match(r.figures[0].reason.detail, /status is Closed are left out/);
});

test('date range: the last day of the month was left out', () => {
  const r = checkReport(report([['Jan 2026', '2'], ['Feb 2026', '3']]), source, byMonth());
  assert.equal(only(r, 'Jan 2026').reason.code, 'date-range');
  assert.match(only(r, 'Jan 2026').reason.detail, /1 Jan 2026 to 30 Jan 2026/);
});

test('date range: rows put in months by a different date column', () => {
  const r = checkReport(report([['Jan 2026', '10']], ['Month', 'Amount']), source,
    byMonth([{ report: 'Amount', agg: 'sum', column: 'amount' }]));
  assert.equal(r.figures[0].reason.code, 'date-range');
  assert.match(r.figures[0].reason.detail, /by paid_on instead of day/);
});

test('stale extract: the latest month stops early', () => {
  const r = checkReport(report([['Jan 2026', '3'], ['Feb 2026', '2']]), source, byMonth());
  assert.equal(only(r, 'Feb 2026').reason.code, 'stale');
  assert.match(only(r, 'Feb 2026').reason.detail, /up to (2[0-6]) Feb 2026/);
});

test('join: rows with no team drop out of the total', () => {
  const recipe = { keys: [{ report: 'Team', source: 'team', as: 'value' }], id: 'ref', filters: [{ column: 'status', not: 'Void' }], measures: [{ report: 'Rows', agg: 'count' }] };
  const r = checkReport(report([['North', '3'], ['South', '2'], ['Total', '5']], ['Team', 'Rows']), source, recipe);
  assert.equal(only(r, 'North').status, 'match');
  assert.equal(only(r, 'Total').reason.code, 'join');
  assert.match(only(r, 'Total').reason.detail, /1 source row has no team/);
});

test("total: the rows don't add up to the total", () => {
  const r = checkReport(report([['Jan 2026', '3'], ['Feb 2026', '3'], ['Total', '7']]), source, byMonth());
  assert.equal(only(r, 'Total').reason.code, 'total');
  assert.match(only(r, 'Total').reason.detail, /add up to 6, but the total says 7/);
});

test('a total that adds up carries the rows above it', () => {
  const r = checkReport(report([['Jan 2026', '3'], ['Feb 2026', '4'], ['Total', '7']]), source, byMonth());
  assert.equal(only(r, 'Feb 2026').reason.code, 'filter');
  assert.equal(only(r, 'Total').reason.code, 'inherited');
});

test('a difference no single cause explains says so', () => {
  const r = checkReport(report([['Jan 2026', '9']]), source, byMonth());
  assert.equal(r.figures[0].reason.code, 'unknown');
  assert.match(r.figures[0].reason.detail, /6 higher/);
});

test('a report label with no source rows says so', () => {
  const r = checkReport(report([['Mar 2026', '2']]), source, byMonth());
  assert.equal(r.figures[0].reason.code, 'unknown');
  assert.match(r.figures[0].reason.detail, /No rows in the source belong to Mar 2026/);
});

test('blank and text cells in the figure columns are skipped, not guessed', () => {
  const r = checkReport(report([['Jan 2026', ''], ['Feb 2026', 'n/a']]), source, byMonth());
  assert.equal(r.figures.length, 0);
  assert.equal(r.skipped, 1);
});

test('a column the recipe names but the file lacks is a clear error', () => {
  assert.throws(() => checkReport(report([['Jan 2026', '3']]), source, { ...byMonth(), id: 'reference' }), /no column called "reference"/);
});
