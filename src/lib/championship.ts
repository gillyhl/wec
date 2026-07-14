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

// Background colour for a race result cell, based on finishing position.
// Shared by the championship standings matrix and the driver history page.
export function resultColor(rank: number | null, retired: boolean): string {
  if (retired) return "#EFCFFF";
  if (rank === 1) return "#FFFFBF";
  if (rank === 2) return "#DFDFDF";
  if (rank === 3) return "#FFDF9F";
  if (rank !== null && rank >= 4 && rank <= 10) return "#DFFFDF";
  return "#CFCFFF";
}

// Builds a countback histogram: counts[i] is how many times the racer
// finished in position i+1 (counts[0] = wins, counts[1] = 2nd places, ...).
function rankCounts(cells: Record<string, RaceCell>): number[] {
  const counts: number[] = [];
  for (const cell of Object.values(cells)) {
    if (cell.rank !== null && cell.rank >= 1) {
      counts[cell.rank - 1] = (counts[cell.rank - 1] ?? 0) + 1;
    }
  }
  return counts;
}

// Tie-breaker for racers level on points. The racer with more 1st places is
// classified higher; if equal, compare 2nd places, then 3rd, and so on.
// Returns a negative number if `a` ranks ahead of `b`, positive if behind,
// and 0 if they are genuinely tied (and so share a position).
function compareCountback(a: number[], b: number[]): number {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const diff = (b[i] ?? 0) - (a[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

// The championship winner: the racer in first place, once any points have been
// scored. Standings are pre-sorted (points, then countback), so this is the top
// row. Returns null when nothing has been scored yet.
export function championshipWinner(
  standings: StandingsRow[],
): StandingsRow | null {
  const top = standings[0];
  if (!top || top.points <= 0) return null;
  return top;
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
    .select("id, name, status, series, created_at")
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

  const sorted = (racers ?? [])
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
        counts: rankCounts(cells),
        cumulative,
        position: 0,
      };
    })
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const cb = compareCountback(a.counts, b.counts);
      if (cb !== 0) return cb;
      // Genuinely tied: order alphabetically for a stable display only;
      // they are assigned the same position below.
      return a.racer.last_name.localeCompare(b.racer.last_name);
    });

  // Assign positions, giving racers who are level on both points and the
  // countback the same position (e.g. two tied for 3rd, then next is 5th).
  const standings: StandingsRow[] = sorted.map((row, i) => {
    const prev = sorted[i - 1];
    const tiedWithPrev =
      prev !== undefined &&
      prev.points === row.points &&
      compareCountback(prev.counts, row.counts) === 0;
    row.position = tiedWithPrev ? prev.position : i + 1;
    const { counts: _counts, ...rest } = row;
    return rest;
  });

  return {
    championship,
    races: races ?? [],
    racers: racers ?? [],
    standings,
  };
}

// Points on offer for a single race win — used to work out when a title has
// been mathematically clinched (the maximum a rival can still make up).
const MAX_POINTS_PER_RACE = POINTS_BY_RANK[1];

// Headline talking points for a single championship, derived from the same
// standings/cumulative data the standings matrix is built from.
export interface ChampionshipSummary {
  totalRounds: number;
  // Points gap between champion and runner-up. null until the season is
  // finished (or if there is no runner-up). 0 means it went to countback.
  marginOfVictory: number | null;
  decidedByCountback: boolean;
  // How many times the outright points leader changed hands across the season.
  leadChanges: number;
  // The largest points deficit the (eventual) champion trailed the lead by
  // before going on to top the table. null if they were never headed.
  biggestComeback: { racer: Racer; deficit: number; round: number } | null;
  // 1-indexed round the title was mathematically secured. Equal to
  // totalRounds when it went to the final race. null while in progress.
  titleDecidedRound: number | null;
}

export function championshipSummary(
  data: ChampionshipData,
): ChampionshipSummary {
  const { championship, races, standings } = data;
  const n = races.length;

  const summary: ChampionshipSummary = {
    totalRounds: n,
    marginOfVictory: null,
    decidedByCountback: false,
    leadChanges: 0,
    biggestComeback: null,
    titleDecidedRound: null,
  };

  // Only racers who actually recorded a result count towards the narrative.
  const participants = standings.filter(
    (s) => Object.keys(s.cells).length > 0,
  );
  if (n === 0 || participants.length === 0) return summary;

  const cumulativeAt = (row: StandingsRow, r: number) => row.cumulative[r] ?? 0;

  // Lead changes: track who tops the cumulative table after each round. The
  // incumbent keeps the lead whenever tied at the top, so ties don't flip it.
  let leader: string | null = null;
  for (let r = 0; r < n; r++) {
    const max = Math.max(...participants.map((s) => cumulativeAt(s, r)));
    if (max <= 0) continue; // nobody has scored yet
    const incumbentTop: boolean =
      leader !== null &&
      cumulativeAt(participants.find((s) => s.racer.id === leader)!, r) === max;
    const newLeader: string | null = incumbentTop
      ? leader
      : (participants.find((s) => cumulativeAt(s, r) === max)?.racer.id ??
        leader);
    if (leader !== null && newLeader !== leader) summary.leadChanges++;
    leader = newLeader;
  }

  // Biggest comeback: the largest gap the eventual champion (or, mid-season,
  // the current leader) had to claw back at any point.
  const winner = championshipWinner(standings);
  const comebackTarget = winner ?? standings[0];
  if (comebackTarget) {
    let deficit = 0;
    let round = 0;
    for (let r = 0; r < n; r++) {
      const max = Math.max(...participants.map((s) => cumulativeAt(s, r)));
      const gap = max - cumulativeAt(comebackTarget, r);
      if (gap > deficit) {
        deficit = gap;
        round = r + 1;
      }
    }
    if (deficit > 0) {
      summary.biggestComeback = {
        racer: comebackTarget.racer,
        deficit,
        round,
      };
    }
  }

  if (championship.status === "finished" && winner) {
    const runnerUp = standings.find((s) => s.racer.id !== winner.racer.id);
    if (runnerUp) {
      summary.marginOfVictory = winner.points - runnerUp.points;
      summary.decidedByCountback = summary.marginOfVictory === 0;
    }

    // Title clinched: earliest round after which no rival can catch the
    // champion even if they win every remaining race and the champion scores
    // nothing more. If that never holds, it went to the flag (countback).
    const rivals = participants.filter((s) => s.racer.id !== winner.racer.id);
    for (let r = 0; r < n; r++) {
      const remaining = n - 1 - r;
      const champ = cumulativeAt(winner, r);
      const safe = rivals.every(
        (s) => champ > cumulativeAt(s, r) + MAX_POINTS_PER_RACE * remaining,
      );
      if (safe) {
        summary.titleDecidedRound = r + 1;
        break;
      }
    }
    if (summary.titleDecidedRound === null) summary.titleDecidedRound = n;
  }

  return summary;
}
