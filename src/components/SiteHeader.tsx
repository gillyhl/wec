import Link from "next/link";
import { getAuth } from "@/lib/auth";

export default async function SiteHeader() {
  const { user, isAdmin } = await getAuth();

  return (
    <header className="border-b border-neutral-800">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          🏎️ WEC Championship Tracker
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {isAdmin && (
            <Link
              href="/championships/new"
              className="rounded-md bg-white px-3 py-1.5 font-medium text-black hover:bg-neutral-200"
            >
              New championship
            </Link>
          )}
          {user ? (
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-neutral-400 hover:text-white"
              >
                Sign out
              </button>
            </form>
          ) : (
            <Link href="/auth/login" className="text-neutral-400 hover:text-white">
              Admin sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
