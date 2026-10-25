// node bin/run.js [--today YYYY-MM-DD] [--rates file.csv] [--out outputs]
//
// Builds the report for the last full week before --today (default: today):
//   outputs/rand-week-ending-<friday>.xlsx   summary, daily rates, source
//   outputs/rand-week-ending-<friday>.md     the summary, readable on GitHub
//   outputs/latest.md                        a copy of the newest summary
//
// --rates reads a saved ECB CSV instead of calling the API (used by the tests).
// A week that already has a workbook is left alone, so a re-run changes nothing.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { fetchRates, parseRates, sourceUrl } from '../src/ecb.js';
import { toMarkdown, toWorkbook } from '../src/render.js';
import { dailyRows, summarise } from '../src/transform.js';
import { addDays, lastWeek } from '../src/week.js';

const { values: opts } = parseArgs({
  options: {
    today: { type: 'string', default: new Date().toISOString().slice(0, 10) },
    rates: { type: 'string' },
    out: { type: 'string', default: 'outputs' },
  },
});

const week = lastWeek(opts.today);
const out = resolve(opts.out);
const base = join(out, `rand-week-ending-${week.end}`);
if (existsSync(`${base}.xlsx`)) {
  console.log(`The report for the week ending ${week.end} already exists; nothing to do.`);
  process.exit(0);
}

const from = addDays(week.end, -371); // a year plus the week before, for the 52-week range
const url = sourceUrl(from, week.end);
const rates = opts.rates ? parseRates(readFileSync(opts.rates, 'utf8')) : await fetchRates(from, week.end);
const retrieved = opts.rates ? `${week.end} (saved copy)` : new Date().toISOString().replace(/\.\d+Z$/, 'Z');

const summary = summarise(rates, week);
const workbook = await toWorkbook(summary, dailyRows(rates, from, week.end).reverse(), { retrieved, url });
const markdown = toMarkdown(summary, retrieved);

mkdirSync(out, { recursive: true });
await workbook.xlsx.writeFile(`${base}.xlsx`);
writeFileSync(`${base}.md`, markdown);
writeFileSync(join(out, 'latest.md'), markdown);
for (const p of summary.pairs) console.log(`${p.label}: ${p.average.toFixed(4)} (${(p.change * 100).toFixed(2)}% on the week before)`);
console.log(`Written: ${base}.xlsx and .md`);
