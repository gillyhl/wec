import Link from "next/link";
import FlagIcon from "@/components/FlagIcon";
import { getStatsData } from "@/lib/stats";
import { RACING_SERIES_LABELS } from "@/lib/types";
import type { Racer } from "@/lib/types";

export const dynamic = "force-dynamic";

// Racer name + flag, abbreviating the first name on mobile to save space.
// Mirrors the treatment used in the championship standings.
function RacerName({ racer }: { racer: Racer }) {
  return (
    <>
      <FlagIcon countryCode={racer.country_code} className="mr-1.5 sm:mr-2" />
      <span className="sm:hidden">
        {racer.first_name.charAt(0)}. {racer.last_name}
      </span>
      <span className="hidden sm:inline">
        {racer.first_name} {racer.last_name}
      </span>
    </>
  );
}

const numCell = "border border-neutral-800 px-1.5 text-center sm:px-3";
const headCell =
  "border border-neutral-800 px-1.5 py-2 text-center font-medium leading-tight sm:px-3";

export default async function StatsPage() {
  const { racerTotals, series } = await getStatsData();

  const hasData = racerTotals.length > 0;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <Link href="/" className="text-sm text-neutral-400 hover:text-white">
        ← All championships
      </Link>

      <h1 className="mt-4 text-2xl font-bold">Statistics</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Career totals across every championship, and per-track records by game.
      </p>

      {!hasData && (
        <div className="mt-6 rounded-lg border border-neutral-800 px-3 py-6 text-center text-sm text-neutral-500">
          No race results recorded yet.
        </div>
      )}

      {/* Overall per-racer totals */}
      {hasData && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Drivers</h2>
          <div className="mt-4 w-fit max-w-full overflow-x-auto rounded-lg border border-neutral-800">
            <table className="border-collapse text-sm">
              <thead className="bg-neutral-900 text-neutral-400">
                <tr>
                  <th className="border border-neutral-800 px-1.5 py-2 text-left font-medium sm:px-3">
                    Racer
                  </th>
                  <th className={headCell}>Races</th>
                  <th className={headCell}>Wins</th>
                  <th className={headCell}>Podiums</th>
                  <th className={headCell}>Points finishes</th>
                  <th className={headCell}>Retirements</th>
                  <th className={headCell}>Titles</th>
                  <th className={headCell}>Points</th>
                </tr>
              </thead>
              <tbody>
                {racerTotals.map((row) => (
                  <tr key={row.racer.id} className="h-12">
                    <td className="whitespace-nowrap border border-neutral-800 px-1.5 font-medium sm:px-3">
                      <RacerName racer={row.racer} />
                    </td>
                    <td className={numCell}>{row.races}</td>
                    <td className={numCell}>{row.wins}</td>
                    <td className={numCell}>{row.podiums}</td>
                    <td className={numCell}>{row.pointsFinishes}</td>
                    <td className={numCell}>{row.retirements}</td>
                    <td className={numCell}>{row.championshipsWon}</td>
                    <td className={`${numCell} font-semibold`}>{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Per-track records, one table per game, ordered by points scored */}
      {series.map((s) => (
        <section key={s.series} className="mt-12">
          <h2 className="text-lg font-semibold">
            {RACING_SERIES_LABELS[s.series]} — tracks
          </h2>
          <div className="mt-4 w-fit max-w-full overflow-x-auto rounded-lg border border-neutral-800">
            <table className="border-collapse text-sm">
              <thead className="bg-neutral-900 text-neutral-400">
                <tr>
                  <th className="border border-neutral-800 px-1.5 py-2 text-left font-medium sm:px-3">
                    Track
                  </th>
                  <th className="border border-neutral-800 px-1.5 py-2 text-left font-medium sm:px-3">
                    Racer
                  </th>
                  <th className={headCell}>Races</th>
                  <th className={headCell}>Best finish</th>
                  <th className={headCell}>Wins</th>
                  <th className={headCell}>Podiums</th>
                  <th className={headCell}>Points finishes</th>
                  <th className={headCell}>Retirements</th>
                  <th className={headCell}>Points</th>
                </tr>
              </thead>
              <tbody>
                {s.rows.map((row) => (
                  <tr key={`${row.track.id}-${row.racer.id}`} className="h-12">
                    <td className="whitespace-nowrap border border-neutral-800 px-1.5 font-medium sm:px-3">
                      <FlagIcon
                        countryCode={row.track.country_code}
                        className="mr-1.5 sm:mr-2"
                      />
                      <span className="sm:hidden">{row.track.short_code}</span>
                      <span className="hidden sm:inline">{row.track.name}</span>
                    </td>
                    <td className="whitespace-nowrap border border-neutral-800 px-1.5 font-medium sm:px-3">
                      <RacerName racer={row.racer} />
                    </td>
                    <td className={numCell}>{row.races}</td>
                    <td className={numCell}>{row.bestFinish ?? "—"}</td>
                    <td className={numCell}>{row.wins}</td>
                    <td className={numCell}>{row.podiums}</td>
                    <td className={numCell}>{row.pointsFinishes}</td>
                    <td className={numCell}>{row.retirements}</td>
                    <td className={`${numCell} font-semibold`}>{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </main>
  );
}
