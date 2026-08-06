#!/usr/bin/env node
/**
 * Deterministic rules-layer resolution probe for ad-audit (ADR-0047 Decision 1,
 * shipped as a skill script per task-0031 — replaces the per-host inline shell
 * blocks). Run from the repo root under audit:
 *
 *   node <skill-base-dir>/scripts/resolve-rules.mjs
 *
 * Prints the three rule-set layers (ADR-0035/ADR-0043) — the machine store,
 * the project rules, and the repo binding docs (whose scope includes the ADR
 * directory) — so layer resolution is read from observed output, never from
 * memory. Node instead of shell so no POSIX shell is assumed; zero
 * dependencies. Listings are sorted in code-unit order with dotfiles ignored
 * — matching the replaced shell block's `ls` under the C locale, and
 * deliberately locale-independent so the same tree prints the same trail on
 * every machine. A layer path that exists but
 * is not a directory is reported absent, never crashed on — zero output is
 * the silent failure this probe exists to stop.
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const BINDING_DOCS = [
  'AGENTS.md',
  'ARCHITECTURE.md',
  'GUIDELINES.md',
  'CONTEXT.md',
  'CONTEXT-MAP.md',
];
const ADR_DIRS = ['doc/adr', 'docs/ADRs', 'docs/adr'];

function isDirectory(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function visibleEntries(dir) {
  return readdirSync(dir)
    .filter((name) => !name.startsWith('.'))
    .sort();
}

/**
 * Build the layer report. Exported so tests can exercise it in-process;
 * `main()` below owns the environment resolution and printing.
 *
 * @param {{machineStore: string, repoRoot: string}} paths
 * @returns {string} the report, one entry per line
 */
export function probeReport({ machineStore, repoRoot }) {
  const lines = [];
  if (isDirectory(machineStore)) {
    lines.push(`MACHINE-STORE: ${machineStore}`);
    lines.push(...visibleEntries(machineStore));
  } else {
    lines.push('MACHINE-STORE: absent');
  }
  const projectRules = join(repoRoot, '.agentic', 'rules');
  if (isDirectory(projectRules)) {
    lines.push('PROJECT: .agentic/rules');
    lines.push(...visibleEntries(projectRules));
  } else {
    lines.push('PROJECT: absent');
  }
  lines.push('BINDING DOCS:');
  lines.push(
    ...BINDING_DOCS.filter((doc) => existsSync(join(repoRoot, doc))).sort()
  );
  for (const dir of ADR_DIRS) {
    const abs = join(repoRoot, dir);
    if (isDirectory(abs)) {
      lines.push(`ADRS: ${dir} (${visibleEntries(abs).length} files)`);
    }
  }
  return lines.join('\n');
}

function main() {
  const machineStore =
    process.env.AGENTIC_RULES_DIR || join(homedir(), '.agentic', 'rules');
  console.log(probeReport({ machineStore, repoRoot: process.cwd() }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
