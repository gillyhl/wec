import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { createTrack } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewTrackPage() {
  const { isAdmin } = await getAuth();
  if (!isAdmin) redirect("/auth/login");

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Link href="/tracks" className="text-sm text-neutral-400 hover:text-white">
        ← All tracks
      </Link>
      <h1 className="mt-4 text-2xl font-bold">New track</h1>
      <p className="mt-2 text-sm text-neutral-400">
        Adds a track to the chosen game&apos;s pool. The short code only needs
        to be unique within that game.
      </p>

      <form action={createTrack} className="mt-6 space-y-4">
        <fieldset>
          <legend className="block text-sm text-neutral-300">Game</legend>
          <div className="mt-2 space-y-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 hover:border-neutral-500">
              <input
                type="radio"
                name="series"
                value="project_cars_2"
                defaultChecked
                className="mt-1"
              />
              <span className="font-medium text-white">Project Cars 2</span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 hover:border-neutral-500">
              <input
                type="radio"
                name="series"
                value="iracing"
                className="mt-1"
              />
              <span className="font-medium text-white">iRacing</span>
            </label>
          </div>
        </fieldset>

        <div>
          <label htmlFor="name" className="block text-sm text-neutral-300">
            Track name
          </label>
          <input
            id="name"
            name="name"
            required
            placeholder="Autodromo Enzo e Dino Ferrari"
            className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none focus:border-neutral-400"
          />
        </div>

        <div>
          <label htmlFor="short_code" className="block text-sm text-neutral-300">
            Short code
          </label>
          <input
            id="short_code"
            name="short_code"
            required
            maxLength={10}
            placeholder="IMO"
            className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 uppercase text-white outline-none focus:border-neutral-400"
          />
          <p className="mt-1 text-xs text-neutral-500">
            Must be unique within the chosen game.
          </p>
        </div>

        <div>
          <label htmlFor="country_code" className="block text-sm text-neutral-300">
            Country code
          </label>
          <input
            id="country_code"
            name="country_code"
            required
            maxLength={10}
            placeholder="IT"
            className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 uppercase text-white outline-none focus:border-neutral-400"
          />
          <p className="mt-1 text-xs text-neutral-500">
            ISO country code (e.g. IT, GB) or GB subdivision (e.g. GB-ENG),
            used to show the track&apos;s flag.
          </p>
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-white px-3 py-2 font-medium text-black hover:bg-neutral-200"
        >
          Add track
        </button>
      </form>
    </main>
  );
}
