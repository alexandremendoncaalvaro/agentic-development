#!/usr/bin/env node
/**
 * Session-lifecycle handoff-chip reminder for ad-hooks (ADR-0087). Wired as a
 * `PostToolUse` hook on file writes on both hosts. When the written path is a
 * Markdown file directly under an `agentic-handoffs` directory, it prints
 * `hookSpecificOutput.additionalContext` on exit 0, which both hosts document as
 * model context (GROUND-0034 E2; observed on Claude Code), telling the model to offer the resume
 * chip, or the path and a fresh-session prompt where no chip tool exists.
 *
 * It keys on the write, not on `/ad-handoff`, because the measured chip miss
 * is a handoff written without the skill (RESEARCH-0033 E1). It is a reminder,
 * not a gate: no validator, no evidence file, no exit 2, no decision object.
 *
 * Contract: exit 0 always. Empty, malformed, or non-object stdin, an event
 * without a handoff path, and `AD_HANDOFF_CHIP=0` are silent. The written
 * path is recovered with the artifact gate's own parser, so Claude Code
 * `tool_input.file_path` and Codex `apply_patch` headers are read one way.
 *
 * Zero dependencies, Node-only, byte-identical in both host trees.
 *
 * Manual smoke-test (stdin must be piped, or `readFileSync(0)` waits on a TTY):
 *   echo '{"tool_input":{"file_path":"/tmp/agentic-handoffs/x.md"}}' | node handoff-chip.mjs
 */

import { readFileSync } from 'node:fs';
import { basename, dirname, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { recoverPaths } from './artifact-gate.mjs';

export const HANDOFF_DIR = 'agentic-handoffs';

/**
 * Kill switch: `AD_HANDOFF_CHIP=0` (or `false`/`off`) silences the reminder.
 * Any other value, including unset, keeps it on.
 */
export function isEnabled(env) {
  const raw = String(env.AD_HANDOFF_CHIP ?? '')
    .trim()
    .toLowerCase();
  return !(raw === '0' || raw === 'false' || raw === 'off');
}

/** The parsed event, or null for anything that is not a JSON object. */
export function parseEvent(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return null;
  try {
    const event = JSON.parse(text);
    return event !== null && typeof event === 'object' && !Array.isArray(event) ? event : null;
  } catch {
    return null;
  }
}

/** The first written path that is a handoff file, or null. */
export function handoffPath(event, cwd) {
  return (
    recoverPaths(event, cwd).find(
      (path) => basename(dirname(path)) === HANDOFF_DIR && extname(path).toLowerCase() === '.md'
    ) ?? null
  );
}

export function reminder(path) {
  return (
    `A session handoff was written to ${path}. If this host has a background-task chip tool ` +
    '(for example spawn_task in the Claude Code desktop app), offer the handoff as a resume chip, ' +
    'once, in your reply (when /ad-handoff is running, its report step is that offer): its prompt ' +
    `must stand alone and tell the next session to read ${path} first and follow ` +
    'its Resume protocol. Without such a tool, give the user the path and a fresh-session prompt ' +
    'instead. If this handoff did not come from /ad-handoff, check it against the template ' +
    'of that skill first.'
  );
}

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function main() {
  if (!isEnabled(process.env)) return;
  const event = parseEvent(readStdin());
  if (!event) return;
  const cwd = typeof event.cwd === 'string' && event.cwd ? event.cwd : process.cwd();
  const path = handoffPath(event, cwd);
  if (!path) return;
  const output = {
    hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: reminder(path) },
  };
  process.stdout.write(`${JSON.stringify(output)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
