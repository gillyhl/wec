import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAuth } from "@/lib/auth";
import DeleteCarButton from "@/components/DeleteCarButton";
import { RACING_SERIES_LABELS, type RacingSeries, type Car } from "@/lib/types";
import { deleteCar } from "./actions";

export const dynamic = "force-dynamic";

// Order the games consistently regardless of query result order.
const SERIES_ORDER: RacingSeries[] = ["project_cars_2", "iracing"];

export default async function CarsPage() {
  const supabase = await createClient();
  const [{ data: cars, error }, { isAdmin }] = await Promise.all([
    supabase.from("cars").select("id, name, source").order("name").returns<Car[]>(),
    getAuth(),
  ]);

  const bySeries = new Map<RacingSeries, Car[]>();
  for (const car of cars ?? []) {
    const list = bySeries.get(car.source) ?? [];
    list.push(car);
    bySeries.set(car.source, list);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <Link href="/" className="text-sm text-neutral-400 hover:text-white">
        ← All championships
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Cars</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Every car, grouped by the racing game used. A race result records
            which car the driver used that race.
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/cars/new"
            className="shrink-0 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-black hover:bg-neutral-200"
          >
            Add car
          </Link>
        )}
      </div>

      {error && (
        <p className="mt-6 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          Could not load cars: {error.message}
        </p>
      )}

      {!error &&
        SERIES_ORDER.map((series) => {
          const seriesCars = bySeries.get(series) ?? [];
          return (
            <section key={series} className="mt-10">
              <h2 className="text-lg font-semibold">
                {RACING_SERIES_LABELS[series]}
              </h2>
              <p className="mt-1 text-sm text-neutral-400">
                {seriesCars.length} car{seriesCars.length === 1 ? "" : "s"}.
              </p>

              {seriesCars.length === 0 ? (
                <div className="mt-4 rounded-lg border border-neutral-800 px-3 py-6 text-center text-sm text-neutral-500">
                  No cars added for this game yet.
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {seriesCars.map((car) => (
                    <div
                      key={car.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-neutral-800 bg-neutral-900/40 px-3 py-2"
                    >
                      <span className="truncate font-medium">{car.name}</span>
                      {isAdmin && (
                        <span className="flex shrink-0 items-center gap-2">
                          <Link
                            href={`/cars/${car.id}/edit`}
                            className="text-xs text-neutral-400 hover:text-white"
                          >
                            Edit
                          </Link>
                          <form action={deleteCar}>
                            <input type="hidden" name="car_id" value={car.id} />
                            <DeleteCarButton carName={car.name} />
                          </form>
                        </span>
                      )}
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
