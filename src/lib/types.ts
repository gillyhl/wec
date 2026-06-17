export type ChampionshipStatus = "current" | "finished";

export interface Track {
  id: string;
  name: string;
  short_code: string;
  country_code: string;
}

export interface Racer {
  id: string;
  first_name: string;
  last_name: string;
  country_code: string;
}

export interface Championship {
  id: string;
  name: string;
  status: ChampionshipStatus;
  created_at: string;
}

export interface Race {
  id: string;
  championship_id: string;
  track_id: string;
  round: number;
}

export interface RaceResult {
  id: string;
  race_id: string;
  racer_id: string;
  rank: number;
}

export const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "gilberthl93@gmail.com";
