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
      test(`skill ${agent}/${name}: manifest subagent ${subagentRel} frontmatter parses with required fields`, () => {
        const fm = parseFrontmatter(join(dir, subagentRel));
        assert.equal(typeof fm.name, 'string', 'subagent name must be a string');
        assert.equal(typeof fm.description, 'string', 'subagent description must be a string');
        assert.ok(fm.description.length > 0, 'subagent description must not be empty');
        assert.equal(typeof fm.tools, 'string', 'subagent tools must be a string (comma-separated)');
        assert.equal(typeof fm.model, 'string', 'subagent model must be a string');
      });
    }
  }
}
