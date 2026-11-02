// Empty/all-tied pairs, extreme counts, exact reference probabilities and
// intervals, PGN result/color bookkeeping, duplicate opening rejection and
// suppression of inference on incomplete or faulty cohorts. Descriptive
// counts are always returned; inferential fields stay null unless the
// cohort is complete and verified.

import assert from "node:assert/strict";
import test from "node:test";
import { clopperPearson95, signProbability, summarizePairs } from "./stats.mjs";

const fail = (fn, want = "STATS_ARGS") => {
  try {
    fn();
  } catch (e) {
    assert.equal(e.code, want);
    return;
  }
  assert.fail(`expected ${want}`);
};

const failInput = (fn) => fail(fn, "STATS_INPUT");

test("signProbability matches the exact reference values", () => {
  assert.equal(signProbability(0, 0), 1);
  assert.equal(signProbability(5, 5), 0.0625);
  assert.equal(signProbability(6, 6), 0.03125);
  assert.equal(signProbability(20, 15), 0.04138946533203125);
  assert.equal(signProbability(20, 10), 1);
  assert.equal(signProbability(20, 0), 2 / 2 ** 20);
  assert.equal(signProbability(20, 20), 2 / 2 ** 20);
});

test("signProbability rejects out-of-domain arguments", () => {
  fail(() => signProbability(-1, 0));
  fail(() => signProbability(3, 4));
  fail(() => signProbability(21, 0));
  fail(() => signProbability(1.5, 0));
  fail(() => signProbability("3", 1));
});

test("clopperPearson95 handles edges exactly", () => {
  assert.deepEqual(clopperPearson95(0, 0), { low: 0, high: 1 });
  const all = clopperPearson95(5, 5);
  assert.equal(all.high, 1);
  assert.equal(all.low, 0.4781762498950185);
  const none = clopperPearson95(5, 0);
  assert.equal(none.low, 0);
  assert.equal(none.high, 0.5218237501049815);
  const mid = clopperPearson95(20, 10);
  assert.ok(mid.low < 0.5 && mid.high > 0.5);
  fail(() => clopperPearson95(21, 0));
  fail(() => clopperPearson95(3, 4));
});

// Candidate-relative outcome helpers: the candidate's color is fixed by
// pair parity, so each outcome maps to the exact PGN result string.
const pgn = (pairNumber, gameNumber, outcome) => {
  const white = pairNumber % 2 === 1 ? gameNumber === 1 : gameNumber === 2;
  if (outcome === "win") return white ? "1-0" : "0-1";
  if (outcome === "loss") return white ? "0-1" : "1-0";
  if (outcome === "draw") return "1/2-1/2";
  return "*";
};

const game = (pairNumber, gameNumber, outcome) => ({
  gameNumber,
  candidateColor:
    pairNumber % 2 === 1
      ? gameNumber === 1
        ? "white"
        : "black"
      : gameNumber === 1
        ? "black"
        : "white",
  result: pgn(pairNumber, gameNumber, outcome),
});

const pair = (pairNumber, outcomes, openingId = `op-${pairNumber}`) => ({
  pairNumber,
  openingId,
  games: outcomes.map((o, i) => game(pairNumber, i + 1, o)),
});

const good = { unplannedFaultCount: 0, stoppedEarly: false, cleanupVerified: true };

const complete = (resultA = "win", resultB = "loss") =>
  Array.from({ length: 20 }, (_, i) => pair(i + 1, [resultA, resultB]));

test("an all-tied complete cohort has p=1, null estimate and [0,1]", () => {
  const s = summarizePairs(complete("win", "loss"), good);
  assert.equal(s.analysisEligible, true);
  assert.equal(s.recordedGames, 40);
  assert.equal(s.completedGames, 40);
  assert.equal(s.completedPairs, 20);
  assert.equal(s.nonTiedPairs, 0);
  assert.equal(s.pValue, 1);
  assert.equal(s.conditionalEstimate, null);
  assert.deepEqual(s.interval95, { low: 0, high: 1 });
  assert.equal(s.classification, "no_detectable_advantage");
});

test("a complete advantageous cohort reports the signal", () => {
  const pairs = Array.from({ length: 20 }, (_, i) =>
    pair(i + 1, i < 15 ? ["win", "draw"] : ["loss", "draw"]),
  );
  const s = summarizePairs(pairs, good);
  assert.equal(s.analysisEligible, true);
  assert.equal(s.nonTiedPairs, 20);
  assert.equal(s.advantageousPairs, 15);
  assert.equal(s.disadvantageousPairs, 5);
  assert.equal(s.pValue, 0.04138946533203125);
  assert.equal(s.conditionalEstimate, 0.75);
  assert.equal(s.classification, "advantage_signal_on_locked_suite");
});

test("a complete regression cohort reports the regression signal", () => {
  const pairs = Array.from({ length: 20 }, (_, i) =>
    pair(i + 1, i < 15 ? ["loss", "draw"] : ["win", "draw"]),
  );
  const s = summarizePairs(pairs, good);
  assert.equal(s.analysisEligible, true);
  assert.equal(s.advantageousPairs, 5);
  assert.equal(s.nonTiedPairs, 20);
  assert.equal(s.conditionalEstimate, 0.25);
  assert.equal(s.pValue, 0.04138946533203125);
  assert.equal(s.classification, "regression_signal_on_locked_suite");
});

test("PGN decoding uses result plus candidate color", () => {
  const one = summarizePairs(
    [
      pair(1, ["win", "loss"]),
      { ...pair(2, ["draw", "draw"]), games: [{ gameNumber: 1, candidateColor: "black", result: "1/2-1/2" }, { gameNumber: 2, candidateColor: "white", result: "*" }] },
    ],
    good,
  );
  assert.equal(one.pairScores[0].candidatePoints, 1);
  assert.equal(one.pairScores[0].classification, "tied");
  assert.equal(one.recordedGames, 4);
  assert.equal(one.completedGames, 3);
  assert.equal(one.gameWdl.incomplete, 1);
  assert.equal(one.completedPairs, 1);
});

test("color bookkeeping enforces the swap pattern per pair parity", () => {
  const s = summarizePairs(complete("draw", "draw"), good);
  assert.equal(s.pairScores[0].pairNumber, 1);
  const bad = complete("win", "win");
  bad[0].games[0].candidateColor = "black";
  bad[0].games[0].result = "0-1";
  failInput(() => summarizePairs(bad, good));
});

test("duplicate opening IDs reject even a complete cohort", () => {
  const dup = complete("win", "loss").map((p) => ({ ...p, openingId: "same-opening" }));
  failInput(() => summarizePairs(dup, good));
});

test("closed pair, game and eligibility input shapes reject extras", () => {
  failInput(() => summarizePairs([{ ...pair(1, ["win", "loss"]), extra: 1 }], good));
  failInput(() =>
    summarizePairs(
      [{ pairNumber: 1, openingId: "op-1", games: [{ ...game(1, 1, "win"), extra: 1 }] }],
      good,
    ),
  );
  failInput(() => summarizePairs(complete(), { ...good, extra: true }));
  failInput(() => summarizePairs(complete(), { unplannedFaultCount: 0, stoppedEarly: false }));
  // Inherited substitutions are not own keys: a poisoned prototype on a
  // pair, game or eligibility input still rejects.
  const inheritedPair = Object.create({ ghost: 1 });
  Object.assign(inheritedPair, pair(1, ["win", "loss"]));
  failInput(() => summarizePairs([inheritedPair], good));
  const inheritedGame = Object.create({ ghost: 1 });
  Object.assign(inheritedGame, game(1, 1, "win"));
  failInput(() =>
    summarizePairs([{ pairNumber: 1, openingId: "op-1", games: [inheritedGame] }], good),
  );
  const inheritedGood = Object.create({ ghost: true });
  Object.assign(inheritedGood, good);
  failInput(() => summarizePairs(complete(), inheritedGood));
});

test("incomplete or faulty cohorts suppress all inferential fields", () => {
  const partial = [...complete("win", "win").slice(0, 19), pair(20, ["win"])];
  const s = summarizePairs(partial, good);
  assert.equal(s.analysisEligible, false);
  assert.equal(s.recordedGames, 39);
  assert.equal(s.pValue, null);
  assert.equal(s.classification, "inconclusive");
  const faulted = summarizePairs(complete("win", "win"), {
    unplannedFaultCount: 1,
    stoppedEarly: false,
    cleanupVerified: true,
  });
  assert.equal(faulted.analysisEligible, false);
  assert.equal(faulted.pValue, null);
  const stopped = summarizePairs(complete("win", "win"), {
    unplannedFaultCount: 0,
    stoppedEarly: true,
    cleanupVerified: true,
  });
  assert.equal(stopped.analysisEligible, false);
  const dirty = summarizePairs(complete("win", "win"), {
    unplannedFaultCount: 0,
    stoppedEarly: false,
    cleanupVerified: false,
  });
  assert.equal(dirty.analysisEligible, false);
  assert.equal(dirty.conditionalEstimate, null);
});

test("an empty last pair is allowed; a second partial pair is not", () => {
  const emptyLast = [...complete("win", "loss").slice(0, 19), pair(20, [])];
  const s = summarizePairs(emptyLast, good);
  assert.equal(s.completedPairs, 19);
  assert.equal(s.recordedGames, 38);
  assert.equal(s.analysisEligible, false);
  const two = [...complete("win", "win").slice(0, 18), pair(19, ["win"]), pair(20, ["win"])];
  failInput(() => summarizePairs(two, good));
  const mid = [...complete("win", "win").slice(0, 10), pair(11, ["win"]), ...complete("win", "win").slice(11, 19)];
  failInput(() => summarizePairs(mid, good));
});

test("a '*' result records the game without completing it", () => {
  const starred = [...complete("win", "win").slice(0, 19), pair(20, ["win", "*"])];
  const s = summarizePairs(starred, good);
  assert.equal(s.recordedGames, 40);
  assert.equal(s.completedGames, 39);
  assert.equal(s.gameWdl.incomplete, 1);
  assert.equal(s.completedPairs, 19);
});

test("descriptive counts stay exact on a mixed cohort", () => {
  const pairs = [
    pair(1, ["win", "win"]),
    pair(2, ["draw", "draw"]),
    pair(3, ["loss", "loss"]),
    pair(4, ["win"]),
  ];
  const s = summarizePairs(pairs, good);
  assert.equal(s.recordedGames, 7);
  // The partial pair's completed win is a completed game; only the pair
  // stays incomplete and excluded from the paired difference.
  assert.equal(s.completedGames, 7);
  assert.equal(s.completedPairs, 3);
  assert.deepEqual(s.gameWdl, { wins: 3, draws: 2, losses: 2, incomplete: 0 });
  assert.equal(s.pairScores[3].classification, "incomplete");
  assert.equal(s.pairScores[0].classification, "advantageous");
  assert.equal(s.pairScores[1].classification, "tied");
  assert.equal(s.pairScores[2].classification, "disadvantageous");
  assert.equal(s.pairedScoreDifference.completedPairCount, 3);
});

test("paired difference counts complete pairs only", () => {
  const pairs = [
    pair(1, ["win", "loss"]),
    pair(2, ["win", "loss"]),
    pair(3, ["win", "loss"]),
    pair(4, ["win"]),
  ];
  const s = summarizePairs(pairs, good);
  assert.deepEqual(s.pairedScoreDifference, {
    completedPairCount: 3,
    totalPointsDifference: 0,
    meanPerPair: 0,
  });
  const skew = [
    pair(1, ["win", "win"]),
    pair(2, ["loss", "loss"]),
    pair(3, ["win"]),
  ];
  const t = summarizePairs(skew, good);
  assert.deepEqual(t.pairedScoreDifference, {
    completedPairCount: 2,
    totalPointsDifference: 0,
    meanPerPair: 0,
  });
});
