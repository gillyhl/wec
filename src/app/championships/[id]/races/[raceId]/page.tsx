import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuth } from "@/lib/auth";
import { flagEmoji } from "@/lib/flags";
import { saveRaceResults } from "../../../actions";
import type { Racer, RaceResult, Track } from "@/lib/types";

export const dynamic = "force-dynamic";

interface RaceRow {
  id: string;
  round: number;
  championship_id: string;
  track: Track;
}

export default async function RaceResultsPage({
  params,
}: {
  params: Promise<{ id: string; raceId: string }>;
}) {
  const { id, raceId } = await params;
  const { isAdmin } = await getAuth();
  if (!isAdmin) redirect("/auth/login");

  const supabase = await createClient();

  const { data: race } = await supabase
    .from("races")
    .select("id, round, championship_id, track:tracks(*)")
    .eq("id", raceId)
    .eq("championship_id", id)
    .maybeSingle<RaceRow>();

  if (!race) notFound();

  const { data: racers } = await supabase
    .from("racers")
    .select("id, first_name, last_name, country_code")
    .order("last_name", { ascending: true })
    .returns<Racer[]>();

  const { data: results } = await supabase
    .from("race_results")
    .select("id, race_id, racer_id, rank")
    .eq("race_id", raceId)
    .returns<RaceResult[]>();

  const rankByRacer = new Map<string, number>(
    (results ?? []).map((r) => [r.racer_id, r.rank]),
  );

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Link
        href={`/championships/${id}`}
        className="text-sm text-neutral-400 hover:text-white"
      >
        ← Back to championship
      </Link>

      <h1 className="mt-4 text-2xl font-bold">
        <span className="mr-2">{flagEmoji(race.track.country_code)}</span>
        {race.track.name}
      </h1>
      <p className="mt-1 text-sm text-neutral-400">
        Round {race.round} · {race.track.short_code} · Enter each racer&apos;s
        finishing position. Leave blank to clear.
      </p>

      <form action={saveRaceResults} className="mt-6 space-y-4">
        <input type="hidden" name="race_id" value={race.id} />
        <input type="hidden" name="championship_id" value={id} />

        {(racers ?? []).map((racer) => (
          <div key={racer.id} className="flex items-center justify-between gap-4">
            <label htmlFor={`rank_${racer.id}`} className="text-sm">
              <span className="mr-2">{flagEmoji(racer.country_code)}</span>
              {racer.first_name} {racer.last_name}
            </label>
            <input
              id={`rank_${racer.id}`}
              name={`rank_${racer.id}`}
              type="number"
              min={1}
              defaultValue={rankByRacer.get(racer.id) ?? ""}
              placeholder="–"
              className="w-20 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-center text-white outline-none focus:border-neutral-400"
            />
          </div>
        ))}

        <button
          type="submit"
          className="mt-2 w-full rounded-md bg-white px-3 py-2 font-medium text-black hover:bg-neutral-200"
        >
          Save results
        </button>
      </form>
    </main>
  );
}
