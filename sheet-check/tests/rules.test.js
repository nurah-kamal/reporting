import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load.js';

const { parseRules, checkValues, rowsFromJson, columnLetter, ref } = load(['Rules.gs']);

const header = ['Invoice', 'Date', 'Amount', 'Region'];
const rows = (...r) => [header, ...r];
const day = (y, m, d) => new Date(y, m - 1, d);
const check = (ruleRows, values, cells = {}) =>
  checkValues(parseRules([['sheet', '', 'Data'], ...ruleRows], 'Rules'), values, (a1) => cells[a1]);
const plain = (x) => JSON.parse(JSON.stringify(x));

test('a clean sheet has no failures', () => {
  const failures = check(
    [
      ['required', 'Invoice'],
      ['type', 'Date', 'date'],
      ['type', 'Amount', 'number'],
      ['not blank', 'Invoice'],
      ['unique', 'Invoice'],
      ['total', 'Amount', 'Summary!B2'],
    ],
    rows(['A-1', day(2026, 9, 1), 10.5, 'North'], ['A-2', day(2026, 9, 2), 4, 'South']),
    { 'Summary!B2': 14.5 },
  );
  assert.deepEqual(plain(failures), []);
});

test('a missing required column is reported once, against the header row', () => {
  const failures = check([['required', 'VAT'], ['type', 'VAT', 'number']], rows(['A-1', '', 1, 'North']));
  assert.deepEqual(plain(failures), [
    {
      rule: 'required: VAT',
      cell: 'Data!A1:D1',
      value: 'Invoice, Date, Amount, Region',
      message: 'There is no column called VAT.',
    },
  ]);
});

test('column names match without regard to case or spaces', () => {
  const failures = check([['required', ' invoice '], ['not blank', 'AMOUNT']], rows(['A-1', '', 1, '']));
  assert.deepEqual(plain(failures), []);
});

test('a rule on a column that is not required and not there is reported', () => {
  const failures = check([['unique', 'Customer']], rows(['A-1', '', 1, 'North']));
  assert.equal(failures.length, 1);
  assert.equal(failures[0].cell, 'Rules!A3');
});

test('types: number, whole number, date, text and yes/no', () => {
  const values = [
    ['N', 'W', 'D', 'T', 'Y'],
    [1.5, 2, day(2026, 1, 1), 'x', true],
    ['1,5', 2.5, '2026-02-30', 3, 'yes'],
  ];
  const config = parseRules(
    [
      ['sheet', '', 'S'],
      ['type', 'N', 'number'],
      ['type', 'W', 'whole number'],
      ['type', 'D', 'date'],
      ['type', 'T', 'text'],
      ['type', 'Y', 'Yes/No'],
    ],
    'Rules',
  );
  const failures = checkValues(config, values, () => undefined);
  assert.deepEqual(
    plain(failures.map((f) => [f.cell, f.value, f.message])),
    [
      ['S!A3', '1,5', 'Expected a number, found text "1,5".'],
      ['S!B3', '2.5', 'Expected a whole number, found a number.'],
      ['S!C3', '2026-02-30', 'Expected a date, found text "2026-02-30".'],
      ['S!D3', '3', 'Expected text, found a number.'],
      ['S!E3', 'yes', 'Expected yes/no, found text "yes".'],
    ],
  );
});

test('type checks leave blanks to the not-blank rule', () => {
  const failures = check([['type', 'Amount', 'number'], ['not blank', 'Amount']], rows(['A-1', '', '  ', 'North']));
  assert.deepEqual(
    plain(failures.map((f) => f.rule)),
    ['not blank: Amount'],
  );
});

test('unique reports each repeat, pointing back to the first', () => {
  const failures = check(
    [['unique', 'Invoice']],
    rows(['A-1', '', 1, ''], ['A-2', '', 1, ''], ['A-1', '', 1, ''], ['', '', 1, ''], ['', '', 1, '']),
  );
  assert.deepEqual(
    plain(failures.map((f) => [f.cell, f.message])),
    [['Data!A4', 'Already used in row 2.']],
  );
});

test('a total matches to within half a cent and can be filtered', () => {
  const values = rows(
    ['A-1', '', 10.1, 'North'],
    ['A-2', '', 20.2, 'South'],
    ['A-3', '', 'n/a', 'North'],
    ['A-4', '', 5, 'north'],
  );
  const failures = check(
    [
      ['total', 'Amount', 'Summary!B2', 'Region = North'],
      ['total', 'Amount', 'Summary!B3', 'Region = South'],
      ['total', 'Amount', 'Summary!B4'],
    ],
    values,
    { 'Summary!B2': 15.104, 'Summary!B3': 20, 'Summary!B4': 35.3 },
  );
  assert.deepEqual(plain(failures), [
    {
      rule: 'total: Amount matches Summary!B3 (Region = South)',
      cell: 'Summary!B3',
      value: '20',
      message: 'Amount for Region = South adds up to 20.20, which is 0.20 more than this cell.',
    },
  ]);
});

test('a total against a missing cell or a non-number says so', () => {
  const failures = check(
    [['total', 'Amount', 'Nowhere!Z9'], ['total', 'Amount', 'Summary!B2']],
    rows(['A-1', '', 1, '']),
    { 'Summary!B2': 'one' },
  );
  assert.deepEqual(
    plain(failures.map((f) => f.message)),
    ['There is no cell Nowhere!Z9.', 'Expected a number to compare with, found text "one".'],
  );
});

test('mistakes in the rules themselves are reported against the Rules tab', () => {
  const config = parseRules(
    [
      ['sheet', '', 'Data'],
      ['unique'],
      ['shape', 'Amount'],
      ['type', 'Amount', 'money'],
      ['total', 'Amount'],
      ['total', 'Amount', 'S!B2', 'Region'],
      ['', '', '', ''],
    ],
    'Rules',
  );
  assert.deepEqual(
    plain(config.problems.map((p) => p.cell)),
    ['Rules!A3', 'Rules!A4', 'Rules!A5', 'Rules!A6', 'Rules!A7'],
  );
  assert.equal(config.rules.length, 0);
});

test('no sheet rule, or a sheet that does not exist, is a failure', () => {
  const noSheetRule = checkValues(parseRules([['unique', 'A']], 'Rules'), null, () => undefined);
  assert.equal(noSheetRule[0].message, 'No "sheet" rule, so there is nothing to check.');
  assert.equal(check([['unique', 'A']], null)[0].message, 'There is no sheet called Data.');
});

test('rules can come from a script property as JSON', () => {
  const json = JSON.stringify([
    { rule: 'sheet', setting: 'Data' },
    { rule: 'not blank', column: 'Region' },
  ]);
  const config = parseRules(rowsFromJson(json), 'SHEET_CHECK_RULES');
  const failures = checkValues(config, rows(['A-1', '', 1, '']), () => undefined);
  assert.deepEqual(
    plain(failures.map((f) => f.cell)),
    ['Data!D2'],
  );
});

test('cell references handle long columns and sheet names with spaces', () => {
  assert.deepEqual(plain([0, 25, 26, 51, 52, 701, 702].map(columnLetter)), ['A', 'Z', 'AA', 'AZ', 'BA', 'ZZ', 'AAA']);
  assert.equal(ref('Sales 2026', 'B2'), "'Sales 2026'!B2");
  assert.equal(ref("Q3's", 'B2'), "'Q3''s'!B2");
});
