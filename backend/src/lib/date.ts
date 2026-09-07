/**
 * Calendar-date helpers (B-07). `readingDate` is a calendar day, not a wall
 * clock instant: it must show the same day for every viewer regardless of
 * timezone. We anchor it at 12:00 UTC so no reasonable timezone offset can push
 * it onto the previous/next day, and format it in UTC everywhere.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Parse a reading date. `YYYY-MM-DD` is anchored at noon UTC (calendar day). */
export function parseReadingDate(input: string): Date {
  if (DATE_ONLY.test(input)) {
    return new Date(`${input}T12:00:00.000Z`);
  }
  return new Date(input);
}

/** The calendar day of a stored reading date, as `YYYY-MM-DD` (UTC). */
export function readingDateISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Today's calendar date in a given IANA timezone, as `YYYY-MM-DD`. */
export function todayInTimeZone(
  timeZone: string,
  now: Date = new Date(),
): string {
  // en-CA yields ISO-style YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
