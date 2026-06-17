// Convert an ISO country / subdivision code into a flag emoji.
//
// Two-letter ISO codes (e.g. "IT") become regional-indicator flags.
// Known subdivision codes (e.g. "GB-ENG") are mapped explicitly because the
// tag-sequence flags they require are not rendered consistently everywhere.

const SUBDIVISION_FLAGS: Record<string, string> = {
  "GB-ENG": "🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}", // England
  "GB-SCT": "🏴\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}", // Scotland
  "GB-WLS": "🏴\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}", // Wales
};

export function flagEmoji(countryCode: string): string {
  const code = countryCode.trim().toUpperCase();

  if (SUBDIVISION_FLAGS[code]) return SUBDIVISION_FLAGS[code];

  // Use the leading two-letter ISO portion (handles "GB-ENG" -> "GB" fallback).
  const iso = code.slice(0, 2);
  if (!/^[A-Z]{2}$/.test(iso)) return "🏁";

  const base = 0x1f1e6; // regional indicator 'A'
  return String.fromCodePoint(
    base + (iso.charCodeAt(0) - 65),
    base + (iso.charCodeAt(1) - 65),
  );
}
