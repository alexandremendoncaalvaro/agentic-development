import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { evaluateReplay } from '../eval/lib/replay.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CASE = join(ROOT, 'eval', 'cases', 'track-work-item-as-task.json');
const RECEIPTS = join(ROOT, 'eval', 'receipts', 'track-work-item-as-task');

test('an intentionally broken replay fails for its declared reason with an actionable failure record', () => {
  const result = evaluateReplay({
    caseFile: CASE,
    receiptFile: join(RECEIPTS, 'wrong-route.json'),
    root: ROOT,
  });

  assert.equal(result.disposition, 'fail');
  assert.equal(result.verification.status, 'verified');
  assert.deepEqual(result.hard_failures, ['wrong_routing']);

  assert.equal(result.failures.length, 1);
  const [failure] = result.failures;
  assert.equal(failure.case_id, 'track-work-item-as-task');
  assert.equal(failure.trial_id, 't1');
  assert.equal(failure.grader, 'route');
  assert.equal(failure.classification, 'deterministic');
  assert.equal(failure.expected, 'ad-task');
  assert.equal(failure.observed, 'ad-spec');
  assert.equal(failure.evidence_locator, 'trials[0].events[0]');
  assert.equal(failure.frozen.case_sha256, result.verification.case_sha256);
  assert.match(
    failure.reproduction,
    /^node eval\/run\.mjs replay eval\/cases\/track-work-item-as-task\.json eval\/receipts\/track-work-item-as-task\/wrong-route\.json$/
  );
});

test('a known-good replay passes and is reported as replayed evidence, never as fresh behavior', () => {
  const result = evaluateReplay({
    caseFile: CASE,
    receiptFile: join(RECEIPTS, 'healthy.json'),
    root: ROOT,
  });

  assert.equal(result.disposition, 'pass');
  assert.equal(result.verification.status, 'verified');
  assert.deepEqual(result.failures, []);
  assert.deepEqual(result.hard_failures, []);
  assert.equal(result.lane, 'replay');
  assert.equal(result.evidence, 'replayed');
});

test('a receipt whose frozen fixture digest no longer matches is reported stale instead of graded', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-eval-stale-'));
  try {
    const receipt = JSON.parse(readFileSync(join(RECEIPTS, 'healthy.json'), 'utf8'));
    receipt.frozen.fixture_sha256 = '0'.repeat(64);
    const staleReceipt = join(dir, 'stale.json');
    writeFileSync(staleReceipt, JSON.stringify(receipt));

    const result = evaluateReplay({ caseFile: CASE, receiptFile: staleReceipt, root: ROOT });

    assert.equal(result.verification.status, 'stale');
    assert.deepEqual(result.verification.mismatches, ['fixture_sha256']);
    assert.equal(result.disposition, 'stale');
    assert.deepEqual(result.failures, []);
    assert.deepEqual(result.hard_failures, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the reproduction command re-runs the replay, prints the result, and exits non-zero on failure', () => {
  const broken = spawnSync(
    process.execPath,
    [
      'eval/run.mjs',
      'replay',
      'eval/cases/track-work-item-as-task.json',
      'eval/receipts/track-work-item-as-task/wrong-route.json',
    ],
    { cwd: ROOT, encoding: 'utf8' }
  );
  assert.equal(broken.status, 1, broken.stderr);
  const brokenResult = JSON.parse(broken.stdout);
  assert.equal(brokenResult.disposition, 'fail');
  assert.equal(
    brokenResult.failures[0].reproduction,
    'node eval/run.mjs replay eval/cases/track-work-item-as-task.json eval/receipts/track-work-item-as-task/wrong-route.json'
  );

  const healthy = spawnSync(
    process.execPath,
    [
      'eval/run.mjs',
      'replay',
      'eval/cases/track-work-item-as-task.json',
      'eval/receipts/track-work-item-as-task/healthy.json',
    ],
    { cwd: ROOT, encoding: 'utf8' }
  );
  assert.equal(healthy.status, 0, healthy.stderr);
  assert.equal(JSON.parse(healthy.stdout).disposition, 'pass');
});

test('a case that declares an unknown grader is rejected with a clear error instead of a crash', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-eval-grader-'));
  try {
    const caseRecord = JSON.parse(readFileSync(CASE, 'utf8'));
    caseRecord.graders.push({ id: 'forbidden_effect', kind: 'deterministic', version: '1' });
    const caseFile = join(dir, 'case.json');
    writeFileSync(caseFile, JSON.stringify(caseRecord));

    assert.throws(
      () => evaluateReplay({ caseFile, receiptFile: join(RECEIPTS, 'healthy.json'), root: ROOT }),
      /unknown grader "forbidden_effect"/
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a receipt missing its frozen inputs is rejected with a clear error naming the receipt', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-eval-receipt-'));
  try {
    const receipt = JSON.parse(readFileSync(join(RECEIPTS, 'healthy.json'), 'utf8'));
    delete receipt.frozen;
    const receiptFile = join(dir, 'no-frozen.json');
    writeFileSync(receiptFile, JSON.stringify(receipt));

    assert.throws(
      () => evaluateReplay({ caseFile: CASE, receiptFile, root: ROOT }),
      (error) => {
        assert.match(error.message, /frozen/);
        assert.match(error.message, /no-frozen\.json/);
        return true;
      }
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the CLI exits 1 on a usage error and 2 when a record is malformed', () => {
  const usage = spawnSync(process.execPath, ['eval/run.mjs', 'replay'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(usage.status, 1);
  assert.match(usage.stderr, /usage/);

  const dir = mkdtempSync(join(tmpdir(), 'agentic-eval-cli-'));
  try {
    const receipt = JSON.parse(readFileSync(join(RECEIPTS, 'healthy.json'), 'utf8'));
    delete receipt.frozen;
    const receiptFile = join(dir, 'no-frozen.json');
    writeFileSync(receiptFile, JSON.stringify(receipt));
    const malformed = spawnSync(
      process.execPath,
      ['eval/run.mjs', 'replay', 'eval/cases/track-work-item-as-task.json', receiptFile],
      { cwd: ROOT, encoding: 'utf8' }
    );
    assert.equal(malformed.status, 2);
    assert.match(malformed.stderr, /frozen/);
    assert.equal(malformed.stdout, '');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
