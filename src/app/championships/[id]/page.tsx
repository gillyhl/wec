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
    </main>
  );
}
