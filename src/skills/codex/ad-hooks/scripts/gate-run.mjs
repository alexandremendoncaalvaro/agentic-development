#!/usr/bin/env node
/**
 * ad-hooks receipt gates — the gate-run receipt (ADR-0089, task-0107).
 *
 * `node gate-run.mjs record --command "<ci-mirror command>" --exit <code>`
 * appends one receipt for the repository's local CI-mirror run to
 * `<repo>/.agentic/receipts/gate-run.jsonl`. The receipt is keyed to the git
 * tree of the working copy, untracked files included, not to a commit: the
 * command normally runs before the commit that lands the tested change, and
 * that commit's tree is the tree recorded here (GROUND-0038 E2). The tree is
 * written through an empty temporary index outside the repository, so the real
 * index is never touched.
 *
 * The receipt is a local working copy; the durable record of a gate run stays
 * the tracked task Notes or pull request body (rule CV.5).
 *
 * Zero dependencies; byte-identical in both host trees.
 */

import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const RECEIPTS_DIR = join('.agentic', 'receipts');
export const GATE_RUN_FILE = 'gate-run.jsonl';

export function git(cwd, args, env = process.env) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env,
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

export function repositoryRoot(cwd) {
  return git(cwd, ['rev-parse', '--show-toplevel']);
}

/**
 * The tree the next commit of every change in the working copy would have.
 * The temporary index starts empty, so git hashes every file's content: a
 * copy of the real index would carry its stat cache, and a same-size edit in
 * the index's second could be recorded as unchanged ("racy git").
 */
export function workingTree(root) {
  const scratch = mkdtempSync(join(tmpdir(), 'agentic-gate-run-'));
  try {
    const env = { ...process.env, GIT_INDEX_FILE: join(scratch, 'index') };
    git(root, ['add', '-A'], env);
    return git(root, ['write-tree'], env);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

export function headTree(root) {
  return git(root, ['rev-parse', 'HEAD^{tree}']);
}

function headCommit(root) {
  try {
    return git(root, ['rev-parse', 'HEAD']);
  } catch {
    return null;
  }
}

export function gateRunFile(root) {
  return join(root, RECEIPTS_DIR, GATE_RUN_FILE);
}

/** Every receipt in the file, oldest first; a malformed line is skipped. */
export function readReceipts(root) {
  const file = gateRunFile(root);
  if (!existsSync(file)) return [];
  const receipts = [];
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const receipt = JSON.parse(line);
      if (receipt && typeof receipt.tree === 'string') receipts.push(receipt);
    } catch {
      /* a torn or hand-edited line carries no receipt */
    }
  }
  return receipts;
}

export function recordReceipt(cwd, { command, exit }) {
  const root = repositoryRoot(cwd);
  const receipt = {
    at: new Date().toISOString(),
    tree: workingTree(root),
    head: headCommit(root),
    command,
    exit,
  };
  mkdirSync(join(root, RECEIPTS_DIR), { recursive: true });
  appendFileSync(gateRunFile(root), `${JSON.stringify(receipt)}\n`);
  return receipt;
}

function parseArgs(argv) {
  const [verb, ...rest] = argv;
  const options = {};
  for (let i = 0; i < rest.length; i += 2) options[rest[i]] = rest[i + 1];
  const exit = Number(options['--exit']);
  if (verb !== 'record' || !options['--command'] || !Number.isInteger(exit)) return null;
  return { command: options['--command'], exit };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args) {
    process.stderr.write('usage: gate-run.mjs record --command "<command>" --exit <code>\n');
    process.exitCode = 64;
    return;
  }
  const receipt = recordReceipt(process.cwd(), args);
  process.stdout.write(
    `gate-run: recorded tree ${receipt.tree.slice(0, 12)} for "${receipt.command}" (exit ${receipt.exit})\n`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
