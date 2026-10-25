# The sample data

[data/sample/requests.csv](../data/sample/requests.csv) is made by [scripts/make-sample.js](../scripts/make-sample.js). Everything in it is invented: a made-up service desk with no people in it, not even made-up ones. No names, contact details or free text exist in any column. The same seed always produces the same file, and a test fails if the committed CSV ever drifts from what the generator makes.

## Columns

| Column | Meaning |
|---|---|
| `request_id` | `R00001` onwards |
| `opened_on` | Date opened, `YYYY-MM-DD` |
| `closed_on` | Date closed; empty if still open on 31 Dec 2025 |
| `channel` | Email, Web form or Phone. Only the web form takes requests on weekends and holidays. |
| `category` | Account change, Billing query, Document request, Refund or Complaint |
| `target_working_days` | The category's target: 2, 3 or 5 working days |

## How it is generated

- Every day from 1 Jan 2023 to 31 Dec 2025 gets a Poisson number of requests: about 7 on a working day, scaled by month (January busy, December quiet), and a few web-form requests on closed days.
- Each request is given a category, then an amount of work in **working days** drawn from that category's spread. About 4% of requests are slowed by 3–8 extra days (waiting on someone else).
- The closing date is that many working days after opening, worked out with the library. A request opened on a closed day takes at least one working day.

Because the work is counted in working days, public holidays never make the desk slower. Any holiday effect the analysis finds comes from how turnaround is measured.

## What was planted

| Planted | Expected in the analysis | Found |
|---|---|---|
| From 1 July 2025, refunds need a second sign-off: 1–3 extra working days | Refund late rate jumps in 2025 Q3 and stays up; no other category moves | Refunds 16% late in Q2 2025, then 55% and 57%. Checked by `tests/sql.test.js`. |
| Nothing about holidays | Calendar measure inflated in holiday months only | Biggest gaps in December 2024, April 2023, April 2025 and March 2024 (Easter was 31 March in 2024) |

The second row matters: the holiday effect was not put into the data. It comes from the calendar alone.
