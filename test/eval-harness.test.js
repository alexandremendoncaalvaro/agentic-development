import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { evaluateReplay } from '../eval/lib/replay.mjs';
import { coverageReport, evaluateCorpus, loadCorpus } from '../eval/lib/corpus.mjs';
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

test('a case may declare fixture_skills as unique skill names, and anything else is rejected at the boundary', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-eval-fixture-skills-'));
  try {
    const base = JSON.parse(readFileSync(CASE, 'utf8'));
    const withSkills = { ...base, fixture_skills: ['ad-hooks', 'ad-task'] };
    const caseFile = join(dir, 'case.json');
    writeFileSync(caseFile, JSON.stringify(withSkills));
    // The receipt's frozen case digest no longer matches, so the pair is
    // stale rather than malformed: the boundary accepted the field.
    const result = evaluateReplay({
      caseFile,
      receiptFile: join(RECEIPTS, 'healthy.json'),
      root: ROOT,
    });
    assert.equal(result.verification.status, 'stale');

    for (const bad of ['ad-hooks', ['Ad Hooks'], ['ad-hooks', 'ad-hooks'], [1]]) {
      writeFileSync(caseFile, JSON.stringify({ ...base, fixture_skills: bad }));
      assert.throws(
        () => evaluateReplay({ caseFile, receiptFile: join(RECEIPTS, 'healthy.json'), root: ROOT }),
        /fixture_skills/,
        JSON.stringify(bad)
      );
    }
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
  // A live receipt also declares which environment fields were measured and one
  // digest per capture (task-0081). This fixture measures all four, so nothing
  // is unmeasured and the digest stands in for the stream the trial came from.
  receipt.frozen.unmeasured = [];
  receipt.frozen.captures = Object.fromEntries(
    receipt.trials.map((trial) => [trial.id, 'a'.repeat(64)])
  );
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

const PR_CASE = join(ROOT, 'eval', 'cases', 'open-pull-request-explicit.json');
const PR_RECEIPTS = join(ROOT, 'eval', 'receipts', 'open-pull-request-explicit');

test('an outward command that runs without a granted approval for its declared stop is a bypassed approval', () => {
  const result = evaluateReplay({
    caseFile: PR_CASE,
    receiptFile: join(PR_RECEIPTS, 'bypassed-approval.json'),
    root: ROOT,
  });

  assert.equal(result.disposition, 'fail');
  assert.deepEqual(result.hard_failures, ['bypassed_approval']);
  assert.equal(result.declared_failure_check.status, 'matched');
  const [failure] = result.failures;
  assert.equal(failure.grader, 'approval');
  assert.equal(failure.expected, 'gh pr create');
  assert.match(failure.observed, /^gh pr create /);
  assert.equal(failure.evidence_locator, 'trials[0].events[5]');
});

test('an explicit user-invocable-only invocation whose outward actions were each approved passes', () => {
  const result = evaluateReplay({
    caseFile: PR_CASE,
    receiptFile: join(PR_RECEIPTS, 'healthy.json'),
    root: ROOT,
  });
  assert.equal(result.disposition, 'pass');
  assert.deepEqual(result.hard_failures, []);
  assert.equal(result.declared_failure_check.status, 'matched');
});

test('a denied approval that stops the outward command is the approval stop holding, not a failure', () => {
  const result = evaluateReplay({
    caseFile: PR_CASE,
    receiptFile: join(PR_RECEIPTS, 'denied-approval.json'),
    root: ROOT,
  });
  assert.equal(result.disposition, 'pass');
  assert.deepEqual(result.failures, []);
});

const DORMANCY_CASE = join(ROOT, 'eval', 'cases', 'wire-quality-gates-dormancy.json');
const DORMANCY_RECEIPTS = join(ROOT, 'eval', 'receipts', 'wire-quality-gates-dormancy');

test('a natural request that fires a dormant user-invocable-only skill is wrong routing', () => {
  const result = evaluateReplay({
    caseFile: DORMANCY_CASE,
    receiptFile: join(DORMANCY_RECEIPTS, 'fired-dormant.json'),
    root: ROOT,
  });
  assert.deepEqual(result.hard_failures, ['wrong_routing']);
  assert.equal(result.declared_failure_check.status, 'matched');
  const [failure] = result.failures;
  assert.equal(failure.grader, 'dormancy');
  assert.equal(failure.observed, 'ad-hooks');
  assert.equal(failure.evidence_locator, 'trials[0].events[0]');
});

test('a natural request answered without firing the dormant skill passes the dormancy case', () => {
  const result = evaluateReplay({
    caseFile: DORMANCY_CASE,
    receiptFile: join(DORMANCY_RECEIPTS, 'healthy.json'),
    root: ROOT,
  });
  assert.equal(result.disposition, 'pass');
  assert.deepEqual(result.failures, []);
});

test('approval and dormancy graders require their declared lists at the boundary', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-eval-stop-lists-'));
  try {
    const noStops = JSON.parse(readFileSync(PR_CASE, 'utf8'));
    delete noStops.expected.approval_stops;
    const noStopsFile = join(dir, 'no-stops.json');
    writeFileSync(noStopsFile, JSON.stringify(noStops));
    assert.throws(
      () =>
        evaluateReplay({
          caseFile: noStopsFile,
          receiptFile: join(PR_RECEIPTS, 'healthy.json'),
          root: ROOT,
        }),
      /approval_stops/
    );

    const noDormant = JSON.parse(readFileSync(DORMANCY_CASE, 'utf8'));
    delete noDormant.expected.dormant;
    const noDormantFile = join(dir, 'no-dormant.json');
    writeFileSync(noDormantFile, JSON.stringify(noDormant));
    assert.throws(
      () =>
        evaluateReplay({
          caseFile: noDormantFile,
          receiptFile: join(DORMANCY_RECEIPTS, 'healthy.json'),
          root: ROOT,
        }),
      /dormant/
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a case must say whether its request is natural or explicit', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-eval-request-kind-'));
  try {
    const caseRecord = JSON.parse(readFileSync(CASE, 'utf8'));
    delete caseRecord.request_kind;
    const caseFile = join(dir, 'case.json');
    writeFileSync(caseFile, JSON.stringify(caseRecord));
    assert.throws(
      () => evaluateReplay({ caseFile, receiptFile: join(RECEIPTS, 'healthy.json'), root: ROOT }),
      /request_kind/
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

function prCaseVariant(dir, mutate) {
  const caseRecord = JSON.parse(readFileSync(PR_CASE, 'utf8'));
  mutate(caseRecord);
  const caseFile = join(dir, 'pr-case.json');
  writeFileSync(caseFile, JSON.stringify(caseRecord));
  const receipt = JSON.parse(readFileSync(join(PR_RECEIPTS, 'healthy.json'), 'utf8'));
  receipt.frozen.case_sha256 = freezeArtifact(caseFile).sha256;
  return { caseFile, receipt };
}

test('an approval stop hidden behind a shell chain or an environment assignment is still graded', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-eval-hidden-stop-'));
  try {
    const receipt = JSON.parse(readFileSync(join(PR_RECEIPTS, 'bypassed-approval.json'), 'utf8'));
    receipt.trials[0].events[5].command =
      'cd /tmp/work && GIT_TERMINAL_PROMPT=0 gh pr create --base main --title "x"';
    const receiptFile = join(dir, 'hidden.json');
    writeFileSync(receiptFile, JSON.stringify(receipt));

    const result = evaluateReplay({ caseFile: PR_CASE, receiptFile, root: ROOT });
    assert.deepEqual(result.hard_failures, ['bypassed_approval']);
    assert.equal(result.failures[0].expected, 'gh pr create');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('one granted approval authorizes one outward command, not every later command with the same prefix', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-eval-single-grant-'));
  try {
    const receipt = JSON.parse(readFileSync(join(PR_RECEIPTS, 'healthy.json'), 'utf8'));
    receipt.intent = 'intentionally-broken';
    receipt.declared_failure = 'bypassed_approval';
    receipt.trials[0].events.splice(5, 0, {
      seq: 99,
      kind: 'command',
      command: 'git push --force origin docs/installer-retry-handling',
    });
    const receiptFile = join(dir, 'reused-grant.json');
    writeFileSync(receiptFile, JSON.stringify(receipt));

    const result = evaluateReplay({ caseFile: PR_CASE, receiptFile, root: ROOT });
    assert.deepEqual(result.hard_failures, ['bypassed_approval']);
    assert.match(result.failures[0].observed, /--force/);
    assert.equal(result.declared_failure_check.status, 'matched');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('case declarations that would make grading vacuous are rejected at the boundary', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-eval-vacuous-'));
  try {
    const emptyStops = prCaseVariant(dir, (c) => {
      c.expected.approval_stops = [];
    });
    assert.throws(
      () =>
        evaluateReplay({
          caseFile: emptyStops.caseFile,
          receiptFile: join(PR_RECEIPTS, 'healthy.json'),
          root: ROOT,
        }),
      /approval_stops.*non-empty|non-empty.*approval_stops/
    );

    const routeNullNoDormancy = prCaseVariant(dir, (c) => {
      c.expected.route = null;
    });
    assert.throws(
      () =>
        evaluateReplay({
          caseFile: routeNullNoDormancy.caseFile,
          receiptFile: join(PR_RECEIPTS, 'healthy.json'),
          root: ROOT,
        }),
      /dormancy/
    );

    const routeInDormant = prCaseVariant(dir, (c) => {
      c.expected.dormant = ['ad-pr'];
      c.graders.push({ id: 'dormancy', kind: 'deterministic', version: '1' });
    });
    assert.throws(
      () =>
        evaluateReplay({
          caseFile: routeInDormant.caseFile,
          receiptFile: join(PR_RECEIPTS, 'healthy.json'),
          root: ROOT,
        }),
      /both expected\.route and expected\.dormant/
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

const COEXISTENCE_CASE = join(ROOT, 'eval', 'cases', 'wire-quality-gates-coexistence.json');
const COEXISTENCE_RECEIPTS = join(ROOT, 'eval', 'receipts', 'wire-quality-gates-coexistence');

test('a coexistence request lets the expected model-invocable skill run while the outward skill stays dormant', () => {
  const healthy = evaluateReplay({
    caseFile: COEXISTENCE_CASE,
    receiptFile: join(COEXISTENCE_RECEIPTS, 'healthy.json'),
    root: ROOT,
  });
  assert.equal(healthy.disposition, 'pass');
  assert.deepEqual(healthy.failures, []);

  const overreach = evaluateReplay({
    caseFile: COEXISTENCE_CASE,
    receiptFile: join(COEXISTENCE_RECEIPTS, 'fired-dormant.json'),
    root: ROOT,
  });
  assert.deepEqual(overreach.hard_failures, ['wrong_routing']);
  assert.equal(overreach.failures.length, 1);
  assert.equal(overreach.failures[0].grader, 'dormancy');
  assert.equal(overreach.declared_failure_check.status, 'matched');
});

test('every tracked synthetic receipt fails for exactly its declared reason and known-good receipts pass', () => {
  const corpus = evaluateCorpus({ root: ROOT });
  assert.ok(
    corpus.results.length >= 8,
    `expected the tracked corpus, got ${corpus.results.length} results`
  );
  for (const entry of corpus.results) {
    const { result, receipt } = entry;
    assert.equal(result.verification.status, 'verified', `${entry.receiptFile} is stale`);
    assert.equal(
      result.declared_failure_check.status,
      'matched',
      `${entry.receiptFile} declared-failure mismatch`
    );
    if (receipt.intent === 'known-good') {
      assert.equal(result.disposition, 'pass', `${entry.receiptFile} should pass`);
      assert.deepEqual(result.hard_failures, [], `${entry.receiptFile} raised hard failures`);
    } else {
      assert.equal(result.disposition, 'fail', `${entry.receiptFile} should fail`);
    }
  }
});

test("the coverage report names every category intersection and every representative's case types, with no gap", () => {
  const report = coverageReport(loadCorpus({ root: ROOT }));
  assert.deepEqual(Object.keys(report.intersections).sort(), [
    'spec-driven/model-invocable',
    'spec-driven/user-invocable-only',
    'workflow-operational/model-invocable',
    'workflow-operational/user-invocable-only',
  ]);
  assert.deepEqual(report.intersections['workflow-operational/user-invocable-only'], ['ad-hooks']);
  assert.deepEqual(report.intersections['workflow-operational/model-invocable'], [
    'ad-ground',
    'ad-pr',
    'ad-review',
  ]);
  assert.deepEqual(report.representatives['ad-hooks'].case_types, [
    'coexistence',
    'dormancy',
    'positive',
  ]);
  assert.deepEqual(report.representatives['ad-pr'].case_types, [
    'close-negative',
    'coexistence',
    'positive',
  ]);
  assert.deepEqual(report.representatives['ad-review'].case_types, [
    'close-negative',
    'coexistence',
    'positive',
  ]);
  assert.deepEqual(report.gaps, []);
});

test('the corpus command is the replay-lane gate: exit 0 on the tracked corpus, exit 1 with reproduction commands on a corrupted copy', () => {
  const tracked = spawnSync(process.execPath, ['eval/run.mjs', 'corpus'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(tracked.status, 0, tracked.stderr);
  const report = JSON.parse(tracked.stdout);
  assert.deepEqual(report.coverage.gaps, []);
  assert.ok(report.receipts >= 26);
  assert.deepEqual(report.failing, []);

  const dir = mkdtempSync(join(tmpdir(), 'agentic-eval-corpus-'));
  try {
    cpSync(join(ROOT, 'eval', 'cases'), join(dir, 'eval', 'cases'), { recursive: true });
    cpSync(join(ROOT, 'eval', 'fixtures'), join(dir, 'eval', 'fixtures'), { recursive: true });
    cpSync(join(ROOT, 'eval', 'receipts'), join(dir, 'eval', 'receipts'), { recursive: true });
    const corrupted = join(dir, 'eval', 'receipts', 'track-work-item-as-task', 'healthy.json');
    const receipt = JSON.parse(readFileSync(corrupted, 'utf8'));
    receipt.trials[0].events[0].skill = 'ad-spec';
    writeFileSync(corrupted, JSON.stringify(receipt));

    const broken = spawnSync(process.execPath, [join(ROOT, 'eval', 'run.mjs'), 'corpus'], {
      cwd: dir,
      encoding: 'utf8',
    });
    assert.equal(broken.status, 1, broken.stderr);
    const brokenReport = JSON.parse(broken.stdout);
    assert.equal(brokenReport.failing.length, 1);
    assert.equal(
      brokenReport.failing[0].receipt,
      'eval/receipts/track-work-item-as-task/healthy.json'
    );
    assert.ok(brokenReport.failing[0].hard_failures.includes('corrupted_fixture'));
    assert.equal(
      brokenReport.failing[0].reproduction,
      'node eval/run.mjs replay eval/cases/track-work-item-as-task.json eval/receipts/track-work-item-as-task/healthy.json'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

function triggerPhrases(skill) {
  const source = readFileSync(
    join(ROOT, 'src', 'skills', 'claude-code', skill, 'SKILL.md'),
    'utf8'
  );
  const description = source.split('\n').find((line) => line.startsWith('description:')) ?? '';
  const quoted = [...description.matchAll(/"([^"]+)"/g)].map((match) => match[1].toLowerCase());
  return [skill, ...quoted];
}

test('no natural request names its representative or expected route, nor uses their trigger phrases', () => {
  for (const { caseRecord, caseFile } of loadCorpus({ root: ROOT })) {
    if (caseRecord.request_kind !== 'natural') continue;
    const request = caseRecord.request.toLowerCase();
    const skills = new Set([caseRecord.representative, caseRecord.expected.route].filter(Boolean));
    for (const skill of skills) {
      for (const phrase of triggerPhrases(skill)) {
        assert.ok(
          !request.includes(phrase),
          `${caseFile} request contains "${phrase}" from ${skill}`
        );
      }
    }
  }
});

test('every fixture skill a tracked case declares is bundled for both hosts, so the live lane can install it', () => {
  for (const { caseRecord, caseFile } of loadCorpus({ root: ROOT })) {
    for (const skill of caseRecord.fixture_skills ?? []) {
      for (const host of ['claude-code', 'codex']) {
        assert.ok(
          existsSync(join(ROOT, 'src', 'skills', host, skill, 'SKILL.md')),
          `${caseFile} declares fixture skill "${skill}" which ${host} does not bundle`
        );
      }
    }
  }
});

test('the live fixture wires the artifact-validator gate for both hosts through a path that resolves inside a trial copy', () => {
  const fixture = join(ROOT, 'eval', 'fixtures', 'research-gated-repo');
  const claude = JSON.parse(readFileSync(join(fixture, '.claude', 'settings.json'), 'utf8'));
  const codex = JSON.parse(readFileSync(join(fixture, '.codex', 'hooks.json'), 'utf8'));
  const commandOf = (config) =>
    config.hooks.PostToolUse.find((entry) => entry.matcher === 'Edit|Write').hooks[0].command;
  assert.match(
    commandOf(claude),
    /^node "\$\{CLAUDE_PROJECT_DIR\}\/\.claude\/skills\/ad-hooks\/scripts\/artifact-gate\.mjs"$/
  );
  assert.match(
    commandOf(codex),
    /^node "\.agents\/skills\/ad-hooks\/scripts\/artifact-gate\.mjs"$/
  );
  for (const { caseRecord } of loadCorpus({ root: ROOT })) {
    if (caseRecord.fixture !== 'eval/fixtures/research-gated-repo') continue;
    assert.ok(caseRecord.fixture_skills.includes('ad-hooks'), `${caseRecord.id} installs ad-hooks`);
    assert.ok(
      caseRecord.fixture_skills.includes('ad-ground'),
      `${caseRecord.id} installs ad-ground`
    );
  }
});

function corpusCopy(dir) {
  cpSync(join(ROOT, 'eval', 'cases'), join(dir, 'eval', 'cases'), { recursive: true });
  cpSync(join(ROOT, 'eval', 'fixtures'), join(dir, 'eval', 'fixtures'), { recursive: true });
  cpSync(join(ROOT, 'eval', 'receipts'), join(dir, 'eval', 'receipts'), { recursive: true });
}

test('the coverage report treats a case without both receipt intents and an orphan receipts directory as gaps', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-eval-gaps-'));
  try {
    corpusCopy(dir);
    rmSync(join(dir, 'eval', 'receipts', 'wire-quality-gates-coexistence', 'fired-dormant.json'));
    rmSync(join(dir, 'eval', 'receipts', 'bootstrap-agents-guide-dormancy'), { recursive: true });
    cpSync(
      join(dir, 'eval', 'receipts', 'open-pull-request-explicit'),
      join(dir, 'eval', 'receipts', 'renamed-away-case'),
      { recursive: true }
    );

    const report = coverageReport(loadCorpus({ root: dir }));
    assert.ok(
      report.gaps.some((gap) => /wire-quality-gates-coexistence.*intentionally broken/.test(gap)),
      report.gaps.join('\n')
    );
    assert.ok(
      report.gaps.some((gap) => /bootstrap-agents-guide-dormancy.*no receipts/.test(gap)),
      report.gaps.join('\n')
    );
    assert.ok(
      report.gaps.some((gap) => /renamed-away-case.*matches no case/.test(gap)),
      report.gaps.join('\n')
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('duplicate case ids and unknown category axes are rejected when the corpus loads', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-eval-dup-'));
  try {
    corpusCopy(dir);
    cpSync(
      join(dir, 'eval', 'cases', 'track-work-item-as-task.json'),
      join(dir, 'eval', 'cases', 'zz-copy.json')
    );
    assert.throws(() => loadCorpus({ root: dir }), /duplicate case id "track-work-item-as-task"/);
    rmSync(join(dir, 'eval', 'cases', 'zz-copy.json'));

    const caseRecord = JSON.parse(
      readFileSync(join(dir, 'eval', 'cases', 'track-work-item-as-task.json'), 'utf8')
    );
    caseRecord.category.invocation = 'typo-invocation';
    writeFileSync(
      join(dir, 'eval', 'cases', 'track-work-item-as-task.json'),
      JSON.stringify(caseRecord)
    );
    assert.throws(
      () =>
        evaluateReplay({
          caseFile: 'eval/cases/track-work-item-as-task.json',
          receiptFile: 'eval/receipts/track-work-item-as-task/healthy.json',
          root: dir,
        }),
      /category\.invocation/
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a failure record names the fixture the case ran against', () => {
  const result = evaluateReplay({
    caseFile: CASE,
    receiptFile: join(RECEIPTS, 'wrong-route.json'),
    root: ROOT,
  });
  assert.equal(result.failures[0].fixture, 'eval/fixtures/planning-docs-repo');
});

test('the coverage report lists the hosts recorded per intersection, and the host-divergent representative has a Codex receipt', () => {
  const report = coverageReport(loadCorpus({ root: ROOT }));
  assert.deepEqual(report.hosts['workflow-operational/model-invocable'], ['claude-code', 'codex']);
  assert.deepEqual(report.hosts['spec-driven/model-invocable'], ['claude-code']);
});
