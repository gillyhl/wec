import Link from "next/link";
import FlagIcon from "@/components/FlagIcon";
import { getStatsData } from "@/lib/stats";
import { RACING_SERIES_LABELS } from "@/lib/types";
import type { Racer, Track } from "@/lib/types";

export const dynamic = "force-dynamic";

// Racer name + flag, abbreviating the first name on mobile to save space.
// Mirrors the treatment used in the championship standings. Links through to
// the driver's full racing history.
function RacerName({ racer }: { racer: Racer }) {
  return (
    <Link
      href={`/drivers/${racer.id}`}
      className="hover:underline"
    >
      <FlagIcon countryCode={racer.country_code} className="mr-1.5 sm:mr-2" />
      <span className="sm:hidden">
        {racer.first_name.charAt(0)}. {racer.last_name}
      </span>
      <span className="hidden sm:inline">
        {racer.first_name} {racer.last_name}
      </span>
    </Link>
  );
}

// Track flag + name (short code on mobile) with its game labelled beneath,
// mirroring the per-track tables.
function TrackName({ track }: { track: Track }) {
  return (
    <>
      <FlagIcon countryCode={track.country_code} className="mr-1.5 sm:mr-2" />
      <span className="sm:hidden">{track.short_code}</span>
      <span className="hidden sm:inline">{track.name}</span>
      <span className="block text-xs font-normal text-neutral-500">
        {RACING_SERIES_LABELS[track.source]}
      </span>
    </>
  );
}

const numCell = "border border-neutral-800 px-1.5 text-center sm:px-3";
const headCell =
  "border border-neutral-800 px-1.5 py-2 text-center font-medium leading-tight sm:px-3";

export default async function StatsPage() {
  const { racerTotals, series, trackSpecialists, bestTrackByRacer } =
    await getStatsData();

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

      {/* Track specialists: the strongest record at each circuit */}
      {hasData && trackSpecialists.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-semibold">Track specialists</h2>
          <p className="mt-1 text-sm text-neutral-400">
            The driver with the strongest record at each circuit.
          </p>
          <div className="mt-4 w-fit max-w-full overflow-x-auto rounded-lg border border-neutral-800">
            <table className="border-collapse text-sm">
              <thead className="bg-neutral-900 text-neutral-400">
                <tr>
                  <th className="border border-neutral-800 px-1.5 py-2 text-left font-medium sm:px-3">
                    Track
                  </th>
                  <th className="border border-neutral-800 px-1.5 py-2 text-left font-medium sm:px-3">
                    Specialist
                  </th>
                  <th className={headCell}>Races</th>
                  <th className={headCell}>Best finish</th>
                  <th className={headCell}>Wins</th>
                  <th className={headCell}>Points</th>
                </tr>
              </thead>
              <tbody>
                {trackSpecialists.map((row) => (
                  <tr key={row.track.id} className="h-12">
                    <td className="whitespace-nowrap border border-neutral-800 px-1.5 font-medium sm:px-3">
                      <TrackName track={row.track} />
                    </td>
                    <td className="whitespace-nowrap border border-neutral-800 px-1.5 font-medium sm:px-3">
                      <RacerName racer={row.racer} />
                    </td>
                    <td className={numCell}>{row.races}</td>
                    <td className={numCell}>{row.bestFinish ?? "—"}</td>
                    <td className={numCell}>{row.wins}</td>
                    <td className={`${numCell} font-semibold`}>{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Each driver's strongest track */}
      {hasData && bestTrackByRacer.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-semibold">Best track by driver</h2>
          <p className="mt-1 text-sm text-neutral-400">
            The circuit where each driver has their strongest record.
          </p>
          <div className="mt-4 w-fit max-w-full overflow-x-auto rounded-lg border border-neutral-800">
            <table className="border-collapse text-sm">
              <thead className="bg-neutral-900 text-neutral-400">
                <tr>
                  <th className="border border-neutral-800 px-1.5 py-2 text-left font-medium sm:px-3">
                    Racer
                  </th>
                  <th className="border border-neutral-800 px-1.5 py-2 text-left font-medium sm:px-3">
                    Track
                  </th>
                  <th className={headCell}>Races</th>
                  <th className={headCell}>Best finish</th>
                  <th className={headCell}>Wins</th>
                  <th className={headCell}>Points</th>
                </tr>
              </thead>
              <tbody>
                {bestTrackByRacer.map((row) => (
                  <tr key={row.racer.id} className="h-12">
                    <td className="whitespace-nowrap border border-neutral-800 px-1.5 font-medium sm:px-3">
                      <RacerName racer={row.racer} />
                    </td>
                    <td className="whitespace-nowrap border border-neutral-800 px-1.5 font-medium sm:px-3">
                      <TrackName track={row.track} />
                    </td>
                    <td className={numCell}>{row.races}</td>
                    <td className={numCell}>{row.bestFinish ?? "—"}</td>
                    <td className={numCell}>{row.wins}</td>
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
                      <span className="block text-xs font-normal text-neutral-500">
                        {RACING_SERIES_LABELS[row.track.source]}
                      </span>
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
