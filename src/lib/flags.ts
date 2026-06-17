// Map an ISO country / subdivision code to a flag-icons CSS class suffix.
//
// Two-letter ISO codes (e.g. "IT") become `fi-it`.
// flag-icons natively ships GB subdivisions, so codes like "GB-ENG" map to
// `fi-gb-eng` directly. Anything unrecognised returns null so callers can
// render a fallback.

const SUBDIVISION_CODES = new Set(["gb-eng", "gb-sct", "gb-wls", "gb-nir"]);

export function flagClass(countryCode: string): string | null {
  const code = countryCode.trim().toLowerCase();

  if (SUBDIVISION_CODES.has(code)) return `fi-${code}`;

  // Use the leading two-letter ISO portion (handles "GB-ENG" -> "GB" fallback).
  const iso = code.slice(0, 2);
  if (!/^[a-z]{2}$/.test(iso)) return null;

  return `fi-${iso}`;
}
