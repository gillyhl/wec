"use client";

// Confirms before submitting the surrounding form, which posts to the
// clearRaceResults server action. Lives in its own client component so the race
// page can stay a server component.
export default function DeleteRaceButton({ trackName }: { trackName: string }) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (
          !window.confirm(
            `Clear the ${trackName} results? They will be removed from the championship standings. This cannot be undone.`,
          )
        ) {
          e.preventDefault();
        }
      }}
      className="w-full rounded-md border border-red-900 px-3 py-2 font-medium text-red-400 hover:bg-red-950 hover:text-red-300"
    >
      Clear results
    </button>
  );
}
