import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { createCar } from "../actions";
import CarForm from "../CarForm";

export const dynamic = "force-dynamic";

export default async function NewCarPage() {
  const { isAdmin } = await getAuth();
  if (!isAdmin) redirect("/auth/login");

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Link href="/cars" className="text-sm text-neutral-400 hover:text-white">
        ← All cars
      </Link>
      <h1 className="mt-4 text-2xl font-bold">New car</h1>
      <p className="mt-2 text-sm text-neutral-400">
        Adds a car to the chosen game&apos;s pool. The name only needs to be
        unique within that game.
      </p>

      <CarForm action={createCar} submitLabel="Add car" />
    </main>
  );
}
