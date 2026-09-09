// Pure presentation helpers for tracks, free of any database access so client
// components can import them alongside the results helpers.

// How a favourite track is marked wherever tracks are listed — a race column
// in the standings, a track row in the statistics tables. The wash is faint on
// purpose: over the dark panels it reads as a gold tint rather than a block of
// colour competing with the result colours beside it, so the name it sits
// behind carries the gold instead.
export const FAVOURITE_TINT = "bg-amber-400/15";
export const FAVOURITE_LABEL = "text-amber-200";
