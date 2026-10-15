import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { configureGlobalConstitution, globalKitPath } from '../src/lib/global-rules.js';

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

function mkKit(summary) {
  const kitRoot = mkHome();
  writeFileSync(
    join(kitRoot, 'WORKFLOW.md'),
    `# Workflow\n\nPreamble.\n\n## TL;DR\n\n${summary}\n\n## 1. First section\n\nBody text.\n`
  );
  return kitRoot;
}

test('the global constitution block carries the TL;DR inline, not an import', () => {
  const home = mkHome();
  const kitRoot = mkKit('1. **Context is the product.**');
  try {
    configureGlobalConstitution({ agent: 'claude-code', home, kitRoot });

    const body = readFileSync(join(home, '.claude/CLAUDE.md'), 'utf8');
    assert.match(body, /Context is the product/);
    assert.doesNotMatch(body, /Body text\./);
    assert.doesNotMatch(body, /^@/m);
    assert.match(
      body,
      new RegExp(join(globalKitPath(home), 'WORKFLOW.md').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    );
  } finally {
    rmSync(home, { recursive: true, force: true });
    rmSync(kitRoot, { recursive: true, force: true });
  }
});

test('the earlier import-only block is replaced by the summary block', () => {
  const home = mkHome();
  const kitRoot = mkKit('1. **Context is the product.**');
  try {
    const path = join(home, '.codex/AGENTS.md');
    mkdirSync(join(home, '.codex'), { recursive: true });
    writeFileSync(
      path,
      [
        '# Mine',
        '',
        '<!-- agentic-global-constitution:start -->',
        `@${join(globalKitPath(home), 'WORKFLOW.md')}`,
        '<!-- agentic-global-constitution:end -->',
        '',
      ].join('\n')
    );

    assert.equal(configureGlobalConstitution({ agent: 'codex', home, kitRoot }).type, 'updated');
    const body = readFileSync(path, 'utf8');
    assert.match(body, /^# Mine/);
    assert.match(body, /Context is the product/);
    assert.doesNotMatch(body, /^@/m);
  } finally {
    rmSync(home, { recursive: true, force: true });
    rmSync(kitRoot, { recursive: true, force: true });
  }
});

test('an unedited summary block follows a changed TL;DR; an edited one is kept', () => {
  const home = mkHome();
  const kitRoot = mkKit('1. **First wording.**');
  try {
    const path = join(home, '.codex/AGENTS.md');
    configureGlobalConstitution({ agent: 'codex', home, kitRoot });
    writeFileSync(
      join(kitRoot, 'WORKFLOW.md'),
      '# Workflow\n\n## TL;DR\n\n1. **Second wording.**\n\n## 1. First section\n'
    );

    assert.equal(configureGlobalConstitution({ agent: 'codex', home, kitRoot }).type, 'updated');
    assert.match(readFileSync(path, 'utf8'), /Second wording/);

    const edited = readFileSync(path, 'utf8').replace('Second wording', 'My own wording');
    writeFileSync(path, edited);
    assert.equal(configureGlobalConstitution({ agent: 'codex', home, kitRoot }).type, 'skipped');
    assert.equal(readFileSync(path, 'utf8'), edited);
  } finally {
    rmSync(home, { recursive: true, force: true });
    rmSync(kitRoot, { recursive: true, force: true });
  }
});

test('a summary block saved with CRLF line endings is still recognised and refreshed', () => {
  const home = mkHome();
  const kitRoot = mkKit('1. **Context is the product.**');
  try {
    const path = join(home, '.codex/AGENTS.md');
    configureGlobalConstitution({ agent: 'codex', home, kitRoot });
    writeFileSync(path, readFileSync(path, 'utf8').replace(/\n/g, '\r\n'));

    assert.equal(configureGlobalConstitution({ agent: 'codex', home, kitRoot }).type, 'updated');
    assert.equal(configureGlobalConstitution({ agent: 'codex', home, kitRoot }).type, 'unchanged');
    assert.match(readFileSync(path, 'utf8'), /Context is the product/);
  } finally {
    rmSync(home, { recursive: true, force: true });
    rmSync(kitRoot, { recursive: true, force: true });
  }
});
