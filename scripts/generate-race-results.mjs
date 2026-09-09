#!/usr/bin/env node
//
// Generates random race results for a championship and stores them, one race
// at a time. Local development only — it refuses to run against anything but
// the local Supabase stack.
//
//   node scripts/generate-race-results.mjs <championship-id> [--force]
//
// Races that already have results are skipped (the racers' cars are still
// carried forward from them), unless --force is passed, which regenerates
// every race in the championship from scratch.
//
// How a race is generated
// -----------------------
//   * Finishing position: each racer rolls 1-26 four times and takes their
//     lowest roll. A roll that collides with a position already taken is
//     discarded and rerolled until it is unique.
//   * Classified finishers: four 15-26 rolls, again taking the lowest. Any
//     racer whose position falls outside that (17 finishers, finished 19th) is
//     recorded as a retirement instead, which the schema stores as `retired`
//     with a null rank.
//   * Cars: every racer is given a random car from the championship's game at
//     the start of the season. Before each subsequent race they roll 1-20, and
//     on a 1 or 2 they switch to another random car — which may be the one
//     they were already in.

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Finishing positions: the lowest of four 1-26 rolls.
const POSITION_ROLLS = 4;
const POSITION_MIN = 1;
const POSITION_MAX = 26;

// Classified finishers in a race: the lowest of four 15-26 rolls, drawn once
// per race. Taking the lowest of four skews the count towards the bottom of
// that range, so most races retire somebody.
const FINISHERS_ROLLS = 4;
const FINISHERS_MIN = 15;
const FINISHERS_MAX = 26;

// Car switches: a 1-20 roll before each race, switching on a 1 or a 2.
const CAR_SWAP_ROLL_MAX = 20;
const CAR_SWAP_ON_OR_BELOW = 2;

// Mirrors wec.points_for_rank so the generated result can show what it scored.
const POINTS_BY_RANK = {
  1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1,
};

const color = (code) => (s) => (process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s);
const bold = color(1);
const dim = color(2);

// Inclusive on both ends.
function rollBetween(min, max) {
  return crypto.randomInt(min, max + 1);
}

function lowestOf(rolls, min, max) {
  let lowest = max;
  for (let i = 0; i < rolls; i++) {
    lowest = Math.min(lowest, rollBetween(min, max));
  }
  return lowest;
}

function randomItem(items) {
  return items[crypto.randomInt(items.length)];
}

// ---------------------------------------------------------------------------
// Local stack connection
// ---------------------------------------------------------------------------

// Reads API_URL / ANON_KEY / JWT_SECRET from the running local stack. Every
// value can be overridden with an environment variable of the same name, which
// also skips shelling out to the CLI entirely when all three are set.
function localStackConfig() {
  const fromEnv = {
    API_URL: process.env.API_URL,
    ANON_KEY: process.env.ANON_KEY,
    JWT_SECRET: process.env.JWT_SECRET,
  };
  if (fromEnv.API_URL && fromEnv.ANON_KEY && fromEnv.JWT_SECRET) return fromEnv;

  let output;
  try {
    output = execFileSync("npx", ["supabase", "status", "-o", "env"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 120_000,
    });
  } catch {
    throw new Error(
      "Could not read the local Supabase stack's status. Start it with `npm run db:start` first.",
    );
  }

  const config = { ...fromEnv };
  for (const line of output.split("\n")) {
    const match = /^([A-Z0-9_]+)="(.*)"$/.exec(line.trim());
    if (match && !config[match[1]]) config[match[1]] = match[2];
  }

  for (const key of ["API_URL", "ANON_KEY", "JWT_SECRET"]) {
    if (!config[key]) {
      throw new Error(`\`supabase status\` did not report ${key}. Is the local stack running?`);
    }
  }
  return config;
}

// The `wec` tables only grant write access to `authenticated`, and their RLS
// policies narrow that to the admin email (see wec.is_admin), so a service-role
// key gets nowhere. Signing a short-lived token with the local stack's JWT
// secret lets the script write over exactly the same API and policies the app
// uses. The secret is the Supabase CLI's throwaway local one — this is why the
// script refuses to talk to any host but localhost.
function mintAdminToken(jwtSecret, email) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const issuedAt = Math.floor(Date.now() / 1000);
  const claims = {
    aud: "authenticated",
    role: "authenticated",
    email,
    // No auth.users row is needed: the policies only read the email claim.
    sub: "00000000-0000-0000-0000-000000000000",
    iat: issuedAt,
    exp: issuedAt + 12 * 60 * 60,
  };
  const body = `${encode({ alg: "HS256", typ: "JWT" })}.${encode(claims)}`;
  const signature = crypto.createHmac("sha256", jwtSecret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function assertLocal(apiUrl) {
  const { hostname } = new URL(apiUrl);
  if (hostname !== "127.0.0.1" && hostname !== "localhost" && hostname !== "::1") {
    throw new Error(
      `Refusing to generate results against ${hostname}. This script is for local development only.`,
    );
  }
}

// ---------------------------------------------------------------------------
// Generating a race
// ---------------------------------------------------------------------------

// Assigns every racer a unique finishing position, each the lowest of four
// 1-26 rolls, rerolling any that lands on a position already taken.
function drawPositions(racers) {
  const taken = new Set();
  const positions = new Map();

  for (const racer of racers) {
    let position;
    do {
      position = lowestOf(POSITION_ROLLS, POSITION_MIN, POSITION_MAX);
    } while (taken.has(position));
    taken.add(position);
    positions.set(racer.id, position);
  }

  return positions;
}

// One race's results: a finishing position for every racer, turned into a
// retirement when it falls outside the classified finishers.
function generateRace(racers, carByRacer) {
  const classifiedFinishers = lowestOf(FINISHERS_ROLLS, FINISHERS_MIN, FINISHERS_MAX);
  const positions = drawPositions(racers);

  const results = racers.map((racer) => {
    const position = positions.get(racer.id);
    const retired = position > classifiedFinishers;
    return {
      racer,
      car: carByRacer.get(racer.id),
      rank: retired ? null : position,
      retired,
      // Kept for display only: a retirement has no finishing position, but
      // showing where it happened makes the generated result easier to read.
      position,
    };
  });

  // Finishers in order, then the retirements behind them.
  results.sort((a, b) => Number(a.retired) - Number(b.retired) || a.position - b.position);

  return { classifiedFinishers, results };
}

// Rolls each racer's pre-race car switch. The replacement is drawn from every
// car in the series, so a racer can roll a switch and stay put.
function applyCarSwaps(racers, cars, carByRacer) {
  const switched = [];
  for (const racer of racers) {
    if (rollBetween(1, CAR_SWAP_ROLL_MAX) > CAR_SWAP_ON_OR_BELOW) continue;
    const from = carByRacer.get(racer.id);
    const to = randomItem(cars);
    carByRacer.set(racer.id, to);
    if (from?.id !== to.id) switched.push({ racer, from, to });
  }
  return switched;
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

function racerName(racer) {
  return `${racer.first_name} ${racer.last_name}`;
}

function printRace(race, { classifiedFinishers, results }, switched) {
  const heading = `Round ${race.round} · ${race.track.name} (${race.track.short_code})`;
  console.log(`\n${bold(heading)}`);
  console.log(dim(`${classifiedFinishers} classified finishers`));

  for (const { racer, from, to } of switched) {
    const previous = from ? `${from.name} → ` : "";
    console.log(dim(`  ${racerName(racer)} switched car: ${previous}${to.name}`));
  }

  const rows = results.map((result) => ({
    pos: result.retired ? "RET" : String(result.rank),
    name: racerName(result.racer),
    car: result.car.name,
    points: result.retired ? "0" : String(POINTS_BY_RANK[result.rank] ?? 0),
  }));

  const width = (key, header) =>
    Math.max(header.length, ...rows.map((row) => row[key].length));
  const widths = {
    pos: width("pos", "Pos"),
    name: width("name", "Racer"),
    car: width("car", "Car"),
    points: width("points", "Pts"),
  };

  const line = (pos, name, car, points) =>
    `  ${pos.padStart(widths.pos)}  ${name.padEnd(widths.name)}  ${car.padEnd(widths.car)}  ${points.padStart(widths.points)}`;

  console.log(dim(line("Pos", "Racer", "Car", "Pts")));
  for (const row of rows) console.log(line(row.pos, row.name, row.car, row.points));
}

// Waits for any key before the next race. Falls through immediately when the
// script is not attached to a terminal (piped output, CI), so it stays usable
// without a keyboard.
function waitForKeypress(message) {
  if (!process.stdin.isTTY) return Promise.resolve();

  process.stdout.write(dim(`\n${message}`));
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();

  return new Promise((resolve) => {
    process.stdin.once("keypress", (_string, key) => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
      // Raw mode swallows Ctrl+C, so quit on it explicitly.
      if (key.ctrl && key.name === "c") process.exit(130);
      resolve();
    });
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const championshipId = args.find((arg) => !arg.startsWith("--"));

  if (!championshipId) {
    console.error(
      "Usage: node scripts/generate-race-results.mjs <championship-id> [--force]",
    );
    process.exit(1);
  }

  const config = localStackConfig();
  assertLocal(config.API_URL);

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "gilberthl93@gmail.com";
  const supabase = createClient(config.API_URL, config.ANON_KEY, {
    db: { schema: "wec" },
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: `Bearer ${mintAdminToken(config.JWT_SECRET, adminEmail)}` },
    },
  });

  const fail = (message) => {
    console.error(`\n${message}`);
    process.exit(1);
  };

  const { data: championship, error: championshipError } = await supabase
    .from("championships")
    .select("id, name, series")
    .eq("id", championshipId)
    .maybeSingle();
  if (championshipError) fail(championshipError.message);
  if (!championship) fail(`No championship found with id ${championshipId}.`);

  const [{ data: races, error: racesError }, { data: racers, error: racersError }, { data: cars, error: carsError }] =
    await Promise.all([
      supabase
        .from("races")
        .select("id, round, track:tracks(name, short_code)")
        .eq("championship_id", championshipId)
        .order("round", { ascending: true }),
      supabase.from("racers").select("id, first_name, last_name").order("last_name"),
      supabase.from("cars").select("id, name").eq("source", championship.series),
    ]);

  for (const error of [racesError, racersError, carsError]) {
    if (error) fail(error.message);
  }
  if (!races?.length) fail("That championship has no races scheduled.");
  if (!racers?.length) fail("There are no racers to generate results for.");
  if (!cars?.length) fail(`No cars have been added for ${championship.series}.`);
  if (racers.length > POSITION_MAX) {
    fail(
      `${racers.length} racers cannot be given unique positions from ${POSITION_MIN}-${POSITION_MAX}.`,
    );
  }

  // Results already recorded, so a half-finished season can be resumed: the
  // races they belong to are left alone and the cars they were driven in
  // carry forward into the races still to generate.
  const { data: existing, error: existingError } = await supabase
    .from("race_results")
    .select("race_id, racer_id, car_id")
    .in("race_id", races.map((race) => race.id));
  if (existingError) fail(existingError.message);

  const existingByRace = new Map();
  for (const result of existing ?? []) {
    if (!existingByRace.has(result.race_id)) existingByRace.set(result.race_id, []);
    existingByRace.get(result.race_id).push(result);
  }

  const carById = new Map(cars.map((car) => [car.id, car]));

  // The start-of-season car pick, one random car per racer. Anything already
  // recorded overwrites it as the schedule is walked.
  const carByRacer = new Map(racers.map((racer) => [racer.id, randomItem(cars)]));

  console.log(
    bold(`\n${championship.name}`) +
      dim(` · ${championship.series} · ${races.length} races · ${racers.length} racers`),
  );
  if (force && existingByRace.size > 0) {
    console.log(dim(`Regenerating ${existingByRace.size} race(s) that already had results.`));
  }

  const pending = races.filter((race) => force || !existingByRace.has(race.id));
  if (pending.length === 0) {
    console.log("\nEvery race already has results. Pass --force to regenerate them.");
    return;
  }

  let generated = 0;
  for (const race of races) {
    const recorded = existingByRace.get(race.id);

    // Already raced: adopt the cars it was driven in and move on.
    if (recorded && !force) {
      for (const result of recorded) {
        const car = carById.get(result.car_id);
        if (car) carByRacer.set(result.racer_id, car);
      }
      console.log(
        dim(`\nRound ${race.round} · ${race.track.short_code} — already has results, skipped.`),
      );
      continue;
    }

    // The season-opening cars are the ones picked above; every race after it
    // gives each racer a chance to switch.
    const switched = race.round === 1 ? [] : applyCarSwaps(racers, cars, carByRacer);
    const outcome = generateRace(racers, carByRacer);

    // Clear first when regenerating, so a racer who has since been deleted
    // cannot leave a stale row behind.
    if (recorded) {
      const { error } = await supabase.from("race_results").delete().eq("race_id", race.id);
      if (error) fail(`Could not clear round ${race.round}: ${error.message}`);
    }

    const { error: insertError } = await supabase.from("race_results").insert(
      outcome.results.map((result) => ({
        race_id: race.id,
        racer_id: result.racer.id,
        car_id: result.car.id,
        rank: result.rank,
        retired: result.retired,
      })),
    );
    if (insertError) fail(`Could not save round ${race.round}: ${insertError.message}`);

    printRace(race, outcome, switched);
    generated++;

    if (generated < pending.length) {
      await waitForKeypress("Press any key for the next race…");
    }
  }

  console.log(`\nDone — ${generated} race(s) generated and saved.\n`);
}

main().catch((error) => {
  console.error(`\n${error.message}`);
  process.exit(1);
});
