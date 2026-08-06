import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, cpSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const KIT_ROOT = fileURLToPath(new URL('..', import.meta.url));
const LEFTHOOK_BIN = join(KIT_ROOT, 'node_modules', '.bin', 'lefthook');

// The gate scripts' pure cores are unit-tested elsewhere; this file tests the
// WIRING — the real lefthook.yml installed as real git hooks, exercised by a
// real `git push` to a local bare remote. It exists because a config-level
// interaction (`piped: true` + `use_stdin: true`) once skipped every pre-push
// command on an empty-diff push, invisible to every direct-invocation test.
function mkWiredRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-lefthook-wiring-'));
  const work = join(dir, 'work');
  const bare = join(dir, 'origin.git');
  execFileSync('git', ['init', '-q', '--bare', bare]);
  execFileSync('git', ['init', '-q', '-b', 'main', work]);
  const git = (...args) =>
    execFileSync('git', ['-C', work, ...args], { encoding: 'utf8' });
  git('config', 'user.name', 'Wiring Test');
  git('config', 'user.email', 'wiring@example.com');
  git('config', 'commit.gpgsign', 'false');
  git('remote', 'add', 'origin', bare);
  cpSync(join(KIT_ROOT, 'scripts'), join(work, 'scripts'), { recursive: true });
  cpSync(join(KIT_ROOT, 'lefthook.yml'), join(work, 'lefthook.yml'));
  writeFileSync(
    join(work, 'package.json'),
    `${JSON.stringify(
      { name: 'wiring-fixture', version: '0.0.1', scripts: { test: 'node -e ""' } },
      null,
      2
    )}\n`
  );
  // --no-verify skips pre-commit/commit-msg during setup; pre-push is untouched.
  git('add', '-A');
  git('commit', '-q', '--no-verify', '-m', 'seed');
  execFileSync(LEFTHOOK_BIN, ['install'], { cwd: work });
  return { dir, work, git };
}

test('wiring: an empty-diff push updating main is still blocked by branch-guard', { skip: !existsSync(LEFTHOOK_BIN) && 'lefthook binary not installed' }, () => {
  const { dir, git } = mkWiredRepo();
  try {
    // First push seeds origin/main so the second push has an EMPTY file diff —
    // the exact shape that once skipped every pre-push command.
    assert.throws(() => git('push', 'origin', 'main'), /branch-guard/);
    git('commit', '-q', '--no-verify', '--allow-empty', '-m', 'empty');
    assert.throws(
      () => git('push', 'origin', 'main'),
      (error) => {
        const out = `${error.stderr}${error.stdout}`;
        assert.match(out, /refusing to push main directly/);
        assert.ok(!/no matching push files/.test(out), 'commands must not be skipped');
        return true;
      }
    );
    assert.equal(
      execFileSync('git', ['-C', dir, 'ls-remote', '--heads', join(dir, 'origin.git')], {
        encoding: 'utf8',
      }),
      '',
      'nothing may reach origin main'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('wiring: a feature-branch push passes the installed pre-push chain', { skip: !existsSync(LEFTHOOK_BIN) && 'lefthook binary not installed' }, () => {
  const { dir, git } = mkWiredRepo();
  try {
    git('switch', '-q', '-c', 'feat/wiring');
    git('commit', '-q', '--no-verify', '--allow-empty', '-m', 'feature work');
    git('push', 'origin', 'feat/wiring');
    assert.match(
      execFileSync('git', ['-C', dir, 'ls-remote', '--heads', join(dir, 'origin.git')], {
        encoding: 'utf8',
      }),
      /refs\/heads\/feat\/wiring/
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
