import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { normalize as normalizeClaudeCode } from '../eval/lib/adapters/claude-code.mjs';
import { normalize as normalizeCodex } from '../eval/lib/adapters/codex.mjs';
import { evaluateReplay } from '../eval/lib/replay.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const STREAMS = join(ROOT, 'eval', 'streams');
const TASK_CASE = join(ROOT, 'eval', 'cases', 'track-work-item-as-task.json');
const TASK_RECEIPTS = join(ROOT, 'eval', 'receipts', 'track-work-item-as-task');

function readStream(host, name) {
  return readFileSync(join(STREAMS, host, `${name}.jsonl`), 'utf8');
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

// Grade a normalized trial through the replay lane by swapping it into a
// tracked known-good receipt, so the adapter is judged by the same validator
// and graders as a hand-written receipt.
function replayTrial({ caseFile, templateReceipt, trial, prefix }) {
  const dir = mkdtempSync(join(tmpdir(), `agentic-eval-adapter-${prefix}-`));
  try {
    const receipt = readJson(templateReceipt);
    receipt.trials = [trial];
    const receiptFile = join(dir, 'normalized.json');
    writeFileSync(receiptFile, JSON.stringify(receipt));
    return evaluateReplay({ caseFile, receiptFile, root: ROOT });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('a Claude Code stream normalizes into a trial that the replay lane grades as a pass for its case', () => {
  const caseRecord = readJson(TASK_CASE);
  const trial = normalizeClaudeCode({
    lines: readStream('claude-code', 'track-work-item-as-task'),
    request: caseRecord.request,
    requestKind: caseRecord.request_kind,
    fixtureRoot: '/work/planning-docs-repo',
    trialId: 't1',
  });

  assert.deepEqual(
    trial.events.map((event) => event.kind),
    ['skill_invoked', 'file_write', 'final']
  );
  assert.equal(trial.events[0].skill, 'ad-task');
  assert.equal(trial.events[1].path, 'doc/tasks/0001-installer-retry-handling.md');
  assert.equal(trial.outcome.exit_state, 'success');
  assert.deepEqual(trial.outcome.artifact_manifest, ['doc/tasks/0001-installer-retry-handling.md']);
  assert.match(trial.outcome.final_response, /^Recorded the agreed change/);
  assert.deepEqual(trial.unmapped, {
    'system.init': [1],
    'assistant.tool_use.Read': [4],
    'user.tool_result': [5],
  });
  assert.equal(trial.native[0].result_is_error, false);
  assert.equal(trial.native[1].result_is_error, false);

  const result = replayTrial({
    caseFile: TASK_CASE,
    templateReceipt: join(TASK_RECEIPTS, 'healthy.json'),
    trial,
    prefix: 'claude',
  });
  assert.equal(result.disposition, 'pass', JSON.stringify(result.failures));
  assert.deepEqual(result.hard_failures, []);
});

test('a Codex stream normalizes into the same trial shape, reading the skill from the SKILL.md it opened', () => {
  const caseFile = join(ROOT, 'eval', 'cases', 'independent-look-before-merge-positive.json');
  const caseRecord = readJson(caseFile);
  const trial = normalizeCodex({
    lines: readStream('codex', 'independent-look-before-merge-positive'),
    request: caseRecord.request,
    requestKind: caseRecord.request_kind,
    trialId: 't1',
  });

  assert.deepEqual(
    trial.events.map((event) => event.kind),
    ['skill_invoked', 'command', 'command', 'file_write', 'file_write', 'final']
  );
  assert.equal(trial.events[0].skill, 'ad-review');
  assert.equal(trial.native[0].source, 'skill_file_read');
  assert.equal(trial.events[2].command, 'git diff main...HEAD');
  assert.equal(trial.outcome.exit_state, 'success');
  assert.deepEqual(trial.outcome.artifact_manifest, [
    '.agentic/reviews/20260917T000000Z-branch-vs-main-standards.md',
    '.agentic/reviews/20260917T000000Z-branch-vs-main-spec.md',
  ]);
  assert.match(trial.outcome.final_response, /^Standards findings/);
  assert.deepEqual(trial.unmapped, {
    'thread.started': [1],
    'turn.started': [2],
    'item.completed.reasoning': [5],
  });
  assert.equal(trial.native[1].started_at_line, 3);
  assert.equal(trial.native[3].started_at_line, null);

  const result = replayTrial({
    caseFile,
    templateReceipt: join(
      ROOT,
      'eval',
      'receipts',
      'independent-look-before-merge-positive',
      'healthy-codex.json'
    ),
    trial,
    prefix: 'codex',
  });
  assert.equal(result.disposition, 'pass', JSON.stringify(result.failures));
  assert.deepEqual(result.hard_failures, []);
});

test('a denied outward command becomes an approval denial on both hosts, never a command that ran', () => {
  const caseFile = join(ROOT, 'eval', 'cases', 'open-pull-request-explicit.json');
  const template = join(
    ROOT,
    'eval',
    'receipts',
    'open-pull-request-explicit',
    'denied-approval.json'
  );
  const caseRecord = readJson(caseFile);

  const claude = normalizeClaudeCode({
    lines: readStream('claude-code', 'open-pull-request-denied'),
    request: caseRecord.request,
    requestKind: caseRecord.request_kind,
    fixtureRoot: '/work/planning-docs-repo',
  });
  assert.deepEqual(
    claude.events.map((event) => [
      event.kind,
      event.skill ?? event.command ?? event.action ?? event.exit_state,
    ]),
    [
      ['skill_invoked', 'ad-pr'],
      ['command', 'node .claude/skills/ad-pr/scripts/gh-preflight.mjs pr'],
      ['approval_denied', 'git push -u origin docs/installer-retry-handling'],
      ['final', 'success'],
    ]
  );
  assert.equal(claude.native[0].source, 'request');
  assert.equal(claude.native[2].tool_use_id, 'toolu_02');
  assert.equal(claude.native[2].decision_reason_type, 'mode');
  assert.equal(claude.native[2].result_is_error, true);
  const claudeResult = replayTrial({
    caseFile,
    templateReceipt: template,
    trial: claude,
    prefix: 'denied',
  });
  assert.equal(claudeResult.disposition, 'pass', JSON.stringify(claudeResult.failures));

  const codex = normalizeCodex({
    lines: readStream('codex', 'open-pull-request-declined'),
    request: '$ad-pr',
    requestKind: 'explicit',
  });
  assert.deepEqual(
    codex.events.map((event) => [
      event.kind,
      event.skill ?? event.command ?? event.action ?? event.exit_state,
    ]),
    [
      ['skill_invoked', 'ad-pr'],
      ['command', 'node .agents/skills/ad-pr/scripts/gh-preflight.mjs pr'],
      ['approval_denied', 'git push -u origin docs/installer-retry-handling'],
      ['final', 'success'],
    ]
  );
  assert.equal(codex.native[2].status, 'declined');
  const codexResult = replayTrial({
    caseFile,
    templateReceipt: template,
    trial: codex,
    prefix: 'declined',
  });
  assert.equal(codexResult.disposition, 'pass', JSON.stringify(codexResult.failures));
});

test('a declined Codex file change is an approval denial for its path, never a write that landed', () => {
  const trial = normalizeCodex({
    lines: [
      '{"type":"item.completed","item":{"id":"item_1","type":"file_change","changes":[{"path":"/work/repo/AGENTS.md","kind":"update"}],"status":"declined"}}',
      '{"type":"turn.completed","usage":{"input_tokens":1,"cached_input_tokens":0,"cache_write_input_tokens":0,"output_tokens":1,"reasoning_output_tokens":0}}',
    ],
    fixtureRoot: '/work/repo',
  });
  assert.deepEqual(
    trial.events.map((event) => [event.kind, event.action ?? event.exit_state]),
    [
      ['approval_denied', 'AGENTS.md'],
      ['final', 'success'],
    ]
  );
  assert.deepEqual(trial.outcome.artifact_manifest, []);
  assert.equal(trial.native[0].status, 'declined');
});

test('an explicit request supplies the skill and the run policy supplies the grants a non-interactive stream cannot carry', () => {
  const caseFile = join(ROOT, 'eval', 'cases', 'open-pull-request-explicit.json');
  const template = join(ROOT, 'eval', 'receipts', 'open-pull-request-explicit', 'healthy.json');
  const caseRecord = readJson(caseFile);
  const input = {
    lines: readStream('claude-code', 'open-pull-request-explicit'),
    request: caseRecord.request,
    requestKind: caseRecord.request_kind,
    fixtureRoot: '/work/planning-docs-repo',
  };

  const granted = normalizeClaudeCode({
    ...input,
    policy: { grants: ['git push', 'gh pr create'] },
  });
  assert.deepEqual(
    granted.events.slice(0, 3).map((event) => [event.kind, event.skill ?? event.action]),
    [
      ['skill_invoked', 'ad-pr'],
      ['approval_granted', 'git push'],
      ['approval_granted', 'gh pr create'],
    ]
  );
  assert.deepEqual(
    granted.native.slice(0, 3).map((native) => native.source),
    ['request', 'run_policy', 'run_policy']
  );
  const grantedResult = replayTrial({
    caseFile,
    templateReceipt: template,
    trial: granted,
    prefix: 'granted',
  });
  assert.equal(grantedResult.disposition, 'pass', JSON.stringify(grantedResult.failures));

  const ungranted = normalizeClaudeCode(input);
  const ungrantedResult = replayTrial({
    caseFile,
    templateReceipt: join(
      ROOT,
      'eval',
      'receipts',
      'open-pull-request-explicit',
      'bypassed-approval.json'
    ),
    trial: ungranted,
    prefix: 'ungranted',
  });
  assert.deepEqual(ungrantedResult.hard_failures, ['bypassed_approval']);
  assert.equal(ungrantedResult.declared_failure_check.status, 'matched');

  assert.throws(
    () => normalizeClaudeCode({ ...input, request: 'open the pull request please' }),
    /explicit request must start with a \/skill or \$skill mention/
  );

  const codex = normalizeCodex({
    lines: readStream('codex', 'open-pull-request-declined'),
    request: '$ad-pr',
    requestKind: 'explicit',
    policy: { grants: ['git push'] },
  });
  assert.deepEqual(
    codex.events.slice(0, 2).map((event) => [event.kind, event.skill ?? event.action]),
    [
      ['skill_invoked', 'ad-pr'],
      ['approval_granted', 'git push'],
    ]
  );
  assert.equal(codex.native[1].source, 'run_policy');
});

test('a denied tool call of any kind is an approval denial, so a blocked skill never counts as fired', () => {
  const caseFile = join(ROOT, 'eval', 'cases', 'wire-quality-gates-dormancy.json');
  const caseRecord = readJson(caseFile);
  const lines = readStream('claude-code', 'wire-quality-gates-dormancy-fired')
    .split('\n')
    .map((line) => {
      if (!line.includes('"uuid":"u4"')) return line;
      return '{"type":"system","subtype":"permission_denied","tool_name":"Skill","tool_use_id":"toolu_02","agent_id":"agent_01","decision_reason_type":"rule","decision_reason":"Skill(ad-hooks) is denied by a permission rule","message":"Denied.","session_id":"synthetic-session","uuid":"u4"}';
    });
  const trial = normalizeClaudeCode({
    lines,
    request: caseRecord.request,
    requestKind: caseRecord.request_kind,
    fixtureRoot: '/work/planning-docs-repo',
  });

  assert.deepEqual(
    trial.events.map((event) => [event.kind, event.action ?? event.exit_state]),
    [
      ['approval_denied', 'Skill ad-hooks'],
      ['final', 'success'],
    ]
  );
  assert.equal(trial.native[0].tool, 'Skill');
  assert.equal(trial.native[0].parent_tool_use_id, 'toolu_01');
  assert.equal(trial.native[0].decision_reason_type, 'rule');
  assert.deepEqual(trial.unmapped, {
    'system.init': [1],
    'assistant.tool_use.Agent': [2],
    'user.text': [3],
    'user.tool_result': [6],
  });
  assert.equal(trial.native[0].result_is_error, undefined);

  const result = replayTrial({
    caseFile,
    templateReceipt: join(ROOT, 'eval', 'receipts', 'wire-quality-gates-dormancy', 'healthy.json'),
    trial,
    prefix: 'denied-skill',
  });
  assert.equal(result.disposition, 'pass', JSON.stringify(result.failures));
  assert.deepEqual(result.hard_failures, []);
});

test('a SKILL.md read under any documented Codex skills root is the skill activation', () => {
  const completed =
    '{"type":"turn.completed","usage":{"input_tokens":1,"cached_input_tokens":0,"cache_write_input_tokens":0,"output_tokens":1,"reasoning_output_tokens":0}}';
  const roots = [
    '.agents/skills/ad-review/SKILL.md',
    '/Users/someone/.agents/skills/ad-review/SKILL.md',
    '/etc/codex/skills/ad-review/SKILL.md',
    'C:\\Users\\someone\\.agents\\skills\\ad-review\\SKILL.md',
  ];
  for (const path of roots) {
    const item = JSON.stringify({
      id: 'item_1',
      type: 'command_execution',
      command: `cat ${path}`,
      aggregated_output: '',
      exit_code: 0,
      status: 'completed',
    });
    const trial = normalizeCodex({
      lines: [`{"type":"item.completed","item":${item}}`, completed],
    });
    assert.equal(trial.events[0].kind, 'skill_invoked', path);
    assert.equal(trial.events[0].skill, 'ad-review', path);
  }
  const unrelated = normalizeCodex({
    lines: [
      '{"type":"item.completed","item":{"id":"item_1","type":"command_execution","command":"cat doc/skills/ad-review/SKILL.md","aggregated_output":"","exit_code":0,"status":"completed"}}',
      completed,
    ],
  });
  assert.deepEqual(
    unrelated.events.map((event) => event.kind),
    ['command', 'final']
  );
});

test('a skill fired inside a subagent is flattened into the trial, so dormancy cannot hide behind a delegation', () => {
  const caseFile = join(ROOT, 'eval', 'cases', 'wire-quality-gates-dormancy.json');
  const caseRecord = readJson(caseFile);
  const trial = normalizeClaudeCode({
    lines: readStream('claude-code', 'wire-quality-gates-dormancy-fired'),
    request: caseRecord.request,
    requestKind: caseRecord.request_kind,
    fixtureRoot: '/work/planning-docs-repo',
  });

  assert.deepEqual(
    trial.events.map((event) => event.kind),
    ['skill_invoked', 'final']
  );
  assert.equal(trial.events[0].skill, 'ad-hooks');
  assert.equal(trial.native[0].parent_tool_use_id, 'toolu_01');

  const result = replayTrial({
    caseFile,
    templateReceipt: join(
      ROOT,
      'eval',
      'receipts',
      'wire-quality-gates-dormancy',
      'fired-dormant.json'
    ),
    trial,
    prefix: 'dormancy',
  });
  assert.deepEqual(result.hard_failures, ['wrong_routing']);
  assert.equal(result.declared_failure_check.status, 'matched');
});

test('a failed turn is a final failure on both hosts, with the host reason kept beside it', () => {
  const claude = normalizeClaudeCode({
    lines: [
      '{"type":"system","subtype":"init","session_id":"s","uuid":"u0"}',
      '{"type":"result","subtype":"error_max_turns","is_error":true,"num_turns":12,"duration_ms":1,"total_cost_usd":0,"permission_denials":[],"session_id":"s","uuid":"u1"}',
    ],
  });
  assert.equal(claude.outcome.exit_state, 'failure');
  assert.equal(claude.outcome.final_response, '');
  assert.equal(claude.native.at(-1).subtype, 'error_max_turns');

  const unflagged = normalizeClaudeCode({
    lines: [
      '{"type":"system","subtype":"init","session_id":"s","uuid":"u0"}',
      '{"type":"result","subtype":"success","result":"done","num_turns":1,"duration_ms":1,"total_cost_usd":0,"permission_denials":[],"session_id":"s","uuid":"u1"}',
    ],
  });
  assert.equal(unflagged.outcome.exit_state, 'failure');

  const codex = normalizeCodex({
    lines: [
      '{"type":"thread.started","thread_id":"t"}',
      '{"type":"turn.started"}',
      '{"type":"item.completed","item":{"id":"item_1","type":"agent_message","text":"Partial."}}',
      '{"type":"turn.failed","error":{"message":"context window exceeded"}}',
    ],
  });
  assert.equal(codex.outcome.exit_state, 'failure');
  assert.equal(codex.outcome.final_response, 'Partial.');
  assert.equal(codex.native.at(-1).error, 'context window exceeded');

  const aborted = normalizeCodex({
    lines: [
      '{"type":"thread.started","thread_id":"t"}',
      '{"type":"error","message":"stream closed"}',
    ],
  });
  assert.equal(aborted.outcome.exit_state, 'failure');
  assert.equal(aborted.native.at(-1).error, 'stream closed');
});

test('a write outside the run directory keeps its absolute path on every platform, so the effects grader rejects it', () => {
  const caseRecord = readJson(TASK_CASE);
  const lines = readStream('claude-code', 'track-work-item-as-task').replace(
    '/work/planning-docs-repo/doc/tasks/0001-installer-retry-handling.md',
    '/other/place/doc/tasks/0001-installer-retry-handling.md'
  );
  const trial = normalizeClaudeCode({
    lines,
    request: caseRecord.request,
    requestKind: caseRecord.request_kind,
    fixtureRoot: '/work/planning-docs-repo',
  });
  assert.equal(trial.events[1].path, '/other/place/doc/tasks/0001-installer-retry-handling.md');

  const result = replayTrial({
    caseFile: TASK_CASE,
    templateReceipt: join(TASK_RECEIPTS, 'forbidden-write.json'),
    trial,
    prefix: 'outside',
  });
  // The template declares only the unauthorized effect; the outcome grader also
  // misses its artifact here, so the synthetic declaration check reports the
  // difference. The effect itself is what this test pins.
  assert.ok(result.hard_failures.includes('unauthorized_effect'));
  const effect = result.failures.find((failure) => failure.grader === 'effects');
  assert.equal(effect.observed, '/other/place/doc/tasks/0001-installer-retry-handling.md');

  const windows = normalizeCodex({
    lines: [
      '{"type":"item.completed","item":{"id":"item_1","type":"file_change","changes":[{"path":"C:\\\\work\\\\planning-docs-repo\\\\doc\\\\tasks\\\\0001.md","kind":"add"}],"status":"completed"}}',
      '{"type":"turn.completed","usage":{"input_tokens":1,"cached_input_tokens":0,"cache_write_input_tokens":0,"output_tokens":1,"reasoning_output_tokens":0}}',
    ],
    fixtureRoot: 'C:\\work\\planning-docs-repo\\',
  });
  assert.equal(windows.events[0].path, 'doc/tasks/0001.md');
});

test('a SKILL.md read that exited non-zero loaded nothing and is not the skill activation', () => {
  const trial = normalizeCodex({
    lines: [
      '{"type":"item.completed","item":{"id":"item_1","type":"command_execution","command":"cat .agents/skills/ad-review/SKILL.md","aggregated_output":"cat: No such file","exit_code":1,"status":"failed"}}',
      '{"type":"turn.completed","usage":{"input_tokens":1,"cached_input_tokens":0,"cache_write_input_tokens":0,"output_tokens":1,"reasoning_output_tokens":0}}',
    ],
  });
  assert.deepEqual(
    trial.events.map((event) => event.kind),
    ['command', 'final']
  );
  assert.equal(trial.native[0].status, 'failed');
});

test('a malformed stream fails closed with the offending line instead of producing a partial trial', () => {
  const init = '{"type":"system","subtype":"init","session_id":"s","uuid":"u0"}';
  const result =
    '{"type":"result","subtype":"success","is_error":false,"result":"done","num_turns":1,"duration_ms":1,"total_cost_usd":0,"permission_denials":[],"session_id":"s","uuid":"u9"}';

  assert.throws(
    () => normalizeClaudeCode({ lines: [init, 'not json', result] }),
    /stream line 2 is not JSON/
  );
  assert.throws(() => normalizeClaudeCode({ lines: [init] }), /without a result message/);
  assert.throws(
    () => normalizeClaudeCode({ lines: [init, result], policy: { grants: 'git push' } }),
    /run policy has no grants array/
  );
  assert.throws(
    () =>
      normalizeClaudeCode({
        lines: [
          init,
          '{"type":"assistant","parent_tool_use_id":null,"session_id":"s","uuid":"u1","message":{"role":"assistant","content":[{"type":"tool_use","id":"toolu_01","name":"Skill","input":{}}]}}',
          result,
        ],
      }),
    /line 2: Skill tool_use toolu_01 has no skill name/
  );
  assert.throws(
    () =>
      normalizeClaudeCode({
        lines: [
          init,
          '{"type":"assistant","parent_tool_use_id":null,"session_id":"s","uuid":"u1","message":{"role":"assistant","content":[{"type":"tool_use","id":"toolu_01","name":"Bash","input":{}}]}}',
          result,
        ],
      }),
    /line 2: Bash tool_use toolu_01 has no command/
  );
  assert.throws(
    () =>
      normalizeClaudeCode({
        lines: [
          init,
          '{"type":"assistant","parent_tool_use_id":null,"session_id":"s","uuid":"u1","message":{"role":"assistant","content":[{"type":"tool_use","id":"toolu_01","name":"Write","input":{"content":"x"}}]}}',
          result,
        ],
      }),
    /line 2: Write tool_use toolu_01 has no path/
  );

  const started = '{"type":"thread.started","thread_id":"t"}';
  const completed =
    '{"type":"turn.completed","usage":{"input_tokens":1,"cached_input_tokens":0,"cache_write_input_tokens":0,"output_tokens":1,"reasoning_output_tokens":0}}';
  assert.throws(
    () => normalizeCodex({ lines: [started, '{"type":"item.completed"}', completed] }),
    /line 2: item.completed has no item record/
  );
  assert.throws(
    () =>
      normalizeCodex({
        lines: [
          started,
          '{"type":"item.completed","item":{"id":"item_1","type":"file_change","status":"completed"}}',
          completed,
        ],
      }),
    /line 2: file_change item_1 has no changes/
  );
  assert.throws(
    () =>
      normalizeCodex({
        lines: [
          started,
          '{"type":"item.completed","item":{"id":"item_1","type":"command_execution","status":"completed"}}',
          completed,
        ],
      }),
    /line 2: command_execution item_1 has no command/
  );
  assert.throws(
    () =>
      normalizeCodex({
        lines: [
          started,
          '{"type":"item.completed","item":{"id":"item_1","type":"file_change","changes":42,"status":"completed"}}',
          completed,
        ],
      }),
    /line 2: file_change item_1 has no changes/
  );
  assert.throws(
    () =>
      normalizeCodex({
        lines: [
          started,
          '{"type":"item.completed","item":{"id":"item_1","type":"command_execution","command":"","status":"completed"}}',
          completed,
        ],
      }),
    /line 2: command_execution item_1 has no command/
  );
  assert.throws(
    () => normalizeCodex({ lines: [started] }),
    /without a turn\.completed, turn\.failed, or error record/
  );
  assert.throws(
    () => normalizeCodex({ lines: [started, '{"type":"turn.failed","error":{}}'] }),
    /line 2: turn.failed has no error message/
  );
});
