import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, cpSync, existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveSpawn } from '../scripts/hook-npm-test.js';

const KIT_ROOT = fileURLToPath(new URL('..', import.meta.url));

// npm writes two shims into node_modules/.bin: an extensionless shell script
// for POSIX and a .cmd wrapper for Windows, which cannot execute the former.
// resolveSpawn owns the rule for running each (a .cmd needs the shell).
const LEFTHOOK_SHIM = join(
  KIT_ROOT,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'lefthook.cmd' : 'lefthook'
);
const LEFTHOOK = resolveSpawn(LEFTHOOK_SHIM);

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
  execFileSync(LEFTHOOK.command, ['install'], { cwd: work, shell: LEFTHOOK.shell });
  return { dir, work, git };
}

test('regression: task-0033 the npm-test hook runner strips the git hook environment', () => {
  // In a linked git worktree the hook-exported GIT_DIR leaks into the
  // suite's child processes and points their git calls at THIS repo —
  // observed turning 13 tests red and making pre-push unpassable
  // (task-0033). The runner must spawn the gate with those vars gone.
  const out = execFileSync(
    'node',
    [
      join(KIT_ROOT, 'scripts', 'hook-npm-test.js'),
      'node',
      '-e',
      'console.log(process.env.GIT_DIR ?? "unset", process.env.GIT_WORK_TREE ?? "unset", process.env.GIT_INDEX_FILE ?? "unset")',
    ],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        GIT_DIR: '/poison',
        GIT_WORK_TREE: '/poison',
        GIT_INDEX_FILE: '/poison',
      },
    }
  );
  assert.match(out, /^unset unset unset$/m);
});

test('wiring: lefthook.yml routes the pre-push test gate through the env-stripping runner', () => {
  const yml = readFileSync(join(KIT_ROOT, 'lefthook.yml'), 'utf8');
  assert.match(
    yml,
    /run: node scripts\/hook-npm-test\.js/,
    'pre-push npm-test must run via scripts/hook-npm-test.js — a bare `npm test` re-opens the worktree env leak'
  );
});

test('wiring: an empty-diff push updating main is still blocked by branch-guard', { skip: !existsSync(LEFTHOOK_SHIM) && 'lefthook binary not installed' }, () => {
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

test('wiring: a feature-branch push passes the installed pre-push chain', { skip: !existsSync(LEFTHOOK_SHIM) && 'lefthook binary not installed' }, () => {
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
