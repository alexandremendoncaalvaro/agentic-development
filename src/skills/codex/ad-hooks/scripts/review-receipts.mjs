#!/usr/bin/env node
/**
 * ad-hooks receipt gates — the review and audit receipts (ADR-0089,
 * task-0108, GROUND-0040).
 *
 * Reads the receipts `ad-review` and `ad-audit` leave under
 * `.agentic/reviews/`: a verdicts file whose first line is `Target-SHA:
 * <commit>`, and an audit summary JSON whose `target` names one. Each
 * receipt is resolved to its commit's tree, which `sequence-gate.mjs`
 * compares with HEAD's.
 *
 * Zero dependencies; byte-identical in both host trees.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { git } from './gate-run.mjs';

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
