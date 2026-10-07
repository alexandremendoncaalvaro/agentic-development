#!/usr/bin/env node
/**
 * ad-hooks receipt gates — the shadow sequence gate (ADR-0089, task-0107).
 *
 * A `PreToolUse` command hook on Bash for Claude Code and Codex. Before a
 * landing action it checks that the step the action depends on left a fresh
 * receipt, and appends one evidence line saying whether the action would
 * have been blocked. Shadow mode is the only mode: the gate always exits 0
 * and prints nothing, so the host proceeds and neither the model nor the
 * owner sees it (GROUND-0038 E1).
 *
 * Contract:
 *   - stdin: the host's PreToolUse event JSON; the command is
 *     `tool_input.command` under `tool_name: "Bash"` on both hosts. Empty,
 *     malformed, non-Bash or unrelated input is silent and leaves no line.
 *   - Check `gate-run`, before `git push` and `gh pr create`: a receipt from
 *     gate-run.mjs with exit 0 whose tree is `HEAD^{tree}`, or from whose
 *     tree every changed path is receipt-neutral (`receiptNeutral` globs in
 *     `.agentic/gates.json`, default `doc/tasks/**`; the receipts directory
 *     itself is always neutral).
 *   - Evidence: one JSON line per checked action in
 *     `<evidence dir>/<session_id>.jsonl`, state `clear`, `would-block` or
 *     `runtime-unavailable`. The directory defaults to the OS temporary
 *     directory; `AD_SEQUENCE_GATE_EVIDENCE_DIR` redirects it.
 *   - `AD_SEQUENCE_GATE=0` silences the gate entirely.
 *
 * Zero dependencies; byte-identical in both host trees.
 */

import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { appendEvidence } from './artifact-gate.mjs';
import { git, headTree, readReceipts, repositoryRoot } from './gate-run.mjs';

export const GATE_ID = 'sequence-gate';
export const DEFAULT_RECEIPT_NEUTRAL = ['doc/tasks/**'];
// A receipt never invalidates itself, even where `.agentic/` is not ignored.
const ALWAYS_NEUTRAL = ['.agentic/receipts/**'];

// Global options may sit between `git` and the verb (`git -C dir push`). Words
// inside a quoted string can still match; the shadow run measures that.
const OPTION_VALUE = String.raw`(?:"[^"]*"|'[^']*'|[^\s"']\S*)`;
const GIT_OPTIONS = String.raw`(?:\s+(?:-[Cc]\s+(?:\S*=)?${OPTION_VALUE}|--?[\w-]+(?:=\S+)?))*`;

const ACTIONS = [
  { id: 'git push', pattern: new RegExp(String.raw`(^|[\s;&|(])git${GIT_OPTIONS}\s+push\b`) },
  { id: 'gh pr create', pattern: /(^|[\s;&|(])gh\s+pr\s+create\b/ },
];

/** The landing action a shell command performs, or null. */
export function landingAction(command) {
  if (typeof command !== 'string') return null;
  return ACTIONS.find((action) => action.pattern.test(command))?.id ?? null;
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

export function receiptNeutral(root) {
  const file = join(root, '.agentic', 'gates.json');
  if (!existsSync(file)) return DEFAULT_RECEIPT_NEUTRAL;
  const config = JSON.parse(readFileSync(file, 'utf8'));
  return Array.isArray(config.receiptNeutral) ? config.receiptNeutral : DEFAULT_RECEIPT_NEUTRAL;
}

// --no-renames: a rename reports both sides, so a file moved into a neutral
// path still shows its source. -z: paths arrive unquoted, accents included.
function changedPaths(root, fromTree, toTree) {
  const out = git(root, ['diff', '--name-only', '--no-renames', '-z', fromTree, toTree]);
  return out.split('\0').filter(Boolean);
}

/** The newest passing receipt that covers `tree`, or null. */
export function freshReceipt(root, tree) {
  const neutral = [...ALWAYS_NEUTRAL, ...receiptNeutral(root)].map(globToRegExp);
  const passing = readReceipts(root).filter((receipt) => receipt.exit === 0);
  for (const receipt of passing.reverse()) {
    let paths;
    try {
      paths = changedPaths(root, receipt.tree, tree);
    } catch {
      continue; // a tree no longer in the object store covers nothing
    }
    if (paths.every((path) => neutral.some((glob) => glob.test(path)))) return receipt;
  }
  return null;
}

export function checkGateRun(cwd) {
  const root = repositoryRoot(cwd);
  const tree = headTree(root);
  const receipt = freshReceipt(root, tree);
  return {
    check: 'gate-run',
    state: receipt ? 'clear' : 'would-block',
    head: git(root, ['rev-parse', 'HEAD']),
    tree,
    receipt: receipt ? receipt.tree : null,
    missing: receipt ? [] : ['gate-run'],
    reproduction:
      'run the repository CI-mirror command, then: node <ad-hooks>/scripts/gate-run.mjs record ' +
      '--command "<that command>" --exit 0',
  };
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
  if (event.tool_name !== 'Bash') return;
  const action = landingAction(event.tool_input?.command);
  if (!action) return;

  const cwd = typeof event.cwd === 'string' && event.cwd ? event.cwd : process.cwd();
  let result;
  try {
    result = checkGateRun(cwd);
  } catch (error) {
    result = { check: 'gate-run', state: 'runtime-unavailable', output: String(error.message) };
  }
  appendEvidence(evidencePathFor(event.session_id, process.env), {
    at: new Date().toISOString(),
    gate: GATE_ID,
    action,
    host_tool: event.tool_name,
    ...result,
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
