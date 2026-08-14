import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadState, statePath } from '../src/lib/state.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BIN = join(__dirname, '..', 'bin', 'agentic.js');

function mkScratch() {
  return mkdtempSync(join(tmpdir(), 'agentic-uninstall-test-'));
}

function runInit(cwd, args = []) {
  return execFileSync('node', [BIN, 'init', '--scope', 'project', ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function runUninstall(cwd, args = []) {
  return spawnSync('node', [BIN, 'uninstall', ...args], {
    cwd,
    encoding: 'utf8',
  });
}

test('uninstall --yes removes a pristine host install and its state', () => {
  const dir = mkScratch();
  try {
    runInit(dir, ['--agent', 'claude-code', '--yes']);

    const run = runUninstall(dir, ['--agent', 'claude-code', '--yes']);

    assert.equal(run.status, 0, `${run.stdout}${run.stderr}`);
    assert.equal(existsSync(join(dir, '.claude/skills/ad-bootstrap/SKILL.md')), false);
    assert.equal(existsSync(statePath(dir, 'claude-code')), false);
    assert.equal(
      existsSync(join(dir, 'WORKFLOW.md')),
      false,
      'project install must not create a root workflow document'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('uninstall --yes preserves an edited skill and retains state only for it', () => {
  const dir = mkScratch();
  try {
    runInit(dir, ['--agent', 'claude-code', '--yes']);
    const editedPath = join(dir, '.claude/skills/ad-bootstrap/SKILL.md');
    const edited = `${readFileSync(editedPath, 'utf8')}\nLocal change\n`;
    writeFileSync(editedPath, edited);

    const run = runUninstall(dir, ['--agent', 'claude-code', '--yes']);

    assert.equal(run.status, 0, `${run.stdout}${run.stderr}`);
    assert.equal(readFileSync(editedPath, 'utf8'), edited);
    assert.equal(existsSync(join(dir, '.claude/skills/ad-ground/SKILL.md')), false);
    const state = loadState(dir, 'claude-code');
    assert.deepEqual(Object.keys(state.skills), ['ad-bootstrap']);
    assert.match(`${run.stdout}${run.stderr}`, /! \[claude-code\].*ad-bootstrap/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('uninstall --yes --force removes an edited managed skill', () => {
  const dir = mkScratch();
  try {
    runInit(dir, ['--agent', 'claude-code', '--yes']);
    const editedPath = join(dir, '.claude/skills/ad-bootstrap/SKILL.md');
    writeFileSync(editedPath, 'Local change\n');

    const run = runUninstall(dir, ['--agent', 'claude-code', '--yes', '--force']);

    assert.equal(run.status, 0, `${run.stdout}${run.stderr}`);
    assert.equal(existsSync(editedPath), false);
    assert.equal(existsSync(statePath(dir, 'claude-code')), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('uninstall --dry-run previews removal without writing', () => {
  const dir = mkScratch();
  try {
    runInit(dir, ['--agent', 'claude-code', '--yes']);
    const stateBefore = readFileSync(statePath(dir, 'claude-code'), 'utf8');

    const run = runUninstall(dir, ['--agent', 'claude-code', '--yes', '--dry-run']);

    assert.equal(run.status, 0, `${run.stdout}${run.stderr}`);
    assert.equal(existsSync(join(dir, '.claude/skills/ad-bootstrap/SKILL.md')), true);
    assert.equal(readFileSync(statePath(dir, 'claude-code'), 'utf8'), stateBefore);
    assert.match(`${run.stdout}${run.stderr}`, /- \[claude-code\].*ad-bootstrap/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
