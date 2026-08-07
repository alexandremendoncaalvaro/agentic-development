import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
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

// A scratch directory that is a real git repository, for the ADR-0050
// tracked-root-doc guard: update must not regenerate a managed section in a
// file that is shared with the team.
function mkGitScratch() {
  const dir = mkScratch();
  const git = (...args) => execFileSync('git', args, { cwd: dir, stdio: 'ignore' });
  git('init', '-q');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  return { dir, git };
}

const STALE_ROOT_DOC =
  '# AGENTS.md\n\n<!-- agentic-managed-skills:start -->\n\n' +
  '## Skills installed by `agentic`\n\nstale table\n\n' +
  '<!-- agentic-managed-skills:end -->\n';

// --- Kit-doc install regressions (task-0035 of origin/main; kept from PR that
// merged first) ------------------------------------------------------------
// `WORKFLOW.md` being kit-owned settles who authors it, not whether an installer
// may delete a user's edits without saying so. The first cut of installKitDocs
// copied unconditionally: a target that had appended a local section lost it on
// the next `update`, reported as a benign `~ WORKFLOW.md`. AGENTS.md states the
// opposite as a contract — "Don't break this default by silently overwriting."
test('regression: task 0034 — update skips a diverged kit doc instead of overwriting it', () => {
  const dir = mkScratch();
  try {
    runInit(dir, ['--agent', 'claude-code']);
    const edited = `${readFileSync(join(dir, 'WORKFLOW.md'), 'utf8')}\n## Local addition\n`;
    writeFileSync(join(dir, 'WORKFLOW.md'), edited);

    const run = spawnSync('node', [BIN, 'update', '--agent', 'claude-code', '--yes'], {
      cwd: dir,
      encoding: 'utf8',
    });

    assert.equal(
      readFileSync(join(dir, 'WORKFLOW.md'), 'utf8'),
      edited,
      'update destroyed a user edit to WORKFLOW.md'
    );
    assert.match(
      `${run.stdout}${run.stderr}`,
      /! WORKFLOW\.md/,
      'the skip must be reported, not silent — an unreported skip is its own defect'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('regression: task 0034 — update --force replaces a diverged kit doc', () => {
  const dir = mkScratch();
  try {
    runInit(dir, ['--agent', 'claude-code']);
    const pristine = readFileSync(join(dir, 'WORKFLOW.md'), 'utf8');
    writeFileSync(join(dir, 'WORKFLOW.md'), `${pristine}\n## Local addition\n`);

    spawnSync('node', [BIN, 'update', '--agent', 'claude-code', '--yes', '--force'], {
      cwd: dir,
      encoding: 'utf8',
    });

    assert.equal(
      readFileSync(join(dir, 'WORKFLOW.md'), 'utf8'),
      pristine,
      '--force must restore the kit copy'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Kit-doc actions are agent-independent, so they carry no `agent` field while
// every skill-file action does. The report line used to interpolate the field
// unconditionally, which surfaced as a literal `[undefined]` beside each
// Constitution file — the report is the only place a user sees what an update
// did, so a placeholder there reads as a broken install.
test('regression: task 0034 — update reports kit docs without a placeholder agent tag', () => {
  const dir = mkScratch();
  try {
    runInit(dir, ['--agent', 'claude-code']);
    // Non-interactive `update` writes its report to stderr; asserting on the
    // union of both streams keeps the test about what the user reads rather
    // than about which stream carries it.
    const run = spawnSync('node', [BIN, 'update', '--agent', 'claude-code', '--yes'], {
      cwd: dir,
      encoding: 'utf8',
    });
    const out = `${run.stdout}${run.stderr}`;
    assert.ok(!out.includes('[undefined]'), `update report leaked a placeholder agent:\n${out}`);
    assert.match(out, /WORKFLOW\.md/, 'update report does not mention the kit docs at all');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// The unguarded update.js hole is the APPEND path (confirmAppend was
// unconditional): a tracked root doc with no managed section yet.
test('update -y does not append a section into a tracked sectionless root doc (ADR-0050)', () => {
  const { dir, git } = mkGitScratch();
  try {
    writeFileSync(join(dir, 'AGENTS.md'), '# AGENTS.md\n\nTeam-owned guide.\n');
    git('add', 'AGENTS.md');
    git('commit', '-qm', 'team baseline, no managed section');
    // init installs skills + state but, being non-interactive against a tracked
    // root doc, itself refuses to append — leaving the file sectionless so the
    // append path is what update exercises.
    runInit(dir, ['--agent', 'claude-code', '-y']);
    assert.doesNotMatch(readFileSync(join(dir, 'AGENTS.md'), 'utf8'), /agentic-managed-skills/);

    runUpdate(dir, ['--agent', 'claude-code', '-y']);

    assert.doesNotMatch(
      readFileSync(join(dir, 'AGENTS.md'), 'utf8'),
      /agentic-managed-skills/,
      'update must not append a managed section into a git-tracked root doc unattended'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('update -y --force-root-doc appends into a tracked sectionless root doc (ADR-0050)', () => {
  const { dir, git } = mkGitScratch();
  try {
    writeFileSync(join(dir, 'AGENTS.md'), '# AGENTS.md\n\nTeam-owned guide.\n');
    git('add', 'AGENTS.md');
    git('commit', '-qm', 'team baseline, no managed section');
    runInit(dir, ['--agent', 'claude-code', '-y']);

    runUpdate(dir, ['--agent', 'claude-code', '-y', '--force-root-doc']);

    assert.match(
      readFileSync(join(dir, 'AGENTS.md'), 'utf8'),
      /agentic-managed-skills:start/,
      'the override must reach the tracked root doc the refusal skips'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('update -y leaves a stale section in a TRACKED root doc alone without a flag (ADR-0050)', () => {
  const { dir, git } = mkGitScratch();
  try {
    writeFileSync(join(dir, 'AGENTS.md'), STALE_ROOT_DOC);
    git('add', 'AGENTS.md');
    git('commit', '-qm', 'tracked, stale managed section');
    runInit(dir, ['--agent', 'claude-code', '-y']);

    runUpdate(dir, ['--agent', 'claude-code', '-y']);

    assert.match(
      readFileSync(join(dir, 'AGENTS.md'), 'utf8'),
      /stale table/,
      'a tracked root doc must not be regenerated on the replace path without --force-root-doc'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Blocker B regression: --force-root-doc is scoped to the tracked (shared)
// case. On an UNTRACKED doc it must NOT destroy a hand-edited section — only
// --force governs that. Before the fix, forceRootDoc short-circuited ahead of
// the tracked check and wiped the edit.
test('update -y --force-root-doc preserves a hand-edit in an UNTRACKED root doc (ADR-0050 Blocker B)', () => {
  const { dir } = mkGitScratch();
  try {
    runInit(dir, ['--agent', 'claude-code', '-y']); // installs skills + state, no root doc
    const handEdited =
      '# AGENTS.md\n\n<!-- agentic-managed-skills:start -->\n\n' +
      '## Skills installed by `agentic`\n\nMY HAND EDIT — keep this\n\n' +
      '<!-- agentic-managed-skills:end -->\n';
    writeFileSync(join(dir, 'AGENTS.md'), handEdited); // untracked — never git add

    runUpdate(dir, ['--agent', 'claude-code', '-y', '--force-root-doc']);

    assert.match(
      readFileSync(join(dir, 'AGENTS.md'), 'utf8'),
      /MY HAND EDIT — keep this/,
      '--force-root-doc must not overwrite a diverged section on an untracked doc'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('update -y --force regenerates a hand-edited section in an UNTRACKED root doc', () => {
  const { dir } = mkGitScratch();
  try {
    runInit(dir, ['--agent', 'claude-code', '-y']);
    writeFileSync(
      join(dir, 'AGENTS.md'),
      '# AGENTS.md\n\n<!-- agentic-managed-skills:start -->\n\n' +
        '## Skills installed by `agentic`\n\nMY HAND EDIT\n\n' +
        '<!-- agentic-managed-skills:end -->\n'
    );

    runUpdate(dir, ['--agent', 'claude-code', '-y', '--force']);

    const body = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
    assert.doesNotMatch(body, /MY HAND EDIT/, '--force still overwrites a diverged section (unchanged behaviour)');
    assert.match(body, /ad-bootstrap/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// The replace path already refused unattended (its pre-existing --force gate),
// but --force-root-doc must drive it too, distinct from --force.
test('update -y --force-root-doc regenerates a stale section in a tracked root doc (ADR-0050)', () => {
  const { dir, git } = mkGitScratch();
  try {
    writeFileSync(join(dir, 'AGENTS.md'), STALE_ROOT_DOC);
    git('add', 'AGENTS.md');
    git('commit', '-qm', 'team baseline with a stale managed section');
    runInit(dir, ['--agent', 'claude-code', '-y']);

    runUpdate(dir, ['--agent', 'claude-code', '-y', '--force-root-doc']);

    const body = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
    assert.doesNotMatch(body, /stale table/, 'the override must regenerate the section');
    assert.match(body, /ad-bootstrap/, 'the regenerated table carries the real skill rows');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init writes state.json for claude-code', () => {
  const dir = mkScratch();
  try {
    runInit(dir, ['--agent', 'claude-code']);
    const state = loadState(dir, 'claude-code');
    assert.ok(state, 'state file must exist after init');
    assert.equal(state.agent, 'claude-code');
    assert.ok(state.skills['ad-bootstrap']);
    assert.ok(
      state.skills['ad-bootstrap'].files.some((f) =>
        f.path.endsWith('ad-bootstrap/SKILL.md')
      )
    );
    assert.ok(state.skills['ad-bootstrap'].files[0].sourceSha.match(/^[a-f0-9]{64}$/));
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
      skills: ['ad-bootstrap'],
      kitVersion: '0.3.0-test',
    });
    saveState(dir, 'claude-code', first.nextStates['claude-code']);

    const second = await installSkills({
      cwd: dir,
      agents: ['claude-code'],
      skills: ['ad-bootstrap'],
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
      skills: ['ad-bootstrap'],
    });

    // Simulate the "previous kit version's content" by overwriting the target with
    // an older body, and computing the SHA of that older body for the state file.
    // This is the real shape of "kit changed since last install": target reflects
    // the OLD source (user untouched), current kit source differs.
    const target = join(dir, '.claude/skills/ad-bootstrap/SKILL.md');
    const oldBody = '# old SKILL.md from a previous kit version\n';
    writeFileSync(target, oldBody);
    const { createHash } = await import('node:crypto');
    const oldSha = createHash('sha256').update(oldBody).digest('hex');

    const state = emptyState('claude-code', '0.2.0');
    state.skills['ad-bootstrap'] = {
      version: '0.2.0',
      files: [
        {
          path: '.claude/skills/ad-bootstrap/SKILL.md',
          sourceSha: oldSha,
        },
      ],
    };

    const result = await installSkills({
      cwd: dir,
      agents: ['claude-code'],
      skills: ['ad-bootstrap'],
      previousStates: { 'claude-code': state },
      kitVersion: '0.3.0',
    });
    const skillAction = result.actions.find((a) =>
      a.path.endsWith('ad-bootstrap/SKILL.md')
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
      skills: ['ad-bootstrap'],
      kitVersion: '0.3.0-test',
    });
    saveState(dir, 'claude-code', first.nextStates['claude-code']);

    // User edits the file.
    const target = join(dir, '.claude/skills/ad-bootstrap/SKILL.md');
    writeFileSync(target, 'USER LOCAL CHANGES\n');

    const result = await installSkills({
      cwd: dir,
      agents: ['claude-code'],
      skills: ['ad-bootstrap'],
      previousStates: { 'claude-code': loadState(dir, 'claude-code') },
      kitVersion: '0.3.0-test',
    });
    const skillAction = result.actions.find((a) =>
      a.path.endsWith('ad-bootstrap/SKILL.md')
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
      skills: ['ad-bootstrap'],
    });
    const state = emptyState('claude-code', '0.2.0');
    state.skills['ad-bootstrap'] = {
      version: '0.2.0',
      files: [
        {
          path: '.claude/skills/ad-bootstrap/SKILL.md',
          sourceSha: 'stale-sha-different-from-current-source-and-current-target-content',
        },
      ],
    };
    const target = join(dir, '.claude/skills/ad-bootstrap/SKILL.md');
    writeFileSync(target, 'USER LOCAL CHANGES\n');

    const result = await installSkills({
      cwd: dir,
      agents: ['claude-code'],
      skills: ['ad-bootstrap'],
      previousStates: { 'claude-code': state },
      kitVersion: '0.3.0',
      confirmReplace: async () => false,
    });
    const skillAction = result.actions.find((a) =>
      a.path.endsWith('ad-bootstrap/SKILL.md')
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
      skills: ['ad-bootstrap'],
    });
    const state = emptyState('claude-code', '0.2.0');
    state.skills['ad-bootstrap'] = {
      version: '0.2.0',
      files: [
        {
          path: '.claude/skills/ad-bootstrap/SKILL.md',
          sourceSha: 'stale-sha-different-from-current-source-and-current-target-content',
        },
      ],
    };
    const target = join(dir, '.claude/skills/ad-bootstrap/SKILL.md');
    writeFileSync(target, 'USER LOCAL CHANGES\n');

    const result = await installSkills({
      cwd: dir,
      agents: ['claude-code'],
      skills: ['ad-bootstrap'],
      previousStates: { 'claude-code': state },
      kitVersion: '0.3.0',
      force: true,
    });
    const skillAction = result.actions.find((a) =>
      a.path.endsWith('ad-bootstrap/SKILL.md')
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
      skills: ['ad-bootstrap'],
      kitVersion: '0.3.0-test',
      dryRun: true,
    });
    const skillAction = result.actions.find((a) =>
      a.path.endsWith('ad-bootstrap/SKILL.md')
    );
    assert.equal(skillAction.type, 'created');
    assert.ok(
      !existsSync(join(dir, '.claude/skills/ad-bootstrap/SKILL.md')),
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
      skills: ['ad-bootstrap'],
    });
    const state = emptyState('claude-code', '0.3.0');
    state.skills['ad-bootstrap'] = {
      version: '0.3.0',
      files: [{ path: '.claude/skills/ad-bootstrap/SKILL.md', sourceSha: 'sha' }],
    };

    const result = await removeOrphanSkills({
      cwd: dir,
      agent: 'claude-code',
      previousState: state,
      currentSkills: ['ad-philosophy'],
      confirmRemove: async () => false,
    });
    assert.equal(result.removedSkills.length, 0);
    assert.ok(
      existsSync(join(dir, '.claude/skills/ad-bootstrap/SKILL.md')),
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
      skills: ['ad-bootstrap'],
    });
    const state = emptyState('claude-code', '0.3.0');
    state.skills['ad-bootstrap'] = {
      version: '0.3.0',
      files: [{ path: '.claude/skills/ad-bootstrap/SKILL.md', sourceSha: 'sha' }],
    };

    const result = await removeOrphanSkills({
      cwd: dir,
      agent: 'claude-code',
      previousState: state,
      currentSkills: ['ad-philosophy'],
      confirmRemove: async () => true,
    });
    assert.deepEqual(result.removedSkills, ['ad-bootstrap']);
    assert.ok(
      !existsSync(join(dir, '.claude/skills/ad-bootstrap/SKILL.md')),
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

test('update --yes after a kit-changed file → silent update, target replaced with current source', async () => {
  const dir = mkScratch();
  try {
    runInit(dir, ['--agent', 'claude-code']);

    // Real kit-changed scenario: target reflects an OLDER kit version (user
    // untouched), and the recorded sourceSha matches that older content.
    // The current kit source is what runInit just shipped — so we overwrite
    // the target with synthetic old content and forge the SHA to match it.
    const target = join(dir, '.claude/skills/ad-bootstrap/SKILL.md');
    const currentSource = readFileSync(target, 'utf8');
    const oldBody = '# old SKILL.md from a previous kit version\n';
    writeFileSync(target, oldBody);
    const { createHash } = await import('node:crypto');
    const oldSha = createHash('sha256').update(oldBody).digest('hex');

    const state = loadState(dir, 'claude-code');
    state.skills['ad-bootstrap'].files = state.skills[
      'ad-bootstrap'
    ].files.map((f) =>
      f.path.endsWith('SKILL.md') ? { ...f, sourceSha: oldSha } : f
    );
    saveState(dir, 'claude-code', state);

    runUpdate(dir, ['--agent', 'claude-code', '--yes']);
    const after = readFileSync(target, 'utf8');
    assert.notEqual(after, oldBody, 'kit-changed-update must overwrite the old body');
    assert.equal(after, currentSource, 'target must equal current kit source');

    const newState = loadState(dir, 'claude-code');
    const skillSha = newState.skills['ad-bootstrap'].files.find((f) =>
      f.path.endsWith('SKILL.md')
    ).sourceSha;
    assert.notEqual(skillSha, oldSha, 'state must be refreshed with current SHA');
    assert.match(skillSha, /^[a-f0-9]{64}$/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('update --help works', () => {
  execFileSync('node', [BIN, 'update', '--help'], { encoding: 'utf8' });
});

test('installSkills: skip on conflict records current sourceSha so a re-run with kit unchanged does not re-prompt', async () => {
  const dir = mkScratch();
  try {
    // Run 1: install once.
    await installSkills({
      cwd: dir,
      agents: ['claude-code'],
      skills: ['ad-bootstrap'],
    });

    // User edits the file → divergent target. Forge a stale prevSha so the
    // diff sees a real conflict (kit changed AND user changed).
    const target = join(dir, '.claude/skills/ad-bootstrap/SKILL.md');
    writeFileSync(target, 'USER LOCAL EDITS\n');
    const state = emptyState('claude-code', '0.2.0');
    state.skills['ad-bootstrap'] = {
      version: '0.2.0',
      files: [
        {
          path: '.claude/skills/ad-bootstrap/SKILL.md',
          sourceSha: 'stale-prev-sha-from-an-older-kit',
        },
      ],
    };

    // Run 2: conflict-prompt, user skips.
    const skipResult = await installSkills({
      cwd: dir,
      agents: ['claude-code'],
      skills: ['ad-bootstrap'],
      previousStates: { 'claude-code': state },
      kitVersion: '0.3.0',
      confirmReplace: async () => false,
    });
    const skipAction = skipResult.actions.find((a) =>
      a.path.endsWith('ad-bootstrap/SKILL.md')
    );
    assert.equal(skipAction.type, 'skipped');

    // Skip must record the *current* kit sourceSha so the next run with kit
    // unchanged classifies the file as user-edited-keep (silent), not a
    // repeated conflict-prompt. Recording prevSha would re-prompt every run.
    saveState(dir, 'claude-code', skipResult.nextStates['claude-code']);
    const recordedSha = loadState(dir, 'claude-code').skills['ad-bootstrap']
      .files.find((f) => f.path.endsWith('SKILL.md')).sourceSha;
    assert.match(recordedSha, /^[a-f0-9]{64}$/);
    assert.notEqual(recordedSha, 'stale-prev-sha-from-an-older-kit');

    // Run 3: kit unchanged. User edits still in place. Expect user-edited-keep.
    const rerun = await installSkills({
      cwd: dir,
      agents: ['claude-code'],
      skills: ['ad-bootstrap'],
      previousStates: { 'claude-code': loadState(dir, 'claude-code') },
      kitVersion: '0.3.0',
      confirmReplace: async () => {
        throw new Error('confirmReplace must NOT fire when kit unchanged after skip');
      },
    });
    const rerunAction = rerun.actions.find((a) =>
      a.path.endsWith('ad-bootstrap/SKILL.md')
    );
    assert.equal(rerunAction.type, 'kept');
    assert.equal(readFileSync(target, 'utf8'), 'USER LOCAL EDITS\n');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('installSkills: nextStates carry SCHEMA_VERSION from state.js, not a hardcoded literal', async () => {
  const dir = mkScratch();
  try {
    const result = await installSkills({
      cwd: dir,
      agents: ['claude-code'],
      skills: ['ad-bootstrap'],
      kitVersion: '0.3.0-beta.2',
    });
    const { SCHEMA_VERSION } = await import('../src/lib/state.js');
    assert.equal(result.nextStates['claude-code'].schemaVersion, SCHEMA_VERSION);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
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
    assert.ok(after.skills['ad-bootstrap']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
