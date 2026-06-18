import Link from "next/link";
import { notFound } from "next/navigation";
import {
  championshipWinner,
  getChampionshipData,
  pointsForRank,
} from "@/lib/championship";
import type { RaceCell } from "@/lib/championship";
import { getAuth } from "@/lib/auth";
import FlagIcon from "@/components/FlagIcon";
import PointsProgressionChart from "@/components/PointsProgressionChart";
import ChampionshipAdminControls from "@/components/ChampionshipAdminControls";

export const dynamic = "force-dynamic";

// Distinct line colours for the progression chart, cycled across racers.
const SERIES_COLORS = [
  "#60a5fa",
  "#f87171",
  "#34d399",
  "#fbbf24",
  "#a78bfa",
  "#f472b6",
  "#22d3ee",
  "#a3e635",
  "#fb923c",
  "#e879f9",
  "#2dd4bf",
  "#facc15",
];

// Aggregate per-racer counting stats from their race results.
function racerStats(cells: Record<string, RaceCell>) {
  let wins = 0;
  let podiums = 0;
  let pointsFinishes = 0;
  let retirements = 0;
  for (const cell of Object.values(cells)) {
    if (cell.retired) retirements++;
    if (cell.rank === 1) wins++;
    if (cell.rank !== null && cell.rank <= 3) podiums++;
    if (pointsForRank(cell.rank) > 0) pointsFinishes++;
  }
  return { wins, podiums, pointsFinishes, retirements };
}

// Background colour for a race result cell, based on finishing position.
function resultColor(rank: number | null, retired: boolean): string {
  if (retired) return "#EFCFFF";
  if (rank === 1) return "#FFFFBF";
  if (rank === 2) return "#DFDFDF";
  if (rank === 3) return "#FFDF9F";
  if (rank !== null && rank >= 4 && rank <= 10) return "#DFFFDF";
  return "#CFCFFF";
}

export default async function ChampionshipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [data, { isAdmin }] = await Promise.all([
    getChampionshipData(id),
    getAuth(),
  ]);

  if (!data) notFound();
  const { championship, races, standings } = data;

  // A championship can be completed once every race has at least one result.
  const racesWithResults = new Set<string>();
  for (const row of standings) {
    for (const raceId of Object.keys(row.cells)) racesWithResults.add(raceId);
  }
  const allRacesHaveResults =
    races.length > 0 && races.every((race) => racesWithResults.has(race.id));

  const winner =
    championship.status === "finished" ? championshipWinner(standings) : null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <Link href="/" className="text-sm text-neutral-400 hover:text-white">
        ← All championships
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{championship.name}</h1>
          <p className="mt-1 text-sm capitalize text-neutral-400">
            {championship.status} · {races.length} races
          </p>
        </div>
      </div>

      {winner && (
        <div className="mt-6 flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
          <span className="text-2xl" aria-hidden="true">
            🏆
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-yellow-500/80">
              Champion
            </p>
            <p className="text-lg font-bold">
              <FlagIcon
                countryCode={winner.racer.country_code}
                className="mr-2"
              />
              {winner.racer.first_name} {winner.racer.last_name}
              <span className="ml-2 text-sm font-normal text-neutral-400">
                {winner.points} pts
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Standings matrix */}
      {standings.length === 0 ? (
        <div className="mt-6 rounded-lg border border-neutral-800 px-3 py-6 text-center text-sm text-neutral-500">
          No racers found.
        </div>
      ) : (
        <div className="mt-6 flex rounded-lg border border-neutral-800">
          {/* Frozen left: position + racer */}
          <table className="shrink-0 border-collapse text-sm">
            <thead className="bg-neutral-900 text-neutral-400">
              <tr className="h-16">
                <th className="border border-neutral-800 px-1.5 align-bottom text-left font-medium sm:px-3">
                  #
                </th>
                <th className="border border-neutral-800 px-1.5 align-bottom text-left font-medium sm:px-3">
                  Racer
                </th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row) => (
                <tr key={row.racer.id} className="h-12">
                  <td className="border border-neutral-800 px-1.5 text-neutral-400 sm:px-3">
                    {row.position}
                  </td>
                  <td className="whitespace-nowrap border border-neutral-800 px-1.5 font-medium sm:px-3">
                    <FlagIcon
                      countryCode={row.racer.country_code}
                      className="mr-1.5 sm:mr-2"
                    />
                    {/* Abbreviate first name on mobile to save horizontal space */}
                    <span className="sm:hidden">
                      {row.racer.first_name.charAt(0)}. {row.racer.last_name}
                    </span>
                    <span className="hidden sm:inline">
                      {row.racer.first_name} {row.racer.last_name}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Scrollable middle: race results */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full table-fixed border-collapse text-sm">
              <thead className="bg-neutral-900 text-neutral-400">
                <tr className="h-16">
                  {races.map((race) => (
                    <th
                      key={race.id}
                      className="w-14 border border-neutral-800 px-1.5 align-bottom text-center font-medium sm:w-16 sm:px-3"
                      title={race.track.name}
                    >
                      <div className="flex flex-col items-center leading-tight">
                        <FlagIcon
                          countryCode={race.track.country_code}
                          className="text-base"
                        />
                        <span>{race.track.short_code}</span>
                        {isAdmin && (
                          <Link
                            href={`/championships/${championship.id}/races/${race.id}`}
                            title={`Edit ${race.track.name} results`}
                            className="mt-0.5 text-neutral-600 hover:text-white"
                            aria-label={`Edit ${race.track.name} results`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-3 w-3"
                              aria-hidden="true"
                            >
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                            </svg>
                          </Link>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {standings.map((row) => (
                  <tr key={row.racer.id} className="h-12">
                    {races.map((race) => {
                      const cell = row.cells[race.id];
                      if (!cell) {
                        return (
                          <td
                            key={race.id}
                            className="border border-neutral-800 px-1.5 text-center text-neutral-300 sm:px-3"
                          >
                            –
                          </td>
                        );
                      }
                      return (
                        <td
                          key={race.id}
                          className="border border-neutral-800 px-1.5 text-center font-bold text-neutral-900 sm:px-3"
                          style={{
                            backgroundColor: resultColor(
                              cell.rank,
                              cell.retired,
                            ),
                          }}
                        >
                          {cell.retired ? "RET" : cell.rank}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Frozen right: points */}
          <table className="shrink-0 border-collapse text-sm">
            <thead className="bg-neutral-900 text-neutral-400">
              <tr className="h-16">
                <th className="border border-neutral-800 px-1.5 align-bottom text-center font-medium sm:px-3">
                  Points
                </th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row) => (
                <tr key={row.racer.id} className="h-12">
                  <td className="border border-neutral-800 px-1.5 text-center font-semibold sm:px-3">
                    {row.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Per-racer summary stats */}
      {standings.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold">Stats</h2>
          <div className="mt-4 w-fit max-w-full overflow-x-auto rounded-lg border border-neutral-800">
            <table className="table-fixed border-collapse text-sm">
              <thead className="bg-neutral-900 text-neutral-400">
                <tr>
                  <th className="w-44 border border-neutral-800 px-1.5 py-2 text-left font-medium sm:px-3">
                    Racer
                  </th>
                  <th className="w-20 border border-neutral-800 px-1.5 py-2 text-center font-medium leading-tight sm:px-3">
                    Wins
                  </th>
                  <th className="w-20 border border-neutral-800 px-1.5 py-2 text-center font-medium leading-tight sm:px-3">
                    Podiums
                  </th>
                  <th className="w-20 border border-neutral-800 px-1.5 py-2 text-center font-medium leading-tight sm:px-3">
                    Points finishes
                  </th>
                  <th className="w-20 border border-neutral-800 px-1.5 py-2 text-center font-medium leading-tight sm:px-3">
                    Retirements
                  </th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row) => {
                  const stats = racerStats(row.cells);
                  return (
                    <tr key={row.racer.id} className="h-12">
                      <td className="w-44 whitespace-nowrap border border-neutral-800 px-1.5 font-medium sm:px-3">
                        <FlagIcon
                          countryCode={row.racer.country_code}
                          className="mr-1.5 sm:mr-2"
                        />
                        <span className="sm:hidden">
                          {row.racer.first_name.charAt(0)}. {row.racer.last_name}
                        </span>
                        <span className="hidden sm:inline">
                          {row.racer.first_name} {row.racer.last_name}
                        </span>
                      </td>
                      <td className="border border-neutral-800 px-1.5 text-center sm:px-3">
                        {stats.wins}
                      </td>
                      <td className="border border-neutral-800 px-1.5 text-center sm:px-3">
                        {stats.podiums}
                      </td>
                      <td className="border border-neutral-800 px-1.5 text-center sm:px-3">
                        {stats.pointsFinishes}
                      </td>
                      <td className="border border-neutral-800 px-1.5 text-center sm:px-3">
                        {stats.retirements}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Points progression per race */}
      {standings.length > 0 && races.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold">Points progression</h2>
          <p className="mt-1 text-sm text-neutral-400">
            Cumulative championship points after each race.
          </p>
          <div className="mt-4 rounded-lg border border-neutral-800 p-4">
            <PointsProgressionChart
              raceLabels={races.map((race) => race.track.short_code)}
              series={standings.map((row, i) => ({
                id: row.racer.id,
                label: `${row.racer.first_name.charAt(0)}. ${row.racer.last_name}`,
                color: SERIES_COLORS[i % SERIES_COLORS.length],
                cumulative: row.cumulative,
              }))}
            />
          </div>
        </div>
      )}

      {isAdmin && (
        <ChampionshipAdminControls
          championshipId={championship.id}
          championshipName={championship.name}
          status={championship.status}
          canComplete={allRacesHaveResults}
        />
      )}
    </main>
  );
}
