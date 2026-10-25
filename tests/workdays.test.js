import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addWorkingDays, daysBetween, holidaysBetween, isWorkingDay, workingDaysBetween } from '../src/index.js';

test('Weekends and holidays are not working days', () => {
  assert.equal(isWorkingDay('2025-04-15'), true);
  assert.equal(isWorkingDay('2025-04-19'), false); // Saturday
  assert.equal(isWorkingDay('2025-04-18'), false); // Good Friday
  assert.equal(isWorkingDay('2024-05-29'), false); // election day
});

test('Counting starts the day after opening', () => {
  assert.equal(workingDaysBetween('2025-03-03', '2025-03-03'), 0);
  assert.equal(workingDaysBetween('2025-03-03', '2025-03-04'), 1);
  assert.equal(workingDaysBetween('2025-03-07', '2025-03-10'), 1); // Friday to Monday
  assert.equal(workingDaysBetween('2025-03-08', '2025-03-10'), 1); // Saturday to Monday
});

test('Easter 2025: 12 calendar days are only 5 working days', () => {
  // Opened Thursday 17 April. Good Friday, Family Day, two weekends and Freedom Day
  // (a Sunday, so Monday 28 April was observed) all follow.
  assert.equal(daysBetween('2025-04-17', '2025-04-29'), 12);
  assert.equal(workingDaysBetween('2025-04-17', '2025-04-29'), 5);
  assert.equal(workingDaysBetween('2025-04-17', '2025-04-25'), 4);
});

test('December 2022 has the declared 27th', () => {
  assert.equal(workingDaysBetween('2022-12-23', '2022-12-28'), 1);
});

test('addWorkingDays is the inverse of workingDaysBetween', () => {
  for (const start of ['2024-12-20', '2025-04-17', '2025-07-04', '2026-11-03', '2026-12-24']) {
    for (let n = 0; n <= 15; n++) {
      const end = addWorkingDays(start, n);
      assert.equal(workingDaysBetween(start, end), n, `${start} + ${n}`);
      if (n > 0) assert.equal(isWorkingDay(end), true);
    }
  }
});

test('Holidays between two dates are listed', () => {
  assert.deepEqual(holidaysBetween('2025-04-17', '2025-04-28').map((h) => h.name),
    ['Good Friday', 'Family Day', 'Freedom Day', 'Freedom Day (observed)']);
});

test('Bad input is refused', () => {
  assert.throws(() => workingDaysBetween('2025-03-10', '2025-03-07'), RangeError);
  assert.throws(() => workingDaysBetween('2025-02-30', '2025-03-07'), RangeError);
  assert.throws(() => addWorkingDays('2025-03-07', -1), RangeError);
  assert.throws(() => isWorkingDay('7 March 2025'), TypeError);
});
