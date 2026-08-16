import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuth } from "@/lib/auth";
import { updateTrack } from "../../actions";
import TrackForm from "../../TrackForm";
import type { Track } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditTrackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { isAdmin } = await getAuth();
  if (!isAdmin) redirect("/auth/login");

  const { id } = await params;
  const supabase = await createClient();
  const { data: track } = await supabase
    .from("tracks")
    .select("id, name, short_code, country_code, source")
    .eq("id", id)
    .maybeSingle<Track>();

  if (!track) notFound();

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Link href="/tracks" className="text-sm text-neutral-400 hover:text-white">
        ← All tracks
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Edit track</h1>
      <p className="mt-2 text-sm text-neutral-400">
        The short code only needs to be unique within the chosen game.
      </p>

      <TrackForm
        action={updateTrack}
        trackId={track.id}
        defaultValues={{
          series: track.source,
          name: track.name,
          short_code: track.short_code,
          country_code: track.country_code,
        }}
        submitLabel="Save changes"
      />
    </main>
  );
}
