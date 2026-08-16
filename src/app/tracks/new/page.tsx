import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { createTrack } from "../actions";
import TrackForm from "../TrackForm";

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

      <TrackForm action={createTrack} submitLabel="Add track" />
    </main>
  );
}
