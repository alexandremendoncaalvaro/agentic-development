import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { joinGateEvidence, trialMetrics } from '../eval/lib/gate-evidence.mjs';

// The join Task 0084 measures: the gate's evidence lines against the trial's
// file_write events, by path and order, because the host stream carries no
// PostToolUse record on Claude Code 2.1.227 (Spec 0008 Scenario 7 as read by
// its open question; GROUND-0028 E6).

const TRIAL = {
  id: 't1',
  events: [
    { seq: 1, kind: 'skill_invoked', skill: 'ad-ground' },
    { seq: 2, kind: 'command', command: 'ls' },
    { seq: 3, kind: 'file_write', path: 'doc/research/0001-ground-x.md' },
    { seq: 4, kind: 'file_write', path: 'doc/research/0001-ground-x.md' },
    { seq: 5, kind: 'file_write', path: 'README.md' },
    { seq: 6, kind: 'final', exit_state: 'success' },
  ],
  outcome: { exit_state: 'success', artifact_manifest: ['doc/research/0001-ground-x.md'] },
};

const EVIDENCE = [
  {
    seq: 1,
    gate: 'artifact-gate',
    state: 'validator-failed',
    path: 'doc/research/0001-ground-x.md',
  },
  {
    seq: 2,
    gate: 'artifact-gate',
    state: 'validator-passed',
    path: 'doc/research/0001-ground-x.md',
  },
];

test('gate-evidence: each evidence line joins the next file_write of the same path, in order, and reports the final state per path', () => {
  const join = joinGateEvidence({ trial: TRIAL, evidence: EVIDENCE });
  assert.deepEqual(join.rows, [
    {
      evidence_seq: 1,
      state: 'validator-failed',
      path: 'doc/research/0001-ground-x.md',
      event_seq: 3,
    },
    {
      evidence_seq: 2,
      state: 'validator-passed',
      path: 'doc/research/0001-ground-x.md',
      event_seq: 4,
    },
  ]);
  assert.deepEqual(join.unjoined_evidence, []);
  assert.deepEqual(join.ungoverned_writes, [{ event_seq: 5, path: 'README.md' }]);
  assert.deepEqual(join.final_state, { 'doc/research/0001-ground-x.md': 'validator-passed' });
  assert.equal(join.complete, true);
});

test('gate-evidence: an evidence line with no write of its path is reported unjoined, and the join is incomplete', () => {
  const evidence = [
    ...EVIDENCE,
    { seq: 3, state: 'validator-failed', path: 'doc/research/0002-ground-y.md' },
  ];
  const join = joinGateEvidence({ trial: TRIAL, evidence });
  assert.equal(join.complete, false);
  assert.deepEqual(join.unjoined_evidence, [
    { evidence_seq: 3, state: 'validator-failed', path: 'doc/research/0002-ground-y.md' },
  ]);
  assert.equal(join.rows[2].event_seq, null);
});

test('gate-evidence: trial metrics come from the result record and the trial events, never from a default', () => {
  const stream = [
    JSON.stringify({ type: 'system', subtype: 'init' }),
    JSON.stringify({
      type: 'result',
      subtype: 'success',
      duration_ms: 333777,
      num_turns: 22,
      total_cost_usd: 1.9,
    }),
  ].join('\n');
  assert.deepEqual(trialMetrics({ trial: TRIAL, stream }), {
    duration_ms: 333777,
    num_turns: 22,
    total_cost_usd: 1.9,
    tool_actions: { command: 1, file_write: 3 },
    events: { skill_invoked: 1, command: 1, file_write: 3, final: 1 },
    exit_state: 'success',
  });
  const bare = trialMetrics({ trial: TRIAL, stream: '' });
  assert.equal(bare.duration_ms, null);
  assert.equal(bare.num_turns, null);
});

test('gate-evidence: the join subcommand reads a capture directory and prints the join and metrics per trial', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-eval-join-'));
  try {
    const receipt = {
      schema: 'agentic-eval-receipt/1',
      case_id: 'c',
      lane: 'live',
      origin: 'live',
      frozen: {},
      trials: [TRIAL],
    };
    writeFileSync(join(dir, 'receipt.json'), JSON.stringify(receipt));
    writeFileSync(
      join(dir, 't1.jsonl'),
      `${JSON.stringify({ type: 'result', subtype: 'success', duration_ms: 10, num_turns: 2, total_cost_usd: 0.5 })}\n`
    );
    writeFileSync(
      join(dir, 't1.gate-evidence.jsonl'),
      EVIDENCE.map((line) => JSON.stringify(line)).join('\n') + '\n'
    );
    const run = spawnSync(process.execPath, ['eval/run.mjs', 'join', dir], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    assert.equal(run.status, 0, run.stderr);
    const report = JSON.parse(run.stdout);
    assert.equal(report.schema, 'agentic-eval-gate-join/1');
    assert.equal(report.trials[0].id, 't1');
    assert.equal(report.trials[0].join.complete, true);
    assert.equal(report.trials[0].join.rows.length, 2);
    assert.equal(report.trials[0].metrics.num_turns, 2);

    writeFileSync(
      join(dir, 't1.gate-evidence.jsonl'),
      `${JSON.stringify({ seq: 9, state: 'validator-failed', path: 'nowhere.md' })}\n`
    );
    const incomplete = spawnSync(process.execPath, ['eval/run.mjs', 'join', dir], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    assert.equal(incomplete.status, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('gate-evidence: lines from two evidence files order by their timestamp, not by a seq that restarts per file', () => {
  const evidence = [
    {
      seq: 1,
      at: '2026-09-21T10:00:05.000Z',
      state: 'validator-passed',
      path: 'doc/research/0001-ground-x.md',
    },
    {
      seq: 1,
      at: '2026-09-21T10:00:01.000Z',
      state: 'validator-failed',
      path: 'doc/research/0001-ground-x.md',
    },
  ];
  const join = joinGateEvidence({ trial: TRIAL, evidence });
  assert.deepEqual(
    join.rows.map((row) => [row.state, row.event_seq]),
    [
      ['validator-failed', 3],
      ['validator-passed', 4],
    ]
  );
  assert.equal(join.final_state['doc/research/0001-ground-x.md'], 'validator-passed');
});

test('gate-evidence: a malformed evidence line joins nothing and marks the join incomplete instead of throwing', () => {
  const join = joinGateEvidence({
    trial: TRIAL,
    evidence: [{ seq: null, state: 'malformed', path: null, raw: '{"seq":1,' }],
  });
  assert.equal(join.complete, false);
  assert.deepEqual(join.unjoined_evidence, [
    { evidence_seq: null, state: 'malformed', path: null },
  ]);
});
