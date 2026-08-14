import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const INSTALLATION_SURFACES = [
  'README.md',
  'doc/guides/installation.md',
  'src/skills/claude-code/ad-update/SKILL.md',
  'src/skills/codex/ad-update/SKILL.md',
];
const RELEASE_SKILLS = [
  'src/skills/claude-code/ad-release/SKILL.md',
  'src/skills/codex/ad-release/SKILL.md',
];

test('published installation commands pin the npm latest dist-tag', () => {
  for (const relativePath of INSTALLATION_SURFACES) {
    const body = readFileSync(join(ROOT, relativePath), 'utf8');
    assert.match(
      body,
      /npx --yes @alexandrealvaro\/agentic@latest/,
      `${relativePath} must request the release channel explicitly`
    );
    assert.doesNotMatch(
      body,
      /npx --yes @alexandrealvaro\/agentic(?!@latest)/,
      `${relativePath} leaves an installed agentic binary free to shadow the published release`
    );
  }
});

test('release verification exercises @latest with a stale global binary on PATH', () => {
  const verifier = readFileSync(
    join(ROOT, 'src/skills/codex/ad-release/scripts/verify-published-package.mjs'),
    'utf8'
  );
  assert.match(verifier, /@latest/);
  assert.match(verifier, /stale global binary/);

  for (const relativePath of RELEASE_SKILLS) {
    const body = readFileSync(join(ROOT, relativePath), 'utf8');
    assert.match(
      body,
      /verify-published-package\.mjs/,
      `${relativePath} must invoke the published-package verification`
    );
  }
});
