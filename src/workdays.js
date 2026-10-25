import { addDays, daysBetween, parse, weekday } from './dates.js';
import { holidayOn } from './holidays.js';

export function isWorkingDay(iso) {
  const wd = weekday(iso);
  return wd !== 0 && wd !== 6 && holidayOn(iso) === null;
}

// Working days elapsed from start to end: the working days after start, up to and
// including end. Same day is 0; opened Friday and closed Monday is 1. This is how
// "closed within 3 working days" is usually meant, and it matches the SQL in
// sql/schema.sql (a running index of working days).
export function workingDaysBetween(start, end) {
  if (parse(end) < parse(start)) throw new RangeError(`End ${end} is before start ${start}`);
  let count = 0;
  for (let d = addDays(start, 1); d <= end; d = addDays(d, 1)) {
    if (isWorkingDay(d)) count += 1;
  }
  return count;
}

// The date that is n working days after start. Zero returns start itself.
export function addWorkingDays(start, n) {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`Expected a whole number of days, got ${n}`);
  let d = start;
  parse(d);
  while (n > 0) {
    d = addDays(d, 1);
    if (isWorkingDay(d)) n -= 1;
  }
  return d;
}

// The public holidays between start (exclusive) and end (inclusive).
export function holidaysBetween(start, end) {
  const out = [];
  for (let d = addDays(start, 1); d <= end; d = addDays(d, 1)) {
    const h = holidayOn(d);
    if (h) out.push(h);
  }
  return out;
}

export { daysBetween };
