import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evidencePathFor } from '../src/skills/claude-code/ad-hooks/scripts/sequence-gate.mjs';

// ADR-0090, task-0111, GROUND-0043: the work-in-progress briefing, exercised
// through its command line on fixture repositories. The claude-code copy
// runs; byte parity covers the codex twin.
const BRIEFING = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'skills',
  'claude-code',
  'ad-next',
  'scripts',
  'briefing.mjs'
);

function cleanEnv(extra = {}) {
  const env = { ...process.env, ...extra };
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

function write(repo, rel, body) {
  mkdirSync(dirname(join(repo, rel)), { recursive: true });
  writeFileSync(join(repo, rel), body);
}

function commit(repo, message) {
  git(repo, 'add', '-A');
  git(repo, 'commit', '-qm', message);
}

function fixtureRepo() {
  const repo = mkdtempSync(join(tmpdir(), 'briefing-repo-'));
  git(repo, 'init', '-q', '-b', 'main');
  write(repo, 'README.md', 'fixture\n');
  commit(repo, 'base');
  return repo;
}

function task({ status = 'in-progress', plan = '', criteria = '', notes = '', dod = '' } = {}) {
  return `# Task \`0001\`: Fixture task

**Status:** ${status}

## Context

Fixture.

## Acceptance Criteria

${criteria}

## Plan

${plan}

## Notes

${notes}

## Definition of Done

${dod}
`;
}

function briefing(repo, args = [], env = {}) {
  return JSON.parse(
    execFileSync('node', [BRIEFING, ...args], {
      cwd: repo,
      encoding: 'utf8',
      env: cleanEnv(env),
    })
  );
}

test('names the single in-progress task with its done and open plan items', () => {
  const repo = fixtureRepo();
  write(
    repo,
    'doc/tasks/0001-fixture-task.md',
    task({ plan: '- [x] Owner approves this plan.\n- [ ] Slice 1, the script.\n' })
  );
  commit(repo, 'docs: add the task');

  const result = briefing(repo);

  assert.equal(result.task.slug, '0001-fixture-task');
  assert.equal(result.task.rule, 'single-in-progress');
  assert.equal(result.task.status, 'in-progress');
  assert.deepEqual(result.plan, {
    done: ['Owner approves this plan.'],
    open: ['Slice 1, the script.'],
  });
});

test('lists the open acceptance criteria and Definition of Done items', () => {
  const repo = fixtureRepo();
  write(
    repo,
    'doc/tasks/0001-fixture-task.md',
    task({
      criteria: '- [x] The script prints JSON.\n- [ ] The band shows one line.\n',
      dod: '- [ ] Local tests pass\n- [x] No orphan TODO\n',
    })
  );
  commit(repo, 'docs: add the task');

  const result = briefing(repo);

  assert.deepEqual(result.acceptance, { done: 1, open: ['The band shows one line.'] });
  assert.deepEqual(result.definitionOfDone, { done: 1, open: ['Local tests pass'] });
});

test('says it cannot tell the task when none is in progress', () => {
  const repo = fixtureRepo();
  write(repo, 'doc/tasks/0001-fixture-task.md', task({ status: 'done' }));
  commit(repo, 'docs: add the task');

  const result = briefing(repo);

  assert.equal(result.task, null);
  assert.equal(result.plan, null);
  assert.ok(result.cannotTell.includes('task'));
});

test('picks the task the newest commit ahead of main touched when several are in progress', () => {
  const repo = fixtureRepo();
  write(repo, 'doc/tasks/0001-fixture-task.md', task());
  write(repo, 'doc/tasks/0002-other-task.md', task());
  commit(repo, 'docs: add two tasks');
  git(repo, 'switch', '-q', '-c', 'feat/work');
  write(repo, 'doc/tasks/0001-fixture-task.md', task({ notes: '### 2026-10-01\n\nOlder.\n' }));
  commit(repo, 'docs: touch the first task');
  write(repo, 'doc/tasks/0002-other-task.md', task({ notes: '### 2026-10-02\n\nNewer.\n' }));
  commit(repo, 'docs: touch the second task');
  write(repo, 'src.js', 'code\n');
  commit(repo, 'feat: code only');

  const result = briefing(repo);

  assert.equal(result.task.slug, '0002-other-task');
  assert.equal(result.task.rule, 'newest-commit-ahead');
});

test('reports the Notes entries that record a deviation, with their text', () => {
  const repo = fixtureRepo();
  write(
    repo,
    'doc/tasks/0001-fixture-task.md',
    task({
      notes: [
        '### 2026-10-01 — plan approved',
        '',
        'The owner approved the plan.',
        '',
        '### 2026-10-02 — deviation: kept the old parser',
        '',
        'The new parser failed on Windows paths.',
        '',
        '### 2026-10-03',
        '',
        'Added a flag beyond the ask because the owner needs to turn it off.',
        '',
      ].join('\n'),
    })
  );
  commit(repo, 'docs: add the task');

  const result = briefing(repo);

  assert.deepEqual(result.deviations, [
    {
      heading: '2026-10-02 — deviation: kept the old parser',
      text: 'The new parser failed on Windows paths.',
    },
    {
      heading: '2026-10-03',
      text: 'Added a flag beyond the ask because the owner needs to turn it off.',
    },
  ]);
});

const APPROVAL = '### 2026-10-01 — plan approved\n\nThe owner approved the plan.\n';

test('flags code committed before the plan approval was recorded', () => {
  const repo = fixtureRepo();
  write(repo, 'doc/tasks/0001-fixture-task.md', task());
  commit(repo, 'docs: add the task');
  git(repo, 'switch', '-q', '-c', 'feat/work');
  write(repo, 'src.js', 'code\n');
  commit(repo, 'feat: code first');
  write(repo, 'doc/tasks/0001-fixture-task.md', task({ notes: APPROVAL }));
  commit(repo, 'docs: approve the plan');

  const result = briefing(repo);

  assert.equal(result.approval.entry, '2026-10-01 — plan approved');
  assert.equal(result.approval.precedesFirstImplementingCommit, false);
});

test('confirms the plan approval preceded the first implementing commit', () => {
  const repo = fixtureRepo();
  write(repo, 'doc/tasks/0001-fixture-task.md', task());
  commit(repo, 'docs: add the task');
  git(repo, 'switch', '-q', '-c', 'feat/work');
  write(repo, 'doc/tasks/0001-fixture-task.md', task({ notes: APPROVAL }));
  commit(repo, 'docs: approve the plan');
  write(repo, 'src.js', 'code\n');
  commit(repo, 'feat: code after approval');

  const result = briefing(repo);

  assert.equal(result.approval.precedesFirstImplementingCommit, true);
});

test('counts an approval committed on main as preceding the work ahead of it', () => {
  const repo = fixtureRepo();
  write(repo, 'doc/tasks/0001-fixture-task.md', task({ notes: APPROVAL }));
  commit(repo, 'docs: add the approved task');
  git(repo, 'switch', '-q', '-c', 'feat/work');
  write(repo, 'src.js', 'code\n');
  commit(repo, 'feat: code');

  assert.equal(briefing(repo).approval.precedesFirstImplementingCommit, true);
});

test('flags implementing commits on a task with no recorded plan approval', () => {
  const repo = fixtureRepo();
  write(repo, 'doc/tasks/0001-fixture-task.md', task());
  commit(repo, 'docs: add the task');
  git(repo, 'switch', '-q', '-c', 'feat/work');
  write(repo, 'src.js', 'code\n');
  commit(repo, 'feat: code');

  const result = briefing(repo);

  assert.equal(result.approval.entry, null);
  assert.equal(result.approval.precedesFirstImplementingCommit, false);
});

test('reports roadmap progress from the survey, or cannot tell without a PRD', () => {
  const repo = fixtureRepo();
  write(repo, 'doc/tasks/0001-fixture-task.md', task());
  write(repo, 'doc/tasks/0002-done-task.md', task({ status: 'done' }));
  write(repo, 'doc/tasks/0003-next-task.md', task({ status: 'proposed' }));
  commit(repo, 'docs: add tasks');

  const withoutPrd = briefing(repo);
  assert.equal(withoutPrd.roadmap, null);
  assert.ok(withoutPrd.cannotTell.includes('roadmap'));

  write(repo, 'doc/product/PRD.md', '# PRD\n\nStatus: accepted\n');
  commit(repo, 'docs: add the PRD');

  const withPrd = briefing(repo);
  assert.deepEqual(withPrd.roadmap, { prdStatus: 'accepted', tasksDone: 1, tasksTotal: 3 });
  assert.ok(!withPrd.cannotTell.includes('roadmap'));
});

test("summarises the session's shadow gate evidence, or cannot tell without a session", () => {
  const repo = fixtureRepo();
  const evidence = mkdtempSync(join(tmpdir(), 'briefing-evidence-'));
  const line = (seq, action, check, state) =>
    JSON.stringify({
      seq,
      at: `2026-10-08T00:00:0${seq}Z`,
      gate: 'sequence-gate',
      action,
      check,
      state,
    });
  writeFileSync(
    join(evidence, 'sess-1.jsonl'),
    [
      line(1, 'git push', 'gate-run', 'clear'),
      line(2, 'gh pr create', 'gate-run', 'clear'),
      line(3, 'gh pr create', 'review', 'would-block'),
      '',
    ].join('\n')
  );
  const env = { AD_SEQUENCE_GATE_EVIDENCE_DIR: evidence };

  const withSession = briefing(repo, ['--session', 'sess-1'], env);
  assert.deepEqual(withSession.gate, {
    lines: 3,
    wouldBlock: 1,
    last: {
      at: '2026-10-08T00:00:03Z',
      action: 'gh pr create',
      check: 'review',
      state: 'would-block',
    },
    lastWouldBlock: { at: '2026-10-08T00:00:03Z', action: 'gh pr create', check: 'review' },
  });

  // No evidence file reads the same whether nothing was gated yet or the
  // hook is not wired, so it is "cannot tell", never a clean gate.
  const freshSession = briefing(repo, ['--session', 'sess-2'], env);
  assert.equal(freshSession.gate, null);
  assert.ok(freshSession.cannotTell.includes('gate'));
  assert.deepEqual(freshSession.unreadable, []);

  const noSession = briefing(repo, [], env);
  assert.equal(noSession.gate, null);
  assert.ok(noSession.cannotTell.includes('gate'));
});

test('degrades on an unreadable task file and a corrupt evidence line, naming both', () => {
  const repo = fixtureRepo();
  write(repo, 'doc/tasks/0001-fixture-task.md', task({ plan: '- [ ] Slice 1.\n' }));
  mkdirSync(join(repo, 'doc', 'tasks', '0002-broken-task.md'));
  commit(repo, 'docs: add the task');
  const evidence = mkdtempSync(join(tmpdir(), 'briefing-evidence-'));
  writeFileSync(
    join(evidence, 'sess-1.jsonl'),
    '{"seq":1,"at":"t1","action":"git push","check":"gate-run","state":"clear"}\nnot json\n'
  );

  const result = briefing(repo, ['--session', 'sess-1'], {
    AD_SEQUENCE_GATE_EVIDENCE_DIR: evidence,
  });

  assert.equal(result.task.slug, '0001-fixture-task');
  assert.deepEqual(result.plan.open, ['Slice 1.']);
  assert.equal(result.gate.lines, 1);
  assert.deepEqual(
    result.unreadable.map((u) => u.path),
    ['doc/tasks/0002-broken-task.md', 'sess-1.jsonl']
  );
});

test('still briefs outside a git repository, without the commit-order fact', () => {
  const dir = mkdtempSync(join(tmpdir(), 'briefing-nogit-'));
  write(dir, 'doc/tasks/0001-fixture-task.md', task({ notes: APPROVAL }));

  const result = briefing(dir);

  assert.equal(result.task.slug, '0001-fixture-task');
  assert.equal(result.approval.entry, '2026-10-01 — plan approved');
  assert.equal(result.approval.precedesFirstImplementingCommit, null);
  assert.ok(result.cannotTell.includes('approval'));
  assert.ok(result.cannotTell.includes('git'));
});

test('regression: task-0111 treats an evidence line that is not an object as corrupt', () => {
  const repo = fixtureRepo();
  const evidence = mkdtempSync(join(tmpdir(), 'briefing-evidence-'));
  writeFileSync(
    join(evidence, 'sess-1.jsonl'),
    '{"seq":1,"at":"t1","action":"git push","check":"gate-run","state":"clear"}\nnull\n'
  );

  const result = briefing(repo, ['--session', 'sess-1'], {
    AD_SEQUENCE_GATE_EVIDENCE_DIR: evidence,
  });

  assert.equal(result.gate.lines, 1);
  assert.equal(result.gate.last.action, 'git push');
  assert.deepEqual(result.unreadable, [{ path: 'sess-1.jsonl', code: 'INVALID_JSON' }]);
});

test('does not count an approval recorded in the same commit as the first code', () => {
  const repo = fixtureRepo();
  write(repo, 'doc/tasks/0001-fixture-task.md', task());
  commit(repo, 'docs: add the task');
  git(repo, 'switch', '-q', '-c', 'feat/work');
  write(repo, 'doc/tasks/0001-fixture-task.md', task({ notes: APPROVAL }));
  write(repo, 'src.js', 'code\n');
  commit(repo, 'feat: approve and code together');

  assert.equal(briefing(repo).approval.precedesFirstImplementingCommit, false);
});

test('counts an approval with no implementing commit yet as preceding', () => {
  const repo = fixtureRepo();
  write(repo, 'doc/tasks/0001-fixture-task.md', task());
  commit(repo, 'docs: add the task');
  git(repo, 'switch', '-q', '-c', 'feat/work');
  write(repo, 'doc/tasks/0001-fixture-task.md', task({ notes: APPROVAL }));
  commit(repo, 'docs: approve the plan');

  const result = briefing(repo);

  assert.equal(result.approval.firstImplementingCommit, null);
  assert.equal(result.approval.precedesFirstImplementingCommit, true);
});

test('cannot tell the order while the approval entry is not yet committed', () => {
  const repo = fixtureRepo();
  write(repo, 'doc/tasks/0001-fixture-task.md', task());
  commit(repo, 'docs: add the task');
  git(repo, 'switch', '-q', '-c', 'feat/work');
  write(repo, 'src.js', 'code\n');
  commit(repo, 'feat: code');
  write(repo, 'doc/tasks/0001-fixture-task.md', task({ notes: APPROVAL }));

  const result = briefing(repo);

  assert.equal(result.approval.approvedIn, null);
  assert.equal(result.approval.precedesFirstImplementingCommit, null);
  assert.ok(result.cannotTell.includes('approval'));
  assert.ok(!result.cannotTell.includes('git'));
});

test('regression: task-0111 does not count an agent-config-only commit as implementing', () => {
  const repo = fixtureRepo();
  write(repo, 'doc/tasks/0001-fixture-task.md', task());
  commit(repo, 'docs: add the task');
  git(repo, 'switch', '-q', '-c', 'feat/work');
  write(repo, '.claude/agentic-state.json', '{}\n');
  write(repo, '.agents/agentic-state.json', '{}\n');
  commit(repo, 'chore: refresh the install state');
  write(repo, 'doc/tasks/0001-fixture-task.md', task({ notes: APPROVAL }));
  commit(repo, 'docs: approve the plan');

  const result = briefing(repo);

  assert.equal(result.approval.firstImplementingCommit, null);
  assert.equal(result.approval.precedesFirstImplementingCommit, true);
});

test('regression: task-0111 reads checkbox items and Notes from a task file with CRLF line endings', () => {
  const repo = fixtureRepo();
  const body = task({
    plan: '- [x] Done item.\n- [ ] Open item.\n',
    notes: '### 2026-10-02 — deviation: kept the parser\n\nWindows paths.\n',
  }).replace(/\n/g, '\r\n');
  write(repo, 'doc/tasks/0001-fixture-task.md', body);

  const result = briefing(repo);

  assert.deepEqual(result.plan, { done: ['Done item.'], open: ['Open item.'] });
  assert.deepEqual(result.deviations, [
    { heading: '2026-10-02 — deviation: kept the parser', text: 'Windows paths.' },
  ]);
});

test('regression: task-0111 does not count a docs-only commit with a non-ASCII path as implementing', () => {
  const repo = fixtureRepo();
  write(repo, 'doc/tasks/0001-fixture-task.md', task());
  commit(repo, 'docs: add the task');
  git(repo, 'switch', '-q', '-c', 'feat/work');
  write(repo, 'doc/research/résumé.md', 'notes\n');
  commit(repo, 'docs: add a research note');
  write(repo, 'doc/tasks/0001-fixture-task.md', task({ notes: APPROVAL }));
  commit(repo, 'docs: approve the plan');

  assert.equal(briefing(repo).approval.firstImplementingCommit, null);
});

test('regression: task-0111 never names a proposed task touched by the newest commit as the active one', () => {
  const repo = fixtureRepo();
  write(repo, 'doc/tasks/0001-fixture-task.md', task());
  write(repo, 'doc/tasks/0002-other-task.md', task());
  commit(repo, 'docs: add two tasks');
  git(repo, 'switch', '-q', '-c', 'feat/work');
  write(repo, 'doc/tasks/0001-fixture-task.md', task({ notes: '### 2026-10-01\n\nWork.\n' }));
  commit(repo, 'docs: touch the first task');
  write(repo, 'doc/tasks/0003-new-task.md', task({ status: 'proposed' }));
  commit(repo, 'docs: propose a new task');

  const result = briefing(repo);

  assert.equal(result.task.slug, '0001-fixture-task');
});

test('reads the evidence file at the path the sequence gate writes it to', () => {
  const repo = fixtureRepo();
  const env = { AD_SEQUENCE_GATE_EVIDENCE_DIR: mkdtempSync(join(tmpdir(), 'briefing-evidence-')) };
  const sessionId = 'odd/session-id x';
  const file = evidencePathFor(sessionId, env);
  writeFileSync(
    file,
    '{"seq":1,"at":"t1","action":"git push","check":"gate-run","state":"clear"}\n'
  );

  assert.equal(briefing(repo, ['--session', sessionId], env).gate.lines, 1);
});

test('regression: task-0111 treats a task with no approval and no code yet as known, not as cannot tell', () => {
  const repo = fixtureRepo();
  write(repo, 'doc/tasks/0001-fixture-task.md', task());
  commit(repo, 'docs: add the task');
  git(repo, 'switch', '-q', '-c', 'feat/work');
  write(repo, 'doc/tasks/0001-fixture-task.md', task({ notes: '### 2026-10-01\n\nGrounded.\n' }));
  commit(repo, 'docs: ground the task');

  const result = briefing(repo);

  assert.equal(result.approval.entry, null);
  assert.equal(result.approval.firstImplementingCommit, null);
  assert.ok(!result.cannotTell.includes('approval'));
});

test('regression: task-0111 does not read a note that only mentions deviations as a deviation', () => {
  const repo = fixtureRepo();
  write(
    repo,
    'doc/tasks/0001-fixture-task.md',
    task({
      notes: [
        '### 2026-10-01 — slice 1',
        '',
        'Tests cover deviation entries and the deviations its Notes record.',
        '',
        '### 2026-10-02 — implementation',
        '',
        'Deviation from AC 1: the receipt is written by a postverify script.',
        '',
      ].join('\n'),
    })
  );

  assert.deepEqual(
    briefing(repo).deviations.map((d) => d.heading),
    ['2026-10-02 — implementation']
  );
});

test('regression: task-0111 does not read a deviation phrase quoted in a note as a deviation', () => {
  const repo = fixtureRepo();
  write(
    repo,
    'doc/tasks/0001-fixture-task.md',
    task({
      notes: [
        '### 2026-10-01 — rule',
        '',
        'The text rule now takes "deviation from" and `beyond the ask` as markers.',
        '',
      ].join('\n'),
    })
  );

  assert.deepEqual(briefing(repo).deviations, []);
});

test('regression: task-0111 audit names an unreadable task directory instead of hiding it', () => {
  const repo = fixtureRepo();
  write(repo, 'doc/tasks', 'not a directory\n');

  const result = briefing(repo);

  assert.equal(result.task, null);
  assert.ok(result.unreadable.some((u) => u.path === 'doc/tasks' && u.code === 'ENOTDIR'));
});
