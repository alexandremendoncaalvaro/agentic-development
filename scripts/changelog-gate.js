#!/usr/bin/env node
/**
 * Pre-commit changelog gate (task-0032) — advisory, never blocks.
 *
 * Warns when a commit touches shipped kit content (src/skills/, src/lib/,
 * src/commands/, bin/) without staging a CHANGELOG.md entry alongside it.
 * Rationale: merged is not released in a package repo — an unlogged change
 * is invisible to every npm install.
 *
 * Advisory-first debut per ad-hooks' rule: this pairing heuristic is novel,
 * so it debuts warn-only (always exits 0). Flip-to-block criterion: two
 * weeks without a false positive.
 *
 * The policy core (`changelogWarning`) is pure and exercised by
 * `test/commit-gates.test.js`; `main()` gathers staged paths from git.
 */

import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// Mirrors package.json#files — everything npm ships — minus README.md and
// LICENSE (meta files, rarely changelog-worthy). src/ is watched whole:
// src/index.js and src/leak-guard.js are in the tarball too.
const WATCHED_PREFIXES = [
  'src/',
  'bin/',
  'templates/',
  'prompts/',
  'WORKFLOW.md',
  'WORKFLOW-FLOWS.md',
];

/**
 * Decide whether a staged file set deserves a changelog reminder.
 *
 * @param {string[]} stagedPaths - repo-relative staged paths
 * @returns {string|null} the warning text, or null when nothing applies
 */
export function changelogWarning(stagedPaths) {
  const touched = stagedPaths.filter((path) =>
    WATCHED_PREFIXES.some((prefix) => path.startsWith(prefix))
  );
  if (touched.length === 0) return null;
  if (stagedPaths.includes('CHANGELOG.md')) return null;
  return [
    'changelog-gate (advisory): this commit touches shipped kit content but stages no CHANGELOG.md entry:',
    ...touched.map((path) => `  - ${path}`),
    'Consumers install the published version, not main — add a line under [Unreleased] in CHANGELOG.md.',
    'Warn-only debut (task-0032); flips to blocking after two weeks without a false positive.',
  ].join('\n');
}

function main() {
  const raw = execFileSync('git', ['diff', '--cached', '--name-only', '-z'], {
    encoding: 'utf8',
  });
  const stagedPaths = raw.split('\0').filter((path) => path.length > 0);
  const warning = changelogWarning(stagedPaths);
  if (warning !== null) {
    console.error(warning);
  }
  process.exit(0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
