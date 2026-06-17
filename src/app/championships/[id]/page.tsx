import Link from "next/link";
import { notFound } from "next/navigation";
import { getChampionshipData } from "@/lib/championship";
import { getAuth } from "@/lib/auth";
import FlagIcon from "@/components/FlagIcon";

export const dynamic = "force-dynamic";

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
                <th className="px-3 align-bottom text-left font-medium">#</th>
                <th className="px-3 align-bottom text-left font-medium">
                  Racer
                </th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row) => (
                <tr key={row.racer.id} className="h-12 border-t border-neutral-800">
                  <td className="px-3 text-neutral-400">{row.position}</td>
                  <td className="whitespace-nowrap px-3 font-medium">
                    <FlagIcon
                      countryCode={row.racer.country_code}
                      className="mr-2"
                    />
                    {row.racer.first_name} {row.racer.last_name}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Scrollable middle: race results */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-neutral-900 text-neutral-400">
                <tr className="h-16">
                  {races.map((race) => (
                    <th
                      key={race.id}
                      className="px-3 align-bottom text-center font-medium"
                      title={race.track.name}
                    >
                      <div className="flex flex-col items-center leading-tight">
                        <FlagIcon
                          countryCode={race.track.country_code}
                          className="text-base"
                        />
                        <span>{race.track.short_code}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {standings.map((row) => (
                  <tr
                    key={row.racer.id}
                    className="h-12 border-t border-neutral-800"
                  >
                    {races.map((race) => {
                      const cell = row.cells[race.id];
                      if (!cell) {
                        return (
                          <td
                            key={race.id}
                            className="px-3 text-center text-neutral-300"
                          >
                            –
                          </td>
                        );
                      }
                      return (
                        <td
                          key={race.id}
                          className="px-3 text-center font-bold text-neutral-900"
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
                <th className="px-3 align-bottom text-center font-medium">
                  Points
                </th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row) => (
                <tr
                  key={row.racer.id}
                  className="h-12 border-t border-neutral-800"
                >
                  <td className="px-3 text-center font-semibold">
                    {row.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Admin: enter race results */}
      {isAdmin && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Enter race results</h2>
          <ul className="mt-3 divide-y divide-neutral-800 overflow-hidden rounded-lg border border-neutral-800">
            {races.map((race) => (
              <li
                key={race.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <span>
                  <span className="mr-2 text-neutral-500">
                    Round {race.round}
                  </span>
                  <FlagIcon
                    countryCode={race.track.country_code}
                    className="mr-2"
                  />
                  {race.track.name} ({race.track.short_code})
                </span>
                <Link
                  href={`/championships/${championship.id}/races/${race.id}`}
                  className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-900"
                >
                  Edit results
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
