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
  // Review of 4b9c31c: evasions and the check-stage-commit shape.
  [`echo "it's done"; pkill python; echo 'x'`, 'kill-by-name'],
  [`git commit -m "don't"; pkill python; echo 'ok'`, 'kill-by-name'],
  ['Stop-Process -ProcessName python', 'kill-by-name'],
  ['spps -Name python', 'kill-by-name'],
  ['Get-Process python | Stop-Process', 'kill-by-name'],
  ['sudo pkill -f server', 'kill-by-name'],
  ['npm test || echo fail; git commit -m x', 'commit-after-semicolon'],
  ['npm run verify; git add -A; git commit -m x', 'commit-after-semicolon'],
  // Delta review of 01bf454: common agent shapes that evaded.
  ['true & pkill x', 'kill-by-name'],
  ['if true; then pkill x; fi', 'kill-by-name'],
  ['for i in 1; do killall x; done', 'kill-by-name'],
  ['{ pkill x; }', 'kill-by-name'],
  ['sudo -u bob pkill x', 'kill-by-name'],
  ['nice pkill x', 'kill-by-name'],
  ['timeout 5 pkill x', 'kill-by-name'],
  ['/usr/bin/pkill x', 'kill-by-name'],
  ['sudo -n pkill x', 'kill-by-name'],
  ['nice -n 10 pkill x', 'kill-by-name'],
  ['xargs -I{} pkill {}', 'kill-by-name'],
  ['npm test; git --no-pager commit -m x', 'commit-after-semicolon'],
  ['npm test; sudo git commit -m x', 'commit-after-semicolon'],
  ['mise exec node@24 -- npm run verify > log; git commit -m x', 'commit-after-semicolon'],
  ['mise exec node@24 -- pkill node', 'kill-by-name'],
  ['npm test; if true; then git commit -m x; fi', 'commit-after-semicolon'],
  // Delta review of 1398b38 and its audit: groups, comments and wrappers.
  ['cd repo && { npm test; git commit -m x; }', 'commit-after-semicolon'],
  ['git add . && { npm test; git commit -m x; }', 'commit-after-semicolon'],
  ["npm test # it's red\ngit commit -m 'x'", 'commit-after-semicolon'],
  ['npm test; rtk proxy git commit -m x', 'commit-after-semicolon'],
  ['rtk pkill python', 'kill-by-name'],
  ['npx -y eslint .; git commit -m x', 'commit-after-semicolon'],
  ['if npm test; then echo ok; else git commit -m x; fi', 'commit-after-semicolon'],
  ['npm test; ( cd sub && git commit -m x )', 'commit-after-semicolon'],
  ['for p in $(pgrep -f server); do pkill -TERM -P $p; done', 'kill-by-name'],
  ['# a note |\npkill node', 'kill-by-name'],
  ['# run && \npkill node', 'kill-by-name'],
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
  'man pkill',
  'which killall',
  'grep -rn pkill src/',
  'echo pkill is denied',
  'Get-Process python',
  'npm test && git add -A && git commit -m x',
  '# npm test\ngit commit -m x',
  'echo npm test; git commit -m x',
  'npm run verify > log && { grep x log; git add -A && git commit -m y; } || echo RED',
  'npm test && (git add -A; git commit -m y)',
  'npm test && { a; { b; }; git commit -m x; }',
  'npm test && { a; (b); git commit -m x; }',
  'npm test && \\\n  git commit -m x',
  'command -v pkill >/dev/null || echo no',
  'if npm test; then git commit -m x; fi',
  'npm test || exit 1; git commit -m x',
  'rtk git commit -m x',
  'git commit -m "fix #12"; git push',
  'pkill -P 54608',
  'npm test &&\n  git commit -m x',
  'npm test ||\n  echo failed',
  'ps aux |\n  grep node',
  'cat > f <<EOF\npkill node |\nEOF\necho done',
  'npm test && git commit -F - <<EOF\n| a | b |\n| pkill node |\nEOF',
  'cat > n <<EOF\nnpm test |\nEOF\ngit commit -m x',
  'pkill -TERM -P 1234 -f worker',
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
