// Once-off public holidays declared by the President under section 2A of the
// Public Holidays Act 36 of 1994. These cannot be calculated, so each one is
// listed with where it was checked. See docs/HOLIDAY_RULES.md.

export const DECLARED = [
  { date: '2009-04-22', name: 'National and provincial elections', source: 'https://en.wikipedia.org/wiki/Public_holidays_in_South_Africa' },
  { date: '2011-05-18', name: 'Local government elections', source: 'https://en.wikipedia.org/wiki/Public_holidays_in_South_Africa' },
  { date: '2011-12-27', name: 'Declared holiday (Christmas fell on a Sunday)', source: 'https://en.wikipedia.org/wiki/Public_holidays_in_South_Africa' },
  { date: '2014-05-07', name: 'National and provincial elections', source: 'https://en.wikipedia.org/wiki/Public_holidays_in_South_Africa' },
  { date: '2016-08-03', name: 'Local government elections', source: 'https://en.wikipedia.org/wiki/Public_holidays_in_South_Africa' },
  { date: '2016-12-27', name: 'Declared holiday (Christmas fell on a Sunday)', source: 'https://en.wikipedia.org/wiki/Public_holidays_in_South_Africa' },
  { date: '2019-05-08', name: 'National and provincial elections', source: 'https://en.wikipedia.org/wiki/Public_holidays_in_South_Africa' },
  { date: '2021-11-01', name: 'Local government elections', source: 'https://en.wikipedia.org/wiki/Public_holidays_in_South_Africa' },
  { date: '2022-12-27', name: 'Declared holiday (Christmas fell on a Sunday)', source: 'https://en.wikipedia.org/wiki/Public_holidays_in_South_Africa' },
  { date: '2023-12-15', name: 'Rugby World Cup celebration', source: 'https://sanews.gov.za/node/66156' },
  { date: '2024-05-29', name: 'National and provincial elections', source: 'https://cliffedekkerhofmeyr.com/news/publications/2024/Practice/Employment/employment-law-alert-4-march-2024-29-may-2024-declared-a-public-holiday-for-the-elections.' },
  { date: '2026-11-04', name: 'Local government elections', source: 'https://thepresidency.gov.za/president-ramaphosa-declares-election-day-4-november-2026-public-holiday' },
];

// The years the declared list above has been checked for. Outside this range the
// statutory holidays are still right, but a declared day could be missing.
export const VERIFIED_FROM = 2009;
export const VERIFIED_TO = 2026;
