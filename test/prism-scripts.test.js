import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRISM_SCRIPTS = join(
  __dirname,
  '..',
  'src',
  'skills',
  'claude-code',
  'ad-prism',
  'scripts'
);

const COMPLETE_PLAN = `# Checkout latency evaluation

## Decision
Whether to enable the candidate path for a limited rollout.

## Objective
Reduce checkout latency without increasing failed purchases.

## Evaluation question
Does the candidate reduce end-to-end latency while preserving completion?

## Claim
The candidate is ready for a limited rollout under the tested traffic mix.

## Evidence
Versioned replay results and a guarded staging run.

## Tasks
Replay the representative corpus and exercise the guarded staging path.

## Measures
End-to-end latency and purchase completion rate.

## Data sources
Replay output and staging telemetry.

## Decision rule
Proceed only when latency improves and the completion guardrail holds.

## Limits
The result does not establish production performance outside the tested mix.

## Sources
### M1 — Goal-Question-Metric
- Source: https://ntrs.nasa.gov/api/citations/19920010178/downloads/19920010178.pdf
- Supports: deriving measures from an explicit evaluation objective.
- Contribution: keeps the latency and completion measures tied to the checkout decision.
- Adaptation: applies the method to one versioned replay corpus and staging traffic mix.
- Retained limit: does not supply the decision threshold or establish production performance.
`;

function runScript(name, args, cwd) {
  return spawnSync('node', [join(PRISM_SCRIPTS, name), ...args], {
    cwd,
    encoding: 'utf8',
  });
}

test('validate-plan accepts a complete decision-linked evaluation brief', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-prism-plan-'));
  try {
    const plan = join(dir, 'evaluation.md');
    writeFileSync(plan, COMPLETE_PLAN);

    const result = runScript('validate-plan.mjs', [plan], dir);
    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.valid, true);
    assert.deepEqual(payload.errors, []);
    assert.equal(payload.present_sections.length, 11);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('validate-plan rejects a methodological source without an auditable mapping', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-prism-plan-source-map-'));
  try {
    const plan = join(dir, 'evaluation.md');
    writeFileSync(
      plan,
      COMPLETE_PLAN.replace(
        /- Supports:[\s\S]*?- Retained limit:[^\n]*\n/,
        ''
      )
    );

    const result = runScript('validate-plan.mjs', [plan], dir);
    assert.equal(result.status, 1);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.valid, false);
    assert.match(payload.errors.join('\n'), /Method source M1 is missing: Supports, Contribution, Adaptation, Retained limit/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('validate-plan rejects duplicate method-source identifiers', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-prism-plan-source-id-'));
  try {
    const plan = join(dir, 'evaluation.md');
    writeFileSync(
      plan,
      `${COMPLETE_PLAN}\n### M1 — Evidence-Centered Design\n- Source: https://www.ets.org/Media/Research/pdf/TC-10-07.pdf\n- Supports: linking claims to evidence-producing tasks.\n- Contribution: checks that the replay task can support the latency claim.\n- Adaptation: maps the evidence chain to this checkout comparison.\n- Retained limit: does not establish the decision threshold.\n`
    );

    const result = runScript('validate-plan.mjs', [plan], dir);
    assert.equal(result.status, 1);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.valid, false);
    assert.match(payload.errors.join('\n'), /Duplicate method source identifier: M1/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('validate-plan rejects duplicate decision-chain sections', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-prism-plan-duplicate-'));
  try {
    const plan = join(dir, 'evaluation.md');
    writeFileSync(plan, `${COMPLETE_PLAN}\n## Decision\nA second decision.\n`);

    const result = runScript('validate-plan.mjs', [plan], dir);
    assert.equal(result.status, 1);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.valid, false);
    assert.deepEqual(payload.duplicate_sections, ['Decision']);
    assert.match(payload.errors.join('\n'), /Duplicate section: Decision/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('validate-plan rejects unresolved placeholders in the visible plan', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-prism-plan-placeholder-'));
  try {
    const plan = join(dir, 'evaluation.md');
    writeFileSync(plan, COMPLETE_PLAN.replace('Versioned replay results', 'TODO'));

    const result = runScript('validate-plan.mjs', [plan], dir);
    assert.equal(result.status, 1);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.valid, false);
    assert.match(payload.errors.join('\n'), /Unresolved placeholder at line/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('validate-plan ignores headings and placeholders inside fenced examples', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-prism-plan-fence-'));
  try {
    const plan = join(dir, 'evaluation.md');
    writeFileSync(plan, `${COMPLETE_PLAN}\n\`\`\`markdown\n## Decision\nTODO\n\`\`\`\n`);

    const result = runScript('validate-plan.mjs', [plan], dir);
    assert.equal(result.status, 0, result.stdout);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.valid, true);
    assert.deepEqual(payload.duplicate_sections, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('validate-plan rejects angle-bracket placeholders without rejecting autolinks', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-prism-plan-angle-'));
  try {
    const plan = join(dir, 'evaluation.md');
    writeFileSync(
      plan,
      COMPLETE_PLAN
        .replace('The candidate is ready', '<claim>')
        .replace('The versioned corpus', '<https://example.com/corpus>')
    );

    const result = runScript('validate-plan.mjs', [plan], dir);
    assert.equal(result.status, 1);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.errors.filter((error) => /Unresolved placeholder/.test(error)).length, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('validate-plan rejects the evaluation template title placeholder', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-prism-plan-title-placeholder-'));
  try {
    const plan = join(dir, 'evaluation.md');
    writeFileSync(plan, COMPLETE_PLAN.replace('# Checkout latency evaluation', '# <evaluation title>'));

    const result = runScript('validate-plan.mjs', [plan], dir);
    assert.equal(result.status, 1);
    const payload = JSON.parse(result.stdout);
    assert.match(payload.errors.join('\n'), /Unresolved placeholder at line 1/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('validate-report accepts an ordinary report and summarizes visible headings', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-prism-report-'));
  try {
    const report = join(dir, 'report.md');
    writeFileSync(report, '# Rollout evaluation\n\n## Recommendation\nProceed with the guarded rollout.\n');

    const result = runScript('validate-report.mjs', [report], dir);
    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.valid, true);
    assert.deepEqual(payload.summary, { headings: 2, local_images: 0, remote_images: 0 });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('validate-report rejects editorial instructions exposed as headings', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-prism-report-heading-'));
  try {
    const report = join(dir, 'report.md');
    writeFileSync(report, '# Evaluation\n\n## Bottom line up front\nProceed.\n');

    const result = runScript('validate-report.mjs', [report], dir);
    assert.equal(result.status, 1);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.valid, false);
    assert.match(payload.errors.join('\n'), /Visible heading exposes an editorial instruction/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('validate-report ignores editorial headings inside fenced examples', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-prism-report-fence-'));
  try {
    const report = join(dir, 'report.md');
    writeFileSync(report, '# Evaluation\n\n```markdown\n## BLUF\nExample only.\n```\n');

    const result = runScript('validate-report.mjs', [report], dir);
    assert.equal(result.status, 0, result.stdout);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.valid, true);
    assert.equal(payload.summary.headings, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('validate-report distinguishes packaged images from remote references', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-prism-report-images-'));
  try {
    mkdirSync(join(dir, 'assets'));
    writeFileSync(join(dir, 'assets', 'latency.png'), 'image-bytes');
    const report = join(dir, 'report.md');
    writeFileSync(
      report,
      '# Evaluation\n\n![Latency](assets/latency.png)\n\n![Context](https://example.com/context.png)\n'
    );

    const result = runScript('validate-report.mjs', [report], dir);
    assert.equal(result.status, 0, result.stdout);
    const payload = JSON.parse(result.stdout);
    assert.deepEqual(payload.summary, { headings: 1, local_images: 1, remote_images: 1 });
    assert.match(payload.warnings.join('\n'), /Remote image is not packaged/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('validate-report rejects local images that escape the report package', () => {
  const root = mkdtempSync(join(tmpdir(), 'agentic-prism-report-escape-'));
  try {
    const dir = join(root, 'report');
    mkdirSync(dir);
    writeFileSync(join(root, 'outside.png'), 'image-bytes');
    const report = join(dir, 'report.md');
    writeFileSync(report, '# Evaluation\n\n![Outside](../outside.png)\n');

    const result = runScript('validate-report.mjs', [report], dir);
    assert.equal(result.status, 1);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.valid, false);
    assert.match(payload.errors.join('\n'), /Local image escapes the report directory/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('freeze-artifact returns the SHA-256 receipt for a settled file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-prism-freeze-file-'));
  try {
    const artifact = join(dir, 'evaluation.md');
    const body = 'settled evaluation\n';
    writeFileSync(artifact, body);

    const result = runScript('freeze-artifact.mjs', [artifact], dir);
    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.valid, true);
    assert.equal(payload.kind, 'file');
    assert.equal(payload.files, 1);
    assert.deepEqual(payload.included_paths, ['evaluation.md']);
    assert.equal(payload.size_bytes, Buffer.byteLength(body));
    assert.equal(payload.sha256, createHash('sha256').update(body).digest('hex'));
    assert.equal(payload.match, null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('freeze-artifact verifies an expected SHA-256 receipt', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-prism-freeze-expect-'));
  try {
    const artifact = join(dir, 'evaluation.md');
    const body = 'settled evaluation\n';
    writeFileSync(artifact, body);
    const expected = createHash('sha256').update(body).digest('hex');

    const matching = runScript('freeze-artifact.mjs', [artifact, '--expect', expected], dir);
    assert.equal(matching.status, 0, matching.stdout);
    assert.equal(JSON.parse(matching.stdout).match, true);

    const mismatch = runScript('freeze-artifact.mjs', [artifact, '--expect', '0'.repeat(64)], dir);
    assert.equal(mismatch.status, 1);
    const payload = JSON.parse(mismatch.stdout);
    assert.equal(payload.valid, false);
    assert.equal(payload.match, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('freeze-artifact keeps a directory receipt stable when it embeds its own hash', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-prism-freeze-directory-'));
  try {
    mkdirSync(join(dir, 'evidence'));
    writeFileSync(join(dir, 'evidence', 'results.json'), '{"latency_ms":120}\n');
    const audit = join(dir, 'audit.md');
    writeFileSync(audit, '# Evaluation audit\n\n- SHA-256: \n');

    const first = runScript('freeze-artifact.mjs', [dir], dir);
    assert.equal(first.status, 0, first.stdout);
    const receipt = JSON.parse(first.stdout);
    assert.equal(receipt.kind, 'directory');
    assert.equal(receipt.files, 2);
    assert.deepEqual(receipt.included_paths, ['audit.md', 'evidence/results.json']);

    writeFileSync(audit, `# Evaluation audit\n\n- SHA-256: ${receipt.sha256}\n`);
    const verified = runScript(
      'freeze-artifact.mjs',
      [dir, '--expect', receipt.sha256],
      dir
    );
    assert.equal(verified.status, 0, verified.stdout);
    const payload = JSON.parse(verified.stdout);
    assert.equal(payload.sha256, receipt.sha256);
    assert.equal(payload.receipt_sha256, receipt.sha256);
    assert.equal(payload.match, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('freeze-artifact accepts a Markdown code-wrapped embedded receipt', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-prism-freeze-code-receipt-'));
  try {
    writeFileSync(join(dir, 'evaluation.md'), 'settled evaluation\n');
    const audit = join(dir, 'audit.md');
    writeFileSync(audit, '# Evaluation audit\n\n- SHA-256: \n');

    const first = runScript('freeze-artifact.mjs', [dir], dir);
    assert.equal(first.status, 0, first.stdout);
    const receipt = JSON.parse(first.stdout).sha256;

    writeFileSync(audit, `# Evaluation audit\n\n- SHA-256: \`${receipt}\`\n`);
    const verified = runScript('freeze-artifact.mjs', [dir, '--expect', receipt], dir);
    assert.equal(verified.status, 0, verified.stdout);
    const payload = JSON.parse(verified.stdout);
    assert.equal(payload.receipt_sha256, receipt);
    assert.equal(payload.match, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('freeze-artifact rejects a symlink as the artifact root', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-prism-freeze-symlink-'));
  try {
    const target = join(dir, 'evaluation.md');
    writeFileSync(target, 'settled evaluation\n');
    const link = join(dir, 'current-evaluation.md');
    symlinkSync('evaluation.md', link, 'file');

    const result = runScript('freeze-artifact.mjs', [link], dir);
    assert.equal(result.status, 1);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.valid, false);
    assert.match(payload.error, /Artifact root cannot be a symlink/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('freeze-artifact rejects a directory whose embedded receipt is stale', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-prism-freeze-stale-'));
  try {
    writeFileSync(join(dir, 'evaluation.md'), 'settled evaluation\n');
    writeFileSync(join(dir, 'audit.md'), `# Audit\n\n- SHA-256: ${'0'.repeat(64)}\n`);

    const frozen = runScript('freeze-artifact.mjs', [dir], dir);
    assert.equal(frozen.status, 0, frozen.stdout);
    const actual = JSON.parse(frozen.stdout).sha256;

    const verified = runScript('freeze-artifact.mjs', [dir, '--expect', actual], dir);
    assert.equal(verified.status, 1);
    const payload = JSON.parse(verified.stdout);
    assert.equal(payload.valid, false);
    assert.equal(payload.match, false);
    assert.match(payload.error, /Embedded audit receipt does not match/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
