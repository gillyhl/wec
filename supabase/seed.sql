-- Seed data for the WEC Championship Tracker.
-- Idempotent: safe to run multiple times.

-- The application tables live in the `wec` schema. Names are schema-qualified
-- explicitly: the CLI sends the seed in batches, so a session `set search_path`
-- does not reliably carry across to the INSERT statements.

-- Tracks (from docs/tracks.csv) ---------------------------------------------
insert into wec.tracks (name, short_code, country_code) values
  ('Autodromo Enzo e Dino Ferrari', 'IMO', 'IT'),
  ('Autódromo Internacional do Algarve', 'ALG', 'PT'),
  ('Autodromo Nazionale Monza', 'MON', 'IT'),
  ('BRNO Circuit', 'BRN', 'CZ'),
  ('Circuit de Barcelona', 'CAT', 'ES'),
  ('Circuit de la Sarthe', 'LEM', 'FR'),
  ('Circuit de Spa-Francorchamps', 'SPA', 'BE'),
  ('Circuit of the Americas', 'CTA', 'US'),
  ('Circuit Zolder', 'ZOL', 'BE'),
  ('Fuji Speedway', 'FUJ', 'JP'),
  ('Hockenheimring', 'HOC', 'DE'),
  ('Mount Panorama Circuit', 'BAT', 'AU'),
  ('Mugello Circuit', 'MUG', 'IT'),
  ('Nürburgring', 'NUR', 'DE'),
  ('A1 Ring', 'A1R', 'AT'),
  ('Silverstone', 'SIL', 'GB'),
  ('Laguna Seca', 'LAG', 'US'),
  ('Suzuka Circuit', 'SUZ', 'JP')
on conflict (short_code) do update
  set name = excluded.name, country_code = excluded.country_code;

-- Racers ---------------------------------------------------------------------
insert into wec.racers (first_name, last_name, country_code)
select 'Gilbert', 'Holland-Lloyd', 'GB'
where not exists (
  select 1 from wec.racers where first_name = 'Gilbert' and last_name = 'Holland-Lloyd'
);

insert into wec.racers (first_name, last_name, country_code)
select 'Chris', 'Johnson', 'GB'
where not exists (
  select 1 from wec.racers where first_name = 'Chris' and last_name = 'Johnson'
);
