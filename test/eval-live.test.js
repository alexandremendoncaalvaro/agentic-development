import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assertNoLeak,
  buildLiveReceipt,
  captureTrial,
  parseLiveArgs,
  planTrialRoots,
  probeHostVersion,
} from '../eval/lib/live.mjs';

const CODEX_STREAM = [
  JSON.stringify({ type: 'thread.started', thread_id: 'th_1' }),
  JSON.stringify({
    type: 'item.completed',
    item: {
      id: 'i1',
      type: 'command_execution',
      command: 'cat .agents/skills/ad-pr/SKILL.md',
      exit_code: 0,
    },
  }),
  JSON.stringify({ type: 'turn.completed', usage: {} }),
].join('\n');

function fakeSpawn(responses) {
  const calls = [];
  return {
    calls,
    spawn(command, args) {
      calls.push([command, ...args]);
      const next = responses.shift();
      if (!next) throw new Error(`unexpected spawn of ${command}`);
      return next;
    },
  };
}

test('live: the runner must be supplied explicitly and is never discovered', () => {
  assert.throws(
    () => parseLiveArgs(['eval/cases/open-pull-request-explicit.json', '--host', 'codex']),
    /--runner/
  );
});

test('live: the host version is read from the running binary, not supplied', () => {
  const { spawn, calls } = fakeSpawn([{ status: 0, stdout: 'codex-cli 0.139.0\n', stderr: '' }]);
  const version = probeHostVersion({ runner: ['codex', 'exec', '--json'], spawn });
  assert.equal(version, 'codex-cli 0.139.0');
  assert.deepEqual(calls[0], ['codex', '--version']);
});

test('live: a version probe that fails is a harness defect, not a silent default', () => {
  const { spawn } = fakeSpawn([{ status: 127, stdout: '', stderr: 'not found' }]);
  assert.throws(() => probeHostVersion({ runner: ['nope'], spawn }), /version/i);
});

test('live: a captured codex stream becomes a live receipt the contract accepts', () => {
  const receipt = buildLiveReceipt({
    caseRecord: {
      id: 'open-pull-request-explicit',
      request: '/ad-pr',
      request_kind: 'explicit',
      graders: [{ id: 'route', kind: 'deterministic', version: '1' }],
    },
    host: 'codex',
    hostVersion: 'codex-cli 0.139.0',
    model: 'gpt-5-codex',
    scaffold: 'codex exec --json',
    tools: ['command_execution'],
    permissions: 'read-only',
    contextPolicy: 'bare',
    runParameters: { max_turns: 12 },
    skill: { name: 'ad-pr', host: 'codex', sha256: 'a'.repeat(64) },
    caseSha256: 'b'.repeat(64),
    fixtureSha256: 'c'.repeat(64),
    fixtureRoot: 'eval/fixtures/planning-docs-repo',
    policy: { grants: [] },
    captures: [{ trialId: 't1', stream: CODEX_STREAM }],
  });

  assert.equal(receipt.schema, 'agentic-eval-receipt/1');
  assert.equal(receipt.lane, 'live');
  assert.equal(receipt.origin, 'live');
  assert.equal(receipt.frozen.host_version, 'codex-cli 0.139.0');
  assert.equal(receipt.frozen.trial_count, 1);
  assert.equal(receipt.trials.length, 1);
  assert.equal(receipt.trials[0].events[0].kind, 'skill_invoked');
});

test('live: a stream carrying a denylisted term aborts the run and writes nothing', () => {
  assert.throws(
    () =>
      assertNoLeak({
        label: 'trial t1 stream',
        text: 'the token is acme-internal-secret here',
        denylistPatterns: ['acme-internal-secret'],
      }),
    /trial t1 stream/
  );
});

test('live: a clean stream passes the leak gate', () => {
  assertNoLeak({ label: 't1', text: 'nothing sensitive', denylistPatterns: ['acme-internal'] });
});

test('live: a host that exits non-zero yields a failure trial, not a harness error', () => {
  const trial = captureTrial({
    host: 'codex',
    caseRecord: { request: '/ad-pr', request_kind: 'explicit' },
    trialId: 't1',
    policy: { grants: [] },
    fixtureRoot: 'eval/fixtures/planning-docs-repo',
    result: { status: 1, stdout: '', stderr: 'boom' },
  });
  assert.equal(trial.outcome.exit_state, 'failure');
  assert.match(trial.outcome.final_response, /boom/);
});

test('live: a stream that ends without a terminal is a failure trial naming that', () => {
  const partial = JSON.stringify({ type: 'thread.started', thread_id: 'th_1' });
  const trial = captureTrial({
    host: 'codex',
    caseRecord: { request: '/ad-pr', request_kind: 'explicit' },
    trialId: 't2',
    policy: { grants: [] },
    fixtureRoot: 'eval/fixtures/planning-docs-repo',
    result: { status: 0, stdout: partial, stderr: '' },
  });
  assert.equal(trial.outcome.exit_state, 'failure');
  assert.match(trial.outcome.final_response, /terminal/i);
});

test('live: each trial gets its own fixture copy, so one trial cannot read the next', () => {
  const seen = [];
  const roots = planTrialRoots({
    fixtureRoot: 'eval/fixtures/planning-docs-repo',
    trials: 3,
    workRoot: '/tmp/x',
  });
  for (const root of roots) seen.push(root);
  assert.equal(new Set(seen).size, 3);
  assert.ok(seen.every((root) => root.startsWith('/tmp/x')));
});

test('regression: a failing host still produces a receipt, with the failure in its trial', () => {
  const receipt = buildLiveReceipt({
    caseRecord: {
      id: 'open-pull-request-explicit',
      request: '/ad-pr',
      request_kind: 'explicit',
      graders: [{ id: 'route', kind: 'deterministic', version: '1' }],
    },
    host: 'codex',
    hostVersion: 'codex-cli 0.139.0',
    model: 'gpt-5-codex',
    scaffold: 'codex exec --json',
    tools: [],
    permissions: 'read-only',
    contextPolicy: 'bare',
    runParameters: { trials: 1 },
    skill: { name: 'ad-pr', host: 'codex', sha256: 'a'.repeat(64) },
    caseSha256: 'b'.repeat(64),
    fixtureSha256: 'c'.repeat(64),
    fixtureRoot: 'eval/fixtures/planning-docs-repo',
    policy: { grants: [] },
    captures: [
      { trialId: 't1', stream: '', result: { status: 3, stdout: '', stderr: 'auth failed' } },
    ],
  });
  assert.equal(receipt.trials[0].outcome.exit_state, 'failure');
  assert.match(receipt.trials[0].outcome.final_response, /exited 3/);
});
