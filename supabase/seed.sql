-- Seed data for the WEC Championship Tracker.
-- Idempotent: safe to run multiple times.
-- The application tables live in the `wec` schema. Names are schema-qualified
-- explicitly: the CLI sends the seed in batches, so a session `set search_path`
-- does not reliably carry across to the INSERT statements.
-- Tracks ------------------------------
INSERT INTO
  "wec"."tracks" (
    "id",
    "name",
    "short_code",
    "country_code",
    "source",
    "archived"
  )
VALUES
  (
    '004751b8-84ce-46aa-b64c-fa04be13b4e9',
    'Oulton Park',
    'OUL',
    'GB',
    'iracing',
    false
  ),
  (
    '0195e22e-2823-45f1-9664-cb4dfcfc0f2a',
    'Circuit Gilles Villeneuve',
    'GIL',
    'CA',
    'iracing',
    false
  ),
  (
    '187818c6-565a-41dd-8a8d-3bcb969c60e6',
    'Road America',
    'RAM',
    'US',
    'iracing',
    false
  ),
  (
    '1f4cd579-b404-4b83-8880-b94e693141c9',
    'Snetterton',
    'SNE',
    'GB',
    'iracing',
    false
  ),
  (
    '1fb58b0e-a271-4ec5-b269-588b356b0631',
    'Algarve International Circuit',
    'ALG',
    'PT',
    'iracing',
    false
  ),
  (
    '29dd4e5f-8ac1-419b-9b1f-7dedb2e70599',
    'Autodromo Nazionale Monza',
    'MON',
    'IT',
    'iracing',
    false
  ),
  (
    '29fffa05-b67d-4996-9143-db5c953f7fac',
    'Mount Panorama Circuit',
    'BAT',
    'AU',
    'iracing',
    false
  ),
  (
    '2ea15867-0aef-4d48-990d-b859c7fe581f',
    'VIRginia International Raceway',
    'VIR',
    'US',
    'iracing',
    false
  ),
  (
    '2ed9fab9-3c4c-41e7-97ee-5bb33e7690ad',
    'Brands Hatch',
    'BRH',
    'GB',
    'project_cars_2',
    false
  ),
  (
    '2fd5982a-0b4d-4ef9-9c01-5ab8f7977905',
    'Okayama International Circuit',
    'OKY',
    'JP',
    'iracing',
    false
  ),
  (
    '320e9e40-91a5-4afb-ac6e-ddb5507435d6',
    'Circuit de Spa-Francorchamps',
    'SPA',
    'BE',
    'project_cars_2',
    false
  ),
  (
    '320f7c01-92c7-4bfb-9792-39962fbc4594',
    'Road Atlanta',
    'RAT',
    'US',
    'iracing',
    false
  ),
  (
    '334d245a-ccb1-4ce4-9db9-7d8dacb01e2a',
    'Nürburgring',
    'NUR',
    'DE',
    'project_cars_2',
    false
  ),
  (
    '4a948196-1282-4c6e-b48f-a9de7feec139',
    'Circuit des 24 Heures du Mans',
    'LEM',
    'FR',
    'iracing',
    false
  ),
  (
    '4e98f30b-6298-46fc-9f66-23916b9359cb',
    'Mugello Circuit',
    'MUG',
    'IT',
    'project_cars_2',
    false
  ),
  (
    '5caac805-959f-4c52-b05e-3cb09676bbc2',
    'Sakitto Circuit',
    'SAK',
    'JP',
    'project_cars_2',
    false
  ),
  (
    '6377d4f5-42be-42cb-9067-35ac1d768261',
    'Circuit of the Americas',
    'CTA',
    'US',
    'project_cars_2',
    true
  ),
  (
    '65b590e5-5945-47b5-a50c-445af00c86c2',
    'Circuit Zolder',
    'ZOL',
    'BE',
    'project_cars_2',
    false
  ),
  (
    '6978785e-48c2-4359-89bf-ffc8a93502a7',
    'Brands Hatch Circuit',
    'BRH',
    'GB',
    'iracing',
    false
  ),
  (
    '6b708a85-e528-4a6f-b2c5-db852f0f8141',
    'Silverstone Circuit',
    'SIL',
    'GB',
    'iracing',
    false
  ),
  (
    '6dc96d84-5358-4930-9355-3dfa92be9efe',
    'Laguna Seca',
    'LAG',
    'US',
    'project_cars_2',
    false
  ),
  (
    '6f26560b-6187-4bfb-b342-c0882ebb8eb5',
    'Autodromo Enzo e Dino Ferrari',
    'IMO',
    'IT',
    'project_cars_2',
    false
  ),
  (
    '7095b96b-7e7c-45c5-a385-2fe6020136f3',
    'Hockenheimring Baden-Württemberg',
    'HOC',
    'DE',
    'iracing',
    false
  ),
  (
    '70b7011b-0483-4579-9850-a0f94a6768c9',
    'Autódromo José Carlos Pace',
    'INT',
    'BR',
    'iracing',
    false
  ),
  (
    '72f3c4a9-aa39-49e0-8f3e-5f100fe83a8a',
    'Circuit Zolder',
    'ZOL',
    'BE',
    'iracing',
    false
  ),
  (
    '7489c540-7591-416b-a61f-0777dae98b55',
    'Fuji International Speedway',
    'FUJ',
    'JP',
    'iracing',
    false
  ),
  (
    '79889758-919d-4571-98c9-706f198dcab9',
    'Donington Park',
    'DON',
    'GB',
    'project_cars_2',
    false
  ),
  (
    '7b7200b1-38c8-4074-bf93-31bd98a18494',
    'Circuit de Barcelona Catalunya',
    'CAT',
    'ES',
    'iracing',
    false
  ),
  (
    '7bc50c3d-48cf-46ab-8079-d7105df6eaec',
    'Circuit de Barcelona',
    'CAT',
    'ES',
    'project_cars_2',
    false
  ),
  (
    '7df12cce-caff-4792-a503-dd704dbdda02',
    'Winton Motor Raceway',
    'WIN',
    'AU',
    'iracing',
    false
  ),
  (
    '81f53bdf-92fd-400e-8da6-efa64ee4a79f',
    'Suzuka International Racing Course',
    'SUZ',
    'JP',
    'iracing',
    false
  ),
  (
    '82e619e5-6081-4915-8641-5228acccf2d5',
    'Circuit Park Zandvoort',
    'ZAN',
    'NL',
    'iracing',
    false
  ),
  (
    '8a3f7e36-1456-4926-a345-05a1fb3cd0bc',
    'A1 Ring',
    'A1R',
    'AT',
    'iracing',
    false
  ),
  (
    '8a7a8ddb-896b-43fe-b150-54eb645ef5ee',
    'Mount Panorama Circuit',
    'BAT',
    'AU',
    'project_cars_2',
    false
  ),
  (
    '8a9151e0-626a-4000-8064-419f519f8ecc',
    'Circuito de Navarra',
    'NAV',
    'ES',
    'iracing',
    false
  ),
  (
    '8dd0b6da-b788-442a-8581-5d1f40ad027b',
    'Tsukuba Circuit',
    'TSU',
    'JP',
    'iracing',
    false
  ),
  (
    '90a0f8de-016f-4e99-a27e-452e2efec492',
    'WeatherTech Raceway at Laguna Seca',
    'LAG',
    'US',
    'iracing',
    false
  ),
  (
    '932aec26-5a41-4771-8852-ba151a102b14',
    'Lime Rock Park',
    'LIM',
    'US',
    'iracing',
    false
  ),
  (
    '94635332-b3f4-4b32-9a22-7fed7cbac618',
    'Circuit of the Americas',
    'CTA',
    'US',
    'iracing',
    false
  ),
  (
    '95766f5d-185e-4ea8-8dd7-e3f42a130efb',
    'Circuit de la Sarthe',
    'LEM',
    'FR',
    'project_cars_2',
    false
  ),
  (
    '96bd7273-a2e4-433a-ac29-a78e7507cb6e',
    'Autodromo Nazionale Monza',
    'MON',
    'IT',
    'project_cars_2',
    false
  ),
  (
    '97f969d6-fc99-4e1e-a6fd-e7b8ea085fa2',
    'Silverstone',
    'SIL',
    'GB',
    'project_cars_2',
    false
  ),
  (
    '9ad87632-a1d7-46e7-9c50-20f5374a3513',
    'Rudskogen Motorsenter',
    'RUD',
    'NO',
    'iracing',
    false
  ),
  (
    '9c24b911-b06a-4d41-83a2-18684fcf5af8',
    'Oran Park Raceway',
    'ORA',
    'AU',
    'iracing',
    false
  ),
  (
    '9cdb7ec8-eabf-478f-bee4-6c90e626319f',
    'Sebring International Raceway',
    'SEB',
    'US',
    'iracing',
    false
  ),
  (
    '9dbe64d5-04d2-4961-a9c2-6e6a4fb34b56',
    'Canadian Tire Motorsports Park',
    'MOS',
    'CA',
    'iracing',
    false
  ),
  (
    'a88b149c-9cac-4324-9736-5e1f99c8bfb4',
    'Summit Point Motorsports Park',
    'SUM',
    'US',
    'iracing',
    false
  ),
  (
    'a9404a59-4dad-4905-8ce4-48e0c2e7170f',
    'Motorsport Arena Oschersleben',
    'OSC',
    'DE',
    'iracing',
    false
  ),
  (
    'abb75cd1-f6da-4143-9e12-6f173a3f1804',
    'Autodromo Internazionale del Mugello',
    'MUG',
    'IT',
    'iracing',
    false
  ),
  (
    'ada92b36-307e-4da0-befb-81285163ffa4',
    'Circuit de Lédenon',
    'LED',
    'FR',
    'iracing',
    false
  ),
  (
    'af2178bf-6233-4b23-ae5b-0c6616e38d8d',
    'Autódromo Internacional do Algarve',
    'ALG',
    'PT',
    'project_cars_2',
    false
  ),
  (
    'b4a4d7aa-9f56-4d54-92c5-e4305e9047c3',
    'Circuito de Jerez - Ángel Nieto',
    'JER',
    'ES',
    'iracing',
    false
  ),
  (
    'b8d887ce-f7ab-45bf-8e9d-f6eb7959426c',
    'Hungaroring',
    'HUN',
    'HU',
    'iracing',
    false
  ),
  (
    'ba21fc89-3544-4c89-bea6-20f69f34c261',
    'Hockenheimring',
    'HOC',
    'DE',
    'project_cars_2',
    false
  ),
  (
    'bb2fc4d4-fc8f-48fb-b8cb-7f09e2bdaf5d',
    'Circuit de Spa-Francorchamps',
    'SPA',
    'BE',
    'iracing',
    false
  ),
  (
    'bea4cbae-d6f0-4551-8a4c-6933515f28ae',
    'Nürburgring Grand-Prix-Strecke',
    'NUR',
    'DE',
    'iracing',
    false
  ),
  (
    'c470f847-7500-48b9-800b-1c8b9a2f71a0',
    'Autodromo Internazionale Enzo e Dino Ferrari',
    'IMO',
    'IT',
    'iracing',
    false
  ),
  (
    'c9845094-cf78-4299-b847-392eb961e1a1',
    'A1 Ring',
    'A1R',
    'AT',
    'project_cars_2',
    false
  ),
  (
    'c9c94b66-39e5-4c5e-9297-df12757d6a37',
    'Circuit de Nevers Magny-Cours',
    'MAN',
    'FR',
    'iracing',
    false
  ),
  (
    'd8c4a1ff-12ab-493a-8d1b-8e85e6f05108',
    'BRNO Circuit',
    'BRN',
    'CZ',
    'project_cars_2',
    false
  ),
  (
    'eae435ba-08c9-4da8-b250-0b14011e7a01',
    'Oulton Park',
    'OUL',
    'GB',
    'project_cars_2',
    false
  ),
  (
    'f776960d-ebe0-4a30-997c-8a668b2887b5',
    'Donington Park Racing Circuit',
    'DON',
    'GB',
    'iracing',
    false
  ),
  (
    'f938b502-6f20-462a-8fd7-335c3f86a021',
    'Fuji Speedway',
    'FUJ',
    'JP',
    'project_cars_2',
    false
  ),
  (
    'ff77dfb8-09e7-4ca3-b46b-8a923fba49ed',
    'Thruxton Circuit',
    'THR',
    'GB',
    'iracing',
    false
  ) on conflict (source, short_code) do
update
set
  name = excluded.name,
  country_code = excluded.country_code;

-- Racers ---------------------------------------------------------------------
insert into
  wec.racers (first_name, last_name, country_code)
select
  'Gilbert',
  'Holland-Lloyd',
  'HU'
where
  not exists (
    select
      1
    from
      wec.racers
    where
      first_name = 'Gilbert'
      and last_name = 'Holland-Lloyd'
  );

insert into
  wec.racers (first_name, last_name, country_code)
select
  'Chris',
  'Johnson',
  'DE'
where
  not exists (
    select
      1
    from
      wec.racers
    where
      first_name = 'Chris'
      and last_name = 'Johnson'
  );