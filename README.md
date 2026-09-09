# WEC Championship Tracker

Track WEC championships between drivers. Built with **Next.js (App Router)** and
**Supabase** (Postgres + Auth), and deployable on **Vercel**.

## Features

- **Front page** — lists every championship with its status; click a row to open it.
- **Championship page** — a standings matrix: racers as rows (ordered by
  championship position, with country flags), each race as a column (track flag +
  short code, showing the racer's finishing position), and total championship
  points in the final column.
- **Admin auth** — Supabase login via Google OAuth or a magic link. Only
  `gilberthl93@gmail.com` may create championships or enter race results
  (enforced both in the UI and by Postgres Row Level Security), regardless of
  which method is used to sign in.
- **Create championship** — generates a random race order that always starts at
  Imola (IMO), followed by every other track in a random order.
- **Automatic points** — entering a race result recomputes championship points
  via a Postgres trigger.

## Data model

`championships`, `tracks`, `cars`, `racers`, `races`, `race_results`, and
`championship_points` — see [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
and [`supabase/migrations/0007_cars.sql`](supabase/migrations/0007_cars.sql).

Points use the standard WEC/F1-style top-10 scheme
(25-18-15-12-10-8-6-4-2-1). Change the `points_for_rank` SQL function to adjust it.

## Local development (recommended)

Run the whole backend — Postgres, Auth, Studio and a local email inbox — on your
machine with the Supabase CLI before touching any hosted environment.

**Prerequisites:** [Docker](https://docs.docker.com/get-docker/) running, and
Node 18+. The Supabase CLI is already a dev dependency, so `npx supabase …` works
after `npm install` (the `db:*` npm scripts wrap it).

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Start the local Supabase stack.** On first run this pulls the Docker images
   (a few minutes), then applies `supabase/migrations/` and loads
   `supabase/seed.sql` automatically:

   ```bash
   npm run db:start
   ```

   When it finishes it prints your local URLs and keys. The defaults are stable,
   and a ready-to-use `.env.local` is already committed-out for you (see step 3).
   Useful endpoints:

   | Service            | URL                          |
   | ------------------ | ---------------------------- |
   | API                | http://127.0.0.1:54321       |
   | Studio (DB viewer) | http://127.0.0.1:54323       |
   | Email inbox        | http://127.0.0.1:54324       |

3. **Environment variables.** Copy the local template and you're done — it is
   pre-filled with the standard local API URL and publishable key:

   ```bash
   cp .env.local.example .env.local
   ```

   If `npm run db:status` ever shows a different key, paste it into
   `.env.local` as `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

4. **Run the app:**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

5. **Sign in as admin.** Click **Admin sign in**, request a magic link for
   `gilberthl93@gmail.com`, then open the **Email inbox** at
   http://127.0.0.1:54324 and click the link. You can now create championships and
   enter results.

   Magic-link sign-in needs no extra setup locally. The **Continue with Google**
   button is disabled in the local stack by default because Google OAuth needs
   real credentials. To test it locally, create OAuth credentials in the
   [Google Cloud console](https://console.cloud.google.com/apis/credentials)
   with redirect URI `http://127.0.0.1:54321/auth/v1/callback`, put the client
   ID/secret in `.env.local` (`SUPABASE_AUTH_GOOGLE_CLIENT_ID` /
   `SUPABASE_AUTH_GOOGLE_SECRET`), set `enabled = true` under
   `[auth.external.google]` in `supabase/config.toml`, and restart with
   `npm run db:start`.

### Generating random results (local only)

Filling a season in by hand to try out the standings takes a while, so
`scripts/generate-race-results.mjs` will invent one for you. Pass a
championship ID and it walks the schedule in round order, generating and saving
one race at a time and printing each result — press any key to move on to the
next race:

```bash
npm run generate:results -- <championship-id>
```

Each racer's finishing position is the lowest of four 1-26 rolls, rerolled if it
collides with a position already taken. How many finishers are classified is
drawn the same way — the lowest of four 15-26 rolls — and anyone placing outside
that is recorded as a retirement. Every racer starts the season in a random car from the
championship's game, then rolls 1-20 before each subsequent race and switches
car on a 1 or a 2.

Races that already have results are left alone (the cars they were driven in
still carry forward), so an abandoned run can be picked up where it stopped.
Pass `--force` to regenerate the whole championship from scratch.

The script writes as the admin user by signing a token with the local stack's
throwaway JWT secret, so it needs `npm run db:start` running — and it refuses to
talk to any host but localhost.

### Handy commands

| Command                    | What it does                                        |
| -------------------------- | --------------------------------------------------- |
| `npm run db:start`         | Start the local Supabase stack                      |
| `npm run db:stop`          | Stop it                                             |
| `npm run db:reset`         | Re-run migrations + reseed (wipes local data)       |
| `npm run db:status`        | Print local URLs and keys                           |
| `npm run generate:results` | Generate random results for a championship (local)  |

After editing `supabase/migrations/` or `supabase/seed.sql`, run
`npm run db:reset` to rebuild the local database from scratch.

## Deploy to a hosted Supabase + Vercel

1. **Create a Supabase project** at https://supabase.com.

2. **Apply the schema and seed.** Either link the CLI and push
   (`npx supabase link --project-ref <ref>` then `npx supabase db push`, followed
   by running `supabase/seed.sql` in the SQL editor), or paste both
   `supabase/migrations/0001_init.sql` and `supabase/seed.sql` into the SQL editor
   in that order.

3. **Configure auth**: in Supabase → Authentication → URL Configuration, add your
   production URL and both `https://your-app.vercel.app/auth/confirm` and
   `https://your-app.vercel.app/auth/callback` as redirect URLs.

   To enable Google sign-in in production, go to Supabase → Authentication →
   Providers → Google and enter a client ID/secret from the
   [Google Cloud console](https://console.cloud.google.com/apis/credentials).
   Add `https://<project-ref>.supabase.co/auth/v1/callback` as an authorized
   redirect URI on the Google credential. (The hosted provider is configured in
   the dashboard, not in `supabase/config.toml` — that file only governs the
   local CLI stack.)

4. **Deploy on Vercel.** Import the repo and set the environment variables:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   NEXT_PUBLIC_ADMIN_EMAIL=gilberthl93@gmail.com
   ```

   > If you change the admin email, also update it in `0001_init.sql`
   > (`is_admin()` function) so the database policies match.
