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
