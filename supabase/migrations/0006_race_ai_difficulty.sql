-- Record the AI difficulty a race was raced against. Optional (older races
-- have none recorded), and stored as a 0-100 strength rating matching the
-- percentage scale used by Project Cars 2 and iRacing's AI strength setting.

alter table wec.races
  add column if not exists ai_difficulty smallint;

alter table wec.races drop constraint if exists races_ai_difficulty_check;
alter table wec.races add constraint races_ai_difficulty_check
  check (ai_difficulty is null or (ai_difficulty >= 0 and ai_difficulty <= 100));
