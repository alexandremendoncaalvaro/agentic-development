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
