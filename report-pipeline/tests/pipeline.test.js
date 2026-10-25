import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { fetchRates, parseRates } from '../src/ecb.js';
import { toMarkdown } from '../src/render.js';
import { summarise } from '../src/transform.js';
import { lastWeek } from '../src/week.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const fixture = join(root, 'tests/fixtures/ecb-2025-10-17-to-2026-10-23.csv');
const rates = parseRates(readFileSync(fixture, 'utf8'));
const tmp = mkdtempSync(join(tmpdir(), 'pipeline-'));
after(() => rmSync(tmp, { recursive: true, force: true }));
const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

test('the report week is the last full Monday-to-Friday before the run day', () => {
  assert.deepEqual(lastWeek('2026-10-26'), { start: '2026-10-19', end: '2026-10-23' }); // Monday
  assert.deepEqual(lastWeek('2026-10-25'), { start: '2026-10-19', end: '2026-10-23' }); // Sunday
  assert.deepEqual(lastWeek('2026-10-24'), { start: '2026-10-19', end: '2026-10-23' }); // Saturday
  assert.deepEqual(lastWeek('2026-10-23'), { start: '2026-10-12', end: '2026-10-16' }); // Friday: this week isn't over
  assert.deepEqual(lastWeek('2027-01-04'), { start: '2026-12-28', end: '2027-01-01' }); // across a year end
});

test('only days with all three currencies fixed are kept, with values unchanged', () => {
  const csv = 'CURRENCY,CURRENCY_DENOM,TIME_PERIOD,OBS_VALUE\nZAR,EUR,2026-01-02,20.5\nUSD,EUR,2026-01-02,1.1\nGBP,EUR,2026-01-02,0.85\nZAR,EUR,2026-01-05,20.6\nUSD,EUR,2026-01-05,\n';
  assert.deepEqual(parseRates(csv), { '2026-01-02': { ZAR: 20.5, USD: 1.1, GBP: 0.85 } });
});

test('the saved ECB file has a year of fixings for all three currencies', () => {
  assert.equal(Object.keys(rates).length, 260);
  assert.deepEqual(rates['2026-10-23'], { ZAR: 18.5777, USD: 1.1193, GBP: 0.83728 });
});

test('averages, change and cross rates, checked by hand for the week ending 23 October 2026', () => {
  const s = summarise(rates, lastWeek('2026-10-26'));
  const eur = s.pairs.find((p) => p.pair === 'EUR/ZAR');
  const week = ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23'];
  close(eur.average, week.reduce((t, d) => t + rates[d].ZAR, 0) / 5);
  const usd = s.pairs.find((p) => p.pair === 'USD/ZAR');
  close(usd.close.value, 18.5777 / 1.1193);
  assert.equal(usd.calculated, true);
  assert.equal(eur.calculated, false);
  assert.equal(s.fixings, 5);
  assert.deepEqual([eur.year.low.date, eur.year.low.value], ['2026-10-21', 18.393]);
});

test('a week with a holiday has fewer fixings and says so', () => {
  const s = summarise(rates, { start: '2025-12-22', end: '2025-12-26' });
  assert.equal(s.fixings, 3);
  assert.equal(s.missing, 2);
  assert.match(toMarkdown(s, 'x'), /\(3 fixings; 2 days without one\)/);
});

test('a week with no data is an error, not an empty report', () => {
  assert.throws(() => summarise(rates, { start: '2027-01-04', end: '2027-01-08' }), /No ECB fixings/);
});

test('an API failure stops the run', async () => {
  await assert.rejects(fetchRates('2026-01-01', '2026-01-02', async () => ({ ok: false, status: 503 })), /returned 503/);
});

test('the pipeline writes the workbook and summary, and a second run changes nothing', async () => {
  const run = () => spawnSync(process.execPath, ['bin/run.js', '--today', '2026-10-26', '--rates', fixture, '--out', tmp], { cwd: root, encoding: 'utf8' });
  const first = run();
  assert.equal(first.status, 0, first.stderr);
  const base = join(tmp, 'rand-week-ending-2026-10-23');
  assert.ok(existsSync(`${base}.xlsx`) && existsSync(`${base}.md`));
  assert.equal(readFileSync(join(tmp, 'latest.md'), 'utf8'), readFileSync(`${base}.md`, 'utf8'));

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(`${base}.xlsx`);
  assert.deepEqual(wb.worksheets.map((w) => w.name), ['Summary', 'Daily', 'Source']);
  const daily = wb.getWorksheet('Daily');
  assert.deepEqual(daily.getRow(2).values.slice(1, 5), ['2026-10-23', 18.5777, 1.1193, 0.83728]);
  assert.equal(daily.rowCount, 261);
  assert.match(wb.getWorksheet('Source').getRow(2).values[1], /^Source: ECB statistics\./);

  const second = run();
  assert.equal(second.status, 0);
  assert.match(second.stdout, /already exists; nothing to do/);
});
