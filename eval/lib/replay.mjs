import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { freezeArtifact } from '../../src/skills/claude-code/ad-prism/scripts/freeze-artifact.mjs';
import { GRADERS } from './graders.mjs';
import { repoPath } from './shared.mjs';
import { validateCase, validateReceipt } from './validate.mjs';

const RESULT_SCHEMA = 'agentic-eval-result/1';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
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
          fixture: caseRecord.fixture,
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
