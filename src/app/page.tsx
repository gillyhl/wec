import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  championshipWinner,
  getChampionshipData,
} from "@/lib/championship";
import FlagIcon from "@/components/FlagIcon";
import { RACING_SERIES_LABELS, type Championship } from "@/lib/types";

export const dynamic = "force-dynamic";

function StatusBadge({ status }: { status: Championship["status"] }) {
  const styles =
    status === "current"
      ? "bg-green-500/15 text-green-400 ring-green-500/30"
      : "bg-neutral-500/15 text-neutral-400 ring-neutral-500/30";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${styles}`}
    >
      {status}
    </span>
  );
}

export default async function HomePage() {
  const supabase = await createClient();
  const { data: championships, error } = await supabase
    .from("championships")
    .select("id, name, status, series, created_at")
    .order("created_at", { ascending: false })
    .returns<Championship[]>();

  // Resolve the champion for each finished championship so the list can show it.
  const finished = (championships ?? []).filter((c) => c.status === "finished");
  const winnerEntries = await Promise.all(
    finished.map(async (c) => {
      const data = await getChampionshipData(c.id);
      return [c.id, data ? championshipWinner(data.standings) : null] as const;
    }),
  );
  const winnerById = new Map(winnerEntries);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold">Championships</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Select a championship to view its standings.
      </p>

      {error && (
        <p className="mt-6 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          Could not load championships: {error.message}
        </p>
      )}

      {!error && (!championships || championships.length === 0) && (
        <p className="mt-6 text-sm text-neutral-400">
          No championships yet. Sign in as admin to create one.
        </p>
      )}

      {championships && championships.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-lg border border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900 text-neutral-400">
              <tr>
                <th className="px-4 py-3 font-medium">Championship</th>
                <th className="px-4 py-3 font-medium">Series</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Winner</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {championships.map((c) => (
                <tr
                  key={c.id}
                  className="border-t border-neutral-800 transition-colors hover:bg-neutral-900"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/championships/${c.id}`}
                      className="block font-medium hover:underline"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-300">
                    {RACING_SERIES_LABELS[c.series]}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3 text-neutral-300">
                    {(() => {
                      const winner = winnerById.get(c.id);
                      if (!winner) {
                        return <span className="text-neutral-600">—</span>;
                      }
                      return (
                        <span className="whitespace-nowrap">
                          <span className="mr-1.5" aria-hidden="true">
                            🏆
                          </span>
                          <FlagIcon
                            countryCode={winner.racer.country_code}
                            className="mr-1.5"
                          />
                          {winner.racer.first_name} {winner.racer.last_name}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-500">
                    <Link href={`/championships/${c.id}`}>View →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
