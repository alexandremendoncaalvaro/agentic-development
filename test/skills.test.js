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
