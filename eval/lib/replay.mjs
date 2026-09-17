import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

import { freezeArtifact } from '../../src/skills/claude-code/ad-prism/scripts/freeze-artifact.mjs';

const CASE_SCHEMA = 'agentic-eval-case/1';
const RECEIPT_SCHEMA = 'agentic-eval-receipt/1';
const RESULT_SCHEMA = 'agentic-eval-result/1';

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
  if (!isRecord(caseRecord.expected) || typeof caseRecord.expected.route !== 'string') {
    throw new Error(`case ${path} must declare "expected.route"`);
  }
  if (!Array.isArray(caseRecord.graders) || caseRecord.graders.length === 0) {
    throw new Error(`case ${path} must declare at least one grader`);
  }
  for (const grader of caseRecord.graders) {
    if (!isRecord(grader) || !(grader.id in GRADERS)) {
      throw new Error(`unknown grader "${grader?.id}" in case ${path}`);
    }
  }
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
}

function verifyReceipt({ caseRecord, caseFile, receipt, root }) {
  const caseDigest = freezeArtifact(resolve(root, caseFile)).sha256;
  const fixtureDigest = freezeArtifact(resolve(root, caseRecord.fixture)).sha256;
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

function gradeRoute({ caseRecord, trial, trialIndex }) {
  const eventIndex = trial.events.findIndex((event) => event.kind === 'skill_invoked');
  const observed = eventIndex === -1 ? null : trial.events[eventIndex].skill;
  const expected = caseRecord.expected.route;
  if (observed === expected) return { pass: true };
  return {
    pass: false,
    expected,
    observed,
    hard_failure: 'wrong_routing',
    evidence_locator:
      eventIndex === -1
        ? `trials[${trialIndex}].events`
        : `trials[${trialIndex}].events[${eventIndex}]`,
  };
}

const GRADERS = { route: gradeRoute };

/**
 * Evaluate one frozen replay receipt against its case (Spec 0007, replay lane).
 *
 * Verification (receipt integrity: frozen case and fixture digests still match
 * the tracked inputs) is reported separately from validation (declared graders
 * over the recorded trials). A stale receipt is never graded.
 *
 * @param {{ caseFile: string, receiptFile: string, root?: string }} input
 *   Paths resolve against `root` (default: the current working directory);
 *   the reproduction command in every failure record is relative to `root`.
 * @returns {object} result record (`agentic-eval-result/1`): `disposition` is
 *   `pass`, `fail`, or `stale`; `failures` carry the Spec 0007 R14 fields;
 *   `hard_failures` are listed outside any aggregate.
 * @throws {Error} when the case or receipt is unreadable, declares the wrong
 *   schema, names an unknown grader, or lacks its frozen inputs.
 */
export function evaluateReplay({ caseFile, receiptFile, root = process.cwd() }) {
  const caseRecord = readJson(resolve(root, caseFile));
  validateCase(caseRecord, repoPath(root, caseFile));
  const receipt = readJson(resolve(root, receiptFile));
  validateReceipt(receipt, caseRecord, repoPath(root, receiptFile));

  const verification = verifyReceipt({ caseRecord, caseFile, receipt, root });
  const reproduction = `node eval/run.mjs replay ${repoPath(root, caseFile)} ${repoPath(root, receiptFile)}`;

  const failures = [];
  const graded = verification.status === 'verified';
  const trials = graded ? receipt.trials : [];
  trials.forEach((trial, trialIndex) => {
    for (const grader of caseRecord.graders) {
      const outcome = GRADERS[grader.id]({ caseRecord, trial, trialIndex });
      if (outcome.pass) continue;
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
  });

  const hardFailures = [
    ...new Set(failures.map((failure) => failure.hard_failure).filter(Boolean)),
  ];

  return {
    schema: RESULT_SCHEMA,
    case_id: caseRecord.id,
    lane: receipt.lane,
    evidence: 'replayed',
    verification,
    failures,
    hard_failures: hardFailures,
    disposition: !graded ? 'stale' : failures.length === 0 ? 'pass' : 'fail',
    reproduction,
  };
}
