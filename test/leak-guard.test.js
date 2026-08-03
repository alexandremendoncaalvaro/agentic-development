import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  loadDenylist,
  parseRawDiff,
  extractAddedLines,
  findViolations,
  main,
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

test('regression: a content line reading "++ /dev/null" does not switch off the scan (task 0031)', () => {
  // The content line `++ /dev/null` arrives in the diff as `+++ /dev/null`. A
  // prefix-only parser reads it as a file header, nulls the current path, and
  // drops every later line in the file — the marker below would ship unscanned.
  const diff = [
    'diff --git a/poison.md b/poison.md',
    '--- /dev/null',
    '+++ b/poison.md',
    '@@ -0,0 +1,2 @@',
    '++ /dev/null',
    '+INTERNAL-PROJECT-CODENAME',
  ].join('\n');
  assert.deepEqual(extractAddedLines(diff), [
    { path: 'poison.md', content: '+ /dev/null' },
    { path: 'poison.md', content: 'INTERNAL-PROJECT-CODENAME' },
  ]);
});

test('regression: a content line reading "++ b/other.md" does not re-attribute later lines (task 0031)', () => {
  const diff = [
    'diff --git a/reattr.md b/reattr.md',
    '--- /dev/null',
    '+++ b/reattr.md',
    '@@ -0,0 +1,2 @@',
    '++ b/harmless.md',
    '+INTERNAL-PROJECT-CODENAME',
  ].join('\n');
  const added = extractAddedLines(diff);
  assert.deepEqual(
    added.map((a) => a.path),
    ['reattr.md', 'reattr.md'],
    'both lines stay attributed to the file that actually changed'
  );
});

test('extractAddedLines consumes hunk bodies by their declared counts, so a following file header still registers', () => {
  const diff = [
    'diff --git a/a.md b/a.md',
    '+++ b/a.md',
    '@@ -0,0 +1 @@', // count omitted on the new side => defaults to 1
    '+first',
    'diff --git a/b.md b/b.md',
    '+++ b/b.md',
    '@@ -1,2 +1,2 @@',
    ' context',
    '-removed',
    '+added',
  ].join('\n');
  assert.deepEqual(extractAddedLines(diff), [
    { path: 'a.md', content: 'first' },
    { path: 'b.md', content: 'added' },
  ]);
});

test('extractAddedLines ignores the no-newline marker without consuming a hunk line', () => {
  const diff = [
    'diff --git a/n.md b/n.md',
    '+++ b/n.md',
    '@@ -0,0 +1,2 @@',
    '+one',
    '\\ No newline at end of file',
    '+two',
  ].join('\n');
  assert.deepEqual(extractAddedLines(diff), [
    { path: 'n.md', content: 'one' },
    { path: 'n.md', content: 'two' },
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
    entries: [{ status: 'A', dstMode: '100644', dstSha: 'x', path: 'rules/example-conventions.md' }],
    addedLines: [],
    denylistPatterns: [],
    repoRoot: '/repo',
    readSymlinkTarget: noSymlink,
  });
  assert.equal(violations.length, 1);
  assert.equal(violations[0].kind, 'rules-path');
});

test('regression: ADR-0043 findViolations flags an added path under .agentic/rules/ (per-project layer must stay machine-local in this repo)', () => {
  const violations = findViolations({
    entries: [{ status: 'A', dstMode: '100644', dstSha: 'x', path: '.agentic/rules/project-conventions.md' }],
    addedLines: [],
    denylistPatterns: [],
    repoRoot: '/repo',
    readSymlinkTarget: noSymlink,
  });
  assert.equal(violations.length, 1);
  assert.equal(violations[0].kind, 'rules-path');
  assert.equal(violations[0].path, '.agentic/rules/project-conventions.md');
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

test('regression: findViolations flags case-variant rules/ paths (fail-closed; case is not an ADR-0033 accepted limitation)', () => {
  for (const path of ['Rules/x.md', 'RULES/x.md', '.agentic/Rules/x.md', '.Agentic/rules/x.md']) {
    const violations = findViolations({
      entries: [{ status: 'A', dstMode: '100644', dstSha: 'x', path }],
      addedLines: [],
      denylistPatterns: [],
      repoRoot: '/repo',
      readSymlinkTarget: noSymlink,
    });
    assert.equal(violations.length, 1, `expected ${path} to be flagged`);
    assert.equal(violations[0].kind, 'rules-path');
    assert.equal(violations[0].path, path, 'the reported path keeps its original casing');
  }
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

// --- main(): the git-invoking wrapper lefthook actually runs (task 0031) ---
//
// Everything above tests pure functions against hand-built fixtures. `main()` is
// the half that talks to git — `rev-parse`, `diff --cached --raw -z`, `cat-file`,
// the exit codes lefthook reads, and the fail-closed catch. It shipped untested
// through every fix to this file; three separate reviews said so before this
// landed. These run against a real repo and real `git diff` output, so a change
// in git's diff shape breaks the test rather than silently opening the gate.

const MARKER = 'ACME-INTERNAL-CODENAME';

function scratchRepo({ denylist = MARKER } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'leak-guard-'));
  const git = (...args) => execFileSync('git', args, { cwd: dir, stdio: 'pipe' });
  git('init', '-q');
  git('config', 'user.email', 'test@example.invalid');
  git('config', 'user.name', 'Test');
  if (denylist !== null) {
    mkdirSync(join(dir, '.agentic'), { recursive: true });
    writeFileSync(join(dir, '.agentic', 'leak-denylist.txt'), `${denylist}\n`);
  }
  return { dir, git };
}

/** Run main() with cwd pointed at the scratch repo, swallowing its stderr. */
function runGuard(dir) {
  const cwd = process.cwd();
  const write = process.stderr.write;
  process.stderr.write = () => true;
  try {
    process.chdir(dir);
    return main();
  } finally {
    process.stderr.write = write;
    process.chdir(cwd);
  }
}

function stage({ dir, git }, path, content) {
  const full = join(dir, path);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, content);
  git('add', '-f', path);
}

test('main: clean staged content exits 0', (t) => {
  const repo = scratchRepo();
  t.after(() => rmSync(repo.dir, { recursive: true, force: true }));
  stage(repo, 'ok.md', 'nothing sensitive here\n');
  assert.equal(runGuard(repo.dir), 0);
});

test('main: a denylisted marker in staged content exits 1', (t) => {
  const repo = scratchRepo();
  t.after(() => rmSync(repo.dir, { recursive: true, force: true }));
  stage(repo, 'leak.md', `prose mentioning ${MARKER} inline\n`);
  assert.equal(runGuard(repo.dir), 1);
});

test('main: the ++ diff-header bypass does not disable the scan end-to-end (task 0031)', (t) => {
  const repo = scratchRepo();
  t.after(() => rmSync(repo.dir, { recursive: true, force: true }));
  // First line renders as `+++ /dev/null` in the diff; the old parser read that
  // as a file header and dropped every line after it.
  stage(repo, 'poison.md', `++ /dev/null\n${MARKER}\n`);
  assert.equal(runGuard(repo.dir), 1);
});

test('main: a staged path under rules/ exits 1 regardless of case', (t) => {
  for (const path of ['rules/a.md', 'Rules/a.md']) {
    const repo = scratchRepo();
    stage(repo, path, 'curated rule content\n');
    assert.equal(runGuard(repo.dir), 1, `${path} should be blocked`);
    rmSync(repo.dir, { recursive: true, force: true });
  }
});

test('main: a deletion under rules/ is not a violation', (t) => {
  const repo = scratchRepo();
  t.after(() => rmSync(repo.dir, { recursive: true, force: true }));
  stage(repo, 'rules/gone.md', 'x\n');
  repo.git('-c', 'core.hooksPath=/dev/null', 'commit', '-q', '-m', 'seed', '--no-verify');
  repo.git('rm', '-q', 'rules/gone.md');
  assert.equal(runGuard(repo.dir), 0);
});

test('main: outside a git repository it fails closed', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'leak-guard-nogit-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  // A bare temp dir under $TMPDIR is not inside any repo.
  const result = runGuard(dir);
  assert.equal(result, 1, 'no repo must block, not pass');
});

test('main: a missing denylist skips the content scan but still blocks rules/ paths', (t) => {
  const repo = scratchRepo({ denylist: null });
  t.after(() => rmSync(repo.dir, { recursive: true, force: true }));
  // ADR-0033 accepts this: absent the local file the denylist check is a no-op.
  stage(repo, 'leak.md', `${MARKER}\n`);
  assert.equal(runGuard(repo.dir), 0, 'documented fail-open for the content scan');
  repo.git('reset', '-q');
  stage(repo, 'rules/a.md', 'x\n');
  assert.equal(runGuard(repo.dir), 1, 'the path check does not depend on the denylist');
});
