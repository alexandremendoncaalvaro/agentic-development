import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_ROOT = join(__dirname, '..', 'src', 'skills');

function listSkills(agent) {
  const root = join(SKILLS_ROOT, agent);
  return readdirSync(root)
    .filter((name) => statSync(join(root, name)).isDirectory())
    .map((name) => ({ name, dir: join(root, name) }));
}

function parseFrontmatter(filePath) {
  const text = readFileSync(filePath, 'utf8');
  if (!text.startsWith('---\n')) {
    throw new Error(`${filePath}: missing opening frontmatter delimiter`);
  }
  const end = text.indexOf('\n---', 4);
  if (end === -1) {
    throw new Error(`${filePath}: missing closing frontmatter delimiter`);
  }
  return yaml.load(text.slice(4, end));
}

for (const agent of ['claude-code', 'codex']) {
  for (const { name, dir } of listSkills(agent)) {
    test(`skill ${agent}/${name}: SKILL.md frontmatter parses with required fields`, () => {
      const fm = parseFrontmatter(join(dir, 'SKILL.md'));
      assert.equal(typeof fm.name, 'string', 'name must be a string');
      assert.equal(fm.name, name, `name (${fm.name}) must match dir (${name})`);
      assert.equal(typeof fm.description, 'string', 'description must be a string');
      assert.ok(fm.description.length > 0, 'description must not be empty');
      assert.ok(
        fm.description.length <= 1536,
        `description must be ≤1536 chars (Anthropic Skills spec); got ${fm.description.length}`
      );
      // Per task-0029, every kit skill carries a kit-specific `summary:`
      // field for the managed AGENTS.md table cell. Without it, rootdoc.js
      // throws at section-build time.
      assert.equal(typeof fm.summary, 'string', 'summary must be a string (task-0029)');
      assert.ok(fm.summary.length > 0, 'summary must not be empty');
      assert.ok(
        fm.summary.length <= 320,
        `summary must be ≤320 chars (compressed table cell); got ${fm.summary.length}. ` +
          `If you need more space, you are probably pasting the Anthropic ` +
          `description verbatim — strip the trigger keywords and keep only ` +
          `the one-or-two-sentence functional summary.`
      );
    });
  }
}

// Archiving an ADR hard-deletes the file and leaves the plain-text `ADR-NNNN`
// mention as a breadcrumb resolvable via git log (576bb9d). A cited *path*
// does not survive that: it ships to every consuming project pointing at a
// file the kit no longer has. Paths inside fenced blocks are illustrative
// output, not citations, so they are skipped.
const REPO_ROOT = join(__dirname, '..');

function citedAdrPaths(filePath) {
  const cited = [];
  let inFence = false;
  let fenceCount = 0;
  const lines = readFileSync(filePath, 'utf8').split('\n');
  lines.forEach((line, index) => {
    if (line.trimStart().startsWith('```')) {
      inFence = !inFence;
      fenceCount += 1;
      return;
    }
    if (inFence) return;
    for (const match of line.matchAll(/doc\/adr\/\d{4}-[a-z0-9-]+\.md/g)) {
      cited.push({ path: match[0], line: index + 1 });
    }
  });
  // An unterminated fence would silently swallow every citation after it,
  // turning this guard into a no-op exactly where it is needed.
  assert.equal(
    fenceCount % 2,
    0,
    `${filePath}: unterminated code fence (${fenceCount} markers) — ` +
      `the dead-ADR-path guard cannot read past it`
  );
  return cited;
}

// A dead path in a subagent manifest ships just as widely as one in the
// skill body, so the guard covers every installed file, not only SKILL.md.
function installedFiles(dir) {
  const files = [join(dir, 'SKILL.md')];
  const agentsDir = join(dir, 'agents');
  if (existsSync(agentsDir)) {
    for (const entry of readdirSync(agentsDir)) {
      if (statSync(join(agentsDir, entry)).isFile()) {
        files.push(join(agentsDir, entry));
      }
    }
  }
  return files;
}

for (const agent of ['claude-code', 'codex']) {
  for (const { name, dir } of listSkills(agent)) {
    test(`skill ${agent}/${name}: every cited ADR path resolves to a real file`, () => {
      for (const filePath of installedFiles(dir)) {
        for (const { path, line } of citedAdrPaths(filePath)) {
          assert.ok(
            existsSync(join(REPO_ROOT, path)),
            `${filePath.slice(REPO_ROOT.length + 1)}:${line} cites ${path}, ` +
              `which does not exist. If the ADR was archived, keep the ` +
              `plain-text ADR-NNNN breadcrumb and drop the path — a dead ` +
              `path ships to every consuming project.`
          );
        }
      }
    });
  }
}

for (const { name, dir } of listSkills('codex')) {
  test(`skill codex/${name}: agents/openai.yaml parses with required fields`, () => {
    const yamlPath = join(dir, 'agents', 'openai.yaml');
    assert.ok(existsSync(yamlPath), `${yamlPath} must exist (cc-sdd convention)`);
    const doc = yaml.load(readFileSync(yamlPath, 'utf8'));
    assert.equal(typeof doc?.interface?.display_name, 'string');
    assert.equal(typeof doc?.interface?.short_description, 'string');
    assert.equal(typeof doc?.policy?.allow_implicit_invocation, 'boolean');
  });
}

for (const agent of ['claude-code', 'codex']) {
  for (const { name, dir } of listSkills(agent)) {
    const manifestPath = join(dir, 'manifest.json');
    if (!existsSync(manifestPath)) continue;
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    for (const subagentRel of manifest.subagents || []) {
      test(`skill ${agent}/${name}: manifest subagent ${subagentRel} parses with required fields`, () => {
        const subagentPath = join(dir, subagentRel);
        if (agent === 'claude-code') {
          const fm = parseFrontmatter(subagentPath);
          assert.equal(typeof fm.name, 'string', 'subagent name must be a string');
          assert.equal(typeof fm.description, 'string', 'subagent description must be a string');
          assert.ok(fm.description.length > 0, 'subagent description must not be empty');
          assert.equal(typeof fm.tools, 'string', 'subagent tools must be a string (comma-separated)');
          assert.equal(typeof fm.model, 'string', 'subagent model must be a string');
          return;
        }

        const text = readFileSync(subagentPath, 'utf8');
        assert.match(text, /^name = ".+"/m, 'Codex subagent must declare name');
        assert.match(text, /^description = ".+"/m, 'Codex subagent must declare description');
        assert.match(
          text,
          /^developer_instructions = """[\s\S]+"""$/m,
          'Codex subagent must declare developer_instructions'
        );
      });
    }
  }
}

// --- Cross-host parity: the platform-identifier guard (tasks 0005, 0032) ---

// Briefs that read a code diff can meet an identifier they cannot verify, and
// task 0005 recorded what happens without a guard: two reviewers independently
// called a real model name fabricated. `rule-candidate-reviewer` is excluded on
// purpose — it reviews proposed rule text against rule files and never sees a
// diff, so the guard would be dead weight there (task 0032 scope decision).
const DIFF_READING_BRIEFS = [
  'claude-code/ad-review/agents/fresh-context-reviewer.md',
  'claude-code/ad-audit/agents/audit-group-reviewer.md',
  'codex/ad-review/agents/fresh-context-reviewer.toml',
  'codex/ad-audit/agents/audit-group-reviewer.toml',
];

test('every diff-reading reviewer brief carries the platform-identifier guard, on both hosts', () => {
  for (const rel of DIFF_READING_BRIEFS) {
    const path = join(SKILLS_ROOT, rel);
    assert.ok(existsSync(path), `${rel} is missing`);
    const body = readFileSync(path, 'utf8').toLowerCase();
    assert.ok(
      body.includes('fabricated'),
      `${rel} does not forbid the "fabricated identifier" claim — see tasks 0005 and 0032`
    );
    assert.ok(
      body.includes('unfamiliarity') || body.includes('absence of recognition'),
      `${rel} forbids the claim but not the reasoning that produces it (unfamiliarity)`
    );
  }
});

test('the guard list covers every brief that exists, so a new brief cannot be forgotten', () => {
  const found = [];
  for (const agent of ['claude-code', 'codex']) {
    for (const { name, dir } of listSkills(agent)) {
      const agentsDir = join(dir, 'agents');
      if (!existsSync(agentsDir)) continue;
      for (const file of readdirSync(agentsDir)) {
        if (file.endsWith('.md') || file.endsWith('.toml')) {
          found.push(`${agent}/${name}/agents/${file}`);
        }
      }
    }
  }
  // Every brief is either guarded or explicitly excluded — nothing unaccounted for.
  const EXCLUDED = found.filter((p) => p.includes('rule-candidate-reviewer'));
  const accounted = new Set([...DIFF_READING_BRIEFS, ...EXCLUDED]);
  const unaccounted = found.filter((p) => !accounted.has(p));
  assert.deepEqual(
    unaccounted,
    [],
    `new reviewer brief(s) not classified as guarded or excluded: ${unaccounted.join(', ')}`
  );
});

// --- Cross-host parity: the anchor-echo contract (task-0033) ---

// The anchor contract has two carriers: the audit handoff template (in
// SKILL.md) and the reviewer brief. A machine with a stale installed brief
// still receives the contract through the handoff, but the shipped source
// must carry both so installs converge — the task-0033 self-audit observed a
// live dispatch running a pre-change brief while the handoff carried the
// contract.
const ANCHOR_ECHO_BRIEFS = [
  'claude-code/ad-audit/agents/audit-group-reviewer.md',
  'codex/ad-audit/agents/audit-group-reviewer.toml',
];

test('the audit-group-reviewer brief carries the anchor-echo contract, on both hosts', () => {
  for (const rel of ANCHOR_ECHO_BRIEFS) {
    const path = join(SKILLS_ROOT, rel);
    assert.ok(existsSync(path), `${rel} is missing`);
    const body = readFileSync(path, 'utf8');
    assert.ok(
      body.includes('Anchors: <file>=<sha256>, target=<SHA>'),
      `${rel} lost the anchor-echo line shape (task-0033)`
    );
    assert.ok(
      body.includes('never copied'),
      `${rel} no longer forbids copying the handoff's expected values`
    );
    assert.ok(
      body.includes('UNVERIFIED'),
      `${rel} no longer states the UNVERIFIED consequence of a missing echo`
    );
  }
});

test('the ad-audit skill carries the expected-anchors block and the UNVERIFIED rule, on both hosts', () => {
  for (const rel of ['claude-code/ad-audit/SKILL.md', 'codex/ad-audit/SKILL.md']) {
    const body = readFileSync(join(SKILLS_ROOT, rel), 'utf8');
    assert.ok(
      body.includes('EXPECTED ANCHORS'),
      `${rel} lost the EXPECTED ANCHORS handoff section (task-0033)`
    );
    assert.ok(
      body.includes('UNVERIFIED'),
      `${rel} lost the anchor-mismatch UNVERIFIED aggregation rule (task-0033)`
    );
  }
});

test('the ad-audit skill carries the empirical-falsification lane, on both hosts (ADR-0052)', () => {
  for (const rel of ['claude-code/ad-audit/SKILL.md', 'codex/ad-audit/SKILL.md']) {
    const body = readFileSync(join(SKILLS_ROOT, rel), 'utf8');
    assert.ok(
      body.includes('empirical falsification lane') || body.includes('Empirical falsification lane'),
      `${rel} lost the empirical-falsification lane (ADR-0052, C4)`
    );
    assert.ok(
      body.includes('ADR-0052'),
      `${rel} no longer cites ADR-0052 for the lane`
    );
    // The lane's load-bearing constraints — orchestrator-only + serial — must
    // survive an edit, since ADR-0052 makes them non-negotiable.
    assert.ok(
      body.toLowerCase().includes('cannot fail'),
      `${rel} lost the lane's narrow "cannot fail" trigger`
    );
    assert.ok(
      body.toLowerCase().includes('serial'),
      `${rel} lost the lane's serial constraint (the load-113 lesson)`
    );
  }
});

test('both audit-group-reviewer briefs forbid mutation and hand the lane trigger up (ADR-0052)', () => {
  for (const rel of ANCHOR_ECHO_BRIEFS) {
    const body = readFileSync(join(SKILLS_ROOT, rel), 'utf8');
    assert.ok(
      body.includes('ADR-0052'),
      `${rel} lost the ADR-0052 mutation guard`
    );
    assert.ok(
      body.toLowerCase().includes('cannot fail'),
      `${rel} no longer names the "cannot fail" inference it must hand up`
    );
  }
});

// --- Skill scripts host parity (task-0031) ---
// A skill script (scripts/ beside SKILL.md) is host-agnostic executable code:
// both hosts must ship it, byte-identical, so the copy-drift that motivated
// task-0031 (inline probe blocks maintained per host) cannot re-enter through
// the scripts/ door.

function listSkillScripts(agent) {
  const out = new Map();
  for (const { name, dir } of listSkills(agent)) {
    const scriptsDir = join(dir, 'scripts');
    if (!existsSync(scriptsDir)) continue;
    for (const file of readdirSync(scriptsDir)) {
      out.set(`${name}/scripts/${file}`, join(scriptsDir, file));
    }
  }
  return out;
}

test('skill scripts: both hosts ship the same script set, byte-identical', () => {
  const claude = listSkillScripts('claude-code');
  const codex = listSkillScripts('codex');
  assert.deepEqual(
    [...claude.keys()].sort(),
    [...codex.keys()].sort(),
    'script sets must match across hosts'
  );
  for (const [rel, claudePath] of claude) {
    const same = readFileSync(claudePath).equals(readFileSync(codex.get(rel)));
    assert.ok(same, `${rel}: claude-code and codex copies must be byte-identical`);
  }
});

test('skill scripts: at least the ad-audit resolution probe ships', () => {
  assert.ok(
    listSkillScripts('claude-code').has('ad-audit/scripts/resolve-rules.mjs'),
    'ad-audit must ship scripts/resolve-rules.mjs (task-0031 first consumer)'
  );
});

// --- The read contract: rule and delivery must not drift apart ---

// WORKFLOW.md §1 states the three-rung read contract; ad-philosophy delivers it
// as posture on both hosts. Two failure modes are being pinned. First, a host
// that carries the rule while the other does not — the copy-drift the dual-host
// source tree exists to prevent. Second, and the reason this test reads the
// constitution too: the delivery cites `WORKFLOW.md` §1 *Reading order* by name,
// so deleting or renaming that subsection would leave 25 installed skills
// pointing at a section that no longer exists. A reference into a void is the
// exact defect the read contract was written to reduce.

test('the read contract is delivered on both hosts and its cited section exists', () => {
  const workflow = readFileSync(join(REPO_ROOT, 'WORKFLOW.md'), 'utf8');
  assert.ok(
    workflow.includes('### Reading order'),
    'WORKFLOW.md lost the `### Reading order` subsection that ad-philosophy cites by name'
  );

  for (const agent of ['claude-code', 'codex']) {
    const path = join(SKILLS_ROOT, agent, 'ad-philosophy', 'SKILL.md');
    const body = readFileSync(path, 'utf8');
    assert.ok(
      body.includes('*Reading order*'),
      `${agent}/ad-philosophy does not deliver the read contract — WORKFLOW.md §1 states it, ` +
        'so a host missing it reads every layer before every change'
    );
    for (const rung of ['definition layer', 'decision records', 'looks wrong']) {
      assert.ok(
        body.includes(rung),
        `${agent}/ad-philosophy cites the read contract but drops the "${rung}" rung`
      );
    }
  }
});

// --- Every WORKFLOW section a skill cites must exist ---

// Skills cite the constitution by section number (`WORKFLOW §10`,
// `WORKFLOW.md §4 + §5`). A citation is only worth its token cost if the
// reader can follow it, and a renumbered or deleted section turns twenty-odd
// pointers into dead ends silently — nothing else in the suite reads both
// sides. Section headings carry ranges (`## 4–5.`), so the range is expanded
// rather than matched literally.

function workflowSectionNumbers(text) {
  const found = new Set();
  for (const match of text.matchAll(/^## ([0-9][0-9–—-]*)\./gm)) {
    const bounds = match[1]
      .split(/[–—-]/)
      .map(Number)
      .filter((n) => Number.isInteger(n));
    if (bounds.length === 2) {
      for (let n = bounds[0]; n <= bounds[1]; n += 1) found.add(n);
    } else if (bounds.length === 1) {
      found.add(bounds[0]);
    }
  }
  return found;
}

test('every WORKFLOW.md section cited by a skill exists in WORKFLOW.md', () => {
  const sections = workflowSectionNumbers(
    readFileSync(join(REPO_ROOT, 'WORKFLOW.md'), 'utf8')
  );
  assert.ok(sections.size > 0, 'no numbered sections parsed out of WORKFLOW.md');

  const dangling = [];
  for (const agent of ['claude-code', 'codex']) {
    for (const { name, dir } of listSkills(agent)) {
      const path = join(dir, 'SKILL.md');
      if (!existsSync(path)) continue;
      const lines = readFileSync(path, 'utf8').split('\n');
      lines.forEach((line, index) => {
        if (!line.includes('WORKFLOW')) return;
        for (const cite of line.matchAll(/§\s*([0-9]+)/g)) {
          const num = Number(cite[1]);
          if (!sections.has(num)) {
            dangling.push(`${agent}/${name}/SKILL.md:${index + 1} cites WORKFLOW §${num}`);
          }
        }
      });
    }
  }

  assert.deepEqual(
    dangling,
    [],
    `skills cite WORKFLOW sections that do not exist:\n  ${dangling.join('\n  ')}`
  );
});

// --- Documentation Discipline: the contract and its delivery carry the same rules ---

// WORKFLOW.md §2 states the rules; ad-philosophy is their operational delivery
// (ADR-0008) and is what actually loads into an agent's context each session.
// The two drifted apart unnoticed: the constitution declared thirteen rules
// authoritative while the skill claimed eleven and listed eleven, so the
// contract an agent obeyed was two rules short of the contract that bound it —
// and one of the missing rules had no delivery anywhere in the kit. Nothing
// read both sides, which is why the gap survived. Numbers are compared rather
// than text: the delivery compresses each rule's wording on purpose.

function disciplineRuleNumbers(text) {
  // Anchor on the section's opening line, not on the phrase: both hosts mention
  // "Documentation Discipline" in prose before the rules begin, and anchoring on
  // the first mention slices a region that holds none of them. The three sources
  // open the section three ways — `### `, `## `, and a bold lead-in.
  const opener = text.match(/^(#{2,3} Documentation Discipline|\*\*Documentation Discipline\.\*\*)/m);
  assert.ok(opener, 'no Documentation Discipline section opener found');
  const after = text.slice(opener.index);
  // WORKFLOW.md carries later numbered lists (§15's loop-construction ladder),
  // so the slice stops at the next level-2 heading. `\n## ` cannot match
  // `\n### ` — the third `#` is not the space — so the marker's own heading
  // level does not matter.
  const end = after.indexOf('\n## ', 1);
  const section = end === -1 ? after : after.slice(0, end);
  return new Set([...section.matchAll(/^(\d{1,2})\. \*\*/gm)].map((m) => Number(m[1])));
}

test('regression: task 0034 — ad-philosophy delivers every rule WORKFLOW.md declares', () => {
  const declared = disciplineRuleNumbers(
    readFileSync(join(REPO_ROOT, 'WORKFLOW.md'), 'utf8')
  );
  assert.ok(declared.size >= 13, `parsed only ${declared.size} rules out of WORKFLOW.md`);

  for (const agent of ['claude-code', 'codex']) {
    const delivered = disciplineRuleNumbers(
      readFileSync(join(SKILLS_ROOT, agent, 'ad-philosophy', 'SKILL.md'), 'utf8')
    );
    const missing = [...declared].filter((n) => !delivered.has(n)).sort((a, b) => a - b);
    const extra = [...delivered].filter((n) => !declared.has(n)).sort((a, b) => a - b);
    assert.deepEqual(
      missing,
      [],
      `${agent}/ad-philosophy does not deliver WORKFLOW.md rule(s) ${missing.join(', ')}`
    );
    assert.deepEqual(
      extra,
      [],
      `${agent}/ad-philosophy delivers rule(s) ${extra.join(', ')} that WORKFLOW.md does not declare`
    );
  }
});

// --- Amendment pairs in this repo's own ADR layer ---

// Partial supersession is declared as a header-field pair (ADR-0049): the
// amending record carries `Amends:`, the amended one carries `Amended by:`.
// An unpaired field is invisible to anything but a prose read, which is the
// cost the pair exists to remove — so the kit gates on its own rule rather
// than only advising it through `ad-drift`.

test('every ADR amendment declares both sides of the pair', () => {
  const adrDir = join(REPO_ROOT, 'doc', 'adr');
  // Relations, not files: one record can amend or be amended by several others,
  // so each side is a set of `from>to` edges rather than one entry per file.
  const amends = new Set();
  const amendedBy = new Set();

  for (const name of readdirSync(adrDir).filter((f) => /^\d{4}-.*\.md$/.test(f))) {
    const id = name.slice(0, 4);
    const body = readFileSync(join(adrDir, name), 'utf8');
    for (const m of body.matchAll(/^\*\*Amends:\*\*\s*\[?ADR-(\d{4})/gm)) {
      amends.add(`${id}>${m[1]}`);
    }
    for (const m of body.matchAll(/^\*\*Amended by:\*\*\s*\[?ADR-(\d{4})/gm)) {
      amendedBy.add(`${id}>${m[1]}`);
    }
  }

  const unpaired = [];
  for (const edge of amends) {
    const [from, to] = edge.split('>');
    if (!amendedBy.has(`${to}>${from}`)) {
      unpaired.push(`ADR-${from} declares Amends: ADR-${to}, but ADR-${to} has no matching Amended by:`);
    }
  }
  for (const edge of amendedBy) {
    const [from, to] = edge.split('>');
    if (!amends.has(`${to}>${from}`)) {
      unpaired.push(`ADR-${from} declares Amended by: ADR-${to}, but ADR-${to} has no matching Amends:`);
    }
  }

  assert.deepEqual(unpaired, [], `unpaired ADR amendment fields:\n  ${unpaired.join('\n  ')}`);
});

// A projection is only worth reading if it is current, and the same-commit
// habit that keeps it current is exactly what a hurried commit drops. The
// record count is the cheapest part to verify mechanically, and it was already
// wrong once: the ADR that introduced the projection was itself missing from
// the total. Everything else on that page needs a human; this does not.

test('the ADR projection states the number of records the directory actually holds', () => {
  const adrDir = join(REPO_ROOT, 'doc', 'adr');
  const projection = join(adrDir, 'PROJECTION.md');
  if (!existsSync(projection)) return; // the projection is permitted, not required

  const records = readdirSync(adrDir).filter((f) => /^\d{4}-.*\.md$/.test(f)).length;
  const claimed = readFileSync(projection, 'utf8').match(/All (\d+) ADRs/);
  assert.ok(claimed, 'PROJECTION.md no longer states a record total in the form "All N ADRs"');
  assert.equal(
    Number(claimed[1]),
    records,
    `PROJECTION.md claims ${claimed[1]} ADRs; doc/adr/ holds ${records}. ` +
      'A decision that changes what binds updates the projection in the same commit.'
  );
});
