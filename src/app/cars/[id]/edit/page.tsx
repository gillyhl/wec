import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuth } from "@/lib/auth";
import { updateCar } from "../../actions";
import CarForm from "../../CarForm";
import type { Car } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditCarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { isAdmin } = await getAuth();
  if (!isAdmin) redirect("/auth/login");

  const { id } = await params;
  const supabase = await createClient();
  const { data: car } = await supabase
    .from("cars")
    .select("id, name, source")
    .eq("id", id)
    .maybeSingle<Car>();

  if (!car) notFound();

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Link href="/cars" className="text-sm text-neutral-400 hover:text-white">
        ← All cars
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Edit car</h1>
      <p className="mt-2 text-sm text-neutral-400">
        The name only needs to be unique within the chosen game.
      </p>

      <CarForm
        action={updateCar}
        carId={car.id}
        defaultValues={{
          series: car.source,
          name: car.name,
        }}
        submitLabel="Save changes"
      />
    </main>
  );
}
