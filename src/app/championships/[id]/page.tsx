import Link from "next/link";
import { notFound } from "next/navigation";
import {
  championshipSummary,
  championshipWinner,
  clinchedChampion,
  getChampionshipData,
} from "@/lib/championship";
import type { RaceCell } from "@/lib/championship";
import { carsLabel, pointsForRank } from "@/lib/results";
import { getAuth } from "@/lib/auth";
import FlagIcon from "@/components/FlagIcon";
import ChampionshipStandings from "@/components/ChampionshipStandings";
import PointsProgressionChart from "@/components/PointsProgressionChart";
import ChampionshipAdminControls from "@/components/ChampionshipAdminControls";
import { RACING_SERIES_LABELS } from "@/lib/types";

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

  // While a season is still running, flag when the leader has an unassailable
  // lead — no rival can catch them even winning every race left.
  const clinched =
    championship.status !== "finished" ? clinchedChampion(data) : null;

  const summary = championshipSummary(data);
  const summaryTiles: { label: string; value: string; sub?: string }[] = [];
  if (summary.marginOfVictory !== null) {
    summaryTiles.push({
      label: "Margin of victory",
      value: summary.decidedByCountback
        ? "Countback"
        : `${summary.marginOfVictory} pts`,
      sub: summary.decidedByCountback ? "level on points" : undefined,
    });
  }
  if (summary.titleDecidedRound !== null) {
    summaryTiles.push({
      label: "Title decided",
      value:
        summary.titleDecidedRound === summary.totalRounds
          ? "Final round"
          : `Round ${summary.titleDecidedRound}`,
      sub: `of ${summary.totalRounds}`,
    });
  }
  summaryTiles.push({
    label: "Lead changes",
    value: String(summary.leadChanges),
  });
  if (summary.biggestComeback) {
    const { racer, deficit, round } = summary.biggestComeback;
    summaryTiles.push({
      label: "Biggest comeback",
      value: `${deficit} pts`,
      sub: `${racer.first_name.charAt(0)}. ${racer.last_name}, from R${round}`,
    });
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <Link href="/" className="text-sm text-neutral-400 hover:text-white">
        ← All championships
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{championship.name}</h1>
          <p className="mt-1 text-sm text-neutral-400">
            {RACING_SERIES_LABELS[championship.series]} ·{" "}
            <span className="capitalize">{championship.status}</span> ·{" "}
            {races.length} races
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
                {winner.points} pts · {carsLabel(winner.carRows)}
              </span>
            </p>
          </div>
        </div>
      )}

      {clinched && (
        <div className="mt-6 flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <span className="text-2xl" aria-hidden="true">
            🏆
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-400/80">
              Title clinched
            </p>
            <p className="text-lg font-bold">
              <FlagIcon
                countryCode={clinched.racer.country_code}
                className="mr-2"
              />
              {clinched.racer.first_name} {clinched.racer.last_name}
              <span className="ml-2 text-sm font-normal text-neutral-400">
                unassailable lead · {clinched.points} pts ·{" "}
                {carsLabel(clinched.carRows)}
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
        <ChampionshipStandings
          championshipId={championship.id}
          races={races}
          standings={standings}
          isAdmin={isAdmin}
        />
      )}

      {/* Season summary talking points */}
      {standings.length > 0 && races.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold">Season summary</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {summaryTiles.map((tile) => (
              <div
                key={tile.label}
                className="rounded-lg border border-neutral-800 bg-neutral-900/40 px-4 py-3"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  {tile.label}
                </p>
                <p className="mt-1 text-xl font-bold">{tile.value}</p>
                {tile.sub && (
                  <p className="text-xs text-neutral-400">{tile.sub}</p>
                )}
              </div>
            ))}
          </div>
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
                  <th className="w-32 border border-neutral-800 px-1.5 py-2 text-left font-medium sm:px-3">
                    Car
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
                      <td className="w-32 whitespace-nowrap border border-neutral-800 px-1.5 text-neutral-400 sm:px-3">
                        {carsLabel(row.carRows)}
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
