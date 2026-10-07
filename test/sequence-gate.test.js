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
  const [first] = readFileSync(join(evidenceDir, 'sess-codex.jsonl'), 'utf8').split('\n');
  const line = JSON.parse(first);
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

test('sequence-gate: a quoted option argument before push is still a push; other git verbs are not', () => {
  const repo = fixtureRepo();
  for (const command of ['git -C "my dir" push', "git -c user.name='A B' push"]) {
    assert.equal(runGate(repo, command).lines[0]?.action, 'git push', command);
  }
  for (const command of [
    'git commit -m x',
    'git status',
    'git stash push',
    'git remote add push u',
  ]) {
    assert.equal(runGate(repo, command).lines.length, 0, command);
  }
});

test('sequence-gate: torn receipt lines are counted on the evidence line, not dropped silently', () => {
  const repo = fixtureRepo();
  recordRun(repo);
  writeFileSync(join(repo, '.agentic', 'receipts', 'gate-run.jsonl'), '{"tree": "torn\n', {
    flag: 'a',
  });
  const [line] = runGate(repo, 'git push').lines;
  assert.equal(line.state, 'clear');
  assert.equal(line.unreadable_receipts, 1);
});

// Task 0108, GROUND-0040: review and audit receipts before pull request
// actions, keyed to the reviewed commit's tree.
function writeReview(repo, targetSha, stamp = '20261007T120000Z') {
  mkdirSync(join(repo, '.agentic', 'reviews'), { recursive: true });
  writeFileSync(
    join(repo, '.agentic', 'reviews', `${stamp}-branch-vs-main-verdicts.md`),
    `Target-SHA: ${targetSha}\n\n## Standards Findings\n\nnone\n\n## Spec Findings\n\nnone\n`
  );
}

function linesFor(lines, check) {
  return lines.filter((line) => line.check === check);
}

test('sequence-gate: gh pr merge without a review receipt is a review would-block', () => {
  const repo = fixtureRepo();
  const { stdout, lines } = runGate(repo, 'gh pr merge 12 --squash');
  assert.equal(stdout, '');
  const [review] = linesFor(lines, 'review');
  assert.equal(review.action, 'gh pr merge');
  assert.equal(review.state, 'would-block');
  assert.deepEqual(review.missing, ['review']);
  assert.match(review.reproduction, /ad-review/);
});

test('sequence-gate: a review of HEAD clears the review check', () => {
  const repo = fixtureRepo();
  writeReview(repo, git(repo, 'rev-parse', 'HEAD'));
  const [review] = linesFor(runGate(repo, 'gh pr merge').lines, 'review');
  assert.equal(review.state, 'clear');
  assert.deepEqual(review.missing, []);
  assert.equal(review.receipt, git(repo, 'rev-parse', 'HEAD'));
});

test('sequence-gate: a code change after the review makes the review stale', () => {
  const repo = fixtureRepo();
  writeReview(repo, git(repo, 'rev-parse', 'HEAD'));
  writeFileSync(join(repo, 'a.txt'), 'changed after review\n');
  git(repo, 'commit', '-qam', 'unreviewed change');
  assert.equal(linesFor(runGate(repo, 'gh pr merge').lines, 'review')[0].state, 'would-block');
});

test('sequence-gate: rewording the reviewed commit keeps the review fresh', () => {
  const repo = fixtureRepo();
  writeReview(repo, git(repo, 'rev-parse', 'HEAD'));
  git(repo, 'commit', '-q', '--amend', '-m', 'reworded');
  assert.equal(linesFor(runGate(repo, 'gh pr merge').lines, 'review')[0].state, 'clear');
});

test('sequence-gate: a working-tree review or an unresolvable SHA is no review receipt', () => {
  const repo = fixtureRepo();
  mkdirSync(join(repo, '.agentic', 'reviews'), { recursive: true });
  writeFileSync(
    join(repo, '.agentic', 'reviews', '20261007T110000Z-working-tree-verdicts.md'),
    'Target-SHA: none (working tree)\n'
  );
  writeReview(repo, 'f'.repeat(40));
  const [review] = linesFor(runGate(repo, 'gh pr merge').lines, 'review');
  assert.equal(review.state, 'would-block');
  assert.equal(review.unreadable_receipts, 1);
});

function writeAudit(repo, target, stamp = '20261007T130000Z') {
  mkdirSync(join(repo, '.agentic', 'reviews'), { recursive: true });
  const summary = {
    target,
    findings: [{ id: '1', severity: 'major', disposition: 'still-open' }],
  };
  writeFileSync(
    join(repo, '.agentic', 'reviews', `${stamp}-audit-branch-summary.json`),
    `${JSON.stringify(summary)}\n`
  );
}

test('sequence-gate: gh pr merge without an audit summary is an audit would-block', () => {
  const repo = fixtureRepo();
  const [audit] = linesFor(runGate(repo, 'gh pr merge').lines, 'audit');
  assert.equal(audit.state, 'would-block');
  assert.deepEqual(audit.missing, ['audit']);
  assert.match(audit.reproduction, /ad-audit/);
});

test('sequence-gate: an audit summary of HEAD clears the audit check, open findings included', () => {
  const repo = fixtureRepo();
  writeAudit(repo, git(repo, 'rev-parse', 'HEAD'));
  const [audit] = linesFor(runGate(repo, 'gh pr merge').lines, 'audit');
  assert.equal(audit.state, 'clear');
  assert.equal(audit.receipt, git(repo, 'rev-parse', 'HEAD'));
});

test('sequence-gate: each pull request action writes one line per check it requires', () => {
  const repo = fixtureRepo();
  const checksOf = (command) => runGate(repo, command).lines.map((line) => line.check);
  assert.deepEqual(checksOf('gh pr create --fill'), ['gate-run', 'review', 'audit']);
  assert.deepEqual(checksOf('gh pr ready 12'), ['review', 'audit']);
  assert.deepEqual(checksOf('gh pr merge 12'), ['review', 'audit']);
  assert.deepEqual(checksOf('git push'), ['gate-run']);
  assert.deepEqual(checksOf('gh pr view 12'), []);
});

function writeGates(repo, config) {
  mkdirSync(join(repo, '.agentic'), { recursive: true });
  writeFileSync(join(repo, '.agentic', 'gates.json'), `${JSON.stringify(config)}\n`);
}

test('sequence-gate: gates.json turns a check off for the repository', () => {
  const repo = fixtureRepo();
  writeGates(repo, { checks: { review: false, audit: false } });
  const checks = runGate(repo, 'gh pr create').lines.map((line) => line.check);
  assert.deepEqual(checks, ['gate-run']);
  assert.deepEqual(runGate(repo, 'gh pr merge').lines, []);
});

test('sequence-gate: a review command in gates.json reads bot review evidence for HEAD', () => {
  const repo = fixtureRepo();
  const head = git(repo, 'rev-parse', 'HEAD');
  const exitOnHead = [
    'node',
    '-e',
    `process.exit(process.env.AGENTIC_HEAD_SHA === '${head}' ? 0 : 1)`,
  ];
  writeGates(repo, { checks: { review: { command: exitOnHead } } });
  const [review] = linesFor(runGate(repo, 'gh pr merge').lines, 'review');
  assert.equal(review.state, 'clear');
  assert.equal(review.receipt, 'command');
});

test('sequence-gate: a review command that fails is a would-block; one that times out could not read', () => {
  const repo = fixtureRepo();
  writeGates(repo, { checks: { review: { command: ['node', '-e', 'process.exit(1)'] } } });
  assert.equal(linesFor(runGate(repo, 'gh pr merge').lines, 'review')[0].state, 'would-block');
  writeGates(repo, {
    checks: {
      review: { command: ['node', '-e', 'setTimeout(() => {}, 5000)'], timeoutSeconds: 0.5 },
    },
  });
  const [review] = linesFor(runGate(repo, 'gh pr merge').lines, 'review');
  assert.equal(review.state, 'runtime-unavailable');
  assert.match(review.output, /timed out/);
});

test('sequence-gate: committing the review and audit files does not make them stale', () => {
  const repo = fixtureRepo();
  const head = git(repo, 'rev-parse', 'HEAD');
  writeReview(repo, head);
  writeAudit(repo, head);
  git(repo, 'add', '-A');
  git(repo, 'commit', '-qm', 'reviews directory not ignored here');
  const states = runGate(repo, 'gh pr merge').lines.map((line) => line.state);
  assert.deepEqual(states, ['clear', 'clear']);
});

test('regression: task-0108 review, a chained command runs the checks of every landing action in it', () => {
  const repo = fixtureRepo();
  const lines = runGate(repo, 'git push -u origin x && gh pr create --fill').lines;
  assert.deepEqual(
    lines.map((line) => `${line.action}:${line.check}`),
    ['git push:gate-run', 'gh pr create:review', 'gh pr create:audit']
  );
});

test('sequence-gate: an invalid command bound or a command outside review is runtime-unavailable', () => {
  const repo = fixtureRepo();
  const ok = ['node', '-e', 'process.exit(0)'];
  for (const timeoutSeconds of [0, -1, 'x', 21]) {
    writeGates(repo, { checks: { review: { command: ok, timeoutSeconds } } });
    const [review] = linesFor(runGate(repo, 'gh pr merge').lines, 'review');
    assert.equal(review.state, 'runtime-unavailable', `timeoutSeconds ${timeoutSeconds}`);
  }
  writeGates(repo, { checks: { review: { command: 'node -e "process.exit(0)"' } } });
  const [shellString] = linesFor(runGate(repo, 'gh pr merge').lines, 'review');
  assert.equal(shellString.state, 'runtime-unavailable', 'a shell string is not an argument list');
  writeGates(repo, { checks: { audit: { command: ok } } });
  const [audit] = linesFor(runGate(repo, 'gh pr merge').lines, 'audit');
  assert.equal(audit.state, 'runtime-unavailable');
  assert.match(audit.output, /review only/);
});

test('sequence-gate: a review target is read from the first line, and a malformed one is counted', () => {
  const repo = fixtureRepo();
  const head = git(repo, 'rev-parse', 'HEAD');
  const dir = join(repo, '.agentic', 'reviews');
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, '20261007T100000Z-a-verdicts.md'),
    `## Findings\n\nTarget-SHA: ${head}\n`
  );
  writeFileSync(join(dir, '20261007T100001Z-b-verdicts.md'), `Target-SHA: ${head.slice(0, 7)}\n`);
  writeAudit(repo, head.toUpperCase());
  const lines = runGate(repo, 'gh pr merge').lines;
  const [review] = linesFor(lines, 'review');
  const [audit] = linesFor(lines, 'audit');
  assert.equal(review.state, 'would-block');
  assert.equal(review.unreadable_receipts, 1);
  assert.equal(audit.unreadable_receipts, 1);
});

test('sequence-gate: an audit summary without a target is counted as unreadable', () => {
  const repo = fixtureRepo();
  mkdirSync(join(repo, '.agentic', 'reviews'), { recursive: true });
  writeFileSync(
    join(repo, '.agentic', 'reviews', '20261007T1-audit-x-summary.json'),
    '{"findings": []}\n'
  );
  assert.equal(linesFor(runGate(repo, 'gh pr merge').lines, 'audit')[0].unreadable_receipts, 1);
});

test('sequence-gate: a code change after the audit makes the audit stale', () => {
  const repo = fixtureRepo();
  writeAudit(repo, git(repo, 'rev-parse', 'HEAD'));
  writeFileSync(join(repo, 'a.txt'), 'changed after audit\n');
  git(repo, 'commit', '-qam', 'unaudited change');
  assert.equal(linesFor(runGate(repo, 'gh pr merge').lines, 'audit')[0].state, 'would-block');
});

test('sequence-gate: turning one check off leaves the others running', () => {
  const repo = fixtureRepo();
  writeGates(repo, { checks: { audit: false } });
  assert.deepEqual(
    runGate(repo, 'gh pr create').lines.map((line) => line.check),
    ['gate-run', 'review']
  );
});

test('sequence-gate: gh pr ready reads the same review and audit receipts', () => {
  const repo = fixtureRepo();
  const head = git(repo, 'rev-parse', 'HEAD');
  writeReview(repo, head);
  const lines = runGate(repo, 'gh pr ready 12').lines;
  assert.equal(linesFor(lines, 'review')[0].state, 'clear');
  assert.equal(linesFor(lines, 'audit')[0].state, 'would-block');
});

test('sequence-gate: a check examines at most the newest receipts, so its cost stays bounded', () => {
  const repo = fixtureRepo();
  for (let i = 10; i < 40; i += 1) writeReview(repo, 'e'.repeat(40), `20261007T1200${i}Z`);
  const [review] = linesFor(runGate(repo, 'gh pr merge').lines, 'review');
  assert.equal(review.state, 'would-block');
  assert.equal(review.unreadable_receipts, 20);
});

test('sequence-gate: a check runs once per command, so a chained command stays within the hook budget', () => {
  const repo = fixtureRepo();
  const counter = join(repo, 'runs.txt');
  const appendRun = `require('node:fs').appendFileSync(${JSON.stringify(counter)}, 'x')`;
  writeGates(repo, { checks: { review: { command: ['node', '-e', appendRun] } } });
  const lines = runGate(repo, 'gh pr ready 12 && gh pr merge 12').lines;
  assert.equal(readFileSync(counter, 'utf8'), 'x');
  assert.deepEqual(
    lines.map((line) => `${line.action}:${line.check}`),
    ['gh pr ready:review', 'gh pr ready:audit']
  );
  assert.equal(lines[0].reproduction, JSON.stringify(['node', '-e', appendRun]));
});
