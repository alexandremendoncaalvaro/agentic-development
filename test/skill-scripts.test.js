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
