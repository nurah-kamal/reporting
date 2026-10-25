# SA Turnaround

Working days for South Africa, and what they change about turnaround reporting. This is a tested library that knows every South African public holiday, including the Sunday rule and the once-off declared days. It comes with three years of synthetic service-desk requests, SQL that measures them in calendar days and in working days, and a one-page report with a working-day calculator.

**The finding:** counting calendar days marked 1,183 requests late. 283 of those were on time once public holidays are counted, and 160 real delays were missed. Measured in working days, one real problem is left: refunds since July 2025. Details are in [docs/FINDINGS.md](docs/FINDINGS.md).

## Current status

- Library, sample data, SQL analysis and report page are all working, with 21 tests passing.
- Public holidays are correct from 1995; declared days are verified for 2009–2026 ([docs/HOLIDAY_RULES.md](docs/HOLIDAY_RULES.md)).
- The report page is not hosted yet. It goes on GitHub Pages once the repository is public ([TODO.md](TODO.md)).

## Run locally

Needs Node 22.13 or later. There is nothing to install: SQLite and the test runner are built into Node.

```sh
npm run build     # writes dist/ (page, library, data/report.json)
npm run serve     # http://localhost:4173
```

`npm run sample` remakes `data/sample/requests.csv` from its fixed seed. The output is identical every time.

## Verification

```sh
npm run check     # every script parses, JSON is valid, doc links resolve
npm test          # holidays, working days, SQL against the library, planted patterns
npm run build
```

The tests check the holiday lists against gov.za for 2026 and 2027, Easter dates against published dates, and the Christmas-on-Sunday years. They also check that the SQL and the JavaScript library agree on all 5,706 closed requests, and that the analysis still finds the pattern planted in the data.

## Architecture

The library ([src/](src/)) is plain ES modules with no dependencies. Dates are `YYYY-MM-DD` strings, and all arithmetic is in UTC, so time zones can't shift a day. The same files run in Node, in the tests, and in the browser calculator.

[scripts/db.js](scripts/db.js) loads a calendar table and the sample CSV into an in-memory SQLite database. The calendar carries a running index of working days, so working days between two dates is a subtraction in SQL ([sql/schema.sql](sql/schema.sql)). Each file in [sql/questions/](sql/questions/) answers one question. [scripts/build-report.js](scripts/build-report.js) runs them all and writes `dist/data/report.json`, which the page reads. Every number on the page comes from that file.

## Using the library

```js
import { workingDaysBetween, addWorkingDays, holidaysFor, isWorkingDay } from './src/index.js';

workingDaysBetween('2025-04-17', '2025-04-29'); // 5 (12 calendar days)
addWorkingDays('2026-12-24', 3);                // '2026-12-30'
holidaysFor(2026).map((h) => h.date);           // 14 dates, including 2026-11-04
```

`workingDaysBetween(start, end)` counts the working days after `start`, up to and including `end`: same day is 0, Friday to Monday is 1.

## Scope

- **In:** national public holidays, weekends, the Sunday rule, declared days.
- **Out:** provincial or company-specific days off, part days, time of day.

## Data and privacy

All data is synthetic and holds no person, not even a made-up one ([docs/DATA.md](docs/DATA.md)). The idea comes from reporting work I do professionally. It was rebuilt from scratch on invented data, and no work code or data is in this repository.
