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

// Remove heredoc bodies, then quoted strings in one pass, so whichever quote
// opens first wins (an apostrophe inside double quotes stays literal).
export function stripLiterals(command) {
  let text = String(command);
  text = text.replace(
    /<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1[^\n]*\n[\s\S]*?\n\s*\2(?=\n|$)/g,
    '<<HEREDOC'
  );
  return text.replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, (match) => (match[0] === "'" ? "''" : '""'));
}

// The words of each simple command: split at operators, background `&`,
// command substitution and grouping, then drop leading assignments, shell
// keywords and wrappers that run the next word as the command.
const WRAPPERS = new Set([
  'sudo',
  'env',
  'nohup',
  'time',
  'command',
  'exec',
  'xargs',
  'nice',
  'setsid',
  'stdbuf',
  'timeout',
]);
const KEYWORDS = new Set([
  'if',
  'then',
  'else',
  'elif',
  'while',
  'until',
  'do',
  '!',
  '{',
  '}',
  'fi',
  'done',
]);
// Options that take a value, per wrapper, so the value is not read as the command.
const OPTION_WITH_VALUE = {
  sudo: new Set(['-u', '-g', '-C', '-h', '-p', '-r', '-t', '-U']),
  env: new Set(['-u', '-C', '-S']),
  nice: new Set(['-n']),
  timeout: new Set(['-s', '-k']),
  xargs: new Set(['-n', '-P', '-L', '-s', '-E', '-d']),
};

function commandWords(segment) {
  const words = segment.trim().split(/\s+/).filter(Boolean);
  while (words.length > 0) {
    const word = words[0];
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(word) || KEYWORDS.has(word)) {
      words.shift();
    } else if (word === 'mise' && words[1] === 'exec' && words.includes('--')) {
      // `mise exec <tools> -- cmd`: the command follows the separator.
      words.splice(0, words.indexOf('--') + 1);
    } else if (WRAPPERS.has(word.split('/').pop())) {
      const wrapper = words.shift().split('/').pop();
      while (words.length > 1 && /^-/.test(words[0])) {
        const flag = words.shift();
        if (OPTION_WITH_VALUE[wrapper]?.has(flag) && words.length > 1) words.shift();
      }
      // `timeout 5 cmd`: the duration precedes the command.
      if (wrapper === 'timeout' && words.length > 1 && /^\d/.test(words[0])) words.shift();
    } else {
      break;
    }
  }
  if (words.length > 0) words[0] = words[0].replace(/^\\/, '').split('/').pop();
  return words;
}

function commands(text) {
  return text
    .split(/;|\n|&&|\|\||\||&|\$\(|`|\(|\)/)
    .map(commandWords)
    .filter((words) => words.length > 0);
}

// Remove shell comments: a `#` that starts a word, to the end of its line.
function stripComments(text) {
  return text.replace(/(^|[\s;&|(])#[^\n]*/g, '$1');
}

function killsByName(text) {
  for (const [name, ...args] of commands(text)) {
    const verb = name.toLowerCase();
    const flags = args.map((a) => a.toLowerCase());
    if (verb === 'pkill' || verb === 'killall') return true;
    if (verb === 'taskkill' && flags.some((f) => f === '/im' || f === '-im')) return true;
    if (
      (verb === 'stop-process' || verb === 'spps') &&
      flags.some((f) => /^-(?:n|na|nam|name|processname)$/.test(f))
    ) {
      return true;
    }
  }
  // A name lookup piped or substituted into a kill.
  if (/\b(?:Get-Process|gps)\b[^\n;]*\|\s*(?:Stop-Process|spps)\b/i.test(text)) return true;
  if (/\bpgrep\b[^\n;&]*\|\s*xargs\s+(?:-\S+\s+)*kill\b/.test(text)) return true;
  if (/\bkill\b[^\n;&|]*(?:\$\(\s*pgrep\b|`\s*pgrep\b)/.test(text)) return true;
  return false;
}

// A check whose failure should stop a commit, read from a command's words:
// tests, lint, type checks, builds and the repository's verify gate.
const PACKAGE_RUNNERS = new Set(['npm', 'pnpm', 'yarn', 'bun']);
const CHECK_SCRIPT = /^(?:test|verify|lint|check|typecheck|build)(?::|$)/;
const CHECK_TOOLS = new Set([
  'eslint',
  'tsc',
  'ruff',
  'mypy',
  'vitest',
  'jest',
  'pytest',
  'gradlew',
  'prettier',
]);

function isCheck([name, ...args]) {
  if (PACKAGE_RUNNERS.has(name)) {
    const script = args[0] === 'run' ? args[1] : args[0];
    return CHECK_SCRIPT.test(script ?? '');
  }
  if (name === 'npx') return CHECK_TOOLS.has(args[0]);
  if (name === 'node')
    return args.includes('--test') || args.some((a) => /hook-npm-test|run-tests/.test(a));
  if (['dotnet', 'go', 'cargo'].includes(name))
    return /^(?:test|build|check|clippy)$/.test(args[0] ?? '');
  if (name === 'make') return /^(?:test|check|lint)$/.test(args[0] ?? '');
  return CHECK_TOOLS.has(name);
}

const GIT_GLOBAL_WITH_VALUE = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace']);

function isCommit([name, ...args]) {
  if (name !== 'git') return false;
  let i = 0;
  while (i < args.length && args[i].startsWith('-')) {
    i += GIT_GLOBAL_WITH_VALUE.has(args[i]) ? 2 : 1;
  }
  return args[i] === 'commit';
}

// A commit joined by ";" or a newline to an earlier check in the same line:
// a failed check does not stop it, whatever sits between them.
function commitAfterSemicolon(text) {
  // A group after `&&` runs only when what precedes it succeeded: its inner
  // ";" do not separate it from that check.
  const guarded = text.replace(
    /&&\s*([{(])([^{}()]*)([})])/g,
    (_, open, body, close) => `&& ${open}${body.replace(/;|\n/g, ' && ')}${close}`
  );
  const segments = guarded.split(/;|\n/).map((segment) => commands(segment));
  for (let i = 1; i < segments.length; i += 1) {
    if (!segments[i].some(isCommit)) continue;
    if (segments.slice(0, i).some((list) => list.some(isCheck))) return true;
  }
  return false;
}

/** The guard's decision for one shell command line. */
export function verdict(command) {
  const text = stripComments(stripLiterals(command));
  if (killsByName(text)) {
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
