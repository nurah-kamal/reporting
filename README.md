# Reporting and BI

**Reporting and BI projects: reports people can trust, boards that say what their figures do not prove, and dashboards.** Each project lives in its own folder with its own README, tests and live page.

**Live pages:** https://nurah-kamal.github.io/reporting-and-bi/

| Project | What it is | Live | Built with |
| --- | --- | --- | --- |
| [SA Turnaround](sa-turnaround/) | Counting calendar days blamed a service desk for public holidays. A tested South African working-day library, SQL analysis of three years of synthetic requests, and a one-page report with a calculator. | [Open](https://nurah-kamal.github.io/reporting-and-bi/sa-turnaround/) | JavaScript, SQLite |
| [Plain Board](plain-board/) | A small internal reporting board where every figure says what it does not prove. Twelve pages, every chart drawn in SVG, no framework. | [Open](https://nurah-kamal.github.io/reporting-and-bi/plain-board/) | HTML, CSS, JavaScript |
| [Tableau](tableau/) | Three Tableau dashboards: South African HR on synthetic data, data science salaries, and sales performance. | [Tableau Public](https://public.tableau.com/app/profile/nurah.kamal/vizzes) | Tableau |

More projects join as they ship: Report Checker, a Power BI model and a scheduled report pipeline.

## How this repo is organised

- **One folder per project.** Each folder stands on its own: you can read, run and test it without the others.
- **Each project has its own checks.** `.github/workflows/<project>.yml` runs only when that project's folder changes, so one project can't turn another red.
- **One Pages site.** `pages.yml` builds every project that has a page into https://nurah-kamal.github.io/reporting-and-bi/, with `site-index/` as the front page.
- **History came with the projects.** Each one was moved in from its own repo with its commits kept.

## Data

Everything here runs on invented or public data. Where a project comes from work I do professionally, it was rebuilt from scratch on synthetic data, and no work code or data is in this repository.

## Licence

MIT.
