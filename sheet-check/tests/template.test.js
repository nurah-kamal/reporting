import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, sheetValues } from './load.js';

const { parseRules, checkValues } = load(['Rules.gs']);
const plain = (x) => JSON.parse(JSON.stringify(x));

test('the template sheet has exactly its 7 planted faults', () => {
  const config = parseRules(sheetValues('Rules').slice(1), 'Rules');
  const summary = sheetValues('Summary');
  const valueAt = (a1) => {
    const m = /^Summary!B(\d+)$/.exec(a1);
    return m ? summary[Number(m[1]) - 1]?.[1] : undefined;
  };
  const failures = checkValues(config, sheetValues('Invoices'), valueAt);
  assert.equal(config.rules.length, 16);
  assert.deepEqual(
    plain(failures.map((f) => [f.rule, f.cell, f.value])),
    [
      ['required: VAT', 'Invoices!A1:F1', 'Invoice, Date, Region, Amount, Vat amt, Status'],
      ['type: Date is date', 'Invoices!B15', '2026-02-30'],
      ['type: Amount is number', 'Invoices!D8', '6 391,00'],
      ['not blank: Invoice', 'Invoices!A19', ''],
      ['not blank: Region', 'Invoices!C27', ''],
      ['unique: Invoice', 'Invoices!A24', 'INV-1012'],
      ['total: Amount matches Summary!B2 (Region = North)', 'Summary!B2', '29220'],
    ],
  );
});
