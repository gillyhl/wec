"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuth } from "@/lib/auth";
import type { Track } from "@/lib/types";

// The championship race order must always begin with this track.
const FIRST_TRACK_CODE = "IMO";

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Creates a new championship with a random race order that always starts at IMO.
export async function createChampionship(formData: FormData) {
  const { isAdmin } = await getAuth();
  if (!isAdmin) throw new Error("Not authorized");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Championship name is required");

  const supabase = await createClient();

  const { data: tracks, error: tracksError } = await supabase
    .from("tracks")
    .select("id, name, short_code, country_code")
    .returns<Track[]>();

  if (tracksError) throw new Error(tracksError.message);
  if (!tracks || tracks.length === 0) {
    throw new Error("No tracks have been seeded yet.");
  }

  const firstTrack = tracks.find((t) => t.short_code === FIRST_TRACK_CODE);
  if (!firstTrack) {
    throw new Error(`The ${FIRST_TRACK_CODE} track is required but was not found.`);
  }

  // IMO first, then every other track in random order.
  const rest = shuffle(tracks.filter((t) => t.id !== firstTrack.id));
  const orderedTracks = [firstTrack, ...rest];

  const { data: championship, error: champError } = await supabase
    .from("championships")
    .insert({ name, status: "current" })
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
