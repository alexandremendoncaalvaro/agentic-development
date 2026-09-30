#!/usr/bin/env node
/**
 * Report the git state of every record a draft commit message cites
 * (task-0092, GROUND-0031). Run from a consumer repository root:
 *
 *   node <skill-base-dir>/scripts/cited-records.mjs <message-file | ->
 *
 * Prints JSON; never writes and never blocks.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// The id forms the kit's commit history uses (GROUND-0031 E4). GROUND,
// RESEARCH and PRISM records share doc/research/ and its number ledger.
const ID = /\b(?:(GROUND|RESEARCH|PRISM)-|(ADR)-|([Tt]ask)[- ]|([Ss]pec)[- ])(\d{4})\b/g;

function directoryOf([, research, adr, task]) {
  if (research) return 'doc/research';
  if (adr) return 'doc/adr';
  if (task) return 'doc/tasks';
  return 'doc/specs';
}

// A git hook exports these; inherited, they point every probe at another
// repository (AGENTS.md, task-0033).
const env = { ...process.env };
delete env.GIT_DIR;
delete env.GIT_WORK_TREE;
delete env.GIT_INDEX_FILE;

let root = process.cwd();

// core.quotePath=false keeps a non-ASCII slug literal instead of C-quoted.
function gitLines(args) {
  return execFileSync('git', ['-c', 'core.quotePath=false', ...args], {
    cwd: root,
    env,
    maxBuffer: 64 * 1024 * 1024,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  })
    .split('\n')
    .filter(Boolean);
}

function fail(error) {
  process.stdout.write(`${JSON.stringify({ error })}\n`);
  process.exit(1);
}

function insideWorkTree() {
  try {
    return gitLines(['rev-parse', '--is-inside-work-tree'])[0] === 'true';
  } catch (error) {
    if (error.code === 'ENOENT') fail('git is not available on PATH');
    return false;
  }
}

function hasHead() {
  try {
    gitLines(['rev-parse', '--verify', '--quiet', 'HEAD']);
    return true;
  } catch {
    return false;
  }
}

if (!insideWorkTree()) fail('not inside a git work tree; run from the repository root');
root = gitLines(['rev-parse', '--show-toplevel'])[0];
const born = hasHead();

function locations(directory) {
  // --no-renames reports a record moved into place as an addition.
  const cached = gitLines(['diff', '--cached', '--no-renames', '--name-status', '--', `${directory}/`])
    .map((line) => line.split('\t'));
  const added = cached.filter(([status]) => status === 'A').map(([, path]) => path);
  return {
    added,
    found: [
      ['in-head', born ? gitLines(['ls-tree', '--name-only', 'HEAD', `${directory}/`]) : []],
      ['staged', added],
      [
        'working-tree',
        existsSync(join(root, directory))
          ? readdirSync(join(root, directory)).map((name) => `${directory}/${name}`)
          : [],
      ],
      ['archived', born ? gitLines(['log', '--format=', '--name-only', '--', `${directory}/`]) : []],
    ],
    changedInIndex: new Map(cached.map(([status, path]) => [path, status])),
    changedOnDisk: new Set(gitLines(['diff', '--name-only', '--', `${directory}/`])),
  };
}

// An earlier version of an in-head record preceded the work; an uncommitted
// edit to it (an addendum) did not. A rename in the index reads as removal of
// the old path plus addition of the new one (--no-renames).
function inHead(known, path, prefix) {
  const status = known.changedInIndex.get(path);
  if (status === 'D') {
    const moved = known.added.find((candidate) => candidate.startsWith(prefix));
    if (moved) return { path: moved, state: 'in-head', pending: 'staged' };
    return { path, state: 'in-head', pending: 'staged-removal' };
  }
  if (status) return { path, state: 'in-head', pending: 'staged' };
  if (known.changedOnDisk.has(path)) return { path, state: 'in-head', pending: 'unstaged' };
  return { path, state: 'in-head' };
}

const cache = new Map();

function resolve(directory, number) {
  if (!cache.has(directory)) cache.set(directory, locations(directory));
  const prefix = `${directory}/${number}-`;
  const known = cache.get(directory);
  for (const [state, paths] of known.found) {
    const path = paths.find((candidate) => candidate.startsWith(prefix));
    if (path) return state === 'in-head' ? inHead(known, path, prefix) : { path, state };
  }
  return { path: null, state: 'not-found' };
}

function readMessage(source) {
  if (!source) return null;
  try {
    return readFileSync(source === '-' ? 0 : source, 'utf8');
  } catch {
    return null;
  }
}

const message = readMessage(process.argv[2]);
if (message === null) fail('usage: cited-records.mjs <message-file | -> (the draft commit message)');
const seen = new Set();
const records = [];
try {
  for (const match of message.matchAll(ID)) {
    const [id] = match;
    if (seen.has(id)) continue;
    seen.add(id);
    records.push({ id, ...resolve(directoryOf(match), match[5]) });
  }
} catch (error) {
  fail(`git read failed (${error.code ?? `exit ${error.status}`}); no report`);
}

process.stdout.write(`${JSON.stringify({ records }, null, 2)}\n`);
