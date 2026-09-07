"use client";

// Confirms before submitting the surrounding form, which posts to the
// deleteCar server action. Lives in its own client component so the cars page
// can stay a server component.
export default function DeleteCarButton({ carName }: { carName: string }) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (
          !window.confirm(
            `Delete "${carName}"? This cannot be undone.`,
          )
        ) {
          e.preventDefault();
        }
      }}
      className="text-xs text-neutral-400 hover:text-white"
    >
      Delete
    </button>
  );
}
