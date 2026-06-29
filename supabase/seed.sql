-- Seed data for the WEC Championship Tracker.
-- Idempotent: safe to run multiple times.

-- The application tables live in the `wec` schema. Names are schema-qualified
-- explicitly: the CLI sends the seed in batches, so a session `set search_path`
-- does not reliably carry across to the INSERT statements.

-- Project Cars 2 tracks (from docs/tracks.csv) ------------------------------
insert into wec.tracks (name, short_code, country_code, source) values
  ('Autodromo Enzo e Dino Ferrari', 'IMO', 'IT', 'project_cars_2'),
  ('Autódromo Internacional do Algarve', 'ALG', 'PT', 'project_cars_2'),
  ('Autodromo Nazionale Monza', 'MON', 'IT', 'project_cars_2'),
  ('BRNO Circuit', 'BRN', 'CZ', 'project_cars_2'),
  ('Circuit de Barcelona', 'CAT', 'ES', 'project_cars_2'),
  ('Circuit de la Sarthe', 'LEM', 'FR', 'project_cars_2'),
  ('Circuit de Spa-Francorchamps', 'SPA', 'BE', 'project_cars_2'),
  ('Circuit of the Americas', 'CTA', 'US', 'project_cars_2'),
  ('Circuit Zolder', 'ZOL', 'BE', 'project_cars_2'),
  ('Fuji Speedway', 'FUJ', 'JP', 'project_cars_2'),
  ('Hockenheimring', 'HOC', 'DE', 'project_cars_2'),
  ('Mount Panorama Circuit', 'BAT', 'AU', 'project_cars_2'),
  ('Mugello Circuit', 'MUG', 'IT', 'project_cars_2'),
  ('Nürburgring', 'NUR', 'DE', 'project_cars_2'),
  ('A1 Ring', 'A1R', 'AT', 'project_cars_2'),
  ('Silverstone', 'SIL', 'GB', 'project_cars_2'),
  ('Laguna Seca', 'LAG', 'US', 'project_cars_2'),
  ('Suzuka Circuit', 'SUZ', 'JP', 'project_cars_2'),
  ('Brands Hatch', 'BRA', 'GB', 'project_cars_2'),
  ('Donington Park', 'DON', 'GB', 'project_cars_2')
on conflict (source, short_code) do update
  set name = excluded.name, country_code = excluded.country_code;

-- iRacing tracks (from docs/iracing-tracks.csv) -----------------------------
insert into wec.tracks (name, short_code, country_code, source) values
  ('Algarve International Circuit', 'ALG', 'PT', 'iracing'),
  ('Autodromo Internazionale del Mugello', 'MUG', 'IT', 'iracing'),
  ('Autodromo Internazionale Enzo e Dino Ferrari', 'IMO', 'IT', 'iracing'),
  ('Autódromo José Carlos Pace', 'INT', 'BR', 'iracing'),
  ('Autodromo Nazionale Monza', 'MON', 'IT', 'iracing'),
  ('Brands Hatch Circuit', 'BRA', 'GB', 'iracing'),
  ('Circuit de Barcelona Catalunya', 'CAT', 'ES', 'iracing'),
  ('Circuit de Nevers Magny-Cours', 'MAN', 'FR', 'iracing'),
  ('Circuit de Spa-Francorchamps', 'SPA', 'BE', 'iracing'),
  ('Circuit des 24 Heures du Mans', 'LEM', 'FR', 'iracing'),
  ('Circuit Gilles Villeneuve', 'GIL', 'CA', 'iracing'),
  ('Circuit of the Americas', 'CTA', 'US', 'iracing'),
  ('Circuit Park Zandvoort', 'ZAN', 'NL', 'iracing'),
  ('Circuit Zolder', 'ZOL', 'BE', 'iracing'),
  ('Circuito de Jerez - Ángel Nieto', 'JER', 'ES', 'iracing'),
  ('Donington Park Racing Circuit', 'DON', 'GB', 'iracing'),
  ('Fuji International Speedway', 'FUJ', 'JP', 'iracing'),
  ('Hockenheimring Baden-Württemberg', 'HOC', 'DE', 'iracing'),
  ('Hungaroring', 'HUN', 'HU', 'iracing'),
  ('Mount Panorama Circuit', 'BAT', 'AU', 'iracing'),
  ('Nürburgring Grand-Prix-Strecke', 'NUR', 'DE', 'iracing'),
  ('A1 Ring', 'A1R', 'AT', 'iracing'),
  ('Road America', 'RAM', 'US', 'iracing'),
  ('Road Atlanta', 'RAT', 'US', 'iracing'),
  ('Sebring International Raceway', 'SEB', 'US', 'iracing'),
  ('Silverstone Circuit', 'SIL', 'GB', 'iracing'),
  ('Suzuka International Racing Course', 'SUZ', 'JP', 'iracing'),
  ('Thruxton Circuit', 'THR', 'GB', 'iracing'),
  ('WeatherTech Raceway at Laguna Seca', 'LAG', 'US', 'iracing')
on conflict (source, short_code) do update
  set name = excluded.name, country_code = excluded.country_code;

-- Racers ---------------------------------------------------------------------
insert into wec.racers (first_name, last_name, country_code)
select 'Gilbert', 'Holland-Lloyd', 'HU'
where not exists (
  select 1 from wec.racers where first_name = 'Gilbert' and last_name = 'Holland-Lloyd'
);

insert into wec.racers (first_name, last_name, country_code)
select 'Chris', 'Johnson', 'DE'
where not exists (
  select 1 from wec.racers where first_name = 'Chris' and last_name = 'Johnson'
);
