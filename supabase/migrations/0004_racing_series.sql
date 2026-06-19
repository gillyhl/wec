-- Support multiple racing series (Project Cars 2 and iRacing).
--
-- Tracks now belong to a series, and so do championships. Project Cars 2 and
-- iRacing share many short codes (IMO, MON, SPA, …) for entirely different
-- tracks, so short_code is no longer globally unique — it is unique per series.

-- Enum identifying which game a track or championship belongs to. Created in the
-- `wec` schema to match where the rest of the application lives.
do $$ begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'racing_series' and n.nspname = 'wec'
  ) then
    create type wec.racing_series as enum ('project_cars_2', 'iracing');
  end if;
end $$;

-- Existing tracks were all Project Cars 2 tracks; the default backfills them.
alter table wec.tracks
  add column if not exists source wec.racing_series not null default 'project_cars_2';

-- short_code is unique within a series, not globally.
alter table wec.tracks drop constraint if exists tracks_short_code_key;
alter table wec.tracks drop constraint if exists tracks_source_short_code_key;
alter table wec.tracks add constraint tracks_source_short_code_key unique (source, short_code);

-- Existing championships were all Project Cars 2 championships.
alter table wec.championships
  add column if not exists series wec.racing_series not null default 'project_cars_2';
