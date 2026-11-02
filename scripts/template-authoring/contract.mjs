/**
 * Upstream authoring contract for the Grok og/brand template documents.
 *
 * These checks pin the authoring prose (AGENTS.md and the og skill's
 * SKILL.md plus references/) to this checkout's actual parsers and marker
 * constants. The app does not ship those documents, so they cannot live in
 * the application test glob. `GROK_TEMPLATE_ROOT` must name a readable
 * template checkout that contains the real documents; a missing, unreadable
 * or incomplete root fails this command nonzero. It is an unavailable
 * external check, never a pass or a silent skip.
 *
 *   GROK_TEMPLATE_ROOT=/path/to/template npm run test:template-authoring
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  OG_PENDING_MAX_AGE_MS,
  OG_PENDING_REL_PATH,
  parseBrandCheckArgs,
} from "../brand-check.mjs";
import { parseWriteAtomicArgs, stagingError } from "../write-atomic.mjs";

const TEMPLATE_ROOT = process.env.GROK_TEMPLATE_ROOT;
const SKILL_DIR = ".grok/skills/og";
const REQUIRED_FILES = ["AGENTS.md", `${SKILL_DIR}/SKILL.md`];
const REFERENCES_DIR = `${SKILL_DIR}/references`;

function missingInput(message) {
  console.error(`[template-authoring] ${message}`);
  process.exit(1);
}

if (typeof TEMPLATE_ROOT !== "string" || TEMPLATE_ROOT.trim() === "") {
  missingInput("GROK_TEMPLATE_ROOT is not set; name the authoring template checkout to check");
}
let rootStat;
try {
  rootStat = statSync(TEMPLATE_ROOT);
} catch {
  missingInput(`GROK_TEMPLATE_ROOT is not readable: ${TEMPLATE_ROOT}`);
}
if (!rootStat.isDirectory()) {
  missingInput(`GROK_TEMPLATE_ROOT is not a directory: ${TEMPLATE_ROOT}`);
}
for (const rel of REQUIRED_FILES) {
  const path = join(TEMPLATE_ROOT, rel);
  try {
    if (!statSync(path).isFile()) missingInput(`required authoring input is not a file: ${path}`);
  } catch {
    missingInput(`required authoring input is missing or unreadable: ${path}`);
  }
}
const referencesPath = join(TEMPLATE_ROOT, REFERENCES_DIR);
let referenceDocs;
try {
  referenceDocs = readdirSync(referencesPath).filter((name) =>
    statSync(join(referencesPath, name)).isFile(),
  );
} catch {
  missingInput(`required authoring references directory is missing or unreadable: ${referencesPath}`);
}
if (referenceDocs.length === 0) {
  missingInput(`required authoring references directory has no documents: ${referencesPath}`);
}

const readDoc = (rel) => readFileSync(join(TEMPLATE_ROOT, rel), "utf8");

// --- the prompts are the only enforcement here, so pin them to the code ---

test("SKILL.md and AGENTS.md name the marker path and bound this script uses", () => {
  // Prose wraps, so the minute count may straddle a line break.
  const bound = new RegExp(`${OG_PENDING_MAX_AGE_MS / 60_000}\\s+minutes`);
  for (const rel of [".grok/skills/og/SKILL.md", "AGENTS.md"]) {
    const doc = readDoc(rel);
    assert.ok(doc.includes(`/workspace/${OG_PENDING_REL_PATH}`), `${rel}: marker path`);
    assert.ok(bound.test(doc), `${rel}: staleness bound`);
  }
});

// The two places that own "never wait on the brand task". Scanning the whole
// of AGENTS.md instead would make every unrelated `wait_tasks` mention a future
// feature adds to it this test's business.
const PROHIBITION_SECTIONS = [
  {
    rel: ".grok/skills/og/SKILL.md",
    label: '§ "Brand-asset pass"',
    from: "## Brand-asset pass:",
    until: /\n## /,
  },
  {
    rel: "AGENTS.md",
    label: "execution loop step 6",
    from: "6. **Brand-asset pass",
    until: /\n7\. /,
  },
];

function prohibitionSection({ rel, label, from, until }) {
  const doc = readDoc(rel);
  const start = doc.indexOf(from);
  assert.notEqual(start, -1, `${rel}: ${label} moved — no "${from.trim()}"`);
  const rest = doc.slice(start + from.length);
  const end = rest.search(until);
  // Markdown emphasis and prose wrapping both sit between the two words.
  return (from + (end === -1 ? rest : rest.slice(0, end))).replace(/[`*]/g, "").replace(/\s+/g, " ");
}

test("the sections that own the brand-task prohibition never affirm a wait", () => {
  // Pinned on the shape of the prohibition, not on a negation being somewhere
  // nearby: "So: wait_tasks before the final verify, but never get_task_output"
  // keeps a negation in the sentence while instructing exactly the wait.
  const connectors = /(?:\s|[/,;]|\band\b|\bor\b|\bwait_tasks\b|\bget_task_output\b)+$/i;
  const negation = /\b(?:no|never|not|don['’]t)$/i;
  for (const section of PROHIBITION_SECTIONS) {
    const where = `${section.rel} ${section.label}`;
    const prose = prohibitionSection(section);
    const mentions = [...prose.matchAll(/wait_tasks|get_task_output/g)];
    assert.ok(mentions.length >= 2, `${where}: the prohibition itself went missing`);
    for (const match of mentions) {
      const before = prose.slice(0, match.index).replace(connectors, "");
      const context = prose.slice(Math.max(0, match.index - 60), match.index + 20);
      assert.ok(negation.test(before), `${where}: not a prohibition: …${context}…`);
    }
  }
});

test("SKILL.md tells the pass to self-check with the flag this CLI accepts", () => {
  const skill = readDoc(".grok/skills/og/SKILL.md");
  const invocations = skill.match(/node scripts\/brand-check\.mjs[^\n`]*/g) ?? [];
  assert.ok(invocations.length > 0);
  for (const line of invocations) {
    const argv = line.replace("node scripts/brand-check.mjs", "").trim().split(/\s+/);
    assert.equal(parseBrandCheckArgs(argv.filter(Boolean)).error, undefined, line);
  }
});

test("every hand-over the og skill prints is one this script accepts", () => {
  // The card and banner recipes live in the skill's references/, not SKILL.md.
  const skillDir = join(TEMPLATE_ROOT, ".grok/skills/og");
  const docs = [
    join(skillDir, "SKILL.md"),
    ...readdirSync(join(skillDir, "references")).map((f) => join(skillDir, "references", f)),
  ];
  const invocations = docs.flatMap(
    (path) => readFileSync(path, "utf8").match(/node scripts\/write-atomic\.mjs[^\n`]*/g) ?? [],
  );
  assert.ok(invocations.length >= 3, "og.jpg, x-banner.jpg and site.json each hand over");
  for (const line of invocations) {
    const argv = line.replace("node scripts/write-atomic.mjs", "").trim().split(/\s+/);
    const args = parseWriteAtomicArgs(argv);
    assert.equal(args.error, undefined, line);
    assert.equal(
      stagingError({ staged: args.staged, target: args.target, publicDir: "/workspace/public" }),
      null,
      line,
    );
  }
});
