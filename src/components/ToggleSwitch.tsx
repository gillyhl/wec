"use client";

// A small on/off switch, sized to sit alongside a table heading. Used to
// collapse the per-car rows in the championship standings and a driver's
// seasons table down to a single row.
export default function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex shrink-0 items-center gap-2 text-xs text-neutral-400 hover:text-white"
    >
      <span
        className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
          checked ? "bg-white" : "bg-neutral-700"
        }`}
      >
        <span
          className={`inline-block h-3 w-3 rounded-full bg-neutral-950 transition-transform ${
            checked ? "translate-x-3.5" : "translate-x-0.5"
          }`}
        />
      </span>
      {label}
    </button>
  );
}
