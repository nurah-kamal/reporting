import { addDays, fromParts, weekday } from './dates.js';
import { DECLARED, VERIFIED_FROM, VERIFIED_TO } from './declared.js';

// Schedule 1 of the Public Holidays Act 36 of 1994, in force from 1995.
const FIXED = [
  [1, 1, "New Year's Day"],
  [3, 21, 'Human Rights Day'],
  [4, 27, 'Freedom Day'],
  [5, 1, "Workers' Day"],
  [6, 16, 'Youth Day'],
  [8, 9, "National Women's Day"],
  [9, 24, 'Heritage Day'],
  [12, 16, 'Day of Reconciliation'],
  [12, 25, 'Christmas Day'],
  [12, 26, 'Day of Goodwill'],
];

export const FIRST_YEAR = 1995;

// Western (Gregorian) Easter Sunday, using the anonymous Gregorian algorithm.
export function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return fromParts(year, month, day);
}

function checkYear(year) {
  if (!Number.isInteger(year) || year < FIRST_YEAR) {
    throw new RangeError(`The Public Holidays Act applies from ${FIRST_YEAR}; got ${year}`);
  }
}

export function isVerifiedYear(year) {
  return year >= VERIFIED_FROM && year <= VERIFIED_TO;
}

const cache = new Map();

// Every public holiday in a year, sorted by date. Each entry is
// { date, name, kind } where kind is 'statutory', 'sunday-rule' or 'declared'.
export function holidaysFor(year) {
  checkYear(year);
  if (cache.has(year)) return cache.get(year);

  const easter = easterSunday(year);
  const listed = FIXED.map(([m, d, name]) => ({ date: fromParts(year, m, d), name }));
  listed.push({ date: addDays(easter, -2), name: 'Good Friday' }, { date: addDays(easter, 1), name: 'Family Day' });

  // Easter can land on a fixed holiday (Good Friday was Human Rights Day in 2008).
  // That is still one day off, so the two names share one entry.
  const byDate = new Map();
  for (const h of listed) {
    const prev = byDate.get(h.date);
    byDate.set(h.date, prev ? `${prev} and ${h.name}` : h.name);
  }
  const statutory = [...byDate].map(([date, name]) => ({ date, name, kind: 'statutory' }));

  // Section 2(1): when a public holiday falls on a Sunday, the Monday after it is
  // a public holiday. When that Monday is already one (Christmas on a Sunday),
  // the Act adds nothing more; those years were handled by declared days.
  const taken = new Set(statutory.map((h) => h.date));
  const observed = [];
  for (const h of statutory) {
    if (weekday(h.date) !== 0) continue;
    const monday = addDays(h.date, 1);
    if (taken.has(monday)) continue;
    taken.add(monday);
    observed.push({ date: monday, name: `${h.name} (observed)`, kind: 'sunday-rule' });
  }

  const declared = DECLARED.filter((h) => h.date.startsWith(`${year}-`) && !taken.has(h.date))
    .map(({ date, name }) => ({ date, name, kind: 'declared' }));

  const all = [...statutory, ...observed, ...declared].sort((x, y) => x.date.localeCompare(y.date));
  all.forEach((h) => Object.freeze(h));
  cache.set(year, Object.freeze(all));
  return all;
}

export function holidayOn(iso) {
  return holidaysFor(+iso.slice(0, 4)).find((h) => h.date === iso) ?? null;
}
