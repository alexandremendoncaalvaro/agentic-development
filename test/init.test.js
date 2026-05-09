import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BIN = join(__dirname, '..', 'bin', 'agentic.js');

function mkScratch() {
  return mkdtempSync(join(tmpdir(), 'agentic-init-test-'));
}

function runInit(cwd, args = []) {
  return execFileSync('node', [BIN, 'init', ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

test('init --agent claude-code on greenfield → installs Claude skill', () => {
  const dir = mkScratch();
  try {
    runInit(dir, ['--agent', 'claude-code']);
    assert.ok(existsSync(join(dir, '.claude/skills/agentic-bootstrap/SKILL.md')));
    assert.ok(!existsSync(join(dir, '.agents')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init --agent codex on brownfield → installs Codex skill + openai.yaml', () => {
  const dir = mkScratch();
  try {
    writeFileSync(join(dir, 'package.json'), '{"name":"x"}\n');
    runInit(dir, ['--agent', 'codex']);
    assert.ok(existsSync(join(dir, '.agents/skills/agentic-bootstrap/SKILL.md')));
    assert.ok(
      existsSync(join(dir, '.agents/skills/agentic-bootstrap/agents/openai.yaml'))
    );
    assert.ok(!existsSync(join(dir, '.claude')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init --agent both → installs into both .claude and .agents', () => {
  const dir = mkScratch();
  try {
    runInit(dir, ['--agent', 'both']);
    assert.ok(existsSync(join(dir, '.claude/skills/agentic-bootstrap/SKILL.md')));
    assert.ok(existsSync(join(dir, '.agents/skills/agentic-bootstrap/SKILL.md')));
    assert.ok(
      existsSync(join(dir, '.agents/skills/agentic-bootstrap/agents/openai.yaml'))
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

const UNIVERSAL_SKILLS = [
  'agentic-bootstrap',
  'agentic-philosophy',
  'agentic-architecture',
  'agentic-adr',
  'agentic-task',
  'agentic-audit',
];

test('init --agent both → installs the full universal skill set for both agents', () => {
  const dir = mkScratch();
  try {
    runInit(dir, ['--agent', 'both']);
    for (const skill of UNIVERSAL_SKILLS) {
      assert.ok(
        existsSync(join(dir, `.claude/skills/${skill}/SKILL.md`)),
        `Claude SKILL.md missing for ${skill}`
      );
      assert.ok(
        existsSync(join(dir, `.agents/skills/${skill}/SKILL.md`)),
        `Codex SKILL.md missing for ${skill}`
      );
      assert.ok(
        existsSync(join(dir, `.agents/skills/${skill}/agents/openai.yaml`)),
        `Codex openai.yaml missing for ${skill}`
      );
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init --agent claude-code → installs every universal skill (Claude only)', () => {
  const dir = mkScratch();
  try {
    runInit(dir, ['--agent', 'claude-code']);
    for (const skill of UNIVERSAL_SKILLS) {
      assert.ok(
        existsSync(join(dir, `.claude/skills/${skill}/SKILL.md`)),
        `Claude SKILL.md missing for ${skill}`
      );
    }
    assert.ok(!existsSync(join(dir, '.agents')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init: re-running on installed project is idempotent', () => {
  const dir = mkScratch();
  try {
    runInit(dir, ['--agent', 'claude-code']);
    const before = readFileSync(
      join(dir, '.claude/skills/agentic-bootstrap/SKILL.md')
    );
    runInit(dir, ['--agent', 'claude-code']);
    const after = readFileSync(
      join(dir, '.claude/skills/agentic-bootstrap/SKILL.md')
    );
    assert.ok(before.equals(after), 'SKILL.md must be byte-identical after re-run');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init: invalid --agent value rejected', () => {
  const dir = mkScratch();
  try {
    assert.throws(() => runInit(dir, ['--agent', 'gemini']));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
