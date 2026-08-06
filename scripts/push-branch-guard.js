#!/usr/bin/env node
/**
 * Pre-push branch guard (ADR-0048).
 *
 * Blocks a push that updates refs/heads/main or refs/heads/cli — the two
 * branches AGENTS.md and GUIDELINES.md §10.1 say are never pushed directly.
 * Deterministic, so per ad-hooks' advisory-first debut rule it may block
 * from day one. The audited live state (task-0032) showed main has no
 * GitHub-side protection; this is the clone-local layer, and enabling
 * GitHub branch protection remains the recommended origin-side complement.
 *
 * git gives the pre-push hook one stdin line per ref being pushed:
 * `<local ref> <local sha> <remote ref> <remote sha>`. When stdin carries
 * no ref lines (e.g. a runner that does not forward stdin), the guard
 * falls back to the current branch name.
 *
 * The policy core (`pushViolation`) is pure and exercised by
 * `test/commit-gates.test.js`; `main()` wires stdin + git.
 */

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const PROTECTED_REFS = new Set(['refs/heads/main', 'refs/heads/cli']);
const PROTECTED_BRANCHES = new Set(['main', 'cli']);

/**
 * Decide whether a push must be refused.
 *
 * @param {string} stdinText - the pre-push hook's stdin (ref lines, possibly empty)
 * @param {string} currentBranch - fallback signal when stdin has no ref lines
 * @returns {string|null} the refusal text, or null when the push is fine
 */
export function pushViolation(stdinText, currentBranch) {
  const refLines = stdinText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const hit = refLines
    .map((line) => line.split(/\s+/)[2])
    .find((remoteRef) => PROTECTED_REFS.has(remoteRef));
  if (hit === undefined && refLines.length > 0) return null;
  if (hit === undefined && !PROTECTED_BRANCHES.has(currentBranch)) return null;
  const branch = hit === undefined ? currentBranch : hit.replace('refs/heads/', '');
  return [
    `branch-guard: refusing to push ${branch} directly — it only moves via PR (GUIDELINES.md §10.1).`,
    'Push a feature branch and open the PR with /ad-pr.',
  ].join('\n');
}

function main() {
  let stdinText = '';
  try {
    stdinText = readFileSync(0, 'utf8');
  } catch {
    stdinText = '';
  }
  const currentBranch = execFileSync('git', ['branch', '--show-current'], {
    encoding: 'utf8',
  }).trim();
  const violation = pushViolation(stdinText, currentBranch);
  if (violation !== null) {
    console.error(violation);
    process.exit(1);
  }
  process.exit(0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
