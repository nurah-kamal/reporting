import { test } from 'node:test';
import assert from 'node:assert/strict';
import { easterSunday, holidaysFor, holidayOn, isVerifiedYear } from '../src/index.js';

const dates = (year) => holidaysFor(year).map((h) => h.date);

test('Easter Sunday matches published dates', () => {
  const known = {
    2011: '2011-04-24', 2016: '2016-03-27', 2019: '2019-04-21', 2022: '2022-04-17',
    2023: '2023-04-09', 2024: '2024-03-31', 2025: '2025-04-20', 2026: '2026-04-05',
    2027: '2027-03-28', 2038: '2038-04-25',
  };
  for (const [year, date] of Object.entries(known)) assert.equal(easterSunday(+year), date, year);
});

// The 2026 and 2027 lists on gov.za/about-sa/public-holidays (read 25 Oct 2026),
// plus the 4 November 2026 election day, which that page did not yet show.
test('2026 matches gov.za plus the declared election day', () => {
  assert.deepEqual(dates(2026), [
    '2026-01-01', '2026-03-21', '2026-04-03', '2026-04-06', '2026-04-27', '2026-05-01',
    '2026-06-16', '2026-08-09', '2026-08-10', '2026-09-24', '2026-11-04', '2026-12-16',
    '2026-12-25', '2026-12-26',
  ]);
  assert.equal(holidayOn('2026-08-10').kind, 'sunday-rule');
  assert.equal(holidayOn('2026-11-04').kind, 'declared');
});

test('2027 applies the Sunday rule to Human Rights Day and the Day of Goodwill', () => {
  assert.equal(holidayOn('2027-03-22').name, 'Human Rights Day (observed)');
  assert.equal(holidayOn('2027-12-27').name, 'Day of Goodwill (observed)');
  assert.equal(holidaysFor(2027).length, 14);
});

test('Christmas on a Sunday adds no second Monday; the declared 27th fills the gap', () => {
  for (const year of [2011, 2016, 2022]) {
    assert.equal(holidayOn(`${year}-12-26`).name, 'Day of Goodwill');
    assert.equal(holidayOn(`${year}-12-27`).kind, 'declared');
    assert.equal(holidaysFor(year).filter((h) => h.kind === 'sunday-rule' && h.date.endsWith('12-27')).length, 0);
  }
});

test('Ordinary days are not holidays', () => {
  assert.equal(holidayOn('2025-04-22'), null);
  assert.equal(holidayOn('2024-12-24'), null);
});

test('Years before the Act are refused and unverified years are flagged', () => {
  assert.throws(() => holidaysFor(1994), RangeError);
  assert.equal(isVerifiedYear(2008), false);
  assert.equal(isVerifiedYear(2024), true);
  assert.equal(isVerifiedYear(2027), false);
});

test('Good Friday on Human Rights Day (2008) is one day with both names', () => {
  assert.equal(holidayOn('2008-03-21').name, 'Human Rights Day and Good Friday');
  assert.equal(holidaysFor(2008).filter((h) => h.kind === 'statutory').length, 11);
});

test('No year lists the same date twice', () => {
  for (let year = 1995; year <= 2100; year++) {
    const list = holidaysFor(year);
    assert.equal(new Set(list.map((h) => h.date)).size, list.length, year);
    assert.ok(list.filter((h) => h.kind === 'statutory').length >= 11, year);
  }
});
