-- Let a track be marked a favourite, so it starts out starred as a
-- must-include track when a new championship is built.
--
-- Purely a default for the new-championship form: the star can still be
-- cleared there, and nothing about an existing schedule changes when a track's
-- favourite flag does. Independent of `archived` — an archived favourite is
-- simply not offered, and gets its star back if it is unarchived.

alter table wec.tracks
  add column if not exists favourite boolean not null default false;
