import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

const MARKER_START = '<!-- agentic-global-constitution:start -->';
const MARKER_END = '<!-- agentic-global-constitution:end -->';

const GLOBAL_RULE_PATHS = {
  'claude-code': '.claude/CLAUDE.md',
  codex: '.codex/AGENTS.md',
};

export function globalKitPath(home = homedir()) {
  return join(home, '.agentic', 'kit');
}

/**
 * Point a host's global instruction file at the global kit constitution.
 *
 * The managed block deliberately owns only the import. The surrounding
 * instruction file remains wholly user-owned; a malformed or hand-edited
 * block is reported instead of being overwritten.
 */
export function configureGlobalConstitution({
  agent,
  home = homedir(),
  dryRun = false,
}) {
  const relativePath = GLOBAL_RULE_PATHS[agent];
  if (!relativePath) throw new Error(`unknown agent "${agent}"`);

  const path = join(home, relativePath);
  const workflowPath = join(globalKitPath(home), 'WORKFLOW.md');
  const block = `${MARKER_START}\n@${workflowPath}\n${MARKER_END}\n`;
  const pathForReport = relativePath;

  if (!existsSync(path)) {
    if (!dryRun) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, block);
    }
    return { type: 'created', path: pathForReport, agent };
  }

  const body = readFileSync(path, 'utf8');
  const start = body.indexOf(MARKER_START);
  const end = body.indexOf(MARKER_END);
  if (start === -1 && end === -1) {
    if (!dryRun) {
      writeFileSync(path, `${body.replace(/\s*$/, '')}\n\n${block}`);
    }
    return { type: 'updated', path: pathForReport, agent };
  }

  if (start === -1 || end === -1 || end < start) {
    return { type: 'skipped', path: pathForReport, agent };
  }

  const existing = body.slice(start, end + MARKER_END.length);
  if (existing === block.trimEnd()) {
    return { type: 'unchanged', path: pathForReport, agent };
  }

  return { type: 'skipped', path: pathForReport, agent };
}
