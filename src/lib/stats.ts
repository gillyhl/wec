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
export interface RacerTrackStats {
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

export interface TrackGroup {
  track: Track;
  racers: RacerTrackStats[];
}

export interface SeriesTrackStats {
  series: RacingSeries;
  tracks: TrackGroup[];
}

export interface StatsData {
  racerTotals: RacerTotals[];
  series: SeriesTrackStats[];
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
  const trackMap = new Map<
    string,
    { track: Track; racers: Map<string, RacerTrackStats> }
  >();

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

  const trackRacer = (track: Track, racer: Racer): RacerTrackStats => {
    let group = trackMap.get(track.id);
    if (!group) {
      group = { track, racers: new Map() };
      trackMap.set(track.id, group);
    }
    let s = group.racers.get(racer.id);
    if (!s) {
      s = {
        racer,
        races: 0,
        bestFinish: null,
        wins: 0,
        podiums: 0,
        pointsFinishes: 0,
        retirements: 0,
        points: 0,
      };
      group.racers.set(racer.id, s);
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

  const seriesMap = new Map<RacingSeries, TrackGroup[]>();
  for (const group of trackMap.values()) {
    const racers = [...group.racers.values()].sort(byPointsThenWins);
    const arr = seriesMap.get(group.track.source) ?? [];
    arr.push({ track: group.track, racers });
    seriesMap.set(group.track.source, arr);
  }

  const series: SeriesTrackStats[] = [...seriesMap.entries()]
    .map(([s, tracks]) => ({
      series: s,
      tracks: tracks.sort((a, b) => a.track.name.localeCompare(b.track.name)),
    }))
    .sort(
      (a, b) =>
        SERIES_ORDER.indexOf(a.series) - SERIES_ORDER.indexOf(b.series),
    );

  return { racerTotals: racerTotalsArr, series };
}
