#!/usr/bin/env node
/**
 * Portable entry point for the suite.
 *
 * `node --test test/*.test.js` leaves the glob to the SHELL, and cmd.exe does
 * not expand it: on Windows with Node 20 the run died with
 * "Could not find 'test\*.test.js'" before a single test executed, while Node
 * 22 passed because its runner expands globs itself. A gate that depends on
 * which shell and which Node happen to be present is not a gate.
 *
 * Node's own discovery (`node --test` with no paths) is not the fix either: it
 * matches any file whose name fits the test convention, and
 * `scripts/hook-npm-test.js` fits it. The runner would load a production
 * script — harmless today only because of that script's entry-point guard, and
 * a recursively self-spawning `npm test` the moment the guard changes.
 *
 * So enumerate the suite explicitly, and fail loudly if it comes back empty —
 * a silent zero-test "pass" is the failure mode worth engineering against.
 *
 * On Windows the suite runs with a temp folder reached through its 8.3 short
 * name, as on the GitHub runner (C:\Users\RUNNER~1\...). A test that compared a
 * short path with a long one passed here and failed only in CI; the local gate
 * mirrors that runner instead. Where the volume makes no short names, the
 * suite runs as before and says so.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEST_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'test');

const files = readdirSync(TEST_DIR)
  .filter((name) => name.endsWith('.test.js'))
  .sort()
  .map((name) => join(TEST_DIR, name));

if (files.length === 0) {
  console.error(`run-tests: no *.test.js files found in ${TEST_DIR} — refusing to report a pass`);
  process.exit(1);
}

// A long-named folder in the temp directory, and its 8.3 short name when the volume makes one.
function shortTemp() {
  if (process.platform !== 'win32') return null;
  const long = mkdtempSync(join(tmpdir(), 'agentic-short-name-temp-'));
  const probe = spawnSync('cmd.exe', ['/d', '/s', '/c', `"for %I in ("${long}") do @echo %~sI"`], {
    encoding: 'utf8',
    windowsVerbatimArguments: true,
  });
  const short = (probe.stdout ?? '').trim();
  if (probe.status !== 0 || !short || short.toLowerCase() === long.toLowerCase()) {
    console.error('run-tests: this volume makes no 8.3 short names; temp paths stay long');
    return { long, short: null };
  }
  return { long, short };
}

const temp = shortTemp();
const env = temp?.short ? { ...process.env, TEMP: temp.short, TMP: temp.short } : process.env;
const result = spawnSync(process.execPath, ['--test', ...files], {
  stdio: 'inherit',
  env,
});
if (temp) rmSync(temp.long, { recursive: true, force: true });
if (result.error) {
  console.error(`run-tests: failed to spawn the test runner: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
