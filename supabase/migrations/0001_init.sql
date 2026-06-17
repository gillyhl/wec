-- WEC Championship Tracker — schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create type championship_status as enum ('current', 'finished');

-- Race tracks a championship can be raced at.
create table if not exists tracks (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,                 -- full track name
  short_code   text not null unique,          -- e.g. IMO
  country_code text not null                  -- ISO country code, e.g. IT
);

-- Racers.
create table if not exists racers (
  id           uuid primary key default gen_random_uuid(),
  first_name   text not null,
  last_name    text not null,
  country_code text not null                  -- ISO code, e.g. GB-ENG
);

-- Championships.
create table if not exists championships (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  status     championship_status not null default 'current',
  created_at timestamptz not null default now()
);

-- Races belonging to a championship, ordered by `round`.
create table if not exists races (
  id               uuid primary key default gen_random_uuid(),
  championship_id  uuid not null references championships(id) on delete cascade,
  track_id         uuid not null references tracks(id),
  round            int  not null,             -- 1-based race order within the championship
  unique (championship_id, round),
  unique (championship_id, track_id)
);

-- A racer's finishing position in a particular race.
create table if not exists race_results (
  id         uuid primary key default gen_random_uuid(),
  race_id    uuid not null references races(id) on delete cascade,
  racer_id   uuid not null references racers(id) on delete cascade,
  rank       int  not null check (rank >= 1),
  unique (race_id, racer_id)
);

-- Aggregated championship points per racer. Maintained automatically by trigger.
create table if not exists championship_points (
  championship_id uuid not null references championships(id) on delete cascade,
  racer_id        uuid not null references racers(id) on delete cascade,
  points          int  not null default 0,
  primary key (championship_id, racer_id)
);

create index if not exists idx_races_championship on races(championship_id);
create index if not exists idx_race_results_race on race_results(race_id);

-- ---------------------------------------------------------------------------
-- Points scheme + automatic recompute
-- ---------------------------------------------------------------------------

-- Standard WEC/F1-style points for the top 10 finishers.
-- Change this single function to adjust the scoring system.
create or replace function points_for_rank(p_rank int)
returns int language sql immutable as $$
  select case p_rank
    when 1  then 25
    when 2  then 18
    when 3  then 15
    when 4  then 12
    when 5  then 10
    when 6  then 8
    when 7  then 6
    when 8  then 4
    when 9  then 2
    when 10 then 1
    else 0
  end;
$$;

-- Recompute the championship_points table for one championship from scratch.
create or replace function recompute_championship_points(p_championship_id uuid)
returns void language plpgsql as $$
begin
  delete from championship_points where championship_id = p_championship_id;

  insert into championship_points (championship_id, racer_id, points)
  select r.championship_id, rr.racer_id, coalesce(sum(points_for_rank(rr.rank)), 0)
  from races r
  join race_results rr on rr.race_id = r.id
  where r.championship_id = p_championship_id
  group by r.championship_id, rr.racer_id;
end;
$$;

-- Trigger: whenever race_results change, recompute the affected championship.
create or replace function on_race_result_change()
returns trigger language plpgsql as $$
declare
  v_championship_id uuid;
  v_race_id uuid;
begin
  v_race_id := coalesce(new.race_id, old.race_id);
  select championship_id into v_championship_id from races where id = v_race_id;
  if v_championship_id is not null then
    perform recompute_championship_points(v_championship_id);
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_race_results_points on race_results;
create trigger trg_race_results_points
  after insert or update or delete on race_results
  for each row execute function on_race_result_change();

-- ---------------------------------------------------------------------------
-- Row Level Security
--   * Everyone (anon + authenticated) can read.
--   * Only the admin email may insert/update/delete.
-- ---------------------------------------------------------------------------

alter table tracks              enable row level security;
alter table racers              enable row level security;
alter table championships       enable row level security;
alter table races               enable row level security;
alter table race_results        enable row level security;
alter table championship_points enable row level security;

-- Helper: is the current request made by the admin user?
create or replace function is_admin()
returns boolean language sql stable as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'gilberthl93@gmail.com';
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'tracks','racers','championships','races','race_results','championship_points'
  ] loop
    execute format('drop policy if exists %I_read on %I;', t, t);
    execute format('create policy %I_read on %I for select using (true);', t, t);

    execute format('drop policy if exists %I_admin_insert on %I;', t, t);
    execute format('create policy %I_admin_insert on %I for insert with check (is_admin());', t, t);

    execute format('drop policy if exists %I_admin_update on %I;', t, t);
    execute format('create policy %I_admin_update on %I for update using (is_admin()) with check (is_admin());', t, t);

    execute format('drop policy if exists %I_admin_delete on %I;', t, t);
    execute format('create policy %I_admin_delete on %I for delete using (is_admin());', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Table privileges for the API roles.
--   RLS (above) governs *which rows* each role sees; these grants give the
--   roles table-level access in the first place. Reads are public (anon +
--   authenticated); writes are limited to authenticated and further gated to
--   the admin user by the RLS policies above.
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
