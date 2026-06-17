import { createBrowserClient } from "@supabase/ssr";

// Supabase client for use in Client Components (browser).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    // App tables live in the `wec` schema, so default data calls there.
    { db: { schema: "wec" } },
  );
}
