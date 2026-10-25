# Decisions

The calls behind how this repository is built, newest first within each section. Each one says what was decided, why, and when. Where no reason was written down at the time, it says what the choice does instead of inventing one after the fact.

## How the repository is organised

**One repository per field, one folder per project.** *25 October 2026.* Projects used to have a repository each. I didn't want dozens of small repositories, so they're grouped by field: reporting here, dashboards and models in [business-intelligence](https://github.com/nurah-kamal/business-intelligence), modelling in [statistical-modelling](https://github.com/nurah-kamal/statistical-modelling), analysis in [data-analysis](https://github.com/nurah-kamal/data-analysis). Each folder still stands on its own, with its own README, tests and checks.

**Reporting and BI are separate repositories.** *25 October 2026.* This repository started as reporting-and-bi. Reporting and BI tools should be shown separately, so Power BI and Tableau moved, with their history, to business-intelligence, and this one was renamed to reporting. GitHub redirects the old links.

**Projects came in with their history.** *25 October 2026.* Each project was moved in from its own repository with its commits kept, so `git log` on a folder still shows how it was built.

**Each project has its own workflow, filtered to its folder.** *25 October 2026.* `.github/workflows/<project>.yml` runs only when that project's folder changes, so one project can't turn another red. The secret scan is the exception: `secrets.yml` covers the whole repository.

**The working-day library is also an npm package.** *25 October 2026.* [sa-working-days](sa-working-days/) is SA Turnaround's library published on its own, so other people can install it rather than copy it. SA Turnaround keeps its own copy, so its page and its SQL cross-check don't change underneath it.

## Checks

**Actions are pinned to a commit, with the tag in a comment.** *Rule since 17 October 2026.* A tag can be moved to different code; a commit can't. Workflows run with `contents: read` and don't keep the checkout's credentials.

**The secret scan reads the whole history, not just the latest commit.** *Rule since 17 October 2026.* A key deleted in a later commit is still in the history and still has to be rotated, so gitleaks runs with the full history fetched.

## Data and content

**No work code or data.** *25 October 2026.* Projects that come from my work are rebuilt from scratch on invented data. They show what I can do without showing anything I'm not allowed to.

**No people in any data.** *25 October 2026.* Not real people, and not made-up names either. The data has no names, contact details or free text about a person. This keeps every dataset clear of POPIA.

**A figure says what it does not prove.** *Enforced since 26 September 2026.* On Plain Board, every tile has a note with its counting rule and its limit, and the build fails if one is missing.

**SA Turnaround uses plain HTML, CSS and JavaScript with no dependencies.** *25 October 2026.* It's written for people reading on phones, and there's nothing to install before running the build and the tests.

## Writing

**READMEs describe only what is in the repository.** *25 October 2026.* Older READMEs on this profile claimed models, figures and notebooks that didn't exist. Now every figure in a README comes from a run or a file in the folder, and a README with no run yet states no figure.

**Commits are one short line.** *Since 30 September 2026.* Explanations go in the READMEs and docs, not in commit messages.
