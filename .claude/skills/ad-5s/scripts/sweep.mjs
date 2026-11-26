#!/usr/bin/env node
/**
 * The classifier behind /ad-5s (ADR-0101, ADR-0057). Run from any worktree of
 * the repository:
 *
 *   node <skill-base-dir>/scripts/sweep.mjs after-merge --pr <n> [--branch <b>] [--temp <path>]...
 *   node <skill-base-dir>/scripts/sweep.mjs sweep [--path <dir>] [--idle-hours <h>] [--temp <path>]...
 *   node <skill-base-dir>/scripts/sweep.mjs remove-temp <path>
 *   node <skill-base-dir>/scripts/sweep.mjs delete-branch <name> <sha>
 *   node <skill-base-dir>/scripts/sweep.mjs record --kind <k> --target <t> --sha <s> --proof <p> --undo <u>
 *
 * `after-merge` and `sweep` print one JSON object whose `items` are, in the
 * order they must be acted on, the worktrees, local branches, remote branches,
 * stale worktree records, untracked and ignored files and named temp paths, each with a
 * verdict: CANDIDATE (proved safe; `command` and `undo` are argv arrays),
 * ASK (the owner decides) or KEEP (a check refused; `reason` says which).
 * Classifying deletes nothing: the skill runs each `command` itself, so the
 * approval step stays readable in its text (ADR-0085). `remove-temp` re-checks
 * one named path and deletes it only when it is still a CANDIDATE;
 * `delete-branch` deletes a local branch only while its tip is still the sha
 * that was classified, through `git branch -D`, which refuses a branch a
 * worktree holds; a remote branch is deleted with a lease on its classified
 * sha. `record` appends one receipt line under the main worktree's
 * `.agentic/receipts/5s.jsonl`.
 *
 * Merged is proved, never guessed: a branch is a CANDIDATE when its tip is the
 * exact head of a merged pull request (or behind it, holding one of its
 * commits), or reachable from
 * origin's default branch with commits of its own. A remote branch needs the
 * pull request proof and a GitHub answer. A squash merge leaves no git-only
 * proof, so with no GitHub answer it is ASK. GitHub is reached through AGENTIC_GH (default `gh`),
 * the seam ad-pr's preflight uses; a Node script there runs under this node.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import {
  appendFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
// Long-lived branches by convention; the default branch is added at run time.
const PROTECTED = /^(main|master|develop|dev|trunk|staging|production|prod|gh-pages|release\/.*)$/;
// Gitignored output a build regenerates; anything else ignored (`.env`, local
// config, assets) is the owner's and is never removed with a worktree unasked.
const REGENERABLE = new Set([
  'node_modules',
  'target',
  '.venv',
  'venv',
  'build',
  'dist',
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
  '.ruff_cache',
  'coverage',
  '.turbo',
  '.next',
]);

function git(cwd, args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).replace(/\s+$/, '');
}

function gitOk(cwd, args) {
  return spawnSync('git', args, { cwd, stdio: 'ignore' }).status === 0;
}

function tryGit(cwd, args) {
  try {
    return git(cwd, args);
  } catch {
    return null;
  }
}

function gh(args, cwd) {
  const name = process.env.AGENTIC_GH || 'gh';
  const [file, argv] = /\.[cm]?js$/i.test(name)
    ? [process.execPath, [name, ...args]]
    : [name, args];
  try {
    const out = execFileSync(file, argv, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: true, value: JSON.parse(out) };
  } catch (error) {
    const stderr = typeof error.stderr === 'string' ? error.stderr.trim() : '';
    return { ok: false, error: stderr || error.message };
  }
}

function key(path) {
  let p = resolve(path);
  try {
    p = realpathSync.native(p);
  } catch {
    // a path that does not exist keeps its resolved form
  }
  p = p.replace(/\\/g, '/').replace(/\/+$/, '');
  return process.platform === 'win32' ? p.toLowerCase() : p;
}

function inside(child, parent) {
  return child === parent || child.startsWith(`${parent}/`);
}

// GitHub returns at most this many pull requests per list; a full list may be cut short.
const LIST_LIMIT = 1000;
const cutShort = (state) =>
  `${LIST_LIMIT} or more ${state} pull requests; the list may be cut short, so it proves nothing`;

function parseArgs(argv) {
  const opts = { temp: [], positional: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      opts.positional.push(arg);
      continue;
    }
    const name = arg.slice(2);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`--${name} needs a value`);
    i += 1;
    if (name === 'temp') opts.temp.push(value);
    else opts[name] = value;
  }
  return opts;
}

function worktrees(cwd) {
  const list = [];
  let current = null;
  for (const line of git(cwd, ['worktree', 'list', '--porcelain']).split(/\r?\n/)) {
    if (line.startsWith('worktree ')) {
      current = { path: line.slice(9), locked: false, prunable: false, branch: null, head: null };
      list.push(current);
    } else if (!current) continue;
    else if (line.startsWith('HEAD ')) current.head = line.slice(5);
    else if (line.startsWith('branch refs/heads/')) current.branch = line.slice(18);
    else if (line.startsWith('locked')) current.locked = true;
    else if (line.startsWith('prunable')) current.prunable = true;
  }
  list.forEach((w, i) => {
    w.main = i === 0;
    w.key = key(w.path);
  });
  return list;
}

function defaultBranch(cwd) {
  const head = tryGit(cwd, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD']);
  if (head) return head.replace(/^origin\//, '');
  for (const name of ['main', 'master']) {
    if (gitOk(cwd, ['rev-parse', '--verify', '--quiet', `refs/remotes/origin/${name}`]))
      return name;
  }
  return 'main';
}

class Context {
  constructor(cwd, opts) {
    this.cwd = cwd;
    this.top = git(cwd, ['rev-parse', '--show-toplevel']);
    this.commonDir = key(resolve(cwd, git(cwd, ['rev-parse', '--git-common-dir'])));
    this.trees = worktrees(cwd);
    this.mainTree = this.trees[0];
    this.base = defaultBranch(cwd);
    this.cwdKey = key(cwd);
    this.idleMs = Number(opts['idle-hours'] ?? 24) * 3600 * 1000;
    this.github = { ok: true };
    this.merged = [];
    this.open = [];
    this.sweep = false;
  }

  // Newer than the idle window: another session may still be using it.
  recent(files) {
    const marks = files.filter((f) => existsSync(f));
    if (marks.length === 0) return false;
    return Date.now() - Math.max(...marks.map((f) => statSync(f).mtimeMs)) < this.idleMs;
  }

  idleReason() {
    return `touched in the last ${this.idleMs / 3600000} h; another session may be using it`;
  }

  ancestor(a, b) {
    return gitOk(this.cwd, ['merge-base', '--is-ancestor', a, b]);
  }

  hasCommit(sha) {
    return gitOk(this.cwd, ['cat-file', '-e', `${sha}^{commit}`]);
  }

  loadOpen() {
    const open = gh(
      [
        'pr',
        'list',
        '--state',
        'open',
        '--limit',
        String(LIST_LIMIT),
        '--json',
        'number,headRefName,baseRefName',
      ],
      this.cwd
    );
    if (open.ok && open.value.length >= LIST_LIMIT) {
      this.github = { ok: false, error: cutShort('open') };
    } else if (open.ok) this.open = open.value;
    else this.github = { ok: false, error: open.error };
  }

  // Where the pull request left its base: what its head and the base held before the merge.
  forkPoint(pr) {
    const merge = pr.mergeCommit && pr.mergeCommit.oid;
    if (!merge || !this.hasCommit(merge) || !this.hasCommit(pr.headRefOid)) return null;
    const before = tryGit(this.cwd, ['rev-parse', '--verify', '--quiet', `${merge}^1`]);
    return before ? tryGit(this.cwd, ['merge-base', pr.headRefOid, before]) : null;
  }

  // The merge proof for a branch tip, before any worktree is considered.
  proveBranch(name, tip, pr) {
    const opened = this.open.find((p) => p.headRefName === name);
    if (opened) return { verdict: 'KEEP', reason: `pull request #${opened.number} on it is open` };
    if (pr) {
      const head = pr.headRefOid;
      if (tip === head)
        return {
          verdict: 'CANDIDATE',
          reason: `pull request #${pr.number} merged at this exact head`,
        };
      if (this.hasCommit(head) && this.ancestor(tip, head)) {
        const fork = this.forkPoint(pr);
        if (fork && this.ancestor(tip, fork)) {
          return {
            verdict: 'ASK',
            reason: `holds none of pull request #${pr.number}'s commits; it may be new work under the same name`,
          };
        }
        return {
          verdict: 'CANDIDATE',
          reason: `behind the head pull request #${pr.number} merged`,
        };
      }
      if (this.hasCommit(head) && this.ancestor(head, tip)) {
        const count = git(this.cwd, ['rev-list', '--count', `${head}..${tip}`]);
        return {
          verdict: 'KEEP',
          reason: `${count} commit(s) newer than what pull request #${pr.number} merged`,
        };
      }
      return { verdict: 'KEEP', reason: `differs from the head pull request #${pr.number} merged` };
    }
    if (this.ancestor(tip, `refs/remotes/origin/${this.base}`)) {
      const baseTip = tryGit(this.cwd, ['rev-parse', `refs/remotes/origin/${this.base}`]);
      if (tip === baseTip) {
        return {
          verdict: 'ASK',
          reason: `at the tip of origin/${this.base} with no commits of its own; it may be new work`,
        };
      }
      return { verdict: 'CANDIDATE', reason: `reachable from origin/${this.base}`, ancestry: true };
    }
    if (!this.github.ok) {
      return {
        verdict: 'ASK',
        reason:
          'not in origin/' +
          this.base +
          ' and GitHub could not be asked, so a squash merge cannot be proved',
      };
    }
    return { verdict: 'ASK', reason: `no merged pull request and not in origin/${this.base}` };
  }

  mergedPr(name) {
    return this.merged
      .filter((p) => p.headRefName === name && !p.isCrossRepository)
      .sort((a, b) => b.number - a.number)[0];
  }

  worktreeItem(tree, proof, sweep) {
    const item = { kind: 'worktree', target: tree.path, branch: tree.branch, sha: tree.head };
    const keep = (verdict, reason) => ({ ...item, verdict, reason });
    if (inside(this.cwdKey, tree.key)) {
      return keep('KEEP', 'the current directory is inside it; run from the main worktree');
    }
    if (tree.locked) return keep('KEEP', 'locked');
    const status = tryGit(tree.path, ['status', '--porcelain']);
    if (status === null) return keep('KEEP', 'git could not read its status');
    if (status !== '') return keep('KEEP', 'has untracked or modified files');
    if (proof.verdict !== 'CANDIDATE') return keep(proof.verdict, `its branch: ${proof.reason}`);
    if (sweep) {
      const gitDir = git(tree.path, ['rev-parse', '--absolute-git-dir']);
      if (this.recent(['logs/HEAD', 'HEAD'].map((f) => join(gitDir, f)))) {
        return keep('ASK', this.idleReason());
      }
    }
    const ignored = git(tree.path, ['status', '--porcelain', '--ignored', '-z'])
      .split('\0')
      .filter((l) => l.startsWith('!! '))
      .map((l) => l.slice(3).replace(/\/$/, ''))
      .filter((p) => !p.split('/').some((seg) => REGENERABLE.has(seg)));
    const undo = tree.branch
      ? ['git', 'worktree', 'add', tree.path, tree.branch]
      : ['git', 'worktree', 'add', '--detach', tree.path, tree.head];
    const command = ['git', 'worktree', 'remove', tree.path];
    if (ignored.length > 0) {
      return {
        ...keep('ASK', 'holds gitignored files a build does not regenerate'),
        ignored,
        command,
        undo,
      };
    }
    return { ...item, verdict: 'CANDIDATE', reason: proof.reason, command, undo };
  }

  branchItem(name, tip, proof, treeItem, tree) {
    const item = { kind: 'branch', target: name, sha: tip };
    // An ASK carries the same guarded command, so the owner's yes runs the re-check.
    const act = {
      command: [process.execPath, SELF, 'delete-branch', name, tip],
      undo: ['git', 'branch', name, tip],
      ...(treeItem ? { after: tree.path } : {}),
    };
    if (tree && tree.main)
      return { ...item, verdict: 'KEEP', reason: 'checked out in the main worktree' };
    if (proof.verdict === 'KEEP') return { ...item, ...proof };
    if (treeItem && treeItem.verdict === 'KEEP') {
      return { ...item, verdict: 'KEEP', reason: `checked out at ${tree.path}, which stays` };
    }
    if (proof.verdict !== 'CANDIDATE') return { ...item, ...proof, ...act };
    if (treeItem && treeItem.verdict !== 'CANDIDATE') {
      return {
        ...item,
        verdict: 'ASK',
        reason: `checked out at ${tree.path}, which is asked`,
        ...act,
      };
    }
    if (this.sweep && this.recent([join(this.commonDir, 'logs', 'refs', 'heads', name)])) {
      return { ...item, verdict: 'ASK', reason: this.idleReason(), ...act };
    }
    return { ...item, verdict: 'CANDIDATE', reason: proof.reason, ...act };
  }

  remoteItem(name, sha, pr, live) {
    const item = { kind: 'remote', target: `origin/${name}`, sha };
    // The lease deletes it only while origin still has the classified commit.
    const act = {
      command: [
        'git',
        'push',
        `--force-with-lease=refs/heads/${name}:${sha}`,
        'origin',
        `:refs/heads/${name}`,
      ],
      undo: ['git', 'push', 'origin', `${sha}:refs/heads/${name}`],
    };
    if (live === null) {
      return {
        ...item,
        verdict: 'ASK',
        reason: 'origin could not be read, so its tip is unproved',
        ...act,
      };
    }
    if (live !== undefined && live !== sha) {
      return { ...item, verdict: 'KEEP', reason: 'moved on origin since the last fetch' };
    }
    const stacked = this.open.find((p) => p.baseRefName === name);
    if (stacked)
      return {
        ...item,
        verdict: 'KEEP',
        reason: `open pull request #${stacked.number} targets it`,
      };
    const proof =
      pr && sha !== pr.headRefOid
        ? { verdict: 'KEEP', reason: `holds commits pull request #${pr.number} did not merge` }
        : this.proveBranch(name, sha, pr);
    if (proof.verdict === 'KEEP') return { ...item, ...proof };
    if (proof.verdict !== 'CANDIDATE') return { ...item, ...proof, ...act };
    if (!this.github.ok) {
      return {
        ...item,
        verdict: 'ASK',
        reason: `${proof.reason}, but GitHub could not be asked whether an open pull request needs it`,
        ...act,
      };
    }
    if (proof.ancestry) {
      return {
        ...item,
        verdict: 'ASK',
        reason: `${proof.reason}, but no merged pull request proves it finished; it may be shared`,
        ...act,
      };
    }
    return { ...item, verdict: 'CANDIDATE', reason: proof.reason, ...act };
  }

  tempItem(path) {
    if (!path) throw new Error('a temp path is required');
    const target = resolve(path);
    const item = { kind: 'temp', target };
    const keep = (verdict, reason) => ({ ...item, verdict, reason });
    let stat;
    try {
      stat = lstatSync(target);
    } catch {
      return keep('KEEP', 'does not exist');
    }
    if (stat.isSymbolicLink())
      return keep('KEEP', "a link or junction; its target is not this task's");
    const k = key(target);
    if (k.split('/').includes('.git') || inside(k, this.commonDir)) {
      return keep('KEEP', "inside git's own directory");
    }
    if (inside(k, key(join(this.mainTree.path, '.agentic')))) {
      return keep('KEEP', "the kit's own records");
    }
    const roots = [tmpdir(), homedir(), this.top, ...this.trees.map((t) => t.path)].map(key);
    if (roots.some((r) => inside(r, k))) return keep('KEEP', 'a root, not a temp path');
    const tree = this.trees
      .filter((t) => inside(k, t.key))
      .sort((a, b) => b.key.length - a.key.length)[0];
    if (tree) {
      if (tryGit(tree.path, ['ls-files', '--', target]) !== '')
        return keep('KEEP', 'tracked by git');
      if (gitOk(tree.path, ['check-ignore', '-q', '--', target]))
        return keep('ASK', "gitignored; it may be the owner's local file, not the session's");
    } else if (!inside(k, key(tmpdir()))) {
      return keep('KEEP', 'outside the repository and the OS temp directory');
    }
    if (stat.isDirectory() && holdsRepository(target)) return keep('ASK', 'holds a git repository');
    return {
      ...item,
      verdict: 'CANDIDATE',
      reason: 'named by the session',
      command: [process.execPath, SELF, 'remove-temp', target],
    };
  }
}

// True when a `.git` entry lies anywhere under dir; links are not followed.
function holdsRepository(dir) {
  const pending = [dir];
  while (pending.length > 0) {
    const current = pending.pop();
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return true; // unreadable: cannot prove it holds none
    }
    for (const entry of entries) {
      if (entry.name === '.git') return true;
      if (entry.isDirectory()) pending.push(join(current, entry.name));
    }
  }
  return false;
}

function afterMerge(ctx, opts) {
  const items = [];
  const view = !opts.pr
    ? { ok: false, error: 'no --pr given' }
    : gh(
        [
          'pr',
          'view',
          String(opts.pr),
          '--json',
          'number,state,headRefName,headRefOid,baseRefName,isCrossRepository,mergeCommit',
        ],
        ctx.cwd
      );
  let pr = null;
  let name = opts.branch ?? null;
  if (view.ok) {
    pr = view.value;
    if (opts.branch && opts.branch !== pr.headRefName) {
      throw new Error(
        `--branch ${opts.branch} is not pull request #${pr.number}'s head (${pr.headRefName})`
      );
    }
    name = pr.headRefName;
    ctx.loadOpen();
  } else {
    ctx.github = { ok: false, error: view.error };
  }
  if (!name) {
    throw new Error(`GitHub could not be asked (${view.error}); pass --branch <name>`);
  }
  const notMerged =
    pr && pr.state !== 'MERGED'
      ? { verdict: 'KEEP', reason: `pull request #${pr.number} is ${pr.state}, not merged` }
      : null;
  const usable = pr && !pr.isCrossRepository && !notMerged ? pr : null;
  const tip = tryGit(ctx.cwd, ['rev-parse', '--verify', '--quiet', `refs/heads/${name}`]);
  const tree =
    ctx.trees.find((t) => t.branch === name) ??
    (pr ? ctx.trees.find((t) => !t.branch && !t.main && t.head === pr.headRefOid) : undefined);
  const proof = notMerged ?? (tip ? ctx.proveBranch(name, tip, usable) : null);
  let treeItem = null;
  if (tree && !tree.main && proof) {
    treeItem = ctx.worktreeItem(tree, proof, false);
    items.push(treeItem);
  }
  if (tip && !PROTECTED.test(name) && name !== ctx.base) {
    items.push(ctx.branchItem(name, tip, proof, treeItem, tree));
  }
  const remote = tryGit(ctx.cwd, ['ls-remote', '--heads', 'origin', `refs/heads/${name}`]);
  // ls-remote matches trailing path components; only the exact ref is the branch.
  const exact = (remote ?? '')
    .split(/\r?\n/)
    .map((l) => l.split(/\s+/))
    .find(([, ref]) => ref === `refs/heads/${name}`);
  const remoteSha = exact ? exact[0] : null;
  if (remoteSha && !PROTECTED.test(name) && name !== ctx.base) {
    items.push(
      notMerged
        ? { kind: 'remote', target: `origin/${name}`, sha: remoteSha, ...notMerged }
        : ctx.remoteItem(name, remoteSha, usable, remoteSha)
    );
  }
  return items;
}

function sweep(ctx, opts) {
  const items = [];
  ctx.sweep = true;
  if (opts.path) {
    if (!existsSync(opts.path)) throw new Error(`no such path: ${opts.path}`);
    if (!ctx.trees.some((t) => inside(key(opts.path), t.key)))
      throw new Error(`not inside any worktree of this repository: ${opts.path}`);
  }
  const scope = opts.path ? key(opts.path) : null;
  const inScope = (p) => !scope || inside(key(p), scope);
  const merged = gh(
    [
      'pr',
      'list',
      '--state',
      'merged',
      '--limit',
      String(LIST_LIMIT),
      '--json',
      'number,headRefName,headRefOid,isCrossRepository,mergeCommit',
    ],
    ctx.cwd
  );
  if (merged.ok && merged.value.length >= LIST_LIMIT) {
    ctx.github = { ok: false, error: cutShort('merged') };
  } else if (merged.ok) {
    ctx.merged = merged.value;
    ctx.loadOpen();
  } else {
    ctx.github = { ok: false, error: merged.error };
  }
  const branches = git(ctx.cwd, [
    'for-each-ref',
    'refs/heads',
    '--format=%(refname:short) %(objectname)',
  ])
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => l.split(' '));
  const kept = (n) => PROTECTED.test(n) || n === ctx.base;
  const treeItems = [];
  const branchItems = [];
  for (const [name, tip] of branches) {
    if (kept(name)) continue;
    const tree = ctx.trees.find((t) => t.branch === name);
    if (scope && !(tree && inScope(tree.path))) continue;
    const proof = ctx.proveBranch(name, tip, ctx.mergedPr(name));
    let treeItem = null;
    if (tree && !tree.main && !tree.prunable) {
      treeItem = ctx.worktreeItem(tree, proof, true);
      treeItems.push(treeItem);
    }
    branchItems.push(ctx.branchItem(name, tip, proof, treeItem, tree));
  }
  for (const tree of ctx.trees) {
    if (tree.main || tree.branch || tree.prunable || !inScope(tree.path)) continue;
    const onBase = ctx.ancestor(tree.head, `refs/remotes/origin/${ctx.base}`);
    const proof = onBase
      ? { verdict: 'CANDIDATE', reason: `detached at a commit in origin/${ctx.base}` }
      : { verdict: 'ASK', reason: `detached at a commit not in origin/${ctx.base}` };
    treeItems.push(ctx.worktreeItem(tree, proof, true));
  }
  items.push(...treeItems, ...branchItems);
  if (!scope) {
    const remotes = git(ctx.cwd, [
      'for-each-ref',
      'refs/remotes/origin',
      '--format=%(refname:short) %(objectname) %(symref)',
    ])
      .split(/\r?\n/)
      .filter(Boolean)
      .map((l) => l.split(' '))
      .filter(([ref, , symref]) => !symref && ref.startsWith('origin/'));
    // Re-read origin: a tip that moved since the last fetch is not the one proved.
    const listing = tryGit(ctx.cwd, ['ls-remote', '--heads', 'origin']);
    const live = new Map(
      (listing ?? '')
        .split(/\r?\n/)
        .filter(Boolean)
        .map((l) => l.split(/\s+/))
        .map(([sha, ref]) => [ref.replace(/^refs\/heads\//, ''), sha])
    );
    for (const [ref, sha] of remotes) {
      const name = ref.slice('origin/'.length);
      if (kept(name)) continue;
      if (listing !== null && !live.has(name)) continue;
      const pr = ctx.mergedPr(name);
      items.push(ctx.remoteItem(name, sha, pr, listing === null ? null : live.get(name)));
    }
  }
  if (ctx.trees.some((t) => t.prunable)) {
    items.push({
      kind: 'prune',
      target: 'stale worktree records',
      verdict: 'CANDIDATE',
      reason: 'their directories are gone',
      command: ['git', 'worktree', 'prune'],
    });
  }
  // Files are read in the worktree that holds the path, since git refuses a
  // pathspec outside its own worktree.
  const holder = scope
    ? ctx.trees.filter((t) => inside(scope, t.key)).sort((a, b) => b.key.length - a.key.length)[0]
    : null;
  const scanIn = holder ? holder.path : ctx.top;
  const where = holder && holder.key !== key(ctx.top) ? { in: holder.path } : {};
  const status = git(scanIn, [
    'status',
    '--porcelain',
    '-z',
    '--untracked-files=all',
    '--',
    opts.path ? resolve(opts.path) : '.',
  ]);
  const own = (p) => p === '.agentic' || p.startsWith('.agentic/');
  for (const entry of status.split('\0')) {
    if (entry.startsWith('?? ') && !own(entry.slice(3))) {
      items.push({
        kind: 'untracked',
        target: entry.slice(3),
        ...where,
        verdict: 'ASK',
        reason: 'untracked; only its author knows whether it matters',
      });
    }
  }
  // Ignored leftovers (logs, scratch, local config), listed by name, never opened.
  const ignored = git(scanIn, [
    'status',
    '--porcelain',
    '-z',
    '--ignored',
    '--',
    opts.path ? resolve(opts.path) : '.',
  ]);
  for (const entry of ignored.split('\0')) {
    if (!entry.startsWith('!! ')) continue;
    const path = entry.slice(3).replace(/\/$/, '');
    if (own(path) || path.split('/').some((seg) => REGENERABLE.has(seg))) continue;
    items.push({
      kind: 'ignored',
      target: path,
      ...where,
      verdict: 'ASK',
      reason: "gitignored and not build output: a log, scratch or the owner's local file",
    });
  }
  return items;
}

function deleteBranch(ctx, name, sha) {
  if (!name || !sha) throw new Error('delete-branch needs <name> <sha>');
  const tip = tryGit(ctx.cwd, ['rev-parse', '--verify', '--quiet', `refs/heads/${name}`]);
  if (tip !== sha) {
    const reason = tip ? `moved to ${tip} since it was classified` : 'already gone';
    return { removed: false, target: name, reason };
  }
  git(ctx.cwd, ['branch', '-D', name]);
  return { removed: true, target: name, sha };
}

function record(ctx, opts) {
  const dir = join(ctx.mainTree.path, '.agentic', 'receipts');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, '5s.jsonl');
  const entry = {
    at: new Date().toISOString(),
    kind: opts.kind,
    target: opts.target,
    sha: opts.sha ?? null,
    proof: opts.proof ?? null,
    undo: opts.undo ?? null,
  };
  appendFileSync(file, `${JSON.stringify(entry)}\n`);
  return { recorded: true, file };
}

function main() {
  const [mode, ...rest] = process.argv.slice(2);
  const opts = parseArgs(rest);
  const cwd = process.cwd();
  const ctx = new Context(cwd, opts);
  let out;
  if (mode === 'after-merge' || mode === 'sweep') {
    if (mode === 'after-merge' && !opts.pr && !opts.branch)
      throw new Error('after-merge needs --pr <n>');
    const items = mode === 'after-merge' ? afterMerge(ctx, opts) : sweep(ctx, opts);
    items.push(...opts.temp.map((p) => ctx.tempItem(p)));
    out = { mode, defaultBranch: ctx.base, github: ctx.github, items };
  } else if (mode === 'remove-temp') {
    const item = ctx.tempItem(opts.positional[0] ?? '');
    if (item.verdict === 'CANDIDATE') {
      rmSync(item.target, { recursive: true, maxRetries: 3 });
      out = { removed: true, target: item.target };
    } else {
      out = { removed: false, target: item.target, verdict: item.verdict, reason: item.reason };
    }
  } else if (mode === 'delete-branch') {
    out = deleteBranch(ctx, opts.positional[0], opts.positional[1]);
  } else if (mode === 'record') {
    out = record(ctx, opts);
  } else {
    throw new Error(
      'usage: sweep.mjs after-merge|sweep|remove-temp|delete-branch|record (see the header)'
    );
  }
  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
}

if (process.argv[1] && key(process.argv[1]) === key(SELF)) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`sweep: ${error.message}\n`);
    process.exitCode = 1;
  }
}
