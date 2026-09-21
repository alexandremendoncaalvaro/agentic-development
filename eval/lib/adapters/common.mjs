import { normalizePath } from '../shared.mjs';

/**
 * Shared mechanics of the host stream adapters (ADR-0080 item 10). An adapter
 * turns one host's JSON Lines output into a trial of the receipt contract;
 * everything here is host-independent: line parsing that fails closed, the
 * trial accumulator, the two events a non-interactive stream cannot carry
 * (an explicit invocation, a policy grant), and the outcome.
 */

const SKILL_MENTION = /^[/$]([a-z0-9][a-z0-9-]*)(?:\s|$)/;

/**
 * A stream that stopped before the host said how the turn ended. It is a
 * distinct condition from a malformed record: the bytes parsed, the host just
 * never finished. The replay lane treats both as defects, but the live lane has
 * to tell them apart — an unterminated stream is data about the run, a
 * malformed one is a defect in this code (ADR-0082 decision 6).
 */
export class UnterminatedStreamError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnterminatedStreamError';
  }
}

/** Parse JSON Lines into `{ line, record }` pairs; a non-JSON line is a defect, not a skip. */
export function parseJsonLines(lines) {
  const list = Array.isArray(lines) ? lines : String(lines).split(/\r?\n/);
  const records = [];
  list.forEach((text, index) => {
    if (text.trim() === '') return;
    let record;
    try {
      record = JSON.parse(text);
    } catch (error) {
      throw new Error(`stream line ${index + 1} is not JSON: ${error.message}`, { cause: error });
    }
    records.push({ line: index + 1, record });
  });
  return records;
}

/**
 * The skill an explicit request names (`/name` or `$name` at its start). Both
 * hosts expand the mention before the model runs, so the stream cannot carry
 * the invocation and the request is its only evidence (GROUND-0025 E3).
 */
export function explicitSkill(request, requestKind) {
  if (requestKind !== 'explicit') return null;
  const match = SKILL_MENTION.exec(String(request ?? '').trim());
  if (!match) throw new Error('an explicit request must start with a /skill or $skill mention');
  return match[1];
}

export function createTrial(id) {
  return { id, events: [], native: [], unmapped: {}, writes: [] };
}

/**
 * Record a host record that maps to no event, keyed by its host shape, with
 * the line it came from. Both hosts emit legitimate records the vocabulary has
 * no kind for (a file read, a reasoning item, a retry notice); dropping them
 * silently would erase what Spec 0007 R16 wants kept, so the trial says what it
 * left out and where.
 */
export function countUnmapped(trial, key, line) {
  (trial.unmapped[key] ??= []).push(line);
}

/** A non-empty string the event needs, or a fail-closed error naming the line and record. */
export function requireString(value, where, what) {
  if (typeof value === 'string' && value.length > 0) return value;
  throw new Error(`${where} has no ${what}`);
}

/** An array the event needs, or a fail-closed error naming the line and record. */
export function requireArray(value, where, what) {
  if (Array.isArray(value)) return value;
  throw new Error(`${where} has no ${what}`);
}

/** Append a normalized event with the next sequence number, keeping its native record beside it. */
export function pushEvent(trial, event, native) {
  const seq = trial.events.length + 1;
  trial.events.push({ seq, ...event });
  trial.native.push({ seq, ...native });
  if (event.kind === 'file_write') trial.writes.push(event.path);
}

/** Emit the request-derived and policy-derived events that precede every host record. */
export function pushDerivedEvents(trial, { request, requestKind, policy }) {
  const skill = explicitSkill(request, requestKind);
  if (skill) pushEvent(trial, { kind: 'skill_invoked', skill }, { source: 'request' });
  const grants =
    policy === undefined ? [] : requireArray(policy?.grants, 'run policy', 'grants array');
  for (const action of grants) {
    pushEvent(trial, { kind: 'approval_granted', action }, { source: 'run_policy' });
  }
}

/**
 * A recorded path relative to the run's working directory, forward-slashed.
 * Pure string work on the normalized forms, never `node:path`, so the same
 * sample stream relativizes identically on every CI platform and a path
 * outside the root stays absolute for the effects grader to reject.
 */
export function trialPath(path, fixtureRoot) {
  const normalized = normalizePath(path);
  if (!fixtureRoot) return normalized;
  const root = normalizePath(fixtureRoot).replace(/\/+$/, '');
  if (normalized === root) return '.';
  return normalized.startsWith(`${root}/`) ? normalized.slice(root.length + 1) : normalized;
}

/** Close the trial: the final event, the outcome, and the receipt's trial shape. */
export function finishTrial(trial, { exitState, finalResponse, native }) {
  pushEvent(trial, { kind: 'final', exit_state: exitState }, native);
  const { writes, ...rest } = trial;
  return {
    ...rest,
    outcome: {
      final_response: finalResponse,
      artifact_manifest: [...new Set(writes)],
      exit_state: exitState,
    },
    judgments: [],
  };
}
