import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changelogWarning } from '../scripts/changelog-gate.js';
import { checkSubject } from '../scripts/commit-subject-check.js';
import { pushViolation } from '../scripts/push-branch-guard.js';

// --- changelog-gate (advisory: returns a warning string or null, never blocks) ---

test('changelog-gate: shipped kit content staged without CHANGELOG.md warns', () => {
  const warning = changelogWarning(['src/skills/claude-code/ad-audit/SKILL.md']);
  assert.ok(warning !== null);
  assert.match(warning, /CHANGELOG\.md/);
});

test('changelog-gate: every npm-shipped path triggers the warning', () => {
  // The watched set mirrors package.json#files minus README/LICENSE —
  // including src/index.js and src/leak-guard.js, which ship in the tarball.
  for (const path of [
    'src/lib/install.js',
    'src/commands/init.js',
    'src/index.js',
    'src/leak-guard.js',
    'bin/agentic.js',
    'WORKFLOW.md',
    'WORKFLOW-FLOWS.md',
  ]) {
    assert.ok(changelogWarning([path]) !== null, `${path} should warn`);
  }
});

test('changelog-gate: kit content plus a staged CHANGELOG.md entry passes', () => {
  assert.equal(changelogWarning(['src/lib/install.js', 'CHANGELOG.md']), null);
});

test('changelog-gate: commits outside npm-shipped content pass silently', () => {
  assert.equal(changelogWarning(['doc/tasks/0032-kit-release-discipline.md', 'lefthook.yml']), null);
  assert.equal(changelogWarning(['test/release.test.js', 'scripts/release.sh']), null);
});

test('changelog-gate: README and LICENSE ship but are meta files — no warning', () => {
  assert.equal(changelogWarning(['README.md', 'LICENSE']), null);
});

test('changelog-gate: empty staging area passes silently', () => {
  assert.equal(changelogWarning([]), null);
});

// --- push-branch-guard (blocks pushes that update main or cli) ---

test('push-guard: a push updating refs/heads/main is blocked', () => {
  const stdin = 'refs/heads/main abc123 refs/heads/main def456\n';
  const violation = pushViolation(stdin, 'main');
  assert.ok(violation !== null);
  assert.match(violation, /main/);
});

test('push-guard: a push updating refs/heads/cli is blocked', () => {
  const stdin = 'refs/heads/cli abc123 refs/heads/cli def456\n';
  assert.ok(pushViolation(stdin, 'cli') !== null);
});

test('push-guard: a feature-branch push passes', () => {
  const stdin = 'refs/heads/feat/x abc123 refs/heads/feat/x def456\n';
  assert.equal(pushViolation(stdin, 'feat/x'), null);
});

test('push-guard: sneaking main in among feature refs is still blocked', () => {
  const stdin =
    'refs/heads/feat/x abc123 refs/heads/feat/x def456\n' +
    'refs/heads/feat/x abc123 refs/heads/main def456\n';
  assert.ok(pushViolation(stdin, 'feat/x') !== null);
});

test('push-guard: empty stdin falls back to the current branch', () => {
  assert.ok(pushViolation('', 'main') !== null);
  assert.equal(pushViolation('', 'feat/x'), null);
});

test('push-guard: tag pushes pass (only branch refs are guarded)', () => {
  const stdin = 'refs/tags/v1.0.0 abc123 refs/tags/v1.0.0 000000\n';
  assert.equal(pushViolation(stdin, 'feat/x'), null);
});

// --- commit-subject-check (length blocks; imperative-mood heuristics warn) ---

test('subject-check: subject over 72 chars is an error', () => {
  const subject = `feat(scope): ${'x'.repeat(70)}`;
  const { errors } = checkSubject(subject);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /72/);
});

test('subject-check: subject at exactly 72 chars passes', () => {
  const subject = 'a'.repeat(72);
  assert.deepEqual(checkSubject(subject).errors, []);
});

test('subject-check: merge and revert subjects are exempt', () => {
  const merge = `Merge pull request #65 from alexandremendoncaalvaro/${'b'.repeat(40)}`;
  const revert = `Revert "${'c'.repeat(80)}"`;
  assert.deepEqual(checkSubject(merge), { errors: [], warnings: [] });
  assert.deepEqual(checkSubject(revert), { errors: [], warnings: [] });
});

test('subject-check: fixup! and squash! subjects are exempt', () => {
  const fixup = `fixup! ${'d'.repeat(80)}`;
  assert.deepEqual(checkSubject(fixup), { errors: [], warnings: [] });
});

test('subject-check: trailing period warns', () => {
  const { errors, warnings } = checkSubject('feat: add release script.');
  assert.deepEqual(errors, []);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /period/);
});

test('subject-check: past-tense opener warns about imperative mood', () => {
  const { errors, warnings } = checkSubject('feat(release): added changelog rotation');
  assert.deepEqual(errors, []);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /imperative/);
});

test('subject-check: imperative conventional subject passes clean', () => {
  assert.deepEqual(checkSubject('feat(release): add changelog rotation'), {
    errors: [],
    warnings: [],
  });
});

test('subject-check: length error and mood warning can co-occur', () => {
  const subject = `feat: added ${'y'.repeat(70)}`;
  const { errors, warnings } = checkSubject(subject);
  assert.equal(errors.length, 1);
  assert.equal(warnings.length, 1);
});
