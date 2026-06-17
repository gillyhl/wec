import { createClient } from "@/lib/supabase/server";
import type {
  Championship,
  Race,
  RaceResult,
  Racer,
  Track,
} from "@/lib/types";

export interface RaceWithTrack extends Race {
  track: Track;
}

// A racer's result in a single race.
export interface RaceCell {
  rank: number | null;
  retired: boolean;
}

export interface StandingsRow {
  racer: Racer;
  position: number;
  points: number;
  // race_id -> the racer's result in that race
  cells: Record<string, RaceCell>;
  // Cumulative championship points after each race, aligned to `races` order.
  cumulative: number[];
}

// Standard WEC/F1-style points for the top 10 finishers. Mirrors the
// points_for_rank SQL function so the UI can compute per-race points.
const POINTS_BY_RANK: Record<number, number> = {
  1: 25,
  2: 18,
  3: 15,
  4: 12,
  5: 10,
  6: 8,
  7: 6,
  8: 4,
  9: 2,
  10: 1,
};

export function pointsForRank(rank: number | null): number {
  if (rank === null) return 0;
  return POINTS_BY_RANK[rank] ?? 0;
}

export interface ChampionshipData {
  championship: Championship;
  races: RaceWithTrack[];
  racers: Racer[];
  standings: StandingsRow[];
}

// Loads everything needed to render a championship's standings matrix.
export async function getChampionshipData(
  championshipId: string,
): Promise<ChampionshipData | null> {
  const supabase = await createClient();

  const { data: championship } = await supabase
    .from("championships")
    .select("id, name, status, created_at")
    .eq("id", championshipId)
    .maybeSingle<Championship>();

  if (!championship) return null;

  const { data: races } = await supabase
    .from("races")
    .select("id, championship_id, track_id, round, track:tracks(*)")
    .eq("championship_id", championshipId)
    .order("round", { ascending: true })
    .returns<RaceWithTrack[]>();

  const { data: racers } = await supabase
    .from("racers")
    .select("id, first_name, last_name, country_code")
    .order("last_name", { ascending: true })
    .returns<Racer[]>();

  const raceIds = (races ?? []).map((r) => r.id);

  let results: RaceResult[] = [];
  if (raceIds.length > 0) {
    const { data } = await supabase
      .from("race_results")
      .select("id, race_id, racer_id, rank, retired")
      .in("race_id", raceIds)
      .returns<RaceResult[]>();
    results = data ?? [];
  }

  const { data: points } = await supabase
    .from("championship_points")
    .select("racer_id, points")
    .eq("championship_id", championshipId)
    .returns<{ racer_id: string; points: number }[]>();

  const pointsByRacer = new Map<string, number>(
    (points ?? []).map((p) => [p.racer_id, p.points]),
  );

  const cellsByRacer = new Map<string, Record<string, RaceCell>>();
  for (const r of results) {
    const existing = cellsByRacer.get(r.racer_id) ?? {};
    existing[r.race_id] = { rank: r.rank, retired: r.retired };
    cellsByRacer.set(r.racer_id, existing);
  }

  const orderedRaces = races ?? [];

  const standings: StandingsRow[] = (racers ?? [])
    .map((racer) => {
      const cells = cellsByRacer.get(racer.id) ?? {};
      // Walk the races in round order, accumulating points per race.
      let running = 0;
      const cumulative = orderedRaces.map((race) => {
        const cell = cells[race.id];
        running += cell ? pointsForRank(cell.rank) : 0;
        return running;
      });
      return {
        racer,
        points: pointsByRacer.get(racer.id) ?? 0,
        cells,
        cumulative,
        position: 0,
      };
    })
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return a.racer.last_name.localeCompare(b.racer.last_name);
    })
    .map((row, i) => ({ ...row, position: i + 1 }));

  return {
    championship,
    races: races ?? [],
    racers: racers ?? [],
    standings,
  };
}
