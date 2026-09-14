-- Record the calendar date a race was held on.
--
-- Nullable: races scheduled but not yet run have no date, and races recorded
-- before this column existed have none either. The app stamps today's date
-- when a race's first results are saved, and leaves it alone from then on
-- unless it is edited explicitly.

alter table wec.races
  add column if not exists race_date date;
