import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { freezeArtifact } from '../src/skills/claude-code/ad-prism/scripts/freeze-artifact.mjs';
import { GRADERS } from '../eval/lib/graders.mjs';
import { evaluateReplay } from '../eval/lib/replay.mjs';
import { validateReceipt } from '../eval/lib/validate.mjs';

import {
  assertNoLeak,
  buildLiveReceipt,
  buildRunnerArgv,
  captureTrial,
  parseLiveArgs,
  planTrialRoots,
  observeEnvironment,
  probeHostVersion,
  resolveCaptureDir,
  skillIdentity,
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
    environment: {
      model: 'gpt-5-codex',
      tools: ['command_execution'],
      permissions: 'read-only',
      context_policy: 'bare',
      unmeasured: [],
    },
    scaffold: 'codex exec --json',
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
  // Injected copy and makeDir: this asserts the plan, not the filesystem, so it
  // leaves nothing behind and holds on Windows where an absolute path differs.
  const copied = [];
  const workRoot = join('work', 'root');
  const roots = planTrialRoots({
    fixtureRoot: 'eval/fixtures/planning-docs-repo',
    trials: 3,
    workRoot,
    copy: (from, to) => copied.push([from, to]),
    makeDir: () => {},
  });
  assert.equal(new Set(roots).size, 3);
  assert.equal(copied.length, 3);
  assert.ok(roots.every((root) => root.startsWith(workRoot)));
  assert.ok(copied.every(([from]) => from === 'eval/fixtures/planning-docs-repo'));
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
    environment: {
      model: 'gpt-5-codex',
      tools: [],
      permissions: 'read-only',
      context_policy: 'bare',
      unmeasured: [],
    },
    scaffold: 'codex exec --json',
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

test('live: a capture defaults outside the repository, so forgetting is safe', () => {
  const dest = resolveCaptureDir({ out: null, root: '/repo', workRoot: '/tmp/work-1' });
  assert.equal(dest.inRepository, false);
  assert.ok(dest.path.startsWith('/tmp/work-1'));
});

test('live: an explicit destination inside the repository is allowed but marked', () => {
  const dest = resolveCaptureDir({
    out: 'eval/receipts/x',
    root: '/repo',
    workRoot: '/tmp/work-1',
  });
  assert.equal(dest.inRepository, true);
  assert.ok(dest.path.startsWith('/repo'));
});

const CLAUDE_INIT_STREAM = [
  JSON.stringify({
    type: 'system',
    subtype: 'init',
    tools: ['Read', 'Bash', 'Skill'],
    permissionMode: 'default',
    slash_commands: ['ad-task'],
  }),
  JSON.stringify({
    type: 'assistant',
    message: { model: 'claude-opus-5[1m]', content: [{ type: 'text', text: 'done' }] },
  }),
  JSON.stringify({ type: 'result', subtype: 'success', result: 'done', is_error: false }),
].join('\n');

test('live: the environment is observed from the stream, never asserted', () => {
  const observed = observeEnvironment({ host: 'claude-code', stream: CLAUDE_INIT_STREAM });
  assert.deepEqual(observed.tools, ['Read', 'Bash', 'Skill']);
  assert.equal(observed.model, 'claude-opus-5[1m]');
  assert.equal(observed.permissions, 'default');
  assert.equal(observed.context_policy, 'host-configured');
  assert.deepEqual(observed.unmeasured, []);
});

test('live: a host that reports no environment says unmeasured instead of a plausible literal', () => {
  const observed = observeEnvironment({
    host: 'codex',
    stream: JSON.stringify({ type: 'turn.completed' }),
  });
  assert.equal(observed.tools, null);
  assert.equal(observed.model, null);
  assert.deepEqual(observed.unmeasured.sort(), ['context_policy', 'model', 'permissions', 'tools']);
});

test('live: a context policy is only claimed bare when the host reports nothing extra', () => {
  const bare = observeEnvironment({
    host: 'claude-code',
    stream: JSON.stringify({
      type: 'system',
      subtype: 'init',
      tools: ['Read'],
      permissionMode: 'default',
    }),
  });
  assert.equal(bare.context_policy, 'bare');
});

test('live: each trial freezes the digest of the stream it came from', () => {
  const receipt = buildLiveReceipt({
    caseRecord: { id: 'c', request: '/ad-pr', request_kind: 'explicit', graders: [] },
    host: 'codex',
    hostVersion: 'codex-cli 0.139.0',
    environment: {
      model: null,
      tools: null,
      permissions: null,
      context_policy: null,
      unmeasured: [],
    },
    scaffold: 'codex exec --json',
    runParameters: { trials: 1 },
    skill: { name: 'ad-pr', host: 'codex', sha256: 'a'.repeat(64) },
    caseSha256: 'b'.repeat(64),
    fixtureSha256: 'c'.repeat(64),
    fixtureRoot: 'eval/fixtures/planning-docs-repo',
    policy: { grants: [] },
    captures: [{ trialId: 't1', stream: CODEX_STREAM }],
  });
  assert.match(receipt.frozen.captures.t1, /^[0-9a-f]{64}$/);
});

test('live: a produced receipt validates against the contract and grades through the real graders', () => {
  const caseRecord = JSON.parse(readFileSync('eval/cases/open-pull-request-explicit.json', 'utf8'));
  const receipt = buildLiveReceipt({
    caseRecord,
    host: 'claude-code',
    hostVersion: '2.1.227',
    environment: observeEnvironment({ host: 'claude-code', stream: CLAUDE_ROUTED_STREAM }),
    scaffold: 'claude -p --output-format stream-json',
    runParameters: { trials: 1 },
    skill: { name: 'ad-pr', host: 'claude-code', sha256: 'a'.repeat(64) },
    caseSha256: 'b'.repeat(64),
    fixtureSha256: 'c'.repeat(64),
    fixtureRoot: 'eval/fixtures/planning-docs-repo',
    policy: { grants: ['git push', 'gh pr create'] },
    captures: [{ trialId: 't1', stream: CLAUDE_ROUTED_STREAM }],
  });

  // The boundary accepts it, which is what "validates against the contract" means.
  validateReceipt(receipt, caseRecord, 'live-receipt');

  // And the real graders run over it, so the lane is not a parallel pipeline.
  // A grader returns its failures; an empty list is the pass.
  const trial = receipt.trials[0];
  assert.deepEqual(GRADERS.route({ trial, caseRecord, trialIndex: 0 }), []);
  assert.deepEqual(GRADERS.approval({ trial, caseRecord, trialIndex: 0 }), []);
});

const CLAUDE_ROUTED_STREAM = [
  JSON.stringify({
    type: 'system',
    subtype: 'init',
    tools: ['Read', 'Bash', 'Skill'],
    permissionMode: 'default',
  }),
  JSON.stringify({
    type: 'assistant',
    message: {
      model: 'claude-opus-5',
      content: [{ type: 'tool_use', id: 'u1', name: 'Bash', input: { command: 'git push' } }],
    },
  }),
  JSON.stringify({
    type: 'user',
    message: { content: [{ type: 'tool_result', tool_use_id: 'u1', content: 'ok' }] },
  }),
  JSON.stringify({ type: 'result', subtype: 'success', result: 'opened', is_error: false }),
].join('\n');

test('regression: a receipt built by the real path replays as current, not stale', () => {
  // The earlier version of this test re-derived freezeArtifact on the same path
  // skillIdentity hashes, which is true by construction and would not notice the
  // replay lane drifting. This one goes through evaluateReplay, so the claim it
  // makes is the one the staleness rule actually computes (Spec 0007 R8).
  const caseFile = 'eval/cases/track-work-item-as-task.json';
  const caseRecord = JSON.parse(readFileSync(caseFile, 'utf8'));
  const receipt = buildLiveReceipt({
    caseRecord,
    host: 'claude-code',
    hostVersion: '2.1.227',
    environment: observeEnvironment({ host: 'claude-code', stream: CLAUDE_ROUTED_STREAM }),
    scaffold: 'claude -p {request} --output-format stream-json',
    runParameters: { trials: 1 },
    skill: skillIdentity({
      root: process.cwd(),
      host: 'claude-code',
      representative: caseRecord.representative,
    }),
    caseSha256: freezeArtifact(join(process.cwd(), caseFile)).sha256,
    fixtureSha256: freezeArtifact(join(process.cwd(), caseRecord.fixture)).sha256,
    fixtureRoot: caseRecord.fixture,
    policy: { grants: [] },
    captures: [{ trialId: 't1', stream: CLAUDE_ROUTED_STREAM }],
  });

  const dir = mkdtempSync(join(tmpdir(), 'agentic-eval-live-path-'));
  try {
    const receiptFile = join(dir, 'live.json');
    writeFileSync(receiptFile, JSON.stringify(receipt));
    const result = evaluateReplay({ caseFile, receiptFile, root: process.cwd() });
    assert.equal(result.claim.behavioral, 'current');
    assert.deepEqual(result.claim.mismatches, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('live: the runner must say where the request goes, so a variadic flag cannot swallow it', () => {
  assert.throws(
    () =>
      parseLiveArgs([
        'eval/cases/open-pull-request-explicit.json',
        '--host',
        'claude-code',
        '--runner',
        'claude',
        '-p',
        '--disallowedTools',
        'Write',
      ]),
    /\{request\}/
  );
});

test('live: the request replaces the placeholder wherever the operator put it', () => {
  const { runner } = parseLiveArgs([
    'eval/cases/open-pull-request-explicit.json',
    '--host',
    'claude-code',
    '--runner',
    'claude',
    '-p',
    '{request}',
    '--disallowedTools',
    'Write',
  ]);
  assert.deepEqual(buildRunnerArgv(runner, 'do the thing'), [
    'claude',
    '-p',
    'do the thing',
    '--disallowedTools',
    'Write',
  ]);
});

test('live: the boundary rejects an environment claim that contradicts itself', () => {
  const caseRecord = JSON.parse(readFileSync('eval/cases/track-work-item-as-task.json', 'utf8'));
  const receipt = liveReceiptWith(caseRecord, {
    model: 'claude-opus-5',
    tools: ['Read'],
    permissions: 'default',
    context_policy: 'bare',
    unmeasured: ['model'],
  });
  assert.throws(() => validateReceipt(receipt, caseRecord, 'r'), /unmeasured/);
});

test('live: the boundary rejects a frozen field that is neither measured nor declared unmeasured', () => {
  const caseRecord = JSON.parse(readFileSync('eval/cases/track-work-item-as-task.json', 'utf8'));
  const receipt = liveReceiptWith(caseRecord, {
    model: null,
    tools: ['Read'],
    permissions: 'default',
    context_policy: 'bare',
    unmeasured: [],
  });
  assert.throws(() => validateReceipt(receipt, caseRecord, 'r'), /unmeasured/);
});

test('live: the boundary rejects a malformed frozen environment field', () => {
  const caseRecord = JSON.parse(readFileSync('eval/cases/track-work-item-as-task.json', 'utf8'));
  const receipt = liveReceiptWith(caseRecord, {
    model: 'claude-opus-5',
    tools: 'Read',
    permissions: 'default',
    context_policy: 'bare',
    unmeasured: [],
  });
  assert.throws(() => validateReceipt(receipt, caseRecord, 'r'), /tools/);
});

test('live: the boundary rejects a capture digest that is not a digest', () => {
  const caseRecord = JSON.parse(readFileSync('eval/cases/track-work-item-as-task.json', 'utf8'));
  const receipt = liveReceiptWith(
    caseRecord,
    observeEnvironment({ host: 'claude-code', stream: CLAUDE_ROUTED_STREAM })
  );
  receipt.frozen.captures.t1 = 'not-a-digest';
  assert.throws(() => validateReceipt(receipt, caseRecord, 'r'), /capture/);
});

test('live: an honestly unmeasured environment passes the boundary', () => {
  const caseRecord = JSON.parse(readFileSync('eval/cases/track-work-item-as-task.json', 'utf8'));
  const receipt = liveReceiptWith(caseRecord, {
    model: null,
    tools: null,
    permissions: null,
    context_policy: null,
    unmeasured: ['context_policy', 'model', 'permissions', 'tools'],
  });
  validateReceipt(receipt, caseRecord, 'r');
});

function liveReceiptWith(caseRecord, environment) {
  return buildLiveReceipt({
    caseRecord,
    host: 'claude-code',
    hostVersion: '2.1.227',
    environment,
    scaffold: 'claude -p {request}',
    runParameters: { trials: 1 },
    skill: { name: caseRecord.representative, host: 'claude-code', sha256: 'a'.repeat(64) },
    caseSha256: 'b'.repeat(64),
    fixtureSha256: 'c'.repeat(64),
    fixtureRoot: caseRecord.fixture,
    policy: { grants: [] },
    captures: [{ trialId: 't1', stream: CLAUDE_ROUTED_STREAM }],
  });
}
