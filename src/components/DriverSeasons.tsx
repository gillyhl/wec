"use client";

import Link from "next/link";
import { useState } from "react";
import FlagIcon from "@/components/FlagIcon";
import ToggleSwitch from "@/components/ToggleSwitch";
import {
  carsCountLabel,
  carsLabel,
  ordinal,
  resultColor,
} from "@/lib/results";
import { RACING_SERIES_LABELS } from "@/lib/types";
import type { RacerSeason, SeasonRace } from "@/lib/racer";

// One rendered row of the seasons grid. Split by car, a season contributes one
// row per car driven that year; collapsed, it contributes a single row with
// every round of the season on it.
interface DisplayRow {
  season: RacerSeason;
  // The car this row covers; collapsed, a one-line summary of every car
  // driven that season, with the full list in `carTitle`.
  carLabel: string;
  carTitle?: string;
  // One entry per round, aligned across every row of the season. null renders
  // as a fully empty cell — a round belonging to another car row, or one
  // before the driver's first result of the season.
  races: (SeasonRace | null)[];
  // Season/points/position are per season, so they're only rendered on the
  // season's first row and span the rest.
  isFirst: boolean;
  rowSpan: number;
  key: string;
}

// Flattens a season's car rows back onto a single row of rounds. Each round
// belongs to at most one car row, so the first non-empty entry is the result.
function combinedRaces(season: RacerSeason): (SeasonRace | null)[] {
  const rounds = season.carRows[0]?.races.length ?? 0;
  return Array.from(
    { length: rounds },
    (_, i) => season.carRows.map((r) => r.races[i]).find((e) => e) ?? null,
  );
}

export default function DriverSeasons({
  seasons,
}: {
  seasons: RacerSeason[];
}) {
  const [splitByCar, setSplitByCar] = useState(true);

  // Nothing to collapse unless the driver switched cars in some season, so
  // only offer the toggle when it would change the table.
  const canSplit = seasons.some((s) => s.carRows.length > 1);
  const split = splitByCar && canSplit;

  // Seasons vary in length, so lay every season's rounds side by side up to the
  // longest season; shorter seasons leave the trailing round columns blank.
  // Every car row within a season covers the same rounds, so the first is
  // representative of the whole season's length.
  const maxRounds = seasons.reduce(
    (m, s) => Math.max(m, s.carRows[0]?.races.length ?? 0),
    0,
  );
  const rounds = Array.from({ length: maxRounds }, (_, i) => i + 1);

  const displayRows: DisplayRow[] = split
    ? seasons.flatMap((season) =>
        season.carRows.map((carRow, i) => ({
          season,
          carLabel: carRow.car?.name ?? "–",
          races: carRow.races,
          isFirst: i === 0,
          rowSpan: season.carRows.length,
          key: `${season.championship.id}-${i}`,
        })),
      )
    : seasons.map((season) => ({
        season,
        carLabel: carsCountLabel(season.carRows),
        carTitle: carsLabel(season.carRows),
        races: combinedRaces(season),
        isFirst: true,
        rowSpan: 1,
        key: season.championship.id,
      }));

  return (
    <>
      <div className="mt-10 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Seasons</h2>
        {canSplit && (
          <ToggleSwitch
            checked={splitByCar}
            onChange={setSplitByCar}
            label="Split by car"
          />
        )}
      </div>

      {/* Season-by-season racing record: one row per season, each round's
          cell showing where the race was and the driver's finish. */}
      {/* items-start matters: the middle column's horizontal scrollbar makes
          it taller than the frozen tables wherever scrollbars take up space,
          and a stretched <table> hands the surplus to its rows — which
          would push each frozen row a few pixels below its scrollable
          counterpart, drifting further with every row. */}
      <div className="mt-4 flex items-start rounded-lg border border-neutral-800">
        {/* Frozen left: season name + car. Capped and fixed-layout on
            desktop so long championship/car names wrap instead of eating
            into the round columns' share of the row. */}
        <table className="shrink-0 border-collapse text-sm sm:table-fixed">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr className="h-16">
              <th className="border border-neutral-800 px-1.5 align-bottom text-left font-medium sm:w-44 sm:px-2">
                Season
              </th>
              <th className="border border-neutral-800 px-1.5 align-bottom text-left font-medium sm:w-32 sm:px-2">
                Car
              </th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map(
              ({ season, carLabel, carTitle, isFirst, rowSpan, key }) => (
                <tr key={key} className="h-14">
                  {isFirst && (
                    <td
                      rowSpan={rowSpan}
                      className="whitespace-nowrap border border-neutral-800 px-1.5 align-middle sm:whitespace-normal sm:break-words sm:px-2"
                    >
                      <Link
                        href={`/championships/${season.championship.id}`}
                        // Collapsed, this cell no longer spans the season's
                        // car rows, so keep a long name from growing the row
                        // past the rounds table beside it.
                        className={`font-medium hover:underline ${
                          split ? "" : "sm:line-clamp-2"
                        }`}
                        title={split ? undefined : season.championship.name}
                      >
                        {season.championship.name}
                      </Link>
                      <span className="block text-xs text-neutral-500">
                        {RACING_SERIES_LABELS[season.championship.series]}
                      </span>
                    </td>
                  )}
                  {/* Same again for the car: collapsed, a wrapping list of
                      every car driven would push this row out of step with
                      its counterpart in the rounds table. */}
                  <td
                    className={`border border-neutral-800 px-1.5 text-neutral-400 sm:px-2 ${
                      split
                        ? "whitespace-nowrap sm:whitespace-normal sm:break-words"
                        : "whitespace-nowrap"
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
              ),
            )}
          </tbody>
        </table>

        {/* Scrollable middle: one column per round. Pulled 1px left so its
            border collapses onto the season table's rather than doubling. */}
        <div className="-ml-px flex-1 overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-sm">
            <thead className="bg-neutral-900 text-neutral-400">
              <tr className="h-16">
                {rounds.map((round) => (
                  <th
                    key={round}
                    className="w-9 border border-neutral-800 px-1 align-bottom text-center font-medium sm:w-10"
                  >
                    R{round}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayRows.map(({ races, key }) => (
                <tr key={key} className="h-14">
                  {rounds.map((round) => {
                    const entry = races[round - 1];
                    if (!entry) {
                      return (
                        <td
                          key={round}
                          className="border border-neutral-800 bg-neutral-950"
                        />
                      );
                    }
                    const { race, cell } = entry;
                    return (
                      <td
                        key={round}
                        className="border border-neutral-800 px-1 text-center sm:px-1.5"
                        style={
                          cell
                            ? {
                                backgroundColor: resultColor(
                                  cell.rank,
                                  cell.retired,
                                ),
                              }
                            : undefined
                        }
                        title={
                          cell?.car
                            ? `${race.track.name} — ${cell.car.name}`
                            : race.track.name
                        }
                      >
                        <div
                          className={`flex flex-col items-center leading-tight ${
                            cell ? "text-neutral-900" : "text-neutral-400"
                          }`}
                        >
                          <FlagIcon countryCode={race.track.country_code} />
                          <span className="text-[10px]">
                            {race.track.short_code}
                          </span>
                          <span className="font-bold">
                            {cell ? (cell.retired ? "RET" : cell.rank) : "–"}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Frozen right: season points + finishing position. Pulled 1px left
            so the seam onto the rounds table stays a single border. */}
        <table className="-ml-px shrink-0 border-collapse text-sm sm:table-fixed">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr className="h-16">
              <th className="border border-neutral-800 px-1.5 align-bottom text-center font-medium sm:w-16 sm:px-2">
                Points
              </th>
              <th className="border border-neutral-800 px-1.5 align-bottom text-center font-medium sm:w-14 sm:px-2">
                Pos.
              </th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map(({ season, isFirst, rowSpan, key }) => {
              // A podium championship finish tints both summary cells with
              // the same gold/silver/bronze used for race results.
              const podium = season.position <= 3;
              const bg = podium
                ? { backgroundColor: resultColor(season.position, false) }
                : undefined;
              const text = podium ? "text-neutral-900" : "";
              return (
                <tr key={key} className="h-14">
                  {isFirst && (
                    <td
                      rowSpan={rowSpan}
                      className={`border border-neutral-800 px-1.5 text-center align-middle font-semibold sm:px-2 ${text}`}
                      style={bg}
                    >
                      {season.points}
                    </td>
                  )}
                  {isFirst && (
                    <td
                      rowSpan={rowSpan}
                      className={`whitespace-nowrap border border-neutral-800 px-1.5 text-center align-middle font-semibold sm:px-2 ${text}`}
                      style={bg}
                    >
                      {ordinal(season.position)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
