import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  rmSync,
  mkdirSync,
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

// Per task-0029, updateRootDoc reads the table cell from each installed
// SKILL.md's `summary:` frontmatter field at section-build time. Tests
// that exercise the rendered table need at minimum a SKILL.md per skill
// they reference; this helper writes the smallest valid one.
//
// `agent` defaults to claude-code; pass 'codex' to exercise the .agents
// path that readSkillSummary walks as the second iteration of its loop.
function seedInstalledSkill(
  cwd,
  skill,
  { summary = `Test fixture for ${skill}.`, agent = 'claude-code' } = {}
) {
  const skillsDir = agent === 'codex' ? '.agents/skills' : '.claude/skills';
  const dir = join(cwd, skillsDir, skill);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'SKILL.md'),
    `---\nname: ${skill}\ndescription: Test fixture.\nsummary: ${summary}\n---\n`
  );
}

// Writes a SKILL.md whose frontmatter has `summary:` present but empty.
// Used by the throw-path tests below; mirrors the latent regex bug
// (\s vs [ \t]) that the v0.15.2 review caught.
function seedInstalledSkillWithEmptySummary(cwd, skill) {
  const dir = join(cwd, '.claude/skills', skill);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'SKILL.md'),
    `---\nname: ${skill}\ndescription: Test fixture.\nsummary:\n---\n`
  );
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
    state.skills['ad-bootstrap'] = {
      version: '0.9.4-test',
      files: [
        { path: '.claude/skills/ad-bootstrap/SKILL.md', sourceSha: 'aaa' },
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
      a.path.endsWith('ad-bootstrap/SKILL.md')
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
    seedInstalledSkill(dir, 'ad-bootstrap');
    seedInstalledSkill(dir, 'ad-philosophy');
    const original = '# AGENTS.md\n\nProject docs.\n';
    writeFileSync(join(dir, 'AGENTS.md'), original);
    const before = readFileSync(join(dir, 'AGENTS.md'), 'utf8');

    const action = await updateRootDoc({
      cwd: dir,
      skills: ['ad-bootstrap', 'ad-philosophy'],
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
    seedInstalledSkill(dir, 'ad-bootstrap');
    seedInstalledSkill(dir, 'ad-architecture');
    // Bootstrap a managed section first.
    writeFileSync(join(dir, 'AGENTS.md'), '# AGENTS.md\n');
    await updateRootDoc({
      cwd: dir,
      skills: ['ad-bootstrap'],
      confirmAppend: async () => true,
    });
    const afterFirst = readFileSync(join(dir, 'AGENTS.md'), 'utf8');

    // Re-run dry-run with a different skill set. Should report `updated`
    // but leave the file untouched.
    const action = await updateRootDoc({
      cwd: dir,
      skills: ['ad-bootstrap', 'ad-architecture'],
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
    seedInstalledSkill(dir, 'ad-bootstrap');
    seedInstalledSkill(dir, 'ad-architecture');
    writeFileSync(join(dir, 'AGENTS.md'), '# AGENTS.md\n');
    await updateRootDoc({
      cwd: dir,
      skills: ['ad-bootstrap'],
      confirmAppend: async () => true,
    });
    const afterBootstrap = readFileSync(join(dir, 'AGENTS.md'), 'utf8');

    const action = await updateRootDoc({
      cwd: dir,
      skills: ['ad-bootstrap', 'ad-architecture'],
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
      skills: {
        'ad-bootstrap': {
          version: '0.9.4-test',
          // files is missing entirely — orderState must surface the
          // missing-array shape with a clear error rather than crash on
          // `Cannot read properties of undefined`.
        },
      },
    };
    assert.throws(
      () => saveState(dir, 'claude-code', malformed),
      /orderState: state\.skills\["ad-bootstrap"\]\.files must be an array/
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

// Task-0029 v0.15.2 review finding: readSkillSummary must throw loudly
// when an installed SKILL.md is missing the `summary:` field, instead of
// silently producing an empty table cell. The latent regex bug (\s vs
// [ \t]) would have caused this path to capture the next frontmatter
// line as the summary — caught by the posthumous review and fixed
// before the v0.15.2 publish.
test('updateRootDoc: installed SKILL.md missing summary field → throws', async () => {
  const dir = mkScratch();
  try {
    seedInstalledSkillWithEmptySummary(dir, 'ad-bootstrap');
    writeFileSync(join(dir, 'AGENTS.md'), '# AGENTS.md\n');
    await assert.rejects(
      updateRootDoc({
        cwd: dir,
        skills: ['ad-bootstrap'],
        confirmAppend: async () => true,
      }),
      /missing|empty.*summary/i
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('updateRootDoc: skill referenced but not installed at any location → throws', async () => {
  const dir = mkScratch();
  try {
    writeFileSync(join(dir, 'AGENTS.md'), '# AGENTS.md\n');
    await assert.rejects(
      updateRootDoc({
        cwd: dir,
        skills: ['ad-nonexistent'],
        confirmAppend: async () => true,
      }),
      /not found at any installed location/
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// readSkillSummary walks both .claude/skills/ and .agents/skills/ in
// SKILL_PATH_BY_AGENT order. A Codex-only install (no .claude/skills/
// dir) must resolve summary from the .agents/skills/ path. Pre-fix the
// test suite never exercised this branch.
test('updateRootDoc: Codex-only install resolves summary from .agents/skills/', async () => {
  const dir = mkScratch();
  try {
    seedInstalledSkill(dir, 'ad-bootstrap', {
      summary: 'Codex-side summary cell.',
      agent: 'codex',
    });
    writeFileSync(join(dir, 'AGENTS.md'), '# AGENTS.md\n');
    const action = await updateRootDoc({
      cwd: dir,
      skills: ['ad-bootstrap'],
      confirmAppend: async () => true,
    });
    assert.equal(action.type, 'appended');
    const body = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
    assert.match(body, /Codex-side summary cell\./);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
