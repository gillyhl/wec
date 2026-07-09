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

export interface RacerHistory {
  racer: Racer;
  seasons: RacerSeason[];
  trackStats: DriverTrackRow[];
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

  return { racer, seasons, trackStats };
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
