import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { evaluateReplay } from './replay.mjs';
import { repoPath } from './shared.mjs';

const CASES_DIR = join('eval', 'cases');
const RECEIPTS_DIR = join('eval', 'receipts');

function jsonFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => join(directory, name));
}

function readReceipt(root, receiptFile) {
  return JSON.parse(readFileSync(resolve(root, receiptFile), 'utf8'));
}

/**
 * Load every tracked case under eval/cases with the receipts filed under
 * eval/receipts/<case id>/. A case without receipts is returned with an empty
 * list so the coverage report can name it; a receipts directory that matches no
 * case is returned under `orphans`; a duplicate case id is a corpus defect and
 * throws.
 */
export function loadCorpus({ root = process.cwd() } = {}) {
  const seen = new Set();
  const cases = jsonFiles(resolve(root, CASES_DIR)).map((caseFile) => {
    const caseRecord = JSON.parse(readFileSync(caseFile, 'utf8'));
    if (seen.has(caseRecord.id)) {
      throw new Error(`duplicate case id "${caseRecord.id}" in ${repoPath(root, caseFile)}`);
    }
    seen.add(caseRecord.id);
    const receiptFiles = jsonFiles(resolve(root, RECEIPTS_DIR, caseRecord.id)).map((file) =>
      repoPath(root, file)
    );
    return {
      caseFile: repoPath(root, caseFile),
      caseRecord,
      receiptFiles,
      receipts: receiptFiles.map((file) => readReceipt(root, file)),
    };
  });
  const receiptsRoot = resolve(root, RECEIPTS_DIR);
  const orphans = existsSync(receiptsRoot)
    ? readdirSync(receiptsRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && !seen.has(entry.name))
        .map((entry) => repoPath(root, join(receiptsRoot, entry.name)))
        .sort()
    : [];
  cases.orphans = orphans;
  return cases;
}

/**
 * Evaluate every tracked receipt of every tracked case through the replay lane.
 * Returns one entry per (case, receipt) pair with the parsed receipt and the
 * result record; validation errors propagate, because a malformed tracked
 * record is a corpus defect, not an evaluation outcome.
 */
export function evaluateCorpus({ root = process.cwd() } = {}) {
  const cases = loadCorpus({ root });
  const results = [];
  for (const entry of cases) {
    entry.receiptFiles.forEach((receiptFile, index) => {
      const receipt = entry.receipts[index];
      const result = evaluateReplay({ caseFile: entry.caseFile, receiptFile, root });
      results.push({
        caseFile: entry.caseFile,
        receiptFile,
        caseRecord: entry.caseRecord,
        receipt,
        result,
      });
    });
  }
  return { cases, results };
}

const INTERSECTIONS = [
  'spec-driven/model-invocable',
  'spec-driven/user-invocable-only',
  'workflow-operational/model-invocable',
  'workflow-operational/user-invocable-only',
];
// Spec 0007 R2 asks for a representative of every populated intersection. The
// kit ships no host-blocked skill (ADR-0085), so the user-invocable-only
// intersections are reported but unpopulated. A skill added to
// HOST_BLOCKED_SKILLS in test/skills.test.js repopulates its intersection, which
// must then be added here so the gate asks for its representative.
const POPULATED = new Set(['spec-driven/model-invocable', 'workflow-operational/model-invocable']);

function sorted(set) {
  return [...set].sort();
}

/**
 * Coverage over Spec 0007 R2 (every populated category-axis intersection has a
 * representative) and R3 (every representative has a positive case, a
 * close-negative or dormancy case, and a coexistence case). `gaps` is empty
 * when the corpus satisfies both; every intersection is reported, and only the
 * populated ones, per ADR-0007 and ADR-0085, must have a representative.
 */
export function coverageReport(cases) {
  const intersections = Object.fromEntries(INTERSECTIONS.map((key) => [key, new Set()]));
  const representatives = {};
  for (const { caseRecord } of cases) {
    const key = `${caseRecord.category.kind}/${caseRecord.category.invocation}`;
    (intersections[key] ??= new Set()).add(caseRecord.representative);
    const entry = (representatives[caseRecord.representative] ??= {
      intersection: key,
      case_types: new Set(),
      cases: [],
    });
    entry.case_types.add(caseRecord.case_type);
    entry.cases.push(caseRecord.id);
  }
  const hosts = Object.fromEntries(INTERSECTIONS.map((key) => [key, new Set()]));
  for (const { caseRecord, receipts } of cases) {
    const key = `${caseRecord.category.kind}/${caseRecord.category.invocation}`;
    for (const receipt of receipts) (hosts[key] ??= new Set()).add(receipt.frozen?.host);
  }
  const gaps = [];
  for (const { caseRecord, receipts } of cases) {
    if (receipts.length === 0) {
      gaps.push(`case ${caseRecord.id} has no receipts`);
      continue;
    }
    const intents = new Set(receipts.map((receipt) => receipt.intent));
    if (!intents.has('known-good')) gaps.push(`case ${caseRecord.id} has no known-good receipt`);
    if (!intents.has('intentionally-broken')) {
      gaps.push(`case ${caseRecord.id} has no intentionally broken receipt`);
    }
  }
  for (const orphan of cases.orphans ?? []) {
    gaps.push(`receipts directory ${orphan} matches no case`);
  }
  for (const key of INTERSECTIONS) {
    if (POPULATED.has(key) && intersections[key].size === 0) {
      gaps.push(`intersection ${key} has no representative`);
    }
  }
  for (const [name, entry] of Object.entries(representatives)) {
    if (!entry.case_types.has('positive'))
      gaps.push(`representative ${name} lacks a positive case`);
    if (!entry.case_types.has('dormancy') && !entry.case_types.has('close-negative')) {
      gaps.push(`representative ${name} lacks a close-negative or dormancy case`);
    }
    if (!entry.case_types.has('coexistence'))
      gaps.push(`representative ${name} lacks a coexistence case`);
  }
  return {
    intersections: Object.fromEntries(
      Object.entries(intersections).map(([key, set]) => [key, sorted(set)])
    ),
    representatives: Object.fromEntries(
      Object.entries(representatives).map(([name, entry]) => [
        name,
        {
          intersection: entry.intersection,
          case_types: sorted(entry.case_types),
          cases: entry.cases,
        },
      ])
    ),
    hosts: Object.fromEntries(Object.entries(hosts).map(([key, set]) => [key, sorted(set)])),
    gaps,
  };
}
