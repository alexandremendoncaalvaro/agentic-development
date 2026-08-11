#!/usr/bin/env node
/**
 * Resolve global rules for the Codex host (ADR-0057, P2.8).
 * Run from any consumer repository:
 *
 *   node <skill-base-dir>/scripts/resolve-global-rules.mjs
 *
 * The Codex location wins, then the remaining canonical paths are reported as
 * fallbacks. This script is intentionally host-divergent from the Claude Code
 * copy: each host must prefer its own instruction file. It probes that a
 * source is readable but emits no content and performs no write; the SKILL.md
 * body extracts topics and makes all judgment calls.
 */
import { lstatSync, readFileSync, readlinkSync, realpathSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const HOST = 'codex';
const CANDIDATES = [
  '.codex/AGENTS.md',
  '.codex/instructions.md',
  '.claude/CLAUDE.md',
  '.claude/AGENTS.md',
];

function errorCode(error) {
  return error?.code ?? 'unknown';
}

function unreadableSource(path, unreadable, error, linkTarget = null, resolvedPath = null) {
  unreadable.push({ path, code: errorCode(error) });
  return { path, state: 'unreadable', linkTarget, resolvedPath };
}

function readableSource(path, state, linkTarget, resolvedPath, unreadable) {
  try {
    readFileSync(resolvedPath, 'utf8');
  } catch (error) {
    return unreadableSource(path, unreadable, error, linkTarget, resolvedPath);
  }
  return { path, state, linkTarget, resolvedPath };
}

function resolvedFile(path, linkTarget, unreadable) {
  let resolvedPath;
  try {
    resolvedPath = realpathSync(path);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { path, state: 'broken-symlink', linkTarget, resolvedPath: null };
    }
    return unreadableSource(path, unreadable, error);
  }
  try {
    if (!statSync(resolvedPath).isFile()) {
      return { path, state: 'not-file', linkTarget, resolvedPath };
    }
  } catch (error) {
    return unreadableSource(path, unreadable, error);
  }
  return readableSource(path, 'symlink', linkTarget, resolvedPath, unreadable);
}

function resolveCandidate(home, relativePath, unreadable) {
  const path = join(home, relativePath);
  let entry;
  try {
    entry = lstatSync(path);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    return unreadableSource(path, unreadable, error);
  }
  if (entry.isSymbolicLink()) {
    let linkTarget;
    try {
      linkTarget = readlinkSync(path);
    } catch (error) {
      return unreadableSource(path, unreadable, error);
    }
    return resolvedFile(path, linkTarget, unreadable);
  }
  return entry.isFile()
    ? readableSource(path, 'file', null, path, unreadable)
    : { path, state: 'not-file', linkTarget: null, resolvedPath: path };
}

/**
 * @param {{home?: string}} options
 */
export function resolveGlobalRules({ home = homedir() } = {}) {
  const unreadable = [];
  const sources = CANDIDATES
    .map((candidate) => resolveCandidate(home, candidate, unreadable))
    .filter(Boolean);
  const primary = sources.find((source) => source.state === 'file' || source.state === 'symlink') ?? null;
  return { host: HOST, primary, sources, unreadable };
}

function main() {
  process.stdout.write(`${JSON.stringify(resolveGlobalRules(), null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
