import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import FlagIcon from "@/components/FlagIcon";
import { RACING_SERIES_LABELS, type RacingSeries, type Track } from "@/lib/types";

export const dynamic = "force-dynamic";

// Order the games consistently regardless of query result order.
const SERIES_ORDER: RacingSeries[] = ["project_cars_2", "iracing"];

export default async function TracksPage() {
  const supabase = await createClient();
  const { data: tracks, error } = await supabase
    .from("tracks")
    .select("id, name, short_code, country_code, source")
    .order("name")
    .returns<Track[]>();

  const bySeries = new Map<RacingSeries, Track[]>();
  for (const track of tracks ?? []) {
    const list = bySeries.get(track.source) ?? [];
    list.push(track);
    bySeries.set(track.source, list);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <Link href="/" className="text-sm text-neutral-400 hover:text-white">
        ← All championships
      </Link>

      <h1 className="mt-4 text-2xl font-bold">Tracks</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Every track available for a championship, grouped by the racing game
        used. A championship&apos;s race order is always drawn from its own
        game&apos;s pool.
      </p>

      {error && (
        <p className="mt-6 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          Could not load tracks: {error.message}
        </p>
      )}

      {!error &&
        SERIES_ORDER.map((series) => {
          const seriesTracks = bySeries.get(series) ?? [];
          return (
            <section key={series} className="mt-10">
              <h2 className="text-lg font-semibold">
                {RACING_SERIES_LABELS[series]}
              </h2>
              <p className="mt-1 text-sm text-neutral-400">
                {seriesTracks.length} track
                {seriesTracks.length === 1 ? "" : "s"} available.
              </p>

              {seriesTracks.length === 0 ? (
                <div className="mt-4 rounded-lg border border-neutral-800 px-3 py-6 text-center text-sm text-neutral-500">
                  No tracks seeded for this game yet.
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {seriesTracks.map((track) => (
                    <div
                      key={track.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-neutral-800 bg-neutral-900/40 px-3 py-2"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <FlagIcon
                          countryCode={track.country_code}
                          className="shrink-0 text-base"
                        />
                        <span className="truncate font-medium">
                          {track.name}
                        </span>
                      </span>
                      <span className="shrink-0 rounded bg-neutral-800 px-1.5 py-0.5 text-xs font-medium text-neutral-400">
                        {track.short_code}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
    </main>
  );
}
