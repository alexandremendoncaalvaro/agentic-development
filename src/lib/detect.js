import { existsSync, readdirSync } from 'node:fs';
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
 * config directories. It informs the interactive UI; init itself installs
 * both hosts by default.
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
