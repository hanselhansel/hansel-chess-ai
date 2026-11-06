// Rules-only locked fixture tests. No browser, model or Native capability.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Chess } from "chess.js";
import { validateProtocolFixture, validateOpeningFixture, buildGameSchedule } from "./phase-fixtures.mjs";
import { FIXED_LIMITS, REQUIRED_CHECK_IDS } from "./schema-constants.mjs";

const load = async (name) => JSON.parse(await readFile(new URL(`../../fixtures/${name}`, import.meta.url), "utf8"));
const protocol = await load("browser-protocol.json");
const openings = await load("browser-openings.json");
const parity = await load("browser-parity.json");
const replay = (position) => {
  const board = new Chess(position.initialFen);
  for (const uci of position.movesUci) {
    board.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  }
  return board;
};

test("protocol binds every fixed check group and resource/clock literal", () => {
  const result = validateProtocolFixture(protocol);
  assert.deepEqual(result.requiredCheckIds, REQUIRED_CHECK_IDS);
  assert.deepEqual(result.limits, FIXED_LIMITS);
  assert.equal(Object.isFrozen(result.limits.timing.phaseMs), true);
  for (const mutate of [
    (p) => { p.limits.timing.commandMs += 1; },
    (p) => { p.limits.timing.phaseMs.compare = 3600000; },
    (p) => { p.requiredCheckIds.check.pop(); },
    (p) => { p.preflight.freshRequestsPerArm = 4; },
    (p) => { p.comparison.gameCount = 42; },
    (p) => { p.extra = true; },
  ]) {
    const value = structuredClone(protocol);
    mutate(value);
    assert.throws(() => validateProtocolFixture(value), (error) => error.code === "FIXTURE_INVALID");
  }
});

test("all locked prefixes are legal, distinct, nonterminal and disjoint from numeric fixtures", () => {
  const result = validateOpeningFixture(openings);
  const endFens = result.openings.map((opening) => replay(opening).fen());
  assert.equal(new Set(endFens).size, 20);
  const numeric = new Set(parity.cases.map((entry) => replay(entry).fen()));
  assert.equal(endFens.some((fen) => numeric.has(fen)), false);
  assert.equal(Object.isFrozen(result.openings[0].movesUci), true);
});

test("changed, omitted, reordered or extra locked openings reject", () => {
  for (const mutate of [
    (p) => { p.openings[0].movesUci[0] = "d2d4"; },
    (p) => { p.openings.pop(); },
    (p) => { p.openings.reverse(); },
    (p) => { p.openings[0].extra = true; },
  ]) {
    const value = structuredClone(openings);
    mutate(value);
    assert.throws(() => validateOpeningFixture(value), (error) => error.code === "FIXTURE_INVALID");
  }
});

test("compare schedule fixes forty games, complete pair order and odd/even colors", () => {
  const schedule = buildGameSchedule({ phase: "compare", openings });
  assert.equal(schedule.length, 40);
  assert.equal(new Set(schedule.map((g) => g.gameId)).size, 40);
  for (let pair = 1; pair <= 20; pair += 1) {
    const [one, two] = schedule.slice((pair - 1) * 2, pair * 2);
    assert.equal(one.pairNumber, pair);
    assert.equal(two.pairNumber, pair);
    assert.equal(one.gameNumber, 1);
    assert.equal(two.gameNumber, 2);
    assert.equal(one.candidateColor, pair % 2 === 1 ? "white" : "black");
    assert.notEqual(one.candidateColor, two.candidateColor);
    assert.deepEqual(one.movesUci, two.movesUci);
  }
});

test("preflight A/A consumes no final openings and every legal first move draws", () => {
  const schedule = buildGameSchedule({ phase: "preflight" });
  assert.deepEqual(schedule.map((g) => g.gameId), ["aa-g1", "aa-g2"]);
  assert.throws(() => buildGameSchedule({ phase: "preflight", openings }), /cannot consume final openings/);
  const board = replay(schedule[0]);
  assert.equal(board.isGameOver(), false);
  const legal = board.moves({ verbose: true });
  assert.equal(legal.length, 15);
  for (const move of legal) {
    const child = new Chess(board.fen());
    child.move(move);
    assert.equal(child.isCheckmate(), false);
    assert.equal(child.isDraw(), true);
  }
});
