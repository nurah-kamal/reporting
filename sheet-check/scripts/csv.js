import { readFileSync } from 'node:fs';

// Reads a CSV and types each cell the way Google Sheets does on import:
// numbers become numbers, real yyyy-mm-dd dates become dates, TRUE/FALSE
// become yes/no, and everything else stays text.
export function sheetValues(name) {
  const text = readFileSync(new URL(`../template/${name}.csv`, import.meta.url), 'utf8');
  return parseCsv(text).map((row) => row.map(typed));
}

export function typed(cell) {
  if (cell === '') return '';
  if (/^-?\d+(\.\d+)?$/.test(cell)) return Number(cell);
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(cell);
  if (date) {
    const [y, m, d] = date.slice(1).map(Number);
    const value = new Date(y, m - 1, d);
    if (value.getFullYear() === y && value.getMonth() === m - 1 && value.getDate() === d) return value;
    return cell;
  }
  if (cell === 'TRUE' || cell === 'FALSE') return cell === 'TRUE';
  return cell;
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
