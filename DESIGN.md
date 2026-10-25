# Design

The report page's visual system, as built in `site/assets/styles.css` (25 Oct 2026): a plain reporting dashboard in pink and plum.

## Tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | #fff7fa | #160c12 | Page ground |
| `--surface` | #ffffff | #1c1016 | Panels and tiles |
| `--sunk` | #fdf0f5 | #24151d | Inputs, table heads, count boxes |
| `--text` | #2b1520 | #f6e6ee | Body text |
| `--muted` | #6b4657 | #c9a5b6 | Secondary text, axes |
| `--plum` | #5a2e42 | #f4bfd0 | Headline, links, brand |
| `--pink-3` | #efa9bf | #6a3d55 | Holiday cells |
| `--border` / `--grid` | #f0d8e2 / #f3e3ea | #36202c / #2b1922 | Hairlines and gridlines |
| `--s1` | #8c2f5c | #cf6fa0 | The series that matters |
| `--s2` | #df86aa | #8f3e68 | The receding series |
| `--late` / `--ok` | #a3285c / #3f7a5a | #f08bb5 / #8fd1ab | Late and on-time marks (always with an icon) |

`--s1` and `--s2` were checked for colour-blind separation, lightness and chroma against each mode's surface. `--s2` is under 3:1 against the surface, so every chart has direct labels and a "Show the numbers" table.

## Type and shape

- System UI stack for everything, and a monospace face for `code` only. Tabular numerals in every number.
- Sizes: h1 is fluid from 2rem to 3.25rem at -0.03em, panel headings 1.25rem, body 1rem, small text 0.8125rem.
- One radius of 12px for panels and tiles, 8px for inputs and tables. One soft two-layer shadow for elevation, and no borders on panels.

## Charts

Charts are hand-built SVG in `site/assets/charts.js`. Each chart has a headline that states the finding, a source line naming its SQL file, direct labels, a hover tooltip and a data table. There is a single axis per chart, with rounded data ends anchored to the baseline.

## Motion

There is one moment: the calculator's day cells scale in, staggered by 12ms each. Under reduced motion the cells appear without animation.

## Layout

- Desktop: the charts sit in the left column, with the calculator sticky on the right.
- Below 960px: one column, with the calculator directly after the key figures.
- Below 480px: 16px side gutters.

The page has no horizontal scroll at 375px (checked).
