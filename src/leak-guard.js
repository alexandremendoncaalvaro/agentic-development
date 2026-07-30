#!/usr/bin/env node
/**
 * Pre-commit house-IP leak-guard (ADR-0033).
 *
 * Fail-closed backstop that blocks a commit when staged content:
 *   (a) matches a pattern in the local, gitignored `.agentic/leak-denylist.txt`;
 *   (b) adds a path under `rules/`;
 *   (c) adds a symlink whose resolved target escapes the repository root.
 *
 * The policy core (`findViolations`) is pure and injected with its inputs so the
 * test suite can exercise every branch without spawning git. `main()` is the thin
 * CLI wrapper that gathers staged state from git and prints/exits.
 */

import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname, join, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const DENYLIST_REL = join('.agentic', 'leak-denylist.txt');

/** Parse a denylist file's text into normalized (lowercased, trimmed) literal patterns. */
export function loadDenylist(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line) => line.toLowerCase());
}

/**
 * Parse `git diff --cached --raw -z` output into staged entries (destination path/mode/sha).
 *
 * `-z` (NUL-delimited) is mandatory, not cosmetic: without it git honors
 * `core.quotepath` (true by default) and C-quotes any path containing non-ASCII
 * bytes, so a `rules/…` path with a single accented character would slip past the
 * downstream `startsWith('rules/')` check — a silent false-negative. Under `-z`
 * paths are emitted verbatim. Format per record: `:<modes> <shas> <status>\0<path>\0`,
 * with renames/copies carrying `\0<old>\0<new>\0`; the destination is what is introduced.
 */
export function parseRawDiff(text) {
  const entries = [];
  const parts = text.split('\0');
  let i = 0;
  while (i < parts.length) {
    const meta = parts[i];
    if (!meta || !meta.startsWith(':')) {
      i += 1;
      continue;
    }
    const fields = meta.slice(1).split(/\s+/); // srcMode dstMode srcSha dstSha status
    const statusField = fields[4] || '';
    const status = statusField[0];
    i += 1;
    if (!status) continue;
    let path;
    if (status === 'R' || status === 'C') {
      path = parts[i + 1]; // parts[i] is the old path; parts[i + 1] is the destination
      i += 2;
    } else {
      path = parts[i];
      i += 1;
    }
    if (path === undefined) continue;
    entries.push({ status, dstMode: fields[1], dstSha: fields[3], path });
  }
  return entries;
}

/** Pull introduced (`+`) content lines out of `git diff --cached`, tagged with their file. */
export function extractAddedLines(text) {
  const added = [];
  let currentPath = null;
  for (const line of text.split('\n')) {
    if (line.startsWith('+++ ')) {
      const target = line.slice(4).trim();
      currentPath = target === '/dev/null' ? null : target.replace(/^b\//, '');
      continue;
    }
    if (line.startsWith('---')) continue;
    if (line.startsWith('+') && currentPath) {
      added.push({ path: currentPath, content: line.slice(1) });
    }
  }
  return added;
}

/** True when a symlink's resolved target stays within the repository root. */
function targetStaysInside(repoRoot, symlinkPath, target) {
  const resolved = resolve(repoRoot, dirname(symlinkPath), target);
  return resolved === repoRoot || resolved.startsWith(repoRoot + sep);
}

/**
 * Pure policy core. Returns a list of `{ kind, path, detail }` violations.
 * `readSymlinkTarget(entry)` yields a staged symlink's target string; it is only
 * called for entries with a symlink destination mode.
 */
export function findViolations({
  entries,
  addedLines,
  denylistPatterns,
  repoRoot,
  readSymlinkTarget,
}) {
  const violations = [];
  const introduced = entries.filter((e) => e.status !== 'D');

  if (denylistPatterns.length > 0) {
    for (const { path, content } of addedLines) {
      const haystack = content.toLowerCase();
      for (const pattern of denylistPatterns) {
        if (haystack.includes(pattern)) {
          violations.push({ kind: 'denylist', path, detail: `content matches "${pattern}"` });
        }
      }
    }
    for (const { path } of introduced) {
      const haystack = path.toLowerCase();
      for (const pattern of denylistPatterns) {
        if (haystack.includes(pattern)) {
          violations.push({ kind: 'denylist', path, detail: `path matches "${pattern}"` });
        }
      }
    }
  }

  for (const { path } of introduced) {
    // Case-folded like the denylist checks above: the guard is fail-closed, and
    // ADR-0033's accepted-limitations list does not include case. `Rules/` from a
    // case-insensitive filesystem habit or a plain typo is the same leak.
    const probe = path.toLowerCase();
    if (probe === 'rules' || probe.startsWith('rules/')) {
      violations.push({ kind: 'rules-path', path, detail: 'adds a path under rules/' });
    }
    // ADR-0043: the per-project curated layer lives at .agentic/rules/; in this
    // public kit repo, machine-local is the only allowed mode — committed project
    // rules here would be exactly the leak this guard exists to prevent.
    if (probe === '.agentic/rules' || probe.startsWith('.agentic/rules/')) {
      violations.push({ kind: 'rules-path', path, detail: 'adds a path under .agentic/rules/' });
    }
  }

  for (const entry of introduced) {
    if (entry.dstMode !== '120000') continue;
    const target = readSymlinkTarget(entry);
    if (!targetStaysInside(repoRoot, entry.path, target)) {
      violations.push({ kind: 'symlink-escape', path: entry.path, detail: `target ${target} escapes the repo` });
    }
  }

  return violations;
}

function git(args, repoRoot) {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

/** CLI entry: gather staged state from git, apply the policy, print + exit fail-closed. */
export function main() {
  try {
    let repoRoot;
    try {
      repoRoot = git(['rev-parse', '--show-toplevel'], process.cwd()).trim();
    } catch {
      process.stderr.write('leak-guard: not inside a git repository — blocking commit (fail-closed).\n');
      return 1;
    }

    // `-z` keeps non-ASCII paths verbatim (see parseRawDiff); `core.quotepath=false`
    // does the same for the `+++ b/<path>` headers the content scan attributes matches to.
    const rawDiff = git(['diff', '--cached', '--raw', '-z', '--no-color'], repoRoot);
    const entries = parseRawDiff(rawDiff);
    if (entries.length === 0) return 0;

    const contentDiff = git(['-c', 'core.quotepath=false', 'diff', '--cached', '--no-color'], repoRoot);
    const addedLines = extractAddedLines(contentDiff);

    const denylistPath = join(repoRoot, DENYLIST_REL);
    const denylistPatterns = existsSync(denylistPath)
      ? loadDenylist(readFileSync(denylistPath, 'utf8'))
      : [];

    const readSymlinkTarget = (entry) => git(['cat-file', 'blob', entry.dstSha], repoRoot).trim();

    const violations = findViolations({
      entries,
      addedLines,
      denylistPatterns,
      repoRoot,
      readSymlinkTarget,
    });

    if (violations.length === 0) return 0;

    process.stderr.write('leak-guard: commit blocked — staged content would leak protected material:\n');
    for (const v of violations) {
      process.stderr.write(`  [${v.kind}] ${v.path} — ${v.detail}\n`);
    }
    process.stderr.write(
      '\nThis gate is fail-closed (WORKFLOW.md §11): do not bypass with --no-verify.\n' +
        'Remove the offending content, or tune .agentic/leak-denylist.txt if this is a false positive.\n'
    );
    return 1;
  } catch (err) {
    // Any unexpected failure (git error, huge-diff buffer overrun, corrupt object)
    // blocks the commit rather than letting content through unchecked.
    process.stderr.write(`leak-guard: unexpected error — blocking commit (fail-closed): ${err.message}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main());
}
