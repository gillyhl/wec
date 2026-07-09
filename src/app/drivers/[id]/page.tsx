import Link from "next/link";
import { notFound } from "next/navigation";
import FlagIcon from "@/components/FlagIcon";
import { resultColor } from "@/lib/championship";
import { getRacerHistory, ordinal } from "@/lib/racer";
import { RACING_SERIES_LABELS } from "@/lib/types";
import type { RacerSeason } from "@/lib/racer";

export const dynamic = "force-dynamic";

const headCell =
  "border border-neutral-800 px-1.5 py-2 text-center font-medium leading-tight sm:px-3";

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
  const { racer, seasons } = history;

  const career = careerTotals(seasons);

  // Seasons vary in length, so lay every season's rounds side by side up to the
  // longest season; shorter seasons leave the trailing round columns blank.
  const maxRounds = seasons.reduce((m, s) => Math.max(m, s.races.length), 0);
  const rounds = Array.from({ length: maxRounds }, (_, i) => i + 1);

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

          {/* Season-by-season racing record: one row per season, each round's
              cell showing where the race was and the driver's finish. */}
          <h2 className="mt-10 text-lg font-semibold">Seasons</h2>
          <div className="mt-4 flex rounded-lg border border-neutral-800">
            {/* Frozen left: season name */}
            <table className="shrink-0 border-collapse text-sm">
              <thead className="bg-neutral-900 text-neutral-400">
                <tr className="h-16">
                  <th className="border border-neutral-800 px-1.5 align-bottom text-left font-medium sm:px-3">
                    Season
                  </th>
                </tr>
              </thead>
              <tbody>
                {seasons.map((season) => (
                  <tr key={season.championship.id} className="h-14">
                    <td className="whitespace-nowrap border border-neutral-800 px-1.5 sm:px-3">
                      <Link
                        href={`/championships/${season.championship.id}`}
                        className="font-medium hover:underline"
                      >
                        {season.championship.name}
                      </Link>
                      <span className="block text-xs text-neutral-500">
                        {RACING_SERIES_LABELS[season.championship.series]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Scrollable middle: one column per round. Pulled 1px left so its
                border collapses onto the season table's rather than doubling. */}
            <div className="-ml-px flex-1 overflow-x-auto">
              <table className="w-full table-fixed border-collapse text-sm">
                <thead className="bg-neutral-900 text-neutral-400">
                  <tr className="h-16">
                    {rounds.map((round) => (
                      <th
                        key={round}
                        className="w-9 border border-neutral-800 px-1 align-bottom text-center font-medium sm:w-11 sm:px-1.5"
                      >
                        R{round}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {seasons.map((season) => (
                    <tr key={season.championship.id} className="h-14">
                      {rounds.map((round) => {
                        const entry = season.races[round - 1];
                        if (!entry) {
                          return (
                            <td
                              key={round}
                              className="border border-neutral-800 bg-neutral-950"
                            />
                          );
                        }
                        const { race, cell } = entry;
                        return (
                          <td
                            key={round}
                            className="border border-neutral-800 px-1 text-center sm:px-1.5"
                            style={
                              cell
                                ? {
                                    backgroundColor: resultColor(
                                      cell.rank,
                                      cell.retired,
                                    ),
                                  }
                                : undefined
                            }
                            title={race.track.name}
                          >
                            <div
                              className={`flex flex-col items-center leading-tight ${
                                cell ? "text-neutral-900" : "text-neutral-400"
                              }`}
                            >
                              <FlagIcon countryCode={race.track.country_code} />
                              <span className="text-[10px]">
                                {race.track.short_code}
                              </span>
                              <span className="font-bold">
                                {cell ? (cell.retired ? "RET" : cell.rank) : "–"}
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Frozen right: season points + finishing position. Pulled 1px left
                so the seam onto the rounds table stays a single border. */}
            <table className="-ml-px shrink-0 border-collapse text-sm">
              <thead className="bg-neutral-900 text-neutral-400">
                <tr className="h-16">
                  <th className="border border-neutral-800 px-1.5 align-bottom text-center font-medium sm:px-3">
                    Points
                  </th>
                  <th className="border border-neutral-800 px-1.5 align-bottom text-center font-medium sm:px-3">
                    Pos.
                  </th>
                </tr>
              </thead>
              <tbody>
                {seasons.map((season) => {
                  // A podium championship finish tints both summary cells with
                  // the same gold/silver/bronze used for race results.
                  const podium = season.position <= 3;
                  const bg = podium
                    ? { backgroundColor: resultColor(season.position, false) }
                    : undefined;
                  const text = podium ? "text-neutral-900" : "";
                  return (
                    <tr key={season.championship.id} className="h-14">
                      <td
                        className={`border border-neutral-800 px-1.5 text-center font-semibold sm:px-3 ${text}`}
                        style={bg}
                      >
                        {season.points}
                      </td>
                      <td
                        className={`whitespace-nowrap border border-neutral-800 px-1.5 text-center font-semibold sm:px-3 ${text}`}
                        style={bg}
                      >
                        {ordinal(season.position)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
