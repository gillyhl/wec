"use client";

import { useState } from "react";
import FlagIcon from "@/components/FlagIcon";
import type { RacingSeries, Track } from "@/lib/types";
import { createChampionship } from "../actions";

export default function NewChampionshipForm({
  pc2Tracks,
  iracingTracks,
}: {
  pc2Tracks: Track[];
  iracingTracks: Track[];
}) {
  const [series, setSeries] = useState<RacingSeries>("project_cars_2");
  const [selected, setSelected] = useState<Record<RacingSeries, Set<string>>>({
    project_cars_2: new Set(pc2Tracks.map((t) => t.id)),
    iracing: new Set(iracingTracks.map((t) => t.id)),
  });

  const tracks = series === "project_cars_2" ? pc2Tracks : iracingTracks;
  const currentSelected = selected[series];

  function toggleTrack(id: string) {
    setSelected((prev) => {
      const next = new Set(prev[series]);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...prev, [series]: next };
    });
  }

  function selectAll() {
    setSelected((prev) => ({ ...prev, [series]: new Set(tracks.map((t) => t.id)) }));
  }

  function selectNone() {
    setSelected((prev) => ({ ...prev, [series]: new Set() }));
  }

  return (
    <form action={createChampionship} className="mt-6 space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm text-neutral-300">
          Championship name
        </label>
        <input
          id="name"
          name="name"
          required
          placeholder="2026 WEC Season"
          className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none focus:border-neutral-400"
        />
      </div>

      <fieldset>
        <legend className="block text-sm text-neutral-300">Series</legend>
        <div className="mt-2 space-y-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 hover:border-neutral-500">
            <input
              type="radio"
              name="series"
              value="project_cars_2"
              checked={series === "project_cars_2"}
              onChange={() => setSeries("project_cars_2")}
              className="mt-1"
            />
            <span>
              <span className="block font-medium text-white">
                Project Cars 2
              </span>
              <span className="block text-xs text-neutral-400">
                {pc2Tracks.length} track{pc2Tracks.length === 1 ? "" : "s"}{" "}
                available.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 hover:border-neutral-500">
            <input
              type="radio"
              name="series"
              value="iracing"
              checked={series === "iracing"}
              onChange={() => setSeries("iracing")}
              className="mt-1"
            />
            <span>
              <span className="block font-medium text-white">iRacing</span>
              <span className="block text-xs text-neutral-400">
                {iracingTracks.length} track
                {iracingTracks.length === 1 ? "" : "s"} available.
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      <div>
        <label htmlFor="race_count" className="block text-sm text-neutral-300">
          Number of races
        </label>
        <input
          id="race_count"
          name="race_count"
          type="number"
          min={1}
          defaultValue={12}
          className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none focus:border-neutral-400"
        />
        <p className="mt-1 text-xs text-neutral-500">
          If this is more than the number of tracks selected below, tracks
          are reused to fill out the schedule.
        </p>
      </div>

      <fieldset>
        <div className="flex items-center justify-between gap-2">
          <legend className="block text-sm text-neutral-300">
            Tracks ({currentSelected.size} of {tracks.length} selected)
          </legend>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-300 hover:border-neutral-500 hover:text-white"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={selectNone}
              className="rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-300 hover:border-neutral-500 hover:text-white"
            >
              Select none
            </button>
          </div>
        </div>

        {tracks.length === 0 ? (
          <div className="mt-2 rounded-lg border border-neutral-800 px-3 py-6 text-center text-sm text-neutral-500">
            No tracks seeded for this game yet.
          </div>
        ) : (
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {tracks.map((track) => (
              <label
                key={track.id}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 hover:border-neutral-500"
              >
                <input
                  type="checkbox"
                  name="track_ids"
                  value={track.id}
                  checked={currentSelected.has(track.id)}
                  onChange={() => toggleTrack(track.id)}
                />
                <FlagIcon countryCode={track.country_code} className="shrink-0 text-base" />
                <span className="truncate text-sm">{track.name}</span>
                <span className="ml-auto shrink-0 rounded bg-neutral-800 px-1.5 py-0.5 text-xs font-medium text-neutral-400">
                  {track.short_code}
                </span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <button
        type="submit"
        disabled={currentSelected.size === 0}
        className="w-full rounded-md bg-white px-3 py-2 font-medium text-black hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Create championship
      </button>
    </form>
  );
}
