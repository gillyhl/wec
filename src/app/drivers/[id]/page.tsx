import Link from "next/link";
import { notFound } from "next/navigation";
import FlagIcon from "@/components/FlagIcon";
import DriverSeasons from "@/components/DriverSeasons";
import DriverTracks from "@/components/DriverTracks";
import { getRacerHistory } from "@/lib/racer";
import { RACING_SERIES_LABELS } from "@/lib/types";
import type { RacerSeason } from "@/lib/racer";

export const dynamic = "force-dynamic";

const headCell =
  "border border-neutral-800 px-1.5 py-2 text-center font-medium leading-tight sm:px-3";
const numCell = "border border-neutral-800 px-1.5 text-center sm:px-3";

// Career totals rolled up across every season the driver raced.
function careerTotals(seasons: RacerSeason[]) {
  return seasons.reduce(
    (acc, s) => {
      acc.points += s.points;
      acc.wins += s.wins;
      acc.podiums += s.podiums;
      acc.retirements += s.retirements;
      acc.titles +=
        s.position === 1 && s.championship.status === "finished" ? 1 : 0;
      return acc;
    },
    { points: 0, wins: 0, podiums: 0, retirements: 0, titles: 0 },
  );
}

export default async function DriverPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const history = await getRacerHistory(id);

  if (!history) notFound();
  const { racer, seasons, trackStats, carStats, streaks, headToHead } = history;

  const streakTiles = [
    { label: "Win streak", value: streaks.wins },
    { label: "Podium streak", value: streaks.podiums },
    { label: "Points streak", value: streaks.points },
    { label: "Finish streak", value: streaks.finishes },
  ];

  const career = careerTotals(seasons);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <Link href="/stats" className="text-sm text-neutral-400 hover:text-white">
        ← Statistics
      </Link>

      <h1 className="mt-4 flex items-center text-2xl font-bold">
        <FlagIcon countryCode={racer.country_code} className="mr-2.5" />
        {racer.first_name} {racer.last_name}
      </h1>
      <p className="mt-1 text-sm text-neutral-400">
        Racing record across {seasons.length}{" "}
        {seasons.length === 1 ? "season" : "seasons"}.
      </p>

      {seasons.length === 0 ? (
        <div className="mt-6 rounded-lg border border-neutral-800 px-3 py-6 text-center text-sm text-neutral-500">
          No race results recorded for this driver yet.
        </div>
      ) : (
        <>
          {/* Career summary */}
          <div className="mt-6 w-fit max-w-full overflow-x-auto rounded-lg border border-neutral-800">
            <table className="border-collapse text-sm">
              <thead className="bg-neutral-900 text-neutral-400">
                <tr>
                  <th className={headCell}>Seasons</th>
                  <th className={headCell}>Titles</th>
                  <th className={headCell}>Wins</th>
                  <th className={headCell}>Podiums</th>
                  <th className={headCell}>Retirements</th>
                  <th className={headCell}>Points</th>
                </tr>
              </thead>
              <tbody>
                <tr className="h-12">
                  <td className="border border-neutral-800 px-1.5 text-center sm:px-3">
                    {seasons.length}
                  </td>
                  <td className="border border-neutral-800 px-1.5 text-center sm:px-3">
                    {career.titles}
                  </td>
                  <td className="border border-neutral-800 px-1.5 text-center sm:px-3">
                    {career.wins}
                  </td>
                  <td className="border border-neutral-800 px-1.5 text-center sm:px-3">
                    {career.podiums}
                  </td>
                  <td className="border border-neutral-800 px-1.5 text-center sm:px-3">
                    {career.retirements}
                  </td>
                  <td className="border border-neutral-800 px-1.5 text-center font-semibold sm:px-3">
                    {career.points}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <DriverSeasons seasons={seasons} />

          {/* Per-track record, aggregated across every season. Each row
              expands to that track's results season by season. */}
          <h2 className="mt-10 text-lg font-semibold">Tracks</h2>
          <p className="mt-1 text-sm text-neutral-400">
            Select a track to see the result from each season that raced there.
          </p>
          <DriverTracks
            rows={trackStats}
            championships={seasons.map((s) => s.championship)}
          />

          {/* Per-car record, aggregated across every season. */}
          {carStats.length > 0 && (
            <>
              <h2 className="mt-10 text-lg font-semibold">Cars</h2>
              <div className="mt-4 w-fit max-w-full overflow-x-auto rounded-lg border border-neutral-800">
                <table className="border-collapse text-sm">
                  <thead className="bg-neutral-900 text-neutral-400">
                    <tr>
                      <th className="border border-neutral-800 px-1.5 py-2 text-left font-medium sm:px-3">
                        Car
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
                    {carStats.map((row) => (
                      <tr key={row.car.id} className="h-12">
                        <td className="whitespace-nowrap border border-neutral-800 px-1.5 font-medium sm:px-3">
                          {row.car.name}
                          <span className="block text-xs font-normal text-neutral-500">
                            {RACING_SERIES_LABELS[row.car.source]}
                          </span>
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
            </>
          )}

          {/* Longest career streaks, over the races the driver entered. */}
          <h2 className="mt-10 text-lg font-semibold">Longest streaks</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {streakTiles.map((tile) => (
              <div
                key={tile.label}
                className="rounded-lg border border-neutral-800 bg-neutral-900/40 px-4 py-3"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  {tile.label}
                </p>
                <p className="mt-1 text-xl font-bold">
                  {tile.value}
                  <span className="ml-1 text-sm font-normal text-neutral-400">
                    {tile.value === 1 ? "race" : "races"}
                  </span>
                </p>
              </div>
            ))}
          </div>

          {/* Head-to-head: how the driver fared against each rival when both
              entered the same race. */}
          {headToHead.length > 0 && (
            <>
              <h2 className="mt-10 text-lg font-semibold">Head to head</h2>
              <p className="mt-1 text-sm text-neutral-400">
                Races finished ahead of each rival when both took part.
              </p>
              <div className="mt-4 w-fit max-w-full overflow-x-auto rounded-lg border border-neutral-800">
                <table className="border-collapse text-sm">
                  <thead className="bg-neutral-900 text-neutral-400">
                    <tr>
                      <th className="border border-neutral-800 px-1.5 py-2 text-left font-medium sm:px-3">
                        Rival
                      </th>
                      <th className={headCell}>Ahead</th>
                      <th className={headCell}>Behind</th>
                      <th className={headCell}>Record</th>
                    </tr>
                  </thead>
                  <tbody>
                    {headToHead.map((h) => {
                      const winning = h.ahead > h.behind;
                      const losing = h.ahead < h.behind;
                      return (
                        <tr key={h.opponent.id} className="h-12">
                          <td className="whitespace-nowrap border border-neutral-800 px-1.5 font-medium sm:px-3">
                            <Link
                              href={`/drivers/${h.opponent.id}`}
                              className="hover:underline"
                            >
                              <FlagIcon
                                countryCode={h.opponent.country_code}
                                className="mr-1.5 sm:mr-2"
                              />
                              <span className="sm:hidden">
                                {h.opponent.first_name.charAt(0)}.{" "}
                                {h.opponent.last_name}
                              </span>
                              <span className="hidden sm:inline">
                                {h.opponent.first_name} {h.opponent.last_name}
                              </span>
                            </Link>
                          </td>
                          <td className={numCell}>{h.ahead}</td>
                          <td className={numCell}>{h.behind}</td>
                          <td
                            className={`${numCell} font-semibold ${
                              winning
                                ? "text-green-400"
                                : losing
                                  ? "text-red-400"
                                  : ""
                            }`}
                          >
                            {h.ahead}–{h.behind}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}
