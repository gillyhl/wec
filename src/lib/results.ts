import type { Car } from "@/lib/types";

// Pure presentation/scoring helpers for race results. Kept free of any
// database access so client components (the standings matrix, the driver's
// seasons table) can import them without pulling in the server-only Supabase
// client that lives alongside the data loaders in `championship.ts`.

// Standard WEC/F1-style points for the top 10 finishers. Mirrors the
// points_for_rank SQL function so the UI can compute per-race points.
export const POINTS_BY_RANK: Record<number, number> = {
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

// The names of every car in a set of per-car rows. Takes the rows
// structurally so these helpers serve both the championship standings' CarRow
// and the driver page's SeasonCarRow.
function carNames(carRows: { car: Car | null }[]): string[] {
  return carRows.map((r) => r.car?.name).filter((n): n is string => !!n);
}

// Comma-joined names of every car used, or "–" if none recorded.
export function carsLabel(carRows: { car: Car | null }[]): string {
  const names = carNames(carRows);
  return names.length > 0 ? names.join(", ") : "–";
}

// A one-line stand-in for that list: the name when a single car was used,
// otherwise just how many. The collapsed standings and seasons rows sit
// beside separately-scrolling result tables, so their cells have to stay a
// single line tall or the rows stop lining up — the full list goes in the
// cell's tooltip instead.
export function carsCountLabel(carRows: { car: Car | null }[]): string {
  const names = carNames(carRows);
  if (names.length === 0) return "–";
  if (names.length === 1) return names[0];
  return `${names.length} cars`;
}
