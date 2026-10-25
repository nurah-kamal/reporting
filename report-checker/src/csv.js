// CSV to rows of strings. Handles quoted fields, doubled quotes, line breaks
// inside quotes, a byte-order mark, and comma, semicolon or tab separators.

export function detectDelimiter(text) {
  const firstLine = text.slice(0, text.search(/\r?\n|$/));
  let best = ',';
  let bestCount = 0;
  for (const d of [',', ';', '\t']) {
    let count = 0;
    let quoted = false;
    for (const ch of firstLine) {
      if (ch === '"') quoted = !quoted;
      else if (ch === d && !quoted) count++;
    }
    if (count > bestCount) { best = d; bestCount = count; }
  }
  return best;
}

export function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const d = detectDelimiter(text);
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += ch;
    } else if (ch === '"' && field === '') {
      quoted = true;
    } else if (ch === d) {
      row.push(field); field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  while (rows.length && rows.at(-1).every((c) => c.trim() === '')) rows.pop();
  return rows;
}

function quote(cell) {
  const s = cell == null ? '' : String(cell);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows) {
  return rows.map((r) => r.map(quote).join(',')).join('\n') + '\n';
}
