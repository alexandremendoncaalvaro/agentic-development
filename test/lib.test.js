import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectAgents, detectMode } from '../src/lib/detect.js';
import { installSkills } from '../src/lib/install.js';

function mkScratch() {
  return mkdtempSync(join(tmpdir(), 'agentic-test-'));
}

test('detectMode: empty directory → greenfield', () => {
  const dir = mkScratch();
  try {
    assert.equal(detectMode(dir), 'greenfield');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('detectMode: only trivial files → greenfield', () => {
  const dir = mkScratch();
  try {
    writeFileSync(join(dir, '.gitignore'), 'node_modules\n');
    writeFileSync(join(dir, 'README.md'), '# x\n');
    writeFileSync(join(dir, 'LICENSE'), 'MIT\n');
    assert.equal(detectMode(dir), 'greenfield');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('detectMode: meaningful file present → brownfield', () => {
  const dir = mkScratch();
  try {
    writeFileSync(join(dir, 'package.json'), '{"name":"x"}\n');
    assert.equal(detectMode(dir), 'brownfield');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('detectMode: AGENTS.md present → audit', () => {
  const dir = mkScratch();
  try {
    writeFileSync(join(dir, 'AGENTS.md'), '# AGENTS.md\n');
    writeFileSync(join(dir, 'package.json'), '{}\n');
    assert.equal(detectMode(dir), 'audit');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('detectAgents: empty → []', () => {
  const dir = mkScratch();
  try {
    assert.deepEqual(detectAgents(dir), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('detectAgents: .claude/ present → ["claude-code"]', () => {
  const dir = mkScratch();
  try {
    mkdirSync(join(dir, '.claude'));
    assert.deepEqual(detectAgents(dir), ['claude-code']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('detectAgents: .claude/ + .agents/ → ["claude-code","codex"] (deterministic order)', () => {
  const dir = mkScratch();
  try {
    mkdirSync(join(dir, '.agents'));
    mkdirSync(join(dir, '.claude'));
    assert.deepEqual(detectAgents(dir), ['claude-code', 'codex']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('installSkills: claude-code agentic-bootstrap → file at .claude/skills/...', async () => {
  const dir = mkScratch();
  try {
    const { actions } = await installSkills({
      cwd: dir,
      agents: ['claude-code'],
      skills: ['agentic-bootstrap'],
    });
    assert.equal(actions.length, 1);
    assert.equal(actions[0].type, 'created');
    assert.equal(actions[0].path, '.claude/skills/agentic-bootstrap/SKILL.md');
    assert.ok(existsSync(join(dir, '.claude/skills/agentic-bootstrap/SKILL.md')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('installSkills: codex agentic-bootstrap → SKILL.md + agents/openai.yaml', async () => {
  const dir = mkScratch();
  try {
    const { actions } = await installSkills({
      cwd: dir,
      agents: ['codex'],
      skills: ['agentic-bootstrap'],
    });
    const paths = actions.map((a) => a.path).sort();
    assert.deepEqual(paths, [
      '.agents/skills/agentic-bootstrap/SKILL.md',
      '.agents/skills/agentic-bootstrap/agents/openai.yaml',
    ]);
    for (const action of actions) assert.equal(action.type, 'created');
    assert.ok(existsSync(join(dir, '.agents/skills/agentic-bootstrap/agents/openai.yaml')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('installSkills: idempotent re-run → unchanged for every file', async () => {
  const dir = mkScratch();
  try {
    await installSkills({
      cwd: dir,
      agents: ['claude-code'],
      skills: ['agentic-bootstrap'],
    });
    const { actions } = await installSkills({
      cwd: dir,
      agents: ['claude-code'],
      skills: ['agentic-bootstrap'],
    });
    for (const action of actions) assert.equal(action.type, 'unchanged');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('installSkills: divergent target + confirmReplace=false → skipped, file untouched', async () => {
  const dir = mkScratch();
  try {
    const target = join(dir, '.claude/skills/agentic-bootstrap/SKILL.md');
    mkdirSync(join(dir, '.claude/skills/agentic-bootstrap'), { recursive: true });
    writeFileSync(target, 'CUSTOM CONTENT\n');

    const { actions } = await installSkills({
      cwd: dir,
      agents: ['claude-code'],
      skills: ['agentic-bootstrap'],
    });

    assert.equal(actions[0].type, 'skipped');
    assert.equal(readFileSync(target, 'utf8'), 'CUSTOM CONTENT\n');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('installSkills: divergent target + confirmReplace=true → replaced', async () => {
  const dir = mkScratch();
  try {
    const target = join(dir, '.claude/skills/agentic-bootstrap/SKILL.md');
    mkdirSync(join(dir, '.claude/skills/agentic-bootstrap'), { recursive: true });
    writeFileSync(target, 'CUSTOM CONTENT\n');

    const { actions } = await installSkills({
      cwd: dir,
      agents: ['claude-code'],
      skills: ['agentic-bootstrap'],
      confirmReplace: async () => true,
    });

    assert.equal(actions[0].type, 'replaced');
    assert.notEqual(readFileSync(target, 'utf8'), 'CUSTOM CONTENT\n');
    assert.match(readFileSync(target, 'utf8'), /agentic-bootstrap/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('installSkills: unknown agent throws', async () => {
  const dir = mkScratch();
  try {
    await assert.rejects(
      () =>
        installSkills({
          cwd: dir,
          agents: ['gemini'],
          skills: ['agentic-bootstrap'],
        }),
      /unknown agent/
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('installSkills: claude-code agentic-review → SKILL.md + subagent at .claude/agents/, no manifest.json copied', async () => {
  const dir = mkScratch();
  try {
    const { actions } = await installSkills({
      cwd: dir,
      agents: ['claude-code'],
      skills: ['agentic-review'],
    });
    const paths = actions.map((a) => a.path).sort();
    assert.deepEqual(paths, [
      '.claude/agents/fresh-context-reviewer.md',
      '.claude/skills/agentic-review/SKILL.md',
    ]);
    assert.ok(existsSync(join(dir, '.claude/agents/fresh-context-reviewer.md')));
    assert.ok(existsSync(join(dir, '.claude/skills/agentic-review/SKILL.md')));
    assert.ok(
      !existsSync(join(dir, '.claude/skills/agentic-review/manifest.json')),
      'manifest.json must never be installed'
    );
    assert.ok(
      !existsSync(join(dir, '.claude/skills/agentic-review/agents')),
      'subagent must not duplicate inside the skill dir'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('installSkills: codex agentic-review → SKILL.md + openai.yaml, no subagent (Codex has no agentsDir)', async () => {
  const dir = mkScratch();
  try {
    const { actions } = await installSkills({
      cwd: dir,
      agents: ['codex'],
      skills: ['agentic-review'],
    });
    const paths = actions.map((a) => a.path).sort();
    assert.deepEqual(paths, [
      '.agents/skills/agentic-review/SKILL.md',
      '.agents/skills/agentic-review/agents/openai.yaml',
    ]);
    assert.ok(!existsSync(join(dir, '.claude')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('installSkills: missing skill source throws', async () => {
  const dir = mkScratch();
  try {
    await assert.rejects(
      () =>
        installSkills({
          cwd: dir,
          agents: ['claude-code'],
          skills: ['does-not-exist'],
        }),
      /skill "does-not-exist" not found/
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
