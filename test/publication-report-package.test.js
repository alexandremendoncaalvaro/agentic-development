import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveSpawn } from '../scripts/hook-npm-test.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function filesUnder(root, prefix = '') {
  return readdirSync(join(root, prefix), { withFileTypes: true }).flatMap((entry) => {
    const path = join(prefix, entry.name);
    return entry.isDirectory() ? filesUnder(root, path) : [path];
  });
}

test('npm package includes every canonical publication and report workflow file', () => {
  const npm = resolveSpawn('npm');
  const result = spawnSync(npm.command, ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: npm.shell,
  });
  assert.equal(result.status, 0, result.stderr);
  const packed = new Set(JSON.parse(result.stdout)[0].files.map((file) => file.path));

  for (const skill of ['ad-publish', 'ad-report']) {
    for (const agent of ['claude-code', 'codex']) {
      const source = join('src', 'skills', agent, skill);
      for (const file of filesUnder(join(ROOT, source))) {
        const packagePath = join(source, file).replaceAll('\\', '/');
        assert.ok(packed.has(packagePath), `${packagePath} missing from npm package`);
      }
    }
  }
});
