"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuth } from "@/lib/auth";
import type { RacingSeries } from "@/lib/types";

// Adds a car to a racing series' pool. name is unique per series (not
// globally), matching the cars_source_name_key constraint.
export async function createCar(formData: FormData) {
  const { isAdmin } = await getAuth();
  if (!isAdmin) throw new Error("Not authorized");

  const series = String(formData.get("series") ?? "") as RacingSeries;
  if (series !== "project_cars_2" && series !== "iracing") {
    throw new Error("A valid series must be selected");
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Car name is required");

  const supabase = await createClient();
  const { error } = await supabase
    .from("cars")
    .insert({ name, source: series });

  if (error) {
    if (error.code === "23505") {
      throw new Error(`A car named "${name}" already exists for this series.`);
    }
    throw new Error(error.message);
  }

  revalidatePath("/cars");
  redirect("/cars");
}

// Edits an existing car's game and name.
export async function updateCar(formData: FormData) {
  const { isAdmin } = await getAuth();
  if (!isAdmin) throw new Error("Not authorized");

  const carId = String(formData.get("car_id") ?? "");
  if (!carId) throw new Error("Missing car reference");

  const series = String(formData.get("series") ?? "") as RacingSeries;
  if (series !== "project_cars_2" && series !== "iracing") {
    throw new Error("A valid series must be selected");
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Car name is required");

  const supabase = await createClient();
  const { error } = await supabase
    .from("cars")
    .update({ name, source: series })
    .eq("id", carId);

  if (error) {
    if (error.code === "23505") {
      throw new Error(`A car named "${name}" already exists for this series.`);
    }
    throw new Error(error.message);
  }

  revalidatePath("/cars");
  redirect("/cars");
}

// Permanently deletes a car. Rejected by the database if any race result
// still references it, surfaced here as a friendly error.
export async function deleteCar(formData: FormData) {
  const { isAdmin } = await getAuth();
  if (!isAdmin) throw new Error("Not authorized");

  const carId = String(formData.get("car_id") ?? "");
  if (!carId) throw new Error("Missing car reference");

  const supabase = await createClient();
  const { error } = await supabase.from("cars").delete().eq("id", carId);

  if (error) {
    if (error.code === "23503") {
      throw new Error(
        "This car is attached to one or more race results and can't be deleted.",
      );
    }
    throw new Error(error.message);
  }

  revalidatePath("/cars");
}
