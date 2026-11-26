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
 * written through a temporary index outside the repository, seeded from HEAD's
 * tree, so the real index is never touched.
 *
 * `node gate-run.mjs check` exits 0 when the newest receipt that covers HEAD's
 * tree under the receipt gate's own freshness rule passed, and 1 otherwise, so a
 * skill that needs a green gate on the commit cites that run instead of
 * running the same command again (ADR-0100).
 *
 * The receipt is a local working copy; the durable record of a gate run stays
 * the tracked task Notes or pull request body.
 *
 * Zero dependencies; byte-identical in both host trees.
 */

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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
 * The temporary index is seeded from HEAD's tree with `read-tree`, which
 * carries each entry's mode and no stat data, so git still hashes every
 * file's content: a copy of the real index would carry its stat cache, and a
 * same-size edit in the index's second could be recorded as unchanged ("racy
 * git"). The seed matters where core.filemode is false (Windows): `add` then
 * keeps the mode an entry already has, and an index that starts empty would
 * record every executable as 100644, a tree no commit has (ADR-0100).
 */
export function workingTree(root) {
  const scratch = mkdtempSync(join(tmpdir(), 'agentic-gate-run-'));
  try {
    const env = { ...process.env, GIT_INDEX_FILE: join(scratch, 'index') };
    if (headCommit(root)) git(root, ['read-tree', 'HEAD'], env);
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

/**
 * Every receipt in the file, oldest first, and the count of lines that carry
 * none (torn or hand-edited), so a caller can report them instead of losing
 * them silently.
 */
export function readReceipts(root) {
  const file = gateRunFile(root);
  const receipts = [];
  let unreadable = 0;
  if (!existsSync(file)) return { receipts, unreadable };
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const receipt = JSON.parse(line);
      if (receipt && typeof receipt.tree === 'string') receipts.push(receipt);
      else unreadable += 1;
    } catch {
      unreadable += 1;
    }
  }
  return { receipts, unreadable };
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
  if (verb === 'check' && rest.length === 0) return { verb };
  const options = {};
  for (let i = 0; i < rest.length; i += 2) options[rest[i]] = rest[i + 1];
  const exit = Number(options['--exit']);
  if (verb !== 'record' || !options['--command'] || !Number.isInteger(exit)) return null;
  return { verb, command: options['--command'], exit };
}

// The freshness rule lives in the receipt gate, which imports this module;
// loading it here only when asked keeps the import graph acyclic.
async function check(cwd) {
  const { latestReceipt } = await import('./sequence-gate.mjs');
  const root = repositoryRoot(cwd);
  const tree = headTree(root);
  const receipt = latestReceipt(root, tree);
  if (!receipt) {
    process.stdout.write(`gate-run: no passing run covers tree ${tree.slice(0, 12)}\n`);
    process.exitCode = 1;
    return;
  }
  if (receipt.exit !== 0) {
    process.stdout.write(
      `gate-run: the newest run of tree ${tree.slice(0, 12)} failed ` +
        `("${receipt.command}", exit ${receipt.exit}, at ${receipt.at})\n`
    );
    process.exitCode = 1;
    return;
  }
  process.stdout.write(
    `gate-run: covered tree ${tree.slice(0, 12)} by "${receipt.command}" ` +
      `(exit 0, recorded on tree ${receipt.tree.slice(0, 12)} at ${receipt.at})\n`
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args) {
    process.stderr.write(
      'usage: gate-run.mjs record --command "<command>" --exit <code>\n' +
        '       gate-run.mjs check\n'
    );
    process.exitCode = 64;
    return;
  }
  if (args.verb === 'check') {
    try {
      await check(process.cwd());
    } catch (error) {
      const reason = String(error.stderr || error.message)
        .trim()
        .split('\n')[0];
      process.stdout.write(`gate-run: no passing run found (${reason})\n`);
      process.exitCode = 1;
    }
    return;
  }
  let receipt;
  try {
    receipt = recordReceipt(process.cwd(), args);
  } catch (error) {
    // The command already passed; a missing receipt only means the receipt
    // gate will log would-block. Never fail the caller's gate over it.
    const reason = String(error.stderr || error.message)
      .trim()
      .split('\n')[0];
    process.stderr.write(`gate-run: no receipt recorded (${reason})\n`);
    return;
  }
  process.stdout.write(
    `gate-run: recorded tree ${receipt.tree.slice(0, 12)} for "${receipt.command}" (exit ${receipt.exit})\n`
  );
}

// Real paths on both sides: reached through a junction or symlink, argv[1]
// keeps the link while import.meta.url names the target, and a check that
// silently skipped main() would exit 0, which reads as "covered".
function invokedDirectly() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return pathToFileURL(process.argv[1]).href === import.meta.url;
  }
}

if (invokedDirectly()) {
  // Not awaited: the receipt gate the check loads imports this module, which
  // must finish evaluating first.
  main().catch((error) => {
    process.stderr.write(`gate-run: ${error.message}\n`);
    process.exitCode = 1;
  });
}
