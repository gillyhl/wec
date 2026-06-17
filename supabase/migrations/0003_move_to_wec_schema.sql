-- Move the application out of `public` into a dedicated `wec` schema.
--
-- `alter ... set schema` relocates each object in place: table data, row level
-- security policies, triggers, constraints, indexes and foreign keys all move
-- with it (references are by OID, not by name), so no data is lost.

create schema if not exists wec;

-- Enum type used by championships.status.
alter type championship_status set schema wec;

-- Tables (RLS policies + triggers + indexes travel with each table).
alter table tracks              set schema wec;
alter table racers              set schema wec;
alter table championships       set schema wec;
alter table races               set schema wec;
alter table race_results        set schema wec;
alter table championship_points set schema wec;

-- Functions.
alter function points_for_rank(int)                set schema wec;
alter function recompute_championship_points(uuid) set schema wec;
alter function on_race_result_change()             set schema wec;
alter function is_admin()                          set schema wec;

-- These functions reference the tables unqualified, so pin a search_path that
-- resolves names to `wec` regardless of the caller's path. (pg_catalog is
-- always implicitly searched, so built-ins still work; is_admin() also needs
-- `auth` for auth.jwt(), which it already schema-qualifies.)
alter function wec.points_for_rank(int)                set search_path = wec;
alter function wec.recompute_championship_points(uuid) set search_path = wec;
alter function wec.on_race_result_change()             set search_path = wec;
alter function wec.is_admin()                          set search_path = wec, public;

-- ---------------------------------------------------------------------------
-- Privileges for the API roles on the new schema. RLS (moved with the tables)
-- still governs which rows each role sees; these grants give table-level access
-- in the first place. Mirrors the grants that 0001 applied to `public`.
-- ---------------------------------------------------------------------------

grant usage on schema wec to anon, authenticated;
grant select on all tables in schema wec to anon, authenticated;
grant insert, update, delete on all tables in schema wec to authenticated;
grant usage, select on all sequences in schema wec to anon, authenticated;

-- Apply the same defaults to anything created in `wec` later.
alter default privileges in schema wec
  grant select on tables to anon, authenticated;
alter default privileges in schema wec
  grant insert, update, delete on tables to authenticated;
alter default privileges in schema wec
  grant usage, select on sequences to anon, authenticated;
