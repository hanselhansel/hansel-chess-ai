// Exact paired sign/binomial probability and conditional Clopper-Pearson 95%
// interval for the locked 20-pair/40-game cohort, plus PGN result/color
// bookkeeping and inferential-eligibility gating. Descriptive counts are
// always reported; inferential fields stay null unless the cohort is
// complete, fault-free and cleanup-verified. No Elo, equivalence or
// population claims anywhere.

import { FIXED_LIMITS } from "./record-schema.mjs";

const PAIRS = FIXED_LIMITS.cohort.pairs;
const GAMES = FIXED_LIMITS.cohort.games;

const fail = (code, detail) => {
  const error = new Error(`stats ${code}: ${detail}`);
  error.code = code;
  throw error;
};

const isInt = (v) => Number.isSafeInteger(v);
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const hasOwn = (v, k) => Object.prototype.hasOwnProperty.call(v, k);
// Closed input semantics: a plain object (ordinary or null-prototype JSON
// record) whose own key set is exactly the required names. Inherited
// substitutions, custom prototypes and unrelated own keys all reject.
const exactKeys = (v, names) => {
  if (!isObj(v)) return false;
  const proto = Object.getPrototypeOf(v);
  if (proto !== Object.prototype && proto !== null) return false;
  return (
    Object.keys(v).length === names.length &&
    names.every((k) => hasOwn(v, k) && v[k] !== undefined)
  );
};

// Binomial coefficient via exact integer arithmetic (m <= 20, no overflow).
const choose = (m, j) => {
  if (j < 0 || j > m) return 0;
  let c = 1;
  for (let i = 0; i < j; i += 1) c = (c * (m - i)) / (i + 1);
  return c;
};

const binomTail = (m, k) => {
  let sum = 0;
  for (let j = 0; j <= k; j += 1) sum += choose(m, j);
  return sum / 2 ** m;
};

// Two-sided sign probability: doubles the smaller exact tail.
// signProbability(0,0) is 1.
export function signProbability(m, k) {
  if (!isInt(m) || !isInt(k) || k < 0 || m < 0 || k > m || m > PAIRS) {
    fail("STATS_ARGS", `${m}/${k}`);
  }
  return Math.min(1, 2 * binomTail(m, Math.min(k, m - k)));
}

// Inverts the exact equal-tail test by bisection: finds the Bernoulli
// probability whose one-sided tail exactly equals the equal-tail mass `a2`
// (alpha/2 = .025), 60 iterations per endpoint.
const invert = (m, k, a2, lower) => {
  if (k === 0) return lower ? 0 : 1 - a2 ** (1 / m);
  if (k === m) return lower ? a2 ** (1 / m) : 1;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 60; i += 1) {
    const mid = (lo + hi) / 2;
    let tail = 0;
    if (lower) {
      for (let j = k; j <= m; j += 1) tail += choose(m, j) * mid ** j * (1 - mid) ** (m - j);
    } else {
      for (let j = 0; j <= k; j += 1) tail += choose(m, j) * mid ** j * (1 - mid) ** (m - j);
    }
    if (tail > a2) {
      if (lower) hi = mid;
      else lo = mid;
    } else if (lower) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
};

// Conditional exact 95% interval over the sign-probability parameter for the
// nontrivial pairs. m=0 yields {0,1}; all-advantageous and
// all-disadvantageous collapse to the documented one-sided bounds.
export function clopperPearson95(m, k) {
  if (!isInt(m) || !isInt(k) || k < 0 || m < 0 || k > m || m > PAIRS) {
    fail("STATS_ARGS", `${m}/${k}`);
  }
  if (m === 0) return Object.freeze({ low: 0, high: 1 });
  const low = k === 0 ? 0 : invert(m, k, 0.025, true);
  const high = k === m ? 1 : invert(m, k, 0.025, false);
  return Object.freeze({ low, high });
}

const RESULTS = new Set(["1-0", "0-1", "1/2-1/2", "*"]);

// Expected candidate color for a game: odd pairs give the candidate White in
// game 1 and Black in game 2; even pairs do the opposite.
const expectedColor = (pairNumber, gameNumber) => {
  const first = pairNumber % 2 === 1 ? "white" : "black";
  if (gameNumber === 1) return first;
  return first === "white" ? "black" : "white";
};

// Candidate points from the PGN result plus the candidate's color; "*"
// records an incomplete game worth no points.
const candidateGamePoints = (result, color) => {
  if (result === "1-0") return color === "white" ? 1 : 0;
  if (result === "0-1") return color === "black" ? 1 : 0;
  if (result === "1/2-1/2") return 0.5;
  return null;
};

const validateGame = (g, pairNumber, wantGame) => {
  if (!exactKeys(g, ["gameNumber", "candidateColor", "result"])) {
    fail("STATS_INPUT", "game fields");
  }
  if (g.gameNumber !== wantGame) fail("STATS_INPUT", "gameNumber order");
  if (g.candidateColor !== expectedColor(pairNumber, wantGame)) {
    fail("STATS_INPUT", `candidateColor p${pairNumber}g${wantGame}`);
  }
  if (!RESULTS.has(g.result)) fail("STATS_INPUT", "result");
};

// Validates the ordered pair prefix and locked opening IDs, reconstructs
// candidate points from PGN results plus declared colors, classifies each
// pair and gates the inferential block on a complete 20-pair/40-game,
// zero-fault, non-stopped, cleanup-verified cohort.
export function summarizePairs(pairs, eligibility) {
  if (!Array.isArray(pairs)) fail("STATS_INPUT", "pairs");
  if (pairs.length > PAIRS) fail("STATS_INPUT", "too many pairs");
  if (!exactKeys(eligibility, ["unplannedFaultCount", "stoppedEarly", "cleanupVerified"])) {
    fail("STATS_INPUT", "eligibility fields");
  }
  const { unplannedFaultCount, stoppedEarly, cleanupVerified } = eligibility;
  if (
    !isInt(unplannedFaultCount) ||
    unplannedFaultCount < 0 ||
    typeof stoppedEarly !== "boolean" ||
    typeof cleanupVerified !== "boolean"
  ) {
    fail("STATS_INPUT", "eligibility values");
  }

  const pairScores = [];
  const openings = new Set();
  const gameWdl = { wins: 0, draws: 0, losses: 0, incomplete: 0 };
  let recordedGames = 0;
  let completedGames = 0;
  pairs.forEach((pair, i) => {
    const pairNumber = i + 1;
    const last = i === pairs.length - 1;
    if (!exactKeys(pair, ["pairNumber", "openingId", "games"])) {
      fail("STATS_INPUT", "pair fields");
    }
    if (pair.pairNumber !== pairNumber) fail("STATS_INPUT", `pairNumber ${pairNumber}`);
    if (typeof pair.openingId !== "string" || pair.openingId.length === 0) {
      fail("STATS_INPUT", "openingId");
    }
    if (openings.has(pair.openingId)) fail("STATS_INPUT", `duplicate opening ${pair.openingId}`);
    openings.add(pair.openingId);
    if (!Array.isArray(pair.games) || pair.games.length > 2) {
      fail("STATS_INPUT", `games p${pairNumber}`);
    }
    let completed = 0;
    let candidatePoints = 0;
    pair.games.forEach((g, gi) => {
      const want = gi + 1;
      validateGame(g, pairNumber, want);
      recordedGames += 1;
      const p = candidateGamePoints(g.result, g.candidateColor);
      if (p === null) {
        gameWdl.incomplete += 1;
      } else {
        completed += 1;
        completedGames += 1;
        candidatePoints += p;
        if (p === 1) gameWdl.wins += 1;
        else if (p === 0.5) gameWdl.draws += 1;
        else gameWdl.losses += 1;
      }
    });
    // A partial (incomplete) pair is only allowed as the single final pair.
    const complete = pair.games.length === 2 && completed === 2;
    if (!complete && !last) fail("STATS_INPUT", `partial pair p${pairNumber}`);
    const baselinePoints = completed - candidatePoints;
    let classification = "incomplete";
    if (complete) {
      classification =
        candidatePoints > baselinePoints
          ? "advantageous"
          : candidatePoints < baselinePoints
            ? "disadvantageous"
            : "tied";
    }
    pairScores.push(
      Object.freeze({
        pairNumber,
        openingId: pair.openingId,
        completedGames: completed,
        candidatePoints,
        baselinePoints,
        classification,
      }),
    );
  });

  const byClass = (c) => pairScores.filter((p) => p.classification === c).length;
  const completedPairs = pairScores.length - byClass("incomplete");
  const eligible =
    completedPairs === PAIRS &&
    completedGames === GAMES &&
    unplannedFaultCount === 0 &&
    stoppedEarly === false &&
    cleanupVerified === true;
  const m = byClass("advantageous") + byClass("disadvantageous");
  const k = byClass("advantageous");
  const total = pairScores.reduce(
    (n, p) => (p.classification === "incomplete" ? n : n + p.candidatePoints - p.baselinePoints),
    0,
  );

  const summary = {
    recordedGames,
    completedGames,
    completedPairs,
    gameWdl: Object.freeze(gameWdl),
    pairScores: Object.freeze(pairScores),
    advantageousPairs: k,
    disadvantageousPairs: byClass("disadvantageous"),
    tiedPairs: byClass("tied"),
    nonTiedPairs: m,
    conditionalEstimate: null,
    pValue: null,
    interval95: null,
    pairedScoreDifference: Object.freeze({
      completedPairCount: completedPairs,
      totalPointsDifference: total,
      meanPerPair: completedPairs === 0 ? null : total / completedPairs,
    }),
    analysisEligible: eligible,
    classification: "inconclusive",
  };
  if (!eligible) return Object.freeze(summary);

  const p = signProbability(m, k);
  summary.pValue = p;
  summary.conditionalEstimate = m === 0 ? null : k / m;
  summary.interval95 = clopperPearson95(m, k);
  if (p <= 0.05 && k > m / 2) {
    summary.classification = "advantage_signal_on_locked_suite";
  } else if (p <= 0.05 && k < m / 2) {
    summary.classification = "regression_signal_on_locked_suite";
  } else {
    summary.classification = "no_detectable_advantage";
  }
  return Object.freeze(summary);
}
