import { createClient } from "@/lib/supabase/server";
import type {
  Car,
  Championship,
  Race,
  RaceResult,
  Racer,
  Track,
} from "@/lib/types";

export interface RaceWithTrack extends Race {
  track: Track;
}

// A racer's result in a single race, and which car they drove it in.
export interface RaceCell {
  rank: number | null;
  retired: boolean;
  car: Car | null;
}

export interface StandingsRow {
  racer: Racer;
  // The car this row's results were driven in. A racer who used more than one
  // car across the championship gets one row per car (see getChampionshipData);
  // null for a racer with no results yet, or results predating car tracking.
  car: Car | null;
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

// Turns a set of (racer [+ car], cells) entries into ranked, positioned
// standings rows: computes each entry's points and cumulative total from its
// own cells, sorts by points then countback, and assigns positions (ties
// share a position). Shared by getChampionshipData (one row per racer per car
// used) and combinedStandings (one row per racer, cars merged back together).
function buildStandings(
  entries: { racer: Racer; car: Car | null; cells: Record<string, RaceCell> }[],
  races: RaceWithTrack[],
): StandingsRow[] {
  const withCounts = entries.map((entry) => {
    // Walk the races in round order, accumulating points per race.
    let running = 0;
    const cumulative = races.map((race) => {
      const cell = entry.cells[race.id];
      running += cell ? pointsForRank(cell.rank) : 0;
      return running;
    });
    return {
      ...entry,
      points: cumulative[cumulative.length - 1] ?? 0,
      counts: rankCounts(entry.cells),
      cumulative,
      position: 0,
    };
  });

  withCounts.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const cb = compareCountback(a.counts, b.counts);
    if (cb !== 0) return cb;
    // Genuinely tied: order alphabetically for a stable display only;
    // they are assigned the same position below.
    return a.racer.last_name.localeCompare(b.racer.last_name);
  });

  // Assign positions, giving entries level on both points and the countback
  // the same position (e.g. two tied for 3rd, then next is 5th).
  return withCounts.map((row, i) => {
    const prev = withCounts[i - 1];
    const tiedWithPrev =
      prev !== undefined &&
      prev.points === row.points &&
      compareCountback(prev.counts, row.counts) === 0;
    row.position = tiedWithPrev ? prev.position : i + 1;
    const { counts: _counts, ...rest } = row;
    return rest;
  });
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
  // One row per racer per car they used. A racer who drove a single car all
  // season gets one row; a racer who switched cars gets one row per car (see
  // combinedStandings for a merged, one-row-per-racer view).
  standings: StandingsRow[];
}

interface RaceResultWithCar extends RaceResult {
  car: Car | null;
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
    .select(
      "id, championship_id, track_id, round, ai_difficulty, track:tracks(*)",
    )
    .eq("championship_id", championshipId)
    .order("round", { ascending: true })
    .returns<RaceWithTrack[]>();

  const { data: racers } = await supabase
    .from("racers")
    .select("id, first_name, last_name, country_code")
    .order("last_name", { ascending: true })
    .returns<Racer[]>();

  const raceIds = (races ?? []).map((r) => r.id);

  let results: RaceResultWithCar[] = [];
  if (raceIds.length > 0) {
    const { data } = await supabase
      .from("race_results")
      .select("id, race_id, racer_id, car_id, rank, retired, car:cars(*)")
      .in("race_id", raceIds)
      .returns<RaceResultWithCar[]>();
    results = data ?? [];
  }

  const orderedRaces = races ?? [];

  const resultsByRacer = new Map<string, RaceResultWithCar[]>();
  for (const r of results) {
    const list = resultsByRacer.get(r.racer_id) ?? [];
    list.push(r);
    resultsByRacer.set(r.racer_id, list);
  }

  // One entry per racer per distinct car they used. A racer with no results
  // yet still gets a single (carless) entry, so they always appear as a row.
  const entries: { racer: Racer; car: Car | null; cells: Record<string, RaceCell> }[] =
    [];
  for (const racer of racers ?? []) {
    const racerResults = resultsByRacer.get(racer.id);
    if (!racerResults || racerResults.length === 0) {
      entries.push({ racer, car: null, cells: {} });
      continue;
    }

    const byCar = new Map<string, { car: Car | null; cells: Record<string, RaceCell> }>();
    for (const r of racerResults) {
      const carKey = r.car_id ?? "none";
      let group = byCar.get(carKey);
      if (!group) {
        group = { car: r.car ?? null, cells: {} };
        byCar.set(carKey, group);
      }
      group.cells[r.race_id] = { rank: r.rank, retired: r.retired, car: r.car ?? null };
    }
    for (const group of byCar.values()) {
      entries.push({ racer, car: group.car, cells: group.cells });
    }
  }

  const standings = buildStandings(entries, orderedRaces);

  return {
    championship,
    races: orderedRaces,
    racers: racers ?? [],
    standings,
  };
}

// Merges a racer's per-car standings rows back into a single row per racer —
// their results across every car pooled together, re-ranked against every
// other racer's combined total. Used wherever the split by car doesn't
// matter (career/season totals), since a race result belongs to exactly one
// car, so a racer's rows never share a race and can always be merged cleanly.
export function combinedStandings(data: ChampionshipData): StandingsRow[] {
  const byRacer = new Map<string, { racer: Racer; cells: Record<string, RaceCell> }>();
  for (const row of data.standings) {
    let group = byRacer.get(row.racer.id);
    if (!group) {
      group = { racer: row.racer, cells: {} };
      byRacer.set(row.racer.id, group);
    }
    Object.assign(group.cells, row.cells);
  }

  const entries = [...byRacer.values()].map((g) => ({ ...g, car: null }));
  return buildStandings(entries, data.races);
}

// Points on offer for a single race win — used to work out when a title has
// been mathematically clinched (the maximum a rival can still make up).
const MAX_POINTS_PER_RACE = POINTS_BY_RANK[1];

// The racer who has already mathematically clinched the title: the points
// leader whom no rival can catch even if that rival wins every remaining race
// and the leader scores nothing more. Returns null while the title is still
// open, or before anyone has scored. Every other racer counts as a rival —
// including those yet to score, who could in principle win the races to come.
export function clinchedChampion(data: ChampionshipData): StandingsRow | null {
  const { races, standings } = data;
  const leader = standings[0];
  if (!leader || leader.points <= 0) return null;

  // Races still to run: those without any recorded result.
  const racesWithResults = new Set<string>();
  for (const row of standings) {
    for (const raceId of Object.keys(row.cells)) racesWithResults.add(raceId);
  }
  const remaining = races.filter((r) => !racesWithResults.has(r.id)).length;
  const maxGain = MAX_POINTS_PER_RACE * remaining;

  const unassailable = standings
    .slice(1)
    .every((s) => leader.points > s.points + maxGain);
  return unassailable ? leader : null;
}

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
