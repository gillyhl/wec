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
        A random race order will be generated automatically — always starting at
        Imola (IMO), followed by every other track in a random order.
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
