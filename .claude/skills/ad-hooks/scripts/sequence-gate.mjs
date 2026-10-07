#!/usr/bin/env node
/**
 * ad-hooks receipt gates — the shadow sequence gate (ADR-0089, tasks 0107
 * to 0109).
 *
 * A `PreToolUse` command hook on Bash for Claude Code and Codex. Before a
 * landing action it checks that each step the action depends on left a fresh
 * receipt, and appends one evidence line per check saying whether the action
 * would have been blocked. Shadow mode is the only mode: the gate always exits
 * 0 and prints nothing, so the host proceeds and neither the model nor the
 * owner sees it (GROUND-0038 E1).
 *
 * Contract:
 *   - stdin: the host's PreToolUse event JSON. A shell command is
 *     `tool_input.command` under `tool_name: "Bash"` on both hosts; a chat
 *     send is an MCP tool (`mcp__<server>__slack_send_message`). Empty,
 *     malformed or unrelated input is silent and leaves no line.
 *   - Checks per action: `git push` gate-run; `gh pr create` gate-run, review
 *     and audit; `gh pr ready` and `gh pr merge` review and audit;
 *     `gh pr comment`, `gh issue comment`, a `gh api` comment call and a chat
 *     send, publish. `githubCommands` in `.agentic/gates.json` names the
 *     wrappers a repository runs `gh` under (default `["gh"]`).
 *   - Freshness of commit receipts: a receipt covers HEAD when its tree is
 *     `HEAD^{tree}`, or every path changed since it is receipt-neutral
 *     (`receiptNeutral` globs in `.agentic/gates.json`, default `doc/tasks/**`;
 *     `.agentic/receipts/` and `.agentic/reviews/` are always neutral).
 *   - gate-run: a gate-run.mjs receipt with exit 0, keyed by tree.
 *   - review and audit: `review-receipts.mjs` (GROUND-0040). Neither result
 *     is judged.
 *   - publish: `publish-receipt.mjs`; a receipt whose hash equals the
 *     normalized outgoing body (GROUND-0041). A body known only when the
 *     command runs is runtime-unavailable.
 *   - `.agentic/gates.json` `checks.<check>`: `false` turns the check off; a
 *     `{ "command": [argv], "timeoutSeconds" }` object, for the review only,
 *     replaces the receipt by a command that exits 0 when bot or harness
 *     evidence exists for the commit in `AGENTIC_HEAD_SHA` (default bound 10
 *     seconds; a timeout is runtime-unavailable).
 *   - Evidence: one JSON line per check of an action in
 *     `<evidence dir>/<session_id>.jsonl`, state `clear`, `would-block` or
 *     `runtime-unavailable`. The directory defaults to the OS temporary
 *     directory; `AD_SEQUENCE_GATE_EVIDENCE_DIR` redirects it.
 *   - `AD_SEQUENCE_GATE=0` silences the gate entirely.
 *
 * Zero dependencies; byte-identical in both host trees.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { appendEvidence } from './artifact-gate.mjs';
import { git, headTree, readReceipts, repositoryRoot } from './gate-run.mjs';
import { checkPublish, outgoingPublication } from './publish-receipt.mjs';
import { readAuditReceipts, readReviewReceipts } from './review-receipts.mjs';

export const GATE_ID = 'sequence-gate';
export const DEFAULT_RECEIPT_NEUTRAL = ['doc/tasks/**'];
export const DEFAULT_GITHUB_COMMANDS = ['gh'];
// A receipt never invalidates itself, even where `.agentic/` is not ignored.
const ALWAYS_NEUTRAL = ['.agentic/receipts/**', '.agentic/reviews/**'];

// Global options may sit between `git` and the verb (`git -C dir push`). Words
// inside a quoted string can still match; the shadow run measures that.
const OPTION_VALUE = String.raw`(?:"[^"]*"|'[^']*'|[^\s"']\S*)`;
const GIT_OPTIONS = String.raw`(?:\s+(?:-[Cc]\s+(?:\S*=)?${OPTION_VALUE}|--?[\w-]+(?:=\S+)?))*`;

// The GitHub CLI's pull request verbs, matched after any of the names a
// repository runs it under (`githubCommands` in `.agentic/gates.json`).
const PR_ACTIONS = [
  { verb: 'create', checks: ['gate-run', 'review', 'audit'] },
  { verb: 'ready', checks: ['review', 'audit'] },
  { verb: 'merge', checks: ['review', 'audit'] },
];

function actionsFor(githubCommands) {
  const names = githubCommands.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return [
    {
      id: 'git push',
      pattern: new RegExp(String.raw`(^|[\s;&|(])git${GIT_OPTIONS}\s+push\b`),
      checks: ['gate-run'],
    },
    ...PR_ACTIONS.map(({ verb, checks }) => ({
      id: `gh pr ${verb}`,
      pattern: new RegExp(String.raw`(^|[\s;&|(])(?:${names})\s+pr\s+${verb}\b`),
      checks,
    })),
  ];
}

// Every landing action in the command, so a chained `git push && gh pr
// create` runs the checks both need.
function findActions(command, githubCommands = DEFAULT_GITHUB_COMMANDS) {
  if (typeof command !== 'string') return [];
  return actionsFor(githubCommands).filter((action) => action.pattern.test(command));
}

/** The first landing action a shell command performs, or null. */
export function landingAction(command) {
  return findActions(command)[0]?.id ?? null;
}

export function globToRegExp(glob) {
  let source = '';
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob[i];
    if (char === '*' && glob[i + 1] === '*') {
      source += '.*';
      i += 1;
    } else if (char === '*') source += '[^/]*';
    else source += char.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${source}$`);
}

function gatesConfig(root) {
  const file = join(root, '.agentic', 'gates.json');
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
}

/**
 * The names the repository runs the GitHub CLI under: plain words only, so a
 * name can never widen the match; `gh` when unset or unreadable.
 */
function githubCommands(cwd) {
  try {
    const names = gatesConfig(repositoryRoot(cwd)).githubCommands;
    const valid = Array.isArray(names) && names.every((n) => /^[\w.-]+$/.test(n));
    return valid && names.length > 0 ? names : DEFAULT_GITHUB_COMMANDS;
  } catch {
    return DEFAULT_GITHUB_COMMANDS;
  }
}

export function receiptNeutral(root) {
  const config = gatesConfig(root);
  return Array.isArray(config.receiptNeutral) ? config.receiptNeutral : DEFAULT_RECEIPT_NEUTRAL;
}

/**
 * The repository's setting for one check under `checks` in
 * `.agentic/gates.json`: `false` turns it off; anything else, an absent or
 * unreadable file included, leaves it on, so a broken config surfaces as a
 * runtime-unavailable line instead of a silent gap.
 */
function checkSetting(cwd, check) {
  try {
    return gatesConfig(repositoryRoot(cwd)).checks?.[check] ?? true;
  } catch {
    return true;
  }
}

// --no-renames: a rename reports both sides, so a file moved into a neutral
// path still shows its source. -z: paths arrive unquoted, accents included.
function changedPaths(root, fromTree, toTree) {
  const out = git(root, ['diff', '--name-only', '--no-renames', '-z', fromTree, toTree]);
  return out.split('\0').filter(Boolean);
}

/**
 * The newest receipt, of those given oldest first, whose tree covers `tree`
 * (equal, or only receipt-neutral paths differ), or null, and how many could
 * not be compared (a tree no longer in the object store).
 */
function newestCovering(root, tree, receipts) {
  const neutral = [...ALWAYS_NEUTRAL, ...receiptNeutral(root)].map(globToRegExp);
  let uncomparable = 0;
  for (const receipt of [...receipts].reverse()) {
    let paths;
    try {
      paths = changedPaths(root, receipt.tree, tree);
    } catch {
      uncomparable += 1;
      continue;
    }
    if (paths.every((path) => neutral.some((glob) => glob.test(path)))) {
      return { receipt, uncomparable };
    }
  }
  return { receipt: null, uncomparable };
}

/**
 * The newest passing receipt that covers `tree`, or null, and how many
 * receipts could not be read or compared (a torn line, a tree no longer in the
 * object store).
 */
export function freshReceipt(root, tree) {
  const { receipts, unreadable } = readReceipts(root);
  const passing = receipts.filter((receipt) => receipt.exit === 0);
  const { receipt, uncomparable } = newestCovering(root, tree, passing);
  return { receipt, unreadable: unreadable + uncomparable };
}

export function checkGateRun(cwd) {
  const root = repositoryRoot(cwd);
  const tree = headTree(root);
  const { receipt, unreadable } = freshReceipt(root, tree);
  return {
    check: 'gate-run',
    state: receipt ? 'clear' : 'would-block',
    head: git(root, ['rev-parse', 'HEAD']),
    tree,
    receipt: receipt ? receipt.tree : null,
    missing: receipt ? [] : ['gate-run'],
    unreadable_receipts: unreadable,
    reproduction:
      'run the repository CI-mirror command, then: node <ad-hooks>/scripts/gate-run.mjs record ' +
      '--command "<that command>" --exit 0',
  };
}

// A review or an audit names the commit it covered; the check compares that
// commit's tree with HEAD's under the same freshness rule as a gate run.
function commitReceiptCheck(check, readCommitReceipts, reproduction) {
  return (cwd) => {
    const root = repositoryRoot(cwd);
    const tree = headTree(root);
    const { receipts, unreadable } = readCommitReceipts(root);
    const { receipt, uncomparable } = newestCovering(root, tree, receipts);
    return {
      check,
      state: receipt ? 'clear' : 'would-block',
      head: git(root, ['rev-parse', 'HEAD']),
      tree,
      receipt: receipt ? receipt.sha : null,
      missing: receipt ? [] : [check],
      unreadable_receipts: unreadable + uncomparable,
      reproduction,
    };
  };
}

export const checkReview = commitReceiptCheck(
  'review',
  readReviewReceipts,
  'run /ad-review on the range ending at HEAD'
);
export const checkAudit = commitReceiptCheck(
  'audit',
  readAuditReceipts,
  'run /ad-audit on the range ending at HEAD'
);

export const DEFAULT_COMMAND_TIMEOUT_SECONDS = 10;
// A design choice, under the 30 seconds this repository's Codex wiring gives
// the hook, leaving room for its git calls.
export const MAX_COMMAND_TIMEOUT_SECONDS = 20;

/**
 * A repository whose review is done by a bot or harness names, in
 * `.agentic/gates.json`, a local command that exits 0 when that evidence
 * exists for the commit in `AGENTIC_HEAD_SHA`. The command is bounded well
 * under the hosts' 600-second hook timeout (GROUND-0040 E1).
 */
function commandCheck(check, setting, cwd) {
  // ADR-0089 decision 7 lets bot evidence stand in for a review only.
  if (check !== 'review') throw new Error(`a command replaces the review only, not ${check}`);
  const seconds = setting.timeoutSeconds ?? DEFAULT_COMMAND_TIMEOUT_SECONDS;
  if (typeof seconds !== 'number' || !(seconds > 0 && seconds <= MAX_COMMAND_TIMEOUT_SECONDS)) {
    throw new Error(`timeoutSeconds must be above 0 and at most ${MAX_COMMAND_TIMEOUT_SECONDS}`);
  }
  // An argument list, run without a shell (GUIDELINES 12.5); a pipeline
  // belongs in a script the list names.
  const argv = setting.command;
  if (!Array.isArray(argv) || argv.length === 0 || !argv.every((a) => typeof a === 'string')) {
    throw new Error('command must be a non-empty argument list of strings');
  }
  const root = repositoryRoot(cwd);
  const head = git(root, ['rev-parse', 'HEAD']);
  const run = spawnSync(argv[0], argv.slice(1), {
    cwd: root,
    stdio: 'ignore',
    timeout: seconds * 1000,
    env: { ...process.env, AGENTIC_HEAD_SHA: head },
  });
  // Not reading the evidence is not evidence that it is missing.
  if (run.error || run.status === null) {
    throw new Error(`${check} command timed out or did not run: ${run.error?.code ?? run.signal}`);
  }
  return {
    check,
    state: run.status === 0 ? 'clear' : 'would-block',
    head,
    tree: headTree(root),
    receipt: run.status === 0 ? 'command' : null,
    missing: run.status === 0 ? [] : [check],
    unreadable_receipts: 0,
    reproduction: JSON.stringify(argv),
  };
}

const CHECKS = { 'gate-run': checkGateRun, review: checkReview, audit: checkAudit };

function runCheck(check, cwd) {
  const setting = checkSetting(cwd, check);
  if (setting && typeof setting === 'object' && 'command' in setting) {
    return commandCheck(check, setting, cwd);
  }
  return CHECKS[check](cwd);
}

export function evidencePathFor(sessionId, env) {
  const dir = env.AD_SEQUENCE_GATE_EVIDENCE_DIR || join(tmpdir(), 'agentic-sequence-gate');
  const safe = String(sessionId || 'unknown').replace(/[^A-Za-z0-9._-]/g, '_');
  return join(dir, `${safe}.jsonl`);
}

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function logPublication(event, cwd) {
  if (checkSetting(cwd, 'publish') === false) return;
  let publication;
  let result;
  try {
    publication = outgoingPublication(event, cwd, githubCommands(cwd));
    if (!publication) return;
    if (publication.unreadable) throw new Error(publication.unreadable);
    result = checkPublish(cwd, publication.body);
  } catch (error) {
    result = { check: 'publish', state: 'runtime-unavailable', output: String(error.message) };
  }
  appendEvidence(evidencePathFor(event.session_id, process.env), {
    at: new Date().toISOString(),
    gate: GATE_ID,
    action: publication?.action ?? 'unknown',
    host_tool: event.tool_name,
    ...result,
  });
}

function main() {
  if (process.env.AD_SEQUENCE_GATE === '0') return;
  const raw = readStdin().trim();
  if (!raw) return;
  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return;
  }
  if (event === null || typeof event !== 'object' || Array.isArray(event)) return;
  const cwd = typeof event.cwd === 'string' && event.cwd ? event.cwd : process.cwd();
  logPublication(event, cwd);
  if (event.tool_name !== 'Bash') return;
  const actions = findActions(event.tool_input?.command, githubCommands(cwd));
  if (actions.length === 0) return;

  // Each check runs once per command, logged against the first action that
  // needs it, so a chained command runs a bot-review command once.
  const firstNeeding = new Map();
  for (const a of actions)
    for (const c of a.checks) if (!firstNeeding.has(c)) firstNeeding.set(c, a);
  for (const [check, action] of firstNeeding) {
    if (checkSetting(cwd, check) === false) continue;
    let result;
    try {
      result = runCheck(check, cwd);
    } catch (error) {
      result = { check, state: 'runtime-unavailable', output: String(error.message) };
    }
    appendEvidence(evidencePathFor(event.session_id, process.env), {
      at: new Date().toISOString(),
      gate: GATE_ID,
      action: action.id,
      host_tool: event.tool_name,
      ...result,
    });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
