export type ChampionshipStatus = "current" | "finished";

// Which racing game a track or championship belongs to.
export type RacingSeries = "project_cars_2" | "iracing";

export const RACING_SERIES_LABELS: Record<RacingSeries, string> = {
  project_cars_2: "Project Cars 2",
  iracing: "iRacing",
};

export interface Track {
  id: string;
  name: string;
  short_code: string;
  country_code: string;
  source: RacingSeries;
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
  series: RacingSeries;
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
  // null when the racer retired (DNF) — see `retired`.
  rank: number | null;
  retired: boolean;
}

export const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "gilberthl93@gmail.com";
