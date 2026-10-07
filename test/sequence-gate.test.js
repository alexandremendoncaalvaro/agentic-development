import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ADR-0089, task-0107, GROUND-0038: the gate-run receipt and the shadow
// sequence gate, exercised through their command lines. The claude-code
// copies run; byte parity covers the codex twins.
const SCRIPTS = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'skills',
  'claude-code',
  'ad-hooks',
  'scripts'
);
const GATE_RUN = join(SCRIPTS, 'gate-run.mjs');
const SEQUENCE_GATE = join(SCRIPTS, 'sequence-gate.mjs');

function cleanEnv(extra = {}) {
  const env = { ...process.env, AD_SEQUENCE_GATE: '', ...extra };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  delete env.GIT_INDEX_FILE;
  return env;
}

function git(repo, ...args) {
  return execFileSync(
    'git',
    ['-C', repo, '-c', 'user.name=fixture', '-c', 'user.email=fixture@example.test', ...args],
    { encoding: 'utf8', env: cleanEnv() }
  ).trim();
}

function fixtureRepo() {
  const repo = mkdtempSync(join(tmpdir(), 'sequence-gate-repo-'));
  git(repo, 'init', '-q');
  writeFileSync(join(repo, 'a.txt'), 'one\n');
  git(repo, 'add', '-A');
  git(repo, 'commit', '-qm', 'base');
  return repo;
}

function recordRun(repo, exit = 0) {
  execFileSync(
    'node',
    [GATE_RUN, 'record', '--command', 'npm run verify', '--exit', String(exit)],
    {
      cwd: repo,
      encoding: 'utf8',
      env: cleanEnv(),
    }
  );
}

// execFileSync throws on a non-zero exit, so every call also asserts the
// shadow contract: always exit 0.
function runGate(repo, command, extraEnv = {}) {
  const evidenceDir = mkdtempSync(join(tmpdir(), 'sequence-gate-evidence-'));
  const event = {
    hook_event_name: 'PreToolUse',
    session_id: 'sess-gate',
    cwd: repo,
    tool_name: 'Bash',
    tool_input: { command },
  };
  const stdout = execFileSync('node', [SEQUENCE_GATE], {
    input: JSON.stringify(event),
    encoding: 'utf8',
    env: cleanEnv({ AD_SEQUENCE_GATE_EVIDENCE_DIR: evidenceDir, ...extraEnv }),
  });
  const file = join(evidenceDir, 'sess-gate.jsonl');
  const lines = existsSync(file)
    ? readFileSync(file, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line))
    : [];
  return { stdout, lines };
}

test('sequence-gate: a passing gate run recorded before the commit clears a git push of that commit', () => {
  // 'one' to 'two' keeps the size: a stat-trusting receipt would miss it.
  const repo = fixtureRepo();
  writeFileSync(join(repo, 'a.txt'), 'two\n');
  writeFileSync(join(repo, 'b.txt'), 'new\n');
  recordRun(repo);
  git(repo, 'add', '-A');
  git(repo, 'commit', '-qm', 'tested change');

  const { stdout, lines } = runGate(repo, 'git push -u origin feature');
  assert.equal(stdout, '', 'shadow mode prints nothing');
  assert.equal(lines.length, 1);
  assert.equal(lines[0].gate, 'sequence-gate');
  assert.equal(lines[0].check, 'gate-run');
  assert.equal(lines[0].state, 'clear');
  assert.equal(lines[0].action, 'git push');
  assert.equal(lines[0].tree, git(repo, 'rev-parse', 'HEAD^{tree}'));
});

test('sequence-gate: no receipt before gh pr create is a would-block naming the missing receipt', () => {
  const repo = fixtureRepo();
  const { lines } = runGate(repo, 'GH_HOST=github.com gh pr create --fill');
  assert.equal(lines[0].state, 'would-block');
  assert.equal(lines[0].action, 'gh pr create');
  assert.deepEqual(lines[0].missing, ['gate-run']);
  assert.match(lines[0].reproduction, /gate-run\.mjs record/);
});

test('sequence-gate: a code change after the receipt makes it stale', () => {
  const repo = fixtureRepo();
  recordRun(repo);
  writeFileSync(join(repo, 'a.txt'), 'changed after the run\n');
  git(repo, 'commit', '-qam', 'untested change');
  assert.equal(runGate(repo, 'git push').lines[0].state, 'would-block');
});

test('sequence-gate: a change only to receipt-neutral paths keeps the receipt fresh', () => {
  const repo = fixtureRepo();
  recordRun(repo);
  mkdirSync(join(repo, 'doc', 'tasks'), { recursive: true });
  writeFileSync(join(repo, 'doc', 'tasks', '0001-x.md'), 'notes\n');
  git(repo, 'add', '-A');
  git(repo, 'commit', '-qm', 'task notes only');
  assert.equal(runGate(repo, 'git push').lines[0].state, 'clear');
});

test('sequence-gate: .agentic/gates.json replaces the receipt-neutral list', () => {
  const repo = fixtureRepo();
  mkdirSync(join(repo, '.agentic'), { recursive: true });
  writeFileSync(join(repo, '.agentic', 'gates.json'), '{"receiptNeutral": ["notes/*.md"]}\n');
  recordRun(repo);
  mkdirSync(join(repo, 'doc', 'tasks'), { recursive: true });
  writeFileSync(join(repo, 'doc', 'tasks', '0001-x.md'), 'notes\n');
  git(repo, 'add', '-A');
  git(repo, 'commit', '-qm', 'task notes, no longer neutral');
  assert.equal(runGate(repo, 'git push').lines[0].state, 'would-block');
});

test('sequence-gate: a receipt of a failed run covers nothing', () => {
  const repo = fixtureRepo();
  recordRun(repo, 1);
  assert.equal(runGate(repo, 'git push').lines[0].state, 'would-block');
});

test('sequence-gate: unrelated, non-Bash, malformed or switched-off input leaves no line', () => {
  const repo = fixtureRepo();
  assert.equal(runGate(repo, 'git status').lines.length, 0);
  assert.equal(runGate(repo, 'echo pushing later').lines.length, 0);
  assert.equal(runGate(repo, 'git push', { AD_SEQUENCE_GATE: '0' }).lines.length, 0);
  const evidenceDir = mkdtempSync(join(tmpdir(), 'sequence-gate-evidence-'));
  const writeEvent = JSON.stringify({
    session_id: 'sess-gate',
    cwd: repo,
    tool_name: 'Write',
    tool_input: { command: 'git push' },
  });
  for (const input of ['', 'not json', '[]', writeEvent]) {
    const out = execFileSync('node', [SEQUENCE_GATE], {
      input,
      encoding: 'utf8',
      env: cleanEnv({ AD_SEQUENCE_GATE_EVIDENCE_DIR: evidenceDir }),
    });
    assert.equal(out, '');
  }
  assert.equal(existsSync(join(evidenceDir, 'sess-gate.jsonl')), false);
});

test('gate-run: a malformed invocation exits 64 and records nothing', () => {
  const repo = fixtureRepo();
  const run = spawnSync('node', [GATE_RUN, 'record', '--command', 'x'], {
    cwd: repo,
    encoding: 'utf8',
    env: cleanEnv(),
  });
  assert.equal(run.status, 64);
  assert.equal(existsSync(join(repo, '.agentic', 'receipts', 'gate-run.jsonl')), false);
});

test('sequence-gate: a code file renamed into a receipt-neutral path still makes the receipt stale', () => {
  const repo = fixtureRepo();
  mkdirSync(join(repo, 'src'), { recursive: true });
  writeFileSync(join(repo, 'src', 'a.js'), 'export const a = 1;\n');
  git(repo, 'add', '-A');
  git(repo, 'commit', '-qm', 'code');
  recordRun(repo);
  mkdirSync(join(repo, 'doc', 'tasks'), { recursive: true });
  git(repo, 'mv', 'src/a.js', 'doc/tasks/a.js');
  git(repo, 'commit', '-qm', 'move code out of src');
  assert.equal(runGate(repo, 'git push').lines[0].state, 'would-block');
});

test('sequence-gate: a receipt-neutral path with non-ASCII characters still matches its glob', () => {
  const repo = fixtureRepo();
  recordRun(repo);
  mkdirSync(join(repo, 'doc', 'tasks'), { recursive: true });
  writeFileSync(join(repo, 'doc', 'tasks', '0001-ação.md'), 'notes\n');
  git(repo, 'add', '-A');
  git(repo, 'commit', '-qm', 'task notes with an accent');
  assert.equal(runGate(repo, 'git push').lines[0].state, 'clear');
});

test('sequence-gate: git global options before push are still a push', () => {
  const repo = fixtureRepo();
  for (const command of [
    'git -C . push',
    'git --no-pager push origin x',
    'git -c push.default=current push',
  ]) {
    assert.equal(runGate(repo, command).lines[0]?.action, 'git push', command);
  }
});

test('sequence-gate: a malformed gates.json is a runtime-unavailable line, never a failed hook', () => {
  const repo = fixtureRepo();
  mkdirSync(join(repo, '.agentic'), { recursive: true });
  writeFileSync(join(repo, '.agentic', 'gates.json'), '{ not json');
  recordRun(repo);
  assert.equal(runGate(repo, 'git push').lines[0].state, 'runtime-unavailable');
});

test('sequence-gate: a Codex-shaped PreToolUse event is read the same way', () => {
  const repo = fixtureRepo();
  const evidenceDir = mkdtempSync(join(tmpdir(), 'sequence-gate-evidence-'));
  const event = {
    hook_event_name: 'PreToolUse',
    session_id: 'sess-codex',
    transcript_path: null,
    cwd: repo,
    model: 'gpt-5-codex',
    turn_id: 'turn-1',
    tool_name: 'Bash',
    tool_use_id: 'call-1',
    tool_input: { command: 'gh pr create --fill' },
  };
  execFileSync('node', [SEQUENCE_GATE], {
    input: JSON.stringify(event),
    encoding: 'utf8',
    env: cleanEnv({ AD_SEQUENCE_GATE_EVIDENCE_DIR: evidenceDir }),
  });
  const line = JSON.parse(readFileSync(join(evidenceDir, 'sess-codex.jsonl'), 'utf8'));
  assert.equal(line.action, 'gh pr create');
  assert.equal(line.state, 'would-block');
});

test('gate-run: outside a git repository it records nothing, explains why, and exits 0', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gate-run-no-repo-'));
  const run = spawnSync(
    'node',
    [GATE_RUN, 'record', '--command', 'npm run verify', '--exit', '0'],
    {
      cwd: dir,
      encoding: 'utf8',
      env: cleanEnv({ GIT_CEILING_DIRECTORIES: tmpdir() }),
    }
  );
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stderr, /gate-run: no receipt recorded/);
  assert.equal(existsSync(join(dir, '.agentic')), false);
});
