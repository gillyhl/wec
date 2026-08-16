-- Allow a track to be archived so it stops appearing as an option when
-- building a new championship's schedule, without deleting it — past
-- championships and race results still reference it.

alter table wec.tracks
  add column if not exists archived boolean not null default false;
