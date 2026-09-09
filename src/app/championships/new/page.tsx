import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuth } from "@/lib/auth";
import type { RacingSeries, Track } from "@/lib/types";
import NewChampionshipForm from "./NewChampionshipForm";

export const dynamic = "force-dynamic";

export default async function NewChampionshipPage() {
  const { isAdmin } = await getAuth();
  if (!isAdmin) redirect("/auth/login");

  const supabase = await createClient();
  const { data: tracks, error } = await supabase
    .from("tracks")
    .select("id, name, short_code, country_code, source, archived, favourite")
    .eq("archived", false)
    .order("name")
    .returns<Track[]>();

  const bySeries: Record<RacingSeries, Track[]> = {
    project_cars_2: [],
    iracing: [],
  };
  for (const track of tracks ?? []) {
    bySeries[track.source].push(track);
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10 sm:max-w-2xl lg:max-w-5xl">
      <Link href="/" className="text-sm text-neutral-400 hover:text-white">
        ← All championships
      </Link>
      <h1 className="mt-4 text-2xl font-bold">New championship</h1>
      <p className="mt-2 max-w-2xl text-sm text-neutral-400">
        Pick a series and which of its tracks to include, then a random race
        order of the chosen length is generated automatically. Selected tracks
        share the races as evenly as they divide; whatever is left over is a
        random draw, so a short season leaves tracks out and a long one repeats
        some more than others. Star a track to keep it out of that draw: every
        starred track is guaranteed its round, and repeats before any other
        track does — if that leaves too few rounds to go round, unstarred
        tracks are dropped from the season to pay for it. Tracks favourited on
        the tracks page start out starred here; unstar any you do not want.
      </p>

      {error && (
        <p className="mt-6 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          Could not load tracks: {error.message}
        </p>
      )}

      {!error && <NewChampionshipForm pc2Tracks={bySeries.project_cars_2} iracingTracks={bySeries.iracing} />}
    </main>
  );
}
