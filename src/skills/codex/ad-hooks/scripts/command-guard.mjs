#!/usr/bin/env node
/**
 * ad-hooks command guard (task-0121).
 *
 * A `PreToolUse` command hook on Bash (and PowerShell on Claude Code) that
 * denies a closed list of destructive shell patterns before they run:
 *   - kill-by-name: `pkill`, `killall`, `taskkill /IM`, `Stop-Process -Name`,
 *     and a kill fed by `pgrep`. A process started elsewhere — another
 *     session, a scheduled job — dies with the one meant; kill by PID.
 *   - commit-after-semicolon: `git commit` chained after a check (tests, lint,
 *     type check, build, verify) with `;` or a newline, so a failed check does
 *     not stop the commit; use `&&`.
 * Quoted strings and heredoc bodies are removed before matching, so text
 * that only mentions a pattern is allowed.
 *
 * Contract: stdin is the host's PreToolUse event JSON; a denied command
 * prints one `hookSpecificOutput` deny decision with the reason and the fix.
 * Anything else, including malformed input and internal errors, prints
 * nothing and exits 0. `AD_COMMAND_GUARD=0` silences it.
 *
 * Zero dependencies; byte-identical in both host trees.
 */

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const SHELL_TOOLS = new Set(['Bash', 'PowerShell']);

// Remove heredoc bodies, then quoted strings, keeping the command words.
export function stripLiterals(command) {
  let text = String(command);
  text = text.replace(
    /<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1[^\n]*\n[\s\S]*?\n\s*\2(?=\n|$)/g,
    '<<HEREDOC'
  );
  text = text.replace(/'[^']*'/g, "''");
  text = text.replace(/"(?:\\.|[^"\\])*"/g, '""');
  return text;
}

const KILL_BY_NAME = [
  /(^|[\s;&|(`])pkill\b/,
  /(^|[\s;&|(`])killall\b/,
  /\btaskkill\b[^\n;&|]*\s\/im\b/i,
  /\bStop-Process\b[^\n;&|]*\s-Name\b/i,
  /\bpgrep\b[^\n;&]*\|\s*xargs\s+(?:-\S+\s+)*kill\b/,
  /\bkill\b[^\n;&|]*(?:\$\(\s*pgrep\b|`\s*pgrep\b)/,
];

// A check whose failure should stop a commit: tests, lint, type checks,
// builds and the repository's verify gate.
const CHECK_SEGMENT =
  /\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?(?:test|verify|lint|check|typecheck|build)\b|\bnpx\s+(?:eslint|prettier|tsc|vitest|jest)\b|\bnode\s+--test\b|\bpytest\b|\b(?:dotnet|go|cargo)\s+(?:test|build|check|clippy)\b|\bmake\s+(?:test|check|lint)\b|\b(?:eslint|tsc|ruff|mypy|vitest|jest)\b|hook-npm-test|run-tests/;
const GIT_COMMIT = /^\s*git(?:\s+-C\s+\S+|\s+-c\s+\S+)*\s+commit\b/;

// A commit whose previous command, joined by ";" or a newline, is a check.
function commitAfterSemicolon(text) {
  const segments = text.split(/;|\n/);
  for (let i = 1; i < segments.length; i += 1) {
    if (!GIT_COMMIT.test(segments[i])) continue;
    const previous = segments[i - 1].split(/&&|\|\|/).pop();
    if (CHECK_SEGMENT.test(previous)) return true;
  }
  return false;
}

/** The guard's decision for one shell command line. */
export function verdict(command) {
  const text = stripLiterals(command);
  if (KILL_BY_NAME.some((pattern) => pattern.test(text))) {
    return {
      deny: true,
      rule: 'kill-by-name',
      reason:
        'Blocked: killing processes by name also kills processes this session did not start ' +
        '(another session, a scheduled job). Find the PID of the process you started and use kill <PID>.',
    };
  }
  if (commitAfterSemicolon(text)) {
    return {
      deny: true,
      rule: 'commit-after-semicolon',
      reason:
        'Blocked: a commit chained with ";" or a newline runs even when the command before it failed. ' +
        'Chain it with "&&" so a failed check stops the commit.',
    };
  }
  return { deny: false, rule: null, reason: null };
}

function main() {
  if (process.env.AD_COMMAND_GUARD === '0') return;
  let event;
  try {
    event = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return;
  }
  if (event === null || typeof event !== 'object') return;
  if (!SHELL_TOOLS.has(event.tool_name)) return;
  const command = event.tool_input?.command;
  if (typeof command !== 'string') return;
  const result = verdict(command);
  if (!result.deny) return;
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: result.reason,
      },
    })
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch {
    process.exitCode = 0;
  }
}
