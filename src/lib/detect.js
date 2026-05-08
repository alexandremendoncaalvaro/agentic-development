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
