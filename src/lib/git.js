import { execFileSync } from 'node:child_process';

function git(args, cwd) {
  return execFileSync('git', args, { cwd, stdio: 'ignore' });
}

/**
 * Whether `relPath` is tracked by git in `cwd`.
 *
 * Returns `'tracked' | 'untracked' | 'unknown'`. A tracked path is shared with
 * everyone who clones the repository, which is what decides whether the
 * installer may write to it unattended (ADR-0049).
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
