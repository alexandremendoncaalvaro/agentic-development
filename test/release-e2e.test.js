import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, cpSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const KIT_ROOT = fileURLToPath(new URL('..', import.meta.url));

// Integration harness: a throwaway git repo carrying a copy of scripts/ —
// release.sh resolves its repo root as `dirname $0`/.., so the copy makes the
// fixture repo the release target and the whole pipeline runs for real
// (no hooks: lefthook is not installed in the fixture).
function mkReleaseRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-release-e2e-'));
  const git = (...args) =>
    execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' });
  git('init', '-q', '-b', 'chore/release-test');
  git('config', 'user.name', 'Release E2E');
  git('config', 'user.email', 'release-e2e@example.com');
  git('config', 'commit.gpgsign', 'false');
  git('config', 'tag.gpgsign', 'false');
  cpSync(join(KIT_ROOT, 'scripts'), join(dir, 'scripts'), { recursive: true });
  writeFileSync(
    join(dir, 'package.json'),
    `${JSON.stringify({ name: 'release-e2e-fixture', version: '0.1.0-beta.1' }, null, 2)}\n`
  );
  writeFileSync(
    join(dir, 'CHANGELOG.md'),
    '# Changelog\n\n## [Unreleased]\n\n### Added\n\n- A thing.\n'
  );
  git('add', '-A');
  git('commit', '-q', '-m', 'seed', '--no-verify');
  const releaseSh = (...args) =>
    execFileSync('bash', [join(dir, 'scripts', 'release.sh'), ...args], {
      cwd: dir,
      encoding: 'utf8',
    });
  return { dir, git, releaseSh };
}

test('regression: task-0032 annotated tag body keeps markdown headings (--cleanup=whitespace)', () => {
  const { dir, git, releaseSh } = mkReleaseRepo();
  try {
    const out = releaseSh('prerelease');
    assert.match(out, /release 0\.1\.0-beta\.2 committed and tagged locally/);
    const tagBody = git('cat-file', '-p', git('rev-parse', 'refs/tags/v0.1.0-beta.2').trim());
    assert.match(tagBody, /### Added/, 'markdown heading must survive in the tag body');
    assert.match(tagBody, /- A thing\./);
    assert.match(git('log', '-1', '--format=%s'), /^chore\(release\): 0\.1\.0-beta\.2$/m);
    assert.match(git('log', '-1', '--format=%(trailers:key=Signed-off-by)'), /Signed-off-by:/);
    const rotated = readFileSync(join(dir, 'CHANGELOG.md'), 'utf8');
    assert.match(rotated, /## \[0\.1\.0-beta\.2\] - \d{4}-\d{2}-\d{2}/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('regression: task-0032 dry-run writes nothing and says so', () => {
  const { dir, git, releaseSh } = mkReleaseRepo();
  try {
    const before = readFileSync(join(dir, 'package.json'), 'utf8');
    const out = releaseSh('prerelease', '--dry-run');
    assert.match(out, /\[dry-run\] nothing was written, committed, or tagged/);
    assert.ok(!out.includes('committed and tagged locally'), 'must not claim a commit exists');
    assert.equal(readFileSync(join(dir, 'package.json'), 'utf8'), before);
    assert.equal(git('status', '--porcelain'), '', 'tree untouched');
    assert.equal(git('tag', '-l'), '', 'no tag created');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('release.sh: empty [Unreleased] refuses with a clean error', () => {
  const { dir, git, releaseSh } = mkReleaseRepo();
  try {
    writeFileSync(join(dir, 'CHANGELOG.md'), '# Changelog\n\n## [Unreleased]\n');
    git('add', '-A');
    git('commit', '-q', '--no-verify', '-m', 'empty unreleased');
    assert.throws(
      () => releaseSh('prerelease'),
      (error) => {
        assert.match(error.stderr, /error: \[Unreleased\] is empty — nothing to release/);
        assert.ok(!error.stderr.includes('at '), 'no stack trace in the guard output');
        return true;
      }
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('release.sh: refuses to run on main, suggesting the release branch', () => {
  const { dir, git, releaseSh } = mkReleaseRepo();
  try {
    git('branch', '-m', 'main');
    assert.throws(
      () => releaseSh('prerelease'),
      (error) => {
        assert.match(error.stderr, /refusing to commit a release on main/);
        assert.match(error.stderr, /git switch -c chore\/release-0\.1\.0-beta\.2/);
        return true;
      }
    );
    assert.equal(git('status', '--porcelain'), '', 'refusal leaves the tree untouched');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
