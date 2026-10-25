import assert from 'node:assert/strict';
import { test } from 'node:test';
import { agrees, formatNumber, makeTable, parseCsv, parseDate, parseFigure, parseMonth, readTable, readXlsx, roundTo, toCsv } from '../src/index.js';
import { writeXlsx, zip } from '../scripts/xlsx-write.js';

test('figures parse the way reports print them', () => {
  const cases = {
    '1,284': [1284, 0, false], '1 284': [1284, 0, false], 'R 12 450': [12450, 0, false], 'R12,450.50': [12450.5, 2, false],
    '80.6%': [80.6, 1, true], '80,6': [80.6, 1, false], '(1 200)': [-1200, 0, false], '-3.50': [-3.5, 2, false],
    '1.234.567': [1234567, 0, false], '1.234,5': [1234.5, 1, false], '0': [0, 0, false],
  };
  for (const [text, [value, decimals, percent]] of Object.entries(cases)) {
    assert.deepEqual(parseFigure(text), { value, decimals, percent }, text);
  }
  for (const text of ['', 'n/a', 'Total', '12abc', '1,2,3', '-']) assert.equal(parseFigure(text), null, text);
});

test('rounding is half away from zero, even for awkward binary values', () => {
  assert.equal(roundTo(0.285, 2), 0.29);
  assert.equal(roundTo(1.005, 2), 1.01);
  assert.equal(roundTo(-2.5, 0), -3);
  assert.ok(agrees(parseFigure('22.8%'), 22.794));
  assert.ok(!agrees(parseFigure('22.7%'), 22.794));
  assert.equal(formatNumber(1234567.891, 2), '1,234,567.89');
});

test('dates and months', () => {
  assert.equal(parseDate('2026-03-04'), '2026-03-04');
  assert.equal(parseDate('2026/3/4 09:15'), '2026-03-04');
  assert.equal(parseDate('04/03/2026'), '2026-03-04');
  assert.equal(parseDate('2026-02-30'), null);
  assert.equal(parseMonth('Mar 2026'), '2026-03');
  assert.equal(parseMonth('September 2026'), '2026-09');
  assert.equal(parseMonth('Sept 2026'), '2026-09');
  assert.equal(parseMonth('Mar-26'), '2026-03');
  assert.equal(parseMonth('2026-03'), '2026-03');
  assert.equal(parseMonth('Marching 2026'), null);
});

test('CSV: quotes, separators, line endings and a byte-order mark', () => {
  assert.deepEqual(parseCsv('﻿a,b\r\n"1,5","say ""hi"""\r\n'), [['a', 'b'], ['1,5', 'say "hi"']]);
  assert.deepEqual(parseCsv('a;b\n1;2\n\n'), [['a', 'b'], ['1', '2']]);
  assert.deepEqual(parseCsv('a\tb\n"two\nlines"\t2'), [['a', 'b'], ['two\nlines', '2']]);
  const rows = [['x', 'y'], ['1,284', 'plain'], ['"q"', '']];
  assert.deepEqual(parseCsv(toCsv(rows)), rows);
});

test('the header is the first row with two filled cells', () => {
  const t = makeTable([['A title'], [], ['Month', 'Count', ''], ['Jan', '3', ''], ['', '', '']]);
  assert.deepEqual(t.headers, ['Month', 'Count', 'Column 3']);
  assert.deepEqual(t.rows, [['Jan', '3', '']]);
});

test('Excel: numbers read as their format shows them', async () => {
  const bytes = writeXlsx([
    ['Month', 'Orders', 'Rate', 'Average', 'Day', 'Plain'],
    ['Jul & Aug', { v: 1284, fmt: '#,##0' }, { v: 0.8065, fmt: '0.0%' }, { v: 590.385, fmt: '#,##0.00' }, { v: 46203, fmt: 'yyyy-mm-dd' }, { v: 0.1 + 0.2 }],
  ]);
  const { sheets } = await readXlsx(bytes);
  assert.equal(sheets[0].name, 'Report');
  assert.deepEqual(sheets[0].rows[1], ['Jul & Aug', '1,284', '80.7%', '590.39', '2026-06-30', '0.3']);
});

test('Excel: inline strings, booleans, gaps between cells and 1904 dates', async () => {
  const ns = 'http://schemas.openxmlformats.org';
  const bytes = zip([
    ['xl/workbook.xml', `<workbook xmlns:r="${ns}/officeDocument/2006/relationships"><workbookPr date1904="1"/><sheets><sheet name="One" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', `<Relationships><Relationship Id="rId1" Target="/xl/worksheets/s.xml"/></Relationships>`],
    ['xl/styles.xml', '<styleSheet><cellXfs count="2"><xf numFmtId="0"/><xf numFmtId="14"/></cellXfs></styleSheet>'],
    ['xl/worksheets/s.xml', '<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><r><t>Rich </t></r><r><t>text</t></r></is></c><c r="C1" t="b"><v>1</v></c></row><row r="3"><c r="B3" s="1"><v>0</v></c></row></sheetData></worksheet>'],
  ]);
  const { sheets } = await readXlsx(bytes);
  assert.deepEqual(sheets[0].rows, [['Rich text', '', 'TRUE'], ['', '', ''], ['', '1904-01-01', '']]);
});

test('Excel: a file that is not a workbook gets a plain error', async () => {
  await assert.rejects(readXlsx(new TextEncoder().encode('not a zip at all, just text')), /not an Excel/);
  await assert.rejects(readTable('old.xls', new TextEncoder().encode('x')), /Old \.xls/);
});

test('readTable picks CSV or Excel from the file', async () => {
  const csv = await readTable('r.csv', new TextEncoder().encode('Month,Count\nJan 2026,3\n'));
  const xlsx = await readTable('r.bin', writeXlsx([['Month', 'Count'], ['Jan 2026', { v: 3 }]]));
  assert.deepEqual(csv.rows, xlsx.rows);
  assert.equal(xlsx.sheet, 'Report');
});
