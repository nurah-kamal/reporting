# The samples

Three invented ops reports, each with its source extract and its planted mistakes, made by [scripts/make-samples.js](../scripts/make-samples.js) from fixed seeds (25 Oct 2026). `npm run samples` makes them again, and a test fails if the committed files drift from what the script makes.

## No person in the data

The rows are enrolments, orders and tickets. Each is identified by a made-up reference (`ENR-26-0412`, `SO-261187`, `TCK-49210`) and described by dates, places, categories and amounts. There are no names, contact details, ID numbers or free text, real or invented, and [tests/samples.test.js](../tests/samples.test.js) fails if a column header ever looks like a name, an email address or a phone number, or if an `@` appears in a source file. Campuses and regions are real South African place names; the college, the shop and the service desk are not real.

## How a sample is made

1. Make the source rows from a seeded random number generator.
2. Work out every figure twice: from the rows the report should use, and from the rows the planted mistake makes it use.
3. Write the second set as the report, and every figure where the two differ into `sample.json` as `planted`, with the cause.
4. The tests then run the checker and require that every planted figure is flagged for that cause, and that every other figure matches.

So a planted mistake that happens not to change a figure (an average that rounds the same either way) isn't listed, and isn't expected to be found.

## Monthly enrolments

`samples/enrolments/`: a college's monthly enrolment summary, January to June 2026, as CSV. 824 source rows.

| Rule | Value |
| --- | --- |
| Rows | Month, from the month of `enrolled_on` |
| Reference | `enrolment_id` |
| Left out | `status` is Cancelled |
| Figures | Enrolments (count), Fees invoiced (R) (sum of `fee`), Completed (share where `status` is Completed) |

| Planted | Figures it changes |
| --- | --- |
| 12 March enrolments imported a second time, at the end of the extract | March: all three |
| Cancelled enrolments kept in for May | May: all three |
| February's completion rate cut off at one decimal instead of rounded | February: Completed |
| The total enrolments typed with two digits swapped | Total: Enrolments |

The fees total and the completion-rate total add up from the rows above, so they carry March's and May's mistakes.

## Sales by region

`samples/sales/`: quarterly sales by month and region, July to September 2026, as an Excel workbook with a title row and number formats. 2,249 source rows.

| Rule | Value |
| --- | --- |
| Rows | Month (from `ordered_on`) and Region (`region`) |
| Reference | `order_id` |
| Left out | `status` is Refunded |
| Figures | Orders (count), Revenue (R) (sum of `amount`), Average order (R) (average of `amount`) |

| Planted | Figures it changes |
| --- | --- |
| September taken from an extract pulled on 27 September, so orders from the 27th to the 30th are missing | September: every region, all three |
| A new store, PLK-01, opened on 17 August with no region yet, so its orders appear under no region and fall out of the total | Total: all three |
| One average order cut off at two decimals instead of rounded | Jul 2026, Western Cape: Average order |

## Support tickets

`samples/tickets/`: a service desk's monthly tickets by channel, July to September 2026, as CSV. 2,497 source rows.

| Rule | Value |
| --- | --- |
| Rows | Month (from `opened_on`) and Channel (`channel`) |
| Reference | `ticket_id` |
| Left out | `category` is Spam |
| Figures | Tickets (count), Resolved in 2 days (share where `resolved_in_2_days` is Yes), First reply (hours) (average of `first_reply_hours`) |

| Planted | Figures it changes |
| --- | --- |
| July counted up to 30 July, as if the end date were "before 31 July" | July: every channel, the figures the missing day changes |
| Spam left in for August chat | Aug 2026, Chat: the figures it changes |
| 11 September email tickets imported a second time | Sep 2026, Email: all three |

The ticket total adds up from the rows above, so it carries their mistakes. The two other totals happen to round to the same value either way, so they match.
