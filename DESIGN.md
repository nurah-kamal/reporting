# Design

The page's visual system, as built in `site/assets/styles.css` (25 Oct 2026). It is a working tool in the same pink and plum as [SA Turnaround](https://github.com/nurah-kamal/sa-turnaround), and it reads like a report someone has checked with a pen: the wrong figure is struck through and the right one is written beside it.

## Tokens

The ground, text and brand tokens are SA Turnaround's, unchanged, so the two projects look like one portfolio.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | #fff7fa | #160c12 | Page ground |
| `--surface` | #ffffff | #1c1016 | Panels, file slots, the report table |
| `--sunk` | #fdf0f5 | #24151d | Table heads, rule rows, the working panel, sample buttons |
| `--text` | #2b1520 | #f6e6ee | Body text |
| `--muted` | #6b4657 | #c9a5b6 | Secondary text, a struck figure |
| `--plum` | #5a2e42 | #f4bfd0 | Headings, links, the selected chip and tab, the source's figure where the report is wrong |
| `--pink` / `--pink-2` / `--pink-3` | #f9d5e5 / #f4bfd0 / #efa9bf | #3a2230 / #4a2b3c / #6a3d55 | Selected figure, hover, the dashed file slot and the line above a total |
| `--border` / `--grid` | #f0d8e2 / #f3e3ea | #36202c / #2b1922 | Hairlines |
| `--late` | #a3285c | #f08bb5 | The strike, the report's figure in the working panel, "doesn't match" marks |
| `--ok` | #3f7a5a | #8fd1ab | Ticks and "matches" marks |
| `--tag` / `--tag-text` | #f9d5e5 / #5a2e42 | #3a2230 / #f9d5e5 | The reason tag under a wrong figure |

Colour never carries a verdict alone: a match has a tick, a mismatch has a strike, a cross and a reason in words.

## The checker's marks

- **A wrong figure** keeps its place in the report. The report's number is muted with a 2px line through it in `--late`; the source's number sits to its right in bold `--plum`, the same colour in every view; the reason tag sits underneath.
- **A right figure** gets a small tick in `--ok`, so a reader can see it was checked rather than skipped.
- **A total row** has a 1.5px `--pink-3` line above it, the way a printed report rules off its total.
- **The selected figure** fills its cell with `--pink`, and its working opens below the table on `--sunk`.
- **Reason chips** are pills with a coloured dot; the selected one turns solid plum. On phones they sit in one row that scrolls sideways inside itself.

## Type and shape

- System UI stack for everything, and a monospace face for `code` only. Tabular numerals in every number.
- Sizes: h1 is fluid from 2rem to 3.25rem at -0.03em; the verdict from 1.5rem to 2rem; panel headings 1.25rem; body 1rem; small text 0.8125rem; nothing under 12px.
- One radius of 12px for panels, 10px for buttons and rule rows, 8px for inputs and tables, and full pills for chips and tags. One soft two-layer shadow for elevation; panels have no border.

## Motion

There is one moment: when results land, each wrong figure's strike draws from left to right, 420ms on `cubic-bezier(.22, 1, .36, 1)`, staggered 45ms per figure. Under reduced motion the strikes are simply there. The working panel rises 6px as it opens (260ms), and hover states change colour in 160ms.

## Layout

- Desktop: the claim on the left and the samples on the right, then the two file slots side by side, the rules, and the results full width.
- Below 960px: one column, with the samples straight after the claim. Rule rows fold to two columns and the "Every figure" lines become small cards.
- Below 720px: the file slots stack, and the nav keeps only the code link.
- Below 480px: 16px side gutters, 44px tap targets on every control, a smaller lede so the samples start sooner, and the marked report turns from a table into one block per report row, with each figure on its own labelled line (label left, figure and reason tag right). Wider screens keep the table, which scrolls sideways inside its frame with the first column held in place.

The page has no horizontal scroll at 375px (checked in the browser, 25 Oct 2026), and the design detector reports nothing on `site/`.
