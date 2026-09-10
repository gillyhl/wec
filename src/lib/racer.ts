import { createClient } from "@/lib/supabase/server";
import { getChampionshipData } from "@/lib/championship";
import { pointsForRank } from "@/lib/results";
import type { RaceCell, RaceWithTrack } from "@/lib/championship";
import type { Car, Championship, Racer, Track } from "@/lib/types";

// A single race in a season, paired with the driver's result there.
export interface SeasonRace {
  race: RaceWithTrack;
  // null when the driver did not take part in this particular race.
  cell: RaceCell | null;
}

// A season's races driven in one particular car — mirrors the championship
// standings' CarRow. The Seasons table renders one display row per
// SeasonCarRow, so a driver who switched cars mid-season is shown across
// multiple rows, each with only that car's races filled in.
export interface SeasonCarRow {
  car: Car | null;
  // One entry per round of the championship, aligned the same way across
  // every car row of a season so they line up in the grid. null means this
  // round isn't this car's to show at all (it belongs to another car row) —
  // rendered as a fully empty cell, not a result. A round with no result in
  // any car is attributed to whichever car last had one, so gaps between
  // two races in the same car still show under that car.
  races: (SeasonRace | null)[];
}

// A driver's record in one championship (season).
export interface RacerSeason {
  championship: Championship;
  points: number;
  // Finishing position in the championship, counted among participants only.
  position: number;
  participants: number;
  wins: number;
  podiums: number;
  retirements: number;
  // This season's races split by car, in the order each car was first
  // driven. Always at least one entry (car: null) so the season still
  // renders a row even if the driver hasn't recorded a car for it.
  carRows: SeasonCarRow[];
}

// One round held at a given track in a given season, paired with the
// driver's result there.
export interface TrackRaceEntry {
  round: number;
  // null when the season visited this track but the driver has no result
  // recorded for that round.
  cell: RaceCell | null;
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
  // championship id -> the rounds that season held at this track, in round
  // order. A season missing from here never visited the track at all, which
  // is what the per-track breakdown renders as a blank column.
  byChampionship: Record<string, TrackRaceEntry[]>;
}

// A driver's aggregated record in a single car, across every season they
// raced it. Mirrors DriverTrackRow.
export interface DriverCarRow {
  car: Car;
  races: number;
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
  carStats: DriverCarRow[];
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
        byChampionship: {},
      };
      trackRows.set(track.id, r);
    }
    return r;
  };

  // track id -> championship id -> that season's rounds at the track. Built
  // from each season's calendar rather than the driver's results, so a round
  // they sat out is still distinguishable from one that was never held.
  const trackSeasons = new Map<string, Record<string, TrackRaceEntry[]>>();

  // Per-car running totals, keyed by car id.
  const carRows = new Map<string, DriverCarRow>();
  const carRow = (car: Car): DriverCarRow => {
    let r = carRows.get(car.id);
    if (!r) {
      r = {
        car,
        races: 0,
        bestFinish: null,
        wins: 0,
        podiums: 0,
        pointsFinishes: 0,
        retirements: 0,
        points: 0,
      };
      carRows.set(car.id, r);
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

    // Which car "owns" each round: a round with a result belongs to that
    // result's car; a round with no result carries forward from whichever
    // car last had one, so a gap between two races in the same car still
    // shows under that car instead of nothing. Rounds before the driver's
    // first result this season have no owner — there's no car to carry
    // forward yet, so they show blank in every row.
    const ownerByRaceId = new Map<string, string | null>();
    let currentCarKey: string | null = null;
    for (const race of data.races) {
      const cell = row.cells[race.id] ?? null;
      if (cell) currentCarKey = cell.car?.id ?? "none";
      ownerByRaceId.set(race.id, currentCarKey);
    }

    // Group this season's races by car, in the order each was first driven —
    // mirrors how getChampionshipData splits a racer's standings row by car.
    const carGroups = new Map<
      string,
      { car: Car | null; cells: Record<string, RaceCell | null> }
    >();
    const carKeyOrder: string[] = [];

    for (const race of data.races) {
      const cell = row.cells[race.id] ?? null;
      const ownerKey = ownerByRaceId.get(race.id) ?? null;

      // Record the round against the track's season breakdown whether or not
      // the driver has a result for it — races arrive in round order, so the
      // list builds up ordered.
      const seasonsAtTrack = trackSeasons.get(race.track.id) ?? {};
      seasonsAtTrack[data.championship.id] = [
        ...(seasonsAtTrack[data.championship.id] ?? []),
        { round: race.round, cell },
      ];
      trackSeasons.set(race.track.id, seasonsAtTrack);

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

        if (cell.car) {
          const cr = carRow(cell.car);
          cr.races++;
          cr.points += pts;
          if (cell.retired) cr.retirements++;
          if (isWin) cr.wins++;
          if (isPodium) cr.podiums++;
          if (pts > 0) cr.pointsFinishes++;
          if (
            cell.rank !== null &&
            (cr.bestFinish === null || cell.rank < cr.bestFinish)
          ) {
            cr.bestFinish = cell.rank;
          }
        }
      }

      // No car established yet for this round (no result recorded so far
      // this season) — leave it unassigned, so every car row shows blank.
      if (ownerKey === null) continue;

      let group = carGroups.get(ownerKey);
      if (!group) {
        // First time this key appears is always a round with an actual
        // result (ownerKey only changes when `cell` is set), so cell.car is
        // this group's car.
        group = { car: cell ? cell.car : null, cells: {} };
        carGroups.set(ownerKey, group);
        carKeyOrder.push(ownerKey);
      }
      group.cells[race.id] = cell;
    }

    const carRows: SeasonCarRow[] =
      carKeyOrder.length > 0
        ? carKeyOrder.map((key) => {
            const group = carGroups.get(key)!;
            return {
              car: group.car,
              // A round not owned by this car (ownerByRaceId points
              // elsewhere, or nowhere yet) renders as a fully empty cell.
              races: data.races.map((race) =>
                ownerByRaceId.get(race.id) === key
                  ? { race, cell: group.cells[race.id] ?? null }
                  : null,
              ),
            };
          })
        : [{ car: null, races: data.races.map(() => null) }];

    seasons.push({
      championship: data.championship,
      points: row.points,
      position: positionById.get(racerId)!,
      participants: participants.length,
      wins,
      podiums,
      retirements,
      carRows,
    });
  }

  // Attach each track's season-by-season rounds. Only tracks the driver
  // actually raced have a row, so seasons that visited a track they never
  // took part in are dropped along with it.
  for (const row of trackRows.values()) {
    row.byChampionship = trackSeasons.get(row.track.id) ?? {};
  }

  // Order tracks by points scored, then wins, then best (lowest) finish,
  // then name — matching the Statistics page's per-track ordering.
  const trackStats = [...trackRows.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.wins - a.wins ||
      (a.bestFinish ?? Infinity) - (b.bestFinish ?? Infinity) ||
      a.track.name.localeCompare(b.track.name),
  );

  // Same ordering, for the driver's per-car record.
  const carStats = [...carRows.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.wins - a.wins ||
      (a.bestFinish ?? Infinity) - (b.bestFinish ?? Infinity) ||
      a.car.name.localeCompare(b.car.name),
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
    carStats,
    streaks: longestStreaks(careerCells),
    headToHead,
  };
}
