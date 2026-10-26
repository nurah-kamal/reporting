// Builds template/sheet-check-template.xlsx from the three CSVs, so the
// template can be uploaded to Google Sheets in one go. Cells get the same
// types Google Sheets would give them, so the planted text stays text.
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { sheetValues } from './csv.js';

export const TABS = ['Invoices', 'Summary', 'Rules'];
export const OUTPUT = new URL('../template/sheet-check-template.xlsx', import.meta.url);

const widths = {
  Invoices: [12, 12, 10, 12, 10, 8],
  Summary: [10, 12],
  Rules: [10, 10, 12, 16],
};

export async function buildTemplate() {
  const book = new ExcelJS.Workbook();
  book.creator = 'Nurah Kamal';
  book.created = book.modified = new Date(Date.UTC(2026, 9, 26));

  for (const name of TABS) {
    const sheet = book.addWorksheet(name);
    sheet.columns = widths[name].map((width) => ({ width }));
    for (const values of sheetValues(name)) {
      const row = sheet.addRow(values.map(toCell));
      row.eachCell((cell) => {
        if (cell.value instanceof Date) cell.numFmt = 'yyyy-mm-dd';
        else if (typeof cell.value === 'number' && name !== 'Rules') cell.numFmt = '0.00';
      });
    }
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
  }
  await book.xlsx.writeFile(OUTPUT);
}

// Excel stores a date as a day count with no time zone, so write midnight UTC.
function toCell(value) {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  }
  return value === '' ? null : value;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await buildTemplate();
  console.log('wrote template/sheet-check-template.xlsx');
}
