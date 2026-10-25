// Dates are plain 'YYYY-MM-DD' strings throughout. All arithmetic is done in UTC
// so a machine's time zone or daylight saving can never shift a day.

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parse(iso) {
  const m = ISO.exec(iso);
  if (!m) throw new TypeError(`Expected a date like 2026-04-27, got ${JSON.stringify(iso)}`);
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (format(d) !== iso) throw new RangeError(`Not a real date: ${iso}`);
  return d;
}

export function format(d) {
  return d.toISOString().slice(0, 10);
}

export function fromParts(year, month, day) {
  return format(new Date(Date.UTC(year, month - 1, day)));
}

export function addDays(iso, n) {
  const d = parse(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return format(d);
}

// 0 = Sunday ... 6 = Saturday
export function weekday(iso) {
  return parse(iso).getUTCDay();
}

export function daysBetween(start, end) {
  return Math.round((parse(end) - parse(start)) / 86400000);
}
