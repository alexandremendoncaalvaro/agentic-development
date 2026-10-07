#!/usr/bin/env node
/**
 * ad-hooks receipt gates — the review and audit receipts (ADR-0089,
 * task-0108, GROUND-0040).
 *
 * Reads the receipts `ad-review` and `ad-audit` leave under
 * `.agentic/reviews/`: a verdicts file whose first line is `Target-SHA:
 * <commit>`, and an audit summary JSON whose `target` names one. Each
 * receipt is resolved to its commit's tree, which `sequence-gate.mjs`
 * compares with HEAD's. A repository whose review is done by a bot names a
 * command instead (`commandCheck`, ADR-0089 decision 7).
 *
 * Zero dependencies; byte-identical in both host trees.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { git, headTree, repositoryRoot } from './gate-run.mjs';

export const REVIEWS_DIR = join('.agentic', 'reviews');
const SHA = /^[0-9a-f]{40}$/;
const TARGET_SHA_LINE = /^Target-SHA:[ \t]*(.*?)\s*$/;
const WORKING_TREE = 'none (working tree)';
export const MAX_COMMIT_RECEIPTS = 20;

/**
 * Commit receipts under `.agentic/reviews/`, oldest first by file name (an
 * ISO timestamp prefix), from the newest `MAX_COMMIT_RECEIPTS` files only:
 * the directory is never pruned, and resolving every file made the hook's
 * cost grow with it (task-0108 Notes). Each file ending in `suffix` whose
 * target, read by `targetOf`, is a full commit SHA, resolved to that
 * commit's tree. A file with no target (written before receipts existed) or
 * a working-tree target is no receipt; an unparsable file, any other target
 * or a commit that cannot be resolved is counted as unreadable.
 */
function readCommitReceipts(root, suffix, targetOf) {
  const dir = join(root, REVIEWS_DIR);
  const receipts = [];
  let unreadable = 0;
  if (!existsSync(dir)) return { receipts, unreadable };
  const names = readdirSync(dir)
    .filter((file) => file.endsWith(suffix))
    .sort()
    .slice(-MAX_COMMIT_RECEIPTS);
  for (const name of names) {
    let sha;
    try {
      sha = targetOf(readFileSync(join(dir, name), 'utf8'));
    } catch {
      unreadable += 1;
      continue;
    }
    if (sha === undefined || sha === WORKING_TREE) continue;
    if (typeof sha !== 'string' || !SHA.test(sha)) {
      unreadable += 1;
      continue;
    }
    try {
      receipts.push({ sha, tree: git(root, ['rev-parse', `${sha}^{tree}`]) });
    } catch {
      unreadable += 1;
    }
  }
  return { receipts, unreadable };
}

/** `ad-review` verdicts files, by their `Target-SHA:` line. */
export function readReviewReceipts(root) {
  return readCommitReceipts(
    root,
    '-verdicts.md',
    (text) => TARGET_SHA_LINE.exec(text.split('\n', 1)[0])?.[1]
  );
}

/** `ad-audit` summary files, by their `target` field. */
export function readAuditReceipts(root) {
  return readCommitReceipts(root, '-summary.json', (text) => JSON.parse(text)?.target ?? null);
}

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
export function commandCheck(check, setting, cwd) {
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
