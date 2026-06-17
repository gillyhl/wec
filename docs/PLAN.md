# WEC Championship Tracker

This project will allow the tracking of WEC championships between drivers. This project must use a modern front end library and backend that will be easy to deploy on Vercel. The database for the data will be on Postgres. This document demonstrates the flows and screens required.

## Data Structure
The main database resource is the championship, that will have with it, the name of the tournament, the status (current, finished), and an ID for relationships.

The allowed race tracks a championship can be raced at will also be stored in the database. The columns will be, track name, track short code, and ISO country code.

There will be a racer table that will list the racer's first name, last name and ISO country code they are from

Each championship will have a race, the race entry will be linked to a championship and a race track.

Then for a race, there will be a race result entry, which will match a racer with a race, and give a rank on the race.

There will be a championship points table which will track how many points a racer has got in a championship, this table will update together when a race result is put in.

For now the database will be seeded with the tracks defined in tracks.csv, and the racers will be of name Gilbert Holland-Lloyd, and Chris Johnson, both with ISO code GB-ENG.

## Front Page
This will display all the championships that have been stored in a table with a summary. The table will show the name of the championship, and the status. Clicking on a row will take to a championship page.

## Championship Table
This will show the results of the championship in a table, the rows will be the racer (showing their country's flag as well), ordered by championship position, and the columns will be each race, showing the flag of the race track and the short code of the track, and each racer's position as the column's value. Then at the end will be the championship points.

## Inputting Values
Supabase authentication will be used to ensure only the user with email gilberthl93@gmail.com will be allowed to input race results.

## Creating a new Championship
When creating a new championship, it will create a random championship race order, it MUST start with the IMO track first, but thereafter, any race at random.