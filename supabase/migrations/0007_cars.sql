-- Cars: every race result is now driven in a specific car, which (like a
-- track) belongs to one game. A car can be added, edited, and deleted; if a
-- car has race results attached, the delete is rejected by the foreign key
-- (caught and surfaced as a friendly error by the app) rather than silently
-- orphaning results.

create table if not exists wec.cars (
  id     uuid primary key default gen_random_uuid(),
  name   text not null,
  source wec.racing_series not null,
  unique (source, name)
);

-- Nullable: existing race results predate car tracking and have none. The
-- app requires a car whenever a result is newly saved or updated.
alter table wec.race_results
  add column if not exists car_id uuid references wec.cars(id);

create index if not exists idx_race_results_car on wec.race_results(car_id);

alter table wec.cars enable row level security;

drop policy if exists cars_read on wec.cars;
create policy cars_read on wec.cars for select using (true);

drop policy if exists cars_admin_insert on wec.cars;
create policy cars_admin_insert on wec.cars
  for insert with check (wec.is_admin());

drop policy if exists cars_admin_update on wec.cars;
create policy cars_admin_update on wec.cars
  for update using (wec.is_admin()) with check (wec.is_admin());

drop policy if exists cars_admin_delete on wec.cars;
create policy cars_admin_delete on wec.cars
  for delete using (wec.is_admin());
