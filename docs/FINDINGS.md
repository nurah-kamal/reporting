# Findings

All figures come from running [sql/questions](../sql/questions) on the synthetic sample (5,706 closed requests opened 2 Jan 2023 to 31 Dec 2025). `npm run build` reproduces them into `dist/data/report.json`.

## 1. The calendar measure gets it wrong in both directions

From [01_headline.sql](../sql/questions/01_headline.sql):

| | Requests |
|---|---|
| Late by calendar days (target stretched for weekends) | 1,183 |
| Late by working days | 1,060 |
| Marked late by calendar days, on time in working days | 283 (23.9% of the calendar list) |
| Late in working days, missed by calendar days | 160 |

Even after a fair allowance for weekends, about a quarter of the "late" list is public holidays. The stretched target also gives slack to requests that never cross a weekend, so it hides real delays.

## 2. It happens around Easter and Christmas

From [02_late_by_month.sql](../sql/questions/02_late_by_month.sql), the months where the calendar late rate is furthest above the working-day rate:

| Month opened | Calendar | Working days | Gap |
|---|---|---|---|
| Dec 2024 | 35.1% | 15.5% | 19.6 points |
| Apr 2023 | 30.9% | 16.8% | 14.1 points |
| Apr 2025 | 26.4% | 12.9% | 13.5 points |
| Mar 2024 | 29.7% | 19.0% | 10.7 points |

March 2024 is Easter month (Good Friday was 29 March), which shows why "April is bad" is not a rule you can hard-code: it follows the calendar.

## 3. A holiday in the window is what does it

From [04_holiday_exposure.sql](../sql/questions/04_holiday_exposure.sql):

| Weekday holidays between opening and closing | Requests | Late, calendar | Late, working |
|---|---|---|---|
| None | 5,172 | 16.5% | 17.1% |
| One | 399 | 54.1% | 32.1% |
| Two or more | 135 | 85.2% | 37.0% |

With no holiday in the window, the two measures agree. The working-day rate also rises with holidays, because requests that wait longer are more likely to meet one. That is selection, not holidays slowing the work, and the generator confirms it: work is drawn in working days.

## 4. The real problem: refunds since July 2025

From [05_category_by_quarter.sql](../sql/questions/05_category_by_quarter.sql), refunds late in working days were 12–24% each quarter until Q2 2025 (16.1%), then 54.8% in Q3 and 57.1% in Q4. Average turnaround went from about 4.1 to about 6 working days. This is the planted second sign-off ([DATA.md](DATA.md)).

One caution: complaints were 29.7% and 34.2% late in Q2 and Q3 2025, then 16.2% in Q4. With only about 40 complaints a quarter, swings of that size are within normal noise. Refunds stayed up for two quarters, rose from an already-normal level, and moved their average, which is why they are the finding and complaints are not.

## Limits

- The data is synthetic. It shows the method, not any real organisation's performance.
- The calendar measure here is deliberately fair (weekend-stretched). Plain calendar days against the written target would be much worse.
- Declared holidays are verified for 2009–2026 only ([HOLIDAY_RULES.md](HOLIDAY_RULES.md)).
