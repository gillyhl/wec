-- Allow a race result to record a retirement (DNF) instead of a finishing rank.
-- A retired racer has no finishing position and scores no points.

alter table race_results alter column rank drop not null;
alter table race_results add column if not exists retired boolean not null default false;

-- A result is either a finishing position (rank >= 1) or a retirement, never both.
alter table race_results drop constraint if exists race_results_rank_check;
alter table race_results drop constraint if exists race_results_rank_or_retired;
alter table race_results add constraint race_results_rank_or_retired
  check (
    (retired and rank is null)
    or (not retired and rank is not null and rank >= 1)
  );

-- points_for_rank(null) already returns 0 via its else branch, so the existing
-- recompute_championship_points correctly awards retirements zero points.
