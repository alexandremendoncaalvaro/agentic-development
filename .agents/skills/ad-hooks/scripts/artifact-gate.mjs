#!/usr/bin/env node
/**
 * ad-hooks session-lifecycle tier — artifact-validator gate (ADR-0083, Spec 0008).
 *
 * A `PostToolUse` command hook for the write tools on Claude Code and Codex.
 * After a tool wrote a governed artifact, the gate runs the validator that
 * owns that artifact kind and, when the validator fails, shows its message to
 * the model by exiting 2 with the text on stderr; both hosts document that
 * exit as "shows stderr to the model, the tool already ran" (GROUND-0027 E1).
 * The gate never blocks, never prints a decision object, and never keeps a
 * turn alive: it is feedback, not enforcement.
 *
 * Contract:
 *   - stdin: the host's PostToolUse event JSON. Empty, malformed, or
 *     non-object input is silent (exit 0); a hook that cannot read its input
 *     must degrade to silence, never break the session.
 *   - Path recovery: Claude Code sends `tool_input.file_path` (absolute);
 *     Codex sends the patch text in `tool_input.command` under
 *     `tool_name: "apply_patch"`, whose `*** Add File:` / `*** Update File:`
 *     / `*** Move to:` headers name repository-relative paths (GROUND-0027
 *     E2, E3). An event with no recoverable path is silent.
 *   - Owner map: a `doc/research/` file is routed by its first heading —
 *     `GROUND-` to ad-ground's validate-record.mjs, `PRISM-` to ad-prism's
 *     validate-plan.mjs; anything else, including a `RESEARCH-` study, is
 *     unowned and silent (GROUND-0027 E4).
 *   - Terminal states: `validator-failed` and `runtime-unavailable` exit 2
 *     with stderr; `validator-passed` exits 0 silently; an unowned or
 *     malformed event exits 0 silently and leaves no evidence.
 *   - Evidence: one JSON line per governed firing, appended to
 *     `<evidence dir>/<session_id>.jsonl`. The directory defaults to the OS
 *     temporary directory and is never inside the working tree unless
 *     `AD_ARTIFACT_GATE_EVIDENCE_DIR` points there (ADR-0083 decision 4).
 *   - `AD_ARTIFACT_GATE=0` silences the gate entirely.
 *   - `AD_ARTIFACT_GATE_SKILLS_ROOT` overrides where sibling skills are
 *     found; the default is the directory two levels above this script,
 *     which is the skills root in both the source tree and an install.
 *
 * Zero dependencies; byte-identical in both host trees (task-0031).
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, rmdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const GATE_ID = 'artifact-gate';

const OWNERS = [
  {
    id: 'ground-record',
    heading: /^# GROUND-\d{4}: /m,
    validator: join('ad-ground', 'scripts', 'validate-record.mjs'),
  },
  {
    id: 'prism-plan',
    heading: /^# PRISM-\d{4}: /m,
    validator: join('ad-prism', 'scripts', 'validate-plan.mjs'),
  },
];

const GOVERNED_DIR = join('doc', 'research');
const PATCH_HEADER = /^\*\*\* (Add File|Update File|Move to): (.+)$/;

/** Sibling-skill root: `<root>/ad-hooks/scripts/artifact-gate.mjs` → `<root>`. */
export function skillsRoot(env, scriptPath) {
  const override = env.AD_ARTIFACT_GATE_SKILLS_ROOT;
  if (override) return resolve(override);
  return resolve(dirname(scriptPath), '..', '..');
}

/**
 * Recover the written paths from the host event. Claude Code names the file
 * directly; Codex ships a patch whose headers name relative paths. A path is
 * returned absolute; the caller decides whether it is inside the repository.
 */
export function recoverPaths(event, cwd) {
  const input = event.tool_input;
  if (input === null || typeof input !== 'object') return [];
  const direct = input.file_path;
  if (typeof direct === 'string' && direct) return [resolve(cwd, direct)];
  if (typeof input.command !== 'string') return [];
  const paths = [];
  for (const line of input.command.split('\n')) {
    const match = PATCH_HEADER.exec(line);
    if (!match) continue;
    const target = resolve(cwd, match[2].trim());
    if (match[1] === 'Move to' && paths.length) paths[paths.length - 1] = target;
    else paths.push(target);
  }
  return paths;
}

/**
 * The owner of a governed file, or null when no validator owns it. A governed
 * file that is gone (ENOENT) is silent: there is nothing left to validate. A
 * governed file that exists but cannot be read is not "no owner"; it comes
 * back marked `unreadable` so the gate reports a runtime failure instead of a
 * silent pass (GUIDELINES: never swallow a content-read failure).
 */
export function resolveOwner(absolutePath, cwd) {
  const rel = relative(cwd, absolutePath);
  if (escapesRepository(rel)) return null;
  if (!rel.startsWith(`${GOVERNED_DIR}${sep}`) || !rel.endsWith('.md')) return null;
  const path = rel.split(sep).join('/');
  let head;
  try {
    if (!statSync(absolutePath).isFile()) return null;
    head = readFileSync(absolutePath, 'utf8').slice(0, 4096);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null;
    return { id: 'unknown', validator: null, path, unreadable: error.code ?? 'unknown' };
  }
  const owner = OWNERS.find((candidate) => candidate.heading.test(head));
  return owner ? { ...owner, path } : null;
}

/** Run the owning validator; classify its outcome without interpreting it. */
export function runValidator({ owner, root, cwd }) {
  if (owner.unreadable) {
    return {
      state: 'runtime-unavailable',
      output: `cannot read ${owner.path}: ${owner.unreadable}`,
      reproduction: `node -e "require('node:fs').readFileSync(process.argv[1])" ${owner.path}`,
    };
  }
  const validator = join(root, owner.validator);
  const reproduction = `node ${relativeOrAbsolute(validator, cwd)} ${owner.path}`;
  if (!existsSync(validator)) {
    return {
      state: 'runtime-unavailable',
      output: `validator not found at ${validator}`,
      reproduction,
    };
  }
  const run = spawnSync(process.execPath, [validator, owner.path], { cwd, encoding: 'utf8' });
  if (run.error) {
    return { state: 'runtime-unavailable', output: String(run.error.message), reproduction };
  }
  let verdict;
  try {
    verdict = JSON.parse(run.stdout);
  } catch {
    verdict = null;
  }
  if (verdict === null || typeof verdict !== 'object' || typeof verdict.valid !== 'boolean') {
    const detail = (run.stderr || run.stdout || `exit ${run.status}`).trim();
    return { state: 'runtime-unavailable', output: detail, reproduction };
  }
  const problems = [
    ...(Array.isArray(verdict.errors) ? verdict.errors : []),
    ...(Array.isArray(verdict.unreadable) ? verdict.unreadable.map(unreadableLine) : []),
  ];
  return {
    state: verdict.valid ? 'validator-passed' : 'validator-failed',
    output: problems.join('\n'),
    reproduction,
  };
}

function unreadableLine(entry) {
  return typeof entry === 'object' && entry !== null
    ? `unreadable ${entry.path ?? '?'} (${entry.code ?? 'unknown'})`
    : `unreadable ${String(entry)}`;
}

function escapesRepository(rel) {
  return rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel);
}

function relativeOrAbsolute(target, cwd) {
  const rel = relative(cwd, target);
  if (escapesRepository(rel)) return target;
  return rel.split(sep).join('/');
}

/** The text the model sees. Empty for a pass. */
export function surfacedText(result, owner) {
  if (result.state === 'validator-failed') {
    return (
      `[ad-hooks ${GATE_ID}] ${owner.id} failed for ${owner.path}:\n` +
      `${result.output}\n` +
      `Fix the artifact, then reproduce the verdict from the repository root: ${result.reproduction}`
    );
  }
  if (result.state === 'runtime-unavailable') {
    return (
      `[ad-hooks ${GATE_ID}] runtime-unavailable: could not run the ${owner.id} validator ` +
      `for ${owner.path}: ${result.output}\n` +
      `This is a gate failure, not a verdict on the artifact. Reproduce: ${result.reproduction}`
    );
  }
  return '';
}

/** Evidence file for this session; private by default (OS temporary directory). */
export function evidencePathFor(sessionId, env) {
  const dir = env.AD_ARTIFACT_GATE_EVIDENCE_DIR || join(tmpdir(), 'agentic-artifact-gate');
  const safe = String(sessionId || 'unknown').replace(/[^A-Za-z0-9._-]/g, '_');
  return join(dir, `${safe}.jsonl`);
}

function countLines(file) {
  try {
    return readFileSync(file, 'utf8')
      .split('\n')
      .filter((line) => line.trim()).length;
  } catch (error) {
    if (error.code === 'ENOENT') return 0; // first firing of the session
    throw error;
  }
}

const LOCK_WAIT_MS = 2000;
const LOCK_STALE_MS = 5000;

/** One attempt to take the directory lock; reclaims a lock left by a crashed holder. */
function tryAcquireLock(lock) {
  try {
    mkdirSync(lock);
    return true;
  } catch {
    reclaimStaleLock(lock);
    return false;
  }
}

function reclaimStaleLock(lock) {
  try {
    if (Date.now() - statSync(lock).mtimeMs > LOCK_STALE_MS) rmdirSync(lock);
  } catch {
    /* the lock vanished between the two calls: the next attempt retries */
  }
}

function releaseLock(lock) {
  try {
    rmdirSync(lock);
  } catch {
    /* nothing to release */
  }
}

/**
 * Serialize the read-count-append of one session's evidence file across
 * concurrent hook processes. `mkdirSync` is atomic on every supported
 * platform, so a directory is the lock; a lock older than LOCK_STALE_MS is a
 * crashed holder and is reclaimed; after LOCK_WAIT_MS the caller proceeds
 * without the lock rather than losing the evidence line.
 */
function withEvidenceLock(file, fn) {
  const lock = `${file}.lock`;
  const sleeper = new Int32Array(new SharedArrayBuffer(4));
  const deadline = Date.now() + LOCK_WAIT_MS;
  let held = tryAcquireLock(lock);
  while (!held && Date.now() < deadline) {
    Atomics.wait(sleeper, 0, 0, 5);
    held = tryAcquireLock(lock);
  }
  try {
    fn();
  } finally {
    if (held) releaseLock(lock);
  }
}

/**
 * Append one evidence line with the next sequence number for this session.
 * Returns null on success and the failure's code otherwise: the line is part
 * of the gate's contract, so a write that fails is reported by the caller
 * rather than swallowed (ADR-0083 decision 5).
 */
function appendEvidence(file, line) {
  try {
    mkdirSync(dirname(file), { recursive: true });
    withEvidenceLock(file, () => {
      const seq = countLines(file) + 1;
      appendFileSync(file, `${JSON.stringify({ seq, ...line })}\n`);
    });
    return null;
  } catch (error) {
    return error.code ?? String(error.message);
  }
}

/**
 * Read all of stdin synchronously. An unreadable stdin degrades to silence:
 * the host contract for a hook is never to break the session, and there is
 * no event to act on (the same idiom as handoff-nudge.mjs, ADR-0055).
 */
function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function main() {
  if (process.env.AD_ARTIFACT_GATE === '0') return;
  const raw = readStdin().trim();
  if (!raw) return;
  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return;
  }
  if (event === null || typeof event !== 'object' || Array.isArray(event)) return;

  const cwd = typeof event.cwd === 'string' && event.cwd ? event.cwd : process.cwd();
  const root = skillsRoot(process.env, fileURLToPath(import.meta.url));
  const evidenceFile = evidencePathFor(event.session_id, process.env);
  let exitCode = 0;

  for (const absolutePath of recoverPaths(event, cwd)) {
    const owner = resolveOwner(absolutePath, cwd);
    if (!owner) continue;
    const result = runValidator({ owner, root, cwd });
    let surfaced = surfacedText(result, owner);
    const evidenceError = appendEvidence(evidenceFile, {
      at: new Date().toISOString(),
      gate: GATE_ID,
      state: result.state,
      host_tool: event.tool_name ?? null,
      path: owner.path,
      owner: owner.id,
      validator: owner.validator ? owner.validator.split(sep).join('/') : null,
      output: result.output,
      surfaced,
      reproduction: result.reproduction,
    });
    if (evidenceError) {
      surfaced +=
        `${surfaced ? '\n' : ''}[ad-hooks ${GATE_ID}] runtime-unavailable: the evidence line for ` +
        `${owner.path} could not be written to ${evidenceFile} (${evidenceError}); ` +
        `the validator ${result.state === 'validator-passed' ? 'passed' : 'did not pass'}, ` +
        'but this firing left no record. Set AD_ARTIFACT_GATE_EVIDENCE_DIR to a writable directory.';
    }
    if (surfaced) {
      process.stderr.write(`${surfaced}\n`);
      exitCode = 2;
    }
  }
  process.exitCode = exitCode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
