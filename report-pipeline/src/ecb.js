import { parseCsv } from './csv.js';

// Euro foreign exchange reference rates from the ECB's data API: units of
// each currency per euro, one fixing per TARGET working day.
export const CURRENCIES = ['ZAR', 'USD', 'GBP'];
export const sourceUrl = (start, end) =>
  `https://data-api.ecb.europa.eu/service/data/EXR/D.${CURRENCIES.join('+')}.EUR.SP00.A?startPeriod=${start}&endPeriod=${end}&format=csvdata`;

export async function fetchRates(start, end, fetchImpl = fetch) {
  const res = await fetchImpl(sourceUrl(start, end), { headers: { Accept: 'text/csv' } });
  if (!res.ok) throw new Error(`ECB data API returned ${res.status}`);
  return parseRates(await res.text());
}

// { '2026-10-23': { ZAR: 20.1, USD: 1.08, GBP: 0.84 }, ... }, only days where
// all three currencies were fixed.
export function parseRates(csv) {
  const byDay = new Map();
  for (const row of parseCsv(csv)) {
    if (!CURRENCIES.includes(row.CURRENCY) || row.CURRENCY_DENOM !== 'EUR' || row.OBS_VALUE === '') continue;
    const day = byDay.get(row.TIME_PERIOD) ?? {};
    day[row.CURRENCY] = Number(row.OBS_VALUE);
    byDay.set(row.TIME_PERIOD, day);
  }
  return Object.fromEntries([...byDay].filter(([, d]) => CURRENCIES.every((c) => typeof d[c] === 'number')).sort(([a], [b]) => a.localeCompare(b)));
}
