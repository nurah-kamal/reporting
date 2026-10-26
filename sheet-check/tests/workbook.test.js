import { test } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { OUTPUT, TABS } from '../scripts/build-template.js';
import { sheetValues } from './load.js';

// The workbook people upload must hold exactly what the tests check.
test('the template workbook matches the CSVs, cell for cell and type for type', async () => {
  const book = new ExcelJS.Workbook();
  await book.xlsx.readFile(OUTPUT);
  assert.deepEqual(
    book.worksheets.map((s) => s.name),
    TABS,
  );
  for (const name of TABS) {
    const expected = sheetValues(name);
    const sheet = book.getWorksheet(name);
    assert.equal(sheet.rowCount, expected.length, name);
    expected.forEach((row, r) => {
      row.forEach((value, c) => {
        const cell = sheet.getRow(r + 1).getCell(c + 1).value;
        const at = `${name}!${String.fromCharCode(65 + c)}${r + 1}`;
        if (value instanceof Date) {
          assert.ok(cell instanceof Date, at);
          assert.equal(cell.toISOString().slice(0, 10), `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`, at);
        } else {
          assert.equal(cell ?? '', value, at);
        }
      });
    });
  }
});
