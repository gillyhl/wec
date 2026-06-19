"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuth } from "@/lib/auth";
import type { RacingSeries, Track } from "@/lib/types";

// Project Cars 2 championships must always begin their race order with this track.
const FIRST_TRACK_CODE = "IMO";

// iRacing championships run a schedule of a user-chosen length chosen from the
// track pool, with no track repeated. Up to IRACING_COUNTRY_CAP_THRESHOLD races
// at most IRACING_MAX_PER_COUNTRY tracks may come from the same country; longer
// schedules drop that limit (there aren't enough countries to honour it).
const IRACING_DEFAULT_RACES = 12;
const IRACING_MAX_PER_COUNTRY = 3;
const IRACING_COUNTRY_CAP_THRESHOLD = 20;

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Project Cars 2 race order: IMO first, then every other track in random order.
function projectCars2Schedule(tracks: Track[]): Track[] {
  const firstTrack = tracks.find((t) => t.short_code === FIRST_TRACK_CODE);
  if (!firstTrack) {
    throw new Error(`The ${FIRST_TRACK_CODE} track is required but was not found.`);
  }
  const rest = shuffle(tracks.filter((t) => t.id !== firstTrack.id));
  return [firstTrack, ...rest];
}

// iRacing race order: a random subset of `raceCount` tracks from the pool with
// no repeated track. Schedules of IRACING_COUNTRY_CAP_THRESHOLD or fewer races
// allow at most IRACING_MAX_PER_COUNTRY tracks from the same country; longer
// ones lift that cap.
function iracingSchedule(tracks: Track[], raceCount: number): Track[] {
  if (raceCount > tracks.length) {
    throw new Error(
      `Only ${tracks.length} iRacing tracks are available, so a ${raceCount}-race ` +
        `schedule with no repeated tracks is not possible.`,
    );
  }

  const capPerCountry = raceCount <= IRACING_COUNTRY_CAP_THRESHOLD;
  const selected: Track[] = [];
  const perCountry: Record<string, number> = {};

  for (const track of shuffle(tracks)) {
    if (selected.length >= raceCount) break;
    if (capPerCountry) {
      const count = perCountry[track.country_code] ?? 0;
      if (count >= IRACING_MAX_PER_COUNTRY) continue;
      perCountry[track.country_code] = count + 1;
    }
    selected.push(track);
  }

  if (selected.length < raceCount) {
    throw new Error(
      `Could not build a ${raceCount}-race schedule with at most ` +
        `${IRACING_MAX_PER_COUNTRY} tracks per country.`,
    );
  }

  // The pool was already shuffled, so selection order is itself random.
  return selected;
}

// Creates a new championship and its race schedule for the chosen series.
export async function createChampionship(formData: FormData) {
  const { isAdmin } = await getAuth();
  if (!isAdmin) throw new Error("Not authorized");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Championship name is required");

  const series = String(formData.get("series") ?? "") as RacingSeries;
  if (series !== "project_cars_2" && series !== "iracing") {
    throw new Error("A valid series must be selected");
  }

  const supabase = await createClient();

  const { data: tracks, error: tracksError } = await supabase
    .from("tracks")
    .select("id, name, short_code, country_code, source")
    .eq("source", series)
    .returns<Track[]>();

  if (tracksError) throw new Error(tracksError.message);
  if (!tracks || tracks.length === 0) {
    throw new Error("No tracks have been seeded for this series yet.");
  }

  let orderedTracks: Track[];
  if (series === "iracing") {
    const raw = String(formData.get("race_count") ?? "").trim();
    const raceCount = raw === "" ? IRACING_DEFAULT_RACES : Number.parseInt(raw, 10);
    if (!Number.isInteger(raceCount) || raceCount < 1) {
      throw new Error("Number of races must be a positive whole number.");
    }
    orderedTracks = iracingSchedule(tracks, raceCount);
  } else {
    orderedTracks = projectCars2Schedule(tracks);
  }

  const { data: championship, error: champError } = await supabase
    .from("championships")
    .insert({ name, status: "current", series })
    .select("id")
    .single<{ id: string }>();

  if (champError || !championship) {
    throw new Error(champError?.message ?? "Could not create championship");
  }

  const races = orderedTracks.map((track, i) => ({
    championship_id: championship.id,
    track_id: track.id,
    round: i + 1,
  }));

  const { error: racesError } = await supabase.from("races").insert(races);
  if (racesError) {
    // Roll back the championship so we don't leave an empty one behind.
    await supabase.from("championships").delete().eq("id", championship.id);
    throw new Error(racesError.message);
  }

  revalidatePath("/");
  redirect(`/championships/${championship.id}`);
}

// Saves finishing positions for a race. A racer can be marked retired (DNF)
// instead of given a position; a blank/zero rank with no retirement clears that
// racer's result. The DB trigger recomputes championship points automatically.
export async function saveRaceResults(formData: FormData) {
  const { isAdmin } = await getAuth();
  if (!isAdmin) throw new Error("Not authorized");

  const raceId = String(formData.get("race_id") ?? "");
  const championshipId = String(formData.get("championship_id") ?? "");
  if (!raceId || !championshipId) throw new Error("Missing race reference");

  const supabase = await createClient();

  const { data: racers } = await supabase
    .from("racers")
    .select("id")
    .returns<{ id: string }[]>();

  const toUpsert: {
    race_id: string;
    racer_id: string;
    rank: number | null;
    retired: boolean;
  }[] = [];
  const toClear: string[] = [];

  for (const racer of racers ?? []) {
    const retired = formData.get(`retired_${racer.id}`) != null;
    const raw = String(formData.get(`rank_${racer.id}`) ?? "").trim();
    const rank = Number.parseInt(raw, 10);

    if (retired) {
      // A retirement has no finishing position.
      toUpsert.push({ race_id: raceId, racer_id: racer.id, rank: null, retired: true });
    } else if (raw === "" || Number.isNaN(rank) || rank < 1) {
      toClear.push(racer.id);
    } else {
      toUpsert.push({ race_id: raceId, racer_id: racer.id, rank, retired: false });
    }
  }

  if (toClear.length > 0) {
    const { error } = await supabase
      .from("race_results")
      .delete()
      .eq("race_id", raceId)
      .in("racer_id", toClear);
    if (error) throw new Error(error.message);
  }

  if (toUpsert.length > 0) {
    const { error } = await supabase
      .from("race_results")
      .upsert(toUpsert, { onConflict: "race_id,racer_id" });
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/championships/${championshipId}`);
  redirect(`/championships/${championshipId}`);
}

// Marks a championship as finished. Only permitted once every race has at least
// one result recorded, since the final standings must be settled before a
// champion can be declared.
export async function completeChampionship(formData: FormData) {
  const { isAdmin } = await getAuth();
  if (!isAdmin) throw new Error("Not authorized");

  const championshipId = String(formData.get("championship_id") ?? "");
  if (!championshipId) throw new Error("Missing championship reference");

  const supabase = await createClient();

  const { data: races } = await supabase
    .from("races")
    .select("id")
    .eq("championship_id", championshipId)
    .returns<{ id: string }[]>();

  const raceIds = (races ?? []).map((r) => r.id);
  if (raceIds.length === 0) {
    throw new Error("Championship has no races to complete.");
  }

  const { data: results } = await supabase
    .from("race_results")
    .select("race_id")
    .in("race_id", raceIds)
    .returns<{ race_id: string }[]>();

  const racesWithResults = new Set((results ?? []).map((r) => r.race_id));
  const allHaveResults = raceIds.every((id) => racesWithResults.has(id));
  if (!allHaveResults) {
    throw new Error(
      "Every race must have a result before the championship can be completed.",
    );
  }

  const { error } = await supabase
    .from("championships")
    .update({ status: "finished" })
    .eq("id", championshipId);
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath(`/championships/${championshipId}`);
  redirect(`/championships/${championshipId}`);
}

// Permanently deletes a championship. Its races, results and points rows are
// removed automatically by the ON DELETE CASCADE foreign keys.
export async function deleteChampionship(formData: FormData) {
  const { isAdmin } = await getAuth();
  if (!isAdmin) throw new Error("Not authorized");

  const championshipId = String(formData.get("championship_id") ?? "");
  if (!championshipId) throw new Error("Missing championship reference");

  const supabase = await createClient();
  const { error } = await supabase
    .from("championships")
    .delete()
    .eq("id", championshipId);
  if (error) throw new Error(error.message);

  revalidatePath("/");
  redirect("/");
}

// Clears all of a race's results, removing its scores from the championship
// while keeping the race itself in the schedule. Deleting the race_results rows
// fires the points-recompute trigger automatically.
export async function clearRaceResults(formData: FormData) {
  const { isAdmin } = await getAuth();
  if (!isAdmin) throw new Error("Not authorized");

  const raceId = String(formData.get("race_id") ?? "");
  const championshipId = String(formData.get("championship_id") ?? "");
  if (!raceId || !championshipId) throw new Error("Missing race reference");

  const supabase = await createClient();

  const { error } = await supabase
    .from("race_results")
    .delete()
    .eq("race_id", raceId);
  if (error) throw new Error(error.message);

  revalidatePath(`/championships/${championshipId}`);
  redirect(`/championships/${championshipId}`);
}
