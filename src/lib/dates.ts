// Helpers for a race's calendar date, stored as a Postgres `date` and so
// carried around as a plain "YYYY-MM-DD" string with no time or zone attached.

// Today, in the format a `date` column and an `<input type="date">` both take.
// Read off the server's clock — the date a race is stamped with is only ever a
// default, and can be corrected on the race's own page.
export function todayISO(): string {
  // en-CA formats as YYYY-MM-DD; unlike toISOString() it uses the local date
  // rather than UTC's, so an evening race isn't stamped with tomorrow.
  return new Date().toLocaleDateString("en-CA");
}

// True for the "YYYY-MM-DD" strings a date column and date input exchange.
// Guards against a hand-edited form value reaching the database.
export function isISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && formatISO(date) === value;
}

function formatISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// A stored race date for display, e.g. "14 Sep 2026". Formatted in UTC so the
// date shown is the one stored, whatever zone the reader is in.
export function formatRaceDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
