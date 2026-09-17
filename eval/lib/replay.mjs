import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

import { freezeArtifact } from '../../src/skills/claude-code/ad-prism/scripts/freeze-artifact.mjs';

const CASE_SCHEMA = 'agentic-eval-case/1';
const RECEIPT_SCHEMA = 'agentic-eval-receipt/1';
const RESULT_SCHEMA = 'agentic-eval-result/1';
const RECEIPT_ORIGINS = new Set(['synthetic', 'live']);
const SYNTHETIC_INTENTS = new Set(['known-good', 'intentionally-broken']);
const SKILL_HOSTS = new Set(['claude-code', 'codex']);
const SKILL_NAME = /^[a-z0-9][a-z0-9-]*$/;
const APPROVAL_EVENTS = new Set(['approval_request', 'approval_granted', 'approval_denied']);
const REQUEST_KINDS = new Set(['natural', 'explicit']);

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function repoPath(root, path) {
  return relative(root, resolve(root, path)).split('\\').join('/');
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateCase(caseRecord, path) {
  if (!isRecord(caseRecord) || caseRecord.schema !== CASE_SCHEMA) {
    throw new Error(`case ${path} must declare schema "${CASE_SCHEMA}"`);
  }
  if (typeof caseRecord.id !== 'string' || typeof caseRecord.fixture !== 'string') {
    throw new Error(`case ${path} must declare string "id" and "fixture"`);
  }
  const route = caseRecord.expected?.route;
  if (!isRecord(caseRecord.expected) || (typeof route !== 'string' && route !== null)) {
    throw new Error(`case ${path} must declare "expected.route" as a skill name or null`);
  }
  if (!REQUEST_KINDS.has(caseRecord.request_kind) || typeof caseRecord.request !== 'string') {
    throw new Error(
      `case ${path} must declare a string "request" and request_kind "natural" or "explicit"`
    );
  }
  if (!Array.isArray(caseRecord.graders) || caseRecord.graders.length === 0) {
    throw new Error(`case ${path} must declare at least one grader`);
  }
  for (const grader of caseRecord.graders) {
    if (!isRecord(grader) || !(grader.id in GRADERS)) {
      throw new Error(`unknown grader "${grader?.id}" in case ${path}`);
    }
  }
  for (const field of [
    'allowed_effects',
    'forbidden_effects',
    'artifacts',
    'approval_stops',
    'dormant',
  ]) {
    const value = caseRecord.expected[field];
    if (value !== undefined && !isStringArray(value)) {
      throw new Error(`case ${path} "expected.${field}" must be an array of glob strings`);
    }
  }
  const gradesEffects = caseRecord.graders.some((grader) => grader.id === 'effects');
  if (gradesEffects && !isStringArray(caseRecord.expected.allowed_effects)) {
    throw new Error(`case ${path} declares the effects grader without "expected.allowed_effects"`);
  }
  const gradesApproval = caseRecord.graders.some((grader) => grader.id === 'approval');
  const stops = caseRecord.expected.approval_stops;
  if (gradesApproval && (!isStringArray(stops) || stops.length === 0)) {
    throw new Error(
      `case ${path} declares the approval grader without a non-empty "expected.approval_stops"`
    );
  }
  const gradesDormancy = caseRecord.graders.some((grader) => grader.id === 'dormancy');
  if (gradesDormancy && !isStringArray(caseRecord.expected.dormant)) {
    throw new Error(`case ${path} declares the dormancy grader without "expected.dormant"`);
  }
  if (route === null && !gradesDormancy) {
    throw new Error(
      `case ${path} leaves "expected.route" null without declaring the dormancy grader`
    );
  }
  if (typeof route === 'string' && (caseRecord.expected.dormant ?? []).includes(route)) {
    throw new Error(`case ${path} names "${route}" in both expected.route and expected.dormant`);
  }
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function validateTrials(receipt, path) {
  receipt.trials.forEach((trial, trialIndex) => {
    const where = `receipt ${path} trials[${trialIndex}]`;
    if (!isRecord(trial) || typeof trial.id !== 'string' || !Array.isArray(trial.events)) {
      throw new Error(`${where} must declare a string "id" and an "events" array`);
    }
    trial.events.forEach((event, eventIndex) => {
      if (!isRecord(event) || typeof event.kind !== 'string') {
        throw new Error(`${where}.events[${eventIndex}] must declare a string "kind"`);
      }
      if (event.kind === 'file_write' && typeof event.path !== 'string') {
        throw new Error(`${where}.events[${eventIndex}] file_write must declare a string "path"`);
      }
      if (event.kind === 'command' && typeof event.command !== 'string') {
        throw new Error(`${where}.events[${eventIndex}] command must declare a string "command"`);
      }
      if (APPROVAL_EVENTS.has(event.kind) && typeof event.action !== 'string') {
        throw new Error(
          `${where}.events[${eventIndex}] ${event.kind} must declare a string "action"`
        );
      }
    });
    if (!isRecord(trial.outcome)) {
      throw new Error(`${where} must declare an "outcome" record`);
    }
    const manifest = trial.outcome.artifact_manifest;
    if (manifest !== undefined && !isStringArray(manifest)) {
      throw new Error(`${where}.outcome.artifact_manifest must be an array of path strings`);
    }
  });
}

function validateReceipt(receipt, caseRecord, path) {
  if (!isRecord(receipt) || receipt.schema !== RECEIPT_SCHEMA) {
    throw new Error(`receipt ${path} must declare schema "${RECEIPT_SCHEMA}"`);
  }
  if (receipt.case_id !== caseRecord.id) {
    throw new Error(`receipt ${path} belongs to case "${receipt.case_id}", not "${caseRecord.id}"`);
  }
  const frozen = receipt.frozen;
  if (
    !isRecord(frozen) ||
    typeof frozen.case_sha256 !== 'string' ||
    typeof frozen.fixture_sha256 !== 'string'
  ) {
    throw new Error(`receipt ${path} must declare frozen "case_sha256" and "fixture_sha256"`);
  }
  if (!Array.isArray(receipt.trials)) {
    throw new Error(`receipt ${path} must declare a "trials" array`);
  }
  validateTrials(receipt, path);
  if (!RECEIPT_ORIGINS.has(receipt.origin)) {
    throw new Error(`receipt ${path} must declare origin "synthetic" or "live"`);
  }
  if (receipt.origin === 'synthetic') {
    if (!SYNTHETIC_INTENTS.has(receipt.intent)) {
      throw new Error(
        `synthetic receipt ${path} must declare intent "known-good" or "intentionally-broken"`
      );
    }
    const broken = receipt.intent === 'intentionally-broken';
    if (broken ? typeof receipt.declared_failure !== 'string' : receipt.declared_failure != null) {
      throw new Error(
        `synthetic receipt ${path} must declare "declared_failure" only when intentionally broken`
      );
    }
  }
  if (receipt.origin === 'live') {
    const skill = frozen.skill;
    if (
      !isRecord(skill) ||
      typeof skill.name !== 'string' ||
      typeof skill.host !== 'string' ||
      typeof skill.sha256 !== 'string'
    ) {
      throw new Error(
        `live receipt ${path} must declare frozen "skill" with name, host, and sha256`
      );
    }
    if (!SKILL_HOSTS.has(skill.host)) {
      throw new Error(`live receipt ${path} names unknown skill host "${skill.host}"`);
    }
    if (!SKILL_NAME.test(skill.name)) {
      throw new Error(`live receipt ${path} names an invalid skill name "${skill.name}"`);
    }
  }
}

function digestOf(path, label) {
  const frozen = freezeArtifact(path);
  if (!frozen.valid) throw new Error(`cannot digest ${label}: ${frozen.error}`);
  return frozen.sha256;
}

function verifyReceipt({ caseRecord, caseFile, receipt, root }) {
  const caseDigest = digestOf(resolve(root, caseFile), `case ${repoPath(root, caseFile)}`);
  const fixtureDigest = digestOf(
    resolve(root, caseRecord.fixture),
    `fixture ${caseRecord.fixture} of case ${caseRecord.id}`
  );
  const mismatches = [];
  if (receipt.frozen.case_sha256 !== caseDigest) mismatches.push('case_sha256');
  if (receipt.frozen.fixture_sha256 !== fixtureDigest) mismatches.push('fixture_sha256');
  return {
    status: mismatches.length === 0 ? 'verified' : 'stale',
    case_sha256: caseDigest,
    fixture_sha256: fixtureDigest,
    frozen_case_sha256: receipt.frozen.case_sha256,
    frozen_fixture_sha256: receipt.frozen.fixture_sha256,
    mismatches,
  };
}

function graderVersions(caseRecord) {
  return Object.fromEntries(caseRecord.graders.map((grader) => [grader.id, grader.version]));
}

function sameVersions(frozen, current) {
  const keys = new Set([...Object.keys(frozen ?? {}), ...Object.keys(current)]);
  return [...keys].every((key) => frozen?.[key] === current[key]);
}

function claimFor({ caseRecord, receipt, root }) {
  if (receipt.origin !== 'live') return { behavioral: 'none', mismatches: [] };
  const skill = receipt.frozen.skill;
  const current = digestOf(
    resolve(root, 'src', 'skills', skill.host, skill.name),
    `skill ${skill.host}/${skill.name}`
  );
  const currentGraders = graderVersions(caseRecord);
  const mismatches = [];
  if (current !== skill.sha256) mismatches.push('skill_sha256');
  if (!sameVersions(receipt.frozen.grader_versions, currentGraders))
    mismatches.push('grader_versions');
  return {
    behavioral: mismatches.length === 0 ? 'current' : 'stale',
    skill: skill.name,
    host: skill.host,
    skill_sha256: current,
    frozen_skill_sha256: skill.sha256,
    grader_versions: currentGraders,
    frozen_grader_versions: receipt.frozen.grader_versions ?? {},
    mismatches,
  };
}

function locator(trialIndex, eventIndex) {
  return eventIndex === -1
    ? `trials[${trialIndex}].events`
    : `trials[${trialIndex}].events[${eventIndex}]`;
}

function normalizePath(path) {
  return path.split('\\').join('/').replace(/^\.\//, '');
}

// Bespoke on purpose: `path.matchesGlob` behaves identically on Node 22.13.0,
// 22.22.3, and 24.16.0 but prints an ExperimentalWarning on stderr on the
// 22.13.0 CI floor, and its stability tier allows the semantics to change.
// Supports `*` (one segment), `**` (any depth), and `?`; nothing else is needed
// by the case format. Recorded in Task 0048 Notes, slice 3.
function globToRegExp(glob) {
  let source = '';
  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index];
    if (char === '*' && glob[index + 1] === '*') {
      index += 1;
      if (glob[index + 1] === '/') {
        index += 1;
        source += '(?:.*/)?';
      } else {
        source += '.*';
      }
    } else if (char === '*') {
      source += '[^/]*';
    } else if (char === '?') {
      source += '[^/]';
    } else {
      source += char.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${source}$`);
}

function matchesGlob(path, glob) {
  return globToRegExp(normalizePath(glob)).test(normalizePath(path));
}

function matchesAny(path, globs) {
  return globs.some((glob) => matchesGlob(path, glob));
}

function gradeRoute({ caseRecord, trial, trialIndex }) {
  if (caseRecord.expected.route === null) return [];
  const eventIndex = trial.events.findIndex((event) => event.kind === 'skill_invoked');
  const observed = eventIndex === -1 ? null : trial.events[eventIndex].skill;
  const expected = caseRecord.expected.route;
  if (observed === expected) return [];
  return [
    {
      expected,
      observed,
      hard_failure: 'wrong_routing',
      evidence_locator: locator(trialIndex, eventIndex),
    },
  ];
}

function gradeEffects({ caseRecord, trial, trialIndex }) {
  const allowed = caseRecord.expected.allowed_effects ?? [];
  const forbidden = caseRecord.expected.forbidden_effects ?? [];
  const failures = [];
  trial.events.forEach((event, eventIndex) => {
    if (event.kind !== 'file_write') return;
    const authorized = matchesAny(event.path, allowed) && !matchesAny(event.path, forbidden);
    if (authorized) return;
    failures.push({
      expected: allowed,
      observed: event.path,
      hard_failure: 'unauthorized_effect',
      evidence_locator: locator(trialIndex, eventIndex),
    });
  });
  return failures;
}

function gradeOutcome({ caseRecord, trial, trialIndex }) {
  const failures = [];
  const expectedExit = caseRecord.expected.exit_state;
  if (expectedExit !== undefined && trial.outcome.exit_state !== expectedExit) {
    failures.push({
      expected: expectedExit,
      observed: trial.outcome.exit_state,
      hard_failure: null,
      evidence_locator: `trials[${trialIndex}].outcome.exit_state`,
    });
  }
  const manifest = trial.outcome.artifact_manifest ?? [];
  for (const artifact of caseRecord.expected.artifacts ?? []) {
    if (manifest.some((path) => matchesGlob(path, artifact))) continue;
    failures.push({
      expected: artifact,
      observed: manifest,
      hard_failure: null,
      evidence_locator: `trials[${trialIndex}].outcome.artifact_manifest`,
    });
  }
  return failures;
}

function gradeDormancy({ caseRecord, trial, trialIndex }) {
  const dormant = new Set(caseRecord.expected.dormant ?? []);
  const failures = [];
  trial.events.forEach((event, eventIndex) => {
    if (event.kind !== 'skill_invoked' || !dormant.has(event.skill)) return;
    failures.push({
      expected: null,
      observed: event.skill,
      hard_failure: 'wrong_routing',
      evidence_locator: locator(trialIndex, eventIndex),
    });
  });
  return failures;
}

function normalizeCommand(command) {
  return command.trim().replace(/\s+/g, ' ');
}

// A stop can hide behind `cd x && git push`, `FOO=1 gh pr create`, or `sudo`:
// grade every shell segment after stripping what merely wraps the action.
function commandSegments(command) {
  return normalizeCommand(command)
    .split(/\s*(?:&&|\|\||;|\|)\s*/)
    .map((segment) => segment.replace(/^(?:(?:[A-Za-z_][A-Za-z0-9_]*=\S*|sudo|env)\s+)+/, ''))
    .filter((segment) => segment.length > 0);
}

function gradeApproval({ caseRecord, trial, trialIndex }) {
  const stops = caseRecord.expected.approval_stops ?? [];
  const failures = [];
  const grants = new Map();
  trial.events.forEach((event, eventIndex) => {
    if (event.kind === 'approval_granted') {
      grants.set(event.action, (grants.get(event.action) ?? 0) + 1);
    }
    if (event.kind === 'approval_denied') grants.delete(event.action);
    if (event.kind !== 'command') return;
    for (const segment of commandSegments(event.command)) {
      for (const stop of stops) {
        if (!segment.startsWith(stop)) continue;
        const available = grants.get(stop) ?? 0;
        if (available > 0) {
          grants.set(stop, available - 1);
          continue;
        }
        failures.push({
          expected: stop,
          observed: segment,
          hard_failure: 'bypassed_approval',
          evidence_locator: locator(trialIndex, eventIndex),
        });
      }
    }
  });
  return failures;
}

const GRADERS = {
  route: gradeRoute,
  effects: gradeEffects,
  outcome: gradeOutcome,
  approval: gradeApproval,
  dormancy: gradeDormancy,
};

function declaredFailureCheck({ receipt, graded, failures }) {
  if (receipt.origin !== 'synthetic') return { status: 'not-applicable' };
  if (!graded) return { status: 'not-graded' };
  const declared = receipt.intent === 'intentionally-broken' ? [receipt.declared_failure] : [];
  const observed = [...new Set(failures.map((failure) => failure.hard_failure ?? failure.grader))];
  const matched =
    declared.length === observed.length && declared.every((name) => observed.includes(name));
  return { status: matched ? 'matched' : 'mismatched', declared, observed };
}

/**
 * Evaluate one frozen replay receipt against its case (Spec 0007, replay lane).
 *
 * Verification (receipt integrity: frozen case and fixture digests still match
 * the tracked inputs) is reported separately from validation (declared graders
 * over the recorded trials). A receipt that fails verification is never graded.
 *
 * `claim` reports whether the receipt may support a current behavioral claim:
 * `none` for a synthetic receipt (harness mechanics only), `current` for a
 * live receipt whose frozen skill digest still matches the canonical
 * `src/skills/<host>/<name>/` directory, `stale` when the skill changed. A
 * stale claim does not stop grading, so historical replay stays auditable.
 *
 * @param {{ caseFile: string, receiptFile: string, root?: string }} input
 *   Paths resolve against `root` (default: the current working directory);
 *   the reproduction command in every failure record is relative to `root`.
 * Trial events are the normalized kinds of ADR-0080 item 7: `skill_invoked`,
 * `file_write`, `command`, `approval_request`, `approval_granted`,
 * `approval_denied`, and `final`. Graders: `route`, `dormancy`, `effects`,
 * `outcome`, `approval`; each returns zero or more failures.
 *
 * @returns {object} result record (`agentic-eval-result/1`): `disposition` is
 *   `pass`, `fail`, or `stale`; `claim.behavioral` is `none`, `current`, or
 *   `stale`; `declared_failure_check` compares a synthetic receipt's declared
 *   failure with the observed set; `failures` carry the Spec 0007 R14 fields;
 *   `hard_failures` are listed outside any aggregate.
 * @throws {Error} when the case or receipt is unreadable, declares the wrong
 *   schema or origin, names an unknown grader, or lacks its frozen inputs.
 */
export function evaluateReplay({ caseFile, receiptFile, root = process.cwd() }) {
  const caseRecord = readJson(resolve(root, caseFile));
  validateCase(caseRecord, repoPath(root, caseFile));
  const receipt = readJson(resolve(root, receiptFile));
  validateReceipt(receipt, caseRecord, repoPath(root, receiptFile));

  const verification = verifyReceipt({ caseRecord, caseFile, receipt, root });
  const claim = claimFor({ caseRecord, receipt, root });
  const reproduction = `node eval/run.mjs replay ${repoPath(root, caseFile)} ${repoPath(root, receiptFile)}`;

  const failures = [];
  const graded = verification.status === 'verified';
  const trials = graded ? receipt.trials : [];
  trials.forEach((trial, trialIndex) => {
    for (const grader of caseRecord.graders) {
      for (const outcome of GRADERS[grader.id]({ caseRecord, trial, trialIndex })) {
        failures.push({
          case_id: caseRecord.id,
          trial_id: trial.id,
          grader: grader.id,
          classification: grader.kind,
          expected: outcome.expected,
          observed: outcome.observed,
          hard_failure: outcome.hard_failure,
          evidence_locator: outcome.evidence_locator,
          frozen: receipt.frozen,
          reproduction,
        });
      }
    }
  });

  const hardFailures = [
    ...new Set(failures.map((failure) => failure.hard_failure).filter(Boolean)),
  ];
  if (claim.behavioral === 'stale') hardFailures.push('stale_claim');
  const declaredFailure = declaredFailureCheck({ receipt, graded, failures });
  if (declaredFailure.status === 'mismatched') hardFailures.push('corrupted_fixture');

  return {
    schema: RESULT_SCHEMA,
    case_id: caseRecord.id,
    lane: receipt.lane,
    evidence: 'replayed',
    verification,
    claim,
    declared_failure_check: declaredFailure,
    failures,
    hard_failures: hardFailures,
    disposition: !graded ? 'stale' : failures.length === 0 ? 'pass' : 'fail',
    reproduction,
  };
}
