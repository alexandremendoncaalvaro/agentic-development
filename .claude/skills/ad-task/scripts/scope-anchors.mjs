#!/usr/bin/env node
/**
 * Deterministic scope-anchor discovery for /ad-task (ADR-0067).
 *
 * Run from a consumer repository root:
 *
 *   node <skill-base-dir>/scripts/scope-anchors.mjs [repo-relative-path]
 *
 * With no path, prints the repository-local artifacts that may ground a new
 * task: root definition documents, product documents, feature specs, and
 * accepted ADRs. With a path, `verification.valid` says whether it is exactly
 * one of those anchors. The skill body keeps the judgment — which anchor best
 * defines the requested work — in text; discovery and validation are
 * deterministic and therefore scripted under ADR-0057.
 *
 * Content reads never fail silently. Accepted ADR discovery must read each ADR
 * status, so an existing but unreadable file is emitted in `unreadable` with
 * its repository-relative path and error code (GUIDELINES.md §2.2).
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ARTIFACT_FILE = /^\d{4}-.*\.md$/;
const ROOT_ANCHORS = ['AGENTS.md', 'ARCHITECTURE.md', 'CONTEXT.md', 'DESIGN.md', 'README.md'];

function isFile(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function gitRoot(cwd) {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function listDir(repoRoot, rel, unreadable) {
  try {
    return readdirSync(join(repoRoot, rel));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      unreadable.push({ path: rel, code: error.code ?? 'unknown' });
    }
    return [];
  }
}

function readContent(repoRoot, rel, unreadable) {
  try {
    return readFileSync(join(repoRoot, rel), 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      unreadable.push({ path: rel, code: error.code ?? 'unknown' });
    }
    return null;
  }
}

function parseStatus(body) {
  const match = body?.match(/^\*{0,2}Status:\*{0,2}[ \t]*([A-Za-z][A-Za-z-]*)/mi);
  return match ? match[1].toLowerCase() : null;
}

function artifactPaths(repoRoot, rel, unreadable, predicate = () => true) {
  return listDir(repoRoot, rel, unreadable)
    .filter((name) => ARTIFACT_FILE.test(name) && isFile(join(repoRoot, rel, name)))
    .filter(predicate)
    .map((name) => join(rel, name).replaceAll('\\', '/'));
}

function acceptedAdrPaths(repoRoot, unreadable) {
  return artifactPaths(repoRoot, join('doc', 'adr'), unreadable, (name) => {
    const rel = join('doc', 'adr', name).replaceAll('\\', '/');
    return parseStatus(readContent(repoRoot, rel, unreadable)) === 'accepted';
  });
}

function discoverAnchors(repoRoot, unreadable) {
  const root = ROOT_ANCHORS.filter((name) => isFile(join(repoRoot, name)));
  const product = listDir(repoRoot, join('doc', 'product'), unreadable)
    .filter((name) => name.endsWith('.md') && isFile(join(repoRoot, 'doc', 'product', name)))
    .map((name) => join('doc', 'product', name).replaceAll('\\', '/'));
  const specs = artifactPaths(repoRoot, join('doc', 'specs'), unreadable);
  const adrs = acceptedAdrPaths(repoRoot, unreadable);
  return [...root, ...product, ...specs, ...adrs].sort();
}

const cwd = process.cwd();
const root = gitRoot(cwd) ?? cwd;
const unreadable = [];
const anchors = discoverAnchors(root, unreadable);
const requestedPath = process.argv[2];
const verification = requestedPath === undefined
  ? null
  : { path: requestedPath, valid: anchors.includes(requestedPath) };

console.log(JSON.stringify({ cwd, gitRoot: gitRoot(cwd), anchors, verification, unreadable }, null, 2));
