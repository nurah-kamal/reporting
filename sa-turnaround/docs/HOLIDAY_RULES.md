# Holiday rules

How [src/holidays.js](../src/holidays.js) decides what is a public holiday, and where each rule comes from. Last checked 25 October 2026.

## Statutory holidays

Schedule 1 of the Public Holidays Act 36 of 1994, in force from 1995:

| Date | Holiday |
|---|---|
| 1 January | New Year's Day |
| 21 March | Human Rights Day |
| Friday before Easter Sunday | Good Friday |
| Monday after Easter Sunday | Family Day |
| 27 April | Freedom Day |
| 1 May | Workers' Day |
| 16 June | Youth Day |
| 9 August | National Women's Day |
| 24 September | Heritage Day |
| 16 December | Day of Reconciliation |
| 25 December | Christmas Day |
| 26 December | Day of Goodwill |

Easter is worked out with the anonymous Gregorian algorithm. The tests check it against published dates for 2011–2027 and 2038.

## The Sunday rule

Section 2(1): when a public holiday falls on a Sunday, the Monday after it is a public holiday. The library marks these as `sunday-rule`, for example `National Women's Day (observed)` on 10 August 2026.

The Act does not chain the rule. When Christmas Day is a Sunday, the Monday is already the Day of Goodwill, so the rule adds nothing. In 2011, 2016 and 2022 the President declared Tuesday 27 December a holiday instead. Those days are in the declared list below, not worked out by the code.

## Two holidays on one day

Easter can land on a fixed holiday. In 2008 Good Friday was 21 March, Human Rights Day. It was still one day off, so the library gives that date one entry with both names. The tests check 1995–2100 for duplicate dates.

## Declared days

Section 2A lets the President declare a once-off public holiday in the Government Gazette. These cannot be worked out, so each one is listed in [src/declared.js](../src/declared.js) with the page it was checked against:

| Date | Why | Checked against |
|---|---|---|
| 22 Apr 2009 | National and provincial elections | [Wikipedia](https://en.wikipedia.org/wiki/Public_holidays_in_South_Africa) |
| 18 May 2011 | Local government elections | Wikipedia |
| 27 Dec 2011 | Christmas fell on a Sunday | Wikipedia |
| 7 May 2014 | National and provincial elections | Wikipedia |
| 3 Aug 2016 | Local government elections | Wikipedia |
| 27 Dec 2016 | Christmas fell on a Sunday | Wikipedia |
| 8 May 2019 | National and provincial elections | Wikipedia |
| 1 Nov 2021 | Local government elections | Wikipedia |
| 27 Dec 2022 | Christmas fell on a Sunday | Wikipedia |
| 15 Dec 2023 | Rugby World Cup celebration | [SAnews](https://sanews.gov.za/node/66156) |
| 29 May 2024 | National and provincial elections | [Cliffe Dekker Hofmeyr](https://cliffedekkerhofmeyr.com/news/publications/2024/Practice/Employment/employment-law-alert-4-march-2024-29-may-2024-declared-a-public-holiday-for-the-elections.) |
| 4 Nov 2026 | Local government elections | [The Presidency](https://thepresidency.gov.za/president-ramaphosa-declares-election-day-4-november-2026-public-holiday) (Proclamation Notice 346 of 2026) |

The list is checked for 2009–2026 (`VERIFIED_FROM` and `VERIFIED_TO`). Outside those years the statutory holidays are still right, but a declared day could be missing. The calculator says so when a date falls outside the range.

### Still to confirm

- The older entries are checked against Wikipedia only. Each should be confirmed against its Government Gazette notice.
- On 25 October 2026, [gov.za's public holidays page](https://www.gov.za/about-sa/public-holidays) did not yet show 4 November 2026, although the Presidency had declared it. That is a good example of why the source is checked rather than trusted.

## Adding a new declared day

1. Add it to `DECLARED` in [src/declared.js](../src/declared.js) with its source.
2. Move `VERIFIED_TO` forward if a whole new year has been checked.
3. Add a test in [tests/holidays.test.js](../tests/holidays.test.js), then run `npm test`.
