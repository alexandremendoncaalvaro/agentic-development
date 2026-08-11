#!/usr/bin/env node
/**
 * Session-lifecycle handoff-nudge hook for ad-hooks (ADR-0055). Wired as a
 * Claude Code `Stop` hook — the event that fires when Claude finishes a turn
 * and is the only session-lifecycle event that can influence the next turn.
 * (`PreCompact` was rejected: per the official hooks contract it can only
 * allow or block compaction, never inject a message.)
 *
 * On every `Stop` the hook reads the event JSON from stdin, estimates how full
 * the context is from the transcript file's size on disk, and — once per
 * session, only above a threshold — emits a `systemMessage` suggesting the
 * user run `/ad-handoff` before context is compacted or lost. It NEVER blocks
 * or continues the turn: `systemMessage` on exit 0 with no `decision` field
 * lets the session stop normally, so the nudge cannot loop (verified against
 * https://code.claude.com/docs/en/hooks.md). Below threshold, or already fired
 * this session → silent exit 0, no output, so it never nags every turn.
 *
 * Zero dependencies, Node-only (no POSIX shell assumed — Windows CI matrix),
 * mirroring the ad-audit `scripts/resolve-rules.mjs` precedent.
 *
 * Manual smoke-tests must pipe stdin (e.g. `echo '{…}' | node handoff-nudge.mjs`):
 * stdin is read with a blocking `readFileSync(0, …)`, so run bare in an
 * interactive terminal it hangs waiting on fd 0.
 *
 * Context fullness is estimated from the transcript file's byte size via
 * `statSync`. This is a deliberate, robust HEURISTIC — not a token count: the
 * transcript JSON-Lines schema is undocumented and app-versioned, so parsing
 * it for exact token accounting would be fragile, while the on-disk size is a
 * stable, cross-platform, schema-proof proxy. It is cumulative (the transcript
 * appends across compactions and does not reset), which is fine here: a long,
 * multi-compaction session is exactly when a structured handoff earns its
 * keep. The once-per-session guard means an imperfect threshold only shifts
 * the single nudge slightly earlier or later, never makes it spammy.
 *
 * The default threshold (750000 bytes ≈ 0.72 MB) was chosen from measurement,
 * not guesswork: across 2129 real transcripts on the author's machine the
 * median session is ~0.19 MB, p90 ~0.55 MB, and p95 ~0.88 MB, so the default
 * sits at ≈p93 — it stays silent on routine sessions and fires only on the long
 * tail that a handoff actually helps. It also roughly corresponds to a full
 * ~200K-token context window's worth of JSON-Lines, so it tends to fire as a
 * session nears its first compaction. Override with
 * AD_HANDOFF_NUDGE_THRESHOLD_BYTES to recalibrate against your own measured
 * sessions.
 *
 * Env knobs (both optional):
 *   AD_HANDOFF_NUDGE_THRESHOLD_BYTES  integer byte threshold (default 750000)
 *   AD_HANDOFF_NUDGE_STATE_DIR        dir for the once-per-session flag files
 *                                     (default: the OS temp dir)
 */

import { existsSync, mkdirSync, statSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const DEFAULT_THRESHOLD_BYTES = 750000;

/**
 * Resolve the byte threshold from the environment, falling back to the
 * measured default. A missing, non-numeric, or non-positive override is
 * ignored rather than obeyed — a broken knob must not silence the nudge
 * forever or fire it every turn.
 */
export function resolveThreshold(env) {
  const raw = env.AD_HANDOFF_NUDGE_THRESHOLD_BYTES;
  if (raw === undefined || raw === '') return DEFAULT_THRESHOLD_BYTES;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_THRESHOLD_BYTES;
}

/**
 * The once-per-session flag path. Keyed on session_id so parallel sessions do
 * not share a flag. The id is sanitized to a safe filename fragment; a missing
 * id degrades to a shared `unknown` flag rather than crashing.
 */
export function flagPathFor(sessionId, stateDir) {
  const safe = String(sessionId || 'unknown').replace(/[^A-Za-z0-9._-]/g, '_');
  return join(stateDir, `ad-handoff-nudge-${safe}.flag`);
}

function formatMB(bytes) {
  return (bytes / 1_000_000).toFixed(2);
}

export function buildMessage(sizeBytes, thresholdBytes) {
  return (
    `Context is running low: this session's transcript is ~${formatMB(sizeBytes)} MB, ` +
    `past the ${formatMB(thresholdBytes)} MB handoff-nudge threshold. ` +
    'Run /ad-handoff to save a resumable handoff (and, on chip-capable hosts, offer the one-click ' +
    'resume chip) before context is compacted or lost. This nudge fires once per session; ' +
    'set AD_HANDOFF_NUDGE_THRESHOLD_BYTES to change when it triggers.'
  );
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

function main() {
  const raw = readStdin().trim();
  if (!raw) return; // no input → silent

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return; // unparseable input → silent, never disrupt the session
  }

  // Parseable but non-object stdin (e.g. `null`, `true`, `42`, `"str"`, `[]`)
  // parses without throwing, so the catch above never fires. Guard before any
  // property access: a non-plain-object degrades to silent exit 0, honoring the
  // "always degrade silent, never crash the session" contract.
  if (event === null || typeof event !== 'object' || Array.isArray(event)) return;

  // Re-entrancy guard: if a Stop hook is already active in this cycle, do
  // nothing. `systemMessage` alone does not continue the turn, so this hook
  // cannot itself set the flag — but honoring it is free insurance against
  // ever looping if the mechanism changes.
  if (event.stop_hook_active === true) return;

  const transcriptPath = event.transcript_path;
  if (!transcriptPath) return;

  let sizeBytes;
  try {
    const st = statSync(transcriptPath);
    if (!st.isFile()) return;
    sizeBytes = st.size;
  } catch {
    return; // transcript not readable yet → silent
  }

  const threshold = resolveThreshold(process.env);
  if (sizeBytes < threshold) return; // under threshold → silent

  const stateDir = process.env.AD_HANDOFF_NUDGE_STATE_DIR || tmpdir();
  const flag = flagPathFor(event.session_id, stateDir);
  if (existsSync(flag)) return; // already nudged this session → silent

  // Best-effort flag write. If it fails, still nudge this turn (better one
  // extra nudge than a crash); the guard resumes as soon as the write works.
  try {
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(flag, `${new Date().toISOString()}\n`);
  } catch {
    /* ignore — nudge anyway */
  }

  process.stdout.write(
    `${JSON.stringify({ systemMessage: buildMessage(sizeBytes, threshold) })}\n`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
