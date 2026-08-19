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

test('ad-merge has a release-only mode that preserves the tagged commit', () => {
  for (const agent of ['claude-code', 'codex']) {
    const body = readFileSync(join(SKILLS_ROOT, agent, 'ad-merge', 'SKILL.md'), 'utf8');
    assert.match(body, /release-only/i, `${agent} ad-merge must name its release-only mode`);
    assert.match(body, /--merge/, `${agent} ad-merge must force --merge for a release`);
    assert.match(
      body,
      /<github-command> pr merge <num> --merge/,
      `${agent} ad-merge must use its preflight GitHub frontend for a release`
    );
    assert.match(body, /squash/i, `${agent} ad-merge must reject squash for a release`);
    assert.match(body, /rebase/i, `${agent} ad-merge must reject rebase for a release`);
  }
});

test('ad-bootstrap templates preserve every AGENTS to GUIDELINES pointer mapping', () => {
  const mappings = [
    ['Code Style', 2],
    ['Quality Gates', 8],
    ['Commit & PR Conventions', 10],
    ['Security & Privacy', 12],
  ];

  for (const agent of ['claude-code', 'codex']) {
    const template = readFileSync(
      join(SKILLS_ROOT, agent, 'ad-bootstrap', 'references', 'agents-template.md'),
      'utf8'
    );
    for (const [heading, guidelinesSection] of mappings) {
      const start = template.indexOf(`## ${heading}\n`);
      assert.notEqual(start, -1, `${agent} template must define the ${heading} section`);
      const end = template.indexOf('\n## ', start + 1);
      const body = template.slice(start, end === -1 ? template.length : end);
      const pointerStart = body.indexOf('<when-guidelines-md-exists>');
      const pointerEnd = body.indexOf('</when-guidelines-md-exists>');
      assert.notEqual(pointerStart, -1, `${agent} ${heading} needs a GUIDELINES-only branch`);
      assert.notEqual(pointerEnd, -1, `${agent} ${heading} must close its GUIDELINES-only branch`);
      const pointerBranch = body.slice(pointerStart, pointerEnd);
      assert.match(
        pointerBranch,
        new RegExp(`GUIDELINES\\.md[^\\n]*§\\s*${guidelinesSection}\\b`),
        `${agent} ${heading} must point to GUIDELINES.md §${guidelinesSection} when it exists`
      );
    }
  }
});

test('ad-community-docs keeps policy ownership with the maintainer on both hosts', () => {
  for (const agent of ['claude-code', 'codex']) {
    const body = readFileSync(join(SKILLS_ROOT, agent, 'ad-community-docs', 'SKILL.md'), 'utf8');
    assert.match(body, /unreadable\[\]/, `${agent} must surface unreadable policy documents`);
    assert.match(body, /do not overwrite/i, `${agent} must preserve existing policy documents`);
    assert.match(body, /not configured/i, `${agent} must preserve an explicit unconfigured policy`);
    assert.match(body, /never replace/i, `${agent} must not replace existing documents`);
  }
});

test('ad-task requires a local scope anchor before creating a task', () => {
  for (const agent of ['claude-code', 'codex']) {
    const skillDir = join(SKILLS_ROOT, agent, 'ad-task');
    const body = readFileSync(join(skillDir, 'SKILL.md'), 'utf8');
    const template = readFileSync(join(skillDir, 'references', 'task-template.md'), 'utf8');

    assert.match(body, /scope preflight/i, `${agent} must establish the target repository first`);
    assert.match(body, /current repository/i, `${agent} must anchor the task to its repository`);
    assert.match(body, /scope-anchors\.mjs/, `${agent} must run deterministic anchor discovery`);
    assert.match(body, /do not write/i, `${agent} must stop when no local scope anchor exists`);
    assert.match(template, /^\*\*Scope ref:\*\*/m, `${agent} task template needs a Scope ref field`);
    assert.match(template, /^\*\*Evidence ref:\*\*/m, `${agent} task template needs an Evidence ref field`);
  }
});

test('ad-ground persists a validated evidence receipt before non-trivial work', () => {
  for (const agent of ['claude-code', 'codex']) {
    const skillDir = join(SKILLS_ROOT, agent, 'ad-ground');
    const body = readFileSync(join(skillDir, 'SKILL.md'), 'utf8');
    const template = readFileSync(join(skillDir, 'references', 'record-template.md'), 'utf8');
    const philosophy = readFileSync(join(SKILLS_ROOT, agent, 'ad-philosophy', 'SKILL.md'), 'utf8');

    assert.match(body, /Persist the evidence receipt|persist the evidence receipt/i, `${agent} must persist ground evidence`);
    assert.match(body, /validate-record\.mjs/, `${agent} must validate the evidence receipt`);
    assert.match(body, /chat citations are not an audit trail/i, `${agent} must reject chat-only grounding`);
    assert.match(body, /reopen every cited source/i, `${agent} must distinguish a source map from source verification`);
    assert.match(template, /^# GROUND-<NNNN>:/m, `${agent} must ship the ground-record template`);
    assert.match(template, /^## Source register$/m, `${agent} record must register sources`);
    assert.match(template, /^## Audit path$/m, `${agent} record must explain audit replay`);
    assert.match(philosophy, /durable (project artifact|evidence record)/i, `${agent} philosophy must require durable evidence`);
    assert.match(philosophy, /chat-only citations|citations exist only in the session/i, `${agent} philosophy must reject chat-only grounding`);
  }
});

test('ad-handoff keeps preparation exhaustive but makes the resume brief concise', () => {
  for (const agent of ['claude-code', 'codex']) {
    const skillDir = join(SKILLS_ROOT, agent, 'ad-handoff');
    const body = readFileSync(join(skillDir, 'SKILL.md'), 'utf8');
    const template = readFileSync(join(skillDir, 'references', 'handoff-template.md'), 'utf8');

    assert.match(body, /preparation receipt/i, `${agent} must require a compact preparation receipt`);
    assert.match(body, /private preparation pass/i, `${agent} must preserve exhaustive private preparation`);
    assert.match(
      body,
      /do not print the full applied-binding statement/i,
      `${agent} must keep the verbose posture audit out of the resumed session`
    );
    assert.match(template, /^## Resume protocol$/m, `${agent} template needs a resume protocol`);
    for (const label of ['Rules', 'Context', 'State', 'Method']) {
      assert.match(
        template,
        new RegExp(`- \\[x\\] \\*\\*${label}:\\*\\*`),
        `${agent} resume receipt must cover ${label.toLowerCase()}`
      );
    }
    for (const label of ['Final objective', 'Roadmap', 'This session', 'Done when', 'Your attention']) {
      assert.match(
        template,
        new RegExp(`- \\*\\*${label}:\\*\\*`),
        `${agent} executive brief must include ${label.toLowerCase()}`
      );
    }
    assert.match(
      template,
      /only viable competing options/i,
      `${agent} must exclude dominated decision options`
    );
    assert.match(
      template,
      /continue immediately/i,
      `${agent} must not ask for permission when no judgment call remains`
    );
    assert.doesNotMatch(
      template,
      /Invoke `?\/?ad-philosophy`? explicitly/,
      `${agent} resume must not trigger the verbose explicit-invocation output`
    );
    if (agent === 'claude-code') {
      assert.match(
        body,
        /follow its `Resume protocol` before any work/i,
        'Claude handoff chip must use the compact resume protocol'
      );
      assert.doesNotMatch(
        body,
        /instruction to invoke `\/ad-philosophy` explicitly before any work/i,
        'Claude handoff chip must not restore the verbose explicit-invocation path'
      );
    }
  }
});

test('GitHub workflow skills reuse their preflight frontend for every GitHub command', () => {
  for (const agent of ['claude-code', 'codex']) {
    for (const skill of ['ad-pr', 'ad-merge']) {
      const body = readFileSync(join(SKILLS_ROOT, agent, skill, 'SKILL.md'), 'utf8');
      assert.match(
        body,
        /AGENTIC_GH=<wrapper>/,
        `${agent}/${skill} must accept the repository's executable GitHub wrapper`
      );
      assert.match(body, /`github\.command`/, `${agent}/${skill} must retain the preflight frontend`);
      assert.match(body, /<github-command>/, `${agent}/${skill} must use the preflight frontend in later phases`);
      assert.match(
        body,
        /<github-command> auth login/,
        `${agent}/${skill} must recover authentication through the preflight frontend`
      );
      assert.match(
        body,
        /configured wrapper/,
        `${agent}/${skill} must distinguish an unavailable configured wrapper from a missing CLI`
      );
      assert.doesNotMatch(
        body,
        /^gh (?:api|auth login|pr (?:create|merge|view))/m,
        `${agent}/${skill} must not run a later GitHub command through a different frontend`
      );
      assert.doesNotMatch(
        body,
        /GH_CONFIG_DIR="\$HOME\/\.config\/gh-personal"/,
        `${agent}/${skill} must not ship this repository's local account configuration`
      );
    }
    const prBody = readFileSync(join(SKILLS_ROOT, agent, 'ad-pr', 'SKILL.md'), 'utf8');
    assert.match(
      prBody,
      /<github-command> pr create --draft/,
      `${agent}/ad-pr must retain the preflight frontend for a red draft`
    );
    assert.doesNotMatch(
      prBody,
      /`gh pr create --draft`/,
      `${agent}/ad-pr must not suggest a red draft through a different frontend`
    );
    const mergeBody = readFileSync(join(SKILLS_ROOT, agent, 'ad-merge', 'SKILL.md'), 'utf8');
    assert.match(
      mergeBody,
      /pullRequest\.reviews/,
      `${agent}/ad-merge must reuse reviews returned by the preflight`
    );
  }
});

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

// A dead path in a subagent manifest or a bundled references/ file ships just
// as widely as one in the skill body, so the guard covers every installed
// file, not only SKILL.md. references/ joined the set with the ADR-0056
// rollout: those files install alongside the skill, so a dead path inside one
// dangles in every consumer exactly like a dead path in SKILL.md.
function installedFiles(dir) {
  const files = [join(dir, 'SKILL.md')];
  for (const sub of ['agents', 'references']) {
    const subDir = join(dir, sub);
    if (!existsSync(subDir)) continue;
    for (const entry of readdirSync(subDir)) {
      if (statSync(join(subDir, entry)).isFile()) {
        files.push(join(subDir, entry));
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

// Documentation Discipline rule 3 (ad-philosophy) bans emoji in every shipped
// file. The references/ files added by the ADR-0056 rollout had no guard — and
// neither did SKILL.md or the agents/ briefs. installedFiles() already
// enumerates every shipped file in a skill (SKILL.md + agents/ + references/),
// so one check over it covers them all. The class targets pictographic emoji,
// regional-indicator flags, and the emoji variation selector; text-level
// dingbats are deliberately left out to avoid false positives on legitimate
// symbols.
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{FE0F}]/u;

for (const agent of ['claude-code', 'codex']) {
  for (const { name, dir } of listSkills(agent)) {
    test(`skill ${agent}/${name}: no emoji in any installed file (Documentation Discipline)`, () => {
      for (const filePath of installedFiles(dir)) {
        readFileSync(filePath, 'utf8')
          .split('\n')
          .forEach((line, index) => {
            assert.ok(
              !EMOJI.test(line),
              `${filePath.slice(REPO_ROOT.length + 1)}:${index + 1} contains an emoji — ` +
                'Documentation Discipline rule 3 bans emoji in shipped skill files'
            );
          });
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
// the scripts/ door. ADR-0057 Decision 3 permits one named exception: global
// rules resolution is host-divergent because each host's own path must win.
const HOST_DIVERGENT_SCRIPTS = new Set([
  'ad-rules/scripts/resolve-global-rules.mjs',
]);

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

test('skill scripts: matching sets, byte-identical except documented host divergence', () => {
  const claude = listSkillScripts('claude-code');
  const codex = listSkillScripts('codex');
  assert.deepEqual(
    [...claude.keys()].sort(),
    [...codex.keys()].sort(),
    'script sets must match across hosts'
  );
  for (const [rel, claudePath] of claude) {
    const same = readFileSync(claudePath).equals(readFileSync(codex.get(rel)));
    if (HOST_DIVERGENT_SCRIPTS.has(rel)) continue;
    assert.ok(same, `${rel}: claude-code and codex copies must be byte-identical`);
  }
});

test('ad-rules global resolution is the sole documented host-divergent script', () => {
  const claude = listSkillScripts('claude-code');
  const codex = listSkillScripts('codex');
  for (const rel of HOST_DIVERGENT_SCRIPTS) {
    assert.ok(claude.has(rel), `Claude Code must ship ${rel}`);
    assert.ok(codex.has(rel), `Codex must ship ${rel}`);
    assert.ok(
      !readFileSync(claude.get(rel)).equals(readFileSync(codex.get(rel))),
      `${rel} must keep its intentional host-specific priority order`
    );
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

// --- No skill link may climb above the skills root ---

// Skill sources live at `src/skills/<agent>/<skill>/...` but ship into a target
// repo at `.claude/skills/<skill>/...`, so a relative link is only portable if
// it stays inside the skills root. Two ad-audit files linked ADR-0052 with a
// path authored against THIS repo's layout (`../../../../doc/adr/...`) — correct
// here, and pointing outside the target repo entirely once installed. Nothing
// read the link from the installed side, so it shipped. Sibling-skill links
// (`../ad-ground/SKILL.md`) climb one level and survive; anything reaching the
// kit's own `doc/` does not, and belongs in prose as a bare `ADR-NNNN`, which is
// what the Codex twins of both files already did.
//
// The bound is deliberately the skills root, not each file's exact installed
// depth: agent briefs flatten to `.claude/agents/<name>.md` on install, so for
// them this rule is looser than reality. It still catches the whole class.

function skillFilesWithText(dir, prefix = '') {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = prefix ? `${prefix}/${entry}` : entry;
    if (statSync(full).isDirectory()) {
      out.push(...skillFilesWithText(full, rel));
    } else if (/\.(md|toml)$/.test(entry)) {
      out.push({ rel, text: readFileSync(full, 'utf8') });
    }
  }
  return out;
}

test('no skill link escapes the skills root, so it survives installation', () => {
  const escaping = [];
  for (const agent of ['claude-code', 'codex']) {
    for (const { name, dir } of listSkills(agent)) {
      for (const { rel, text } of skillFilesWithText(dir)) {
        // Directories the file sits inside, counted from the skills root:
        // `SKILL.md` → 1 (the skill dir), `agents/brief.md` → 2.
        const depth = rel.split('/').length;
        text.split('\n').forEach((line, index) => {
          for (const link of line.matchAll(/\]\((\.\.\/[^)\s]*)\)/g)) {
            const ups = link[1].split('/').filter((seg) => seg === '..').length;
            if (ups > depth) {
              escaping.push(
                `${agent}/${name}/${rel}:${index + 1} links ${link[1]} ` +
                  `(${ups} levels up from depth ${depth})`
              );
            }
          }
        });
      }
    }
  }

  assert.deepEqual(
    escaping,
    [],
    `skill links climb above the skills root and break once installed:\n  ${escaping.join('\n  ')}`
  );
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

test('the ADR projection states the number of ACCEPTED records the directory holds', () => {
  const adrDir = join(REPO_ROOT, 'doc', 'adr');
  const projection = join(adrDir, 'PROJECTION.md');
  if (!existsSync(projection)) return; // the projection is permitted, not required

  // Count only ACCEPTED ADRs, not every file. The projection projects what
  // BINDS (ADR-0049), and its own maintenance rule is "a decision that changes
  // what binds updates the projection in the same commit". A `proposed` ADR
  // binds nothing yet — it changes what binds only when it is accepted — so it
  // is out of the projection's count until then. Counting raw files instead
  // made every `proposed`-ADR commit (the normal `/ad-adr` flow) trip this
  // test against its own stated principle.
  const accepted = readdirSync(adrDir)
    .filter((f) => /^\d{4}-.*\.md$/.test(f))
    .filter((f) => /^\*\*Status:\*\*\s*accepted\b/im.test(readFileSync(join(adrDir, f), 'utf8')))
    .length;
  const claimed = readFileSync(projection, 'utf8').match(/All (\d+) accepted ADRs/);
  assert.ok(claimed, 'PROJECTION.md no longer states an accepted total in the form "All N accepted ADRs"');
  assert.equal(
    Number(claimed[1]),
    accepted,
    `PROJECTION.md claims ${claimed[1]} accepted ADRs; doc/adr/ holds ${accepted}. ` +
      'Accepting or superseding an ADR changes what binds — update the projection in the same commit. ' +
      'Merely proposing one does not.'
  );
});
