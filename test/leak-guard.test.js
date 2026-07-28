import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  loadDenylist,
  parseRawDiff,
  extractAddedLines,
  findViolations,
} from '../src/leak-guard.js';

// --- loadDenylist: parse a denylist file's text into normalized patterns ---

test('loadDenylist strips comments, blanks, and whitespace; lowercases', () => {
  const text = '# a comment\n\n  INTERNAL-CODENAME  \nSecretTool\n   \n# trailing\n';
  assert.deepEqual(loadDenylist(text), ['internal-codename', 'secrettool']);
});

test('loadDenylist of empty or missing content yields no patterns', () => {
  assert.deepEqual(loadDenylist(''), []);
  assert.deepEqual(loadDenylist('#only comments\n\n'), []);
});

// --- parseRawDiff: parse `git diff --cached --raw -z` into staged entries ---

const NUL = '\0';

test('parseRawDiff reads status, destination mode/sha, and path (-z NUL format)', () => {
  const raw =
    ':000000 100644 0000000 abc1234 A' + NUL + 'src/new.js' + NUL +
    ':100644 000000 def5678 0000000 D' + NUL + 'gone.js' + NUL +
    ':000000 120000 0000000 aaa1111 A' + NUL + 'link-to-elsewhere' + NUL;
  assert.deepEqual(parseRawDiff(raw), [
    { status: 'A', dstMode: '100644', dstSha: 'abc1234', path: 'src/new.js' },
    { status: 'D', dstMode: '000000', dstSha: '0000000', path: 'gone.js' },
    { status: 'A', dstMode: '120000', dstSha: 'aaa1111', path: 'link-to-elsewhere' },
  ]);
});

test('parseRawDiff uses the destination path for renames (-z NUL format)', () => {
  const raw =
    ':100644 100644 aaa2222 bbb3333 R100' + NUL + 'doc/old.md' + NUL + 'doc/new.md' + NUL;
  assert.deepEqual(parseRawDiff(raw), [
    { status: 'R', dstMode: '100644', dstSha: 'bbb3333', path: 'doc/new.md' },
  ]);
});

test('parseRawDiff keeps a non-ASCII path verbatim (the -z quotepath regression)', () => {
  const raw = ':000000 100644 0000000 c1b0730 A' + NUL + 'rules/内部规则.md' + NUL;
  assert.deepEqual(parseRawDiff(raw), [
    { status: 'A', dstMode: '100644', dstSha: 'c1b0730', path: 'rules/内部规则.md' },
  ]);
});

test('parseRawDiff of empty input yields no entries', () => {
  assert.deepEqual(parseRawDiff(''), []);
  assert.deepEqual(parseRawDiff(NUL + NUL), []);
});

// --- extractAddedLines: pull introduced content out of `git diff --cached` ---

test('extractAddedLines collects + lines with their file, skipping ++ headers and - lines', () => {
  const diff = [
    'diff --git a/foo.md b/foo.md',
    '--- a/foo.md',
    '+++ b/foo.md',
    '@@ -0,0 +1,2 @@',
    '+leaked SECRETTOKEN here',
    '+clean line',
    'diff --git a/bar.js b/bar.js',
    '--- a/bar.js',
    '+++ b/bar.js',
    '@@ -1 +1 @@',
    '-old value',
    '+new value',
  ].join('\n');
  assert.deepEqual(extractAddedLines(diff), [
    { path: 'foo.md', content: 'leaked SECRETTOKEN here' },
    { path: 'foo.md', content: 'clean line' },
    { path: 'bar.js', content: 'new value' },
  ]);
});

// --- findViolations: the pure policy core ---

const noSymlink = () => {
  throw new Error('readSymlinkTarget should not be called for non-symlinks');
};

test('findViolations flags a denylist match in added content', () => {
  const violations = findViolations({
    entries: [{ status: 'A', dstMode: '100644', dstSha: 'x', path: 'foo.md' }],
    addedLines: [{ path: 'foo.md', content: 'has SECRETTOKEN in it' }],
    denylistPatterns: ['secrettoken'],
    repoRoot: '/repo',
    readSymlinkTarget: noSymlink,
  });
  assert.equal(violations.length, 1);
  assert.equal(violations[0].kind, 'denylist');
  assert.equal(violations[0].path, 'foo.md');
});

test('findViolations flags a denylist match in an added path', () => {
  const violations = findViolations({
    entries: [{ status: 'A', dstMode: '100644', dstSha: 'x', path: 'internal-codename-notes.md' }],
    addedLines: [],
    denylistPatterns: ['internal-codename'],
    repoRoot: '/repo',
    readSymlinkTarget: noSymlink,
  });
  assert.equal(violations.length, 1);
  assert.equal(violations[0].kind, 'denylist');
});

test('findViolations flags any added path under rules/, independent of denylist', () => {
  const violations = findViolations({
    entries: [{ status: 'A', dstMode: '100644', dstSha: 'x', path: 'rules/house-conventions.md' }],
    addedLines: [],
    denylistPatterns: [],
    repoRoot: '/repo',
    readSymlinkTarget: noSymlink,
  });
  assert.equal(violations.length, 1);
  assert.equal(violations[0].kind, 'rules-path');
});

test('findViolations flags a non-ASCII path under rules/ (quotepath false-negative regression)', () => {
  const violations = findViolations({
    entries: [{ status: 'A', dstMode: '100644', dstSha: 'x', path: 'rules/内部规则.md' }],
    addedLines: [],
    denylistPatterns: [],
    repoRoot: '/repo',
    readSymlinkTarget: noSymlink,
  });
  assert.equal(violations.length, 1);
  assert.equal(violations[0].kind, 'rules-path');
});

test('findViolations does not flag a deletion under rules/', () => {
  const violations = findViolations({
    entries: [{ status: 'D', dstMode: '000000', dstSha: '0', path: 'rules/old.md' }],
    addedLines: [],
    denylistPatterns: [],
    repoRoot: '/repo',
    readSymlinkTarget: noSymlink,
  });
  assert.deepEqual(violations, []);
});

test('findViolations flags a symlink whose target escapes the repo root', () => {
  const violations = findViolations({
    entries: [{ status: 'A', dstMode: '120000', dstSha: 'x', path: 'sub/link' }],
    addedLines: [],
    denylistPatterns: [],
    repoRoot: '/repo',
    readSymlinkTarget: () => '../../outside/private-rules',
  });
  assert.equal(violations.length, 1);
  assert.equal(violations[0].kind, 'symlink-escape');
  assert.equal(violations[0].path, 'sub/link');
});

test('findViolations flags an absolute-target symlink as an escape', () => {
  const violations = findViolations({
    entries: [{ status: 'A', dstMode: '120000', dstSha: 'x', path: 'link' }],
    addedLines: [],
    denylistPatterns: [],
    repoRoot: '/repo',
    readSymlinkTarget: () => '/Users/someone/private/rules',
  });
  assert.equal(violations.length, 1);
  assert.equal(violations[0].kind, 'symlink-escape');
});

test('findViolations allows a symlink whose target stays inside the repo', () => {
  const violations = findViolations({
    entries: [{ status: 'A', dstMode: '120000', dstSha: 'x', path: 'sub/link' }],
    addedLines: [],
    denylistPatterns: [],
    repoRoot: '/repo',
    readSymlinkTarget: () => '../data/real-file',
  });
  assert.deepEqual(violations, []);
});

test('findViolations returns nothing for a clean staged change', () => {
  const violations = findViolations({
    entries: [{ status: 'A', dstMode: '100644', dstSha: 'x', path: 'src/ok.js' }],
    addedLines: [{ path: 'src/ok.js', content: 'export const ok = true;' }],
    denylistPatterns: ['secrettoken'],
    repoRoot: '/repo',
    readSymlinkTarget: noSymlink,
  });
  assert.deepEqual(violations, []);
});

test('findViolations with no denylist patterns still enforces rules/ and symlink checks', () => {
  const violations = findViolations({
    entries: [
      { status: 'A', dstMode: '100644', dstSha: 'x', path: 'rules/x.md' },
      { status: 'A', dstMode: '120000', dstSha: 'y', path: 'link' },
    ],
    addedLines: [{ path: 'a.md', content: 'anything at all' }],
    denylistPatterns: [],
    repoRoot: '/repo',
    readSymlinkTarget: () => '/etc/passwd',
  });
  const kinds = violations.map((v) => v.kind).sort();
  assert.deepEqual(kinds, ['rules-path', 'symlink-escape']);
});
