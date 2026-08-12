import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chmodSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync, mkdirSync, existsSync, symlinkSync } from 'node:fs';
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

// Interpolating a filesystem path straight into a RegExp is safe only on
// POSIX. A Windows path carries backslashes, and `C:\Users\...` reaches the
// engine as the escapes `\U`, `\A`, ... — a pattern that quietly matches
// something else instead of failing loudly. Escape before interpolating.
function reEscape(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
    assert.match(out, new RegExp(`^MACHINE-STORE: ${reEscape(machineStore)}$`, 'm'));
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
// and keeps the judgment (scenario classification and prioritization) as text
// per ADR-0057's agent-vs-script boundary.
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
    // State file → installed kit version.
    mkdirSync(join(dir, '.claude'), { recursive: true });
    writeFileSync(
      join(dir, '.claude', 'agentic-state.json'),
      JSON.stringify({ kitVersion: '9.9.9' })
    );

    const s = runSurvey(dir);

    assert.equal('profile' in s, false, 'install state does not classify project maturity');
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
    // Only unfinished tasks without a local Scope or Spec ref are navigation
    // orphans.
    // 0002-shipped predates Scope ref and is retained as history, not an
    // actionable finding; 0003 remains an unanchored proposed task.
    assert.deepEqual(s.tasks.orphans, ['0003-orphan']);
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

test('survey: empty repo has no kit version, zero counts, and no crash', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-survey-empty-'));
  try {
    const s = runSurvey(dir);
    assert.equal('profile' in s, false);
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

test('survey: a local Scope ref keeps a task out of the orphan list', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-survey-task-scope-'));
  try {
    mkdirSync(join(dir, 'doc', 'product'), { recursive: true });
    writeFileSync(join(dir, 'doc', 'product', 'PRD.md'), '# PRD\n\nStatus: accepted\n');
    mkdirSync(join(dir, 'doc', 'tasks'), { recursive: true });
    writeFileSync(
      join(dir, 'doc', 'tasks', '0001-local-scope.md'),
      '# task\n\n**Status:** proposed\n**Scope ref:** doc/product/PRD.md — Later tier\n**Spec ref:**\n**Board ref:**\n'
    );

    const survey = runSurvey(dir);
    assert.deepEqual(survey.tasks.orphans, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('survey: a Board ref alone does not anchor an unfinished task', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-survey-board-only-'));
  try {
    mkdirSync(join(dir, 'doc', 'tasks'), { recursive: true });
    writeFileSync(
      join(dir, 'doc', 'tasks', '0001-board-only.md'),
      '# task\n\n**Status:** proposed\n**Scope ref:**\n**Spec ref:**\n**Board ref:** https://board.example/task/1\n'
    );

    const survey = runSurvey(dir);
    assert.deepEqual(survey.tasks.orphans, ['0001-board-only']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- ad-task scope-anchor preflight (ADR-0067) -----------------------------
const TASK_SCOPE = join(
  __dirname,
  '..',
  'src',
  'skills',
  'claude-code',
  'ad-task',
  'scripts',
  'scope-anchors.mjs'
);

function runTaskScope(cwd, scopeRef) {
  const args = [TASK_SCOPE];
  if (scopeRef !== undefined) args.push(scopeRef);
  return JSON.parse(execFileSync('node', args, { cwd, encoding: 'utf8' }));
}

test('scope-anchors: lists only repository-local product, spec, accepted ADR, and root anchors', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-task-scope-'));
  try {
    writeFileSync(join(dir, 'AGENTS.md'), '# guide\n');
    writeFileSync(join(dir, 'ARCHITECTURE.md'), '# architecture\n');
    mkdirSync(join(dir, 'doc', 'product'), { recursive: true });
    writeFileSync(join(dir, 'doc', 'product', 'PRD.md'), '# product\n');
    mkdirSync(join(dir, 'doc', 'specs'), { recursive: true });
    writeFileSync(join(dir, 'doc', 'specs', '0001-install.md'), '# spec\n');
    mkdirSync(join(dir, 'doc', 'adr'), { recursive: true });
    writeFileSync(join(dir, 'doc', 'adr', '0001-accepted.md'), '# adr\n\n**Status:** accepted\n');
    writeFileSync(join(dir, 'doc', 'adr', '0002-proposed.md'), '# adr\n\n**Status:** proposed\n');

    const report = runTaskScope(dir);
    // macOS exposes /var through the /private/var symlink to child processes.
    assert.equal(realpathSync(report.cwd), realpathSync(dir));
    assert.equal(report.gitRoot, null);
    assert.deepEqual(report.anchors, [
      'AGENTS.md',
      'ARCHITECTURE.md',
      'doc/adr/0001-accepted.md',
      'doc/product/PRD.md',
      'doc/specs/0001-install.md',
    ]);
    assert.equal(report.verification, null);
    assert.deepEqual(report.unreadable, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('scope-anchors: verifies an exact local anchor and rejects an external path', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-task-scope-verify-'));
  try {
    writeFileSync(join(dir, 'README.md'), '# readme\n');

    assert.deepEqual(runTaskScope(dir, 'README.md').verification, {
      path: 'README.md',
      valid: true,
    });
    assert.deepEqual(runTaskScope(dir, '../other-repo/doc/product/PRD.md').verification, {
      path: '../other-repo/doc/product/PRD.md',
      valid: false,
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('scope-anchors: surfaces an unreadable ADR instead of silently omitting it', (t) => {
  if (process.platform === 'win32' || process.getuid?.() === 0) {
    t.skip('chmod 000 does not block reads for this platform or user');
    return;
  }
  const dir = mkdtempSync(join(tmpdir(), 'agentic-task-scope-unreadable-'));
  try {
    mkdirSync(join(dir, 'doc', 'adr'), { recursive: true });
    const locked = join(dir, 'doc', 'adr', '0001-locked.md');
    writeFileSync(locked, '# adr\n\n**Status:** accepted\n');
    chmodSync(locked, 0o000);

    const report = runTaskScope(dir);
    assert.deepEqual(report.unreadable, [{ path: 'doc/adr/0001-locked.md', code: 'EACCES' }]);
  } finally {
    try {
      chmodSync(join(dir, 'doc', 'adr', '0001-locked.md'), 0o644);
    } catch {
      /* ignore */
    }
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

test('survey: kit version falls back to the .agents state file when .claude is absent', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-survey-agents-state-'));
  try {
    mkdirSync(join(dir, '.agents'), { recursive: true });
    writeFileSync(
      join(dir, '.agents', 'agentic-state.json'),
      JSON.stringify({ kitVersion: '1.2.3' })
    );
    const s = runSurvey(dir);
    assert.equal(s.kitVersion, '1.2.3');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('survey: a corrupt state file has no kit version and never crashes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-survey-badstate-'));
  try {
    mkdirSync(join(dir, '.claude'), { recursive: true });
    writeFileSync(join(dir, '.claude', 'agentic-state.json'), '{ not valid json');
    const s = runSurvey(dir);
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
// script emits the seven deterministic drift checks (numbering, status,
// supersession, amendment-pairs, emoji, checkbox, constitution reciprocity)
// as JSON; the SKILL.md body
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

test('drift-scan: flags a mapped AGENTS section without its GUIDELINES pointer', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-drift-reciprocity-'));
  try {
    writeFileSync(join(dir, 'GUIDELINES.md'), '# Guidelines\n\n## 2. Code standards\n');
    writeFileSync(
      join(dir, 'AGENTS.md'),
      '# Agents\n\n## Code Style\n\n- Use named exports.\n- Use single quotes.\n'
    );

    const s = runScan(dir);

    assert.deepEqual(s.constitutionReciprocity, {
      applicable: true,
      duplicateSections: [{ section: 'Code Style', guidelinesSection: 2, line: 3 }],
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('drift-scan: accepts a mapped AGENTS section with a GUIDELINES pointer', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-drift-reciprocity-pointer-'));
  try {
    writeFileSync(join(dir, 'GUIDELINES.md'), '# Guidelines\n\n## 2. Code standards\n');
    writeFileSync(
      join(dir, 'AGENTS.md'),
      '# Agents\n\n## Code Style\n\nSee [GUIDELINES.md](GUIDELINES.md) §2 for the full reference.\n\n- Use named exports.\n'
    );

    const s = runScan(dir);

    assert.deepEqual(s.constitutionReciprocity, {
      applicable: true,
      duplicateSections: [],
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('drift-scan: accepts a plain-text GUIDELINES pointer in the mapped section', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-drift-reciprocity-plain-'));
  try {
    writeFileSync(join(dir, 'GUIDELINES.md'), '# Guidelines\n\n## 8. Quality gates\n');
    writeFileSync(
      join(dir, 'AGENTS.md'),
      '# Agents\n\n## Quality Gates\n\nSee GUIDELINES.md §8 for the full reference.\n'
    );

    const s = runScan(dir);

    assert.deepEqual(s.constitutionReciprocity, {
      applicable: true,
      duplicateSections: [],
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('drift-scan: rejects a pointer outside its mapped AGENTS section', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-drift-reciprocity-outside-'));
  try {
    writeFileSync(join(dir, 'GUIDELINES.md'), '# Guidelines\n\n## 2. Code standards\n');
    writeFileSync(
      join(dir, 'AGENTS.md'),
      '# Agents\n\n## Code Style\n\n- Use named exports.\n\n## Gotchas\n\nSee GUIDELINES.md §2 for the full reference.\n'
    );

    const s = runScan(dir);

    assert.deepEqual(s.constitutionReciprocity, {
      applicable: true,
      duplicateSections: [{ section: 'Code Style', guidelinesSection: 2, line: 3 }],
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('drift-scan: detects a mapped heading with optional ATX closing markers', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-drift-reciprocity-atx-'));
  try {
    writeFileSync(join(dir, 'GUIDELINES.md'), '# Guidelines\n\n## 2. Code standards\n');
    writeFileSync(
      join(dir, 'AGENTS.md'),
      '# Agents\n\n## Code Style ##\n\n- Use named exports.\n'
    );

    const s = runScan(dir);

    assert.deepEqual(s.constitutionReciprocity, {
      applicable: true,
      duplicateSections: [{ section: 'Code Style', guidelinesSection: 2, line: 3 }],
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('drift-scan: ignores a mapped-looking heading inside a fenced code block', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-drift-reciprocity-fence-'));
  try {
    writeFileSync(join(dir, 'GUIDELINES.md'), '# Guidelines\n\n## 2. Code standards\n');
    writeFileSync(
      join(dir, 'AGENTS.md'),
      [
        '# Agents',
        '',
        '```markdown',
        '## Code Style',
        '- An illustrative rule.',
        '```',
        '',
        '## Code Style',
        '',
        'See GUIDELINES.md §2 for the full reference.',
      ].join('\n') + '\n'
    );

    const s = runScan(dir);

    assert.deepEqual(s.constitutionReciprocity, {
      applicable: true,
      duplicateSections: [],
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('drift-scan: ignores a GUIDELINES pointer inside a fenced code block', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-drift-reciprocity-pointer-fence-'));
  try {
    writeFileSync(join(dir, 'GUIDELINES.md'), '# Guidelines\n\n## 2. Code standards\n');
    writeFileSync(
      join(dir, 'AGENTS.md'),
      [
        '# Agents',
        '',
        '## Code Style',
        '',
        '```markdown',
        'See GUIDELINES.md §2 for the full reference.',
        '```',
        '',
        '- Use named exports.',
      ].join('\n') + '\n'
    );

    const s = runScan(dir);

    assert.deepEqual(s.constitutionReciprocity, {
      applicable: true,
      duplicateSections: [{ section: 'Code Style', guidelinesSection: 2, line: 3 }],
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('drift-scan: skips constitution reciprocity without both root documents', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-drift-reciprocity-absent-'));
  try {
    writeFileSync(join(dir, 'AGENTS.md'), '# Agents\n\n## Code Style\n\n- Use named exports.\n');

    const s = runScan(dir);

    assert.deepEqual(s.constitutionReciprocity, {
      applicable: false,
      duplicateSections: [],
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('drift-scan: surfaces an unreadable GUIDELINES file during reciprocity', (t) => {
  if (process.platform === 'win32' || process.getuid?.() === 0) {
    t.skip('chmod 000 does not block reads for this platform or user');
    return;
  }
  const dir = mkdtempSync(join(tmpdir(), 'agentic-drift-reciprocity-unreadable-'));
  const guidelines = join(dir, 'GUIDELINES.md');
  try {
    writeFileSync(join(dir, 'AGENTS.md'), '# Agents\n\n## Code Style\n\n- Use named exports.\n');
    writeFileSync(guidelines, '# Guidelines\n');
    chmodSync(guidelines, 0o000);

    const s = runScan(dir);

    assert.deepEqual(s.constitutionReciprocity, {
      applicable: false,
      duplicateSections: [],
    });
    assert.ok(
      s.unreadable.some((entry) => entry.path === 'GUIDELINES.md' && entry.code === 'EACCES'),
      'a content-read failure must be surfaced, not treated as an absent guide'
    );
  } finally {
    try {
      chmodSync(guidelines, 0o644);
    } catch {
      // The fixture may not have reached chmod before an earlier assertion.
    }
    rmSync(dir, { recursive: true, force: true });
  }
});

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
    assert.deepEqual(s.constitutionReciprocity, { applicable: false, duplicateSections: [] });
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

// --- ad-hooks deterministic detector (ADR-0057, P2.4) ----------------------
// The Claude Code copy is executed; test/skills.test.js enforces that the
// Codex copy is byte-identical. The detector reports low-freedom facts only;
// runner choice and gate edits stay in the skill body.
const HOOKS = join(
  __dirname,
  '..',
  'src',
  'skills',
  'claude-code',
  'ad-hooks',
  'scripts',
  'detect-hooks.mjs'
);

function runHooksDetector(cwd) {
  const out = execFileSync('node', [HOOKS], { cwd, encoding: 'utf8', env: process.env });
  return JSON.parse(out);
}

test('detect-hooks: reports stack, runner, CI/pre-push commands, and uncovered CI work', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-hooks-detector-'));
  try {
    writeFileSync(join(dir, 'package.json'), '{"name":"fixture"}\n');
    writeFileSync(
      join(dir, 'lefthook.yml'),
      [
        'pre-push:',
        '  commands:',
        '    test:',
        '      run: npm test',
        '',
      ].join('\n')
    );
    mkdirSync(join(dir, '.github', 'workflows'), { recursive: true });
    writeFileSync(
      join(dir, '.github', 'workflows', 'test.yml'),
      [
        'name: test',
        'jobs:',
        '  test:',
        '    strategy:',
        '      matrix:',
        "        node-version: ['20.x', '22.x']",
        '    steps:',
        '      - run: npm test',
        '      - run: npm run lint',
        '',
      ].join('\n')
    );

    const report = runHooksDetector(dir);
    assert.deepEqual(report.stacks, ['node']);
    assert.deepEqual(report.runners, ['lefthook']);
    assert.deepEqual(report.prePush, {
      files: ['lefthook.yml'],
      commands: ['npm test'],
    });
    assert.deepEqual(report.ci.files, ['.github/workflows/test.yml']);
    assert.deepEqual(report.ci.commands, ['npm test', 'npm run lint']);
    assert.deepEqual(report.ci.matrices, [{ key: 'node-version', values: ['20.x', '22.x'] }]);
    assert.deepEqual(report.drift.ciOnlyCommands, ['npm run lint']);
    assert.deepEqual(report.unreadable, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('detect-hooks: does not count a runner-installed hook stub as a native runner', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-hooks-managed-stub-'));
  try {
    writeFileSync(join(dir, 'lefthook.yml'), 'pre-push:\n  commands: {}\n');
    mkdirSync(join(dir, '.git', 'hooks'), { recursive: true });
    writeFileSync(join(dir, '.git', 'hooks', 'pre-push'), '#!/bin/sh\nlefthook run pre-push\n');

    const report = runHooksDetector(dir);
    assert.deepEqual(report.runners, ['lefthook']);
    assert.deepEqual(report.prePush.files, ['lefthook.yml']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('detect-hooks: reads shell commands from a Husky pre-push hook', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-hooks-husky-'));
  try {
    mkdirSync(join(dir, '.husky'));
    writeFileSync(join(dir, '.husky', 'pre-push'), '#!/bin/sh\nnpm test\nnpm run lint\n');
    mkdirSync(join(dir, '.github', 'workflows'), { recursive: true });
    writeFileSync(
      join(dir, '.github', 'workflows', 'test.yml'),
      'steps:\n  - run: npm test\n  - run: npm run lint\n'
    );

    const report = runHooksDetector(dir);
    assert.deepEqual(report.runners, ['husky']);
    assert.deepEqual(report.prePush.commands, ['npm test', 'npm run lint']);
    assert.deepEqual(report.drift.ciOnlyCommands, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('detect-hooks: reads shell commands from a native pre-push hook', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-hooks-native-'));
  try {
    mkdirSync(join(dir, '.git', 'hooks'), { recursive: true });
    writeFileSync(join(dir, '.git', 'hooks', 'pre-push'), '#!/bin/sh\nnpm test\n');
    mkdirSync(join(dir, '.github', 'workflows'), { recursive: true });
    writeFileSync(join(dir, '.github', 'workflows', 'test.yml'), 'steps:\n  - run: npm test\n');

    const report = runHooksDetector(dir);
    assert.deepEqual(report.runners, ['native']);
    assert.deepEqual(report.prePush.commands, ['npm test']);
    assert.deepEqual(report.drift.ciOnlyCommands, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('detect-hooks: reports a native hook beside another runner', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-hooks-mixed-native-'));
  try {
    mkdirSync(join(dir, '.husky'));
    mkdirSync(join(dir, '.git', 'hooks'), { recursive: true });
    writeFileSync(join(dir, '.git', 'hooks', 'pre-push'), '#!/bin/sh\nnpm test\n');
    mkdirSync(join(dir, '.github', 'workflows'), { recursive: true });
    writeFileSync(join(dir, '.github', 'workflows', 'test.yml'), 'steps:\n  - run: npm test\n');

    const report = runHooksDetector(dir);
    assert.deepEqual(report.runners, ['husky', 'native']);
    assert.deepEqual(report.prePush.commands, ['npm test']);
    assert.deepEqual(report.drift.ciOnlyCommands, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('detect-hooks: resolves native hooks from a linked Git worktree', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-hooks-linked-worktree-'));
  const main = join(dir, 'main');
  const linked = join(dir, 'linked');
  try {
    mkdirSync(main);
    execFileSync('git', ['init', '-q', main]);
    writeFileSync(join(main, 'README.md'), 'fixture\n');
    execFileSync('git', ['-C', main, 'add', 'README.md']);
    execFileSync('git', [
      '-C',
      main,
      '-c',
      'user.name=fixture',
      '-c',
      'user.email=fixture@example.test',
      'commit',
      '-qm',
      'fixture',
    ]);
    execFileSync('git', ['-C', main, 'worktree', 'add', '-qb', 'linked', linked]);
    writeFileSync(join(main, '.git', 'hooks', 'pre-push'), '#!/bin/sh\nnpm test\n');
    mkdirSync(join(linked, '.github', 'workflows'), { recursive: true });
    writeFileSync(join(linked, '.github', 'workflows', 'test.yml'), 'steps:\n  - run: npm test\n');

    const report = runHooksDetector(linked);
    assert.deepEqual(report.runners, ['native']);
    assert.deepEqual(report.prePush.commands, ['npm test']);
    assert.deepEqual(report.drift.ciOnlyCommands, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('detect-hooks: an unreadable native hook does not imply a native runner', (t) => {
  if (process.platform === 'win32' || process.getuid?.() === 0) {
    t.skip('chmod 000 does not block reads for this platform or user');
    return;
  }
  const dir = mkdtempSync(join(tmpdir(), 'agentic-hooks-unreadable-native-'));
  try {
    mkdirSync(join(dir, '.git', 'hooks'), { recursive: true });
    const hook = join(dir, '.git', 'hooks', 'pre-push');
    writeFileSync(hook, '#!/bin/sh\nnpm test\n');
    chmodSync(hook, 0o000);

    const report = runHooksDetector(dir);
    assert.deepEqual(report.runners, []);
    assert.deepEqual(report.unreadable, [{ path: '.git/hooks/pre-push', code: 'EACCES' }]);
  } finally {
    try {
      chmodSync(join(dir, '.git', 'hooks', 'pre-push'), 0o755);
    } catch {
      /* ignore */
    }
    rmSync(dir, { recursive: true, force: true });
  }
});

test('detect-hooks: an empty readable native hook is still a native runner', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-hooks-empty-native-'));
  try {
    mkdirSync(join(dir, '.git', 'hooks'), { recursive: true });
    writeFileSync(join(dir, '.git', 'hooks', 'pre-push'), '');

    const report = runHooksDetector(dir);
    assert.deepEqual(report.runners, ['native']);
    assert.deepEqual(report.prePush, {
      files: ['.git/hooks/pre-push'],
      commands: [],
    });
    assert.deepEqual(report.unreadable, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('detect-hooks: reads a pre-commit pre-push entry and recognizes pytest', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-hooks-pre-commit-'));
  try {
    writeFileSync(
      join(dir, '.pre-commit-config.yaml'),
      [
        'repos:',
        '  - repo: local',
        '    hooks:',
        '      - id: test',
        '        entry: pytest',
        '        language: system',
        '        stages: [pre-push]',
        '',
      ].join('\n')
    );
    mkdirSync(join(dir, '.github', 'workflows'), { recursive: true });
    writeFileSync(join(dir, '.github', 'workflows', 'test.yml'), 'steps:\n  - run: pytest\n');

    const report = runHooksDetector(dir);
    assert.deepEqual(report.runners, ['pre-commit']);
    assert.deepEqual(report.prePush, {
      files: ['.pre-commit-config.yaml'],
      commands: ['pytest'],
    });
    assert.deepEqual(report.drift.ciOnlyCommands, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('detect-hooks: an unreadable workflows directory is surfaced, never silent', (t) => {
  if (process.platform === 'win32' || process.getuid?.() === 0) {
    t.skip('chmod 000 does not block reads for this platform or user');
    return;
  }
  const dir = mkdtempSync(join(tmpdir(), 'agentic-hooks-unreadable-directory-'));
  try {
    const workflows = join(dir, '.github', 'workflows');
    mkdirSync(workflows, { recursive: true });
    chmodSync(workflows, 0o000);

    const report = runHooksDetector(dir);
    assert.deepEqual(report.unreadable, [{ path: '.github/workflows', code: 'EACCES' }]);
  } finally {
    try {
      chmodSync(join(dir, '.github', 'workflows'), 0o755);
    } catch {
      /* ignore */
    }
    rmSync(dir, { recursive: true, force: true });
  }
});

test('detect-hooks: an unreadable CI config is surfaced, never silent', (t) => {
  if (process.platform === 'win32' || process.getuid?.() === 0) {
    t.skip('chmod 000 does not block reads for this platform or user');
    return;
  }
  const dir = mkdtempSync(join(tmpdir(), 'agentic-hooks-unreadable-'));
  try {
    mkdirSync(join(dir, '.github', 'workflows'), { recursive: true });
    const locked = join(dir, '.github', 'workflows', 'test.yml');
    writeFileSync(locked, 'jobs: {}\n');
    chmodSync(locked, 0o000);

    const report = runHooksDetector(dir);
    assert.deepEqual(report.unreadable, [{ path: '.github/workflows/test.yml', code: 'EACCES' }]);
  } finally {
    try {
      chmodSync(join(dir, '.github', 'workflows', 'test.yml'), 0o644);
    } catch {
      /* ignore */
    }
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- shared next-NNNN detector (ADR-0057, P2.5) -----------------------------
const NUMBER_SKILLS = ['ad-adr', 'ad-spec', 'ad-task', 'ad-spike'];
const NUMBER_SCRIPTS = NUMBER_SKILLS.map((skill) =>
  join(__dirname, '..', 'src', 'skills', 'claude-code', skill, 'scripts', 'next-number.mjs')
);

function runNumberDetector(cwd, directory, environment = {}) {
  const out = execFileSync('node', [NUMBER_SCRIPTS[0], directory], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...environment },
  });
  return JSON.parse(out);
}

test('next-number: reports sorted artifact numbers and the slot after the maximum', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-next-number-'));
  try {
    const artifacts = join(dir, 'doc', 'adr');
    mkdirSync(artifacts, { recursive: true });
    for (const name of ['0001-first.md', '0042-answer.md', 'not-an-artifact.md', '10000-overflow.md']) {
      writeFileSync(join(artifacts, name), 'fixture\n');
    }

    assert.deepEqual(runNumberDetector(dir, 'doc/adr'), {
      directory: 'doc/adr',
      numbers: ['0001', '0042'],
      next: '0043',
      exhausted: false,
      unreadable: [],
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('next-number: an absent artifact directory starts at 0001', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-next-number-empty-'));
  try {
    assert.deepEqual(runNumberDetector(dir, 'spikes'), {
      directory: 'spikes',
      numbers: [],
      next: '0001',
      exhausted: false,
      unreadable: [],
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('next-number: an initialized repository with no commits starts at 0001', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-next-number-unborn-head-'));
  try {
    execFileSync('git', ['init', '-q', dir]);

    assert.deepEqual(runNumberDetector(dir, 'doc/adr'), {
      directory: 'doc/adr',
      numbers: [],
      next: '0001',
      exhausted: false,
      unreadable: [],
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('next-number: an unreadable artifact directory blocks numbering', (t) => {
  if (process.platform === 'win32' || process.getuid?.() === 0) {
    t.skip('chmod 000 does not block reads for this platform or user');
    return;
  }
  const dir = mkdtempSync(join(tmpdir(), 'agentic-next-number-unreadable-'));
  try {
    const artifacts = join(dir, 'doc', 'specs');
    mkdirSync(artifacts, { recursive: true });
    chmodSync(artifacts, 0o000);

    assert.deepEqual(runNumberDetector(dir, 'doc/specs'), {
      directory: 'doc/specs',
      numbers: [],
      next: null,
      exhausted: false,
      unreadable: [{ path: 'doc/specs', code: 'EACCES' }],
    });
  } finally {
    try { chmodSync(join(dir, 'doc', 'specs'), 0o755); } catch { /* ignore */ }
    rmSync(dir, { recursive: true, force: true });
  }
});

test('next-number: 9999 is explicit exhaustion, not a five-digit artifact number', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-next-number-exhausted-'));
  try {
    mkdirSync(join(dir, 'doc', 'tasks'), { recursive: true });
    writeFileSync(join(dir, 'doc', 'tasks', '9999-last.md'), 'fixture\n');

    assert.deepEqual(runNumberDetector(dir, 'doc/tasks'), {
      directory: 'doc/tasks',
      numbers: ['9999'],
      next: null,
      exhausted: true,
      unreadable: [],
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('next-number: an archived highest artifact remains reserved from Git history', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-next-number-ledger-'));
  try {
    const artifacts = join(dir, 'doc', 'adr');
    mkdirSync(artifacts, { recursive: true });
    execFileSync('git', ['init', '-q', dir]);
    writeFileSync(join(artifacts, '0042-archived.md'), 'fixture\n');
    execFileSync('git', ['-C', dir, 'add', 'doc/adr/0042-archived.md']);
    execFileSync('git', ['-C', dir, '-c', 'user.name=fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'fixture']);
    execFileSync('git', ['-C', dir, 'rm', '-q', 'doc/adr/0042-archived.md']);
    execFileSync('git', ['-C', dir, '-c', 'user.name=fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'archive']);

    assert.equal(runNumberDetector(dir, 'doc/adr').next, '0043');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('next-number: broken Git metadata blocks ledger-dependent numbering', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-next-number-broken-git-'));
  try {
    writeFileSync(join(dir, '.git'), 'gitdir: missing\n');

    const report = runNumberDetector(dir, 'doc/adr');
    assert.equal(report.next, null);
    assert.deepEqual(report.unreadable, [{ path: 'git-history:doc/adr', code: 'GIT_ERROR' }]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('next-number: a configured but unreadable Git directory blocks numbering', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-next-number-git-dir-'));
  try {
    const report = runNumberDetector(dir, 'doc/adr', {
      GIT_DIR: join(dir, 'missing-git-directory'),
    });
    assert.equal(report.next, null);
    assert.deepEqual(report.unreadable, [{ path: 'git-history:doc/adr', code: 'GIT_ERROR' }]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('next-number: all four skills ship the same self-contained detector on both hosts', () => {
  const source = readFileSync(NUMBER_SCRIPTS[0]);
  for (const skill of NUMBER_SKILLS) {
    for (const host of ['claude-code', 'codex']) {
      const path = join(__dirname, '..', 'src', 'skills', host, skill, 'scripts', 'next-number.mjs');
      assert.deepEqual(readFileSync(path), source, `${host}/${skill} must share the detector bytes`);
    }
  }
});

// --- GitHub CLI preflight (ADR-0057, P2.6) ---------------------------------
const GH_PREFLIGHT_SKILLS = ['ad-pr', 'ad-merge'];
const GH_PREFLIGHT_SCRIPTS = GH_PREFLIGHT_SKILLS.map((skill) =>
  join(__dirname, '..', 'src', 'skills', 'claude-code', skill, 'scripts', 'gh-preflight.mjs')
);

function runGhPreflight(cwd, args, environment = {}) {
  const out = execFileSync('node', [GH_PREFLIGHT_SCRIPTS[0], ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...environment },
  });
  return JSON.parse(out);
}

// A shebang plus the execute bit makes a wrapper runnable on POSIX and on
// nothing else: Windows has neither, so the fake gh was unspawnable and every
// test using it failed there. Write it as a .mjs instead — gh-preflight runs a
// Node-script wrapper under its own node binary, shell-free, on both platforms.
function writeFakeGh(dir, responses) {
  const path = join(dir, 'fake-gh.mjs');
  writeFileSync(path, `if (process.env.AGENTIC_TEST_GH_REQUIRE_CLEAN_GIT_ENV === 'true' && ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE'].some((name) => process.env[name])) process.exit(97);
const responses = JSON.parse(process.env.AGENTIC_TEST_GH_RESPONSES || '{}');
const response = responses[process.argv.slice(2).join('\\u0000')] || { status: 0, stdout: '' };
process.stdout.write(response.stdout || '');
process.stderr.write(response.stderr || '');
process.exit(response.status || 0);
`);
  return {
    AGENTIC_GH: path,
    AGENTIC_TEST_GH_RESPONSES: JSON.stringify(responses),
  };
}

function commitFixture(repo, subject) {
  execFileSync('git', ['-C', repo, 'add', '.']);
  execFileSync('git', ['-C', repo, '-c', 'user.name=fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', subject]);
}

function pushedFeatureFixture(dir) {
  execFileSync('git', ['init', '-q', dir]);
  writeFileSync(join(dir, 'README.md'), 'fixture\n');
  commitFixture(dir, 'initial');
  execFileSync('git', ['-C', dir, 'branch', '-M', 'main']);
  execFileSync('git', ['-C', dir, 'checkout', '-qb', 'feat/preflight']);
  execFileSync('git', ['-C', dir, 'remote', 'add', 'origin', 'https://example.test/fixture.git']);
  execFileSync('git', ['-C', dir, 'update-ref', 'refs/remotes/origin/feat/preflight', 'HEAD']);
  execFileSync('git', ['-C', dir, 'branch', '--set-upstream-to=origin/feat/preflight', 'feat/preflight']);
}

test('gh-preflight: PR reports authenticated GitHub and a pushed branch', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-gh-preflight-pr-'));
  try {
    pushedFeatureFixture(dir);
    const env = writeFakeGh(dir, {
      '--version': { stdout: 'gh version fixture\n' },
      'auth\u0000status': { stdout: 'fixture authenticated\n' },
      'repo\u0000view\u0000--json\u0000defaultBranchRef': {
        stdout: '{"defaultBranchRef":{"name":"main"}}\n',
      },
    });

    assert.deepEqual(runGhPreflight(dir, ['pr'], env), {
      operation: 'pr',
      github: { command: env.AGENTIC_GH, installed: true, authenticated: true },
      git: { branch: 'feat/preflight', upstream: 'origin/feat/preflight', aheadOfUpstream: 0 },
      baseBranch: 'main',
      pullRequest: null,
      pullRequestState: 'not-requested',
      checks: [],
      mergeMethods: null,
      targetRepository: null,
      errors: [],
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('gh-preflight: strips inherited Git worktree variables before GitHub probes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-gh-preflight-clean-env-'));
  try {
    pushedFeatureFixture(dir);
    const env = writeFakeGh(dir, {
      '--version': { stdout: 'gh version fixture\n' },
      'auth\u0000status': { stdout: 'fixture authenticated\n' },
      'repo\u0000view\u0000--json\u0000defaultBranchRef': {
        stdout: '{"defaultBranchRef":{"name":"main"}}\n',
      },
    });
    const report = runGhPreflight(dir, ['pr'], {
      ...env,
      AGENTIC_TEST_GH_REQUIRE_CLEAN_GIT_ENV: 'true',
      GIT_DIR: join(dir, 'wrong-git-dir'),
      GIT_WORK_TREE: join(dir, 'wrong-work-tree'),
      GIT_INDEX_FILE: join(dir, 'wrong-index'),
    });
    assert.equal(report.github.authenticated, true);
    assert.equal(report.git.branch, 'feat/preflight');
    assert.deepEqual(report.errors, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('gh-preflight: merge reports the PR, checks, and allowed merge methods', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-gh-preflight-merge-'));
  try {
    pushedFeatureFixture(dir);
    const env = writeFakeGh(dir, {
      '--version': { stdout: 'gh version fixture\n' },
      'auth\u0000status': { stdout: 'fixture authenticated\n' },
      'repo\u0000view\u0000--json\u0000defaultBranchRef': {
        stdout: '{"defaultBranchRef":{"name":"main"}}\n',
      },
      'pr\u0000view\u000042\u0000--json\u0000number,url,headRefName,baseRefName,mergeable,mergeStateStatus,reviews': {
        stdout: '{"number":42,"headRefName":"feat/preflight","baseRefName":"main","mergeable":"MERGEABLE","mergeStateStatus":"CLEAN","reviews":[]}\n',
      },
      'pr\u0000checks\u000042\u0000--json\u0000name,bucket,state,link': {
        stdout: '[{"name":"test","bucket":"pass","state":"SUCCESS","link":"https://example.test/check"}]\n',
      },
      'repo\u0000view\u0000--json\u0000mergeCommitAllowed,squashMergeAllowed,rebaseMergeAllowed': {
        stdout: '{"mergeCommitAllowed":true,"squashMergeAllowed":true,"rebaseMergeAllowed":false}\n',
      },
    });

    const report = runGhPreflight(dir, ['merge', '42'], env);
    assert.equal(report.operation, 'merge');
    assert.equal(report.pullRequest.number, 42);
    assert.equal(report.pullRequestState, 'present');
    assert.equal(report.pullRequest.mergeStateStatus, 'CLEAN');
    assert.deepEqual(report.checks, [{ name: 'test', bucket: 'pass', state: 'SUCCESS', link: 'https://example.test/check' }]);
    assert.deepEqual(report.mergeMethods, { mergeCommitAllowed: true, squashMergeAllowed: true, rebaseMergeAllowed: false });
    assert.deepEqual(report.errors, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('gh-preflight: pending checks retain their JSON despite gh exit code 8', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-gh-preflight-pending-'));
  try {
    pushedFeatureFixture(dir);
    const env = writeFakeGh(dir, {
      '--version': { stdout: 'gh version fixture\n' },
      'auth\u0000status': { stdout: 'fixture authenticated\n' },
      'repo\u0000view\u0000--json\u0000defaultBranchRef': {
        stdout: '{"defaultBranchRef":{"name":"main"}}\n',
      },
      'pr\u0000view\u000042\u0000--json\u0000number,url,headRefName,baseRefName,mergeable,mergeStateStatus,reviews': {
        stdout: '{"number":42,"headRefName":"feat/preflight","baseRefName":"main","mergeable":"UNKNOWN","mergeStateStatus":"UNKNOWN","reviews":[]}\n',
      },
      'pr\u0000checks\u000042\u0000--json\u0000name,bucket,state,link': {
        status: 8,
        stdout: '[{"name":"test","bucket":"pending","state":"IN_PROGRESS","link":"https://example.test/check"}]\n',
      },
      'repo\u0000view\u0000--json\u0000mergeCommitAllowed,squashMergeAllowed,rebaseMergeAllowed': {
        stdout: '{"mergeCommitAllowed":true,"squashMergeAllowed":true,"rebaseMergeAllowed":false}\n',
      },
    });

    const report = runGhPreflight(dir, ['merge', '42'], env);
    assert.deepEqual(report.checks, [{ name: 'test', bucket: 'pending', state: 'IN_PROGRESS', link: 'https://example.test/check' }]);
    assert.deepEqual(report.errors, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('gh-preflight: a PR URL scopes checks and merge policy to its repository', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-gh-preflight-cross-repo-'));
  try {
    pushedFeatureFixture(dir);
    const url = 'https://github.com/acme/other/pull/42';
    const env = writeFakeGh(dir, {
      '--version': { stdout: 'gh version fixture\n' },
      'auth\u0000status': { stdout: 'fixture authenticated\n' },
      'repo\u0000view\u0000--json\u0000defaultBranchRef': {
        stdout: '{"defaultBranchRef":{"name":"main"}}\n',
      },
      'pr\u0000view\u0000https://github.com/acme/other/pull/42\u0000--json\u0000number,url,headRefName,baseRefName,mergeable,mergeStateStatus,reviews': {
        stdout: '{"number":42,"url":"https://github.com/acme/other/pull/42","headRefName":"feat/preflight","baseRefName":"main","mergeable":"MERGEABLE","mergeStateStatus":"CLEAN","reviews":[]}\n',
      },
      'pr\u0000checks\u0000https://github.com/acme/other/pull/42\u0000--json\u0000name,bucket,state,link\u0000--repo\u0000acme/other': {
        stdout: '[{"name":"test","bucket":"pass","state":"SUCCESS","link":"https://example.test/check"}]\n',
      },
      'repo\u0000view\u0000acme/other\u0000--json\u0000mergeCommitAllowed,squashMergeAllowed,rebaseMergeAllowed': {
        stdout: '{"mergeCommitAllowed":false,"squashMergeAllowed":true,"rebaseMergeAllowed":false}\n',
      },
    });

    const report = runGhPreflight(dir, ['merge', url], env);
    assert.deepEqual(report.checks, [{ name: 'test', bucket: 'pass', state: 'SUCCESS', link: 'https://example.test/check' }]);
    assert.deepEqual(report.mergeMethods, { mergeCommitAllowed: false, squashMergeAllowed: true, rebaseMergeAllowed: false });
    assert.equal(report.targetRepository, 'acme/other');
    assert.deepEqual(report.errors, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('gh-preflight: a missing PR is distinct from a failed PR probe', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-gh-preflight-absent-pr-'));
  try {
    pushedFeatureFixture(dir);
    const env = writeFakeGh(dir, {
      '--version': { stdout: 'gh version fixture\n' },
      'auth\u0000status': { stdout: 'fixture authenticated\n' },
      'repo\u0000view\u0000--json\u0000defaultBranchRef': {
        stdout: '{"defaultBranchRef":{"name":"main"}}\n',
      },
      'pr\u0000view\u0000--json\u0000number,url,headRefName,baseRefName,mergeable,mergeStateStatus,reviews': {
        status: 1,
        stderr: 'no pull requests found for branch "feat/preflight"\n',
      },
    });

    const report = runGhPreflight(dir, ['merge'], env);
    assert.equal(report.pullRequest, null);
    assert.equal(report.pullRequestState, 'absent');
    assert.equal(report.targetRepository, null);
    assert.deepEqual(report.errors, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('gh-preflight: a failed PR probe is not reported as an absent PR', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-gh-preflight-pr-error-'));
  try {
    pushedFeatureFixture(dir);
    const env = writeFakeGh(dir, {
      '--version': { stdout: 'gh version fixture\n' },
      'auth\u0000status': { stdout: 'fixture authenticated\n' },
      'repo\u0000view\u0000--json\u0000defaultBranchRef': {
        stdout: '{"defaultBranchRef":{"name":"main"}}\n',
      },
      'pr\u0000view\u0000--json\u0000number,url,headRefName,baseRefName,mergeable,mergeStateStatus,reviews': {
        status: 1,
        stderr: 'network unavailable\n',
      },
    });

    const report = runGhPreflight(dir, ['merge'], env);
    assert.equal(report.pullRequest, null);
    assert.equal(report.pullRequestState, 'unavailable');
    assert.deepEqual(report.errors, [{ probe: 'gh pr view', code: 'EXIT_1' }]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('gh-preflight: an unavailable GitHub CLI is structured rather than thrown', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-gh-preflight-missing-'));
  try {
    pushedFeatureFixture(dir);
    const missing = join(dir, 'missing-gh');
    const report = runGhPreflight(dir, ['pr'], { AGENTIC_GH: missing });
    assert.deepEqual(report.github, { command: missing, installed: false, authenticated: null });
    assert.deepEqual(report.errors, [{ probe: 'gh --version', code: 'ENOENT' }]);
    assert.equal(report.baseBranch, null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('gh-preflight: both skills ship the same self-contained detector on both hosts', () => {
  const source = readFileSync(GH_PREFLIGHT_SCRIPTS[0]);
  for (const skill of GH_PREFLIGHT_SKILLS) {
    for (const host of ['claude-code', 'codex']) {
      const path = join(__dirname, '..', 'src', 'skills', host, skill, 'scripts', 'gh-preflight.mjs');
      assert.deepEqual(readFileSync(path), source, `${host}/${skill} must share the detector bytes`);
    }
  }
});

// --- project stack signals (ADR-0057, P2.7) --------------------------------
// The detector owns only low-freedom filesystem facts. Each skill keeps the
// judgment about which source files to read and what the facts imply.
const PROJECT_SIGNAL_SKILLS = ['ad-bootstrap', 'ad-architecture', 'ad-guidelines', 'ad-diagnose'];
const PROJECT_SIGNAL_SCRIPTS = PROJECT_SIGNAL_SKILLS.map((skill) =>
  join(__dirname, '..', 'src', 'skills', 'claude-code', skill, 'scripts', 'project-signals.mjs')
);

function runProjectSignals(cwd, document = 'AGENTS.md') {
  const out = execFileSync('node', [PROJECT_SIGNAL_SCRIPTS[0], document], {
    cwd,
    encoding: 'utf8',
    env: process.env,
  });
  return JSON.parse(out);
}

test('project-signals: reports the bootstrap mode and every stack marker', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-project-signals-'));
  try {
    writeFileSync(join(dir, 'package.json'), '{"name":"fixture"}\n');
    writeFileSync(join(dir, 'pyproject.toml'), '[project]\nname = "fixture"\n');
    writeFileSync(join(dir, 'go.mod'), 'module fixture\n');
    assert.deepEqual(runProjectSignals(dir), {
      document: 'AGENTS.md',
      mode: 'brownfield',
      stacks: ['node', 'python', 'go'],
      unreadable: [],
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('project-signals: distinguishes audit, greenfield, and architecture bootstrap modes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-project-signals-modes-'));
  try {
    assert.equal(runProjectSignals(dir).mode, 'greenfield');
    assert.equal(runProjectSignals(dir, 'ARCHITECTURE.md').mode, 'bootstrap');
    writeFileSync(join(dir, 'AGENTS.md'), '# agents\n');
    assert.equal(runProjectSignals(dir).mode, 'audit');
    writeFileSync(join(dir, 'ARCHITECTURE.md'), '# architecture\n');
    assert.equal(runProjectSignals(dir, 'ARCHITECTURE.md').mode, 'audit');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('project-signals: ignores kit state because project maturity is inferred from code', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-project-signals-invalid-state-'));
  try {
    mkdirSync(join(dir, '.claude'));
    writeFileSync(join(dir, '.claude', 'agentic-state.json'), '{not json}\n');

    assert.deepEqual(runProjectSignals(dir), {
      document: 'AGENTS.md',
      mode: 'greenfield',
      stacks: [],
      unreadable: [],
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('project-signals: ignores a non-object kit state without a crash', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-project-signals-non-object-state-'));
  try {
    mkdirSync(join(dir, '.claude'));
    writeFileSync(join(dir, '.claude', 'agentic-state.json'), 'null\n');

    const report = runProjectSignals(dir);
    assert.deepEqual(report.unreadable, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('project-signals: ignores an unreadable kit-state path', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-project-signals-unreadable-state-'));
  try {
    mkdirSync(join(dir, '.claude', 'agentic-state.json'), { recursive: true });

    const report = runProjectSignals(dir);
    assert.deepEqual(report.unreadable, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('project-signals: all four skills ship the same self-contained detector on both hosts', () => {
  const source = readFileSync(PROJECT_SIGNAL_SCRIPTS[0]);
  for (const skill of PROJECT_SIGNAL_SKILLS) {
    for (const host of ['claude-code', 'codex']) {
      const path = join(__dirname, '..', 'src', 'skills', host, skill, 'scripts', 'project-signals.mjs');
      assert.deepEqual(readFileSync(path), source, `${host}/${skill} must share the detector bytes`);
    }
  }
});

// --- community-document signals (task-0046) ---------------------------------
const COMMUNITY_DOC_SCRIPTS = ['claude-code', 'codex'].map((host) =>
  join(
    __dirname,
    '..',
    'src',
    'skills',
    host,
    'ad-community-docs',
    'scripts',
    'community-doc-signals.mjs'
  )
);

function runCommunityDocSignals(cwd) {
  const out = execFileSync('node', [COMMUNITY_DOC_SCRIPTS[0]], {
    cwd,
    encoding: 'utf8',
    env: process.env,
  });
  return JSON.parse(out);
}

test('community-doc-signals: reports conventional document locations without inferring policy', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-community-docs-'));
  try {
    mkdirSync(join(dir, '.github'));
    mkdirSync(join(dir, 'docs'));
    writeFileSync(join(dir, '.github', 'CONTRIBUTING.md'), '# Contributing\n');
    writeFileSync(join(dir, 'docs', 'SECURITY.md'), '# Security\n');

    assert.deepEqual(runCommunityDocSignals(dir), {
      documents: {
        contributing: ['.github/CONTRIBUTING.md'],
        security: ['docs/SECURITY.md'],
      },
      unreadable: [],
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('community-doc-signals: reports every conventional location in stable order', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-community-docs-order-'));
  try {
    mkdirSync(join(dir, '.github'));
    mkdirSync(join(dir, 'docs'));
    for (const path of ['CONTRIBUTING.md', '.github/CONTRIBUTING.md', 'docs/CONTRIBUTING.md']) {
      writeFileSync(join(dir, path), '# Contributing\n');
    }

    const report = runCommunityDocSignals(dir);
    assert.deepEqual(report.documents.contributing, [
      'CONTRIBUTING.md',
      '.github/CONTRIBUTING.md',
      'docs/CONTRIBUTING.md',
    ]);
    assert.deepEqual(report.documents.security, []);
    assert.deepEqual(report.unreadable, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('community-doc-signals: keeps an unreadable document in unreadable instead of swallowing it', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-community-docs-unreadable-'));
  try {
    mkdirSync(join(dir, 'SECURITY.md'));

    const report = runCommunityDocSignals(dir);
    assert.deepEqual(report.documents, { contributing: [], security: ['SECURITY.md'] });
    assert.deepEqual(report.unreadable, [{ path: 'SECURITY.md', code: 'EISDIR' }]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('community-doc-signals: source copies are byte-identical across hosts', () => {
  assert.deepEqual(readFileSync(COMMUNITY_DOC_SCRIPTS[0]), readFileSync(COMMUNITY_DOC_SCRIPTS[1]));
});

// --- host-global rules resolution (ADR-0057, P2.8) -------------------------
// This is the sole intentionally host-divergent helper: the host's own global
// rules path wins, while the other host's paths remain fallback candidates.
const GLOBAL_RULES_SCRIPTS = {
  'claude-code': join(__dirname, '..', 'src', 'skills', 'claude-code', 'ad-rules', 'scripts', 'resolve-global-rules.mjs'),
  codex: join(__dirname, '..', 'src', 'skills', 'codex', 'ad-rules', 'scripts', 'resolve-global-rules.mjs'),
};

function runGlobalRules(cwd, host, home) {
  const out = execFileSync('node', [GLOBAL_RULES_SCRIPTS[host]], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, HOME: home, USERPROFILE: home },
  });
  return JSON.parse(out);
}

test('resolve-global-rules: Claude resolves a global symlink and reports both ends', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-global-rules-claude-'));
  try {
    const home = join(dir, 'home');
    const target = join(home, 'workflow', 'AGENTS.ale.md');
    const link = join(home, '.claude', 'CLAUDE.md');
    mkdirSync(join(home, 'workflow'), { recursive: true });
    mkdirSync(join(home, '.claude'));
    writeFileSync(target, '# global rules\n');
    symlinkSync(join('..', 'workflow', 'AGENTS.ale.md'), link, 'file');
    const resolvedTarget = realpathSync(target);

    assert.deepEqual(runGlobalRules(dir, 'claude-code', home), {
      host: 'claude-code',
      primary: {
        path: link,
        state: 'symlink',
        linkTarget: join('..', 'workflow', 'AGENTS.ale.md'),
        resolvedPath: resolvedTarget,
      },
      sources: [{
        path: link,
        state: 'symlink',
        linkTarget: join('..', 'workflow', 'AGENTS.ale.md'),
        resolvedPath: resolvedTarget,
      }],
      unreadable: [],
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('resolve-global-rules: Codex prioritizes its own global rules over Claude fallback', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-global-rules-codex-'));
  try {
    const home = join(dir, 'home');
    const codex = join(home, '.codex', 'AGENTS.md');
    const claude = join(home, '.claude', 'CLAUDE.md');
    mkdirSync(join(home, '.codex'), { recursive: true });
    mkdirSync(join(home, '.claude'));
    writeFileSync(codex, '# codex rules\n');
    writeFileSync(claude, '# claude rules\n');

    const report = runGlobalRules(dir, 'codex', home);
    assert.deepEqual(report.primary, {
      path: codex,
      state: 'file',
      linkTarget: null,
      resolvedPath: codex,
    });
    assert.deepEqual(report.sources.map((source) => source.path), [codex, claude]);
    assert.deepEqual(report.unreadable, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('resolve-global-rules: a broken global link is distinct from an absent layer', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-global-rules-broken-'));
  try {
    const home = join(dir, 'home');
    const link = join(home, '.claude', 'CLAUDE.md');
    mkdirSync(join(home, '.claude'), { recursive: true });
    symlinkSync(join('..', 'missing', 'AGENTS.md'), link, 'file');

    const report = runGlobalRules(dir, 'claude-code', home);
    assert.equal(report.primary, null);
    assert.deepEqual(report.sources, [{
      path: link,
      state: 'broken-symlink',
      // The script reports the target the OS stored, and Windows stores it
      // with native separators whatever form it was created from. Build the
      // expectation the same way the other paths here are built, rather than
      // pinning a POSIX-shaped literal the platform never returns.
      linkTarget: join('..', 'missing', 'AGENTS.md'),
      resolvedPath: null,
    }]);
    assert.deepEqual(report.unreadable, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('resolve-global-rules: no canonical file is a clean absent layer', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-global-rules-absent-'));
  try {
    const home = join(dir, 'home');
    mkdirSync(home);

    assert.deepEqual(runGlobalRules(dir, 'claude-code', home), {
      host: 'claude-code',
      primary: null,
      sources: [],
      unreadable: [],
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('resolve-global-rules: an unreadable global file is not selected as primary', (t) => {
  if (process.platform === 'win32' || process.getuid?.() === 0) {
    t.skip('chmod 000 does not block reads for this platform or user');
    return;
  }
  const dir = mkdtempSync(join(tmpdir(), 'agentic-global-rules-unreadable-'));
  const home = join(dir, 'home');
  const file = join(home, '.claude', 'CLAUDE.md');
  try {
    mkdirSync(join(home, '.claude'), { recursive: true });
    writeFileSync(file, '# global rules\n');
    chmodSync(file, 0o000);

    const report = runGlobalRules(dir, 'claude-code', home);
    assert.equal(report.primary, null);
    assert.deepEqual(report.sources, [{
      path: file,
      state: 'unreadable',
      linkTarget: null,
      resolvedPath: file,
    }]);
    assert.deepEqual(report.unreadable, [{ path: file, code: 'EACCES' }]);
  } finally {
    try { chmodSync(file, 0o644); } catch { /* ignore */ }
    rmSync(dir, { recursive: true, force: true });
  }
});
