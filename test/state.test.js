import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
  existsSync,
  mkdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  SCHEMA_VERSION,
  STATE_FILE,
  STATE_DIRS,
  emptyState,
  loadState,
  saveState,
  statePath,
} from '../src/lib/state.js';

function mkScratch() {
  return mkdtempSync(join(tmpdir(), 'agentic-state-test-'));
}

test('statePath: claude-code → .claude/agentic-state.json', () => {
  const dir = '/tmp/x';
  assert.equal(statePath(dir, 'claude-code'), join(dir, '.claude', STATE_FILE));
});

test('statePath: codex → .agents/agentic-state.json', () => {
  const dir = '/tmp/x';
  assert.equal(statePath(dir, 'codex'), join(dir, '.agents', STATE_FILE));
});

test('statePath: unknown agent throws', () => {
  assert.throws(() => statePath('/tmp/x', 'gemini'), /unknown agent/);
});

test('loadState: missing file → null', () => {
  const dir = mkScratch();
  try {
    assert.equal(loadState(dir, 'claude-code'), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('loadState/saveState: round-trip preserves shape', () => {
  const dir = mkScratch();
  try {
    const state = emptyState('claude-code', '0.3.0-beta.1');
    state.skills['agentic-bootstrap'] = {
      version: '0.3.0-beta.1',
      files: [{ path: '.claude/skills/agentic-bootstrap/SKILL.md', sourceSha: 'abc' }],
    };
    saveState(dir, 'claude-code', state);
    assert.ok(existsSync(join(dir, STATE_DIRS['claude-code'], STATE_FILE)));
    const loaded = loadState(dir, 'claude-code');
    assert.equal(loaded.kitVersion, '0.3.0-beta.1');
    assert.equal(loaded.agent, 'claude-code');
    assert.equal(loaded.schemaVersion, SCHEMA_VERSION);
    assert.deepEqual(loaded.skills['agentic-bootstrap'], {
      version: '0.3.0-beta.1',
      files: [{ path: '.claude/skills/agentic-bootstrap/SKILL.md', sourceSha: 'abc' }],
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('loadState: schemaVersion in the future → throws with upgrade hint', () => {
  const dir = mkScratch();
  try {
    mkdirSync(join(dir, STATE_DIRS['claude-code']), { recursive: true });
    writeFileSync(
      statePath(dir, 'claude-code'),
      JSON.stringify({
        schemaVersion: SCHEMA_VERSION + 1,
        kitVersion: '99.0.0',
        agent: 'claude-code',
        skills: {},
      })
    );
    assert.throws(
      () => loadState(dir, 'claude-code'),
      /schemaVersion .*Upgrade the kit/
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('loadState: missing schemaVersion → throws', () => {
  const dir = mkScratch();
  try {
    mkdirSync(join(dir, STATE_DIRS['claude-code']), { recursive: true });
    writeFileSync(
      statePath(dir, 'claude-code'),
      JSON.stringify({ kitVersion: '0.3.0', agent: 'claude-code', skills: {} })
    );
    assert.throws(() => loadState(dir, 'claude-code'), /missing schemaVersion/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('loadState: agent mismatch → throws', () => {
  const dir = mkScratch();
  try {
    mkdirSync(join(dir, STATE_DIRS['claude-code']), { recursive: true });
    writeFileSync(
      statePath(dir, 'claude-code'),
      JSON.stringify({
        schemaVersion: SCHEMA_VERSION,
        kitVersion: '0.3.0',
        agent: 'codex',
        skills: {},
      })
    );
    assert.throws(() => loadState(dir, 'claude-code'), /declares agent "codex"/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('saveState: deterministic ordering of skills and files', () => {
  const dir = mkScratch();
  try {
    const state = emptyState('claude-code', '0.3.0');
    state.skills['z-late'] = {
      version: '0.3.0',
      files: [
        { path: 'b.md', sourceSha: 'b' },
        { path: 'a.md', sourceSha: 'a' },
      ],
    };
    state.skills['a-early'] = {
      version: '0.3.0',
      files: [{ path: 'c.md', sourceSha: 'c' }],
    };
    saveState(dir, 'claude-code', state);
    const text = readFileSync(statePath(dir, 'claude-code'), 'utf8');
    assert.ok(
      text.indexOf('a-early') < text.indexOf('z-late'),
      'skills must be sorted alphabetically'
    );
    // a.md should appear before b.md within z-late's files block
    const zlateBlock = text.slice(text.indexOf('z-late'));
    assert.ok(zlateBlock.indexOf('a.md') < zlateBlock.indexOf('b.md'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
