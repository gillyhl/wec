import Link from "next/link";
import { getAuth } from "@/lib/auth";

export default async function SiteHeader() {
  const { user, isAdmin } = await getAuth();

  const statsLink = (
    <Link href="/stats" className="text-neutral-400 hover:text-white">
      Statistics
    </Link>
  );

  const newChampionshipLink = isAdmin ? (
    <Link
      href="/championships/new"
      className="rounded-md bg-white px-3 py-1.5 font-medium text-black hover:bg-neutral-200"
    >
      New championship
    </Link>
  ) : null;

  const authAction = user ? (
    <form action="/auth/signout" method="post">
      <button type="submit" className="text-neutral-400 hover:text-white">
        Sign out
      </button>
    </form>
  ) : (
    <Link href="/auth/login" className="text-neutral-400 hover:text-white">
      Admin sign in
    </Link>
  );

  return (
    <header className="border-b border-neutral-800">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          WEC Championship Tracker
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-4 text-sm sm:flex">
          {statsLink}
          {newChampionshipLink}
          {authAction}
        </nav>

        {/* Mobile menu: native <details> disclosure, no client JS required */}
        <details className="relative text-sm sm:hidden [&_summary::-webkit-details-marker]:hidden">
          <summary
            className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-md text-neutral-400 hover:text-white"
            aria-label="Open menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </summary>
          <nav className="absolute right-0 z-10 mt-2 flex w-44 flex-col items-stretch gap-3 rounded-md border border-neutral-800 bg-neutral-950 p-3 shadow-lg">
            {statsLink}
            {newChampionshipLink}
            {authAction}
          </nav>
        </details>
      </div>
    </header>
  );
}
