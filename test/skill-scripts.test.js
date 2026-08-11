import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chmodSync, mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// The claude-code copy is executed; the host-parity test in skills.test.js
// guarantees the codex twin is byte-identical, so one execution covers both.
const PROBE = join(
  __dirname,
  '..',
  'src',
  'skills',
  'claude-code',
  'ad-audit',
  'scripts',
  'resolve-rules.mjs'
);

function runProbe(cwd, env = {}) {
  return execFileSync('node', [PROBE], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

test('resolve-rules.mjs: reports every layer that exists', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-probe-'));
  try {
    const machineStore = join(dir, 'machine-rules');
    mkdirSync(machineStore);
    writeFileSync(join(machineStore, 'cv.md'), '# rules');
    writeFileSync(join(machineStore, 'gh.md'), '# rules');
    const repo = join(dir, 'repo');
    mkdirSync(join(repo, '.agentic', 'rules'), { recursive: true });
    writeFileSync(join(repo, '.agentic', 'rules', 'project.md'), '# rules');
    writeFileSync(join(repo, 'AGENTS.md'), '# agents');
    writeFileSync(join(repo, 'GUIDELINES.md'), '# guidelines');
    mkdirSync(join(repo, 'doc', 'adr'), { recursive: true });
    writeFileSync(join(repo, 'doc', 'adr', '0001-a.md'), '# adr');
    writeFileSync(join(repo, 'doc', 'adr', '0002-b.md'), '# adr');

    writeFileSync(join(repo, 'CONTEXT.md'), '# context');
    const out = runProbe(repo, { AGENTIC_RULES_DIR: machineStore });
    assert.match(out, new RegExp(`^MACHINE-STORE: ${machineStore}$`, 'm'));
    assert.match(out, /^cv\.md=[0-9a-f]{64}$/m);
    assert.match(out, /^gh\.md=[0-9a-f]{64}$/m);
    assert.match(out, /^PROJECT: \.agentic\/rules$/m);
    assert.match(out, /^project\.md=[0-9a-f]{64}$/m);
    assert.match(out, /^BINDING DOCS:$/m);
    assert.match(out, /^AGENTS\.md$/m);
    assert.match(out, /^GUIDELINES\.md$/m);
    assert.ok(!/^ARCHITECTURE\.md$/m.test(out), 'absent binding docs are not listed');
    assert.ok(
      out.indexOf('AGENTS.md') < out.indexOf('CONTEXT.md') &&
        out.indexOf('CONTEXT.md') < out.indexOf('GUIDELINES.md'),
      'binding docs are listed sorted, matching the ls output of the old shell block'
    );
    assert.match(out, /^ADRS: doc\/adr \(2 files\)$/m);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('resolve-rules.mjs: a file where a rules dir should be reads absent, not a crash', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-probe-notdir-'));
  try {
    const impostor = join(dir, 'rules-as-file');
    writeFileSync(impostor, 'not a directory');
    mkdirSync(join(dir, '.agentic'));
    writeFileSync(join(dir, '.agentic', 'rules'), 'also a file');
    const out = runProbe(dir, { AGENTIC_RULES_DIR: impostor });
    assert.match(out, /^MACHINE-STORE: absent$/m);
    assert.match(out, /^PROJECT: absent$/m);
    assert.match(out, /^BINDING DOCS:$/m, 'the probe must keep reporting, never die silent');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('resolve-rules.mjs: absent layers say absent instead of failing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-probe-empty-'));
  try {
    const out = runProbe(dir, { AGENTIC_RULES_DIR: join(dir, 'no-such-dir') });
    assert.match(out, /^MACHINE-STORE: absent$/m);
    assert.match(out, /^PROJECT: absent$/m);
    assert.match(out, /^BINDING DOCS:$/m);
    assert.ok(!/ADRS:/.test(out), 'no ADR line when no ADR dir exists');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('resolve-rules.mjs: listings sort in locale-independent code-unit order', () => {
  // Deliberate: uppercase before lowercase (C collation), regardless of the
  // host locale, so audit trails are reproducible across machines.
  const dir = mkdtempSync(join(tmpdir(), 'agentic-probe-sort-'));
  try {
    const machineStore = join(dir, 'rules');
    mkdirSync(machineStore);
    for (const name of ['apple.md', 'Zebra.md', 'Banana.md']) {
      writeFileSync(join(machineStore, name), '# rules');
    }
    const out = runProbe(dir, { AGENTIC_RULES_DIR: machineStore });
    assert.ok(
      out.indexOf('Banana.md') < out.indexOf('Zebra.md') &&
        out.indexOf('Zebra.md') < out.indexOf('apple.md'),
      'code-unit order: uppercase names sort before lowercase'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('resolve-rules.mjs: dotfiles in a rules dir are ignored (ls parity)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-probe-dot-'));
  try {
    const machineStore = join(dir, 'rules');
    mkdirSync(machineStore);
    writeFileSync(join(machineStore, '.DS_Store'), '');
    writeFileSync(join(machineStore, 'real.md'), '# rules');
    const out = runProbe(dir, { AGENTIC_RULES_DIR: machineStore });
    assert.match(out, /^real\.md=[0-9a-f]{64}$/m);
    assert.ok(!out.includes('.DS_Store'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('resolve-rules.mjs: rules files carry sha256 content anchors', () => {
  // task-0033: machine-store and project-layer rule files live outside the
  // audited git tree, so the target SHA cannot pin them — the probe anchors
  // each by content hash, in the same <file>=<sha256> shape reviewers echo.
  const dir = mkdtempSync(join(tmpdir(), 'agentic-probe-anchor-'));
  try {
    const machineStore = join(dir, 'rules');
    mkdirSync(machineStore);
    const storeBody = '# cv rules\nno unmeasured claims\n';
    writeFileSync(join(machineStore, 'cv.md'), storeBody);
    const repo = join(dir, 'repo');
    mkdirSync(join(repo, '.agentic', 'rules'), { recursive: true });
    const projectBody = '# project rules\n';
    writeFileSync(join(repo, '.agentic', 'rules', 'project.md'), projectBody);
    writeFileSync(join(repo, 'AGENTS.md'), '# agents');
    const out = runProbe(repo, { AGENTIC_RULES_DIR: machineStore });
    const sha = (body) => createHash('sha256').update(body).digest('hex');
    assert.match(out, new RegExp(`^cv\\.md=${sha(storeBody)}$`, 'm'));
    assert.match(out, new RegExp(`^project\\.md=${sha(projectBody)}$`, 'm'));
    assert.match(out, /^AGENTS\.md$/m);
    assert.ok(
      !/^AGENTS\.md=/m.test(out),
      'binding docs stay bare — the target tree SHA pins them, not a probe anchor'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('resolve-rules.mjs: an unreadable rules file reports UNREADABLE, not a dead probe', (t) => {
  // Regression pinned by the task-0033 self-audit: a stat-able but unreadable
  // rule file made readFileSync throw EACCES mid-report — zero output, the
  // exact silent failure the probe exists to stop.
  if (process.platform === 'win32' || process.getuid?.() === 0) {
    t.skip('chmod 000 does not block reads for this platform or user');
    return;
  }
  const dir = mkdtempSync(join(tmpdir(), 'agentic-probe-unreadable-'));
  try {
    const machineStore = join(dir, 'rules');
    mkdirSync(machineStore);
    writeFileSync(join(machineStore, 'fine.md'), '# rules');
    const locked = join(machineStore, 'locked.md');
    writeFileSync(locked, '# locked');
    chmodSync(locked, 0o000);
    const out = runProbe(dir, { AGENTIC_RULES_DIR: machineStore });
    assert.match(out, /^fine\.md=[0-9a-f]{64}$/m);
    assert.match(out, /^locked\.md=UNREADABLE:EACCES$/m);
    assert.match(out, /^BINDING DOCS:$/m, 'the probe keeps reporting past the unreadable file');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('resolve-rules.mjs: a subdirectory in a rules dir lists bare, not a crash', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-probe-subdir-'));
  try {
    const machineStore = join(dir, 'rules');
    mkdirSync(join(machineStore, 'nested'), { recursive: true });
    writeFileSync(join(machineStore, 'real.md'), '# rules');
    const out = runProbe(dir, { AGENTIC_RULES_DIR: machineStore });
    assert.match(out, /^nested$/m);
    assert.match(out, /^real\.md=[0-9a-f]{64}$/m);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- ad-hooks session-lifecycle handoff-nudge hook (ADR-0055) ---
// The claude-code copy is executed; the byte-parity test in skills.test.js
// guarantees the codex twin is identical, so one execution covers both.
const NUDGE = join(
  __dirname,
  '..',
  'src',
  'skills',
  'claude-code',
  'ad-hooks',
  'scripts',
  'handoff-nudge.mjs'
);

// Invoke the real script with a mock Stop-event JSON on stdin, exactly as
// Claude Code would. Returns the captured stdout (empty string when silent).
function runNudge(event, env = {}) {
  return execFileSync('node', [NUDGE], {
    input: JSON.stringify(event),
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

// A transcript file of exactly `size` bytes, in a fresh temp dir the test owns.
function makeTranscript(dir, size) {
  const path = join(dir, 'transcript.jsonl');
  writeFileSync(path, Buffer.alloc(size));
  return path;
}

test('handoff-nudge: transcript over threshold, no prior flag → emits the systemMessage nudge', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-nudge-over-'));
  try {
    const transcript = makeTranscript(dir, 500);
    const out = runNudge(
      {
        hook_event_name: 'Stop',
        session_id: 'sess-over-abc',
        transcript_path: transcript,
        stop_hook_active: false,
      },
      {
        AD_HANDOFF_NUDGE_THRESHOLD_BYTES: '100',
        AD_HANDOFF_NUDGE_STATE_DIR: dir,
      }
    );
    // Exact shape the verified Stop contract requires: a single JSON object
    // carrying `systemMessage`, no `decision` field (so the turn stops
    // normally and the nudge cannot loop).
    const parsed = JSON.parse(out);
    assert.equal(typeof parsed.systemMessage, 'string');
    assert.ok(parsed.systemMessage.includes('/ad-handoff'), 'nudge names /ad-handoff');
    assert.ok(!('decision' in parsed), 'must NOT block/continue — no decision field');
    // And the once-per-session flag was written for this session_id.
    assert.ok(
      existsSync(join(dir, 'ad-handoff-nudge-sess-over-abc.flag')),
      'flag file written on first nudge'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('handoff-nudge: transcript under threshold → silent (no output)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-nudge-under-'));
  try {
    const transcript = makeTranscript(dir, 50);
    const out = runNudge(
      {
        hook_event_name: 'Stop',
        session_id: 'sess-under',
        transcript_path: transcript,
        stop_hook_active: false,
      },
      {
        AD_HANDOFF_NUDGE_THRESHOLD_BYTES: '100',
        AD_HANDOFF_NUDGE_STATE_DIR: dir,
      }
    );
    assert.equal(out, '', 'below threshold must be silent');
    assert.ok(
      !existsSync(join(dir, 'ad-handoff-nudge-sess-under.flag')),
      'no flag written when it does not nudge'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('handoff-nudge: fires at most once per session_id (second Stop is silent)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-nudge-once-'));
  try {
    const transcript = makeTranscript(dir, 500);
    const event = {
      hook_event_name: 'Stop',
      session_id: 'sess-once',
      transcript_path: transcript,
      stop_hook_active: false,
    };
    const env = { AD_HANDOFF_NUDGE_THRESHOLD_BYTES: '100', AD_HANDOFF_NUDGE_STATE_DIR: dir };
    const first = runNudge(event, env);
    const second = runNudge(event, env);
    assert.ok(first.includes('systemMessage'), 'first Stop nudges');
    assert.equal(second, '', 'second Stop for the same session is silent (once-per-session guard)');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('handoff-nudge: stop_hook_active === true → silent, cannot loop', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-nudge-active-'));
  try {
    const transcript = makeTranscript(dir, 5000); // well over threshold
    const out = runNudge(
      {
        hook_event_name: 'Stop',
        session_id: 'sess-active',
        transcript_path: transcript,
        stop_hook_active: true,
      },
      { AD_HANDOFF_NUDGE_THRESHOLD_BYTES: '100', AD_HANDOFF_NUDGE_STATE_DIR: dir }
    );
    assert.equal(out, '', 're-entrancy guard: stop_hook_active must silence the hook');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('handoff-nudge: missing transcript_path or unparseable stdin → silent, never disrupts', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-nudge-degrade-'));
  try {
    const env = { AD_HANDOFF_NUDGE_THRESHOLD_BYTES: '1', AD_HANDOFF_NUDGE_STATE_DIR: dir };
    const noPath = runNudge({ hook_event_name: 'Stop', session_id: 's' }, env);
    assert.equal(noPath, '', 'missing transcript_path → silent');
    const badJson = execFileSync('node', [NUDGE], {
      input: 'not json at all',
      encoding: 'utf8',
      env: { ...process.env, ...env },
    });
    assert.equal(badJson, '', 'unparseable stdin → silent');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('handoff-nudge: parseable-but-non-object stdin → silent exit 0, never crashes', () => {
  // JSON that parses without throwing but is not a plain object, so the
  // JSON.parse catch never fires. `null` is the reported crasher (it reached
  // `event.stop_hook_active` and threw a TypeError, exit 1); the rest cover the
  // whole non-object class so the bug cannot regrow. All must degrade to a
  // silent exit 0 — execFileSync throws on any non-zero exit, so no-crash is
  // asserted implicitly, empty stdout explicitly.
  const dir = mkdtempSync(join(tmpdir(), 'agentic-nudge-nonobject-'));
  try {
    const env = { AD_HANDOFF_NUDGE_THRESHOLD_BYTES: '1', AD_HANDOFF_NUDGE_STATE_DIR: dir };
    for (const payload of ['null', 'true', '42', '"str"', '[]']) {
      const out = execFileSync('node', [NUDGE], {
        input: payload,
        encoding: 'utf8',
        env: { ...process.env, ...env },
      });
      assert.equal(out, '', `parseable non-object stdin ${payload} → silent, no output`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- ad-next deterministic state survey (ADR-0057, P2.1) ---
// The claude-code copy is executed; the byte-parity test in skills.test.js
// guarantees the codex twin is identical, so one execution covers both. The
// script emits objective survey facts as JSON; the SKILL.md body narrates them
// and keeps the judgment (scenario classification, prioritization, profile
// filtering) as text per ADR-0057's agent-vs-script boundary.
const SURVEY = join(
  __dirname,
  '..',
  'src',
  'skills',
  'claude-code',
  'ad-next',
  'scripts',
  'survey.mjs'
);

// Run the survey against `cwd` and parse its stdout as JSON, exactly as the
// skill would (`node <base>/scripts/survey.mjs` from the repo root). GIT_DIR &
// friends are stripped so a linked-worktree test host cannot leak its git dir
// into the child (AGENTS.md Gotchas — the observed task-0033 hazard).
function runSurvey(cwd) {
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  delete env.GIT_INDEX_FILE;
  const out = execFileSync('node', [SURVEY], { cwd, encoding: 'utf8', env });
  return JSON.parse(out);
}

// --- ad-release deterministic local release-state probe (ADR-0063) ---
// The claude-code copy is executed; skills.test.js enforces a byte-identical
// Codex twin. The probe reports local facts only: it never contacts npm or
// GitHub, and its JSON is the input to the skill's judgment and confirmations.
const RELEASE_STATE = join(
  __dirname,
  '..',
  'src',
  'skills',
  'claude-code',
  'ad-release',
  'scripts',
  'release-state.mjs'
);

function runReleaseState(cwd, args = []) {
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  delete env.GIT_INDEX_FILE;
  const out = execFileSync('node', [RELEASE_STATE, ...args], {
    cwd,
    encoding: 'utf8',
    env,
  });
  return JSON.parse(out);
}

const RELEASE_PLAN = join(
  __dirname,
  '..',
  'src',
  'skills',
  'claude-code',
  'ad-release',
  'scripts',
  'release-plan.mjs'
);

function runReleasePlan(input) {
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  delete env.GIT_INDEX_FILE;
  const out = execFileSync('node', [RELEASE_PLAN], {
    encoding: 'utf8',
    input: JSON.stringify(input),
    env,
  });
  return JSON.parse(out);
}

// Initialize a throwaway git repo whose default branch is `main`, with a
// fixed inline identity so nothing touches global git config (never mutate the
// machine-global committer — the task-0033 danger). GIT_DIR & friends stripped.
function gitInit(dir) {
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  delete env.GIT_INDEX_FILE;
  const git = (...args) =>
    execFileSync(
      'git',
      [
        '-c',
        'user.email=test@example.com',
        '-c',
        'user.name=Test',
        '-c',
        'commit.gpgsign=false',
        '-c',
        'init.defaultBranch=main',
        ...args,
      ],
      { cwd: dir, encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'ignore'] }
    );
  git('init');
  return git;
}

test('release-state: reports a release-ready tagged package as JSON', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-release-state-'));
  try {
    const git = gitInit(dir);
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({
        name: '@example/package',
        version: '1.2.3',
        scripts: { release: 'node scripts/release.mjs' },
        publishConfig: { tag: 'beta' },
      })
    );
    writeFileSync(join(dir, 'package-lock.json'), '{}\n');
    writeFileSync(join(dir, 'CHANGELOG.md'), '# Changelog\n\n## [Unreleased]\n\n- Ready\n');
    git('add', '.');
    git('commit', '-m', 'chore: fixture');
    git('tag', '-a', 'v1.2.3', '-m', 'v1.2.3');

    const state = runReleaseState(dir, ['--tag', 'v1.2.3']);

    assert.deepEqual(state.package, {
      name: '@example/package',
      version: '1.2.3',
      publishTag: 'beta',
      releaseScript: 'node scripts/release.mjs',
    });
    assert.deepEqual(state.files, {
      packageJson: true,
      packageLock: true,
      changelog: { exists: true, hasUnreleased: true },
    });
    assert.deepEqual(state.git.tag, {
      name: 'v1.2.3',
      exists: true,
      annotated: true,
    });
    assert.equal(state.git.branch, 'main');
    assert.equal(state.git.dirty, false);
    assert.equal(state.git.origin, null);
    assert.deepEqual(state.unreadable, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('release-state: reports a content-read failure in unreadable', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-release-state-unreadable-'));
  try {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'example' }));
    mkdirSync(join(dir, 'CHANGELOG.md'));

    const state = runReleaseState(dir);

    assert.deepEqual(state.unreadable, ['CHANGELOG.md:EISDIR']);
    assert.deepEqual(state.files.changelog, { exists: true, hasUnreleased: null });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('release-state: reports an unreadable package lock', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-release-state-lock-unreadable-'));
  try {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'example' }));
    mkdirSync(join(dir, 'package-lock.json'));

    const state = runReleaseState(dir);

    assert.deepEqual(state.unreadable, ['package-lock.json:EISDIR']);
    assert.equal(state.files.packageLock, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('release-plan: branch and tag pushes use isolated exact refs', () => {
  const context = {
    releaseKind: 'patch',
    branch: 'chore/release-v1.2.3',
    tag: 'v1.2.3',
    merged: true,
  };

  const branch = runReleasePlan({
    ...context,
    completed: ['local-release'],
    confirmation: { stage: 'branch-push', approved: true },
  });
  const tag = runReleasePlan({
    ...context,
    completed: ['local-release', 'branch-push'],
    confirmation: { stage: 'tag-push', approved: true },
  });

  assert.deepEqual(branch.execution, [
    'git',
    'push',
    '--no-follow-tags',
    'origin',
    'refs/heads/chore/release-v1.2.3:refs/heads/chore/release-v1.2.3',
  ]);
  assert.deepEqual(tag.execution, [
    'git',
    'push',
    'origin',
    'refs/tags/v1.2.3:refs/tags/v1.2.3',
  ]);
});

test('release-plan: every direct release effect remains unexecuted when refused', () => {
  const context = {
    releaseKind: 'patch',
    branch: 'chore/release-v1.2.3',
    tag: 'v1.2.3',
    prerelease: false,
  };
  const cases = [
    { completed: [], merged: false, stage: 'local-release' },
    { completed: ['local-release'], merged: false, stage: 'branch-push' },
    { completed: ['local-release', 'branch-push'], merged: true, stage: 'tag-push' },
    {
      completed: ['local-release', 'branch-push', 'tag-push'],
      merged: true,
      stage: 'npm-publish',
    },
    {
      completed: ['local-release', 'branch-push', 'tag-push', 'npm-publish'],
      merged: true,
      stage: 'github-release',
    },
  ];

  for (const { completed, merged, stage } of cases) {
    const refused = runReleasePlan({
      ...context,
      completed,
      merged,
      confirmation: { stage, approved: false },
    });
    assert.equal(refused.next.id, stage);
    assert.equal(refused.next.requiresConfirmation, true);
    assert.equal(refused.execution, null, `${stage} must not execute when refused`);
    assert.deepEqual(refused.unreadable, []);

    const approved = runReleasePlan({
      ...context,
      completed,
      merged,
      confirmation: { stage, approved: true },
    });
    assert.equal(approved.next.id, stage);
    assert.ok(Array.isArray(approved.execution) && approved.execution.length > 0);
  }
});

test('release-plan: a post-publish resume offers only GitHub Release recovery', () => {
  const plan = runReleasePlan({
    tag: 'v1.2.3',
    prerelease: false,
    completed: ['local-release', 'branch-push', 'tag-push', 'npm-publish'],
    merged: true,
    confirmation: { stage: 'github-release', approved: true },
  });

  assert.equal(plan.next.id, 'github-release');
  assert.deepEqual(plan.execution, [
    'ghp',
    'release',
    'create',
    'v1.2.3',
    '--verify-tag',
    '--notes-from-tag',
  ]);
});

test('release-plan: never offers npm publish while the tagged commit is unmerged', () => {
  const plan = runReleasePlan({
    tag: 'v1.2.3',
    completed: ['local-release', 'branch-push', 'tag-push'],
    merged: false,
    confirmation: { stage: 'npm-publish', approved: true },
  });

  assert.equal(plan.next.id, 'npm-publish');
  assert.equal(plan.execution, null);
  assert.match(plan.blocked, /merged release commit/);
});

test('survey: brownfield repo reports presence, counts, and reciprocity', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-survey-brown-'));
  try {
    // Layer 1 constitution + singleton docs.
    writeFileSync(join(dir, 'WORKFLOW.md'), '# workflow');
    writeFileSync(join(dir, 'AGENTS.md'), '# agents');
    writeFileSync(join(dir, 'GUIDELINES.md'), '# guidelines');
    writeFileSync(join(dir, 'ARCHITECTURE.md'), '# architecture');
    // Layer 2 domain with a populated glossary (an `_Avoid_:` line).
    writeFileSync(join(dir, 'CONTEXT.md'), '# context\n\n**Term** — a thing.\n_Avoid_: other-name\n');
    // Layer 3 product — PRD uses the plain `Status:` shape (not bold).
    mkdirSync(join(dir, 'doc', 'product'), { recursive: true });
    writeFileSync(join(dir, 'doc', 'product', 'PRD.md'), '# PRD\n\nStatus: accepted\nCreated: 2026-01-01\n');
    // Layer 4 specs — one accepted spec, bold `**Status:**` shape.
    mkdirSync(join(dir, 'doc', 'specs'), { recursive: true });
    writeFileSync(
      join(dir, 'doc', 'specs', '0001-auth-flow.md'),
      '# Spec 0001\n\n**Status:** accepted\n'
    );
    // Layer 5 ADRs — 2 accepted, 1 proposed, plus a non-NNNN index file skipped.
    mkdirSync(join(dir, 'doc', 'adr'), { recursive: true });
    writeFileSync(join(dir, 'doc', 'adr', '0001-a.md'), '# ADR-0001\n\n**Status:** accepted\n');
    writeFileSync(join(dir, 'doc', 'adr', '0002-b.md'), '# ADR-0002\n\n**Status:** accepted\n');
    writeFileSync(join(dir, 'doc', 'adr', '0003-c.md'), '# ADR-0003\n\n**Status:** proposed\n');
    writeFileSync(join(dir, 'doc', 'adr', 'PROJECTION.md'), '# not an adr');
    // Layer 5 tasks — one in-progress task implementing spec 0001, one done,
    // one orphan (no Spec ref, no Board ref).
    mkdirSync(join(dir, 'doc', 'tasks'), { recursive: true });
    writeFileSync(
      join(dir, 'doc', 'tasks', '0001-build-auth.md'),
      '# task-0001\n\n**Status:** in-progress\n**Spec ref:** doc/specs/0001-auth-flow.md\n**Board ref:**\n'
    );
    writeFileSync(join(dir, 'doc', 'tasks', '0002-shipped.md'), '# task-0002\n\n**Status:** done\n');
    writeFileSync(
      join(dir, 'doc', 'tasks', '0003-orphan.md'),
      '# task-0003\n\n**Status:** proposed\n**Spec ref:**\n**Board ref:**\n'
    );
    // Layer 6 code signals.
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ scripts: { test: 'node --test' } }));
    writeFileSync(join(dir, 'lefthook.yml'), 'pre-commit:\n');
    mkdirSync(join(dir, '.github', 'workflows'), { recursive: true });
    writeFileSync(join(dir, '.github', 'workflows', 'test.yml'), 'on: push\n');
    // State file → profile.
    mkdirSync(join(dir, '.claude'), { recursive: true });
    writeFileSync(
      join(dir, '.claude', 'agentic-state.json'),
      JSON.stringify({ kitVersion: '9.9.9', profile: 'mature' })
    );

    const s = runSurvey(dir);

    assert.equal(s.profile, 'mature');
    assert.equal(s.kitVersion, '9.9.9');
    assert.deepEqual(s.constitution, {
      workflow: true,
      operationalGuide: 'AGENTS.md',
      guidelines: true,
    });
    assert.equal(s.architecture, true);
    assert.equal(s.design, false);
    assert.equal(s.domain.contextMd, true);
    assert.equal(s.domain.emptyGlossary, false);
    assert.equal(s.product.prd, true);
    assert.equal(s.product.status, 'accepted', 'PRD plain `Status:` shape parses');
    assert.equal(s.product.specCount, 1);
    assert.deepEqual(s.adrs.counts, {
      proposed: 1,
      accepted: 2,
      deprecated: 0,
      superseded: 0,
    });
    assert.deepEqual(s.adrs.proposed, ['0003-c'], 'proposed ADR slug surfaced');
    assert.equal(s.tasks.counts['in-progress'], 1);
    assert.equal(s.tasks.counts.done, 1);
    assert.equal(s.tasks.counts.proposed, 1);
    assert.equal(s.tasks.active.length, 1, 'only in-progress/blocked tasks are active');
    assert.equal(s.tasks.active[0].slug, '0001-build-auth');
    assert.equal(s.tasks.active[0].specRef, 'doc/specs/0001-auth-flow.md');
    // Orphan = no Spec ref AND no Board ref, literally, regardless of status.
    // 0002-shipped carries neither field, so it is an orphan too; status-based
    // de-emphasis is the narrating body's judgment, not the script's fact.
    assert.deepEqual(s.tasks.orphans, ['0002-shipped', '0003-orphan']);
    // Spec 0001 has one implementing task (0001), so it is NOT spec-without-tasks.
    const spec = s.specs.find((x) => x.slug === '0001-auth-flow');
    assert.equal(spec.status, 'accepted');
    assert.equal(spec.taskCount, 1);
    assert.deepEqual(s.reciprocity.specsWithoutTasks, []);
    assert.deepEqual(s.reciprocity.orphanTasks, []);
    assert.deepEqual(s.code, { tests: true, hooks: true, ci: true });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('survey: CLAUDE.md is reported as the operational guide when AGENTS.md is absent', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-survey-claude-'));
  try {
    writeFileSync(join(dir, 'CLAUDE.md'), '# claude');
    const s = runSurvey(dir);
    assert.equal(s.constitution.operationalGuide, 'CLAUDE.md');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('survey: empty repo → defaults (team profile), zero counts, no crash', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-survey-empty-'));
  try {
    const s = runSurvey(dir);
    assert.equal(s.profile, 'team', 'profile defaults to team when no state file (ADR-0013)');
    assert.equal(s.kitVersion, null);
    assert.equal(s.constitution.operationalGuide, null);
    assert.equal(s.architecture, false);
    assert.equal(s.product.prd, false);
    assert.deepEqual(s.specs, []);
    assert.deepEqual(s.adrs.counts, { proposed: 0, accepted: 0, deprecated: 0, superseded: 0 });
    assert.deepEqual(s.tasks.counts, { proposed: 0, 'in-progress': 0, blocked: 0, done: 0 });
    assert.deepEqual(s.code, { tests: false, hooks: false, ci: false });
    // Not a git repo → git facts are null, never a thrown error.
    assert.equal(s.git.branch, null);
    assert.equal(s.git.aheadOfMain, null);
    assert.equal(s.git.dirty, null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('survey: git ahead-of-main count and branch come from a real repo', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-survey-git-'));
  try {
    const git = gitInit(dir);
    writeFileSync(join(dir, 'a.txt'), 'a');
    git('add', 'a.txt');
    git('commit', '-m', 'first');
    git('checkout', '-b', 'feature');
    writeFileSync(join(dir, 'b.txt'), 'b');
    git('add', 'b.txt');
    git('commit', '-m', 'second');
    // A stray unstaged file so the tree is dirty.
    writeFileSync(join(dir, 'dirty.txt'), 'x');

    const s = runSurvey(dir);
    assert.equal(s.git.branch, 'feature');
    assert.equal(s.git.aheadOfMain, 1, 'one commit ahead of main');
    assert.equal(s.git.dirty, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('survey: spec↔task reciprocity flags stuck specs and orphan tasks', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-survey-recip-'));
  try {
    mkdirSync(join(dir, 'doc', 'specs'), { recursive: true });
    // Accepted spec with zero implementing tasks → stuck.
    writeFileSync(join(dir, 'doc', 'specs', '0001-lonely.md'), '# Spec\n\n**Status:** accepted\n');
    // Draft spec with zero tasks → NOT stuck (only accepted/shipped count).
    writeFileSync(join(dir, 'doc', 'specs', '0002-draft.md'), '# Spec\n\n**Status:** draft\n');
    mkdirSync(join(dir, 'doc', 'tasks'), { recursive: true });
    // Task pointing at a spec number that does not exist → orphan task.
    writeFileSync(
      join(dir, 'doc', 'tasks', '0001-ghost.md'),
      '# task\n\n**Status:** proposed\n**Spec ref:** doc/specs/0099-missing.md\n'
    );
    const s = runSurvey(dir);
    assert.deepEqual(s.reciprocity.specsWithoutTasks, ['0001-lonely']);
    assert.deepEqual(s.reciprocity.orphanTasks, ['0001-ghost']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('survey: CONTEXT.md with no _Avoid_ line flags an empty glossary', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-survey-glossary-'));
  try {
    writeFileSync(join(dir, 'CONTEXT.md'), '# context\n\nNo terms defined yet.\n');
    const s = runSurvey(dir);
    assert.equal(s.domain.contextMd, true);
    assert.equal(s.domain.emptyGlossary, true, 'no `_Avoid_:` line → empty glossary');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('survey: profile falls back to the .agents state file when .claude is absent', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-survey-agents-state-'));
  try {
    mkdirSync(join(dir, '.agents'), { recursive: true });
    writeFileSync(
      join(dir, '.agents', 'agentic-state.json'),
      JSON.stringify({ kitVersion: '1.2.3', profile: 'poc' })
    );
    const s = runSurvey(dir);
    assert.equal(s.profile, 'poc');
    assert.equal(s.kitVersion, '1.2.3');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('survey: a corrupt state file degrades to the team default, never crashes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-survey-badstate-'));
  try {
    mkdirSync(join(dir, '.claude'), { recursive: true });
    writeFileSync(join(dir, '.claude', 'agentic-state.json'), '{ not valid json');
    const s = runSurvey(dir);
    assert.equal(s.profile, 'team');
    assert.equal(s.kitVersion, null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('survey: rootDocReferencesProduct reflects whether the operational guide names the product', () => {
  // No operational guide → null (not applicable).
  const none = mkdtempSync(join(tmpdir(), 'agentic-survey-rootdoc-none-'));
  // AGENTS.md that references the product contract → true.
  const yes = mkdtempSync(join(tmpdir(), 'agentic-survey-rootdoc-yes-'));
  // AGENTS.md that does not → false (the stale-operational-guide finding).
  const no = mkdtempSync(join(tmpdir(), 'agentic-survey-rootdoc-no-'));
  try {
    assert.equal(runSurvey(none).rootDocReferencesProduct, null);
    writeFileSync(join(yes, 'AGENTS.md'), '# agents\n\nSee doc/product/PRD.md for scope.\n');
    assert.equal(runSurvey(yes).rootDocReferencesProduct, true);
    writeFileSync(join(no, 'AGENTS.md'), '# agents\n\nNothing about the product here.\n');
    assert.equal(runSurvey(no).rootDocReferencesProduct, false);
  } finally {
    for (const d of [none, yes, no]) rmSync(d, { recursive: true, force: true });
  }
});

test('survey: a multi-context repo (CONTEXT-MAP, no root CONTEXT) reports emptyGlossary as null', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-survey-multictx-'));
  try {
    writeFileSync(join(dir, 'CONTEXT-MAP.md'), '# context map\n');
    const s = runSurvey(dir);
    assert.equal(s.domain.contextMd, false);
    assert.equal(s.domain.contextMap, true);
    assert.equal(
      s.domain.emptyGlossary,
      null,
      'no root CONTEXT.md → emptyGlossary is not-applicable (null), never a false `false`'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('survey: a present-but-unreadable artifact is surfaced in `unreadable`, never silent', (t) => {
  // GUIDELINES.md §2.2: a probe that READS CONTENT must surface a read failure
  // in its output (the resolve-rules `UNREADABLE` marker is the reference
  // shape), never go silent. chmod 000 cannot block reads for root / on Windows.
  if (process.platform === 'win32' || process.getuid?.() === 0) {
    t.skip('chmod 000 does not block reads for this platform or user');
    return;
  }
  const dir = mkdtempSync(join(tmpdir(), 'agentic-survey-unreadable-'));
  try {
    mkdirSync(join(dir, 'doc', 'adr'), { recursive: true });
    writeFileSync(join(dir, 'doc', 'adr', '0001-fine.md'), '# ADR\n\n**Status:** accepted\n');
    const locked = join(dir, 'doc', 'adr', '0002-locked.md');
    writeFileSync(locked, '# ADR\n\n**Status:** accepted\n');
    chmodSync(locked, 0o000);
    const s = runSurvey(dir);
    assert.ok(Array.isArray(s.unreadable), 'survey carries an `unreadable` array');
    const hit = s.unreadable.find((u) => u.path.includes('0002-locked.md'));
    assert.ok(hit, 'the unreadable ADR file is surfaced, not swallowed');
    assert.equal(hit.code, 'EACCES');
    // The survey still completes and reports the readable ADR.
    assert.equal(s.adrs.counts.accepted, 1, 'the readable ADR is still counted');
  } finally {
    // Restore perms so rmSync can clean up.
    try {
      chmodSync(join(dir, 'doc', 'adr', '0002-locked.md'), 0o644);
    } catch {
      /* ignore */
    }
    rmSync(dir, { recursive: true, force: true });
  }
});

test('survey: an empty repo carries an empty `unreadable` list and null rootDocReferencesProduct', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-survey-clean-'));
  try {
    const s = runSurvey(dir);
    assert.deepEqual(s.unreadable, []);
    assert.equal(s.rootDocReferencesProduct, null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- ad-drift deterministic drift scan (ADR-0057, P2.2) ---
// The claude-code copy is executed; the byte-parity test in skills.test.js
// guarantees the codex twin is identical, so one execution covers both. The
// script emits the six deterministic drift checks (numbering, status,
// supersession, amendment-pairs, emoji, checkbox) as JSON; the SKILL.md body
// narrates them alongside its judgment checks (AGENTS/ARCHITECTURE match,
// business-context, scope-dup, index-dup, decoration refs, …), per ADR-0057.
const DRIFT = join(
  __dirname,
  '..',
  'src',
  'skills',
  'claude-code',
  'ad-drift',
  'scripts',
  'drift-scan.mjs'
);

function runScan(cwd) {
  const out = execFileSync('node', [DRIFT], { cwd, encoding: 'utf8', env: process.env });
  return JSON.parse(out);
}

test('drift-scan: numbering reports duplicates as drift and gaps as informational data', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-drift-num-'));
  try {
    mkdirSync(join(dir, 'doc', 'adr'), { recursive: true });
    writeFileSync(join(dir, 'doc', 'adr', '0001-a.md'), '# ADR\n\n**Status:** accepted\n');
    writeFileSync(join(dir, 'doc', 'adr', '0002-b.md'), '# ADR\n\n**Status:** accepted\n');
    // A second 0002 → duplicate number. And 0003 is missing → gap at 3 (0004 present).
    writeFileSync(join(dir, 'doc', 'adr', '0002-dupe.md'), '# ADR\n\n**Status:** accepted\n');
    writeFileSync(join(dir, 'doc', 'adr', '0004-d.md'), '# ADR\n\n**Status:** accepted\n');
    const s = runScan(dir);
    assert.deepEqual(s.numbering.adr.duplicates, ['0002'], 'duplicate NNNN is drift');
    assert.deepEqual(s.numbering.adr.gaps, [3], 'a missing number is a gap (archiving-expected, informational)');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('drift-scan: status flags a missing or out-of-enum Status, per artifact layer', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-drift-status-'));
  try {
    mkdirSync(join(dir, 'doc', 'adr'), { recursive: true });
    writeFileSync(join(dir, 'doc', 'adr', '0001-ok.md'), '# ADR\n\n**Status:** accepted\n');
    writeFileSync(join(dir, 'doc', 'adr', '0002-bad.md'), '# ADR\n\n**Status:** wip\n'); // not in enum
    writeFileSync(join(dir, 'doc', 'adr', '0003-none.md'), '# ADR\n\nno status line here\n');
    // Specs use a different enum; `wip` is invalid there too, `draft` is valid.
    mkdirSync(join(dir, 'doc', 'specs'), { recursive: true });
    writeFileSync(join(dir, 'doc', 'specs', '0001-ok.md'), '# Spec\n\n**Status:** draft\n');
    writeFileSync(join(dir, 'doc', 'specs', '0002-bad.md'), '# Spec\n\n**Status:** wip\n');
    const s = runScan(dir);
    const badAdr = s.status.adr.map((x) => x.slug).sort();
    assert.deepEqual(badAdr, ['0002-bad', '0003-none'], 'invalid + missing ADR Status flagged');
    assert.equal(s.status.adr.find((x) => x.slug === '0002-bad').status, 'wip');
    assert.equal(s.status.adr.find((x) => x.slug === '0003-none').status, null);
    assert.deepEqual(
      s.status.specs.map((x) => x.slug),
      ['0002-bad'],
      'a valid spec status is not flagged; an out-of-enum one is'
    );
    assert.ok(!('tasks' in s.status), 'tasks are not a scripted numbering/status layer (no task-drift category)');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('drift-scan: supersession flags a superseded-by target that does not exist', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-drift-super-'));
  try {
    mkdirSync(join(dir, 'doc', 'adr'), { recursive: true });
    writeFileSync(join(dir, 'doc', 'adr', '0001-live.md'), '# ADR\n\n**Status:** accepted\n');
    writeFileSync(
      join(dir, 'doc', 'adr', '0002-gone.md'),
      '# ADR\n\n**Status:** superseded by ADR-0099\n'
    );
    writeFileSync(
      join(dir, 'doc', 'adr', '0003-ok.md'),
      '# ADR\n\n**Status:** superseded by ADR-0001\n'
    );
    // A spec pointing at a missing SPEC target is flagged in the same list.
    mkdirSync(join(dir, 'doc', 'specs'), { recursive: true });
    writeFileSync(
      join(dir, 'doc', 'specs', '0001-x.md'),
      '# Spec\n\n**Status:** superseded by SPEC-0088\n'
    );
    const s = runScan(dir);
    assert.equal(s.supersession.length, 2, 'the dangling adr and spec supersessions are flagged');
    assert.ok(
      s.supersession.some(
        (x) => x.kind === 'adr' && x.from === '0002-gone' && x.target === 'ADR-0099' && x.targetExists === false
      ),
      'dangling ADR supersession'
    );
    assert.ok(
      s.supersession.some(
        (x) => x.kind === 'specs' && x.from === '0001-x' && x.target === 'SPEC-0088'
      ),
      'dangling SPEC supersession, tagged with the specs layer'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('drift-scan: amendment pairs flags an unpaired Amends / Amended-by relation', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-drift-amend-'));
  try {
    mkdirSync(join(dir, 'doc', 'adr'), { recursive: true });
    // Unpaired: 0010 amends 0011, but 0011 declares no Amended-by.
    writeFileSync(
      join(dir, 'doc', 'adr', '0010-a.md'),
      '# ADR\n\n**Status:** accepted\n**Amends:** ADR-0011\n'
    );
    writeFileSync(join(dir, 'doc', 'adr', '0011-b.md'), '# ADR\n\n**Status:** accepted\n');
    // Properly paired: 0012 amends 0013, 0013 declares Amended by 0012.
    writeFileSync(
      join(dir, 'doc', 'adr', '0012-c.md'),
      '# ADR\n\n**Status:** accepted\n**Amends:** ADR-0013\n'
    );
    writeFileSync(
      join(dir, 'doc', 'adr', '0013-d.md'),
      '# ADR\n\n**Status:** superseded by ADR-0012\n**Amended by:** ADR-0012\n'
    );
    // The reverse unpaired direction: an `Amended by` with no answering `Amends`.
    writeFileSync(
      join(dir, 'doc', 'adr', '0014-e.md'),
      '# ADR\n\n**Status:** accepted\n**Amended by:** ADR-0015\n'
    );
    writeFileSync(join(dir, 'doc', 'adr', '0015-f.md'), '# ADR\n\n**Status:** accepted\n');
    const s = runScan(dir);
    assert.equal(s.amendmentPairs.length, 2, 'both unpaired directions are flagged, the pair is not');
    assert.ok(
      s.amendmentPairs.some((f) => f.record === '0010-a' && f.field === 'Amends' && f.value === 'ADR-0011'),
      'unpaired Amends'
    );
    assert.ok(
      s.amendmentPairs.some((f) => f.record === '0014-e' && f.field === 'Amended by' && f.value === 'ADR-0015'),
      'unpaired Amended by (reverse direction)'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('drift-scan: emoji flags emoji in narrative docs, with the line number', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-drift-emoji-'));
  try {
    writeFileSync(join(dir, 'README.md'), '# Readme\n\nAll good here.\n');
    writeFileSync(join(dir, 'AGENTS.md'), '# Agents\n\nShip it \u{1F680} now.\n');
    const s = runScan(dir);
    assert.equal(s.emoji.length, 1, 'only the doc with an emoji is flagged');
    assert.equal(s.emoji[0].path, 'AGENTS.md');
    assert.equal(s.emoji[0].line, 3);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('drift-scan: checkbox flags checkbox UI in definition docs but not in tasks or fenced examples', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-drift-checkbox-'));
  try {
    // A definition doc with a real checkbox (drift) and a fenced example (not drift).
    writeFileSync(
      join(dir, 'AGENTS.md'),
      '# Agents\n\n- [ ] a real checkbox\n\n```\n- [ ] fenced example, illustrative\n```\n'
    );
    // Specs are decision-records — a checkbox in one is drift (ADR-0030 §1).
    mkdirSync(join(dir, 'doc', 'specs'), { recursive: true });
    writeFileSync(join(dir, 'doc', 'specs', '0001-s.md'), '# Spec\n\n**Status:** draft\n\n- [ ] req as checkbox\n');
    // Tasks legitimately use checkbox tracking UI — never flagged.
    mkdirSync(join(dir, 'doc', 'tasks'), { recursive: true });
    writeFileSync(join(dir, 'doc', 'tasks', '0001-t.md'), '# task\n\n**Status:** proposed\n\n- [ ] ac\n');
    const s = runScan(dir);
    assert.deepEqual(
      s.checkbox.map((c) => `${c.path}:${c.line}`).sort(),
      ['AGENTS.md:3', join('doc', 'specs', '0001-s.md') + ':5'],
      'definition-doc + spec checkboxes flagged; fenced example and task excluded'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('drift-scan: checkbox fence tracking respects the fence delimiter (char + length)', () => {
  // A CommonMark fence closes only on the same character, length >= the opener.
  // A naive any-fence toggle mis-parses nesting: a shorter/different fence line
  // inside a block must NOT toggle the state.
  const dir = mkdtempSync(join(tmpdir(), 'agentic-drift-fence-'));
  try {
    // Line 3 opens a 4-backtick fence; line 4 is a 3-backtick line that does
    // NOT close it (shorter); line 5's checkbox is therefore still fenced; line
    // 6 closes with 4 backticks; line 8's checkbox is real drift.
    writeFileSync(
      join(dir, 'GUIDELINES.md'),
      [
        '# Guidelines', // 1
        '', // 2
        '````', // 3 open (4 ticks)
        '```', // 4 inner 3-tick line — not a close
        '- [ ] still inside the 4-tick fence', // 5 fenced, not drift
        '````', // 6 close (4 ticks)
        '', // 7
        '- [ ] a real checkbox after the block', // 8 drift
      ].join('\n') + '\n'
    );
    const s = runScan(dir);
    assert.deepEqual(
      s.checkbox.map((c) => `${c.path}:${c.line}`),
      ['GUIDELINES.md:8'],
      'only the post-block checkbox is drift; the one inside the 4-tick fence is excluded'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('drift-scan: an empty repo yields all-clear checks and no crash', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-drift-empty-'));
  try {
    const s = runScan(dir);
    assert.deepEqual(s.numbering.adr, { gaps: [], duplicates: [] });
    assert.deepEqual(s.status.adr, []);
    assert.deepEqual(s.supersession, []);
    assert.deepEqual(s.amendmentPairs, []);
    assert.deepEqual(s.emoji, []);
    assert.deepEqual(s.checkbox, []);
    assert.deepEqual(s.unreadable, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('drift-scan: a present-but-unreadable artifact is surfaced in `unreadable`, never silent', (t) => {
  if (process.platform === 'win32' || process.getuid?.() === 0) {
    t.skip('chmod 000 does not block reads for this platform or user');
    return;
  }
  const dir = mkdtempSync(join(tmpdir(), 'agentic-drift-unreadable-'));
  try {
    mkdirSync(join(dir, 'doc', 'adr'), { recursive: true });
    const locked = join(dir, 'doc', 'adr', '0001-locked.md');
    writeFileSync(locked, '# ADR\n\n**Status:** accepted\n');
    chmodSync(locked, 0o000);
    const s = runScan(dir);
    const hit = s.unreadable.find((u) => u.path.includes('0001-locked.md'));
    assert.ok(hit, 'the unreadable ADR is surfaced, not swallowed');
    assert.equal(hit.code, 'EACCES');
  } finally {
    try {
      chmodSync(join(dir, 'doc', 'adr', '0001-locked.md'), 0o644);
    } catch {
      /* ignore */
    }
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- ad-archive terminal-artifact discovery (ADR-0057, P2.3) ---
// The claude-code copy is executed; the byte-parity test in skills.test.js
// guarantees the codex twin is identical. The script emits the read-only
// candidate discovery (Step 1); the SKILL.md body keeps the judgment: the
// accepted-ADR absorption gate, user-named legacy docs, and the git rm itself.
const TERMINAL = join(
  __dirname,
  '..',
  'src',
  'skills',
  'claude-code',
  'ad-archive',
  'scripts',
  'find-terminal.mjs'
);

function runTerminal(cwd) {
  const out = execFileSync('node', [TERMINAL], { cwd, encoding: 'utf8', env: process.env });
  return JSON.parse(out);
}

test('find-terminal: includes only terminal artifacts, per category, with metadata', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-terminal-'));
  try {
    mkdirSync(join(dir, 'doc', 'tasks'), { recursive: true });
    // Real tasks title the H1 as `# Task \`0001\`: ...` (backtick-wrapped number);
    // the slate strips that prefix to the descriptive title.
    writeFileSync(
      join(dir, 'doc', 'tasks', '0001-shipped.md'),
      '# Task `0001`: Apply the kit\n\n**Status:** done\n**Date:** 2026-05-08\n'
    );
    writeFileSync(join(dir, 'doc', 'tasks', '0002-wip.md'), '# task-0002\n\n**Status:** in-progress\n');
    mkdirSync(join(dir, 'doc', 'specs'), { recursive: true });
    writeFileSync(join(dir, 'doc', 'specs', '0001-live.md'), '# Spec 0001\n\n**Status:** shipped\n**Created:** 2026-06-01\n');
    writeFileSync(join(dir, 'doc', 'specs', '0002-open.md'), '# Spec 0002\n\n**Status:** accepted\n');
    mkdirSync(join(dir, 'doc', 'product'), { recursive: true });
    writeFileSync(join(dir, 'doc', 'product', 'PRD.md'), '# PRD\n\nStatus: superseded\nCreated: 2026-01-01\n');
    mkdirSync(join(dir, 'doc', 'adr'), { recursive: true });
    writeFileSync(
      join(dir, 'doc', 'adr', '0019-old.md'),
      '# ADR-0019: Domain layer\n\n**Status:** superseded by ADR-0027\n**Date:** 2026-05-10\n'
    );
    writeFileSync(join(dir, 'doc', 'adr', '0024-dead.md'), '# ADR-0024\n\n**Status:** deprecated\n');
    writeFileSync(join(dir, 'doc', 'adr', '0027-live.md'), '# ADR-0027\n\n**Status:** accepted\n');
    const t = runTerminal(dir);

    assert.deepEqual(t.tasks.map((x) => x.slug), ['0001-shipped'], 'only done tasks');
    assert.equal(t.tasks[0].status, 'done');
    assert.equal(t.tasks[0].created, '2026-05-08');
    assert.equal(t.tasks[0].title, 'Apply the kit', 'H1 stripped of the type-NNNN prefix');
    assert.equal(t.tasks[0].path, join('doc', 'tasks', '0001-shipped.md'));

    assert.deepEqual(t.specs.map((x) => x.slug), ['0001-live'], 'only shipped specs');
    assert.equal(t.specs[0].created, '2026-06-01');

    assert.deepEqual(t.prds.map((x) => x.slug), ['PRD'], 'only superseded PRDs');

    assert.deepEqual(t.adrs.map((x) => x.slug).sort(), ['0019-old', '0024-dead'], 'superseded + deprecated, NOT accepted');
    const superseded = t.adrs.find((x) => x.slug === '0019-old');
    assert.equal(superseded.status, 'superseded');
    assert.equal(superseded.supersededBy, 'ADR-0027', 'supersession target captured for the slate');
    const deprecated = t.adrs.find((x) => x.slug === '0024-dead');
    assert.equal(deprecated.status, 'deprecated');
    assert.equal(deprecated.supersededBy, null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('find-terminal: a spec superseded by another SPEC is excluded (chain target stays)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-terminal-super-'));
  try {
    mkdirSync(join(dir, 'doc', 'specs'), { recursive: true });
    writeFileSync(join(dir, 'doc', 'specs', '0001-old.md'), '# Spec\n\n**Status:** superseded by SPEC-0009\n');
    writeFileSync(join(dir, 'doc', 'specs', '0002-shipped.md'), '# Spec\n\n**Status:** shipped\n');
    const t = runTerminal(dir);
    assert.deepEqual(
      t.specs.map((x) => x.slug),
      ['0002-shipped'],
      'only shipped specs; a `superseded by SPEC-NNNN` spec is not a removal candidate'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('find-terminal: a prefix-less title carrying a number is preserved (no false strip)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-terminal-title-'));
  try {
    mkdirSync(join(dir, 'doc', 'tasks'), { recursive: true });
    // The H1 has no artifact-type prefix; "Fix 500:" must NOT be stripped.
    writeFileSync(join(dir, 'doc', 'tasks', '0001-t.md'), '# Fix 500: recover retries\n\n**Status:** done\n');
    const t = runTerminal(dir);
    assert.equal(t.tasks[0].title, 'Fix 500: recover retries');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('find-terminal: an empty repo yields empty categories and no crash', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-terminal-empty-'));
  try {
    const t = runTerminal(dir);
    assert.deepEqual(t, { tasks: [], specs: [], prds: [], adrs: [], unreadable: [] });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('find-terminal: a present-but-unreadable candidate is surfaced in `unreadable`', (t) => {
  if (process.platform === 'win32' || process.getuid?.() === 0) {
    t.skip('chmod 000 does not block reads for this platform or user');
    return;
  }
  const dir = mkdtempSync(join(tmpdir(), 'agentic-terminal-unreadable-'));
  try {
    mkdirSync(join(dir, 'doc', 'tasks'), { recursive: true });
    const locked = join(dir, 'doc', 'tasks', '0001-locked.md');
    writeFileSync(locked, '# task\n\n**Status:** done\n');
    chmodSync(locked, 0o000);
    const out = runTerminal(dir);
    const hit = out.unreadable.find((u) => u.path.includes('0001-locked.md'));
    assert.ok(hit, 'unreadable candidate surfaced');
    assert.equal(hit.code, 'EACCES');
    assert.deepEqual(out.tasks, [], 'an unreadable file is not silently included as a candidate');
  } finally {
    try {
      chmodSync(join(dir, 'doc', 'tasks', '0001-locked.md'), 0o644);
    } catch {
      /* ignore */
    }
    rmSync(dir, { recursive: true, force: true });
  }
});
