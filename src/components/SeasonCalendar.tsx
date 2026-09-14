"use client";

import { useState } from "react";
import FlagIcon from "@/components/FlagIcon";
import ToggleSwitch from "@/components/ToggleSwitch";
import { formatRaceDate } from "@/lib/dates";
import { FAVOURITE_LABEL, FAVOURITE_TINT } from "@/lib/tracks";
import type { RaceWithTrack } from "@/lib/championship";

// The season's schedule as a plain list — one row per round, in the order the
// races are run. The standings matrix above already carries every round as a
// column, but a column only has room for a flag and a three-letter code; this
// is where the full track name and the date it was raced on fit. Reference
// rather than results, so it stays collapsed until someone asks for it.
export default function SeasonCalendar({
  races,
}: {
  // The championship's races, in round order.
  races: RaceWithTrack[];
}) {
  const [show, setShow] = useState(false);

  const dated = races.filter((race) => race.race_date !== null).length;

  return (
    <div className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Calendar</h2>
          <p className="mt-1 text-sm text-neutral-400">
            {races.length} {races.length === 1 ? "round" : "rounds"}
            {dated < races.length &&
              ` · ${races.length - dated} not yet dated`}
          </p>
        </div>
        <ToggleSwitch
          checked={show}
          onChange={setShow}
          label={show ? "Hide calendar" : "Show calendar"}
        />
      </div>

      {show && (
        <div className="mt-4 w-fit max-w-full overflow-x-auto rounded-lg border border-neutral-800">
          <table className="border-collapse text-sm">
            <thead className="bg-neutral-900 text-neutral-400">
              <tr>
                <th className="border border-neutral-800 px-2 py-2 text-left font-medium sm:px-3">
                  #
                </th>
                <th className="border border-neutral-800 px-2 py-2 text-left font-medium sm:px-3">
                  Track
                </th>
                <th className="border border-neutral-800 px-2 py-2 text-left font-medium sm:px-3">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {races.map((race) => {
                const date = formatRaceDate(race.race_date);
                return (
                  <tr key={race.id} className="h-10">
                    <td className="border border-neutral-800 px-2 text-neutral-400 sm:px-3">
                      {race.round}
                    </td>
                    <td
                      className={`whitespace-nowrap border border-neutral-800 px-2 font-medium sm:px-3 ${
                        race.track.favourite ? FAVOURITE_TINT : ""
                      }`}
                      title={
                        race.track.favourite
                          ? `${race.track.name} — a favourite`
                          : race.track.name
                      }
                    >
                      <FlagIcon
                        countryCode={race.track.country_code}
                        className="mr-2"
                      />
                      <span
                        className={race.track.favourite ? FAVOURITE_LABEL : ""}
                      >
                        {race.track.name}
                      </span>
                    </td>
                    <td className="whitespace-nowrap border border-neutral-800 px-2 text-neutral-400 sm:px-3">
                      {date ?? "–"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
