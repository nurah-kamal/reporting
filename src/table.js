// Turns rows of cells into { headers, rows }: the first row with two or more
// filled cells is the header, and empty rows are dropped.

export const norm = (s) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

export function makeTable(cells) {
  const start = cells.findIndex((r) => r.filter((c) => String(c ?? '').trim() !== '').length >= 2);
  if (start < 0) throw new Error('No header row found: the first row with two or more filled cells is read as the header.');
  const headers = cells[start].map((h, i) => String(h ?? '').trim() || `Column ${i + 1}`);
  const rows = cells.slice(start + 1)
    .filter((r) => r.some((c) => String(c ?? '').trim() !== ''))
    .map((r) => headers.map((_, i) => String(r[i] ?? '').trim()));
  return { headers, rows };
}

export function columnIndex(table, name) {
  const i = table.headers.findIndex((h) => norm(h) === norm(name));
  if (i < 0) throw new Error(`There is no column called "${name}".`);
  return i;
}
