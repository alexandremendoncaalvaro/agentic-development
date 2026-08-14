#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [packageName, expectedVersion] = process.argv.slice(2);

if (!packageName || !expectedVersion || process.argv.length !== 4) {
  throw new Error('usage: verify-published-package.mjs <package-name> <expected-version>');
}

const scratch = mkdtempSync(join(tmpdir(), 'agentic-published-package-'));
const binDir = join(scratch, 'bin');
const staleBinary = join(binDir, packageName.split('/').at(-1));

try {
  mkdirSync(binDir);
  // Simulate a stale global binary that must not win over an explicit @latest spec.
  writeFileSync(staleBinary, '#!/bin/sh\necho stale global binary\n');
  chmodSync(staleBinary, 0o755);

  const output = execFileSync(
    'npx',
    ['--yes', `${packageName}@latest`, '--version'],
    {
      cwd: scratch,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${binDir}:${process.env.PATH}` },
    }
  ).trim();

  if (output !== expectedVersion) {
    throw new Error(
      `expected ${packageName}@latest to report ${expectedVersion} with a stale global binary on PATH; got ${output}`
    );
  }

  process.stdout.write(`verified ${packageName}@latest resolves to ${expectedVersion}\n`);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
