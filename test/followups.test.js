import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installSkills, removeOrphanSkills } from '../src/lib/install.js';
import { emptyState, saveState } from '../src/lib/state.js';
import { updateRootDoc } from '../src/lib/rootdoc.js';

function mkScratch() {
  return mkdtempSync(join(tmpdir(), 'agentic-followups-test-'));
}

// C3 — removeOrphanSkills must surface "state recorded a file that is gone
// on disk" as a distinct action so the user sees the state-vs-reality
// mismatch instead of a silent "removed" line.
test('removeOrphanSkills: file recorded in state but missing on disk → removed-missing action', async () => {
  const dir = mkScratch();
  try {
    // Forge a state that claims a skill was installed at a path that does
    // not exist on disk.
    const state = emptyState('claude-code', '0.9.4-test');
    state.skills['agentic-bootstrap'] = {
      version: '0.9.4-test',
      files: [
        { path: '.claude/skills/agentic-bootstrap/SKILL.md', sourceSha: 'aaa' },
      ],
    };

    const result = await removeOrphanSkills({
      cwd: dir,
      agent: 'claude-code',
      previousState: state,
      currentSkills: [], // every recorded skill is now an orphan
      confirmRemove: async () => true,
    });

    assert.equal(result.removedSkills.length, 1);
    const action = result.actions.find((a) =>
      a.path.endsWith('agentic-bootstrap/SKILL.md')
    );
    assert.equal(
      action.type,
      'removed-missing',
      'state-vs-reality mismatch must surface as removed-missing, not silent removed'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// C4 — updateRootDoc with dryRun=true must compute the action without
// writing anything. Was a gap in v0.5..v0.9.3 — update.js short-circuited
// rootDocAction to "absent" on --dry-run, so the dry-run summary never
// showed AGENTS.md / CLAUDE.md changes.
test('updateRootDoc: dryRun=true returns the would-be action without writing', async () => {
  const dir = mkScratch();
  try {
    const original = '# AGENTS.md\n\nProject docs.\n';
    writeFileSync(join(dir, 'AGENTS.md'), original);
    const before = readFileSync(join(dir, 'AGENTS.md'), 'utf8');

    const action = await updateRootDoc({
      cwd: dir,
      skills: ['agentic-bootstrap', 'agentic-philosophy'],
      confirmAppend: async () => true,
      dryRun: true,
    });

    assert.equal(action.type, 'appended');
    assert.equal(action.path, 'AGENTS.md');
    assert.equal(
      readFileSync(join(dir, 'AGENTS.md'), 'utf8'),
      before,
      'dryRun must not modify the file'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('updateRootDoc: dryRun=true reports `updated` for stale section without writing', async () => {
  const dir = mkScratch();
  try {
    // Bootstrap a managed section first.
    writeFileSync(join(dir, 'AGENTS.md'), '# AGENTS.md\n');
    await updateRootDoc({
      cwd: dir,
      skills: ['agentic-bootstrap'],
      confirmAppend: async () => true,
    });
    const afterFirst = readFileSync(join(dir, 'AGENTS.md'), 'utf8');

    // Re-run dry-run with a different skill set. Should report `updated`
    // but leave the file untouched.
    const action = await updateRootDoc({
      cwd: dir,
      skills: ['agentic-bootstrap', 'agentic-architecture'],
      confirmReplace: async () => true,
      dryRun: true,
    });
    assert.equal(action.type, 'updated');
    assert.equal(
      readFileSync(join(dir, 'AGENTS.md'), 'utf8'),
      afterFirst,
      'dryRun must not modify the file even on stale-section path'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// C5 — updateRootDoc must honor a confirmReplace callback. When the managed
// section diverged on disk and the user declines, leave the file alone and
// return `kept-stale` so update.js can surface "managed section preserved"
// instead of silently overwriting user edits between markers.
test('updateRootDoc: bounds present + content diverged + confirmReplace=false → kept-stale (file untouched)', async () => {
  const dir = mkScratch();
  try {
    writeFileSync(join(dir, 'AGENTS.md'), '# AGENTS.md\n');
    await updateRootDoc({
      cwd: dir,
      skills: ['agentic-bootstrap'],
      confirmAppend: async () => true,
    });
    const afterBootstrap = readFileSync(join(dir, 'AGENTS.md'), 'utf8');

    const action = await updateRootDoc({
      cwd: dir,
      skills: ['agentic-bootstrap', 'agentic-architecture'],
      confirmReplace: async () => false,
    });
    assert.equal(action.type, 'kept-stale');
    assert.equal(
      readFileSync(join(dir, 'AGENTS.md'), 'utf8'),
      afterBootstrap,
      'kept-stale must leave the file byte-identical to the prior write'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// C7 — orderState must guard against malformed state (defensive — current
// internal callers cannot trigger it, but a malformed external state file
// or a buggy future caller would crash with a confusing TypeError).
test('saveState (via orderState): malformed state with non-array files throws with context', () => {
  const dir = mkScratch();
  try {
    const malformed = {
      schemaVersion: 1,
      kitVersion: '0.9.4-test',
      agent: 'claude-code',
      profile: 'team',
      skills: {
        'agentic-bootstrap': {
          version: '0.9.4-test',
          // files is missing entirely — orderState must surface the
          // missing-array shape with a clear error rather than crash on
          // `Cannot read properties of undefined`.
        },
      },
    };
    assert.throws(
      () => saveState(dir, 'claude-code', malformed),
      /orderState: state\.skills\["agentic-bootstrap"\]\.files must be an array/
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('saveState (via orderState): missing skills object throws', () => {
  const dir = mkScratch();
  try {
    const malformed = {
      schemaVersion: 1,
      kitVersion: '0.9.4-test',
      agent: 'claude-code',
      profile: 'team',
      // skills is missing
    };
    assert.throws(
      () => saveState(dir, 'claude-code', malformed),
      /orderState: state\.skills must be an object/
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
