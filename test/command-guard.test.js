import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verdict } from '../src/skills/claude-code/ad-hooks/scripts/command-guard.mjs';

// Task 0121: deny a closed list of destructive shell patterns before they
// run, through the public verdict() and the hook's stdin/stdout contract.
const GUARD = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'skills',
  'claude-code',
  'ad-hooks',
  'scripts',
  'command-guard.mjs'
);

const DENIED = [
  ['pkill python', 'kill-by-name'],
  ['killall node', 'kill-by-name'],
  ['taskkill /F /IM python.exe', 'kill-by-name'],
  ['Stop-Process -Name python -Force', 'kill-by-name'],
  ['pgrep -f server | xargs kill', 'kill-by-name'],
  ['kill $(pgrep node)', 'kill-by-name'],
  ['kill -9 `pgrep node`', 'kill-by-name'],
  ['npm test; git commit -m x', 'commit-after-semicolon'],
  ['npm run verify\ngit -C repo commit -m x', 'commit-after-semicolon'],
  ['node --test test/a.test.js; git commit -m x', 'commit-after-semicolon'],
  ['npx eslint . ; git commit -am x', 'commit-after-semicolon'],
];

const ALLOWED = [
  'kill 1234',
  'kill -9 1234 5678',
  'npm test && git commit -m x',
  'git commit -m "block pkill; git commit"',
  "echo 'killall node is denied'",
  "cat > notes.md <<'EOF'\npkill python\nnpm test; git commit -m x\nEOF",
  'pgrep -fl node',
  'cd repo; git commit -m x',
  'git commit -m x',
  'ls; pwd',
  'git init -q; git add f; git commit -m x',
  'git status --porcelain | head; git commit -m x',
  'echo done; git commit -m x',
];

for (const [command, rule] of DENIED) {
  test(`command guard denies ${JSON.stringify(command)} as ${rule}`, () => {
    const result = verdict(command);
    assert.equal(result.deny, true);
    assert.equal(result.rule, rule);
  });
}

for (const command of ALLOWED) {
  test(`command guard allows ${JSON.stringify(command)}`, () => {
    assert.equal(verdict(command).deny, false);
  });
}

function runGuard(input, env = {}) {
  return execFileSync('node', [GUARD], {
    input,
    encoding: 'utf8',
    env: { ...process.env, AD_COMMAND_GUARD: '', ...env },
  });
}

test('command guard prints a PreToolUse deny decision for a denied Bash command', () => {
  const out = runGuard(
    JSON.stringify({
      hook_event_name: 'PreToolUse',
      tool_name: 'Bash',
      tool_input: { command: 'pkill node' },
    })
  );
  const decision = JSON.parse(out).hookSpecificOutput;
  assert.equal(decision.hookEventName, 'PreToolUse');
  assert.equal(decision.permissionDecision, 'deny');
  assert.match(decision.permissionDecisionReason, /PID/);
});

test('command guard reads a PowerShell tool call the same way', () => {
  const out = runGuard(
    JSON.stringify({
      hook_event_name: 'PreToolUse',
      tool_name: 'PowerShell',
      tool_input: { command: 'Stop-Process -Name python' },
    })
  );
  assert.equal(JSON.parse(out).hookSpecificOutput.permissionDecision, 'deny');
});

test('command guard is silent on allowed, malformed, non-shell or switched-off input', () => {
  const allowed = JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'kill 42' } });
  assert.equal(runGuard(allowed), '');
  assert.equal(runGuard('not json'), '');
  assert.equal(runGuard(''), '');
  assert.equal(runGuard(JSON.stringify({ tool_name: 'Read', tool_input: { file_path: 'x' } })), '');
  const denied = JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'pkill node' } });
  assert.equal(runGuard(denied, { AD_COMMAND_GUARD: '0' }), '');
});
