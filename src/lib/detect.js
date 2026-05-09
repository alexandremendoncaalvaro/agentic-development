import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const TRIVIAL_ENTRIES = new Set([
  '.git',
  'node_modules',
  '.DS_Store',
  '.idea',
  '.vscode',
  '.gitignore',
  '.gitattributes',
  '.env',
  '.env.local',
  '.env.example',
  'README.md',
  'LICENSE',
  'LICENSE.md',
]);

const FRONTEND_DEPS = new Set([
  'react',
  'vue',
  'svelte',
  'solid-js',
  'preact',
  '@angular/core',
  'next',
  'nuxt',
  '@sveltejs/kit',
]);

const FRONTEND_CONFIG_FILES = [
  'tailwind.config.js',
  'tailwind.config.ts',
  'tailwind.config.cjs',
  'tailwind.config.mjs',
  'tokens.json',
];

const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  'out',
  'coverage',
  '.next',
  '.nuxt',
  '.svelte-kit',
  '.cache',
  '.parcel-cache',
]);

/**
 * Detect the project's current state to pick a default mode for `init`.
 * - audit: AGENTS.md already exists; compare against the codebase
 * - greenfield: only trivial files (no real code yet)
 * - brownfield: has code but no AGENTS.md
 */
export function detectMode(dir) {
  if (existsSync(join(dir, 'AGENTS.md'))) {
    return 'audit';
  }

  const meaningful = readdirSync(dir).filter(
    (name) => !TRIVIAL_ENTRIES.has(name) && !name.startsWith('.')
  );

  return meaningful.length === 0 ? 'greenfield' : 'brownfield';
}

/**
 * Detect which agents the project already uses, by looking for native
 * config directories. Informs the install default; the user can always
 * override.
 *
 * - `.claude/` → Claude Code
 * - `.agents/` → Codex (cc-sdd convention, see ADR-0001)
 *
 * Returns an array in deterministic order: claude-code first, then codex.
 */
export function detectAgents(dir) {
  const agents = [];
  if (existsSync(join(dir, '.claude'))) agents.push('claude-code');
  if (existsSync(join(dir, '.agents'))) agents.push('codex');
  return agents;
}

function hasFrontendDep(dir) {
  const pkgPath = join(dir, 'package.json');
  if (!existsSync(pkgPath)) return false;
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  } catch {
    return false;
  }
  const allDeps = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
    ...(pkg.peerDependencies || {}),
  };
  return Object.keys(allDeps).some((name) => FRONTEND_DEPS.has(name));
}

function hasFrontendConfig(dir) {
  return FRONTEND_CONFIG_FILES.some((name) => existsSync(join(dir, name)));
}

function hasJsxFiles(dir, depth = 3) {
  if (depth < 0) return false;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return false;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
      if (hasJsxFiles(join(dir, entry.name), depth - 1)) return true;
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx')) {
      return true;
    }
  }
  return false;
}

/**
 * Detect project features that drive conditional skill defaults.
 * Cheap signals first; the recursive jsx scan is bounded (depth 3,
 * skips node_modules / build dirs / dotfiles) so it stays fast on
 * realistic project trees.
 *
 * Returns:
 *   - frontend: package.json carries React/Vue/Svelte/Solid/Preact/Angular/Next/Nuxt/SvelteKit,
 *               OR tailwind.config.* / tokens.json present, OR a *.tsx / *.jsx file is reachable.
 *   - hasClaudeCode: `.claude/` exists.
 *   - hasCodex: `.agents/` or `.openai/` exists.
 */
export function detectFeatures(dir) {
  return {
    frontend:
      hasFrontendDep(dir) || hasFrontendConfig(dir) || hasJsxFiles(dir),
    hasClaudeCode: existsSync(join(dir, '.claude')),
    hasCodex:
      existsSync(join(dir, '.agents')) || existsSync(join(dir, '.openai')),
  };
}
