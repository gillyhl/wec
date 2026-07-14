import { createClient } from "@/lib/supabase/server";
import {
  championshipWinner,
  getChampionshipData,
  pointsForRank,
} from "@/lib/championship";
import type { Championship, Racer, RacingSeries, Track } from "@/lib/types";

// A racer's combined stats across every championship.
export interface RacerTotals {
  racer: Racer;
  races: number;
  wins: number;
  podiums: number;
  pointsFinishes: number;
  retirements: number;
  championshipsWon: number;
  points: number;
}

// A racer's record at a single track (across every championship on that game).
export interface TrackRacerRow {
  track: Track;
  racer: Racer;
  races: number;
  // Best (lowest) finishing position; null if the racer only ever retired.
  bestFinish: number | null;
  wins: number;
  podiums: number;
  pointsFinishes: number;
  retirements: number;
  points: number;
}

// One table per game: every racer-at-track row, ordered by points scored.
export interface SeriesTrackStats {
  series: RacingSeries;
  rows: TrackRacerRow[];
}

export interface StatsData {
  racerTotals: RacerTotals[];
  series: SeriesTrackStats[];
  // For each track, the racer with the strongest record there.
  trackSpecialists: TrackRacerRow[];
  // For each racer, the track where they have their strongest record. Ordered
  // to match `racerTotals`.
  bestTrackByRacer: TrackRacerRow[];
}

// Picks the stronger of two track records: more points, then more wins, then
// the better (lower) best finish.
function strongerTrackRow(a: TrackRacerRow, b: TrackRacerRow): TrackRacerRow {
  if (a.points !== b.points) return a.points > b.points ? a : b;
  if (a.wins !== b.wins) return a.wins > b.wins ? a : b;
  const af = a.bestFinish ?? Infinity;
  const bf = b.bestFinish ?? Infinity;
  return af <= bf ? a : b;
}

// Sort racers by points, then wins, then name — used for both overall totals
// and per-track tables so ordering is consistent.
function byPointsThenWins(
  a: { points: number; wins: number; racer: Racer },
  b: { points: number; wins: number; racer: Racer },
): number {
  return (
    b.points - a.points ||
    b.wins - a.wins ||
    a.racer.last_name.localeCompare(b.racer.last_name)
  );
}

// Project Cars 2 first, then iRacing, in track-stats output.
const SERIES_ORDER: RacingSeries[] = ["project_cars_2", "iracing"];

// Aggregates every championship's results into overall per-racer totals and
// per-racer-per-track breakdowns grouped by game. Reuses getChampionshipData
// (and its countback-aware standings) so winner resolution matches the rest of
// the app.
export async function getStatsData(): Promise<StatsData> {
  const supabase = await createClient();

  const { data: championships } = await supabase
    .from("championships")
    .select("id, name, status, series, created_at")
    .returns<Championship[]>();

  const all = await Promise.all(
    (championships ?? []).map((c) => getChampionshipData(c.id)),
  );

  const racerTotals = new Map<string, RacerTotals>();
  // key: `${trackId}|${racerId}` -> that racer's running record at that track.
  const trackRows = new Map<string, TrackRacerRow>();

  const racerTotal = (racer: Racer): RacerTotals => {
    let t = racerTotals.get(racer.id);
    if (!t) {
      t = {
        racer,
        races: 0,
        wins: 0,
        podiums: 0,
        pointsFinishes: 0,
        retirements: 0,
        championshipsWon: 0,
        points: 0,
      };
      racerTotals.set(racer.id, t);
    }
    return t;
  };

  const trackRacer = (track: Track, racer: Racer): TrackRacerRow => {
    const key = `${track.id}|${racer.id}`;
    let s = trackRows.get(key);
    if (!s) {
      s = {
        track,
        racer,
        races: 0,
        bestFinish: null,
        wins: 0,
        podiums: 0,
        pointsFinishes: 0,
        retirements: 0,
        points: 0,
      };
      trackRows.set(key, s);
    }
    return s;
  };

  for (const data of all) {
    if (!data) continue;
    const { championship, races, standings } = data;

    if (championship.status === "finished") {
      const winner = championshipWinner(standings);
      if (winner) racerTotal(winner.racer).championshipsWon++;
    }

    for (const row of standings) {
      for (const race of races) {
        const cell = row.cells[race.id];
        if (!cell) continue; // racer did not take part in this race

        const pts = pointsForRank(cell.rank);
        const isWin = cell.rank === 1;
        const isPodium = cell.rank !== null && cell.rank <= 3;

        const tot = racerTotal(row.racer);
        tot.races++;
        tot.points += pts;
        if (cell.retired) tot.retirements++;
        if (isWin) tot.wins++;
        if (isPodium) tot.podiums++;
        if (pts > 0) tot.pointsFinishes++;

        const ts = trackRacer(race.track, row.racer);
        ts.races++;
        ts.points += pts;
        if (cell.retired) ts.retirements++;
        if (isWin) ts.wins++;
        if (isPodium) ts.podiums++;
        if (pts > 0) ts.pointsFinishes++;
        if (
          cell.rank !== null &&
          (ts.bestFinish === null || cell.rank < ts.bestFinish)
        ) {
          ts.bestFinish = cell.rank;
        }
      }
    }
  }

  const racerTotalsArr = [...racerTotals.values()].sort(byPointsThenWins);

  const seriesMap = new Map<RacingSeries, TrackRacerRow[]>();
  for (const row of trackRows.values()) {
    const arr = seriesMap.get(row.track.source) ?? [];
    arr.push(row);
    seriesMap.set(row.track.source, arr);
  }

  const series: SeriesTrackStats[] = [...seriesMap.entries()]
    .map(([s, rows]) => ({
      series: s,
      // Order by points scored; fall back to wins, then track, then name.
      rows: rows.sort(
        (a, b) =>
          b.points - a.points ||
          b.wins - a.wins ||
          a.track.name.localeCompare(b.track.name) ||
          a.racer.last_name.localeCompare(b.racer.last_name),
      ),
    }))
    .sort(
      (a, b) =>
        SERIES_ORDER.indexOf(a.series) - SERIES_ORDER.indexOf(b.series),
    );

  // Best record per track, and each racer's best track, from the same rows.
  const specialistByTrack = new Map<string, TrackRacerRow>();
  const bestByRacer = new Map<string, TrackRacerRow>();
  for (const row of trackRows.values()) {
    const t = specialistByTrack.get(row.track.id);
    specialistByTrack.set(row.track.id, t ? strongerTrackRow(t, row) : row);
    const r = bestByRacer.get(row.racer.id);
    bestByRacer.set(row.racer.id, r ? strongerTrackRow(r, row) : row);
  }

  const trackSpecialists = [...specialistByTrack.values()].sort(
    (a, b) =>
      SERIES_ORDER.indexOf(a.track.source) -
        SERIES_ORDER.indexOf(b.track.source) ||
      a.track.name.localeCompare(b.track.name),
  );

  // Follow the Drivers-table ordering so the two line up.
  const bestTrackByRacer = racerTotalsArr
    .map((t) => bestByRacer.get(t.racer.id))
    .filter((r): r is TrackRacerRow => r !== undefined);

  return {
    racerTotals: racerTotalsArr,
    series,
    trackSpecialists,
    bestTrackByRacer,
  };
}
