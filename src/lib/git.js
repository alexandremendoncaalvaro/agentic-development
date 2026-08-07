import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

function git(args, cwd) {
  return execFileSync('git', args, { cwd, stdio: 'ignore' });
}

function gitOut(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' });
}

/**
 * Whether `relPath` is tracked by git in `cwd`.
 *
 * Returns `'tracked' | 'untracked' | 'unknown'`. A tracked path is shared with
 * everyone who clones the repository, which is what decides whether the
 * installer may write to it unattended (ADR-0051).
 *
 * `'unknown'` is the fail-open answer for "not a repository" and for "no git
 * binary on PATH". This is the deliberate opposite of `src/leak-guard.js`,
 * whose git use is fail-closed: the guard's job is to block a leak, so an
 * unresolvable repo must stop the commit, while the installer's job is to
 * install, so an unresolvable repo must not be able to stop it. Callers treat
 * `'unknown'` as "no evidence of sharing" and keep their prior behaviour.
 *
 * The repository probe runs first so the two failure modes cannot collapse:
 * `git ls-files --error-unmatch` exits non-zero both for an untracked path and
 * for a missing repository, and `'untracked'` authorises a write that
 * `'unknown'` must not.
 */
export function trackedState(cwd, relPath) {
  try {
    git(['rev-parse', '--git-dir'], cwd);
  } catch {
    return 'unknown';
  }
  try {
    git(['ls-files', '--error-unmatch', '--', relPath], cwd);
    return 'tracked';
  } catch {
    return 'untracked';
  }
}

/**
 * Of the installer's file paths, the subset that should be excluded: those
 * present on disk AND untracked. A tracked path is deliberately dropped — in a
 * mixed-ownership directory (a team-authored subagent tracked in the same
 * `.claude/agents/` where the kit installs its reviewers) the team file must
 * stay visible to git, which is exactly why exclusion is by filename and never
 * by directory (ADR-0051 Decision 4).
 *
 * @param {string} cwd  Repo working directory.
 * @param {string[]} relPaths  Installed file paths relative to cwd (POSIX).
 * @returns {string[]}  The subset to exclude.
 */
export function installedPathsToExclude(cwd, relPaths) {
  if (relPaths.length === 0) return [];
  // One `ls-files` over the whole set instead of two subprocesses per file —
  // matching leak-guard.js's batch-over-the-change-set precedent. Outside a
  // repository this throws, and we return [] (nothing to exclude), the same
  // fail-open result writeExcludeEntries gives.
  let tracked;
  try {
    git(['rev-parse', '--git-dir'], cwd);
    const out = gitOut(['ls-files', '--', ...relPaths], cwd);
    tracked = new Set(out.split('\n').map((l) => l.trim()).filter(Boolean));
  } catch {
    return [];
  }
  return relPaths.filter((p) => existsSync(join(cwd, p)) && !tracked.has(p));
}

/**
 * Add per-clone exclude entries for kit files the installer just wrote, so
 * they are never accidentally committed into a shared repo (ADR-0051 Decision
 * 4). Entries go in `.git/info/exclude` — the per-clone, never-committed
 * exclusion — never in `.gitignore`, which is team-visible.
 *
 * Each entry is anchored with a leading slash (this exact path from the repo
 * root, not a same-named file elsewhere) and is a filename, never a directory:
 * agent directories carry mixed ownership, so a directory entry could hide a
 * team-owned file from git. The caller passes individual installed files.
 *
 * Idempotent — an entry already present is left untouched, and existing
 * content is preserved verbatim. Fail-open: outside a git repository it writes
 * nothing and reports `skipped: 'not-a-repo'`, so it can never fail an install.
 *
 * @param {string} cwd  Repo working directory.
 * @param {string[]} relPaths  Installed file paths relative to cwd (POSIX).
 * @returns {{ added: string[], excludeFile: string|null, skipped?: string }}
 */
export function writeExcludeEntries(cwd, relPaths) {
  let excludeFile;
  try {
    excludeFile = gitOut(['rev-parse', '--git-path', 'info/exclude'], cwd).trim();
  } catch {
    return { added: [], excludeFile: null, skipped: 'not-a-repo' };
  }
  // `--git-path` may return a path relative to cwd; resolve against cwd with
  // `join` (not string concat) to keep separators consistent on Windows,
  // matching this codebase's path-portability discipline (install.js `toPosix`).
  if (excludeFile && !excludeFile.startsWith('/')) {
    excludeFile = join(cwd, excludeFile);
  }

  const existing = existsSync(excludeFile)
    ? readFileSync(excludeFile, 'utf8')
    : '';
  const present = new Set(
    existing.split('\n').map((l) => l.trim()).filter(Boolean)
  );

  const wanted = relPaths.map((p) => `/${p.replace(/^\/+/, '')}`);
  const added = wanted.filter((entry) => !present.has(entry));
  if (added.length === 0) return { added: [], excludeFile };

  const header = '# agentic (@alexandrealvaro/agentic) — local install, never commit';
  const needsNL = existing.length > 0 && !existing.endsWith('\n');
  const block =
    (needsNL ? '\n' : '') +
    (existing.length > 0 ? '\n' : '') +
    (present.has(header) ? '' : `${header}\n`) +
    added.join('\n') +
    '\n';

  mkdirSync(dirname(excludeFile), { recursive: true });
  writeFileSync(excludeFile, existing + block);
  return { added, excludeFile };
}
