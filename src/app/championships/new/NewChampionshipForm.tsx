"use client";

import { useState } from "react";
import FlagIcon from "@/components/FlagIcon";
import type { RacingSeries, Track } from "@/lib/types";
import { createChampionship } from "../actions";

// Matches the server's DEFAULT_RACE_COUNT: a blank race count means 12.
const DEFAULT_RACE_COUNT = 12;

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

// "the must-include track" / "both must-include tracks" / "all 3 must-include
// tracks", and the verb form that agrees with it.
function group(n: number, noun: string) {
  if (n === 1) return `the ${noun}`;
  return n === 2 ? `both ${noun}s` : `all ${n} ${noun}s`;
}

function agree(n: number, verb: string) {
  if (n !== 1) return verb;
  if (verb === "go") return "goes";
  return /(s|sh|ch|x|z)$/.test(verb) ? `${verb}es` : `${verb}s`;
}

// "goes to a track drawn at random" / "go to tracks drawn at random".
function toRandom(n: number) {
  return `${agree(n, "go")} to ${n === 1 ? "a track" : "tracks"} drawn at random`;
}

function cap(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function runs(n: number) {
  return n === 1 ? "once" : `${n} times`;
}

function favouriteIds(tracks: Track[]) {
  return tracks.filter((t) => t.favourite).map((t) => t.id);
}

// Describes the schedule the current settings would produce, mirroring
// buildSchedule in ../actions.ts. Returns null when there is nothing to
// describe yet, or an `error` when the settings cannot be satisfied.
function schedulePreview(
  poolSize: number,
  mandatoryCount: number,
  raceCount: number | null,
): { error?: string; lines: string[] } | null {
  if (poolSize === 0 || raceCount === null) return null;

  if (mandatoryCount > raceCount) {
    return {
      error: `${plural(mandatoryCount, "track")} marked must-include will not fit in ${plural(raceCount, "race")}. Unstar some, or add more races.`,
      lines: [],
    };
  }

  const optionalCount = poolSize - mandatoryCount;
  const base = Math.floor(raceCount / poolSize);
  const extras = raceCount - base * poolSize;
  const must = group(mandatoryCount, "must-include track");
  const lines: string[] = [];

  if (extras === 0) {
    lines.push(`Every selected track races exactly ${runs(base)}.`);
    if (mandatoryCount > 0) {
      lines.push("The season divides evenly, so must-include changes nothing.");
    }
  } else if (mandatoryCount <= extras) {
    // The must-include repeats fit in the rounds left over, so no track is
    // dropped that a shorter-than-the-pool season would not have dropped anyway.
    const missed = poolSize - extras;
    lines.push(
      base === 0
        ? `${extras} of the ${poolSize} selected tracks ${agree(extras, "race")} once each, so ${plural(missed, "track")} ${agree(missed, "miss")} the season.`
        : `Every selected track races ${runs(base)}, and ${extras} of them ${agree(extras, "race")} one extra round.`,
    );

    if (mandatoryCount === 0) {
      lines.push(
        base === 0
          ? "Which tracks race is a random draw — star tracks to guarantee them a round."
          : `The extra ${extras === 1 ? "round" : "rounds"} ${toRandom(extras)}.`,
      );
    } else if (mandatoryCount === extras) {
      lines.push(
        base === 0
          ? `${cap(must)} ${agree(mandatoryCount, "fill")} the season exactly.`
          : `${cap(must)} ${agree(mandatoryCount, "take")} every extra round.`,
      );
    } else {
      lines.push(
        base === 0
          ? `${cap(must)} ${agree(mandatoryCount, "race")}, and the other ${plural(extras - mandatoryCount, "round")} ${toRandom(extras - mandatoryCount)}.`
          : `${cap(must)} ${agree(mandatoryCount, "take")} an extra round${mandatoryCount === 1 ? "" : " each"}, and the other ${plural(extras - mandatoryCount, "extra round")} ${toRandom(extras - mandatoryCount)}.`,
      );
    }
  } else {
    // More must-include tracks than rounds to spare: they repeat anyway, and
    // optional tracks are dropped to pay for it.
    const left = raceCount - mandatoryCount * (base + 1);
    const kept = left > 0 ? Math.floor(left / base) : 0;
    const rounds = raceCount - kept * base;
    const each = Math.floor(rounds / mandatoryCount);
    const over = rounds - each * mandatoryCount;
    const dropped = optionalCount - kept;

    lines.push(
      over === 0
        ? `${cap(must)} ${agree(mandatoryCount, "race")} ${runs(each)}.`
        : `${cap(must)} ${agree(mandatoryCount, "race")} ${runs(each)}, ${over} of them once more.`,
    );

    if (optionalCount > 0) {
      lines.push(
        kept === 0
          ? `That takes the whole season, so ${group(optionalCount, "other selected track")} ${agree(optionalCount, "miss")} it.`
          : `${kept} of the ${plural(optionalCount, "other selected track")} ${agree(kept, "race")} ${runs(base)}, and the other ${dropped} ${agree(dropped, "miss")} the season.`,
      );
    }
  }

  return { lines };
}

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
  // Tracks guaranteed a place in the schedule. Always a subset of `selected`.
  // Favourited tracks start starred so the common championship needs no
  // clicking; they are ordinary stars once here, and can be cleared.
  const [mandatory, setMandatory] = useState<Record<RacingSeries, Set<string>>>({
    project_cars_2: new Set(favouriteIds(pc2Tracks)),
    iracing: new Set(favouriteIds(iracingTracks)),
  });
  const [raceCount, setRaceCount] = useState(String(DEFAULT_RACE_COUNT));

  const tracks = series === "project_cars_2" ? pc2Tracks : iracingTracks;
  const currentSelected = selected[series];
  const currentMandatory = mandatory[series];

  const trimmedCount = raceCount.trim();
  const parsedCount = trimmedCount === "" ? DEFAULT_RACE_COUNT : Number(trimmedCount);
  const validCount =
    Number.isInteger(parsedCount) && parsedCount >= 1 ? parsedCount : null;

  const preview = schedulePreview(
    currentSelected.size,
    currentMandatory.size,
    validCount,
  );

  function toggleTrack(id: string) {
    setSelected((prev) => {
      const next = new Set(prev[series]);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...prev, [series]: next };
    });
    // A track that is not in the championship cannot be must-include.
    setMandatory((prev) => {
      if (!prev[series].has(id)) return prev;
      const next = new Set(prev[series]);
      next.delete(id);
      return { ...prev, [series]: next };
    });
  }

  // Marking a track must-include also puts it in the championship, so the
  // control never leaves the two states contradicting each other.
  function toggleMandatory(id: string) {
    const adding = !currentMandatory.has(id);
    setMandatory((prev) => {
      const next = new Set(prev[series]);
      if (adding) next.add(id);
      else next.delete(id);
      return { ...prev, [series]: next };
    });
    if (adding && !currentSelected.has(id)) {
      setSelected((prev) => ({
        ...prev,
        [series]: new Set(prev[series]).add(id),
      }));
    }
  }

  function selectAll() {
    setSelected((prev) => ({ ...prev, [series]: new Set(tracks.map((t) => t.id)) }));
  }

  function selectNone() {
    setSelected((prev) => ({ ...prev, [series]: new Set() }));
    setMandatory((prev) => ({ ...prev, [series]: new Set() }));
  }

  return (
    <form action={createChampionship} className="mt-6 space-y-4">
      {/* Narrow screens stack these. From lg the tracks get the room for two
          comfortable columns, and the settings keep a readable width instead
          of stretching across the whole page. */}
      <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start lg:gap-8">
        <div className="space-y-4">
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
              value={raceCount}
              onChange={(e) => setRaceCount(e.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none focus:border-neutral-400"
            />
            {preview?.error ? (
              <p className="mt-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {preview.error}
              </p>
            ) : (
              preview && (
                <div className="mt-2 space-y-1 text-xs text-neutral-500">
                  {preview.lines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              )
            )}
          </div>
        </div>

        <fieldset>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <legend className="block text-sm text-neutral-300">
              Tracks ({currentSelected.size} of {tracks.length} selected
              {currentMandatory.size > 0 && `, ${currentMandatory.size} must-include`})
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

          <p className="mt-1 text-xs text-neutral-500">
            Tick a track to put it in the pool; star it to guarantee it a round
            when the schedule cannot fit the pool evenly. Favourite tracks come
            pre-starred — unstar any this season does not need.
          </p>

          {tracks.length === 0 ? (
            <div className="mt-2 rounded-lg border border-neutral-800 px-3 py-6 text-center text-sm text-neutral-500">
              No tracks seeded for this game yet.
            </div>
          ) : (
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {tracks.map((track) => {
                const isMandatory = currentMandatory.has(track.id);
                return (
                  <div
                    key={track.id}
                    className={`flex items-center gap-2 rounded-md border bg-neutral-900 px-3 py-2 hover:border-neutral-500 ${
                      isMandatory ? "border-amber-500/60" : "border-neutral-700"
                    }`}
                  >
                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        name="track_ids"
                        value={track.id}
                        checked={currentSelected.has(track.id)}
                        onChange={() => toggleTrack(track.id)}
                      />
                      <FlagIcon countryCode={track.country_code} className="shrink-0 text-base" />
                      <span className="truncate text-sm">{track.name}</span>
                    </label>
                    <span className="shrink-0 rounded bg-neutral-800 px-1.5 py-0.5 text-xs font-medium text-neutral-400">
                      {track.short_code}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleMandatory(track.id)}
                      aria-pressed={isMandatory}
                      aria-label={`${isMandatory ? "Unmark" : "Mark"} ${track.name} as must-include`}
                      title={
                        isMandatory
                          ? "Must be included — click to unmark"
                          : "Guarantee this track a round"
                      }
                      className={`shrink-0 rounded px-1 text-sm leading-none ${
                        isMandatory
                          ? "text-amber-400 hover:text-amber-300"
                          : "text-neutral-600 hover:text-neutral-300"
                      }`}
                    >
                      {isMandatory ? "★" : "☆"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Must-include is a per-track flag rather than a second control, so it
              rides along as hidden fields for the tracks currently starred. */}
          {tracks
            .filter((t) => currentMandatory.has(t.id))
            .map((t) => (
              <input key={t.id} type="hidden" name="mandatory_track_ids" value={t.id} />
            ))}
        </fieldset>
      </div>

      <div className="lg:flex lg:justify-end">
        <button
          type="submit"
          disabled={
            currentSelected.size === 0 || validCount === null || preview?.error != null
          }
          className="w-full rounded-md bg-white px-3 py-2 font-medium text-black hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto lg:px-8"
        >
          Create championship
        </button>
      </div>
    </form>
  );
}
