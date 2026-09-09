"use client";

import Link from "next/link";
import { useState } from "react";
import FlagIcon from "@/components/FlagIcon";
import ToggleSwitch from "@/components/ToggleSwitch";
import { carsCountLabel, carsLabel, resultColor } from "@/lib/results";
import { FAVOURITE_LABEL, FAVOURITE_TINT } from "@/lib/tracks";
import type {
  RaceCell,
  RaceWithTrack,
  StandingsRow,
} from "@/lib/championship";

// One rendered row of the standings matrix. Split by car, a racer contributes
// one row per car they used; collapsed, they contribute a single row carrying
// every result they scored, whatever they drove.
interface DisplayRow {
  row: StandingsRow;
  // The car this row covers; collapsed, a one-line summary of every car the
  // racer used, with the full list in `carTitle`.
  carLabel: string;
  carTitle?: string;
  // race_id -> result, restricted to this row's car (or all of them).
  cells: Record<string, RaceCell>;
  // Position/racer/points are per racer, so they're only rendered on the
  // racer's first row and span the rest.
  isFirst: boolean;
  rowSpan: number;
  key: string;
}

export default function ChampionshipStandings({
  championshipId,
  races,
  standings,
  isAdmin,
}: {
  championshipId: string;
  races: RaceWithTrack[];
  standings: StandingsRow[];
  isAdmin: boolean;
}) {
  const [splitByCar, setSplitByCar] = useState(true);

  // Nothing to collapse unless someone actually switched cars, so only offer
  // the toggle when it would change the table.
  const canSplit = standings.some((row) => row.carRows.length > 1);
  const split = splitByCar && canSplit;

  // Points of the championship leader; used to show how far each racer trails.
  const leaderPoints = standings[0]?.points ?? 0;

  const displayRows: DisplayRow[] = split
    ? standings.flatMap((row) =>
        row.carRows.map((carRow, i) => ({
          row,
          carLabel: carRow.car?.name ?? "–",
          cells: carRow.cells,
          isFirst: i === 0,
          rowSpan: row.carRows.length,
          key: `${row.racer.id}-${i}`,
        })),
      )
    : standings.map((row) => ({
        row,
        carLabel: carsCountLabel(row.carRows),
        carTitle: carsLabel(row.carRows),
        cells: row.cells,
        isFirst: true,
        rowSpan: 1,
        key: row.racer.id,
      }));

  return (
    <>
      {canSplit && (
        <div className="mt-6 flex justify-end">
          <ToggleSwitch
            checked={splitByCar}
            onChange={setSplitByCar}
            label="Split by car"
          />
        </div>
      )}

      <div
        className={`${canSplit ? "mt-2" : "mt-6"} flex items-start rounded-lg border border-neutral-800`}
      >
        {/* Frozen left: position + racer + car. Fixed layout at every size so
            the Racer/Car widths below actually cap the columns instead of
            growing to fit the longest name — table-auto would otherwise let
            this shrink-0 table expand past the viewport on mobile, and eat
            into the race columns' share of the row on desktop. */}
        <table className="shrink-0 table-fixed border-collapse text-xs sm:text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            {/* Matches the taller race-column header (round + flag + track
                code + edit link) so row lines stay aligned with the
                scrollable table below — these are separate <table>
                elements, so their row heights aren't otherwise tied. */}
            <tr className="h-20">
              <th className="w-7 border border-neutral-800 px-1.5 align-bottom text-left font-medium sm:w-9 sm:px-2">
                #
              </th>
              <th className="w-16 border border-neutral-800 px-1.5 align-bottom text-left font-medium sm:w-40 sm:px-2">
                Racer
              </th>
              <th className="w-16 border border-neutral-800 px-1.5 align-bottom text-left font-medium sm:w-32 sm:px-2">
                Car
              </th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map(({ row, carLabel, carTitle, isFirst, rowSpan, key }) => (
              <tr key={key} className="h-14 sm:h-12">
                {isFirst && (
                  <td
                    rowSpan={rowSpan}
                    className="border border-neutral-800 px-1.5 align-middle text-neutral-400 sm:px-2"
                  >
                    {row.position}
                  </td>
                )}
                {isFirst && (
                  <td
                    rowSpan={rowSpan}
                    className="w-16 break-words border border-neutral-800 px-1.5 align-middle font-medium sm:w-40 sm:px-2"
                  >
                    <Link
                      href={`/drivers/${row.racer.id}`}
                      className="hover:underline"
                    >
                      <FlagIcon
                        countryCode={row.racer.country_code}
                        className="mr-1.5 sm:mr-2"
                      />
                      {/* Abbreviate first name on mobile to save horizontal space */}
                      <span className="sm:hidden">
                        {row.racer.first_name.charAt(0)}. {row.racer.last_name}
                      </span>
                      <span className="hidden sm:inline">
                        {row.racer.first_name} {row.racer.last_name}
                      </span>
                    </Link>
                  </td>
                )}
                {/* Collapsed, this cell has to stay within the row height:
                    the results beside it are a separate table, so a car list
                    wrapping freely here would push this row out of step with
                    its counterpart. Two lines still fit on desktop; the full
                    list is in the tooltip either way. */}
                <td
                  className={`w-16 border border-neutral-800 px-1.5 text-neutral-400 sm:w-32 sm:px-2 ${
                    split ? "break-words" : ""
                  }`}
                  title={carTitle}
                >
                  {split ? carLabel : (
                    <span className="block truncate sm:line-clamp-2 sm:whitespace-normal">
                      {carLabel}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="h-8">
              <td
                colSpan={3}
                className="border border-neutral-800 px-1.5 text-[10px] font-medium text-neutral-500 sm:px-2"
              >
                AI difficulty
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Scrollable middle: race results (+ points on mobile, where the
            points column isn't frozen so results get more room). */}
        <div className="flex-1 overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-xs sm:text-sm">
            <thead className="bg-neutral-900 text-neutral-400">
              <tr className="h-20">
                {races.map((race) => (
                  <th
                    key={race.id}
                    className={`w-9 border border-neutral-800 px-1 align-bottom text-center font-medium sm:w-10 ${
                      race.track.favourite ? FAVOURITE_TINT : ""
                    }`}
                    title={
                      race.track.favourite
                        ? `${race.track.name} — a favourite`
                        : race.track.name
                    }
                  >
                    <div className="flex flex-col items-center leading-tight">
                      <span className="mb-1 text-neutral-500">R{race.round}</span>
                      <FlagIcon
                        countryCode={race.track.country_code}
                        className="text-base"
                      />
                      <span
                        className={race.track.favourite ? FAVOURITE_LABEL : ""}
                      >
                        {race.track.short_code}
                      </span>
                      {isAdmin && (
                        <Link
                          href={`/championships/${championshipId}/races/${race.id}`}
                          title={`Edit ${race.track.name} results`}
                          className="mt-0.5 text-neutral-600 hover:text-white"
                          aria-label={`Edit ${race.track.name} results`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-3 w-3"
                            aria-hidden="true"
                          >
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>
                        </Link>
                      )}
                    </div>
                  </th>
                ))}
                {/* Points joins the scrollable table on mobile instead of
                    staying frozen, so the frozen columns don't crowd out
                    the results. */}
                <th className="w-12 border border-neutral-800 px-1 align-bottom text-center font-medium sm:hidden">
                  Pts
                </th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map(({ row, cells, isFirst, rowSpan, key }) => {
                const behind = leaderPoints - row.points;
                return (
                  <tr key={key} className="h-14 sm:h-12">
                    {races.map((race) => {
                      const cell = cells[race.id];
                      if (!cell) {
                        return (
                          <td
                            key={race.id}
                            className={`border border-neutral-800 px-1 text-center text-neutral-300 ${
                              race.track.favourite ? FAVOURITE_TINT : ""
                            }`}
                          >
                            –
                          </td>
                        );
                      }
                      return (
                        <td
                          key={race.id}
                          className="border border-neutral-800 px-1 text-center font-bold text-neutral-900"
                          style={{
                            backgroundColor: resultColor(
                              cell.rank,
                              cell.retired,
                            ),
                          }}
                          // Collapsed, the car isn't in a column of its own any
                          // more, so name it on the result itself.
                          title={
                            !split && cell.car
                              ? `${race.track.name} — ${cell.car.name}`
                              : race.track.name
                          }
                        >
                          {cell.retired ? "RET" : cell.rank}
                        </td>
                      );
                    })}
                    {isFirst && (
                      <td
                        rowSpan={rowSpan}
                        className="border border-neutral-800 px-1 text-center align-middle sm:hidden"
                      >
                        <span className="font-semibold">{row.points}</span>
                        {behind > 0 && (
                          <span className="block text-[10px] font-normal text-neutral-500">
                            −{behind}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="h-8">
                {races.map((race) => (
                  <td
                    key={race.id}
                    className={`border border-neutral-800 px-1 text-center text-[10px] text-neutral-400 ${
                      race.track.favourite ? FAVOURITE_TINT : ""
                    }`}
                  >
                    {race.ai_difficulty ?? "–"}
                  </td>
                ))}
                <td className="border border-neutral-800 px-1 sm:hidden" />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Frozen right: points (desktop only — see the scrollable table
            above for the mobile equivalent). */}
        <table className="hidden shrink-0 table-fixed border-collapse text-sm sm:table">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr className="h-20">
              <th className="w-16 border border-neutral-800 px-2 align-bottom text-center font-medium">
                Points
              </th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map(({ row, isFirst, rowSpan, key }) => {
              const behind = leaderPoints - row.points;
              return (
                <tr key={key} className="h-12">
                  {isFirst && (
                    <td
                      rowSpan={rowSpan}
                      className="border border-neutral-800 px-2 text-center align-middle"
                    >
                      <span className="font-semibold">{row.points}</span>
                      {behind > 0 && (
                        <span className="block text-xs font-normal text-neutral-500">
                          −{behind}
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="h-8">
              <td className="border border-neutral-800 px-2" />
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}
