import { GRADERS } from './graders.mjs';
import { isRecord, isStringArray } from './shared.mjs';

export const CASE_SCHEMA = 'agentic-eval-case/1';
export const RECEIPT_SCHEMA = 'agentic-eval-receipt/1';
const RECEIPT_ORIGINS = new Set(['synthetic', 'live']);
const SYNTHETIC_INTENTS = new Set(['known-good', 'intentionally-broken']);
const SKILL_HOSTS = new Set(['claude-code', 'codex']);
const SKILL_NAME = /^[a-z0-9][a-z0-9-]*$/;
const APPROVAL_EVENTS = new Set(['approval_request', 'approval_granted', 'approval_denied']);
const REQUEST_KINDS = new Set(['natural', 'explicit']);
const CASE_TYPES = new Set(['positive', 'close-negative', 'dormancy', 'coexistence']);
const CATEGORY_KINDS = new Set(['spec-driven', 'workflow-operational']);
const CATEGORY_INVOCATIONS = new Set(['model-invocable', 'user-invocable-only']);
const GLOB_LIST_FIELDS = [
  'allowed_effects',
  'forbidden_effects',
  'artifacts',
  'approval_stops',
  'dormant',
];

function fail(message) {
  throw new Error(message);
}

function validateCaseIdentity(caseRecord, path) {
  if (!isRecord(caseRecord) || caseRecord.schema !== CASE_SCHEMA) {
    fail(`case ${path} must declare schema "${CASE_SCHEMA}"`);
  }
  if (typeof caseRecord.id !== 'string' || typeof caseRecord.fixture !== 'string') {
    fail(`case ${path} must declare string "id" and "fixture"`);
  }
  const category = caseRecord.category;
  if (!isRecord(category) || !CATEGORY_KINDS.has(category.kind)) {
    fail(`case ${path} must declare category.kind "spec-driven" or "workflow-operational"`);
  }
  if (!CATEGORY_INVOCATIONS.has(category.invocation)) {
    fail(
      `case ${path} must declare category.invocation "model-invocable" or "user-invocable-only"`
    );
  }
  const representative = caseRecord.representative;
  if (typeof representative !== 'string' || !SKILL_NAME.test(representative)) {
    fail(`case ${path} must declare "representative" as the skill under evaluation`);
  }
  if (!CASE_TYPES.has(caseRecord.case_type)) {
    fail(
      `case ${path} must declare case_type "positive", "close-negative", "dormancy", or "coexistence"`
    );
  }
  if (!REQUEST_KINDS.has(caseRecord.request_kind) || typeof caseRecord.request !== 'string') {
    fail(`case ${path} must declare a string "request" and request_kind "natural" or "explicit"`);
  }
}

function validateCaseExpectations(caseRecord, path) {
  const expected = caseRecord.expected;
  const route = expected?.route;
  if (!isRecord(expected) || (typeof route !== 'string' && route !== null)) {
    fail(`case ${path} must declare "expected.route" as a skill name or null`);
  }
  for (const field of GLOB_LIST_FIELDS) {
    const value = expected[field];
    if (value !== undefined && !isStringArray(value)) {
      fail(`case ${path} "expected.${field}" must be an array of glob strings`);
    }
  }
  if (typeof route === 'string' && (expected.dormant ?? []).includes(route)) {
    fail(`case ${path} names "${route}" in both expected.route and expected.dormant`);
  }
}

function validateCaseGraders(caseRecord, path) {
  const graders = caseRecord.graders;
  if (!Array.isArray(graders) || graders.length === 0) {
    fail(`case ${path} must declare at least one grader`);
  }
  for (const grader of graders) {
    if (!isRecord(grader) || !(grader.id in GRADERS)) {
      fail(`unknown grader "${grader?.id}" in case ${path}`);
    }
  }
  const declares = (id) => graders.some((grader) => grader.id === id);
  const expected = caseRecord.expected;
  if (declares('effects') && !isStringArray(expected.allowed_effects)) {
    fail(`case ${path} declares the effects grader without "expected.allowed_effects"`);
  }
  const stops = expected.approval_stops;
  if (declares('approval') && (!isStringArray(stops) || stops.length === 0)) {
    fail(`case ${path} declares the approval grader without a non-empty "expected.approval_stops"`);
  }
  if (declares('dormancy') && !isStringArray(expected.dormant)) {
    fail(`case ${path} declares the dormancy grader without "expected.dormant"`);
  }
  if (expected.route === null && !declares('dormancy')) {
    fail(`case ${path} leaves "expected.route" null without declaring the dormancy grader`);
  }
}

/** Boundary validation of a case record (ADR-0080 item 6). Throws on the first defect. */
export function validateCase(caseRecord, path) {
  validateCaseIdentity(caseRecord, path);
  validateCaseExpectations(caseRecord, path);
  validateCaseGraders(caseRecord, path);
}

function validateEvent(event, where) {
  if (!isRecord(event) || typeof event.kind !== 'string') {
    fail(`${where} must declare a string "kind"`);
  }
  if (event.kind === 'file_write' && typeof event.path !== 'string') {
    fail(`${where} file_write must declare a string "path"`);
  }
  if (event.kind === 'command' && typeof event.command !== 'string') {
    fail(`${where} command must declare a string "command"`);
  }
  if (APPROVAL_EVENTS.has(event.kind) && typeof event.action !== 'string') {
    fail(`${where} ${event.kind} must declare a string "action"`);
  }
}

function validateTrials(receipt, path) {
  receipt.trials.forEach((trial, trialIndex) => {
    const where = `receipt ${path} trials[${trialIndex}]`;
    if (!isRecord(trial) || typeof trial.id !== 'string' || !Array.isArray(trial.events)) {
      fail(`${where} must declare a string "id" and an "events" array`);
    }
    trial.events.forEach((event, eventIndex) =>
      validateEvent(event, `${where}.events[${eventIndex}]`)
    );
    if (!isRecord(trial.outcome)) fail(`${where} must declare an "outcome" record`);
    const manifest = trial.outcome.artifact_manifest;
    if (manifest !== undefined && !isStringArray(manifest)) {
      fail(`${where}.outcome.artifact_manifest must be an array of path strings`);
    }
  });
}

function validateOrigin(receipt, path) {
  if (!RECEIPT_ORIGINS.has(receipt.origin)) {
    fail(`receipt ${path} must declare origin "synthetic" or "live"`);
  }
  if (receipt.origin === 'synthetic') {
    if (!SYNTHETIC_INTENTS.has(receipt.intent)) {
      fail(`synthetic receipt ${path} must declare intent "known-good" or "intentionally-broken"`);
    }
    const broken = receipt.intent === 'intentionally-broken';
    if (broken ? typeof receipt.declared_failure !== 'string' : receipt.declared_failure != null) {
      fail(
        `synthetic receipt ${path} must declare "declared_failure" only when intentionally broken`
      );
    }
  }
  if (receipt.origin === 'live') {
    const skill = receipt.frozen.skill;
    if (
      !isRecord(skill) ||
      typeof skill.name !== 'string' ||
      typeof skill.host !== 'string' ||
      typeof skill.sha256 !== 'string'
    ) {
      fail(`live receipt ${path} must declare frozen "skill" with name, host, and sha256`);
    }
    if (!SKILL_HOSTS.has(skill.host)) {
      fail(`live receipt ${path} names unknown skill host "${skill.host}"`);
    }
    if (!SKILL_NAME.test(skill.name)) {
      fail(`live receipt ${path} names an invalid skill name "${skill.name}"`);
    }
    validateLiveEnvironment(receipt.frozen, path);
  }
}

const ENVIRONMENT_FIELDS = {
  model: (value) => typeof value === 'string' && value.length > 0,
  tools: (value) => isStringArray(value),
  permissions: (value) => typeof value === 'string' && value.length > 0,
  context_policy: (value) => typeof value === 'string' && value.length > 0,
};
const DIGEST = /^[0-9a-f]{64}$/;

/**
 * The live lane's environment claims (Spec 0007 R5). A field is either measured
 * from the host and well formed, or `null` and named in `unmeasured` — never
 * both and never neither. The two halves have to agree, because a receipt that
 * claims `bare` while declaring the same field unmeasured says two things at
 * once and a reader cannot tell which one the run actually saw.
 */
function validateLiveEnvironment(frozen, path) {
  const unmeasured = frozen.unmeasured;
  if (!isStringArray(unmeasured)) {
    fail(`live receipt ${path} must declare frozen "unmeasured" as an array of field names`);
  }
  for (const [field, wellFormed] of Object.entries(ENVIRONMENT_FIELDS)) {
    const value = frozen[field];
    const declared = unmeasured.includes(field);
    if (value === null || value === undefined) {
      if (!declared) {
        fail(`live receipt ${path} leaves frozen "${field}" unset without declaring it unmeasured`);
      }
      continue;
    }
    if (declared) {
      fail(
        `live receipt ${path} declares frozen "${field}" unmeasured while also reporting a value`
      );
    }
    if (!wellFormed(value)) fail(`live receipt ${path} has a malformed frozen "${field}"`);
  }
  for (const field of unmeasured) {
    if (!(field in ENVIRONMENT_FIELDS)) {
      fail(`live receipt ${path} declares unknown field "${field}" unmeasured`);
    }
  }
  const captures = frozen.captures;
  if (!isRecord(captures)) {
    fail(`live receipt ${path} must declare frozen "captures", one digest per trial`);
  }
  for (const [trialId, digest] of Object.entries(captures)) {
    if (typeof digest !== 'string' || !DIGEST.test(digest)) {
      fail(`live receipt ${path} has a malformed capture digest for trial "${trialId}"`);
    }
  }
}

/** Boundary validation of a receipt against its case (ADR-0080 item 6). Throws on the first defect. */
export function validateReceipt(receipt, caseRecord, path) {
  if (!isRecord(receipt) || receipt.schema !== RECEIPT_SCHEMA) {
    fail(`receipt ${path} must declare schema "${RECEIPT_SCHEMA}"`);
  }
  if (receipt.case_id !== caseRecord.id) {
    fail(`receipt ${path} belongs to case "${receipt.case_id}", not "${caseRecord.id}"`);
  }
  const frozen = receipt.frozen;
  if (
    !isRecord(frozen) ||
    typeof frozen.case_sha256 !== 'string' ||
    typeof frozen.fixture_sha256 !== 'string'
  ) {
    fail(`receipt ${path} must declare frozen "case_sha256" and "fixture_sha256"`);
  }
  if (!Array.isArray(receipt.trials)) fail(`receipt ${path} must declare a "trials" array`);
  validateTrials(receipt, path);
  validateOrigin(receipt, path);
}
