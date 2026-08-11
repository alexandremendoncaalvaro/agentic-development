#!/usr/bin/env node
/**
 * Deterministic repository scan for /ad-hooks (ADR-0057, P2.4). Run from a
 * consumer repository root:
 *
 *   node <skill-base-dir>/scripts/detect-hooks.mjs
 *
 * Prints one JSON object with low-freedom facts: stack markers, installed hook
 * runners, pre-push gate commands, CI workflow commands and matrices, plus
 * textual CI commands not found in pre-push. The SKILL.md body keeps the
 * judgment: choose among multiple runners, decide whether a wrapper provides
 * equivalent coverage, and obtain consent before writing a hook configuration.
 *
 * Zero dependencies, Node-only (no POSIX shell assumed — Windows CI matrix).
 * Missing files are normal existence facts. Per GUIDELINES.md §2.2, any other
 * content-read failure is recorded in `unreadable` as `{ path, code }` rather
 * than being swallowed.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const STACK_MARKERS = [
  ['node', 'package.json'],
  ['python', 'pyproject.toml'],
  ['go', 'go.mod'],
  ['rust', 'Cargo.toml'],
];

const CI_CONFIGS = [
  '.gitlab-ci.yml',
  '.circleci/config.yml',
  'azure-pipelines.yml',
  '.buildkite/pipeline.yml',
];

function isFile(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function isDir(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function listPath(path, reportedPath, unreadable) {
  try {
    return readdirSync(path).sort();
  } catch (error) {
    if (error.code !== 'ENOENT') {
      unreadable.push({ path: reportedPath, code: error.code ?? 'unknown' });
    }
    return [];
  }
}

function listDir(repoRoot, rel, unreadable) {
  return listPath(join(repoRoot, rel), rel, unreadable);
}

function tryReadPath(path, reportedPath, unreadable) {
  try {
    return readFileSync(path, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      unreadable.push({ path: reportedPath, code: error.code ?? 'unknown' });
    }
    return null;
  }
}

function readPath(path, reportedPath, unreadable) {
  return tryReadPath(path, reportedPath, unreadable) ?? '';
}

function readContent(repoRoot, rel, unreadable) {
  return readPath(join(repoRoot, rel), rel, unreadable);
}

function unique(values) {
  return [...new Set(values)];
}

function gateCommand(command) {
  return (
    /\b(test|lint|typecheck|build|check|format|verify|audit)\b/i.test(command) ||
    /(?:^|\s)(?:pytest|vitest|jest|mocha|ava)(?:\s|$)/i.test(command)
  );
}

function stripYamlValue(value) {
  return value.trim().replace(/^['"]|['"]$/g, '');
}

function extractCommands(content) {
  const commands = [];
  const lines = content.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^(\s*)(?:-\s*)?(?:run|script|entry):\s*(.*?)\s*$/);
    if (!match) continue;
    const indent = match[1].length;
    const value = stripYamlValue(match[2]);
    if (value && value !== '|' && value !== '>') {
      if (gateCommand(value)) commands.push(value);
      continue;
    }
    for (index += 1; index < lines.length; index += 1) {
      const line = lines[index];
      if (line.trim() === '') continue;
      const childIndent = line.match(/^\s*/)[0].length;
      if (childIndent <= indent) {
        index -= 1;
        break;
      }
      const child = stripYamlValue(line.trim().replace(/^-\s*/, ''));
      if (gateCommand(child)) commands.push(child);
    }
  }
  return unique(commands);
}

function extractShellCommands(content) {
  const commands = [];
  for (const line of content.split('\n')) {
    const raw = line.trim();
    if (!raw || /^(?:#!|#|\.\s|source\s|set\s|if\s|then$|fi$|for\s|do$|done$|case\s|esac$|export\s)/.test(raw)) {
      continue;
    }
    const command = raw.replace(/^exec\s+/, '').replace(/\s+#.*$/, '');
    for (const part of command.split(/\s*(?:&&|\|\|)\s*/)) {
      if (gateCommand(part)) commands.push(part);
    }
  }
  return unique(commands);
}

function extractPreCommitPrePushCommands(content) {
  const lines = content.split('\n');
  const starts = lines
    .map((line, index) => (/^\s*-\s+id:\s*/.test(line) ? index : -1))
    .filter((index) => index !== -1);
  const commands = [];
  for (let index = 0; index < starts.length; index += 1) {
    const block = lines.slice(starts[index], starts[index + 1]).join('\n');
    if (!/^\s*stages:\s*(?:\[[^\]]*\bpre-push\b[^\]]*\]|['"]?pre-push\b)/m.test(block)) {
      continue;
    }
    const entry = block.match(/^\s*entry:\s*(.+?)\s*$/m)?.[1];
    if (entry) {
      const command = stripYamlValue(entry);
      if (gateCommand(command)) commands.push(command);
    }
  }
  return unique(commands);
}

function prePushBlock(content) {
  const lines = content.split('\n');
  const start = lines.findIndex((line) => /^pre-push:\s*$/.test(line));
  if (start === -1) return '';
  const block = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^\S/.test(lines[index])) break;
    block.push(lines[index]);
  }
  return block.join('\n');
}

function detectStacks(repoRoot) {
  return STACK_MARKERS.filter(([, marker]) => isFile(join(repoRoot, marker))).map(([name]) => name);
}

function nativeHookDir(repoRoot) {
  try {
    const resolved = execFileSync('git', ['rev-parse', '--git-path', 'hooks'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return isAbsolute(resolved) ? resolved : join(repoRoot, resolved);
  } catch {
    // Git is optional: retain the direct path for non-repos and Git-less hosts.
    return join(repoRoot, '.git', 'hooks');
  }
}

function isRunnerManagedHook(content, runners) {
  return (
    (runners.includes('lefthook') && /\blefthook\s+run\b/i.test(content)) ||
    (runners.includes('husky') && /(?:_\/husky\.sh|\bhusky\b)/i.test(content)) ||
    (runners.includes('pre-commit') && /\bpre-commit\b/i.test(content))
  );
}

function detectRunners(repoRoot, unreadable) {
  const runners = [];
  if (isDir(join(repoRoot, '.husky'))) runners.push('husky');
  if (isFile(join(repoRoot, 'lefthook.yml')) || isFile(join(repoRoot, '.lefthook.yml'))) {
    runners.push('lefthook');
  }
  if (isFile(join(repoRoot, '.pre-commit-config.yaml'))) runners.push('pre-commit');
  const hookDir = nativeHookDir(repoRoot);
  const nativeHook = isDir(hookDir) && listPath(hookDir, '.git/hooks', unreadable).some((name) => {
    if (name.endsWith('.sample') || !isFile(join(hookDir, name))) return false;
    const content = tryReadPath(join(hookDir, name), `.git/hooks/${name}`, unreadable);
    return content !== null && !isRunnerManagedHook(content, runners);
  });
  if (nativeHook) {
    runners.push('native');
  }
  return runners;
}

function detectPrePush(repoRoot, runners, unreadable) {
  const files = [];
  const commands = [];
  for (const rel of ['lefthook.yml', '.lefthook.yml']) {
    if (!isFile(join(repoRoot, rel))) continue;
    const body = readContent(repoRoot, rel, unreadable);
    if (!body) continue;
    files.push(rel);
    commands.push(...extractCommands(prePushBlock(body)));
  }
  if (runners.includes('husky') && isFile(join(repoRoot, '.husky', 'pre-push'))) {
    const rel = '.husky/pre-push';
    files.push(rel);
    commands.push(...extractShellCommands(readContent(repoRoot, rel, unreadable)));
  }
  const hookDir = nativeHookDir(repoRoot);
  if (runners.includes('native') && isFile(join(hookDir, 'pre-push'))) {
    const rel = '.git/hooks/pre-push';
    files.push(rel);
    commands.push(...extractShellCommands(readPath(join(hookDir, 'pre-push'), rel, unreadable)));
  }
  if (runners.includes('pre-commit')) {
    const rel = '.pre-commit-config.yaml';
    const body = readContent(repoRoot, rel, unreadable);
    const prePushCommands = extractPreCommitPrePushCommands(body);
    if (prePushCommands.length > 0) {
      files.push(rel);
      commands.push(...prePushCommands);
    }
  }
  return { files, commands: unique(commands) };
}

function ciFiles(repoRoot, unreadable) {
  const githubWorkflows = listDir(repoRoot, '.github/workflows', unreadable)
    .filter((name) => /\.ya?ml$/.test(name))
    .map((name) => join('.github', 'workflows', name));
  return [...githubWorkflows, ...CI_CONFIGS.filter((rel) => isFile(join(repoRoot, rel)))];
}

function extractMatrices(content) {
  const matrices = [];
  const lines = content.split('\n');
  let matrixIndent = null;
  for (const line of lines) {
    const matrix = line.match(/^(\s*)matrix:\s*$/);
    if (matrix) {
      matrixIndent = matrix[1].length;
      continue;
    }
    if (matrixIndent === null) continue;
    const indent = line.match(/^\s*/)[0].length;
    if (line.trim() && indent <= matrixIndent) {
      matrixIndent = null;
      continue;
    }
    const item = line.match(/^\s*([A-Za-z][A-Za-z0-9_-]*):\s*\[(.+)]\s*$/);
    if (!item) continue;
    const values = item[2]
      .split(',')
      .map((value) => stripYamlValue(value))
      .filter(Boolean);
    matrices.push({ key: item[1], values });
  }
  return matrices;
}

function detectCi(repoRoot, unreadable) {
  const files = ciFiles(repoRoot, unreadable);
  const commands = [];
  const matrices = [];
  for (const rel of files) {
    const body = readContent(repoRoot, rel, unreadable);
    commands.push(...extractCommands(body));
    matrices.push(...extractMatrices(body));
  }
  return { files, commands: unique(commands), matrices };
}

function dedupeUnreadable(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    const key = `${entry.path}\u0000${entry.code}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function detectHooks(repoRoot) {
  const unreadable = [];
  const stacks = detectStacks(repoRoot);
  const runners = detectRunners(repoRoot, unreadable);
  const prePush = detectPrePush(repoRoot, runners, unreadable);
  const ci = detectCi(repoRoot, unreadable);
  return {
    stacks,
    runners,
    prePush,
    ci,
    drift: {
      ciOnlyCommands: ci.commands.filter((command) => !prePush.commands.includes(command)),
    },
    unreadable: dedupeUnreadable(unreadable),
  };
}

function main() {
  process.stdout.write(`${JSON.stringify(detectHooks(process.cwd()), null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
