#!/usr/bin/env node
/**
 * Pre-push test gate runner (task-0033). The npm-test gate itself is the
 * WORKFLOW.md §11 deterministic gate wired in lefthook.yml; this runner is
 * how it survives linked git worktrees.
 *
 * git exports GIT_DIR (and, in some paths, GIT_WORK_TREE / GIT_INDEX_FILE)
 * into hook processes. Leaked into the suite's child processes, those
 * variables point every spawned `git` and CLI call at THIS repo instead of
 * the test's own tmp dir — observed in a linked git worktree, where the
 * leak alone turned 13 green tests red and made the pre-push gate
 * unpassable. Stripping the variables restores normal repo discovery for
 * the suite; the gate then judges the pushed tree, not the hook's
 * environment.
 *
 * Runs `npm test` by default; argv overrides the command so the wiring
 * test can exercise the real spawn path without recursing into the suite.
 */

import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function sanitizedEnv(env) {
  const clean = { ...env };
  delete clean.GIT_DIR;
  delete clean.GIT_WORK_TREE;
  delete clean.GIT_INDEX_FILE;
  return clean;
}

function main() {
  const argv = process.argv.slice(2);
  const [cmd, ...args] = argv.length > 0 ? argv : ['npm', 'test'];
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    env: sanitizedEnv(process.env),
    shell: process.platform === 'win32',
  });
  if (result.error) {
    console.error(`hook-npm-test: failed to spawn ${cmd}: ${result.error.message}`);
  }
  process.exit(result.status ?? 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
