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
import { existsSync } from 'node:fs';
import { delimiter, extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

export function sanitizedEnv(env) {
  const clean = { ...env };
  delete clean.GIT_DIR;
  delete clean.GIT_WORK_TREE;
  delete clean.GIT_INDEX_FILE;
  return clean;
}

// Windows has no single answer for "run this command". `npm` is really
// `npm.cmd`, which spawnSync refuses to execute without a shell; `node` is
// `node.exe`, which it runs directly. Handing everything to the shell — what
// this runner used to do — makes cmd.exe re-parse the arguments, so anything
// carrying spaces, quotes, or parentheses arrives corrupted. That silently
// broke the argv-override path this runner documents, and with it the wiring
// test that exercises the real spawn.
//
// Resolve against PATH and PATHEXT instead: an executable image runs directly
// with its arguments intact, and only a script wrapper needs the shell. POSIX
// needs none of this. `platform` and `env` are injected so the Windows branch
// is covered on any host — the suite's CI runs Linux only.
const DIRECT_EXEC = new Set(['.exe', '.com']);

export function resolveSpawn(cmd, { platform = process.platform, env = process.env } = {}) {
  if (platform !== 'win32') return { command: cmd, shell: false };

  const known = extname(cmd).toLowerCase();
  if (known) {
    return DIRECT_EXEC.has(known) ? { command: cmd, shell: false } : { command: cmd, shell: true };
  }

  const dirs = (env.PATH || env.Path || '').split(delimiter).filter(Boolean);
  const exts = (env.PATHEXT || '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean);
  for (const dir of dirs) {
    for (const ext of exts) {
      const candidate = join(dir, `${cmd}${ext.toLowerCase()}`);
      if (!existsSync(candidate)) continue;
      return DIRECT_EXEC.has(ext.toLowerCase())
        ? { command: candidate, shell: false }
        : { command: cmd, shell: true };
    }
  }
  // Unresolvable: let the shell run and report it, as it did before.
  return { command: cmd, shell: true };
}

function main() {
  const argv = process.argv.slice(2);
  const [cmd, ...args] = argv.length > 0 ? argv : ['npm', 'test'];
  const { command, shell } = resolveSpawn(cmd);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: sanitizedEnv(process.env),
    shell,
  });
  if (result.error) {
    console.error(`hook-npm-test: failed to spawn ${cmd}: ${result.error.message}`);
  }
  process.exit(result.status ?? 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
