import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chmodSync, mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
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
