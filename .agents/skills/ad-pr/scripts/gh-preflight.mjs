#!/usr/bin/env node
/**
 * Read-only GitHub/Git preflight for /ad-pr and /ad-merge (ADR-0057, P2.6).
 * Run from a consumer repository root:
 *
 *   node <skill-base-dir>/scripts/gh-preflight.mjs pr
 *   node <skill-base-dir>/scripts/gh-preflight.mjs merge [number-or-url]
 *
 * Prints stable JSON facts that the skill body narrates: GitHub CLI
 * availability/authentication, current branch/upstream/push state, default
 * base, and for a merge target its PR state, checks, and allowed merge modes.
 * It never switches GitHub accounts or performs a GitHub/Git write. The
 * optional AGENTIC_GH environment variable names an executable wrapper;
 * shell aliases/functions do not cross into this Node child process.
 */
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const PR_FIELDS = 'number,url,headRefName,baseRefName,mergeable,mergeStateStatus,reviews';
const CHECK_FIELDS = 'name,bucket,state,link';
const MERGE_FIELDS = 'mergeCommitAllowed,squashMergeAllowed,rebaseMergeAllowed';

function cleanGitEnvironment() {
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  delete env.GIT_INDEX_FILE;
  return env;
}

function failureCode(error) {
  if (error.code) return error.code;
  if (Number.isInteger(error.status)) return `EXIT_${error.status}`;
  return 'ERROR';
}

function command(commandName, args, cwd, env) {
  try {
    return {
      ok: true,
      stdout: execFileSync(commandName, args, {
        cwd,
        env,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }).trim(),
    };
  } catch (error) {
    return {
      ok: false,
      code: failureCode(error),
      stdout: typeof error.stdout === 'string' ? error.stdout.trim() : '',
      stderr: typeof error.stderr === 'string' ? error.stderr.trim() : '',
    };
  }
}

function commandJson(commandName, args, cwd, env, probe, errors, acceptableCodes = []) {
  const result = command(commandName, args, cwd, env);
  if (!result.ok && !acceptableCodes.includes(result.code)) {
    errors.push({ probe, code: result.code });
    return null;
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    errors.push({ probe, code: 'INVALID_JSON' });
    return null;
  }
}

function gitState(repoRoot, errors) {
  const env = cleanGitEnvironment();
  const git = (args, probe) => {
    const result = command('git', args, repoRoot, env);
    if (!result.ok) {
      errors.push({ probe, code: result.code });
      return null;
    }
    return result.stdout || null;
  };
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], 'git branch');
  const upstream = git(['rev-parse', '--abbrev-ref', '@{u}'], 'git upstream');
  const aheadRaw = upstream === null
    ? null
    : git(['rev-list', '--count', '@{u}..HEAD'], 'git ahead-of-upstream');
  const ahead = aheadRaw === null ? null : Number.parseInt(aheadRaw, 10);
  return {
    branch: branch === 'HEAD' ? null : branch,
    upstream,
    aheadOfUpstream: Number.isInteger(ahead) ? ahead : null,
  };
}

function defaultBranch(gh, repoRoot, env, errors) {
  const report = commandJson(
    gh,
    ['repo', 'view', '--json', 'defaultBranchRef'],
    repoRoot,
    env,
    'gh repo default branch',
    errors
  );
  return report?.defaultBranchRef?.name ?? null;
}

function repositoryFromPrUrl(url) {
  try {
    const parsed = new URL(url);
    const [, owner, repository, kind, number] = parsed.pathname.split('/');
    if (!owner || !repository || kind !== 'pull' || !/^\d+$/.test(number)) return null;
    return parsed.hostname === 'github.com'
      ? `${owner}/${repository}`
      : `${parsed.hostname}/${owner}/${repository}`;
  } catch {
    return null;
  }
}

function withRepository(args, repository) {
  return repository === null ? args : [...args, '--repo', repository];
}

function viewPullRequest(gh, repoRoot, env, target, errors) {
  const args = ['pr', 'view'];
  if (target) args.push(target);
  args.push('--json', PR_FIELDS);
  const result = command(gh, args, repoRoot, env);
  if (!result.ok) {
    if (
      result.code === 'EXIT_1' &&
      /no pull requests found|could not resolve to a pull request/i.test(result.stderr)
    ) {
      return { pullRequest: null, pullRequestState: 'absent' };
    }
    errors.push({ probe: 'gh pr view', code: result.code });
    return { pullRequest: null, pullRequestState: 'unavailable' };
  }
  try {
    return { pullRequest: JSON.parse(result.stdout), pullRequestState: 'present' };
  } catch {
    errors.push({ probe: 'gh pr view', code: 'INVALID_JSON' });
    return { pullRequest: null, pullRequestState: 'unavailable' };
  }
}

function mergeReport(gh, repoRoot, env, target, errors) {
  const { pullRequest, pullRequestState } = viewPullRequest(gh, repoRoot, env, target, errors);
  if (pullRequest === null) {
    return { pullRequest: null, pullRequestState, checks: [], mergeMethods: null, targetRepository: null };
  }

  const repository = repositoryFromPrUrl(pullRequest.url);
  const checks = commandJson(
    gh,
    withRepository(['pr', 'checks', target || String(pullRequest.number), '--json', CHECK_FIELDS], repository),
    repoRoot,
    env,
    'gh pr checks',
    errors,
    ['EXIT_8']
  );
  const mergeMethods = commandJson(
    gh,
    withRepository(['repo', 'view', '--json', MERGE_FIELDS], repository),
    repoRoot,
    env,
    'gh repo merge methods',
    errors
  );
  return {
    pullRequest,
    pullRequestState,
    checks: Array.isArray(checks) ? checks : [],
    mergeMethods,
    targetRepository: repository,
  };
}

/**
 * @param {{repoRoot: string, operation: 'pr' | 'merge', target?: string}} options
 */
export function ghPreflight({ repoRoot, operation, target }) {
  if (!['pr', 'merge'].includes(operation)) {
    throw new Error('operation must be pr or merge');
  }

  const errors = [];
  const gh = process.env.AGENTIC_GH || 'gh';
  const env = cleanGitEnvironment();
  const version = command(gh, ['--version'], repoRoot, env);
  if (!version.ok) {
    errors.push({ probe: 'gh --version', code: version.code });
  }
  const authenticated = version.ok
    ? command(gh, ['auth', 'status'], repoRoot, env).ok
    : null;
  if (version.ok && authenticated === false) {
    errors.push({ probe: 'gh auth status', code: 'AUTH_FAILED' });
  }

  const git = gitState(repoRoot, errors);
  const baseBranch = authenticated === true
    ? defaultBranch(gh, repoRoot, env, errors)
    : null;
  const merge = authenticated === true && operation === 'merge'
    ? mergeReport(gh, repoRoot, env, target, errors)
    : { pullRequest: null, pullRequestState: 'not-requested', checks: [], mergeMethods: null, targetRepository: null };

  return {
    operation,
    github: { command: gh, installed: version.ok, authenticated },
    git,
    baseBranch,
    ...merge,
    errors,
  };
}

function main() {
  const [operation, target] = process.argv.slice(2);
  process.stdout.write(`${JSON.stringify(ghPreflight({ repoRoot: process.cwd(), operation, target }), null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
