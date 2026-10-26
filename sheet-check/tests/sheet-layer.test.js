import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, sheetValues } from './load.js';

const plain = (x) => JSON.parse(JSON.stringify(x));

// Just enough of SpreadsheetApp, PropertiesService, ScriptApp and Utilities
// to run Code.gs and Trigger.gs against tabs held in memory.
function fakeServices({ tabs, property }) {
  const sheets = new Map(Object.entries(tabs).map(([name, values]) => [name, fakeSheet(name, values)]));
  const menus = [];
  const triggers = [];
  const toasts = [];

  const spreadsheet = {
    getSheetByName: (name) => sheets.get(name) ?? null,
    insertSheet: (name) => {
      const sheet = fakeSheet(name, []);
      sheets.set(name, sheet);
      return sheet;
    },
    getRange: (a1) => {
      const m = /^(\w+)!([A-Z]+)(\d+)$/.exec(a1);
      if (!m || !sheets.has(m[1])) throw new Error(`Range not found: ${a1}`);
      const col = m[2].charCodeAt(0) - 65;
      return { getValue: () => sheets.get(m[1]).values[Number(m[3]) - 1]?.[col] ?? '' };
    },
    getSpreadsheetTimeZone: () => 'Africa/Johannesburg',
    toast: (text) => toasts.push(text),
  };

  const globals = {
    SpreadsheetApp: {
      getActiveSpreadsheet: () => spreadsheet,
      getActive: () => spreadsheet,
      getUi: () => ({
        createMenu: (title) => {
          const menu = { title, items: [] };
          menus.push(menu);
          const builder = {
            addItem: (label, fn) => (menu.items.push([label, fn]), builder),
            addSeparator: () => builder,
            addToUi: () => {},
          };
          return builder;
        },
      }),
    },
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: (key) => (key === 'SHEET_CHECK_RULES' ? property : null) }),
    },
    ScriptApp: {
      newTrigger: (fn) => {
        const trigger = { fn, getHandlerFunction: () => fn };
        const builder = {
          timeBased: () => builder,
          everyDays: (n) => ((trigger.days = n), builder),
          atHour: (h) => ((trigger.hour = h), builder),
          create: () => triggers.push(trigger),
        };
        return builder;
      },
      getProjectTriggers: () => triggers.slice(),
      deleteTrigger: (t) => triggers.splice(triggers.indexOf(t), 1),
    },
    Utilities: { formatDate: () => '2026-10-26 07:00' },
  };
  return { globals, sheets, menus, triggers, toasts };
}

function fakeSheet(name, values) {
  const sheet = {
    name,
    values: values.map((row) => row.slice()),
    backgrounds: {},
    getDataRange: () => ({ getValues: () => sheet.values.map((row) => row.slice()) }),
    clear: () => {
      sheet.values = [];
      sheet.backgrounds = {};
    },
    getRange: (row, col, rows, cols) => {
      const range = {
        setNumberFormat: () => range,
        setValues: (v) => {
          v.forEach((r, i) => (sheet.values[row - 1 + i] = r.slice()));
          return range;
        },
        setFontWeight: () => range,
        setBackground: (colour) => {
          for (let i = 0; i < rows; i++) sheet.backgrounds[row + i] = colour;
          return range;
        },
        setNote: (note) => ((sheet.note = note), range),
      };
      return range;
    },
    setFrozenRows: () => {},
  };
  return sheet;
}

const template = () => ({
  Rules: sheetValues('Rules'),
  Invoices: sheetValues('Invoices'),
  Summary: sheetValues('Summary'),
});
const files = ['Rules.gs', 'Code.gs', 'Trigger.gs'];

test('onOpen adds a Sheet check menu whose items all exist', () => {
  const fake = fakeServices({ tabs: {} });
  const script = load(files, fake.globals);
  script.onOpen();
  assert.equal(fake.menus[0].title, 'Sheet check');
  assert.deepEqual(
    fake.menus[0].items.map(([label]) => label),
    ['Check now', 'Check every morning', 'Stop the morning check'],
  );
  for (const [, fn] of fake.menus[0].items) assert.equal(typeof script[fn], 'function', fn);
});

test('a check on the template writes one red row per planted fault', () => {
  const fake = fakeServices({ tabs: template() });
  const failures = load(files, fake.globals).runCheck();
  const tab = fake.sheets.get('Validation');
  assert.equal(failures, 7);
  assert.deepEqual(plain(tab.values[0]), ['Rule', 'Cell', 'Value found', "What's wrong"]);
  assert.equal(tab.values.length, 8);
  assert.deepEqual(plain(tab.values[2].slice(0, 3)), ['type: Date is date', 'Invoices!B15', '2026-02-30']);
  assert.equal(tab.backgrounds[2], '#f4cccc');
  assert.equal(tab.note, 'Last checked 2026-10-26 07:00');
});

test('once the faults are fixed, the Validation tab is one green row', () => {
  const tabs = template();
  const inv = tabs.Invoices;
  inv[0][4] = 'VAT';
  inv[7][3] = 6391;
  inv[14][1] = new Date(2026, 8, 14);
  inv[18][0] = 'INV-1018';
  inv[23][0] = 'INV-1023';
  inv[26][2] = 'West';
  const amount = (region) => inv.slice(1).filter((r) => r[2] === region).reduce((sum, r) => sum + r[3], 0);
  ['North', 'South', 'East', 'West'].forEach((region, i) => (tabs.Summary[i + 1][1] = amount(region)));
  tabs.Summary[5][1] = inv.slice(1).reduce((sum, r) => sum + r[3], 0);

  const fake = fakeServices({ tabs });
  assert.equal(load(files, fake.globals).runCheck(), 0);
  const tab = fake.sheets.get('Validation');
  assert.deepEqual(plain(tab.values), [
    ['Rule', 'Cell', 'Value found', "What's wrong"],
    ['All 16 rules pass', 'Invoices', '30 rows checked', ''],
  ]);
  assert.equal(tab.backgrounds[2], '#d9ead3');
});

test('with no Rules tab, the rules come from the script property', () => {
  const { Invoices } = template();
  const property = JSON.stringify([
    { rule: 'sheet', setting: 'Invoices' },
    { rule: 'unique', column: 'Invoice' },
  ]);
  const fake = fakeServices({ tabs: { Invoices }, property });
  assert.equal(load(files, fake.globals).runCheck(), 1);
  assert.equal(fake.sheets.get('Validation').values[1][1], 'Invoices!A24');
});

test('the morning check installs one trigger, however often it is chosen, and can be stopped', () => {
  const fake = fakeServices({ tabs: {} });
  const script = load(files, fake.globals);
  script.installDailyCheck();
  script.installDailyCheck();
  assert.deepEqual(
    fake.triggers.map((t) => [t.fn, t.days, t.hour]),
    [['runCheck', 1, 7]],
  );
  script.stopDailyCheck();
  assert.equal(fake.triggers.length, 0);
  assert.equal(fake.toasts.length, 3);
});
