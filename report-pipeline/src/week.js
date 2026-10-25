// Dates are 'YYYY-MM-DD' strings, with arithmetic in UTC so a time zone can't shift a day.

const toDate = (iso) => new Date(`${iso}T00:00:00Z`);
const toIso = (d) => d.toISOString().slice(0, 10);

export function addDays(iso, n) {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toIso(d);
}

// The last full Monday-to-Friday week that ended before the given day.
// Run on a Monday, that is the week just gone.
export function lastWeek(today) {
  const day = toDate(today).getUTCDay(); // 0 Sunday ... 6 Saturday
  const back = day === 6 ? 1 : day === 0 ? 2 : day + 2; // days back to the previous Friday
  const friday = addDays(today, -back);
  return { start: addDays(friday, -4), end: friday };
}

export const inRange = (iso, { start, end }) => iso >= start && iso <= end;
