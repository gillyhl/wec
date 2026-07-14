import { createClient } from "@/lib/supabase/server";
import { getChampionshipData, pointsForRank } from "@/lib/championship";
import type { RaceCell, RaceWithTrack } from "@/lib/championship";
import type { Championship, Racer, Track } from "@/lib/types";

// A single race in a season, paired with the driver's result there.
export interface SeasonRace {
  race: RaceWithTrack;
  // null when the driver did not take part in this particular race.
  cell: RaceCell | null;
}

// A driver's record in one championship (season).
export interface RacerSeason {
  championship: Championship;
  races: SeasonRace[];
  points: number;
  // Finishing position in the championship, counted among participants only.
  position: number;
  participants: number;
  wins: number;
  podiums: number;
  retirements: number;
}

// A driver's aggregated record at a single track, across every season they
// raced it. Mirrors the per-track stats on the Statistics page.
export interface DriverTrackRow {
  track: Track;
  races: number;
  // Best (lowest) finishing position; null if the driver only ever retired.
  bestFinish: number | null;
  wins: number;
  podiums: number;
  pointsFinishes: number;
  retirements: number;
  points: number;
}

// A driver's longest career runs of a given kind of result, counted over the
// races they entered in chronological order.
export interface DriverStreaks {
  wins: number;
  podiums: number;
  points: number;
  // Consecutive races finished (i.e. not retired).
  finishes: number;
}

// A driver's record against one particular rival, over every race both
// entered. `ahead` + `behind` = comparable races (dead heats/mutual DNFs are
// not counted either way).
export interface HeadToHeadRow {
  opponent: Racer;
  ahead: number;
  behind: number;
}

export interface RacerHistory {
  racer: Racer;
  seasons: RacerSeason[];
  trackStats: DriverTrackRow[];
  streaks: DriverStreaks;
  headToHead: HeadToHeadRow[];
}

// Longest run of each kind of result across the driver's career, walking the
// races they entered in order.
function longestStreaks(cells: RaceCell[]): DriverStreaks {
  const best = { wins: 0, podiums: 0, points: 0, finishes: 0 };
  const run = { wins: 0, podiums: 0, points: 0, finishes: 0 };
  for (const cell of cells) {
    run.wins = cell.rank === 1 ? run.wins + 1 : 0;
    run.podiums = cell.rank !== null && cell.rank <= 3 ? run.podiums + 1 : 0;
    run.points = pointsForRank(cell.rank) > 0 ? run.points + 1 : 0;
    run.finishes = cell.retired ? 0 : run.finishes + 1;
    best.wins = Math.max(best.wins, run.wins);
    best.podiums = Math.max(best.podiums, run.podiums);
    best.points = Math.max(best.points, run.points);
    best.finishes = Math.max(best.finishes, run.finishes);
  }
  return best;
}

// Compares two results in the same race: positive if `a` finished ahead of
// `b`, negative if behind, 0 if not comparable (both retired, or a dead heat).
function compareResults(a: RaceCell, b: RaceCell): number {
  if (a.retired && b.retired) return 0;
  if (a.retired) return -1;
  if (b.retired) return 1;
  if (a.rank === null || b.rank === null) return 0;
  return b.rank - a.rank; // lower rank finishes ahead
}

// Builds a driver's full racing history, one entry per championship they took
// part in, ordered chronologically. Reuses getChampionshipData so results,
// points and tie-broken positions match the rest of the app.
export async function getRacerHistory(
  racerId: string,
): Promise<RacerHistory | null> {
  const supabase = await createClient();

  const { data: racer } = await supabase
    .from("racers")
    .select("id, first_name, last_name, country_code")
    .eq("id", racerId)
    .maybeSingle<Racer>();

  if (!racer) return null;

  const { data: championships } = await supabase
    .from("championships")
    .select("id, name, status, series, created_at")
    .order("created_at", { ascending: true })
    .returns<Championship[]>();

  const all = await Promise.all(
    (championships ?? []).map((c) => getChampionshipData(c.id)),
  );

  const seasons: RacerSeason[] = [];

  // The driver's own results in chronological order, for streak counting.
  const careerCells: RaceCell[] = [];

  // Head-to-head tallies against every rival, keyed by opponent racer id.
  const h2hRows = new Map<string, HeadToHeadRow>();
  const h2hRow = (opponent: Racer): HeadToHeadRow => {
    let r = h2hRows.get(opponent.id);
    if (!r) {
      r = { opponent, ahead: 0, behind: 0 };
      h2hRows.set(opponent.id, r);
    }
    return r;
  };

  // Per-track running totals, keyed by track id.
  const trackRows = new Map<string, DriverTrackRow>();
  const trackRow = (track: Track): DriverTrackRow => {
    let r = trackRows.get(track.id);
    if (!r) {
      r = {
        track,
        races: 0,
        bestFinish: null,
        wins: 0,
        podiums: 0,
        pointsFinishes: 0,
        retirements: 0,
        points: 0,
      };
      trackRows.set(track.id, r);
    }
    return r;
  };

  for (const data of all) {
    if (!data) continue;

    // Racers who actually recorded a result in this championship.
    const participants = data.standings.filter(
      (s) => Object.keys(s.cells).length > 0,
    );

    const row = participants.find((s) => s.racer.id === racerId);
    if (!row) continue; // driver did not take part in this season

    // Re-rank among participants only, preserving the tie handling already
    // applied by getChampionshipData (adjacent rows sharing a position are tied).
    const positionById = new Map<string, number>();
    participants.forEach((s, i) => {
      const prev = participants[i - 1];
      const tiedWithPrev = prev !== undefined && prev.position === s.position;
      positionById.set(
        s.racer.id,
        tiedWithPrev ? positionById.get(prev.racer.id)! : i + 1,
      );
    });

    let wins = 0;
    let podiums = 0;
    let retirements = 0;
    const races: SeasonRace[] = data.races.map((race) => {
      const cell = row.cells[race.id] ?? null;
      if (cell) {
        const isWin = cell.rank === 1;
        const isPodium = cell.rank !== null && cell.rank <= 3;
        const pts = pointsForRank(cell.rank);
        if (cell.retired) retirements++;
        if (isWin) wins++;
        if (isPodium) podiums++;

        careerCells.push(cell);

        // Compare against every other racer who entered this same race.
        for (const opp of participants) {
          if (opp.racer.id === racerId) continue;
          const oppCell = opp.cells[race.id];
          if (!oppCell) continue;
          const cmp = compareResults(cell, oppCell);
          if (cmp === 0) continue;
          const h = h2hRow(opp.racer);
          if (cmp > 0) h.ahead++;
          else h.behind++;
        }

        const tr = trackRow(race.track);
        tr.races++;
        tr.points += pts;
        if (cell.retired) tr.retirements++;
        if (isWin) tr.wins++;
        if (isPodium) tr.podiums++;
        if (pts > 0) tr.pointsFinishes++;
        if (
          cell.rank !== null &&
          (tr.bestFinish === null || cell.rank < tr.bestFinish)
        ) {
          tr.bestFinish = cell.rank;
        }
      }
      return { race, cell };
    });

    seasons.push({
      championship: data.championship,
      races,
      points: row.points,
      position: positionById.get(racerId)!,
      participants: participants.length,
      wins,
      podiums,
      retirements,
    });
  }

  // Order tracks by points scored, then wins, then name — matching the
  // Statistics page's per-track ordering.
  const trackStats = [...trackRows.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.wins - a.wins ||
      a.track.name.localeCompare(b.track.name),
  );

  // Most-contested rivalries first, then by how favourable the record is.
  const headToHead = [...h2hRows.values()].sort(
    (a, b) =>
      b.ahead + b.behind - (a.ahead + a.behind) ||
      b.ahead - b.behind - (a.ahead - a.behind) ||
      a.opponent.last_name.localeCompare(b.opponent.last_name),
  );

  return {
    racer,
    seasons,
    trackStats,
    streaks: longestStreaks(careerCells),
    headToHead,
  };
}

// Ordinal suffix for a finishing position (1 -> "1st", 2 -> "2nd", ...).
export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}
