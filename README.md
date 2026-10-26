# Reporting

**Reports people can trust: the numbers checked against their source, and boards that say what their figures do not prove.** Each project lives in its own folder with its own README, tests and live page.

**Live pages:** https://nurah-kamal.github.io/reporting/

| Project | What it is | Live | Built with |
| --- | --- | --- | --- |
| [SA Turnaround](sa-turnaround/)<br>[![sa-turnaround](https://github.com/nurah-kamal/reporting/actions/workflows/sa-turnaround.yml/badge.svg?branch=main&event=push)](https://github.com/nurah-kamal/reporting/actions/workflows/sa-turnaround.yml) 21 tests | Counting calendar days blamed a service desk for public holidays. A tested South African working-day library, SQL analysis of three years of synthetic requests, and a one-page report with a calculator. | [Open](https://nurah-kamal.github.io/reporting/sa-turnaround/) | JavaScript, SQLite |
| [Report Checker](report-checker/)<br>[![report-checker](https://github.com/nurah-kamal/reporting/actions/workflows/report-checker.yml/badge.svg?branch=main&event=push)](https://github.com/nurah-kamal/reporting/actions/workflows/report-checker.yml) 38 tests | Add a finished report and its source data, and every figure is worked out again from the source, with the likely cause of each one that disagrees. CSV or Excel, all in the browser, tested against 41 planted mistakes. | [Open](https://nurah-kamal.github.io/reporting/report-checker/) | JavaScript |
| [Plain Board](plain-board/) | A small internal reporting board where every figure says what it does not prove. Twelve pages, every chart drawn in SVG, no framework. | [Open](https://nurah-kamal.github.io/reporting/plain-board/) | HTML, CSS, JavaScript |
| [Report Pipeline](report-pipeline/)<br>[![report-pipeline](https://github.com/nurah-kamal/reporting/actions/workflows/report-pipeline.yml/badge.svg?branch=main&event=push)](https://github.com/nurah-kamal/reporting/actions/workflows/report-pipeline.yml) 8 tests | A weekly report that writes itself: every Monday a scheduled job pulls the ECB reference rates and commits a dated Excel workbook on the rand against the euro, dollar and pound. Only that job can write to the repo. | [Latest](report-pipeline/outputs/latest.md) | JavaScript, GitHub Actions, Excel |
| [sheet-check](sheet-check/)<br>[![sheet-check](https://github.com/nurah-kamal/reporting/actions/workflows/sheet-check.yml/badge.svg?branch=main&event=push)](https://github.com/nurah-kamal/reporting/actions/workflows/sheet-check.yml) 20 tests | Checks a Google Sheet against rules kept in a tab of the sheet: required columns, a type per column, no blanks, no repeats, and totals that must agree with a summary. One row per failure in a Validation tab, naming the cell. The template has 7 planted faults and the check finds all 7. | [Template](sheet-check/template/) | Google Apps Script, JavaScript |

More projects join as they ship. Dashboards and BI models are in [business-intelligence](https://github.com/nurah-kamal/business-intelligence).

## How this repo is organised

- **One folder per project.** Each folder stands on its own: you can read, run and test it without the others.
- **Each project has its own checks.** `.github/workflows/<project>.yml` runs only when that project's folder changes, so one project can't turn another red.
- **One Pages site.** `pages.yml` builds every project that has a page into https://nurah-kamal.github.io/reporting/, with `site-index/` as the front page.
- **History came with the projects.** Each one was moved in from its own repo with its commits kept.

The calls behind this layout, and why each was made, are in [DECISIONS.md](DECISIONS.md).

## Data

Everything here runs on invented or public data. Where a project comes from work I do professionally, it was rebuilt from scratch on synthetic data, and no work code or data is in this repository.

## Licence

MIT.
