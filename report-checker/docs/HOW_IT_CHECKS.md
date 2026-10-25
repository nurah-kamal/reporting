# How it checks

What the checker does with a report, a source and the rules that join them, as built in [src/check.js](../src/check.js) (25 Oct 2026). Every rule here is covered by a test in [tests/check.test.js](../tests/check.test.js) or [tests/samples.test.js](../tests/samples.test.js).

## Reading the two files

- **CSV:** comma, semicolon or tab separated, with quoted fields, doubled quotes, line breaks inside quotes and a byte-order mark all handled ([src/csv.js](../src/csv.js)).
- **Excel (.xlsx):** the first sheet with a header row. Cells come back as Excel shows them, so number formats, percentages and dates read the way they print ([src/xlsx.js](../src/xlsx.js)).
- **The header** is the first row with two or more filled cells, so a title row above the table is skipped. Empty rows are dropped.
- **Figures** are read the way reports print them: `1,284`, `1 284`, `R 12 450`, `80.6%`, `80,6`, `(1 200)`. The number of decimals shown is kept, because that is the precision the figure is checked at ([src/numbers.js](../src/numbers.js)).

## The rules (the recipe)

| Part | What it says | Example |
| --- | --- | --- |
| `keys` | Which report column pairs with which source column, read as its value or as the month of a date | Month ↔ `ordered_on` as a month; Region ↔ `region` |
| `id` | A source column that identifies a row, used to spot rows that appear twice | `order_id` |
| `filters` | Rows the report is meant to leave out | `status` is Refunded |
| `measures` | What each figure column is: count rows, sum, average, share of rows where a column has a value, or number of different values | Average order (R) = average of `amount` |

A report row whose first key reads "Total", "Grand total", "All" or "Overall" is a total over every source row its other keys allow.

## Recalculating a figure

1. Take the source rows whose keys match the report row.
2. Drop any row whose `id` already appeared (the first one counts).
3. Drop the rows the filters leave out.
4. Work out the measure on what is left.
5. Round that to the decimals the report shows. If it equals the report's figure, the figure matches.

Rounding is half away from zero, with a tiny nudge so that values stored as 0.28499… still round to 0.29.

## Finding the cause of a mismatch

Each test below changes the rows in one way and recalculates. The first one that reproduces the report's figure exactly, at the report's precision, is the cause. They run in this order:

| Order | Cause | The change that reproduces the figure |
| --- | --- | --- |
| 1 | **Duplicate rows** | Count the rows whose `id` already appeared |
| 2 | **Different filter** | Keep the rows one filter leaves out |
| 3 | **Stale extract** | Only for the newest month (or for a report with no month): drop every row after a cut-off date. The latest cut-off that works is used, and when several figures are stale, one cut-off that explains them all is preferred |
| 4 | **Different date range** | For a month row: move the start or end of the month by up to three days, smallest move first; or put rows in months by a different date column |
| 5 | **Rounding** | No change: the source is within one step of the shown precision but doesn't round to it |
| 6 | **Different filter** | Leave out one value of a column with 2 to 30 values (not dates, not numbers) |
| 7 | **Rows lost in a join** | Drop the rows where some column is blank |
| – | **No single cause found** | Nothing above reproduced it. Check this one by hand |

The order puts the most specific evidence first. Duplicates and the report's own filters come straight from the data and the rules. A cut-off or a shifted date range has more freedom to fit, and leaving out "some category" has the most, so those come later. Rounding comes before the category test because leaving out one category out of many can land near a figure by chance.

## Totals

A total row is checked in this order:

1. **Total doesn't add up.** For counts and sums, add the report's own rows. If they don't make the total, that is the cause. Counts must add exactly; sums of rounded figures may drift by half a step per row.
2. **Rows lost in a join.** Rebuild the total from the rows each report row used (the explained rows where a row was wrong, the right rows otherwise). If that reproduces the total, and some source rows belong to no report row (a blank key, or a value the report doesn't list), the total has lost them.
3. **Carried from the rows above.** The rebuilt total reproduces the figure and every source row is covered: the total is right about its rows, and their mistakes are its only problem.
4. Otherwise the row tests above run on the total's rows.

## What it can't tell

- A named cause is the simplest single change that reproduces the figure. It makes the cause likely, not certain.
- Two mistakes in one figure, a calculation outside the five it offers, or a report laid out with groups across the columns all show as "no single cause found".
- It can only find what the source still shows. If the source extract itself is wrong, the report can agree with it and still be wrong.
