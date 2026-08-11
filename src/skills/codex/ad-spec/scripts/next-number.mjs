#!/usr/bin/env node
/**
 * Deterministically find the next four-digit artifact number (ADR-0057, P2.5).
 * Run from a consumer repository root:
 *
 *   node <skill-base-dir>/scripts/next-number.mjs doc/adr
 *
 * The directory is an argument so the same self-contained script ships with
 * ad-adr, ad-spec, ad-task, and ad-spike. It reports filenames with a NNNN-
 * prefix, chooses the slot after the highest number (archived gaps stay gaps),
 * and surfaces unreadable directory listings rather than treating them absent.
 * The SKILL.md body keeps judgment: artifact scope, title/slug, and whether an
 * exhausted sequence needs a product decision.
 */
import { execFileSync } from 'node:child_process';
import { lstatSync, readdirSync } from 'node:fs';
import { isAbsolute, join, normalize } from 'node:path';
import { pathToFileURL } from 'node:url';

const ARTIFACT_NUMBER = /^(\d{4})-/;

function validDirectory(directory) {
  if (!directory || isAbsolute(directory)) return false;
  return !normalize(directory).split(/[\\/]+/).includes('..');
}

function listEntries(repoRoot, directory, unreadable) {
  try {
    return readdirSync(join(repoRoot, directory));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      unreadable.push({ path: directory, code: error.code ?? 'unknown' });
    }
    return [];
  }
}

function historyEntries(repoRoot, directory, unreadable) {
  try {
    if (execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() !== 'true') return [];
  } catch {
    if (process.env.GIT_DIR || hasGitMetadata(repoRoot)) {
      unreadable.push({ path: `git-history:${directory}`, code: 'GIT_ERROR' });
    }
    return [];
  }
  const head = headState(repoRoot);
  if (head === 'unborn') return [];
  if (head === 'error') {
    unreadable.push({ path: `git-history:${directory}`, code: 'GIT_ERROR' });
    return [];
  }
  try {
    return execFileSync('git', ['log', '--format=', '--name-only', '--', directory], { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n');
  } catch {
    unreadable.push({ path: `git-history:${directory}`, code: 'GIT_ERROR' });
    return [];
  }
}

function headState(repoRoot) {
  try {
    execFileSync('git', ['rev-parse', '--verify', '--quiet', 'HEAD'], { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return 'present';
  } catch (error) {
    return error.status === 1 ? 'unborn' : 'error';
  }
}

function hasGitMetadata(repoRoot) {
  try {
    lstatSync(join(repoRoot, '.git'));
    return true;
  } catch {
    return false;
  }
}

export function nextNumber(repoRoot, directory) {
  if (!validDirectory(directory)) {
    throw new Error('directory must be a non-empty relative path inside the repository');
  }
  const unreadable = [];
  const numbers = [...new Set(
    [...listEntries(repoRoot, directory, unreadable), ...historyEntries(repoRoot, directory, unreadable)]
      .map((name) => name.split('/').at(-1).match(ARTIFACT_NUMBER)?.[1])
      .filter(Boolean)
  )].sort();
  const highest = numbers.length === 0 ? 0 : Number(numbers.at(-1));
  const exhausted = highest >= 9999;
  return {
    directory,
    numbers,
    next: exhausted || unreadable.length > 0 ? null : String(highest + 1).padStart(4, '0'),
    exhausted,
    unreadable,
  };
}

function main() {
  const directory = process.argv[2];
  process.stdout.write(String(JSON.stringify(nextNumber(process.cwd(), directory), null, 2)) + '\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
