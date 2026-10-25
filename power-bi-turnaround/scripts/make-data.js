// Writes the CSVs the Power BI model loads, all from code in this repo:
//   data/requests.csv   one row per request (the fact table)
//   data/calendar.csv   one row per day, with SA public holidays and a running
//                       working-day number, so working days are a subtraction
//   data/category.csv   each category with its target in working days
//   data/channel.csv    the three channels
//   data/expected.json  the figures the model's measures must reproduce
// The same seed always gives the same files.

import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { addDays, daysBetween, weekday } from '../src/dates.js';
import { holidayOn, isWorkingDay } from '../src/index.js';
import { CATEGORIES, makeRequests, toCsv } from './requests.js';

// Whole years, so Power BI accepts it as a date table.
const CALENDAR_FROM = '2023-01-01';
const CALENDAR_TO = '2025-12-31';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function makeCalendar() {
  const rows = [];
  let index = 0;
  for (let d = CALENDAR_FROM; d <= CALENDAR_TO; d = addDays(d, 1)) {
    const working = isWorkingDay(d);
    if (working) index += 1;
    const h = holidayOn(d);
    const month = +d.slice(5, 7);
    const wd = weekday(d);
    rows.push({
      date: d,
      year: +d.slice(0, 4),
      quarter: `${d.slice(0, 4)}-Q${Math.ceil(month / 3)}`,
      month_no: month,
      month: MONTHS[month - 1],
      year_month: d.slice(0, 7),
      weekday_no: wd === 0 ? 7 : wd, // Monday 1 .. Sunday 7
      weekday: WEEKDAYS[wd],
      is_weekend: wd === 0 || wd === 6 ? 1 : 0,
      holiday_name: h?.name ?? '',
      holiday_kind: h?.kind ?? '', // statutory, sunday-rule or declared
      is_working_day: working ? 1 : 0,
      working_day_index: index,
    });
  }
  return rows;
}

export function makeCategories() {
  return CATEGORIES.map((c, i) => ({
    category: c.name,
    target_working_days: c.target,
    // What a spreadsheet would use: the target stretched for weekends only.
    calendar_target_days: Math.ceil((c.target * 7) / 5),
    sort_order: i + 1,
  }));
}

export function makeChannels() {
  return [
    { channel: 'Email', open_when_desk_closed: 0, sort_order: 1 },
    { channel: 'Web form', open_when_desk_closed: 1, sort_order: 2 },
    { channel: 'Phone', open_when_desk_closed: 0, sort_order: 3 },
  ];
}

// The same rules as sa-turnaround's sql/schema.sql, worked out in plain code.
export function expectedFigures(requests, calendar) {
  const wdIndex = new Map(calendar.map((r) => [r.date, r.working_day_index]));
  const holidayWeekdays = calendar.filter((r) => r.holiday_name && r.weekday_no <= 5).map((r) => r.date);
  const targets = new Map(makeCategories().map((c) => [c.category, c]));
  const closed = requests.filter((r) => r.closed_on).map((r) => {
    const t = targets.get(r.category);
    const calendarDays = daysBetween(r.opened_on, r.closed_on);
    const workingDays = wdIndex.get(r.closed_on) - wdIndex.get(r.opened_on);
    return {
      ...r,
      quarter: calendar.find((c) => c.date === r.opened_on).quarter,
      lateCalendar: calendarDays > t.calendar_target_days,
      lateWorking: workingDays > t.target_working_days,
      holidayInside: holidayWeekdays.some((h) => h > r.opened_on && h <= r.closed_on),
    };
  });
  const count = (f) => closed.filter(f).length;
  const pct = (n, d) => Math.round((1000 * n) / d) / 10;

  const lateCalendar = count((r) => r.lateCalendar);
  const wronglyLate = count((r) => r.lateCalendar && !r.lateWorking);
  const refundByQuarter = {};
  for (const q of [...new Set(closed.map((r) => r.quarter))].sort()) {
    const inQ = closed.filter((r) => r.quarter === q && r.category === 'Refund');
    refundByQuarter[q] = pct(inQ.filter((r) => r.lateWorking).length, inQ.length);
  }
  return {
    requests: requests.length,
    open_requests: requests.length - closed.length,
    closed_requests: closed.length,
    late_by_calendar: lateCalendar,
    late_by_working_days: count((r) => r.lateWorking),
    wrongly_late: wronglyLate,
    wrongly_late_pct: pct(wronglyLate, lateCalendar),
    missed_late: count((r) => r.lateWorking && !r.lateCalendar),
    closed_with_holiday_inside: count((r) => r.holidayInside),
    refund_late_working_pct_by_quarter: refundByQuarter,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const out = new URL('../data/', import.meta.url);
  mkdirSync(out, { recursive: true });
  const requests = makeRequests();
  const calendar = makeCalendar();
  writeFileSync(new URL('requests.csv', out), toCsv(requests));
  writeFileSync(new URL('calendar.csv', out), toCsv(calendar));
  writeFileSync(new URL('category.csv', out), toCsv(makeCategories()));
  writeFileSync(new URL('channel.csv', out), toCsv(makeChannels()));
  writeFileSync(new URL('expected.json', out), JSON.stringify(expectedFigures(requests, calendar), null, 2) + '\n');
  console.log(`Wrote ${requests.length} requests and ${calendar.length} calendar days to data/`);
}
