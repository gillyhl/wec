-- Record the AI difficulty a race was raced against. Optional (older races
-- have none recorded); no upper bound since AI strength scales vary by game
-- and some (iRacing's strength of field) can exceed 100.

alter table wec.races
  add column if not exists ai_difficulty smallint;

alter table wec.races drop constraint if exists races_ai_difficulty_check;
alter table wec.races add constraint races_ai_difficulty_check
  check (ai_difficulty is null or ai_difficulty >= 0);
