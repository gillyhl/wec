-- A championship may now visit the same track more than once.
--
-- 0001 declared `unique (championship_id, track_id)` on races, which capped a
-- schedule at one race per track and so at the number of tracks available.
-- The schedule builder already repeats the selected tracks when a championship
-- has more races than tracks (see buildSchedule in the app), so the constraint
-- is what stands in the way. `unique (championship_id, round)` stays: rounds
-- remain the thing that must not collide.

alter table wec.races
  drop constraint if exists races_championship_id_track_id_key;

-- The unique constraint's index went with it, and races are still looked up by
-- track (a driver's per-track history, for one), so keep an index on track_id.
create index if not exists idx_races_track on wec.races(track_id);
