# sheet-check

[![sheet-check](https://github.com/nurah-kamal/reporting/actions/workflows/sheet-check.yml/badge.svg?branch=main&event=push)](https://github.com/nurah-kamal/reporting/actions/workflows/sheet-check.yml) 20 tests

**Checks a Google Sheet against rules kept in the sheet itself, before anyone reports from it. Required columns, a type per column, cells that mustn't be blank, values that must be unique, and totals that must agree with a summary. Every failure gets one row in a Validation tab, with the rule, the cell and the value found. The template sheet has 7 planted faults, and the check finds all 7.**

The Validation tab for the template, as the tests produce it:

| Rule | Cell | Value found | What's wrong |
| --- | --- | --- | --- |
| required: VAT | Invoices!A1:F1 | Invoice, Date, Region, Amount, Vat amt, Status | There is no column called VAT. |
| type: Date is date | Invoices!B15 | 2026-02-30 | Expected a date, found text "2026-02-30". |
| type: Amount is number | Invoices!D8 | 6 391,00 | Expected a number, found text "6 391,00". |
| not blank: Invoice | Invoices!A19 | | This cell is blank. |
| not blank: Region | Invoices!C27 | | This cell is blank. |
| unique: Invoice | Invoices!A24 | INV-1012 | Already used in row 13. |
| total: Amount matches Summary!B2 (Region = North) | Summary!B2 | 29220 | Amount for Region = North adds up to 29120.00, which is 100.00 less than this cell. |

When nothing fails, the tab holds a single green row saying how many rules passed and how many rows were checked.

## What it shows

| | |
| --- | --- |
| **Rules** | Six kinds, one per row of a Rules tab: `sheet` (which tab to check), `required`, `type` (number, whole number, date, text, yes/no), `not blank`, `unique`, and `total`, which adds up a column, optionally only where another column has a given value, and compares the sum with a cell. |
| **The template** | Three tabs: 30 invented invoices, a typed-in summary by region, and 16 rules. |
| **Planted faults** | 7: a column heading that doesn't match ("Vat amt" for VAT), a date that doesn't exist, an amount pasted as text with a comma for the decimal point, a missing invoice number, a missing region, a repeated invoice number, and a regional total that is R100 out. |
| **Menu** | A Sheet check menu, added when the sheet opens: Check now, Check every morning, Stop the morning check. |
| **Trigger** | Check every morning installs a time-driven trigger that runs the check daily between 07:00 and 08:00, with nobody needing to open the sheet. Choosing it again replaces the trigger rather than adding a second one. |

## The part worth copying

- **The rules live where the people who own the data can see them.** Adding a check is a new row in the Rules tab, not a code change. A team that doesn't want rules on show can keep the same rules as JSON in a script property instead.
- **Keep the sheet layer thin.** `Rules.gs` has every rule and touches no spreadsheet: it takes values in and gives failures out. `Code.gs` only reads the tabs and writes the result. That split is what makes the rules testable in Node.
- **Point at the cell.** Every failure names the exact cell (`Invoices!B15`), so whoever fixes it goes straight there. A mistake in the rules themselves is reported the same way, against its row in the Rules tab.
- **Report each fault once.** A missing required column is one failure, not one for every rule on that column. Type rules skip blanks, which are the not-blank rule's job.
- **Show the value exactly as found.** The Validation tab is written as plain text, so `2026-02-30` isn't turned back into something else by Sheets.

## How it is built

| | |
| --- | --- |
| **Rules** | [apps-script/Rules.gs](apps-script/Rules.gs): `parseRules` reads the Rules tab into a config and reports rows it can't use; `checkValues` runs the config against a tab's values and returns failures. Column names match without regard to case or surrounding spaces. Totals add only cells that are numbers, as `SUM` does, and agree to within half a cent. |
| **Sheet layer** | [apps-script/Code.gs](apps-script/Code.gs): the `onOpen` menu, `runCheck`, reading the config (Rules tab first, then the `SHEET_CHECK_RULES` script property), and writing the Validation tab with red or green rows and a "last checked" note. |
| **Trigger** | [apps-script/Trigger.gs](apps-script/Trigger.gs): installs and removes the daily time-driven trigger. |
| **Permissions** | [apps-script/appsscript.json](apps-script/appsscript.json) asks for three scopes only: this spreadsheet (not all of the user's Drive), the menu, and managing its own triggers. |
| **Template** | [template/](template/): the three tabs as CSV files, and `sheet-check-template.xlsx` built from them by `npm run template`, typing each cell the way Google Sheets would (numbers, real dates, text). |
| **Tests** | 20 with `node:test`. The `.gs` files are loaded into Node with `vm`, the way Apps Script runs them: as plain scripts sharing one scope. 13 test the rules on their own. One checks that the template gives exactly its 7 faults. Five run `Code.gs` and `Trigger.gs` against a small fake of SpreadsheetApp: the menu, the red rows, the green row once every fault is fixed, the script-property fallback, and the trigger. One reads the workbook back and checks it matches the CSVs cell for cell. |
| **CI** | [.github/workflows/sheet-check.yml](../.github/workflows/sheet-check.yml) in the repository root runs the audit and the tests whenever this folder changes. Actions are pinned to exact commits. |

## Try it on your own machine

The tests need Node 22 or later:

```bash
cd sheet-check
npm ci
npm test
npm run template     # rebuilds template/sheet-check-template.xlsx
```

To run it in Google Sheets, with any Google account:

1. Open [sheets.new](https://sheets.new), then **File → Import → Upload** and choose `template/sheet-check-template.xlsx`. Pick **Replace spreadsheet** and **Import data**.
2. **File → Settings**: set the time zone to (GMT+02:00) Johannesburg, or to the zone in `appsscript.json` if you change it.
3. **Extensions → Apps Script.** Replace the contents of `Code.gs` with [Code.gs](apps-script/Code.gs). Add two script files, `Rules` and `Trigger`, with [Rules.gs](apps-script/Rules.gs) and [Trigger.gs](apps-script/Trigger.gs).
4. Under **Project Settings** (the gear), tick **Show "appsscript.json" manifest file in editor**. Back in the editor, replace `appsscript.json` with [this one](apps-script/appsscript.json). Save.
5. Reload the spreadsheet. A **Sheet check** menu appears. Choose **Check now** and allow the permissions it asks for. If Google warns that the app isn't verified, that's because it's your own unpublished script: choose **Advanced**, then go to the project.
6. A Validation tab appears with 7 red rows. Fix a fault and check again to watch its row go.

## Things worth knowing

**Two kinds of trigger.** `onOpen` is a simple trigger. It runs on its own when the sheet opens, but it can't do anything that needs permission, which is why it only builds the menu. The daily check is an installable trigger. It runs as the person who installed it, even with the sheet closed, so it needs their permission once.

**Dates depend on the locale.** Google Sheets turns typed text into a date only if it reads as one in the spreadsheet's locale, and `2026-02-30` never will. A date column that is all text, which is common after a paste, fails every row of a date rule. That is the point: it would also sort and filter wrongly.

**Totals ignore text, like `SUM`.** The template's typed-in summary leaves out the amount pasted as text, the way a `SUM` would. So that amount is reported once, by its type rule, and the region totals it belongs to still agree. If a text amount was meant to count, fixing its type changes the total, and the total rule then says by how much.

**What the tests can't prove.** They run the real `.gs` files, but against a stand-in for Google's services, so they can't catch a difference in how Google behaves. That part is checked by running the template in Google Sheets.

**The data is invented.** Thirty invoices across four regions, numbered INV-1001 to INV-1030, with no customer names or people in them.

**The idea comes from validation I do professionally.** It was rebuilt from scratch on invented data, and no work code or data is in this folder.

## Folders

```
apps-script/Rules.gs         every rule, with no spreadsheet code
apps-script/Code.gs          menu, reading the sheets, writing the Validation tab
apps-script/Trigger.gs       the daily installable trigger
apps-script/appsscript.json  time zone and the three permissions
template/                    the template's three tabs as CSV, and the .xlsx built from them
scripts/                     the CSV reader and the template builder
tests/                       20 tests and the fake SpreadsheetApp
```

## Licence

MIT, in the [repository root](../LICENSE).
