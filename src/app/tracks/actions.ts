"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuth } from "@/lib/auth";
import type { RacingSeries } from "@/lib/types";

// Adds a track to a racing series' pool. short_code is unique per series (not
// globally), matching the tracks_source_short_code_key constraint.
export async function createTrack(formData: FormData) {
  const { isAdmin } = await getAuth();
  if (!isAdmin) throw new Error("Not authorized");

  const series = String(formData.get("series") ?? "") as RacingSeries;
  if (series !== "project_cars_2" && series !== "iracing") {
    throw new Error("A valid series must be selected");
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Track name is required");

  const shortCode = String(formData.get("short_code") ?? "")
    .trim()
    .toUpperCase();
  if (!shortCode) throw new Error("Short code is required");

  const countryCode = String(formData.get("country_code") ?? "")
    .trim()
    .toUpperCase();
  if (!countryCode) throw new Error("Country code is required");

  const supabase = await createClient();
  const { error } = await supabase.from("tracks").insert({
    name,
    short_code: shortCode,
    country_code: countryCode,
    source: series,
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        `A track with short code "${shortCode}" already exists for this series.`,
      );
    }
    throw new Error(error.message);
  }

  revalidatePath("/tracks");
  redirect("/tracks");
}

// Edits an existing track's game, name, short code, and country.
export async function updateTrack(formData: FormData) {
  const { isAdmin } = await getAuth();
  if (!isAdmin) throw new Error("Not authorized");

  const trackId = String(formData.get("track_id") ?? "");
  if (!trackId) throw new Error("Missing track reference");

  const series = String(formData.get("series") ?? "") as RacingSeries;
  if (series !== "project_cars_2" && series !== "iracing") {
    throw new Error("A valid series must be selected");
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Track name is required");

  const shortCode = String(formData.get("short_code") ?? "")
    .trim()
    .toUpperCase();
  if (!shortCode) throw new Error("Short code is required");

  const countryCode = String(formData.get("country_code") ?? "")
    .trim()
    .toUpperCase();
  if (!countryCode) throw new Error("Country code is required");

  const supabase = await createClient();
  const { error } = await supabase
    .from("tracks")
    .update({
      name,
      short_code: shortCode,
      country_code: countryCode,
      source: series,
    })
    .eq("id", trackId);

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        `A track with short code "${shortCode}" already exists for this series.`,
      );
    }
    throw new Error(error.message);
  }

  revalidatePath("/tracks");
  redirect("/tracks");
}
