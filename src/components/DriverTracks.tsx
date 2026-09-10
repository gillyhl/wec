"use client";

import Link from "next/link";
import { useState } from "react";
import FlagIcon from "@/components/FlagIcon";
import { pointsForRank, resultColor } from "@/lib/results";
import { RACING_SERIES_LABELS } from "@/lib/types";
import type { DriverTrackRow, TrackRaceEntry } from "@/lib/racer";
import type { Championship } from "@/lib/types";

const headCell =
  "border border-neutral-800 px-1.5 py-2 text-center font-medium leading-tight sm:px-3";
const numCell = "border border-neutral-800 px-1.5 text-center sm:px-3";

// Columns of the summary table, so the expanded panel's cell can span them.
const SUMMARY_COLUMNS = 8;

// A single round at the track: the driver's finish, washed with the same
// result colours used by the standings matrix and the seasons grid.
function ResultBlock({ entry }: { entry: TrackRaceEntry }) {
  const { round, cell } = entry;

  // The season raced here but the driver has no result for the round.
  if (!cell) {
    return (
      <div className="rounded border border-neutral-800 px-2 py-1 leading-tight text-neutral-500">
        <span className="block text-[10px]">R{round}</span>
        <span className="block font-bold">–</span>
      </div>
    );
  }

  const points = pointsForRank(cell.rank);
  const detail = [
    `Round ${round}`,
    cell.car?.name,
    `${points} ${points === 1 ? "pt" : "pts"}`,
  ]
    .filter(Boolean)
    .join(" — ");

  return (
    <div
      className="rounded px-2 py-1 leading-tight text-neutral-900"
      style={{ backgroundColor: resultColor(cell.rank, cell.retired) }}
      title={detail}
    >
      <span className="block text-[10px]">R{round}</span>
      <span className="block font-bold">
        {cell.retired ? "RET" : (cell.rank ?? "–")}
      </span>
    </div>
  );
}

// The driver's per-track record. Each row expands to a season-by-season
// breakdown: one column per championship the driver contested, holding their
// result at this track that year — blank where the season never went there.
export default function DriverTracks({
  rows,
  championships,
}: {
  rows: DriverTrackRow[];
  // Every season the driver raced, chronologically — one column each.
  championships: Championship[];
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (trackId: string) =>
    setExpanded((prev) => ({ ...prev, [trackId]: !prev[trackId] }));

  return (
    <div className="mt-4 w-fit max-w-full overflow-x-auto rounded-lg border border-neutral-800">
      <table className="border-collapse text-sm">
        <thead className="bg-neutral-900 text-neutral-400">
          <tr>
            <th className="border border-neutral-800 px-1.5 py-2 text-left font-medium sm:px-3">
              Track
            </th>
            <th className={headCell}>Races</th>
            <th className={headCell}>Best finish</th>
            <th className={headCell}>Wins</th>
            <th className={headCell}>Podiums</th>
            <th className={headCell}>Points finishes</th>
            <th className={headCell}>Retirements</th>
            <th className={headCell}>Points</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isOpen = expanded[row.track.id] ?? false;
            const panelId = `track-races-${row.track.id}`;
            return [
              <tr
                key={row.track.id}
                className="h-12 cursor-pointer hover:bg-neutral-900/60"
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(row.track.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggle(row.track.id);
                  }
                }}
              >
                <td className="whitespace-nowrap border border-neutral-800 px-1.5 font-medium sm:px-3">
                  <span
                    aria-hidden
                    className={`mr-1.5 inline-block text-xs text-neutral-500 transition-transform ${
                      isOpen ? "rotate-90" : ""
                    }`}
                  >
                    ▶
                  </span>
                  <FlagIcon
                    countryCode={row.track.country_code}
                    className="mr-1.5 sm:mr-2"
                  />
                  <span className="sm:hidden">{row.track.short_code}</span>
                  <span className="hidden sm:inline">{row.track.name}</span>
                  {/* Same circuit can exist in both games as distinct
                      tracks; label the game so rows aren't ambiguous. */}
                  <span className="block text-xs font-normal text-neutral-500">
                    {RACING_SERIES_LABELS[row.track.source]}
                  </span>
                </td>
                <td className={numCell}>{row.races}</td>
                <td className={numCell}>{row.bestFinish ?? "—"}</td>
                <td className={numCell}>{row.wins}</td>
                <td className={numCell}>{row.podiums}</td>
                <td className={numCell}>{row.pointsFinishes}</td>
                <td className={numCell}>{row.retirements}</td>
                <td className={`${numCell} font-semibold`}>{row.points}</td>
              </tr>,
              isOpen && (
                <tr key={panelId} id={panelId}>
                  <td
                    colSpan={SUMMARY_COLUMNS}
                    className="border border-neutral-800 bg-neutral-950 p-0"
                  >
                    {/* Fixed narrow columns inside a capped scroller: a
                        driver with many seasons would otherwise widen this
                        cell past the summary table above and stretch its
                        columns along with it. */}
                    <div className="max-w-[80vw] overflow-x-auto p-3">
                      <table className="table-fixed border-collapse text-sm">
                        <thead className="text-neutral-400">
                          <tr>
                            {championships.map((c) => (
                              <th
                                key={c.id}
                                className="w-20 border border-neutral-800 px-2 py-1.5 align-bottom text-left text-xs font-medium"
                              >
                                <Link
                                  href={`/championships/${c.id}`}
                                  className="line-clamp-2 break-words hover:underline"
                                  title={c.name}
                                >
                                  {c.name}
                                </Link>
                                <span className="block font-normal text-neutral-500">
                                  {RACING_SERIES_LABELS[c.series]}
                                </span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            {championships.map((c) => {
                              const entries = row.byChampionship[c.id] ?? [];
                              return (
                                <td
                                  key={c.id}
                                  className="border border-neutral-800 p-1.5 align-top text-center"
                                >
                                  {/* No round here that season — the column
                                      stays empty rather than showing a
                                      result the driver never had. */}
                                  {entries.length > 0 && (
                                    <div className="flex flex-col gap-1">
                                      {entries.map((entry) => (
                                        <ResultBlock
                                          key={entry.round}
                                          entry={entry}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              ),
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}
