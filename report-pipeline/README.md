# report-pipeline

[![report-pipeline](https://github.com/nurah-kamal/reporting/actions/workflows/report-pipeline.yml/badge.svg?branch=main&event=push)](https://github.com/nurah-kamal/reporting/actions/workflows/report-pipeline.yml) 8 tests

**A weekly report that writes itself. Every Monday morning a GitHub Actions job pulls the European Central Bank's reference rates, works out how the rand did against the euro, the dollar and the pound, and commits a dated Excel workbook and a summary to [outputs/](outputs/). Nobody has to remember to run it, and every past week stays in the repository.**

The latest summary, from [outputs/latest.md](outputs/latest.md):

| | This week | Week before | Change | The rand was | Friday | Week range | 52-week range |
| --- | ---: | ---: | ---: | --- | ---: | --- | --- |
| Rand per euro | 18.4801 | 18.4877 | -0.04% | about the same | 18.5777 | 18.3930 to 18.5777 | 18.3930 (2026-10-21) to 20.1215 (2025-10-24) |
| Rand per US dollar (calculated) | 16.4790 | 16.4996 | -0.13% | stronger | 16.5976 | 16.3726 to 16.5976 | 15.6738 (2026-01-29) to 17.4698 (2025-11-04) |
| Rand per pound (calculated) | 22.0235 | 21.8884 | +0.62% | weaker | 22.1882 | 21.9071 to 22.1882 | 21.4480 (2026-02-25) to 23.0592 (2025-10-24) |

That is the week of 19 to 23 October 2026. On 21 October the rand was at its strongest against the euro in the 52 weeks shown.

## What it shows

| | |
| --- | --- |
| **The workbook** | `outputs/rand-week-ending-<friday>.xlsx`, with three sheets. **Summary** has the week's average, the week before, the change, the Friday close, and the week's and the year's highs and lows with their dates. **Daily** has a year of rates, newest first, with the ECB's figures unchanged beside the calculated ones. **Source** says where the data came from, when, and what a reference rate is and isn't. |
| **The summary** | The same Summary table as Markdown, so it reads on GitHub without opening Excel, plus `latest.md` for the newest week. |
| **The schedule** | Mondays at 07:00 South African time. It reports on the last full Monday-to-Friday week, so a run on any day of the following week gives the same report. |

## The part worth copying

- **Only one job can write, and only when it has to.** The workflow defaults to `contents: read`. The scheduled job alone gets `contents: write`, and it pushes with the job's own short-lived token, passed on the command line. The checkout never stores the token.
- **Running it twice changes nothing.** A week that already has a workbook is skipped, so a re-run, a manual run or a retry can't make duplicates or overwrite history.
- **The tests run before the report.** The scheduled job runs the full test suite first. A broken change stops the report rather than publishing a wrong one.
- **The source data stays as published.** The ECB allows reuse provided the source is quoted and the statistics are left unchanged. Rand per euro is the ECB's own figure. Rand per dollar and per pound are calculated, and they're labelled "calculated" wherever they appear.
- **A missing day is shown, not filled in.** There is no fixing on TARGET holidays, so a week can have fewer than five rates. The summary says how many there were, and nothing is interpolated.

## How it is built

| | |
| --- | --- |
| **Fetch** | `src/ecb.js` asks the ECB data API for daily ZAR, USD and GBP rates against the euro, as CSV, for a year and a week back from the report's Friday. Only days with all three currencies fixed are used. |
| **Transform** | `src/transform.js`: rand per euro as published, rand per dollar and per pound as rand-per-euro divided by dollars or pounds per euro, then weekly averages, change, closes, ranges and 52-week extremes. |
| **Render** | `src/render.js` writes the workbook with [ExcelJS](https://github.com/exceljs/exceljs) (formatted numbers, frozen headers) and the Markdown summary. |
| **Week** | `src/week.js`: the last full Monday-to-Friday before the run day, in UTC. |
| **Tests** | 8 tests against a saved copy of the ECB file: the week rule (including a Friday and a year end), keeping only complete days, the averages and cross rates worked by hand, a holiday week with 3 fixings, no data, an API failure, and a full run, read back from the workbook, then run again to confirm it does nothing. |
| **CI** | `.github/workflows/report-pipeline.yml` in the repository root. On a push that changes this folder it runs the dependency audit and the tests. On the schedule, or by hand, it builds and commits the report. Actions are pinned to exact commits. |
| **Dependencies** | One: ExcelJS 4.4.0. Its old `uuid` dependency had a moderate advisory, so `package.json` overrides it to the fixed 11.1.1, and `npm audit` reports nothing. |

## Try it on your own machine

Node 22.13 or later.

```bash
cd report-pipeline
npm ci
npm test
npm run report -- --out my-outputs                          # last week, live from the ECB
npm run report -- --today 2026-10-26 --out my-outputs \
  --rates tests/fixtures/ecb-2025-10-17-to-2026-10-23.csv   # the published week, offline
```

## The data

| | |
| --- | --- |
| **Source** | European Central Bank, euro foreign exchange reference rates (series EXR.D.ZAR/USD/GBP.EUR.SP00.A), from data-api.ecb.europa.eu. |
| **Terms** | ECB statistics "may be reused free of charge on the condition that the source is quoted", for commercial or non-commercial use, and the statistics must stay unchanged. Every output says "Source: ECB statistics." |
| **What a reference rate is** | One rate a day, set around 14:15 Central European Time and published for information. It isn't a rate you could trade at, and it says nothing about movement during the day. |
| **Saved copy** | `tests/fixtures/` holds the ECB file for 17 October 2025 to 23 October 2026, unchanged except that unused columns are dropped, so the tests run without the network. |

No person is in the data.

## Things worth knowing

**The first report was run by hand.** The week ending 23 October 2026 was built on 25 October to start the series. From then on the Monday job adds one a week.

**A scheduled workflow can pause.** GitHub stops schedules in a repository with no activity for 60 days. The commit the job makes each week counts as activity, but if a run fails for long enough, the schedule needs re-enabling in the Actions tab.

**Change is measured on weekly averages.** A week-on-week change in averages moves less than Friday-to-Friday. Both are in the workbook; the headline uses averages because one day's fixing can be unusual.

**The idea comes from scheduled reporting I do professionally.** It was rebuilt from scratch on public data, and no work code or data is in this folder.

## Folders

```
bin/run.js        the command: fetch, transform, write, skip a week already done
src/ecb.js        the ECB data API
src/transform.js  cross rates, averages, ranges
src/render.js     the workbook and the Markdown summary
src/week.js       which week to report
outputs/          one workbook and one summary per week, and latest.md
tests/            8 tests and the saved ECB file
```

## Licence

MIT, in the [repository root](../LICENSE). The rates are ECB statistics, reused under the ECB's terms above.
