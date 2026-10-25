import { addDays, inRange } from './week.js';

// Rand per unit of each currency. EUR is the ECB's own figure; USD and GBP are
// worked out from it (rand per euro divided by dollars or pounds per euro).
export const PAIRS = [
  { pair: 'EUR/ZAR', label: 'Rand per euro', of: (d) => d.ZAR, calculated: false },
  { pair: 'USD/ZAR', label: 'Rand per US dollar', of: (d) => d.ZAR / d.USD, calculated: true },
  { pair: 'GBP/ZAR', label: 'Rand per pound', of: (d) => d.ZAR / d.GBP, calculated: true },
];

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

function extremes(points) {
  let hi = points[0];
  let lo = points[0];
  for (const p of points) {
    if (p.value > hi.value) hi = p;
    if (p.value < lo.value) lo = p;
  }
  return { high: hi, low: lo };
}

// Everything the report says about one week, from the daily rates.
export function summarise(rates, week) {
  const prev = { start: addDays(week.start, -7), end: addDays(week.end, -7) };
  const year = { start: addDays(week.end, -364), end: week.end };
  const days = Object.keys(rates).filter((d) => inRange(d, week));
  const prevDays = Object.keys(rates).filter((d) => inRange(d, prev));
  if (!days.length) throw new Error(`No ECB fixings between ${week.start} and ${week.end}`);
  if (!prevDays.length) throw new Error(`No ECB fixings in the week before ${week.start}`);

  const pairs = PAIRS.map((p) => {
    const series = (list) => list.map((date) => ({ date, value: p.of(rates[date]) }));
    const thisWeek = series(days);
    const lastWeek = series(prevDays);
    const yearPoints = series(Object.keys(rates).filter((d) => inRange(d, year)));
    const average = mean(thisWeek.map((x) => x.value));
    const previous = mean(lastWeek.map((x) => x.value));
    return {
      pair: p.pair,
      label: p.label,
      calculated: p.calculated,
      average,
      previous,
      change: average / previous - 1,
      close: thisWeek.at(-1),
      week: extremes(thisWeek),
      year: { ...extremes(yearPoints), from: yearPoints[0].date, days: yearPoints.length },
    };
  });

  return { week, previousWeek: prev, fixings: days.length, missing: 5 - days.length, pairs };
}

export function dailyRows(rates, from, to) {
  return Object.keys(rates).filter((d) => d >= from && d <= to).map((date) => ({
    date,
    ...rates[date],
    ...Object.fromEntries(PAIRS.map((p) => [p.pair, p.of(rates[date])])),
  }));
}
