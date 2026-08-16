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
    .select("id, name, short_code, country_code, source, archived")
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
    <main className="mx-auto max-w-md px-4 py-10">
      <Link href="/" className="text-sm text-neutral-400 hover:text-white">
        ← All championships
      </Link>
      <h1 className="mt-4 text-2xl font-bold">New championship</h1>
      <p className="mt-2 text-sm text-neutral-400">
        Pick a series and which of its tracks to include, then a random race
        order of the chosen length is generated automatically. With at least
        as many selected tracks as races, no track repeats — with 20 or fewer
        races, at most 3 may come from any one country. If fewer tracks are
        selected than races, tracks are reused as evenly as a random draw
        allows so every race still gets a track.
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
