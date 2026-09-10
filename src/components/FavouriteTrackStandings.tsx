"use client";

import { useState } from "react";
import ChampionshipStandings from "@/components/ChampionshipStandings";
import ToggleSwitch from "@/components/ToggleSwitch";
import type { RaceWithTrack, StandingsRow } from "@/lib/championship";

// A second standings matrix scored over the favourite-track rounds alone —
// "who would be on top if only the good circuits counted?". Nobody wins it:
// the champion, the clinch and the season summary are all decided by the real
// standings above, and these positions carry no title with them. It is a
// sidebar to the season rather than part of it, so it stays collapsed until
// someone asks for it.
export default function FavouriteTrackStandings({
  championshipId,
  races,
  standings,
}: {
  championshipId: string;
  // The championship's favourite-track races, in round order.
  races: RaceWithTrack[];
  // Standings restricted to those races — see `standingsForRaces`.
  standings: StandingsRow[];
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Favourite tracks</h2>
          <p className="mt-1 text-sm text-neutral-400">
            Points from the {races.length} favourite{" "}
            {races.length === 1 ? "round" : "rounds"} only. For interest —
            nothing is won here.
          </p>
        </div>
        <ToggleSwitch
          checked={show}
          onChange={setShow}
          label={show ? "Hide standings" : "Show standings"}
        />
      </div>

      {show && (
        <ChampionshipStandings
          championshipId={championshipId}
          races={races}
          standings={standings}
          // The edit links belong to the real standings above; repeating them
          // on a table that is only a different view of the same results is
          // just a second place for the same click to live.
          isAdmin={false}
          // Every column here is a favourite, so the tint marks nothing.
          highlightFavourites={false}
        />
      )}
    </div>
  );
}
