# WEC Championship Tracker

Track WEC championships between drivers. Built with **Next.js (App Router)** and
**Supabase** (Postgres + Auth), and deployable on **Vercel**.

## Features

- **Front page** — lists every championship with its status; click a row to open it.
- **Championship page** — a standings matrix: racers as rows (ordered by
  championship position, with country flags), each race as a column (track flag +
  short code, showing the racer's finishing position), and total championship
  points in the final column.
- **Admin auth** — Supabase magic-link login. Only `gilberthl93@gmail.com` may
  create championships or enter race results (enforced both in the UI and by
  Postgres Row Level Security).
- **Create championship** — generates a random race order that always starts at
  Imola (IMO), followed by every other track in a random order.
- **Automatic points** — entering a race result recomputes championship points
  via a Postgres trigger.

## Data model

`championships`, `tracks`, `racers`, `races`, `race_results`, and
`championship_points` — see [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).

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
   pre-filled with the standard local API URL and anon key:

   ```bash
   cp .env.local.example .env.local
   ```

   If `npm run db:status` ever shows a different anon key, paste it into
   `.env.local` as `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

4. **Run the app:**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

5. **Sign in as admin.** Click **Admin sign in**, request a magic link for
   `gilberthl93@gmail.com`, then open the **Email inbox** at
   http://127.0.0.1:54324 and click the link. You can now create championships and
   enter results.

### Handy commands

| Command              | What it does                                              |
| -------------------- | -------------------------------------------------------- |
| `npm run db:start`   | Start the local Supabase stack                           |
| `npm run db:stop`    | Stop it                                                   |
| `npm run db:reset`   | Re-run migrations + reseed (wipes local data)            |
| `npm run db:status`  | Print local URLs and keys                                |

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
   production URL and `https://your-app.vercel.app/auth/confirm` as a redirect URL.

4. **Deploy on Vercel.** Import the repo and set the environment variables:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<project anon key>
   NEXT_PUBLIC_ADMIN_EMAIL=gilberthl93@gmail.com
   ```

   > If you change the admin email, also update it in `0001_init.sql`
   > (`is_admin()` function) so the database policies match.
