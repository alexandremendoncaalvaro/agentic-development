import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  configureGlobalConstitution,
  globalKitPath,
} from '../src/lib/global-rules.js';

function mkHome() {
  return mkdtempSync(join(tmpdir(), 'agentic-global-rules-test-'));
}

test('global constitution import is appended without replacing host rules', () => {
  const home = mkHome();
  try {
    const path = join(home, '.codex/AGENTS.md');
    const original = '# Personal rules\n\nKeep this text.\n';
    mkdirSync(join(home, '.codex'), { recursive: true });
    writeFileSync(path, original);

    const action = configureGlobalConstitution({ agent: 'codex', home });

    assert.equal(action.type, 'updated');
    const body = readFileSync(path, 'utf8');
    assert.match(body, /Keep this text\./);
    assert.match(body, /agentic-global-constitution:start/);
    assert.match(body, new RegExp(globalKitPath(home).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.equal(configureGlobalConstitution({ agent: 'codex', home }).type, 'unchanged');
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('a changed global constitution block is preserved and reported as skipped', () => {
  const home = mkHome();
  try {
    const path = join(home, '.codex/AGENTS.md');
    const body = [
      '<!-- agentic-global-constitution:start -->',
      '@custom-workflow.md',
      '<!-- agentic-global-constitution:end -->',
      '',
    ].join('\n');
    mkdirSync(join(home, '.codex'), { recursive: true });
    writeFileSync(path, body);

    assert.equal(configureGlobalConstitution({ agent: 'codex', home }).type, 'skipped');
    assert.equal(readFileSync(path, 'utf8'), body);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
