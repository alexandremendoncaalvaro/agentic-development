import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { resolveSpawn, sanitizedEnv } from '../scripts/hook-npm-test.js';

// The pre-push runner spawns the gate, and how a command is spawned is a
// platform question the CI matrix alone cannot answer for us: these tests
// inject `platform` and `env` so the Windows branch is exercised wherever the
// suite runs. The behaviour they pin is what once made the whole suite
// unpassable on Windows — `shell: true` handed every argument to cmd.exe,
// which re-parsed anything containing spaces or quotes.

function mkPathDir(files) {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-resolve-spawn-'));
  for (const name of files) writeFileSync(join(dir, name), '');
  return dir;
}

test('resolveSpawn: POSIX never needs a shell', () => {
  assert.deepEqual(resolveSpawn('npm', { platform: 'linux', env: {} }), {
    command: 'npm',
    shell: false,
  });
  assert.deepEqual(resolveSpawn('node', { platform: 'darwin', env: {} }), {
    command: 'node',
    shell: false,
  });
});

test('resolveSpawn: an explicit executable image runs directly on Windows', () => {
  assert.deepEqual(resolveSpawn('C:\\tools\\node.exe', { platform: 'win32', env: {} }), {
    command: 'C:\\tools\\node.exe',
    shell: false,
  });
});

test('resolveSpawn: an explicit script wrapper takes the shell on Windows', () => {
  // A .cmd cannot be spawned without one — spawnSync raises EINVAL since the
  // CVE-2024-27980 mitigation.
  assert.deepEqual(resolveSpawn('C:\\tools\\npm.cmd', { platform: 'win32', env: {} }), {
    command: 'C:\\tools\\npm.cmd',
    shell: true,
  });
});

test('resolveSpawn: a bare name resolving to an .exe is pinned to its full path', () => {
  const dir = mkPathDir(['node.exe']);
  try {
    assert.deepEqual(
      resolveSpawn('node', { platform: 'win32', env: { PATH: dir, PATHEXT: '.COM;.EXE;.CMD' } }),
      { command: join(dir, 'node.exe'), shell: false }
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('resolveSpawn: a bare name resolving to a .cmd falls back to the shell', () => {
  const dir = mkPathDir(['npm.cmd']);
  try {
    assert.deepEqual(
      resolveSpawn('npm', { platform: 'win32', env: { PATH: dir, PATHEXT: '.COM;.EXE;.CMD' } }),
      { command: 'npm', shell: true }
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('resolveSpawn: PATHEXT order decides which shim wins', () => {
  const dir = mkPathDir(['tool.exe', 'tool.cmd']);
  try {
    assert.deepEqual(
      resolveSpawn('tool', { platform: 'win32', env: { PATH: dir, PATHEXT: '.CMD;.EXE' } }),
      { command: 'tool', shell: true },
      '.CMD listed first must win, matching how Windows itself resolves'
    );
    assert.deepEqual(
      resolveSpawn('tool', { platform: 'win32', env: { PATH: dir, PATHEXT: '.EXE;.CMD' } }),
      { command: join(dir, 'tool.exe'), shell: false }
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('resolveSpawn: an unresolvable command keeps the previous shell behaviour', () => {
  const dir = mkPathDir([]);
  try {
    assert.deepEqual(
      resolveSpawn('nope', { platform: 'win32', env: { PATH: dir, PATHEXT: '.EXE;.CMD' } }),
      { command: 'nope', shell: true },
      'the shell reports the missing command, as it did before resolution existed'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('resolveSpawn: searches every PATH entry, not just the first', () => {
  const first = mkPathDir([]);
  const second = mkPathDir(['node.exe']);
  try {
    assert.deepEqual(
      resolveSpawn('node', {
        platform: 'win32',
        env: { PATH: [first, second].join(delimiter), PATHEXT: '.EXE' },
      }),
      { command: join(second, 'node.exe'), shell: false }
    );
  } finally {
    rmSync(first, { recursive: true, force: true });
    rmSync(second, { recursive: true, force: true });
  }
});

test('sanitizedEnv: strips the git hook variables and keeps everything else', () => {
  const clean = sanitizedEnv({
    GIT_DIR: '/poison',
    GIT_WORK_TREE: '/poison',
    GIT_INDEX_FILE: '/poison',
    PATH: '/usr/bin',
    CI: 'true',
  });
  assert.deepEqual(clean, { PATH: '/usr/bin', CI: 'true' });
});

test('sanitizedEnv: does not mutate the environment it was handed', () => {
  const original = { GIT_DIR: '/poison', PATH: '/usr/bin' };
  sanitizedEnv(original);
  assert.equal(original.GIT_DIR, '/poison', 'the caller keeps its own object intact');
});
