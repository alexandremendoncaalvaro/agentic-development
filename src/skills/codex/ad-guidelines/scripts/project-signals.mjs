#!/usr/bin/env node
/**
 * Deterministic repository facts shared by four scan-first skills (ADR-0057,
 * P2.7). Run from a consumer repository root:
 *
 *   node <skill-base-dir>/scripts/project-signals.mjs AGENTS.md
 *
 * It reports only mode and stack markers. The
 * calling SKILL.md retains judgment: which files deserve a full read and what
 * the observed facts mean. Missing paths are normal; every other filesystem
 * read failure is retained in `unreadable`, never silently treated as absent.
 */
import { lstatSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const DOCUMENTS = new Set(['AGENTS.md', 'ARCHITECTURE.md']);
const STACK_MARKERS = [
  ['node', ['package.json']],
  ['python', ['pyproject.toml', 'setup.cfg', 'requirements.txt']],
  ['rust', ['Cargo.toml']],
  ['go', ['go.mod']],
  ['cpp', ['CMakeLists.txt', 'CMakePresets.json', 'vcpkg.json']],
  ['ruby', ['Gemfile']],
  ['java-kotlin', ['pom.xml', 'build.gradle', 'build.gradle.kts']],
  ['php', ['composer.json']],
  ['dart', ['pubspec.yaml']],
];
const TRIVIAL = new Set([
  '.git', 'node_modules', '.DS_Store', '.idea', '.vscode', '.gitignore',
  '.gitattributes', 'README.md', 'LICENSE', 'LICENSE.md',
]);

function code(error) {
  return error?.code ?? 'unknown';
}

function pushUnreadable(unreadable, path, error) {
  unreadable.push({ path, code: code(error) });
}

function isFile(repoRoot, path, unreadable) {
  try {
    return lstatSync(join(repoRoot, path)).isFile();
  } catch (error) {
    if (error.code !== 'ENOENT') pushUnreadable(unreadable, path, error);
    return false;
  }
}

function rootEntries(repoRoot, unreadable) {
  try {
    return readdirSync(repoRoot);
  } catch (error) {
    pushUnreadable(unreadable, '.', error);
    return [];
  }
}

function isTrivial(name) {
  return name.startsWith('.') || name.startsWith('.env') || name.startsWith('LICENSE') || TRIVIAL.has(name);
}

function detectMode(repoRoot, document, unreadable) {
  if (isFile(repoRoot, document, unreadable)) return 'audit';
  if (document === 'ARCHITECTURE.md') return 'bootstrap';
  return rootEntries(repoRoot, unreadable).every(isTrivial) ? 'greenfield' : 'brownfield';
}

function detectStacks(repoRoot, unreadable) {
  return STACK_MARKERS
    .filter(([, markers]) => markers.some((marker) => isFile(repoRoot, marker, unreadable)))
    .map(([stack]) => stack);
}

/**
 * @param {{repoRoot: string, document: 'AGENTS.md'|'ARCHITECTURE.md'}} options
 */
export function projectSignals({ repoRoot, document }) {
  if (!DOCUMENTS.has(document)) throw new Error('document must be AGENTS.md or ARCHITECTURE.md');
  const unreadable = [];
  return {
    document,
    mode: detectMode(repoRoot, document, unreadable),
    stacks: detectStacks(repoRoot, unreadable),
    unreadable,
  };
}

function main() {
  const [document = 'AGENTS.md'] = process.argv.slice(2);
  process.stdout.write(`${JSON.stringify(projectSignals({ repoRoot: process.cwd(), document }), null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
