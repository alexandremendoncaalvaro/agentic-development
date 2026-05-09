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
import { detectAgents, detectFeatures, detectMode } from '../src/lib/detect.js';
import { installSkills } from '../src/lib/install.js';
import { updateRootDoc } from '../src/lib/rootdoc.js';

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

test('detectFeatures: empty dir → all flags false', () => {
  const dir = mkScratch();
  try {
    assert.deepEqual(detectFeatures(dir), {
      frontend: false,
      hasClaudeCode: false,
      hasCodex: false,
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('detectFeatures: package.json with React dep → frontend true', () => {
  const dir = mkScratch();
  try {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'x', dependencies: { react: '^18' } })
    );
    assert.equal(detectFeatures(dir).frontend, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('detectFeatures: tailwind.config.ts → frontend true (no manifest needed)', () => {
  const dir = mkScratch();
  try {
    writeFileSync(join(dir, 'tailwind.config.ts'), 'export default {}\n');
    assert.equal(detectFeatures(dir).frontend, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('detectFeatures: tokens.json → frontend true', () => {
  const dir = mkScratch();
  try {
    writeFileSync(join(dir, 'tokens.json'), '{}\n');
    assert.equal(detectFeatures(dir).frontend, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('detectFeatures: nested *.tsx within depth limit → frontend true', () => {
  const dir = mkScratch();
  try {
    mkdirSync(join(dir, 'src', 'components'), { recursive: true });
    writeFileSync(join(dir, 'src', 'components', 'Foo.tsx'), 'export const Foo = () => null;\n');
    assert.equal(detectFeatures(dir).frontend, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('detectFeatures: *.tsx inside node_modules ignored → frontend false', () => {
  const dir = mkScratch();
  try {
    mkdirSync(join(dir, 'node_modules', 'lib'), { recursive: true });
    writeFileSync(
      join(dir, 'node_modules', 'lib', 'Foo.tsx'),
      'export const Foo = () => null;\n'
    );
    writeFileSync(join(dir, 'package.json'), '{"name":"x"}\n');
    assert.equal(detectFeatures(dir).frontend, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('detectFeatures: backend Node project (no React, no jsx) → frontend false', () => {
  const dir = mkScratch();
  try {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'api', dependencies: { express: '^4' } })
    );
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, 'src', 'server.js'), 'console.log("hi");\n');
    assert.equal(detectFeatures(dir).frontend, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('detectFeatures: .claude/ → hasClaudeCode true, hasCodex false', () => {
  const dir = mkScratch();
  try {
    mkdirSync(join(dir, '.claude'));
    const f = detectFeatures(dir);
    assert.equal(f.hasClaudeCode, true);
    assert.equal(f.hasCodex, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('detectFeatures: .agents/ or .openai/ → hasCodex true', () => {
  const dir1 = mkScratch();
  const dir2 = mkScratch();
  try {
    mkdirSync(join(dir1, '.agents'));
    assert.equal(detectFeatures(dir1).hasCodex, true);
    mkdirSync(join(dir2, '.openai'));
    assert.equal(detectFeatures(dir2).hasCodex, true);
  } finally {
    rmSync(dir1, { recursive: true, force: true });
    rmSync(dir2, { recursive: true, force: true });
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

test('updateRootDoc: no AGENTS.md or CLAUDE.md → action absent, nothing written', async () => {
  const dir = mkScratch();
  try {
    const action = await updateRootDoc({ cwd: dir, skills: ['agentic-bootstrap'] });
    assert.equal(action.type, 'absent');
    assert.equal(action.path, null);
    assert.ok(!existsSync(join(dir, 'AGENTS.md')));
    assert.ok(!existsSync(join(dir, 'CLAUDE.md')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('updateRootDoc: existing AGENTS.md, no managed section, confirm true → appended; user content preserved', async () => {
  const dir = mkScratch();
  try {
    const original = '# AGENTS.md\n\nMy guide.\n';
    writeFileSync(join(dir, 'AGENTS.md'), original);
    const action = await updateRootDoc({
      cwd: dir,
      skills: ['agentic-bootstrap', 'agentic-philosophy'],
      confirmAppend: async () => true,
    });
    assert.equal(action.type, 'appended');
    assert.equal(action.path, 'AGENTS.md');
    const updated = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
    assert.ok(updated.startsWith(original), 'user content must be preserved at the start');
    assert.match(updated, /<!-- agentic-managed-skills:start -->/);
    assert.match(updated, /<!-- agentic-managed-skills:end -->/);
    assert.match(updated, /agentic-bootstrap/);
    assert.match(updated, /agentic-philosophy/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('updateRootDoc: confirm false → skipped, file untouched', async () => {
  const dir = mkScratch();
  try {
    const original = '# AGENTS.md\n\nMy guide.\n';
    writeFileSync(join(dir, 'AGENTS.md'), original);
    const action = await updateRootDoc({
      cwd: dir,
      skills: ['agentic-bootstrap'],
      confirmAppend: async () => false,
    });
    assert.equal(action.type, 'skipped');
    assert.equal(action.path, 'AGENTS.md');
    assert.equal(readFileSync(join(dir, 'AGENTS.md'), 'utf8'), original);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('updateRootDoc: existing managed section + same skills → unchanged', async () => {
  const dir = mkScratch();
  try {
    writeFileSync(join(dir, 'AGENTS.md'), '# AGENTS.md\n');
    await updateRootDoc({
      cwd: dir,
      skills: ['agentic-bootstrap'],
      confirmAppend: async () => true,
    });
    const before = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
    const action = await updateRootDoc({
      cwd: dir,
      skills: ['agentic-bootstrap'],
      confirmAppend: async () => true,
    });
    assert.equal(action.type, 'unchanged');
    assert.equal(readFileSync(join(dir, 'AGENTS.md'), 'utf8'), before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('updateRootDoc: existing managed section + different skill set → updated, user content preserved', async () => {
  const dir = mkScratch();
  try {
    const userContent = '# AGENTS.md\n\nUser notes here.\n';
    writeFileSync(join(dir, 'AGENTS.md'), userContent);
    await updateRootDoc({
      cwd: dir,
      skills: ['agentic-bootstrap'],
      confirmAppend: async () => true,
    });
    const action = await updateRootDoc({
      cwd: dir,
      skills: ['agentic-bootstrap', 'agentic-architecture'],
      confirmAppend: async () => true,
    });
    assert.equal(action.type, 'updated');
    const updated = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
    assert.ok(updated.startsWith(userContent), 'user content must be preserved');
    assert.match(updated, /agentic-architecture/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('updateRootDoc: only CLAUDE.md present → falls back to CLAUDE.md', async () => {
  const dir = mkScratch();
  try {
    writeFileSync(join(dir, 'CLAUDE.md'), '# CLAUDE.md\n');
    const action = await updateRootDoc({
      cwd: dir,
      skills: ['agentic-bootstrap'],
      confirmAppend: async () => true,
    });
    assert.equal(action.type, 'appended');
    assert.equal(action.path, 'CLAUDE.md');
    assert.match(readFileSync(join(dir, 'CLAUDE.md'), 'utf8'), /agentic-bootstrap/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('updateRootDoc: AGENTS.md preferred when both AGENTS.md and CLAUDE.md exist', async () => {
  const dir = mkScratch();
  try {
    writeFileSync(join(dir, 'AGENTS.md'), '# AGENTS.md\n');
    writeFileSync(join(dir, 'CLAUDE.md'), '# CLAUDE.md\n');
    const action = await updateRootDoc({
      cwd: dir,
      skills: ['agentic-bootstrap'],
      confirmAppend: async () => true,
    });
    assert.equal(action.path, 'AGENTS.md');
    assert.match(readFileSync(join(dir, 'AGENTS.md'), 'utf8'), /agentic-bootstrap/);
    assert.equal(readFileSync(join(dir, 'CLAUDE.md'), 'utf8'), '# CLAUDE.md\n');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('updateRootDoc: confirmAppend defaults to false (non-interactive safe)', async () => {
  const dir = mkScratch();
  try {
    writeFileSync(join(dir, 'AGENTS.md'), '# AGENTS.md\n');
    const action = await updateRootDoc({ cwd: dir, skills: ['agentic-bootstrap'] });
    assert.equal(action.type, 'skipped');
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
