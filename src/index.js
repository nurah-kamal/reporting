import { parseCsv } from './csv.js';
import { readXlsx } from './xlsx.js';
import { makeTable } from './table.js';

export { parseCsv, toCsv } from './csv.js';
export { readXlsx, unzip } from './xlsx.js';
export { makeTable, columnIndex } from './table.js';
export { parseFigure, agrees, roundTo, formatNumber, formatLike } from './numbers.js';
export { parseDate, parseMonth, formatDate, formatMonth } from './dates.js';
export { checkReport, describeMeasure, REASONS, AGGREGATES } from './check.js';
export { guessRecipe } from './recipe.js';

// Reads a CSV or .xlsx file's bytes into a table. For a workbook, the first
// sheet with a header row is used.
export async function readTable(name, bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const zipped = b[0] === 0x50 && b[1] === 0x4b;
  if (/\.xlsx$/i.test(name) || zipped) {
    const { sheets } = await readXlsx(b);
    for (const sheet of sheets) {
      try { return { ...makeTable(sheet.rows), sheet: sheet.name }; } catch { /* try the next sheet */ }
    }
    throw new Error('None of the sheets in this workbook has a header row.');
  }
  if (/\.xls$/i.test(name)) throw new Error('Old .xls workbooks cannot be read here. Save it as .xlsx or CSV first.');
  return makeTable(parseCsv(new TextDecoder().decode(b)));
}
