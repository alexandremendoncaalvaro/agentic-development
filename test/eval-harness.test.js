import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { evaluateReplay } from '../eval/lib/replay.mjs';
import { freezeArtifact } from '../src/skills/claude-code/ad-prism/scripts/freeze-artifact.mjs';

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
  assert.equal(result.declared_failure_check.status, 'matched');

  assert.equal(result.failures.length, 1);
  const [failure] = result.failures;
  assert.equal(failure.case_id, 'track-work-item-as-task');
  assert.equal(failure.trial_id, 't1');
  assert.equal(failure.grader, 'route');
  assert.equal(failure.classification, 'deterministic');
  assert.equal(failure.expected, 'ad-task');
  assert.equal(failure.observed, 'ad-grill-me');
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

function liveReceipt(dir, mutate = () => {}) {
  const receipt = JSON.parse(readFileSync(join(RECEIPTS, 'healthy.json'), 'utf8'));
  receipt.origin = 'live';
  receipt.frozen.grader_versions = Object.fromEntries(
    JSON.parse(readFileSync(CASE, 'utf8')).graders.map((grader) => [grader.id, grader.version])
  );
  receipt.frozen.skill = {
    name: 'ad-task',
    host: 'claude-code',
    sha256: freezeArtifact(join(ROOT, 'src', 'skills', 'claude-code', 'ad-task')).sha256,
  };
  mutate(receipt);
  const receiptFile = join(dir, 'live.json');
  writeFileSync(receiptFile, JSON.stringify(receipt));
  return receiptFile;
}

test('a live receipt whose frozen skill still matches the canonical skill supports a current behavioral claim', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-eval-live-'));
  try {
    const result = evaluateReplay({ caseFile: CASE, receiptFile: liveReceipt(dir), root: ROOT });

    assert.equal(result.disposition, 'pass');
    assert.equal(result.claim.behavioral, 'current');
    assert.equal(result.claim.skill, 'ad-task');
    assert.deepEqual(result.claim.mismatches, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a live receipt whose canonical skill changed loses the current claim but stays auditable through grading', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-eval-stale-skill-'));
  try {
    const receiptFile = liveReceipt(dir, (receipt) => {
      receipt.frozen.skill.sha256 = 'f'.repeat(64);
    });
    const result = evaluateReplay({ caseFile: CASE, receiptFile, root: ROOT });

    assert.equal(result.claim.behavioral, 'stale');
    assert.deepEqual(result.claim.mismatches, ['skill_sha256']);
    assert.equal(result.verification.status, 'verified');
    assert.equal(result.disposition, 'pass');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a synthetic receipt exercises harness mechanics and never carries a behavioral claim', () => {
  const result = evaluateReplay({
    caseFile: CASE,
    receiptFile: join(RECEIPTS, 'healthy.json'),
    root: ROOT,
  });

  assert.equal(result.claim.behavioral, 'none');
});

test('receipt origin and the frozen skill of a live receipt are validated at the boundary', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-eval-origin-'));
  try {
    const noSkill = liveReceipt(dir, (receipt) => {
      delete receipt.frozen.skill;
    });
    assert.throws(
      () => evaluateReplay({ caseFile: CASE, receiptFile: noSkill, root: ROOT }),
      /frozen "skill"/
    );

    const noOrigin = liveReceipt(dir, (receipt) => {
      delete receipt.origin;
    });
    assert.throws(
      () => evaluateReplay({ caseFile: CASE, receiptFile: noOrigin, root: ROOT }),
      /origin/
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a live receipt cannot point the skill digest outside the canonical skill tree or at a missing skill', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-eval-skill-ref-'));
  try {
    const traversal = liveReceipt(dir, (receipt) => {
      receipt.frozen.skill.host = '..';
      receipt.frozen.skill.name = '..';
    });
    assert.throws(
      () => evaluateReplay({ caseFile: CASE, receiptFile: traversal, root: ROOT }),
      /host/
    );

    const badName = liveReceipt(dir, (receipt) => {
      receipt.frozen.skill.name = '../ad-task';
    });
    assert.throws(
      () => evaluateReplay({ caseFile: CASE, receiptFile: badName, root: ROOT }),
      /skill name/
    );

    const missing = liveReceipt(dir, (receipt) => {
      receipt.frozen.skill.name = 'ad-does-not-exist';
    });
    assert.throws(
      () => evaluateReplay({ caseFile: CASE, receiptFile: missing, root: ROOT }),
      /ad-does-not-exist/
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a stale behavioral claim is a hard failure that fails the gate even when grading passed', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-eval-stale-gate-'));
  try {
    const receiptFile = liveReceipt(dir, (receipt) => {
      receipt.frozen.skill.sha256 = 'f'.repeat(64);
    });
    const result = evaluateReplay({ caseFile: CASE, receiptFile, root: ROOT });
    assert.equal(result.disposition, 'pass');
    assert.deepEqual(result.hard_failures, ['stale_claim']);

    const cli = spawnSync(
      process.execPath,
      ['eval/run.mjs', 'replay', 'eval/cases/track-work-item-as-task.json', receiptFile],
      { cwd: ROOT, encoding: 'utf8' }
    );
    assert.equal(cli.status, 1, cli.stderr);
    assert.deepEqual(JSON.parse(cli.stdout).hard_failures, ['stale_claim']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a live receipt frozen against an older grader version loses the current claim', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-eval-grader-version-'));
  try {
    const receiptFile = liveReceipt(dir, (receipt) => {
      receipt.frozen.grader_versions.route = '0';
    });
    const result = evaluateReplay({ caseFile: CASE, receiptFile, root: ROOT });

    assert.equal(result.claim.behavioral, 'stale');
    assert.deepEqual(result.claim.mismatches, ['grader_versions']);
    assert.equal(result.disposition, 'pass');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a trial that writes a forbidden path fails the effects grader as an unauthorized effect', () => {
  const result = evaluateReplay({
    caseFile: CASE,
    receiptFile: join(RECEIPTS, 'forbidden-write.json'),
    root: ROOT,
  });

  assert.equal(result.disposition, 'fail');
  assert.deepEqual(result.hard_failures, ['unauthorized_effect']);
  const [failure] = result.failures;
  assert.equal(failure.grader, 'effects');
  assert.equal(failure.observed, 'AGENTS.md');
  assert.deepEqual(failure.expected, ['doc/tasks/*.md']);
  assert.equal(failure.evidence_locator, 'trials[0].events[2]');
});

test('a trial that exits unsuccessfully without the expected artifact fails the outcome grader without a hard failure', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-eval-outcome-'));
  try {
    const receipt = JSON.parse(readFileSync(join(RECEIPTS, 'healthy.json'), 'utf8'));
    receipt.trials[0].events = [
      { seq: 1, kind: 'skill_invoked', skill: 'ad-task' },
      { seq: 2, kind: 'final', exit_state: 'error' },
    ];
    receipt.trials[0].outcome = { final_response: '', artifact_manifest: [], exit_state: 'error' };
    receipt.intent = 'intentionally-broken';
    receipt.declared_failure = 'outcome';
    const receiptFile = join(dir, 'no-artifact.json');
    writeFileSync(receiptFile, JSON.stringify(receipt));

    const result = evaluateReplay({ caseFile: CASE, receiptFile, root: ROOT });

    assert.equal(result.disposition, 'fail');
    assert.deepEqual(result.hard_failures, []);
    assert.deepEqual(
      result.failures.map((entry) => [entry.grader, entry.evidence_locator]),
      [
        ['outcome', 'trials[0].outcome.exit_state'],
        ['outcome', 'trials[0].outcome.artifact_manifest'],
      ]
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a synthetic receipt whose observed hard failures differ from its declared failure is a corrupted fixture', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-eval-declared-'));
  try {
    const receipt = JSON.parse(readFileSync(join(RECEIPTS, 'forbidden-write.json'), 'utf8'));
    receipt.declared_failure = 'wrong_routing';
    const mislabeled = join(dir, 'mislabeled.json');
    writeFileSync(mislabeled, JSON.stringify(receipt));
    const result = evaluateReplay({ caseFile: CASE, receiptFile: mislabeled, root: ROOT });
    assert.equal(result.declared_failure_check.status, 'mismatched');
    assert.deepEqual(result.declared_failure_check.declared, ['wrong_routing']);
    assert.deepEqual(result.declared_failure_check.observed, ['unauthorized_effect']);
    assert.ok(result.hard_failures.includes('corrupted_fixture'));

    const healthy = JSON.parse(readFileSync(join(RECEIPTS, 'healthy.json'), 'utf8'));
    healthy.trials[0].events[0].skill = 'ad-spec';
    const brokenHealthy = join(dir, 'broken-healthy.json');
    writeFileSync(brokenHealthy, JSON.stringify(healthy));
    const healthyResult = evaluateReplay({
      caseFile: CASE,
      receiptFile: brokenHealthy,
      root: ROOT,
    });
    assert.equal(healthyResult.declared_failure_check.status, 'mismatched');
    assert.ok(healthyResult.hard_failures.includes('corrupted_fixture'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('recorded paths with Windows separators are matched against the same forward-slash globs', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-eval-separators-'));
  try {
    const receipt = JSON.parse(readFileSync(join(RECEIPTS, 'healthy.json'), 'utf8'));
    receipt.trials[0].events[1].path = 'doc\\tasks\\0001-installer-retry-handling.md';
    receipt.trials[0].outcome.artifact_manifest = ['doc\\tasks\\0001-installer-retry-handling.md'];
    const receiptFile = join(dir, 'windows-paths.json');
    writeFileSync(receiptFile, JSON.stringify(receipt));

    const result = evaluateReplay({ caseFile: CASE, receiptFile, root: ROOT });
    assert.equal(result.disposition, 'pass');
    assert.deepEqual(result.failures, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('case effect lists and recorded write paths are validated at the boundary instead of crashing the graders', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-eval-shapes-'));
  try {
    const caseRecord = JSON.parse(readFileSync(CASE, 'utf8'));
    caseRecord.expected.allowed_effects = 'doc/tasks/*.md';
    const badCase = join(dir, 'case.json');
    writeFileSync(badCase, JSON.stringify(caseRecord));
    assert.throws(
      () =>
        evaluateReplay({
          caseFile: badCase,
          receiptFile: join(RECEIPTS, 'healthy.json'),
          root: ROOT,
        }),
      /allowed_effects/
    );

    const receipt = JSON.parse(readFileSync(join(RECEIPTS, 'healthy.json'), 'utf8'));
    delete receipt.trials[0].events[1].path;
    const badReceipt = join(dir, 'no-path.json');
    writeFileSync(badReceipt, JSON.stringify(receipt));
    assert.throws(
      () => evaluateReplay({ caseFile: CASE, receiptFile: badReceipt, root: ROOT }),
      /events\[1\].*path/
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

function caseVariant(dir, mutate) {
  const caseRecord = JSON.parse(readFileSync(CASE, 'utf8'));
  mutate(caseRecord);
  const caseFile = join(dir, 'case.json');
  writeFileSync(caseFile, JSON.stringify(caseRecord));
  const receipt = JSON.parse(readFileSync(join(RECEIPTS, 'healthy.json'), 'utf8'));
  receipt.frozen.case_sha256 = freezeArtifact(caseFile).sha256;
  return { caseFile, receipt };
}

test('a forbidden glob carves a path out of an otherwise allowed effect area', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-eval-carve-out-'));
  try {
    const { caseFile, receipt } = caseVariant(dir, (caseRecord) => {
      caseRecord.expected.allowed_effects = ['**'];
      caseRecord.expected.forbidden_effects = ['AGENTS.md'];
    });
    receipt.trials[0].events.splice(2, 0, { seq: 3, kind: 'file_write', path: 'src/retry.js' });
    receipt.trials[0].events.splice(3, 0, { seq: 4, kind: 'file_write', path: 'AGENTS.md' });
    receipt.intent = 'intentionally-broken';
    receipt.declared_failure = 'unauthorized_effect';
    const receiptFile = join(dir, 'carve-out.json');
    writeFileSync(receiptFile, JSON.stringify(receipt));

    const result = evaluateReplay({ caseFile, receiptFile, root: ROOT });
    assert.deepEqual(
      result.failures.map((entry) => entry.observed),
      ['AGENTS.md']
    );
    assert.deepEqual(result.hard_failures, ['unauthorized_effect']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a case that allows no effects rejects every recorded write, fail-closed', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-eval-no-effects-'));
  try {
    const { caseFile, receipt } = caseVariant(dir, (caseRecord) => {
      caseRecord.expected.allowed_effects = [];
      caseRecord.expected.artifacts = [];
    });
    receipt.intent = 'intentionally-broken';
    receipt.declared_failure = 'unauthorized_effect';
    const receiptFile = join(dir, 'no-effects.json');
    writeFileSync(receiptFile, JSON.stringify(receipt));

    const result = evaluateReplay({ caseFile, receiptFile, root: ROOT });
    assert.deepEqual(result.hard_failures, ['unauthorized_effect']);
    assert.equal(result.failures[0].observed, 'doc/tasks/0001-installer-retry-handling.md');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
