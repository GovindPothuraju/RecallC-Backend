const REVISION_SCHEDULE = [
  { revisionNumber: 1, days: 1 },
  { revisionNumber: 2, days: 4 },
  { revisionNumber: 3, days: 7 },
  { revisionNumber: 4, days: 15 },
  { revisionNumber: 5, days: 30 },
  { revisionNumber: 6, days: 50 },
  { revisionNumber: 7, days: 80 },
  { revisionNumber: 8, days: 120 },
  { revisionNumber: 9, days: 160 }
];

const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * Validates that string matches YYYY-MM-DD and represents a real calendar date
 */
function isValidDateString(dateStr) {
  if (typeof dateStr !== 'string' || !DATE_REGEX.test(dateStr)) {
    return false;
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

/**
 * Formats a Date object as YYYY-MM-DD using UTC components
 */
function formatDateToUTCString(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Gets today's calendar date string.
 * Optionally respects a client-provided timezone (e.g., 'Asia/Kolkata', 'America/New_York')
 */
function getTodayDateString(clientTimezone = null) {
  try {
    if (clientTimezone) {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: clientTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      return formatter.format(new Date());
    }
  } catch (err) {
    // Fall back to UTC
  }
  return formatDateToUTCString(new Date());
}

/**
 * Adds an integer number of calendar days to a YYYY-MM-DD date string
 */
function addDaysToDateString(dateStr, days) {
  if (!isValidDateString(dateStr)) {
    throw new Error(`Invalid date string: ${dateStr}`);
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return formatDateToUTCString(date);
}

/**
 * Calculates calendar day difference (dateStrA - dateStrB)
 */
function diffInCalendarDays(dateStrA, dateStrB) {
  const [yA, mA, dA] = dateStrA.split('-').map(Number);
  const [yB, mB, dB] = dateStrB.split('-').map(Number);
  const utcA = Date.UTC(yA, mA - 1, dA);
  const utcB = Date.UTC(yB, mB - 1, dB);
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.round((utcA - utcB) / MS_PER_DAY);
}

/**
 * Generates the 9 revision dates from a study date string
 */
function generateRevisionSchedule(studyDate) {
  if (!isValidDateString(studyDate)) {
    throw new Error(`Invalid study date: ${studyDate}`);
  }

  return REVISION_SCHEDULE.map(({ revisionNumber, days }) => ({
    revisionNumber,
    scheduledDate: addDaysToDateString(studyDate, days)
  }));
}

/**
 * Rule: Allow completion up to two calendar days before the scheduled date.
 * Earlier completion is not allowed without rescheduling.
 * Returns { allowed: boolean, reason?: string }
 */
function checkCompletionEligibility(scheduledDate, currentDate) {
  // daysRemaining = scheduledDate - currentDate
  const daysRemaining = diffInCalendarDays(scheduledDate, currentDate);
  if (daysRemaining > 2) {
    return {
      allowed: false,
      reason: `Revision is scheduled for ${scheduledDate}. It cannot be completed more than 2 calendar days early.`
    };
  }
  return { allowed: true };
}

module.exports = {
  REVISION_SCHEDULE,
  isValidDateString,
  formatDateToUTCString,
  getTodayDateString,
  addDaysToDateString,
  diffInCalendarDays,
  generateRevisionSchedule,
  checkCompletionEligibility
};

