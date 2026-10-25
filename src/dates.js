// Dates are YYYY-MM-DD strings and months are YYYY-MM strings, with all
// arithmetic in UTC so a time zone can never move a day.

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const pad = (n) => String(n).padStart(2, '0');

function valid(y, m, d) {
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

// "2026-03-04", "2026/03/04", "2026-03-04 09:15", "2026-03-04T09:15:00Z" and
// day-first "04/03/2026" all give "2026-03-04". Anything else gives null.
export function parseDate(text) {
  if (text == null) return null;
  const s = String(text).trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:$|[T\s])/);
  if (m) {
    const [y, mo, d] = [+m[1], +m[2], +m[3]];
    return valid(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null;
  }
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:$|\s)/);
  if (m) {
    const [d, mo, y] = [+m[1], +m[2], +m[3]];
    return valid(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null;
  }
  return null;
}

export const monthOf = (date) => date.slice(0, 7);

// "Mar 2026", "March 2026", "2026-03", "2026/03", "Mar-26" or a full date.
export function parseMonth(text) {
  if (text == null) return null;
  const s = String(text).trim().toLowerCase();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})$/);
  if (m && +m[2] >= 1 && +m[2] <= 12) return `${m[1]}-${pad(+m[2])}`;
  m = s.match(/^([a-z]{3,9})\.?[\s-]+(\d{2}|\d{4})$/);
  if (m) {
    const i = MONTHS.indexOf(m[1].slice(0, 3));
    if (i >= 0 && (m[1].length === 3 || 'january february march april may june july august september october november december'.split(' ')[i].startsWith(m[1]))) {
      const y = m[2].length === 2 ? 2000 + +m[2] : +m[2];
      return `${y}-${pad(i + 1)}`;
    }
  }
  const d = parseDate(s);
  return d ? monthOf(d) : null;
}

export function addDays(date, n) {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function monthStart(month) {
  return `${month}-01`;
}

export function monthEnd(month) {
  const [y, m] = month.split('-').map(Number);
  return addDays(`${m === 12 ? y + 1 : y}-${pad(m === 12 ? 1 : m + 1)}-01`, -1);
}

// "2026-07-30" -> "30 Jul 2026"
export function formatDate(date) {
  const [y, m, d] = date.split('-').map(Number);
  return `${d} ${MONTHS[m - 1][0].toUpperCase()}${MONTHS[m - 1].slice(1)} ${y}`;
}

// "2026-07" -> "Jul 2026"
export function formatMonth(month) {
  const [y, m] = month.split('-').map(Number);
  return `${MONTHS[m - 1][0].toUpperCase()}${MONTHS[m - 1].slice(1)} ${y}`;
}
