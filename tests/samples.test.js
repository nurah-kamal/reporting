import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkReport, guessRecipe, readTable, readXlsx } from '../src/index.js';
import { enrolments, sales, tickets } from '../scripts/make-samples.js';

const dir = (id) => new URL(`../samples/${id}/`, import.meta.url);

async function load(id) {
  const meta = JSON.parse(readFileSync(new URL('sample.json', dir(id)), 'utf8'));
  const report = await readTable(meta.report, readFileSync(new URL(meta.report, dir(id))));
  const source = await readTable(meta.source, readFileSync(new URL(meta.source, dir(id))));
  return { meta, report, source };
}

const key = (row, measure) => `${row.filter(Boolean).join(' · ')} | ${measure}`;

for (const id of ['enrolments', 'sales', 'tickets']) {
  test(`${id}: every planted mistake is found, for the reason it was planted`, async () => {
    const { meta, report, source } = await load(id);
    const result = checkReport(report, source, meta.recipe);
    const found = new Map(result.figures.filter((f) => f.status === 'mismatch').map((f) => [key(f.keys, f.measure), f.reason.code]));
    for (const p of meta.planted) {
      assert.equal(found.get(key(p.row, p.measure)), p.reason, `${key(p.row, p.measure)} should be flagged as ${p.reason}`);
    }
  });

  test(`${id}: every figure nothing was planted in passes`, async () => {
    const { meta, report, source } = await load(id);
    const result = checkReport(report, source, meta.recipe);
    const planted = new Set(meta.planted.map((p) => key(p.row, p.measure)));
    const clean = result.figures.filter((f) => !planted.has(key(f.keys, f.measure)));
    assert.ok(clean.length >= 10, 'each sample keeps plenty of clean figures');
    for (const f of clean) assert.equal(f.status, 'match', `${key(f.keys, f.measure)} should match (${f.reason?.detail})`);
    assert.equal(result.mismatched, meta.planted.length);
    assert.equal(result.skipped, 0);
  });

  test(`${id}: the column guess on the page lands on the sample's own rules`, async () => {
    const { meta, report, source } = await load(id);
    const guess = guessRecipe(report, source);
    assert.deepEqual(guess.keys, meta.recipe.keys);
    assert.equal(guess.id, meta.recipe.id);
    assert.deepEqual(guess.measures, meta.recipe.measures);
  });
}

test('the samples cover every kind of mistake the brief names', async () => {
  const reasons = new Set();
  for (const id of ['enrolments', 'sales', 'tickets']) {
    const { meta } = await load(id);
    for (const p of meta.planted) reasons.add(p.reason);
  }
  for (const r of ['rounding', 'filter', 'date-range', 'duplicates', 'stale', 'join', 'total']) {
    assert.ok(reasons.has(r), `no sample plants ${r}`);
  }
});

test('the committed samples are exactly what the generator makes', async () => {
  for (const make of [enrolments, sales, tickets]) {
    const { id, files } = make();
    for (const [name, body] of Object.entries(files)) {
      const committed = readFileSync(new URL(name, dir(id)));
      if (name.endsWith('.xlsx')) {
        assert.deepEqual((await readXlsx(committed)).sheets, (await readXlsx(body)).sheets, `${id}/${name} drifted`);
      } else {
        assert.equal(committed.toString('utf8'), body, `${id}/${name} drifted; run npm run samples`);
      }
    }
  }
});

test('no sample holds a person: no name, email or phone columns', async () => {
  for (const id of ['enrolments', 'sales', 'tickets']) {
    const { source, report } = await load(id);
    for (const h of [...source.headers, ...report.headers]) {
      assert.doesNotMatch(h, /name|email|e-mail|phone|mobile|surname|contact|address|student|customer|agent/i);
    }
    const text = readFileSync(new URL('source.csv', dir(id)), 'utf8');
    assert.doesNotMatch(text, /@/);
  }
});

test('the sample buttons on the page give the right row counts', async () => {
  const html = readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');
  for (const id of ['enrolments', 'sales', 'tickets']) {
    const { source } = await load(id);
    const start = html.indexOf(`data-sample="${id}"`);
    const button = html.slice(start, html.indexOf('</button>', start));
    assert.ok(button.includes(`${source.rows.length.toLocaleString('en-US')} source rows`), `${id} button shows the wrong row count`);
  }
});
