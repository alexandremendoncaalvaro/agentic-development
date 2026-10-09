#!/usr/bin/env node
/**
 * Session-lifecycle workflow-checkpoint hook for ad-hooks (ADR-0074). Wired as
 * a Claude Code `UserPromptSubmit` hook: plain-text stdout on exit 0 is added
 * to the model's context before it processes the prompt (verified against
 * https://code.claude.com/docs/en/hooks). The event has no matcher and fires
 * on every prompt, so the checkpoint never inspects the prompt; its text is fixed,
 * followed by the installed kit version when a state file names one (Task 0099).
 *
 * Skills and CLAUDE.md are advisory; this hook is the deterministic delivery of
 * the kit's pipeline (de-risk or sharpen, ground, TDD, review per slice, audit
 * per block, commit, handoff) at the moment it matters. The wording is
 * imperative on purpose: a measured field report found polite reminders were
 * ignored while an imperative instruction naming the skill was followed.
 *
 * Contract: exit 0 always. Never exit 2 (that blocks and erases the prompt);
 * never emit a JSON decision object. Empty, malformed, or non-object stdin is
 * silent. `AD_WORKFLOW_CHECKPOINT=0` silences the hook entirely.
 *
 * Zero dependencies, Node-only, byte-identical in both host trees, mirroring
 * the `handoff-nudge.mjs` precedent (ADR-0055).
 *
 * Manual smoke-test (stdin must be piped, or `readFileSync(0)` waits on a TTY):
 *   echo '{"hook_event_name":"UserPromptSubmit","prompt":"x"}' | node workflow-checkpoint.mjs
 */

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const CHECKPOINT = [
  'Workflow checkpoint (agentic kit). Trivial request (typo, one-liner, a question)? Skip this.',
  'Otherwise, in order:',
  '1. Open with a 3-line summary of what this task will do and a checklist roadmap (done / remaining). Confirm the rules were read; do not recite them.',
  '2. Unknowns or a fuzzy ask: /ad-derisk or /ad-grill-me.',
  '3. Before code: /ad-ground and its evidence record.',
  '4. Implement with /ad-tdd (/ad-tdg when the strategy is the unknown).',
  '5. After each slice: /ad-review. After each large block or before a PR: /ad-audit.',
  '6. Land with /ad-commit; /ad-pr and /ad-merge ask the owner once before the outward step.',
  '7. Ending, or context running low: /ad-handoff for a resume chip, or a fresh-session prompt where chips are unavailable.',
].join('\n');

/**
 * Kill switch: `AD_WORKFLOW_CHECKPOINT=0` (or `false`/`off`) silences the hook.
 * Any other value, including unset, keeps it on.
 */
export function isEnabled(env) {
  const raw = String(env.AD_WORKFLOW_CHECKPOINT ?? '')
    .trim()
    .toLowerCase();
  return !(raw === '0' || raw === 'false' || raw === 'off');
}

/**
 * Read all of stdin (fd 0) synchronously. Returns '' on any failure — a hook
 * that cannot read its input must degrade to silent, never break the session.
 */
function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

/**
 * True only for a parseable JSON object on stdin. Anything else (empty input,
 * malformed JSON, `null`, arrays, scalars) is not a hook event and yields
 * silence rather than a crash or a stray message.
 */
export function isHookEvent(raw) {
  return parseEvent(raw) !== null;
}

function parseEvent(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return null;
  try {
    const event = JSON.parse(text);
    return event !== null && typeof event === 'object' && !Array.isArray(event) ? event : null;
  } catch {
    return null;
  }
}

const STATE_DIRS = ['.claude', '.agents'];
// A state file in a cloned repository is untrusted: only a version-shaped
// value reaches the model's context.
const VERSION_SHAPE = /^[0-9A-Za-z.+-]{1,32}$/;

// What the first state file found under `root` says: a version, or why it
// names none. Null when no state file exists there. An unreadable file is
// reported, never treated as absent (GUIDELINES 2.2).
function recordedState(root) {
  for (const dir of STATE_DIRS) {
    let text;
    try {
      text = readFileSync(join(root, dir, 'agentic-state.json'), 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      return { problem: `state file unreadable: ${error.code ?? 'error'}` };
    }
    let state;
    try {
      state = JSON.parse(text);
    } catch {
      return { problem: 'state file is not valid JSON' };
    }
    return VERSION_SHAPE.test(state?.kitVersion)
      ? { version: state.kitVersion }
      : { problem: 'state file names no version' };
  }
  return null;
}

// The nearest project install at or above `cwd`, stopping below `home` so
// the user install is never read as a project one.
function projectState(cwd, home) {
  const stop = resolve(home);
  for (let dir = resolve(cwd); dir !== stop; dir = dirname(dir)) {
    const found = recordedState(dir);
    if (found) return found;
    if (dirname(dir) === dir) break;
  }
  return null;
}

/**
 * The installed kit this session runs (Task 0099): the nearest project install
 * at or above the event's `cwd` wins over the user install, as the installer
 * resolves them; read locally, never from the network. Each result carries its
 * scope and either the version or the problem that hides it. Null when no
 * state file exists.
 */
export function installedKit(event, home = homedir()) {
  const project = typeof event?.cwd === 'string' ? projectState(event.cwd, home) : null;
  if (project) return { ...project, scope: 'project' };
  const user = recordedState(home);
  return user ? { ...user, scope: 'user' } : null;
}

function kitLine(kit) {
  if (!kit) return '';
  return kit.version
    ? `\nInstalled agentic kit: ${kit.version} (${kit.scope} scope).`
    : `\nInstalled agentic kit: unknown (${kit.scope} scope; ${kit.problem}).`;
}

function main() {
  if (!isEnabled(process.env)) return;
  const event = parseEvent(readStdin());
  if (!event) return;
  const kit = installedKit(event, process.env.HOME || process.env.USERPROFILE || homedir());
  process.stdout.write(`${CHECKPOINT}${kitLine(kit)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
