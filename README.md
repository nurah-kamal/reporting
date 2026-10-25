# Reporting

**Reports people can trust: the numbers checked against their source, and boards that say what their figures do not prove.** Each project lives in its own folder with its own README, tests and live page.

**Live pages:** https://nurah-kamal.github.io/reporting/

| Project | What it is | Live | Built with |
| --- | --- | --- | --- |
| [SA Turnaround](sa-turnaround/) | Counting calendar days blamed a service desk for public holidays. A tested South African working-day library, SQL analysis of three years of synthetic requests, and a one-page report with a calculator. | [Open](https://nurah-kamal.github.io/reporting/sa-turnaround/) | JavaScript, SQLite |
| [Report Checker](report-checker/) | Add a finished report and its source data, and every figure is worked out again from the source, with the likely cause of each one that disagrees. CSV or Excel, all in the browser, tested against 41 planted mistakes. | [Open](https://nurah-kamal.github.io/reporting/report-checker/) | JavaScript |
| [Plain Board](plain-board/) | A small internal reporting board where every figure says what it does not prove. Twelve pages, every chart drawn in SVG, no framework. | [Open](https://nurah-kamal.github.io/reporting/plain-board/) | HTML, CSS, JavaScript |

More projects join as they ship, next a scheduled report pipeline. Dashboards and BI models are in [business-intelligence](https://github.com/nurah-kamal/business-intelligence).

## How this repo is organised

- **One folder per project.** Each folder stands on its own: you can read, run and test it without the others.
- **Each project has its own checks.** `.github/workflows/<project>.yml` runs only when that project's folder changes, so one project can't turn another red.
- **One Pages site.** `pages.yml` builds every project that has a page into https://nurah-kamal.github.io/reporting/, with `site-index/` as the front page.
- **History came with the projects.** Each one was moved in from its own repo with its commits kept.

## Data

Everything here runs on invented or public data. Where a project comes from work I do professionally, it was rebuilt from scratch on synthetic data, and no work code or data is in this repository.

## Licence

MIT.
