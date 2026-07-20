"use client";

import {
  completeChampionship,
  deleteChampionship,
  renameChampionship,
} from "@/app/championships/actions";

// Admin-only controls on the championship page: mark a championship complete
// (only once every race has a result) and delete it. Kept as a client component
// so the page itself can remain a server component while still confirming
// destructive actions in the browser.
export default function ChampionshipAdminControls({
  championshipId,
  championshipName,
  status,
  canComplete,
}: {
  championshipId: string;
  championshipName: string;
  status: "current" | "finished";
  canComplete: boolean;
}) {
  return (
    <div className="mt-10 border-t border-neutral-800 pt-6">
      <h2 className="text-lg font-semibold">Admin</h2>

      <form action={renameChampionship} className="mt-4 max-w-sm">
        <label
          htmlFor="championship-name"
          className="block text-sm font-medium text-neutral-400"
        >
          Championship name
        </label>
        <input type="hidden" name="championship_id" value={championshipId} />
        <div className="mt-2 flex gap-2">
          <input
            id="championship-name"
            name="name"
            type="text"
            required
            defaultValue={championshipName}
            className="flex-1 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-neutral-600 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-md bg-white px-3 py-2 font-medium text-black hover:bg-neutral-200"
          >
            Save
          </button>
        </div>
      </form>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row">
        {status === "current" && (
          <form action={completeChampionship}>
            <input
              type="hidden"
              name="championship_id"
              value={championshipId}
            />
            <button
              type="submit"
              disabled={!canComplete}
              title={
                canComplete
                  ? undefined
                  : "Every race must have a result before completing."
              }
              className="rounded-md bg-white px-3 py-2 font-medium text-black hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Mark as complete
            </button>
            {!canComplete && (
              <p className="mt-2 text-xs text-neutral-500">
                All races need a result before this championship can be
                completed.
              </p>
            )}
          </form>
        )}

        <form action={deleteChampionship}>
          <input type="hidden" name="championship_id" value={championshipId} />
          <button
            type="submit"
            onClick={(e) => {
              if (
                !window.confirm(
                  `Delete the "${championshipName}" championship? Its races and all results will be permanently removed. This cannot be undone.`,
                )
              ) {
                e.preventDefault();
              }
            }}
            className="rounded-md border border-red-900 px-3 py-2 font-medium text-red-400 hover:bg-red-950 hover:text-red-300"
          >
            Delete championship
          </button>
        </form>
      </div>
    </div>
  );
}
