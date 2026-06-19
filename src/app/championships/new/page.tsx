import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { createChampionship } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewChampionshipPage() {
  const { isAdmin } = await getAuth();
  if (!isAdmin) redirect("/auth/login");

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Link href="/" className="text-sm text-neutral-400 hover:text-white">
        ← All championships
      </Link>
      <h1 className="mt-4 text-2xl font-bold">New championship</h1>
      <p className="mt-2 text-sm text-neutral-400">
        Pick a series, then a random race order is generated automatically.
        Project Cars 2 races every track, always starting at Imola (IMO). iRacing
        runs a schedule of distinct tracks (12 by default) — with 20 or fewer
        races, at most 3 may come from any one country; longer schedules lift that
        limit.
      </p>

      <form action={createChampionship} className="mt-6 space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm text-neutral-300">
            Championship name
          </label>
          <input
            id="name"
            name="name"
            required
            placeholder="2026 WEC Season"
            className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none focus:border-neutral-400"
          />
        </div>

        <fieldset>
          <legend className="block text-sm text-neutral-300">Series</legend>
          <div className="mt-2 space-y-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 hover:border-neutral-500">
              <input
                type="radio"
                name="series"
                value="project_cars_2"
                defaultChecked
                className="mt-1"
              />
              <span>
                <span className="block font-medium text-white">
                  Project Cars 2
                </span>
                <span className="block text-xs text-neutral-400">
                  Every track, starting at Imola.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 hover:border-neutral-500">
              <input
                type="radio"
                name="series"
                value="iracing"
                className="mt-1"
              />
              <span>
                <span className="block font-medium text-white">iRacing</span>
                <span className="block text-xs text-neutral-400">
                  Choose the number of distinct tracks (max 3 per country up to
                  20 races).
                </span>
              </span>
            </label>
          </div>
        </fieldset>

        <div>
          <label htmlFor="race_count" className="block text-sm text-neutral-300">
            Number of races{" "}
            <span className="text-neutral-500">(iRacing only)</span>
          </label>
          <input
            id="race_count"
            name="race_count"
            type="number"
            min={1}
            max={29}
            defaultValue={12}
            className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none focus:border-neutral-400"
          />
          <p className="mt-1 text-xs text-neutral-500">
            Up to 29 (one per available iRacing track). Ignored for Project Cars
            2.
          </p>
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-white px-3 py-2 font-medium text-black hover:bg-neutral-200"
        >
          Create championship
        </button>
      </form>
    </main>
  );
}
