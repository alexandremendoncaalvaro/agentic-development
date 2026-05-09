import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
  existsSync,
  mkdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installSkills, removeOrphanSkills } from '../src/lib/install.js';
import { loadState, saveState, emptyState, statePath, STATE_DIRS } from '../src/lib/state.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BIN = join(__dirname, '..', 'bin', 'agentic.js');

function mkScratch() {
  return mkdtempSync(join(tmpdir(), 'agentic-update-test-'));
}

function runInit(cwd, args = []) {
  return execFileSync('node', [BIN, 'init', ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function runUpdate(cwd, args = []) {
  return execFileSync('node', [BIN, 'update', ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

test('init writes state.json for claude-code', () => {
  const dir = mkScratch();
  try {
    runInit(dir, ['--agent', 'claude-code']);
    const state = loadState(dir, 'claude-code');
    assert.ok(state, 'state file must exist after init');
    assert.equal(state.agent, 'claude-code');
    assert.ok(state.skills['agentic-bootstrap']);
    assert.ok(
      state.skills['agentic-bootstrap'].files.some((f) =>
        f.path.endsWith('agentic-bootstrap/SKILL.md')
      )
    );
    assert.ok(state.skills['agentic-bootstrap'].files[0].sourceSha.match(/^[a-f0-9]{64}$/));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init writes per-agent state for codex too', () => {
  const dir = mkScratch();
  try {
    writeFileSync(join(dir, 'package.json'), '{"name":"x"}\n');
    runInit(dir, ['--agent', 'both']);
    assert.ok(loadState(dir, 'claude-code'));
    assert.ok(loadState(dir, 'codex'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('installSkills: state-aware re-run on identical files → unchanged actions, state preserved', async () => {
  const dir = mkScratch();
  try {
    const first = await installSkills({
      cwd: dir,
      agents: ['claude-code'],
      skills: ['agentic-bootstrap'],
      kitVersion: '0.3.0-test',
    });
    saveState(dir, 'claude-code', first.nextStates['claude-code']);

    const second = await installSkills({
      cwd: dir,
      agents: ['claude-code'],
      skills: ['agentic-bootstrap'],
      previousStates: { 'claude-code': loadState(dir, 'claude-code') },
      kitVersion: '0.3.0-test',
    });
    for (const a of second.actions) {
      assert.equal(a.type, 'unchanged', `expected unchanged, got ${a.type} on ${a.path}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('installSkills: kit changed + user untouched → kit-changed-update silent', async () => {
  const dir = mkScratch();
  try {
    // Install once so the directory tree exists.
    await installSkills({
      cwd: dir,
      agents: ['claude-code'],
      skills: ['agentic-bootstrap'],
    });

    // Simulate the "previous kit version's content" by overwriting the target with
    // an older body, and computing the SHA of that older body for the state file.
    // This is the real shape of "kit changed since last install": target reflects
    // the OLD source (user untouched), current kit source differs.
    const target = join(dir, '.claude/skills/agentic-bootstrap/SKILL.md');
    const oldBody = '# old SKILL.md from a previous kit version\n';
    writeFileSync(target, oldBody);
    const { createHash } = await import('node:crypto');
    const oldSha = createHash('sha256').update(oldBody).digest('hex');

    const state = emptyState('claude-code', '0.2.0');
    state.skills['agentic-bootstrap'] = {
      version: '0.2.0',
      files: [
        {
          path: '.claude/skills/agentic-bootstrap/SKILL.md',
          sourceSha: oldSha,
        },
      ],
    };

    const result = await installSkills({
      cwd: dir,
      agents: ['claude-code'],
      skills: ['agentic-bootstrap'],
      previousStates: { 'claude-code': state },
      kitVersion: '0.3.0',
    });
    const skillAction = result.actions.find((a) =>
      a.path.endsWith('agentic-bootstrap/SKILL.md')
    );
    assert.equal(skillAction.type, 'updated');
    assert.notEqual(
      readFileSync(target, 'utf8'),
      oldBody,
      'file must be silently updated to current kit source'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('installSkills: kit unchanged + user edited → kept (silent, preserves user content)', async () => {
  const dir = mkScratch();
  try {
    const first = await installSkills({
      cwd: dir,
      agents: ['claude-code'],
      skills: ['agentic-bootstrap'],
      kitVersion: '0.3.0-test',
    });
    saveState(dir, 'claude-code', first.nextStates['claude-code']);

    // User edits the file.
    const target = join(dir, '.claude/skills/agentic-bootstrap/SKILL.md');
    writeFileSync(target, 'USER LOCAL CHANGES\n');

    const result = await installSkills({
      cwd: dir,
      agents: ['claude-code'],
      skills: ['agentic-bootstrap'],
      previousStates: { 'claude-code': loadState(dir, 'claude-code') },
      kitVersion: '0.3.0-test',
    });
    const skillAction = result.actions.find((a) =>
      a.path.endsWith('agentic-bootstrap/SKILL.md')
    );
    assert.equal(skillAction.type, 'kept');
    assert.equal(readFileSync(target, 'utf8'), 'USER LOCAL CHANGES\n');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('installSkills: kit changed + user changed + force=false → conflict-prompt → confirmReplace=false → skipped', async () => {
  const dir = mkScratch();
  try {
    await installSkills({
      cwd: dir,
      agents: ['claude-code'],
      skills: ['agentic-bootstrap'],
    });
    const state = emptyState('claude-code', '0.2.0');
    state.skills['agentic-bootstrap'] = {
      version: '0.2.0',
      files: [
        {
          path: '.claude/skills/agentic-bootstrap/SKILL.md',
          sourceSha: 'stale-sha-different-from-current-source-and-current-target-content',
        },
      ],
    };
    const target = join(dir, '.claude/skills/agentic-bootstrap/SKILL.md');
    writeFileSync(target, 'USER LOCAL CHANGES\n');

    const result = await installSkills({
      cwd: dir,
      agents: ['claude-code'],
      skills: ['agentic-bootstrap'],
      previousStates: { 'claude-code': state },
      kitVersion: '0.3.0',
      confirmReplace: async () => false,
    });
    const skillAction = result.actions.find((a) =>
      a.path.endsWith('agentic-bootstrap/SKILL.md')
    );
    assert.equal(skillAction.type, 'skipped');
    assert.equal(readFileSync(target, 'utf8'), 'USER LOCAL CHANGES\n');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('installSkills: kit changed + user changed + force=true → replaced', async () => {
  const dir = mkScratch();
  try {
    await installSkills({
      cwd: dir,
      agents: ['claude-code'],
      skills: ['agentic-bootstrap'],
    });
    const state = emptyState('claude-code', '0.2.0');
    state.skills['agentic-bootstrap'] = {
      version: '0.2.0',
      files: [
        {
          path: '.claude/skills/agentic-bootstrap/SKILL.md',
          sourceSha: 'stale-sha-different-from-current-source-and-current-target-content',
        },
      ],
    };
    const target = join(dir, '.claude/skills/agentic-bootstrap/SKILL.md');
    writeFileSync(target, 'USER LOCAL CHANGES\n');

    const result = await installSkills({
      cwd: dir,
      agents: ['claude-code'],
      skills: ['agentic-bootstrap'],
      previousStates: { 'claude-code': state },
      kitVersion: '0.3.0',
      force: true,
    });
    const skillAction = result.actions.find((a) =>
      a.path.endsWith('agentic-bootstrap/SKILL.md')
    );
    assert.equal(skillAction.type, 'replaced');
    assert.notEqual(readFileSync(target, 'utf8'), 'USER LOCAL CHANGES\n');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('installSkills: dry-run writes nothing, returns plan', async () => {
  const dir = mkScratch();
  try {
    const result = await installSkills({
      cwd: dir,
      agents: ['claude-code'],
      skills: ['agentic-bootstrap'],
      kitVersion: '0.3.0-test',
      dryRun: true,
    });
    const skillAction = result.actions.find((a) =>
      a.path.endsWith('agentic-bootstrap/SKILL.md')
    );
    assert.equal(skillAction.type, 'created');
    assert.ok(
      !existsSync(join(dir, '.claude/skills/agentic-bootstrap/SKILL.md')),
      'dry-run must not write files'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('removeOrphanSkills: previous skill no longer in opted set → prompt → confirmRemove=false → orphan-kept', async () => {
  const dir = mkScratch();
  try {
    await installSkills({
      cwd: dir,
      agents: ['claude-code'],
      skills: ['agentic-bootstrap'],
    });
    const state = emptyState('claude-code', '0.3.0');
    state.skills['agentic-bootstrap'] = {
      version: '0.3.0',
      files: [{ path: '.claude/skills/agentic-bootstrap/SKILL.md', sourceSha: 'sha' }],
    };

    const result = await removeOrphanSkills({
      cwd: dir,
      agent: 'claude-code',
      previousState: state,
      currentSkills: ['agentic-philosophy'],
      confirmRemove: async () => false,
    });
    assert.equal(result.removedSkills.length, 0);
    assert.ok(
      existsSync(join(dir, '.claude/skills/agentic-bootstrap/SKILL.md')),
      'file must remain when keep'
    );
    assert.equal(result.actions[0].type, 'orphan-kept');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('removeOrphanSkills: confirmRemove=true → file deleted, action removed', async () => {
  const dir = mkScratch();
  try {
    await installSkills({
      cwd: dir,
      agents: ['claude-code'],
      skills: ['agentic-bootstrap'],
    });
    const state = emptyState('claude-code', '0.3.0');
    state.skills['agentic-bootstrap'] = {
      version: '0.3.0',
      files: [{ path: '.claude/skills/agentic-bootstrap/SKILL.md', sourceSha: 'sha' }],
    };

    const result = await removeOrphanSkills({
      cwd: dir,
      agent: 'claude-code',
      previousState: state,
      currentSkills: ['agentic-philosophy'],
      confirmRemove: async () => true,
    });
    assert.deepEqual(result.removedSkills, ['agentic-bootstrap']);
    assert.ok(
      !existsSync(join(dir, '.claude/skills/agentic-bootstrap/SKILL.md')),
      'file must be deleted'
    );
    assert.equal(result.actions[0].type, 'removed');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('update --yes --dry-run on a fresh init → no changes, no writes beyond state already present', () => {
  const dir = mkScratch();
  try {
    runInit(dir, ['--agent', 'claude-code']);
    const before = readFileSync(statePath(dir, 'claude-code'), 'utf8');
    runUpdate(dir, ['--agent', 'claude-code', '--yes', '--dry-run']);
    const after = readFileSync(statePath(dir, 'claude-code'), 'utf8');
    assert.equal(before, after, 'state file must be unchanged on dry-run');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('update --yes after a kit-changed file → silent update, file replaced', () => {
  const dir = mkScratch();
  try {
    runInit(dir, ['--agent', 'claude-code']);

    // Forge a stale state SHA so the next update sees "kit changed".
    const state = loadState(dir, 'claude-code');
    const skillEntry = state.skills['agentic-bootstrap'];
    skillEntry.files = skillEntry.files.map((f) =>
      f.path.endsWith('SKILL.md')
        ? { ...f, sourceSha: 'stale-sha-from-old-kit' }
        : f
    );
    saveState(dir, 'claude-code', state);

    const target = join(dir, '.claude/skills/agentic-bootstrap/SKILL.md');
    const before = readFileSync(target, 'utf8');
    // file content matches current source (since runInit just installed it).
    // This is "kit changed since recorded SHA, user untouched" → silent update.
    runUpdate(dir, ['--agent', 'claude-code', '--yes']);
    const after = readFileSync(target, 'utf8');
    assert.equal(before, after, 'file content stays current source');
    const newState = loadState(dir, 'claude-code');
    assert.notEqual(
      newState.skills['agentic-bootstrap'].files.find((f) => f.path.endsWith('SKILL.md'))
        .sourceSha,
      'stale-sha-from-old-kit',
      'state must be refreshed with current SHA'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('update --help works', () => {
  execFileSync('node', [BIN, 'update', '--help'], { encoding: 'utf8' });
});

test('update on legacy install (no state) → falls through to byte-compare, then writes state', () => {
  const dir = mkScratch();
  try {
    // Simulate a v0.2 install (no state file) by installing then deleting the state.
    runInit(dir, ['--agent', 'claude-code']);
    rmSync(statePath(dir, 'claude-code'));
    assert.equal(loadState(dir, 'claude-code'), null);

    runUpdate(dir, ['--agent', 'claude-code', '--yes']);
    const after = loadState(dir, 'claude-code');
    assert.ok(after, 'state must be written after first update on legacy install');
    assert.ok(after.skills['agentic-bootstrap']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
