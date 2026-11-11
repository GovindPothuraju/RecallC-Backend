const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isValidDateString,
  addDaysToDateString,
  diffInCalendarDays,
  generateRevisionSchedule,
  checkCompletionEligibility,
  REVISION_SCHEDULE
} = require('../utils/dateUtils');

test('Date Utilities - Validation', async (t) => {
  await t.test('accepts valid YYYY-MM-DD dates', () => {
    assert.strictEqual(isValidDateString('2026-11-06'), true);
    assert.strictEqual(isValidDateString('2024-02-29'), true); // leap year
    assert.strictEqual(isValidDateString('2026-12-31'), true);
    assert.strictEqual(isValidDateString('2027-01-01'), true);
  });

  await t.test('rejects invalid format or nonexistent dates', () => {
    assert.strictEqual(isValidDateString('2026/11/06'), false);
    assert.strictEqual(isValidDateString('06-11-2026'), false);
    assert.strictEqual(isValidDateString('2026-02-29'), false); // 2026 is not leap year
    assert.strictEqual(isValidDateString('2026-04-31'), false); // April has 30 days
    assert.strictEqual(isValidDateString('invalid'), false);
    assert.strictEqual(isValidDateString(''), false);
    assert.strictEqual(isValidDateString(null), false);
  });
});

test('Date Utilities - Calendar Day Arithmetic', async (t) => {
  await t.test('adds calendar days within the same month', () => {
    assert.strictEqual(addDaysToDateString('2026-11-01', 5), '2026-11-06');
  });

  await t.test('correctly handles month boundaries (Nov -> Dec)', () => {
    assert.strictEqual(addDaysToDateString('2026-11-25', 10), '2026-12-05');
  });

  await t.test('correctly handles year boundaries (Dec -> Jan)', () => {
    assert.strictEqual(addDaysToDateString('2026-12-30', 5), '2027-01-04');
  });

  await t.test('correctly handles leap year (2024-02-28 + 1 day = 2024-02-29)', () => {
    assert.strictEqual(addDaysToDateString('2024-02-28', 1), '2024-02-29');
    assert.strictEqual(addDaysToDateString('2024-02-28', 2), '2024-03-01');
  });

  await t.test('correctly handles non-leap year (2026-02-28 + 1 day = 2026-03-01)', () => {
    assert.strictEqual(addDaysToDateString('2026-02-28', 1), '2026-03-01');
  });

  await t.test('calculates calendar difference accurately', () => {
    assert.strictEqual(diffInCalendarDays('2026-11-07', '2026-11-06'), 1);
    assert.strictEqual(diffInCalendarDays('2026-11-06', '2026-11-07'), -1);
    assert.strictEqual(diffInCalendarDays('2026-12-01', '2026-11-30'), 1);
  });
});

test('Date Utilities - 9-Revision Schedule Generation', async (t) => {
  await t.test('generates exactly 9 revisions with correct intervals from spec', () => {
    const studyDate = '2026-11-06';
    const schedule = generateRevisionSchedule(studyDate);

    assert.strictEqual(schedule.length, 9);

    // Verify against prompt specification:
    // R1: Nov 7 (+1)
    // R2: Nov 10 (+4)
    // R3: Nov 13 (+7)
    // R4: Nov 21 (+15)
    // R5: Dec 6 (+30)
    // R6: Dec 26 (+50)
    // R7: Jan 25 (+80)
    // R8: Mar 6 (+120)
    // R9: Apr 15 (+160)
    const expected = [
      { revisionNumber: 1, scheduledDate: '2026-11-07' },
      { revisionNumber: 2, scheduledDate: '2026-11-10' },
      { revisionNumber: 3, scheduledDate: '2026-11-13' },
      { revisionNumber: 4, scheduledDate: '2026-11-21' },
      { revisionNumber: 5, scheduledDate: '2026-12-06' },
      { revisionNumber: 6, scheduledDate: '2026-12-26' },
      { revisionNumber: 7, scheduledDate: '2027-01-25' },
      { revisionNumber: 8, scheduledDate: '2027-03-06' },
      { revisionNumber: 9, scheduledDate: '2027-04-15' }
    ];

    assert.deepStrictEqual(schedule, expected);
  });
});

test('Date Utilities - Early Completion Rule Check', async (t) => {
  const scheduledDate = '2026-11-10';

  await t.test('allows completion on the scheduled date', () => {
    const res = checkCompletionEligibility(scheduledDate, '2026-11-10');
    assert.strictEqual(res.allowed, true);
  });

  await t.test('allows completion 1 calendar day before', () => {
    const res = checkCompletionEligibility(scheduledDate, '2026-11-09');
    assert.strictEqual(res.allowed, true);
  });

  await t.test('allows completion 2 calendar days before', () => {
    const res = checkCompletionEligibility(scheduledDate, '2026-11-08');
    assert.strictEqual(res.allowed, true);
  });

  await t.test('rejects completion 3 calendar days before', () => {
    const res = checkCompletionEligibility(scheduledDate, '2026-11-07');
    assert.strictEqual(res.allowed, false);
    assert.match(res.reason, /cannot be completed more than 2 calendar days early/);
  });

  await t.test('allows completion when overdue', () => {
    const res = checkCompletionEligibility(scheduledDate, '2026-11-15');
    assert.strictEqual(res.allowed, true);
  });
});

