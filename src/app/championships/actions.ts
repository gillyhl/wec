"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuth } from "@/lib/auth";
import type { RacingSeries, Track } from "@/lib/types";

// Every series (Project Cars 2 and iRacing alike) builds its race order the
// same way: a user-chosen number of races drawn from whichever tracks the
// admin selected for the championship, with any track the admin marked
// must-include guaranteed a place in the schedule (see buildSchedule).
const DEFAULT_RACE_COUNT = 12;

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Builds the championship's race order from the tracks the admin selected.
//
// Must-include tracks outrank the rest of the pool in both directions: they are
// the tracks that repeat when the season is longer than the pool, and the
// tracks that survive when it is shorter. Writing r for the race count, m for
// the must-include tracks, n for the optional tracks that make the cut, q and p
// for how often each of those races, and s for the rounds left spare:
//
//     r = m*q + n*p + s
//
//   - The season divides evenly (s = 0, q = p): every selected track races the
//     same number of times, and must-include makes no difference.
//   - Fewer races than tracks (p = 0, q = 1): every must-include track takes a
//     round and the rest of the season is a random draw from the optional
//     tracks, so the tracks not drawn sit it out.
//   - More races than tracks, with rounds to spare (m <= s): the whole pool
//     races p times, every must-include track repeats (q = p + 1), and the
//     rounds still spare go to random optional tracks.
//   - More races than tracks, without (m > s): every must-include track
//     repeats anyway, and the rounds that costs come out of the optional pool.
//     Only as many optional tracks as still fit race p times each; the rest
//     miss the season entirely.
//
// q - p is 0 or 1 in every case but the last, where the rounds freed by the
// dropped tracks pile onto the must-include ones and can push q further ahead
// (2 must-include tracks over a 4-track pool and 13 races race 5 times each,
// against 3 for the single optional track that survives). Keeping as many
// optional tracks as the repeats allow is what holds that gap to its minimum.
// What always holds: every must-include track races, no optional track races
// more often than a must-include one, and within each group the counts differ
// by at most one.
//
// The finished multiset is shuffled, so a track's appearances land in a random
// order rather than in blocks.
function buildSchedule(
  tracks: Track[],
  mandatoryIds: Set<string>,
  raceCount: number,
): Track[] {
  if (tracks.length === 0) {
    throw new Error("At least one track must be selected.");
  }
  if (!Number.isInteger(raceCount) || raceCount < 1) {
    throw new Error("Number of races must be a positive whole number.");
  }

  const mandatory = tracks.filter((t) => mandatoryIds.has(t.id));
  const optional = tracks.filter((t) => !mandatoryIds.has(t.id));

  // Every must-include track needs a round of its own, so there have to be at
  // least as many races as must-include tracks.
  if (mandatory.length > raceCount) {
    throw new Error(
      `${mandatory.length} tracks are marked must-include, which will not fit in a ${raceCount}-race championship.`,
    );
  }

  const base = Math.floor(raceCount / tracks.length);
  const extras = raceCount - base * tracks.length;

  const pool: Track[] = [];
  const add = (list: Track[], times: number) => {
    for (let i = 0; i < times; i++) pool.push(...list);
  };

  if (extras === 0) {
    // Divides evenly over the whole pool, so nothing has to give.
    add(tracks, base);
  } else if (mandatory.length <= extras) {
    // The must-include repeats fit inside the leftover rounds, so every
    // selected track still races and the surplus goes to random optional ones.
    add(tracks, base);
    pool.push(...mandatory);
    pool.push(...shuffle(optional).slice(0, extras - mandatory.length));
  } else {
    // More must-include tracks than leftover rounds. They each repeat anyway,
    // and the optional pool pays for it by losing tracks. base >= 1 here:
    // base === 0 makes every round a leftover (extras === raceCount), which
    // mandatory.length is already checked not to exceed.
    //
    // `left` is what remains once every must-include track has its repeat, so
    // it buys as many whole optional runs as it covers — fewer than the pool
    // holds, since left = base*n + extras - mandatory.length and extras is the
    // smaller of those two. It goes negative when even an empty optional pool
    // cannot fund the repeats, which just means no optional track survives.
    const left = raceCount - mandatory.length * (base + 1);
    const kept = left > 0 ? Math.floor(left / base) : 0;
    add(shuffle(optional).slice(0, kept), base);

    // Everything the surviving optional tracks did not take belongs to the
    // must-include tracks, split as evenly as it divides between them. That is
    // at least base + 1 each whenever `left` was not negative.
    const rounds = raceCount - kept * base;
    const each = Math.floor(rounds / mandatory.length);
    add(mandatory, each);
    pool.push(...shuffle(mandatory).slice(0, rounds - each * mandatory.length));
  }

  return shuffle(pool);
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
    .select("id, name, short_code, country_code, source, archived, favourite")
    .eq("source", series)
    .eq("archived", false)
    .returns<Track[]>();

  if (tracksError) throw new Error(tracksError.message);
  if (!tracks || tracks.length === 0) {
    throw new Error("No non-archived tracks are available for this series.");
  }

  const selectedTrackIds = new Set(formData.getAll("track_ids").map(String));
  const selectedTracks = tracks.filter((t) => selectedTrackIds.has(t.id));
  if (selectedTracks.length === 0) {
    throw new Error("At least one track must be selected for the championship.");
  }

  // Marking a track must-include only means anything while it is also
  // selected, so drop any that were unticked after being marked.
  const mandatoryTrackIds = new Set(
    formData
      .getAll("mandatory_track_ids")
      .map(String)
      .filter((id) => selectedTrackIds.has(id)),
  );

  const raw = String(formData.get("race_count") ?? "").trim();
  const raceCount = raw === "" ? DEFAULT_RACE_COUNT : Number.parseInt(raw, 10);
  const orderedTracks = buildSchedule(selectedTracks, mandatoryTrackIds, raceCount);

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
// racer's result. Every result saved (finish or retirement) must record which
// car the racer used. The DB trigger recomputes championship points
// automatically.
export async function saveRaceResults(formData: FormData) {
  const { isAdmin } = await getAuth();
  if (!isAdmin) throw new Error("Not authorized");

  const raceId = String(formData.get("race_id") ?? "");
  const championshipId = String(formData.get("championship_id") ?? "");
  if (!raceId || !championshipId) throw new Error("Missing race reference");

  const supabase = await createClient();

  const { data: racers } = await supabase
    .from("racers")
    .select("id, first_name, last_name")
    .returns<{ id: string; first_name: string; last_name: string }[]>();

  const toUpsert: {
    race_id: string;
    racer_id: string;
    car_id: string;
    rank: number | null;
    retired: boolean;
  }[] = [];
  const toClear: string[] = [];

  for (const racer of racers ?? []) {
    const retired = formData.get(`retired_${racer.id}`) != null;
    const raw = String(formData.get(`rank_${racer.id}`) ?? "").trim();
    const rank = Number.parseInt(raw, 10);
    const carId = String(formData.get(`car_${racer.id}`) ?? "").trim();

    if (retired) {
      // A retirement has no finishing position, but still needs a car.
      if (!carId) {
        throw new Error(
          `Select a car for ${racer.first_name} ${racer.last_name}'s result.`,
        );
      }
      toUpsert.push({
        race_id: raceId,
        racer_id: racer.id,
        car_id: carId,
        rank: null,
        retired: true,
      });
    } else if (raw === "" || Number.isNaN(rank) || rank < 1) {
      toClear.push(racer.id);
    } else {
      if (!carId) {
        throw new Error(
          `Select a car for ${racer.first_name} ${racer.last_name}'s result.`,
        );
      }
      toUpsert.push({
        race_id: raceId,
        racer_id: racer.id,
        car_id: carId,
        rank,
        retired: false,
      });
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

// Records the AI difficulty a race was raced against, or clears it when left
// blank. No upper bound — AI strength scales vary by game.
export async function saveRaceDifficulty(formData: FormData) {
  const { isAdmin } = await getAuth();
  if (!isAdmin) throw new Error("Not authorized");

  const raceId = String(formData.get("race_id") ?? "");
  const championshipId = String(formData.get("championship_id") ?? "");
  if (!raceId || !championshipId) throw new Error("Missing race reference");

  const raw = String(formData.get("ai_difficulty") ?? "").trim();
  let aiDifficulty: number | null = null;
  if (raw !== "") {
    aiDifficulty = Number.parseInt(raw, 10);
    if (Number.isNaN(aiDifficulty) || aiDifficulty < 0) {
      throw new Error("AI difficulty must be a non-negative number.");
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("races")
    .update({ ai_difficulty: aiDifficulty })
    .eq("id", raceId);
  if (error) throw new Error(error.message);

  revalidatePath(`/championships/${championshipId}`);
  redirect(`/championships/${championshipId}/races/${raceId}`);
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

// Renames a championship. The new name must be non-empty; trailing/leading
// whitespace is trimmed.
export async function renameChampionship(formData: FormData) {
  const { isAdmin } = await getAuth();
  if (!isAdmin) throw new Error("Not authorized");

  const championshipId = String(formData.get("championship_id") ?? "");
  if (!championshipId) throw new Error("Missing championship reference");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Championship name is required");

  const supabase = await createClient();
  const { error } = await supabase
    .from("championships")
    .update({ name })
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
