import { flagClass } from "@/lib/flags";

// Renders a country flag using the flag-icons package. Falls back to a
// checkered-flag glyph when the code can't be resolved to a flag.
export default function FlagIcon({
  countryCode,
  className = "",
}: {
  countryCode: string;
  className?: string;
}) {
  const fi = flagClass(countryCode);

  if (!fi) {
    return (
      <span className={className} aria-hidden>
        🏁
      </span>
    );
  }

  return (
    <span
      className={`fi ${fi} ${className}`.trim()}
      role="img"
      aria-label={`${countryCode} flag`}
    />
  );
}
