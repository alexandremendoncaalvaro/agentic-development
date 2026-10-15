import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { KIT_ROOT } from './install.js';

const MARKER_START = '<!-- agentic-global-constitution:start -->';
const MARKER_END = '<!-- agentic-global-constitution:end -->';
const DIGEST_LINE = /^<!-- agentic-global-constitution:digest ([0-9a-f]{64}) -->\n/;

const GLOBAL_RULE_PATHS = {
  'claude-code': '.claude/CLAUDE.md',
  codex: '.codex/AGENTS.md',
};

export function globalKitPath(home = homedir()) {
  return join(home, '.agentic', 'kit');
}

// The always-loaded part of the Constitution: its TL;DR section, up to the
// first numbered section (ADR-0092).
function constitutionSummary(kitRoot) {
  const text = readFileSync(join(kitRoot, 'WORKFLOW.md'), 'utf8');
  const start = text.indexOf('## TL;DR');
  if (start === -1) throw new Error('WORKFLOW.md has no "## TL;DR" section');
  const end = text.indexOf('\n## ', start + 1);
  return text.slice(start, end === -1 ? undefined : end).trim();
}

const digestOf = (content) => createHash('sha256').update(content).digest('hex');

function managedBlock(summary, workflowPath) {
  const content = `${summary}\n\nFull text, read on demand when a section is cited: ${workflowPath}\n`;
  return `${MARKER_START}\n<!-- agentic-global-constitution:digest ${digestOf(content)} -->\n${content}${MARKER_END}\n`;
}

// A block the installer may replace: the earlier import-only form, or a
// summary block whose content still matches its own digest.
function isUnedited(inner, workflowPath) {
  if (inner === `@${workflowPath}\n`) return true;
  const match = DIGEST_LINE.exec(inner);
  return Boolean(match) && digestOf(inner.slice(match[0].length)) === match[1];
}

/**
 * Write the Constitution's summary into a host's global instruction file.
 *
 * The managed block owns only the text between its markers; the surrounding
 * file remains wholly user-owned. A malformed or hand-edited block is
 * reported instead of being overwritten.
 */
export function configureGlobalConstitution({
  agent,
  home = homedir(),
  dryRun = false,
  kitRoot = KIT_ROOT,
}) {
  const relativePath = GLOBAL_RULE_PATHS[agent];
  if (!relativePath) throw new Error(`unknown agent "${agent}"`);

  const path = join(home, relativePath);
  const workflowPath = join(globalKitPath(home), 'WORKFLOW.md');
  const block = managedBlock(constitutionSummary(kitRoot), workflowPath);
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

  // An editor or git autocrlf may have saved the block with CRLF endings.
  const inner = body
    .slice(start + MARKER_START.length, end)
    .replace(/\r\n/g, '\n')
    .replace(/^\n/, '');
  if (!isUnedited(inner, workflowPath)) {
    return { type: 'skipped', path: pathForReport, agent };
  }

  if (!dryRun) {
    writeFileSync(
      path,
      `${body.slice(0, start)}${block.trimEnd()}${body.slice(end + MARKER_END.length)}`
    );
  }
  return { type: 'updated', path: pathForReport, agent };
}
